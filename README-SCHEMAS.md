# Schema System Overview

The schema system provides a robust, cross-platform data modeling solution ensuring type safety and consistency between TypeScript and Unity C# codebases.

## Core Components

### 1. Source of Truth (Zod Schemas)
- Located in `SvelteKit/BackSpace/src/lib/schemas/*.ts`
- Defines core data structures using Zod for TypeScript type safety
- Uses a "description hack" to embed metadata (like type converters) in property descriptions
- Handles variations in data formats (e.g., fields that can be strings or arrays)

### 2. Schema Export Pipeline
- `schema-export.js` converts Zod schemas to JSON Schema format
- Processes descriptions to extract metadata into `x_meta` fields
- Outputs processed JSON schemas to `Content/schemas` (SSOT)
- Maintains strict rules for runtime safety, especially for WebGL/IL2CPP compatibility

### 3. Unity Integration
- JSON schemas are copied to Unity's `StreamingAssets/Content/schemas`
- `SchemaGenerator.cs` generates C# classes from JSON schemas
- Generated classes avoid reflection-based serialization for WebGL compatibility
- Uses custom converters for type-safe string handling

## Key Features
- Type-safe data modeling across platforms
- Runtime validation at all levels
- WebGL/IL2CPP compatibility through careful code generation
- Metadata-driven type conversion
- Direct property access without reflection
- Support for complex types and nested structures

## Safety Rules
- No reflection-based JSON.NET methods in runtime code
  - **❌ AVOID**: `JsonConvert.DeserializeObject<T>()` 
  - **✅ USE**: `JToken.Parse()` with explicit type handling
- No attribute-based serialization
- Direct property access and type checking
- Custom converters for type-safe string handling
- Strict validation at all pipeline stages
- Test in WebGL builds before deploying

## Directory Structure
```
BackSpace/
└── src/
    └── lib/
        └── schemas/         # TypeScript schema definitions

Content/
└── schemas/                # Central JSON schema repository

Unity/CraftSpace/Assets/
├── Content/
│   └── Schemas/            # Unity copy of JSON schemas
├── Generated/
│   └── Schemas/            # Generated C# classes
└── Scripts/
    └── Models/
        └── Extensions/     # Unity extensions
```

## Schema Pipeline Flow
1. **Schema Definition**: Core data models defined using Zod in TypeScript
2. **Schema Export**: Zod schemas converted to standard JSON Schema format
3. **Schema Copy**: JSON Schema files copied to Unity project
4. **C# Generation**: SchemaImporter tool generates C# classes from JSON Schema
5. **Unity Integration**: Generated classes used in Unity for type-safe serialization

## Key Schema Models

### Collection Schema
- **id**: Unique identifier for the collection
- **name**: Display name of the collection
- **query**: Internet Archive query string
- **description**: Detailed collection description
- **totalItems**: Count of items in the collection
- **lastUpdated**: Timestamp of last update

### Item Schema
- **id**: Unique identifier for the item
- **title**: Display title of the item
- **creator**: Original creator/author
- **description**: Detailed item description
- **mediaType**: Type of media (text, video, audio, etc.)
- **date**: Publication or creation date
- **files**: Associated files for this item

## Best Practices
1. **Incremental Schema Changes**: Make small, incremental changes
2. **Documentation**: Document all schema changes in a changelog
3. **Test Coverage**: Ensure validation tests for all platforms
4. **Strict Validation**: Use stricter validation during development
5. **Schema Visualization**: Use tools like JSON Schema Viewer for visualization
6. **Follow Naming Conventions**: Be consistent with property naming
7. **Keep Schemas DRY**: Extract common patterns into reusable schema components
8. **Include Descriptions**: Add clear descriptions for each property
9. **WebGL-Safe JSON Parsing**: 
   - Avoid `JsonConvert.DeserializeObject<T>()` for WebGL builds
   - Use JToken-based parsing for safer cross-platform compatibility
   - Test WebGL builds early and often to catch reflection-related issues
   - Implement explicit type checking rather than relying on automatic type conversion
10. **Handle Internet Archive Metadata Gracefully**:
    - Use flexible JToken parsing for Internet Archive's variable metadata
    - Implement fallbacks for missing or malformed properties
    - Log warnings instead of throwing errors when encountering unexpected metadata

