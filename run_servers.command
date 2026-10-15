#!/bin/bash

# Change to the directory where the script is located
cd "$(dirname "$0")" || exit

# Add Android SDK platform-tools and Node to PATH
export PATH="$HOME/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:$HOME/Library/Android/sdk/platform-tools:$PATH"

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
