#!/usr/bin/env node
/**
 * BackSpace Export Management CLI
 * 
 * This script provides command-line access to the export functionality,
 * allowing collections to be exported to various targets.
 * 
 * Examples:
 * 
 * # Export a collection with all its configured profiles
 * npm run exports:collection -- -c scifi
 * 
 * # Export using a specific profile
 * npm run exports:collection -- -c scifi -p unity-webgl
 * 
 * # List all export profiles
 * npm run exports:profiles
 * 
 * # Create a new export profile
 * npm run exports:create -- -n cdn-highres -t cdn -b "my-bucket" -r "us-east-1"
 */
import { Command } from 'commander';
import { contentManager, exportManager } from '../src/lib/content.ts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { validateOrThrow } from '../src/lib/utils/validators.ts';
import { 
  ExportProfileSchema, 
  UnityExportConfigSchema,
  WebExportConfigSchema,
  CdnExportConfigSchema
} from '../src/lib/schemas/exportProfile.ts';
import {
  NotFoundError,
  ValidationError,
  DuplicateResourceError
} from '../src/lib/errors.ts';
import { createLogger } from '../src/lib/utils/logger.ts';

const logger = createLogger('ManageExports');
const program = new Command();

program
  .name('manage-exports')
  .description('Manage BackSpace exports')
  .version('1.0.0');

// Export a collection
program
  .command('collection')
  .description('Export a collection to one or more targets')
  .requiredOption('-c, --collection <id>', 'Collection ID')
  .option('-p, --profile <name>', 'Specific export profile to use')
  .option('-f, --force', 'Force refresh even if already exported', false)
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const methodName = 'collection';
    logger.info(methodName, '🏁📤📚 Starting collection export', {
      collection: options.collection,
      profile: options.profile,
      force: options.force
    });
    
    try {
      await contentManager.initialize();
      
      console.log(chalk.blue(`🏃📤 Exporting collection ${options.collection}...`));
      
      const specificProfiles = options.profile ? [options.profile] : undefined;
      
      logger.debug(methodName, 'Calling exportManager.exportCollection', {
        collectionId: options.collection,
        forceRefresh: options.force,
        specificProfiles
      });
      
      const result = await exportManager.exportCollection(
        options.collection, 
        {
          forceRefresh: options.force,
          specificProfiles
        }
      );
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.green(`✅📤 Export completed for ${options.collection}`));
      console.log(`📦🔢 Profiles exported: ${result.profilesExported.join(', ') || 'None'}`);
      
      // Show results for each profile
      for (const [profile, exportResult] of Object.entries(result.exportResults)) {
        console.log(`\n🔖📤 Profile: ${chalk.blue(profile)}`);
        if (exportResult.error) {
          console.log(chalk.red(`  ❌📤 Error: ${exportResult.error}`));
        } else {
          console.log(chalk.green(`  ✅📤 Success: ${exportResult.status || 'completed'}`));
          // Show specific details based on export type
          if (exportResult.path) {
            console.log(`  📁📤 Path: ${exportResult.path}`);
          }
          if (exportResult.url) {
            console.log(`  🌐📤 URL: ${exportResult.url}`);
          }
          if (exportResult.itemsExported) {
            console.log(`  🧩🔢 Items exported: ${exportResult.itemsExported}`);
          }
        }
      }
      
      logger.info(methodName, '🏆📤📚 Collection export complete', {
        collection: options.collection,
        profilesCount: result.profilesExported.length
      });
    } catch (error) {
      logger.error(methodName, '❌📤📚 Export failed', {
        collection: options.collection,
        errorMsg: error.message,
        errorName: error.name
      }, error);
      
      console.error(chalk.red(`❌📤📚 Export failed: ${error.message}`));
      
      // Enhanced error display
      if (error.stack && !options.json) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack.split('\n').slice(0, 5).join('\n')));
        console.error(chalk.gray('...'));
      }
      
      process.exit(1);
    }
  });

