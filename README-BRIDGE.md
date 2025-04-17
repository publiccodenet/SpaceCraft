# Bridge: The WebAssembly-Powered JavaScript Integration For Unity3D

Bridge (formerly UnityJS) is a sophisticated bidirectional JavaScript-to-Unity integration system that leverages WebAssembly to enable seamless communication between JavaScript and Unity's C# runtime.

**Bridge isn't just a bridge - it's a paradigm shift that puts JavaScript in the driver's seat**, enabling JavaScript to take the front seat and control Unity instead of the other way around. It creates a JavaScript-first development environment where the JavaScript ecosystem and web browser standards become the center of gravity for dynamic interactive debugging, live coding, hot reloading, and rapid development.

## Not Your Parent's Unity JavaScript

Let's clear up a common misconception: Bridge has nothing in common with Unity's infamous "UnityScript" - that bastardized JavaScript variant that was little more than a thin wrapper around the Mono runtime. That deprecated system required pre-compilation, was incompatible with the JavaScript ecosystem, lacked runtime interpretation, and couldn't leverage the rich JavaScript library ecosystem. It was JavaScript in name only.

Bridge is the complete opposite: a true bidirectional bridge between full-featured JavaScript (ECMAScript) and Unity's C# runtime. It enables genuine JavaScript execution and seamless communication with Unity's WebAssembly runtime through a sophisticated shared memory / JSON messaging architecture.

## Common Bridge Programming Idioms

Here are the core programming patterns you'll use with Bridge, shown with concise, practical examples:

### Creating Objects

Create Unity game objects from JavaScript, optionally using prefabs, specifying interests in events, and providing initial updates:

```javascript
// Create a player object from a prefab with initial configuration
const player = bridge.createObject({
    prefab: "Prefabs/Player",
    parent: "scene",
    worldPositionStays: true,
    update: {
        "transform/position": { x: 0, y: 1, z: 0 },
        "component:PlayerController/speed": 5.0,
        "component:Renderer/material/color": "#3366FF"
    }
});

// Create a simple UI element
const scoreLabel = bridge.createObject({
    prefab: "Prefabs/UIText",
    parent: "canvas",
    update: {
        "component:Text/text": "Score: 0",
        "transform/localPosition": { x: 10, y: 10, z: 0 }
    }
});
```

### Destroying Objects

Remove objects from the scene:

```javascript
// Destroy an object when no longer needed
bridge.destroyObject(player);
```

### Updating Objects

Update object properties using path expressions:

```javascript
// Update a single property
bridge.updateObject(player, {
    "transform/position": { x: 10, y: 0, z: 5 }
});

// Update multiple properties in one call
bridge.updateObject(player, {
    "component:PlayerController/health": 75,
    "component:Renderer/material/color": "#FF3366",
    "component:AudioSource/volume": 0.8,
    "active": false
});

// Call methods with parameters
bridge.updateObject(gameManager, {
    "component:GameManager/method:SpawnEnemy": ["boss", { x: 0, y: 10, z: 0 }]
});
```

### Querying Objects

Retrieve data from Unity objects with batched queries:

```javascript
// Query multiple properties in a single call
bridge.queryObject(player, {
    "position": "transform/position",
    "health": "component:HealthSystem/currentHealth",
    "ammo": "component:WeaponSystem/currentAmmo",
    "nearbyEnemies": "component:RadarSystem/method:GetNearbyEnemyCount"
}, function(results) {
    console.log(`Player at ${JSON.stringify(results.position)} has ${results.health} HP and ${results.ammo} ammo`);
    console.log(`${results.nearbyEnemies} enemies nearby`);
});
```

### Input Tracking with Tracker Components

Bridge provides powerful built-in tracking components that handle user input events and automatically track state. These Tracker components serve as the foundation for responsive UI:

```javascript
// Create a keyboard tracker to handle keyboard input
let howHigh = 10.0; // When the user says jump, you say how high.
const keyboard = bridge.createObject({
    prefab: "Prefabs/KeyboardTracker",
    update: {
        "tracking": true,              // Enable keyboard tracking
        "inputStringTracking": true,   // Track text input
        "keyEventTracking": true       // Track key events
    },
    interests: {
        "KeyEvent": {
            query: {
                "keyCode": "keyEvent/keyCode",
                "type": "keyEvent/type",
                "character": "keyEvent/character"
            },
            handler: function(obj, data) {
                console.log(`Key event: ${data.keyCode}`);
                
                // Handle specific keys
                if (data.keyCode === 32) { // Space bar
                    var jumpHeight = 10.0;
                    bridge.updateObject(player, {
                        "component:PlayerController/method:Jump": [howHigh]
                    });
                }
            }
        }
    }
});
```