## Internet Archive Metadata Handling
1. **Field Categorization**:
   - Essential IA fields as top-level schema properties
   - Additional properties preserved in the C# implementation's `extraFields`
2. **Field Normalization**:
   - String fields normalized to always be strings
   - Array fields normalized to always be arrays
   - Optional fields have safe defaults
3. **Type Converters**:
   - `StringOrNullToString`: Handles null/undefined
   - `StringOrStringArrayToString`: Handles string/array variations
   - `NullOrStringToStringArray`: Ensures string arrays
   - `StringToDateTime`: Handles date/time conversions

## Extra Fields Implementation

The schema system provides a special mechanism for handling undefined properties in the Unity C# implementation:

1. **C# Implementation Only**:
   - `extraFields` only exists in the Unity C# side
   - It is **NOT** exposed in Zod schemas or JSON schemas
   - It's implemented as a JObject in the SchemaGeneratedObject base class

2. **Automatic Field Management**:
   - `ImportExtraFields()` captures any undefined fields from JSON
   - `ExportToJson()` includes both known properties and extraFields
   - This happens transparently without additional code

3. **Implementation Details**:
   - The SchemaGenerator ensures the `extraFields` property is handled correctly
   - Generated schema classes include special case handling for `extraFields`
   - The HasDefinedProperty method recognizes `extraFields` as a special case

This approach ensures that custom metadata fields from Internet Archive or other sources are preserved without cluttering the schema definition.

## Schema Update Workflow
1. Update Zod schema in `SvelteKit/BackSpace/src/lib/schemas/`
2. Run complete schema generation:
   ```bash
   cd SvelteKit/BackSpace
   npm run schema:generate-all
   ```
3. Open Unity and use `Tools > Import JSON Schema`
4. Update affected TypeScript code
5. Test validation across platforms

## Troubleshooting
1. Verify schemas directory exists:
   ```bash
   mkdir -p SvelteKit/BackSpace/schemas Content/schemas
   ```
2. Run debug scripts:
   ```bash
   npm run path:debug
   npm run schema:debug
   ```
3. For Unity issues:
   - Delete generated C# files
   - Restart Unity
   - Re-run import process

