# Bridge: A Journey Through JavaScript and Unity Integration

## Historical Context

Bridge (formerly UnityJS) emerged from years of exploration at the intersection of web technologies and 3D game engines. The project was first developed while working with Jaunt VR to create a JavaScript-scriptable stereoscopic panoramic video player for Android using Google Cardboard. This pioneering implementation allowed for dynamically downloading interactive VR simulations with stereoscopic panoramic video backgrounds, procedurally playing, switching, and overlaying 3D video with interactive 3D objects.

Importantly, Arthur van Hoff, the founder of Jaunt VR (who Don Hopkins worked with at the Turing Institute on HyperLook and SimCity for NeWS), generously allowed the Bridge technology to be open-sourced. This enabled Don Hopkins to improve it further, port it to other platforms, and use it to develop his own projects – a decision that significantly broadened the impact and applications of Bridge across multiple domains.

While Unity has offered excellent 3D rendering capabilities and editor tools, its development workflow has traditionally been hampered by slow compilation cycles and limited debugging facilities, especially on mobile and WebGL platforms. Bridge was created to address these limitations, evolving from concepts in unity-webview and unity-webview-integration, but quickly expanding beyond simply displaying web content to enabling full bidirectional communication between JavaScript and Unity.

## Projects and Applications

Bridge has been successfully deployed in several significant projects:

1. **Jaunt VR** - A JavaScript-scriptable VR video player for Android using Google Cardboard that enabled interactive stereoscopic panoramic video experiences with dynamically loaded content and overlaid 3D objects. The ability to open-source this technology was crucial to its continued development and adaptation for other platforms.

2. **Pantomime** - Integration with ARKit for research into scripting interactive networked AR/VR Unity mobile applications in JavaScript, enabling rapid prototyping and development of AR experiences.

3. **Reason Street** - Implementation of JSON and Google Spreadsheet-driven financial data visualization systems with interactive 3D animated visualizations, allowing non-programmers to create and configure complex data presentations.

4. **AI Foundation** - Used for creating live scriptable AI personality models with speech recognition/synthesis chat bots, providing a flexible interface for complex AI interaction.

5. **Internet Archive** - Development of content visualization systems for archive browsing and exploration.

These diverse applications demonstrate Bridge's flexibility in supporting interactive 3D content across VR, AR, data visualization, AI, and content management domains.

## Technical Documentation 

The Bridge project includes comprehensive technical documentation across several resources:

