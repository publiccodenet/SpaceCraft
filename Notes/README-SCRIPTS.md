# SpaceCraft Scripts

This document provides an overview of our approach to command-line scripts in the SpaceCraft project, including conventions, architecture decisions, and usage patterns.

## Script Philosophy

Our CLI scripts follow these core principles:

1. **JavaScript First**: Scripts are written in JavaScript but executed with tsx
2. **Consistent Naming**: Singular-noun-first convention (e.g., `schemas-export.js`, not `export-schemas.js`)
3. **Direct Imports**: Scripts import TypeScript code directly using tsx
4. **Explicit Paths**: Constants define all project paths centrally
5. **Standalone Operation**: Each script can run independently
6. **Consistent Commands**: npm script names match file names (e.g., `npm run schemas:export` runs `schemas-export.js`)

## Script Architecture

### Project Structure

```
SvelteKit/BackSpace/
├── scripts/
│   ├── base-command.js         # Base class for all CLI commands
│   ├── collection-*.js         # Collection management scripts
│   ├── item-*.js               # Item management scripts
│   ├── schemas-*.js            # Schema management scripts
│   ├── content-*.js            # Content system scripts
│   └── unity-*.js              # Unity integration scripts
└── src/
    └── lib/
        ├── constants/          # Shared constants including paths
        ├── schemas/            # Zod schemas (TypeScript)
        └── ...
```

### Naming Convention: Bigendian Style

We use a "bigendian" naming style, meaning:

- Noun first, then verb (`item-fetch.js` not `fetch-item.js`)
- This ensures all scripts with the same noun are grouped together in file listings
- Always use singular nouns for consistency (`collection-list.js`, not `collections-list.js`)
- Hyphen-separated instead of camelCase for file names
- Corresponding npm scripts use colon syntax: `npm run item:fetch`

Examples:
- 🔑 `schemas-export.js` → `npm run schemas:export`
- 🔑 `item-fetch.js` → `npm run item:fetch`
- 🔑 `collection-list.js` → `npm run collection:list`

### Script Categories

Our scripts are organized into functional categories:

1. **Schema Management**
   - `schemas-export.js`: Export Zod schemas to JSON Schema format
   - `schemas-copy.js`: Copy schema files to Unity project

2. **Collection Management**
   - `collection-create.js`: Create new collections
   - `collection-list.js`: List available collections
   - `collection-process.js`: Process collections with Internet Archive data

3. **Item Management**
   - `item-create.js`: Create new items
   - `item-fetch.js`: Fetch items from Internet Archive
   - `item-manage.js`: Manage existing items

4. **Unity Integration**
   - `unity-install.js`: Install Unity WebGL build to static directory

5. **System Management**
   - `content-init.js`: Initialize content system
   - `content-info.js`: Display content system information

## Common Command Line Arguments

All scripts support a consistent set of command line options:

| Option | Description | Present in |
|--------|-------------|------------|
| `-v, --verbose` | Show verbose output | All scripts |
| `-j, --json` | Output as JSON | All scripts |
| `-f, --force` | Force operation (overwrite) | Create/update scripts |
| `--path <dir>` | Custom directory path | File operations |
| `-c, --concurrency <num>` | Number of concurrent operations | Batch processing |
| `--download` | Download content | Content scripts |
| `--process` | Process content | Collection/item scripts |

Examples:
```
# List collections with verbose output
npm run collection:list -- --verbose

# Export schemas and output as JSON
npm run schemas:export -- --json

# Create item with force overwrite
npm run item:create -- --force
```

## Importing TypeScript from JavaScript

Our scripts import TypeScript code directly without a build step, using Node.js with loaders.

### Why this approach?

We evaluated several approaches:

1. **TypeScript Scripts with tsx**: Initially tested but had issues with path resolution.
2. **TypeScript with ts-node**: Had compatibility issues with ESM imports.
3. **Pre-build TypeScript to JavaScript**: Added complexity with build steps.
4. **JavaScript executed with tsx**: Simplest solution with highest developer experience.

We chose JavaScript scripts executed with tsx because:
- **Simplicity**: No build step needed
- **Developer Experience**: Direct imports from source for easy debugging
- **Consistency**: All scripts follow the same pattern
- **Maintenance**: Easier to maintain without TypeScript overhead in scripts

## Path Constants

All file paths are defined in `src/lib/constants/paths.ts`:

