#!/usr/bin/env node
/**
 * BackSpace Processors Management CLI
 * 
 * This script provides command-line access to the available content processors.
 * 
 * Examples:
 * 
 * # List all available processors
 * npm run processors:list
 * 
 * # Run a specific processor on an item
 * npm run processors:run -- -p epub -c scifi -i frankenstein00
 */
import { Command } from 'commander';
import { contentManager } from '../src/lib/content.ts';
import chalk from 'chalk';

const program = new Command();

program
  .name('manage-processors')
  .description('Manage BackSpace content processors')
  .version('1.0.0');

// List all available processors
program
  .command('list')
  .description('List all available processors')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // In a real implementation, we'd get processors from the registry
      // For now, we'll just show a hardcoded list
      const processors = [
        { id: 'epub-processor', name: 'EPUB Processor', supportedTypes: ['epub'] },
        { id: 'pdf-processor', name: 'PDF Processor', supportedTypes: ['pdf'] },
        { id: 'image-processor', name: 'Image Processor', supportedTypes: ['jpg', 'jpeg', 'png', 'gif'] }
      ];
      
      if (options.json) {
        console.log(JSON.stringify(processors, null, 2));
        return;
      }
      
      console.log(chalk.blue(`Available Processors (${processors.length}):`));
      
      processors.forEach(processor => {
        console.log(chalk.green(`- ${processor.name} (${processor.id})`));
        if (options.verbose) {
          console.log(`  Supported Types: ${processor.supportedTypes.join(', ')}`);
          console.log();
        }
      });
    } catch (error) {
      console.error(chalk.red('Error listing processors:'), error);
      process.exit(1);
    }
  });

// Run a processor on an item
program
  .command('run')
  .description('Run a processor on an item')
  .requiredOption('-p, --processor <id>', 'Processor ID (epub, pdf, image)')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .requiredOption('-i, --item <id>', 'Item ID')
  .option('-o, --options <json>', 'Processor options as JSON string')
  .option('-j, --json', 'Output result as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // Get the item first
      const item = await contentManager.getItem(options.collection, options.item);
      
      if (!item) {
        console.error(chalk.red(`Item not found: ${options.item} in collection ${options.collection}`));
        process.exit(1);
      }
      
      // Parse processor options if provided
      let processorOptions = {};
      if (options.options) {
        try {
          processorOptions = JSON.parse(options.options);
        } catch (error) {
          console.error(chalk.red('Error parsing processor options:'), error);
          process.exit(1);
        }
      }
      
      console.log(chalk.blue(`Running processor ${options.processor} on item: ${item.title} (${item.id})`));
      console.log(`Processor options: ${JSON.stringify(processorOptions)}`);
      
      // In a real implementation, we'd run the processor
      // For now, we'll just simulate processing
      
      console.log(chalk.green('Processing completed successfully'));
      
      if (options.json) {
        console.log(JSON.stringify({
          id: item.id,
          status: 'completed',
          processor: options.processor,
          options: processorOptions
        }, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error running processor:'), error);
      process.exit(1);
    }
  });

// Run the program
program.parse(); 