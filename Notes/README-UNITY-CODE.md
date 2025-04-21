# CraftSpace Unity Code Structure

## Core Architecture

- **Brewster** - Singleton "God" object that manages collections and application state
- **ApplicationManager** - Main entry point for the application
- **CollectionBrowserManager** - Manages collection browsing and navigation
- **ViewFactory** - Creates and manages views for collections and items
- **ItemSelectionManager** - Handles selection of items

## Development Environment Setup

Before starting development on the Unity portion of CraftSpace, set up your IDE with the following extensions for a more productive workflow:

### Visual Studio & Visual Studio Code

1. **Visual Studio Tools for Unity** (essential)
   - Enables debugging, code completion, and Unity project navigation
   - Properly handles .meta files and Unity-specific file operations
   - Maintains the relationship between assets and their metadata

2. **Unity Debug** (for VS Code)
   - Allows attaching the VS Code debugger to the Unity editor
   - Supports breakpoints, watch variables, and step debugging

3. **C# Extensions**
   - Enhanced syntax highlighting for C# files
   - Code organization features (regions, methods grouping)

4. **Unity Code Snippets**
   - Provides templates for common Unity patterns
   - Speeds up creation of MonoBehaviours, ScriptableObjects, etc.

### Cursor

1. **Unity Integration**
   - Configure Cursor to exclude .meta files from the file explorer:
     - Open Settings → Features → Explorer → Files: Exclude
     - Add `*.meta` to the patterns list
   - Cursor will still maintain these files when moving/renaming assets

2. **Recommended Settings**
   - Enable "Auto Save" to ensure changes are saved when Unity reimports assets
   - Configure bracket pair colorization for better C# readability
   - Set up a reasonable tab size (4 spaces) to match Unity's default formatting

3. **File Association**
   - Ensure .cs files open with Cursor by default
   - Associate Unity scene and prefab files with Unity Editor

### Git Configuration

1. **Git LFS Setup**
   - Configure Git LFS for Unity asset files (.asset, .fbx, etc.)
   - Avoid LFS for code files to maintain good diff visibility

2. **.gitignore Configuration**
   - Use Unity's recommended .gitignore settings
   - Ensure meta files are included in version control
   - Exclude user-specific Unity files (UserSettings folder, etc.)

By properly configuring your development environment, you can avoid common pitfalls with Unity development, like broken references due to improper handling of meta files or synchronization issues between your IDE and Unity.

## Required Prefabs

### 1. CollectionView Prefab
- Purpose: Displays and manages a collection of items in a grid layout
- Components:
  - CollectionView script
  - CollectionGridLayout script
  - Child GameObject named "Content" (container for items)

### 2. ItemView Prefab
- Purpose: Displays and manages a single item
- Components:
  - ItemView script
  - Box Collider (for interaction)
  - Optional renderers depending on content type:
    - SingleImageRenderer (for images)
    - TextMetadataRenderer (for text)
    - SimpleItemCardRenderer (for general items)

## Scene Setup

1. **Core Manager GameObject** (required)
   - ApplicationManager component
   - Brewster component
   - CollectionBrowserManager component
   - ViewFactory component
   - ImageLoader component
   - Create a child GameObject named "Collections Container"
     - This will hold all instantiated collection views

2. **Camera Setup**
   - Create an empty GameObject named "CameraRig"
   - Add CameraController component to this GameObject
   - Make the Main Camera a child of CameraRig
   - Position CameraRig at an appropriate height (Y=10)
   - Rotate Main Camera to look down (X=90, Y=0, Z=0)
   - Consider using Orthographic projection for clean top-down view
   - In the CollectionBrowserManager, drag the CameraRig into the "Camera Rig" field

3. **Selection Manager**
   - GameObject with ItemSelectionManager component

## Component Relationships

- **Brewster** acts as the central data manager, holding references to all collections
- **CollectionView** registers itself with its Collection model
- **CollectionGridLayout** handles the spatial arrangement of ItemViews
- **CameraController** can focus on specific CollectionGridLayouts
- **ItemSelectionManager** handles selection events from ItemViews

## Data Flow

1. Collections are loaded via CollectionLoader
2. Brewster manages the loaded Collections
3. CollectionBrowserManager creates CollectionView instances using ViewFactory
4. CollectionGridLayout organizes ItemViews spatially
5. User interacts with ItemViews, which report to ItemSelectionManager
6. CameraController navigates between collections and items

## Common Issues and Solutions

- Ensure all prefabs have the correct component references set
- Check that the Brewster singleton is initialized before any collection operations
- Make sure the CameraController's parameters match your scene scale
- Verify that the CollectionGridLayout settings provide appropriate spacing for your items 

## JSON Handling Best Practices

### Using Newtonsoft.Json (JSON.net) Instead of Unity's JSON Utilities

Unity's built-in JSON utilities (`JsonUtility`) have significant limitations that make them unsuitable for robust data handling:

- **Cannot serialize/deserialize simple arrays** without wrapper classes
- **No support for dictionaries** or complex nested structures
- **Requires exact class structure matching** with no flexibility
- **Limited error reporting** when deserialization fails
- **No dynamic JSON navigation** capabilities

For these reasons, we use Newtonsoft.Json (JSON.net) throughout CraftSpace:

```csharp
// DO NOT USE:
List<string> items = JsonUtility.FromJson<List<string>>(jsonText); // Will fail!

// INSTEAD USE:
// For simple arrays:
JArray itemsArray = JArray.Parse(jsonText);
List<string> items = new List<string>();
foreach (JToken token in itemsArray)
{
    items.Add(token.ToString());
}

// For complex objects:
Item item = JsonConvert.DeserializeObject<Item>(jsonText);

// For dynamic navigation:
JObject obj = JObject.Parse(jsonText);
string title = obj["metadata"]?["title"]?.ToString() ?? "Untitled";
```

### JSON.net's Key Advantages

- **JToken/JObject/JArray classes** for flexible JSON navigation
- **LINQ integration** for powerful queries and transformations
- **Robust error handling** with detailed exception information
- **Schema validation** capabilities
- **Well-maintained and industry standard** library

### Implementation Notes

1. Avoid creating custom JSON helpers or wrappers around JSON.net
2. Use direct JArray.Parse() for handling collection indices (simple string arrays)
3. Use JsonConvert.DeserializeObject<T>() for model classes
4. For debugging, JObject.Parse() + property access can inspect any JSON structure

By consistently using JSON.net throughout the codebase, we ensure reliable data handling
regardless of the JSON structure complexity. 