### Expressing Interest in Events

Register for Unity events with automatic parameter extraction:

```javascript
// Create an object with interest in collision events
const projectile = bridge.createObject({
    prefab: "Prefabs/Projectile",
    interests: {
        // Listen for collision events with specific data we want
        "Collision": {
            query: {
                "hitPosition": "collision/contacts/[0]/point",
                "hitObject": "collision/gameObject/name",
                "hitForce": "collision/impulse/magnitude"
            },
            handler: function(obj, data) {
                console.log(`Hit ${data.hitObject} at ${JSON.stringify(data.hitPosition)} with force ${data.hitForce}`);
                
                // Create explosion effect at hit position
                bridge.createObject({
                    prefab: "Prefabs/Explosion",
                    update: {
                        "transform/position": data.hitPosition,
                        "component:ParticleSystem/startSize": data.hitForce / 100
                    }
                });
                
                // Destroy the projectile that collided
                bridge.destroyObject(obj);
            }
        },
        
        // Listen for lifetime expiration
        "LifetimeExpired": {
            handler: function(obj) {
                bridge.destroyObject(obj);
            }
        }
    }
});
```

## Architecture That Empowers JavaScript Through WebAssembly

Bridge doesn't just embrace WebAssembly - it leverages WebAssembly to empower JavaScript as the commanding force in the application:

### 1. Direct Memory Sharing via Linear Memory

Unlike typical WebAssembly modules that restrict themselves to function calling, Bridge implements a zero-copy texture and data sharing system:

```javascript
// JavaScript accessing Unity's WebAssembly memory directly
function _Bridge_UpdateTexture(id, imageData) {
    var pointer = _Bridge_LockTexture(id);
    var byteCount = imageData.width * imageData.height * 4;
    // Direct access to WebAssembly linear memory
    var heapBytes = new Uint8Array(Module.HEAPU8.buffer, pointer, byteCount);
    heapBytes.set(imageData.data);
    _Bridge_UnlockTexture(id);
}
```

This enables lightning-fast texture transfers without serialization/deserialization overhead.

### 2. Memory-Pinning For Safe Sharing

On the C# side, Bridge uses sophisticated memory management techniques that work within Unity's IL2CPP restrictions:

```csharp
[MonoPInvokeCallback(typeof(LockTextureDelegate))]
public static int LockTexture(int id) {
    // Pin memory so GC doesn't relocate it during JavaScript access
    textureInfo.handle = GCHandle.Alloc(textureInfo.data, GCHandleType.Pinned);
    textureInfo.pointer = textureInfo.handle.AddrOfPinnedObject();
    return (int)textureInfo.pointer;
}
```

### 3. Event-Driven Bidirectional Communication

Rather than relying solely on function calls, Bridge implements a full event system allowing both environments to communicate asynchronously.

## Working Around IL2CPP's Reflection Limitations

Unity's IL2CPP compilation process takes C# code, compiles it to Common Intermediate Language (CIL) bytecode, then transpiles that to C++, and finally compiles to native code. Unlike Mono's just-in-time (JIT) compilation, IL2CPP is an ahead-of-time (AOT) compiler that strips most reflection capabilities to optimize size and performance. This stripping would normally cripple a dynamic bridge that relies on reflection. Bridge solves this with ingenious workarounds:

### 1. Path-Based Accessor System

Instead of reflection, Bridge uses a string-based path notation to traverse object graphs:

```javascript
// Access a deeply nested property without reflection
queryObject(world.player, {
    "position": "transform/position",
    "health": "component:PlayerStats/currentHealth",
    "inventory": "component:Inventory/items/count"
}, callback);
```

### 2. Pre-Registered Callback Delegates

Since dynamic delegate creation is limited in IL2CPP, Bridge implements a pre-registered callback system:

```csharp
[DllImport("__Internal")]
public static extern void _Bridge_HandleAwake(
    AllocateTextureDelegate allocateTextureCallback,
    // Additional delegates...
);
```

These delegates are registered early in the application lifecycle, allowing JavaScript to reliably invoke C# code later.

## The Critical P/Invoke Glue Layer

