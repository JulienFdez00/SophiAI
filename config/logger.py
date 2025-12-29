"""Custom logger for the backend."""

from __future__ import annotations

import logging
import sys

import loguru
from loguru._logger import _defaults


def setup_logger(logger_level: int = logging.INFO, data_collection_handler: callable | None = None) -> loguru.Logger:
    logger = loguru.logger
    logger.remove()
    logger.add(sys.stderr, level=logger_level, format=_defaults.LOGURU_FORMAT + " | {extra}")
    if data_collection_handler is not None:
        logger.add(data_collection_handler, level=logger_level, serialize=True)
    return logger
