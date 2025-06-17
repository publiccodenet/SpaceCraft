# BackSpace - SpaceCraft Content Management System

BackSpace is a SvelteKit-based content management system that processes Internet Archive collections and exports them for use in the SpaceCraft Unity visualization client.

## Architecture

BackSpace serves as the middle layer in the SpaceCraft pipeline:
- **Input**: Internet Archive collections and metadata
- **Processing**: Content validation, schema generation, and data transformation
- **Output**: Structured data and assets for Unity WebGL client

## NPM Scripts Reference

### 🟢 Working Scripts

#### SvelteKit Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check and validate
- `npm run check:watch` - Type check in watch mode
- `npm run lint` - Run linting
- `npm run format` - Format code

#### Schema Management
- `npm run schemas:generate` - Generate JSON schemas from Zod definitions
- `npm run schemas:debug` - Validate and debug existing schemas
- `npm run schemas:export` - Copy schemas to Unity StreamingAssets
- `npm run schemas:export:unity` - Alias for schemas:export

#### Content Pipeline
- `npm run pipeline` - Show pipeline help
- `npm run pipeline:run` - Run full content pipeline (import + export)
- `npm run pipeline:import` - Import content from Internet Archive
- `npm run pipeline:export` - Export processed content to Unity

#### Internet Archive Integration
- `npm run ia:import` - Import content using Internet Archive importer

#### Content Management
- `npm run content:info` - Display content system information and statistics

#### Collection Management
- `npm run collection:create` - Create a new collection
- `npm run collection:manage` - Manage existing collections
- `npm run collection:validate` - Validate collection items and manage exclusions
- `npm run collection:excluded` - List excluded items in collections

#### Item Management
- `npm run item:list` - List items in a collection
- `npm run item:get` - Get details for a specific item
- `npm run item:create` - Create a new item in a collection

#### Unity Integration
- `npm run unity:env` - Display Unity environment information
- `npm run unity:env:shell` - Generate Unity environment shell script
- `npm run unity:detect-env` - Detect Unity installation environment
- `npm run unity:discover` - Discover Unity installations (verbose)
- `npm run unity:versions` - List installed Unity versions
- `npm run unity:build:webgl:prod` - Build Unity WebGL (production)
- `npm run unity:build:webgl:dev` - Build Unity WebGL (development)
- `npm run unity:serve` - Serve Unity WebGL build locally with HTTPS
- `npm run unity:schemas` - Generate schemas and import to Unity
- `npm run unity:linkup` - Create symlinks for development hot-reloading
- `npm run unity:logs` - Check Unity logs for errors
- `npm run unity:start` - Launch Unity editor
- `npm run unity:openproject` - Open Unity project
- `npm run unity:prebuild` - Run Unity prebuild steps
- `npm run unity:install:sveltekit` - Install Unity build to SvelteKit static
- `npm run unity:install:website` - Install Unity build to website directory
- `npm run unity:copyup` - Copy WebSites/spacetime to Unity/SpaceCraft/Builds/SpaceCraft
- `npm run unity:copydown` - Copy edited JS files back to WebSites/spacetime

### 🔴 Broken Scripts (Need Fixing)

#### Content Management
- `npm run pipeline:bootstrap` - Bootstrap pipeline (missing command)
- `npm run content:init` - Initialize content system (import errors)
- `npm run collection:list` - List collections (missing error module)

#### Unity Integration
- `npm run unity:setup` - Setup Unity automation files (path issues)

## Script Categories

### Core Development Scripts
Essential for SvelteKit development and basic project maintenance.

**Files**: Standard SvelteKit configuration
**Status**: ✅ All working

### Schema Processing Scripts
Handle TypeScript/Zod to JSON Schema conversion and distribution.

**Files**: 
- `scripts/schemas-export.js` - Main schema generator
- `scripts/schemas-debug.js` - Schema validation tool

**Status**: ✅ All working

### Content Pipeline Scripts
High-level content processing from Internet Archive to Unity.

**Files**:
- `scripts/pipeline.js` - Main pipeline orchestrator (1480 lines)

**Status**: ✅ Core functionality working, some subcommands broken

### Content Management Scripts
Direct manipulation of collections and items.

**Files**:
- `scripts/content-info.js` - System information ✅
- `scripts/content-init.js` - System initialization ❌
- `scripts/collection-create.js` - Collection creation ✅
- `scripts/collection-list.js` - Collection listing ❌
- `scripts/collection-manage.js` - Collection management ✅
- `scripts/collection-exclude.js` - Item validation/exclusion ✅
- `scripts/item-create.js` - Item creation ✅
- `scripts/item-manage.js` - Item management ✅

**Status**: 🟡 Mostly working, some import issues

### Unity Integration Scripts
Unity environment detection, building, and deployment.

**Files**:
- `scripts/unity-automation.js` - Main Unity automation (1227 lines) ✅
- `scripts/unity-env.js` - Environment discovery ✅
- `scripts/unity-env.sh` - Shell environment setup ✅
- `scripts/unity-install.js` - Build installation ✅

