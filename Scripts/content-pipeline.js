#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const axios = require('axios');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Content Pipeline
 * 
 * A unified pipeline that handles content management for SpaceCraft:
 * 1. Bootstrap: Set up initial configuration and files
 * 2. Pull: Download content from sources (Internet Archive, etc.)
 * 3. Export: Process and export content to Unity
 * 
 * Usage:
 *   node content-pipeline.js run [options]     # Run the full pipeline
 *   node content-pipeline.js bootstrap [options]  # Just run bootstrap phase
 *   node content-pipeline.js pull [options]    # Just run pull phase
 *   node content-pipeline.js export [options]  # Just run export phase
 * 
 * This monolithic script centralizes all pipeline functionality to make it easier
 * to understand the overall process before potentially modularizing in the future.
 */

// Default paths
const DEFAULT_CONFIG_DIR = path.resolve(process.cwd(), 'Content/Configs');
const DEFAULT_CONTENT_CACHE = path.resolve(process.cwd(), 'Content/Cache');
const DEFAULT_UNITY_DIR = path.resolve(process.cwd(), 'Unity/CraftSpace');

/**
 * ContentPipeline class encapsulates all pipeline functionality
 */
class ContentPipeline {
  constructor(options = {}) {
    // Paths
    this.configDir = options.configDir || DEFAULT_CONFIG_DIR;
    this.contentCache = options.contentCache || DEFAULT_CONTENT_CACHE;
    this.unityDir = options.unityDir || DEFAULT_UNITY_DIR;
    
    // Special paths
    this.unityContentDir = path.join(this.unityDir, 'Assets', 'StreamingAssets', 'Content');
    this.filterConfigPath = path.join(this.configDir, 'Exporters', 'Unity', 'CraftSpace');
    
    // Options
    this.verbose = options.verbose || false;
    this.force = options.force || false;
    this.clean = options.clean || false;
    
    // Cache metadata
    this.cacheMetadataPath = path.join(this.contentCache, 'metadata.json');
    this.cacheMetadata = {
      collections: {},
      items: {},
      lastUpdated: null
    };
    
    // Stats for reporting
    this.stats = {
      collectionsProcessed: 0,
      itemsProcessed: 0,
      filesDownloaded: 0,
      filesExported: 0,
      errors: 0
    };
  }
  
  // ========================
  // UTILITY METHODS
  // ========================
  
  /**
   * Ensure a directory exists, creating it if needed
   */
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      if (this.verbose) this.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Log a message if verbose mode is enabled
   */
  log(message) {
    if (this.verbose) {
      console.log(chalk.blue(message));
    }
  }
  
  /**
   * Load cache metadata from file
   */
  loadCacheMetadata() {
    if (fs.existsSync(this.cacheMetadataPath)) {
      try {
        this.cacheMetadata = JSON.parse(fs.readFileSync(this.cacheMetadataPath, 'utf8'));
        this.log(`Loaded cache metadata with ${Object.keys(this.cacheMetadata.items || {}).length} items`);
      } catch (error) {
        console.warn(chalk.yellow(`Failed to read cache metadata: ${error.message}`));
      }
    } else {
      this.log('No cache metadata found, starting fresh');
    }
  }
  
