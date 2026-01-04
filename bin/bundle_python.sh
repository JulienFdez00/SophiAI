#!/bin/bash -e

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
PYTHON_DIR="$PROJECT_ROOT/vendor/python"
PYTHON_BIN=""

for candidate in python3.13 python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo "Python 3.11+ is required (prefer 3.13). Please install Python." >&2
  exit 1
fi

if [ ! -d "$PYTHON_DIR" ]; then
  mkdir -p "$PYTHON_DIR"
fi

if [ ! -d "$PYTHON_DIR/python" ] && [ ! -d "$PYTHON_DIR/venv" ]; then
  echo "Place a standalone Python distribution in $PYTHON_DIR (or create a venv at $PYTHON_DIR/venv)."
  echo "This script does not download Python automatically."
fi

if [ ! -d "$PYTHON_DIR/venv" ]; then
  echo "Creating venv in $PYTHON_DIR/venv..."
  "$PYTHON_BIN" -m venv "$PYTHON_DIR/venv"
fi

"$PYTHON_DIR/venv/bin/python" -m pip install --upgrade pip
"$PYTHON_DIR/venv/bin/python" -m pip install -r "$PROJECT_ROOT/requirements-backend.txt"

echo "Bundled Python ready at $PYTHON_DIR/venv"
