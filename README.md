# SophiAI

An AI reading assistant I am currently building. Ask precise questions and get clear explanations page-by-page while reading complex texts. Built for PDFs.

## Why I'm building this

Initally got inspired to build this while attempting to read Hegel's Logic. Not-quite-translatable abstract German concepts that make no sense to you? Random latin phrases that you are just expected to understand? Surprise references to obscure pre-Socratic philosophers? Good news! You no longer need to forth between your reading and ChatGPT.

## Demo
![SophiAI demo](media/sophiai_demo.gif)

## Features
- Ask questions about the current page and get streaming answers
- Preview-like viewer with page navigation and zoom
- AI assistant sidebar that can be toggled on/off
- API key tab stored locally in your OS keychain

Currently only sends the current page as a single-page PDF

## Project Structure
- `backend/`: FastAPI API
- `frontend/`: React + Vite UI
- `requirements-backend.txt`: backend dependencies
- `requirements-frontend.txt`: frontend toolchain and packages
- `requirements-developer.txt`: optional dev tools

## Quickstart

### Make targets
```bash
make install
make dev
```

Open `http://localhost:5173`.

Alternatively, you can run `make backend-run` and `make frontend-run` in two separate terminals.

If you don’t have `make` (for example on Windows), run:
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements-backend.txt
uvicorn backend.app.main:app --reload --port 8000
```
Then in a second terminal:
```bash
cd frontend
npm install
npm run dev
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
- The packaged app can use a bundled Python runtime (see below).

## Bundling Python

To avoid requiring end users to install Python, bundle a local Python runtime during the build (the build machine still needs Python installed):

```bash
./bin/bundle_python.sh
npm run electron:package
```

This script creates `vendor/python/venv` and installs backend dependencies into it.

Windows (PowerShell):

```powershell
.\bin\bundle_python.ps1
npm run electron:package -- --win
```

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
