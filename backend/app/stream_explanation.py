"""Stream AI explanation."""

from __future__ import annotations

from typing import Generator

from backend.app.chain import get_llm_explanation_chain
from backend.app.conversation_history import append_conversation_history
from backend.app.llm import get_expert_llm
from config.config import LOGGER


def stream_explanation(
    prompt: str,
    extracted_text: str,
    conversation_history: str,
) -> Generator[str, None, None]:
    model = get_expert_llm()
    chain = get_llm_explanation_chain(model)
    LOGGER.debug(f"prompt: {prompt}")
    response_chunks = []
    for chunk in chain.stream(
        {"parsed_page": extracted_text, "prompt": prompt, "conversation_history": conversation_history}
    ):
        response_chunks.append(chunk)
        yield chunk
    response = "".join(response_chunks)
    append_conversation_history(prompt, response)

    LOGGER.debug(f"response: {response}")
