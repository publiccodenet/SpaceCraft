# BackSpace SvelteKit Application

The BackSpace application is the web platform component of CraftSpace, built with SvelteKit. It serves as both the host for the Unity WebGL client and the data processing pipeline for Internet Archive collections.

## Overview

BackSpace handles several key responsibilities:

1. **Content Pipeline**: Processes Internet Archive collections, generates metadata, and creates texture atlases
2. **Web Interface**: Hosts the Unity WebGL build and provides UI elements
3. **API Server**: Provides endpoints for dynamic queries and data retrieval
4. **Deployment**: Manages static and dynamic content delivery
5. **Authentication**: User management and access control

## Project Structure

```
SvelteKit/BackSpace/
├── scripts/                 # Collection processing scripts
│   ├── download-items.js    # Fetch items from Internet Archive 
│   ├── generate-atlases.js  # Create texture atlases
│   ├── pipeline-*.js        # Data pipeline workflows
│   └── ...
├── src/                     # SvelteKit application source
│   ├── routes/              # Application routes
│   │   ├── api/             # API endpoints
│   │   ├── collections/     # Collection browsing views
│   │   ├── explore/         # Exploration interface
│   │   └── settings/        # User settings and administration
│   ├── lib/                 # Shared components and utilities
│   │   ├── components/      # Reusable UI components
│   │   ├── stores/          # Svelte stores for state management
│   │   ├── utils/           # Utility functions
│   │   └── api/             # API client libraries
│   └── ...
├── static/                  # Static assets
│   ├── data/                # Collection data
│   ├── unity/               # Unity WebGL build
│   ├── js/unity-extensions/ # JavaScript extensions for Unity
│   └── ...
└── build/                   # Production build output
```

## Data Pipeline and Deployment Strategy

BackSpace uses a multi-tiered caching and deployment strategy for Internet Archive collections data.

### Collection Data Flow

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Internet       │         │  Data           │         │  Deployment     │
│  Archive API    │ ──────► │  Processing     │ ──────► │  Destinations   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                                      │
                                      ▼
                             Generate Metadata
                             with Color Icons
                                      │
                                      │
                            ┌─────────┴──────────┐
                            │                    │
                            ▼                    ▼
               ┌─────────────────┐    ┌─────────────────┐
               │  Unity          │    │  SvelteKit      │
               │  Resources Dir  │    │  Static Dir     │
               └─────────────────┘    └─────────────────┘
                 (Selected Sets)        (All Collections)
