#!/usr/bin/env node
/**
 * Process a collection ⚡📚
 * 
 * Downloads metadata and content from Internet Archive based on collection query.
 * 
 * Usage:
 *   npm run collections:process -- <collection-id> [options]
 */
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { 
  COLLECTIONS_PATH, 
  FILE_NAMES, 
  CLI_DEFAULTS,
  EMOJI 
} from '../src/lib/constants/index.ts';
import { NotFoundError, FileSystemError } from '../src/lib/errors/errors.ts';

/**
 * @typedef {Object} ProcessCollectionOptions
 * @property {string} id - Collection ID
 * @property {string} [path] - Path to collection directory
 * @property {boolean} [force] - Force processing even if collection exists
 * @property {number} [limit] - Limit number of items to process
 * @property {boolean} [download] - Download content
 * @property {boolean} [json] - Output as JSON
 * @property {boolean} [verbose] - Show verbose output
 */

class ProcessCollectionCommand extends BaseCommand {
  constructor() {
    super('process-collection', 'Process a collection');
    
    this.program
      .argument('<id>', 'Collection ID to process')
      .option('-p, --path <path>', 'Custom collections path')
      .option('-f, --force', 'Force refresh of all items', CLI_DEFAULTS.FORCE)
      .option('-l, --limit <number>', 'Maximum number of items to process', '100')
      .option('-d, --download', 'Download content files', CLI_DEFAULTS.DOWNLOAD)
      .option('-j, --json', 'Output as JSON', CLI_DEFAULTS.JSON)
      .option('-v, --verbose', 'Show verbose output', CLI_DEFAULTS.VERBOSE)
      .action((id, options) => this.processCollection({
        id,
        path: options.path,
        force: options.force,
        limit: parseInt(options.limit, 10),
        download: options.download,
        json: options.json,
        verbose: options.verbose
      }));
  }
  
  async processCollection(options: ProcessCollectionOptions) {
    try {
      const collectionsPath = options.path || COLLECTIONS_PATH;
      const collectionPath = path.join(collectionsPath, options.id);
      const collectionFile = path.join(collectionPath, FILE_NAMES.COLLECTION);
      
      // Check if collection exists
      if (!fs.existsSync(collectionFile)) {
        throw new NotFoundError(
          `${EMOJI.ERROR} Collection "${options.id}" not found at ${collectionFile}`,
          'collection',
          options.id
        );
      }
      
      this.info(`${EMOJI.START}${EMOJI.PROCESS}${EMOJI.COLLECTION} Processing collection: ${chalk.blue(options.id)}`);
      
      if (options.verbose) {
        console.log(chalk.gray(`${EMOJI.FILE} Path: ${collectionPath}`));
        console.log(chalk.gray(`${EMOJI.DOWNLOAD} Download content: ${options.download ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`${EMOJI.COUNT} Item limit: ${options.limit}`));
      }
      
      // Read the collection
      const collection = await fs.readJSON(collectionFile);
      
      this.info(`${EMOJI.COLLECTION} ${chalk.blue(collection.name)} (${chalk.yellow(collection.id)})`);
      this.info(`${EMOJI.API} Query: ${chalk.yellow(collection.query || 'None')}`);
      
      // Here you would implement the actual query to Internet Archive
      // and process the results. For now, we'll just update the lastUpdated field.
      
      // Simulate processing
      if (!options.json) {
        this.info(`${EMOJI.RUNNING}${EMOJI.PROCESS} Simulating processing (would fetch items in a real implementation)...`);
      }
      
      // Update the collection
      collection.lastUpdated = new Date().toISOString();
      
      // Save the updated collection
      await fs.writeJSON(collectionFile, collection, { spaces: 2 });
      
      if (options.json) {
        console.log(JSON.stringify({
          id: collection.id,
          name: collection.name,
          lastUpdated: collection.lastUpdated,
          itemsProcessed: 0,
          status: 'completed'
        }));
      } else {
        this.success(`${EMOJI.FINISH}${EMOJI.PROCESS}${EMOJI.COLLECTION} Collection processed successfully.`);
        console.log(`${EMOJI.TIME} Last updated: ${chalk.green(collection.lastUpdated)}`);
      }
      
      return collection;
    } catch (error) {
      if (error instanceof NotFoundError) {
        this.error(error.message);
      } else {
        this.error(`${EMOJI.ERROR}${EMOJI.PROCESS}${EMOJI.COLLECTION} Error processing collection:`, error);
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
  const command = new ProcessCollectionCommand();
  command.parse();
} 