#!/usr/bin/env node

/**
 * Content Pipeline for SpaceCraft
 * 
 * A unified system for importing content from Internet Archive to a shared cache
 * and exporting to Unity's StreamingAssets directory.
 * 
 * Two-pass approach:
 * 1. Import: Update cache from Internet Archive (non-destructive)
 * 2. Export: Create application-specific output from cache (can be destructive)
 */

import fs from 'fs-extra';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import axios from 'axios';
import crypto from 'crypto';
import imageSize from 'image-size';
import { promisify } from 'util';
import { glob } from 'glob';
import os from 'os';
import sharp from 'sharp';

// Import constants from lib
import { EMOJI, CLI_FORMATTING, PATHS } from '../src/lib/constants/index.ts';

// Default paths
const DEFAULT_CONFIG_DIR = path.resolve(PATHS.ROOT_DIR, 'Content/Configs');
const DEFAULT_CONTENT_CACHE = path.resolve(PATHS.ROOT_DIR, 'Content/collections');
const DEFAULT_UNITY_DIR = PATHS.UNITY_DIR;

/**
 * PipelineLogger class with integrated receipt tracking
 */
class PipelineLogger {
  constructor(level = LOG_LEVELS.INFO) {
    this.level = level;
    
    // Initialize receipt/metrics object with big-endian naming convention
    this.receipt = {
      // Download metadata
      download_date: new Date().toISOString(),
      download_environment: process.env.NODE_ENV || 'development',
      download_geoLocation: null,
      download_hostname: os.hostname(),
      download_ipAddress: null,
      download_name: null,
      download_platform: os.platform(),
      
      // API metrics
      api_calls_total: 0,
      api_errors_count: 0,
      api_bandwidth_bytesDownloaded: 0,
      api_performance_avgResponseTime: 0,
      api_performance_totalTime: 0,
      
      // Collection metrics
      collection_processed_count: 0,
      collection_exported_count: 0,
      collection_filtered_count: 0,
      
      // Cover metrics
      cover_download_count: 0,
      cover_download_totalBytes: 0,
      cover_download_totalTime: 0,
      cover_download_avgSpeed: 0,
      cover_download_maxSpeed: 0,
      cover_download_minSpeed: Number.MAX_VALUE,
      cover_cache_hits: 0,
      cover_cache_misses: 0,
      cover_requested_count: 0,
      
      // Item metrics
      item_processed_count: 0,
      item_filtered_count: 0,
      item_skipped_count: 0,
      item_exported_count: 0,
      
      // Error and warning logs
      error_count: 0,
      error_list: [],
      warning_count: 0,
      warning_list: [],
      info_list: [],
      
      // Performance metrics
      perf_startTime: new Date().toISOString(),
      perf_endTime: null,
      perf_importPhase_totalTime: 0,
      perf_exportPhase_totalTime: 0,
      perf_network_totalTime: 0,
      perf_processing_totalTime: 0,
      perf_total_duration: 0
    };
  }
  
  // Standard logging methods with receipt integration
  debug(message, data = null, context = {}) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(`${CLI_FORMATTING.DIM}${EMOJI.DEBUG} ${message}${CLI_FORMATTING.RESET}`, data ? data : '');
    }
  }
  
  info(message, data = null, context = {}) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(`${CLI_FORMATTING.BLUE}${EMOJI.INFO} ${message}${CLI_FORMATTING.RESET}`, data ? data : '');
      this.push('info_list', this._createLogEntry('INFO', message, context));
    }
  }
  
  success(message, data = null, context = {}) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(`${CLI_FORMATTING.GREEN}${EMOJI.SUCCESS} ${message}${CLI_FORMATTING.RESET}`, data ? data : '');
      this.push('info_list', this._createLogEntry('SUCCESS', message, context));
    }
  }
  
  warn(message, data = null, context = {}) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.log(`${CLI_FORMATTING.YELLOW}${EMOJI.WARNING} ${message}${CLI_FORMATTING.RESET}`, data ? data : '');
      this.push('warning_list', this._createLogEntry('WARNING', message, context));
      this.increment('warning_count');
    }
  }
  
  error(message, error = null, context = {}) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(`${CLI_FORMATTING.RED}${EMOJI.ERROR} ${message}${CLI_FORMATTING.RESET}`);
      if (error && error.stack) {
        console.error(`${CLI_FORMATTING.DIM}${error.stack}${CLI_FORMATTING.RESET}`);
      }
      
      const errorDetails = error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null;
      
      this.push('error_list', this._createLogEntry('ERROR', message, {
        ...context,
        error: errorDetails
      }));
      
      this.increment('error_count');
    }
  }
  
  // Metrics API - increment counter
  increment(key, amount = 1) {
    if (this.receipt[key] === undefined) {
      this.receipt[key] = 0;
    }
    this.receipt[key] += amount;
    return this.receipt[key];
  }
  
  // Metrics API - add to a total
  add(key, value) {
    if (this.receipt[key] === undefined) {
      this.receipt[key] = 0;
    }
    this.receipt[key] += value;
    return this.receipt[key];
  }
  
  // Metrics API - set a value
  set(key, value) {
    this.receipt[key] = value;
    return value;
  }
  
  // Metrics API - push to an array
  push(arrayKey, value) {
    if (!Array.isArray(this.receipt[arrayKey])) {
      this.receipt[arrayKey] = [];
    }
    this.receipt[arrayKey].push(value);
    return this.receipt[arrayKey].length;
  }
  
  // Get a copy of the receipt
  getReceipt() {
    // Make a deep copy to avoid external modification
    return JSON.parse(JSON.stringify(this.receipt));
  }
  
  // Update download metadata
  setDownloadInfo(info = {}) {
    if (info.name) this.receipt.download_name = info.name;
    if (info.ipAddress) this.receipt.download_ipAddress = info.ipAddress;
    if (info.geoLocation) this.receipt.download_geoLocation = info.geoLocation;
  }
  
  // Update final receipt before output
  finalize() {
    // Update timestamps and durations
    this.receipt.perf_endTime = new Date().toISOString();
    
    // Calculate duration if start time exists
    if (this.receipt.perf_startTime) {
      const start = new Date(this.receipt.perf_startTime).getTime();
      const end = new Date(this.receipt.perf_endTime).getTime();
      this.receipt.perf_total_duration = end - start;
    }
    
    // Calculate average download speed if applicable
    if (this.receipt.cover_download_totalTime > 0 && this.receipt.cover_download_totalBytes > 0) {
      this.receipt.cover_download_avgSpeed = 
        (this.receipt.cover_download_totalBytes * 8 / 1000000) / 
        (this.receipt.cover_download_totalTime / 1000); // Mbps
    }
    
    // Calculate API average response time
    if (this.receipt.api_calls_total > 0 && this.receipt.api_performance_totalTime > 0) {
      this.receipt.api_performance_avgResponseTime = 
        this.receipt.api_performance_totalTime / this.receipt.api_calls_total;
    }
    
    return this.receipt;
  }
  
  // Helper to create structured log entries
  _createLogEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      function: context.function || 'unknown',
      collectionId: context.collectionId || null,
      itemId: context.itemId || null,
      ...context
    };
  }
}

