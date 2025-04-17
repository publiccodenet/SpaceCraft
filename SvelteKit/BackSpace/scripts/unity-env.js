#!/usr/bin/env node

/**
 * Unity Environment Setup Script
 * 
 * This script discovers Unity installations and project requirements,
 * then generates environment variables for Unity automation.
 * 
 * This module exports the discoverUnityEnvironment function.
 * 
 * Environment Variables:
 *   UNITY_PRECONFIGURED - Set to 'true' if running on a preconfigured runner
 *   UNITY_APP - Path to the Unity project
 *   UNITY_VERSION - Version of Unity to use
 *   UNITY_PATH - Direct path to Unity executable
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Import PATHS constants directly - assuming paths.ts exists and exports PATHS
import { PATHS } from '../src/lib/constants/paths.ts';

/**
 * Discover Unity environment details
 * @param {Object} options Configuration options
 * @param {boolean} options.verbose Whether to output verbose logs (default: false)
 * @returns {Promise<Object>} Object containing Unity environment variables
 */
export async function discoverUnityEnvironment(options = { verbose: false }) {
  const { verbose = false } = options;
  
  const log = (message) => {
    if (verbose) {
      console.log(message);
    }
  };
  
  const warn = (message) => {
    if (verbose) {
      console.warn(message);
    }
  };
  
  log('=== Unity Environment Discovery ===');
  
  // Check if we're on a preconfigured runner
  const PRECONFIGURED = process.env.UNITY_PRECONFIGURED === 'true';

  // Default paths - can be overridden by environment variables
  const DEFAULT_UNITY_APP_PATH = '../../Unity/CraftSpace';

  // Get Unity project path (use environment variable, then constants, then default)
  const unityAppBasePath = process.env.UNITY_APP || (PATHS?.UNITY_DIR || DEFAULT_UNITY_APP_PATH);
  const UNITY_PROJECT_PATH = path.resolve(unityAppBasePath);
  
  log(`Using base path: ${unityAppBasePath}`);
  log(`Resolved project path: ${UNITY_PROJECT_PATH}`);
  
  if (PRECONFIGURED) {
    log('Running on preconfigured environment');
  }

  // Detect if project exists
  if (!fs.existsSync(UNITY_PROJECT_PATH)) {
    console.error(`Error: Unity project not found at: ${UNITY_PROJECT_PATH}`);
    return { UNITY_PROJECT_FOUND: 'false' };
  }

  let discoveredVersion = '';
  let discoveredPath = '';
  let versions = [];

  // If preconfigured, respect provided environment variables and don't try to discover
  if (PRECONFIGURED) {
    log('Using preconfigured Unity environment');
    
    // Set Unity version from environment or project
    if (process.env.UNITY_VERSION) {
      discoveredVersion = process.env.UNITY_VERSION;
      log(`Using provided Unity version: ${discoveredVersion}`);
    } else {
      const projectVersion = readProjectVersion(UNITY_PROJECT_PATH, verbose);
      if (projectVersion) {
        discoveredVersion = projectVersion;
        log(`Using project Unity version: ${discoveredVersion}`);
      } else {
        warn(`Warning: No Unity version specified and could not determine from project`);
      }
    }
    
    // Set Unity path from environment or derive from version
    if (process.env.UNITY_PATH) {
      discoveredPath = process.env.UNITY_PATH;
      log(`Using provided Unity path: ${discoveredPath}`);
    } else if (discoveredVersion) {
      // Try to construct path
      discoveredPath = calculateUnityPath(discoveredVersion, verbose);
    } 
    
    if (!discoveredPath) {
      warn(`Warning: Could not determine Unity path in preconfigured environment.`);
    }
  } else {
    // Discovery mode for non-preconfigured environments
    versions = discoverUnityVersions(verbose);
    if (versions.length === 0) {
      warn(`Warning: No Unity versions found on this system.`);
      return { 
        UNITY_PROJECT_FOUND: 'true',
        UNITY_APP: UNITY_PROJECT_PATH,
        UNITY_VERSIONS_FOUND: ''
      };
    }
    
    log(`Found Unity versions: ${versions.join(', ')}`);
    
    // Determine the correct Unity version to use
    discoveredVersion = determineUnityVersion(versions, UNITY_PROJECT_PATH, verbose);
    if (discoveredVersion) {
      log(`Selected Unity version: ${discoveredVersion}`);
      // Calculate the path to the Unity executable
      discoveredPath = calculateUnityPath(discoveredVersion, verbose);
      if (!discoveredPath) {
        warn(`Warning: Could not determine Unity executable path for version ${discoveredVersion}`);
      }
    } else {
      console.error(`Error: Could not determine Unity version to use.`);
    }
  }

  // Discover project settings
  const projectSettings = getProjectSettings(UNITY_PROJECT_PATH);
  const envResult = {
    UNITY_PROJECT_FOUND: 'true',
    UNITY_PROJECT_VERSION: projectSettings.version || '',
    UNITY_PROJECT_NAME: projectSettings.productName || '',
    UNITY_PROJECT_COMPANY: projectSettings.companyName || '',
    UNITY_BUILD_TIMESTAMP: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14),
    UNITY_BUILD_DIR: path.join(UNITY_PROJECT_PATH, 'Builds'),
    UNITY_APP: UNITY_PROJECT_PATH,
    UNITY_VERSION: discoveredVersion || '',
    UNITY_PATH: discoveredPath || '',
    UNITY_VERSIONS_FOUND: versions ? versions.join(',') : ''
  };

  log('=== Unity Environment Discovery Complete ===');
  log(`  UNITY_PATH: ${envResult.UNITY_PATH || '(Not Found)'}`);
  log(`  UNITY_VERSION: ${envResult.UNITY_VERSION || '(Not Found)'}`);

  return envResult;
}

