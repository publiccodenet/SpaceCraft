# Spacecraft

**A spatial visualization platform for Internet Archive collections**

## Executive Summary

Spacecraft transforms Internet Archive collections into navigable 3D environments, enabling spatial exploration of digital knowledge. By bridging Internet Archive's vast content with immersive visualization techniques, Spacecraft offers new ways to discover, organize, and understand digital collections through spatial relationships and visual recognition patterns.

The platform uses multi-resolution processing to render thousands of items simultaneously while preserving their visual identity even at great distances. Its modular architecture separates content acquisition, processing, and visualization, allowing each to evolve independently while maintaining alignment with Internet Archive's content structure and metadata standards.

## Architecture Overview

Spacecraft implements a multi-tier architecture that processes Internet Archive collections through specialized pipelines.


### Core Components

1. **Collections System** (Implemented, P1, Ongoing) - Raw content and metadata from Internet Archive
2. **BackSpace** (In Progress, P1, Ongoing) - SvelteKit application that processes collections and hosts the web interface
3. **SpaceCraft** (In Progress: P1, Ongoing) - Unity WebGL application that provides 3D visualization and interaction

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
SpaceCraft/
├── Collections/            - Raw Internet Archive collections
│   └── {collection-prefix}/   - Individual collections with items
├── SvelteKit/BackSpace/    - Web application and processing pipeline
│   ├── scripts/            - Collection processing scripts
│   └── src/                - SvelteKit web application
└── Unity/SpaceCraft/       - Unity 3D visualization client
    └── Assets/             - Unity project assets
```

## Getting Started

### Prerequisites

**Required Versions:**
- **Node.js**: v20+ (tested with v20.19.0)
- **npm**: v10+ (comes with Node.js)
- **Unity**: 6000.0.36f1 (Unity 6.0)
- **Git LFS**: Required for Unity assets
- **Python**: 3.8+ (for simple HTTP server)

### Installation (macOS)

1. **Install Node.js via nvm** (recommended):
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
   
   # Restart terminal or source profile
   source ~/.bashrc  # bash
   source ~/.zshrc   # zsh
   
   # Install and use Node.js v20
   nvm install 20
   nvm use 20
   ```

   **Alternative - Direct install:**
   ```bash
   # Via Homebrew
   brew install node@20
   ```

2. **Install Unity 6.0**:
   - Download Unity Hub: https://unity.com/download
   - Install Unity 6000.0.36f1 through Unity Hub
   - Add WebGL build support during installation

3. **Install Git LFS**:
   ```bash
   brew install git-lfs
   git lfs install
   ```

### Quick Start

1. **Clone and Setup**:
   ```bash
   git clone <repository-url>
   cd SpaceCraft/SvelteKit/BackSpace
   npm install
   ```

2. **Run Pre-built Example**:
   ```bash
   # Serve the existing build
   cd ../../WebSites
   python3 -m http.server 8080
   # Open http://localhost:8080
   ```

### Full Development Setup

1. **Initialize Content**:
   ```bash
   cd SvelteKit/BackSpace
   npm run content:init
   ```

2. **Import Test Collection**:
   ```bash
   npm run ia:import -- --query "subject:poetry" --limit 50 --collection poetry
   npm run pipeline:run -- --collection poetry
   ```

3. **Build Unity WebGL**:
   ```bash
   npm run unity:build:webgl:dev
   npm run unity:install:sveltekit
   ```

4. **Start Development**:
   ```bash
   npm run dev
   ```

## Unity Development & Testing

### Serving Unity Builds with HTTPS

For testing Unity WebGL builds with device controllers (mobile phones/tablets), use the built-in HTTPS server:

```bash
cd SvelteKit/BackSpace
npm run unity:serve
```

This will:
- Automatically detect your local IP address
- Start an HTTPS server on port 8080
- Generate QR codes for mobile controller access
- Open the browser with the correct base URL

**Example output:**
```
Server will be available at: https://192.168.2.12:8080 (HTTPS)
Browser will open at: https://192.168.2.12:8080/index.html?base_url=https%3A%2F%2F192.168.2.12%3A8080%2F
```

### Using Custom Channels

To test with custom Supabase channels (useful for multiple developers or isolated testing):

1. **Add channel parameter to the URL:**
   ```
   https://192.168.2.12:8080/index.html?channel=myroom
   ```

2. **Complete URL with both parameters:**
   ```
   https://192.168.2.12:8080/index.html?base_url=https%3A%2F%2F192.168.2.12%3A8080%2F&channel=myroom
   ```

3. **What happens:**
   - The spacecraft will use channel "myroom" instead of default "clients"
   - All generated QR codes will include `?channel=myroom`
   - Controllers scanning QR codes automatically join the same channel
   - Multiple teams can work simultaneously without interference

### Why HTTPS and IP Address?

- **HTTPS Required**: Modern browsers require HTTPS for device motion/orientation APIs
- **IP Address**: Enables mobile devices on the same network to connect via QR codes
- **Not Localhost**: QR codes need to work across devices on your local network

### Verify Installation

```bash
node --version    # Should show v20+
npm --version     # Should show v10+
git lfs version   # Should show git-lfs version
python3 --version # Should show 3.8+
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
- [SpaceCraft Client](README-SpaceCraft.md) - Unity-based visualization client
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