/**
 * Content Pipeline
 */
class ContentPipeline {
  /**
   * Create a new ContentPipeline instance
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.configDir = options.configDir || DEFAULT_CONFIG_DIR;
    this.contentCache = options.contentCache || DEFAULT_CONTENT_CACHE;
    this.unityDir = options.unityDir || DEFAULT_UNITY_DIR;
    this.verbose = options.verbose || false;
    this.force = options.force || false;
    this.clean = options.clean || false;
    
    // Ensure directories exist
    this.ensureDirectoryExists(this.configDir);
    this.ensureDirectoryExists(path.join(this.configDir, 'Importers'));
    this.ensureDirectoryExists(path.join(this.configDir, 'Exporters'));
    this.ensureDirectoryExists(this.contentCache);
    
    // Create a logger with receipt
    const logLevel = this.verbose ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
    this.logger = new PipelineLogger(logLevel);
    
    // Add downloader info if provided
    if (options.downloaderInfo) {
      this.logger.setDownloadInfo(options.downloaderInfo);
    }
  }
  
  /**
   * Ensure a directory exists
   * @param {string} dir Directory path
   */
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      this.logger.debug(`Creating directory: ${dir}`, null, { function: 'ensureDirectoryExists' });
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Generate a hash of content for caching
   * @param {string|Object} content Content to hash
   * @returns {string} MD5 hash
   */
  generateHash(content) {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('md5').update(contentStr).digest('hex');
  }
  
  /**
   * Resolve an importer config path
   * @param {string} importerPath Path from command line
   * @returns {string} Full resolved path
   */
  resolveImporterConfigPath(importerPath) {
    // If path ends with .json, treat it as a full path
    if (importerPath.endsWith('.json')) {
      return path.resolve(importerPath);
    }
    
    // Base configs directory
    const baseDir = path.join(this.configDir, 'Importers');
    
    // Check if it's a directory path or includes a config name
    if (fs.existsSync(path.join(baseDir, importerPath)) && 
        fs.statSync(path.join(baseDir, importerPath)).isDirectory()) {
      // It's a directory path, use default config name
      return path.join(baseDir, importerPath, 'importer-config.json');
    } else {
      // It might be a path with a config variant like "ia/config-debug"
      const configDir = path.dirname(path.join(baseDir, importerPath));
      const configBaseName = path.basename(importerPath);
      
      // If configBaseName starts with "importer-config", use as is + .json
      if (configBaseName.startsWith('importer-config')) {
        return path.join(configDir, `${configBaseName}.json`);
      }
      
      // Otherwise, it's a suffix for importer-config
      return path.join(configDir, `importer-config${configBaseName.startsWith('-') ? '' : '-'}${configBaseName}.json`);
    }
  }
  
  /**
   * Resolve an exporter config path
   * @param {string} exporterPath Path from command line
   * @returns {string} Full resolved path
   */
  resolveExporterConfigPath(exporterPath) {
    // If path ends with .json, treat it as a full path
    if (exporterPath.endsWith('.json')) {
      return path.resolve(exporterPath);
    }
    
    // Base configs directory
    const baseDir = path.join(this.configDir, 'Exporters');
    
    // Check if it's a directory path or includes a config name
    if (fs.existsSync(path.join(baseDir, exporterPath)) && 
        fs.statSync(path.join(baseDir, exporterPath)).isDirectory()) {
      // It's a directory path, use default config name
      return path.join(baseDir, exporterPath, 'exporter-config.json');
    } else {
      // It might be a path with a config variant like "Unity/CraftSpace/config-debug"
      const configDir = path.dirname(path.join(baseDir, exporterPath));
      const configBaseName = path.basename(exporterPath);
      
      // If configBaseName starts with "exporter-config", use as is + .json
      if (configBaseName.startsWith('exporter-config')) {
        return path.join(configDir, `${configBaseName}.json`);
      }
      
      // Otherwise, it's a suffix for exporter-config
      return path.join(configDir, `exporter-config${configBaseName.startsWith('-') ? '' : '-'}${configBaseName}.json`);
    }
  }
  
