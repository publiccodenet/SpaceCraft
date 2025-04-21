# Bridge System Architecture

This document details the architecture of the Bridge system, including class hierarchies, JSON converters, path expressions, and JavaScript API.

## Class Hierarchy

The Bridge system is organized into several key class hierarchies:

### Core System Classes

- **Bridge**: Main singleton class that manages the Bridge system
  - Handles object registration and lookup
  - Manages JavaScript communication
  - Coordinates event dispatching
  - Controls initialization and configuration

- **BridgeTransport** (Abstract): Base class for communication transports
  - **BridgeTransportCEF**: Desktop platforms using Chromium Embedded Framework
  - **BridgeTransportWebGL**: WebGL platform using JavaScript interop
  - **BridgeTransportWebView**: Mobile platforms using native WebViews
  - **BridgeTransportSocketIO**: Network-based transport for remote debugging

- **BridgeJsonConverter**: Newtonsoft.Json converter for Unity types
  - Handles serialization/deserialization of Unity-specific types
  - Supports Vector3, Quaternion, Color, and other Unity structs
  - Provides converters for resources (Texture, Material, etc.)
  - Implements special handling for AnimationCurve, Gradient, etc.

- **Accessor**: Handles path-based property access
  - Parses path expressions like "transform/position/x"
  - Evaluates paths against objects
  - Handles type prefixes and modifiers
  - Supports array/list indexing, dictionary lookup, etc.

### GameObject Components

- **BridgeObject**: Base component for bridged objects
  - Handles event routing and interest registration
  - Manages object identity for JavaScript reference
  - Provides standard properties for all bridged objects

- **BridgeRegistrar**: Registers objects with the Bridge at runtime
  - Automatically assigns unique IDs
  - Configures initial properties
  - Sets up event handlers

- **BridgeEventHandler**: Base class for handling bridge events
  - **ClickEventHandler**: Handles click/tap events
  - **CollisionEventHandler**: Handles physics collision events
  - **TriggerEventHandler**: Handles trigger enter/exit events
  - **CustomEventHandler**: User-defined custom events

- **BridgeComponent**: Base class for components controlled by JavaScript
  - **BridgeAnimator**: Controls Unity Animator
  - **BridgeAudio**: Controls AudioSource components
  - **BridgeCamera**: Controls Camera settings
  - **BridgeLight**: Controls Light components
  - **BridgeParticleSystem**: Controls ParticleSystem
  - **BridgeRenderer**: Controls Renderer components
  - **BridgeRigidbody**: Controls Rigidbody physics
  - **BridgeTransformer**: Controls Transform position/rotation/scale
  - **BridgeUI**: Controls UI elements

## JSON Converters

Bridge provides custom JSON converters for Unity types:

### Basic Unity Types

```csharp
// Vector3 conversion
public class Vector3Converter : JsonConverter
{
    public override bool CanConvert(Type objectType)
    {
        return objectType == typeof(Vector3);
    }
    
    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.StartObject)
        {
            JObject jo = JObject.Load(reader);
            float x = jo["x"] != null ? jo["x"].Value<float>() : 0f;
            float y = jo["y"] != null ? jo["y"].Value<float>() : 0f;
            float z = jo["z"] != null ? jo["z"].Value<float>() : 0f;
            return new Vector3(x, y, z);
        }
        else if (reader.TokenType == JsonToken.StartArray)
        {
            JArray ja = JArray.Load(reader);
            if (ja.Count >= 3)
                return new Vector3(ja[0].Value<float>(), ja[1].Value<float>(), ja[2].Value<float>());
            else if (ja.Count == 2)
                return new Vector3(ja[0].Value<float>(), ja[1].Value<float>(), 0f);
            else if (ja.Count == 1)
                return new Vector3(ja[0].Value<float>(), 0f, 0f);
            else
                return Vector3.zero;
        }
        return Vector3.zero;
    }
    
    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        Vector3 v = (Vector3)value;
        writer.WriteStartObject();
        writer.WritePropertyName("x");
        writer.WriteValue(v.x);
        writer.WritePropertyName("y");
        writer.WriteValue(v.y);
        writer.WritePropertyName("z");
        writer.WriteValue(v.z);
        writer.WriteEndObject();
    }
}
```

