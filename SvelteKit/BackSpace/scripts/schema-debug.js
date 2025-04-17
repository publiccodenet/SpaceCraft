#!/usr/bin/env node
/**
 * Debug script to check schemas for errors
 */
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { EMOJI, PATHS } from '../src/lib/constants/index.ts';

// Schemas directory
const schemaDir = PATHS.SCHEMAS_DIR;

console.log(`${EMOJI.DEBUG} CHECKING SCHEMAS FOR ERRORS`);
console.log(`Schema directory: ${schemaDir}`);

// Ensure the schemas directory exists
if (!fs.existsSync(schemaDir)) {
  console.log(`${EMOJI.WARNING} Schemas directory does not exist!`);
  console.log(`Creating directory: ${schemaDir}`);
  fs.ensureDirSync(schemaDir);
}

// Find all JSON schema files
const schemaFiles = glob.sync('*.json', { cwd: schemaDir });

if (schemaFiles.length === 0) {
  console.log(`${EMOJI.WARNING} No schema files found in ${schemaDir}`);
  console.log(`${EMOJI.INFO} Run 'npm run schema:export' to generate schemas`);
} else {
  console.log(`Found ${schemaFiles.length} schema files to check`);
  
  // Check each schema file
  let hasErrors = false;
  
  for (const file of schemaFiles) {
    const filePath = path.join(schemaDir, file);
    console.log(`\nChecking schema: ${file}`);
    
    try {
      const schema = fs.readJsonSync(filePath);
      
      // Basic checks
      if (!schema.properties) {
        console.log(`${EMOJI.ERROR} Schema ${file} is missing properties object`);
        hasErrors = true;
        continue;
      }
      
      // Check for required fields
      if (!schema.required || schema.required.length === 0) {
        console.log(`${EMOJI.WARNING} Schema ${file} has no required fields`);
      }
      
      // Report property count
      const propCount = Object.keys(schema.properties).length;
      console.log(`${EMOJI.INFO} Schema has ${propCount} properties`);
      
      // Check all properties have a type
      const propsWithoutType = Object.entries(schema.properties)
        .filter(([_, prop]) => !prop.type)
        .map(([name]) => name);
      
      if (propsWithoutType.length > 0) {
        console.log(`${EMOJI.WARNING} Properties missing type: ${propsWithoutType.join(', ')}`);
      } else {
        console.log(`${EMOJI.SUCCESS} All properties have type definitions`);
      }
    } catch (error) {
      console.log(`${EMOJI.ERROR} Failed to parse schema ${file}: ${error.message}`);
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    console.log(`\n${EMOJI.ERROR} Schema validation completed with errors`);
  } else {
    console.log(`\n${EMOJI.SUCCESS} Schema validation completed successfully`);
  }
}

// Check other schema locations
console.log('\nChecking other schema locations:');
const contentSchemasDir = PATHS.CONTENT_SCHEMAS_DIR;
const unitySchemasDir = PATHS.CRAFTSPACE_CONTENT_SCHEMAS_DIR;

if (!fs.existsSync(contentSchemasDir)) {
  console.log(`${EMOJI.WARNING} Content schemas directory does not exist: ${contentSchemasDir}`);
  console.log(`${EMOJI.INFO} Run 'npm run schema:copy-to-content' to copy schemas`);
} else {
  const contentSchemaCount = glob.sync('*.json', { cwd: contentSchemasDir }).length;
  console.log(`${EMOJI.INFO} Content schemas directory has ${contentSchemaCount} schemas`);
}

if (!fs.existsSync(unitySchemasDir)) {
  console.log(`${EMOJI.WARNING} Unity schemas directory does not exist: ${unitySchemasDir}`);
  console.log(`${EMOJI.INFO} Run 'npm run schema:copy' to copy schemas to Unity`);
} else {
  const unitySchemasCount = glob.sync('*.json', { cwd: unitySchemasDir }).length;
  console.log(`${EMOJI.INFO} Unity schemas directory has ${unitySchemasCount} schemas`);
} 