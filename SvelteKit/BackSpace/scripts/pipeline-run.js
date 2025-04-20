#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

/**
 * Content Pipeline Runner
 * 
 * Runs all pipeline steps in sequence:
 * 1. Bootstrap - Generate skeleton whitelist
 * 2. Pull - Pull content from Internet Archive to cache
 * 3. Export - Export content from cache to Unity
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  cleanUnity: args.includes('--clean-unity'),
  forceRefresh: args.includes('--force') || args.includes('-f'),
  skipBootstrap: args.includes('--skip-bootstrap'),
  skipPull: args.includes('--skip-pull'),
  skipExport: args.includes('--skip-export')
};

// Get script directory
const scriptDir = path.dirname(__filename);

/**
 * Run a pipeline script and return a promise
 */
function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(scriptDir, scriptName);
    console.log(`\n\n${'-'.repeat(60)}`);
    console.log(`Running ${scriptName}...`);
    console.log(`${'-'.repeat(60)}\n`);
    
    const child = spawn('node', [scriptPath, ...args], { 
      stdio: 'inherit', 
      shell: process.platform === 'win32' 
    });
    
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });
    
    child.on('error', error => {
      reject(error);
    });
  });
}

/**
 * Run the complete pipeline
 */
async function runPipeline() {
  console.log('🚀 Starting content pipeline...');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Bootstrap
    if (!options.skipBootstrap) {
      const bootstrapArgs = options.verbose ? ['--verbose'] : [];
      await runScript('pipeline-bootstrap.js', bootstrapArgs);
    } else {
      console.log('Skipping bootstrap step (--skip-bootstrap)');
    }
    
    // Step 2: Pull
    if (!options.skipPull) {
      const pullArgs = [];
      if (options.verbose) pullArgs.push('--verbose');
      if (options.forceRefresh) pullArgs.push('--force');
      await runScript('pipeline-pull.js', pullArgs);
    } else {
      console.log('Skipping pull step (--skip-pull)');
    }
    
    // Step 3: Export
    if (!options.skipExport) {
      const exportArgs = [];
      if (options.verbose) exportArgs.push('--verbose');
      if (options.cleanUnity) exportArgs.push('--clean');
      await runScript('pipeline-export.js', exportArgs);
    } else {
      console.log('Skipping export step (--skip-export)');
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n\n✅ Pipeline completed successfully in ${duration} seconds`);
    process.exit(0);
  } catch (error) {
    console.error(`\n\n❌ Pipeline failed: ${error.message}`);
    process.exit(1);
  }
}

// Print help message if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Content Pipeline Runner

Runs all pipeline steps in sequence to export content from IA to Unity.

Usage:
  node pipeline-run.js [options]

Options:
  --verbose, -v      Show verbose output
  --clean-unity      Clean Unity directory before export
  --force, -f        Force refresh (bypass cache)
  --skip-bootstrap   Skip bootstrap step
  --skip-pull        Skip pull step
  --skip-export      Skip export step
  --help, -h         Show this help message
`);
  process.exit(0);
}

// Run the pipeline
runPipeline(); 