At the heart of Bridge's WebGL implementation is a sophisticated P/Invoke mechanism that connects C# code to JavaScript functions. This often-overlooked glue code is what makes the entire cross-language communication possible:

### JavaScript Injection via Bridge.jslib

Unity's WebGL build process allows JavaScript code to be injected directly into the final build through `.jslib` files. Bridge uses this mechanism with its `Bridge.jslib` file:

```javascript
// From Bridge.jslib
mergeInto(LibraryManager.library, {
  _Bridge_EvaluateJS: function(jsPointer) {
    var js = UTF8ToString(jsPointer);
    bridge.evaluateJS(js);
  },
  
  _Bridge_ReceiveBridgeToUnityEvents: function() {
    var eventCount = window.bridge._Bridge_BridgeToUnityEventQueue.length;
    if (eventCount == 0) {
      return null;
    }
    var str = window.bridge._Bridge_BridgeToUnityEventQueue.join(',');
    window.bridge._Bridge_BridgeToUnityEventQueue.splice(0, eventCount);
    
    // Allocate memory in WebAssembly space for the string
    var bufferSize = lengthBytesUTF8(str) + 1;
    var buffer = _malloc(bufferSize);
    stringToUTF8(str, buffer, bufferSize);
    return buffer;
  },
  // Additional functions...
});
```

### C# P/Invoke Declarations

On the C# side, these JavaScript functions are accessed using P/Invoke through `DllImport` declarations with the special `__Internal` library name:

```csharp
// From BridgeTransportWebGL.cs
[DllImport("__Internal")]
public static extern void _Bridge_EvaluateJS(string js);

[DllImport("__Internal")]
public static extern string _Bridge_ReceiveBridgeToUnityEvents();

[DllImport("__Internal")]
public static extern void _Bridge_SendUnityToBridgeEvents(string evListString);
```

### Bidirectional Callback System

For JavaScript to call back into C# code (which is compiled to WebAssembly), Bridge uses a special callback registration system:

```csharp
// Register C# callbacks with JavaScript
[DllImport("__Internal")]
public static extern void _Bridge_HandleAwake(
    AllocateTextureDelegate allocateTextureCallback,
    FreeTextureDelegate freeTextureCallback,
    LockTextureDelegate lockTextureCallback,
    UnlockTextureDelegate unlockTextureCallback);

// Mark the callback as safe for use from JavaScript
[MonoPInvokeCallback(typeof(AllocateTextureDelegate))]
public static int AllocateTexture(int width, int height) {
    // Implementation...
}
```

On the JavaScript side, these callbacks are invoked using Emscripten's `Runtime.dynCall`:

```javascript
// From Bridge.jslib
function _Bridge_AllocateTexture(width, height) {
    var result = Runtime.dynCall('iii', allocateTextureCallback, [width, height]);
    return result;
}
```

### String and Memory Management

Bridge carefully handles string conversions and memory management between the JavaScript and WebAssembly environments:

```javascript
// JavaScript side: Converting WebAssembly pointer to JS string
var js = UTF8ToString(jsPointer);

// JavaScript side: Allocating WebAssembly memory and writing a string
var bufferSize = lengthBytesUTF8(str) + 1;
var buffer = _malloc(bufferSize);
stringToUTF8(str, buffer, bufferSize);
```

This P/Invoke mechanism provides the foundation for all cross-environment communication in Bridge, enabling the seamless bidirectional bridge between JavaScript and Unity's C# environment through WebAssembly.

## High-Level Component Architecture

Above the low-level transport mechanisms, Bridge implements an elegant object-oriented component architecture that makes Unity objects easily accessible from JavaScript:

### BridgeObject: The Foundation of Integration

At the core of this architecture is `BridgeObject`, a MonoBehaviour subclass that provides a bridge-friendly interface to Unity GameObject hierarchies:

```csharp
public class BridgeObject : MonoBehaviour
{
    public string id;
    public Bridge bridge;
    public Dictionary<string, Dictionary<string, object>> interests;
    
    // Handle events from JavaScript
    public virtual void HandleEvent(JObject ev)
    {
        // Event handling implementation
    }
    
    // Send events to JavaScript
    public void SendEventName(string eventName)
    {
        // Event sending implementation
    }
}
```

This design allows developers to create custom Bridge-aware components by simply subclassing `BridgeObject` and implementing their specific functionality.