// List export profiles
program
  .command('profiles')
  .description('List all export profiles')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const methodName = 'profiles';
    logger.info(methodName, '📋 Listing export profiles');
    
    try {
      await contentManager.initialize();
      
      const profiles = await contentManager.profileManager.getExportProfiles();
      
      if (options.json) {
        console.log(JSON.stringify(profiles, null, 2));
        return;
      }
      
      console.log(chalk.blue(`📋 Export Profiles (${profiles.length})`));
      
      if (profiles.length === 0) {
        console.log('😢 No export profiles found');
        return;
      }
      
      profiles.forEach(profile => {
        console.log(`\n${chalk.green(`🔖 ${profile.name}`)} (${profile.id})`);
        console.log(`  🎯 Target: ${profile.config.target}`);
        console.log(`  📝 Description: ${profile.description || 'None'}`);
        
        // Show target-specific config with specific emojis
        switch (profile.config.target) {
          case 'unity':
            console.log(`  🎮 Version: ${profile.config.unityVersion || 'Unknown'}`);
            console.log(`  🖥️ Platform: ${profile.config.targetPlatform || 'Unknown'}`);
            break;
          case 'web':
            console.log(`  🌐 Output: ${profile.config.outputPath || 'Unknown'}`);
            break;
          case 'cdn':
            console.log(`  ☁️ Provider: ${profile.config.provider || 'Unknown'}`);
            console.log(`  🗄️ Bucket: ${profile.config.bucket || 'Unknown'}`);
            break;
          case 'sveltekit':
            console.log(`  📁 Static Dir: ${profile.config.staticDir || 'static'}`);
            break;
          case 'archive':
            console.log(`  📦 Format: ${profile.config.format || 'zip'}`);
            break;
        }
      });
      
      logger.info(methodName, '✅ Profiles listed successfully', {
        count: profiles.length
      });
    } catch (error) {
      logger.error(methodName, '❌ Error listing export profiles', {
        errorMessage: error.message
      }, error);
      console.error(chalk.red(`❌ Error listing export profiles: ${error.message}`));
      process.exit(1);
    }
  });

// Create an export profile
program
  .command('create')
  .description('Create a new export profile')
  .requiredOption('-n, --name <name>', 'Profile name')
  .requiredOption('-t, --target <target>', 'Export target (unity, web, cdn, sveltekit, archive, custom)')
  .option('-d, --description <description>', 'Profile description')
  .option('-o, --output <path>', 'Output path (for web, sveltekit, archive, custom)')
  .option('-b, --bucket <name>', 'S3 bucket name (for cdn target)')
  .option('-r, --region <region>', 'AWS region (for cdn target)')
  .option('-p, --platform <platform>', 'Unity platform (for unity target)')
  .option('-v, --unity-version <version>', 'Unity version (for unity target)')
  .option('-f, --format <format>', 'Archive format (for archive target)')
  .option('-c, --config <json>', 'Additional configuration as JSON')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const methodName = 'create';
    logger.info(methodName, 'Creating export profile', {
      name: options.name,
      target: options.target
    });
    
    try {
      await contentManager.initialize();
      
      // Prepare profile data
      const profileData: any = {
        id: options.name.toLowerCase().replace(/\s+/g, '-'),
        name: options.name,
        description: options.description,
        config: {
          target: options.target
        }
      };
      
      // Add target-specific configuration
      switch (options.target) {
        case 'unity':
          profileData.config.unityVersion = options.unityVersion || '2022.3';
          profileData.config.targetPlatform = options.platform || 'WebGL';
          break;
        case 'web':
          profileData.config.outputPath = options.output;
          profileData.config.optimizeImages = true;
          break;
        case 'cdn':
          profileData.config.provider = 's3';  // Default
          profileData.config.bucket = options.bucket;
          profileData.config.region = options.region;
          break;
        case 'sveltekit':
          profileData.config.outputPath = options.output;
          profileData.config.staticDir = 'static';
          break;
        case 'archive':
          profileData.config.outputPath = options.output;
          profileData.config.format = options.format || 'zip';
          break;
        case 'custom':
          profileData.config.scriptPath = options.output;
          break;
      }
      
      logger.debug(methodName, 'Profile data prepared', {
        id: profileData.id,
        target: profileData.config.target
      });
      
      // Parse additional config if provided
      if (options.config) {
        try {
          const additionalConfig = JSON.parse(options.config);
          profileData.config = {
            ...profileData.config,
            ...additionalConfig
          };
          
          logger.debug(methodName, 'Applied additional config', {
            additionalConfigKeys: Object.keys(additionalConfig)
          });
        } catch (error) {
          logger.error(methodName, 'Invalid configuration JSON', {
            providedConfig: options.config
          }, error);
          
          throw new ValidationError('Invalid configuration JSON', error);
        }
      }
      
      // Validate the profile
      logger.debug(methodName, 'Validating profile data');
      const validProfile = validateOrThrow(ExportProfileSchema, profileData);
      
      // Create the profile
      logger.info(methodName, 'Creating export profile', {
        name: validProfile.name
      });
      
      const profile = await contentManager.profileManager.createExportProfile(validProfile);
      
      if (options.json) {
        console.log(JSON.stringify(profile, null, 2));
        return;
      }
      
      console.log(chalk.green(`Export profile created: ${profile.name} (${profile.id})`));
      console.log(`Target: ${profile.config.target}`);
      console.log(`Description: ${profile.description || 'None'}`);
      
      logger.info(methodName, 'Export profile created successfully', {
        id: profile.id,
        name: profile.name
      });
    } catch (error) {
      logger.error(methodName, 'Error creating export profile', {
        name: options.name,
        target: options.target
      }, error);
      
      console.error(chalk.red('Error creating export profile:'), error);
      process.exit(1);
    }
  });

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the program
program.parse(); 