#### Quaternion

The Quaternion converter supports multiple input formats:

```csharp
// Supports:
// 1. Standard x,y,z,w format
// {"x":0,"y":0,"z":0,"w":1}

// 2. Euler angle format (pitch/yaw/roll)
// {"pitch":0,"yaw":90,"roll":0}

// 3. Array format
// [0,0,0,1]

public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    if (reader.TokenType == JsonToken.StartObject)
    {
        JObject jo = JObject.Load(reader);
        
        // Euler angles format (pitch/yaw/roll)
        if (jo["pitch"] != null || jo["yaw"] != null || jo["roll"] != null)
        {
            float pitch = jo["pitch"]?.Value<float>() ?? 0f;
            float yaw = jo["yaw"]?.Value<float>() ?? 0f;
            float roll = jo["roll"]?.Value<float>() ?? 0f;
            return Quaternion.Euler(pitch, yaw, roll);
        }
        
        // Standard x,y,z,w format
        float x = jo["x"] != null ? jo["x"].Value<float>() : 0f;
        float y = jo["y"] != null ? jo["y"].Value<float>() : 0f;
        float z = jo["z"] != null ? jo["z"].Value<float>() : 0f;
        float w = jo["w"] != null ? jo["w"].Value<float>() : 1f;
        return new Quaternion(x, y, z, w);
    }
    
    // Array format [x,y,z,w]
    else if (reader.TokenType == JsonToken.StartArray)
    {
        JArray ja = JArray.Load(reader);
        if (ja.Count >= 4)
            return new Quaternion(ja[0].Value<float>(), ja[1].Value<float>(), ja[2].Value<float>(), ja[3].Value<float>());
        else
            return Quaternion.identity;
    }
    
    return Quaternion.identity;
}
```

#### Color

The Color converter supports multiple input formats:

```csharp
// Supports:
// 1. Standard r,g,b,a format
// {"r":1.0,"g":0.5,"b":0.2,"a":1.0}

// 2. Hex string format
// "#FF8833"

// 3. Color name format
// "red" 

// 4. Array format
// [1.0,0.5,0.2,1.0]

public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    if (reader.TokenType == JsonToken.String)
    {
        string colorStr = reader.Value.ToString();
        
        // Hex format with #
        if (colorStr.StartsWith("#"))
        {
            ColorUtility.TryParseHtmlString(colorStr, out Color color);
            return color;
        }
        
        // Named colors
        if (typeof(Color).GetProperty(colorStr, BindingFlags.Public | BindingFlags.Static) != null)
        {
            return typeof(Color).GetProperty(colorStr, BindingFlags.Public | BindingFlags.Static).GetValue(null);
        }
        
        // Try as HTML color
        if (ColorUtility.TryParseHtmlString(colorStr, out Color namedColor))
        {
            return namedColor;
        }
        
        return Color.white;
    }
    else if (reader.TokenType == JsonToken.StartObject)
    {
        JObject jo = JObject.Load(reader);
        float r = jo["r"] != null ? jo["r"].Value<float>() : 1f;
        float g = jo["g"] != null ? jo["g"].Value<float>() : 1f;
        float b = jo["b"] != null ? jo["b"].Value<float>() : 1f;
        float a = jo["a"] != null ? jo["a"].Value<float>() : 1f;
        return new Color(r, g, b, a);
    }
    else if (reader.TokenType == JsonToken.StartArray)
    {
        JArray ja = JArray.Load(reader);
        if (ja.Count >= 4)
            return new Color(ja[0].Value<float>(), ja[1].Value<float>(), ja[2].Value<float>(), ja[3].Value<float>());
        else if (ja.Count == 3)
            return new Color(ja[0].Value<float>(), ja[1].Value<float>(), ja[2].Value<float>(), 1f);
        else
            return Color.white;
    }
    
    return Color.white;
}
```

### Particle System Types

#### ParticleSystem.MinMaxCurve

