# CraftSpace GitHub Integration

This document describes the GitHub-based continuous integration, continuous deployment (CI/CD), and development infrastructure for the CraftSpace project.

## Overview

CraftSpace leverages GitHub Actions for automated building, testing, and deployment of its multi-component architecture. This infrastructure enables developers to work efficiently on different parts of the system while maintaining integration across components. The CI/CD system handles everything from Unity WebGL compilation to collection processing and deployment to various environments.

## .github Directory Structure

```
.github/
├── workflows/                                # GitHub Actions workflow definitions
│   ├── build-deploy.yml                      # Main build and deployment workflow
│   ├── update-collections.yml                # Collection update workflow
│   ├── build-deploy-sveltekit.yml            # SvelteKit-only workflow
│   ├── build-unity-webgl.yml                 # Unity WebGL-only workflow
│   └── build-push-docker.yml                 # Docker build and push workflow
├── scripts/                                  # Shared automation scripts
│   ├── process-collections.sh                # Collection processing script
│   ├── deploy-collections.sh                 # Collection deployment script
│   └── unity-build.sh                        # Unity build helper script
├── actions/                                  # Custom GitHub Actions
│   └── unity-builder/                        # Custom Unity builder action
└── templates/                                # Workflow templates and documentation
    └── issue_template.md                     # Issue template for workflow problems
```

## Rapid Development & Pipeline Architecture

### Development Philosophy

The CraftSpace project is built on a philosophy of rapid iteration through specialized pipelines. Rather than treating the entire application as a monolith that must be rebuilt for every change, we've decomposed the system into independently deployable components that can be developed and iterated at different speeds.

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DEVELOPMENT PIPELINES                          │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│ SvelteKit   │ Unity       │ Collection  │ Unity JS    │ Full        │
│ Changes     │ WebGL       │ Content     │ Scripts     │ Release     │
│             │ Application │ Updates     │ Hot-Patch   │ Build       │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Minutes     │ Hours       │ Minutes     │ Seconds     │ Hours       │
│ to deploy   │ to deploy   │ to deploy   │ to deploy   │ to deploy   │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### Development Goals

1. **Minimize Wait Times**: Developers should never wait more than a few seconds to see changes during active development
2. **Component Independence**: Changes to one component shouldn't require rebuilding others
3. **Flexible Deployment**: Support partial updates for quick iteration and full builds for releases
4. **Environment Consistency**: Development, staging, and production should use identical processes
5. **Build Acceleration**: Use specialized hardware where needed (e.g., self-hosted runners for Unity)
6. **Hot-Patching**: Update running applications without redeployment whenever possible

### Component Iteration Strategies

#### 1. SvelteKit Application (Minutes)

**Workflow File**: `.github/workflows/build-deploy-sveltekit.yml`

For changes to the web application interface, API endpoints, or server logic:

- **Development**: Use `npm run dev` for instant hot-reloading during development
- **Staging/Production**: Push changes and deploy SvelteKit without rebuilding Unity
- **Integration Points**: 
  - Serves Unity WebGL files
  - Provides API endpoints for Unity
  - Manages dynamic content loading

#### 2. Unity WebGL Application (Hours)

**Workflow File**: `.github/workflows/build-unity-webgl.yml`

For changes to C# code, Unity assets, prefabs, scenes, or shaders:

- **Development**: Work in Unity Editor for rapid visualization and testing
- **Build Acceleration**: Self-hosted runners with pre-configured Unity installations
  - MacBook Pro (M1/M2) or high-performance Windows laptops
  - Pre-cached Unity Editor with all dependencies
  - Optimized build settings for development iterations
- **Release Builds**: Use full WebGL compression and optimization for production
- **CI/CD Integration**: Automated builds triggered by changes to Unity code paths

#### 3. Collection Content (Minutes)

**Workflow File**: `.github/workflows/update-content.yml`

For changes to collection data, metadata, or texture atlases:

- **Development**: Update collection data with local processing
- **Hot Deployment**: Push updated content to all environments without app rebuilds
- **Multi-Target**: Update content in:
  - SvelteKit static directory
  - Unity Resources folder
  - CDN edge locations
- **Cache Management**: Purge CDN caches and update version markers for client refreshes

#### 4. Unity JavaScript Extensions (Seconds)

**Workflow File**: `.github/workflows/build-unity-scripts.yml`

For changes to Unity behavior without modifying C# code:

