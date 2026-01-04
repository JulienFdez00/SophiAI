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

## Desktop (Electron)

### Dev mode
```bash
npm install
npm run electron:dev
```

### Package a desktop build
```bash
npm run electron:package
```

Notes:
- The Electron app launches the FastAPI backend in the background.
- The frontend build is loaded from `frontend/dist`.
- The packaged app requires Python 3 installed on the user's machine.

## API
`POST /explain-page`

Multipart form fields:
- `pdf_bytes` (file): single-page PDF bytes
- `prompt` (string): optional prompt
- `parse_with_llm` (bool): optional flag to parse via LLM

`POST /add-llm-keys`

JSON body:
- `provider` (string): openai/anthropic/gemini (for now)
- `api_key` (string): provider key
- `expert_model` (string, required): model for explanations
- `parsing_model` (string, optional): model for parsing

The endpoint returns an event-stream (SSE). Each chunk is in `data: ...` lines and terminates with `[DONE]`.
