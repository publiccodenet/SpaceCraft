# GitHub Runner Setup for macOS with Unity

This document describes how to set up a macOS self-hosted GitHub Actions runner with Unity for CI/CD operations.

## Requirements

- macOS machine (Intel or Apple Silicon)
- Unity Hub and Unity editor installed
- GitHub account with access to the repository
- Administrative privileges on the machine

## Installation Steps

### 1. Install Unity

1. Download and install [Unity Hub](https://unity.com/download)
2. Open Unity Hub and sign in with your Unity account
3. Install the required Unity version(s):
   - Open the "Installs" tab
   - Click "Add" button
   - Select the Unity version that matches the project
   - Include necessary build modules:
     - Mac Build Support
     - iOS Build Support (if needed)
     - Any other platform modules required
   - Complete the installation

### 2. Verify Unity Installation

```bash
# Check that Unity is installed in the expected location
ls -la "/Applications/Unity/Hub/Editor"

# Verify the specific version needed by your project
ls -la "/Applications/Unity/Hub/Editor/[YOUR_VERSION]"

# Test that Unity can be launched from command line
"/Applications/Unity/Hub/Editor/[YOUR_VERSION]/Unity.app/Contents/MacOS/Unity" -quit -batchmode -logFile -
```

### 3. Install GitHub Runner

1. On GitHub, navigate to your repository or organization
2. Go to Settings > Actions > Runners
3. Click "New self-hosted runner"
4. Select "macOS" as the operating system
5. Follow the provided instructions to:
   - Download the runner application
   - Configure the runner
   - Install it as a service

### 4. Configure the Runner with "preconfigured" Tags

1. Add the `preconfigured` and `mac` tags during setup, or update the existing configuration:

```bash
# To add tags during initial setup
./config.sh --url https://github.com/[YOUR_ORG]/[YOUR_REPO] --token [YOUR_TOKEN] --labels "preconfigured,mac"

# To add tags to an existing runner
./config.sh --labels "preconfigured,mac"
```

2. Make the runner persistent using launchd:

```bash
cd ~/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start
```

### 5. Set Environment Variables

Create a `.env` file in the runner's directory with the following environment variables:

```bash
# Required variables
export UNITY_PRECONFIGURED=true

# Optional variables - will be auto-detected if not set
# export UNITY_VERSION="2022.3.5f1"  # Uncomment and set if needed
# export UNITY_PATH="/Applications/Unity/Hub/Editor/2022.3.5f1/Unity.app/Contents/MacOS/Unity"
```

Add these environment variables to the runner's service by updating the launchd plist file.

### 6. Test the Runner

1. Push a commit to your repository that triggers a Unity-based workflow
2. Verify the job runs on your self-hosted runner
3. Check the logs to ensure the correct Unity version is being used

## Troubleshooting

### Unity Not Found

If the workflow fails with "Unity executable not found":

1. Verify Unity is installed at the expected path
2. Check that the runner has permissions to access the Unity installation
3. Try setting the `UNITY_PATH` variable explicitly

### License Issues

If Unity reports license errors:

1. Ensure your Unity license is active
2. For batchmode operation, you may need to activate Unity manually first
3. For headless CI/CD, consider using a Unity license server or Unity's batch license

### Troubleshooting

*   **"zsh: command not found: brew"**: Ensure Homebrew is installed and in your PATH.
*   **Runner not starting**: Check the `svc.sh` logs (e.g., `~/actions-runner/_diag/pagesetup.log`).
*   **Permissions**: Ensure the runner user has permissions for the project directory.

## Important Considerations for Unity CI/CD

### Concurrent Unity Instances & Batch Mode

While you *can* technically launch a separate Unity editor process using the command line (`-batchmode`) even while the interactive editor is open for the same project, **it is strongly discouraged for operations that modify project assets.**

*   **Asset Conflicts:** Running batch mode commands like schema generation (`-executeMethod SchemaGenerator.GenerateSchemas_Commandline`) or project builds while the main editor is open can lead to race conditions, conflicts with the editor's asset database, unexpected recompilations, or even data corruption.
*   **Recommendation:** Always **close the interactive Unity editor** before running batch mode commands that modify project assets (like schema generation or builds) on that specific project via the command line or CI scripts.
*   **CI/CD Environment:** For automated workflows, ensure the runner environment executes these commands without a conflicting interactive editor session running concurrently on the same project checkout.

### Why Self-Hosted Runners for Unity?

Using self-hosted runners (like the macOS setup described here) is often preferred over GitHub-hosted runners for Unity projects due to several factors:

1.  **Unity Licensing:** GitHub-hosted runners may not have Unity installed or activated correctly. Self-hosted runners allow you to manage the Unity installation and activation as needed (often requiring a Pro license for unattended activation/batch mode usage).
2.  **Hardware Requirements:** Unity builds can be resource-intensive (CPU, RAM, disk space). Self-hosted runners allow you to provide adequate hardware, whereas GitHub-hosted runners have standard resource limits that might be insufficient, leading to slow or failed builds.
3.  **Large Project Size:** Unity projects (especially the `Library` folder) can be very large. Cloning or caching these on GitHub-hosted runners can be slow and exceed cache limits. Self-hosted runners allow for persistent storage, significantly speeding up subsequent builds.
4.  **Software Dependencies:** Your project might require specific SDKs (iOS, Android), tools, or environment configurations that are easier to set up and maintain consistently on a dedicated self-hosted machine.
5.  **Cost:** For frequent builds, the cost of GitHub-hosted runner minutes (especially macOS) can become significant compared to utilizing existing hardware (like a spare Mac).

While GitHub-hosted runners *can* be used with specific Unity actions (like `game-ci/unity-builder`), self-hosted runners generally offer more control, performance, and potentially lower costs for complex Unity projects.

## Using the Runner in Workflows

In your GitHub workflow files, target your macOS runner:

```yaml
jobs:
  build:
    runs-on: [self-hosted, mac, preconfigured]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2
      
      - name: Setup Unity environment
        run: |
          source ./SvelteKit/BackSpace/scripts/unity-env.sh
      
      # Your Unity build steps
```

## Optimizing Unity Workflows with Persistent Workspaces

Self-hosted runners allow for significant speed improvements by maintaining a persistent workspace between job runs. This is especially beneficial for Unity projects due to the time-consuming `Library` folder import.

**Strategy:**

1.  **Define a Consistent Path:** Assign a unique, persistent directory on the runner for each repository's workspace. Using the repository name ensures isolation.
2.  **Use `actions/checkout` with `clean: false`:** Configure the checkout step to *reuse* the workspace directory instead of deleting it. It will fetch updates similar to `git pull`.
3.  **Leverage Cached `Library`:** Unity will detect the existing `Library` folder within the persistent workspace and perform much faster incremental imports instead of a full re-import.

**Example Workflow Snippet:**

```yaml
name: Optimized Unity CI

on: [push]

jobs:
  build:
    runs-on: [self-hosted, mac, preconfigured]

    steps:
      - name: Define Workspace Path
        # Use runner.temp or another base directory + repository name for isolation
        run: echo "WORKSPACE_PATH=${{ runner.temp }}/persistent_workspaces/${{ github.event.repository.name }}" >> $GITHUB_ENV

      - name: Checkout Repository (Persistent)
        uses: actions/checkout@v4 # Use a specific version
        with:
          clean: false # IMPORTANT: Do not delete workspace before checkout
          path: ${{ env.WORKSPACE_PATH }} # Checkout to the defined persistent path

      # Optional: cd into specific project subdirectories if needed
      - name: Set Working Directory (Example)
        working-directory: ${{ env.WORKSPACE_PATH }}/UnityProjectDirectory # Adjust as needed
        run: echo "Running steps within Unity project..."

      # --- Your Unity Steps Here ---
      # e.g., Schema Generation, Build, Tests
      # These steps will benefit from the persistent Library folder
      # - name: Generate Schemas
      #   working-directory: ${{ env.WORKSPACE_PATH }}/SvelteKit/BackSpace # Adjust
      #   run: npm run unity:regenerate-schemas
      #
      # - name: Build Project
      #   working-directory: ${{ env.WORKSPACE_PATH }}/SvelteKit/BackSpace # Adjust
      #   run: npm run unity:build-prod # Needs corresponding unity-automation command
```

**Considerations:**

*   **Disk Space:** Ensure your self-hosted runner has sufficient disk space to store the persistent workspaces for your projects (including the large `Library` folders).
*   **Git State:** While `clean: false` is fast, ensure your build process doesn't leave the git repository in a state that prevents future fetches (e.g., merge conflicts). Occasional manual cleanup or adding a `git reset --hard HEAD && git clean -fdx` step *before* checkout might be necessary if you encounter issues, but this negates some of the speed benefits.

## Managing the Runner

```bash
# Start the runner service
sudo ./svc.sh start

# Stop the runner service
sudo ./svc.sh stop

# Check runner status
sudo ./svc.sh status

# Uninstall the runner service
sudo ./svc.sh uninstall
``` 