```csharp
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    JToken token = JToken.ReadFrom(reader);
    
    // Handle simple constant value
    if (token.Type == JTokenType.Float || token.Type == JTokenType.Integer)
    {
        return new ParticleSystem.MinMaxCurve(token.Value<float>());
    }
    
    // Handle object with curve information
    JObject jo = token as JObject;
    if (jo != null)
    {
        if (jo["constant"] != null)
        {
            return new ParticleSystem.MinMaxCurve(jo["constant"].Value<float>());
        }
        
        // Handle min/max constant
        if (jo["constantMin"] != null && jo["constantMax"] != null)
        {
            return new ParticleSystem.MinMaxCurve(
                jo["constantMin"].Value<float>(),
                jo["constantMax"].Value<float>());
        }
        
        // Handle curve
        if (jo["curve"] != null)
        {
            AnimationCurve curve = jo["curve"].ToObject<AnimationCurve>();
            return new ParticleSystem.MinMaxCurve(jo["multiplier"]?.Value<float>() ?? 1f, curve);
        }
        
        // Handle min/max curves
        if (jo["curveMin"] != null && jo["curveMax"] != null)
        {
            AnimationCurve curveMin = jo["curveMin"].ToObject<AnimationCurve>();
            AnimationCurve curveMax = jo["curveMax"].ToObject<AnimationCurve>();
            return new ParticleSystem.MinMaxCurve(
                jo["multiplier"]?.Value<float>() ?? 1f,
                curveMin,
                curveMax);
        }
    }
    
    return new ParticleSystem.MinMaxCurve(0f);
}
```

#### ParticleSystem.MinMaxGradient

```csharp
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    JToken token = JToken.ReadFrom(reader);
    
    // Handle simple color
    if (token.Type == JTokenType.String || 
        (token is JObject obj && (obj["r"] != null || obj["color"] != null)))
    {
        Color color;
        if (token.Type == JTokenType.String)
        {
            ColorUtility.TryParseHtmlString(token.Value<string>(), out color);
        }
        else if (token["color"] != null)
        {
            JToken colorToken = token["color"];
            if (colorToken.Type == JTokenType.String)
            {
                ColorUtility.TryParseHtmlString(colorToken.Value<string>(), out color);
            }
            else
            {
                color = colorToken.ToObject<Color>();
            }
        }
        else
        {
            color = token.ToObject<Color>();
        }
        
        return new ParticleSystem.MinMaxGradient(color);
    }
    
    // Handle object with gradient information
    JObject jo = token as JObject;
    if (jo != null)
    {
        // Min/max colors
        if (jo["colorMin"] != null && jo["colorMax"] != null)
        {
            Color colorMin = jo["colorMin"].ToObject<Color>();
            Color colorMax = jo["colorMax"].ToObject<Color>();
            return new ParticleSystem.MinMaxGradient(colorMin, colorMax);
        }
        
        // Gradient
        if (jo["gradient"] != null)
        {
            Gradient gradient = jo["gradient"].ToObject<Gradient>();
            return new ParticleSystem.MinMaxGradient(gradient);
        }
        
        // Min/max gradients
        if (jo["gradientMin"] != null && jo["gradientMax"] != null)
        {
            Gradient gradientMin = jo["gradientMin"].ToObject<Gradient>();
            Gradient gradientMax = jo["gradientMax"].ToObject<Gradient>();
            return new ParticleSystem.MinMaxGradient(gradientMin, gradientMax);
        }
    }
    
    return new ParticleSystem.MinMaxGradient(Color.white);
}
```

#### Gradient

