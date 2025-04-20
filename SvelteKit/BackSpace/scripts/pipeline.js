#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import axios from 'axios';
import crypto from 'crypto';

// Default paths
const DEFAULT_CONFIG_DIR = path.resolve('../../Content/Configs');
const DEFAULT_CONTENT_CACHE = path.resolve('../../Content/Cache');
const DEFAULT_UNITY_DIR = path.resolve('../../Unity/CraftSpace');

class ContentPipeline {
  constructor(options = {}) {thin
    this.configDir = options.configDir || DEFAULT_CONFIG_DIR;
    this.contentCache = options.contentCache || DEFAULT_CONTENT_CACHE;
    this.unityDir = options.unityDir || DEFAULT_UNITY_DIR;
    this.verbose = options.verbose || false;
    this.force = options.force || false;
    this.clean = options.clean || false;
    
    // Ensure directories exist
    this.ensureDirectoryExists(this.configDir);
    this.ensureDirectoryExists(this.contentCache);
    
    // Load cache metadata if exists
    this.cacheMetadata = this.loadCacheMetadata();
  }
  
  // Utility methods
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      if (this.verbose) console.log(chalk.blue(`Creating directory: ${dir}`));
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  loadCacheMetadata() {
    const metadataPath = path.join(this.contentCache, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        console.warn(chalk.yellow(`Failed to read cache metadata: ${error.message}`));
        return {};
      }
    }
    return {};
  }
  
  saveCacheMetadata() {
    const metadataPath = path.join(this.contentCache, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.cacheMetadata, null, 2));
  }
  
  generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  async downloadFile(url, dest) {
    if (this.verbose) console.log(chalk.blue(`Downloading ${url} to ${dest}`));
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(dest);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }
  
  // Pipeline phases
  async bootstrap() {
    console.log(chalk.green('Starting bootstrap phase...'));
    
    // Load bootstrap configuration
    const bootstrapConfig = path.join(this.configDir, 'bootstrap.json');
    if (!fs.existsSync(bootstrapConfig)) {
      throw new Error(`Bootstrap config not found at ${bootstrapConfig}`);
    }
    
    const config = JSON.parse(fs.readFileSync(bootstrapConfig, 'utf8'));
    
    // Process bootstrap tasks
    for (const task of config.tasks || []) {
      console.log(chalk.blue(`Processing bootstrap task: ${task.name || 'unnamed'}`));
      
      // Create collection directory if it doesn't exist
      const collectionDir = path.join(this.contentCache, task.collection);
      this.ensureDirectoryExists(collectionDir);
      
      // Process files
      for (const file of task.files || []) {
        const dest = path.join(collectionDir, file.name);
        
        // Skip if file exists and not forced
        if (fs.existsSync(dest) && !this.force) {
          console.log(chalk.yellow(`File ${dest} already exists, skipping...`));
          continue;
        }
        
        // Download or copy the file
        if (file.url) {
          await this.downloadFile(file.url, dest);
        } else if (file.source) {
          const sourcePath = path.resolve(file.source);
          fs.copyFileSync(sourcePath, dest);
        }
        
        // Update cache metadata
        if (!this.cacheMetadata[task.collection]) {
          this.cacheMetadata[task.collection] = {};
        }
        
        this.cacheMetadata[task.collection][file.name] = {
          timestamp: new Date().toISOString(),
          source: file.url || file.source
        };
      }
    }
    
    // Save updated cache metadata
    this.saveCacheMetadata();
    console.log(chalk.green('Bootstrap phase completed successfully.'));
  }
  
  async pull() {
    console.log(chalk.green('Starting pull phase...'));
    
    // Load pull configuration
    const pullConfig = path.join(this.configDir, 'pull.json');
    if (!fs.existsSync(pullConfig)) {
      throw new Error(`Pull config not found at ${pullConfig}`);
    }
    
    const config = JSON.parse(fs.readFileSync(pullConfig, 'utf8'));
    
    // Process Internet Archive items
    for (const source of config.sources || []) {
      if (source.type === 'internetarchive') {
        console.log(chalk.blue(`Pulling content from Internet Archive: ${source.itemId}`));
        
        // Create directory for the item
        const itemDir = path.join(this.contentCache, source.collection, source.itemId);
        this.ensureDirectoryExists(itemDir);
        
        // Use internetarchive-sdk-js to fetch files
        for (const filePattern of source.files || ['*']) {
          const cmd = `ia download ${source.itemId} ${filePattern} --destdir=${itemDir} ${this.force ? '--force' : ''}`;
          
          try {
            if (this.verbose) console.log(chalk.blue(`Executing: ${cmd}`));
            execSync(cmd, { stdio: this.verbose ? 'inherit' : 'ignore' });
            
            // Update cache metadata
            if (!this.cacheMetadata[source.collection]) {
              this.cacheMetadata[source.collection] = {};
            }
            
            this.cacheMetadata[source.collection][source.itemId] = {
              timestamp: new Date().toISOString(),
              source: `internetarchive:${source.itemId}`,
              files: filePattern
            };
          } catch (error) {
            console.error(chalk.red(`Error downloading ${source.itemId}: ${error.message}`));
          }
        }
      }
    }
    
    // Save updated cache metadata
    this.saveCacheMetadata();
    console.log(chalk.green('Pull phase completed successfully.'));
  }
  
  async export() {
    console.log(chalk.green('Starting export phase...'));
    
    // Clean Unity export directory if requested
    if (this.clean) {
      const unityContentDir = path.join(this.unityDir, 'Assets', 'StreamingAssets', 'Content');
      if (fs.existsSync(unityContentDir)) {
        console.log(chalk.yellow(`Cleaning Unity content directory: ${unityContentDir}`));
        fs.removeSync(unityContentDir);
        fs.mkdirSync(unityContentDir, { recursive: true });
      }
    }
    
    // Load export configuration
    const exportConfig = path.join(this.configDir, 'export.json');
    if (!fs.existsSync(exportConfig)) {
      throw new Error(`Export config not found at ${exportConfig}`);
    }
    
    const config = JSON.parse(fs.readFileSync(exportConfig, 'utf8'));
    
    // Process export targets
    for (const target of config.targets || []) {
      if (target.type === 'unity') {
        console.log(chalk.blue(`Exporting content to Unity: ${target.name || 'unnamed'}`));
        
        // Load filter configuration if specified
        let filter = null;
        if (target.filter) {
          const filterPath = path.join(this.configDir, 'Exporters', 'Unity', 'CraftSpace', target.filter);
          if (fs.existsSync(filterPath)) {
            filter = JSON.parse(fs.readFileSync(filterPath, 'utf8'));
          } else {
            console.warn(chalk.yellow(`Filter file not found: ${filterPath}`));
          }
        }
        
        // Prepare destination directory
        const destDir = path.join(this.unityDir, 'Assets', 'StreamingAssets', 'Content');
        this.ensureDirectoryExists(destDir);
        
        // Copy collections based on filter
        for (const collection of target.collections || []) {
          const sourceDir = path.join(this.contentCache, collection);
          const targetDir = path.join(destDir, collection);
          
          if (!fs.existsSync(sourceDir)) {
            console.warn(chalk.yellow(`Source collection not found: ${sourceDir}`));
            continue;
          }
          
          this.ensureDirectoryExists(targetDir);
          
          // Apply filtering if specified
          if (filter && filter.collections && filter.collections[collection]) {
            const collectionFilter = filter.collections[collection];
            
            // Skip disabled collections
            if (collectionFilter.enabled === false) {
              console.log(chalk.yellow(`Skipping disabled collection: ${collection}`));
              continue;
            }
            
            // Get all items in the collection
            const items = fs.readdirSync(sourceDir);
            
            for (const item of items) {
              const itemPath = path.join(sourceDir, item);
              
              // Skip if not a directory
              if (!fs.statSync(itemPath).isDirectory()) continue;
              
              // Check if item should be included based on filter rules
              let included = false;
              
              // Check include patterns
              if (collectionFilter.include && collectionFilter.include.length > 0) {
                for (const pattern of collectionFilter.include) {
                  if (this.matchPattern(item, pattern)) {
                    included = true;
                    break;
                  }
                }
              } else {
                // If no include patterns, include all
                included = true;
              }
              
              // Check exclude patterns
              if (included && collectionFilter.exclude && collectionFilter.exclude.length > 0) {
                for (const pattern of collectionFilter.exclude) {
                  if (this.matchPattern(item, pattern)) {
                    included = false;
                    break;
                  }
                }
              }
              
              if (included) {
                const targetItemDir = path.join(targetDir, item);
                this.ensureDirectoryExists(targetItemDir);
                
                // Copy item contents
                fs.copySync(itemPath, targetItemDir);
                
                if (this.verbose) {
                  console.log(chalk.blue(`Copied item ${item} to ${targetItemDir}`));
                }
              } else if (this.verbose) {
                console.log(chalk.yellow(`Skipped item ${item} based on filter rules`));
              }
            }
          } else {
            // No filter, copy everything
            fs.copySync(sourceDir, targetDir);
            if (this.verbose) {
              console.log(chalk.blue(`Copied all items from ${sourceDir} to ${targetDir}`));
            }
          }
        }
      }
    }
    
    console.log(chalk.green('Export phase completed successfully.'));
  }
  
  matchPattern(str, pattern) {
    if (pattern === '*') return true;
    
    // Simple wildcard matching
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(str);
    }
    
    return str === pattern;
  }
  
  // Run the full pipeline
  async run() {
    try {
      await this.bootstrap();
      await this.pull();
      await this.export();
      console.log(chalk.green('Pipeline completed successfully.'));
    } catch (error) {
      console.error(chalk.red(`Pipeline failed: ${error.message}`));
      process.exit(1);
    }
  }
}

