# Platform Integration Notes

This document summarizes research and implementation notes regarding integrating Bridge with various platforms.

## Android Integration

Android integration involves several key areas:

### Android WebView

The Android WebView component has evolved significantly over time:
- Early versions were embedded in the Android OS and couldn't be updated independently
- Modern versions (KitKat and later) are updated through Google Play Services
- WebView runs in a separate process from the main application on newer Android versions

Key files:
- [AndroidWebView.txt](AndroidWebView.txt) - Details on WebView implementation and capabilities
- [AndroidAPI.txt](AndroidAPI.txt) - Android API version information and compatibility notes
- [AndroidDev.txt](AndroidDev.txt) - Android development tools and workflows

### Android Graphics Integration

Bridge uses SurfaceTexture and GL_TEXTURE_EXTERNAL_OES for efficient texture sharing between WebView and Unity:

```java
// Key concepts in integrating WebView with Unity textures
SurfaceTexture surfaceTexture = new SurfaceTexture(textureId);
surface = new Surface(surfaceTexture);
// Allow rendering WebView to this surface
```

See [SurfaceTexture.txt](SurfaceTexture.txt) and [ZeroCopy.txt](ZeroCopy.txt) for details.

## iOS Integration

### WKWebView and UIWebView

Bridge has adapted to Apple's transition from UIWebView to WKWebView:

- UIWebView: In-process, no JIT, easier to access directly from native code
- WKWebView: Out-of-process, JIT enabled, requires message passing
  
The change required a major architectural shift in how Bridge communicates between JavaScript and Unity.

Key files:
- [WkWebView.txt](WkWebView.txt) - Implementation details and limitations
- [AppTransportSecurity.txt](AppTransportSecurity.txt) - Handling network security in iOS

### IOSurface for Texture Sharing

Bridge uses IOSurface for zero-copy texture sharing between processes on iOS:

```objc
// IOSurface is the macOS/iOS API for sharing GPU memory between processes
IOSurfaceRef surface = IOSurfaceCreate(properties);
// Bind to GL texture
CGLTexImageIOSurface2D(context, target, internalFormat, width, height, format, type, surface, 0);
```

See [IOSurface.txt](IOSurface.txt) for implementation details.

## macOS Integration

macOS integration presents unique challenges:

- Conflicts with Unity Editor's use of Chromium Embedded Framework (CEF)
- Options for browser embedding: Native WebView, WKWebView, CEF, or Electron
- Direct texture sharing using IOSurface

Key files:
- [OSX.txt](OSX.txt) - macOS-specific implementation notes
- [OSXOpenGL.txt](OSXOpenGL.txt) - OpenGL integration on macOS
- [OSXSharedLibraries.txt](OSXSharedLibraries.txt) - Dynamic library loading

## WebGL Platform

The WebGL platform requires unique approaches since the Unity application itself runs within the browser:

- No need for embedded browser - can use the host browser directly
- WebAssembly memory sharing for efficient texture and data transfer
- P/Invoke and jslib for bridging between C# and JavaScript

Key files:
- [UnityWeBGLTextures.txt](UnityWeBGLTextures.txt) - Texture handling in WebGL builds
- [WebBrowser.txt](WebBrowser.txt) - Browser component integration details

## Windows Integration

Windows integration explores several approaches:

- Chrome Embedding Framework (CEF)
- Electron
- Native browser components

See [Windows.txt](Windows.txt) for implementation details. 