#!/usr/bin/env node

/**
 * SpaceCraft Content Pipeline
 *
 * A unified pipeline for managing content across SpaceCraft projects.
 * This module handles content bootstrapping, pulling, and exporting
 * with a clean separation between core functionality and CLI commands.
 * 
 * The pipeline can be used in two ways:
 * 1. As a command-line tool with various commands
 * 2. As an importable module for use in other JavaScript code
 * 
 * ## Content Structure
 * 
 * The content is structured around collections and items, with a directory hierarchy
 * that mirrors the JSON structure used in the index files:
 * 
 * ```
 * Content/
 * ├── Cache/                      # Content cache directory
 * │   └── <collection-id>/        # Collection directory
 * │       ├── collection.json     # Collection metadata
 * │       └── items/              # Items directory
 * │           └── <item-id>/      # Item directory
 * │               ├── item.json   # Item metadata
 * │               ├── cover.jpg   # Item cover image
 * │               ├── images/     # Item images
 * │               ├── videos/     # Item videos
 * │               ├── models/     # Item 3D models
 * │               └── sounds/     # Item audio files
 * │
 * └── Configs/                    # Configuration directory
 *     └── Exporters/Unity/CraftSpace/
 *         ├── index-deep.json     # Master index of all collections and items
 *         ├── exporter-config.json # Exporter configuration
 *         └── collections-filter.json # Collections filter configuration
 * ```
 * 
 * ## index-deep.json
 * 
 * The `index-deep.json` file is the master index that defines all collections and items
 * to be exported to Unity. This file follows a structure that mirrors the file system:
 * 
 * ```json
 * {
 *   "collections": {
 *     "<collection-id>": {
 *       "collection": { ... },       // Collection metadata
 *       "items": {
 *         "<item-id>": {
 *           "item": { ... }          // Item metadata
 *         }
 *       },
 *       "itemsIndex": [              // Array of item IDs in this collection
 *         "<item-id>", ...
 *       ]
 *     }
 *   },
 *   "collectionsIndex": [            // Array of collection IDs to include
 *     "<collection-id>", ...
 *   ]
 * }
 * ```
 * 
 * The importer will:
 * - Create missing keys listed in collectionsIndex
 * - Remove keys not listed in collectionsIndex
 * - For each collection, create missing items listed in itemsIndex
 * - Remove items not listed in the collection's itemsIndex
 * 
 * ## Pipeline Phases
 * 
 * 1. **Bootstrap**: Initializes the directory structure and generates a base index-deep.json
 * 2. **Pull**: Downloads content from sources (Internet Archive, URLs) into the cache
 * 3. **Export**: Exports content from the cache to Unity based on the index-deep.json and filters
 * 
 * ## Cover Images
 * 
 * Cover images for Internet Archive items are automatically retrieved during the export phase
 * using the format: `https://archive.org/services/img/{itemId}`
 */

import fs from 'fs-extra';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import axios from 'axios';
import crypto from 'crypto';

// ========================================================================
// Constants & Configuration
// ========================================================================

// Default paths (can be overridden via CLI options)
const DEFAULT_CONFIG_DIR = path.resolve('Content/Configs');
const DEFAULT_CONTENT_CACHE = path.resolve('Content/Cache');
const DEFAULT_UNITY_DIR = path.resolve('Unity/CraftSpace');
const DEFAULT_EXPORTER_CONFIG = path.resolve('Content/Configs/Exporters/Unity/CraftSpace/exporter-config.json');

// ========================================================================
// Utility Functions
// ========================================================================

/**
 * Logger utility with colored output
 */
class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(message) {
    console.log(chalk.blue(message));
  }
  
  success(message) {
    console.log(chalk.green(message));
  }
  
  warning(message) {
    console.log(chalk.yellow(message));
  }
  
  error(message) {
    console.error(chalk.red(message));
  }
  
  debug(message) {
    if (this.verbose) {
      console.log(chalk.gray(message));
    }
  }
}

/**
 * Pattern matching for wildcard patterns
 * 
 * @param {string} str - The string to match
 * @param {string} pattern - The pattern to match against
 * @returns {boolean} - Whether the string matches the pattern
 */
function matchPattern(str, pattern) {
  if (pattern === '*') return true;
  
  // Simple wildcard matching
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }
  
  return str === pattern;
}

/**
 * Generate Internet Archive cover image URL from an item ID
 * 
 * @param {string} itemId - The Internet Archive item identifier
 * @returns {string} - The URL to the item's cover image
 */
function getArchiveImageUrl(itemId) {
  return `https://archive.org/services/img/${itemId}`;
}

// ========================================================================
// Content Pipeline Core Class
// ========================================================================

