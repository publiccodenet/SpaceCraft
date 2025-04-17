#!/usr/bin/env node

/**
 * Unity Automation Script
 * 
 * This script provides a command-line interface to automate Unity operations
 * from the BackSpace application.
 * 
 * Usage:
 *   tsx scripts/unity-automation.js regenerate-schemas
 *   tsx scripts/unity-automation.js build-dev
 *   tsx scripts/unity-automation.js build-prod
 *   tsx scripts/unity-automation.js test
 *   tsx scripts/unity-automation.js ci
 *   tsx scripts/unity-automation.js list-versions
 * 
 * Environment Variables:
 *   UNITY_PRECONFIGURED - Set to 'true' if running on a preconfigured runner
 *   UNITY_APP - Path to the Unity project (default: '../../Unity/CraftSpace')
 *   UNITY_VERSION - Version of Unity to use
 *   UNITY_PATH - Direct path to Unity executable
 */

import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import os from 'os';
import { fileURLToPath } from 'url';

// Import the discovery function
import { discoverUnityEnvironment } from './unity-env.js';

// ESM-compatible way to get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants (resolved based on where unity-automation.js is)
const UNITY_APP_CONFIG_KEY = 'UNITY_APP'; // Use a key for clarity
const UNITY_PROJECT_PATH_FROM_ENV = process.env[UNITY_APP_CONFIG_KEY];
const UNITY_AUTOMATION_DIR = __dirname;

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const verboseFlag = args.includes('--verbose');

if (!command) {
  showHelp();
  process.exit(1);
}