/**
 * Read the project version directly from ProjectSettings/ProjectVersion.txt
 * @param {string} unityProjectPath Path to the Unity project
 * @param {boolean} verbose Whether to output verbose logs (default: false)
 * @returns {string|null} Project version or null if not found
 */
function readProjectVersion(unityProjectPath, verbose = false) {
  const log = (message) => {
    if (verbose) {
      console.log(message);
    }
  };
  
  const projectVersionPath = path.join(unityProjectPath, 'ProjectSettings/ProjectVersion.txt');
  log(`Attempting to read project version from: ${projectVersionPath}`);
  if (fs.existsSync(projectVersionPath)) {
    try {
      const versionContent = fs.readFileSync(projectVersionPath, 'utf8');
      const versionMatch = versionContent.match(/m_EditorVersion: (.+)/);
      if (versionMatch && versionMatch[1]) {
        return versionMatch[1].trim();
      }
    } catch (error) {
      console.error(`Error reading project version: ${error.message}`);
    }
  } else {
    console.warn(`Warning: Project version file not found at: ${projectVersionPath}`);
  }
  return null;
}

/**
 * Discover installed Unity versions
 * @param {boolean} verbose Whether to output verbose logs (default: false)
 * @returns {string[]} Array of installed Unity versions
 */
function discoverUnityVersions(verbose = false) {
  const log = (message) => {
    if (verbose) {
      console.log(message);
    }
  };
  
  let hubPath = '';
  let checkedPaths = []; // Keep track of paths checked

  // Determine platform-specific Unity Hub paths
  if (process.platform === 'darwin') {
    // macOS paths
    const userLibraryPath = path.join(os.homedir(), 'Library/Application Support/Unity/Hub/Editor');
    const systemApplicationsPath = '/Applications/Unity/Hub/Editor';
    checkedPaths.push(userLibraryPath, systemApplicationsPath);

    if (fs.existsSync(userLibraryPath)) hubPath = userLibraryPath;
    else if (fs.existsSync(systemApplicationsPath)) hubPath = systemApplicationsPath;

  } else if (process.platform === 'win32') {
    // Windows paths
    const programFilesPath = 'C:\\Program Files\\Unity\\Hub\\Editor';
    const appDataPath = path.join(os.homedir(), 'AppData\\Roaming\\Unity\\Hub\\Editor');
    checkedPaths.push(programFilesPath, appDataPath);

    if (fs.existsSync(programFilesPath)) hubPath = programFilesPath;
    else if (fs.existsSync(appDataPath)) hubPath = appDataPath;

  } else if (process.platform === 'linux') {
    // Linux path
    const linuxPath = path.join(os.homedir(), '.config/Unity/Hub/Editor');
    checkedPaths.push(linuxPath);
    if (fs.existsSync(linuxPath)) hubPath = linuxPath;
  }
  
  log(`Checking for Unity Hub Editor installs in: ${checkedPaths.join(', ')}`);

  if (!hubPath) {
    console.warn(`Warning: Unity Hub installation directory not found in standard locations.`);
    return [];
  }
  
  log(`Found Unity Hub Editor directory: ${hubPath}`);
  try {
    // Get all directories in the Hub Editor path - these are the installed versions
    const versions = fs.readdirSync(hubPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => /^\d+\.\d+\.\d+[a-z0-9]*$/.test(name)) // Filter valid version numbers
      .sort((a, b) => {
        // Sort versions semantically (newest first)
        const partsA = a.split('.');
        const partsB = b.split('.');
        
        for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
          // Extract numeric part for comparison
          const numA = parseInt(partsA[i].replace(/[^0-9]/g, ''));
          const numB = parseInt(partsB[i].replace(/[^0-9]/g, ''));
          
          if (numA !== numB) {
            return numB - numA; // Descending order (newest first)
          }
        }
        
        return partsB.length - partsA.length;
      });
    
    return versions;
  } catch (error) {
    console.error(`Error discovering Unity versions: ${error.message}`);
    return [];
  }
}

