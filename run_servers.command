#!/bin/bash

# Change to the directory where the script is located
cd "$(dirname "$0")" || exit

# Add Android SDK platform-tools to PATH so adb can be found
export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools

# Start backend
echo "Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Cleanup on exit
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID" EXIT INT TERM

echo "Servers started! Press Ctrl+C to stop."
wait
