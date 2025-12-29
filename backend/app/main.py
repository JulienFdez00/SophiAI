from __future__ import annotations

import asyncio
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.app.docling_utils import extract_page_text
from backend.app.llm import stream_explanation

app = FastAPI(title="AI PDF Reader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/explain-page")
async def explain_page(
    pdf_bytes: UploadFile = File(...),
    page_image: Optional[UploadFile] = File(None),
    page_index: int = Form(0),
    prompt: str = Form("help me understand this page"),
    provider: str = Form("mock"),
    model: str = Form(""),
    api_key: str = Form(""),
    use_docling: bool = Form(True),
) -> StreamingResponse:
    pdf_data = await pdf_bytes.read()
    image_data = await page_image.read() if page_image else None

    extracted_text = None
    if use_docling:
        extracted_text = extract_page_text(pdf_data, page_index)

    async def event_stream() -> AsyncGenerator[bytes, None]:
        async for chunk in stream_explanation(
            provider=provider,
            model=model,
            api_key=api_key,
            prompt=prompt,
            extracted_text=extracted_text,
            image_bytes=image_data,
        ):
            yield f"data: {chunk}\n\n".encode("utf-8")
            await asyncio.sleep(0)
        yield b"event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
