//------------------------------------------------------------------------------
// <file_path>Unity/CraftSpace/Assets/Editor/Build.cs</file_path>
// <namespace>CraftSpace.Editor</namespace>
// <assembly>Assembly-CSharp-Editor</assembly>
//
// Build automation script. This is NOT related to schema generation.
// It is a separate build tool that happens to be in the Editor folder.
//
// Full absolute path: /Users/a2deh/GroundUp/SpaceCraft/CraftSpace/Unity/CraftSpace/Assets/Editor/Build.cs
//------------------------------------------------------------------------------

using UnityEngine;
using UnityEditor;
using System.IO;
using System;
using UnityEditor.Build.Reporting;

public static class Build
{
    [MenuItem("Build/Development Build")]
    public static void BuildDev()
    {
        Debug.Log("Starting Development Build...");
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetBuildScenes(),
            locationPathName = Path.Combine("Builds", "Development", GetBuildName()),
            target = GetBuildTarget(),
            options = BuildOptions.Development | BuildOptions.AllowDebugging
        };

        PerformBuild(options);
    }

    [MenuItem("Build/Production Build")]
    public static void BuildProd()
    {
        Debug.Log("Starting Production Build...");
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetBuildScenes(),
            locationPathName = Path.Combine("Builds", "Production", GetBuildName()),
            target = GetBuildTarget(),
            options = BuildOptions.None
        };

        PerformBuild(options);
    }

    // --- NEW WebGL Builds ---
    [MenuItem("Build/WebGL Development Build")]
    public static void BuildWebGL_Dev()
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
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetBuildScenes(),
            locationPathName = Path.Combine("Builds", "SpaceCraft"), // Correct relative path
            target = BuildTarget.WebGL,
            options = BuildOptions.Development // Add development flag if needed
        };

        PerformBuild(options);
    }

    [MenuItem("Build/WebGL Production Build")]
    public static void BuildWebGL_Prod()
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
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = GetBuildScenes(),
            locationPathName = Path.Combine("Builds", "SpaceCraft"), // Correct relative path
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        };

        PerformBuild(options);
    }
    
    // CraftSpace Menu Items
    [MenuItem("CraftSpace/Build WebGL (Development)")]
    public static void CraftSpaceWebGL_Dev()
    {
        BuildWebGL_Dev();
    }
    
    [MenuItem("CraftSpace/Build WebGL (Production)")]
    public static void CraftSpaceWebGL_Prod()
    {
        BuildWebGL_Prod();
    }
    // --- END WebGL Builds ---

    private static void PerformBuild(BuildPlayerOptions options)
    {
        // Ensure build directory exists
        Directory.CreateDirectory(Path.GetDirectoryName(options.locationPathName));

        // Log build settings
        Debug.Log($"Building to: {options.locationPathName}");
        Debug.Log($"Scenes: {string.Join(", ", options.scenes)}");
        Debug.Log($"Target: {options.target}");
        Debug.Log($"Options: {options.options}");

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

    private static BuildTarget GetBuildTarget()
    {
        // Determine build target based on platform
        switch (Application.platform)
        {
            case RuntimePlatform.OSXEditor:
                return BuildTarget.StandaloneOSX;
            case RuntimePlatform.WindowsEditor:
                return BuildTarget.StandaloneWindows64;
            case RuntimePlatform.LinuxEditor:
                return BuildTarget.StandaloneLinux64;
            default:
                return BuildTarget.StandaloneWindows64; // Default to Windows
        }
    }

    private static string GetBuildName()
    {
        string appName = PlayerSettings.productName.Replace(" ", "");
        string buildTarget = GetBuildTarget().ToString();
        string version = PlayerSettings.bundleVersion;
        string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");

        // Create a name like "CraftSpace_Windows_v1.0_20230805_123456.exe"
        string extension = "";
        switch (GetBuildTarget())
        {
            case BuildTarget.StandaloneWindows:
            case BuildTarget.StandaloneWindows64:
                extension = ".exe";
                break;
            case BuildTarget.StandaloneOSX:
                extension = ".app";
                break;
            case BuildTarget.Android:
                extension = ".apk";
                break;
            case BuildTarget.WebGL:
                extension = "";
                break;
            default:
                extension = "";
                break;
        }

        return $"{appName}_{buildTarget}_v{version}_{timestamp}{extension}";
    }

    private static bool IsCommandLineBuild()
    {
        return Environment.CommandLine.Contains("-batchmode");
    }
} 