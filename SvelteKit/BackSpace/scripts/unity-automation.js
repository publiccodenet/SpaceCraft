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
 *   UNITY_APP - Path to the Unity project (default: '../../Unity/SpaceCraft')
 *   UNITY_VERSION - Version of Unity to use
 *   UNITY_PATH - Direct path to Unity executable
 */

import { execSync, exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import os from 'os';
import { fileURLToPath } from 'url';
import open from 'open';

// Import the discovery function
import { discoverUnityEnvironment } from './unity-env.js';

// ESM-compatible way to get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define certs directory path
const CERTS_DIR = path.join(__dirname, 'certs');
const CERT_KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_CRT_PATH = path.join(CERTS_DIR, 'server.crt');

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
        await runUnityCommand('-batchmode -projectPath . -ignoreCompilerErrors -executeMethod SpaceCraftEditor.SchemaGenerator.ImportAllSchemasMenuItem -quit -logFile -', unityEnv);
        break;
      case 'build-webgl-dev':
        await runUnityCommand('-batchmode -projectPath . -executeMethod Build.WebGL_Dev -quit -logFile -', unityEnv);
        break;
      case 'build-webgl-prod':
        await runUnityCommand('-batchmode -projectPath . -executeMethod Build.WebGL_Prod -quit -logFile -', unityEnv);
        break;
      case 'unbuild-webgl':
        await unbuildWebGL(unityEnv);
        break;
      case 'diff-webgl':
        await diffWebGL(unityEnv);
        break;
      case 'linkup-webgl':
        await linkupWebGL(unityEnv);
        break;
      case 'copydown-webgl':
        await copydownWebGL(unityEnv);
        break;
      case 'copyup-webgl':
        await copyupWebGL(unityEnv);
        break;
      case 'serve-webgl':
        await serveWebGLBuild();
        break;
      case 'install-unity':
        await installUnityBuild(args.slice(1));
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
      case 'detect-env':
        await detectEnvironment(args);
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

// Helper function to get the local network IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    // Reset foundIp on each call to ensure fresh detection
    getLocalIpAddress.foundIp = null; 
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            // Skip over Docker and VM interfaces if possible (heuristic)
            if (iface.family === 'IPv4' && !iface.internal && !name.toLowerCase().includes('docker') && !name.toLowerCase().includes('vmware') && !name.toLowerCase().includes('virtualbox')) {
                 // Prioritize common interface names if available
                 const preferredInterfaces = ['en0', 'eth0', 'wlan0', 'wi-fi', 'ethernet']; // Added Ethernet
                 if (preferredInterfaces.some(pName => name.toLowerCase().includes(pName))) {
                      console.log(chalk.gray(`Found preferred interface '${name}' with IP: ${iface.address}`));
                     return iface.address; // Return immediately if preferred found
                 }
                 // Let's refine: Store the first valid one and check for preferred names
                 // If we find a preferred name later, it will overwrite this
                 if (!getLocalIpAddress.foundIp) {
                      console.log(chalk.gray(`Found potential interface '${name}' with IP: ${iface.address}`));
                      getLocalIpAddress.foundIp = iface.address;
                 }
            }
        }
    }
    // Return the IP from a preferred interface if found, otherwise the first valid one
    if (!getLocalIpAddress.foundIp) {
       console.log(chalk.gray('No suitable IPv4 interface found.'));
    }
    return getLocalIpAddress.foundIp || null;
}
getLocalIpAddress.foundIp = null; // Initialize static-like property

/**
 * Starts a local HTTPS server to serve the latest WebGL build for manual testing,
 * automatically detecting the local IP, generating certs, and opening the browser.
 */
