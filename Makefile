.PHONY: backend-install backend-run frontend-install frontend-run dev install install_precommit

export PYTHONPATH := .

backend-install:
	python -m pip install -r requirements-backend.txt

install:
	@bash bin/install_with_uv.sh

backend-run:
	uvicorn backend.app.main:app --reload --port 8000

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev

dev:
	@command -v concurrently >/dev/null 2>&1 || { echo "Missing concurrently (npm i -g concurrently)"; exit 1; }
	@concurrently "make backend-run" "make frontend-run"

install_precommit: ## To install pre-commit hooks > make install_precommit
	@echo "Installing pre-commit hooks"
	@pre-commit install -t pre-commit
	@pre-commit install -t pre-push
