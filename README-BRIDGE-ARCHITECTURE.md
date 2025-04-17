# Bridge System Architecture {#bridge-system-architecture}

This document describes the detailed architecture of the Bridge system, covering the class hierarchy, data converters, path expressions, and the JavaScript API.

## Class Hierarchy {#class-hierarchy}

The Bridge system is built on a carefully designed class hierarchy that provides structure and flexibility:

```
- Means root object (with name of superclass in parens)
+ Means subclass of parent in outline
* Means sub-object of parent in outline (with name of superclass in parens)
```

### Core System Classes {#core-system-classes}

```
- Accessor (none)
  Handles path-based access to C# objects, supporting arrays, lists, dictionaries, fields, properties, and more

- Bridge (MonoBehaviour)
  Central singleton that manages the bridge system and serves as the main API entry point

- BridgeTransport (MonoBehaviour)
  Abstract base class for platform-specific communication implementations
  + BridgeTransportCEF
      * BridgeWindow (EditorWindow)
      * WebProvider (none)
  + BridgeTransportSocketIO
      Handles communication via Socket.IO for remote browser connections
  + BridgeTransportWebGL
      WebGL-specific implementation using jslib and Emscripten
  + BridgeTransportWebView
      * BridgePlugin (MonoBehaviour)
      Mobile platform implementation for iOS and Android

- BridgeExtensions (none)
  Utility methods extending Unity classes to work with Bridge

- BridgeJsonConverter (JsonConverter)
  JSON.NET converter for Unity-specific types
```

### GameObject Components {#gameobject-components}

```
- BridgeObject (MonoBehaviour)
  Base component for JavaScript-controlled GameObjects
  + Tracker
      * TrackerProxy (MonoBehaviour)
      + PieTracker
          Pie menu tracking and interaction
      + Cuboid
          * Tile (MonoBehaviour)
      + ParticleSystemHelper
          Particle system control from JavaScript
  + LeanTweenBridge
      Integration with LeanTween animation system
  + TextOverlays
      Text rendering and management
  + ToolbarButton
      UI interaction component
  + TextureViewer
      Texture display and management
  + HexTile
      Hexagonal grid tile component
  + KineticText
      Text with physics and animation
  + Rainbow
      * Bow (BridgeObject)
  + BridgeTest
      Test component for Bridge functionality

- ProxyGroup (MonoBehaviour)
  Manages groups of related proxy objects

- NamedAssetManager (MonoBehaviour)
  * NamedAsset (ScriptableObject)
  System for named asset management

- Loader (MonoBehaviour)
  Handles resource loading and management

- MonoPInvokeCallbackAttribute (System.Attribute)
  Attribute for marking methods callable from JavaScript in IL2CPP builds
```

## JSON Converters {#json-converters}

Bridge includes a powerful set of JSON converters that automatically handle conversion between JavaScript objects and Unity's native types. These converters integrate with Newtonsoft.Json (JSON.NET) to provide seamless data transfer.

### Basic Unity Types {#basic-unity-types}

#### Vector2 {#vector2}

```javascript
// 2D vector representation
{
    "x": 0,
    "y": 0
}
```

#### Vector3 {#vector3}

```javascript
// 3D vector representation
{
    "x": 0,
    "y": 0,
    "z": 0
}
```

#### Vector4 {#vector4}

```javascript
// 4D vector representation
{
    "x": 0,
    "y": 0,
    "z": 0,
    "w": 0
}
```

#### Quaternion {#quaternion}

```javascript
// Quaternion representation as vector
{
    "x": 0,
    "y": 0,
    "z": 0,
    "w": 1
}

// Quaternion representation as Euler angles (degrees)
{
    "roll": 0,
    "pitch": 0,
    "yaw": 0
}
```

#### Color {#color}

```javascript
// HTML-style color string (RGBA)
"#FF5500FF"

// RGB color object (alpha defaults to 1)
{
    "r": 1.0,
    "g": 0.33,
    "b": 0.0
}

// RGBA color object
{
    "r": 1.0,
    "g": 0.33,
    "b": 0.0,
    "a": 0.5
}
```

#### Matrix4x4 {#matrix4x4}

```javascript
// 16 element matrix array (column-major)
[
    1, 0, 0, 0, 
    0, 1, 0, 0, 
    0, 0, 1, 0, 
    0, 0, 0, 1
]
```

### Particle System Types {#particle-system-types}

The Bridge system includes sophisticated converters for Unity's Particle System, handling complex types like:

#### ParticleSystem.MinMaxCurve {#minmaxcurve}

```javascript
// Null value
null

// Constant value
0

// Constant with type
{
    "minMaxCurveType": "Constant",
    "constant": 0
}

// Animation curve
{
    "minMaxCurveType": "Curve",
    "multiplier": 1,
    "curve": { /* AnimationCurve object */ }
}

// Random between two curves
{
    "minMaxCurveType": "RandomCurves",
    "multiplier": 1,
    "min": { /* AnimationCurve object */ },
    "max": { /* AnimationCurve object */ }
}

// Random between two constants
{
    "minMaxCurveType": "RandomConstants",
    "min": 0,
    "max": 1
}
```

