# AI PDF Reader

A Preview-inspired PDF reader with an AI assistant sidebar. Open any local PDF, navigate pages, and ask for explanations.

## Features
- Preview-like viewer with page navigation and zoom
- AI assistant sidebar that can be toggled on/off
- API key tab for OpenAI/Claude/Mistral/Gemini (model-agnostic settings)
- Default action: "help me understand this page"
- Backend FastAPI endpoint that streams responses
- Uses docling if available; falls back to sending the page image

## Project Structure
- `backend/`: FastAPI API
- `frontend/`: React + Vite UI
- `requirements-backend.txt`: backend dependencies
- `requirements-frontend.txt`: frontend toolchain and packages
- `requirements-developer.txt`: optional dev tools

## Quickstart

### Backend
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-backend.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Make targets
```bash
make install
make backend-run
make frontend-run

# Convenience wrappers that respect PYTHONPATH from Makefile
make run_backend
make run_frontend
```

## API
`POST /api/explain-page`

Multipart form fields:
- `pdf_bytes` (file): full PDF bytes
- `page_image` (file, optional): PNG snapshot of the page
- `page_index` (int): zero-based page index
- `prompt` (string): optional prompt
- `provider` (string): mock/openai/anthropic/mistral/gemini
- `model` (string): model name
- `api_key` (string): provider key
- `use_docling` (bool): try docling parsing first

The endpoint returns an event-stream (SSE). Each chunk is in `data: ...` lines and terminates with `[DONE]`.

## Notes
- `backend/app/llm.py` currently includes a mock provider. Wire your preferred provider there.
- `docling` is optional but included in the backend requirements. If install issues occur, remove it and rely on page images.
