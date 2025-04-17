#!/usr/bin/env node
/**
 * Install Unity WebGL build into the SvelteKit static directory
 * 
 * Usage:
 * npm run install-unity -- --app craftspace --source /path/to/unity/build --clean
 */
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { PATHS, EMOJI } from '../src/lib/constants/index.ts';

const program = new Command();

program
  .name('install-unity')
  .description('Install Unity WebGL build into SvelteKit static directory')
  .requiredOption('--app <name>', 'App name (e.g., craftspace)')
  .requiredOption('--source <path>', 'Source build directory')
  .option('--clean', 'Clean target directory before copying', false)
  .action(async (options) => {
    const sourcePath = path.resolve(options.source);
    const targetDir = path.join(PATHS.STATIC_DIR, 'craftspace');
    
    console.log(chalk.blue(`Installing Unity build for ${options.app}`));
    console.log(`Source: ${sourcePath}`);
    console.log(`Target: ${targetDir}`);
    
    // Check if source exists
    if (!await fs.pathExists(sourcePath)) {
      console.error(chalk.red(`Source directory not found: ${sourcePath}`));
      process.exit(1);
    }
    
    // Clean if requested
    if (options.clean && await fs.pathExists(targetDir)) {
      console.log(chalk.yellow(`Cleaning target directory: ${targetDir}`));
      await fs.remove(targetDir);
    }
    
    // Create target directory
    await fs.ensureDir(targetDir);
    
    // Copy build files
    console.log(chalk.blue('Copying build files...'));
    try {
      await fs.copy(sourcePath, targetDir);
      console.log(chalk.green('✅ Unity build installed successfully!'));
    } catch (error) {
      console.error(chalk.red('Error installing Unity build:'), error);
      process.exit(1);
    }
  });

program.parse(); 