#!/usr/bin/env node
/**
 * Display information about content collections 📚📊
 */
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { 
  COLLECTIONS_PATH, 
  FILE_NAMES, 
  EMOJI 
} from '../src/lib/constants/index.ts';

class ContentInfoCommand extends BaseCommand {
  constructor() {
    super('content-info', 'Display information about content collections');
    
    this.program
      .option('-j, --json', 'Output as JSON')
      .option('-v, --verbose', 'Show verbose output')
      .option('--path <path>', 'Custom collections path')
      .action(options => this.showContentInfo(options));
  }
  
  /**
   * @param {Object} options
   * @param {boolean} [options.json] - Output as JSON
   * @param {boolean} [options.verbose] - Show verbose output
   * @param {string} [options.path] - Custom path
   */
  async showContentInfo(options) {
    try {
      const collectionsPath = options.path || COLLECTIONS_PATH;
      
      this.banner(`${EMOJI.DATABASE} CONTENT SYSTEM INFO ${EMOJI.INFO}`);
      this.info(`${EMOJI.FILE} Content directory: ${chalk.yellow(collectionsPath)}`);
      
      // Check if collections directory exists
      if (!fs.existsSync(collectionsPath)) {
        this.warn(`${EMOJI.WARNING} Collections directory does not exist!`);
        this.info(`${EMOJI.INFO} You may need to run: npm run content:init`);
        return;
      }
      
      // Get all collections
      const collectionDirs = fs.readdirSync(collectionsPath)
        .filter(dir => fs.statSync(path.join(collectionsPath, dir)).isDirectory());
      
      // Stats
      let totalCollections = 0;
      let totalItems = 0;
      let totalSize = 0;
      
      const collections = [];
      
      // Process each collection
      for (const dir of collectionDirs) {
        const collectionPath = path.join(collectionsPath, dir);
        const configFile = path.join(collectionPath, FILE_NAMES.COLLECTION);
        
        if (fs.existsSync(configFile)) {
          try {
            const collection = await fs.readJSON(configFile);
            totalCollections++;
            
            // Count items
            const itemsPath = path.join(collectionPath, 'items');
            let itemCount = 0;
            if (fs.existsSync(itemsPath)) {
              const itemDirs = fs.readdirSync(itemsPath)
                .filter(idir => fs.statSync(path.join(itemsPath, idir)).isDirectory());
              itemCount = itemDirs.length;
              totalItems += itemCount;
            }
            
            // Calculate size
            const stats = await this.getDirStats(collectionPath);
            totalSize += stats.size;
            
            if (!options.json) {
              this.success(`${EMOJI.COLLECTION} ${collection.name || dir} (${collection.id || dir})`);
              console.log(`  ${EMOJI.COUNT} Items: ${chalk.cyan(itemCount.toString())}`);
              console.log(`  ${EMOJI.SIZE} Size: ${chalk.cyan(this.formatBytes(stats.size))}`);
              console.log(`  ${EMOJI.TIME} Last Updated: ${chalk.cyan(collection.lastUpdated || 'Never')}`);
              console.log();
            }
            
            collections.push({
              id: collection.id || dir,
              name: collection.name || dir,
              items: itemCount,
              size: stats.size,
              lastUpdated: collection.lastUpdated
            });
          } catch (error) {
            this.error(`${EMOJI.ERROR} Error reading collection ${dir}: ${error.message}`);
          }
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify({
          collections,
          stats: {
            totalCollections,
            totalItems,
            totalSize
          }
        }, null, 2));
      } else {
        this.banner(`${EMOJI.DATABASE} SUMMARY ${EMOJI.INFO}`);
        console.log(`${EMOJI.COLLECTION} Collections: ${chalk.green(totalCollections.toString())}`);
        console.log(`${EMOJI.ITEM} Total Items: ${chalk.green(totalItems.toString())}`);
        console.log(`${EMOJI.SIZE} Total Size: ${chalk.green(this.formatBytes(totalSize))}`);
      }
    } catch (error) {
      this.error(`${EMOJI.ERROR} Error getting content info: ${error.message}`);
      process.exit(1);
    }
  }
  
  private async getDirStats(directory: string): Promise<{ size: number; files: number }> {
    let size = 0;
    let files = 0;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        const subDirStats = await this.getDirStats(itemPath);
        size += subDirStats.size;
        files += subDirStats.files;
      } else {
        size += stats.size;
        files++;
      }
    }
    
    return { size, files };
  }
  
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// Run the command if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = new ContentInfoCommand();
  command.parse();
} 