- **Development**: Edit JavaScript and JSON files that control Unity at runtime
- **Instant Refresh**: Changes take effect on browser refresh without rebuilding
- **Deployment Types**:
  - Local development (file system)
  - Staging server (test environment)
  - Production CDN (optimized, minified)
- **Dynamic Loading**: Unity loads these scripts at runtime through JavaScript interop

#### 5. Full Release Build (Hours)

**Workflow File**: `.github/workflows/build-deploy.yml`

For comprehensive releases with changes across all components:

- **Complete Process**: Rebuilds everything from scratch in the correct order
- **Asset Optimization**: Full compression and optimization for production
- **Consistency Checks**: Ensures all components are compatible and synchronized
- **Version Tagging**: Creates release tags and versioning across all assets
- **Documentation**: Generates release notes and deployment records

### Unity Build Acceleration Strategy

```
┌──────────────────────┐       ┌────────────────────────┐
│ GitHub Actions       │       │ Self-Hosted Runner     │
│ Workflow Dispatcher  ├──────►│ (MacBook Pro/Windows)  │
└──────────────────────┘       └───────────┬────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ Pre-Configured Environment                                       │
│                                                                  │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│ │ Unity Editor    │  │ Cache Library   │  │ Build Pipeline  │   │
│ │ Pre-Installed   │  │ Pre-Warmed      │  │ Optimized       │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │ Optimized WebGL Build    │
                              └──────────────────────────┘
```

- **Self-Hosted Runners**: MacBook Pro or Windows laptops dedicated to Unity builds
- **Pre-Installation**: Unity Editor, packages, and dependencies pre-installed
- **Library Caching**: Pre-warmed Unity Library folder to skip import phase
- **Parallel Processing**: Multiple runners can handle different build tasks
- **Hardware Acceleration**: Dedicated GPUs improve shader compilation speed
- **Build Variants**: Development builds (faster, less compressed) vs Production builds

### Deployment Matrix

| Component | Change Type | Workflow | Typical Deployment Time | Hot-Patchable |
|-----------|-------------|----------|-------------------------|---------------|
| SvelteKit | Web UI/API | build-deploy-sveltekit | 3-5 minutes | Yes (dev mode) |
| Unity WebGL | C#/Assets | build-unity-webgl | 30-60 minutes | No |
| Collections | Content | update-content | 2-10 minutes | Yes |
| Unity JS | Runtime Behavior | build-unity-scripts | 30-60 seconds | Yes |
| Full Release | Everything | build-deploy | 60-90 minutes | No |

### Practical Development Workflow

1. **Initial Setup**: Full build of all components to establish baseline
   ```bash
   gh workflow run build-deploy.yml
   ```

2. **Daily Development**: Focused iteration on specific components
   - Working on SvelteKit: Use local dev server with hot reloading
   - Working on Unity: Use Unity Editor, push only when ready for build
   - Working on content: Use content pipeline for rapid updates
   - Working on behavior: Use JavaScript hot-patching

3. **Integration Testing**: Periodic integration of all components
   - Deploy to staging environment
   - Verify cross-component interactions
   - Test on multiple browsers and devices

4. **Production Release**: Complete rebuild with full optimization
   - Trigger full build and deploy workflow
   - Run comprehensive test suite
   - Deploy to production with staged rollout

## Automated Workflows

This project uses GitHub Actions to automate building and deployment:

1. **SvelteKit Build and Deploy**: Builds the SvelteKit app and deploys to the hosting environment
2. **Unity WebGL Build**: Uses a self-hosted runner to build the Unity WebGL application
3. **Collection Update**: Processes Internet Archive collections and deploys them to the hosting environment

## Setup Instructions

### 1. Setting Up GitHub Repository

1. Create a new GitHub repository
2. Add required secrets:
   - `UNITY_LICENSE`: Unity license for building WebGL
   - `DIGITALOCEAN_ACCESS_TOKEN`: API token for Digital Ocean
   - `DIGITALOCEAN_APP_ID`: App Platform application ID
   - `SSH_PRIVATE_KEY`: SSH private key for deployment
   - `DO_SPACES_KEY`: Digital Ocean Spaces access key
   - `DO_SPACES_SECRET`: Digital Ocean Spaces secret
   - `DO_SPACES_ENDPOINT`: Digital Ocean Spaces endpoint
   - `DO_SPACES_BUCKET`: Digital Ocean Spaces bucket name

### 2. Setting Up a Self-Hosted GitHub Runner on MacBook Pro

#### Prerequisites

