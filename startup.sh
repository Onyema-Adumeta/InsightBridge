#!/bin/bash
set -e

echo "========================================"
echo "Starting InsightBridge Fullstack App"
echo "========================================"

# Set working directory
cd /home/site/wwwroot

# Start Backend (Python)
if [ -d "backend" ]; then
    echo "Installing backend dependencies..."
    cd backend
    python -m pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    
    echo "Starting Python backend on port 8000..."
    nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    sleep 10
fi

# Start Frontend (Next.js)
if [ -d "/home/site/wwwroot/frontend" ]; then
    cd /home/site/wwwroot/frontend
    
    # Install production dependencies only (much faster)
    echo "Installing production dependencies..."
    npm ci --production --omit=dev
    
    export PORT=${PORT:-8080}
    echo "Starting Next.js frontend on port $PORT..."
    
    npm start -- -p $PORT
else
    echo "ERROR: Frontend directory not found!"
    exit 1
fi