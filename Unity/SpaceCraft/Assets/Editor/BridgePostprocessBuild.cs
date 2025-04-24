//------------------------------------------------------------------------------
// BridgePostprocessBuild.cs
//------------------------------------------------------------------------------
// This script automatically adds the WebKit.framework to the Xcode project
// after a Unity iOS build is generated. This is REQUIRED for the SpaceCraft 
// Bridge to function correctly on iOS devices.
//
// WHY IS THIS NEEDED:
// - The Bridge uses WKWebView to establish communication between Unity and JavaScript
// - WKWebView is part of the WebKit framework which is not included by default
// - Without WebKit.framework, the app will crash when trying to initialize the Bridge
// - Manual addition of frameworks to Xcode projects is error-prone and easy to forget
//
// This post-process build step ensures that the WebKit framework is always
// properly added to the project, eliminating build errors and runtime crashes
// related to missing WebKit dependencies.
//------------------------------------------------------------------------------

#if UNITY_IOS
using System.Collections;
using System.IO;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;
using UnityEditor;
using UnityEngine;

public class BridgePostprocessBuild {
    [PostProcessBuild(100)]
    public static void OnPostprocessBuild(BuildTarget buildTarget, string path) {
        if (buildTarget == BuildTarget.iOS) {
            string projPath = path + "/Unity-iPhone.xcodeproj/project.pbxproj";
            PBXProject proj = new PBXProject();
            proj.ReadFromString(File.ReadAllText(projPath));
            string target = proj.TargetGuidByName("Unity-iPhone");
            proj.AddFrameworkToProject(target, "WebKit.framework", false);
            File.WriteAllText(projPath, proj.WriteToString());
        }
    }
}
#endif
