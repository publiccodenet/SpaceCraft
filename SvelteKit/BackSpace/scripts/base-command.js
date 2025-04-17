#!/usr/bin/env node
/**
 * Base command class for CLI scripts 🧰
 * 
 * Provides common functionality for all CLI commands including:
 * - Command registration and parsing
 * - Standardized logging with emoji support
 * - Error handling
 * - Common option patterns
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { EMOJI, CLI_FORMATTING } from '../src/lib/constants/index.ts';

export class BaseCommand {
  constructor(name, description) {
    this.commandName = name;
    this.program = new Command();
    
    // Set up base command
    this.program
      .name(name)
      .description(description)
      .version('0.1.0');
      
    // Add common options that apply to all/most commands
    this.program
      .option('-v, --verbose', 'Show verbose output')
      .option('-j, --json', 'Output as JSON');
  }
  
  // Parse command line arguments
  parse() {
    return this.program.parse();
  }
  
  // Logging helpers with emoji support
  log(message, ...args) {
    if (args.length === 0) {
      console.log(message);
    } else {
      console.log(message, ...args);
    }
  }
  
  info(message, ...args) {
    console.log(`${CLI_FORMATTING.BLUE}${EMOJI.INFO} ${message}${CLI_FORMATTING.RESET}`, ...args);
  }
  
  success(message, ...args) {
    console.log(`${CLI_FORMATTING.GREEN}${EMOJI.SUCCESS} ${message}${CLI_FORMATTING.RESET}`, ...args);
  }
  
  warn(message, ...args) {
    console.log(`${CLI_FORMATTING.YELLOW}${EMOJI.WARNING} ${message}${CLI_FORMATTING.RESET}`, ...args);
  }
  
  error(message, ...args) {
    console.error(`${CLI_FORMATTING.RED}${EMOJI.ERROR} ${message}${CLI_FORMATTING.RESET}`, ...args);
  }
  
  debug(message, ...args) {
    // Only show debug in verbose mode
    if (this.program.opts().verbose) {
      console.log(`${CLI_FORMATTING.DIM}${EMOJI.DEBUG} ${message}${CLI_FORMATTING.RESET}`, ...args);
    }
  }
  
  // Create a banner for important messages
  banner(message) {
    const padding = '═'.repeat(Math.max(0, (80 - message.length - 2) / 2));
    console.log(`\n${padding} ${message} ${padding}\n`);
  }
  
  // Show a progress message with status
  progress(current, total, message) {
    const percent = Math.round((current / total) * 100);
    const bar = '▰'.repeat(Math.round(percent / 10)) + '▱'.repeat(10 - Math.round(percent / 10));
    process.stdout.write(`\r${EMOJI.RUNNING} [${bar}] ${percent}% ${message}`);
    if (current === total) {
      process.stdout.write('\n');
    }
  }
  
  // Handle common errors
  handleError(error, exitCode = 1) {
    this.error(`${this.commandName} failed:`, error);
    process.exit(exitCode);
  }
}

/**
 * Create a command factory for a specific entity type
 */
export function createEntityCommandFactory(entityName, validateFn) {
  return {
    createListCommand: (listFn) => {
      return new Command('list')
        .description(`List all ${entityName}s`)
        .option('-j, --json', 'Output as JSON')
        .option('-v, --verbose', 'Show verbose output')
        .action(async (options) => {
          try {
            const items = await listFn();
            
            if (options.json) {
              console.log(JSON.stringify(items));
            } else {
              console.log(chalk.blue(`${entityName}s (${items.length}):`));
              
              if (items.length === 0) {
                console.log(chalk.yellow(`No ${entityName}s found.`));
                return;
              }
              
              for (const item of items) {
                console.log(chalk.green(`- ${item.name || item.id || 'Unnamed'}`));
                
                if (options.verbose) {
                  console.log(JSON.stringify(item, null, 2));
                }
              }
            }
          } catch (error) {
            console.error(chalk.red(`Error listing ${entityName}s:`), error);
            process.exit(1);
          }
        });
    },
    
    createCreateCommand: (createFn) => {
      return new Command('create')
        .description(`Create a new ${entityName}`)
        .action(async (options) => {
          try {
            // Entity-specific data construction
            const data = {};
            
            // Validate with the provided function
            const validationResult = validateFn(data);
            
            if (!validationResult.success) {
              console.error(chalk.red(`Invalid ${entityName} data:`));
              console.error(validationResult.errors);
              process.exit(1);
            }
            
            const result = await createFn(validationResult.data);
            console.log(chalk.green(`${entityName} created successfully`));
          } catch (error) {
            console.error(chalk.red(`Error creating ${entityName}:`), error);
            process.exit(1);
          }
        });
    }
  };
} 