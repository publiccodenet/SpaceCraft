#!/bin/bash

# CI build script for CraftSpace
# This script performs a full CI build sequence:
# 1. Regenerates schemas from source files
# 2. Runs all tests
# 3. Builds a production build

set -e  # Exit on any error

# Set Unity version if not already set
if [ -z "$UNITY_VERSION" ]; then
    export UNITY_VERSION="2022.3.5f1"
    echo "Using default Unity version: $UNITY_VERSION"
fi

echo "=== CraftSpace CI Build ==="
echo "Starting CI build at $(date)"
echo "Using Unity version: $UNITY_VERSION"

# Step 1: Regenerate schemas
echo -e "\n=== Step 1: Regenerating Schemas ==="
./run-unity.sh -batchmode -projectPath . -executeMethod CraftSpace.Editor.RegenerateSchemas.Regenerate -quit
if [ $? -ne 0 ]; then
    echo "Error: Schema regeneration failed!"
    exit 1
fi
echo "Schema regeneration completed successfully."

# Step 2: Run tests
echo -e "\n=== Step 2: Running Tests ==="
./run-unity.sh -batchmode -projectPath . -runTests -testResults ./test-results.xml -quit
if [ $? -ne 0 ]; then
    echo "Error: Tests failed!"
    exit 1
fi
echo "Tests completed successfully."

# Step 3: Build production
echo -e "\n=== Step 3: Building Production Version ==="
./run-unity.sh -batchmode -projectPath . -executeMethod Build.BuildProd -quit
if [ $? -ne 0 ]; then
    echo "Error: Build failed!"
    exit 1
fi
echo "Production build completed successfully."

echo -e "\n=== CI Build Completed Successfully ==="
echo "Build completed at $(date)"

# Print build artifacts information
echo -e "\n=== Build Artifacts ==="
find ./Builds -type f -name "*.exe" -o -name "*.app" -o -name "*.apk" | while read file; do
    size=$(du -h "$file" | cut -f1)
    echo "- $file ($size)"
done

exit 0 