- [README-BRIDGE-ANATOMY.md](README-BRIDGE-ANATOMY.md#bridge-system-anatomy) - Component breakdown of the Bridge system
- [README-BRIDGE-ARCHITECTURE.md](README-BRIDGE-ARCHITECTURE.md#bridge-system-architecture) - Detailed architecture explanation
- [README-BRIDGE-DOC.md](README-BRIDGE-DOC.md) - User documentation

Additionally, we've organized the extensive research notes into high-level summaries by topic:

- [Notes/Platform_Integration.md](Notes/Platform_Integration.md#platform-integration-notes) - Platform-specific integration details for [Android](Notes/Platform_Integration.md#android-integration), [iOS](Notes/Platform_Integration.md#ios-integration), [macOS](Notes/Platform_Integration.md#macos-integration), [WebGL](Notes/Platform_Integration.md#webgl-platform), and [Windows](Notes/Platform_Integration.md#windows-integration)
- [Notes/Web_Technologies.md](Notes/Web_Technologies.md#web-technologies-notes) - Browser and web technology research, including [browser embedding](Notes/Web_Technologies.md#browser-embedding-technologies), [remote debugging](Notes/Web_Technologies.md#remote-debugging), and [web standards](Notes/Web_Technologies.md#web-standards-and-apis)
- [Notes/JavaScript_Integration.md](Notes/JavaScript_Integration.md#javascript-integration-notes) - JavaScript engines and integration, covering [V8](Notes/JavaScript_Integration.md#v8-google), [ChakraCore](Notes/JavaScript_Integration.md#chakracore-microsoft), [JSON technologies](Notes/JavaScript_Integration.md#json-technologies), and [TypeScript](Notes/JavaScript_Integration.md#typescript)
- [Notes/Unity_Implementation.md](Notes/Unity_Implementation.md#unity-implementation-notes) - Unity-specific implementation notes on [editor integration](Notes/Unity_Implementation.md#unity-editor-integration), [build system](Notes/Unity_Implementation.md#build-system), and [graphics integration](Notes/Unity_Implementation.md#graphics-integration)
- [Notes/Graphics_Rendering.md](Notes/Graphics_Rendering.md#graphics-and-rendering-notes) - Graphics and rendering techniques, including [texture sharing](Notes/Graphics_Rendering.md#texture-sharing), [OpenGL integration](Notes/Graphics_Rendering.md#opengl-integration), and [shader development](Notes/Graphics_Rendering.md#shader-development)
- [Notes/VR_AR_Integration.md](Notes/VR_AR_Integration.md#vr-and-ar-integration-notes) - VR and AR platform integration for [Google VR](Notes/VR_AR_Integration.md#google-vr--cardboard), [Oculus](Notes/VR_AR_Integration.md#oculus), [ARKit](Notes/VR_AR_Integration.md#arkit-apple), and [WebXR](Notes/VR_AR_Integration.md#webxr)

## Core Architecture

Bridge employs a unique "JavaScript-first" architecture where:

1. **JavaScript drives Unity** - putting JavaScript in control of Unity objects and their behaviors
2. **Path expressions** provide a flexible way to traverse object hierarchies (like `collision/contacts/0/point`)
3. **Memory sharing** enables efficient texture and data transfer between JavaScript and Unity
4. **Interest-based events** allow handlers to pre-specify exactly which parameters to include
5. **JSON converters** automatically translate between JavaScript and C# representations of Unity types

This approach contrasts with Unity's deprecated "UnityScript" language, which was never true JavaScript and lacked compatibility with standard JavaScript libraries and tools.

## Technical Innovations

Bridge incorporates several innovative approaches to JavaScript-Unity integration:

### Memory Integration

Unlike traditional string-based messaging approaches, Bridge can leverage direct memory sharing via WebAssembly for efficient texture and data transfer. This enables high-performance operations like transferring web browser UI renderings into Unity textures.

```javascript
// Example of efficient texture transfer from JavaScript canvas to Unity
let id = window.bridge._Bridge_AllocateTexture(canvas.width, canvas.height);
let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
window.bridge._Bridge_UpdateTexture(id, imageData);
```

### Path Expression System

The path expression system allows JavaScript to access deep properties in C# object graphs via simple string paths:

```javascript
// Access first contact point in a collision
"collision/contacts/0/point"

// Access material color on a renderer component
"component:Renderer/materials/0/color"
```

This system supports traversal through arrays, lists, dictionaries, object fields, properties, transforms, and components, automatically converting between JavaScript and C# representations.

### P/Invoke Optimization

Bridge uses P/Invoke with `MonoPInvokeCallback` attributes to create efficient callback mechanisms between C# and JavaScript:

```csharp
[MonoPInvokeCallback(typeof(AllocateTextureDelegate))]
public static int AllocateTexture(int width, int height) { ... }
```

This approach is far more efficient than Unity's `GameObject.SendMessage()`, which can only pass a single string parameter and cannot return results.

## Platform-Specific Implementations

Bridge adapts to the unique characteristics of each platform:

### WebGL

For WebGL builds, Bridge seamlessly integrates with the host browser's JavaScript environment. This approach eliminates the need for additional JavaScript engines and provides excellent debugging capabilities through browser developer tools.

### iOS

On iOS, Bridge originally used UIWebView but transitioned to WKWebView when Apple deprecated UIWebView. The WKWebView runs in a separate process with JIT compilation enabled, providing faster JavaScript execution but requiring a messaging system rather than direct function calls.

This approach also benefits from Apple's unique policy allowing dynamically loaded JavaScript (but not other languages) on iOS App Store apps.

### Android

On Android, Bridge leverages the WebView component with its Chrome-based JavaScript engine. It addresses issues related to texture sharing using SurfaceTexture and GL_TEXTURE_EXTERNAL_OES for efficient rendering.

### Desktop

For desktop platforms, Bridge can either use native web browser components or integrate with Electron to provide a full Node.js environment.

## Development Journey

The development of Bridge has faced numerous challenges:

1. **Cross-platform integration**: Each platform requires unique handling of its web browser component
2. **Communication efficiency**: Moving from string serialization to more efficient binary transfers
3. **Type conversion**: Building a robust system for converting between C# and JavaScript types
4. **Platform restrictions**: Working within Apple's App Store restrictions for dynamic code loading
5. **Documentation**: Making a complex system accessible to developers

The incremental progress on these fronts is documented in the commit history and various summary notes files.

## Future Directions

Bridge continues to evolve with several promising directions:

1. **Enhanced WebAssembly Integration**: Deeper integration with emerging WASM capabilities
2. **AR/VR Platform Support**: Research into WebXR and platform-specific VR browser capabilities
3. **Extended Data Binding**: More reactive data binding between JavaScript and Unity - see [README-BRIDGE-BINDING.md](README-BRIDGE-BINDING.md) for research plans
4. **UI Framework Integration**: Better coupling with popular web UI frameworks

## Conclusion

Bridge represents a unique approach to JavaScript-Unity integration, prioritizing developer experience and leveraging the strengths of web technologies. By enabling rapid iteration, powerful debugging, and access to the vast JavaScript ecosystem, Bridge offers a compelling alternative to traditional Unity development workflows, especially for projects requiring quick iterations or deep web technology integration.

The history of Bridge is one of pragmatic problem-solving in the face of platform constraints, driven by the vision of making Unity development more agile, accessible, and connected to the web ecosystem. As both Unity and web technologies continue to evolve, Bridge will adapt to maintain its role as a crucial bridge between these worlds. 