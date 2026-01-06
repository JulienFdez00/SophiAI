"""Conversation history storage."""

from __future__ import annotations

from config.config import CONVERSATION_HISTORY_PATH, DATA_DIR


def _ensure_history_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_conversation_history() -> str:
    if not CONVERSATION_HISTORY_PATH.exists():
        return ""
    return CONVERSATION_HISTORY_PATH.read_text(encoding="utf-8")


def append_conversation_history(user_prompt: str, agent_response: str) -> None:
    _ensure_history_dir()
    entry = f"User: {user_prompt}\n\nAgent: {agent_response}\n\n"
    with CONVERSATION_HISTORY_PATH.open("a", encoding="utf-8") as handle:
        handle.write(entry)


def delete_conversation_history() -> None:
    if CONVERSATION_HISTORY_PATH.exists():
        CONVERSATION_HISTORY_PATH.unlink()