async function serveWebGLBuild() {
    console.log(chalk.blue('Serving latest WebGL build over HTTPS with automatic IP detection...'));

    const PORT = 8080; 

    const localIp = getLocalIpAddress();
    let host = localIp; // Keep host potentially null for now
    let useHttps = true; // Assume HTTPS by default
    let protocol = 'https';

    if (!localIp) {
        console.error(chalk.red('Could not automatically detect local network IP address.'));
        console.warn(chalk.yellow('Falling back to using localhost (127.0.0.1) over HTTP.'));
        console.warn(chalk.yellow('HTTPS requires a specific IP for certificate CN matching.'));
        host = '127.0.0.1';
        useHttps = false; // Fallback to HTTP for localhost
        protocol = 'http';
    } else {
        // --- Certificate Generation (only if IP was found) ---
        const certsGenerated = await generateCertificate(host);
        if (!certsGenerated) {
            console.warn(chalk.yellow('Certificate generation failed or OpenSSL not found.'));
            console.warn(chalk.yellow(`Falling back to using HTTP for host ${host}.`));
             useHttps = false; // Fallback to HTTP if certs fail
             protocol = 'http';
        }
    }
    
    // If host is still null after checks (shouldn't happen with fallback logic, but belt-and-suspenders)
    if (!host) host = '127.0.0.1'; 


    const baseUrl = `${protocol}://${host}:${PORT}`;
    // Correctly resolve the path from the script directory up 3 levels to project root, then down
    const buildDir = path.resolve(__dirname, '../../../Unity/SpaceCraft/Builds/SpaceCraft');

    if (!fs.existsSync(buildDir)) {
        console.error(chalk.red(`Build directory not found: ${buildDir}`));
        console.error(chalk.yellow('Please run a WebGL build first (e.g., npm run unity:build-webgl).'));
        process.exit(1);
    }

    const qrBaseUrlParam = `${baseUrl}/`;
    const urlToOpen = `${baseUrl}/index.html?base_url=${encodeURIComponent(qrBaseUrlParam)}`;

    console.log(chalk.green(`Serving build from: ${buildDir}`));
    console.log(chalk.cyan(`Server will be available at: ${baseUrl} (${protocol.toUpperCase()})`));
    console.log(chalk.cyan(`Browser will open at: ${urlToOpen}`));
    console.log(chalk.cyan(`QR Code Base URL will be set to: ${qrBaseUrlParam}`));
    console.log(chalk.cyan(`Starting local ${protocol.toUpperCase()} server. Press Ctrl+C to stop.`));

    // Base server arguments
    const serverArgs = [
        '.',
        '-p', PORT.toString(),
        '-a', host,
        '--cors'
    ];

    // Add HTTPS arguments if applicable
    if (useHttps) {
        serverArgs.push(
            '-S', // Enable SSL/HTTPS
            '-C', CERT_CRT_PATH, // Path to certificate
            '-K', CERT_KEY_PATH  // Path to private key
        );
    }

    console.log(chalk.gray(`Executing: npx http-server ${serverArgs.join(' ')} in ${buildDir}`));

    const serverProcess = spawn('npx', ['http-server', ...serverArgs], {
        cwd: buildDir,
        stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(chalk.grey(`[http-server] ${data.toString().trim()}`));
    });

    serverProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('ERR_SOCKET_BAD_PORT') || message.includes('EADDRINUSE')) {
             console.error(chalk.red(`[http-server] Port ${PORT} already in use.`));
             process.exit(1);
        }
        // Add check for cert/key file errors when using HTTPS
        if (useHttps && message.includes('ENOENT') && (message.includes(path.basename(CERT_CRT_PATH)) || message.includes(path.basename(CERT_KEY_PATH)))) {
             console.error(chalk.red(`[http-server] Certificate or Key file not found. Expected in:`));
             console.error(chalk.red(`  ${CERTS_DIR}`));
             console.error(chalk.yellow(` Ensure OpenSSL is installed and ran successfully, or delete the '${CERTS_DIR}' directory and retry.`));
             process.exit(1);
        }
         // Ignore common informational messages from http-server on stderr
         if (!message.includes('Starting up http-server') && !message.includes('Available on')) {
            console.error(chalk.yellow(`[http-server stderr] ${message}`));
        }
    });


    serverProcess.on('error', (error) => {
        console.error(chalk.red(`Failed to start server process: ${error.message}`));
         if (error.message.includes('ENOENT') || error.message.includes('not found')) {
             console.error(chalk.yellow('Suggestion: Ensure Node.js and npm/npx are installed correctly and in your PATH. You might need to install http-server globally (`npm install -g http-server`) if npx fails.'));
         }
        process.exit(1);
    });

    serverProcess.on('close', (code) => {
        if (code !== null && code !== 0) {
            console.log(chalk.yellow(`Server process exited unexpectedly with code ${code}`));
        } else {
            console.log(chalk.yellow('Server process stopped.'));
        }
        process.exit(code ?? 0);
    });
    
    // Give the server a moment to start up before opening the browser
    setTimeout(async () => {
        try {
            console.log(chalk.cyan(`Attempting to open browser at ${urlToOpen}...`));
            await open(urlToOpen);
            console.log(chalk.green('Browser opened successfully.'));
            
            if (useHttps) {
                console.log(chalk.yellow('NOTE: Your browser will likely show a security warning for the self-signed certificate. You must proceed past it ("Advanced" > "Proceed to...") for the connection to work.'));
                // iOS Instructions
                console.log(chalk.yellow('\n--- iOS Configuration for HTTPS (Manual Steps) ---'));
                console.log(chalk.yellow(`1. Transfer Certificate: Copy the certificate file to your iOS device:`));
                console.log(chalk.white(`   ${CERT_CRT_PATH}`));
                console.log(chalk.yellow(`   (Use AirDrop, email, or serve it temporarily: place it in '${buildDir}' & access ${baseUrl}/server.crt) `));
                console.log(chalk.yellow(`2. Install Profile: Open 'server.crt' on iOS. Go to Settings > General > VPN & Device Management (or Profile Downloaded) > '${host}' > Install.`));
                console.log(chalk.yellow(`3. Enable Full Trust: Go to Settings > General > About > Certificate Trust Settings.`));
                console.log(chalk.yellow(`   Find certificate ('${host}') under 'ENABLE FULL TRUST...' and toggle it ON.`));
                console.log(chalk.yellow('----------------------------------------------------'));
            }

        } catch (err) {
            console.error(chalk.red(`Failed to open browser: ${err.message}`));
            console.warn(chalk.yellow(`Please manually open: ${urlToOpen}`));
            // Still show iOS instructions if HTTPS was intended
            if (useHttps) {
                 console.log(chalk.yellow('\n--- iOS Configuration for HTTPS (Manual Steps) ---'));
                 // Repeat instructions - ensure consistency and correct template literals
                 console.log(chalk.yellow(`1. Transfer Certificate: Copy the certificate file to your iOS device:`));
                 console.log(chalk.white(`   ${CERT_CRT_PATH}`));
                 console.log(chalk.yellow(`   (Use AirDrop, email, or serve it temporarily: place it in '${buildDir}' & access ${baseUrl}/server.crt) `));
                 console.log(chalk.yellow(`2. Install Profile: Open 'server.crt' on iOS. Go to Settings > General > VPN & Device Management (or Profile Downloaded) > '${host}' > Install.`));
                 console.log(chalk.yellow(`3. Enable Full Trust: Go to Settings > General > About > Certificate Trust Settings.`));
                 console.log(chalk.yellow(`   Find certificate ('${host}') under 'ENABLE FULL TRUST...' and toggle it ON.`));
                 console.log(chalk.yellow('----------------------------------------------------'));
            }
        }
    }, 2500); // Slightly increased delay for HTTPS startup


    // Graceful shutdown handling
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\nCaught interrupt signal (Ctrl+C). Shutting down server...'));
        serverProcess.kill('SIGINT');
    });
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
 * Link build files to source - Create symlinks from build to source for hot-reloading dev workflow
 * IMPORTANT: Do NOT deploy a build dir to WebSite after running this command!
 * Only deploy a fresh build without linkup.
 * @param {object} env Environment variables discovered by discoverUnityEnvironment
 */
