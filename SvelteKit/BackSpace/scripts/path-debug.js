#!/usr/bin/env node
/**
 * Debug script to print all path constants
 */
import { PATHS } from '../src/lib/constants/index.ts';

console.log('=== PATH CONSTANTS ===');
console.log('Root paths:');
console.log('  ROOT_DIR:', PATHS.ROOT_DIR);
console.log('  BACKSPACE_DIR:', PATHS.BACKSPACE_DIR);
console.log('  SRC_DIR:', PATHS.SRC_DIR);
console.log('  LIB_DIR:', PATHS.LIB_DIR);

console.log('\nBackSpace paths:');
console.log('  STATIC_DIR:', PATHS.STATIC_DIR);
console.log('  SCHEMAS_DIR:', PATHS.SCHEMAS_DIR);

console.log('\nContent paths:');
console.log('  CONTENT_DIR:', PATHS.CONTENT_DIR);
console.log('  COLLECTIONS_DIR:', PATHS.COLLECTIONS_DIR);
console.log('  EXPORTS_DIR:', PATHS.EXPORTS_DIR);
console.log('  CACHE_DIR:', PATHS.CACHE_DIR);
console.log('  CONTENT_SCHEMAS_DIR:', PATHS.CONTENT_SCHEMAS_DIR);

console.log('\nUnity paths:');
console.log('  UNITY_DIR:', PATHS.UNITY_DIR);
console.log('  CRAFTSPACE_CONTENT_SCHEMAS_DIR:', PATHS.CRAFTSPACE_CONTENT_SCHEMAS_DIR);
console.log('  CRAFTSPACE_GENERATED_SCHEMAS_DIR:', PATHS.CRAFTSPACE_GENERATED_SCHEMAS_DIR);
console.log('  CRAFTSPACE_SCHEMAS_DIR:', PATHS.CRAFTSPACE_SCHEMAS_DIR); 