// UnitySchemaConverter.cs - This file is only here to prevent IL2CPP from stripping converters
// DO NOT USE THIS MAP AT RUNTIME - Direct converter instantiation is used instead

using UnityEngine;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;

/// <summary>
/// Map of converter names to converter types.
/// THIS CLASS SHOULD NOT BE USED DIRECTLY AT RUNTIME!
/// It exists only to provide references to converters so they don't get stripped
/// from IL2CPP builds. The code generator directly instantiates converters by name.
/// </summary>
[UnityEngine.Scripting.Preserve] // Prevent this class from being stripped
public static class UnitySchemaConverter
{
    // This dictionary ensures that converters are referenced and not stripped from the build
    // DO NOT USE THIS FOR REFLECTION-BASED LOOKUP AT RUNTIME!
    [UnityEngine.Scripting.Preserve] // Prevent this field from being stripped
    private static readonly Dictionary<string, JsonConverter> ConverterMap = new Dictionary<string, JsonConverter>()
    {
        // String converters
        { "StringOrNullToStringConverter", new StringOrNullToStringConverter() },
        { "StringArrayOrStringOrNullToStringConverter", new StringArrayOrStringOrNullToStringConverter() },
        { "StringArrayOrStringOrNullToStringArrayConverter", new StringArrayOrStringOrNullToStringArrayConverter() },
        { "SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter", new SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter() },
        
        // Number converters - specific by type
        { "StringOrNumberOrNullToIntegerConverter", new StringOrNumberOrNullToIntegerConverter() },
        { "StringOrNumberOrNullToNumberConverter", new StringOrNumberOrNullToNumberConverter() },
        
        // Other converters can be added here
    };

    /// <summary>
    /// WARNING: DO NOT USE THIS METHOD DIRECTLY!
    /// This method is only here to keep the converter map and converters from being stripped.
    /// It should not be called at runtime as it can cause stack overflows in IL2CPP/WebGL.
    /// </summary>
    [System.Obsolete("DO NOT USE THIS METHOD AT RUNTIME! It will cause IL2CPP crashes.")]
    [UnityEngine.Scripting.Preserve] // Prevent this method from being stripped
    public static JsonConverter GetConverter(string typeName)
    {
        Debug.LogError("UnitySchemaConverter.GetConverter should never be called at runtime!");
        
        // This is just to reference the dictionary - DO NOT USE!
        if (ConverterMap.TryGetValue(typeName, out JsonConverter converter))
        {
            return converter;
        }
        
        Debug.LogError($"Converter not found: {typeName}");
        return null;
    }
    
    /// <summary>
    /// Lists all converters in the console - for debugging only.
    /// </summary>
    [System.Obsolete("Only for debugging in the editor.")]
    [UnityEngine.Scripting.Preserve] // Prevent this method from being stripped
    public static void ListAllConverters()
    {
        Debug.Log("Available converters:");
        foreach (var kvp in ConverterMap)
        {
            Debug.Log($"- {kvp.Key} => {kvp.Value.GetType().Name}");
        }
    }
    
    /// <summary>
    /// This method is automatically called when the game starts.
    /// It's only purpose is to ensure the converters don't get stripped.
    /// </summary>
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    [UnityEngine.Scripting.Preserve] // Prevent this method from being stripped
    private static void PreserveConverters()
    {
        // This method is intentionally empty.
        // Just having this RuntimeInitializeOnLoadMethod referencing the ConverterMap
        // will prevent Unity from stripping it during IL2CPP build.
        
        // Debug.Log($"Schema Converters initialized. Count: {ConverterMap.Count}");
        
        // Uncomment below in editor builds for debugging if needed
        // foreach (var converter in ConverterMap.Values)
        // {
        //     Debug.Log($"Converter type: {converter.GetType().Name}");
        // }
    }
} 