#### ParticleSystem.MinMaxGradient {#minmaxgradient}

```javascript
// Null value
null

// Constant color
{
    "r": 0,
    "g": 0,
    "b": 0,
    "a": 1
}

// Constant color with type
{
    "minMaxGradientType": "Color",
    "color": { "r": 0, "g": 0, "b": 0, "a": 1 }
}

// Gradient
{
    "minMaxGradientType": "Gradient",
    "gradient": { /* Gradient object */ }
}

// Two colors
{
    "minMaxGradientType": "TwoColors",
    "min": { "r": 0, "g": 0, "b": 0, "a": 1 },
    "max": { "r": 1, "g": 1, "b": 1, "a": 1 }
}

// Two gradients
{
    "minMaxGradientType": "TwoGradients",
    "min": { /* Gradient object */ },
    "max": { /* Gradient object */ }
}

// Random color
{
    "minMaxGradientType": "RandomColor",
    "gradient": { /* Gradient object */ }
}
```

#### Gradient {#gradient}

```javascript
// Null value
null

// Gradient
{
    "alphaKeys": [
        { "alpha": 0, "time": 0 },
        { "alpha": 1, "time": 0.5 },
        { "alpha": 0, "time": 1 }
    ],
    "colorKeys": [
        { "color": { "r": 1, "g": 0, "b": 0, "a": 1 }, "time": 0 },
        { "color": { "r": 0, "g": 1, "b": 0, "a": 1 }, "time": 0.5 },
        { "color": { "r": 0, "g": 0, "b": 1, "a": 1 }, "time": 1 }
    ],
    "mode": "Blend"  // Blend or Fixed
}
```

#### AnimationCurve {#animationcurve}

```javascript
// Null value
null

// Constant curve
{
    "animationCurveType": "Constant",
    "timeStart": 0,
    "timeEnd": 1,
    "value": 0,
    "preWrapMode": "ClampForever",
    "postWrapMode": "ClampForever"
}

// Ease in-out curve
{
    "animationCurveType": "EaseInOut",
    "timeStart": 0,
    "timeEnd": 1,
    "valueStart": 0,
    "valueEnd": 1,
    "preWrapMode": "ClampForever",
    "postWrapMode": "ClampForever"
}

// Linear curve
{
    "animationCurveType": "Linear",
    "timeStart": 0,
    "timeEnd": 1,
    "valueStart": 0,
    "valueEnd": 1,
    "preWrapMode": "ClampForever",
    "postWrapMode": "ClampForever"
}

// Custom keyframes
{
    "animationCurveType": "Keys",
    "keys": [
        { "time": 0, "value": 0, "inTangent": 0, "outTangent": 0 },
        { "time": 0.5, "value": 1, "inTangent": 0, "outTangent": 0 },
        { "time": 1, "value": 0, "inTangent": 0, "outTangent": 0 }
    ],
    "preWrapMode": "ClampForever",
    "postWrapMode": "ClampForever"
}
```

### Resource Types {#resource-types}

Bridge also includes converters for Unity resource types:

#### Texture {#texture}

```javascript
// Null value
null

// Resource path
"Textures/MyTexture"
```

#### Material {#material}

```javascript
// Null value
null

// Resource path
"Materials/MyMaterial"
```

#### Shader {#shader}

```javascript
// Null value
null

// Shader name
"Standard"
```

## Path Expression System {#path-expression-system}

The path expression system allows JavaScript to access and modify Unity objects using simple string paths.

### Path Syntax {#path-syntax}

A path consists of a series of steps separated by slashes, like `"foo/bar/baz"`.

Each step consists of:
- An optional type prefix (defaulting to "member")
- A colon after the type
- A type-specific string value

Example: `"component:Renderer/material/color"`

**Numeric Indexing Shorthand**: If a step is a plain number (e.g., `0`, `1`, `2`), it is automatically treated as an index accessor. This means `"contacts/0/point"` is equivalent to writing `"contacts/index:0/point"`.

### Step Modifiers {#step-modifiers}

Steps can include modifiers:
- `?` makes a step conditional, returning null instead of raising an error
- `!` makes a step "excited," evaluating the value when setting instead of treating it as a literal

Example: `"component:Renderer/material/color?"` (returns null if Renderer or material is missing)

### Step Types {#step-types}

