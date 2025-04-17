# Unity Bridge System

The Unity Bridge system provides seamless communication between Unity and JavaScript, enabling data exchange, object control, and real-time interaction. This document covers the architecture, setup, and usage of the system.

## Table of Contents
1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Setup Guide](#setup-guide)
4. [JSON Integration](#json-integration)
5. [Interest Query System](#interest-query-system)
6. [Path Expressions](#path-expressions)
7. [JavaScript API](#javascript-api)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The Bridge system enables:
- Bidirectional communication between Unity and JavaScript
- JSON-based object configuration and control
- Event-based messaging with custom interests
- Efficient texture and data sharing
- Remote debugging capabilities

It works across multiple platforms:
- WebGL (direct browser integration)
- Native platforms (via embedded WebView)
- Socket.IO (for network communication)

## Core Architecture

The Bridge architecture follows a layered design:

### Key Components

1. **Bridge**: Central manager for the bridge system
   - Maintains object registrations
   - Distributes events
   - Manages global state

2. **BridgeObject**: Base class for bridged objects
   - Handles events
   - Maintains identity
   - Supports configuration

3. **BridgeTransport**: Abstract transport layer
   - Implements communication protocols
   - Manages message queues
   - Handles platform differences

4. **BridgeJsonConverter**: JSON conversion system
   - Converts between C# and JSON
   - Handles Unity-specific types
   - Supports multiple input formats

### Class Hierarchy

```
- Bridge (BridgeObject)
  - Central manager for bridge communication

- BridgeTransport (MonoBehaviour)
  + BridgeTransportWebGL
  + BridgeTransportSocketIO
  + BridgeTransportWebView
  + BridgeTransportWebServer

- BridgeObject (MonoBehaviour)
  - Base class for bridged objects
  + Various specialized bridge classes

- BridgeJsonConverter (JsonConverter)
  - JSON serialization/deserialization
```

## Setup Guide

### Setting Up a New Scene

1. **Required GameObjects**:
   ```
   Scene
    ├── Managers (Empty GameObject)
    │    └── Bridge (Add Bridge.cs component)
    │    └── [Other manager scripts as needed]
    ├── UI (Empty GameObject)
    │    └── [Your UI elements]
    └── Content (Empty GameObject)
         └── [Your scene content]
   ```

2. **Configure the Bridge Component**:
   - **Target Transform**: Root object to expose (usually Managers)
   - **Game ID**: Unique identifier (e.g., "CraftSpace")
   - **Deployment**: Environment (e.g., "development")
   - **URL**: Path to bridge HTML file (usually "bridge.html")

3. **WebGL Configuration**:
   - In Project Settings > Player > WebGL:
     - Set "WebGL Template" to "Bridge"
     - Enable "Strip Engine Code" for smaller builds
     - Enable "Decompression Fallback" in Publishing Settings

4. **StreamingAssets Setup**:
   - Ensure `StreamingAssets/Bridge` contains required JavaScript files:
     - bridge.js
     - unity.js
     - bridge-transport-webgl.js
     - Additional utility libraries

## JSON Integration

The Bridge uses `Newtonsoft.Json` with custom converters for Unity types:

### BridgeJsonConverter

The BridgeJsonConverter handles conversion between Unity objects and JSON:

```csharp
public class BridgeJsonConverter : JsonConverter
{
    // Converter dictionaries
    public static Dictionary<System.Type, ConvertToDelegate> convertToObjectMap;
    public static Dictionary<System.Type, ConvertFromDelegate> convertFromObjectMap;
    
    // ... implementation details ...

    public override bool CanConvert(Type objectType)
    {
        return convertFromObjectMap.ContainsKey(objectType) || 
               convertToObjectMap.ContainsKey(objectType);
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        // Convert object to JSON
        Type objectType = value.GetType();
        ConvertFromDelegate converter = convertFromObjectMap[objectType];
        converter(writer, objectType, value, serializer);
    }

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        // Convert JSON to object
        ConvertToDelegate converter = convertToObjectMap[objectType];
        object result = null;
        converter(reader, objectType, ref result, serializer);
        return result;
    }
}
```

### Type Conversion

The system supports multiple input formats for Unity types:

#### Vector3

```javascript
// Object format
{"x": 0, "y": 1, "z": 0}

// Array format
[0, 1, 0]
```

#### Color

```javascript
// RGBA object
{"r": 1.0, "g": 0.5, "b": 0.2, "a": 1.0}

// Hex string
"#FF8833"

// Array format
[1.0, 0.5, 0.2, 1.0]

// Color name
"red"
```

#### Quaternion

```javascript
// Quaternion object
{"x": 0, "y": 0, "z": 0, "w": 1}

// Euler angles
{"pitch": 0, "yaw": 45, "roll": 0}

// Array format
[0, 0, 0, 1]
```

### Utility Methods

```csharp
// Convert JSON to C# object
public static T ConvertTo<T>(JToken data);

// Convert C# object to JSON
public static JToken ConvertFrom(object value);

// Convert to enum type
public static bool ConvertToEnum<EnumType>(object obj, ref EnumType result);

// Get value with default
public static string GetStringDefault(JObject obj, string key, string def = null);
```

## Interest Query System

The Interest Query System is the Bridge's core innovation, dramatically reducing network traffic by letting clients specify exactly what data they want to receive with each event.

### Key Concepts

1. **Interest Declaration**: Client tells Unity which events it wants to receive
2. **Query Patterns**: Client provides a "shopping list" of data
3. **Zero Round-Trip Design**: All required data is gathered and sent with the event

### How It Works

1. **Registration**:
   ```javascript
   bridge.updateInterests("objectId", {
     "MouseDown": {
       // Query pattern - what data to receive when event occurs
       position: "transform/position",
       name: "name",
       color: "component:Renderer/material/color"
     }
   });
   ```

2. **Event Processing**:
   - When `MouseDown` occurs, Unity:
     - Checks if any clients are interested
     - Processes the query pattern to gather requested data
     - Packages the event with only the requested data
     - Sends the tailored event back to clients

3. **Client Handling**:
   ```javascript
   // Handler registered with the interest
   function handleMouseDown(object, data) {
     console.log("Clicked at position:", data.position);
     console.log("Object name:", data.name);
     console.log("Object color:", data.color);
   }
   ```

### Interest Example

```javascript
// Register interest in multiple events with custom patterns
bridge.updateInterests("myObject", {
  "MouseDown": {
    // Query pattern
    mousePosition: "mousePosition",
    shiftKey: "shiftKey",
    localPoint: "raycastHit/point",
    distance: "raycastHit/distance",
    
    // Handler function
    handler: (obj, results) => {
      console.log("Mouse down at:", results.mousePosition);
      console.log("Shift key pressed:", results.shiftKey);
      console.log("Hit point:", results.localPoint);
      console.log("Distance:", results.distance);
    }
  },
  
  "MouseUp": {
    mousePosition: "mousePosition",
    handler: (obj, results) => {
      console.log("Mouse up at:", results.mousePosition);
    }
  }
});
```

## Path Expressions

Path expressions provide a powerful way to access and modify properties:

### Syntax

A path consists of steps separated by slashes:
```
transform/position/x
```

Each step can have a type prefix:
```
component:Renderer/material/color
method:GetComponent(BoxCollider)/size
```

### Step Types

- `member`, `field`, `property`: Access fields and properties
- `component`: Access a component on a GameObject
- `method`: Call a method
- `index`, `array`, `list`: Access array/list elements
- `transform`: Navigate the transform hierarchy
- `map`, `dict`, `dictionary`: Access dictionary entries

### Modifiers

- `?`: Optional step (returns null instead of error)
- `!`: Evaluate value when setting (treat as expression)

### Examples

```javascript
// Basic property access
"transform/position"

// Component access
"component:Renderer/material/color"

// Method call with parameter
"method:GetComponent(BoxCollider)/size"

// Array access
"items/index:2/name"

// Dictionary access
"properties/key:color"

// Optional access
"?transform/?parent/?gameObject/name"
```

## JavaScript API

### Object Management

```javascript
// Create a new object
bridge.createObject({
  prefab: "Prefabs/MyPrefab",
  id: "myUniqueId",
  parent: "parentObjectId",
  update: {
    position: { x: 0, y: 1, z: 0 },
    rotation: { x: 0, y: 90, z: 0 }
  },
  interests: {
    "Click": true,
    "Hover": true
  }
});

// Update object properties
bridge.updateObject("myUniqueId", {
  position: { x: 1, y: 2, z: 3 },
  "component:Light/intensity": 0.8
});

// Query object properties
bridge.queryObject("myUniqueId", {
  position: "transform/position",
  rotation: "transform/rotation",
  light: "component:Light/intensity"
}, function(result) {
  console.log("Position:", result.position);
  console.log("Light intensity:", result.light);
});
```

### Event System

```javascript
// Send a custom event
bridge.sendEvent({
  event: "CustomEvent",
  id: "myUniqueId",
  data: { 
    value: 42,
    message: "Hello from JavaScript" 
  }
});

// Update interests
bridge.updateInterests("myUniqueId", {
  "Click": {
    position: "transform/position",
    handler: function(obj, data) {
      console.log("Clicked at:", data.position);
    }
  }
});
```

## Best Practices

### Interest Query System

1. **Request Only What You Need**
   - Include exactly what you need in query patterns
   - Use specific path expressions, not entire objects
   - Group related interests to reduce handlers

2. **Performance Optimization**
   - Use batch updates instead of individual changes
   - Minimize event frequency
   - Keep path expressions specific
   - Consider interest lifetime and scope

3. **Security Considerations**
   - Be careful with `EvaluateJS` - it executes arbitrary code
   - Validate inputs from external sources
   - Limit exposed objects and properties

4. **Organization**
   - Keep bridge code in dedicated components
   - Use consistent object naming
   - Implement proper error handling

## Troubleshooting

### Common Issues

1. **Communication Problems**
   - Check browser console for JavaScript errors
   - Verify StreamingAssets has required Bridge files
   - Ensure WebGL template is correctly configured

2. **Object Not Found**
   - Verify object IDs match between Unity and JavaScript
   - Check if objects are properly registered with Bridge

3. **Type Conversion Errors**
   - Ensure proper format for Unity types
   - Check for missing or invalid property names
   - Verify JSON structure matches expected format

### Debugging Tips

- Enable debug logging in the Bridge component
- Use the browser console to monitor events
- Test simple operations before complex ones
- Verify path expressions with `queryObject` first
