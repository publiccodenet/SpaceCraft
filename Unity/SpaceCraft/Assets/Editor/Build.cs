//------------------------------------------------------------------------------
// <file_path>Unity/SpaceCraft/Assets/Editor/Build.cs</file_path>
// <namespace>SpaceCraftEditor</namespace>
// <assembly>Assembly-CSharp-Editor</assembly>
//
// WebGL Build automation script for Unity.
// All build functionality is accessible through the SpaceCraft menu.
//
// Full absolute path: /Users/a2deh/GroundUp/SpaceCraft/SpaceCraft/Unity/SpaceCraft/Assets/Editor/Build.cs
//------------------------------------------------------------------------------

using UnityEngine;
using UnityEditor;
using System.IO;
using System;
using UnityEditor.Build.Reporting;

public static class Build
{
    // --- SpaceCraft Menu Build Items ---
    [MenuItem("SpaceCraft/WebGL Development Build")]
    public static void WebGL_Dev()
    {
        Debug.Log("Starting WebGL Development Build...");

        // --- Force Platform and Template --- 
        BuildTarget targetPlatform = BuildTarget.WebGL;
        BuildTargetGroup targetGroup = BuildTargetGroup.WebGL;
        string templateName = "PROJECT:SpaceCraft"; // Ensure this folder exists in Assets/WebGLTemplates

        // Switch active build target if needed
        if (EditorUserBuildSettings.activeBuildTarget != targetPlatform) 
        {
            Debug.LogWarning($"[Build] Active build target is {EditorUserBuildSettings.activeBuildTarget}. Switching to {targetPlatform}...");
            // Use the correct overload taking both Group and Target
            EditorUserBuildSettings.SwitchActiveBuildTarget(targetGroup, targetPlatform);
            // Note: Switching platforms can take time and recompile scripts.
        }

        // Force the WebGL template 
        if (PlayerSettings.WebGL.template != templateName)
        {
            Debug.Log($"[Build] Current WebGL template is '{PlayerSettings.WebGL.template}'. Forcing to '{templateName}'.");
            PlayerSettings.WebGL.template = templateName;
        }
        
        // Default dev output (existing behavior)
        string buildPath = Path.Combine("..", "..", "WebSites", "SpaceCraft");
        // Allow CI override via env var or CLI
        buildPath = ResolveOutputPath(buildPath);
        Debug.Log($"[Build] Output path: {buildPath}");

        // Ensure scenes are configured
        var scenes = EnsureScenesConfigured();
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = buildPath,
            target = BuildTarget.WebGL,
            options = BuildOptions.Development // Add development flag if needed
        };