```
// src/lib/constants/paths.ts
export const PATHS = {
  // Root paths (only REPO_ROOT should have ROOT in the name)
  REPO_ROOT,
  SVELTEKIT_DIR,
  UNITY_DIR,
  CONTENT_DIR,
  
  // Unity paths
  SPACECRAFT_DIR,
  SPACECRAFT_SCHEMAS_DIR,
  SPACECRAFT_RESOURCES_DIR,
  SPACECRAFT_SCRIPTS_DIR,
  SPACECRAFT_EDITOR_DIR,
  SPACECRAFT_CONTENT_DIR,
  SPACECRAFT_COLLECTIONS_DIR,
  SPACECRAFT_CONTENT_SCHEMAS_DIR,
  SPACECRAFT_GENERATED_SCHEMAS_DIR,
  BUILD_DIR,
  STATIC_DIR,
  THUMBNAILS_DIR,
};
```

Scripts import these constants to ensure path consistency:

```
// In any script
import { PATHS } from '../src/lib/constants/index.ts';

const schemasDir = PATHS.SPACECRAFT_SCHEMAS_DIR;
```

## Running Scripts

Scripts are run via npm:

```
# Schema management
npm run schemas:export       # Export schemas to JSON format
npm run schemas:copy         # Copy schemas to Unity
npm run schemas:update-all   # Run export and copy in sequence

# Collection management
npm run collection:list     # List all collections
npm run collection:create   # Create a new collection

# Item management
npm run item:fetch          # Fetch items from Internet Archive
npm run item:create         # Create a new item manually
```

### npm Script Naming Convention

npm script names follow this pattern:
- `noun:verb` format (e.g., `schemas:export`)
- Singular nouns, not plural (e.g., `item:fetch`, not `items:fetch`)
- Commands match file names consistently (e.g., `schemas:export` → `schemas-export.js`)

## BaseCommand Framework

Most scripts extend the `BaseCommand` class which provides:

```
// Example script using BaseCommand
import { BaseCommand } from './base-command.js';

class MyCommand extends BaseCommand {
  constructor() {
    super('my-command', 'Description of command');
    
    // Set up command options
    this.program
      .option('-o, --option', 'Some option')
      .action(this.execute.bind(this));
  }
  
  async execute(options) {
    // Command implementation
    this.success('Command completed!');
  }
}

// Run command
new MyCommand().parse();
```

## Debugging Scripts

When debugging scripts:

1. Run with Node directly for better error messages:
   ```bash
   node scripts/schemas-export.js
   ```

2. Add console logs for debugging:
   ```javascript
   console.log('Debug:', someVariable);
   ```

3. Check imports if you encounter module errors:
   ```bash
   grep -r "from '" --include="*.js" scripts/
   ```

## Extending Scripts

When adding new scripts:

1. Follow the naming convention: `noun-verb.js` (bigendian)
2. Update package.json with a matching npm script: `noun:verb`
3. Use the BaseCommand class for consistent behavior
4. Import constants from `src/lib/constants/index`
5. Place in the appropriate category in the scripts directory

## Schema Pipeline

The schema pipeline is a key workflow:

1. `schemas-export.js` converts Zod schemas to JSON Schema
2. `schemas-copy.js` copies schemas to Unity
3. Unity's SchemaImporter converts schemas to C# classes

```
Zod Schemas (TS) → JSON Schemas → C# Classes
```

### JSON Schema Format for Unity

When exporting Zod schemas to JSON Schemas, we apply specific formatting to ensure proper C# class generation:

```javascript
const jsonSchema = zodToJsonSchema(schema, {
  name,
  $refStrategy: 'none',
  definitions: true,   // Include type definitions
  target: 'openApi3',  // Target OpenAPI 3.0 format for better compatibility
  strictUnions: true   // Handle unions properly
});

// Enhance schema with additional metadata for Unity
jsonSchema.$schema = 'http://json-schema.org/draft-07/schema#';
jsonSchema.additionalProperties = false;
jsonSchema.description = `Schema for ${name}`;
```

This formatting ensures:

1. **Proper Property Types**: All properties have correct types that map to C# types
2. **Descriptive Metadata**: Descriptions map to C# XML comments
3. **Strict Type Handling**: Union types and optional properties are handled correctly

### Schema Debugging

We provide several tools for debugging the schema pipeline:

1. **Schema Debug Script**: `npm run schemas:debug` checks for schema correctness
2. **Unity Import Tester**: `SchemaImportTest.cs` validates schema import in Unity
3. **Environment Debug Flag**: `DEBUG=true npm run schemas:export` for detailed output

When a schema isn't generating proper C# classes, you can:

```bash
# Check the schema structure and validation
npm run schemas:debug

# Export with debugging enabled
DEBUG=true npm run schemas:export

# In Unity, run the Schema Import Test from the SpaceCraft menu
```