class ContentPipeline {
  constructor(options = {}) {
    this.configDir = options.configDir || DEFAULT_CONFIG_DIR;
    this.contentCache = options.contentCache || DEFAULT_CONTENT_CACHE;
    this.unityDir = options.unityDir || DEFAULT_UNITY_DIR;
    this.exporterConfig = options.exporterConfig || DEFAULT_EXPORTER_CONFIG;
    
    this.verbose = options.verbose || false;
    this.force = options.force || false;
    this.clean = options.clean || false;
    
    // Initialize logger
    this.logger = new Logger(this.verbose);
    
    // Ensure directories exist
    this.ensureDirectoryExists(this.configDir);
    this.ensureDirectoryExists(this.contentCache);
    
    // Load cache metadata if exists
    this.cacheMetadata = this.loadCacheMetadata();
  }
  
  // Utility methods
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      this.logger.debug(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  loadCacheMetadata() {
    const metadataPath = path.join(this.contentCache, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        this.logger.warning(`Failed to read cache metadata: ${error.message}`);
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
    this.logger.debug(`Downloading ${url} to ${dest}`);
    
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
  
  // Bootstrap phase
  async bootstrap() {
    this.logger.success('Starting bootstrap phase...');
    
    // Load bootstrap configuration
    const bootstrapConfigPath = path.join(this.configDir, 'bootstrap.json');
    if (!fs.existsSync(bootstrapConfigPath)) {
      throw new Error(`Bootstrap config not found at ${bootstrapConfigPath}`);
    }
    
    const config = JSON.parse(fs.readFileSync(bootstrapConfigPath, 'utf8'));
    
    // Initialize index-deep.json structure
    const indexDeep = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      collectionsIndex: [],
      collections: {}
    };
    
    // Process bootstrap tasks
    for (const task of config.tasks || []) {
      this.logger.info(`Processing bootstrap task: ${task.name || 'unnamed'}`);
      
      // Add to collections index if not already there
      if (!indexDeep.collectionsIndex.includes(task.collection)) {
        indexDeep.collectionsIndex.push(task.collection);
      }
      
      // Create collection index entry if it doesn't exist
      if (!indexDeep.collections[task.collection]) {
        indexDeep.collections[task.collection] = {
          id: task.collection,
          itemsIndex: []
        };
      }
      
      // Create collection directory if it doesn't exist
      const collectionDir = path.join(this.contentCache, task.collection);
      this.ensureDirectoryExists(collectionDir);
      
      // Process files
      for (const file of task.files || []) {
        const dest = path.join(collectionDir, file.name);
        
        // Skip if file exists and not forced
        if (fs.existsSync(dest) && !this.force) {
          this.logger.warning(`File ${dest} already exists, skipping...`);
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
    
    // Save index-deep.json
    const indexDeepPath = path.join(this.configDir, 'Exporters', 'Unity', 'CraftSpace', 'index-deep.json');
    this.ensureDirectoryExists(path.dirname(indexDeepPath));
    fs.writeFileSync(indexDeepPath, JSON.stringify(indexDeep, null, 2));
    this.logger.info(`Generated index-deep.json at ${indexDeepPath}`);
    
    // Save updated cache metadata
    this.saveCacheMetadata();
    this.logger.success('Bootstrap phase completed successfully.');
  }
  
  // Pull phase
  async pull() {
    this.logger.success('Starting pull phase...');
    
    // Load pull configuration
    const pullConfigPath = path.join(this.configDir, 'pull.json');
    if (!fs.existsSync(pullConfigPath)) {
      throw new Error(`Pull config not found at ${pullConfigPath}`);
    }
    
    const config = JSON.parse(fs.readFileSync(pullConfigPath, 'utf8'));
    
    // Process Internet Archive items
    for (const source of config.sources || []) {
      if (source.type === 'internetarchive') {
        this.logger.info(`Pulling content from Internet Archive: ${source.itemId}`);
        
        // Create directory for the item
        const itemDir = path.join(this.contentCache, source.collection, source.itemId);
        this.ensureDirectoryExists(itemDir);
        
        // Use internetarchive-sdk-js to fetch files
        for (const filePattern of source.files || ['*']) {
          const cmd = `ia download ${source.itemId} ${filePattern} --destdir=${itemDir} ${this.force ? '--force' : ''}`;
          
          try {
            this.logger.debug(`Executing: ${cmd}`);
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
            this.logger.error(`Error downloading ${source.itemId}: ${error.message}`);
          }
        }
      } else if (source.type === 'url') {
        this.logger.info(`Pulling content from URL: ${source.url}`);
        
        // Create directory for the item
        const itemDir = path.join(this.contentCache, source.collection, source.id || 'url-item');
        this.ensureDirectoryExists(itemDir);
        
        // Download the file
        const fileName = source.fileName || path.basename(source.url);
        const dest = path.join(itemDir, fileName);
        
        // Skip if file exists and not forced
        if (fs.existsSync(dest) && !this.force) {
          this.logger.warning(`File ${dest} already exists, skipping...`);
          continue;
        }
        
        try {
          await this.downloadFile(source.url, dest);
          
          // Update cache metadata
          if (!this.cacheMetadata[source.collection]) {
            this.cacheMetadata[source.collection] = {};
          }
          
          this.cacheMetadata[source.collection][source.id || 'url-item'] = {
            timestamp: new Date().toISOString(),
            source: source.url,
            fileName: fileName
          };
        } catch (error) {
          this.logger.error(`Error downloading from ${source.url}: ${error.message}`);
        }
      }
    }
    
    // Save updated cache metadata
    this.saveCacheMetadata();
    this.logger.success('Pull phase completed successfully.');
  }
  
  // Export phase
  async export() {
    this.logger.success('Starting export phase...');
    
    // Clean Unity export directory if requested
    if (this.clean) {
      const unityContentDir = path.join(this.unityDir, 'Assets', 'StreamingAssets', 'Content');
      if (fs.existsSync(unityContentDir)) {
        this.logger.warning(`Cleaning Unity content directory: ${unityContentDir}`);
        fs.removeSync(unityContentDir);
        fs.mkdirSync(unityContentDir, { recursive: true });
      }
    }
    
    // Load exporter configuration
    if (!fs.existsSync(this.exporterConfig)) {
      throw new Error(`Exporter config not found at ${this.exporterConfig}`);
    }
    
    const config = JSON.parse(fs.readFileSync(this.exporterConfig, 'utf8'));
    this.logger.info(`Loaded exporter config: ${this.exporterConfig}`);
    
    // Load index-deep.json
    const indexDeepPath = path.join(path.dirname(this.exporterConfig), 'index-deep.json');
    if (!fs.existsSync(indexDeepPath)) {
      throw new Error(`index-deep.json not found at ${indexDeepPath}. Run bootstrap first.`);
    }
    
    const indexDeep = JSON.parse(fs.readFileSync(indexDeepPath, 'utf8'));
    this.logger.info(`Loaded index-deep.json with ${indexDeep.collectionsIndex.length} collections`);
    
    // Create enhanced index-deep.json with additional metadata
    const enhancedIndexDeep = {
      ...indexDeep,
      exportedAt: new Date().toISOString(),
      exportConfig: config
    };
    
    // Load collections filter if specified
    let collectionsFilter = null;
    if (config.collectionsFilter) {
      const filterPath = path.join(path.dirname(this.exporterConfig), config.collectionsFilter);
      if (fs.existsSync(filterPath)) {
        collectionsFilter = JSON.parse(fs.readFileSync(filterPath, 'utf8'));
        this.logger.info(`Loaded collections filter: ${filterPath}`);
      } else {
        this.logger.warning(`Collections filter not found: ${filterPath}`);
      }
    }
    
    // Create Unity content directory
    const unityContentDir = path.join(this.unityDir, 'Assets', 'StreamingAssets', 'Content');
    this.ensureDirectoryExists(unityContentDir);
    
    // Write collections-index.json to Unity
    fs.writeFileSync(
      path.join(unityContentDir, 'collections-index.json'),
      JSON.stringify(indexDeep.collectionsIndex, null, 2)
    );
    
    // Export each collection
    for (const collectionId of indexDeep.collectionsIndex) {
      // Skip if collection doesn't exist in index
      if (!indexDeep.collections[collectionId]) {
        this.logger.warning(`Collection ${collectionId} not found in index-deep.json`);
        continue;
      }
      
      // Check if collection should be exported based on filter
      if (collectionsFilter && collectionsFilter.collections && collectionsFilter.collections[collectionId]) {
        const collectionFilter = collectionsFilter.collections[collectionId];
        
        // Skip disabled collections
        if (collectionFilter.enabled === false) {
          this.logger.warning(`Skipping disabled collection: ${collectionId}`);
          continue;
        }
      }
      
      this.logger.info(`Exporting collection: ${collectionId}`);
      
      // Create collection directory in Unity
      const unityCollectionDir = path.join(unityContentDir, collectionId);
      this.ensureDirectoryExists(unityCollectionDir);
      
      // Copy collection.json if exists
      const collectionJsonPath = path.join(this.contentCache, collectionId, 'collection.json');
      if (fs.existsSync(collectionJsonPath)) {
        fs.copyFileSync(collectionJsonPath, path.join(unityCollectionDir, 'collection.json'));
      }
      
      // Export each item in the collection
      const itemsIndex = indexDeep.collections[collectionId].itemsIndex || [];
      
      // Write items-index.json
      fs.writeFileSync(
        path.join(unityCollectionDir, 'items-index.json'),
        JSON.stringify(itemsIndex, null, 2)
      );
      
      // Create items directory
      const unityItemsDir = path.join(unityCollectionDir, 'items');
      this.ensureDirectoryExists(unityItemsDir);
      
      // Process each item
      for (const itemId of itemsIndex) {
        // Skip if item should be excluded based on filter
        if (collectionsFilter && collectionsFilter.collections && collectionsFilter.collections[collectionId]) {
          const collectionFilter = collectionsFilter.collections[collectionId];
          
          let included = false;
          
          // Check include patterns
          if (collectionFilter.include && collectionFilter.include.length > 0) {
            for (const pattern of collectionFilter.include) {
              if (matchPattern(itemId, pattern)) {
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
              if (matchPattern(itemId, pattern)) {
                included = false;
                break;
              }
            }
          }
          
          if (!included) {
            this.logger.debug(`Skipping excluded item: ${collectionId}/${itemId}`);
            continue;
          }
        }
        
        this.logger.debug(`Exporting item: ${collectionId}/${itemId}`);
        
        // Create item directory in Unity
        const unityItemDir = path.join(unityItemsDir, itemId);
        this.ensureDirectoryExists(unityItemDir);
        
        // Copy item.json if exists
        const itemJsonPath = path.join(this.contentCache, collectionId, 'items', itemId, 'item.json');
        if (fs.existsSync(itemJsonPath)) {
          fs.copyFileSync(itemJsonPath, path.join(unityItemDir, 'item.json'));
        }
        
        // Copy assets based on metadata settings
        if (collectionsFilter && collectionsFilter.metadata) {
          // Handle images
          if (collectionsFilter.metadata.includeImages) {
            const imageDir = path.join(this.contentCache, collectionId, 'items', itemId, 'images');
            const unityImageDir = path.join(unityItemDir, 'images');
            
            if (fs.existsSync(imageDir)) {
              this.ensureDirectoryExists(unityImageDir);
              fs.copySync(imageDir, unityImageDir);
            }
            
            // Copy cover.jpg if exists
            const coverPath = path.join(this.contentCache, collectionId, 'items', itemId, 'cover.jpg');
            if (fs.existsSync(coverPath)) {
              fs.copyFileSync(coverPath, path.join(unityItemDir, 'cover.jpg'));
            }
          }
          
          // Handle videos
          if (collectionsFilter.metadata.includeVideos) {
            const videoDir = path.join(this.contentCache, collectionId, 'items', itemId, 'videos');
            const unityVideoDir = path.join(unityItemDir, 'videos');
            
            if (fs.existsSync(videoDir)) {
              this.ensureDirectoryExists(unityVideoDir);
              fs.copySync(videoDir, unityVideoDir);
            }
          }
          
          // Handle models
          if (collectionsFilter.metadata.includeModels) {
            const modelDir = path.join(this.contentCache, collectionId, 'items', itemId, 'models');
            const unityModelDir = path.join(unityItemDir, 'models');
            
            if (fs.existsSync(modelDir)) {
              this.ensureDirectoryExists(unityModelDir);
              fs.copySync(modelDir, unityModelDir);
            }
          }
          
          // Handle sounds
          if (collectionsFilter.metadata.includeSounds) {
            const soundDir = path.join(this.contentCache, collectionId, 'items', itemId, 'sounds');
            const unitySoundDir = path.join(unityItemDir, 'sounds');
            
            if (fs.existsSync(soundDir)) {
              this.ensureDirectoryExists(unitySoundDir);
              fs.copySync(soundDir, unitySoundDir);
            }
          }
        }
      }
    }
    
    // Write enhanced index-deep.json to Unity
    fs.writeFileSync(
      path.join(unityContentDir, 'index-deep.json'),
      JSON.stringify(enhancedIndexDeep, null, 2)
    );
    
    this.logger.success('Export phase completed successfully.');
  }
  
  // Run the full pipeline
  async run() {
    try {
      await this.bootstrap();
      await this.pull();
      await this.export();
      this.logger.success('Pipeline completed successfully.');
    } catch (error) {
      this.logger.error(`Pipeline failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// ========================================================================
// Command Line Interface
// ========================================================================

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
    .requiredOption('--exporter-config <path>', 'Path to exporter configuration file', DEFAULT_EXPORTER_CONFIG)
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
    .requiredOption('--exporter-config <path>', 'Path to exporter configuration file', DEFAULT_EXPORTER_CONFIG)
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.export();
    })
);

// Parse command line arguments
program.parse();

// Export the ContentPipeline class for use in other modules
export default ContentPipeline; 