  /**
   * Save cache metadata to file
   */
  saveCacheMetadata() {
    this.cacheMetadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.cacheMetadataPath, JSON.stringify(this.cacheMetadata, null, 2));
    this.log('Cache metadata saved');
  }
  
  /**
   * Generate a hash for cache validation
   */
  generateHash(content) {
    return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
  }
  
  /**
   * Download a file from a URL
   */
  async downloadFile(url, dest) {
    this.log(`Downloading ${url} to ${dest}`);
    
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });
      
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      this.stats.filesDownloaded++;
      return true;
    } catch (error) {
      console.error(chalk.red(`Error downloading ${url}: ${error.message}`));
      this.stats.errors++;
      return false;
    }
  }
  
  /**
   * Simple pattern matching (supports * wildcard)
   */
  matchPattern(str, pattern) {
    if (pattern === '*') return true;
    
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(str);
    }
    
    return str === pattern;
  }
  
  // ========================
  // BOOTSTRAP PHASE
  // ========================
  
  /**
   * Bootstrap phase: Set up initial configuration and files
   */
  async bootstrap() {
    console.log(chalk.green('🚀 Starting bootstrap phase...'));
    
    try {
      // Ensure directories exist
      this.ensureDirectoryExists(this.configDir);
      this.ensureDirectoryExists(this.contentCache);
      
      // Load cache metadata
      this.loadCacheMetadata();
      
      // Load bootstrap configuration
      const bootstrapConfigPath = path.join(this.configDir, 'bootstrap.json');
      
      if (!fs.existsSync(bootstrapConfigPath)) {
        throw new Error(`Bootstrap config not found at ${bootstrapConfigPath}`);
      }
      
      const config = JSON.parse(fs.readFileSync(bootstrapConfigPath, 'utf8'));
      
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
            this.log(`File ${dest} already exists, skipping...`);
            continue;
          }
          
          // Download or copy the file
          if (file.url) {
            await this.downloadFile(file.url, dest);
          } else if (file.source) {
            const sourcePath = path.resolve(file.source);
            fs.copyFileSync(sourcePath, dest);
            this.stats.filesDownloaded++;
          }
          
          // Update cache metadata
          if (!this.cacheMetadata.collections[task.collection]) {
            this.cacheMetadata.collections[task.collection] = {};
          }
          
          this.cacheMetadata.collections[task.collection][file.name] = {
            timestamp: new Date().toISOString(),
            source: file.url || file.source,
            hash: this.generateHash(file)
          };
        }
        
        this.stats.collectionsProcessed++;
      }
      
      // Save updated cache metadata
      this.saveCacheMetadata();
      
      console.log(chalk.green('✅ Bootstrap phase completed successfully.'));
    } catch (error) {
      console.error(chalk.red(`❌ Bootstrap phase failed: ${error.message}`));
      this.stats.errors++;
      throw error;
    }
  }
  
  // ========================
  // PULL PHASE
  // ========================
  
  /**
   * Pull phase: Download content from sources
   */
  async pull() {
    console.log(chalk.green('🔄 Starting pull phase...'));
    
    try {
      // Ensure directories exist
      this.ensureDirectoryExists(this.contentCache);
      
      // Load cache metadata if not already loaded
      if (!this.cacheMetadata.lastUpdated) {
        this.loadCacheMetadata();
      }
      
      // Load pull configuration
      const pullConfigPath = path.join(this.configDir, 'pull.json');
      
      if (!fs.existsSync(pullConfigPath)) {
        throw new Error(`Pull config not found at ${pullConfigPath}`);
      }
      
      const config = JSON.parse(fs.readFileSync(pullConfigPath, 'utf8'));
      
      // Process sources
      for (const source of config.sources || []) {
        if (source.type === 'internetarchive') {
          await this.pullFromInternetArchive(source);
        } else if (source.type === 'url') {
          await this.pullFromUrl(source);
        } else if (source.type === 'local') {
          await this.pullFromLocal(source);
        } else {
          console.warn(chalk.yellow(`Unknown source type: ${source.type}`));
        }
      }
      
      // Save updated cache metadata
      this.saveCacheMetadata();
      
      console.log(chalk.green('✅ Pull phase completed successfully.'));
    } catch (error) {
      console.error(chalk.red(`❌ Pull phase failed: ${error.message}`));
      this.stats.errors++;
      throw error;
    }
  }
  
  /**
   * Pull content from Internet Archive
   */
  async pullFromInternetArchive(source) {
    console.log(chalk.blue(`Pulling content from Internet Archive: ${source.itemId}`));
    
    // Create directory for the item
    const itemDir = path.join(this.contentCache, source.collection, source.itemId);
    this.ensureDirectoryExists(itemDir);
    
    // Use internetarchive CLI to fetch files
    for (const filePattern of source.files || ['*']) {
      const cmd = `ia download ${source.itemId} ${filePattern} --destdir=${itemDir} ${this.force ? '--force' : ''}`;
      
      try {
        this.log(`Executing: ${cmd}`);
        execSync(cmd, { stdio: this.verbose ? 'inherit' : 'ignore' });
        
        // Update cache metadata
        if (!this.cacheMetadata.collections[source.collection]) {
          this.cacheMetadata.collections[source.collection] = {};
        }
        
        if (!this.cacheMetadata.items[`${source.collection}/${source.itemId}`]) {
          this.cacheMetadata.items[`${source.collection}/${source.itemId}`] = {};
        }
        
        this.cacheMetadata.items[`${source.collection}/${source.itemId}`] = {
          timestamp: new Date().toISOString(),
          source: `internetarchive:${source.itemId}`,
          files: filePattern,
          collection: source.collection
        };
        
        this.stats.filesDownloaded++;
      } catch (error) {
        console.error(chalk.red(`Error downloading ${source.itemId}: ${error.message}`));
        this.stats.errors++;
      }
    }
    
    this.stats.itemsProcessed++;
  }
  
  /**
   * Pull content from URL
   */
  async pullFromUrl(source) {
    console.log(chalk.blue(`Pulling content from URL: ${source.url}`));
    
    // Create directory for the item
    const itemDir = path.join(this.contentCache, source.collection, source.id || 'default');
    this.ensureDirectoryExists(itemDir);
    
    // Download the file
    const filename = source.filename || path.basename(source.url);
    const destPath = path.join(itemDir, filename);
    
    if (await this.downloadFile(source.url, destPath)) {
      // Update cache metadata
      if (!this.cacheMetadata.collections[source.collection]) {
        this.cacheMetadata.collections[source.collection] = {};
      }
      
      if (!this.cacheMetadata.items[`${source.collection}/${source.id || 'default'}`]) {
        this.cacheMetadata.items[`${source.collection}/${source.id || 'default'}`] = {};
      }
      
      this.cacheMetadata.items[`${source.collection}/${source.id || 'default'}`][filename] = {
        timestamp: new Date().toISOString(),
        source: source.url,
        collection: source.collection
      };
      
      this.stats.itemsProcessed++;
    }
  }
  
  /**
   * Pull content from local file system
   */
  async pullFromLocal(source) {
    console.log(chalk.blue(`Pulling content from local: ${source.path}`));
    
    const sourcePath = path.resolve(source.path);
    
    if (!fs.existsSync(sourcePath)) {
      console.error(chalk.red(`Source path not found: ${sourcePath}`));
      this.stats.errors++;
      return;
    }
    
    // Create directory for the item
    const itemDir = path.join(this.contentCache, source.collection, source.id || 'default');
    this.ensureDirectoryExists(itemDir);
    
    try {
      if (fs.statSync(sourcePath).isDirectory()) {
        // Copy directory contents
        fs.copySync(sourcePath, itemDir);
      } else {
        // Copy single file
        const filename = source.filename || path.basename(sourcePath);
        fs.copyFileSync(sourcePath, path.join(itemDir, filename));
      }
      
      // Update cache metadata
      if (!this.cacheMetadata.collections[source.collection]) {
        this.cacheMetadata.collections[source.collection] = {};
      }
      
      if (!this.cacheMetadata.items[`${source.collection}/${source.id || 'default'}`]) {
        this.cacheMetadata.items[`${source.collection}/${source.id || 'default'}`] = {};
      }
      
      this.cacheMetadata.items[`${source.collection}/${source.id || 'default'}`].local = {
        timestamp: new Date().toISOString(),
        source: sourcePath,
        collection: source.collection
      };
      
      this.stats.filesDownloaded++;
      this.stats.itemsProcessed++;
    } catch (error) {
      console.error(chalk.red(`Error copying from ${sourcePath}: ${error.message}`));
      this.stats.errors++;
    }
  }
  
  // ========================
  // EXPORT PHASE
  // ========================
  
  /**
   * Export phase: Process and export content to Unity
   */
  async export() {
    console.log(chalk.green('📤 Starting export phase...'));
    
    try {
      // Ensure directories exist
      this.ensureDirectoryExists(this.unityContentDir);
      
      // Load cache metadata if not already loaded
      if (!this.cacheMetadata.lastUpdated) {
        this.loadCacheMetadata();
      }
      
      // Clean Unity export directory if requested
      if (this.clean) {
        console.log(chalk.yellow(`Cleaning Unity content directory: ${this.unityContentDir}`));
        fs.removeSync(this.unityContentDir);
        fs.mkdirSync(this.unityContentDir, { recursive: true });
      }
      
      // Load export configuration
      const exportConfigPath = path.join(this.configDir, 'export.json');
      
      if (!fs.existsSync(exportConfigPath)) {
        throw new Error(`Export config not found at ${exportConfigPath}`);
      }
      
      const config = JSON.parse(fs.readFileSync(exportConfigPath, 'utf8'));
      
      // Process export targets
      for (const target of config.targets || []) {
        if (target.type === 'unity') {
          await this.exportToUnity(target);
        } else {
          console.warn(chalk.yellow(`Unknown target type: ${target.type}`));
        }
      }
      
      console.log(chalk.green('✅ Export phase completed successfully.'));
    } catch (error) {
      console.error(chalk.red(`❌ Export phase failed: ${error.message}`));
      this.stats.errors++;
      throw error;
    }
  }
  
  /**
   * Export content to Unity
   */
  async exportToUnity(target) {
    console.log(chalk.blue(`Exporting content to Unity: ${target.name || 'unnamed'}`));
    
    // Load filter configuration if specified
    let filter = null;
    if (target.filter) {
      const filterPath = path.join(this.filterConfigPath, target.filter);
      if (fs.existsSync(filterPath)) {
        filter = JSON.parse(fs.readFileSync(filterPath, 'utf8'));
        this.log(`Loaded filter configuration: ${target.filter}`);
      } else {
        console.warn(chalk.yellow(`Filter file not found: ${filterPath}`));
      }
    }
    
    // Prepare Unity content directory
    this.ensureDirectoryExists(this.unityContentDir);
    
    // Write a collections-index.json with all collection IDs
    const collectionsIndex = target.collections || [];
    await fs.writeJson(
      path.join(this.unityContentDir, 'collections-index.json'),
      collectionsIndex,
      { spaces: 2 }
    );
    
    // Prepare index structure for Unity
    const unityIndex = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections: {},
      collectionsIndex: collectionsIndex
    };
    
    // Process each collection
    for (const collectionId of collectionsIndex) {
      await this.exportCollectionToUnity(collectionId, filter, unityIndex);
    }
    
    // Write the index-deep.json to Unity
    await fs.writeJson(
      path.join(this.unityContentDir, 'index-deep.json'),
      unityIndex,
      { spaces: 2 }
    );
    
    // Also write it to the config directory for reference
    await fs.writeJson(
      path.join(this.filterConfigPath, 'index-deep-exported.json'),
      unityIndex,
      { spaces: 2 }
    );
  }
  
  /**
   * Export a collection to Unity
   */
  async exportCollectionToUnity(collectionId, filter, unityIndex) {
    const sourceDir = path.join(this.contentCache, collectionId);
    const targetDir = path.join(this.unityContentDir, 'collections', collectionId);
    
    if (!fs.existsSync(sourceDir)) {
      console.warn(chalk.yellow(`Source collection not found: ${sourceDir}`));
      return;
    }
    
    this.ensureDirectoryExists(targetDir);
    this.ensureDirectoryExists(path.join(targetDir, 'items'));
    
    // Check filter configuration for this collection
    const collectionFilter = filter && filter.collections && filter.collections[collectionId];
    
    // Skip disabled collections
    if (collectionFilter && collectionFilter.enabled === false) {
      console.log(chalk.yellow(`Skipping disabled collection: ${collectionId}`));
      return;
    }
    
    // Copy collection metadata if it exists
    const collectionMetadataPath = path.join(sourceDir, 'collection.json');
    let collectionData = { id: collectionId };
    
    if (fs.existsSync(collectionMetadataPath)) {
      collectionData = JSON.parse(fs.readFileSync(collectionMetadataPath, 'utf8'));
      await fs.writeJson(
        path.join(targetDir, 'collection.json'),
        collectionData,
        { spaces: 2 }
      );
      this.stats.filesExported++;
    }
    
    // Add collection to unity index
    unityIndex.collections[collectionId] = {
      id: collectionId,
      name: collectionData.title || collectionId,
      description: collectionData.description || '',
      collection: collectionData,
      itemsIndex: [],
      items: {}
    };
    
    // Get items in the collection
    const itemsDir = path.join(sourceDir, 'Items');
    let itemIds = [];
    
    if (fs.existsSync(itemsDir) && fs.statSync(itemsDir).isDirectory()) {
      itemIds = fs.readdirSync(itemsDir)
        .filter(name => fs.statSync(path.join(itemsDir, name)).isDirectory());
    } else {
      // No Items subdirectory, check if the collection directory contains items directly
      itemIds = fs.readdirSync(sourceDir)
        .filter(name => fs.statSync(path.join(sourceDir, name)).isDirectory() && name !== 'Items');
    }
    
    // Process each item
    const includedItemIds = [];
    
    for (const itemId of itemIds) {
      const itemSourceDir = fs.existsSync(path.join(itemsDir, itemId)) 
        ? path.join(itemsDir, itemId) 
        : path.join(sourceDir, itemId);
      
      // Apply filter if specified
      let included = true;
      
      if (collectionFilter) {
        // Check include patterns
        if (collectionFilter.include && collectionFilter.include.length > 0) {
          included = false;
          for (const pattern of collectionFilter.include) {
            if (this.matchPattern(itemId, pattern)) {
              included = true;
              break;
            }
          }
        }
        
        // Check exclude patterns
        if (included && collectionFilter.exclude && collectionFilter.exclude.length > 0) {
          for (const pattern of collectionFilter.exclude) {
            if (this.matchPattern(itemId, pattern)) {
              included = false;
              break;
            }
          }
        }
      }
      
      if (included) {
        await this.exportItemToUnity(collectionId, itemId, itemSourceDir, unityIndex);
        includedItemIds.push(itemId);
      } else {
        this.log(`Skipped item ${itemId} based on filter rules`);
      }
    }
    
    // Update itemsIndex in the Unity index
    unityIndex.collections[collectionId].itemsIndex = includedItemIds;
    
    // Write items-index.json
    await fs.writeJson(
      path.join(targetDir, 'items-index.json'),
      includedItemIds,
      { spaces: 2 }
    );
    
    this.stats.collectionsProcessed++;
  }
  
  /**
   * Export an item to Unity
   */
  async exportItemToUnity(collectionId, itemId, itemSourceDir, unityIndex) {
    const targetItemDir = path.join(this.unityContentDir, 'collections', collectionId, 'items', itemId);
    this.ensureDirectoryExists(targetItemDir);
    
    // Copy item metadata
    const itemMetadataPath = path.join(itemSourceDir, 'item.json');
    let itemData = { id: itemId };
    
    if (fs.existsSync(itemMetadataPath)) {
      itemData = JSON.parse(fs.readFileSync(itemMetadataPath, 'utf8'));
      await fs.writeJson(
        path.join(targetItemDir, 'item.json'),
        itemData,
        { spaces: 2 }
      );
      this.stats.filesExported++;
    }
    
    // Add to Unity index
    unityIndex.collections[collectionId].items[itemId] = {
      id: itemId,
      name: itemData.title || itemId,
      description: Array.isArray(itemData.description) 
        ? itemData.description.join(' ') 
        : (itemData.description || ''),
      item: itemData
    };
    
    // Handle cover image
    const coverImagePath = path.join(itemSourceDir, 'cover.jpg');
    if (fs.existsSync(coverImagePath)) {
      await fs.copyFile(
        coverImagePath,
        path.join(targetItemDir, 'cover.jpg')
      );
      
      unityIndex.collections[collectionId].items[itemId].coverImage = {
        width: 600, // Placeholder dimensions
        height: 900,
        fileName: 'cover.jpg'
      };
      
      this.stats.filesExported++;
    }
    
    // Copy other files based on filter rules
    const files = fs.readdirSync(itemSourceDir)
      .filter(name => !['item.json', 'cover.jpg'].includes(name));
    
    for (const file of files) {
      const sourcePath = path.join(itemSourceDir, file);
      const targetPath = path.join(targetItemDir, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        fs.copySync(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
      
      this.stats.filesExported++;
    }
    
    this.log(`Exported item ${collectionId}/${itemId} to Unity`);
    this.stats.itemsProcessed++;
  }
  
  // ========================
  // FULL PIPELINE
  // ========================
  
  /**
   * Run the full pipeline
   */
  async run() {
    console.log(chalk.green('🚀 Starting Content Pipeline'));
    
    try {
      // Step 1: Bootstrap
      await this.bootstrap();
      
      // Step 2: Pull
      await this.pull();
      
      // Step 3: Export
      await this.export();
      
      // Output stats
      console.log(chalk.green('\n📊 Pipeline Statistics:'));
      console.log(`Collections processed: ${this.stats.collectionsProcessed}`);
      console.log(`Items processed: ${this.stats.itemsProcessed}`);
      console.log(`Files downloaded: ${this.stats.filesDownloaded}`);
      console.log(`Files exported: ${this.stats.filesExported}`);
      console.log(`Errors: ${this.stats.errors}`);
      
      console.log(chalk.green('\n✅ Content pipeline completed successfully'));
      
      return {
        success: true,
        stats: this.stats
      };
    } catch (error) {
      console.error(chalk.red(`\n❌ Pipeline failed: ${error.message}`));
      
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    }
  }
  
  /**
   * Generate Mermaid diagram for the pipeline
   */
  static generateMermaidDiagram() {
    return `
```mermaid
flowchart TB
  Start([Start]) --> Bootstrap
  
  subgraph "Bootstrap Phase"
    Bootstrap[Bootstrap] --> LoadBootstrapConfig[Load bootstrap.json]
    LoadBootstrapConfig --> ProcessBootstrapTasks[Process bootstrap tasks]
    ProcessBootstrapTasks --> DownloadInitialFiles[Download/copy initial files]
  end
  
  subgraph "Pull Phase"
    Pull[Pull] --> LoadPullConfig[Load pull.json]
    LoadPullConfig --> ProcessSources[Process sources]
    ProcessSources --> PullIA[Internet Archive]
    ProcessSources --> PullURL[URLs]
    ProcessSources --> PullLocal[Local files]
    PullIA --> ContentCache[(Content Cache)]
    PullURL --> ContentCache
    PullLocal --> ContentCache
  end
  
  subgraph "Export Phase"
    Export[Export] --> LoadExportConfig[Load export.json]
    LoadExportConfig --> ProcessTargets[Process export targets]
    ProcessTargets --> LoadFilter[Load filter config]
    LoadFilter --> ApplyFilter[Apply filter rules]
    ApplyFilter --> ExportToUnity[Export to Unity]
    ContentCache --> ApplyFilter
    ExportToUnity --> UnityContent[(Unity StreamingAssets)]
  end
  
  DownloadInitialFiles --> Pull
  Pull --> Export
  Export --> End([End])
  
  class Bootstrap,Pull,Export emphasis
```
    `;
  }
}

// Set up command-line interface
program
  .name('content-pipeline')
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

// Generate and display Mermaid diagram
program
  .command('diagram')
  .description('Generate a Mermaid diagram of the pipeline')
  .action(() => {
    console.log(ContentPipeline.generateMermaidDiagram());
  });

// Parse command line arguments
program.parse();

// Export the class for use in other modules
module.exports = ContentPipeline; 