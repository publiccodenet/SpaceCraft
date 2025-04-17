# Spacecraft

**A spatial visualization platform for Internet Archive collections**

## Executive Summary

Spacecraft transforms Internet Archive collections into navigable 3D environments, enabling spatial exploration of digital knowledge. By bridging Internet Archive's vast content with immersive visualization techniques, Spacecraft offers new ways to discover, organize, and understand digital collections through spatial relationships and visual recognition patterns.

The platform uses multi-resolution processing to render thousands of items simultaneously while preserving their visual identity even at great distances. Its modular architecture separates content acquisition, processing, and visualization, allowing each to evolve independently while maintaining alignment with Internet Archive's content structure and metadata standards.

## Architecture Overview

Spacecraft implements a multi-tier architecture that processes Internet Archive collections through specialized pipelines:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Internet       │      │  BackSpace      │      │  CraftSpace     │
│  Archive API    │ ──►  │  SvelteKit App  │ ──►  │  Unity WebGL    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Raw Content    │      │  Processed Data │      │  Visualization  │
│  & Metadata     │      │  & Atlases      │      │  & Interaction  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Core Components

1. **Collections System** (Implemented, P1, Ongoing) - Raw content and metadata from Internet Archive
2. **BackSpace** (In Progress, P1, Ongoing) - SvelteKit application that processes collections and hosts the web interface
3. **CraftSpace** (In Progress: P1, Ongoing) - Unity WebGL application that provides 3D visualization and interaction

### Core Pipeline Features

1. **Metadata Enhancement** (In Progress, Ongoing) - Extraction of EPUB/PDF metadata to augment Internet Archive data
2. **Multi-Resolution Processing** (In Progress: P1, Medium) - Generation of optimized representations at various resolutions
3. **Intelligent Caching** (In Progress: P2, Medium) - Multi-level caching with ETag tracking and version control
4. **Export Profiles** (In Progress, P2, Ongoing) - Target-specific content optimization for different platforms
5. **Dynamic Queries** (Planned: P3, Medium) - On-demand collection generation from user-defined searches

## Key Innovations

### Multi-Resolution Visualization

Spacecraft implements a hierarchical approach to item representation:

- **Ultra-Distant View** (In Progress, P3, Medium): Single-color (1×1 pixel) representation extracted from cover
- **Distant View** (In Progress, P3, Medium): Six-color "fingerprint" (2×3 pixels) that preserves visual identity
- **Medium Distance** (In Progress, P3, Medium): Texture atlases with progressively higher detail
- **Close Inspection** (In Progress: P3, Medium): Full-resolution cover with metadata and content access
- **Content Preview** (Planned: P3, Medium): Page-flipping and content exploration for selected items

This approach enables simultaneous visualization of thousands of items while maintaining visual recognition at all distances.

### Spatial Organization

The system supports multiple organizational principles:

- **Popularity** (In Progress: P3, Medium): Sizing or positioning based on download statistics
- **Chronological** (Planned: P3, Medium): Items arranged by time period or publication date
- **Thematic** (Planned: P4, Medium): Clustering by subject matter and relationships
- **Visual Similarity** (Planned: P4, Medium): Grouping items with similar visual characteristics

These organizational systems can be switched dynamically, revealing different patterns and relationships.

### Image Pyramids for High-Resolution Content (Planned: P4, Medium)

For detailed maps, manuscripts, and high-resolution images, we're developing Google Maps-style image pyramids (Planned: P2, Medium):

- Multiple zoom levels with appropriate resolution tiles
- Efficient loading of only visible portions at current zoom level
- Smooth transitions between resolution levels
- Minimal bandwidth usage for large-format content

## Future Directions

### AI and Machine Learning Integration (Planned, P5, Hard)

We're exploring several AI/ML approaches to enhance the platform:

- **Content Analysis**: Automatic categorization and relationship mapping
- **Visual Similarity**: Identifying visually related items across collections
- **LLM Integration**: Natural language queries against collection content
- **Semantic Embedding**: Vector database storage for semantic search
- **Content Generation**: AI-enhanced metadata and descriptions

### VR and XR Support (Planned, P6, Hard)

Future versions will support immersive exploration:

- **WebXR Integration**: Browser-based VR/AR exploration
- **Spatial Interaction**: Natural interaction with collections in 3D space
- **Gaze-Directed Loading**: Performance optimization based on user attention
- **Collaborative Spaces**: Multi-user exploration and sharing

## Repository Structure

```
CraftSpace/
├── Collections/            - Raw Internet Archive collections
│   └── {collection-prefix}/   - Individual collections with items
├── SvelteKit/BackSpace/    - Web application and processing pipeline
│   ├── scripts/            - Collection processing scripts
│   └── src/                - SvelteKit web application
└── Unity/CraftSpace/       - Unity 3D visualization client
    └── Assets/             - Unity project assets
```

## Getting Started

1. **Install Dependencies**:
   ```bash
   cd SvelteKit/BackSpace
   npm install
   ```

2. **Register a Collection**:
   ```bash
   npm run ia:register scifi "Science Fiction" "subject:science fiction" --include-in-unity
   ```

3. **Process the Collection**:
   ```bash
   npm run ia:process
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Collection Management

Collections are configured with Internet Archive query parameters:

```bash
# Register a poetry collection
npm run ia:register poetry "Poetry" "subject:poetry mediatype:texts" --sort="downloads desc" --limit=200

# List all collections
npm run ia:list

# Update a specific collection
npm run ia:process -- --collection=poetry
```

Each collection maintains its original Internet Archive identifiers and metadata, enriched with visualization-specific attributes.

## Documentation

- [Documentation Index](README-DOC-INDEX.md) - Complete index of all project documentation
- [Internet Archive Integration](README-IA-INTEGRATION.md) - Detailed IA integration documentation
- [Collections System](Collections/README.md) - Collection structure and management
- [BackSpace Application](README-BACKSPACE.md) - SvelteKit application and processing pipeline
- [CraftSpace Client](README-CRAFTSPACE.md) - Unity-based visualization client
- [Visualization Techniques](README-VISUALIZATION.md) - Multi-resolution visualization approaches
- [Data Architecture](README-DATA-ARCHITECTURE.md) - Caching and storage architecture
- [Development Roadmap](README-TODO.md) - Planned enhancements and features

## Development

The Spacecraft project welcomes contributions. The development workflow separates content processing from visualization, enabling specialized work in different areas:

- **Content Pipeline**: Process Internet Archive collections into optimized formats
- **Web Application**: Enhance the SvelteKit host application
- **3D Visualization**: Improve the Unity-based spatial interface
- **Query System**: Expand dynamic collection generation capabilities

## Acknowledgments

This project builds upon the Internet Archive's mission of universal access to knowledge by adding spatial visualization capabilities to its digital collections. We gratefully acknowledge the Internet Archive's commitment to digital preservation and open access, which makes projects like this possible.
