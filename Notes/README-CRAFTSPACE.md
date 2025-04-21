# CraftSpace Unity Client

This document describes the Unity-based 3D visualization component of the CraftSpace project.

## Overview

The CraftSpace Unity client provides an immersive 3D environment for exploring Internet Archive collections. It renders collections in a spatial context, allowing users to browse, search, and interact with digital content in novel ways.

Key features include:

1. **Spatial Visualization**: Renders collections in 3D space with multiple organizational models
2. **Multi-Resolution Display**: Efficiently displays thousands of items simultaneously
3. **Interactive Navigation**: Intuitive camera controls for exploring the environment
4. **Content Integration**: Seamless display of Internet Archive content and metadata
5. **WebGL Deployment**: Runs directly in web browsers with no installation required

## Architecture

The CraftSpace Unity client follows a modular architecture:

```
Unity/CraftSpace/
├── Assets/
│   ├── Scripts/                  # C# scripts
│   │   ├── UI/                   # User interface components
│   │   ├── Visualization/        # Visualization components
│   │   ├── Data/                 # Data handling and processing
│   │   ├── Navigation/           # Camera and movement control
│   │   └── Integration/          # BackSpace API integration
│   ├── Prefabs/                  # Reusable game objects
│   ├── Scenes/                   # Unity scenes
│   ├── Materials/                # Materials and shaders
│   ├── Resources/                # Runtime-loadable assets
│   │   └── Collections/          # Pre-bundled collections
│   └── WebGLTemplates/           # WebGL page templates
└── ProjectSettings/              # Unity project settings
```

## Core Components

### 1. Visualization System

CraftSpace implements advanced visualization techniques to efficiently render large collections in 3D space. For detailed information about the multi-resolution representation system, texture atlases, and rendering strategies, see the [Visualization Techniques documentation](./README-VISUALIZATION.md).

### 2. Navigation Controls

The navigation system provides intuitive controls for exploring collections:

- **Orbital Camera**: Pivot around collection focal points
- **Pan and Zoom**: Move laterally and adjust distance
- **Focus Controls**: Quickly focus on specific items or regions
- **Context Awareness**: Camera adjusts behavior based on content layout

### 3. User Interface

The UI system provides several key interfaces:

- **Control Panel**: Search, filter, and visualization options
- **Information Panel**: Displays metadata for selected items
- **Navigation Aids**: Breadcrumbs, minimap, and location markers
- **Context Menu**: Item-specific actions and options

### 4. Data Integration

The data system connects to the BackSpace application:

- **Collection Loader**: Fetches collection data via API
- **Progressive Loading**: Loads data based on visibility and priority
- **Cache Management**: Handles local storage of collection data
- **Realtime Updates**: Subscribes to changes in collection data

## Spatial Visualization Models