/**
 * Determine the Unity version to use based on various criteria
 * @param {string[]} availableVersions List of available Unity versions
 * @param {string} unityProjectPath Path to the Unity project
 * @param {boolean} verbose Whether to output verbose logs (default: false)
 * @returns {string|null} The Unity version to use, or null if can't be determined
 */
function determineUnityVersion(availableVersions, unityProjectPath, verbose = false) {
  const log = (message) => {
    if (verbose) {
      console.log(message);
    }
  };
  
  // If UNITY_VERSION is already set in the environment, use that
  if (process.env.UNITY_VERSION) {
    const specifiedVersion = process.env.UNITY_VERSION;
    
    // Check if the specified version is available
    if (availableVersions.includes(specifiedVersion)) {
      log(`Using specified Unity version: ${specifiedVersion}`);
      return specifiedVersion;
    }
    
    // Try to find a compatible version with the same major.minor
    const majorMinor = specifiedVersion.split('.').slice(0, 2).join('.');
    const compatibleVersion = availableVersions.find(v => v.startsWith(majorMinor));
    
    if (compatibleVersion) {
      log(`Warning: Specified Unity version ${specifiedVersion} not found, using compatible: ${compatibleVersion}`);
      return compatibleVersion;
    }
    
    log(`Warning: Specified Unity version ${specifiedVersion} not found, will try project version.`);
  }
  
  // Try to detect the project's Unity version
  const projectVersionPath = path.join(unityProjectPath, 'ProjectSettings/ProjectVersion.txt');
  if (fs.existsSync(projectVersionPath)) {
    try {
      const versionContent = fs.readFileSync(projectVersionPath, 'utf8');
      const versionMatch = versionContent.match(/m_EditorVersion: (.+)/);
      
      if (versionMatch && versionMatch[1]) {
        const projectVersion = versionMatch[1].trim();
        log(`Project Unity version: ${projectVersion}`);
        
        // Check if the project version is available
        if (availableVersions.includes(projectVersion)) {
          log(`Using project's Unity version: ${projectVersion}`);
          return projectVersion;
        }
        
        // Try to find a compatible version with the same major.minor
        const majorMinor = projectVersion.split('.').slice(0, 2).join('.');
        const compatibleVersion = availableVersions.find(v => v.startsWith(majorMinor));
        
        if (compatibleVersion) {
          log(`Warning: Project Unity version ${projectVersion} not found, using compatible: ${compatibleVersion}`);
          return compatibleVersion;
        }
        
        log(`Warning: Project Unity version ${projectVersion} not found, will use latest available.`);
      }
    } catch (error) {
      console.error(`Error reading project version: ${error.message}`);
    }
  } else {
    log(`Warning: Project version file not found.`);
  }
  
  // Default to the latest available version
  if (availableVersions.length > 0) {
    const latestVersion = availableVersions[0];
    log(`Using latest available Unity version: ${latestVersion}`);
    return latestVersion;
  }
  
  return null;
}

/**
 * Calculate the path to the Unity executable based on version
 * @param {string} version Unity version
 * @param {boolean} verbose Whether to output verbose logs (default: false)
 * @returns {string|null} Path to Unity executable or null if not found
 */
