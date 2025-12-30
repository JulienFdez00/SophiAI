"""LLM setup."""
import os

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel


def get_parsing_llm(max_tokens: int = 4096) -> BaseChatModel:
    """Returns an LLM."""
    # Add Anthropic API key to your env
    api_key = os.getenv("ANTHROPIC_API_KEY")
    masked = f"{api_key[:4]}...{api_key[-4:]}" if api_key else "missing"
    from config.config import LOGGER
    LOGGER.debug(f"ANTHROPIC_API_KEY is {masked}")
    return init_chat_model(
        model="claude-haiku-4-5",
        max_tokens=max_tokens,
        timeout=None,
        max_retries=2,
        api_key=api_key
    )

def get_expert_llm(max_tokens: int = 4096) -> BaseChatModel:
    """Returns an LLM."""
    # Add Anthropic API key to your env
    api_key = os.getenv("ANTHROPIC_API_KEY")
    masked = f"{api_key[:4]}...{api_key[-4:]}" if api_key else "missing"
    from config.config import LOGGER
    LOGGER.debug(f"ANTHROPIC_API_KEY is {masked}")
    return init_chat_model(
        model="claude-sonnet-4-5",
        max_tokens=max_tokens,
        timeout=None,
        max_retries=2,
        api_key=api_key
    )
