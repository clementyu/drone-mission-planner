#!/bin/bash

# Navigate to the server directory, install dependencies, and start the Node.js server in the background
echo "Starting Node.js server in the background..."
(cd server && npm install && npm start) &

# Wait a few seconds to let the Node.js server initialize
sleep 3

# Start the Python backend server in the foreground
echo "Starting Python backend server..."
python python-backend/backend.py

# When you stop this script (Ctrl+C), it will also stop the background Node.js process.
kill %1