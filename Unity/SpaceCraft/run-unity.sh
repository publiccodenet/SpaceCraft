#!/bin/bash

# run-unity.sh - A simple wrapper script for running Unity commands
# Relies on UNITY_PATH environment variable being set correctly before execution.
# Usage: ./run-unity.sh [arguments]
# Example: ./run-unity.sh -batchmode -projectPath . -executeMethod Build.BuildProd -quit

# Check if UNITY_PATH is set
if [ -z "$UNITY_PATH" ]; then
    echo "Error: UNITY_PATH environment variable is not set."
    echo "Please ensure the environment is configured correctly (e.g., by running unity-env.js)."
    exit 1
fi

# Check if Unity executable exists at the provided path
if [ ! -f "$UNITY_PATH" ]; then
    echo "Error: Unity executable not found at specified UNITY_PATH: $UNITY_PATH"
    exit 1
fi

echo "Using Unity at: $UNITY_PATH"

# Prepare arguments
if [ "$#" -eq 0 ]; then
    echo "No arguments provided. Using defaults."
    ARGS="-batchmode -projectPath . -quit"
else
    ARGS="$@"
fi

# Add log file argument if not already specified
# Assumes execution within the project directory context set by the caller (unity-automation.js)
if [[ "$ARGS" != *"-logFile"* ]]; then
    LOGFILE="unity-$(date +%Y%m%d-%H%M%S).log"
    ARGS="$ARGS -logFile $LOGFILE"
    echo "Log file will be saved to: $LOGFILE"
fi

echo "Running Unity command: $UNITY_PATH $ARGS"

# Run Unity and tee the output to both the log file and stdout
# Use a temp file for the command output
TEMP_LOG=$(mktemp)
"$UNITY_PATH" $ARGS > "$TEMP_LOG" 2>&1 & 
PID=$!

# Tail the log file in real-time while Unity is running
if [[ "$ARGS" == *"-logFile"* ]]; then
    # Extract the logfile name from arguments
    LOG_PATTERN=".*-logFile[= ]([^ ]+).*"
    if [[ $ARGS =~ $LOG_PATTERN ]]; then
        UNITY_LOGFILE="${BASH_REMATCH[1]}"
        echo "Streaming Unity log file: $UNITY_LOGFILE"
        # Wait for log file to be created
        while [ ! -f "$UNITY_LOGFILE" ] && kill -0 $PID 2>/dev/null; do
            sleep 0.5
        done
        # Tail the log if it exists
        if [ -f "$UNITY_LOGFILE" ]; then
            tail -f "$UNITY_LOGFILE" &
            TAIL_PID=$!
        fi
    fi
fi

# Wait for Unity to exit
wait $PID
EXIT_CODE=$?

# Stop the tail process if it's running
if [ ! -z ${TAIL_PID+x} ]; then
    kill $TAIL_PID 2>/dev/null || true
fi

# Output the temp log
cat "$TEMP_LOG"
rm "$TEMP_LOG"

echo "Unity process finished with exit code: $EXIT_CODE"
exit $EXIT_CODE 