async function linkupWebGL(env) {
  console.log(chalk.blue('Creating symlinks from build to source for development hot-reloading'));
  console.log(chalk.yellow('WARNING: After running this command, the build is for development only!'));
  console.log(chalk.yellow('Do NOT deploy this build directory to a website - always use a clean build for deployment.'));
  
  const unityProjectPath = env.UNITY_APP;
  const buildPath = path.join(unityProjectPath, 'Builds/SpaceCraft');
  const webGLTemplatesPath = path.join(unityProjectPath, 'Assets/WebGLTemplates/SpaceCraft');
  const streamingAssetsPath = path.join(unityProjectPath, 'Assets/StreamingAssets');
  
  // Check if the paths exist
  if (!fs.existsSync(buildPath)) {
    console.error(chalk.red(`Build path not found: ${buildPath}`));
    throw new Error('WebGL build not found. Run build-webgl-prod or build-webgl-dev first.');
  }
  
  if (!fs.existsSync(webGLTemplatesPath)) {
    console.error(chalk.red(`WebGL templates path not found: ${webGLTemplatesPath}`));
    throw new Error('WebGL templates directory not found.');
  }
  
  if (!fs.existsSync(streamingAssetsPath)) {
    console.error(chalk.red(`StreamingAssets path not found: ${streamingAssetsPath}`));
    throw new Error('StreamingAssets directory not found.');
  }
  
  try {
    // Step 1: Link top-level files (CNAME, index.html)
    console.log(chalk.cyan('Creating symlinks for top-level files...'));
    
    // CNAME file
    const cnameSource = path.join(webGLTemplatesPath, 'CNAME');
    const cnameTarget = path.join(buildPath, 'CNAME');
    
    if (fs.existsSync(cnameSource)) {
      if (fs.existsSync(cnameTarget)) {
        fs.unlinkSync(cnameTarget);
        console.log(chalk.gray(`Removed existing CNAME file: ${cnameTarget}`));
      }
      fs.symlinkSync(cnameSource, cnameTarget);
      console.log(chalk.green(`Linked CNAME: ${cnameTarget} -> ${cnameSource}`));
    }
    
    // index.html
    const indexSource = path.join(webGLTemplatesPath, 'index.html');
    const indexTarget = path.join(buildPath, 'index.html');
    
    if (fs.existsSync(indexSource)) {
      if (fs.existsSync(indexTarget)) {
        fs.unlinkSync(indexTarget);
        console.log(chalk.gray(`Removed existing index.html: ${indexTarget}`));
      }
      fs.symlinkSync(indexSource, indexTarget);
      console.log(chalk.green(`Linked index.html: ${indexTarget} -> ${indexSource}`));
    }
    
    // Step 2: Link StreamingAssets directories (Bridge and SpaceCraft, but NOT Content)
    console.log(chalk.cyan('Creating symlinks for StreamingAssets directories...'));
    
    // Create StreamingAssets dir in build if it doesn't exist
    const buildStreamingAssetsPath = path.join(buildPath, 'StreamingAssets');
    if (!fs.existsSync(buildStreamingAssetsPath)) {
      fs.mkdirSync(buildStreamingAssetsPath, { recursive: true });
      console.log(chalk.gray(`Created directory: ${buildStreamingAssetsPath}`));
    }
    
    // Bridge directory
    const bridgeSource = path.join(streamingAssetsPath, 'Bridge');
    const bridgeTarget = path.join(buildStreamingAssetsPath, 'Bridge');
    
    if (fs.existsSync(bridgeSource)) {
      if (fs.existsSync(bridgeTarget)) {
        if (fs.lstatSync(bridgeTarget).isSymbolicLink()) {
          fs.unlinkSync(bridgeTarget);
        } else {
          fs.rmSync(bridgeTarget, { recursive: true, force: true });
        }
        console.log(chalk.gray(`Removed existing Bridge directory: ${bridgeTarget}`));
      }
      fs.symlinkSync(bridgeSource, bridgeTarget, 'dir');
      console.log(chalk.green(`Linked Bridge directory: ${bridgeTarget} -> ${bridgeSource}`));
    }
    
    // SpaceCraft directory
    const spaceCraftSource = path.join(streamingAssetsPath, 'SpaceCraft');
    const spaceCraftTarget = path.join(buildStreamingAssetsPath, 'SpaceCraft');
    
    if (fs.existsSync(spaceCraftSource)) {
      if (fs.existsSync(spaceCraftTarget)) {
        if (fs.lstatSync(spaceCraftTarget).isSymbolicLink()) {
          fs.unlinkSync(spaceCraftTarget);
        } else {
          fs.rmSync(spaceCraftTarget, { recursive: true, force: true });
        }
        console.log(chalk.gray(`Removed existing SpaceCraft directory: ${spaceCraftTarget}`));
      }
      fs.symlinkSync(spaceCraftSource, spaceCraftTarget, 'dir');
      console.log(chalk.green(`Linked SpaceCraft directory: ${spaceCraftTarget} -> ${spaceCraftSource}`));
    }
    
    console.log(chalk.green('✅ Linkup completed successfully!'));
    console.log(chalk.yellow('NOTE: You can now edit source files and see changes immediately in the build.'));
    console.log(chalk.yellow('Remember: Do NOT deploy this build to production - use only for development.'));
    
  } catch (error) {
    console.error(chalk.red(`Linkup failed: ${error.message}`));
    throw error;
  }
}