### Common Schema Issues

When working with the schema pipeline, watch for these issues:

1. **Missing Properties**: Ensure all Zod schema properties are being exported
2. **Type Conversion**: Some TypeScript types might not map cleanly to C#
3. **Union Types**: Zod unions can be tricky to represent in JSON Schema and C#
4. **Required Fields**: Make sure required fields are properly marked

The npm script `schemas:update-all` runs the complete pipeline.

## Script Implementation Approach

### TypeScript in JavaScript Integration

We evaluated several approaches for scripts that need to access TypeScript code:

| Approach | Description | Outcome |
|----------|-------------|---------|
| Scripts in TypeScript | Write CLI scripts in TypeScript | Path resolution issues with `ts-node` |
| JavaScript with direct imports | Import TypeScript directly in JavaScript | Module resolution errors |  
| **JavaScript with tsx runner** | Write in JavaScript but execute with tsx | **✅ Working solution** |
| Build TypeScript to JavaScript | Pre-compile TypeScript to JavaScript | Adds complexity, separate build step |

The current solution:

1. Write scripts in JavaScript
2. Use explicit `.ts` extensions in import paths
3. Execute with the `tsx` runner
4. Use JSDoc in JavaScript for type documentation

Example:

```javascript
// In JavaScript script
import { SomeType } from '../src/lib/types.ts';

/**
 * @param {SomeType} options
 */
function doSomething(options) {
  // Implementation
}
```

### Logging & Debugging Strategy

We use a multi-tier logging approach:

1. **CLI Output**: Colorful terminal output with emoji indicators
2. **JSON Mode**: All scripts support `--json` for machine-readable output
3. **Verbose Mode**: Additional details with `--verbose`
4. **Debug Environment Variable**: `DEBUG=true` for development diagnostics

The BaseCommand class implements the standard logging patterns.

Key Path Constants

| Constant | Description | Path (relative to REPO_ROOT) |
|----------|-------------|------------------------------|
| `REPO_ROOT` | Root of the monorepo | `.` |
| `SVELTEKIT_DIR` | Directory containing SvelteKit projects | `SvelteKit` |
| `UNITY_DIR` | Directory containing Unity projects | `Unity` |
| `CONTENT_DIR` | Directory containing shared content | `Content` |
| `BACKSPACE_DIR` | BackSpace project directory | `SvelteKit/BackSpace` |
| `SPACECRAFT_DIR` | SpaceCraft Unity project directory | `Unity/SpaceCraft` |
| `COLLECTIONS_DIR` | Collections data in Content directory | `Content/collections` |
| `SCHEMAS_DIR` | Shared schemas in Content directory | `Content/schemas` |
| `CACHE_DIR` | Cache storage in Content directory | `Content/cache` |
| `EXPORTS_DIR` | Exports output in Content directory | `Content/exports` |
| `SPACECRAFT_ASSETS_DIR` | Unity Assets directory | `Unity/SpaceCraft/Assets` |
| `SPACECRAFT_SCHEMAS_DIR` | Unity schema import directory | `Unity/SpaceCraft/Assets/Schemas` |
| `SPACECRAFT_SCRIPTS_DIR` | Unity scripts directory | `Unity/SpaceCraft/Assets/Scripts` |
| `SPACECRAFT_RESOURCES_DIR` | Unity resources directory | `Unity/SpaceCraft/Assets/Resources` |
| `SPACECRAFT_EDITOR_DIR` | Unity editor scripts directory | `Unity/SpaceCraft/Assets/Editor` |
| `SPACECRAFT_CONTENT_DIR` | Unity mirror of Content | `Unity/SpaceCraft/Assets/Resources/Content` |
| `SPACECRAFT_COLLECTIONS_DIR` | Unity mirror of collections | `Unity/SpaceCraft/Assets/Resources/Content/collections` |
| `SPACECRAFT_CONTENT_SCHEMAS_DIR` | Unity mirror of schemas | `Unity/SpaceCraft/Assets/Resources/Content/schemas` |
| `SPACECRAFT_GENERATED_SCHEMAS_DIR` | Generated C# schema classes | `Unity/SpaceCraft/Assets/Scripts/Models/Generated` |
| `BUILD_DIR` | Unity build output directory | `Unity/SpaceCraft/Build` |
| `STATIC_DIR` | SvelteKit static assets directory | `SvelteKit/BackSpace/static` |
| `THUMBNAILS_DIR` | Collection thumbnails directory | `SvelteKit/BackSpace/static/thumbnails` |
