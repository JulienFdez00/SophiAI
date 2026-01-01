"""main app file."""

from __future__ import annotations

from typing import Generator, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.app.credentials import set_llm_credentials
from backend.app.llm import get_expert_llm, get_parsing_llm
from backend.app.parser import PDFParser
from backend.app.stream_explanation import stream_explanation
from config.config import LOGGER

app = FastAPI(title="AI PDF Reader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LlmKeysRequest(BaseModel):
    provider: str
    api_key: str
    expert_model: Optional[str] = None
    parsing_model: Optional[str] = None


@app.post(
    path="/add-llm-keys",
    status_code=200,
    summary="Store LLM credentials in the local keychain",
)
def add_llm_keys(payload: LlmKeysRequest) -> dict:
    provider = payload.provider.strip().lower()
    api_key = payload.api_key.strip()
    expert_model = payload.expert_model.strip() if payload.expert_model else None
    parsing_model = payload.parsing_model.strip() if payload.parsing_model else None

    if not provider:
        raise HTTPException(status_code=400, detail="Provider is required.")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required.")

    allowed = {"openai", "anthropic", "gemini"}
    if provider not in allowed:
        raise HTTPException(status_code=400, detail="Provider must be openai, anthropic, or gemini.")

    if not expert_model:
        raise HTTPException(status_code=400, detail="Expert model is required.")

    set_llm_credentials(
        provider=provider,
        api_key=api_key,
        expert_model=expert_model,
        parsing_model=parsing_model,
    )

    try:
        get_expert_llm()
        if parsing_model:
            get_parsing_llm()
    except Exception as exc:
        LOGGER.exception("Failed to validate LLM credentials: {}", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"status": "ok"}


@app.post(
    path="/explain-page",
    status_code=201,
    summary="Extract page content and provide explanation",
)
def explain_page(
    pdf_bytes: UploadFile = File(...),
    prompt: str = Form("help me understand this page"),
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
