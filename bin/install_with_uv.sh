#!/bin/bash -e

UV_CMD="uv"
PROJECT_NAME="ai_pdf_reader"
PYTHON_VERSION=${1:-3.13}

read -r -p "Want to create uv env .venv? (y/n) " answer
if [ "$CI" = "true" ] || [ "$answer" = "y" ]; then
  echo "Creating uv virtual environment with Python '${PYTHON_VERSION}'..."
  $UV_CMD venv .venv --python "$PYTHON_VERSION"

  echo "Installing requirements from requirements-backend.txt and requirements-developer.txt..."
  UV_PROJECT_ENVIRONMENT=.venv $UV_CMD pip install -r requirements-backend.txt -r requirements-developer.txt

  echo "Installing IPython kernel..."
  UV_PROJECT_ENVIRONMENT=.venv $UV_CMD run python -m ipykernel install --user --name="$PROJECT_NAME"

  echo "Installing pre-commit hooks..."
  UV_PROJECT_ENVIRONMENT=.venv $UV_CMD run pre-commit install -t pre-commit
  UV_PROJECT_ENVIRONMENT=.venv $UV_CMD run pre-commit install -t pre-push

  if command -v npm >/dev/null 2>&1; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
  else
    echo "npm not found. Skipping frontend dependency install."
  fi

  echo "Installation complete!"
else
  echo "Installation of uv env aborted!"
fi
