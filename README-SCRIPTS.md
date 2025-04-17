# CraftSpace Scripts

This document provides an overview of the various scripts used throughout the CraftSpace project, with a focus on build tools, data processing, and automation.

## Overview

CraftSpace uses a collection of scripts to manage:

1. **Content Processing** - Downloading and transforming Internet Archive content
2. **Build Automation** - Compiling and packaging application components
3. **Deployment** - Publishing content to various platforms
4. **Development Utilities** - Tools that simplify the development workflow

## TypeScript Build System

The project uses TypeScript for all scripting to ensure type safety and maintainability. The core build configuration is located in `SvelteKit/BackSpace/scripts/tsconfig.json`.

### TypeScript Configuration

The TypeScript configuration (`tsconfig.json`) is set up for modern ES modules:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "../dist/scripts",
    "sourceMap": true,
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

### Build Scripts System

The script build process is coordinated by `build-scripts.ts`, which handles:

1. Compilation of TypeScript files to JavaScript
2. Management of dependencies
3. Integration with the main SvelteKit build process

## Core Script Categories

### 1. Internet Archive Integration Scripts

Located in `SvelteKit/BackSpace/scripts/`, these handle all interaction with Internet Archive:

- **ia-collections-registry.js**: Manages collection registration and discovery
- **ia-collection-downloader.js**: Downloads content from Internet Archive
- **ia-process-collections.js**: Processes downloaded collections
- **ia-unity-export.js**: Prepares collections for Unity integration

### 2. Content Processing Scripts

Scripts that transform raw content into optimized formats:

- **process-epub.js**: Extracts metadata and content from EPUB files
- **process-pdf.js**: Handles PDF content extraction and thumbnail generation
- **generate-atlases.js**: Creates texture atlases for Unity visualization
- **generate-icons.js**: Generates low-resolution icons for distant viewing

### 3. Build and Deployment Scripts

Scripts for building and deploying various components:

- **build-unity.js**: Builds and prepares Unity WebGL output
- **build-sveltekit.js**: Builds the SvelteKit application
- **deploy-cdn.js**: Uploads processed collections to CDN
- **deploy-app.js**: Deploys the complete application

### 4. Utility Scripts

Common utilities used across multiple scripts:

- **download-manager.js**: Manages concurrent downloads with rate limiting
- **file-processor.js**: Common file operations and transformations
- **logger.js**: Consistent logging system
- **cache-manager.js**: Handles caching of downloaded and processed content

## NPM Script Commands

The project defines convenience commands in `package.json` for common operations:

```bash
# Internet Archive Collection Management
npm run ia:list                 # List all registered collections
npm run ia:get <prefix>         # Get details for a specific collection
npm run ia:register <...args>   # Register a new collection
npm run ia:unregister <prefix>  # Unregister a collection
npm run ia:scan                 # Scan collections directory

# Content Processing
npm run ia:download <...args>   # Download a collection from Internet Archive
npm run ia:process              # Process collections incrementally
npm run ia:process-full         # Process all collections from scratch
npm run ia:process-unity        # Process and export to Unity

# Build Commands
npm run build:scripts           # Build TypeScript scripts
npm run build:unity             # Build Unity WebGL project
npm run build:all               # Build everything
```

## Script Directory Structure

The scripts are organized within the `SvelteKit/BackSpace/scripts/` directory:

```
scripts/
├── ia/                      # Internet Archive integration scripts
│   ├── collections-registry.ts
│   ├── collection-downloader.ts
│   └── process-collections.ts
├── processing/              # Content processing scripts
│   ├── process-epub.ts
│   ├── process-pdf.ts
│   └── generate-atlases.ts
├── utils/                   # Utility functions and helpers
│   ├── download-manager.ts
│   ├── file-processor.ts
│   └── logger.ts
├── build/                   # Build automation scripts
│   ├── build-unity.ts
│   └── build-sveltekit.ts
└── deploy/                  # Deployment scripts
    ├── deploy-cdn.ts
    └── deploy-app.ts
```

## Common Workflows

### Adding a New Collection

