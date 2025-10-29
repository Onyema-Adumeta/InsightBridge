#!/bin/bash

echo "Starting InsightBridge Frontend..."

# Navigate to app directory
cd /home/site/wwwroot

echo "Installing Node.js dependencies..."
npm install --production

echo "Building Next.js application..."
npm run build

echo "Starting Next.js server..."
npm start