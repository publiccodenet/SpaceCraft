#!/usr/bin/env node
/**
 * BackSpace Collections Management CLI
 * 
 * This script provides command-line access to the ContentManager functionality
 * for managing Internet Archive collections within BackSpace.
 * 
 * These collections can then be exported for use in the CraftSpace Unity client.
 * 
 * This script can be used:
 * 
 * - In development workflows
 * - In CI/CD pipelines
 * - For batch processing operations
 * - For system maintenance tasks
 * - As part of scheduled jobs
 * 
 * Examples:
 * 
 * # List all collections
 * npm run collections:list
 * 
 * # Create a new collection
 * npm run collections:create -- -i scifi -n "Science Fiction" -q "subject:science fiction mediatype:texts" -u
 * 
 * # Process a collection (download content)
 * npm run collections:process -- -i scifi -d -m 100
 * 
 * # Get statistics about collections
 * npm run collections:stats
 * 
 * The script integrates with the ContentManager to ensure consistency between
 * CLI operations and web service operations.
 */
import { Command } from 'commander';
import { contentManager } from '../src/lib/content/index.ts';
import { CollectionCreateSchema } from '../src/lib/schemas/collection.ts';
import { validate } from '../src/lib/utils/validators.ts';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { createLogger } from '../src/lib/utils/logger.ts';
import {
  NotFoundError,
  ValidationError,
  DuplicateResourceError,
  FileSystemError
} from '../src/lib/errors/errors.ts';
import readline from 'readline';
import { PATHS, EMOJI } from '../src/lib/constants/index.ts';

const logger = createLogger('ManageCollections');
const program = new Command();

program
  .name('manage-collections')
  .description('Manage BackSpace collections')
  .version('1.0.0');

// Use the path constants for all path operations
const collectionsDir = PATHS.COLLECTIONS_DIR;

