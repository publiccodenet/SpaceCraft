# Internet Archive Integration

This directory contains scripts for integrating with the Internet Archive (IA) to download, process, and manage collections for CraftSpace.

## Architecture

The Internet Archive integration consists of several core components:

1. **Collection Registry** - Tracks all registered collections with metadata
2. **Collection Downloader** - Downloads collections, item metadata, and content
3. **Processing Pipeline** - Coordinates the full download and processing workflow
4. **Unity Export** - Prepares and exports collections for Unity integration

## Multi-Tier Collection Architecture

Collections in CraftSpace follow a multi-tier architecture:

### 1. Raw Collections Cache

The primary tier contains the full, raw collection data downloaded from the Internet Archive:

- Located in a top-level `Collections` directory (separate from SvelteKit/Unity builds)
- Contains complete, unfiltered content in its "full glory and splendor"
- Preserved during rebuilds of SvelteKit or Unity
- Serves as the source material for all other tiers
- Large files (.epub, .pdf, .mp4, etc.) managed via Git LFS or excluded in .gitignore

### 2. Deployment Targets

Each collection can have multiple deployment targets, each with its own specifications:

- **CDN Deployment** - Optimized for content delivery networks
- **SvelteKit Static** - For development and static hosting
- **Unity Resources** - Embedded in Unity builds
- **Mobile-Optimized** - Lower resolution for bandwidth-constrained devices
- **High-Resolution** - Full quality for installations and exhibits

### 3. Dynamic Collections

The SvelteKit server can generate collections dynamically:

- Interactive search to create on-the-fly collections
- Dynamic filtering and processing
- Hot-patching of deployed content

### Directory Structure

Collections are organized with the following structure:

```
Collections/
  └── {collection-prefix}/
      ├── collection.json       - Collection metadata with deployment targets
      └── items/                - Directory containing item subdirectories
          ├── {item-id-1}/      - Item directory
          │   ├── item.json     - Item metadata
          │   ├── cover.jpg     - Cover image
          │   ├── page_0001.jpg - Page image (if applicable)
          │   └── content.epub  - Original content file
          └── {item-id-2}/
              ├── item.json
              └── ... 

Deployment targets:
  
SvelteKit/BackSpace/static/data/collections/
  └── {collection-prefix}/      - Filtered subset for SvelteKit
  
Unity/CraftSpace/Assets/Resources/Collections/
  └── {collection-prefix}/      - Filtered subset for Unity
  
CDN/collections/
  └── {collection-prefix}/      - Filtered subset for CDN
```

## Collection Configuration

Each collection supports multiple deployment targets through its configuration:

```json
{
  "prefix": "scifi",
  "name": "Science Fiction",
  "query": "subject:science fiction",
  "sort": "downloads desc",
  "deployment_targets": {
    "sveltekit": {
      "enabled": true,
      "limit": 500,
      "include_content": false,
      "resolutions": ["tile", "1x1", "2x3"],
      "atlas_enabled": true
    },
    "unity": {
      "enabled": true,
      "limit": 200,
      "include_content": false,
      "resolutions": ["tile", "atlas_512", "1x1", "2x3"],
      "atlas_enabled": true
    },
    "cdn": {
      "enabled": true, 
      "limit": 1000,
      "include_content": true,
      "resolutions": ["tile", "512", "1024", "tile_pyramid"],
      "atlas_enabled": true
    },
    "mobile": {
      "enabled": true,
      "limit": 100,
      "include_content": false,
      "resolutions": ["tile_small", "1x1", "2x3"],
      "atlas_enabled": true
    }
  }
}
```

## Collection Discovery

Collections are discovered through directory scanning rather than a central configuration file:

```
Collections/
  ├── scifi/
  │   ├── collection.json       - Collection metadata with deployment targets
  │   └── items/                - Directory containing item subdirectories
  │
  ├── poetry/
  │   ├── collection.json       - Collection metadata with deployment targets
  │   └── items/                - Directory containing item subdirectories
  │
  └── history/
      ├── collection.json       - Collection metadata with deployment targets
      └── items/                - Directory containing item subdirectories
```

