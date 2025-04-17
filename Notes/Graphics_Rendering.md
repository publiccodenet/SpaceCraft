# Graphics and Rendering Notes

This document summarizes graphics and rendering techniques used in Bridge.

## Texture Sharing

Bridge implements efficient texture sharing between JavaScript/browser contexts and Unity:

### Zero-Copy Techniques

Zero-copy approaches avoid unnecessary data copying between processes:

- WebAssembly shared memory
- IOSurface on macOS/iOS
- SurfaceTexture on Android
- WebGL texture binding

Key files:
- [ZeroCopy.txt](ZeroCopy.txt) - Zero-copy implementation techniques
- [IOSurface.txt](IOSurface.txt) - macOS/iOS texture sharing
- [SurfaceTexture.txt](SurfaceTexture.txt) - Android texture sharing

## OpenGL Integration

Bridge leverages OpenGL for cross-platform graphics:

- Texture binding between browser and Unity
- Custom shaders for rendering web content
- WebGL integration

Key files:
- [GL.txt](GL.txt) - OpenGL integration notes
- [OSXOpenGL.txt](OSXOpenGL.txt) - macOS-specific OpenGL details

## Shader Development

Bridge includes custom shaders for various rendering needs:

- Skybox shaders for panoramic content
- Material conversion between JavaScript and Unity
- Custom effects for VR/AR

Key files:
- [SkyboxShaders.txt](SkyboxShaders.txt) - Skybox implementation details

## Platform-Specific Graphics

### macOS/iOS Graphics

- Metal integration
- IOSurface for texture sharing
- WKWebView rendering capture

### Android Graphics

- OpenGL ES integration
- SurfaceTexture
- Hardware acceleration considerations

### Windows Graphics

- DirectX integration
- Spout for texture sharing

Key files:
- [Syphon.txt](Syphon.txt) - macOS texture sharing framework
- [Windows.txt](Windows.txt) - Windows graphics integration details

## Unity Graphics Integration

Bridge extends Unity's graphics capabilities:

- Texture2D creation and updates from JavaScript
- Canvas rendering to Unity textures
- WebGL integration

Key files:
- [unity-plugin-graphics.txt](unity-plugin-graphics.txt) - Unity graphics integration techniques 