```

### Primary Data Flows

1. **Collection Registration**:
   - User registers a collection from Internet Archive
   - System stores collection metadata locally

2. **Collection Processing**:
   - Backend scripts download and process collection items
   - Metadata is enhanced with extracted content features
   - Texture atlases are generated for efficient visualization

3. **Unity Data Delivery**:
   - Unity client requests collection data via API
   - BackSpace delivers optimized data for visualization
   - Real-time updates maintain synchronization

### Book Cover Visualization Overview

BackSpace processes book covers at multiple resolutions to support efficient visualization in 3D space. The system generates and manages various representations, from single-pixel color summaries to full-resolution covers. 

For detailed information about the visualization techniques, including ultra-low resolution techniques, texture atlas generation, and multi-resolution display approaches, see the [Visualization Techniques documentation](./README-VISUALIZATION.md).

### Caching Strategy

BackSpace implements a multi-level caching strategy:

#### Static Collections vs Dynamic Queries

The system handles two types of collections:

1. **Static Collections**:
   - Defined in the master configuration with specific queries
   - Downloaded and processed during build time
   - Permanently stored in the static data directory or CDN
   - Example: `"prefix": "sf", "dynamic": false` (default)

2. **Dynamic Queries**:
   - Generated on-demand based on user searches or filters
   - Processed at runtime and cached temporarily
   - Stored in a separate directory structure from static collections
   - Example: `"prefix": "dyn_a7f3b2", "dynamic": true`

#### Storage Locations

1. **Unity Client-Side Cache**:
   - Selected high-priority collections are bundled directly with the Unity WebGL build
   - Stored in `Unity/CraftSpace/Assets/Resources/Collections/{prefix}`
   - These collections are available immediately without network requests
   - The Unity build's `index.json` only includes these pre-bundled collections
   - Flag during download: `--include-in-unity=true`

2. **SvelteKit Static Directory**:
   - Static collections are placed in `SvelteKit/BackSpace/static/data/collections/{prefix}`
   - Provides a server-side cache for collections not bundled with Unity
   - Can be offloaded to a CDN for improved performance

3. **Dynamic Content Directory**:
   - Dynamic queries are stored in `SvelteKit/BackSpace/static/data/dynamic/{hash}`
   - Managed by the SvelteKit app with automatic cleanup for old/unused queries
   - Not typically deployed to CDN due to their temporary nature
   - TTL (Time To Live) configuration controls how long dynamic content is kept

4. **Progressive Loading**:
   - Collections bundled with Unity load instantly
   - Additional collections load from the server as needed
   - Low-resolution icons load first for immediate visualization
   - Higher resolution assets load progressively

#### Cache Levels and Data Types

For each collection item, the system provides multiple resolution levels with specific caching strategies. See the [Visualization Techniques documentation](./README-VISUALIZATION.md#multi-resolution-representation-system) for details on the resolution hierarchy and encoding approaches.

#### Example Collection Configuration

```json
{
  "collections": [
    {
      "prefix": "sf",
      "query": "subject:\"Science fiction\" AND mediatype:texts",
      "name": "Science Fiction",
      "description": "Classic science fiction literature",
      "includeInUnity": true,
      "maxItems": 100,
      "sortBy": "downloads",
      "sortDirection": "desc",
      "resolutions": {
        "1x1": { "generate": true, "cacheLevel": "metadata" },
        "2x3": { "generate": true, "cacheLevel": "metadata" },
        "16x24": { "generate": true, "cacheLevel": "server" },
        "64x96": { "generate": true, "cacheLevel": "server" },
        "tile": { "generate": true, "cacheLevel": "server" },
        "full": { "generate": false, "cacheLevel": "server" }
      }
    },
    {
      "prefix": "poetry",
      "query": "subject:Poetry AND mediatype:texts",
      "name": "Poetry Collection",
      "description": "Famous poetry works",
      "includeInUnity": false,
      "maxItems": 50
    },
    {
      "prefix": "dyn_a7f3b2",
      "query": "creator:\"Asimov, Isaac\" AND mediatype:texts",
      "name": "Dynamic Query - Asimov",
      "description": "Dynamically generated collection for Isaac Asimov",
      "includeInUnity": false,
      "maxItems": 30,
      "dynamic": true
    }
  ]
}
```

### Cache Control and Versioning

The system supports cache invalidation through query parameters:

- `?clearcache=true` - Instructs Unity to clear its persistent browser storage
- `?reload=collections` - Forces a refresh of the collection index from the server
- `?version={hash}` - Used for cache-busting when new collections are deployed

These parameters are recognized by the SvelteKit app and passed to Unity.

## Key SvelteKit Components

### 1. Unity Integration Component

The BackSpace application hosts and communicates with the Unity WebGL client:

```
<!-- Unity Container Component -->
<div class="unity-container">
  <!-- Unity WebGL will be loaded here -->
  {#if unityStatus === 'loading'}
    <div class="loading-overlay">Loading Unity WebGL...</div>
  {/if}
</div>
```

### 2. UI Components

BackSpace includes several reusable UI components:

1. **Collection Browser**: Grid and list views for browsing collections
2. **Item Viewer**: Detail view for individual items with metadata
3. **Search Interface**: Advanced search with filters and sorting
4. **Unity Container**: Responsive container for the Unity WebGL client
5. **Administration Tools**: Collection management interface

### 3. Authentication System

User authentication and authorization are handled through SvelteKit hooks:

```
// Authentication functionality is implemented in src/hooks.server.js
// to protect routes and manage user sessions
```

## API Reference and Endpoints

The BackSpace application provides several API endpoints:

### Collections

- `GET /api/collections`: List all available collections
- `GET /api/collections/:prefix`: Get details for a specific collection
- `GET /api/collections/:prefix/items`: Get items in a collection
- `POST /api/collections`: Register a new collection (admin only)
- `DELETE /api/collections/:prefix`: Remove a collection (admin only)

### Items

- `GET /api/items/:id`: Get details for a specific item
- `GET /api/items/:id/content`: Get content for a specific item
- `GET /api/items/:id/similar`: Find similar items

### Search

- `GET /api/search?q=query`: Search across collections
- `GET /api/collections/:prefix/search?q=query`: Search within a collection

All API endpoints return JSON responses and support standard HTTP status codes for error handling.

## Development Setup

1. **Install Dependencies**:
   ```bash
   cd SvelteKit/BackSpace
   npm install
   ```

2. **Configure Collections**:
   Edit the `collections.json` file at the project root

3. **Run Development Server**:
   ```bash
   # Starts server on http://localhost:5173
   npm run dev
   ```

4. **Process Collections**:
   ```bash
   # Build TypeScript scripts
   npm run build:scripts
   
   # Run full pipeline
   npm run pipeline-full
   
   # Or run incremental updates
   npm run pipeline-incremental
   ```

## Building for Production

```bash
# Build scripts
npm run build:scripts

# Process collections
npm run pipeline-full

# Build SvelteKit app
npm run build
```

The build output will be in `SvelteKit/BackSpace/build/`.

## Adding New Collections

To add a new collection:

1. Edit the `collections.json` file
2. Add a new entry with query parameters
3. Run the pipeline to process the collection
4. Update the Unity project if including in client

## Performance Considerations

BackSpace implements several performance optimizations:

1. **Incremental Static Regeneration**: Pre-render pages but update dynamically
2. **API Response Caching**: Cache API responses to reduce load
3. **Lazy Loading**: Load components and data only when needed
4. **Asset Optimization**: Compress and optimize static assets
5. **Unity WebGL Streaming**: Progressive loading of Unity content

## Deployment

BackSpace can be deployed to various environments:

1. **Static Hosting**: Export as static site with serverless functions
2. **Container-based**: Deploy using Docker to cloud platforms
3. **Node.js Server**: Run as a standalone Node.js application

The recommended deployment approach uses Digital Ocean App Platform for both static hosting and containerized backend services.

## Texture Atlas Generation

The BackSpace pipeline generates texture atlases for book covers at multiple resolutions. These atlases pack multiple book covers into single texture files for efficient rendering in Unity. For details on atlas generation techniques and optimization strategies, see the [Texture Atlas System section in the Visualization documentation](./README-VISUALIZATION.md#texture-atlas-system).

For Unity-specific details on texture atlases, gutters, and optimization techniques used in the CraftSpace renderer, see the [Unity Rendering Implementation section in the Visualization documentation](./README-VISUALIZATION.md#unity-rendering-implementation).

## Troubleshooting

Common issues and solutions:

1. **Unity Loading Fails**:
   - Check browser console for errors
   - Verify Unity build files are correctly placed in `static/unity`
   - Ensure browser supports WebGL 2.0

2. **API Errors**:
   - Check server logs for detailed error information
   - Verify Internet Archive API credentials
   - Check network connectivity and CORS configuration

3. **Slow Collection Processing**:
   - Adjust concurrency settings in configuration
   - Verify disk space and memory availability
   - Consider using batch processing for large collections

## Future Enhancements

Planned enhancements for BackSpace include:

1. **Progressive Web App**: Full PWA support for offline capabilities 
2. **Collaborative Features**: Real-time collaboration between users
3. **Advanced Analytics**: Usage tracking and visualization patterns
4. **Personalization**: User-specific collections and preferences
5. **Internationalization**: Multi-language support 