The registry scans this directory structure to build an in-memory registry of all available collections. This approach:
1. Eliminates the need for a central configuration file
2. Makes collection management more modular
3. Enables independent processing of collections
4. Simplifies Git LFS handling for large collections

### Collection Registry

The collection registry maintains an in-memory index of all discovered collections and writes a registry cache file (`collections.json`) at the library level (not the root level) which contains:

```json
{
  "collections": [
    {
      "prefix": "scifi",
      "name": "Science Fiction",
      "query": "subject:science fiction",
      "totalItems": 200,
      "lastUpdated": "2023-03-15T00:00:00.000Z"
    },
    {
      "prefix": "poetry",
      "name": "Poetry Collections",
      "query": "subject:poetry",
      "totalItems": 150,
      "lastUpdated": "2023-03-16T00:00:00.000Z"
    }
  ],
  "lastUpdated": "2023-03-16T00:00:00.000Z"
}
```

This registry is used only for quick lookups and can be regenerated at any time by scanning the Collections directory.

## Usage

### Registry Management

```bash
# List all registered collections
npm run ia:list

# Get details for a specific collection
npm run ia:get scifi

# Register a new collection
npm run ia:register scifi "Science Fiction" "subject:science fiction" --sort="downloads desc" --limit=200 --profile=unity,web

# Unregister a collection
npm run ia:unregister scifi

# Scan collections directory and update registry
npm run ia:scan
```

### Downloading & Processing

```bash
# Download raw collection data
npm run ia:download scifi "Science Fiction" "subject:science fiction" --sort="downloads desc" --limit=100 --batch-size=1000

# Process all registered collections (incremental update)
npm run ia:process

# Process all registered collections (full update)
npm run ia:process-full

# Process specific collection
npm run ia:process -- --collection=scifi

# Process with Unity export
npm run ia:process -- --collection=scifi --unity-export

# Force refresh of content even if cached
npm run ia:process -- --force-refresh

# Retry previously forbidden content
npm run ia:process -- --retry-forbidden
```

## Deployment Target Specifications

Each deployment target can be configured with:

### Filtering Options
- `limit` - Maximum number of items
- `sort` - Sort order of items
- `include_content` - Whether to include full content or just metadata
- `filter_query` - Additional query to filter the collection

### Resolution Options
- `resolutions` - Array of resolution types to include
- `atlas_enabled` - Whether to generate texture atlases
- `tile_pyramid` - Whether to generate Google Maps-style tile pyramids

### Format Options
- `formats` - Array of file formats to include (pdf, epub, etc.)
- `compression` - Compression level for images
- `quality` - Image quality settings

## Advanced Content Processing

The system implements sophisticated processing for different content types:

### EPUB Processing Features

The `process-epub.js` script provides extensive capabilities for EPUB content:

1. **Enhanced Metadata Extraction**
   - Extracts Dublin Core elements (title, creator, publisher, date, language, etc.)
   - Parses creator names and roles (separating author, editor, translator, etc.)
   - Extracts ISBN and other identifiers with structured format
   - Preserves original EPUB metadata for reference

2. **Cover Image Extraction**
   - Automatically identifies and extracts cover images 
   - Supports resizing to configurable dimensions
   - Converts to different formats (JPEG, PNG, WebP)
   - Maintains quality settings for different deployment targets

3. **Content Extraction**
   - Extracts individual pages as HTML or images
   - Supports pagination and chapter identification
   - Allows for partial extraction of limited pages

4. **Thumbnail Generation**
   - Creates ultra-low-resolution thumbnails (1x1, 2x3 pixels)
   - Generates multiple resolution variants
   - Supports different color formats and optimization

### Performance Optimizations

The download system includes several performance features:

1. **Parallel Downloads**
   - Uses `download-manager.js` to handle up to 5 concurrent downloads
   - Implements a queue system for pending downloads
   - Manages overall throughput to avoid rate limiting

2. **Intelligent Caching**
   - Tracks ETags for content files to detect changes
   - Records file sizes to avoid redundant downloads
   - Maintains timestamps for age-based invalidation
   - Stores download performance metrics for analysis

3. **Error Handling**
   - Implements exponential backoff for transient errors
   - Tracks permanent failures to avoid repeated attempts
   - Distinguishes between rate limiting and permission errors
   - Provides detailed error reporting for troubleshooting

