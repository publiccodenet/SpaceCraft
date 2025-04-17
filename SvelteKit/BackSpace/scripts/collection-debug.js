#!/usr/bin/env node
/**
 * Debug script for collections
 */
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

console.log('Debug script running');
console.log('Command line arguments:', process.argv.slice(2));

// Check content directory
const contentDir = path.resolve('content');
console.log('Content directory path:', contentDir);
console.log('Content directory exists:', fs.existsSync(contentDir));

// List collections directory if it exists
const collectionsDir = path.resolve('content/collections');
if (fs.existsSync(collectionsDir)) {
  console.log('Collections directory exists');
  const files = fs.readdirSync(collectionsDir);
  console.log('Files in collections directory:', files);
} else {
  console.log('Collections directory does not exist');
  // Try to create it
  try {
    fs.mkdirSync(collectionsDir, { recursive: true });
    console.log('Created collections directory');
  } catch (err) {
    console.error('Failed to create collections directory:', err);
  }
}

// Test writing a simple collection file
try {
  const testCollection = {
    id: 'test-debug',
    name: 'Test Debug Collection',
    query: 'test',
    lastUpdated: new Date().toISOString(),
    totalItems: 0,
    sort: 'relevance',
    limit: 100,
    exportProfiles: []
  };
  
  const testDir = path.join(collectionsDir, 'test-debug');
  fs.ensureDirSync(testDir);
  
  fs.writeJsonSync(
    path.join(testDir, 'collection.json'),
    testCollection,
    { spaces: 2 }
  );
  
  console.log('Successfully wrote test collection file');
} catch (err) {
  console.error('Failed to write test collection:', err);
}

console.log('Debug script completed');