function calculateUnityPath(version, verbose = false) {
  const log = (message) => {
    if (verbose) {
      console.log(message);
    }
  };
  
  if (!version) return null;
  
  // If UNITY_PATH is already set, use that
  if (process.env.UNITY_PATH) {
    log(`Using UNITY_PATH from environment: ${process.env.UNITY_PATH}`);
    if (fs.existsSync(process.env.UNITY_PATH)) {
        return process.env.UNITY_PATH;
    } else {
        log(`Warning: Provided UNITY_PATH (${process.env.UNITY_PATH}) does not exist. Will attempt discovery.`);
    }
  }
  
  let unityPath = '';
  let pathsToCheck = []; // Keep track of paths checked
  
  // Calculate platform-specific paths
  if (process.platform === 'darwin') {
    // macOS: Check both standard locations
    const userHubPath = path.join(os.homedir(), `Library/Application Support/Unity/Hub/Editor/${version}/Unity.app/Contents/MacOS/Unity`);
    const systemHubPath = `/Applications/Unity/Hub/Editor/${version}/Unity.app/Contents/MacOS/Unity`;
    pathsToCheck.push(userHubPath, systemHubPath);

    log(`Checking for Unity executable at user path: ${userHubPath}`);
    if (fs.existsSync(userHubPath)) {
      unityPath = userHubPath;
    } else {
      log(`Not found at user path. Checking system path: ${systemHubPath}`);
      if (fs.existsSync(systemHubPath)) {
          unityPath = systemHubPath;
      }
    }

  } else if (process.platform === 'win32') {
    // Windows
    const programFilesPath = `C:\\Program Files\\Unity\\Hub\\Editor\\${version}\\Editor\\Unity.exe`;
    const appDataPath = path.join(os.homedir(), `AppData\\Roaming\\Unity\\Hub\\Editor\\${version}\\Editor\\Unity.exe`);
    pathsToCheck.push(programFilesPath, appDataPath);
    
    log(`Checking for Unity executable at Program Files path: ${programFilesPath}`);
    if (fs.existsSync(programFilesPath)) {
      unityPath = programFilesPath;
    } else {
      log(`Not found at Program Files path. Checking AppData path: ${appDataPath}`);
      if (fs.existsSync(appDataPath)) {
           unityPath = appDataPath;
      }
    }
  } else if (process.platform === 'linux') {
    // Linux
    const linuxPath = path.join(os.homedir(), `.config/Unity/Hub/Editor/${version}/Editor/Unity`);
    pathsToCheck.push(linuxPath);
    log(`Checking for Unity executable at Linux path: ${linuxPath}`);
    if (fs.existsSync(linuxPath)) {
        unityPath = linuxPath;
    }
  }
  
  // Verify the final path exists
  if (unityPath) {
    log(`Determined Unity path: ${unityPath}`);
    return unityPath;
  } 
  
  log(`Warning: Could not find valid Unity executable path for version ${version} after checking: ${pathsToCheck.join(', ')}`);
  return null;
}

/**
 * Get project settings from ProjectSettings/ProjectSettings.asset
 * @returns {Object} Project settings
 */
function getProjectSettings(unityProjectPath) {
  const settings = {
    version: '',
    productName: '',
    companyName: ''
  };
  
  // Try to get project version
  const versionPath = path.join(unityProjectPath, 'ProjectSettings/ProjectVersion.txt');
  if (fs.existsSync(versionPath)) {
    try {
      const versionContent = fs.readFileSync(versionPath, 'utf8');
      const versionMatch = versionContent.match(/m_EditorVersion: (.+)/);
      if (versionMatch && versionMatch[1]) {
        settings.version = versionMatch[1].trim();
      }
    } catch (error) {
      console.error(`Error reading project version: ${error.message}`);
    }
  }
  
  // Try to get product and company name
  // This is trickier since the asset is binary, so we'll try to use grep
  try {
    const settingsPath = path.join(unityProjectPath, 'ProjectSettings/ProjectSettings.asset');
    if (fs.existsSync(settingsPath)) {
      try {
        // Use grep to extract productName and companyName from the YAML file
        const productNameCmd = `grep -A 1 "productName:" "${settingsPath}" | tail -n 1`;
        const companyNameCmd = `grep -A 1 "companyName:" "${settingsPath}" | tail -n 1`;
        
        try {
          const productName = execSync(productNameCmd, { encoding: 'utf8' }).trim().replace(/^[ \t]*/, '');
          settings.productName = productName;
        } catch (e) {
          // Ignore grep errors
        }
        
        try {
          const companyName = execSync(companyNameCmd, { encoding: 'utf8' }).trim().replace(/^[ \t]*/, '');
          settings.companyName = companyName;
        } catch (e) {
          // Ignore grep errors
        }
      } catch (error) {
        // Silently fail, these settings are optional
      }
    }
  } catch (error) {
    // Silently fail, these settings are optional
  }
  
  return settings;
}

// If run directly as a script (for testing only)
if (import.meta.url === `file://${process.argv[1]}`) {
  discoverUnityEnvironment().then(env => {
    console.log('Environment result:', env);
  });
} 