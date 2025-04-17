#!/usr/bin/env node
/**
 * Create a new collection ✨📚
 * 
 * Usage:
 *   npm run collections:create -- my-collection "My Collection" "mediatype:texts AND subject:fiction"
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
import { NotFoundError, FileSystemError } from '../src/lib/errors/errors.ts';

/**
 * @typedef {Object} CreateCollectionOptions
 * @property {string} id - Collection ID
 * @property {string} name - Collection name
 * @property {string} [query] - Collection query
 * @property {string} [description] - Collection description
 * @property {string} [path] - Path to collection directory
 * @property {boolean} [force] - Force creation even if collection exists
 * @property {boolean} [json] - Output as JSON
 */

class CreateCollectionCommand extends BaseCommand {
  constructor() {
    super('create-collection', 'Create a new collection');
    
    this.program
      .argument('<id>', 'Collection ID (used in URLs and file paths)')
      .argument('<name>', 'Collection name (display name)')
      .argument('[query]', 'Internet Archive query', '')
      .option('-d, --description <text>', 'Collection description')
      .option('-p, --path <path>', 'Custom collections path')
      .option('-f, --force', 'Overwrite if collection exists')
      .option('-j, --json', 'Output as JSON')
      .action((id, name, query, options) => this.createCollection({
        id,
        name,
        query,
        description: options.description,
        path: options.path,
        force: options.force,
        json: options.json
      }));
  }
  
  async createCollection(options: CreateCollectionOptions) {
    try {
      const collectionsPath = options.path || COLLECTIONS_PATH;
      const collectionPath = path.join(collectionsPath, options.id);
      const collectionFile = path.join(collectionPath, FILE_NAMES.COLLECTION);
      
      this.info(`${EMOJI.START}${EMOJI.CREATE}${EMOJI.COLLECTION} Creating collection: ${chalk.blue(options.name)} (${chalk.yellow(options.id)})`);
      
      // Make sure collections directory exists
      await fs.ensureDir(collectionsPath);
      
      // Check if collection already exists
      const collectionExists = fs.existsSync(collectionPath);
      const collectionFileExists = fs.existsSync(collectionFile);
      
      // Case 1: Collection directory and file exist - don't modify unless forced
      if (collectionExists && collectionFileExists && !options.force) {
        this.warn(`${EMOJI.WARNING} Collection with ID "${options.id}" already exists at ${collectionPath}`);
        this.info(`${EMOJI.INFO} Use --force to overwrite the existing collection`);
        
        if (options.json) {
          console.log(JSON.stringify({ 
            id: options.id,
            name: options.name,
            status: 'skipped',
            message: 'Collection already exists'
          }));
        }
        
        // Return the existing collection data
        return await fs.readJSON(collectionFile);
      }
      
      // Case 2: Collection directory exists but no config file - create the file
      if (collectionExists && !collectionFileExists) {
        this.info(`${EMOJI.INFO} Collection directory exists but no configuration file found. Creating file.`);
      }
      
      // Case 3: Collection doesn't exist at all - create everything
      if (!collectionExists) {
        await fs.ensureDir(collectionPath);
        this.info(`${EMOJI.CREATE}${EMOJI.FILE} Created collection directory`);
      }
      
      // Case 4: Force overwrite of existing collection
      if (collectionExists && collectionFileExists && options.force) {
        this.warn(`${EMOJI.WARNING} Overwriting existing collection "${options.id}"`);
      }
      
      // Create collection.json
      const collection = {
        id: options.id,
        name: options.name,
        query: options.query || '',
        description: options.description || '',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalItems: 0
      };
      
      // Write the collection file
      await fs.writeJSON(
        collectionFile,
        collection,
        { spaces: 2 }
      );
      
      if (options.json) {
        console.log(JSON.stringify(collection));
      } else {
        this.success(`${EMOJI.SUCCESS}${EMOJI.CREATE}${EMOJI.COLLECTION} Collection created successfully:`);
        console.log(`${EMOJI.NAME} Name: ${chalk.green(collection.name)}`);
        console.log(`${EMOJI.ID} ID: ${chalk.green(collection.id)}`);
        console.log(`${EMOJI.API} Query: ${chalk.blue(collection.query || 'None')}`);
        console.log(`${EMOJI.FILE} Path: ${chalk.yellow(collectionPath)}`);
      }
      
      return collection;
    } catch (error) {
      this.error(`${EMOJI.ERROR}${EMOJI.CREATE}${EMOJI.COLLECTION} Error creating collection:`, error);
      
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }));
      }
      
      process.exit(1);
    }
  }
}

// Run the command if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = new CreateCollectionCommand();
  command.parse();
} 