### Interest-Based Event System: Pre-Fetching for Optimal Performance

One of Bridge's most powerful features is its interest-based event system with pre-defined query dictionaries. This sophisticated system fundamentally changes how event data is communicated across the JavaScript-WebAssembly boundary:

#### Declarative Data Requirements

JavaScript declares its precise data needs upfront when expressing interest in an event:

```javascript
// JavaScript expressing interest in collision events with specific data needs
createObject({
    prefab: "Player",
    interests: {
        "Collision": {
            query: {
                "position": "transform/position",                  // Only need position, not rotation, scale, etc.
                "otherObjectType": "collider/gameObject/tag",      // Only need the tag, not the entire GameObject
                "impactForce": "collisionInfo/impulse/magnitude",  // Only need the magnitude, not the full vector
                "health": "component:HealthSystem/currentHealth"   // Only need current health, not max health, etc.
            },
            handler: function(obj, results) {
                console.log("Collision at position", results.position, 
                            "with", results.otherObjectType,
                            "force:", results.impactForce,
                            "health remaining:", results.health);
            }
        }
    }
})
```

#### Front-Loaded Data Optimization

This architecture creates several critical performance optimizations:

1. **Selective Data Extraction**: When a collision occurs, only the specific requested data fields are extracted and sent, not the entire collision data structure:

```csharp
// C# side - Only extracts the exact data JavaScript requested
public void OnCollisionEnter(Collision collision)
{
    // The magic happens in SendEventName
    // It reads the pre-registered interest and only queries for exactly what was requested
    SendEventName("Collision", collision);
    
    // Behind the scenes, it executes path expressions for each query item:
    // results["position"] = AccessPath(this, "transform/position");
    // results["otherObjectType"] = AccessPath(collision, "collider/gameObject/tag");
    // ...and so on, creating a minimal data package
}
```

2. **Message Size Minimization**: Instead of sending large, complex objects across the WebAssembly boundary, only the requested fields traverse the bridge:

```javascript
// Without pre-defined interests, the entire collision data might be sent - often 10-100x larger
{
  event: "Collision",
  id: "player_1",
  data: {
    collision: { /* Potentially hundreds of properties nested many layers deep */ }
  }
}

// With interests, only requested data crosses the boundary
{
  event: "Collision",
  id: "player_1",
  data: {
    position: {x: 10.5, y: 1.2, z: -5.3},
    otherObjectType: "Enemy",
    impactForce: 150.75,
    health: 85
  }
}
```

3. **Eliminated Request-Response Cycles**: Traditional approaches require additional round-trips after an event:

```javascript
// Traditional approach (without interests)
// 1. Receive collision event
function onCollision(id, collisionEvent) {
    // 2. Have to query separately for each piece of data needed
    queryObject(id, "transform/position", function(position) {
        queryObject(collisionEvent, "collider/gameObject/tag", function(tag) {
            queryObject(collisionEvent, "impulse/magnitude", function(force) {
                // 3. Finally have all the data, but required 3 extra round-trips
                handleCollision(position, tag, force);
            });
        });
    });
}
```

4. **Zero Latency Access to All Required Data**: With interests, all necessary data arrives with the initial event:

```javascript
// Bridge interest-based approach
// All data arrives with the event - zero additional queries needed
function handleCollision(obj, results) {
    // Everything needed is immediately available
    updateUI(results.position, results.otherObjectType, results.impactForce, results.health);
    playSound(results.impactForce > 100 ? "heavyImpact" : "lightImpact");
    checkGameState(results.health);
}
```

#### Technical Implementation

The system works by:

1. **Registration Time Processing**: When JavaScript registers an interest, Bridge stores the event name, the interested object, and the query dictionary

2. **Event Time Evaluation**: When an event occurs, before sending it to JavaScript, Bridge:
   - Checks which objects are interested in this event type
   - For each interested object, retrieves its pre-registered query dictionary
   - Evaluates each path expression against the event source object
   - Builds a custom, minimal data package containing only the requested data
   - Sends only this optimized data package to JavaScript

3. **Handler Delivery**: The JavaScript side receives precisely the data it requested, with no need for follow-up queries

This approach eliminates the request-response cycle common in other WebAssembly integration approaches, where an event triggers multiple follow-up data queries. By front-loading the data specification, Bridge achieves significant performance benefits:

