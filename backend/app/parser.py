"""Page parser."""

from __future__ import annotations

import base64
import time
from abc import ABC
from io import BytesIO
from typing import List

import openai
from backend.app.llm import get_llm
from backend.app.prompts import TEXT_EXTRACTION_PROMPT
from langchain_core.messages import HumanMessage
from pdf2image import convert_from_bytes

from config.config import LOGGER


class Parser(ABC):
    """Abstract class for document parsing."""

    def parse_document(self: Parser, file_bytes: bytes) -> str:
        """Get text from a document."""
        raise NotImplementedError("parse_document method must be implemented.")


class PDFParser(Parser):
    """Parse PDF page."""
    def parse_document(
        self: PDFParser,
        file_bytes: bytes,
    ) -> str:
        """Use a multimodal LLM to parse a PDF document and extract the content.

        Workflow:
        1. Convert PDF page to image
        2. Extract text from image
        """
        image_in_memory = self._convert_pdf_page_to_image(file_bytes)
        content = self._extract_text_from_image(image_in_memory)

        return content

    def _convert_pdf_page_to_image(
        self: PDFParser, file_bytes: bytes
    ) -> BytesIO:
        """Convert a PDF file to an image."""
        images_bytes = convert_from_bytes(file_bytes)

        images_in_memory = []
        for image in images_bytes: # Using a list in case we want to send several images
            image_in_memory = BytesIO()
            image.save(image_in_memory, format="PNG")
            image_in_memory.seek(0)
            images_in_memory.append(image_in_memory)

        LOGGER.debug(f"Number of pages to parse: {len(images_in_memory)}")
        return images_in_memory[0]


    def _extract_text_from_image(
        self: PDFParser,
        image_in_memory: BytesIO,
    ) -> str:
        """Extract text from an image using tenacity for retry logic."""
        model = get_llm()
        messages = []
        if not image_in_memory.getbuffer().nbytes > 0:
            LOGGER.debug("image is empty")
        image_in_memory.seek(0)  # avoid badrequest after retry
        image_data = base64.b64encode(image_in_memory.read()).decode("utf-8")
        image_prompt_template = TEXT_EXTRACTION_PROMPT
        messages.append(
            [
                HumanMessage(
                    content=[
                        {"type": "text", "text": image_prompt_template},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_data}"
                            },
                        },
                    ],
                )
            ]
        )

        try:
            pdf_content = self._process_images(messages, model)
            return pdf_content
        except Exception as e:
            raise e

    def _process_images(
        self: PDFParser, messages: list[List[HumanMessage]], model: object
    ) -> str:
        """Process messages sequentially (v1 expects a single message)."""
        max_retries = 3
        responses = []

        for idx, message in enumerate(messages):
            for attempt in range(max_retries):
                try:
                    result = model.invoke(message)
                    responses.append(result.content)
                    break
                except (openai.BadRequestError, openai.RateLimitError, ValueError) as exc:
                    LOGGER.error(f"An error occurred while processing an image: {exc}")
                    if isinstance(exc, openai.BadRequestError):
                        raise
                    if attempt == max_retries - 1:
                        raise
                    backoff = 2 ** (attempt + 1)
                    LOGGER.debug(f"Retrying message {idx} after {backoff}s")
                    time.sleep(backoff)

        return "\n\n".join(responses).strip()