## Resources
- [Zod Documentation](https://zod.dev/)
- [JSON Schema](https://json-schema.org/)
- [NJsonSchema](https://github.com/RicoSuter/NJsonSchema)
- [JSON.NET](https://www.newtonsoft.com/json)
- [Ajv Validator](https://ajv.js.org/)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)

## Future Enhancements
1. **Schema-Aware Custom Editor**:
   - Generalized Unity Editor system for JSON data
   - Dynamic Inspector UI based on schema metadata
   - Custom controls based on schema hints
2. **Schema Validation**:
   - Optional validation during `ImportFromJson`
   - Warning/rejection of non-conforming data
3. **Performance Optimization**:
   - Async loading support
   - Improved caching strategies
   - Batch loading operations
4. **Developer Experience**:
   - Better error messages
   - Schema validation in editor
   - Visual schema designer

# Schema Documentation

This document describes the schema system used in the CraftSpace project.

# BackSpace Schema System

This document outlines the schema-driven development approach used in BackSpace, focusing on how we maintain type safety and data consistency across multiple platforms.

## Core Principles

- **Single Source of Truth**: JSON schemas define all data structures
- **Cross-Platform Compatibility**: Schema definitions flow to all platforms
- **Static Type Safety**: Auto-generated types in TypeScript and C#
- **Runtime Validation**: Consistent validation across environments
- **Developer Experience**: Streamlined workflow for schema evolution
- **Direct Integration**: No adapters or translation layers needed

## Schema Generation Workflow

BackSpace uses a clean, straightforward schema generation process:

1. **Define Schemas**: Create JSON schema definitions
2. **Generate C# Classes**: Run the schema importer to generate C# classes in the CraftSpace.Schema namespace
3. **Import in Unity**: Use Unity's "Tools > Import JSON Schema" menu to apply changes
4. **Extend in Unity**: Use partial classes to add Unity-specific functionality

### Workflow Steps in Detail

#### 1. Define Schemas

JSON schemas are defined and stored in:
```
SvelteKit/BackSpace/schemas/
```

Example schemas:
- `collection.json` - Collection schema
- `item.json` - Item schema

#### 2. Generate C# Classes

Run the schema importer from the BackSpace directory:

```bash
cd SvelteKit/BackSpace
npm run schema:generate-all
```

This command:
- Generates C# classes from JSON schemas
- Copies JSON schemas to central Content/schemas directory
- Copies JSON schemas to Unity's Content/Schemas directory

#### 3. Import in Unity

After generating the schemas and copying them to Unity:

1. Open Unity and refresh the project
2. Go to the menu: `Tools > Import JSON Schema`
3. C# classes are generated in `Assets/Generated/Schemas`
4. Refresh Unity again to see the new classes

#### 4. Extend with Unity Functionality

There are Unity integration focused subclasses of the dynamically generated classes CollectinSchema and ItemSchema called Collection and Item that have code for managing multiple views, cover images, and other unity integation tasks. Extend Unity functionality by modifying these classes (not subclassing or extending them).

### Directory Structure

```
BackSpace/
└── src/
    └── lib/
        └── schemas/         # TypeScript schema definitions

Content/
└── schemas/                # Central JSON schema repository

Unity/CraftSpace/Assets/
├── Content/
│   └── Schemas/            # Unity copy of JSON schemas
├── Generated/
│   └── Schemas/            # Generated C# classes
└── Scripts/
    └── Models/
        └── Extensions/     # Unity extensions
```

### Schema File Locations (Pipeline Flow)

This outlines the key locations and their roles in the schema pipeline, following the flow from definition to runtime use.

1.  **Zod Schemas (TypeScript - The Ultimate SSOT):**
    *   `SvelteKit/BackSpace/src/lib/schemas/*.ts`
    *   *Purpose:* Define the core data structures and embed metadata via the "description hack".

2.  **Exported JSON Schemas (SSOT for Unity & Other Consumers):**
    *   `Content/schemas/*.json` (Located at the project root)
    *   *Purpose:* Central repository for processed JSON Schemas derived from Zod. These are the direct output of the `schema:export` script and serve as the source for downstream processes like copying to Unity.

3.  **JSON Schemas (Unity Runtime Content):**
    *   `Unity/CraftSpace/Assets/StreamingAssets/Content/schemas/*.json`
    *   *Purpose:* A filtered mirror of the central `Content/schemas` directory, copied into the Unity project's `StreamingAssets` for runtime access and **used as the input for the C# Code Generator**. This copy step (managed outside the scripts detailed here for now) allows different targets (like Unity) to potentially use a subset of the available schemas.

4.  **C# Code Generator (Tool):**
    *   `Unity/CraftSpace/Assets/Editor/SchemaGenerator/SchemaGenerator.cs`
    *   *Purpose:* Reads processed JSON schemas from `StreamingAssets/Content/schemas` and generates the C# Schema classes. **Crucially, it generates explicit, reflection-free code for serialization/deserialization, designed to work hand-in-hand with the `SchemaGeneratedObject` base class and direct converter calls.**

5.  **Generated C# Schema Classes (Derived from JSON Schemas):**
    *   `Unity/CraftSpace/Assets/Scripts/Schemas/Generated/*Schema.cs`
    *   *Purpose:* Auto-generated C# representation of the schema data structure, inheriting from `SchemaGeneratedObject`. Contains the generated `ImportKnownProperties` and `ExportKnownProperties` methods. **DO NOT EDIT MANUALLY.**

6.  **C# Base Class (Foundation):**
    *   `Unity/CraftSpace/Assets/Scripts/Schemas/SchemaGeneratedObject.cs`
    *   *Purpose:* Provides the runtime framework for reflection-free serialization/deserialization (`ImportFromJson`, `ImportKnownProperties`, etc.), manages extra fields, provides the `ScriptableObject` base, and centralizes common logic like setting the Unity object name (`TypeName-Id`).

7.  **Manual C# Unity Integration Classes (e.g., `Collection`, `Item`):**
    *   `Unity/CraftSpace/Assets/Scripts/Schemas/*.cs`
    *   *Purpose:* Inherit from generated classes (`Item : ItemSchema`). These classes:
        *   Store lists of IDs for related objects (e.g., `private List<string> _itemIds;` populated from index files).
        *   Implement properties (e.g., `public IEnumerable<Item> Items { get; }`) whose getters perform on-demand lookups via the `ContentRegistry` (Brewster) using the stored IDs.
        *   Contain methods to load *index files* (e.g., `LoadItemIndex()`) which populate the ID lists, called by the registry.
        *   Add any other Unity-specific runtime logic or non-serialized fields (like `Texture2D cover`).

8.  **Central Content Registry (`Brewster`):**
    *   `Unity/CraftSpace/Assets/Scripts/Core/Brewster.cs`
    *   *Purpose:* Manages the runtime loading and caching of all schema-derived `ScriptableObject` instances.
        *   Maintains flat dictionaries (maps) per content type (e.g., `Dictionary<string, Collection> _loadedCollections`, `Dictionary<string, Item> _loadedItems`).
        *   Provides public static singleton instance methods to retrieve objects by ID (e.g., `GetCollection(string id)`, `GetItem(string itemId)`).
        *   Handles **on-demand loading**: If an object is requested but not in its dictionary, the registry:
            1.  Constructs the path to the object's JSON file in `StreamingAssets`.
            2.  Reads the JSON file.
            3.  Calls the static `FromJson` factory method for the corresponding type.
            4.  Adds the newly created `ScriptableObject` instance to the appropriate dictionary (cache).
            5.  Triggers necessary post-load actions (like `LoadItemIndex` for collections).
            6.  Returns the instance.
        *   Initializes by loading only the collection index (`collections-index.json`).

9.  **C# Converters:**
    *   `Unity/CraftSpace/Assets/Scripts/Bridge/BridgeJsonConverter.cs` (or similar).
    *   *Purpose:* Implement specific, IL2CPP-safe value conversion logic called directly by generated code (No change here).

### Schema Naming Convention

Schemas follow this naming convention:

1. JSON schema: `[Name].json` (e.g., `Collection.json`)
2. Generated C# class: `[Name].cs` (e.g., `Collection.cs`)
3. Unity extension: `[Name]Extensions.cs` (e.g., `CollectionExtensions.cs`)

### Key NPM Scripts (Run from `SvelteKit/BackSpace`)

These scripts automate parts of the schema definition, export, and Unity integration process:

*   **`npm run schema:generate:json`**: 
    *   Action: Reads Zod schemas, processes descriptions, and generates processed JSON Schema files (`*.json`) into the central `Content/schema/` directory.
*   **`npm run schemas:export:unity`**: 
    *   Action: Exports (copies) the processed JSON schema files from the central SSOT (`Content/schema/`) directory into the Unity project's `StreamingAssets/Content/schemas/` folder.
*   **`npm run schemas:prepare:unity`**: 
    *   Action: Orchestrates the full preparation of schemas needed by Unity *before* C# generation (runs `schema:generate:json` then `schemas:export:unity`).
*   **`npm run schemas:export`**: 
    *   Action: Top-level export command. For now, it defaults to preparing schemas for Unity (`schemas:prepare:unity`). Can be expanded later.
*   **`npm run schemas:regenerate:unity`**: 
    *   Action: Prepares the JSON schemas for Unity (`schemas:prepare:unity`) and then triggers the Unity C# code **regeneration** process (via `unity-automation.js` with the `regenerate-schemas` argument, assuming it executes `SchemaGenerator.GenerateSchemas_Commandline`). See Naming Conventions below.
*   **`npm run pipeline:schemas:unity`**: 
    *   Action: Convenience script to run the entire schema preparation and C# code regeneration pipeline for Unity (effectively calls `schemas:regenerate:unity`).

#### Naming Conventions & Factoring

The schema pipeline scripts follow these conventions:

*   **`schemas:*` prefix:** Used for scripts primarily dealing with the schema definition, processing, or movement *from* the Single Source of Truth (SSOT) perspective, or end-to-end schema pipeline tasks.
*   **`unity:*` prefix:** Used for scripts where the *final, critical action* takes place within the Unity environment (like C# regeneration or building the Unity project), *OR* for utility scripts focused solely on Unity interaction (like `unity:setup`).
*   **Prepare vs. Regenerate:** 
    *   `schemas:prepare:unity` includes all steps necessary to get the JSON files ready *for* Unity (Generation + Export/Copy).
    *   `schemas:regenerate:unity` includes the preparation step *and* the final C# code regeneration step inside Unity.

*Naming Rationale:* The script `schemas:regenerate:unity` is now grouped under `schemas:` because it represents the full end-to-end schema pipeline for Unity, even though the final step executes within the Unity environment. Utility scripts like `unity:setup` remain under the `unity:` prefix.

### Troubleshooting

If you encounter issues:

1. Verify the schemas directory exists:
   ```bash
   mkdir -p SvelteKit/BackSpace/schemas Content/schemas
   ```

2. Run the debug script to check paths:
   ```bash
   npm run path:debug
   ```

3. Check for schema errors:
   ```bash
   npm run schema:debug
   ```

4. If Unity doesn't recognize new schema changes:
   - Delete the generated C# files
   - Restart Unity
   - Re-run the import process

## Simple Schema Module

The Simple Schema Module provides a streamlined approach for using schema objects directly in Unity without complex adapters or compatibility layers.

### Overview

Located in `Assets/Scripts/Schema`, this module:
- Directly extends generated schema classes
- Provides clean, easy-to-use interfaces
- Simplifies data loading, serialization, and UI binding
- Eliminates the need for wrapper or adapter classes

### Key Components

#### 1. Schema Classes

Schema classes directly inherit from generated code while adding Unity-specific functionality.

#### 2. View System

The module includes a Model-View pattern for binding schema objects to UI components.

#### 3. Content Registry (Brewster)

The Brewster class acts as a central registry for all schema objects, managing:
- Loading objects from JSON
- Caching loaded objects
- Tracking relationships between objects
- Providing global access to all content

### Advantages

1. **Simplicity** - Direct inheritance with no complex adapter layers
2. **Performance** - No translation overhead between schema and Unity objects
3. **Type Safety** - Full type checking for all schema properties
4. **Unity Integration** - Schema objects are ScriptableObjects with Unity-specific extensions

### Directory Structure

```
Assets/Scripts/Schema/
├── Schema.cs            # Core schema classes and utilities
├── Examples/            # Example usage scripts
│   └── SimpleSchemaExample.cs
└── README.md            # Module-specific documentation
```

## Zod Schema Definition

[Zod](https://github.com/colinhacks/zod) serves as our primary schema definition tool, providing both TypeScript type generation and runtime validation.

### Key Features

- **TypeScript-First**: Automatic type inference for TypeScript
- **Runtime Validation**: Full validation at runtime
- **Schema Composition**: Build complex schemas from simpler ones
- **Documentation**: Schemas are self-documenting with descriptions
- **Meta Properties**: Support for additional metadata

### Schema Organization

```
src/lib/schemas/
├── collection.ts      - Collection schemas
├── item.ts            - Item schemas
├── export-profile.ts  - Export profile schemas
├── connector.ts       - Connector schemas
└── index.ts           - Re-exports all schemas
```

## TypeScript Integration

### Type Safety 

Zod generates TypeScript types for compile-time safety.

### Validation

Zod schemas provide runtime validation of data structures.

### Form Integration

Schemas can be integrated with form libraries for automatic validation.

## JSON Schema Export

We export Zod schemas to JSON Schema format for cross-platform use.

## Unity C# Integration

### JSON.NET Integration

The generated C# classes work seamlessly with JSON.NET.

### Unity-BackSpace Bridge Integration

The schema system works with our P/Invoke bridge for WebGL communication.

## Web/Client Integration

### Browser-Side Validation

For client-side validation, we can use [Ajv](https://github.com/ajv-validator/ajv) with our exported JSON schemas.

### SvelteKit API Validation

Server-side API endpoints use Zod for validation.

## Schema Update Workflow

When updating a schema:

1. Update the Zod schema definition in `SvelteKit/BackSpace/src/lib/schemas/`
2. Run the complete schema generation process:
   ```bash
   cd SvelteKit/BackSpace
   npm run schema:generate-all
   ```
   This will:
   - Export JSON Schemas to BackSpace schemas directory
   - Copy JSON Schemas to central Content/schemas directory
   - Copy JSON Schemas to Unity's Content/Schemas directory
   - Generate C# classes
3. Open Unity and go to `Tools > Import JSON Schema` to update C# classes
4. Update any affected TypeScript code
5. Test validation across all platforms

### Typical Schema Evolution Workflow

1. **Discussion Phase**: Discuss and document the needed schema changes
2. **Implementation**: Update Zod schema in TypeScript
3. **Testing**: Create tests for new schema validation
4. **Export**: Run the schema generation process
5. **Unity Import**: Import schemas in Unity and verify C# classes
6. **Integration**: Update any code that uses the schema
7. **End-to-End Testing**: Test the full data pipeline

## Schema Design Principles

* All schemas are defined using Zod for TypeScript type safety
* Use `id` in model properties to align with JSON
* Use camelCase for variable and parameter names: `collectionId`, `itemId`
* Use snake_case for function names that handle these IDs: `get_collection()`, `update_item()`
* Keep schemas focused on one responsibility/entity 
* Include detailed descriptions for all properties to auto-generate documentation
* Prefer composition over inheritance for schema reuse 

# Schema Pipeline Overview

This document outlines the end-to-end process for defining, exporting, and consuming data schemas within the CraftSpace project.

## Pipeline Steps

1. **Zod Schemas (TypeScript Source of Truth)**
   - Located in `SvelteKit/BackSpace/src/lib/schemas/*.ts`
   - Define core data structures and embedded metadata

2. **Export Script**
   - Converts Zod schemas to JSON Schema format
   - Processes descriptions and extracts metadata into `x_meta` fields
   - Outputs to central JSON schema repository

3. **JSON Schemas (Storage)**
   - Located in `Unity/CraftSpace/Assets/StreamingAssets/Content/schemas/`
   - Standard JSON Schema files with embedded metadata

4. **C# Code Generation**
   - Reads JSON schemas and generates corresponding C# classes
   - Creates type-safe, reflection-free code

5. **C# Schema Base Class**
   - `SchemaGeneratedObject` provides common functionality
   - Handles serialization/deserialization without reflection

6. **Unity Integration Classes**
   - Extend generated schema classes with Unity-specific features
   - Handle relationships between objects through ID-based references

7. **Content Registry (Brewster)**
   - Manages loading, caching, and relationships between objects
   - Provides global access to schema objects

## Runtime Architecture

Schema objects are managed using an ID-based registry pattern that provides:

- On-demand loading of objects
- Memory optimization
- Simple serialization/deserialization
- Clean handling of object relationships 

## Schema Implementation in Unity

### Accessing Schema Objects

The Brewster registry system provides a central point to access all schema objects:

```csharp
// Get a collection by its ID
Collection collection = Brewster.Instance.GetCollection("collectionId");

// Get an item by its ID (requires collection context)
Item item = Brewster.Instance.GetItem("collectionId", "itemId");
```

### WebGL/IL2CPP Compatibility

#### ⚠️ WARNING: Avoid Generic JsonConvert.DeserializeObject<T>

JSON.NET's generic deserialization methods like `JsonConvert.DeserializeObject<T>()` use heavy reflection that can cause **hard crashes in WebGL builds**. These methods often work in the Unity Editor but fail catastrophically at runtime in WebGL:

```csharp
// 🛑 AVOID THIS - Crashes in WebGL!
List<string> items = JsonConvert.DeserializeObject<List<string>>(jsonContent);
```

#### ✅ RECOMMENDED: Use JToken-Based Parsing

Instead, use the non-generic `JToken.Parse()` approach followed by explicit type handling:

```csharp
// ✅ WebGL-safe approach
JToken token = JToken.Parse(jsonContent);
if (token is JArray array)
{
    List<string> items = new List<string>();
    foreach (JToken item in array)
    {
        if (item.Type == JTokenType.String)
        {
            items.Add(item.Value<string>());
        }
    }
}
```

#### Benefits of JToken Approach:

1. **WebGL/IL2CPP Compatibility**: Minimal reflection, works reliably in WebGL builds
2. **Dynamic Type Handling**: Better for handling variable data structures
3. **Polymorphic Data**: Ideal for Internet Archive's diverse metadata formats
4. **Error Resilience**: More graceful handling of malformed JSON
5. **Direct JSON Model**: Stays closer to the raw JSON structure

### Schema Classes Design

The schema implementation follows a clear inheritance pattern:

1. `SchemaGeneratedObject` - Base abstract class with common functionality
2. `*Schema` classes - Generated code from JSON schemas (e.g., `CollectionSchema`, `ItemSchema`) 
3. Extension classes - Manual classes that extend the generated code (e.g., `Collection`, `Item`)

### Runtime Data Architecture

Schema objects are managed using an ID-based registry pattern:

- Objects are loaded on-demand when requested
- Relationships between objects are managed via IDs rather than direct references
- The Brewster registry maintains the object cache
- This approach optimizes memory usage and supports serialization/deserialization 