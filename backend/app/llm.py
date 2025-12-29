from __future__ import annotations

import asyncio
from typing import AsyncGenerator, Optional


async def stream_explanation(
    *,
    provider: str,
    model: str,
    api_key: str,
    prompt: str,
    extracted_text: Optional[str],
    image_bytes: Optional[bytes],
) -> AsyncGenerator[str, None]:
    if provider != "mock":
        yield (
            "Provider adapters are not wired yet. Set provider=mock for now, "
            "or implement provider-specific calls in backend/app/llm.py."
        )
        return

    context_hint = ""
    if extracted_text:
        context_hint = f"Using extracted text ({len(extracted_text)} chars)."
    elif image_bytes:
        context_hint = f"Using page image ({len(image_bytes)} bytes)."
    else:
        context_hint = "No page content received."

    response = (
        f"{context_hint}\n\nPrompt: {prompt}\n\n"
        "Mock explanation: This endpoint is ready to stream responses once "
        "you wire a provider adapter."
    )

    for token in response.split(" "):
        yield token + " "
        await asyncio.sleep(0.02)
