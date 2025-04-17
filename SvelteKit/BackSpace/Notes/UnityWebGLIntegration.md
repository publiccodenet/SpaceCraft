# Unity WebGL Integration with SvelteKit

## Build Settings

1. Open Unity project settings
2. Set platform to WebGL
3. Configure WebGL settings:
   - Template: Default
   - Compression Format: Disabled or Gzip
   - Enable "Development Build" during testing
   - Name your build "WebGL"

## Build Output

After building your Unity project, copy the output files to:
`/static/Build/WebGL/`

Make sure the following files exist:
- WebGL.loader.js
- WebGL.framework.js
- WebGL.wasm.js
- WebGL.data

## Using the CraftSpace Component

The CraftSpace component can be used in two main ways:

### Full Page Mode

```svelte
<CraftSpace fullPage={true} />
```

### Embedded Mode

```svelte
<CraftSpace 
  width="800px"
  height="600px"
  fullPage={false}
/>
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| width | String | "100%" | Width of the container |
| height | String | "100%" | Height of the container |
| unityLoaderUrl | String | "/Build/WebGL/WebGL.loader.js" | Path to Unity loader script |
| buildUrl | String | "/Build/WebGL/WebGL.data" | Path to Unity data file |
| fullPage | Boolean | false | Whether to display in full page mode |
| backgroundColor | String | "#000" | Background color |

### Methods

The component exposes a `sendMessage` method for communicating with the Unity instance:

```javascript
// Reference the component
let craftSpaceComponent;

// Send a message to Unity
craftSpaceComponent.sendMessage('GameObjectName', 'MethodName', 'Parameter');
``` 