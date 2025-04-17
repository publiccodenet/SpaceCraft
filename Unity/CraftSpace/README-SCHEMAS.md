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

## Schema Generation Process

### 1. TypeScript Schema Definition (BackSpace)

Schemas are defined using Zod in the BackSpace TypeScript codebase:

```typescript
// SvelteKit/BackSpace/src/lib/schemas/Item.ts
export const ItemSchema = z.object({
  id: z.string().min(1).describe("Unique identifier for the item"),
  title: z.string().describe("Primary display title for the item"),
  description: z.string().optional().describe("Optional description of the item"),
  creator: z.string().or(z.array(z.string())).optional()
    .describe("Creator(s) of this item"),
  // Additional properties...
});
```

### 2. JSON Schema Generation

TypeScript schemas are converted to standard JSON Schema format:

```bash
# In the BackSpace directory
npm run schema:generate-all
```

This produces JSON Schema files like this:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "description": "Unique identifier for the item"
    },
    "title": {
      "type": "string",
      "description": "Primary display title for the item"
    },
    // Additional properties...
  },
  "required": ["id", "title"]
}
```

These files are saved to `Unity/CraftSpace/Assets/StreamingAssets/Content/schemas/`.

### 3. C# Class Generation

From Unity, run the Schema Importer (Window > Tools > Import JSON Schema) to generate C# classes:

```csharp
// Generated code in Scripts/Schemas/Generated/ItemSchema.cs
public abstract class ItemSchema : SchemaGeneratedObject
{
    [SerializeField] private string _id = string.Empty;
    public override string Id { get { return _id; } set { _id = value; } }
    
    [SerializeField] private string _title = string.Empty;
    public string Title { get { return _title; } set { _title = value; } }
    
    // Additional properties and methods...
    
    protected override void ImportKnownProperties(JObject json)
    {
        if (json["id"] != null) _id = (string)json["id"];
        if (json["title"] != null) _title = (string)json["title"];
        // Import other properties...
    }
    
    protected override JObject ExportKnownProperties()
    {
        JObject json = new JObject();
        json["id"] = _id;
        json["title"] = _title;
        // Export other properties...
        return json;
    }
    
    protected override bool HasDefinedProperty(string name)
    {
        return name == "id" || name == "title" /* Other properties */ ;
    }
}
```

### 4. Unity Extension Classes

We extend the generated classes with Unity-specific functionality:

```csharp
// In Scripts/Schemas/Item.cs
[Serializable]
public class Item : ItemSchema
{
    // Runtime-only state (not serialized)
    [NonSerialized] public Texture2D cover;
    
    // Additional Unity-specific methods and properties
    public void NotifyViewsOfUpdate()
    {
        NotifyViewsOfType<IModelView<Item>>(view => view.HandleModelUpdated());
    }
}
```

## SchemaGeneratedObject Base Class

The `SchemaGeneratedObject` class provides core functionality for all schema objects:

### 1. JSON Serialization

```csharp
// Serialize to JSON with optional formatting
public virtual string ExportToJson(bool prettyPrint = true)
{
    JObject json = new JObject();
    
    // Add all defined properties
    var knownProps = ExportKnownProperties();
    foreach (var prop in knownProps)
    {
        json[prop.Key] = prop.Value;
    }
    
    // Add all extra fields
    foreach (var prop in extraFields)
    {
        json[prop.Key] = prop.Value;
    }
    
    return json.ToString(prettyPrint ? Formatting.Indented : Formatting.None);
}
```

### 2. Extra Fields Mechanism

The `extraFields` property preserves undefined properties during serialization/deserialization:

```csharp
[SerializeField] protected JObject extraFields = new JObject();

// Preserve unknown fields during import
protected virtual void ImportExtraFields(JObject json)
{
    extraFields = new JObject();
    
    foreach (var prop in json)
    {
        if (!HasDefinedProperty(prop.Key))
        {
            extraFields[prop.Key] = prop.Value;
        }
    }
}
```

### 3. Model-View Communication

The base class implements view registration and notification:

```csharp
[NonSerialized] private HashSet<object> registeredViews = new HashSet<object>();

// Register a view to receive updates
public virtual void RegisterView(object view)
{
    if (view != null && !registeredViews.Contains(view))
    {
        registeredViews.Add(view);
    }
}

// Unregister a view
public virtual void UnregisterView(object view)
{
    if (view != null)
    {
        registeredViews.Remove(view);
    }
}

// Get views of a specific type
protected IEnumerable<TView> GetViewsOfType<TView>()
{
    foreach (var view in registeredViews)
    {
        if (view is TView typedView)
        {
            yield return typedView;
        }
    }
}

// Notify views of a specific type
protected void NotifyViewsOfType<TView>(Action<TView> notificationAction)
{
    foreach (var view in GetViewsOfType<TView>())
    {
        notificationAction(view);
    }
}
```

## View System

The view system uses a generic interface to maintain type safety:

```csharp
// Generic view interface
public interface IModelView<T> where T : class
{
    // Get the current model
    T Model { get; }
    
    // Called when the model has been updated
    void HandleModelUpdated();
}
```

Models notify their views when data changes:

```csharp
// In Collection.cs
public void NotifyViewsOfUpdate()
{
    NotifyViewsOfType<IModelView<Collection>>(view => view.HandleModelUpdated());
}

// In Item.cs
public void NotifyViewsOfUpdate()
{
    NotifyViewsOfType<IModelView<Item>>(view => view.HandleModelUpdated());
}
```

Views register with models:

```csharp
// In CollectionView.cs
public void SetModel(Collection value)
{
    if (model == value) return;
    
    if (model != null)
        model.UnregisterView(this);
        
    model = value;
    
    if (model != null)
        model.RegisterView(this);
        
    UpdateView();
}

// In ItemView.cs
public void SetModel(Item newModel)
{
    if (model == newModel) return;
    
    if (model != null)
        model.UnregisterView(this);
        
    model = newModel;
    
    if (model != null)
        model.RegisterView(this);
        
    UpdateView();
}
```

## Schema Types and Converters

### Key Models

1. **Collection**: Group of related items
   - **Properties**: id, title, description, creator, etc.
   - **Relationships**: Contains items

2. **Item**: Individual content item
   - **Properties**: id, title, description, creator, date, etc.
   - **Relationships**: Belongs to collection

### Type Converters

Special converters handle various data formats:

1. **StringOrNullToStringConverter**: Converts null to empty string
2. **StringOrArrayOrNullToStringConverter**: Handles fields that can be string or string[]
3. **ArrayOrNullToStringArrayConverter**: Ensures array format for list fields

```csharp
// Example converter
public class StringOrNullToStringConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(string);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null)
            return "";

        var token = JToken.ReadFrom(reader);
        return token.ToString();
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value?.ToString() ?? "");
    }
}
```

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