        Debug.Log($"Building to: {options.locationPathName}");
        PerformBuild(options);
    }

    [MenuItem("SpaceCraft/WebGL Production Build")]
    public static void WebGL_Prod()
    {
        Debug.Log("Starting WebGL Production Build...");

        // --- Force Platform and Template --- 
        BuildTarget targetPlatform = BuildTarget.WebGL;
        BuildTargetGroup targetGroup = BuildTargetGroup.WebGL;
        string templateName = "PROJECT:SpaceCraft"; // Ensure this folder exists in Assets/WebGLTemplates

        // Switch active build target if needed
        if (EditorUserBuildSettings.activeBuildTarget != targetPlatform) 
        {
            Debug.LogWarning($"[Build] Active build target is {EditorUserBuildSettings.activeBuildTarget}. Switching to {targetPlatform}...");
            // Use the correct overload taking both Group and Target
            EditorUserBuildSettings.SwitchActiveBuildTarget(targetGroup, targetPlatform);
             // Note: Switching platforms can take time and recompile scripts.
        }

        // Force the WebGL template
        if (PlayerSettings.WebGL.template != templateName)
        {
            Debug.Log($"[Build] Current WebGL template is '{PlayerSettings.WebGL.template}'. Forcing to '{templateName}'.");
            PlayerSettings.WebGL.template = templateName;
        }
        // --- End Force --- 
        
        // Default prod output (existing behavior)
        string buildPath = Path.Combine("Builds", "SpaceCraft");
        // Allow CI override via env var or CLI
        buildPath = ResolveOutputPath(buildPath);
        Debug.Log($"[Build] Output path: {buildPath}");

        // Ensure scenes are configured
        var scenes = EnsureScenesConfigured();
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = buildPath,
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        };

        Debug.Log($"Building to: {options.locationPathName}");
        PerformBuild(options);
    }
    // --- END SpaceCraft Menu Build Items ---

    private static void PerformBuild(BuildPlayerOptions options)
    {
        // Ensure build directory exists
        string buildPath = Path.GetFullPath(options.locationPathName); // Get full path
        Directory.CreateDirectory(buildPath);

        // --- PRE-BUILD STEP: Remove symlinks from build target directory --- 
        Debug.Log($"[Build Pre-Clean] Cleaning symlinks from: {buildPath}");
        RemoveSymlinksRecursive(buildPath);
        Debug.Log("[Build Pre-Clean] Symlink cleaning complete.");
        // --- END PRE-BUILD STEP ---

        // Perform the build
        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildSummary summary = report.summary;
        
        // Check build result
        if (summary.result == BuildResult.Succeeded)
        {
            Debug.Log($"Build succeeded! Size: {summary.totalSize / 1024 / 1024}MB, Time: {summary.totalTime.TotalSeconds:F2}s");
            
            // If running in batch mode, exit with success code
            if (IsCommandLineBuild())
            {
                EditorApplication.Exit(0);
            }
        }
        else
        {
            Debug.LogError($"Build failed! Reason: {summary.result}");
            // If running in batch mode, exit with error code
            if (IsCommandLineBuild())
            {
                EditorApplication.Exit(1);
            }
        }
    }

    /// <summary>
    /// Recursively finds and removes symbolic links within a directory.
    /// </summary>
    /// <param name="path">The directory path to scan.</param>
    private static void RemoveSymlinksRecursive(string path)
    {
        if (!Directory.Exists(path)) return;

        // Process files (potential symlinks) in the current directory
        foreach (string file in Directory.GetFiles(path))
        {
            try
            {
                FileAttributes attributes = File.GetAttributes(file);
                // Check for ReparsePoint flag, which indicates a symlink on Unix-like systems (macOS, Linux)
                // and junction points/symlinks on Windows.
                if ((attributes & FileAttributes.ReparsePoint) == FileAttributes.ReparsePoint)
                {
                    Debug.Log($"[Build Pre-Clean] Removing symbolic link: {file}");
                    File.Delete(file);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Build Pre-Clean] Error checking/removing file {file}: {ex.Message}");
            }
        }

        // Process subdirectories recursively
        foreach (string dir in Directory.GetDirectories(path))
        {
             try
            {
                 FileAttributes attributes = File.GetAttributes(dir);
                 // Check if the *directory entry itself* is a symlink/junction
                 if ((attributes & FileAttributes.ReparsePoint) == FileAttributes.ReparsePoint)
                 {
                     Debug.Log($"[Build Pre-Clean] Removing directory symbolic link/junction: {dir}");
                     Directory.Delete(dir); // Use Directory.Delete for directory symlinks
                 }
                 else
                 {
                     // If it's a real directory, recurse into it
                     RemoveSymlinksRecursive(dir);
                 }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Build Pre-Clean] Error processing directory {dir}: {ex.Message}");
            }
        }
    }

    private static string[] EnsureScenesConfigured()
    {
        // If there are enabled scenes already, return them
        var enabled = System.Array.FindAll(EditorBuildSettings.scenes, s => s.enabled);
        if (enabled.Length > 0)
        {
            string[] paths = new string[enabled.Length];
            for (int i = 0; i < enabled.Length; i++) paths[i] = enabled[i].path;
            return paths;
        }

        // Discover all .unity scenes under Assets and configure Build Settings
        Debug.Log("[Build] No enabled scenes in Build Settings; falling back to discover all .unity scenes under Assets/");
        string[] discovered = new string[0];
        try
        {
            discovered = Directory.GetFiles("Assets", "*.unity", SearchOption.AllDirectories);
        }
        catch (Exception ex)
        {
            Debug.LogError($"[Build] Failed to enumerate scenes: {ex.Message}");
        }

        if (discovered.Length > 0)
        {
            var buildScenes = new EditorBuildSettingsScene[discovered.Length];
            for (int i = 0; i < discovered.Length; i++)
            {
                buildScenes[i] = new EditorBuildSettingsScene(discovered[i], true);
                Debug.Log($"[Build] Including scene: {discovered[i]}");
            }
            EditorBuildSettings.scenes = buildScenes;
            return discovered;
        }

        Debug.LogError("[Build] No scenes found to build. Configure Build Settings or add scenes under Assets/.");
        return discovered; // may be empty; BuildPipeline will fail and surface error
    }

    private static string ResolveOutputPath(string defaultPath)
    {
        // 1) Command line arg: -scOut <path> or --scOut=<path>
        var args = Environment.GetCommandLineArgs();
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "-scOut" && i + 1 < args.Length)
            {
                return args[i + 1];
            }
            if (args[i].StartsWith("--scOut="))
            {
                var val = args[i].Substring("--scOut=".Length);
                if (!string.IsNullOrEmpty(val)) return val;
            }
        }

        // 2) Environment variable fallback
        var envOut = Environment.GetEnvironmentVariable("SC_BUILD_OUTPUT");
        if (!string.IsNullOrEmpty(envOut)) return envOut;
        return defaultPath;
    }

    private static bool IsCommandLineBuild()
    {
        return Environment.CommandLine.Contains("-batchmode");
    }
} 