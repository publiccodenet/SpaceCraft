# Bridge System Anatomy {#bridge-system-anatomy}

The Bridge system provides a powerful integration between JavaScript and Unity, enabling seamless interaction between web technologies and the Unity game engine.

## Core Components {#core-components}

### 1. Cross-Platform Web Browser and JavaScript Engine {#web-browser-js-engine}

The Bridge system incorporates embedded web browsers tailored to each platform:

- **Desktop (Windows/macOS)**: Chromium Embedded Framework (CEF)
- **iOS**: WKWebView
- **Android**: Android WebView
- **WebGL**: Direct JavaScript integration

Each browser component is configured for optimal performance within Unity and provides a consistent JavaScript runtime environment across platforms.

### 2. JavaScript-Unity Bridge {#javascript-unity-bridge}

The core bridge code consists of:

- **Bridge.cs**: Central singleton class that manages JavaScript-Unity communication
- **BridgeTransport**: Abstract base class with platform-specific implementations:
  - `BridgeTransportCEF`: For desktop platforms using CEF
  - `BridgeTransportWebView`: For mobile platforms using native WebViews
  - `BridgeTransportWebGL`: For WebGL builds with direct JavaScript interop
  - `BridgeTransportSocketIO`: For remote debugging and testing

The bridge handles:
- Object instance tracking and reference management
- Event dispatching between JavaScript and Unity
- Memory management and garbage collection coordination
- Path-based object property access

### 3. JSON ↔ C# Conversion Utilities {#json-conversion-utilities}

The Bridge system uses JSON as the data interchange format:

- **BridgeJsonConverter.cs**: Custom JSON converters for Unity-specific types
- Automatic handling of:
  - Unity primitive types (Vector3, Quaternion, Color, etc.)
  - Complex types (AnimationCurve, Gradient, etc.)
  - Resources (Materials, Textures, etc.)
  - Component references
  - Nested objects

```csharp
// Example of automated JSON conversion
Vector3 position = JsonConvert.DeserializeObject<Vector3>("{\"x\":1,\"y\":2,\"z\":3}");
string json = JsonConvert.SerializeObject(transform.position);
```

### 4. Accessor Path Expressions {#accessor-path-expressions}

The Accessor system allows JavaScript to access and modify Unity objects using path expressions:

- **Accessor.cs**: Handles parsing and evaluation of path expressions
- Supports accessing:
  - Object properties and fields
  - Array and list elements
  - Dictionary entries
  - Component references
  - GameObject hierarchy traversal

```csharp
// Example of path-based property access
object value = Accessor.GetProperty(gameObject, "transform/position/x");
Accessor.SetProperty(gameObject, "transform/position/y", 5.0f);
```

Path expressions use a slash-separated syntax with optional type prefixes and modifiers, such as `"component:Renderer/materials/0/color"`.

For convenience, numeric indices can be written directly without a prefix - the system automatically identifies them as indexers. For example, `"materials/0/color"` is equivalent to `"materials/index:0/color"`.

### 5. JSON Messaging System {#json-messaging-system}

The messaging system facilitates communication between JavaScript and Unity:

- **Event-based communication**: Using custom event triggers and handlers
- **Query system**: Request-response pattern for property access
- **Interest-based events**: Subscribe to specific data paths when events occur
- **Memory-efficient data transfer**: Only requested properties are serialized

```javascript
// JavaScript example of interest-based events
bridge.interests.add("Collision", {
    query: {
        "hitPosition": "collision/contacts/0/point",
        "hitNormal": "collision/contacts/0/normal"
    },
    handler: function(obj, data) {
        console.log("Hit at position: " + JSON.stringify(data.hitPosition));
    }
});
```

## Platform-Specific Optimizations {#platform-specific-optimizations}

### WebGL {#webgl-optimization}

In WebGL builds:
- Direct memory access between JavaScript and Unity
- Zero-copy data transfer when possible
- Unified JavaScript context with the browser

### Mobile (iOS/Android) {#mobile-optimization}

For mobile platforms:
- Optimized native WebView integration
- Batched message passing to reduce overhead
- Background thread processing for heavy operations
- Memory-aware resource management

### Desktop {#desktop-optimization}

On desktop platforms:
- Multi-threaded JavaScript execution
- Hardware-accelerated rendering for browser content
- Shared texture resources between CEF and Unity

## Integration Examples {#integration-examples}

The Bridge system can be used in various ways:

```javascript
// Create a new GameObject with specific properties
bridge.createObject({
    component: "BridgeObject",
    update: {
        "transform/position": { "x": 0, "y": 1, "z": 0 },
        "transform/rotation": { "roll": 0, "pitch": 30, "yaw": 0 }
    },
    interests: {
        "Click": {
            query: {
                "clickPosition": "hit/point"
            },
            handler: function(obj, data) {
                console.log("Clicked at: " + JSON.stringify(data.clickPosition));
            }
        }
    }
});

// Query multiple properties with a single call
bridge.queryObject("Player", {
    "position": "transform/position",
    "health": "component:PlayerStats/health",
    "equipped": "component:Inventory/equippedItems/0/name"
}, function(data) {
    console.log("Player data:", data);
});

// Animate an object with LeanTween
bridge.animateObject("Cube", {
    path: "transform/position/y",
    to: 5,
    time: 2.0,
    ease: "easeOutBounce"
});
```

## Related Documentation {#related-documentation}

For more detailed information about specific aspects of the Bridge system, refer to:

- [README-BRIDGE-ARCHITECTURE.md](README-BRIDGE-ARCHITECTURE.md): Detailed class hierarchy and system design
- [Notes/JavaScript_Integration.md](Notes/JavaScript_Integration.md): JavaScript engine details
- [Notes/Platform_Integration.md](Notes/Platform_Integration.md): Platform-specific implementations
- [Notes/Graphics_Rendering.md](Notes/Graphics_Rendering.md): Graphics and rendering integration 