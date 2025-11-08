#!/bin/bash
set -e

echo "========================================"
echo "Starting InsightBridge Fullstack App"
echo "========================================"

# Install Python and pip if not present
if ! command -v python3 &> /dev/null; then
    echo "Python not found. Installing Python..."
    apt-get update -qq
    apt-get install -y python3 python3-pip python3-venv
fi

if ! python3 -m pip --version &> /dev/null; then
    echo "pip not found. Installing pip..."
    apt-get update -qq
    apt-get install -y python3-pip
fi

echo "Python version: $(python3 --version)"
echo "pip version: $(python3 -m pip --version)"

# Set working directory
cd /home/site/wwwroot

# Start Backend (Python)
if [ -d "backend" ]; then
    echo "Installing backend dependencies..."
    cd backend
    python3 -m pip install --upgrade pip --quiet --break-system-packages
    python3 -m pip install -r requirements.txt --quiet --break-system-packages
    
    echo "Starting Python backend on port 8000..."
    nohup python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    sleep 10
    
    # Check if backend is running
    if ps -p $BACKEND_PID > /dev/null; then
        echo "Backend is running successfully"
    else
        echo "WARNING: Backend may have failed to start. Check /tmp/backend.log"
        cat /tmp/backend.log
    fi
fi

# Start Frontend (Next.js)
if [ -d "/home/site/wwwroot/frontend" ]; then
    cd /home/site/wwwroot/frontend
    
    echo "Installing ALL dependencies (including dev for build)..."
    npm ci
    
    echo "Building Next.js application..."
    npm run build
    
    export PORT=${PORT:-8080}
    echo "Starting Next.js frontend on port $PORT..."
    
    npm start
else
    echo "ERROR: Frontend directory not found!"
    exit 1
fi