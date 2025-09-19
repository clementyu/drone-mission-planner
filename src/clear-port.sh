#!/bin/bash

# A script to find and kill the process running on a specific port.
# Defaults to port 3000 if no argument is provided.

PORT=${1:-3000}

echo "Searching for process running on port $PORT..."

# Use lsof (list open files) to find the PID (Process ID) on the specified TCP port.
# The -t flag ensures only the PID is outputted, which is cleaner.
PID=$(lsof -t -i:$PORT)

if [ -z "$PID" ]; then
  echo "No process found on port $PORT. It's free!"
else
  echo "Process with PID $PID found. Terminating..."
  # Use kill -9 to forcefully terminate the process.
  kill -9 $PID
  echo "Process terminated. Port $PORT should now be free."
fi
