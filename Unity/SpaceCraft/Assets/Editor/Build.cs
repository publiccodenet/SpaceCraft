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
        
        //string buildPath = Path.Combine("Builds", "SpaceCraft");
        // Build directly into WebSites/SpaceCraft at top level of repo.
        string buildPath = Path.Combine("..", "..", "WebSites", "SpaceCraft");
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetBuildScenes(),
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
        
        string buildPath = Path.Combine("Builds", "SpaceCraft");
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetBuildScenes(),
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
        string buildDir = Path.GetDirectoryName(buildPath);
        Directory.CreateDirectory(buildDir);

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

    private static string[] GetBuildScenes()
    {
        // Prefer enabled scenes from Build Settings
        var enabledScenes = System.Array.FindAll(EditorBuildSettings.scenes, s => s.enabled);
        string[] scenes = new string[enabledScenes.Length];
        for (int i = 0; i < enabledScenes.Length; i++)
        {
            scenes[i] = enabledScenes[i].path;
        }

        // Fallback: if none configured/enabled, include all .unity scenes under Assets
        if (scenes.Length == 0)
        {
            Debug.LogWarning("[Build] No enabled scenes in Build Settings; falling back to discover all .unity scenes under Assets/");
            try
            {
                var found = Directory.GetFiles("Assets", "*.unity", SearchOption.AllDirectories);
                scenes = found;
                foreach (var scene in scenes)
                {
                    Debug.Log($"[Build] Including scene: {scene}");
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[Build] Failed to enumerate scenes: {ex.Message}");
            }
        }

        // Validate
        if (scenes == null || scenes.Length == 0)
        {
            Debug.LogError("[Build] No scenes found to build. Configure Build Settings or add scenes under Assets/.");
            if (IsCommandLineBuild()) EditorApplication.Exit(1);
        }

        return scenes;
    }

    private static bool IsCommandLineBuild()
    {
        return Environment.CommandLine.Contains("-batchmode");
    }
} 