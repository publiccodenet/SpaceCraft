# CraftSpace Schema System

This document explains the schema system used in CraftSpace, which provides type-safe data models across JavaScript and Unity with automatic code generation.

## Schema Pipeline Overview

CraftSpace uses a multi-stage schema pipeline that ensures type safety and consistency:

```
[TypeScript Zod Schema] → [JSON Schema] → [Generated C# Classes] → [Extended Unity Classes]
```

This pipeline provides several key benefits:
- **Single Source of Truth**: Defines data structures in one place
- **Type Safety**: Strong typing in both TypeScript and C#
- **Automatic Generation**: Reduces manual code and errors
- **Cross-Platform Consistency**: Same structures across all platforms
- **Schema Evolution**: Handles backward compatibility
- **Simplified Runtime**: Direct property assignment without converters in Unity

## Schema Generation Process

### 1. TypeScript Schema Definition (BackSpace)

Schemas are defined using Zod in the BackSpace TypeScript codebase in the `SvelteKit/BackSpace/src/lib/schemas/` directory.

### 2. JSON Schema Generation

TypeScript schemas are converted to standard JSON Schema format using `npm run schemas:generate-all` and saved to `Unity/CraftSpace/Assets/StreamingAssets/Content/schemas/`.

### 3. C# Class Generation

C# classes are generated from the JSON Schema files using the Schema Importer in Unity (CraftSpace > Import All Schemas).

### 4. Unity Extension Classes

The generated classes are extended with Unity-specific functionality through inheritance (Item extends ItemSchema, etc).

## Schema Types

### Key Models

1. **Collection**: Group of related items
   - **Properties**: id, title, description, creator, etc.
   - **Relationships**: Contains items

2. **Item**: Individual content item
   - **Properties**: id, title, description, creator, date, etc.
   - **Relationships**: Belongs to collection

### Note on Content Pipeline

The schema system defines data structures, but actual data normalization happens separately:

1. The Content Pipeline's IMPORTER normalizes fields from Internet Archive to be monomorphic (consistent types)
2. The IMPORTER doesn't strip unneeded fields - it preserves all data
3. The Unity EXPORTER strips unneeded fields when preparing data for Unity
4. The schema system in Unity now uses direct property assignment without converters

## SchemaGeneratedObject Base Class

The `SchemaGeneratedObject` class provides core functionality for all schema objects:

### 1. JSON Serialization

The base class provides methods for serializing objects to JSON and back.

### 2. Extra Fields Mechanism

The `extraFields` property preserves undefined properties during serialization/deserialization.

### 3. Model-View Communication

The base class implements view registration and notification through a simple observer pattern.

## View System

The view system uses a generic interface to maintain type safety, with models notifying their views when data changes.

## Directory Structure

```
Assets/
├── StreamingAssets/
│   └── Content/
│       └── schemas/          # JSON Schema files
│           ├── Collection.json
│           └── Item.json
│
└── Scripts/
    └── Schemas/
        ├── Generated/        # Auto-generated C# classes
        │   ├── CollectionSchema.cs
        │   └── ItemSchema.cs
        ├── SchemaGeneratedObject.cs  # Base class
        ├── Collection.cs     # Extended classes
        ├── Item.cs
        └── SchemaConverter.cs  # Type converters
```

## Best Practices

1. **Never Edit Generated Files**
   - If changes are needed, modify the source TypeScript schemas
   - Regenerate the C# classes using the Schema Importer

2. **Extend, Don't Modify**
   - Add functionality through inheritance rather than modifying base classes
   - Keep generated classes isolated from Unity-specific code

3. **Proper View Registration**
   - Always unregister views when they're destroyed
   - Use the `NotifyViewsOfUpdate()` method when model data changes

4. **Extra Fields Usage**
   - The `extraFields` property preserves fields not defined in the schema
   - Don't directly access `extraFields` - it's an implementation detail

5. **JSON Serialization**
   - Use `ExportToJson()` for consistent serialization
   - Handle nulls and missing fields appropriately in converters

## Schema Evolution

When schemas change:

1. Update TypeScript Zod schemas in BackSpace
2. Run schema generation and copy to Unity
3. Run the Schema Importer in Unity
4. Test that JSON serialization/deserialization still works
5. Update view code as needed 

## ‼️ CRITICAL WARNINGS - READ BEFORE TOUCHING ANY SCHEMA CODE ‼️

### FORBIDDEN PATTERNS THAT WILL CRASH IN IL2CPP/WEBGL

1. **UNSAFE REFLECTION PATTERNS**
   - ❌ `Type.GetType(string)` to resolve user-defined types at runtime - WILL CAUSE INFINITE RECURSION
   - ❌ `Activator.CreateInstance(Type)` for user-defined types - WILL CRASH
   - ❌ Any type resolution or instance creation from string names at runtime
   - ❌ Abstract factories that look up types by name

2. **SAFE REFLECTION PATTERNS**
   - ✅ Direct, simplified property assignment without converters
   - ✅ Reflection used at design/edit time only (code generation)
   - ✅ `GetType()` to get the runtime type of an existing object
   - ✅ `typeof()` operator which is resolved at compile time
   - ✅ Direct property/field access via `FieldInfo`/`PropertyInfo` that were cached at startup

3. **CODE GENERATION IS FOR GENERATING ACTUAL CODE, NOT LOOKUP MECHANISMS**
   - ❌ Generating code that says `var converter = UnitySchemaConverter.GetConverter("TypeName")`
   - ❌ Generating code that says `var converter = new ExactTypeNameConverter()`
   - ✅ Generating code with direct property assignment: `_id = json["id"].ToString()`
   - ✅ Zero indirection, lookup, or converter usage for known types

### IL2CPP COMPATIBILITY RULES

1. **CODE STRIPPING WILL REMOVE UNREFERENCED TYPES**
   - Classes only referenced via reflection will be stripped
   - Direct references ensure code is preserved in the build
   - Avoid reflection-based lookups entirely

2. **STACK OVERFLOWS IN WEBGL CANNOT BE CAUGHT**
   - Infinite recursion in type lookup will crash the entire application
   - No error handling or recovery is possible

3. **SIMPLIFIED PROPERTY HANDLING PATTERN**
   ```csharp
   // CORRECT: Code generator produces direct assignment
   protected override void ImportKnownProperties(JObject json)
   {
       if (json["id"] != null)
       {
           // Direct assignment - no converters, no reflection
           _id = json["id"].ToString();
       }
   }
   ```

4. **WORKING WITH JSON.NET SAFELY IN IL2CPP/WEBGL**
   - ✅ Using the low-level JObject/JToken/JArray API with direct assignment
   - ✅ Using `JToken.FromObject()` for exporting properties
   - ✅ `JsonConvert.SerializeObject()` and `DeserializeObject()` for primitive types
   - ❌ Avoid attribute-based [JsonConverter] on user-defined types
   - ❌ Avoid dynamic type resolution via TypeNameHandling settings
   - ❌ Avoid JsonConverter instances instantiated from string names

5. **EDITOR VS WEBGL DIFFERENCES**
   - Just because it works in the editor doesn't mean it will work in WebGL
   - WebGL builds run with more aggressive code stripping
   - Testing in WebGL builds is essential

6. **SIMPLIFIED DATA HANDLING**
   - The schema system now uses direct property assignment without converters
   - This greatly simplifies the Unity runtime and reduces IL2CPP compatibility issues
   - All type checking and validations should be done in the data import phase