- macOS 12 (Monterey) or later
- Administrator access on your MacBook Pro
- At least 16GB RAM recommended
- At least 40GB of free disk space

#### Install Developer Tools

1. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```

2. Install Homebrew:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. Install Node.js and npm:
   ```bash
   brew install node
   ```

4. Install Docker Desktop:
   Download from [docker.com](https://www.docker.com/products/docker-desktop)

#### Install Unity

1. Download Unity Hub from [unity3d.com](https://unity3d.com/get-unity/download)
2. Install Unity Hub and sign in with your Unity account
3. Install Unity version 2022.3.20f1 (or your preferred version)
   - In Unity Hub, go to "Installs" → "Add" → select version 2022.3.20f1
   - Include WebGL Build Support module

#### Set Up GitHub Runner

1. Go to your GitHub repository → Settings → Actions → Runners
2. Click "New self-hosted runner"
3. Select macOS
4. Follow the provided instructions to download and configure the runner

5. Add labels to your runner:
   ```bash
   ./config.sh --labels unity,configured
   ```

6. Start the runner as a service:
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

7. Verify the runner is connected in your GitHub repository settings

### 3. Unity WebGL Build Setup

1. Create a build script in your Unity project:

```csharp
// Assets/Editor/BuildScript.cs
using UnityEditor;
using System.IO;

public class BuildScript
{
    [MenuItem("Build/WebGL Development")]
    public static void BuildWebGLDevelopment()
    {
        BuildWebGL(BuildOptions.Development);
    }
    
    [MenuItem("Build/WebGL Production")]
    public static void BuildWebGLProduction()
    {
        BuildWebGL(BuildOptions.None);
    }
    
    private static void BuildWebGL(BuildOptions options)
    {
        string outputDir = "Build/WebGL";
        
        // Make sure the output directory exists
        if (!Directory.Exists(outputDir))
        {
            Directory.CreateDirectory(outputDir);
        }
        
        // Define build settings
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = EditorBuildSettings.scenes,
            targetGroup = BuildTargetGroup.WebGL,
            target = BuildTarget.WebGL,
            options = options,
            locationPathName = outputDir
        };
        
        // Build the project
        BuildPipeline.BuildPlayer(buildPlayerOptions);
    }
}
```

2. Ensure your Unity path in the workflow file is correct:
   - Edit `.github/workflows/build-unity-webgl.yml`
   - Update the Unity path variable to match your Unity installation path

### 4. SvelteKit Configuration

1. Navigate to the SvelteKit project:
   ```bash
   cd SvelteKit/BackSpace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. For production builds:
   ```bash
   npm run build
   ```

### 5. Docker Configuration

The Docker setup is configured in the `Dockerfile`. The GitHub workflow builds and pushes the Docker image automatically when changes are detected:

```bash
# Manual build and push
cd SvelteKit/BackSpace
docker build -t do-registry.digitalocean.com/craftspace/backend:latest .
docker push do-registry.digitalocean.com/craftspace/backend:latest
```

## Deployment

### Digital Ocean App Platform

The application is deployed to Digital Ocean App Platform:

1. **Web Application**: The SvelteKit application serves as the web frontend and API layer
2. **CDN Component**: Static assets are served through Digital Ocean Spaces with CDN enabled
3. **Container Service**: Docker containers handle backend processing

To configure deployment:
1. Go to Digital Ocean App Platform
2. Create a new app from GitHub repository
3. Configure environment variables and resources
4. Set up preview environments for staging/testing

### Server Deployment

The server components are deployed as Docker containers to Digital Ocean App Platform:

```bash
# Deploy manually (if needed)
doctl apps create --spec .do/app.yaml
```

## Development Workflow

### SvelteKit Development

1. Make changes to SvelteKit files
2. Test locally with `npm run dev`
3. Commit and push to trigger automatic deployment

### Unity Development

1. Make changes in the Unity project
2. Test locally in Unity Editor
3. Commit and push to trigger the Unity build workflow
4. The build is automatically copied to the SvelteKit static directory and committed

### Collection Development

1. Register a new collection:
   ```bash
   cd SvelteKit/BackSpace
   npm run ia:register mycollection "My Collection" "subject:mycollection"
   ```

2. Process the collection:
   ```bash
   npm run ia:process
   ```

3. Commit changes and push to trigger deployment

### Workflow Integration

The integration between Unity and SvelteKit is handled through the `CraftSpace.svelte` component, which loads the Unity WebGL build at runtime.

