# Spacecraft Data Architecture

This document outlines the data architecture of Spacecraft, describing how content flows from Internet Archive through processing pipelines to various deployment targets.

## Collection Data Flow

The Spacecraft data architecture implements a multi-level content flow:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Internet       │      │  Processing      │      │  Deployment     │
│  Archive API    │ ──►  │  Pipeline       │ ──►  │  Targets        │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Raw Content    │      │  Optimized      │      │  Target-Specific │
│  Cache          │      │  Representations │      │  Formats        │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Caching Strategy

Spacecraft implements a multi-level caching strategy to balance performance, storage, and bandwidth:

### 1. Static vs. Dynamic Collections

The system supports two types of collections:

#### Static Collections (Implemented)
- Defined through explicit configuration
- Downloaded and processed during build time
- Permanently stored for efficient access
- Example: `"prefix": "scifi", "dynamic": false`

#### Dynamic Collections (Planned: P2, Medium)
- Generated on-demand based on user searches
- Processed at runtime with temporary caching
- Available for limited time periods
- Example: `"prefix": "dyn_query", "dynamic": true`

### 2. Storage Locations

Content is distributed across multiple storage locations:

#### Raw Collections Cache (Implemented)
- Location: `Collections/{prefix}/`
- Contains original, unmodified Internet Archive content
- Structured with full directory hierarchy
- Managed via Git LFS for large binary files

#### Unity Resources (Implemented)
- Location: `Unity/CraftSpace/Assets/Resources/Collections/{prefix}/`
- Contains pre-processed, optimized assets for Unity
- Embedded in Unity WebGL build for immediate availability
- Limited to high-priority collections due to build size constraints

#### SvelteKit Static (Implemented)
- Location: `SvelteKit/BackSpace/static/data/collections/{prefix}/`
- Provides server-side assets for web application
- Includes complete metadata and optimized assets
- Deployable to CDN for edge distribution

#### Dynamic Content (Planned: P3, Hard)
- Location: `SvelteKit/BackSpace/static/data/dynamic/{hash}/`
- Temporary storage for runtime-generated collections
- Managed by automated cleanup processes
- TTL (Time To Live) configuration for storage management

### 3. Cache Levels and Data Types

Different resolution levels use appropriate caching strategies:

#### Metadata Level (Implemented)
- Ultra-low resolution (1×1, 2×3) embedded directly in JSON
- Always available without additional requests
- Gzipped during transport for efficiency

#### Unity Level (Implemented)
- Low to medium resolution packed in atlases
- Included in Unity build for priority collections
- Immediately available after application load

#### Server Level (Implemented)
- Medium to high resolution served on demand
- Loaded progressively based on distance and visibility
- CDN-distributed for performance

#### Image Pyramids (Planned: P2, Medium)
- Google Maps-style tiled approach for high-resolution content
- Multiple zoom levels with appropriate resolution tiles
- Efficient loading of only visible portions at current zoom level
- Essential for detailed maps, manuscripts, and high-resolution images

## Cache Invalidation and Versioning

### Cache Invalidation (Implemented)
The system supports cache invalidation through:

- Query parameters (`?clearcache=true`, `?reload=collections`)
- Version parameters (`?version={hash}`)
- API endpoints for forced refreshes

### Content Versioning (Implemented)
Content versioning is handled through:

- ETag tracking for Internet Archive content
- Timestamp-based change detection
- Hash-based verification for cached content

## Future Data Architecture Enhancements

### Vector Database Integration (Planned: P2, Hard)
- Embedding generation for items and collections
- Semantic search capabilities using vector similarity
- Clustering and relationships based on content semantics
- Enables natural language queries against collection content

### Machine Learning Integration (Planned: P3, Hard)
- Automatic categorization of items based on content
- Visual similarity detection across collections
- Content recommendation systems
- Enhanced metadata extraction from raw content

### VR-Optimized Data Structures (Planned: P4, Hard)
- Special LOD systems for VR environments
- Gaze-directed progressive loading
- Performance-optimized data structures for XR rendering
- Spatial audio integration with content

### Collaborative Data Layer (Planned: P4, Very Hard)
- Multi-user annotation and organization capabilities
- Shared collections and curation tools
- Real-time synchronization of user-generated content
- Integration with Internet Archive's community features

## Content Processing Pipeline

The data architecture is supported by a sophisticated processing pipeline:

1. **Collection Registration**: Define collections via Internet Archive queries
2. **Content Acquisition**: Download raw content from Internet Archive
3. **Multi-Resolution Processing**: Generate optimized representations
4. **Atlas Generation**: Pack items into efficient texture atlases
5. **Deployment**: Distribute to appropriate targets (Unity, Web, CDN)

This pipeline can be run incrementally (updating only changed content) or as a complete rebuild.

The data architecture of CraftSpace is designed to balance immediate visual response with efficient bandwidth usage, ensuring users can explore massive digital collections with minimal waiting time while preserving the richness of Internet Archive's content. 
