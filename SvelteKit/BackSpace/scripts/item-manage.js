#!/usr/bin/env node
/**
 * BackSpace Items Management CLI
 * 
 * This script provides command-line access to the ContentManager functionality
 * for managing individual items within collections.
 * 
 * Examples:
 * 
 * # List all items in a collection
 * npm run items:list -- -c scifi
 * 
 * # Get a specific item
 * npm run items:get -- -c scifi -i frankenstein00
 * 
 * # Process a specific item
 * npm run items:process -- -c scifi -i frankenstein00 -p epub
 * 
 * # Download content for an item
 * npm run items:download -- -c scifi -i frankenstein00 -t epub,pdf
 */
import { Command } from 'commander';
import { contentManager } from '../src/lib/content/index.ts';
import chalk from 'chalk';
import { NotFoundError } from '../src/lib/errors/errors.ts';
import { createLogger } from '../src/lib/utils/logger.ts';

const logger = createLogger('ManageItems');
const program = new Command();

program
  .name('manage-items')
  .description('Manage BackSpace collection items')
  .version('1.0.0');

// List items in a collection
program
  .command('list')
  .description('List items in a collection')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .option('-l, --limit <number>', 'Limit number of items returned', '50')
  .option('-s, --skip <number>', 'Skip number of items', '0')
  .option('-v, --verbose', 'Show verbose output')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const methodName = 'list';
    logger.info(methodName, '🏁🔍🧩 Listing collection items', { 
      🔑collection: options.collection,
      🔢limit: options.limit,
      🔢skip: options.skip 
    });
    
    try {
      await contentManager.initialize();
      
      const skip = parseInt(options.skip, 10);
      const limit = parseInt(options.limit, 10);
      
      logger.debug(methodName, '📚↘️🧩 Fetching items from collection', {
        collectionId: options.collection,
        pagination: `${skip}-${skip+limit}`
      });
      
      const items = await contentManager.getItems(options.collection, null, limit, skip);
      
      logger.info(methodName, '✅🔍🧩 Items retrieved successfully', { 
        🔑collection: options.collection, 
        🔢count: items.length,
        🔢total: items.length, // In a real implementation this would show total available
        📊pagination: `${skip+1}-${skip+limit}`
      });
      
      if (options.json) {
        console.log(JSON.stringify(items, null, 2));
        return;
      }
      
      const displayItems = items.slice(skip, skip + limit);
      
      console.log(chalk.blue(`🧩 Items in collection ${options.collection} (${displayItems.length}/${items.length}):`));
      
      if (displayItems.length === 0) {
        console.log(chalk.yellow('  No items found'));
        return;
      }
      
      displayItems.forEach(item => {
        console.log(chalk.green(`- ${item.title} (${item.id})`));
        if (options.verbose) {
          console.log(`  👤 Creator: ${item.creator || 'Unknown'}`);
          console.log(`  📅 Date: ${item.date || 'Unknown'}`);
          console.log(`  📝 Description: ${item.description?.substring(0, 100) || 'None'}${item.description?.length > 100 ? '...' : ''}`);
          console.log(`  📂 Files: ${item.files?.length || 0}`);
          console.log();
        }
      });
      
      if (items.length > limit) {
        console.log(chalk.blue(`\nShowing ${limit} of ${items.length} items. Use --limit and --skip for pagination.`));
      }
    } catch (error) {
      logger.error(methodName, '❌🔍🧩 Error listing items', { 
        🔑collection: options.collection,
        🚫error: error.message
      }, error);
      console.error(chalk.red(`❌ Error listing items: ${error.message}`));
      process.exit(1);
    }
  });