/**
 * Copy WebGL build from WebSites/spacetime to Unity/SpaceCraft/Builds/SpaceCraft
 * This creates a writable copy for development
 * @param {object} env Environment variables discovered by discoverUnityEnvironment
 */
async function copyupWebGL(env) {
  console.log(chalk.blue('Copying WebGL build from WebSites/spacetime to Unity/SpaceCraft/Builds/SpaceCraft'));
  console.log(chalk.yellow('This creates a writable copy for development work'));
  
  const unityProjectPath = env.UNITY_APP;
  const buildPath = path.join(unityProjectPath, 'Builds/SpaceCraft');
  const websitePath = path.resolve(__dirname, '../../../WebSites/spacetime');
  
  // Check if source exists
  if (!fs.existsSync(websitePath)) {
    console.error(chalk.red(`Website source not found: ${websitePath}`));
    throw new Error('WebSites/spacetime directory not found.');
  }
  
  try {
    // Clean the build directory first
    if (fs.existsSync(buildPath)) {
      console.log(chalk.yellow(`Cleaning existing build directory: ${buildPath}`));
      fs.rmSync(buildPath, { recursive: true, force: true });
    }
    
    // Create the build directory
    fs.mkdirSync(buildPath, { recursive: true });
    console.log(chalk.gray(`Created directory: ${buildPath}`));
    
    // Copy all files from website to build
    console.log(chalk.cyan('Copying files from WebSites/spacetime to Unity/SpaceCraft/Builds/SpaceCraft...'));
    
    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyRecursive(websitePath, buildPath);
    
    console.log(chalk.green('✅ Copy completed successfully!'));
    console.log(chalk.cyan('You now have a writable copy of the WebGL build for development.'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white('  1. Run "npm run unity:linkup" to replace JS files with symlinks'));
    console.log(chalk.white('  2. Edit JS files in Unity/SpaceCraft/Assets/StreamingAssets/SpaceCraft/'));
    console.log(chalk.white('  3. Test with "npm run unity:serve"'));
    console.log(chalk.white('  4. When ready, run "npm run unity:copydown" to update source control'));
    
  } catch (error) {
    console.error(chalk.red(`Copy failed: ${error.message}`));
    throw error;
  }
}

/**
 * Copy edited JS files from Unity/SpaceCraft/Assets/StreamingAssets/SpaceCraft back to WebSites/spacetime
 * This updates the source control version with your development changes
 * @param {object} env Environment variables discovered by discoverUnityEnvironment
 */
async function copydownWebGL(env) {
  console.log(chalk.blue('Copying edited JS files from Unity/SpaceCraft/Assets/StreamingAssets/SpaceCraft to WebSites/spacetime'));
  console.log(chalk.yellow('This updates the source control version with your development changes'));
  
  const unityProjectPath = env.UNITY_APP;
  const streamingAssetsSpaceCraftPath = path.join(unityProjectPath, 'Assets/StreamingAssets/SpaceCraft');
  const websiteSpaceCraftPath = path.resolve(__dirname, '../../../WebSites/spacetime/StreamingAssets/SpaceCraft');
  
  // Check if source exists
  if (!fs.existsSync(streamingAssetsSpaceCraftPath)) {
    console.error(chalk.red(`Source directory not found: ${streamingAssetsSpaceCraftPath}`));
    throw new Error('Unity/SpaceCraft/Assets/StreamingAssets/SpaceCraft directory not found.');
  }
  
  // Check if target exists
  if (!fs.existsSync(websiteSpaceCraftPath)) {
    console.error(chalk.red(`Target directory not found: ${websiteSpaceCraftPath}`));
    throw new Error('WebSites/spacetime/StreamingAssets/SpaceCraft directory not found.');
  }
  
  try {
    // List of files to copy (JS and related files)
    const filesToCopy = [
      'controller.js',
      'spacecraft.js',
      'navigator.html',
      'selector.html',
      'inspector.html',
      'controller.css',
      'spacecraft.css'
    ];
    
    console.log(chalk.cyan('Copying development files to source control...'));
    
    let copiedCount = 0;
    let skippedCount = 0;
    
    for (const fileName of filesToCopy) {
      const sourcePath = path.join(streamingAssetsSpaceCraftPath, fileName);
      const targetPath = path.join(websiteSpaceCraftPath, fileName);
      
      if (fs.existsSync(sourcePath)) {
        // Check if source is a symlink (from linkup)
        const stats = fs.lstatSync(sourcePath);
        if (stats.isSymbolicLink()) {
          console.log(chalk.gray(`Skipping symlink: ${fileName} (this is expected after linkup)`));
          skippedCount++;
          continue;
        }
        
        // Copy the file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(chalk.green(`✓ Copied: ${fileName}`));
        copiedCount++;
      } else {
        console.log(chalk.yellow(`⚠ Not found: ${fileName}`));
        skippedCount++;
      }
    }
    
    console.log(chalk.green(`\n✅ Copy completed! ${copiedCount} files copied, ${skippedCount} skipped`));
    
    if (skippedCount > 0) {
      console.log(chalk.yellow('\nNote: Skipped files are likely symlinks from linkup, which is normal.'));
      console.log(chalk.yellow('The actual source files in Assets/StreamingAssets/SpaceCraft are what get copied.'));
    }
    
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.white('  1. Review changes: git diff'));
    console.log(chalk.white('  2. Add changes: git add .'));
    console.log(chalk.white('  3. Commit: git commit -m "Update JS files"'));
    console.log(chalk.white('  4. Push: git push'));
    console.log(chalk.white('  5. Create PR to merge to main'));
    
  } catch (error) {
    console.error(chalk.red(`Copy failed: ${error.message}`));
    throw error;
  }
}