  /**
   * Load importer configuration
   * @param {string} importerPath Path to importer directory or config
   * @returns {Promise<Object>} Importer configuration
   */
  async loadImporterConfig(importerPath) {
    const configPath = this.resolveImporterConfigPath(importerPath);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Importer config not found: ${configPath}`);
    }
    
    this.logger.info(`Loading importer config: ${configPath}`);
    const config = await fs.readJSON(configPath);
    
    // Add the importer config directory for later use
    config._configDir = path.dirname(configPath);
    
    return config;
  }
  
  /**
   * Load exporter configuration
   * @param {string} exporterPath Path to exporter directory or config
   * @returns {Promise<Object>} Exporter configuration
   */
  async loadExporterConfig(exporterPath) {
    const configPath = this.resolveExporterConfigPath(exporterPath);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Exporter config not found: ${configPath}`);
    }
    
    this.logger.info(`Loading exporter config: ${configPath}`);
    const config = await fs.readJSON(configPath);
    
    // Add the exporter config directory for later use
    config._configDir = path.dirname(configPath);
    
    return config;
  }
  
  /**
   * Load the whitelist from index-deep.json
   * Later this will be renamed and rewritten tosupport 
   * structured whitelists, blacklists, filtering, ordering, 
   * augmenting, etc.
   * @param {Object} exporterConfig Exporter configuration
   * @returns {Promise<Object>} Content whitelist
   */
  async loadWhitelist(exporterConfig) {
    // Get the configured index deep file or use default
    const indexDeepFile = exporterConfig.indexDeepFile || 'index-deep.json';
    const indexDeepPath = path.join(exporterConfig._configDir, indexDeepFile);
    
    if (!fs.existsSync(indexDeepPath)) {
      throw new Error(`Index deep file not found: ${indexDeepPath}`);
    }
    
    this.logger.info(`Loading index deep file: ${indexDeepPath}`);
    
    try {
      return await fs.readJSON(indexDeepPath);
    } catch (error) {
      throw new Error(`Error reading index deep file: ${error.message}`);
    }
  }
  
  /**
   * Get image dimensions
   * @param {string} imagePath Path to image file
   * @returns {Promise<Object|null>} Image dimensions or null if error
   */
  async getImageDimensions(imagePath) {
    try {
      const dimensions = imageSize(imagePath);
      return {
        width: dimensions.width,
        height: dimensions.height,
        type: dimensions.type
      };
    } catch (error) {
      this.logger.debug(`Error getting image dimensions for ${imagePath}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Download a file
   * @param {string} url URL to download
   * @param {string} outputPath Destination file path
   * @param {Object} context Download context
   * @returns {Promise<Object>} Download stats
   */
  async downloadFile(url, outputPath, context = {}) {
    // Add function name to context if not present
    context = { function: 'downloadFile', url, ...context };
    
    try {
      this.logger.info(`Downloading file: ${url}`, null, context);
      
      // Track download start
      this.logger.increment('downloads_total', 1, context);
      const startTime = Date.now();
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(outputPath));
      
      // Download file
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });
      
      // Get total file size from headers
      const totalSize = parseInt(response.headers['content-length'] || 0, 10);
      let downloadedSize = 0;
      
      // Create write stream
      const writer = fs.createWriteStream(outputPath);
      
      // Setup download progress tracking
      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        
        // Update progress percentage every 10% or every 10MB for large files
        if (totalSize > 0) {
          const progressPct = Math.floor((downloadedSize / totalSize) * 100);
          // Only log at 10% intervals to reduce log volume
          if (progressPct % 10 === 0 && progressPct > 0) {
            this.logger.info(`Download progress: ${progressPct}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`, null, context);
          }
        } else if (downloadedSize % (10 * 1024 * 1024) === 0) { // Log every 10MB for unknown sizes
          this.logger.info(`Downloaded ${this.formatBytes(downloadedSize)}`, null, context);
        }
      });
      
      // Wait for download to complete
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.pipe(writer);
      });
      
      // Calculate metrics
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      const speed = downloadedSize / duration; // Bytes per second
      
      // Log completion
      this.logger.info(
        `Download complete: ${this.formatBytes(downloadedSize)} in ${duration.toFixed(2)}s (${this.formatBytes(speed)}/s)`,
        null,
        context
      );
      
      // Track metrics
      this.logger.add('downloads_bytes', downloadedSize, context);
      this.logger.add('downloads_time', duration, context); // In seconds
      this.logger.set('downloads_speed', speed, context); // Bytes per second
      
      return outputPath;
    } catch (error) {
      this.logger.error(`Download failed: ${url}`, error, context);
      this.logger.increment('downloads_errors', 1, context);
      throw error;
    }
  }
  
  /**
   * Format bytes to human-readable string
   * @param {number} bytes Number of bytes
   * @param {number} decimals Number of decimal places
   * @returns {string} Formatted string
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  }
  
  /**
   * Check if item should be included based on filter
   * @param {string} itemId Item ID
   * @param {Object} filter Filter configuration for collection
   * @returns {boolean} Whether item should be included
   */
  shouldIncludeItem(itemId, filter) {
    if (!filter) return true;
    
    // Skip if collection is disabled
    if (filter.enabled === false) return false;
    
    // Check include patterns
    if (filter.include && filter.include.length > 0) {
      // Default to not included unless matched by an include pattern
      let included = false;
      
      for (const pattern of filter.include) {
        if (this.matchPattern(itemId, pattern)) {
          included = true;
          break;
        }
      }
      
      // If not matched by any include pattern, skip
      if (!included) return false;
    }
    
    // Check exclude patterns
    if (filter.exclude && filter.exclude.length > 0) {
      for (const pattern of filter.exclude) {
        if (this.matchPattern(itemId, pattern)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Check if string matches pattern (with wildcard support)
   * @param {string} str String to check
   * @param {string} pattern Pattern to match against
   * @returns {boolean} Whether string matches pattern
   */
  matchPattern(str, pattern) {
    if (pattern === '*') return true;
    
    // Simple wildcard matching
    if (pattern.includes('*')) {
      // Convert glob pattern to regex
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(str);
    }
    
    return str === pattern;
  }
  
  /**
   * Fetch item from Internet Archive
   * @param {string} spaceId Space ID
   * @param {string} itemId Item ID
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} Item data
   */
  async fetchItem(spaceId, itemId, options = {}) {
    const context = { function: 'fetchItem', spaceId, itemId, ...options };
    this.logger.increment('item_requested_count', 1, context);
    
    try {
      this.logger.info(`Fetching item ${itemId} from space ${spaceId}`, null, context);
      
      // Track API metrics
      const startTime = Date.now();
      this.logger.increment('api_calls_total', 1, context);
      
      // Make API request
      const response = await this.api.getItem(spaceId, itemId);
      
      // Calculate metrics
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // in seconds
      const responseSize = JSON.stringify(response).length;
      
      // Update API metrics
      this.logger.add('api_response_bytesDownloaded', responseSize, context);
      this.logger.add('api_response_time', duration, context);
      
      if (response && response.id) {
        const item = response;
        this.logger.info(`Successfully fetched item: ${item.name} (${item.id})`, null, context);
        
        // Always set the coverImage URL based on item ID
        // This ensures we use the Internet Archive API endpoint rather than files in the item directory
        item.coverImage = `https://archive.org/services/img/${itemId}`;
        
        // Normalize the item data (perform type conversions, calculate favoriteCount)
        const normalizedItem = this.normalizeItemData(item);
        
        // Process cover image
        if (options.processCoverImage !== false) {
          try {
            const coverUrl = normalizedItem.coverImage;
            const filename = path.basename(coverUrl);
            const localPath = path.join(this.tempDir, 'covers', filename);
            
            // Download cover image
            this.logger.info(`Downloading cover image for ${normalizedItem.id}: ${coverUrl}`, null, context);
            await this.downloadFile(coverUrl, localPath, { ...context, type: 'coverImage' });
            
            // Get image dimensions with Sharp
            const imageMetadata = await sharp(localPath).metadata();
            normalizedItem.coverImageWidth = imageMetadata.width;
            normalizedItem.coverImageHeight = imageMetadata.height;
            this.logger.info(`Cover image dimensions: ${normalizedItem.coverImageWidth}x${normalizedItem.coverImageHeight}`, null, context);
          } catch (error) {
            this.logger.error(`Error processing cover image for ${normalizedItem.id}`, error, context);
            this.logger.increment('cover_image_errors', 1, context);
          }
        }
        
        // Save the normalized item to cache here
        // ... (this would be part of the import process)
        
        return normalizedItem;
      } else {
        this.logger.error(`Failed to fetch item ${itemId}: Invalid response`, null, context);
        this.logger.increment('api_errors', 1, context);
        throw new Error(`Invalid item response for ${itemId}`);
      }
    } catch (error) {
      this.logger.error(`Error fetching item ${itemId} from space ${spaceId}`, error, context);
      this.logger.increment('api_errors', 1, context);
      throw error;
    }
  }
  
  /**
   * Import content from sources to cache
   * @param {Object} options Import options
   * @returns {Promise<Object>} Import stats
   */
  async import(options = {}) {
    console.log(`${CLI_FORMATTING.BLUE}${EMOJI.START} Starting content import phase...${CLI_FORMATTING.RESET}`);
    
    try {
      // Load importer configuration
      const importerPath = options.importer || 'ia';
      const importerConfig = await this.loadImporterConfig(importerPath);
      
      // Load exporter configuration to get whitelist
      const exporterPath = options.exporter || 'Unity/CraftSpace';
      const exporterConfig = await this.loadExporterConfig(exporterPath);
      
      // Load whitelist from index-deep.json
      const whitelist = await this.loadWhitelist(exporterConfig);
      
      // Process each collection in the whitelist
      for (const collectionId of whitelist.collectionsIndex) {
        const collectionConfig = whitelist.collections[collectionId];
        
        if (!collectionConfig) {
          this.logger.warn(`Collection ${collectionId} not found in whitelist`, null, { function: 'import', collectionId });
          continue;
        }
        
        this.logger.info(`Processing collection: ${collectionId}`, null, { function: 'import', collectionId });
        
        // Get item whitelist from index
        const itemIds = collectionConfig.itemsIndex || [];
        
        // Create collection directory
        const collectionDir = path.join(this.contentCache, collectionId);
        await fs.ensureDir(collectionDir);
        
        // Create collection.json if it doesn't exist or whitelist has collection data
        const collectionFile = path.join(collectionDir, 'collection.json');
        
        if (!fs.existsSync(collectionFile) || this.force || collectionConfig.collection) {
          await fs.writeJSON(
            collectionFile, 
            collectionConfig.collection || {
              id: collectionId,
              title: collectionId.replace(/-/g, ' '),
              description: '',
              updated: new Date().toISOString()
            },
            { spaces: 2 }
          );
        }
        
        // Process each item in the whitelist
        for (const itemId of itemIds) {
          try {
            // Fetch item from Internet Archive
            await this.fetchItem(collectionId, itemId, importerConfig);
            this.logger.increment('item_processed_count', 1, { function: 'import', collectionId, itemId });
          } catch (error) {
            this.logger.error(`Error processing item ${itemId}`, error, { function: 'import', collectionId, itemId });
            this.logger.increment('error_count', 1, { function: 'import', collectionId, itemId });
          }
        }
        
        this.logger.increment('collection_processed_count', 1, { function: 'import', collectionId });
      }
      
      this.logger.success(`Content import phase completed.`, null, { function: 'import' });
      
      // Get counts from the logger for the final report
      const collectionsProcessed = this.logger.receipt.collection_processed_count || 0;
      const itemsProcessed = this.logger.receipt.item_processed_count || 0;
      const itemsUpdated = this.logger.receipt.item_updated_count || 0;
      const itemsSkipped = this.logger.receipt.item_skipped_count || 0;
      const coversProcessed = this.logger.receipt.cover_processed_count || 0;
      const errorsEncountered = this.logger.receipt.error_count || 0;
      
      console.log('Import statistics:');
      console.log(`Collections processed: ${collectionsProcessed}`);
      console.log(`Items processed: ${itemsProcessed}`);
      console.log(`Items updated: ${itemsUpdated}`);
      console.log(`Items skipped: ${itemsSkipped}`);
      console.log(`Covers processed: ${coversProcessed}`);
      console.log(`Errors encountered: ${errorsEncountered}`);
      
      return {
        status: 'success',
        receipt: this.logger.getReceipt()
      };
    } catch (error) {
      this.logger.error(`Content import phase failed: ${error.message}`, error, { function: 'import' });
      return {
        status: 'error',
        error: error.message,
        receipt: this.logger.getReceipt()
      };
    }
  }
  
  /**
   * Convert type between JavaScript and Unity
   * @param {any} value Value to convert
   * @param {string} type Conversion type
   * @returns {any} Converted value
   */
  convertType(value, type) {
    switch (type) {
      case 'StringOrNullToString':
        return value === null || value === undefined ? '' : String(value);
        
      case 'StringOrArrayOrNullToString':
        if (value === null || value === undefined) return '';
        return Array.isArray(value) ? value.join('\n') : String(value);
        
      case 'StringArrayOrNullToStringArray':
      case 'ArrayOrNullToStringArray':
      case 'StringOrArrayOrNullToStringArray':
        if (value === null || value === undefined) return [];
        return Array.isArray(value) ? value : [String(value)];
        
      case 'NumberOrNullToNumber':
        if (value === null || value === undefined) return 0;
        return typeof value === 'number' ? value : Number(value);
        
      default:
        return value;
    }
  }
  
  /**
   * Normalize item data - performs data transformations, type conversions, and metadata generation
   * @param {Object} item Item data
   * @returns {Object} Normalized item
   */
  normalizeItemData(item) {
    const normalized = { ...item };
    
    // Type conversions for common fields
    normalized.title = this.convertType(normalized.title, 'StringOrNullToString');
    normalized.description = this.convertType(normalized.description, 'StringOrArrayOrNullToString');
    normalized.creator = this.convertType(normalized.creator, 'StringOrArrayOrNullToStringArray');
    normalized.subject = this.convertType(normalized.subject, 'StringArrayOrNullToStringArray');
    
    // Process collection array - extract favorite counts and filter out fav_ prefix entries
    let favoriteCount = 0;
    if (Array.isArray(normalized.collection)) {
      // Get original length
      const originalLength = normalized.collection.length;
      
      // Filter out favorite collections in one pass
      normalized.collection = normalized.collection.filter(col => !col.startsWith('fav-'));
      
      // Calculate favorite count from the difference
      favoriteCount = originalLength - normalized.collection.length;
      
      // Ensure collection is consistent
      normalized.collection = this.convertType(normalized.collection, 'StringArrayOrNullToStringArray');
    } else {
      normalized.collection = this.convertType(normalized.collection, 'StringArrayOrNullToStringArray');
    }
    
    // Add favorite count to metadata
    normalized.favoriteCount = favoriteCount;
    
    return normalized;
  }
  
  /**
   * Export item from cache to Unity
   * @param {string} collectionId Collection ID
   * @param {string} itemId Item ID
   * @param {Object} enhancedIndex Enhanced index to update
   */
  async exportItem(collectionId, itemId, enhancedIndex) {
    const context = { function: 'exportItem', collectionId, itemId };
    const itemCachePath = path.join(this.contentCache, collectionId, 'Items', itemId, 'item.json');
    const coverCachePath = path.join(this.contentCache, collectionId, 'Items', itemId, 'cover.jpg');
    
    // Define Unity item directory path
    const unityItemDir = path.join(this.unityContentDir, 'collections', collectionId, 'items', itemId);
    
    try {
      // Ensure the item directory exists in Unity for cover images
      await fs.ensureDir(unityItemDir);
      
      // Add item to the enhanced index if an item.json exists in cache
      if (fs.existsSync(itemCachePath)) {
        // Read item data from cache - already normalized during import
        const normalizedItem = await fs.readJSON(itemCachePath);
        
        // Add to enhanced index - this is where all metadata lives, not in individual files
        if (enhancedIndex.collections[collectionId]) {
          enhancedIndex.collections[collectionId].items[itemId] = {
            id: itemId,
            name: normalizedItem.title || itemId,
            description: normalizedItem.description || '',
            item: normalizedItem
          };
        }
      } else {
        throw new Error(`Item ${itemId} not found in cache`);
      }
      
      // Always ensure cover image information is included in the enhanced index
      if (enhancedIndex.collections[collectionId]?.items[itemId]) {
        // Source URL from Internet Archive API
        const coverImageUrl = `https://archive.org/services/img/${itemId}`;
        
        // Initialize cover image information
        enhancedIndex.collections[collectionId].items[itemId].coverImage = {
          sourceUrl: coverImageUrl,
          fileName: 'cover.jpg'
        };
        
        // Copy cover image file if it exists locally
        if (fs.existsSync(coverCachePath)) {
          // Copy cover image to Unity
          await fs.copyFile(
            coverCachePath,
            path.join(unityItemDir, 'cover.jpg')
          );
          
          // Get image dimensions and add to enhanced index
          const dimensions = await this.getImageDimensions(coverCachePath);
          if (dimensions) {
            enhancedIndex.collections[collectionId].items[itemId].coverImage.width = dimensions.width;
            enhancedIndex.collections[collectionId].items[itemId].coverImage.height = dimensions.height;
          }
        } else {
          this.logger.debug(`No local cover image found for ${collectionId}/${itemId}, but source URL included in index`, null, context);
        }
      }
    } catch (error) {
      this.logger.error(`Error exporting item ${collectionId}/${itemId}`, error, context);
      this.logger.increment('error_count', 1, context);
    }
  }
  
  /**
   * Export content from cache to Unity
   * @param {Object} options Export options
   * @returns {Promise<Object>} Export stats
   */
  async export(options = {}) {
    console.log(`${CLI_FORMATTING.BLUE}${EMOJI.START} Starting content export phase...${CLI_FORMATTING.RESET}`);
    
    try {
      // Load exporter configuration
      const exporterPath = options.exporter || 'Unity/CraftSpace';
      const exporterConfig = await this.loadExporterConfig(exporterPath);
      
      // Load whitelist
      const whitelist = await this.loadWhitelist(exporterConfig);
      
      // Determine Unity content directory from config
      this.unityContentDir = path.join(
        this.unityDir,
        exporterConfig.outputDir || 'Assets/StreamingAssets/Content'
      );
      
      // Clean Unity content directory if requested
      if (this.clean) {
        this.logger.info(`Cleaning Unity content directory: ${this.unityContentDir}`, null, { function: 'export' });
        await fs.emptyDir(this.unityContentDir);
      }
      
      // Ensure Unity content directory exists
      await fs.ensureDir(this.unityContentDir);
      
      // Create collections-index.json in Unity
      await fs.writeJSON(
        path.join(this.unityContentDir, 'collections-index.json'),
        whitelist.collectionsIndex,
        { spaces: 2 }
      );
      
      // Initialize enhanced index structure
      const enhancedIndex = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        collections: {},
        collectionsIndex: whitelist.collectionsIndex
      };
      
      // Process each collection in the whitelist
      for (const collectionId of whitelist.collectionsIndex) {
        const collectionConfig = whitelist.collections[collectionId];
        const collectionFilter = exporterConfig.collections?.[collectionId];
        
        // Skip disabled collections
        if (collectionFilter && collectionFilter.enabled === false) {
          this.logger.info(`Skipping disabled collection: ${collectionId}`, null, { function: 'export', collectionId });
          continue;
        }
        
        this.logger.info(`Exporting collection: ${collectionId}`, null, { function: 'export', collectionId });
        
        // Create collection directory in Unity for cover images
        const unityCollectionDir = path.join(this.unityContentDir, 'collections', collectionId);
        await fs.ensureDir(unityCollectionDir);
        await fs.ensureDir(path.join(unityCollectionDir, 'items'));
        
        // Read collection.json from cache
        const collectionFile = path.join(this.contentCache, collectionId, 'collection.json');
        
        if (fs.existsSync(collectionFile)) {
          // Read collection data from cache
          const collectionData = await fs.readJSON(collectionFile);
          
          // Add to enhanced index
          enhancedIndex.collections[collectionId] = {
            id: collectionId,
            name: collectionData.title || collectionId,
            description: collectionData.description || '',
            collection: collectionData,
            itemsIndex: collectionConfig.itemsIndex || [],
            items: {}
          };
          
          // Write items-index.json to Unity
          await fs.writeJSON(
            path.join(unityCollectionDir, 'items-index.json'),
            collectionConfig.itemsIndex || [],
            { spaces: 2 }
          );
          
          // Process each item in the collection
          for (const itemId of collectionConfig.itemsIndex || []) {
            // Skip if item should be excluded based on filter
            if (!this.shouldIncludeItem(itemId, collectionFilter)) {
              this.logger.debug(`Skipping item ${itemId} based on filter`, null, { function: 'export', collectionId, itemId });
              continue;
            }
            
            // Export item - adds to enhancedIndex and copies cover images
            await this.exportItem(collectionId, itemId, enhancedIndex);
            this.logger.increment('item_exported_count', 1, { function: 'export', collectionId, itemId });
          }
          
          this.logger.increment('collection_exported_count', 1, { function: 'export', collectionId });
        } else {
          this.logger.warn(`Collection file not found: ${collectionFile}`, null, { function: 'export', collectionId });
        }
      }
      
      // Write enhanced index-deep.json to Unity - this contains all the metadata
      await fs.writeJSON(
        path.join(this.unityContentDir, 'index-deep.json'),
        enhancedIndex,
        { spaces: 2 }
      );
      
      // Also update the cache version of index-deep.json for consistency
      if (exporterConfig._configDir) {
        await fs.writeJSON(
          path.join(exporterConfig._configDir, 'index-deep.json'),
          enhancedIndex,
          { spaces: 2 }
        );
        this.logger.info(`Updated cache copy of index-deep.json in ${exporterConfig._configDir}`, null, { function: 'export' });
      }
      
      // Finalize and write receipt file if receiptFileName is configured
      if (exporterConfig.receiptFileName) {
        // Set end time for export phase
        this.logger.set('perf_exportPhase_endTime', new Date().toISOString());
        
        // Add export metadata
        this.logger.set('export_timestamp', new Date().toISOString());
        this.logger.set('export_version', exporterConfig.version || '1.0');
        this.logger.set('export_name', exporterConfig.name || 'Unknown');
        
        // Get the finalized receipt
        const receipt = this.logger.finalize();
        
        // Write receipt to output directory
        const receiptPath = path.join(this.unityContentDir, exporterConfig.receiptFileName);
        await fs.writeJSON(receiptPath, receipt, { spaces: 2 });
        this.logger.info(`Wrote receipt file to: ${receiptPath}`, null, { function: 'export' });
      }
      
      this.logger.success(`Content export phase completed.`, null, { function: 'export' });
      
      // Get counts from the logger for the final report
      const collectionsExported = this.logger.receipt.collection_exported_count || 0;
      const itemsExported = this.logger.receipt.item_exported_count || 0;
      
      console.log('Export statistics:');
      console.log(`Collections exported: ${collectionsExported}`);
      console.log(`Items exported: ${itemsExported}`);
      
      return {
        status: 'success',
        receipt: this.logger.getReceipt()
      };
    } catch (error) {
      this.logger.error(`Content export phase failed: ${error.message}`, error, { function: 'export' });
      return {
        status: 'error',
        error: error.message,
        receipt: this.logger.getReceipt()
      };
    }
  }
  
  /**
   * Apply refinement passes to cached content
   * @param {Object} options Refinement options
   * @returns {Promise<Object>} Refinement stats
   */
  async refine(options = {}) {
    this.logger.info(`${EMOJI.START} Starting content refinement phase...${CLI_FORMATTING.RESET}`);
    
    // For now, this is a placeholder for future refinement passes:
    // - LLM-generated descriptions
    // - Content validation
    // - Duplicate detection
    // - Scoring and analysis
    
    this.logger.success(`Content refinement phase completed.`);
    
    return {
      status: 'success',
      stats: {
        itemsRefined: 0
      }
    };
  }
  
  /**
   * Run full pipeline (import + refine + export)
   * @param {Object} options Pipeline options
   * @returns {Promise<Object>} Pipeline stats
   */
  async run(options = {}) {
    console.log(`${CLI_FORMATTING.BLUE}${EMOJI.START} Starting content pipeline...${CLI_FORMATTING.RESET}`);
    const startTime = Date.now();
    
    try {
      // Set start time for import phase
      this.logger.set('perf_importPhase_startTime', new Date().toISOString());
      
      // Run import phase
      const importResult = await this.import(options);
      
      // Set end time and duration for import phase
      const importEndTime = Date.now();
      const importDuration = importEndTime - startTime;
      this.logger.set('perf_importPhase_endTime', new Date().toISOString());
      this.logger.set('perf_importPhase_totalTime', importDuration);
      
      if (importResult.status === 'error') {
        return importResult;
      }
      
      // Run refinement phase if requested
      if (options.refine) {
        const refineStartTime = Date.now();
        this.logger.set('perf_refinePhase_startTime', new Date().toISOString());
        
        const refineResult = await this.refine(options);
        
        const refineEndTime = Date.now();
        this.logger.set('perf_refinePhase_endTime', new Date().toISOString());
        this.logger.set('perf_refinePhase_totalTime', refineEndTime - refineStartTime);
        
        if (refineResult.status === 'error') {
          return refineResult;
        }
      }
      
      // Set start time for export phase
      const exportStartTime = Date.now();
      this.logger.set('perf_exportPhase_startTime', new Date().toISOString());
      
      // Run export phase
      const exportResult = await this.export(options);
      
      // Set end time and duration for export phase
      const exportEndTime = Date.now();
      const exportDuration = exportEndTime - exportStartTime;
      this.logger.set('perf_exportPhase_totalTime', exportDuration);
      
      const endTime = Date.now();
      const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
      
      // Update total duration in seconds
      this.logger.set('perf_total_duration', parseFloat(totalDuration));
      
      this.logger.success(`Content pipeline completed in ${totalDuration} seconds`, null, { function: 'run' });
      
      return {
        status: 'success',
        duration: totalDuration,
        receipt: this.logger.getReceipt()
      };
    } catch (error) {
      this.logger.error(`Content pipeline failed: ${error.message}`, error, { function: 'run' });
      return {
        status: 'error',
        error: error.message,
        receipt: this.logger.getReceipt()
      };
    }
  }

  async processImage(imagePath, options = {}, context = {}) {
    context = { function: 'processImage', imagePath, ...context };
    this.logger.increment('images_processed_total', 1, context);
    
    try {
      this.logger.info(`Processing image: ${imagePath}`, null, context);
      const startTime = Date.now();
      
      // Initial stats
      const stats = await fs.stat(imagePath);
      const originalSize = stats.size;
      
      // Get image dimensions using Sharp
      const metadata = await sharp(imagePath).metadata();
      const dimensions = { width: metadata.width, height: metadata.height };
      this.logger.info(`Image dimensions: ${dimensions.width}x${dimensions.height}`, null, context);
      
      // Process the image if needed
      let outputPath = imagePath;
      if (options.resize || options.quality || options.compress || options.convert) {
        const ext = path.extname(imagePath).toLowerCase();
        
        // Determine output format
        let format = ext.replace('.', '');
        if (options.convert) {
          format = options.convert;
          outputPath = imagePath.replace(ext, `.${format}`);
        }
        
        // Create sharp instance and configure
        const sharpImage = sharp(imagePath);
        
        // Apply resize if specified
        if (options.resize) {
          const { width, height, fit = 'inside' } = options.resize;
          sharpImage.resize({ width, height, fit });
        }
        
        // Set quality options
        if (options.quality && ['jpeg', 'jpg', 'webp', 'avif'].includes(format)) {
          const quality = parseInt(options.quality, 10);
          if (format === 'webp') {
            sharpImage.webp({ quality });
          } else if (format === 'avif') {
            sharpImage.avif({ quality });
          } else {
            sharpImage.jpeg({ quality });
          }
        }
        
        // Save the processed image
        await sharpImage.toFile(outputPath);
        
        // Get final dimensions and stats
        const processedStats = await fs.stat(outputPath);
        const processedSize = processedStats.size;
        
        // Calculate and log metrics
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        const compressionRatio = originalSize / processedSize;
        
        this.logger.info(
          `Image processed: ${this.formatBytes(originalSize)} → ${this.formatBytes(processedSize)} ` +
          `(${(compressionRatio).toFixed(2)}x, saved ${this.formatBytes(originalSize - processedSize)}) in ${duration.toFixed(2)}s`,
          null,
          context
        );
        
        // Track metrics
        this.logger.add('images_bytes_original', originalSize, context);
        this.logger.add('images_bytes_processed', processedSize, context);
        this.logger.add('images_bytes_saved', originalSize - processedSize, context);
        this.logger.add('images_processing_time', duration, context);
        
        // Return processed info
        return {
          path: outputPath,
          dimensions,
          originalSize,
          processedSize,
          compressionRatio,
          format
        };
      }
      
      // No processing needed, return original image info
      return {
        path: outputPath,
        dimensions,
        originalSize,
        processedSize: originalSize,
        compressionRatio: 1,
        format: path.extname(imagePath).replace('.', '')
      };
    } catch (error) {
      this.logger.error(`Image processing failed: ${imagePath}`, error, context);
      this.logger.increment('images_processing_errors', 1, context);
      throw error;
    }
  }
}