## Internet Archive Integration

The project includes scripts for downloading content from the Internet Archive:

```bash
# Build TypeScript scripts
npm run build:scripts

# Download and process a collection
npm run ia:process -- --collection=scifi
```

## Troubleshooting

### Unity Build Issues

- Check the Unity build log for errors: `Unity/CraftSpace/unity_build.log`
- Ensure the build method name matches in the workflow file and Unity script
- Verify Unity version compatibility

### GitHub Runner Issues

- Check runner status: `sudo ./svc.sh status`
- View runner logs: `tail -f ~/.runner/logs/Worker_*`
- Restart runner if needed: `sudo ./svc.sh restart`

### SvelteKit Build Issues

- Check for JS/TS errors in the console
- Ensure all dependencies are installed: `npm ci`
- Clear the SvelteKit build cache: `rm -rf .svelte-kit`

## Workflow Overview

### 1. Main Build and Deploy Workflow

**File**: `.github/workflows/build-deploy.yml`

This comprehensive workflow handles the complete build and deployment process:

1. Builds the Unity WebGL application
2. Processes collections data
3. Builds the SvelteKit application
4. Deploys everything to Digital Ocean

**Trigger**: Manual workflow dispatch

### 2. Collection Update Workflow

**File**: `.github/workflows/update-collections.yml`

This workflow updates the collection data without rebuilding the entire application:

1. Incrementally processes collection data
2. Deploys updated collections to CDN

**Trigger**: 
- Weekly schedule (Monday at 1 AM)
- Manual workflow dispatch

### 3. SvelteKit-Only Workflow

**File**: `.github/workflows/build-deploy-sveltekit.yml`

For faster iterations on the web application without rebuilding Unity:

1. Builds only the SvelteKit application
2. Deploys to Digital Ocean App Platform

**Trigger**: 
- Push to main branch affecting SvelteKit files
- Manual workflow dispatch

### 4. Unity-Only Workflow

**File**: `.github/workflows/build-unity-webgl.yml`

For Unity-focused development:

1. Builds only the Unity WebGL application
2. Updates the SvelteKit static directory with the new build
3. Commits the changes back to the repository

**Trigger**:
- Push to main branch affecting Unity files
- Manual workflow dispatch

## Shared Scripts

Scripts in `.github/scripts/` are shared across workflows:

- `process-collections.sh`: Handles collection processing (full or incremental)
- `deploy-collections.sh`: Deploys collections to CDN

## Required Secrets

The following secrets need to be set in the GitHub repository:

### Unity Build
- `UNITY_LICENSE`: Unity license for building WebGL

### Digital Ocean Deployment
- `DIGITALOCEAN_ACCESS_TOKEN`: API token
- `DIGITALOCEAN_APP_ID`: App Platform application ID
- `DIGITALOCEAN_HOST`: Host for SSH connection
- `SSH_PRIVATE_KEY`: SSH private key

### Docker Registry
- `DO_REGISTRY_TOKEN`: Digital Ocean Container Registry token

### CDN/Storage
- `DO_SPACES_KEY`: Digital Ocean Spaces access key
- `DO_SPACES_SECRET`: Digital Ocean Spaces secret
- `DO_SPACES_ENDPOINT`: Digital Ocean Spaces endpoint
- `DO_SPACES_BUCKET`: Digital Ocean Spaces bucket name

## Running Workflows

### Manual Trigger

1. Go to "Actions" tab in the GitHub repository
2. Select the workflow you want to run
3. Click "Run workflow"
4. Set any workflow input parameters
5. Click "Run workflow" button

### Adding New Components

When adding new components to the monorepo:

1. Create a new directory at the root level
2. Add a specific workflow file in `.github/workflows/`
3. Share scripts when possible using `.github/scripts/`
4. Update this documentation

## Workflow Integration

The workflows are designed to work together in a complementary way:

