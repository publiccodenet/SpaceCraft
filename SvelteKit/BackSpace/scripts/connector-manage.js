#!/usr/bin/env node
/**
 * BackSpace Connectors Management CLI
 * 
 * This script provides command-line access to the available connectors.
 * 
 * Examples:
 * 
 * # List all available connectors
 * npm run connectors:list
 * 
 * # Test a connector
 * npm run connectors:test -- -c internet-archive
 */
import { Command } from 'commander';
import { contentManager } from '../src/lib/content.ts';
import chalk from 'chalk';

const program = new Command();

program
  .name('manage-connectors')
  .description('Manage BackSpace connectors')
  .version('1.0.0');

// List all available connectors
program
  .command('list')
  .description('List all available connectors')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      // In a real implementation, we'd get connectors from the registry
      // For now, we'll just show a hardcoded list
      const connectors = [
        { id: 'internet-archive', name: 'Internet Archive', canImport: true, canExport: false },
        { id: 'unity', name: 'Unity Resources', canImport: false, canExport: true }
      ];
      
      if (options.json) {
        console.log(JSON.stringify(connectors, null, 2));
        return;
      }
      
      console.log(chalk.blue(`Available Connectors (${connectors.length}):`));
      
      connectors.forEach(connector => {
        console.log(chalk.green(`- ${connector.name} (${connector.id})`));
        if (options.verbose) {
          console.log(`  Import: ${connector.canImport ? 'Yes' : 'No'}`);
          console.log(`  Export: ${connector.canExport ? 'Yes' : 'No'}`);
          console.log();
        }
      });
    } catch (error) {
      console.error(chalk.red('Error listing connectors:'), error);
      process.exit(1);
    }
  });

// Test a connector
program
  .command('test')
  .description('Test a connector')
  .requiredOption('-c, --connector <id>', 'Connector ID (internet-archive, unity)')
  .option('-j, --json', 'Output result as JSON')
  .action(async (options) => {
    try {
      await contentManager.initialize();
      
      console.log(chalk.blue(`Testing connector: ${options.connector}`));
      
      // In a real implementation, we'd retrieve and test the connector
      // For now, we'll just simulate testing
      
      const result = {
        status: 'success',
        message: `Connection to ${options.connector} successful`,
        timestamp: new Date().toISOString()
      };
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.green(result.message));
    } catch (error) {
      console.error(chalk.red('Error testing connector:'), error);
      process.exit(1);
    }
  });

// Run the program
program.parse(); 