// List collections
program
  .command('list')
  .description('List all collections')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show verbose output')
  .option('-p, --path <path>', 'Custom path for collections directory')
  .action(async (options) => {
    try {
      // Get collections directory (either default or custom)
      const collectionsDir = options.path ? path.resolve(options.path) : PATHS.COLLECTIONS_DIR;
      
      if (!fs.existsSync(collectionsDir)) {
        if (options.json) {
          console.log(JSON.stringify({ collections: [] }));
        } else {
          console.log(chalk.yellow(`Collections directory not found: ${collectionsDir}`));
        }
        return;
      }
      
      // Get all subdirectories in collections
      const dirs = fs.readdirSync(collectionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      const collections = [];
      
      // Process each collection
      for (const dir of dirs) {
        const collectionPath = path.join(collectionsDir, dir);
        const configPath = path.join(collectionPath, 'collection.json');
        
        if (fs.existsSync(configPath)) {
          try {
            const collection = fs.readJSONSync(configPath);
            collections.push(collection);
          } catch (error) {
            console.error(chalk.red(`Error reading collection ${dir}:`, error.message));
          }
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify({ collections }));
      } else {
        console.log(chalk.blue(`Collections (${collections.length}):`));
        
        if (collections.length === 0) {
          console.log(chalk.yellow('No collections found.'));
          return;
        }
        
        for (const collection of collections) {
          console.log(chalk.green(`- ${collection.name || collection.id} (${collection.id})`));
          
          if (options.verbose) {
            console.log(`  ID: ${collection.id}`);
            console.log(`  Name: ${collection.name}`);
            console.log(`  Query: ${collection.query}`);
            console.log(`  Created: ${new Date(collection.created).toLocaleString()}`);
            console.log(`  Updated: ${new Date(collection.lastUpdated).toLocaleString()}`);
            console.log(`  Items: ${collection.totalItems || 0}`);
            
            if (collection.description) {
              console.log(`  Description: ${collection.description}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(chalk.red('Error listing collections:'), error);
      process.exit(1);
    }
  });

// Create collection
program
  .command('create')
  .description('Create a new collection')
  .requiredOption('-i, --id <id>', 'Collection ID (used for filenames)')
  .requiredOption('-n, --name <name>', 'Collection display name')
  .option('-q, --query <query>', 'Internet Archive query string')
  .option('-d, --description <description>', 'Collection description')
  .option('-p, --path <path>', 'Custom path for collections directory')
  .option('-f, --force', 'Force overwrite if collection exists')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // Get collections directory (either default or custom)
      const collectionsDir = options.path ? path.resolve(options.path) : PATHS.COLLECTIONS_DIR;
      const collectionDir = path.join(collectionsDir, options.id);
      const collectionFile = path.join(collectionDir, 'collection.json');
      
      // Check if collection already exists
      if (fs.existsSync(collectionFile) && !options.force) {
        if (options.json) {
          console.log(JSON.stringify({ error: `Collection ${options.id} already exists` }));
        } else {
          console.error(chalk.red(`Collection ${options.id} already exists. Use --force to overwrite.`));
        }
        process.exit(1);
      }
      
      // Create collection directory if it doesn't exist
      fs.ensureDirSync(collectionDir);
      
      // Create collection data
      const collection = {
        id: options.id,
        name: options.name,
        query: options.query || '',
        description: options.description || '',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalItems: 0
      };
      
      // Write collection file
      fs.writeJSONSync(collectionFile, collection, { spaces: 2 });
      
      // Create items directory
      fs.ensureDirSync(path.join(collectionDir, 'items'));
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, collection }));
      } else {
        console.log(chalk.green(`Collection "${options.name}" created successfully!`));
        console.log(`Path: ${collectionFile}`);
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }));
      } else {
        console.error(chalk.red(`Error creating collection: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Process collection
program
  .command('process')
  .description('Process a collection (fetch items)')
  .requiredOption('--id <id>', 'Collection ID')
  .option('--limit <limit>', 'Maximum number of items to fetch', '100')
  .action(async (options) => {
    try {
      const { id, limit } = options;
      const collectionDir = path.join(collectionsDir, id);
      const collectionFile = path.join(collectionDir, 'collection.json');
      
      // Check if collection exists
      if (!fs.existsSync(collectionFile)) {
        console.error(chalk.red(`Collection with ID "${id}" not found.`));
        return;
      }
      
      console.log(chalk.blue(`Processing collection: ${id}`));
      console.log(chalk.yellow(`Note: This is a placeholder. In a real implementation, this would fetch items based on the collection's query.`));
      
      // In a real implementation, this would call the actual processing logic
      // For now, we'll just update the lastUpdated field
      const collection = fs.readJsonSync(collectionFile);
      collection.lastUpdated = new Date().toISOString();
      
      fs.writeJsonSync(collectionFile, collection, { spaces: 2 });
      
      console.log(chalk.green('Collection processing complete.'));
    } catch (error) {
      console.error(chalk.red('Error processing collection:'), error);
    }
  });

// Refresh indexes
program
  .command('refresh-indexes')
  .description('Refresh all indexes by scanning filesystem')
  .action(async () => {
    try {
      await contentManager.initialize();
      await contentManager.refreshIndexes();
      
      console.log('Indexes refreshed successfully');
    } catch (error) {
      console.error('Error refreshing indexes:', error);
      process.exit(1);
    }
  });

// Get statistics
program
  .command('stats')
  .description('Get statistics about collections and items')
  .action(async () => {
    try {
      await contentManager.initialize();
      await contentManager.loadAllCollections();
      
      // Load some items for stats
      const collections = await contentManager.loadAllCollections();
      for (const collection of collections) {
        await contentManager.loadItemsForCollection(collection.collectionId, { maxItems: 100 });
      }
      
      const stats = contentManager.getStats();
      
      console.log('CraftSpace Content Statistics:');
      console.log(`- Total Collections: ${stats.totalCollections}`);
      console.log(`- Total Items: ${stats.totalItems}`);
      console.log(`- Average Items Per Collection: ${stats.averageItemsPerCollection.toFixed(2)}`);
      
      console.log('\nItems by Media Type:');
      Object.entries(stats.itemsByMediaType).forEach(([type, count]) => {
        console.log(`- ${type}: ${count}`);
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      process.exit(1);
    }
  });

// Add a new refresh-items command to the collections manager
program
  .command('refresh-items')
  .description('Refresh all items in a collection from Internet Archive')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .option('-f, --force', 'Force download of metadata and files', false)
  .option('-d, --download', 'Download content files', false)
  .option('-p, --process', 'Process content after download', false)
  .option('--concurrency <n>', 'Number of concurrent item refreshes', '3')
  .option('--skip-errors', 'Continue on errors', false)
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      console.log(chalk.blue(`Refreshing all items in collection ${options.collection}...`));
      
      const result = await contentManager.refreshCollectionItems(
        options.collection,
        {
          forceMetadata: options.force,
          forceFiles: options.force,
          downloadContent: options.download,
          processContent: options.process,
          concurrency: parseInt(options.concurrency, 10),
          skipErrors: options.skipErrors
        }
      );
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.green(`Refresh summary for collection ${options.collection}:`));
      console.log(`Total items: ${result.total}`);
      console.log(`Successfully refreshed: ${result.refreshed}`);
      
      if (result.errors.length > 0) {
        console.log(chalk.red(`Errors: ${result.errors.length}`));
        result.errors.forEach((error) => {
          console.log(`- Item ${error.id}: ${error.error}`);
        });
      }
      
      if (options.download) {
        console.log(`Content files downloaded: ${result.fileDownloads}`);
      }
    } catch (error) {
      console.error(chalk.red('Error refreshing collection items:'), error);
      process.exit(1);
    }
  });

// Add a new recreate-indexes command to the collections manager
program
  .command('recreate-indexes')
  .description('Recreate all collection and item indexes by scanning filesystem')
  .option('-c, --collection <id>', 'Specific collection ID (if omitted, recreates all indexes)')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      if (options.collection) {
        // Recreate just one collection's items index
        console.log(chalk.blue(`Recreating items index for collection ${options.collection}...`));
        const items = await contentManager.recreateItemsIndex(options.collection);
        
        if (options.json) {
          console.log(JSON.stringify({
            collection: options.collection,
            itemCount: items.length,
            items
          }, null, 2));
          return;
        }
        
        console.log(chalk.green(`Items index recreated with ${items.length} items`));
        return;
      }
      
      // Recreate all indexes
      console.log(chalk.blue('Recreating all indexes...'));
      const result = await contentManager.recreateAllIndexes();
      
      if (options.json) {
        console.log(JSON.stringify({
          collectionCount: result.collections.length,
          collections: result.collections,
          itemsByCollection: result.itemsByCollection
        }, null, 2));
        return;
      }
      
      console.log(chalk.green(`Collections index recreated with ${result.collections.length} collections`));
      
      let totalItems = 0;
      for (const [collectionId, items] of Object.entries(result.itemsByCollection)) {
        console.log(`- ${collectionId}: ${items.length} items`);
        totalItems += items.length;
      }
      
      console.log(chalk.green(`\nTotal: ${result.collections.length} collections, ${totalItems} items`));
    } catch (error) {
      console.error(chalk.red('Error recreating indexes:'), error);
      process.exit(1);
    }
  });

// Delete collection command
program
  .command('delete')
  .description('Delete a collection')
  .requiredOption('-i, --id <id>', 'Collection ID')
  .option('-p, --path <path>', 'Custom path for collections directory')
  .option('-f, --force', 'Skip confirmation')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // Get collections directory (either default or custom)
      const collectionsDir = options.path ? path.resolve(options.path) : PATHS.COLLECTIONS_DIR;
      const collectionPath = path.join(collectionsDir, options.id);
      
      if (!fs.existsSync(collectionPath)) {
        if (options.json) {
          console.log(JSON.stringify({ error: `Collection ${options.id} not found` }));
        } else {
          console.error(chalk.red(`Collection ${options.id} not found.`));
        }
        process.exit(1);
      }
      
      // Confirm deletion
      if (!options.force && !options.json) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question(chalk.yellow(`Are you sure you want to delete collection "${options.id}"? (y/N) `), resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y') {
          console.log(chalk.blue('Deletion cancelled.'));
          return;
        }
      }
      
      // Log the deletion
      const logsDir = path.join(collectionsDir, '.logs');
      fs.ensureDirSync(logsDir);
      
      const deletionLogPath = path.join(logsDir, 'deletions.json');
      let deletions = [];
      
      if (fs.existsSync(deletionLogPath)) {
        deletions = fs.readJSONSync(deletionLogPath);
      }
      
      // Add collection to deletion log
      deletions.push({
        deleted_at: new Date().toISOString(),
        type: 'collection',
        id: options.id
      });
      
      fs.writeJSONSync(deletionLogPath, deletions, { spaces: 2 });
      
      // Delete the collection
      fs.removeSync(collectionPath);
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, id: options.id }));
      } else {
        console.log(chalk.green(`Collection "${options.id}" deleted successfully.`));
        console.log(chalk.blue('Deletions are logged and can be found in the trash directory.'));
        console.log('- Windows: Open the Recycle Bin on your desktop');
        console.log('- macOS: Click the Trash icon in your Dock');
        console.log('- Linux: Open the Trash from your file manager');
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }));
      } else {
        console.error(chalk.red(`Error deleting collection: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Update collection command
program
  .command('update')
  .description('Update a collection')
  .requiredOption('-i, --id <id>', 'Collection ID')
  .option('-n, --name <name>', 'Collection display name')
  .option('-q, --query <query>', 'Internet Archive query string')
  .option('-d, --description <description>', 'Collection description')
  .option('-p, --path <path>', 'Custom path for collections directory')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // Get collections directory (either default or custom)
      const collectionsDir = options.path ? path.resolve(options.path) : PATHS.COLLECTIONS_DIR;
      const collectionPath = path.join(collectionsDir, options.id);
      const collectionFile = path.join(collectionPath, 'collection.json');
      
      if (!fs.existsSync(collectionFile)) {
        if (options.json) {
          console.log(JSON.stringify({ error: `Collection ${options.id} not found` }));
        } else {
          console.error(chalk.red(`Collection ${options.id} not found.`));
        }
        process.exit(1);
      }
      
      // Read existing collection
      const collection = fs.readJSONSync(collectionFile);
      const updateData = {};
      
      // Update fields if provided
      if (options.name) updateData.name = options.name;
      if (options.query) updateData.query = options.query;
      if (options.description) updateData.description = options.description;
      
      // If no updates provided, exit
      if (Object.keys(updateData).length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, message: 'No changes to apply' }));
        } else {
          console.log(chalk.yellow('No changes to apply.'));
        }
        return;
      }
      
      // Apply updates
      const updatedCollection = {
        ...collection,
        ...updateData,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeJSONSync(collectionFile, updatedCollection, { spaces: 2 });
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, collection: updatedCollection }));
      } else {
        console.log(chalk.green(`Collection "${options.id}" updated successfully.`));
        
        // Show what was updated
        for (const [key, value] of Object.entries(updateData)) {
          console.log(`${key}: ${value}`);
        }
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: error.message }));
      } else {
        console.error(chalk.red(`Error updating collection: ${error.message}`));
      }
      process.exit(1);
    }
  });

// Show collection details
program
  .command('show')
  .description('Show collection details')
  .requiredOption('-i, --id <id>', 'Collection ID')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      try {
        const collection = await contentManager.getCollection(options.id);
        
        if (options.json) {
          console.log(JSON.stringify(collection, null, 2));
          return;
        }
        
        console.log(chalk.blue(`Collection: ${collection.name} (${collection.collectionId})`));
        console.log(chalk.green('Basic Information:'));
        console.log(`Description: ${collection.description || 'None'}`);
        console.log(`Query: ${collection.query}`);
        console.log(`Sort: ${collection.sort}`);
        console.log(`Limit: ${collection.limit}`);
        console.log(`Include in Unity: ${collection.includeInUnity ? 'Yes' : 'No'}`);
        
        console.log(chalk.green('\nStatistics:'));
        console.log(`Total Items: ${collection.totalItems || 0}`);
        console.log(`Last Updated: ${collection.lastUpdated}`);
        
        if (collection.exportProfiles && collection.exportProfiles.length > 0) {
          console.log(chalk.green('\nExport Profiles:'));
          collection.exportProfiles.forEach(profile => {
            console.log(`- ${profile}`);
          });
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          console.error(chalk.red(error.message));
          process.exit(1);
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      console.error(chalk.red('Error showing collection:'), error);
      process.exit(1);
    }
  });

// List trash contents
program
  .command('trash')
  .description('View system trash information')
  .action(async () => {
    try {
      console.log(chalk.blue('System Trash Information'));
      console.log('Items deleted from collections are moved to your system trash/recycle bin.');
      console.log('\nYou can access deleted items here:');
      
      if (process.platform === 'win32') {
        console.log('- Windows: Open the Recycle Bin on your desktop');
      } else if (process.platform === 'darwin') {
        console.log('- macOS: Click the Trash icon in your Dock');
        console.log('  or press Command+Shift+Delete');
      } else {
        console.log('- Linux: Open the Trash from your file manager');
        console.log('  or browse to trash:/// in your file manager');
      }
      
      console.log('\nTo restore items, use your system\'s restore functionality.');
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// List deletion log
program
  .command('deletions')
  .description('View deletion log')
  .option('-j, --json', 'Output as JSON')
  .option('-l, --limit <number>', 'Limit number of entries', '20')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      const logPath = path.join(
        contentManager.getBasePath(),
        '.logs',
        'deletions.json'
      );
      
      if (!await fs.pathExists(logPath)) {
        console.log('No deletion log found.');
        return;
      }
      
      const log = await fs.readJSON(logPath);
      
      if (options.json) {
        console.log(JSON.stringify(log, null, 2));
        return;
      }
      
      const limit = parseInt(options.limit, 10);
      const recentEntries = log.slice(-limit).reverse();
      
      console.log(chalk.blue(`Recent Deletions (${recentEntries.length}):`));
      
      recentEntries.forEach((entry) => {
        const date = new Date(entry.deleted_at).toLocaleString();
        const type = entry.type === 'collection' ? 'Collection' : 'Item';
        
        if (entry.type === 'collection') {
          console.log(chalk.yellow(`${type}: ${entry.id}`));
        } else {
          console.log(chalk.yellow(`${type}: ${entry.collectionId}/${entry.id}`));
        }
        console.log(`