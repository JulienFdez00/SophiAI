"""Config."""

import logging
from pathlib import Path

from dotenv import load_dotenv

from config.logger import setup_logger

# For local development
ROOT_PATH = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_PATH / ".env")

# Logging
LOGGER_LEVEL = logging.DEBUG

LOGGER = setup_logger(logger_level=LOGGER_LEVEL)

# Parsing type
PARSER_MODE = "Docling"

# Model Providers
ALLOWED_PROVIDERS = {"openai", "anthropic", "gemini"}

# Logging
LOG_PREVIEW_CHARS = 64

# Conversation history storage
DATA_DIR = ROOT_PATH / "data"
CONVERSATION_HISTORY_PATH = DATA_DIR / "conversation_history.md"