CraftSpace supports multiple ways to organize collections in space. For detailed information about the spatial organization models (Library View, Timeline View, Network View, Map View, etc.), see the [Spatial Organization Models section in the Visualization documentation](./README-VISUALIZATION.md#spatial-organization-models).

## Performance Optimization

CraftSpace implements several techniques to maintain performance with large collections. For detailed information about rendering optimizations, memory management, and performance targets, see the [Performance Optimization Techniques section in the Visualization documentation](./README-VISUALIZATION.md#performance-optimization-techniques).

## Multi-Device Experience

CraftSpace supports various multi-device configurations:

### Browser Tab Synchronization

Multiple browser tabs can be synchronized to create multi-display setups:

- **Main Display**: Primary visualization window
- **Control Display**: UI and search interface
- **Content Display**: Detailed content view for selected items
- **Overview Display**: Zoomed-out map of the entire collection

This allows for creative setups across multiple screens or devices without requiring special hardware.

### Mobile Integration

Mobile devices can integrate with the main CraftSpace experience:

- **QR Login**: Scan code on main display to connect mobile device
- **Remote Control**: Use mobile device to navigate the main display
- **Personal Viewer**: View selected content on personal device
- **Collaborative Annotation**: Add notes and highlights from mobile

## Extended Use Cases

### Interactive Exhibitions

CraftSpace can be configured for museum or library exhibitions:

- **Curated Collections**: Specially arranged content with curatorial notes
- **Guided Tours**: Predefined paths through collections with commentary
- **Interactive Stations**: Physical buttons/controls connected to web interfaces
- **Projection Mapping**: Content visualized on physical structures

### Educational Settings

For classrooms and educational environments:

- **Group Exploration**: Multiple users exploring shared collections
- **Teacher Controls**: Instructor can guide and focus student attention
- **Assignment Integration**: Tasks and questions embedded in collections
- **Resource Collection**: Students can gather and organize research materials

## Software Emulation Integration

For detailed information about the software emulation features (emulators, collaborative gameplay, etc.), see the [Special Features section in the Visualization documentation](./README-VISUALIZATION.md#special-features).

## Development Workflow

### Setting Up the Unity Project

1. **Prerequisites**:
   - Unity 2022.3.X LTS or newer
   - Git LFS (for handling large binary files)

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/craftspace.git
   cd craftspace
   git lfs pull
   ```

3. **Open in Unity**:
   - Launch Unity Hub
   - Add the `Unity/CraftSpace` directory as a project
   - Open the project

### Running in Development Mode

1. **BackSpace Integration**:
   ```bash
   # Start the BackSpace server
   cd SvelteKit/BackSpace
   npm run dev
   ```

2. **Unity Editor Play Mode**:
   - Open the main scene in `Assets/Scenes`
   - Press Play in the Unity Editor
   - Development build will connect to local BackSpace server

### WebGL Build Process

1. **Build the Unity WebGL Project**:
   - Open Unity Build Settings (File > Build Settings)
   - Select WebGL platform
   - Click "Build" and select the output directory

2. **Integrate with BackSpace**:
   ```bash
   # Option 1: Manual copy
   cp -r WebGLBuild/* ../SvelteKit/BackSpace/static/unity/

   # Option 2: Using build script
   cd SvelteKit/BackSpace
   npm run build:unity
   ```

## Customization

### Scene Configuration

The main scene can be configured through scriptable objects:

- `Assets/ScriptableObjects/AppConfig.asset`: General application settings
- `Assets/ScriptableObjects/VisualizationConfig.asset`: Visualization parameters
- `Assets/ScriptableObjects/UIConfig.asset`: User interface settings

### Adding New Visualization Modes

To implement a new visualization mode:

1. Create a new class that inherits from `BaseVisualizationMode`
2. Implement the required methods for positioning and organizing items
3. Register the mode in the `VisualizationManager`
4. Add UI controls for the new mode

## Integration with BackSpace

### Communication Protocol

CraftSpace communicates with the BackSpace application through:

1. **Direct API Calls**: HTTP requests to BackSpace API endpoints
2. **JavaScript Interop**: Two-way communication with the hosting page
3. **WebSocket Updates**: Real-time updates for collaborative features

### JavaScript Bridge

The JavaScript bridge enables communication between Unity and SvelteKit:

```javascript
// Example of SvelteKit sending data to Unity
function sendToUnity(eventName, data) {
  if (window.unityInstance) {
    window.unityInstance.SendMessage('JSBridge', 'HandleEvent', 
      JSON.stringify({ event: eventName, data: data })
    );
  }
}

// Example of Unity sending data to SvelteKit
// Called by Unity's JSBridge.cs
function receiveFromUnity(jsonData) {
  const event = JSON.parse(jsonData);
  // Dispatch to SvelteKit event handlers
}
```

## Future Directions

Planned enhancements for the CraftSpace Unity client include:

1. **Advanced Spatial UI**: More intuitive 3D user interfaces
2. **Enhanced Navigation**: Additional navigation modes and controls
3. **Performance Improvements**: Further optimization for larger collections
4. **Mobile-Optimized Version**: Native mobile builds for enhanced performance
5. **XR Support**: Virtual reality and augmented reality experiences

For a complete list of planned visualization enhancements, see the [Future Visualization Enhancements section in the Visualization documentation](./README-VISUALIZATION.md#future-visualization-enhancements).

This roadmap will be implemented incrementally, with each phase building on previous work while providing immediate value to users.