```
                       ┌───────────────────┐
                       │ Manual Workflow   │
                       │    Dispatch       │
                       └─────────┬─────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
    ┌────────────▼─────────────┐   ┌─────────────▼────────────┐
    │ Component-Specific       │   │ Comprehensive            │
    │ Workflows                │   │ Build and Deploy         │
    └────────────┬─────────────┘   └─────────────┬────────────┘
                 │                               │
┌────────────────┼───────────────────────────────┼────────────────┐
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This multi-tiered approach allows for:

1. **Fast iterative development** on specific components
2. **Automated deployment** of the full application
3. **Scheduled updates** of collection data
4. **Flexible deployment options** (container, direct, CDN)

## Content Development Workflow

**File**: `.github/workflows/update-content.yml`

This specialized workflow is designed for rapid content iteration without rebuilding application code. It enables developers to update collection data, metadata, and even client-side functionality with minimal deployment overhead.

### Purpose

The content development pipeline allows:

1. Hot-patching content into production environments
2. Updating collection data without rebuilding SvelteKit or Unity
3. Modifying client-side behavior through JavaScript injection
4. Minimizing developer wait times during content iteration

### Process Overview

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│                 │        │                 │        │  Multi-Target   │
│  Content        │───────►│  Processing     │───────►│  Deployment     │
│  Development    │        │  Pipeline       │        │  Injection      │
│                 │        │                 │        │                 │
└─────────────────┘        └─────────────────┘        └─────────────────┘
                                                              │
                                                              │
                                                              ▼
                           ┌─────────────────────────────────────────────────────┐
                           │                                                     │
                           ▼                                                     ▼
              ┌─────────────────────────┐                        ┌─────────────────────────┐
              │                         │                        │                         │
              │  Static Content Cache   │                        │  Dynamic Code Cache     │
              │  (Collections Data)     │                        │  (JavaScript/JSON)      │
              │                         │                        │                         │
              └─────────────────┬───────┘                        └───────────┬─────────────┘
                                │                                            │
                                ▼                                            ▼
           ┌────────────────────────────────────┐          ┌─────────────────────────────────────────┐
           │                      │             │          │                      │                  │
           ▼                      ▼             ▼          ▼                      ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────┐
│                  │  │                  │  │      │  │                  │  │                  │  │      │
│ SvelteKit        │  │ Unity Client     │  │ CDN  │  │ SvelteKit        │  │ Unity Client     │  │ CDN  │
│ Static Directory │  │ Resources Dir    │  │      │  │ Public JS        │  │ Dynamic Scripts  │  │      │
│                  │  │                  │  │      │  │                  │  │                  │  │      │
└──────────────────┘  └──────────────────┘  └──────┘  └──────────────────┘  └──────────────────┘  └──────┘
```

### JavaScript Hot-Patching Details

The Unity WebGL build is configured to load external JavaScript modules that implement functionality outside the Unity C# codebase:

1. **Core Communication Layer**: Establishes messaging between Unity and JavaScript
2. **Extension Modules**: Implement specific features that can be hot-patched
3. **Configuration Data**: JSON files defining behavior that can be updated

This approach allows significant portions of application logic to be modified without Unity rebuilds.

Example directory structure:
```
SvelteKit/BackSpace/static/js/unity-extensions/
├── core/
│   ├── bridge.js          # Core Unity-JS communication
│   ├── loader.js          # Dynamically loads extension modules
│   └── messaging.js       # Message formatting and routing
├── features/
│   ├── collections.js     # Collection management (hot-patchable)
│   ├── search.js          # Search functionality (hot-patchable)
│   ├── visualization.js   # Visualization options (hot-patchable)
│   └── ui.js              # UI customizations (hot-patchable)
└── config/
    ├── display.json       # Visual configuration (hot-patchable)
    ├── collections.json   # Collection settings (hot-patchable)
    └── features.json      # Feature flags (hot-patchable)
```

## Containerized GitHub Runners (Future Plan)

To maximize hardware utilization and provide scalability, we plan to containerize our GitHub runner environment. This approach will allow us to run multiple Unity build jobs in parallel on a single high-performance machine.

### Benefits

- **Parallelism**: Run multiple Unity builds simultaneously on one machine
- **Isolation**: Keep each build in its own container environment
- **Resource Management**: Allocate appropriate CPU/memory to each build job
- **Versioning**: Support multiple Unity versions in parallel
- **Scaling**: Add more containers as resource availability permits

### Implementation Strategy

1. **Base Docker Image**: Create a Unity-ready Docker image with all dependencies
2. **Runner Configuration**: Configure GitHub Actions runner in each container
3. **Persistent Caching**: Mount shared caches for Library and Package dependencies
4. **Resource Limits**: Configure container resource constraints
5. **Job Orchestration**: Use labels to direct specific jobs to appropriate containers

Example of future deployment:

```bash
# Launch multiple containerized runners on a powerful machine
docker-compose up -d --scale unity-runner=4
```

This containerization approach will reduce build times by better utilizing multi-core CPUs and providing parallel processing capabilities for the Unity build pipeline.