/**
 * Install Unity WebGL build into the SvelteKit static directory
 * @param {string[]} args Command line arguments
 */
async function installUnityBuild(args) {
  console.log(chalk.blue('Installing Unity WebGL build to target directory'));
  
  // Import required modules
  const { Command } = await import('commander');
  
  // Import fs-extra dynamically and access its methods via the .default property
  const fsModule = await import('fs-extra');
  const fs = fsModule.default; // Access the actual fs-extra object
  
  // We need to import PATHS from constants
  let PATHS;
  try {
    const constants = await import('../src/lib/constants/index.ts');
    PATHS = constants.PATHS;
  } catch (error) {
    console.error(chalk.red('Error importing PATHS from constants:'), error.message);
    throw error;
  }
  
  // Set up command-line parser
  const program = new Command();
  program
    .name('install-unity')
    .description('Install Unity WebGL build to target directory')
    .requiredOption('--app <n>', 'App name (e.g., spacecraft)')
    .requiredOption('--source <path>', 'Source build directory')
    .option('--clean', 'Clean target directory before copying', false)
    .option('--target <path>', 'Target directory (defaults to SvelteKit static directory)');
  
  // Parse arguments
  program.parse(['node', 'install-unity', ...args]);
  const options = program.opts();
  
  const sourcePath = path.resolve(options.source);
  const targetDir = options.target 
    ? path.resolve(options.target) 
    : path.join(PATHS.STATIC_DIR, options.app);
  
  console.log(chalk.blue(`Installing Unity build for ${options.app}`));
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${targetDir}`);
  
  // Check if source exists using fs.pathExists
  if (!await fs.pathExists(sourcePath)) {
    console.error(chalk.red(`Source directory not found: ${sourcePath}`));
    throw new Error(`Source directory not found: ${sourcePath}`);
  }
  
  // Check for symlinks in the build (especially index.html)
  const indexHtmlPath = path.join(sourcePath, 'index.html');
  if (await fs.pathExists(indexHtmlPath)) {
    const stats = await fs.lstat(indexHtmlPath); // Use fs.lstat
    if (stats.isSymbolicLink()) {
      console.error(chalk.red('INSTALLATION BLOCKED: index.html is a symlink.'));
      console.error(chalk.yellow('This appears to be a development build with symlinks, which should not be deployed.'));
      console.error(chalk.yellow('Please use a clean production build created without linkup-webgl.'));
      throw new Error('Refusing to install a linked development build. Use a clean production build.');
    }
  }
  
  // Look for other suspicious symlinks in the build
  const suspiciousSymlinks = [];
  const checkForSymlinks = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true }); // Use fs.readdir
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      // Use fs.lstat to check if the entry itself is a symlink
      const isSymlink = (await fs.lstat(fullPath)).isSymbolicLink(); 
      if (isSymlink) {
        suspiciousSymlinks.push(fullPath);
      } else if (entry.isDirectory()) {
        await checkForSymlinks(fullPath);
      }
    }
  };
  
  await checkForSymlinks(sourcePath);
  
  if (suspiciousSymlinks.length > 0) {
    console.error(chalk.red('INSTALLATION BLOCKED: Linked build detected!'));
    console.error(chalk.yellow('The following files are symlinks:'));
    suspiciousSymlinks.forEach(link => {
      const relativePath = path.relative(sourcePath, link);
      console.error(chalk.yellow(`- ${relativePath}`));
    });
    console.error(chalk.yellow('This appears to be a development build with symlinks, which should not be deployed.'));
    console.error(chalk.yellow('Please use a clean production build created without linkup-webgl.'));
    throw new Error('Refusing to install a linked development build. Use a clean production build.');
  }
  
  // Clean if requested
  if (options.clean && await fs.pathExists(targetDir)) { // Use fs.pathExists
    console.log(chalk.yellow(`Cleaning target directory: ${targetDir}`));
    await fs.remove(targetDir); // Use fs.remove
  }
  
  // Create target directory
  await fs.ensureDir(targetDir); // Use fs.ensureDir
  
  // Copy build files
  console.log(chalk.blue('Copying build files...'));
  try {
    await fs.copy(sourcePath, targetDir); // Use fs.copy
    console.log(chalk.green('✅ Unity build installed successfully!'));
  } catch (error) {
    console.error(chalk.red('Error installing Unity build:'), error);
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
  unbuild-webgl         - Copy files from build back to source
  diff-webgl            - Show differences between build and source
  linkup-webgl          - Create symlinks from build to source for development
  copyup-webgl          - Copy WebSites/spacetime to Unity/SpaceCraft/Builds/SpaceCraft
  copydown-webgl        - Copy edited JS files back to WebSites/spacetime
  serve-webgl           - Serve the built WebGL files for testing
  ci                    - Run Unity CI build
  check-logs            - Check Unity logs for errors
  install               - Create Unity automation files
  list-versions         - List installed Unity versions

${chalk.italic('Options:')}
  --verbose             - Enable verbose logging (displays Unity environment discovery details)

${chalk.italic('Environment Variables:')}
  UNITY_APP             - Path to the Unity project (default: ../../Unity/SpaceCraft)
  UNITY_VERSION         - Version of Unity to use
  UNITY_PATH            - Direct path to Unity executable
  `);
}

