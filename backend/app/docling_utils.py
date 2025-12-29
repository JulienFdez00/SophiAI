from __future__ import annotations

from io import BytesIO
from typing import Optional

from docling.document_converter import DocumentConverter


def extract_page_text(pdf_bytes: bytes, page_index: int) -> Optional[str]:

    try:
        converter = DocumentConverter()
        result = converter.convert(BytesIO(pdf_bytes))
    except Exception:
        return None

    document = getattr(result, "document", None)
    if document is None:
        return None

    pages = getattr(document, "pages", None)
    if pages:
        if 0 <= page_index < len(pages):
            page = pages[page_index]
            page_text = getattr(page, "text", None)
            if page_text:
                return page_text

    try:
        return document.export_to_text()
    except Exception:
        return None
