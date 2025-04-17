# BackSpace Scripts

This directory contains automation scripts used by BackSpace for Unity integration and other tasks.

## Unity WebGL Build and Live Coding Workflow

The Unity automation scripts support a powerful live coding workflow for WebGL development that enables rapid iteration without full rebuilds:

### Source and Build Directories

```
Source Directories:
- /CraftSpace/Unity/CraftSpace/Assets/WebGLTemplates/SpaceCraft (HTML/JS template)
- /CraftSpace/Unity/CraftSpace/Assets/StreamingAssets/Bridge (Bridge integration files)

Build Directory:
- /CraftSpace/Unity/CraftSpace/Builds/SpaceCraft
```

### Workflow Commands

1. **unity:build-webgl**
   - Executes Unity WebGL build process (Build.BuildWebGL_Prod method)
   - Unity copies files from WebGLTemplates/SpaceCraft and StreamingAssets/Bridge into the Builds/SpaceCraft directory
   - The build directory is .gitignored as it contains ephemeral build artifacts

2. **unity:serve-webgl**
   - Runs `http-server` on the build directory
   - Opens a browser to test the WebGL build
   - Supports live development by modifying files directly in the build directory

3. **unity:diff-webgl**
   - Shows differences between the (potentially modified) build files and original source files
   - Uses `diff` with carefully selected exclusions to ignore irrelevant files (meta files, etc.)
   - Makes it easy to see what changes you've made during live coding

4. **unity:unbuild-webgl**
   - The inverse of the build process
   - Uses `rsync` to copy modified files from the build directory back to the respective source directories
   - Preserves changes you've made during live coding
   - Critical for the iterative development cycle

5. **unity:deploy-webgl**
   - Copies the WebGL build to the WebSites/spacetime directory
   - This directory is set up for automatic deployment through GitHub Actions
   - Enables easy sharing of builds with team members and stakeholders

### Dual Source Structure

The WebGL template system in Unity separates files into two categories:

- **WebGLTemplates**: Different wrapper/container templates for the WebGL player
  - Contains top-level HTML, CSS, and JavaScript files
  - Different templates can have different layouts, loading screens, etc.

- **StreamingAssets**: Files included with the build that are loaded at runtime
  - Contains Bridge integration files
  - Common across all templates
  - Accessible via standardized paths in the Unity runtime

This separation allows developers to create different WebGL templates for different contexts while sharing the same core Bridge functionality.

## Unity Automation Scripts

### unity-automation.js

The main automation script for Unity operations. It provides a command-line interface to automate various Unity tasks.

#### Architecture

- Uses `unity-env.js` to discover Unity installations and project settings
- Provides a consistent interface for all Unity-related commands
- Handles cross-platform compatibility for macOS, Windows, and Linux

#### Command Structure

```
tsx scripts/unity-automation.js <command> [options]
```

Available commands:

- `generate-schemas`: Generate C# classes from JSON schemas
- `build-dev`: Build Unity project in development mode
- `build-prod`: Build Unity project in production mode
- `build-webgl-dev`: Build WebGL project in development mode
- `build-webgl-prod`: Build WebGL project in production mode
- `unbuild-webgl`: Copy files from build back to source
- `diff-webgl`: Show differences between build output and source
- `serve-webgl`: Serve the built WebGL files for testing
- `ci`: Run Unity CI build
- `check-logs`: Check Unity logs for errors
- `install`: Create Unity automation files
- `list-versions`: List installed Unity versions

Options:
- `--verbose`: Enable detailed logging

#### Advanced Usage

**Custom Exclude Patterns for diff-webgl:**

The `diff-webgl` command uses a temporary exclude file to filter out certain files from the comparison. The current exclude patterns are:

```
Build/
Build
StreamingAssets
StreamingAssets/
GUID.txt
ProjectVersion.txt
dependencies.txt
*.meta
thumbnail.png
```

**Build Process Details:**

The build process works by creating a shell script (`run-unity.sh`) that wraps the Unity executable and handles command-line arguments. This script is placed in the Unity project directory and is responsible for:

1. Checking that Unity is available at the path provided by `UNITY_PATH`
2. Setting up appropriate logging
3. Executing Unity with the specified arguments
4. Handling output streaming and process termination

### unity-env.js

Discovers Unity installations and project settings, generating environment variables for Unity automation.

#### Environment Discovery

This script performs the following discovery steps:

1. Locates the Unity project path
2. Discovers installed Unity versions on the system
3. Determines the correct Unity version to use (from environment, project settings, or available versions)
4. Calculates the path to the Unity executable
5. Extracts project settings (version, product name, company name)

#### Using as a Module

```javascript
import { discoverUnityEnvironment } from './unity-env.js';

// With silent operation (default)
const env = await discoverUnityEnvironment();

// With verbose output
const verboseEnv = await discoverUnityEnvironment({ verbose: true });
```

#### Platform-Specific Paths

The script handles different file paths across operating systems:

**macOS:**
- User Hub Path: `~/Library/Application Support/Unity/Hub/Editor/`
- System Hub Path: `/Applications/Unity/Hub/Editor/`

**Windows:**
- Program Files Path: `C:\Program Files\Unity\Hub\Editor\`
- AppData Path: `%APPDATA%\Unity\Hub\Editor\`

**Linux:**
- Hub Path: `~/.config/Unity/Hub/Editor/`

## Using with npm Scripts

The BackSpace package.json includes wrapper scripts for all these commands:

```bash
# Examples
npm run unity:generate-schemas
npm run unity:build-webgl
npm run unity:diff-webgl -- --verbose
```

See the main README.md for more information on available npm scripts.

## Debugging

If you encounter issues with the Unity automation:

1. Run with the `--verbose` flag to see detailed output
2. Check Unity logs with `unity:logs`
3. Verify your Unity installation paths with `unity:env`
4. Ensure the Unity executable is accessible at the path reported by `unity:env`

## Extending

To add new commands:

1. Add a new case to the switch statement in unity-automation.js
2. Implement the command function
3. Add the command to the help text
4. Add a corresponding npm script in package.json 