// Main Execution block
(async () => {
  // Discover Unity environment
  try {
    console.log(chalk.blue(`=== Unity Automation: ${command} ===`));
    
    // Run discovery silently unless verbose mode is enabled
    const unityEnv = await discoverUnityEnvironment({ verbose: verboseFlag });
    
    // Check if project was found
    if (unityEnv.UNITY_PROJECT_FOUND !== 'true') {
        console.error(chalk.red('Unity project discovery failed. Check paths and unity-env.js logs.'));
        process.exit(1);
    }

    // Extract key paths for convenience
    const UNITY_PROJECT_PATH = unityEnv.UNITY_APP;
    const UNITY_EXECUTABLE_SCRIPT = path.join(UNITY_PROJECT_PATH, 'run-unity.sh');

    // Make run-unity.sh executable if it exists
    if (fs.existsSync(UNITY_EXECUTABLE_SCRIPT)) {
      try {
        fs.chmodSync(UNITY_EXECUTABLE_SCRIPT, 0o755);
      } catch (err) {
        console.error(chalk.red(`Error setting executable permissions for run-unity.sh: ${err.message}`));
      }
    } else if (verboseFlag) {
      console.warn(chalk.yellow(`run-unity.sh not found at ${UNITY_EXECUTABLE_SCRIPT}. Run 'npm run unity:setup' or check path constants.`));
    }

    if (verboseFlag) {
      console.log(chalk.gray(`Unity Project Path: ${UNITY_PROJECT_PATH}`));
    }

    // Check if UNITY_PATH was found before attempting commands that need it
    const needsUnityPath = !['install', 'list-versions', 'check-logs'].includes(command);
    if (needsUnityPath && !unityEnv.UNITY_PATH) {
        console.error(chalk.red('Failed to determine UNITY_PATH via unity-env.js. Cannot execute Unity command.'));
        console.error(chalk.yellow('Ensure Unity is installed and discoverable, or set UNITY_PATH/UNITY_VERSION manually in your environment.'));
        process.exit(1);
    }

    switch (command) {
      case 'regenerate-schemas':
      case 'generate-schemas':
        await runUnityCommand('-batchmode -projectPath . -ignoreCompilerErrors -executeMethod CraftSpace.Editor.SchemaGenerator.ImportAllSchemasMenuItem -quit -logFile -', unityEnv);
        break;
      case 'build-dev':
        await runUnityCommand('-batchmode -projectPath . -executeMethod Build.BuildDev -quit -logFile -', unityEnv);
        break;
      case 'build-prod':
        await runUnityCommand('-batchmode -projectPath . -executeMethod Build.BuildProd -quit -logFile -', unityEnv);
        break;
      case 'build-webgl-dev':
        await runUnityCommand('-batchmode -projectPath . -executeMethod Build.BuildWebGL_Dev -quit -logFile -', unityEnv);
        break;
      case 'build-webgl-prod':
        await runUnityCommand('-batchmode -projectPath . -executeMethod Build.BuildWebGL_Prod -quit -logFile -', unityEnv);
        break;
      case 'unbuild-webgl':
        await unbuildWebGL(unityEnv);
        break;
      case 'diff-webgl':
        await diffWebGL(unityEnv);
        break;
      case 'test':
      case 'serve-webgl':
        await serveWebGLBuild();
        break;
      case 'ci':
        // CI script likely runs unity-env itself, so just execute
        await runShellScript('./ci-build.sh', UNITY_PROJECT_PATH);
        break;
      case 'check-logs':
        await checkLogs(UNITY_PROJECT_PATH);
        break;
      case 'install':
        // Install doesn't need the full env setup, just creates files
        await createUnityFiles(UNITY_PROJECT_PATH);
        console.log(chalk.green('Unity automation files created successfully!'));
        break;
      case 'list-versions':
        // Use unity-env to list versions
        await listUnityVersions();
        break;
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error during command execution: ${error.message}`));
    // Always log stack trace for debugging
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
  }
})(); 

/**
 * Run a Unity command using the run-unity.sh script
 * @param {string} args Arguments to pass to Unity
 * @param {object} env Environment variables discovered by discoverUnityEnvironment
 */
async function runUnityCommand(args, env) {
  console.log(chalk.blue(`Running Unity command: ${args}`));
  
  const unityProjectPath = env.UNITY_APP;
  const unityExecutableScript = path.join(unityProjectPath, 'run-unity.sh');

  if (!fs.existsSync(unityExecutableScript)) {
    console.error(chalk.red(`Unity executable script not found at: ${unityExecutableScript}`));
    try {
        // Pass the correct project path to the creation function
        await createUnityExecutableScript(unityProjectPath);
    } catch (createErr) {
        console.error(chalk.red(`Failed to create run-unity.sh: ${createErr.message}`));
        throw new Error('Unity executable script not found and could not be created');
    }
  }
  
  try {
    const cmd = `cd "${unityProjectPath}" && ./run-unity.sh ${args}`;
    console.log(chalk.gray(`Executing: ${cmd}`));
    
    // Execute the command and stream output, passing the discovered environment
    // Merge discovered env with process.env, giving priority to discovered ones
    const executionEnv = { ...process.env, ...env };

    execSync(cmd, { stdio: 'inherit', env: executionEnv });
    
    console.log(chalk.green('Command completed successfully!'));
  } catch (error) {
    console.error(chalk.red(`Command failed with exit code: ${error.status}`));
    throw error;
  }
}

/**
 * Run a shell script in the Unity project directory
 * @param {string} scriptName Relative name of the script (e.g., ./ci-build.sh)
 * @param {string} unityProjectPath Absolute path to the Unity project
 */
async function runShellScript(scriptName, unityProjectPath) {
  console.log(chalk.blue(`Running script: ${scriptName}`));
  
  if (!fs.existsSync(unityProjectPath)) {
     console.error(chalk.red(`Unity project directory not found at: ${unityProjectPath}`));
     throw new Error('Unity project directory not found');
  }
  
  const scriptPath = path.join(unityProjectPath, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.error(chalk.red(`Script not found at: ${scriptPath}`));
    throw new Error('Script not found');
  }
  
  try {
    const cmd = `cd "${unityProjectPath}" && ${scriptName.startsWith('./') ? scriptName : './' + scriptName}`;
    console.log(chalk.gray(`Executing: ${cmd}`));
    
    execSync(cmd, { stdio: 'inherit' }); // Assuming CI script manages its own environment
    console.log(chalk.green('Script completed successfully!'));
  } catch (error) {
    console.error(chalk.red(`Script failed with exit code: ${error.status}`));
    throw error;
  }
}

/**
 * Check Unity logs for errors
 * @param {string} unityProjectPath Absolute path to the Unity project
 */
async function checkLogs(unityProjectPath) {
  console.log(chalk.blue('Checking Unity logs for errors...'));
  
  if (!fs.existsSync(unityProjectPath)) {
     console.error(chalk.red(`Unity project directory not found at: ${unityProjectPath}`));
     throw new Error('Unity project directory not found');
  }
  
  try {
    // Check if any log files exist
    const logsPattern = path.join(unityProjectPath, 'unity-*.log');
    // Use platform-independent globbing or find if needed
    const findCmd = process.platform === 'win32' 
        ? `dir /b "${logsPattern}"` 
        : `find "${unityProjectPath}" -maxdepth 1 -name "unity-*.log"`;
    let logFiles = '';
    try { logFiles = execSync(findCmd, { encoding: 'utf8' }); } catch(e) { /* ignore find errors */ }
    
    if (!logFiles.trim()) {
      console.log(chalk.yellow('No Unity log files found.'));
      return;
    }
    
    // Use platform-independent grep
    const grepCmd = process.platform === 'win32'
        ? `findstr /i /c:"error" "${logsPattern}"`
        : `grep -i error ${logsPattern.replace(/\//g, '/')}`;
        
    try {
        const result = execSync(grepCmd, { encoding: 'utf8' });
        if (result.trim()) {
            console.log(chalk.yellow('Errors found in Unity logs:'));
            console.log(result);
        } else {
             console.log(chalk.green('No errors found in Unity logs!'));
        }
    } catch (grepError) {
        // Grep returns non-zero if no match
        if (grepError.status === 1 || (process.platform === 'win32' && grepError.status !== 0)) {
            console.log(chalk.green('No errors found in Unity logs!'));
        } else {
            throw grepError; // Rethrow actual errors
        }
    }
  } catch (error) {
    console.error(chalk.red(`Error checking logs: ${error.message}`));
    throw error;
  }
}

/**
 * Create the run-unity.sh script in the Unity project
 * @param {string} unityProjectPath Absolute path to the Unity project
 */
async function createUnityExecutableScript(unityProjectPath) {
  const unityExecutableScript = path.join(unityProjectPath, 'run-unity.sh');
  // Create directory if it doesn't exist
  if (!fs.existsSync(unityProjectPath)) {
    console.log(chalk.yellow(`Unity project directory doesn't exist at ${unityProjectPath}. Creating it...`));
    fs.mkdirpSync(unityProjectPath);
  }

  // Use the simplified run-unity.sh content
  const scriptContent = `#!/bin/bash

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

# Check if -logFile - is specified (stream to stdout)
if [[ "$ARGS" == *"-logFile -"* ]]; then
    echo "Streaming Unity logs directly to stdout"
    # Run Unity and pass stdout/stderr through directly
    "$UNITY_PATH" $ARGS
    EXIT_CODE=$?
else
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
    if [ ! -z \${TAIL_PID+x} ]; then
        kill $TAIL_PID 2>/dev/null || true
    fi

    # Output the temp log
    cat "$TEMP_LOG"
    rm "$TEMP_LOG"
fi

echo "Unity process finished with exit code: $EXIT_CODE"
exit $EXIT_CODE`;

  // Write the script file
  try {
    fs.writeFileSync(unityExecutableScript, scriptContent, { mode: 0o755 });
    console.log(chalk.green(`Created Unity executable script at: ${unityExecutableScript}`));
  } catch (error) {
    console.error(chalk.red(`Error creating script: ${error.message}`));
    throw error;
  }
}

/**
 * Create Unity automation files in the project
 * @param {string} unityProjectPath Absolute path to the Unity project
 */
async function createUnityFiles(unityProjectPath) {
  // Create run-unity.sh first
  await createUnityExecutableScript(unityProjectPath);
}

/**
 * List installed Unity versions
 */
async function listUnityVersions() {
  console.log(chalk.blue('Discovering installed Unity versions...'));
  
  try {
    // Call unity-env directly to list versions
    const env = await discoverUnityEnvironment();
    
    if (env.UNITY_VERSIONS_FOUND) {
      const versions = env.UNITY_VERSIONS_FOUND.split(',').filter(Boolean);
      if (versions.length > 0) {
        console.log(chalk.green(`Found ${versions.length} Unity versions:`));
        versions.forEach((version, index) => {
          const isActive = version === env.UNITY_VERSION ? ' (active)' : '';
          console.log(chalk.white(`  ${index + 1}. ${version}${isActive}`));
        });
        return;
      }
    }
    
    console.log(chalk.yellow('No Unity versions found.'));
  } catch (error) {
    console.error(chalk.red(`Error listing Unity versions: ${error.message}`));
    throw error;
  }
}

/**
 * Starts a local HTTP server to serve the latest WebGL build for manual testing.
 */
async function serveWebGLBuild() {
    console.log(chalk.blue('Serving latest WebGL build for manual testing...'));
    // Correctly resolve the path from the script directory up 3 levels to project root, then down
    const buildDir = path.resolve(__dirname, '../../../Unity/CraftSpace/Builds/SpaceCraft');
    
    if (!fs.existsSync(buildDir)) {
        console.error(chalk.red(`Build directory not found: ${buildDir}`));
        console.error(chalk.yellow('Please run a WebGL build first (e.g., npm run unity:build-webgl).'));
        process.exit(1);
    }
    
    console.log(chalk.green(`Attempting to serve build from: ${buildDir}`));
    console.log(chalk.cyan('Starting local web server. Press Ctrl+C to stop.'));
    console.log(chalk.cyan('Attempting to open browser at http://localhost:8080 ...'));
    
    // Use child_process to run npx http-server in the background
    const serverCommand = `npx http-server . -p 8080 -o`;
    console.log(chalk.gray(`Executing: ${serverCommand} in ${buildDir}`));

    const serverProcess = exec(serverCommand, { cwd: buildDir }, (error, stdout, stderr) => {
         if (error) {
            console.error(chalk.red(`Server Error: ${error.message}`));
            if (error.message.includes('not found') || error.message.includes('npx' + ' is not recognized')) {
                console.error(chalk.yellow('Suggestion: Ensure Node.js and npm are installed correctly and in your PATH. You might need to install http-server globally (`npm install -g http-server`) if npx fails.'));
            }
            // Don't exit the main script here, just log the server error
            return; 
        }
        if (stderr) {
            // http-server often prints startup info to stderr, filter known messages
            const knownMessages = ['Starting up http-server', 'Available on:'];
            if (!knownMessages.some(msg => stderr.includes(msg))) {
                console.error(chalk.red(`Server Stderr: ${stderr}`));
            }
            return;
        }
        // Log stdout only if it contains something unexpected
        if (stdout && stdout.trim().length > 0) {
            console.log(`Server Stdout: ${stdout}`);
        }
    });

    serverProcess.on('exit', (code) => {
        // Only log unexpected exits
        if (code !== null && code !== 0) { 
            console.log(chalk.yellow(`Server process exited unexpectedly with code ${code}`));
        } else {
             console.log(chalk.yellow(`Server process stopped.`));
        }
        // Allow the main script to exit naturally when the server stops or is killed
        process.exit(code ?? 0); 
    });

    // Graceful shutdown handling
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\nCaught interrupt signal (Ctrl+C). Shutting down server...'));
        serverProcess.kill('SIGINT'); 
        // Allow time for server process to exit before node script exits
        setTimeout(() => process.exit(0), 500); 
    });

    // Keep the script alive until the server is killed or exits
    // The promise is no longer needed because process.on('SIGINT') and serverProcess.on('exit') handle termination.
    // await new Promise(() => {}); 
}

/**
 * Unbuild WebGL - Copy files from build output back to source directories
 * This is used to capture changes made during runtime to the WebGL template and StreamingAssets
 * @param {object} env Environment variables discovered by discoverUnityEnvironment
 */
async function unbuildWebGL(env) {
  console.log(chalk.blue('Unbuilding WebGL - Copying changes from build output back to source'));
  
  const unityProjectPath = env.UNITY_APP;
  const buildPath = path.join(unityProjectPath, 'Builds/SpaceCraft');
  const webGLTemplatePath = path.join(unityProjectPath, 'Assets/WebGLTemplates/SpaceCraft');
  const streamingAssetsPath = path.join(unityProjectPath, 'Assets/StreamingAssets/Bridge');
  
  // Check if the paths exist
  if (!fs.existsSync(buildPath)) {
    console.error(chalk.red(`Build path not found: ${buildPath}`));
    throw new Error('WebGL build not found. Run build-webgl first.');
  }

  try {
    // Ensure target directories exist
    fs.ensureDirSync(webGLTemplatePath);
    fs.ensureDirSync(streamingAssetsPath);

    // Copy from build to WebGL templates, excluding specific files
    const excludes = ['Build/', 'StreamingAssets/', 'GUID.txt', 'ProjectVersion.txt', 'dependencies.txt'];
    const excludeArgs = excludes.map(pattern => `--exclude='${pattern}'`).join(' ');
    
    const templateCmd = `rsync -av ${excludeArgs} "${buildPath}/" "${webGLTemplatePath}/"`;
    console.log(chalk.gray(`Executing: ${templateCmd}`));
    execSync(templateCmd, { stdio: 'inherit' });
    
    // Copy StreamingAssets/Bridge to Assets/StreamingAssets/Bridge
    const bridgeCmd = `rsync -av "${buildPath}/StreamingAssets/Bridge/" "${streamingAssetsPath}/"`;
    console.log(chalk.gray(`Executing: ${bridgeCmd}`));
    execSync(bridgeCmd, { stdio: 'inherit' });
    
    console.log(chalk.green('WebGL unbuild completed successfully!'));
  } catch (error) {
    console.error(chalk.red(`WebGL unbuild failed: ${error.message}`));
    throw error;
  }
}

/**
 * Diff WebGL - Show differences between build output and source directories
 * This helps identify changes that need to be unbuild
 * @param {object} env Environment variables discovered by discoverUnityEnvironment
 */
async function diffWebGL(env) {
  console.log(chalk.blue('Diffing WebGL - Checking for changes between build output and source'));
  
  const unityProjectPath = env.UNITY_APP;
  const buildPath = path.join(unityProjectPath, 'Builds/SpaceCraft');
  const webGLTemplatePath = path.join(unityProjectPath, 'Assets/WebGLTemplates/SpaceCraft');
  const streamingAssetsPath = path.join(unityProjectPath, 'Assets/StreamingAssets/Bridge');
  
  // Check if the paths exist
  if (!fs.existsSync(buildPath)) {
    console.error(chalk.red(`Build path not found: ${buildPath}`));
    throw new Error('WebGL build not found. Run build-webgl first.');
  }
  
  if (!fs.existsSync(webGLTemplatePath)) {
    console.error(chalk.red(`WebGL template path not found: ${webGLTemplatePath}`));
    throw new Error('WebGL template directory not found.');
  }
  
  if (!fs.existsSync(streamingAssetsPath)) {
    console.error(chalk.red(`StreamingAssets path not found: ${streamingAssetsPath}`));
    throw new Error('StreamingAssets/Bridge directory not found.');
  }
  
  try {
    // Create a temporary exclude file for diff
    const excludeFile = path.join(os.tmpdir(), 'unity-diff-exclude.txt');
    
    // List of files and directories to exclude from the diff
    // - '*.meta' ignores all Unity meta files that change frequently
    // - 'Build*' ignores the Build directory which is not relevant
    // - 'StreamingAssets*' ensures we only diff the Bridge subdirectory explicitly
    // - 'thumbnail.png' is auto-generated by Unity for WebGL templates
    const excludes = [
      'Build/', 
      'Build',
      'StreamingAssets',  // Ignore the entire StreamingAssets directory, we'll compare Bridge separately
      'StreamingAssets/', 
      'GUID.txt', 
      'ProjectVersion.txt', 
      'dependencies.txt',
      '*.meta',
      'thumbnail.png'     // Unity auto-generated thumbnail
    ];
    
    fs.writeFileSync(excludeFile, excludes.join('\n'));
    
    console.log(chalk.yellow('=== WebGL Template Differences ==='));
    console.log(chalk.gray(`< Repo: ${webGLTemplatePath}`));
    console.log(chalk.gray(`> Build: ${buildPath}`));
    const templateDiffCmd = `diff -r --exclude-from="${excludeFile}" "${buildPath}" "${webGLTemplatePath}" | grep -v ".meta"`;
    try {
      const templateDiff = execSync(templateDiffCmd, { encoding: 'utf8' });
      
      if (templateDiff.trim()) {
        console.log(templateDiff);
      } else {
        console.log(chalk.green('No differences in WebGL template files.'));
      }
    } catch (diffError) {
      // diff returns non-zero (1) if files differ
      if (diffError.status === 1 && diffError.stdout) {
        // Filter out .meta files from the output
        const filteredOutput = diffError.stdout.split('\n')
          .filter(line => !line.includes('.meta'))
          .join('\n');
        
        if (filteredOutput.trim()) {
          console.log(filteredOutput);
        } else {
          console.log(chalk.green('No differences in WebGL template files (excluding .meta files).'));
        }
      } else if (diffError.status > 1) {
        // Real error occurred
        console.error(chalk.red(`Diff error: ${diffError.message}`));
      } else {
        console.log(chalk.green('No differences in WebGL template files.'));
      }
    }
    
    // Diff the StreamingAssets/Bridge files
    console.log(chalk.yellow('\n=== StreamingAssets/Bridge Differences ==='));
    console.log(chalk.gray(`< Repo: ${streamingAssetsPath}`));
    console.log(chalk.gray(`> Build: ${buildPath}/StreamingAssets/Bridge`));
    const bridgeDiffCmd = `diff -r "${buildPath}/StreamingAssets/Bridge" "${streamingAssetsPath}" | grep -v ".meta"`;
    try {
      const bridgeDiff = execSync(bridgeDiffCmd, { encoding: 'utf8' });
      
      if (bridgeDiff.trim()) {
        console.log(bridgeDiff);
      } else {
        console.log(chalk.green('No differences in StreamingAssets/Bridge files.'));
      }
    } catch (diffError) {
      // diff returns non-zero (1) if files differ
      if (diffError.status === 1 && diffError.stdout) {
        // Filter out .meta files from the output for extra safety
        const filteredOutput = diffError.stdout.split('\n')
          .filter(line => !line.includes('.meta'))
          .join('\n');
        
        if (filteredOutput.trim()) {
          console.log(filteredOutput);
        } else {
          console.log(chalk.green('No differences in StreamingAssets/Bridge files (excluding .meta files).'));
        }
      } else if (diffError.status > 1) {
        // Real error occurred
        console.error(chalk.red(`Diff error: ${diffError.message}`));
      } else {
        console.log(chalk.green('No differences in StreamingAssets/Bridge files.'));
      }
    }
    
    // Clean up temporary exclude file
    fs.unlinkSync(excludeFile);
    
    console.log(chalk.green('\nWebGL diff completed!'));
  } catch (error) {
    console.error(chalk.red(`WebGL diff failed: ${error.message}`));
    throw error;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
${chalk.bold('Unity Automation Script')}

${chalk.italic('Usage:')}
  tsx scripts/unity-automation.js <command> [options]

${chalk.italic('Commands:')}
  generate-schemas      - Generate C# classes from JSON schemas
  build-dev             - Build Unity project in development mode
  build-prod            - Build Unity project in production mode
  build-webgl-dev       - Build WebGL project in development mode
  build-webgl-prod      - Build WebGL project in production mode
  unbuild-webgl         - Copy files from build back to source (for runtime changes)
  diff-webgl            - Show differences between build and source
  serve-webgl           - Serve the built WebGL files for testing
  ci                    - Run Unity CI build
  check-logs            - Check Unity logs for errors
  install               - Create Unity automation files
  list-versions         - List installed Unity versions

${chalk.italic('Options:')}
  --verbose             - Enable verbose logging (displays Unity environment discovery details)

${chalk.italic('Environment Variables:')}
  UNITY_APP             - Path to the Unity project (default: ../../Unity/CraftSpace)
  UNITY_VERSION         - Version of Unity to use
  UNITY_PATH            - Direct path to Unity executable
  `);
}