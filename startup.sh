#!/bin/bash
set -e

echo "========================================"
echo "Starting InsightBridge Fullstack App"
echo "========================================"

# Install Python if not present
if ! command -v python3 &> /dev/null; then
    echo "Python not found. Installing Python 3.12..."
    apt-get update -qq
    apt-get install -y python3 python3-pip python3-venv
    ln -sf /usr/bin/python3 /usr/bin/python
fi

echo "Python version: $(python3 --version)"

# Set working directory
cd /home/site/wwwroot

# Start Backend (Python)
if [ -d "backend" ]; then
    echo "Installing backend dependencies..."
    cd backend
    python3 -m pip install --upgrade pip --quiet
    pip3 install -r requirements.txt --quiet
    
    echo "Starting Python backend on port 8000..."
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    sleep 10
fi

# Start Frontend (Next.js)
if [ -d "/home/site/wwwroot/frontend" ]; then
    cd /home/site/wwwroot/frontend
    
    echo "Installing production dependencies..."
    npm ci --production --omit=dev
    
    export PORT=${PORT:-8080}
    echo "Starting Next.js frontend on port $PORT..."
    
    npm start -- -p $PORT
else
    echo "ERROR: Frontend directory not found!"
    exit 1
fi