```csharp
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    JObject jo = JObject.Load(reader);
    Gradient gradient = new Gradient();
    
    if (jo["alphaKeys"] != null && jo["alphaKeys"] is JArray alphaKeysArray)
    {
        GradientAlphaKey[] alphaKeys = new GradientAlphaKey[alphaKeysArray.Count];
        for (int i = 0; i < alphaKeysArray.Count; i++)
        {
            JObject keyObj = (JObject)alphaKeysArray[i];
            float alpha = keyObj["alpha"]?.Value<float>() ?? 1f;
            float time = keyObj["time"]?.Value<float>() ?? 0f;
            alphaKeys[i] = new GradientAlphaKey(alpha, time);
        }
        gradient.alphaKeys = alphaKeys;
    }
    
    if (jo["colorKeys"] != null && jo["colorKeys"] is JArray colorKeysArray)
    {
        GradientColorKey[] colorKeys = new GradientColorKey[colorKeysArray.Count];
        for (int i = 0; i < colorKeysArray.Count; i++)
        {
            JObject keyObj = (JObject)colorKeysArray[i];
            Color color = keyObj["color"].ToObject<Color>();
            float time = keyObj["time"]?.Value<float>() ?? 0f;
            colorKeys[i] = new GradientColorKey(color, time);
        }
        gradient.colorKeys = colorKeys;
    }
    
    if (jo["mode"] != null)
    {
        gradient.mode = (GradientMode)Enum.Parse(typeof(GradientMode), jo["mode"].Value<string>());
    }
    
    return gradient;
}
```

#### AnimationCurve

```csharp
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    AnimationCurve curve = new AnimationCurve();
    
    // Handle array of keyframes
    if (reader.TokenType == JsonToken.StartArray)
    {
        JArray ja = JArray.Load(reader);
        foreach (JToken keyframeToken in ja)
        {
            JObject ko = keyframeToken as JObject;
            if (ko != null)
            {
                float time = ko["time"]?.Value<float>() ?? 0f;
                float value = ko["value"]?.Value<float>() ?? 0f;
                float inTangent = ko["inTangent"]?.Value<float>() ?? 0f;
                float outTangent = ko["outTangent"]?.Value<float>() ?? 0f;
                int tangentMode = ko["tangentMode"]?.Value<int>() ?? 0;
                
                Keyframe keyframe = new Keyframe(time, value, inTangent, outTangent);
                #if UNITY_2018_1_OR_NEWER
                keyframe.weightedMode = WeightedMode.None;
                #endif
                curve.AddKey(keyframe);
                
                #if UNITY_5_5_OR_NEWER
                int lastIndex = curve.length - 1;
                AnimationUtility.SetKeyLeftTangentMode(curve, lastIndex, (AnimationUtility.TangentMode)(tangentMode & 0x0F));
                AnimationUtility.SetKeyRightTangentMode(curve, lastIndex, (AnimationUtility.TangentMode)((tangentMode >> 4) & 0x0F));
                #endif
            }
        }
    }
    
    // Handle object with keys array
    else if (reader.TokenType == JsonToken.StartObject)
    {
        JObject jo = JObject.Load(reader);
        if (jo["keys"] != null && jo["keys"] is JArray)
        {
            JArray keysArray = (JArray)jo["keys"];
            foreach (JToken keyframeToken in keysArray)
            {
                JObject ko = keyframeToken as JObject;
                if (ko != null)
                {
                    float time = ko["time"]?.Value<float>() ?? 0f;
                    float value = ko["value"]?.Value<float>() ?? 0f;
                    float inTangent = ko["inTangent"]?.Value<float>() ?? 0f;
                    float outTangent = ko["outTangent"]?.Value<float>() ?? 0f;
                    int tangentMode = ko["tangentMode"]?.Value<int>() ?? 0;
                    
                    Keyframe keyframe = new Keyframe(time, value, inTangent, outTangent);
                    #if UNITY_2018_1_OR_NEWER
                    keyframe.weightedMode = WeightedMode.None;
                    #endif
                    curve.AddKey(keyframe);
                    
                    #if UNITY_5_5_OR_NEWER
                    int lastIndex = curve.length - 1;
                    AnimationUtility.SetKeyLeftTangentMode(curve, lastIndex, (AnimationUtility.TangentMode)(tangentMode & 0x0F));
                    AnimationUtility.SetKeyRightTangentMode(curve, lastIndex, (AnimationUtility.TangentMode)((tangentMode >> 4) & 0x0F));
                    #endif
                }
            }
        }
        
        if (jo["preWrapMode"] != null)
        {
            curve.preWrapMode = (WrapMode)Enum.Parse(typeof(WrapMode), jo["preWrapMode"].Value<string>());
        }
        
        if (jo["postWrapMode"] != null)
        {
            curve.postWrapMode = (WrapMode)Enum.Parse(typeof(WrapMode), jo["postWrapMode"].Value<string>());
        }
    }
    
    return curve;
}
```

