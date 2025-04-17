# Schema Generator

FILE PATH: Unity/CraftSpace/Assets/Editor/SchemaGenerator/README.md

## CRITICAL WARNINGS - PLEASE READ

**THIS FILE DOCUMENTS THE SCHEMA GENERATOR**
* DO NOT EDIT GENERATED SCHEMA FILES!
* ONLY EDIT THE GENERATOR AND THIS DOCUMENTATION
* GENERATED FILES PATH: Unity/CraftSpace/Assets/Scripts/Schemas/Generated/

## ABSOLUTELY FORBIDDEN TECHNIQUES

1. **NEVER USE REFLECTION-BASED JSON.NET METHODS OR ATTRIBUTES**:
   - ⛔ `JToken.ToObject<T>()` - **CRASHES** IN WEBGL/IL2CPP
   - ⛔ `JToken.FromObject(obj)` - **CRASHES** IN WEBGL/IL2CPP
   - ⛔ `JsonConvert.DeserializeObject<T>(json)` when T is a user-defined class/struct (risk of reflection/stripping) - **CRASH RISK**
   - ⛔ `JsonConvert.SerializeObject(obj)` when obj is a user-defined class/struct - **CRASH RISK**
   - ⛔ `[JsonProperty]` attribute - **FORBIDDEN** (reflection-based)
   - ⛔ `[JsonConverter]` attribute - **FORBIDDEN** (reflection-based activation)
   - ⛔ Any method or attribute that uses .NET reflection on types during runtime serialization/deserialization.
   
2. **ALWAYS USE DIRECT ACCESS METHODS INSTEAD**:
   - ✅ Direct property assignment: `obj.Property = token.Value<Type>()` or explicit casts like `(int)token`.
   - ✅ Manual iteration for lists/arrays.
   - ✅ Direct type checking: `token.Type == JTokenType.X`.
   - ✅ Direct manual construction of `JObject`/`JArray` for export.
   
3. **FOR CONVERTERS**:
   - ✅ Define specific, IL2CPP-safe `JsonConverter` classes (like `StringOrNullToStringConverter`) that **DO NOT USE REFLECTION INTERNALLY**.
   - ✅ Call these converters **DIRECTLY** in the generated code using specific methods (e.g., `new ConverterName().ReadJson(token)`), **NOT** via `[JsonConverter]` attribute or general `JsonConvert` methods.
   - ⛔ Never use generic reflection-based converters.

## IMPORTANT WORKFLOW FOR ALL SCHEMA-RELATED ISSUES:

1. NEVER modify generated schema files directly (*.Schema.cs)
2. ALWAYS fix the SchemaGenerator.cs first
3. ONLY THEN regenerate all schemas using CraftSpace > Import All Schemas
4. Use proper extension classes (Item.cs, Collection.cs) for custom code
5. Keep extension classes THIN and use the base class for shared functionality

## PROPER CODE ORGANIZATION:

- Schema Generator (this directory) - EDIT THIS
- SchemaGeneratedObject.cs - Base class for all schemas
- Generated/*Schema.cs - AUTO-GENERATED, DO NOT EDIT!!!
- Item.cs, Collection.cs - Thin extensions for custom code

## Features

- Schema metadata driven type converters
- Generates explicit C# properties (no reflection)
- Direct JObject storage for extra fields
- No dynamic access or type conversion
- No namespaces or extra assemblies
- Simple and maintainable code
- IL2CPP-safe string normalization via custom converters

## Annotation Workflow (The Description Hack)

**IMPORTANT:** Due to limitations with `zod-to-json-schema` correctly preserving Zod's `.meta()` data, we employ a workaround using specially formatted descriptions in the Zod schemas.

1.  **Define Metadata in Zod Description:** In your Zod schema definitions (`collection.ts`, `item.ts`), append metadata as a **JSON string on a new line** within the `.describe()` call for the relevant property.

    ```typescript
    // Example from item.ts
    id: z.string()
      .min(1)
      .describe(`Unique identifier for the item
{"UnitySchemaConverter":"StringOrNullToStringConverter"}`), // <-- Namespaced key used
    
    creator: z.union([z.string(), z.array(z.string())])
      .describe(`Creator/author of the item (can be a string or array of strings)
{"UnitySchemaConverter":"StringOrArrayOrNullToStringConverter"}`), // <-- Namespaced key used
    ```
    **Note for Zod Schema Consumers:** Tools consuming the raw Zod types directly (e.g., within the SvelteKit app) should be aware that only the *first line* of the description is the intended human-readable description. The subsequent line containing JSON is metadata for the export pipeline.

2.  **Export Schemas:** Run `npm run schema:export` in the `SvelteKit/BackSpace` directory.

3.  **Parse Description and Inject Metadata:** The `schema-export.js` script:
    *   Uses `zod-to-json-schema` to get the initial JSON schema (including the multi-line descriptions).
    *   Iterates through each property in the generated schema.
    *   Looks for a newline (`\n`) in the `description` string.
    *   If found, it attempts to `JSON.parse()` the text *after* the last newline.
    *   If parsing succeeds, it injects the entire parsed JSON object into a new `x_meta` field in the property's schema and cleans the `description` field.
    *   Outputs the processed JSON schema files (`Collection.json`, `Item.json`) **directly** to the SSOT location: `StreamingAssets/Content/schemas`.

    ```json
    // Example snippet from processed Item.json in StreamingAssets/Content/schemas
    "id": {
      "type": "string",
      "minLength": 1,
      "description": "Unique identifier for the item", 
      "x_meta": {                           
        "UnitySchemaConverter": "StringOrNullToStringConverter" // <-- Namespaced key present
      }
    }
    ```

4.  **Generate C# Code:** In Unity, use the `CraftSpace > Schema Generator` window or run `npm run unity:regenerate-schemas` from BackSpace. The `SchemaGenerator.cs` script reads the processed `*.json` schema files **directly** from `StreamingAssets/Content/schemas`.

## String Handling Converters

The generator recognizes the following converter names (defined in `SchemaConverters.cs` and referenced via the `UnitySchemaConverter` key in `x_meta`):

1.  **Required String** (default):
    - No `x_meta.UnitySchemaConverter` needed.

2.  **`StringOrNullToStringConverter`**:
    ```json
    // Schema excerpt
    "title": {
      "type": "string",
      "description": "...",
      "x_meta": { "UnitySchemaConverter": "StringOrNullToStringConverter" }
    }
    ```
    - C# Type: `string`
    - Generates code calling `StringOrNullToStringConverter.ReadJson/WriteJson`.

3.  **`StringOrArrayOrNullToStringConverter`**:
    ```json
    // Schema excerpt
    "description": {
      "type": "string", 
      "description": "...",
      "x_meta": { "UnitySchemaConverter": "StringOrArrayOrNullToStringConverter" }
    }
    ```
    - C# Type: `string`
    - Generates code calling `StringOrArrayOrNullToStringConverter.ReadJson/WriteJson`.

4.  **`ArrayOrNullToStringArrayConverter`**:
    ```json
    // Schema excerpt
    "tags": {
      "type": "array", 
      "items": { "type": "string" },
      "description": "...",
      "x_meta": { "UnitySchemaConverter": "ArrayOrNullToStringArrayConverter" }
    }
    ```
    - C# Type: `string[]`
    - Generates code calling `ArrayOrNullToStringArrayConverter.ReadJson/WriteJson`.

## IL2CPP & WebGL Constraints

The generator is designed around IL2CPP and WebGL constraints:

1. **NEVER USE REFLECTION**: IL2CPP strips unused methods in WebGL builds, causing ALL reflection-based code to CRASH AT RUNTIME. Instead:
   - ❌ NEVER use `ToObject<T>()` - The app WILL crash in WebGL (not just in the editor)
   - ❌ NEVER use `FromObject(obj)` - The app WILL crash in WebGL
   - ✅ Use explicit properties with direct assignment
   - ✅ Use explicit conversion with type checking
   - ✅ Use switch statements for property checking

2. **No Dynamic**: `DynamicObject` and `ExpandoObject` don't work reliably in IL2CPP. We use:
   - `JObject` for dynamic storage
   - Explicit property access for known fields
   - Direct `JObject` manipulation for extra fields

3. **No Type Generation**: Runtime type generation doesn't work in IL2CPP. We:
   - Generate all code at edit time
   - Use explicit types only
   - No runtime code compilation

## JSON.NET Usage

We use a minimal subset of JSON.NET features that work well in WebGL. The `SchemaGeneratedObject` base class and the explicit code generated by this tool work together to **replace** JSON.NET's reflection-based serialization/deserialization for user-defined types, ensuring IL2CPP/WebGL compatibility.

1. **ALLOWED - JObject/JToken for access & parsing**:
   - ✅ `JObject` for structured data (used by the base class).
   - ✅ `JObject.Parse(json)` - Used by the base class to get the initial object.
   - ✅ `JToken.ToString()` for string conversion.
   - ✅ Direct type checking: `token.Type == JTokenType.X`.
   - ✅ Direct casting: `(int)token`, `(float)token`.
   - ✅ Direct accessors: `json["propertyName"]`.
   - ✅ `JToken.Value<T>()` ONLY for primitive types (string, int, float, bool).

2. **FORBIDDEN - Reflection Methods and Attributes at Runtime**:
   - ❌ `JToken.ToObject<T>()` - **WILL CRASH IN WEBGL**
   - ❌ `JToken.FromObject(obj)` - **WILL CRASH IN WEBGL** (except for primitives/basic types).
   - ❌ `JsonConvert.DeserializeObject<T>(json)` - **AVOID** for user-defined types.
   - ❌ `JsonConvert.SerializeObject(obj)` - **AVOID** for user-defined types.
   - ❌ `[JsonProperty]` attribute - **FORBIDDEN**.
   - ❌ `[JsonConverter]` attribute - **FORBIDDEN**.
   - ❌ Any other attribute-based serialization/deserialization.

3. **Custom Converters Only (Called Directly by Generated Code)**:
   - ✅ Define specific, IL2CPP-safe `JsonConverter` classes.
   - ✅ Implement static `ReadJson(JToken)` and `WriteJson(Value)` helper methods within converters.
   - ✅ Generator outputs **direct calls** to these static methods based on `x_meta.UnitySchemaConverter`.
   - ❌ Do not rely on attributes or `JsonConvert` methods to invoke converters at runtime.

## Usage

1.  Define/update Zod schemas in `SvelteKit/BackSpace/src/lib/schemas` using `.meta()` for annotations.
2.  Run `npm run schema:export` in `SvelteKit/BackSpace` directory.
3.  Ensure exported `*.json` files are present in `Unity/CraftSpace/Assets/StreamingAssets/Content/schemas`.
4.  Open the Unity generator window: `CraftSpace > Schema Generator`.
5.  Click "Import All Schemas".
6.  Generated classes appear in `Assets/Scripts/Schemas/Generated`.

## CI/CD Integration

The schema generator can be run from the command line using Unity's batch mode:

```bash
# Windows
Unity.exe -batchmode -quit -executeMethod SchemaGenerator.ImportAllSchemas -projectPath "path/to/project"

# macOS
/Applications/Unity/Unity.app/Contents/MacOS/Unity -batchmode -quit -executeMethod SchemaGenerator.ImportAllSchemas -projectPath "path/to/project"

# Linux
unity -batchmode -quit -executeMethod SchemaGenerator.ImportAllSchemas -projectPath "path/to/project"
```

Add to your CI/CD pipeline:
1. Place schema files in `StreamingAssets/Content/schemas`
2. Run Unity in batch mode with `ImportAllSchemas`
3. Generated code will be in `Assets/Scripts/Schemas/Generated`
4. Commit or use the generated files as needed

## Supported Types

Basic types:
- `string` -> `string` (normalization handled by converters specified in `x_meta`)
- `number` -> `float`
- `integer` -> `int`
- `boolean` -> `bool`
- `array` -> `List<T>` (if items schema is simple) or `string[]` (if `ArrayOrNullToStringArrayConverter` is used)
- `object` -> Specific generated class or `JObject` for `extraFields`.

## Limitations

1. **No Runtime Type Generation**:
   - All schemas must be processed at edit time
   - No dynamic schema loading in builds
   - No runtime property generation

2. **Limited Type Support**:
   - Only basic types and arrays
   - Dates handled as strings
   - No complex type conversion

3. **No Reflection Features**:
   - No dynamic member access
   - No type introspection
   - No attribute-based behavior

4. **JSON.NET Constraints**:
   - Limited to JObject/JToken usage
   - No LINQ to JSON
   - No dynamic deserialization
   - Only string normalization converters 

## Extra Fields Handling

Any properties present in the JSON data that are *not* explicitly defined in the corresponding `properties` section of the JSON Schema are considered "extra fields".

*   The base class `SchemaGeneratedObject` automatically stores these fields in a `protected JObject extraFields` dictionary.
*   The `ImportExtraFields` method (called during `ImportFromJson`) iterates through the incoming JSON and adds any unrecognized properties to this dictionary.
*   The `ExportExtraFields` method (called during `ExportToJson`) writes the contents of the `extraFields` dictionary back into the outgoing JSON.
*   This preserves unknown or deprecated fields during a read-modify-write cycle.
*   **Inspector Visibility:** Currently, the `extraFields` JObject is **not** easily viewable or editable in the standard Unity Inspector. See the TODO section for potential future enhancements.

## TODO / Future Enhancements

*   **Schema-Aware Custom Editor for JSON Data:** Create a generalized custom Unity Editor system for `MonoBehaviour` and `ScriptableObject` components.
    *   **Target:** Any component holding `Newtonsoft.Json.Linq` types (`JObject`, `JToken`, `JArray`). Identification could use custom attributes (e.g., `[InspectAsJson(SchemaName = "optional_schema")]`) or interfaces.
    *   **Functionality:** When inspecting a component with such fields:
        *   Read an associated JSON schema file if specified (via attribute or convention).
        *   Use schema metadata (`x_editor` [example name], `description`, `type`) to dynamically generate a user-friendly Inspector UI for the JSON data, mimicking standard Unity decorators and controls (Headers, Tooltips, Sliders, Color Pickers, etc.).
        *   Implement custom controls (sliders, color pickers) based on schema metadata (e.g., `x_editor: { "UnityEditorHint": "slider", "min": 0, "max": 10 }`).
        *   Re-implement the visual behavior of standard Unity decorators (`[Header]`, `[Space]`, `[Tooltip]`) based on schema metadata (e.g., `x_editor: { "UnityEditorHeader": "Display Settings", "UnityEditorTooltip": "..." }`).
        *   Offer a fallback generic tree view for `JObject`/`JToken` fields that don't have an associated schema.
    *   **Scope:** This applies not only to the `extraFields` in `SchemaGeneratedObject` but potentially to *any* component within the bridge system interacting with `JObject`/`JToken` data, offering a unified way to inspect and manage JSON-related state in the editor.
*   **Schema Validation:** Implement optional validation during `ImportFromJson` against the original schema to warn about or reject data that doesn't conform.
*   **Performance Profiling:** Analyze performance for very large JSON files or frequent deserialization/registry lookups.
*   **Error Handling:** Add more granular error reporting or recovery options during parsing/import and registry operations.
*   **Nested Schema Objects:** Currently assumes simple property types or arrays of simple types. Generating code for properties that are themselves complex schema objects (nested structures) would require recursive generation logic in the C# generator and potentially recursive handling in the custom editor. 