// Set up the command-line interface
program
  .name('pipeline')
  .description('Unified content pipeline for SpaceCraft')
  .version('1.0.0');

// Common options for all commands
const addCommonOptions = (cmd) => {
  return cmd
    .option('-v, --verbose', 'Enable verbose output')
    .option('-f, --force', 'Force operation, overwriting existing files')
    .option('-c, --clean', 'Clean target directories before operation')
    .option('--config-dir <dir>', 'Path to configuration directory', DEFAULT_CONFIG_DIR)
    .option('--content-cache <dir>', 'Path to content cache directory', DEFAULT_CONTENT_CACHE)
    .option('--unity-dir <dir>', 'Path to Unity project directory', DEFAULT_UNITY_DIR);
};

// Run the full pipeline
addCommonOptions(
  program
    .command('run')
    .description('Run the full content pipeline (bootstrap, pull, export)')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.run();
    })
);

// Bootstrap phase
addCommonOptions(
  program
    .command('bootstrap')
    .description('Run only the bootstrap phase')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.bootstrap();
    })
);

// Pull phase
addCommonOptions(
  program
    .command('pull')
    .description('Run only the pull phase')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.pull();
    })
);

// Export phase
addCommonOptions(
  program
    .command('export')
    .description('Run only the export phase')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.export();
    })
);

// Parse command line arguments
program.parse(); 