// Helper function to check if openssl command exists
function checkOpenSSL() {
    try {
        execSync('openssl version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.error(chalk.red('OpenSSL command not found. Please install OpenSSL to generate HTTPS certificates.'));
        console.error(chalk.yellow('On macOS: Often pre-installed or use `brew install openssl`'));
        console.error(chalk.yellow('On Windows: Download from https://slproweb.com/products/Win32OpenSSL.html or use WSL/Git Bash.'));
        return false;
    }
}

// Helper function to generate self-signed certificate
async function generateCertificate(host) {
    if (fs.existsSync(CERT_KEY_PATH) && fs.existsSync(CERT_CRT_PATH)) {
        console.log(chalk.gray('HTTPS certificates already exist.'));
        return true; // Already exists
    }

    if (!checkOpenSSL()) {
        return false; // openssl not available
    }

    console.log(chalk.blue('Generating self-signed HTTPS certificate...'));
    try {
        // Ensure directory exists before writing to it
        fs.ensureDirSync(CERTS_DIR); 

        // Use the detected IP address (host) as the Common Name (CN)
        // Using -nodes to avoid password protection on the key for easier server use
        const opensslCommand = `openssl req -x509 -newkey rsa:2048 -keyout "${CERT_KEY_PATH}" -out "${CERT_CRT_PATH}" -sha256 -days 365 -nodes -subj "/CN=${host}"`;

        console.log(chalk.gray(`Executing: ${opensslCommand}`));
        execSync(opensslCommand, { stdio: 'pipe' }); // Use pipe to suppress verbose output unless error

        console.log(chalk.green(`Successfully generated certificates in: ${CERTS_DIR}`));
        // Gitignore reminder was removed as requested previously.
        return true;
    } catch (error) {
        console.error(chalk.red(`Failed to generate certificates: ${error.message}`));
        if (error.stderr) {
            console.error(chalk.red(error.stderr.toString()));
        }
        return false;
    }
}

/**
 * Detect Unity environment settings
 * @param {string[]} args Command line arguments
 */
async function detectEnvironment(args) {
  console.log(chalk.blue('Detecting Unity environment...'));
  
  // Define paths to look for Unity editor
  const unityPaths = {
    win32: [
      'C:\\Program Files\\Unity\\Hub\\Editor',
      'C:\\Program Files\\Unity'
    ],
    darwin: [
      '/Applications/Unity/Hub/Editor',
      '/Applications/Unity'
    ],
    linux: [
      '/opt/unity/hub/editor',
      '/opt/unity'
    ]
  };
  
  const platform = process.platform;
  const editorPaths = unityPaths[platform] || [];
  
  // Check if we have paths for this platform
  if (!editorPaths.length) {
    console.error(chalk.red(`Unsupported platform: ${platform}`));
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  console.log(chalk.blue(`Detecting Unity on ${platform}...`));
  
  // Find Unity installations
  let foundVersions = [];
  for (const basePath of editorPaths) {
    if (!await fs.promises.access(basePath).then(() => true).catch(() => false)) {
      continue;
    }
    
    try {
      const entries = await fs.promises.readdir(basePath);
      for (const entry of entries) {
        const versionPath = path.join(basePath, entry);
        const stats = await fs.promises.stat(versionPath);
        
        if (stats.isDirectory()) {
          // Check if this looks like a Unity version directory
          const unityExePath = platform === 'win32' 
            ? path.join(versionPath, 'Editor', 'Unity.exe')
            : platform === 'darwin'
              ? path.join(versionPath, 'Unity.app', 'Contents', 'MacOS', 'Unity')
              : path.join(versionPath, 'Editor', 'Unity');
          
          const hasUnityExe = await fs.promises.access(unityExePath)
            .then(() => true)
            .catch(() => false);
          
          if (hasUnityExe) {
            foundVersions.push({
              version: entry,
              path: versionPath,
              executable: unityExePath
            });
          }
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Error reading directory ${basePath}:`), error.message);
    }
  }
  
  // Sort versions in descending order (newest first)
  foundVersions.sort((a, b) => {
    // Simple version comparison, could be improved for more complex version strings
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  });
  
  if (foundVersions.length === 0) {
    console.error(chalk.red('No Unity installations found'));
    throw new Error('No Unity installations found');
  }
  
  console.log(chalk.green(`Found ${foundVersions.length} Unity installations:`));
  foundVersions.forEach((version, index) => {
    console.log(chalk.cyan(`${index + 1}. Unity ${version.version}`));
    console.log(`   Path: ${version.path}`);
    console.log(`   Executable: ${version.executable}`);
  });
  
  // Select the newest version
  const selectedVersion = foundVersions[0];
  console.log(chalk.green(`\nSelected Unity ${selectedVersion.version} as default`));
  
  // Create .env.unity file
  const envPath = path.resolve(process.cwd(), '.env.unity');
  const envContent = `UNITY_VERSION=${selectedVersion.version}
UNITY_EDITOR_PATH=${selectedVersion.executable}
UNITY_INSTALL_PATH=${selectedVersion.path}`;
  
  await fs.promises.writeFile(envPath, envContent, 'utf8');
  console.log(chalk.green(`✅ Created Unity environment file: ${envPath}`));
  
  return selectedVersion;
}