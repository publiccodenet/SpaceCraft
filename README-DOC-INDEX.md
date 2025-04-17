# CraftSpace Documentation Index

This document serves as a central index for all documentation files in the CraftSpace project, providing a quick reference to find specific information.

## Core Documentation

### [README.md](README.md)
The main project overview document that introduces CraftSpace's purpose, architecture, and key innovations. It covers the high-level vision, core components, and provides getting started instructions for developers.

### [README-TODO.md](README-TODO.md)
A prioritized roadmap of planned features and improvements for the CraftSpace project. Organizes development tasks by component area with priority levels and status tracking.

## Component Documentation

### [README-IA-INTEGRATION.md](README-IA-INTEGRATION.md)
Comprehensive documentation of the Internet Archive integration, including collection management, content processing, and the multi-tier architecture that powers CraftSpace's data pipeline. Essential reading for understanding how CraftSpace interacts with Internet Archive.

### [README-BACKSPACE.md](README-BACKSPACE.md)
Details the SvelteKit web application component of CraftSpace, covering its development setup, content processing scripts, API endpoints, and Unity WebGL integration. This document explains how the web backend works, including data pipeline, caching strategy, and deployment options.

### [README-CRAFTSPACE.md](README-CRAFTSPACE.md)
Describes the Unity-based visualization client, including its architecture, navigation controls, user interface, and integration with BackSpace. Covers development workflow, customization options, and future directions for the 3D client.

### [README-VISUALIZATION.md](README-VISUALIZATION.md)
Deep dive into the visualization techniques implemented in CraftSpace, including multi-resolution representation, ultra-low resolution techniques, texture atlas optimization, spatial organization models, and special features like software emulation. This document explains how the system efficiently renders large collections in 3D space.

### [Collections/README.md](Collections/README.md)
Documents the structure and management of Internet Archive collections within CraftSpace, including storage strategies, metadata schemas, and best practices for collection management.

## Technical Documentation

### [README-SCRIPTS.md](README-SCRIPTS.md)
A guide to the various scripts that power CraftSpace's data processing pipeline, including TypeScript build system, command workflows, and script development guidelines. Useful for developers working on the automation systems.

### [README-DATA-ARCHITECTURE.md](README-DATA-ARCHITECTURE.md)
Explains the data flow, caching strategy, and storage systems used throughout CraftSpace. Covers static vs. dynamic collections, cache levels, and the content processing pipeline.

### [README-GITHUB.md](README-GITHUB.md)
Information about GitHub Actions workflows and continuous integration/deployment setup for the CraftSpace project. Covers the CI/CD infrastructure, workflow automation, containerization, and deployment strategies.

## Additional Resources

### API Documentation
* **[SvelteKit/BackSpace/src/routes/api/README.md](SvelteKit/BackSpace/src/routes/api/README.md)** - Documentation for the REST API endpoints provided by the BackSpace SvelteKit application.

### Unity Documentation
* **[Unity/CraftSpace/README.md](Unity/CraftSpace/README.md)** - Unity project-specific documentation including project structure, scene organization, and custom components.

## Using This Documentation

- **New developers** should start with the main README.md, then explore component docs based on their focus area
- **Content pipeline developers** should focus on README-IA-INTEGRATION.md and README-SCRIPTS.md
- **Visualization developers** should read README-VISUALIZATION.md and README-CRAFTSPACE.md
- **Project planning** is best supported by README-TODO.md

All documentation files follow a consistent Markdown format and are designed to be readable both in a text editor and when rendered on GitHub. 