- **Reduced Message Count**: What might require 5-10 WebAssembly<->JavaScript transitions is reduced to just one
- **Minimized Data Transfer**: Only requested data traverses the boundary, not entire objects
- **Eliminated Latency**: No waiting for follow-up queries to complete
- **Predictable Performance**: Event handling time is consistent and deterministic
- **Simplified Development**: Clear declaration of data dependencies

The combination of pre-expressed interests and path expressions creates a powerful, flexible communication system that is optimized for WebAssembly's unique constraints and capabilities.

### Universal Path Expressions

Bridge's path expressions are remarkably powerful and versatile, capable of traversing virtually any object structure in the Unity ecosystem and beyond. The path expression system is deeply integrated with JSON.NET and can navigate:

```
// Examples of path expressions and what they can access

// Unity Transform hierarchy
"transform/parent/parent/child[2]/position/x"       // Access the x position of a specific child in the hierarchy

// GameObject and components
"gameObject/component:Rigidbody/mass"               // Access the mass property of a Rigidbody component
"component:Renderer/materials/[0]/color"            // Access the color of the first material

// Unity collections and arrays
"inventory/items/[5]/durability"                    // Access the durability of the 6th inventory item
"component:AudioSource/clips/Length"                // Get the length of an audio clip array

// JSON.NET objects
"jsonData/results/[0]/properties/value"             // Navigate into a JObject structure
"serverResponse/items/[?(@.type=='weapon')]/damage" // Use a JSON Path expression for filtering

// Method invocation with parameters
"component:PlayerController/method:Jump"            // Call a method with no parameters
"component:Weapon/method:Fire/[0, 10, true]"        // Call a method with multiple parameters

// Instantiated prefabs
"prefab:Projectile/component:Bullet/damage"         // Access a property on a prefab

// Dynamic objects and dictionaries
"globals/playerStats/currentLevel"                  // Access a global variable
"component:EnemyAI/behaviorTree/nodes/[active]/state" // Access active nodes in a behavior tree
```

The path expression system handles:

1. **Type Traversal**: Automatically navigates between different object types
2. **Component Access**: Gets components from GameObjects using `component:Name` syntax
3. **Method Invocation**: Calls methods with parameters using `method:Name` syntax
4. **Collection Indexing**: Accesses elements in arrays, lists and dictionaries
5. **JSON Structure Navigation**: Traverses JObject, JArray, and other JSON.NET structures
6. **Dynamic Properties**: Accesses dynamic and dictionary properties
7. **Prefab References**: References prefabs and instantiated objects
8. **Error Handling**: Gracefully handles missing or null references

This powerful system effectively replaces reflection with a string-based navigation approach that works within IL2CPP's limitations while providing even more capabilities in some areas.

### Batched Data Queries with queryObject

Bridge provides a powerful mechanism for efficiently retrieving scattered data from across the Unity address space through its `queryObject` function. Unlike the pre-registered queries in the interest system, `queryObject` is an asynchronous batched data retrieval mechanism:

```javascript
// JavaScript querying for scattered data across the Unity address space
queryObject(gameController, {
    "playerCount": "activePlayers/count",                       // From a property
    "currentLevel": "levelManager/currentLevel/name",           // From a nested object
    "highScore": "scoreManager/highScore",                      // From another component
    "isPaused": "timeManager/isPaused",                         // From yet another component
    "worldState": "component:WorldManager/serializeState()",    // Result of method call
    "allPlayerPositions": "players/[*]/transform/position"      // Bulk collection query
}, function(results) {
    // Process all requested data at once
    console.log(`Level ${results.currentLevel} has ${results.playerCount} players`);
    updateUI(results);
});
```

This mechanism offers several key advantages:

1. **Batched Retrieval**: Multiple pieces of data, potentially scattered across different Unity objects, components, and subsystems, are retrieved in a single round-trip

2. **Unified Interface**: All data comes back in a single callback with a results object structured exactly like the query

3. **Automatic Conversion**: Each piece of data is automatically converted from Unity types to JSON-compatible JavaScript objects

4. **Path Expression Power**: The full power of Bridge's path expressions can be used to access any data in the Unity environment

5. **Flexible Use Cases**: Ideal for initializing UI components, gathering system state, or performing complex queries

#### The Difference Between queryObject and Interest Queries

While they use the same path expression syntax, there are important differences:

1. **Timing**:
   - `queryObject`: Executed on-demand when JavaScript explicitly requests data
   - Interest queries: Pre-registered during object creation, automatically executed when events occur