### Resource Types

#### Texture

```csharp
// Texture can be loaded from path, URL, or base64 data
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    string path = reader.Value as string;
    if (string.IsNullOrEmpty(path))
        return null;
    
    // Load from Resources
    if (path.StartsWith("Resources/"))
    {
        string resourcePath = path.Substring("Resources/".Length);
        return Resources.Load<Texture>(resourcePath);
    }
    
    // Load from StreamingAssets
    if (path.StartsWith("StreamingAssets/"))
    {
        string filePath = Path.Combine(Application.streamingAssetsPath, path.Substring("StreamingAssets/".Length));
        return LoadTextureFromFile(filePath);
    }
    
    // Load from absolute path (Editor only)
    #if UNITY_EDITOR
    if (Path.IsPathRooted(path))
    {
        return LoadTextureFromFile(path);
    }
    #endif
    
    return null;
}
```

#### Material

```csharp
// Material can be loaded from Resources or created with a shader
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    if (reader.TokenType == JsonToken.String)
    {
        string path = reader.Value as string;
        if (path.StartsWith("Resources/"))
        {
            string resourcePath = path.Substring("Resources/".Length);
            return Resources.Load<Material>(resourcePath);
        }
        return null;
    }
    
    if (reader.TokenType == JsonToken.StartObject)
    {
        JObject jo = JObject.Load(reader);
        string shaderName = jo["shader"]?.Value<string>() ?? "Standard";
        Shader shader = Shader.Find(shaderName);
        
        Material material = new Material(shader);
        
        if (jo["properties"] != null && jo["properties"] is JObject props)
        {
            // Set properties using MaterialPropertyBlock-like approach
            foreach (var prop in props)
            {
                string propName = prop.Key;
                JToken propValue = prop.Value;
                
                // Determine type and set property
                if (propValue.Type == JTokenType.Float)
                    material.SetFloat(propName, propValue.Value<float>());
                else if (propValue.Type == JTokenType.Integer)
                    material.SetInt(propName, propValue.Value<int>());
                else if (propValue.Type == JTokenType.String || propValue.Type == JTokenType.Object)
                {
                    if (propName.EndsWith("_ST"))
                    {
                        // Texture tiling/offset
                        Vector4 tilingOffset = propValue.ToObject<Vector4>();
                        material.SetTextureOffset(propName.Substring(0, propName.Length - 3), new Vector2(tilingOffset.z, tilingOffset.w));
                        material.SetTextureScale(propName.Substring(0, propName.Length - 3), new Vector2(tilingOffset.x, tilingOffset.y));
                    }
                    else if (propValue.Type == JTokenType.String)
                    {
                        // Texture path
                        string path = propValue.Value<string>();
                        Texture texture = serializer.Deserialize<Texture>(new StringReader(propValue.ToString()));
                        if (texture != null)
                            material.SetTexture(propName, texture);
                    }
                    else
                    {
                        // Color or vector
                        if (propValue["r"] != null || propValue["g"] != null || propValue["b"] != null)
                        {
                            Color color = propValue.ToObject<Color>();
                            material.SetColor(propName, color);
                        }
                        else if (propValue["x"] != null || propValue["y"] != null || propValue["z"] != null || propValue["w"] != null)
                        {
                            if (propValue["w"] != null)
                            {
                                Vector4 vec4 = propValue.ToObject<Vector4>();
                                material.SetVector(propName, vec4);
                            }
                            else
                            {
                                Vector3 vec3 = propValue.ToObject<Vector3>();
                                material.SetVector(propName, vec3);
                            }
                        }
                    }
                }
            }
        }
        
        return material;
    }
    
    return null;
}
```

#### Shader

