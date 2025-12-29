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