```bash
# Register collection
npm run ia:register scifi "Science Fiction" "subject:science fiction" --include-in-unity

# Download and process
npm run ia:process -- --collection=scifi

# Export to Unity
npm run ia:process -- --collection=scifi --unity-export
```

### Updating Existing Collections

```bash
# Update all collections incrementally
npm run ia:process

# Force refresh of specific collection
npm run ia:process -- --collection=poetry --force-refresh

# Update Unity export
npm run sync-unity-collections
```

### Full Rebuild

```bash
# Full content pipeline
npm run ia:process-full

# Build all application components
npm run build:all
```

## Script Development Guidelines

When developing or modifying scripts:

1. **Use TypeScript**: All new scripts should be written in TypeScript
2. **ES Modules**: Use ESM syntax (`import`/`export`) rather than CommonJS
3. **Async/Await**: Prefer async/await over callbacks or promise chains
4. **Error Handling**: Implement proper error handling with graceful fallbacks
5. **Logging Levels**: Use appropriate logging levels (info, warn, error, debug)
6. **Configuration**: Accept configuration via both CLI flags and config files
7. **Testing**: Add test coverage for critical functionality

## Common Implementation Patterns

### Command Processing Pattern

Most CLI scripts follow this pattern:

```typescript
// Define command structure
const commands = {
  list: { description: "List all collections", handler: listCollections },
  get: { description: "Get collection details", handler: getCollection },
  // ...
};

// Process command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (commands[command]) {
  commands[command].handler(args.slice(1));
} else {
  showHelp();
}
```

### Configuration Loading Pattern

Scripts typically load configuration from multiple sources:

```typescript
// Load configuration with precedence:
// 1. Command line arguments
// 2. Environment variables
// 3. Configuration files
// 4. Default values
const config = {
  ...defaultConfig,
  ...loadConfigFromFile(configPath),
  ...parseEnvironmentVars(),
  ...parseCommandLineArgs(args)
};
```

### Concurrent Processing Pattern

For operations on multiple items:

```typescript
// Process items with concurrency control
async function processItems(items, concurrency = 5) {
  const queue = new Queue(concurrency);
  
  for (const item of items) {
    await queue.add(() => processItem(item));
  }
  
  await queue.onIdle();
}
```

## Debugging Scripts

For troubleshooting script issues:

1. **Enable Verbose Logging**:
   ```bash
   npm run ia:process -- --verbose
   ```

2. **Run in Test Mode**:
   ```bash
   npm run ia:process -- --dry-run
   ```

3. **Examine Logs**:
   Log files are stored in the `logs/` directory with timestamps

4. **Check Environment Variables**:
   Verify values in `.env` file or using:
   ```bash
   npm run env-check
   ```

5. **Single-Step Processing**:
   Process a single item for testing:
   ```bash
   npm run ia:process -- --collection=scifi --item=item123 --debug
   ```

## Integration with CI/CD

These scripts integrate with GitHub Actions workflows for automated processing:

- **update-collections.yml**: Scheduled collection updates
- **build-deploy.yml**: Build and deployment process

Complete reference for CI/CD is available in `.github/README.md`.

## Performance Considerations

When running scripts on large collections:

1. **Adjust Concurrency**: Set appropriate concurrency levels based on available resources:
   ```bash
   npm run ia:process -- --concurrent-items=3 --concurrent-downloads=5
   ```

2. **Batch Processing**: Process collections in smaller batches:
   ```bash
   npm run ia:process -- --batch-size=50 --offset=100
   ```

3. **Resource Monitoring**: Use the monitoring tools to check resource usage:
   ```bash
   npm run monitor:resources
   ```

## Planned Script Enhancements

Future improvements to the script system include:

1. **Workflow Orchestration**: Better coordination between script steps
2. **Incremental Processing**: More granular change detection
3. **Progress Reporting**: Enhanced status updates and progress bars
4. **Recovery Mechanisms**: Better handling of interruptions and restarts

The script system is designed to be modular and extensible, allowing for continuous improvement and adaptation to evolving requirements. 