| Type | Description | Example |
|------|-------------|---------|
| string | String value | `"string:Hello World"` |
| float | Float value | `"float:3.14"` |
| integer, int | Integer value | `"int:42"` |
| boolean, bool | Boolean value | `"bool:true"` |
| null | Null value | `"null:"` |
| json | JSON value | `"json:{\"x\":1,\"y\":2}"` |
| index, jarray, array, list | Array/list index | `"array:0"` or simply `"0"` |
| map, dict, dictionary, jobject | Dictionary key | `"dict:key"` |
| transform | Transform child | `"transform:Child"` |
| component | Component on GameObject | `"component:Renderer"` |
| resource | Unity resource | `"resource:Textures/Wood"` |
| member, field, property | Object member | `"member:position"` |
| object | Object reference | `"object:ID123"` |
| method | Method call | `"method:Update"` |

### Usage Examples {#path-usage-examples}

```javascript
// Accessing array elements using automatic numeric indexing
"collision/contacts/0/point"           // First contact's point
"materials/0/color"                    // First material's color
"component:ParticleSystem/emission/rateOverTime/0"  // First key in rate curve

// The equivalent using explicit indexing prefixes
"collision/contacts/index:0/point"     // Same as above using explicit prefix
"materials/array:0/color"              // Using specific array type
"component:ParticleSystem/emission/rateOverTime/jarray:0"
```

The automatic numeric indexing feature works with arrays, lists, JArrays, and any other indexable collection, automatically choosing the appropriate accessor based on the object type during path traversal.

## Extension Methods {#extension-methods}

Bridge provides extension methods for Unity types to simplify common operations.

### Material.UpdateMaterial {#material-updatematerial}

```csharp
Material.UpdateMaterial(this Material material, JToken materialData)
```

This method modifies a material based on the keys of a JSON object. The materialData contains keys describing how to update the material. Some keys are prefixes followed by a property name.

#### Supported Properties {#material-properties}

| Key | Type | Description |
|-----|------|-------------|
| copyPropertiesFromMaterial | string | Resource name of material to copy from |
| doubleSidedGI | bool | Enable double-sided global illumination |
| enableInstancing | bool | Enable GPU instancing |
| globalIlluminationFlags | string/int | Global illumination flags |
| mainTextureOffset | Vector2 | Main texture offset |
| mainTextureScale | Vector2 | Main texture scale |
| mainTexture | string | Main texture resource name |
| renderQueue | int | Render queue value |
| shader | string | Shader name |
| shaderKeywords | string[] | Shader keywords to enable |
| texture_X | string | Set texture property X |
| textureOffset_X | Vector2 | Set texture offset for property X |
| textureScale_X | Vector2 | Set texture scale for property X |
| keyword_X | bool | Enable/disable shader keyword X |
| color | Color | Material main color |
| color_X | Color | Set color property X |
| float_X | float | Set float property X |
| int_X | int | Set integer property X |
| matrix_X | Matrix4x4 | Set matrix property X |
| vector_X | Vector4 | Set vector property X |

## JavaScript API {#javascript-api}

Bridge provides a comprehensive JavaScript API for controlling Unity.

### Object Creation {#object-creation}

```javascript
bridge.createObject(template)
```

Create a new GameObject in Unity with the specified template.

#### Template Properties {#template-properties}

| Property | Type | Description |
|----------|------|-------------|
| obj | string | Existing object ID to update |
| prefab | string | Prefab resource path to instantiate |
| component | string | Component type to add to a new GameObject |
| preEvents | object | Events to dispatch before configuration |
| parent | string | Parent object ID |
| worldPositionStays | bool | Keep world position when parenting |
| update | object | Properties to set on creation |
| interests | object | Event interest configurations |
| postEvents | object | Events to dispatch after configuration |

### Object Management {#object-management}

```javascript
bridge.destroyObject(objectId)
```

Destroy a GameObject by ID.

```javascript
bridge.updateObject(objectId, updates)
```

Update properties on an existing object.

```javascript
bridge.queryObject(objectId, queries, callback)
```

Query properties from an object and receive results in a callback.

```javascript
bridge.animateObject(objectId, animations)
```

Animate properties on an object using LeanTween.

### Interest-Based Events {#interest-based-events}

Event handlers can specify exactly which object properties they want to receive when an event occurs, using path expressions:

```javascript
// Event interests example
interests: {
    "Collision": {
        query: {
            "hitPosition": "collision/contacts/0/point",
            "hitNormal": "collision/contacts/0/normal",
            "hitObject": "collision/gameObject/name"
        },
        handler: function(obj, data) {
            console.log(`Hit ${data.hitObject} at ${JSON.stringify(data.hitPosition)}`);
            // Handle the collision event
        }
    }
}
```

This interest-based approach allows for efficient event handling by only transmitting required data.

## Platform-Specific Implementation Details {#platform-specific-details}

For information about platform-specific implementations and optimizations, refer to:

- [Notes/Platform_Integration.md](Notes/Platform_Integration.md) - Platform integration details
- [Notes/Web_Technologies.md](Notes/Web_Technologies.md) - Web browser technologies
- [Notes/JavaScript_Integration.md](Notes/JavaScript_Integration.md) - JavaScript engine integration
- [Notes/Graphics_Rendering.md](Notes/Graphics_Rendering.md) - Graphics and rendering techniques 