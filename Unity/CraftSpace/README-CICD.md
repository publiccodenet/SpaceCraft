# Unity CI/CD Setup for CraftSpace

This document explains how to set up continuous integration and deployment for the CraftSpace Unity project.

## Prerequisites

- Unity Hub installed
- Unity 2022.3.5f1 or compatible version installed
- Node.js 14+ installed
- npm 6+ installed
- Bash shell support (included in macOS/Linux, Git Bash or WSL on Windows)

## Local Development

### Regenerating Schemas

You have multiple options to regenerate schemas:

1. **Using Unity Editor UI**:
   - Open the Unity Editor
   - Go to `Tools > CraftSpace > Regenerate Schemas`

2. **Using npm script**:
   ```bash
   # From project root
   npm run regenerate-schemas
   
   # Or from Unity/CraftSpace directory
   cd Unity/CraftSpace
   npm run regenerate-schemas
   ```

### Building the Project

1. **Using Unity Editor UI**:
   - Open the Unity Editor
   - Go to `Build > Development Build` or `Build > Production Build`

2. **Using npm script**:
   ```bash
   # From project root
   npm run build-dev    # For development build
   npm run build-prod   # For production build
   
   # Or from Unity/CraftSpace directory
   cd Unity/CraftSpace
   npm run build-dev    # For development build
   npm run build-prod   # For production build
   ```

## Self-Hosted CI/CD Setup

### Setting Up a Self-Hosted Mac for CI/CD

1. **Install requirements**:
   ```bash
   # Install Node.js and npm
   brew install node
   
   # Install Unity Hub (if not already installed)
   brew install --cask unity-hub
   
   # Install Unity (through Unity Hub UI or command line)
   ```

2. **Create a CI/CD service account** with minimal permissions.

3. **Set up Git access** for the service account to pull your repository.

4. **Configure environment variables**:
   
   You can configure Unity execution by setting these environment variables:
   
   ```bash
   # Specify a specific Unity installation by version
   export UNITY_VERSION=2022.3.5f1
   
   # Or specify the exact path to Unity
   export UNITY_PATH=/Applications/Unity/Hub/Editor/2022.3.5f1/Unity.app/Contents/MacOS/Unity
   ```

5. **Configure build automation**:
   ```bash
   # Clone the repository
   git clone https://github.com/your-org/CraftSpace.git
   cd CraftSpace
   
   # Install dependencies
   npm install
   
   # Run CI/CD commands
   npm run regenerate-schemas
   npm run test
   npm run build-prod
   ```

### Running Unity in Headless Mode

The project uses a flexible wrapper script (`run-unity.sh`) to handle Unity execution. This script:

1. Automatically finds Unity based on environment variables
2. Works across different operating systems
3. Generates appropriate log files
4. Handles error codes properly

The script can be called directly:

```bash
# Execute with specific arguments
./run-unity.sh -batchmode -projectPath . -executeMethod Build.BuildProd -quit

# Or with environment variables
UNITY_VERSION=2021.3.16f1 ./run-unity.sh -batchmode -executeMethod CraftSpace.Editor.RegenerateSchemas.Regenerate -quit
```

All npm scripts have been configured to use this wrapper script.

### Multiple Unity Versions

The `run-unity.sh` script makes it easy to work with multiple Unity versions:

```bash
# For CI/CD builds, use a specific version
UNITY_VERSION=2022.3.5f1 npm run build-prod

# For local testing, use another version
UNITY_VERSION=2021.3.16f1 npm run test
```

This approach allows you to run CI/CD builds using one version of Unity while actively developing with another.

### Log File Analysis

Use the `check-unity-logs` script to check for errors in Unity logs:

```bash
npm run check-unity-logs
```

## Troubleshooting

### Common Issues

1. **Unity Not Found**:
   - The script will attempt to find Unity installations
   - Set `UNITY_PATH` or `UNITY_VERSION` to explicitly choose an installation

2. **Permission Issues**:
   - Make sure `run-unity.sh` is executable with `chmod +x run-unity.sh`
   - Ensure the CI/CD user has appropriate permissions to run Unity

3. **License Activation**:
   - Unity requires license activation even in headless mode
   - See Unity's documentation for activating licenses in CI/CD environments

## Resources

- [Unity Command Line Arguments](https://docs.unity3d.com/Manual/CommandLineArguments.html)
- [Unity Build Automation](https://docs.unity3d.com/Manual/BuildPlayerPipeline.html)
- [Unity Headless Mode](https://docs.unity3d.com/Manual/PlayerSettingsStandalone.html#BatchMode) 