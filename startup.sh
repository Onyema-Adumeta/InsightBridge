#!/bin/bash
set -e

echo "Starting InsightBridge fullstack application..."

# Install frontend dependencies and build if needed
cd /home/site/wwwroot/frontend
echo "Installing frontend dependencies..."
npm install --production

# Start backend (Python FastAPI/Flask)
cd /home/site/wwwroot/backend
echo "Starting Python backend..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# Start backend in background
echo "Launching backend server..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &

# Wait for backend to be ready
sleep 5

# Start frontend (Next.js)
cd /home/site/wwwroot/frontend
echo "Starting Next.js frontend on port $PORT..."
export PORT=${PORT:-8080}
npm start -- -p $PORT