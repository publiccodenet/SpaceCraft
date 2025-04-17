#!/bin/bash

# Unity Environment Setup Script
# This script discovers the Unity version and sets up environment variables
# It can be sourced directly or used in CI/CD pipelines
#
# Environment Variables:
#   UNITY_PRECONFIGURED - Set to 'true' if running on a preconfigured runner
#   UNITY_APP - Path to the Unity project
#   UNITY_VERSION - Version of Unity to use (optional on preconfigured runners)
#   UNITY_PATH - Direct path to Unity executable (optional on preconfigured runners)

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Check for preconfigured environment
if [ "${UNITY_PRECONFIGURED}" = "true" ]; then
  echo "Running on preconfigured Unity environment"
  
  # Validate required environment
  if [ -z "${UNITY_APP}" ]; then
    echo "Error: UNITY_APP must be set on preconfigured runners"
    export UNITY_PROJECT_FOUND='false'
    return 1
  fi
  
  # Check if the project exists
  if [ ! -d "${UNITY_APP}" ]; then
    echo "Error: Unity project not found at: ${UNITY_APP}"
    export UNITY_PROJECT_FOUND='false'
    return 1
  fi
  
  # Set basic environment variables
  export UNITY_PROJECT_FOUND='true'
  
  # Use project version if not specified explicitly
  if [ -z "${UNITY_VERSION}" ] && [ -f "${UNITY_APP}/ProjectSettings/ProjectVersion.txt" ]; then
    UNITY_VERSION=$(grep "m_EditorVersion:" "${UNITY_APP}/ProjectSettings/ProjectVersion.txt" | cut -d: -f2 | tr -d ' \r\n')
    if [ -n "${UNITY_VERSION}" ]; then
      export UNITY_VERSION
      echo "Using project Unity version: ${UNITY_VERSION}"
    fi
  fi
  
  # Determine Unity path on macOS if not specified
  if [ -z "${UNITY_PATH}" ] && [ -n "${UNITY_VERSION}" ] && [ "$(uname)" = "Darwin" ]; then
    UNITY_PATH="/Applications/Unity/Hub/Editor/${UNITY_VERSION}/Unity.app/Contents/MacOS/Unity"
    if [ -f "${UNITY_PATH}" ]; then
      export UNITY_PATH
      echo "Using Unity at: ${UNITY_PATH}"
    else
      echo "Warning: Could not find Unity at: ${UNITY_PATH}"
      # Don't return an error, as the preconfigured runner might have a custom location
    fi
  fi
  
  # Build directory and timestamp
  export UNITY_BUILD_TIMESTAMP=$(date '+%Y%m%d%H%M%S')
  export UNITY_BUILD_DIR="${UNITY_APP}/Builds"
  
else
  # Standard environment discovery
  # Check if the environment file exists
  ENV_FILE="$SCRIPT_DIR/../.unity-env"

  # Force regeneration if requested
  if [ "$1" == "--force" ]; then
    rm -f "$ENV_FILE"
  fi

  # Generate the environment file if it doesn't exist
  if [ ! -f "$ENV_FILE" ]; then
    echo "Generating Unity environment variables..."
    node "$SCRIPT_DIR/unity-env.js" --shell --verbose > "$ENV_FILE"
    if [ $? -ne 0 ]; then
      echo "Error: Failed to generate Unity environment variables"
      # Create a minimal environment file to avoid future errors
      echo "export UNITY_PROJECT_FOUND='false'" > "$ENV_FILE"
    fi
  fi

  # Source the environment file
  source "$ENV_FILE"
fi

# Print a summary
if [ "${UNITY_PROJECT_FOUND}" != "false" ]; then
  echo "Unity environment set up successfully"
  echo "Unity Project: ${UNITY_APP}"
  
  # Only show version and path if available
  if [ -n "${UNITY_VERSION}" ]; then
    echo "Unity Version: ${UNITY_VERSION}"
  fi
  if [ -n "${UNITY_PATH}" ]; then
    echo "Unity Path: ${UNITY_PATH}"
  fi
  if [ -n "${UNITY_PROJECT_NAME}" ]; then
    echo "Project Name: ${UNITY_PROJECT_NAME}"
  fi
  
  # Show preconfigured status
  if [ "${UNITY_PRECONFIGURED}" = "true" ]; then
    echo "Using preconfigured Unity environment"
  fi
else
  echo "Warning: Unity project not found or environment setup failed"
fi 