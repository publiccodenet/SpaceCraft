# Generated Schema Classes

This directory contains C# classes automatically generated from JSON schemas. **DO NOT EDIT** these files directly as your changes will be overwritten.

## Schema Pipeline

1. **JSON Schemas** are generated from TypeScript types in BackSpace and placed in:
   ```
   Assets/StreamingAssets/Content/schemas/*.json
   ```

2. **C# Classes** are generated from these JSON schemas and placed in:
   ```
   Assets/Scripts/Schemas/Generated/*.cs
   ```

## How to Generate

### 1. JSON Schema Files
From BackSpace TypeScript types to Unity StreamingAssets:
```bash
# In the BackSpace directory:
npm run schema:generate-all
```
This will:
1. Generate JSON schemas from TypeScript types using Zod
2. Copy them to `Unity/CraftSpace/Assets/StreamingAssets/Content/schemas`

### 2. C# Classes
From JSON schemas to C# classes:
1. Open Unity Editor
2. Click `Tools > Import JSON Schema` in the menu or use the Schema Generator window

This will:
1. Read schemas from `StreamingAssets/Content/schemas`
2. Generate C# classes in this directory (`Scripts/Schemas/Generated`) with "Schema" suffix (e.g., `ItemSchema.cs`, `CollectionSchema.cs`)
3. Apply Unity-specific attributes and type converters
4. Generate proper ScriptableObject classes with full Inspector integration

## Schema Features

### Type Converters
The schema generator supports custom type converters for special field types:
- `StringOrStringArrayToString`: Handles fields that can be either string or string[]
- `StringOrNullToString`: Handles fields that might be null
- `NullOrStringToStringArray`: Converts nullable or string values to string arrays
- `StringToDateTime`: Handles date/time conversions
- `UnixTimestampToDateTime`: Converts Unix timestamps to DateTime
- `Base64ToBinary`: Handles base64 string/byte array conversion

### Unity Inspector Integration
Schemas can include Unity-specific attributes for better Inspector integration:
- Headers and tooltips
- Multiline text areas
- Range validation
- Spacing controls
- Field ordering
- Grouping
- Width and height
- Read-only and delayed input

### Type/Class Attributes
Schemas can also include Unity-specific type attributes:
- Custom icons
- Help URLs
- Menu paths
- Create asset menu customization
- Color coding

## Important Implementation Details

### The `extraFields` Mechanism

All schema classes automatically inherit an `extraFields` property from `SchemaGeneratedObject`. This special property:

1. **Is NOT defined in JSON/Zod schemas**: It only exists in the C# implementation
2. **Captures undefined properties**: Any property not explicitly defined in the schema is stored here
3. **Preserves all metadata**: Ensures no information is lost during serialization/deserialization
4. **Is transparent to users**: This is an implementation detail handled by the base class

### How `extraFields` Works

1. During `ImportFromJson()`:
   - The base class calls your class's `ImportKnownProperties()` to populate defined properties
   - Then it calls `ImportExtraFields()` to store any undefined properties in `extraFields`

2. During `ExportToJson()`:
   - Your class's `ExportKnownProperties()` populates a JObject with defined properties
   - Then the base class adds all entries from `extraFields` back to the JObject

This approach:
- Preserves all original data
- Handles evolving schemas and inconsistent field names
- Ensures backward compatibility
- Supports dynamic field access

### Model-View Communication

SchemaGeneratedObject also implements a robust Model-View pattern:

1. **View Registration**:
   - Models can register views via `RegisterView(object view)`
   - Models can unregister views via `UnregisterView(object view)`

2. **View Notification**:
   - Models notify views of changes via `NotifyViewsOfType<TView>(Action<TView> action)`
   - This enables type-safe notifications to specific view interfaces

3. **Implementation Pattern**:
   - Collection implements `NotifyViewsOfUpdate()` calling `NotifyViewsOfType<ICollectionView>()`
   - Item implements `NotifyViewsOfUpdate()` calling `NotifyViewsOfType<IItemView>()`
   - Views register with models via `model.RegisterView(this)`

This creates a clean separation between data and presentation while maintaining type safety.

## Base Class
All generated schema classes inherit from `SchemaGeneratedObject` (in the `CraftSpace` namespace), which provides:

### JSON Serialization/Deserialization
- `ExportToJson(bool prettyPrint = true)`: Serializes to JSON string with formatting option
- Automatic handling of defined and extra fields

### Model-View Communication
- `RegisterView(object view)`: Registers a view with this model
- `UnregisterView(object view)`: Unregisters a view from this model
- `GetViewsOfType<TView>()`: Gets all registered views of specific type
- `NotifyViewsOfType<TView>(Action<TView>)`: Notifies views of changes

### Other Functionality
- Dynamic field access
- Field name normalization
- Validation support
- Event notifications for field changes

## Source of Truth Flow
```
[BackSpace TypeScript] → [StreamingAssets JSON Schemas] → [Generated C# Classes]
```

## Requirements
- JSON Schema files must include a top-level `title` property (e.g., "Item", "Collection")
- The generator will append "Schema" to the class names (e.g., "ItemSchema", "CollectionSchema")
- Field types are automatically mapped to appropriate C# types
- System.Object is used for object types to avoid ambiguity with UnityEngine.Object

## Namespace Organization
Generated classes use the namespace `CraftSpace.Schemas.Generated` and are inherited by our main classes in the `CraftSpace` namespace.

## Usage Guidelines

1. **NEVER modify generated files**: If changes are needed, modify the schema generator or source schemas
2. **Use extension classes**: Add functionality in non-generated files like `Item.cs` and `Collection.cs`
3. **Treat extraFields as internal**: Don't directly access `extraFields` in your code, it's an implementation detail
4. **Use view registration pattern**: Register views with models and implement appropriate interfaces

## Regenerating Schemas

If schema definitions change:

1. Update Zod schemas in `SvelteKit/BackSpace/src/lib/schemas/*.ts`
2. Run `npm run schemas:regenerate:unity` from the BackSpace directory
3. Unity will automatically update the generated classes

## Troubleshooting

If you encounter errors in the generated code:

1. Never modify the generated files directly
2. Check and fix `SchemaGenerator.cs` first
3. Then regenerate the schema classes
4. If schema incompatibility issues persist, update the base class `SchemaGeneratedObject.cs` 