#!/bin/bash

echo "Starting InsightBridge Backend..."

# Navigate to app directory
cd /home/site/wwwroot

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Starting Gunicorn server..."
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:8000 --timeout 120






