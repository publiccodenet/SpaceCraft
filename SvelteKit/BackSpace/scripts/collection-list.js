#!/usr/bin/env node
/**
 * Lists all collections in the system 🔍📚
 * 
 * Usage:
 *   npm run collections:list
 */
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { COLLECTIONS_PATH, FILE_NAMES, EMOJI } from '../src/lib/constants/index.ts';
import { NotFoundError, FileSystemError } from '../src/lib/errors/errors.ts';

class ListCollectionsCommand extends BaseCommand {
  constructor() {
    super('list-collections', 'List all collections in the system');
    
    this.program
      .option('-j, --json', 'Output as JSON')
      .option('-v, --verbose', 'Show verbose output')
      .option('--path <path>', 'Custom collections path')
      .action(options => this.listCollections(options));
  }
  
  /**
   * @param {Object} options
   * @param {boolean} [options.json] - Output as JSON
   * @param {boolean} [options.verbose] - Show verbose output
   * @param {string} [options.path] - Custom path
   */
  async listCollections(options) {
    try {
      const collectionsPath = options.path || COLLECTIONS_PATH;
      
      this.info(`${EMOJI.START}${EMOJI.READ}${EMOJI.COLLECTION} Listing collections from: ${chalk.yellow(collectionsPath)}`);
      
      if (!fs.existsSync(collectionsPath)) {
        throw new NotFoundError(
          `${EMOJI.ERROR} Collections directory does not exist.`, 
          'directory', 
          collectionsPath
        );
      }
      
      const collectionDirs = fs.readdirSync(collectionsPath).filter(
        dir => fs.statSync(path.join(collectionsPath, dir)).isDirectory()
      );
      
      if (collectionDirs.length === 0) {
        this.warn(`${EMOJI.WARNING} No collections found.`);
        if (options.json) {
          console.log(JSON.stringify({ collections: [] }));
        }
        return;
      }
      
      const collections = [];
      
      for (const dir of collectionDirs) {
        const collectionFile = path.join(collectionsPath, dir, FILE_NAMES.COLLECTION);
        
        if (fs.existsSync(collectionFile)) {
          try {
            const collection = fs.readJsonSync(collectionFile);
            collections.push(collection);
            
            if (!options.json) {
              this.success(`${EMOJI.SUCCESS} ${collection.name || dir} (${collection.id || dir})`);
              console.log(`  ${EMOJI.API} Query: ${collection.query || 'None'}`);
              console.log(`  ${EMOJI.COUNT} Items: ${collection.totalItems || 0}`);
              console.log(`  ${EMOJI.TIME} Last Updated: ${collection.lastUpdated || 'Never'}`);
              
              if (options.verbose) {
                console.log(`  ${EMOJI.FILE} Path: ${path.join(collectionsPath, dir)}`);
                if (collection.description) {
                  console.log(`  ${EMOJI.INFO} Description: ${collection.description}`);
                }
              }
              
              console.log();
            }
          } catch (error) {
            if (!options.json) {
              this.error(`${EMOJI.ERROR} ${dir} (Error reading collection file)`);
            }
            
            collections.push({
              id: dir,
              name: dir,
              error: 'Error reading collection file'
            });
          }
        } else {
          if (!options.json) {
            this.warn(`${EMOJI.WARNING} ${dir} (No collection.json file)`);
          }
          
          collections.push({
            id: dir,
            name: dir,
            error: 'No collection.json file'
          });
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify({ collections }));
      } else {
        this.success(`${EMOJI.FINISH}${EMOJI.COLLECTION} Found ${collectionDirs.length} collections.`);
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof FileSystemError) {
        this.error(error.message);
      } else {
        this.error(`${EMOJI.ERROR}${EMOJI.COLLECTION} Error listing collections:`, error);
      }
      
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }));
      }
      
      process.exit(1);
    }
  }
}

// Run the command if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = new ListCollectionsCommand();
  command.parse();
} 