// Set up the command-line interface
program
  .name('pipeline')
  .description('Content pipeline for Internet Archive to Unity')
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
    .description('Run the full content pipeline (import and export)')
    .option('--importer <path>', 'Path to importer config or directory', 'ia')
    .option('--exporter <path>', 'Path to exporter config or directory', 'Unity/CraftSpace')
    .option('--refine', 'Run refinement process', false)
    .option('--download-name <name>', 'Name of the downloader (for receipt)')
    .option('--download-ip <ip>', 'IP address of the downloader (for receipt)')
    .option('--download-geo <location>', 'Geographic location of the downloader (for receipt)')
    .action(async (options) => {
      const pipeline = new ContentPipeline({
        ...options,
        downloaderInfo: {
          name: options.downloadName,
          ipAddress: options.downloadIp,
          geoLocation: options.downloadGeo
        }
      });
      await pipeline.run({
        importer: options.importer,
        exporter: options.exporter,
        refine: options.refine,
        verbose: options.verbose,
        force: options.force,
        clean: options.clean
      });
    })
);

// Import phase
addCommonOptions(
  program
    .command('import')
    .description('Run only the import phase')
    .option('--importer <path>', 'Path to importer config or directory', 'ia')
    .option('--exporter <path>', 'Path to exporter config or directory', 'Unity/CraftSpace')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.import({
        importer: options.importer,
        exporter: options.exporter,
        verbose: options.verbose,
        force: options.force
      });
    })
);

// Refinement phase
addCommonOptions(
  program
    .command('refine')
    .description('Run only the refinement phase')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.refine({
        verbose: options.verbose,
        force: options.force
      });
    })
);

// Export phase
addCommonOptions(
  program
    .command('export')
    .description('Run only the export phase')
    .option('--exporter <path>', 'Path to exporter config or directory', 'Unity/CraftSpace')
    .action(async (options) => {
      const pipeline = new ContentPipeline(options);
      await pipeline.export({
        exporter: options.exporter,
        verbose: options.verbose,
        force: options.force,
        clean: options.clean
      });
    })
);

// Parse command line arguments
program.parse(); 