4. **Social Information Processing**
   - Filters "fav-username" collection entries to extract favorite counts
   - Maintains favorite statistics without exposing user identities
   - Enables popularity-based sorting using download counts

## Multi-Resolution Tile Pyramids

For high-resolution content, the system can generate Google Maps-style tile pyramids:

- Multiple zoom levels with different resolution tiles
- Each level has a grid of tiles at appropriate resolution
- Efficient loading of only visible tiles at current zoom level
- Smooth transitions between zoom levels

## Texture Atlas Generation

For Unity integration, texture atlases are generated:

- Multiple items packed into a single texture
- Different atlas resolutions for different viewing distances
- Metadata for mapping items to atlas coordinates
- Optimized for GPU performance

# Deployment Infrastructure

When deploying to production, we utilize Digital Ocean services:

- Collections are stored in **Digital Ocean Spaces** (object storage)
- Content delivery is accelerated with **Digital Ocean CDN**
- Application hosting uses **Digital Ocean App Platform**

## CDN Configuration

For optimal performance, configure the Digital Ocean CDN with:

1. **Cache Control Headers**: `max-age=2592000` (30 days) for static assets
2. **CORS Configuration**: Allow cross-origin requests for Unity WebGL
3. **Compression**: Enable Gzip/Brotli for text-based assets
4. **Edge Caching**: Enable edge caching for collection data

## Deployment Commands

```bash
# Deploy collection to Digital Ocean Spaces
npm run ia:deploy scifi --target=do-spaces

# Purge CDN cache for specific collection
npm run ia:purge-cdn scifi

# Deploy SvelteKit app with collections to Digital Ocean
npm run deploy:do
```

# Item Metadata Files

Collections store item metadata in files with a specific naming convention:

```
Collections/
  └── {collection-prefix}/
      ├── collection.json       - Collection metadata 
      └── items/                - Directory containing item subdirectories
          ├── {item-id-1}/      - Item directory
          │   ├── item.json     - Item metadata
          │   ├── cover.jpg     - Cover image
          │   ├── page_0001.jpg - Page image (if applicable)
          │   └── content.epub  - Original content file
          └── {item-id-2}/
              ├── item.json
              └── ... 
```

The system uses the **`item.json`** file to identify item metadata files. This approach:

1. **Avoids ambiguity** - Clearly distinguishes metadata from other JSON files
2. **Simplifies file management** - Add/remove items by simply adding/removing directories
3. **Prevents duplication** - No need to maintain separate item lists that can get out of sync
4. **Enables drag-and-drop workflows** - Makes it easy to manage collections through file operations

## Directory-Based Collection Management

Collections are fully defined by their directory structure. You can:

- **Add an item**: Create a new directory with the item's ID
- **Remove an item**: Delete the item's directory
- **Update an item**: Modify files within the item's directory

The system will automatically detect these changes when scanning collections.

## Cache Performance Optimization

For performance, the system maintains a `collections-cache.json` file containing metadata about all collections (but not their items). This file:

- Is automatically generated from the directory structure
- Can be regenerated at any time using `npm run ia:scan`
- Contains collection info for quick lookup without scanning directories
- Does not include item details (which are read directly from files) 

## Runtime System Exports

When exporting collections to runtime systems like Unity or web browsers (which can't enumerate directories), the system dynamically generates `index.json` files:

```
Unity/CraftSpace/Assets/Resources/Collections/
  └── {collection-prefix}/
      ├── collection.json       - Collection metadata 
      ├── index.json            - Generated array of item IDs for runtime use
      └── items/                - Directory containing item metadata and tiles
```

This approach:
1. **Maintains directories as source of truth** - The raw collection structure is always authoritative
2. **Provides runtime convenience** - Consumer systems don't need directory listing capabilities
3. **Optimizes for runtime access** - Enables sequential loading patterns in Unity/browsers

The `index.json` file contains a simple array of item IDs that correspond to the items available in the collection:

```json
[
  "item-id-1",
  "item-id-2",
  "item-id-3"
]
```

These IDs can then be used to construct paths to the item metadata files by appending `item.json`. 