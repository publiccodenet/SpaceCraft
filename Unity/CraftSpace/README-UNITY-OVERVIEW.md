# CraftSpace Unity Implementation Overview

## Architecture Overview

CraftSpace uses Unity as a powerful visualization layer for Internet Archive collections, employing a JavaScript-first architecture where:

- **Core Application Logic**: Lives in JavaScript within the SvelteKit application
- **Visualization & Interaction**: Implemented in Unity for rich 3D experiences
- **Cross-Platform Communication**: JSON-based messaging between JavaScript and Unity
- **Data-Driven Content**: Dynamically generated based on collection data

## Design Philosophy

### JavaScript-First Approach

CraftSpace departs from traditional Unity development by treating Unity primarily as a rendering engine controlled by JavaScript:

- **State Management in JavaScript**: Core application state lives in the SvelteKit app
- **Unity Components Are Stateless**: They react to messages rather than maintain state
- **Hot Reloading**: Modify application logic without rebuilding Unity
- **Browser DevTools**: Leverage existing web development tools

### Visualization-as-a-Service

Unity serves as a spatial visualization service that:
- Renders complex 3D representations of digital collections
- Provides intuitive spatial navigation
- Creates immersive, embodied interactions with digital content
- Offers performant rendering across devices

## Project Structure

```
Unity/CraftSpace/
├── Assets/
│   ├── Plugins/          - Third-party libraries (JSON.NET, etc.)
│   ├── Prefabs/          - Reusable Unity components
│   │   ├── UI/           - User interface elements
│   │   ├── Books/        - Book visualization prefabs
│   │   └── Environment/  - Spatial environment elements
│   ├── Scripts/          - C# scripts
│   │   ├── Bridge/       - JavaScript communication
│   │   ├── Visualization/ - Rendering and visualization
│   │   ├── Input/        - Input handling systems
│   │   ├── Models/       - Generated C# classes from schemas
│   │   └── Utils/        - Utility functions
│   ├── Scenes/           - Unity scenes
│   ├── Schemas/          - JSON schemas (imported from BackSpace)
│   └── Resources/        - Runtime-loaded assets
└── Packages/             - Unity package dependencies
```

## Application Flow

1. **Initialization**:
   - SvelteKit application loads
   - Unity WebGL player initializes
   - Communication bridge established

2. **Content Loading**:
   - JavaScript requests collection data
   - Collection metadata sent to Unity
   - Unity creates visualization components

3. **User Interaction**:
   - User interacts with Unity visualization
   - Input events sent to JavaScript
   - Application logic processed in JavaScript
   - Visualization updates sent back to Unity

4. **Content Exploration**:
   - Dynamic loading of content as needed
   - Spatial organization based on metadata
   - Media preview and interaction

## Related Documentation

- [Unity Messaging](./README-UNITY-MESSAGING.md) - Communication between JavaScript and Unity
- [Unity Visualization](./README-UNITY-VISUALIZATION.md) - Content visualization approaches
- [Unity Input](./README-UNITY-INPUT.md) - Input handling systems
- [Unity Performance](./README-UNITY-PERFORMANCE.md) - Performance optimization 