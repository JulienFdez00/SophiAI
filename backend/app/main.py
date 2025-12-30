"""main app file."""

from __future__ import annotations

from typing import Generator

from backend.app.parser import PDFParser
from backend.app.stream_explanation import stream_explanation
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from config.config import LOGGER

app = FastAPI(title="AI PDF Reader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    path="/explain-page",
    status_code=201,
    summary="Extract page content and provide explanation",
)
def explain_page(
    pdf_bytes: UploadFile = File(...),
    prompt: str = Form("help me understand this page"),
    provider: str = Form("mock"),
    model: str = Form(""),
    api_key: str = Form(""),
) -> StreamingResponse:
    pdf_data = pdf_bytes.file.read()
    LOGGER.debug("Received PDF bytes: %d", len(pdf_data))
    parser = PDFParser()
    try:
        extracted_text = parser.parse_document(pdf_data)
        LOGGER.debug(f"Extracted text length: {len(extracted_text)}")
        LOGGER.debug(f"Extracted text: {extracted_text}")
    except Exception as exc:
        LOGGER.exception(f"Failed to parse PDF page: {exc}")
        extracted_text = ""

    def event_stream() -> Generator[bytes, None, None]:
        for chunk in stream_explanation(
            prompt=prompt,
            extracted_text=extracted_text,
        ):
            lines = chunk.split("\n")
            for line in lines:
                yield f"data: {line}\n".encode("utf-8")
            yield b"\n"
        yield b"event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
