#!/usr/bin/env node
/**
 * Initialize the BackSpace content system directory structure
 */
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { PATHS } from '../src/lib/constants/index.ts';

// Use the consistent path from constants
const contentBasePath = PATHS.CONTENT_DIR;

console.log(chalk.blue('Initializing BackSpace content system...'));
console.log(chalk.blue(`Content directory: ${contentBasePath}`));

// Create base directories
const BASE_DIRS = [
  contentBasePath,
  PATHS.COLLECTIONS_DIR,
  path.join(contentBasePath, 'config'),
  PATHS.CACHE_DIR,
  PATHS.EXPORTS_DIR,
  path.join(contentBasePath, 'profiles')
];

// Create base directories
for (const dir of BASE_DIRS) {
  if (!fs.existsSync(dir)) {
    console.log(chalk.yellow(`Creating directory: ${dir}`));
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(chalk.green(`Directory exists: ${dir}`));
  }
}

// Create sample collection
const sampleCollection = {
  id: 'sample',
  name: 'Sample Collection',
  query: 'sample',
  lastUpdated: new Date().toISOString(),
  totalItems: 0,
  sort: 'relevance',
  limit: 100,
  exportProfiles: []
};

const sampleCollectionDir = path.resolve('Content/collections/sample');
fs.ensureDirSync(sampleCollectionDir);

fs.writeJsonSync(
  path.join(sampleCollectionDir, 'collection.json'),
  sampleCollection,
  { spaces: 2 }
);

// Create sample indices
const sampleItemsIndex = ["item1", "item2", "item3"];
fs.writeJsonSync(
  path.join(sampleCollectionDir, 'items-index.json'),
  sampleItemsIndex,
  { spaces: 2 }
);

const collectionsIndex = ["sample"];
fs.writeJsonSync(
  path.resolve('Content/collections-index.json'),
  collectionsIndex,
  { spaces: 2 }
);

// Create basic config
const configFile = path.resolve('Content/config/app.json');
fs.writeJsonSync(configFile, {
  basePath: path.resolve('Content'),
  enableLogging: true,
  logLevel: 'debug',
  initialized: true
}, { spaces: 2 });

console.log(chalk.green('✅ Content system initialized successfully!'));
console.log(chalk.blue('You can now use the content management commands:'));
console.log('  npm run collections:list');
console.log('  npm run collections:create -- --name "My Collection" --id my-collection --query "keyword"');

function createCollectionStructure(collectionId, options = {}) {
  // Function body update
}
