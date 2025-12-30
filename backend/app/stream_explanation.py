from __future__ import annotations

from typing import Generator, Optional

from backend.app.chain import get_llm_explanation_chain
from backend.app.llm import get_expert_llm

from config.config import LOGGER


def stream_explanation(
    prompt: str,
    extracted_text: Optional[str],
) -> Generator[str, None, None]:

    model = get_expert_llm()
    chain = get_llm_explanation_chain(model)
    LOGGER.debug(f"prompt: {prompt}")
    response_chunks = []
    for chunk in chain.stream({"parsed_page": extracted_text, "prompt": prompt}):
        response_chunks.append(chunk)
        yield chunk

    response = "".join(response_chunks)
    LOGGER.debug("response: {}", response)
