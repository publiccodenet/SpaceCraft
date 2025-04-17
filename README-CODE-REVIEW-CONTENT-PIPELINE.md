# Content Pipeline Review Notes

See the main [Project Code and Documentation Review](./README-CODE-REVIEW.md) file for overall context and the guiding prompt for this pipeline review.

## Content Pipeline Architecture Summary

The project employs a sophisticated, **schema-driven content pipeline** designed for type safety, flexibility, and cross-platform compatibility (SvelteKit/Node.js <-> Unity/WebGL). Its core philosophy centers around a **Single Source of Truth (SSOT)** for data models, defined using **Zod schemas** in TypeScript (`SvelteKit/BackSpace/src/lib/schemas/`). These Zod schemas are programmatically converted via `scripts/schema-export.js` into intermediate **JSON Schema** files (`Content/schema/`), which include crucial metadata (like `x_meta` hints for C# converters) derived from Zod descriptions.

Within Unity, a custom Editor tool (`Assets/Editor/SchemaGenerator/SchemaGenerator.cs`) consumes these JSON schemas to **generate C# classes** (`Assets/Scripts/Schemas/Generated/`). These generated classes inherit from a base class (`SchemaGeneratedObject.cs`) which handles common concerns like `INotifyPropertyChanged` and flexible **JSON deserialization** using Newtonsoft.Json (configured specifically for IL2CPP/WebGL constraints, heavily relying on `JToken`/`JObject`/`JArray` and avoiding reflection). This base class also crucially manages an `extraFields` dictionary, allowing the system to gracefully handle **polymorphic, evolving, or non-standard metadata** without breaking type safety for known fields.

These generated C# models are then often extended via **manual partial classes** (`Collection.cs`, `Item.cs`) to add Unity-specific logic or methods. The runtime content (e.g., `item.json`, `collection.json` files derived from IA or other sources) follows the structure defined by these schemas and is accessed within Unity via the `StreamingAssets` folder, often using pre-generated `index.json` files for efficient loading due to IL2CPP limitations.

The Unity application utilizes a **Model-View-Renderer (MVR)** pattern. Core systems like `Brewster.cs` manage repositories of these data models (often indexed by ID). The **View** layer (`CollectionView.cs`, `ItemView.cs`, implementing `IModelView.cs`) is responsible for representing these models visually. Views are often configured as **prefabs** for editor-friendliness and instantiated dynamically by systems like `ViewFactory.cs`. These views are designed to be **data-driven**, updating their state based on changes in the underlying C# model. Specific visual aspects are delegated to **Renderer** components (`SingleImageRenderer.cs`, etc.), promoting composability. Critically, the instantiation, configuration, and data binding of these Unity view components can often be driven dynamically by **JavaScript code** running in the browser, communicating via the Bridge, allowing for flexible, runtime-defined layouts and content presentation based on the centrally managed schemas and data.

---

## Detailed Content Pipeline Review

This section provides a more in-depth look at the key components of the content pipeline, focusing on their individual roles and how they interact to transform data from its source definition to its runtime representation in Unity.

**1. Source of Truth: Zod Schemas (TypeScript)**

*   **Files:**
    *   `SvelteKit/BackSpace/src/lib/schemas/collection.ts`
    *   `SvelteKit/BackSpace/src/lib/schemas/item.ts`
*   **Role:** These files define the canonical structure and types for the core data models (`Collection`, `Item`) using Zod. They are the **single source of truth**.
*   **Key Features & Interactions:**
    *   Uses Zod's fluent API for defining types, validation rules (e.g., `.string()`, `.array()`, `.optional()`), and relationships.
    *   Critically utilizes the `.describe()` method to embed **metadata strings**. These strings contain key-value pairs (e.g., `UnitySchemaConverter=DateTimeConverter`) that are *specifically intended* to be parsed later in the pipeline to guide C# code generation. This is the primary mechanism for injecting Unity-specific generation hints into the platform-agnostic schema definition.
    *   May use `.passthrough()` to allow fields not explicitly defined in the schema, providing flexibility but requiring careful handling downstream (particularly in the C# base class's `extraFields` mechanism).
    *   Serves as input for the `schema-export.js` script.

**2. Schema Transformation: Export Script (Node.js)**

*   **File:** `SvelteKit/BackSpace/scripts/schema-export.js`
*   **Role:** Transforms the Zod schemas (TypeScript source) into an intermediate JSON Schema format (`.json` files). This script bridges the gap between the TypeScript type system and a more universal schema language usable by other tools (like the Unity C# generator).
*   **Key Features & Interactions:**
    *   Imports the Zod schemas from `src/lib/schemas/`.
    *   Uses the `zod-to-json-schema` library to perform the core conversion from Zod objects to JSON Schema objects.
    *   **Parses the `.describe()` strings** from the Zod schemas to extract the embedded key-value metadata.
    *   **Injects this extracted metadata** into the resulting JSON Schema under a custom `x_meta` property within relevant field definitions. This preserves the Unity-specific hints during the transformation.
    *   Writes the final JSON Schema objects, including the `x_meta` data, to `.json` files located in the **root** `Content/schema/` directory (Note: This differs from the runtime schemas in `StreamingAssets`). This output serves as the direct input for the Unity C# generator.

**3. Intermediate Format: Generated JSON Schemas**

*   **Files:**
    *   `Content/schema/Collection.json`
    *   `Content/schema/Item.json`
*   **Role:** These files represent the intermediate, language-agnostic definition of the data models, generated by `schema-export.js`. They contain all structural information plus the crucial `x_meta` hints needed for Unity code generation.
*   **Key Features & Interactions:**
    *   Standard JSON Schema structure (`type`, `properties`, `required`, `$defs`, etc.).
    *   Contains the `x_meta` property within specific field definitions, holding the metadata extracted from Zod `.describe()` calls.
    *   Act as the direct input consumed by the `SchemaGenerator.cs` Editor script in Unity.

**4. Unity Code Generation: Editor Tool (C#)**

*   **File:** `Unity/CraftSpace/Assets/Editor/SchemaGenerator/SchemaGenerator.cs`
*   **Role:** Runs within the Unity Editor (triggered via menu or potentially automated) to generate C# classes based on the intermediate JSON Schema files. Translates the abstract schema definition into concrete, usable C# types within the Unity project.
*   **Key Features & Interactions:**
    *   Reads the `.json` schema files from `Content/schema/`.
    *   Uses a JSON Schema parsing library (likely NJsonSchema or similar) to interpret the schema structure.
    *   Generates C# class files (`.cs`) corresponding to the schemas (e.g., `CollectionSchema.cs`, `ItemSchema.cs`) and places them in `Assets/Scripts/Schemas/Generated/`.
    *   **Crucially parses the `x_meta` properties** within the JSON Schema. Uses this metadata to:
        *   Make the generated classes inherit from the specific base class (`SchemaGeneratedObject`).
        *   Add appropriate attributes (e.g., `[JsonConverter(typeof(CustomConverter))]`) based on hints like `UnitySchemaConverter`.
        *   Potentially alter generated property types or add specific helper methods.
    *   Implements logic to handle potential IL2CPP/WebGL constraints during generation (e.g., avoiding certain reflection patterns if possible).
    *   Generates properties corresponding to the schema fields and includes support for the `extraFields` dictionary defined in the base class.

**5. Unity Base Class: Runtime Foundation (C#)**

*   **File:** `Unity/CraftSpace/Assets/Scripts/Schemas/SchemaGeneratedObject.cs`
*   **Role:** Provides the foundational runtime behavior for all generated C# schema classes. It handles common concerns like change notification, deserialization, and managing unknown fields.
*   **Key Features & Interactions:**
    *   Serves as the base class for classes generated by `SchemaGenerator.cs`.
    *   Implements `INotifyPropertyChanged` to support data binding in UI frameworks or other reactive systems within Unity.
    *   Likely contains the core **JSON deserialization logic**, often using Newtonsoft.Json. This logic must be carefully implemented to work with IL2CPP/WebGL limitations, frequently involving manual parsing using `JObject.Parse`, `JToken`, and `TryGetValue` rather than direct reflection-based deserialization for complex types.
    *   Implements the `extraFields` dictionary (`Dictionary<string, JToken>` or similar). During deserialization, any JSON properties not matching generated C# properties are stored here. This allows the system to load data with extra/unknown fields without errors and potentially access them later.
    *   Provides protected methods (e.g., `SetProperty<T>`) for generated properties to use, ensuring `PropertyChanged` events are raised correctly.

**6. Unity Extended Classes: Manual Logic (C#)**

*   **Files:**
    *   `Unity/CraftSpace/Assets/Scripts/Schemas/Collection.cs`
    *   `Unity/CraftSpace/Assets/Scripts/Schemas/Item.cs`
*   **Role:** These are **manual partial classes** that extend the corresponding generated schema classes (e.g., `partial class CollectionSchema`). They allow developers to add custom, Unity-specific logic, methods, or properties to the data models without modifying the auto-generated code (which would be overwritten on regeneration).
*   **Key Features & Interactions:**
    *   Use the `partial` keyword to merge with the generated class definition.
    *   Can add methods (e.g., helper functions to access specific data from `extraFields`, computed properties, validation logic specific to the Unity context).
    *   Can add constructors or properties not suitable for automatic generation.
    *   Interact directly with the properties and methods defined in the generated part and the `SchemaGeneratedObject` base class.

**7. Content Deployment: Copy & Index Script (Node.js)**

*   **File:** `SvelteKit/BackSpace/scripts/copy-items-to-unity.js`
*   **Role:** Prepares and transfers the actual content data (individual `item.json` files, potentially assets) from the BackSpace content directory structure into the Unity project's `StreamingAssets` folder, making it available at runtime. It also generates crucial index files.
*   **Key Features & Interactions:**
    *   Reads collection/item data from the `Content/collections/...` structure managed by BackSpace scripts.
    *   Copies relevant files (`item.json`, potentially downloaded cover images or other assets) into the corresponding structure under `Unity/CraftSpace/Assets/StreamingAssets/Content/...`. `StreamingAssets` is used because it's directly included in builds and accessible via path at runtime, even on platforms with restricted file system access.
    *   Generates `items-index.json` files within each collection's directory in `StreamingAssets`. These indices typically contain a list of item IDs or basic metadata, allowing Unity to quickly know *which* items exist without needing to list directory contents (which can be slow or unreliable, especially on WebGL). This index is essential for efficient runtime loading.

**8. Runtime Content & Loading (Unity)**

*   **Files/Location:**
    *   `Unity/CraftSpace/Assets/StreamingAssets/Content/` (and subdirectories)
    *   Contains `collection.json`, `items-index.json`, individual `item/[itemId]/item.json` files, and potentially assets copied by `copy-items-to-unity.js`.
    *   Runtime loading logic (likely within `Core/` systems like `DataManager` or `Brewster.cs`).
*   **Role:** Holds the actual data files accessible by the built Unity application. Runtime systems load this data on demand.
*   **Key Features & Interactions:**
    *   Unity runtime scripts access files within `StreamingAssets` using `Application.streamingAssetsPath` combined with the relative path.
    *   Loading typically involves:
        1.  Reading an `items-index.json` to get a list of available item IDs for a collection.
        2.  When specific item data is needed, constructing the path to `StreamingAssets/Content/collections/[collectionId]/items/[itemId]/item.json`.
        3.  Reading the raw JSON content of the file (using `UnityWebRequest` for WebGL/Android, or standard `System.IO.File` for standalone).
        4.  Deserializing the JSON string into the corresponding C# object (e.g., `Item`) using the logic defined in `SchemaGeneratedObject` (or custom converters). This populates the C# object instance with the runtime data.

**9. Core Unity System Integration (C#)**

*   **Files:**
    *   `Unity/CraftSpace/Assets/Scripts/Core/Brewster.cs` (or equivalent main manager)
    *   `Unity/CraftSpace/Assets/Scripts/Core/ViewFactory.cs`
    *   `Unity/CraftSpace/Assets/Scripts/Core/CollectionDisplay.cs` (or similar view coordinators)
*   **Role:** These systems orchestrate the use of the loaded data models. They manage repositories of loaded data, instantiate views, and provide data to those views.
*   **Key Features & Interactions:**
    *   Central managers (`Brewster`) likely hold dictionaries or lists of loaded `Collection` and `Item` objects, indexed by ID.
    *   Systems responsible for display (`CollectionDisplay`) receive requests to show specific collections.
    *   `ViewFactory` is used to instantiate the correct view prefabs (e.g., `ItemView` prefab) based on the data type or configuration.
    *   The coordinator passes the loaded C# data model instance (e.g., an `Item` object) to the newly instantiated view component (e.g., `ItemView`).

**10. Unity Presentation Layer: Views & Renderers (C#)**

*   **Files:**
    *   Interfaces: `IModelView.cs` (or similar like `ICollectionView.cs`, `IItemView.cs` mentioned in Area 10)
    *   Views: `CollectionView.cs`, `ItemView.cs`, `ItemViewsContainer.cs`
    *   Renderers: `BaseViewRenderer.cs`, `SingleImageRenderer.cs`
*   **Role:** The final step where the data model information is translated into visual elements in the Unity scene.
*   **Key Features & Interactions:**
    *   View components (`ItemView`, `CollectionView`) implement an interface like `IModelView<T>` which defines a method (e.g., `SetData(T model)`).
    *   When a core system provides a data model (e.g., an `Item` instance) to a view (`ItemView`), the `SetData` method is called.
    *   Inside `SetData`, the view component stores the model reference and triggers updates. It might directly update simple UI elements (like text labels via `ItemLabel.cs`) or delegate more complex visual tasks to specialized **Renderer** components.
    *   Renderers (`SingleImageRenderer`) are typically child components or referenced components. The View passes relevant data from the model (e.g., an image URL from the `Item` object) to the Renderer.
    *   The Renderer performs the specific visual task (e.g., loading the image from the URL and applying it to a `RawImage` or `Material`).
    *   Views also handle user interaction (`ItemSelectionHandler`) and report events back to core systems.
    *   Because models implement `INotifyPropertyChanged` (via `SchemaGeneratedObject`), views *could* subscribe to `PropertyChanged` events to update visuals automatically when the underlying data changes after the initial `SetData` call, enabling reactive updates.

This detailed flow illustrates how the content pipeline leverages schema definitions, code generation, and careful runtime handling to maintain consistency and flexibility across different parts of the application and development environments. 