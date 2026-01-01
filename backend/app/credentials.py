"""Credential storage using OS keychain."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import keyring
from keyring.errors import KeyringError, PasswordDeleteError

SERVICE_NAME = "ai_pdf_reader"


@dataclass
class LlmCredentials:
    provider: str
    api_key: Optional[str]
    expert_model: Optional[str]
    parsing_model: Optional[str]


def _delete_secret(name: str) -> None:
    try:
        keyring.delete_password(SERVICE_NAME, name)
    except (PasswordDeleteError, KeyringError):
        return


def _set_secret(name: str, value: Optional[str]) -> None:
    if value is None:
        return
    if value == "":
        _delete_secret(name)
        return
    keyring.set_password(SERVICE_NAME, name, value)


def set_llm_credentials(
    *,
    provider: str,
    api_key: str,
    expert_model: Optional[str],
    parsing_model: Optional[str],
) -> None:
    _set_secret("provider", provider)
    _set_secret(f"{provider}_api_key", api_key)
    if expert_model is not None:
        _set_secret(f"{provider}_expert_model", expert_model)
    if parsing_model is not None:
        _set_secret(f"{provider}_parsing_model", parsing_model)


def get_llm_credentials() -> LlmCredentials:
    provider = keyring.get_password(SERVICE_NAME, "provider") or ""
    if not provider:
        return LlmCredentials(provider="", api_key=None, expert_model=None, parsing_model=None)
    return LlmCredentials(
        provider=provider,
        api_key=keyring.get_password(SERVICE_NAME, f"{provider}_api_key"),
        expert_model=keyring.get_password(SERVICE_NAME, f"{provider}_expert_model"),
        parsing_model=keyring.get_password(SERVICE_NAME, f"{provider}_parsing_model"),
    )