**Status**: ✅ Core functionality working

### Supporting Infrastructure
Base classes and utilities used by other scripts.

**Files**:
- `scripts/base-command.js` - CLI command base class
- `src/lib/constants/` - Path and emoji constants
- `src/lib/schemas/` - Zod schema definitions

**Status**: ✅ All working

## Common Issues

### Import Errors
Some scripts reference missing modules:
- `src/lib/errors/errors.ts` - Referenced but doesn't exist
- Path constants may be inconsistent between scripts

### TypeScript in JavaScript
Some `.js` files contain TypeScript syntax that needs conversion.

### Missing Commands
Some pipeline subcommands are referenced but not implemented.

## Unity Development Workflow

### JavaScript Development in Unity WebGL Builds

The SpaceCraft project has a special workflow for developing JavaScript code that runs in Unity WebGL builds. The main JavaScript files are:
- `controller.js` - Shared controller logic for navigator and selector
- `spacecraft.js` - Main Unity interface and Supabase communication

#### Development Setup

1. **Get a writable copy** (choose one):
   ```bash
   # Option A: Copy from deployed website
   npm run unity:copyup
   
   # Option B: Build Unity app directly to Unity/SpaceCraft/Builds/SpaceCraft
   npm run unity:build:webgl:dev
   ```

2. **Link for development**:
   ```bash
   npm run unity:linkup
   ```
   This replaces the JavaScript files in the build with symlinks to the source files in `Unity/SpaceCraft/Assets/StreamingAssets/SpaceCraft/`

3. **Develop and test**:
   - Edit JS files in: `Unity/SpaceCraft/Assets/StreamingAssets/SpaceCraft/`
   - Test with: `npm run unity:serve`
   - Open the HTTPS URL shown (accept the self-signed certificate warning)

4. **Deploy changes**:
   ```bash
   npm run unity:copydown
   ```
   This copies your edited files back to `WebSites/spacetime/StreamingAssets/SpaceCraft/` which is under source control

5. **Commit and deploy**:
   ```bash
   git diff                    # Review changes
   git add .                   # Add changes
   git commit -m "Update JS"   # Commit
   git push                    # Push
   # Create PR to merge to main
   ```

#### Important Notes

- **Never deploy a linked build** - Always use a clean build for production
- **The linkup creates symlinks** - Your edits in `Assets/StreamingAssets/SpaceCraft/` are the source of truth
- **copydown updates source control** - This is how your changes get into the deployed website
- **HTTPS is required** - Mobile controllers need HTTPS to access device motion APIs

#### File Locations

```
Unity/SpaceCraft/
├── Builds/SpaceCraft/              # Writable build copy (gitignored)
│   └── StreamingAssets/SpaceCraft/ # Symlinked to source after linkup
└── Assets/StreamingAssets/SpaceCraft/ # Source files (edit here)
    ├── controller.js               # Controller logic
    ├── spacecraft.js               # Unity interface
    ├── navigator.html              # Navigator controller UI
    ├── selector.html               # Selector controller UI
    └── *.css                       # Stylesheets

WebSites/spacetime/
└── StreamingAssets/SpaceCraft/     # Deployed version (source control)
    ├── controller.js               # Gets updated by copydown
    ├── spacecraft.js               # Gets updated by copydown
    └── ...                         # Other files
```

## Usage Examples

### Basic Development
```bash
# Start development
npm run dev

# Generate and export schemas
npm run schemas:generate
npm run schemas:export
```

### Content Management
```bash
# Initialize content system
npm run content:init

# Create a collection
npm run collection:create -- my-collection "My Collection" "subject:fiction"

# View system info
npm run content:info
```

### Unity Integration
```bash
# Check Unity environment
npm run unity:env

# Build WebGL
npm run unity:build:webgl:prod

# Serve locally for testing
npm run unity:serve
```

### Full Pipeline
```bash
# Run complete pipeline
npm run pipeline:run

# Or step by step
npm run pipeline:import
npm run pipeline:export
```

## Dependencies

### Runtime Dependencies
- **axios** - HTTP client for Internet Archive API
- **chalk** - Terminal colors and formatting
- **commander** - CLI argument parsing
- **fs-extra** - Enhanced file system operations
- **sharp** - Image processing
- **zod** - Schema validation
- **internetarchive-sdk-js** - Internet Archive API client

### Development Dependencies
- **tsx** - TypeScript execution
- **@sveltejs/kit** - SvelteKit framework
- **typescript** - TypeScript compiler
- **vite** - Build tool

## File Structure

```
SvelteKit/BackSpace/
├── scripts/           # CLI automation scripts
├── src/
│   ├── lib/
│   │   ├── constants/ # Shared constants
│   │   └── schemas/   # Zod schema definitions
│   └── routes/        # SvelteKit routes
├── static/            # Static assets
└── package.json       # NPM configuration
``` 