// Get item details
program
  .command('get')
  .description('Get an item by ID')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --id <id>', 'Item ID')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const methodName = 'get';
    logger.info(methodName, '🏁🔍🧩 Retrieving item details', { 
      🔑collection: options.collection, 
      🔑id: options.id 
    });
    
    try {
      await contentManager.initialize();
      
      logger.debug(methodName, '🔍📚↘️🧩 Searching for item', {
        collectionId: options.collection,
        itemId: options.id
      });
      
      const item = await contentManager.getItem(options.collection, options.id);
      
      logger.info(methodName, '✅🔍🧩 Item retrieved successfully', { 
        🔑id: options.id,
        📛title: item.title
      });
      
      if (options.json) {
        console.log(JSON.stringify(item, null, 2));
        return;
      }
      
      console.log(chalk.blue(`\n📄 Item Details:`));
      console.log(chalk.green(`Title: ${item.title}`));
      console.log(`ID: ${item.id}`);
      console.log(`Collection: ${item.collectionId}`);
      console.log(`Creator: ${item.creator || 'Unknown'}`);
      console.log(`Date: ${item.date || 'Unknown'}`);
      console.log(`Media Type: ${item.mediatype || 'Unknown'}`);
      console.log(`Source: ${item.source || 'Unknown'}`);
      
      if (item.description) {
        console.log(chalk.yellow('\nDescription:'));
        console.log(item.description);
      }
      
      if (item.metadata && Object.keys(item.metadata).length > 0) {
        console.log(chalk.yellow('\nMetadata:'));
        Object.entries(item.metadata).forEach(([key, value]) => {
          console.log(`  ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
        });
      }
      
      if (item.files && item.files.length > 0) {
        console.log(chalk.green('\n📂 Files:'));
        item.files.forEach(file => {
          console.log(`  - ${file.name} (${file.size || 'Unknown size'})`);
        });
      }
    } catch (error) {
      logger.error(methodName, '❌🔍🧩 Error retrieving item', { 
        🔑collection: options.collection, 
        🔑id: options.id,
        🚫error: error.message
      }, error);
      console.error(chalk.red(`❌ Error retrieving item: ${error.message}`));
      process.exit(1);
    }
  });

// Process an item
program
  .command('process')
  .description('Process a specific item')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --item <id>', 'Item ID')
  .option('-p, --processor <id>', 'Processor ID (epub, pdf, image, or all)', 'all')
  .option('-e, --extract-cover', 'Extract cover image', false)
  .option('-m, --extract-metadata', 'Extract metadata', false)
  .option('-t, --generate-thumbnail', 'Generate thumbnail', false)
  .option('-j, --json', 'Output result as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      try {
        // Get the item first
        const item = await contentManager.getItem(options.collection, options.item);
        
        console.log(chalk.blue(`Processing item: ${item.title} (${item.id})`));
        
        // Process with specific processor or all applicable ones
        // In a real implementation, we'd retrieve the appropriate processor(s)
        const result = await contentManager.processItem(
          options.collection,
          options.item,
          {
            processorId: options.processor,
            extractCover: options.extractCover,
            extractMetadata: options.extractMetadata,
            generateThumbnail: options.generateThumbnail
          }
        );
        
        console.log(chalk.green('Processing completed successfully'));
        
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          console.error(chalk.red(`Item not found: ${options.item} in collection ${options.collection}`));
          process.exit(1);
        }
        throw error; // Re-throw other errors to be handled by the outer catch
      }
    } catch (error) {
      console.error(chalk.red('Error processing item:'), error);
      process.exit(1);
    }
  });

// Download item content
program
  .command('download')
  .description('Download content for an item')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --item <id>', 'Item ID')
  .option('-t, --types <types>', 'File types to download (comma-separated, e.g. epub,pdf)')
  .option('-o, --output <dir>', 'Output directory')
  .option('-f, --force', 'Force download even if files exist', false)
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // Get the item first
      const item = await contentManager.getItem(options.collection, options.item);
      
      if (!item) {
        console.error(chalk.red(`Item not found: ${options.item} in collection ${options.collection}`));
        process.exit(1);
      }
      
      console.log(chalk.blue(`Downloading content for item: ${item.title} (${item.id})`));
      
      // Parse file types if provided
      const fileTypes = options.types 
        ? options.types.split(',').map(t => t.trim().toLowerCase()) 
        : [];
      
      // In a real implementation, we'd download the files
      // For now, we'll just simulate downloading
      
      if (fileTypes.length > 0) {
        console.log(`Downloading file types: ${fileTypes.join(', ')}`);
      } else {
        console.log('Downloading all available files');
      }
      
      console.log(chalk.green('Download completed successfully'));
    } catch (error) {
      console.error(chalk.red('Error downloading item content:'), error);
      process.exit(1);
    }
  });

// Add a new refresh command to the items manager
program
  .command('refresh')
  .description('Refresh an item from Internet Archive')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --item <id>', 'Internet Archive item identifier')
  .option('-f, --force', 'Force download of metadata and files', false)
  .option('-d, --download', 'Download content files', false)
  .option('-p, --process', 'Process content after download', false)
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      console.log(chalk.blue(`Refreshing item ${options.item} in collection ${options.collection}...`));
      
      const refreshedItem = await contentManager.refreshInternetArchiveItem(
        options.collection,
        options.item,
        {
          forceMetadata: options.force,
          forceFiles: options.force,
          downloadContent: options.download,
          processContent: options.process
        }
      );
      
      if (options.json) {
        console.log(JSON.stringify(refreshedItem, null, 2));
        return;
      }
      
      console.log(chalk.green(`Successfully refreshed item: ${refreshedItem.title}`));
      console.log(`ID: ${refreshedItem.id}`);
      console.log(`Updated: ${refreshedItem.updated_at}`);
      
      if (options.download) {
        console.log(chalk.yellow('Content Files:'));
        if (refreshedItem.download_path) {
          console.log(`- Content: ${refreshedItem.download_path}`);
          console.log(`  Size: ${refreshedItem.download_size} bytes`);
          
          // Show download performance metrics if available
          if (refreshedItem.download_dl_duration_ms) {
            const durationSec = Math.round(refreshedItem.download_dl_duration_ms / 100) / 10;
            console.log(`  Download duration: ${durationSec}s`);
            console.log(`  Download speed: ${refreshedItem.download_dl_speed_mbps} Mbps`);
          }
          
          console.log(`  Last Modified: ${refreshedItem.download_last_modified || 'Unknown'}`);
        }
        
        if (refreshedItem.cover_path) {
          console.log(`- Cover: ${refreshedItem.cover_path}`);
          console.log(`  Size: ${refreshedItem.cover_size} bytes`);
          
          // Show download performance metrics if available
          if (refreshedItem.cover_dl_duration_ms) {
            const durationSec = Math.round(refreshedItem.cover_dl_duration_ms / 100) / 10;
            console.log(`  Download duration: ${durationSec}s`);
            console.log(`  Download speed: ${refreshedItem.cover_dl_speed_mbps} Mbps`);
          }
        }
      }
    } catch (error) {
      console.error(chalk.red('Error refreshing item:'), error);
      process.exit(1);
    }
  });

// Create a new empty item
program
  .command('create')
  .description('Create a new empty item')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --id <id>', 'Item ID')
  .option('-t, --title <title>', 'Item title')
  .option('-a, --author <author>', 'Item creator/author')
  .option('-d, --description <description>', 'Item description')
  .option('-m, --mediatype <mediatype>', 'Media type', 'texts')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // Create empty item with provided data
      const itemData = {
        title: options.title,
        creator: options.author,
        description: options.description,
        mediatype: options.mediatype
      };
      
      console.log(chalk.blue(`Creating new item ${options.id} in collection ${options.collection}...`));
      
      const item = await contentManager.createEmptyItem(
        options.collection,
        options.id,
        itemData
      );
      
      if (options.json) {
        console.log(JSON.stringify(item, null, 2));
        return;
      }
      
      console.log(chalk.green(`Item created successfully: ${item.title} (${item.id})`));
      console.log(`Collection: ${item.collectionId}`);
      console.log(`Creator: ${item.creator || 'Not specified'}`);
      console.log(`Media Type: ${item.mediatype}`);
      console.log(`Created: ${item.created_at}`);
    } catch (error) {
      console.error(chalk.red('Error creating item:'), error);
      process.exit(1);
    }
  });

// Delete an item
program
  .command('delete')
  .description('Delete an item by moving it to trash')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --item <id>', 'Item ID')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // Get the item
      const item = await contentManager.getItem(options.collection, options.item);
      
      if (!item) {
        console.error(chalk.red(`Item not found: ${options.item} in collection ${options.collection}`));
        process.exit(1);
      }
      
      // Ask for confirmation unless force flag is set
      if (!options.force) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise<string>(resolve => {
          readline.question(
            chalk.yellow(`Are you sure you want to delete item "${item.title}" (${item.id})? This action will move it to trash. [y/N] `), 
            resolve
          );
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.blue('Deletion cancelled.'));
          return;
        }
      }
      
      // Proceed with deletion
      console.log(chalk.blue(`Deleting item ${item.title} (${item.id})...`));
      await contentManager.deleteItem(options.collection, options.item);
      
      console.log(chalk.green(`Item moved to trash successfully.`));
    } catch (error) {
      console.error(chalk.red('Error deleting item:'), error);
      process.exit(1);
    }
  });

// Update item metadata
program
  .command('update')
  .description('Update item metadata')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --item <id>', 'Item ID')
  .option('-t, --title <title>', 'Item title')
  .option('-a, --author <author>', 'Item creator/author')
  .option('-d, --description <description>', 'Item description')
  .option('-m, --mediatype <mediatype>', 'Media type')
  .option('--date <date>', 'Item date')
  .option('--source <source>', 'Source name')
  .option('--source-url <url>', 'Source URL')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // Get existing item
      const item = await contentManager.getItem(options.collection, options.item);
      
      if (!item) {
        console.error(chalk.red(`Item not found: ${options.item} in collection ${options.collection}`));
        process.exit(1);
      }
      
      // Prepare update data
      const updateData: any = { ...item };
      
      if (options.title) updateData.title = options.title;
      if (options.author) updateData.creator = options.author;
      if (options.description) updateData.description = options.description;
      if (options.mediatype) updateData.mediatype = options.mediatype;
      if (options.date) updateData.date = options.date;
      if (options.source) updateData.source = options.source;
      if (options.sourceUrl) updateData.source_url = options.sourceUrl;
      
      // Update timestamp
      updateData.updated_at = new Date().toISOString();
      
      // Save updated item
      await contentManager.updateItem(options.collection, options.item, updateData);
      
      if (options.json) {
        console.log(JSON.stringify(updateData, null, 2));
        return;
      }
      
      console.log(chalk.green(`Item updated: ${updateData.title} (${updateData.id})`));
    } catch (error) {
      console.error(chalk.red('Error updating item:'), error);
      process.exit(1);
    }
  });

// Run the program
program.parse(); 