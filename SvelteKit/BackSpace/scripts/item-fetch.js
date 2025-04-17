#!/usr/bin/env node
/**
 * Fetch items for a collection 
 * Uses the correct top-level repository Content directory
 */
import fs from 'fs';
import path from 'path';
import { PATHS } from '../src/lib/constants/index.ts';

console.log('Content directory:', PATHS.CONTENT_DIR);
console.log('Collections directory:', PATHS.COLLECTIONS_DIR);

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node fetch-items.js <collection_id> [limit]');
  process.exit(1);
}

const [collectionId, limitArg] = args;
const limit = limitArg ? parseInt(limitArg, 10) : 10;

const collectionPath = path.join(PATHS.COLLECTIONS_DIR, collectionId, 'collection.json');

// Check if collection exists
if (!fs.existsSync(collectionPath)) {
  console.error(`Collection with ID "${collectionId}" not found!`);
  console.error(`Path checked: ${collectionPath}`);
  process.exit(1);
}

// Rest of the file remains the same... 

async function fetchItem(collectionId, itemId, options = {}) {
  // Function body update
} 