2. **Intent**:
   - `queryObject`: General-purpose data retrieval, useful for UI updates, state checks, and debugging
   - Interest queries: Event-specific data retrieval, optimizing event handling by reducing round-trips

3. **Workflow**:
   - `queryObject`: Part of normal application flow, explicitly called when data is needed
   - Interest queries: Part of the event system setup, declared in advance to optimize future event handling

Together, these query mechanisms provide a complete system for efficiently accessing Unity data from JavaScript, with appropriate tools for both immediate data needs and optimized event handling.

### JSON<=>Unity Automatic Conversion

Bridge leverages and extends JSON.NET to provide seamless conversion between JavaScript objects and Unity data structures:

```javascript
// JavaScript sending complex data to Unity
updateObject(player, {
    "transform/position": { x: 10, y: 0, z: 5 },
    "renderer/material/color": "#FF5500",
    "settings/controls": {
        sensitivity: 0.8,
        invertY: true,
        deadzone: 0.1
    }
});
```

The conversion system includes:

1. **Built-in converters** for Unity types like Vector3, Quaternion, Color, etc.
2. **Automatic type detection** that converts JSON to the appropriate C# type
3. **Custom converter registration** for user-defined types
4. **Unity collection support** for handling Lists, Dictionaries, and arrays
5. **Path-based object traversal** to update deeply nested properties

This bidirectional conversion system works within the limitations of IL2CPP by implementing its own type-conversion logic that doesn't rely on reflection, making it safe for WebGL builds.

Together, these high-level components create an elegant, object-oriented system that makes it remarkably easy to control Unity from JavaScript while maintaining good performance and separation of concerns.

## Accelerated Development Workflow

Perhaps one of Bridge's most significant benefits is how it dramatically improves the Unity development workflow:

### Minimizing Rebuild Cycles

Despite the complexity of the Unity/WebGL/WebAssembly stack, Bridge enables a workflow that drastically reduces the number of times you need to rebuild the Unity application:

1. **JS-First Development**: Place core application logic in JavaScript, which can be modified without rebuilding
2. **Hot Reloading**: Change JavaScript code while the application is running
3. **Rapid Iteration**: Test changes in seconds rather than minutes or hours
4. **Component Testing**: Test Unity components without a JavaScript engine or rebuilding in the Unity Editor

This approach transforms the development experience from the traditional slow Unity build cycle to a much more responsive and developer-friendly workflow.

### Hybrid Development Model

Bridge supports a hybrid development model where you can:

1. Test Unity components in isolation within the Unity Editor
2. Develop JS logic independently using modern web development tools
3. Integrate both sides with minimal friction
4. Deploy to multiple platforms from the same codebase

By decoupling the JavaScript and Unity components, each can be developed and tested using the tools and workflows best suited to that environment, dramatically reducing the overall development time.

### Optimized Testing Cycles

The traditional Unity WebGL development cycle is notoriously slow:
```
Make code change → Rebuild (often 10+ minutes) → Test → Repeat
```

Bridge transforms this into:
```
Make Unity component changes → Test in Editor
Make JavaScript logic changes → Refresh browser (seconds) → Test → Repeat
```

This workflow optimization can reduce development time by orders of magnitude, particularly for complex applications.

## Performance Through WebAssembly Optimization

Bridge isn't just about functionality - it's built for performance:

1. **Batched Command Processing**: Commands are grouped to minimize costly JavaScript-WebAssembly transitions
2. **Shared Memory Access**: Uses direct memory sharing instead of serialization for large data structures
3. **Texture Caching**: Implements smart reuse of texture allocations to minimize VRAM pressure
4. **Event Pooling**: Reduces garbage collection pressure through object reuse

## JavaScript-First Development: A Revolutionary Approach

What truly sets Bridge apart is its JavaScript-first approach to Unity development:

### 1. JavaScript as Command Central

Bridge flips the traditional Unity development model by making JavaScript the commanding force. Instead of JavaScript being called from C#, JavaScript drives the application logic, with Unity providing the rendering and physics capabilities. This puts the entire JavaScript ecosystem at your command, with Unity serving as a powerful visual and physics engine.

### 2. Live Coding Without Recompilation

Make changes to JavaScript code and see them instantly in your running Unity application - no recompilation required. This produces development cycles measured in seconds instead of minutes, dramatically accelerating iteration speed.

