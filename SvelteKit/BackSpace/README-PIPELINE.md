# Content Pipeline Design

## Overview

The Content Pipeline is a system for exporting content from Internet Archive to Unity's StreamingAssets directory. The pipeline follows a pull-based approach with efficient caching.

The pipeline manages the workflow of content from sources to Unity's StreamingAssets directory. It consists of several phases: bootstrap, pull, and export.

## Architecture

```mermaid
flowchart LR
    A["Internet Archive\n(Source Data)"] --> B["Content/collection\n(Shared Cache)"]
    B --> C["Unity StreamingAssets\n(Target Output)"]
```

The pipeline operates in three stages:

1. **Bootstrap**: Generate a skeleton whitelist from existing Unity content
2. **Pull**: Fetch content from Internet Archive to a shared content cache
3. **Export**: Export cached content to Unity StreamingAssets

The pipeline is built with a modular architecture:

- `pipeline.js` - Core pipeline class with bootstrap, pull, and export phases
- `pipeline-run.js` - Runner script that executes all phases
- `pipeline-export.js` - Specialized script for the export phase

## Directory Structure

```
Content/
├── Configs/
│   └── Exporters/
│       └── Unity/
│           └── CraftSpace/
│               ├── collections-filter.json  # Filter configuration
│               └── index-deep.json          # Skeleton whitelist
│
├── collections/  # Shared content cache (SINGLE SOURCE OF TRUTH)
│   └── scifi/
│       ├── collection.json
│       └── Items/
│           └── 5thwave0000yanc/
│               ├── item.json     # Raw metadata with original structure
│               └── cover.jpg     # Downloaded cover image with measured dimensions

Unity/CraftSpace/Assets/StreamingAssets/Content/
├── collections-index.json
├── index-deep.json  # Enhanced with additional metadata
├── collections/
│   └── scifi/
│       ├── collection.json
│       ├── items-index.json
│       └── items/
│           └── 5thwave0000yanc/
│               ├── item.json     # Cleaned, filtered, and normalized metadata
│               └── cover.jpg
```

### Collections and Items

Content is organized into collections, each containing items:

```
Content/
  collections/
    spacecraft/
      collection.json
      Items/
        apollo11/
          item.json
          cover.jpg
        voyager/
          item.json
          cover.jpg
    parts/
      collection.json
      Items/
        engine-a/
          item.json
          cover.jpg
```

## Data Structure

The skeleton whitelist (`index-deep.json`) follows this structure:

```json
{
  "collections": {
    "scifi": {
      "collection": { ... },  // Contents of collection.json
      "itemsIndex": ["5thwave0000yanc", ...],  // List of item IDs
      "items": {
        "5thwave0000yanc": {
          "item": { ... }  // Contents of item.json
        }
      }
    }
  },
  "collectionsIndex": ["scifi", ...]  // List of collection IDs
}
```

The importer behavior with this structure:
- Collections listed in `collectionsIndex` will be created if missing
- Collections not listed in `collectionsIndex` will be removed
- For each collection, items listed in its `itemsIndex` will be included
- Items not listed in `itemsIndex` will be excluded

## Configuration Files

### index-deep.json

This file defines the content structure that will be exported to Unity, including:

- `collectionsIndex`: Array of collection IDs that should be included
- `collections`: Object containing metadata for each collection
  - Each collection contains an `itemsIndex` array listing item IDs to include

### collections-filter.json

This configuration file controls which collections and items are exported:

```json
{
  "version": "1.0",
  "description": "Filter configuration for exporting collections and items",
  "collections": {
    "spacecraft": {
      "enabled": true,
      "include": ["*"],
      "exclude": ["wip-*", "deprecated-*"]
    },
    "parts": {
      "enabled": true,
      "include": ["*"],
      "exclude": ["test-*"]
    }
  },
  "metadata": {
    "includeImages": true,
    "includeVideos": true,
    "includeModels": true,
    "includeSounds": true
  }
}
```

- `enabled`: Controls whether a collection is exported
- `include`: List of patterns for items to include (wildcards supported)
- `exclude`: List of patterns for items to exclude (wildcards supported)

## Cache Mechanism

The pipeline uses an efficient caching mechanism:

- **Shared Cache**: Located at `Content/collections`, shared by multiple exporters
- **Timestamps**: Track when content was last updated
- **ETags**: Detect when content has changed
- **Selective Fetching**: Only download content that is new or changed

## Schema and Type Conversion System

### Type Conversion Pattern

The pipeline implements a robust type conversion system to normalize polymorphic Internet Archive data into strict types for Unity:

```mermaid
flowchart TD
    A["Raw Data (Internet Archive)"] --> B["Shared Cache (Single Source of Truth)"]
    B --> C["Export Process (Apply Type Conversion)"]
    C --> D["Unity/TypeScript (Normalized Data)"]
    
    subgraph "Type Conversion"
    E["null/undefined → empty string or 0"]
    F["string array → joined string"]
    G["string → string array if needed"]
    H["Filter sensitive data"]
    end
```

1. **Raw Data** - Original Internet Archive metadata with polymorphic types:
   - Properties can be null, undefined, string, or array of strings
   - Descriptions can be missing, null, string, or array of strings
   - Collection IDs may include sensitive "fav-username" entries

2. **Normalized Data** - Cleaned data with strict typing for Unity/TypeScript:
   - String properties: null/undefined → empty string
   - Array properties: null/undefined → empty array, string → single-item array
   - Descriptions: array of strings → single string (joined with newlines)
   - Social data: "fav-username" entries are filtered out

### Schema Annotation

Zod schemas are annotated with converter information using the description field:

