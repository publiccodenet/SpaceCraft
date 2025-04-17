#!/usr/bin/env node
/**
 * Export Zod schemas DIRECTLY to Content/schema at top level of repo
 * 
 * Usage:
 *   npm run schema:export
 */
import fs from 'fs-extra';
import path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { EMOJI, PATHS } from '../src/lib/constants/index.ts';
import { z } from 'zod';

// Import schemas (plain Zod schemas with embedded JSON in description)
import { CollectionSchema } from '../src/lib/schemas/collection.ts';
import { ItemSchema } from '../src/lib/schemas/item.ts';

// --- Configuration ---
// Output directly to the SINGLE SOURCE OF TRUTH: Content/schemas at the top level of the repo
const outputDir = PATHS.CONTENT_SCHEMAS_DIR; 
// const oldIntermediateDir = path.resolve('./schemas'); // Keep for reference if needed temporarily
// const unitySchemasDir = PATHS.UNITY_STREAMING_ASSETS_SCHEMAS_DIR; // Target for a separate copy step

// Add debug output
console.log(`${EMOJI.START} EXPORTING ZOD SCHEMAS DIRECTLY TO SSOT: ${outputDir}`);
// console.log(`Output directory: ${outputDir}`); // Redundant

// Ensure output directory exists
fs.ensureDirSync(outputDir);

// zodToJsonSchema options - Basic conversion
const jsonSchemaOptions = {
  target: 'jsonSchema7',
  $refStrategy: 'none', 
  errorMessages: false
};

// --- Metadata Extraction and Injection from Description --- 

// Function to parse metadata from description and inject into x_meta
const processDescriptionsAndInjectMeta = (schema, schemaName) => {
    if (!schema || !schema.properties) {
        console.warn(`   ${EMOJI.WARNING} Schema [${schemaName}] missing properties, skipping metadata processing.`);
        return;
    }
    
    console.log(`   ${EMOJI.INFO} Processing descriptions for schema [${schemaName}] to extract metadata...`);
    let processedCount = 0;

    for (const propName in schema.properties) {
        const propSchema = schema.properties[propName];

        if (propSchema && typeof propSchema.description === 'string') {
            const description = propSchema.description;
            const descriptionParts = description.split('\n');

            if (descriptionParts.length > 1) {
                const potentialJson = descriptionParts[descriptionParts.length - 1].trim();
                try {
                    const parsedMeta = JSON.parse(potentialJson);
                    // Check if the parsed object is simple and contains our expected key
                    if (typeof parsedMeta === 'object' && parsedMeta !== null && parsedMeta.UnitySchemaConverter) { 
                        // Clean the description (remove the JSON part)
                        propSchema.description = descriptionParts.slice(0, -1).join('\n').trim();
                        // Inject the metadata under x_meta
                        propSchema.x_meta = parsedMeta; 
                        console.log(`     ✅ Injected metadata for [${propName}]:`);
                        console.log(`        Cleaned Desc : ${propSchema.description}`);
                        console.log(`        Metadata Obj : ${JSON.stringify(parsedMeta)}`);
                        processedCount++;
                    }
                    // Silently ignore JSON that doesn't have our converter key
                } catch (e) {
                    // Ignore if parsing fails - it wasn't our metadata JSON
                }
            }
            // Don't check for or warn about other potential metadata formats
        }
    }
    console.log(`   ${EMOJI.SUCCESS} Finished processing descriptions for [${schemaName}]. Injected metadata for ${processedCount} properties.`);
};

// --- Schema Export Process ---

// Define our schemas with proper output names - no mention of Schema suffix
const schemas = [
  { name: 'Collection', zodSchema: CollectionSchema, outputName: 'Collection' },
  { name: 'Item', zodSchema: ItemSchema, outputName: 'Item' }
];

console.log(`Found ${schemas.length} schemas to export`);

// Export each schema
for (const { name, zodSchema, outputName } of schemas) {
  try {
    console.log(`Processing ${name}...`);
    
    // Convert schema to JSON Schema format
    // The description will contain the embedded metadata at this point
    const jsonSchema = zodToJsonSchema(zodSchema, jsonSchemaOptions);
        
    // Process descriptions: extract metadata, update description, inject x_meta
    processDescriptionsAndInjectMeta(jsonSchema, name);

    // Ensure standard JSON Schema properties are present
    jsonSchema.$schema = "http://json-schema.org/draft-07/schema#";
    jsonSchema.title = outputName; // Use the same name for title
    // Use the description that was (potentially) modified by processDescriptionsAndInjectMeta
    jsonSchema.description = jsonSchema.description || `Schema for ${outputName}`; 
    jsonSchema.additionalProperties = zodSchema._def.catchall === undefined || zodSchema._def.catchall instanceof z.ZodNever ? false : true;

    // --- Determine Output Filename --- 
    const outputFilename = `${outputName}.json`;
    const outputFile = path.join(outputDir, outputFilename);
    // --- End Determine Filename ---

    // Write schema to file
    fs.writeFileSync(
      outputFile, 
      JSON.stringify(jsonSchema, null, 2)
    );
    
    console.log(`Exported schema: ${outputName} → ${outputFile}`);
  } catch (error) {
    console.error(`Error exporting schema ${name}:`, error);
  }
}

console.log(`${EMOJI.SUCCESS} SCHEMA EXPORT COMPLETE!`); 