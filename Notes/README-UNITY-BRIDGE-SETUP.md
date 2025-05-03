# Unity Bridge Setup

This document provides step-by-step instructions for setting up the Bridge system in a Unity project.

## Prerequisites

- Unity 2020.3 LTS or newer
- Newtonsoft.Json for Unity (from Unity Package Manager)
- Basic understanding of Unity concepts

## Installation Steps

1. **Import Core Files**
   - Copy the `Assets/Scripts/Bridge` directory into your project
   - Copy the `Assets/Plugins/WebGL/bridge.jslib` file into your project's Plugins/WebGL directory

2. **Create Bridge GameObject**
   - In your main scene, create an empty GameObject named "Bridge"
   - Add the `Bridge.cs` component to this GameObject
   - Configure the following settings:
     - Game ID: A unique identifier for your application
     - URL: The path to the bridge HTML file (default: "bridge.html")

3. **Configure WebGL Template**
   - In Project Settings > Player > WebGL, set "WebGL Template" to "Bridge"
   - If using a custom template, ensure it includes the necessary Bridge JavaScript files

4. **Import Bridge JavaScript Files**
   - Copy the Bridge JavaScript files to your `Assets/StreamingAssets/Bridge` directory:
     - bridge.js
     - bridge-transport-webgl.js
     - Additional utility JavaScript files

5. **Configure Communication**
   - Implement `IBridgeListener` on components that need to receive messages from JavaScript
   - Register these components with the Bridge using `Bridge.Instance.RegisterListener(this)`

## Basic Usage

```csharp
// Send a message to JavaScript
Bridge.Instance.SendToJavaScript(new JObject {
    ["type"] = "log",
    ["message"] = "Hello from Unity!"
});

// Receive a message in an IBridgeListener component
public void OnMessageFromJavaScript(JObject message) {
    if (message["type"]?.ToString() == "hello") {
        Debug.Log("Received hello from JavaScript!");
    }
}
```

## Advanced Configuration

For detailed configuration options and advanced usage, see [README-UNITY-BRIDGE.md](./README-UNITY-BRIDGE.md).

## Troubleshooting

- **WebGL Build Issues**: Ensure the correct WebGL template is selected and all required JavaScript files are included
- **Communication Errors**: Check browser console for JavaScript errors
- **Message Not Received**: Verify that listeners are properly registered with the Bridge

## Platform-Specific Notes

- **WebGL**: Uses direct JavaScript integration
- **Desktop**: Uses Chromium Embedded Framework (requires additional setup)
- **Mobile**: Uses native WebViews (requires platform-specific configuration)

For comprehensive documentation on the Bridge architecture and capabilities, refer to [README-UNITY-BRIDGE.md](./README-UNITY-BRIDGE.md). 