```csharp
// Shader is simply loaded by name
public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
{
    string shaderName = reader.Value as string;
    if (string.IsNullOrEmpty(shaderName))
        return null;
    
    return Shader.Find(shaderName);
}
```

## Path Expression System

Bridge uses a powerful path expression system to allow JavaScript to navigate and manipulate Unity object hierarchies.

### Path Syntax

A path consists of a series of steps separated by forward slashes:

```
transform/position/x
```

Each step can have an optional prefix to specify how it should be interpreted:

```
field:_privateField
property:PublicProperty
index:0 (or just 0)
component:Renderer
method:GetComponent(Collider)/bounds/size
transform:parent/position
```

### Step Modifiers

Steps can have modifiers for additional functionality:

- `?`: Optional step, returns null if not found instead of throwing an error
- `!`: Evaluates the value of the property when setting, rather than setting directly
- `@`: Access the raw backing field of a property (Editor only)

Example:
```
?transform/?parent/position  // Won't throw error if parent is null
component:Rigidbody/?velocity  // Won't throw error if no Rigidbody
transform/localPosition/!x  // Evaluates expression when setting
```

### Step Types

The path system supports several step types:

- **Member Step**: Access a field or property
  - `field:privateName`: Access a private field
  - `property:PublicName`: Access a public property
  - `name`: Access a field or property without specifying type

- **Index Step**: Access array, list or dictionary elements
  - `array:0`: Access array element at index 0
  - `list:0`: Access list element at index 0
  - `dict:key`: Access dictionary element with key "key"
  - `0`: Just a number is automatically recognized as an array/list index

- **Component Step**: Access a component on a GameObject
  - `component:Renderer`: Get the Renderer component
  - `component:Renderer/materials/0`: Get the first material of the Renderer

- **Method Step**: Call a method with parameters
  - `method:GetComponent(Collider)`: Call GetComponent with parameter
  - `method:FindChild(Head)`: Find a child by name
  - `method:Calculate(1,2,true)`: Call with multiple parameters

- **Transform Step**: Navigate the transform hierarchy
  - `transform:parent`: Get the parent transform
  - `transform:root`: Get the root transform
  - `transform:Find(Head)`: Find a child transform by name

### Usage Examples

```csharp
// Get a component and access its property
Accessor.GetProperty(gameObject, "component:Renderer/material/color");

// Access a deeply nested property with optional steps
Accessor.GetProperty(gameObject, "?transform/?parent/?GetComponent(Rigidbody)/velocity");

// Modify a property
Accessor.SetProperty(gameObject, "transform/position/y", 5.0f);

// Use method steps to perform operations
Accessor.GetProperty(gameObject, "method:GetComponent(Renderer)/bounds/size");

// Access item in container
Accessor.GetProperty(inventory, "items/0/count");

// Access dictionary value
Accessor.GetProperty(gameObject, "stats/key:strength");
```

## Extension Methods

The Bridge system provides several extension methods to enhance Unity classes:

### Material.UpdateMaterial

Allows updating multiple material properties in one call:

```csharp
Material material = GetComponent<Renderer>().material;
material.UpdateMaterial(new Dictionary<string, object> {
    { "_Color", new Color(1, 0, 0, 1) },
    { "_Metallic", 0.8f },
    { "_Glossiness", 0.5f },
    { "_EmissionColor", new Color(0.5f, 0, 0, 1) }
});
```

#### Supported Properties

The Material extension supports setting:

- Float properties: `material.SetFloat(name, (float)value)`
- Integer properties: `material.SetInt(name, (int)value)`
- Color properties: `material.SetColor(name, (Color)value)`
- Vector properties: `material.SetVector(name, (Vector4)value)`
- Texture properties: `material.SetTexture(name, (Texture)value)`
- Texture offset/scale: Using special `name_ST` syntax for tiling/offset
- Matrix properties: `material.SetMatrix(name, (Matrix4x4)value)`
- ComputeBuffer properties: `material.SetBuffer(name, (ComputeBuffer)value)`
- Constant buffer properties: `material.SetConstantBuffer(name, (ComputeBuffer)value, offset, size)`
- Float array properties: `material.SetFloatArray(name, (float[])value)`
- Color array properties: `material.SetColorArray(name, (Color[])value)`
- Vector array properties: `material.SetVectorArray(name, (Vector4[])value)`
- Matrix array properties: `material.SetMatrixArray(name, (Matrix4x4[])value)`

