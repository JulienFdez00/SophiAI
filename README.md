# AI PDF Reader

An AI reading assistant I am semi-vibe coding. For when you want to ask questions on complicated texts in real-time. Initally got inspired to build this while attempting to read Hegel's Logic.

## Features
- Preview-like viewer with page navigation and zoom
- AI assistant sidebar that can be toggled on/off
- API key tab stored locally in your OS keychain
- Default action: "help me understand this page"
- Backend FastAPI endpoint that streams responses
- Currently only sends the current page as a single-page PDF

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
`POST /explain-page`

Multipart form fields:
- `pdf_bytes` (file): single-page PDF bytes
- `prompt` (string): optional prompt

`POST /add-llm-keys`

JSON body:
- `provider` (string): openai/anthropic/mistral/gemini
- `api_key` (string): provider key
- `expert_model` (string, optional): model for explanations
- `parsing_model` (string, optional): model for parsing

The endpoint returns an event-stream (SSE). Each chunk is in `data: ...` lines and terminates with `[DONE]`.

## Notes
- `backend/app/llm.py` currently includes a mock provider. Wire your preferred provider there.
