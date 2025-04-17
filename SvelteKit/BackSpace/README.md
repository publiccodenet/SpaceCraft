# BackSpace - SvelteKit Application for CraftSpace

This directory contains the SvelteKit web application component of the CraftSpace project.

## Overview

BackSpace serves as:

1. The web host for the Unity WebGL client
2. The data processing pipeline for Internet Archive collections
3. The API server for dynamic queries and collection access

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open

# Build for production
npm run build
```

## NPM Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check the project
- `npm run check:watch` - Type check in watch mode

### Schema Management
- `npm run schema:export` - Export schemas from the database
- `npm run schema:copy` - Copy schemas to Unity
- `npm run schema:copy-to-content` - Copy schemas to Unity content directory
- `npm run schema:build-njsonschema` - Build and install NJsonSchema package
- `npm run schema:debug` - Debug schema-related issues
- `npm run schema:generate-all` - Run schema export and copy in sequence

### Collection Management
- `npm run collection:list` - List all collections
- `npm run collection:create` - Create a new collection
- `npm run collection:process` - Process a collection
- `npm run collection:manage` - Manage collections
- `npm run collection:debug` - Debug collection issues
- `npm run collection:validate` - Validate collection data
- `npm run collection:excluded` - List excluded items

### Item Management
- `npm run item:list` - List items in a collection
- `npm run item:get` - Get details of a specific item
- `npm run item:create` - Create a new item
- `npm run item:fetch` - Fetch item data

### Content Management
- `npm run content:init` - Initialize content directory
- `npm run content:info` - Show content directory info

### System Management
- `npm run unity:install` - Install Unity package
- `npm run path:debug` - Debug path resolution
- `npm run connector:manage` - Manage data connectors
- `npm run export:manage` - Manage data exports
- `npm run processor:manage` - Manage data processors
- `npm run import:debug` - Debug import issues
- `npm run copy-items-to-unity` - Copy items to Unity project

## Documentation

For complete documentation, see [README-BACKSPACE.md](../../README-BACKSPACE.md) in the repository root.

## Project Structure

- `scripts/`: Collection processing scripts and data pipeline
- `src/`: SvelteKit application source code
- `static/`: Static assets including collection data and Unity build

## Basic SvelteKit Usage

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

### Developing

Once you've installed dependencies with `npm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

# Unity Automation Tools

BackSpace includes a comprehensive suite of tools for automating Unity-related tasks. These tools simplify the workflow between SvelteKit and Unity, especially for WebGL builds.

## Available Commands

| Command | Description |
|---------|-------------|
| `unity:generate-schemas` | Generate C# classes from JSON schemas |
| `unity:build-dev` | Build Unity project in development mode |
| `unity:build-prod` | Build Unity project in production mode |
| `unity:build-webgl-dev` | Build WebGL project in development mode |
| `unity:build-webgl-prod` | Build WebGL project in production mode |
| `unity:unbuild-webgl` | Copy files from build back to source (to preserve runtime changes) |
| `unity:diff-webgl` | Show differences between build output and source files |
| `unity:serve-webgl` | Serve the WebGL build locally for testing |
| `unity:ci` | Run Unity CI build |
| `unity:logs` | Check Unity logs for errors |
| `unity:env` | Display Unity environment information |
| `unity:list-versions` | List installed Unity versions |
| `unity:deploy-webgl` | Deploy WebGL build to specified location |
| `unity:build-and-deploy` | Build WebGL and deploy in one step |

## Command Line Options

All commands support these additional options:

| Option | Description |
|--------|-------------|
| `--verbose` | Enable detailed output, including Unity environment discovery process |

## Usage Examples

### Basic Usage

```bash
# Build the WebGL project in production mode
npm run unity:build-webgl

# Show differences between build and source files
npm run unity:diff-webgl

# Copy runtime changes from build back to source
npm run unity:unbuild-webgl
```

### With Verbose Output

```bash
# Run with verbose output
npm run unity:generate-schemas -- --verbose
```

### Build and Deploy Workflow

```bash
# Full workflow - regenerate schemas, build, and deploy
npm run unity:deploy-all
```

## Live Development Workflow

The tools support a streamlined workflow for live development with Unity WebGL builds:

1. **Build WebGL**: `npm run unity:build-webgl`
   - This runs the Unity build process, which copies files from:
     - `/CraftSpace/Unity/CraftSpace/Assets/WebGLTemplates/SpaceCraft` (HTML/JS template)
     - `/CraftSpace/Unity/CraftSpace/Assets/StreamingAssets/Bridge` (Bridge integration)
   - Into the build output directory: `/Unity/CraftSpace/Builds/SpaceCraft`

2. **Serve and Test**: `npm run unity:serve-webgl`
   - Serves the WebGL build locally for testing in your browser
   - Allows live-coding by modifying the HTML and JavaScript files directly in the build directory
   - Particularly useful for Bridge/JS development

3. **Check Changes**: `npm run unity:diff-webgl`
   - Shows differences between your modified build files and the source files
   - Helps you identify what changes you've made during live coding

4. **Preserve Changes**: `npm run unity:unbuild-webgl`
   - Copies your changes from the .gitignored ephemeral build directory
   - Places them back in their proper locations in the source directories
   - Ensures your changes are saved in version control

5. **Deploy to Website**: `npm run unity:deploy-webgl`
   - Once you're satisfied with your changes, deploy the build to the WebSites directory
   - This build will be automatically deployed when pushed to main via GitHub Actions

This workflow is particularly valuable for Bridge/JS development, allowing you to iterate rapidly by modifying code directly in the browser and then preserving those changes in the source repository.

### Why Two Source Locations?

The separation between WebGLTemplates and StreamingAssets serves different purposes:
- **WebGLTemplates/SpaceCraft**: Contains the HTML and top-level JS files specific to this template
- **StreamingAssets/Bridge**: Contains Bridge integration files that are included in all builds

This separation allows different WebGL templates to have modified versions of the wrapper HTML/JS while sharing the core Bridge functionality.

## Environment Configuration

The Unity automation tools automatically discover your Unity installation and project paths. You can override these with environment variables:

| Variable | Description |
|----------|-------------|
| UNITY_APP | Path to the Unity project (default: ../../Unity/CraftSpace) |
| UNITY_VERSION | Specific Unity version to use |
| UNITY_PATH | Direct path to Unity executable |
| UNITY_PRECONFIGURED | Set to 'true' if running on a preconfigured CI runner |

To check your current environment configuration:

```bash
npm run unity:env
```