## JavaScript API

The Bridge system exposes a comprehensive JavaScript API:

### Object Creation

```javascript
// Create a new object
bridge.createObject({
    prefab: "Prefabs/MyPrefab",       // Optional prefab to instantiate
    primitive: "Cube",                // Or use a primitive type
    component: "BridgeObject",        // Component to add
    id: "myUniqueId",                 // Optional explicit ID
    parent: "parentObjectId",         // Optional parent object
    position: { x: 0, y: 1, z: 0 },   // Optional position
    rotation: { x: 0, y: 0, z: 0 },   // Optional rotation
    scale: { x: 1, y: 1, z: 1 },      // Optional scale
    // Additional properties to set
    update: {
        "component:Renderer/material/color": { r: 1, g: 0, b: 0, a: 1 },
        "transform/localScale": { x: 2, y: 2, z: 2 }
    },
    // Events to listen for
    interests: {
        "Click": true,
        "Collision": {
            query: {
                "hitPosition": "collision/contacts/0/point"
            }
        }
    }
});
```

#### Template Properties

Objects can be created with template strings that expand property values:

```javascript
// Create multiple objects with template strings
for (let i = 0; i < 10; i++) {
    bridge.createObject({
        primitive: "Cube",
        id: "cube_{i}",  // Expands to "cube_0", "cube_1", etc.
        position: { x: i * 2, y: 0, z: 0 },
        update: {
            "component:Renderer/material/color": { 
                r: i / 10, 
                g: 0, 
                b: 1 - (i / 10), 
                a: 1 
            }
        }
    });
}
```

### Object Management

```javascript
// Find an object by ID
bridge.findObject("myUniqueId");

// Query object properties
bridge.queryObject("myUniqueId", {
    "position": "transform/position",
    "rotation": "transform/rotation",
    "color": "component:Renderer/material/color"
}, function(result) {
    console.log("Position:", result.position);
    console.log("Rotation:", result.rotation);
    console.log("Color:", result.color);
});

// Update object properties
bridge.updateObject("myUniqueId", {
    "transform/position/y": 5,
    "transform/rotation": { roll: 0, pitch: 45, yaw: 0 },
    "component:Renderer/material/color": "#FF0000"
});

// Remove an object
bridge.removeObject("myUniqueId");

// Destroy an object (alias for removeObject)
bridge.destroyObject("myUniqueId");

// Add component to an object
bridge.addComponent("myUniqueId", "Rigidbody", {
    "mass": 10,
    "useGravity": true
});

// Remove component from an object
bridge.removeComponent("myUniqueId", "Rigidbody");
```

### Interest-Based Events

The interests system allows subscribing to specific events:

```javascript
// Register interest in an event
bridge.updateInterests("myUniqueId", {
    // Simple interest (just notify, no data)
    "Click": true,
    
    // Interest with specific queries
    "Collision": {
        // Properties to include with the event
        query: {
            "hitPosition": "collision/contacts/0/point",
            "hitNormal": "collision/contacts/0/normal",
            "hitObject": "collision/gameObject/name",
            "hitVelocity": "collision/relativeVelocity"
        },
        // Handler function
        handler: function(obj, data) {
            console.log("Collision at position:", data.hitPosition);
            console.log("With object:", data.hitObject);
        }
    }
});

// Remove an interest
bridge.updateInterests("myUniqueId", {
    "Click": false
});
```

## Platform-Specific Implementation Details

Each platform has specific implementation details:

- **WebGL**: Uses direct JavaScript interop through jslib
- **Desktop**: Uses Chromium Embedded Framework (CEF)
- **iOS**: Uses WKWebView and JavaScript messaging
- **Android**: Uses Android WebView and JavaScript bridge
- **Development**: Uses Socket.IO for remote debugging 