### 3. Interactive Debugging and Runtime Inspection

Use browser developer tools for debugging, with full access to the application state. Set breakpoints, inspect variables, profile performance, and test changes on the fly - all with standard web tools you already know and love.

### 4. Hot Reloading of Assets and Code

Change JavaScript logic, swap assets, modify styles, and see changes instantly without restarting the application. This creates a REPL-like development environment that was previously impossible with Unity's traditional compilation model.

### 5. Full JavaScript Ecosystem Access

Use npm, modern frameworks, and the entire JavaScript ecosystem directly within your Unity application. Need a sophisticated charting library? Just import it. Want to use React for UI? Go ahead. Leverage TypeScript for type safety? No problem.

### 6. Sophisticated Memory Management

Bridge's texture and data sharing system makes it possible to efficiently transfer large amounts of data between JavaScript and Unity without the overhead typically associated with cross-language communication.

## Multi-Platform Architecture

Like Unity itself, Bridge is designed to work seamlessly across multiple platforms, with platform-specific transport implementations that leverage each platform's capabilities:

- **WebGL/WASM**: The flagship implementation provides native integration with the browser's JavaScript environment and WebAssembly memory model, enabling zero-copy texture transfers and direct memory sharing. This is particularly valuable for leveraging existing JavaScript and TypeScript libraries instead of relying on often fragmented, obsolete, Windows-specific, or poorly supported C# equivalents, that may not work well within the limitations of il2cpp's restricted runtime reflection.

- **macOS & iOS**: Uses WKWebView for high-performance JavaScript execution, with full integration with native iOS and macOS functionality.

- **Android**: Implements a WebView-based transport that efficiently bridges between Unity and JavaScript.

- **Windows**: Support is in development but the architecture is designed to accommodate Windows-specific implementations.

- **Unity Editor**: Development workflows are supported directly in the Unity Editor, enabling rapid iteration.

## Flexible Backend Options

Bridge supports multiple backend configurations to suit various deployment scenarios:

- **Direct Browser Integration**: For WebGL builds, Bridge integrates directly with the hosting web page
- **Off-screen Web Browser JavaScript Engine**: For native builds on platforms supporting web browser components
- **Built-in Unity Web Server**: For standalone applications that need to host their own web server
- **SocketIO Transport**: Enables using a remote or local Node.js server as the "brain" and controller, allowing for more complex JavaScript environments and separation of concerns

This flexibility makes Bridge particularly valuable for integrating existing JavaScript/TypeScript libraries with Unity applications, avoiding the need to use less well-supported or maintained C# SDKs that are often designed primarily for Windows and not optimized for Unity's cross-platform environment or the C#/Mono/clr/Mono/il2cpp/emscripten/WebAssembly/WebGL stack limitations.

## Understanding the Unity WebGL Compilation Chain

To fully appreciate Bridge's integration approach, it helps to understand Unity's WebGL compilation chain:

1. **C# to CIL**: Unity first compiles C# code to Common Intermediate Language (CIL) bytecode (formerly known as MSIL)

2. **CIL to C++ via IL2CPP**: Instead of using Mono's JIT compiler (which isn't allowed in browsers), Unity's IL2CPP transpiles CIL bytecode to C++ code

3. **C++ to WebAssembly**: Emscripten then compiles this C++ code to WebAssembly for browser execution

This multi-stage compilation process creates unique constraints that Bridge is specifically designed to navigate, providing dynamic capabilities even within the strict confines of ahead-of-time compilation and browser security limitations.

## Installation and Getting Started

The Bridge system consists of several components:

1. **Unity-side Bridge component**: Handles C# integration and memory management
2. **JavaScript Bridge library**: Provides the JavaScript API for communicating with Unity
3. **Transport implementations**: Platform-specific communication channels

To install Bridge in your Unity project, follow these steps:

1. Add the Bridge prefab to your scene
2. Include the Bridge JavaScript files in your web build
3. Configure the appropriate transport for your target platform

## Key Components

- **Bridge.cs**: Core C# implementation
- **BridgeTransport.cs**: Abstract communication layer
- **BridgeTransportWebGL.cs**: WebGL-specific implementation
- **BridgeTransportWebView.cs**: iOS/Android WebView implementation
- **BridgeTransportSocketIO.cs**: Node.js/SocketIO implementation
- **bridge.js**: JavaScript API and event handling
- **Bridge.jslib**: WebAssembly binding layer
