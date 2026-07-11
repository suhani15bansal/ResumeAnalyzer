#!/bin/bash
# Local dev launcher
set -e
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
echo "Starting server at http://localhost:8000"
echo "API docs at http://localhost:8000/docs"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
