"""LLM setup."""

import os
from typing import Optional

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel

from backend.app.credentials import get_llm_credentials
from config.config import ALLOWED_PROVIDERS, LOGGER


def _env_api_key(provider: str) -> Optional[str]:
    env_name = f"{provider.upper()}_API_KEY"
    return os.getenv(env_name)


def _resolve_model(provider: str, model_override: Optional[str], role: str) -> str:
    if model_override:
        return model_override
    raise ValueError(f"Missing {role} model for provider '{provider}'. Set it via /add-llm-keys.")


def get_parsing_llm(max_tokens: int = 4096) -> BaseChatModel:
    """Returns an LLM for parsing."""
    creds = get_llm_credentials()
    if creds.provider not in ALLOWED_PROVIDERS:
        raise ValueError("Provider must be one of: openai, anthropic, gemini.")
    api_key = creds.api_key or _env_api_key(creds.provider)
    if not api_key:
        raise ValueError(f"Missing API key for provider '{creds.provider}'.")
    model = _resolve_model(creds.provider, creds.parsing_model, "parsing")
    masked = f"{api_key[:4]}...{api_key[-4:]}" if api_key else "missing"
    LOGGER.debug(f"Parsing LLM provider {creds.provider} with key {masked}")
    return init_chat_model(
        model=model,
        max_tokens=max_tokens,
        timeout=None,
        max_retries=2,
        api_key=api_key,
    )


def get_expert_llm(max_tokens: int = 4096) -> BaseChatModel:
    """Returns an LLM for explanations."""
    creds = get_llm_credentials()
    if creds.provider not in ALLOWED_PROVIDERS:
        raise ValueError("Provider must be one of: openai, anthropic, gemini.")
    api_key = creds.api_key or _env_api_key(creds.provider)
    if not api_key:
        raise ValueError(f"Missing API key for provider '{creds.provider}'.")
    model = _resolve_model(creds.provider, creds.expert_model, "expert")
    masked = f"{api_key[:4]}...{api_key[-4:]}" if api_key else "missing"
    LOGGER.debug(f"Expert LLM provider {creds.provider} with key {masked}")
    return init_chat_model(
        model=model,
        max_tokens=max_tokens,
        timeout=None,
        max_retries=2,
        api_key=api_key,
    )
