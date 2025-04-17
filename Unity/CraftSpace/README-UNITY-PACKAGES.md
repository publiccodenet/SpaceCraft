# Unity Packages & Dependencies

## Integration Philosophy

CraftSpace uses a schema-driven approach to Unity integration:

- **JSON Representation of Unity Objects**: Expose Unity structures as user-friendly JSON
- **Cross-Platform Type Safety**: Common schema definitions across JavaScript and C#
- **Stateless Configuration**: Enable saving, sharing, and composing Unity states
- **Library Abstraction**: Wrap third-party Unity libraries in schema-compatible interfaces

### Bridge Integration

The project builds upon and extends Bridge's approach:

- **User-Friendly Representations**: Transform rotations available as both quaternions (x/y/z/w) and Euler angles (roll/pitch/yaw)
- **Schema Compatibility**: All Bridge structures now defined in Zod schemas
- **Bidirectional Binding**: Changes in Unity reflect in JS and vice-versa
- **Portable Configurations**: Save, load, and share scene configurations as JSON

## Required Packages

These packages are essential for CraftSpace functionality:

### Core Packages

| Package | Version | Purpose | Schema Integration |
|---------|---------|---------|-------------------|
| TextMeshPro | 3.0.6+ | High-quality text rendering | Text styling schemas |
| Newtonsoft.Json for Unity | 13.0.2+ | JSON serialization/deserialization | Schema validation |
| New Input System | 1.5.0+ | Cross-platform input handling | Input mapping schemas |
| Cinemachine | 2.8.9+ | Advanced camera system | Camera configuration schemas |
| ProBuilder | 5.0.6+ | Runtime mesh generation | Geometry definition schemas |

### Installation Instructions

```bash
# Using Unity Package Manager (UPM) via command line
unity -projectPath "path/to/CraftSpace" -executeMethod PackageInstaller.InstallRequiredPackages
```

Or via Package Manager UI:
1. Window > Package Manager
2. Click "+" button
3. Select "Add package from git URL..."
4. Enter package URL (see below)

## JSON.NET Integration

The Newtonsoft.Json package enables schema-based serialization:

```csharp
// Example of JSON.NET usage with our schema models
public T DeserializeFromJson<T>(string json) where T : class
{
    // Use JsonConvert with appropriate settings
    var settings = new JsonSerializerSettings {
        // Handle missing members gracefully
        MissingMemberHandling = MissingMemberHandling.Ignore,
        // Use specific naming convention
        ContractResolver = new DefaultContractResolver {
            NamingStrategy = new SnakeCaseNamingStrategy()
        }
    };
    
    return JsonConvert.DeserializeObject<T>(json, settings);
}
```

## NJsonSchema Usage

For generating C# classes from JSON Schema:

1. Install NuGet for Unity (from Asset Store)
2. Add NJsonSchema packages via NuGet
3. Use SchemaImporter tool to generate classes

## Schema-Driven Integration

CraftSpace extends schema representation to Unity structures:

- **Transform Schemas**: Position, rotation, scale with multiple representations
- **Material Schemas**: Colors, textures, shader properties
- **Physics Schemas**: Collider and rigidbody configurations
- **Library-Specific Schemas**: Configurations for third-party assets

This approach allows:
- Server-side storage of Unity configurations
- User sharing of custom views and arrangements
- Content management system integration
- Version control of visual configurations

## Recommended Additional Packages

### DOTween Integration

DOTween is essential for animation with complete schema representation:

```typescript
// Zod schema for DOTween animation
export const TweenSchema = z.object({
  target: z.string(),  // GameObject ID
  property: z.enum(["position", "rotation", "scale", "color"]),
  to: z.union([Vector3Schema, ColorSchema]), // Target value
  duration: z.number().positive(),
  ease: z.enum(["Linear", "InQuad", "OutQuad", "InOutQuad"]), // etc.
  delay: z.number().default(0),
  loops: z.number().int().default(1)
});
```

The existing Bridge DOTween wrapper will be extended with these schemas.

### UniTask for WebGL

UniTask enables efficient async operations in WebGL:

- **WebGL-Compatible**: Unlike standard C# tasks which are problematic in WebGL
- **Zero Allocation**: Memory-efficient for browser contexts
- **Cancellation Support**: Properly cancel operations during context switching
- **Integration with JSON Bridge**: Async responses to JSON messages

### Addressables for Dynamic Content

Addressables is crucial for content management:

- **Content Streaming**: Download large books, videos, 3D models on demand
- **Caching Strategy**: Intelligent caching of frequently accessed content
- **Memory Management**: Load/unload based on visibility and priority
- **Schema Representation**: Content references via schemas instead of direct paths

### UniRx + Svelte 5 Integration

UniRx provides reactive programming with Svelte-like binding:

- **Data Binding**: React to changes in JavaScript state within Unity
- **Signal Compatibility**: Works like Svelte 5 signals/stores
- **Event Streams**: Process user input as observable sequences
- **Schema Observation**: Watch for changes in schema-defined properties

### Other Recommended Packages

| Package | Purpose | Schema Integration |
|---------|---------|-------------------|
| UI Extensions | Enhanced UI components | UI configuration schemas |
| New Input System | Controllers, sensors, touch | Input mapping schemas |
| PostProcessing | Visual enhancement | Visual effect schemas |
| RuntimeGizmos | In-app manipulation | Editor control schemas |

## Configuration Examples

### Material Configuration Schema

```typescript
// Zod schema for material configuration
export const MaterialSchema = z.object({
  material_id: z.string(),
  color: z.object({
    main: ColorSchema.optional(),
    emission: ColorSchema.optional(),
    specular: ColorSchema.optional()
  }),
  textures: z.object({
    main: TextureRefSchema.optional(),
    normal: TextureRefSchema.optional(),
    // Other maps...
  }),
  shader: z.string().optional(),
  properties: z.record(z.union([
    z.number(),
    z.string(),
    z.boolean(),
    ColorSchema,
    Vector4Schema
  ])).optional()
});
```

This allows full configuration of materials from JavaScript or server.

## Package Compatibility Notes

- **New Input System**: Supports game controllers connected to mobile/desktop and provides access to device sensors (accelerometer, gyroscope)
- **ProBuilder**: Essential for our dynamic content generation pipeline and schema-driven geometry
- **PostProcessing**: Used selectively in WebGL, but fully in desktop multi-screen installations
- **TextMeshPro**: Works well in WebGL with proper font asset configuration
- **Newtonsoft.Json**: Requires IL2CPP settings adjustments for WebGL
- **DOTween**: Performs well in WebGL with appropriate pooling

## Manual Asset Integrations

Some assets require manual installation:

1. **RuntimeGizmos**: Download and import from [GitHub repository](https://github.com/example/runtime-gizmos)
2. **Custom WebGL Templates**: Copy from `ExternalAssets/WebGLTemplates` to project
3. **Schema Bridge**: Install components from `Tools/Schema` directory

## Dependency Management

Best practices for managing dependencies:

- Lock versions in manifest.json
- Separate local packages from remote dependencies
- Document any custom modifications
- Regular validation of package updates 