#!/usr/bin/env node
/**
 * Create a new item in a collection ✨🧩
 * 
 * Usage:
 *   npm run items:create -- -c scifi -i my-item -t "My Item Title"
 */
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { 
  COLLECTIONS_PATH, 
  FILE_NAMES, 
  EMOJI,
  getCollectionPath,
  getItemPath,
  getItemConfigPath 
} from '../src/lib/constants/index.ts';
import { NotFoundError, FileSystemError } from '../src/lib/errors/errors.ts';

/**
 * @typedef {Object} CreateItemOptions
 * @property {string} collection
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [mediaType]
 * @property {string} [creator]
 * @property {boolean} [force]
 * @property {boolean} [json]
 */

class CreateItemCommand extends BaseCommand {
  constructor() {
    super('create-item', 'Create a new item in a collection');
    
    this.program
      .requiredOption('-c, --collection <id>', 'Collection ID')
      .requiredOption('-i, --id <id>', 'Item ID (used in URLs and file paths)')
      .requiredOption('-t, --title <title>', 'Item title')
      .option('-d, --description <text>', 'Item description')
      .option('-m, --media-type <type>', 'Media type (texts, movies, audio, etc.)')
      .option('--creator <name>', 'Creator/author name')
      .option('-f, --force', 'Overwrite if item exists')
      .option('-j, --json', 'Output as JSON')
      .action((options) => this.createItem(options));
  }
  
  async createItem(options: CreateItemOptions) {
    try {
      const collectionPath = getCollectionPath(options.collection);
      const collectionFile = path.join(collectionPath, FILE_NAMES.COLLECTION);
      
      // Check if collection exists
      if (!fs.existsSync(collectionFile)) {
        throw new NotFoundError(
          `${EMOJI.ERROR} Collection "${options.collection}" not found`,
          'collection',
          options.collection
        );
      }
      
      const itemPath = getItemPath(options.collection, options.id);
      const itemFile = getItemConfigPath(options.collection, options.id);
      
      this.info(`${EMOJI.START}${EMOJI.CREATE}${EMOJI.ITEM} Creating item: ${chalk.blue(options.title)} (${chalk.yellow(options.id)})`);
      
      // Check if item already exists
      const itemExists = fs.existsSync(itemPath);
      const itemFileExists = fs.existsSync(itemFile);
      
      // Case 1: Item directory and file exist - don't modify unless forced
      if (itemExists && itemFileExists && !options.force) {
        this.warn(`${EMOJI.WARNING} Item with ID "${options.id}" already exists at ${itemPath}`);
        this.info(`${EMOJI.INFO} Use --force to overwrite the existing item`);
        
        if (options.json) {
          console.log(JSON.stringify({ 
            id: options.id,
            title: options.title,
            status: 'skipped',
            message: 'Item already exists'
          }));
        }
        
        // Return the existing item data
        return await fs.readJSON(itemFile);
      }
      
      // Case 2: Item directory exists but no config file - create the file
      if (itemExists && !itemFileExists) {
        this.info(`${EMOJI.INFO} Item directory exists but no configuration file found. Creating file.`);
      }
      
      // Case 3: Item doesn't exist at all - create everything
      if (!itemExists) {
        await fs.ensureDir(itemPath);
        this.info(`${EMOJI.CREATE}${EMOJI.FILE} Created item directory`);
      }
      
      // Case 4: Force overwrite of existing item
      if (itemExists && itemFileExists && options.force) {
        this.warn(`${EMOJI.WARNING} Overwriting existing item "${options.id}"`);
      }
      
      // Read collection to increment item count
      const collection = await fs.readJSON(collectionFile);
      
      // Create item data
      const item = {
        id: options.id,
        collectionId: options.collection,
        title: options.title,
        description: options.description || '',
        mediaType: options.mediaType || 'texts',
        creator: options.creator ? [options.creator] : [],
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        files: []
      };
      
      // Write the item file
      await fs.writeJSON(
        itemFile,
        item,
        { spaces: 2 }
      );
      
      // Update collection item count if this is a new item
      if (!itemExists || !itemFileExists) {
        collection.totalItems = (collection.totalItems || 0) + 1;
        collection.lastUpdated = new Date().toISOString();
        await fs.writeJSON(collectionFile, collection, { spaces: 2 });
      }
      
      if (options.json) {
        console.log(JSON.stringify(item));
      } else {
        this.success(`${EMOJI.SUCCESS}${EMOJI.CREATE}${EMOJI.ITEM} Item created successfully:`);
        console.log(`${EMOJI.NAME} Title: ${chalk.green(item.title)}`);
        console.log(`${EMOJI.ID} ID: ${chalk.green(item.id)}`);
        console.log(`${EMOJI.COLLECTION} Collection: ${chalk.blue(collection.name)} (${collection.id})`);
        console.log(`${EMOJI.FILE} Path: ${chalk.yellow(itemPath)}`);
      }
      
      return item;
    } catch (error) {
      this.error(`${EMOJI.ERROR}${EMOJI.CREATE}${EMOJI.ITEM} Error creating item:`, error);
      
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }));
      }
      
      process.exit(1);
    }
  }
}

// Run the command if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = new CreateItemCommand();
  command.parse();
} 