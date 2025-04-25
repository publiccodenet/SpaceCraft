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
        // --- End Force --- 
        
        string buildPath = Path.Combine("Builds", "SpaceCraft");
        
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
        string buildDir = Path.GetDirectoryName(options.locationPathName);
        Directory.CreateDirectory(buildDir);

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

    private static string[] GetBuildScenes()
    {
        // Get all enabled scenes from the build settings
        var scenes = new string[EditorBuildSettings.scenes.Length];
        for (int i = 0; i < scenes.Length; i++)
        {
            scenes[i] = EditorBuildSettings.scenes[i].path;
        }
        return scenes;
    }

    private static bool IsCommandLineBuild()
    {
        return Environment.CommandLine.Contains("-batchmode");
    }
} 