```typescript
title: z.string()
  .optional()
  .describe(`Title of the item
{"UnitySchemaConverter":"StringOrNullToStringConverter"}`), // Converter name in JSON metadata

description: z.union([z.string(), z.array(z.string())])
  .optional()
  .describe(`Description of the item
{"UnitySchemaConverter":"StringOrArrayOrNullToStringConverter"}`),

collection: z.union([z.string(), z.array(z.string())])
  .optional()
  .describe(`Collections this item belongs to.
{"UnitySchemaConverter":"StringArrayOrNullToStringArrayConverter"}`),
```

### Type Converter Naming

Converters follow a descriptive naming convention:

- `StringOrNullToStringConverter` - Converts null/undefined/string to string
- `StringArrayOrNullToStringArrayConverter` - Converts null/undefined/string/array to string array
- `StringOrArrayOrNullToStringConverter` - Converts null/undefined/string/array to string

### Schema Export Process

The schema-export.js script:
1. Reads Zod schemas from TypeScript files
2. Extracts converter names from `.describe()` annotations
3. Injects these names into `x_meta` properties in JSON Schema
4. Writes the JSON Schema files to Unity's schema directory

```typescript
// Example of exported JSON Schema with x_meta properties
{
  "type": "object",
  "properties": {
    "title": {
      "type": ["string", "null"],
      "description": "Title of the item",
      "x_meta": {
        "UnitySchemaConverter": "StringOrNullToStringConverter"
      }
    },
    "description": {
      "anyOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" } },
        { "type": "null" }
      ],
      "description": "Description of the item",
      "x_meta": {
        "UnitySchemaConverter": "StringOrArrayOrNullToStringConverter"
      }
    }
  }
}
```

### Unity C# Code Generation

The Unity SchemaGenerator:
1. Reads JSON Schema files with `x_meta` properties
2. Generates C# classes with appropriate JsonConverter attributes
3. These converters implement the type conversion logic in C#
4. Generated C# classes include appropriate property types and converters

```csharp
// Example of generated C# class with JsonConverter attributes
public partial class Item : SchemaGeneratedObject
{
    [JsonProperty("title")]
    [JsonConverter(typeof(StringOrNullToStringConverter))]
    public string Title { get; set; }

    [JsonProperty("description")]
    [JsonConverter(typeof(StringOrArrayOrNullToStringConverter))]
    public string Description { get; set; }

    [JsonProperty("collection")]
    [JsonConverter(typeof(StringArrayOrNullToStringArrayConverter))]
    public List<string> Collection { get; set; }
}
```

### TypeScript Implementation

In the SvelteKit application, similar converters are implemented for client/server code:

```typescript
// Example TypeScript converter implementation
export function stringOrNullToString(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value;
}

export function stringArrayOrNullToStringArray(
  value: string | string[] | null | undefined
): string[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function stringOrArrayOrNullToString(
  value: string | string[] | null | undefined
): string {
  if (value === null || value === undefined) return '';
  return Array.isArray(value) ? value.join('\n') : value;
}
```

### Cover Image Handling

The pipeline also processes cover images:
1. Downloads cover images to `Content/collections/{collectionId}/items/{itemId}/cover.jpg`
2. Measures image dimensions
3. Adds `coverWidth` and `coverHeight` properties to item.json
4. During export, copies these images to Unity

## Pipeline Commands

```
pipeline:bootstrap  # Generate skeleton whitelist from existing Unity content
pipeline:pull       # Pull content from Internet Archive to cache
pipeline:export     # Export content from cache to Unity
pipeline:run        # Run the complete pipeline (bootstrap, pull, export)
```

Run the full pipeline:
```
node scripts/pipeline.js run
```

Run specific phases:
```
node scripts/pipeline.js bootstrap
node scripts/pipeline.js pull
node scripts/pipeline.js export
```

Options:
- `--verbose` or `-v`: Enable detailed logging
- `--clean`: Clean destination directories before operation
- `--force` or `-f`: Force operation, overwriting existing files

## Key Principles

1. **Pull-Based Architecture**: Configuration-driven pull from source to cache to target
2. **Shared Caching Layer**: Multiple exporters can share the same content cache
3. **Efficient Updates**: Use timestamps and ETags for optimized caching
4. **1:1 Filesystem Mapping**: Directory structure mirrors JSON structure
5. **Separation of Concerns**: Clear distinction between bootstrap, pull, and export phases
6. **Type Conversion System**: Normalizes polymorphic data to strict types
7. **Schema-Driven Generation**: Automatically generates C# code with proper converters

## Pipeline Flow

```mermaid
flowchart TD
    A[Start] --> B[Bootstrap Phase]
    B --> C[Pull Phase]
    C --> D[Export Phase]
    D --> E[End]
    
    subgraph Bootstrap
    B1[Read existing Unity content]
    B2[Generate skeleton whitelist]
    end
    
    subgraph Pull
    C1[Read skeleton whitelist]
    C2[Fetch from Internet Archive]
    C3[Store in shared content cache]
    C4[Download & measure cover images]
    end
    
    subgraph Export
    D1[Read content from cache]
    D2[Apply type conversions]
    D3[Filter sensitive data]
    D4[Copy to Unity StreamingAssets]
    D5[Generate enhanced index files]
    end
```

## Implementation

The pipeline is implemented as a set of Node.js scripts in the `Scripts` directory:

- `pipeline-bootstrap.js`: Generate the skeleton whitelist
- `pipeline-pull.js`: Pull content from Internet Archive to cache
- `pipeline-export.js`: Export content from cache to Unity
- `pipeline-run.js`: Run the complete pipeline

These scripts are invoked via npm commands defined in `package.json`. 