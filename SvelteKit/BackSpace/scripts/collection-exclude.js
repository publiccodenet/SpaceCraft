#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateCollectionItems } from '../src/lib/content/validation.js';
import { readCollection, saveCollection } from '../src/lib/content/io.js';
import { COLLECTIONS_PATH, getCollectionPath, FILE_NAMES } from './constants.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExclusionManager {
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('collection-exclude')
      .description('Validate collection items and manage excluded items')
      .version('1.0.0');

    this.program
      .command('check')
      .description('Check a collection for invalid items and update exclusion list')
      .argument('<id>', 'Collection ID')
      .option('-f, --fix', 'Attempt to fix invalid items')
      .action((id, options) => this.validateCollection(id, options));

    this.program
      .command('list')
      .description('Manage excluded items list')
      .argument('<id>', 'Collection ID')
      .action((id) => this.manageExcludedItems(id));

    this.program.parse();
  }

  async validateCollection(collectionId, options) {
    const methodName = 'validateCollection';
    logger.info(methodName, '🏁🔍 Starting collection validation', { 
      collectionId,
      fix: options.fix 
    });
    
    try {
      console.log(chalk.blue(`\n🔍 Validating collection: ${collectionId}`));
      
      const result = await validateCollectionItems(collectionId);
      
      console.log(chalk.green(`\n✅ Validation complete!`));
      console.log(`Total items: ${result.totalItems}`);
      console.log(`Valid items: ${chalk.green(result.validItems)}`);
      console.log(`Invalid items: ${chalk.yellow(result.invalidItems)}`);
      
      if (result.newlyExcluded.length > 0) {
        console.log(chalk.yellow(`\n⚠️ Newly excluded items (${result.newlyExcluded.length}):`));
        result.newlyExcluded.forEach(id => {
          console.log(`  - ${id}`);
        });
      }
      
      if (result.excludedItems.length > 0) {
        console.log(chalk.yellow(`\n🚫 Total excluded items: ${result.excludedItems.length}`));
        
        if (options.fix) {
          // Implement fixExcludedItems logic here
          console.log(chalk.blue('\n🔧 Attempting to fix excluded items...'));
          // Call fixExcludedItems(collectionId, result.excludedItems)
        }
      } else {
        console.log(chalk.green('\n✨ All items passed validation!'));
      }
      
      logger.info(methodName, '✅ Collection validation completed', { 
        collectionId,
        validItems: result.validItems,
        invalidItems: result.invalidItems,
        excludedItems: result.excludedItems.length
      });
    } catch (error) {
      logger.error(methodName, '❌ Collection validation failed', { 
        collectionId,
        error: error.message
      }, error);
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  }

  async manageExcludedItems(collectionId) {
    const methodName = 'manageExcludedItems';
    logger.info(methodName, '🏁 Managing excluded items', { collectionId });
    
    try {
      // Read collection data
      const collectionPath = getCollectionPath(collectionId);
      const collectionFile = path.join(collectionPath, FILE_NAMES.COLLECTION);
      
      if (!fs.existsSync(collectionFile)) {
        logger.error(methodName, '❌ Collection not found', { collectionId });
        console.error(chalk.red(`❌ Collection not found: ${collectionId}`));
        process.exit(1);
      }
      
      const collection = JSON.parse(fs.readFileSync(collectionFile, 'utf8'));
      
      if (!collection.excludedItemIds || collection.excludedItemIds.length === 0) {
        console.log(chalk.green('\n✨ No items are excluded in this collection!'));
        return;
      }
      
      console.log(chalk.yellow(`\n🚫 Excluded items (${collection.excludedItemIds.length}):`));
      collection.excludedItemIds.forEach((itemId, index) => {
        console.log(`  ${index + 1}. ${itemId}`);
      });
      
      // Prompt for action
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'View details of an excluded item', value: 'view' },
          { name: 'Include item (remove from exclusion list)', value: 'include' },
          { name: 'Clear entire exclusion list', value: 'clear' },
          { name: 'Exit', value: 'exit' }
        ]
      }]);
      
      switch (action) {
        case 'view':
          await this.viewExcludedItem(collectionId, collection);
          break;
        case 'include':
          await this.includeItem(collectionId, collection);
          break;
        case 'clear':
          await this.clearExclusionList(collectionId, collection);
          break;
        case 'exit':
          return;
      }
      
      logger.info(methodName, '✅ Exclusion list management completed', { collectionId });
    } catch (error) {
      logger.error(methodName, '❌ Exclusion list management failed', { 
        collectionId,
        error: error.message
      }, error);
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  }
  
  async viewExcludedItem(collectionId, collection) {
    // Prompt for item selection
    const { itemIndex } = await inquirer.prompt([{
      type: 'number',
      name: 'itemIndex',
      message: 'Enter the number of the item to view:',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > collection.excludedItemIds.length) {
          return 'Please enter a valid item number';
        }
        return true;
      }
    }]);
    
    const itemId = collection.excludedItemIds[itemIndex - 1];
    const itemPath = path.join(getCollectionPath(collectionId), 'items', itemId, 'item.json');
    
    try {
      const itemData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
      
      console.log(chalk.blue(`\n📄 Item details for ${itemId}:`));
      console.log('-'.repeat(50));
      console.log(chalk.green('ID:'), itemId);
      console.log(chalk.green('Title:'), itemData.title || '⚠️ Missing');
      console.log(chalk.green('Creator:'), itemData.creator || '⚠️ Missing');
      console.log(chalk.green('Description:'), itemData.description ? 
        (itemData.description.length > 100 ? 
          itemData.description.substring(0, 100) + '...' : 
          itemData.description) : 
        '⚠️ Missing');
      console.log('-'.repeat(50));
      
      console.log(chalk.yellow('\nRaw JSON Data:'));
      console.log(JSON.stringify(itemData, null, 2));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error reading item data: ${error.message}`));
    }
    
    // Prompt for next action
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Return to exclusion list menu', value: 'back' },
        { name: 'Edit this item', value: 'edit' },
        { name: 'Include this item (remove from exclusion list)', value: 'include' }
      ]
    }]);
    
    switch (action) {
      case 'back':
        await this.manageExcludedItems(collectionId);
        break;
      case 'edit':
        await this.editItem(collectionId, collection, itemId);
        break;
      case 'include':
        await this.includeSingleItem(collectionId, collection, itemId);
        break;
    }
  }
  
  async includeItem(collectionId, collection) {
    // Prompt for item selection
    const { itemIndex } = await inquirer.prompt([{
      type: 'number',
      name: 'itemIndex',
      message: 'Enter the number of the item to include (remove from exclusion list):',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > collection.excludedItemIds.length) {
          return 'Please enter a valid item number';
        }
        return true;
      }
    }]);
    
    const itemId = collection.excludedItemIds[itemIndex - 1];
    await this.includeSingleItem(collectionId, collection, itemId);
  }
  
  async includeSingleItem(collectionId, collection, itemId) {
    // Remove item from exclusion list
    collection.excludedItemIds = collection.excludedItemIds.filter(id => id !== itemId);
    
    // Save collection
    const collectionPath = path.join(getCollectionPath(collectionId), FILE_NAMES.COLLECTION);
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    
    console.log(chalk.green(`\n✅ Item ${itemId} removed from exclusion list!`));
    
    // Re-validate collection
    await this.validateCollection(collectionId, { fix: false });
  }
  
  async clearExclusionList(collectionId, collection) {
    // Confirm action
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to clear the entire exclusion list?',
      default: false
    }]);
    
    if (!confirm) {
      await this.manageExcludedItems(collectionId);
      return;
    }
    
    // Clear exclusion list
    collection.excludedItemIds = [];
    
    // Save collection
    const collectionPath = path.join(getCollectionPath(collectionId), FILE_NAMES.COLLECTION);
    fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    
    console.log(chalk.green(`\n✅ Exclusion list cleared!`));
    
    // Re-validate collection
    await this.validateCollection(collectionId, { fix: false });
  }
  
  async editItem(collectionId, collection, itemId) {
    const itemPath = path.join(getCollectionPath(collectionId), 'items', itemId, 'item.json');
    
    try {
      const itemData = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
      
      // Prompt for edits
      const { field } = await inquirer.prompt([{
        type: 'list',
        name: 'field',
        message: 'Which field would you like to edit?',
        choices: [
          { name: 'Title', value: 'title' },
          { name: 'Creator', value: 'creator' },
          { name: 'Description', value: 'description' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }]);
      
      if (field === 'cancel') {
        await this.viewExcludedItem(collectionId, collection);
        return;
      }
      
      const { value } = await inquirer.prompt([{
        type: 'input',
        name: 'value',
        message: `Enter new value for ${field}:`,
        default: itemData[field] || '',
        validate: (input) => {
          if (field === 'title' && !input.trim()) {
            return 'Title cannot be empty';
          }
          return true;
        }
      }]);
      
      // Update the field
      itemData[field] = value;
      
      // Save the changes
      fs.writeFileSync(itemPath, JSON.stringify(itemData, null, 2));
      
      console.log(chalk.green(`\n✅ Item updated successfully!`));
      
      // Re-validate
      await this.validateCollection(collectionId, { fix: false });
      
      // If it's still excluded, show it again
      const updatedCollection = JSON.parse(fs.readFileSync(
        path.join(getCollectionPath(collectionId), FILE_NAMES.COLLECTION), 
        'utf8'
      ));
      
      if (updatedCollection.excludedItemIds && updatedCollection.excludedItemIds.includes(itemId)) {
        await this.viewExcludedItem(collectionId, updatedCollection);
      } else {
        console.log(chalk.green(`\n✅ Item ${itemId} is now valid and no longer excluded!`));
        await this.manageExcludedItems(collectionId);
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error editing item: ${error.message}`));
      await this.manageExcludedItems(collectionId);
    }
  }
}

new ExclusionManager(); 