//------------------------------------------------------------------------------
// <file_path>Unity/CraftSpace/Assets/Editor/SchemaGenerator/SchemaGenerator.cs</file_path>
// <namespace>CraftSpace.Editor</namespace>
// <assembly>Assembly-CSharp-Editor</assembly>
//
// THIS IS THE CODE GENERATOR AND SOURCE OF TRUTH FOR ALL SCHEMA CLASSES.
// DO NOT EDIT GENERATED SCHEMA FILES! Edit THIS generator instead.
// 
// IMPORTANT: If there are errors in schema-related code:
// 1. FIX THIS GENERATOR FIRST before making changes to other files
// 2. Then regenerate all schema files via CraftSpace > Import All Schemas
// 3. Never edit generated schema files directly
//
// Generated files path: Unity/CraftSpace/Assets/Scripts/Schemas/Generated/*.cs
//------------------------------------------------------------------------------

using UnityEngine;
using UnityEditor;
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.Linq;

namespace CraftSpace.Editor
{
/// <summary>
/// Simple JSON schema to C# class generator for Unity.
/// Generates WebGL/IL2CPP compatible code with:
/// - Explicit properties (no reflection at runtime for user types)
/// - Direct JObject storage for extra fields
/// - Explicit, generated serialization/deserialization logic in Import/ExportKnownProperties
/// - Direct calls to IL2CPP-safe converters when specified via x_meta
/// - Works in conjunction with SchemaGeneratedObject base class
/// - Avoids dynamic access or type conversion pitfalls
/// - No namespaces or extra assemblies needed for generated types
/// </summary>
#if UNITY_EDITOR
public class SchemaGenerator : EditorWindow
{
    // Constants
    private static readonly string SCHEMA_DIR = Path.Combine(Application.streamingAssetsPath, "Content/schemas");
    private static readonly string OUTPUT_DIR = "Assets/Scripts/Schemas/Generated";
    
    // UI state
    private Vector2 _scrollPos;

    [MenuItem("CraftSpace/Schema Generator")]
    public static void ShowWindow()
    {
        var window = GetWindow<SchemaGenerator>("Schema Generator");
        window.minSize = new Vector2(400, 200);
        window.Show();
    }

    // Ensures this menu item runs the direct generation logic without opening the window.
    [MenuItem("CraftSpace/Import All Schemas")] 
    public static void ImportAllSchemasMenuItem()
    {
        Debug.Log("=== Regenerating Schemas (Menu Triggered) ===");
        try
        {
            // Run import directly without getting window instance
            ImportAllSchemas();
            Debug.Log("=== Schema Regeneration Complete (Menu Triggered) ===");
            if (Application.isBatchMode) EditorApplication.Exit(0); // Exit successfully in batch mode
        }
        catch (Exception e)
        {
            Debug.LogError($"!!! Schema Regeneration Failed (Menu Triggered): {e.Message}\n{e.StackTrace}");
            if (Application.isBatchMode) EditorApplication.Exit(1); // Exit with error code in batch mode
        }
    }

    private void OnGUI()
    {
        EditorGUILayout.Space();
        EditorGUILayout.LabelField("JSON Schema Generator", EditorStyles.boldLabel);
        EditorGUILayout.Space();

        if (GUILayout.Button("Import All Schemas"))
        {
            ImportAllSchemas();
        }

        EditorGUILayout.Space();
        EditorGUILayout.HelpBox("This tool automatically generates C# classes from JSON schema files.\n\nYou can also use the menu item 'CraftSpace > Import All Schemas' to import without opening this window.", MessageType.Info);
    }

    private static void ImportAllSchemas()
    {
        if (!Directory.Exists(SCHEMA_DIR))
        {
            EditorUtility.DisplayDialog("Error", $"Schema directory not found: {SCHEMA_DIR}", "OK");
            return;
        }
        
        string[] schemaFiles = Directory.GetFiles(SCHEMA_DIR, "*.json");
        int successCount = 0;
        int failureCount = 0;
        
        foreach (string file in schemaFiles)
        {
            try 
            {
                string json = File.ReadAllText(file);
                var schema = JObject.Parse(json);
                
                // Get base name from the JSON schema file (Collection.json or Item.json without Schema suffix)
                string baseModelName = Path.GetFileNameWithoutExtension(file);
                
                // Add "Schema" suffix for C# class names - this is where we explicitly add the Schema suffix 
                // JSON schema files don't have this suffix, only the C# classes do
                string className = baseModelName + "Schema";
                
                Debug.Log($"Generating C# class '{className}' from JSON schema file '{Path.GetFileName(file)}'");
                
                var code = GenerateClass(schema, className);
                SaveGeneratedCode(className, code);
                successCount++;
            }
            catch (Exception ex)
            {
                failureCount++;
                Debug.LogError($"Error processing {Path.GetFileName(file)}: {ex.Message}");
            }
        }
        
        string message = $"Schema processing complete.\nSuccessful: {successCount}\nFailed: {failureCount}";
        EditorUtility.DisplayDialog("Schema Import", message, "OK");
    }

    private static void SaveGeneratedCode(string className, string code)
    {
        if (!Directory.Exists(OUTPUT_DIR))
        {
            Directory.CreateDirectory(OUTPUT_DIR);
        }
        
        // Ensure the filename always matches the class name
        // This prevents having Collection.cs and CollectionSchema.cs as separate files
        string filePath = Path.Combine(OUTPUT_DIR, $"{className}.cs");
        File.WriteAllText(filePath, code);
        AssetDatabase.Refresh();
    }

    private static string GenerateClass(JObject schema, string className)
    {
        var sb = new StringBuilder();

        // Add header comment
        sb.AppendLine("//------------------------------------------------------------------------------");
        sb.AppendLine("// <auto-generated>");
        sb.AppendLine("//     This code was generated by CraftSpace Schema Generator.");
        sb.AppendLine("//     Runtime Version: 1.0");
        sb.AppendLine("//");
        sb.AppendLine("//     ██████╗  ██████╗     ███╗   ██╗ ██████╗ ████████╗    ███████╗██████╗ ██╗████████╗");
        sb.AppendLine("//     ██╔══██╗██╔═══██╗    ████╗  ██║██╔═══██╗╚══██╔══╝    ██╔════╝██╔══██╗██║╚══██╔══╝");
        sb.AppendLine("//     ██║  ██║██║   ██║    ██╔██╗ ██║██║   ██║   ██║       █████╗  ██║  ██║██║   ██║   ");
        sb.AppendLine("//     ██║  ██║██║   ██║    ██║╚██╗██║██║   ██║   ██║       ██╔══╝  ██║  ██║██║   ██║   ");
        sb.AppendLine("//     ██████╔╝╚██████╔╝    ██║ ╚████║╚██████╔╝   ██║       ███████╗██████╔╝██║   ██║   ");
        sb.AppendLine("//     ╚═════╝  ╚═════╝     ╚═╝  ╚═══╝ ╚═════╝    ╚═╝       ╚══════╝╚═════╝ ╚═╝   ╚═╝   ");
        sb.AppendLine("//");
        sb.AppendLine("//     CRITICAL WARNING: THIS FILE IS AUTO-GENERATED");
        sb.AppendLine("//     DO NOT MODIFY THIS FILE DIRECTLY UNDER ANY CIRCUMSTANCES");
        sb.AppendLine("//");
        sb.AppendLine("//     Path: Unity/CraftSpace/Assets/Scripts/Schemas/Generated/" + className + ".cs");
        sb.AppendLine("//");
        sb.AppendLine("//     If this file needs to be updated:");
        sb.AppendLine("//     1. NEVER modify this generated file directly");
        sb.AppendLine("//     2. ALWAYS modify the schema generator: Unity/CraftSpace/Assets/Editor/SchemaGenerator/SchemaGenerator.cs");
        sb.AppendLine("//     3. Update schema definitions in SvelteKit/BackSpace/src/lib/schemas/");
        sb.AppendLine("//     4. Run npm run schema:export in SvelteKit/BackSpace directory");
        sb.AppendLine("//     5. Regenerate using CraftSpace > Schema Generator in Unity");
        sb.AppendLine("//");
        sb.AppendLine("//     Any changes made directly to this file WILL BE LOST when regenerated.");
        sb.AppendLine("// </auto-generated>");
        sb.AppendLine("//------------------------------------------------------------------------------");
        sb.AppendLine();

        // Add using statements
        sb.AppendLine("using UnityEngine;");
        sb.AppendLine("using Newtonsoft.Json;");
        sb.AppendLine("using Newtonsoft.Json.Linq;");
        sb.AppendLine("using System;");
        sb.AppendLine("using System.Collections.Generic;");
        sb.AppendLine("using System.Linq;");
        sb.AppendLine();

        // Begin class definition
        sb.AppendLine($"[System.Serializable]");
        sb.AppendLine($"public class {className} : SchemaGeneratedObject");
        sb.AppendLine("{");
        
        // Add warning comment at the class level too for extra emphasis
        sb.AppendLine("    // WARNING: This is an auto-generated class. DO NOT MODIFY DIRECTLY.");
        sb.AppendLine("    // If changes are needed, modify the schema generator instead.");
        sb.AppendLine();

        // Get properties from schema
        var properties = schema["properties"] as JObject;
        if (properties != null)
        {
            // Generate fields and properties
            foreach (var prop in properties)
            {
                var rawPropertyName = prop.Key;
                var propertySchema = prop.Value as JObject;
                
                if (propertySchema == null) continue;
                
                // Keep JSON property names with original casing from schema
                var jsonPropertyName = rawPropertyName;
                
                // Special handling for extraFields property - exact case match only
                bool isExtraFields = rawPropertyName == "extraFields";
                
                // For extraFields, we should just skip it completely since it's in the base class
                if (isExtraFields)
                {
                    continue;
                }
                
                // Use PascalCase for C# properties
                var csharpPropertyName = CapitalizeFirstLetter(rawPropertyName);
                var propertyType = GetCSharpType(propertySchema);
                
                // Use lowercase for private fields with original name (not lowercased)
                var fieldName = "_" + rawPropertyName;
                var description = propertySchema["description"]?.ToString() ?? $"{csharpPropertyName} property";
                
                // Look for namespaced converter key
                string converterMeta = propertySchema["x_meta"]?["UnitySchemaConverter"]?.Value<string>();
                
                // Check if this property overrides a base class member (specifically 'Id' for now)
                bool isOverride = (csharpPropertyName == "Id");
                string overrideKeyword = isOverride ? "override " : "";
                
                // Generate accessors based on property type
                string accessors;
                
                // For Id, provide a getter implementation that returns _id field directly
                // But also implement a setter that updates the backing field for consistency
                if (isOverride) {
                    accessors = "{ get { return _id; } set { _id = value; } }"; // Override both getter and setter for Id
                } else {
                    // For all other properties, implement both getter and setter that use the backing field
                    // This ensures consistency in property implementation across all properties
                    accessors = "{ get { return " + fieldName + "; } set { " + fieldName + " = value; } }";
                }
                
                // Generate property documentation and field/property
                sb.AppendLine($"    /// <summary>");
                sb.AppendLine($"    /// {description.Replace("\n", "\n        /// ")}");
                sb.AppendLine($"    /// Schema Path: {jsonPropertyName}");
                if (!string.IsNullOrEmpty(converterMeta)){
                    sb.AppendLine($"    /// UnitySchemaConverter: {converterMeta}");
                }
                sb.AppendLine($"    /// </summary>");
                
                // The backing field is always private and has a default
                sb.AppendLine($"    [SerializeField] private {propertyType} {fieldName} = {GetDefaultValue(propertyType)};"); 
                // The public property uses the backing field
                sb.AppendLine($"    public {overrideKeyword}{propertyType} {csharpPropertyName} {accessors}"); 
                sb.AppendLine();
            }

            // Generate ImportKnownProperties method
            sb.AppendLine("    protected override void ImportKnownProperties(JObject json)");
            sb.AppendLine("    {");
            
            // Import known properties
            foreach (var prop in properties)
            {
                var rawPropertyName = prop.Key;
                var propertySchema = prop.Value as JObject;
                
                if (propertySchema == null) continue;
                
                var jsonPropertyName = rawPropertyName;
                var propertyType = GetCSharpType(propertySchema);
                var fieldName = "_" + jsonPropertyName;
                var csharpPropertyName = CapitalizeFirstLetter(rawPropertyName);
                bool isOverride = (csharpPropertyName == "Id");
                
                // Skip extraFields in import/export methods - it's handled by base class
                bool isExtraFields = rawPropertyName == "extraFields";
                if (isExtraFields) continue;
                
                // Basic direct conversion for now
                sb.AppendLine($"        // Processing property '{jsonPropertyName}'");
                sb.AppendLine($"        if (json[\"{jsonPropertyName}\"] != null)");
                sb.AppendLine($"        {{");
                sb.AppendLine($"            try");
                sb.AppendLine($"            {{");
                
                // Direct conversion based on type
                if (propertyType == "string")
                {
                    sb.AppendLine($"                {fieldName} = json[\"{jsonPropertyName}\"].ToString();");
                }
                else if (propertyType == "int" || propertyType == "long")
                {
                    sb.AppendLine($"                {fieldName} = json[\"{jsonPropertyName}\"].Value<{propertyType}>();");
                }
                else if (propertyType == "float" || propertyType == "double")
                {
                    sb.AppendLine($"                {fieldName} = json[\"{jsonPropertyName}\"].Value<{propertyType}>();");
                }
                else if (propertyType == "bool")
                {
                    sb.AppendLine($"                {fieldName} = json[\"{jsonPropertyName}\"].Value<bool>();");
                }
                else if (propertyType == "DateTime")
                {
                    sb.AppendLine($"                {fieldName} = DateTime.Parse(json[\"{jsonPropertyName}\"].ToString());");
                }
                else if (propertyType == "string[]")
                {
                    sb.AppendLine($"                // Convert to string array");
                    sb.AppendLine($"                var token = json[\"{jsonPropertyName}\"];");
                    sb.AppendLine($"                if (token.Type == JTokenType.Array)");
                    sb.AppendLine($"                {{");
                    sb.AppendLine($"                    var array = token.ToObject<string[]>();");
                    sb.AppendLine($"                    if (array != null) {fieldName} = array;");
                    sb.AppendLine($"                }}");
                    sb.AppendLine($"                else if (token.Type == JTokenType.String)");
                    sb.AppendLine($"                {{");
                    sb.AppendLine($"                    {fieldName} = new string[]{{ token.ToString() }};");
                    sb.AppendLine($"                }}");
                }
                else
                {
                    // Complex objects handled generically
                    sb.AppendLine($"                {fieldName} = json[\"{jsonPropertyName}\"].ToObject<{propertyType}>();");
                }
                
                sb.AppendLine($"            }}");
                sb.AppendLine($"            catch (Exception ex) {{ Debug.LogError($\"Error converting '{jsonPropertyName}' directly: {{ex.Message}}\"); }}");
                sb.AppendLine($"        }}");
                
                sb.AppendLine(); // Add blank line for readability
            }
            
            sb.AppendLine("    }");
            sb.AppendLine();

            // Generate ExportKnownProperties method
            sb.AppendLine("    protected override JObject ExportKnownProperties()");
            sb.AppendLine("    {");
            sb.AppendLine("        var json = new JObject();");
            
            // Export known properties
            foreach (var prop in properties)
            {
                var rawPropertyName = prop.Key;
                var propertySchema = prop.Value as JObject;
                
                if (propertySchema == null) continue;
                
                // Skip extraFields in import/export methods - it's handled by base class
                bool isExtraFields = rawPropertyName == "extraFields";
                if (isExtraFields) continue;
                
                var fieldName = "_" + rawPropertyName;
                var jsonPropertyName = rawPropertyName;
                var propertyType = GetCSharpType(propertySchema);
                
                // Check for namespaced converter
                string converterName = null;
                var xMeta = propertySchema["x_meta"] as JObject;
                if (xMeta != null && xMeta["UnitySchemaConverter"] is JObject converterObj)
                {
                    converterName = converterObj["name"]?.ToString();
                }
                
                sb.AppendLine($"        // Processing property '{jsonPropertyName}'");
                sb.AppendLine($"        if ({fieldName} != null)");
                sb.AppendLine($"        {{");
                
                // Use direct converter call if specified
                if (!string.IsNullOrEmpty(converterName))
                {
                    sb.AppendLine($"            // Use {converterName}");
                    sb.AppendLine($"            try {{ json[\"{jsonPropertyName}\"] = {converterName}.WriteJson({fieldName}); }} catch (Exception ex) {{ Debug.LogError($\"Error converting '{jsonPropertyName}' with {converterName}: {{ex.Message}}\"); }}");
                }
                else
                {
                    // For properties without converters, handle conversion manually
                    sb.AppendLine($"            try");
                    sb.AppendLine($"            {{");
                    switch (propertyType)
                    {
                        case "string":
                        case "int":
                        case "float":
                        case "bool":
                        case "JObject":
                            sb.AppendLine($"                json[\"{jsonPropertyName}\"] = JToken.FromObject({fieldName}); // Basic types can use FromObject safely");
                            break;
                        default:
                            // For complex types like List<T>, manually build JArray
                            if (propertyType.StartsWith("List<"))
                            {
                                sb.AppendLine($"                var jArray = new JArray();");
                                sb.AppendLine($"                foreach (var item in {fieldName})");
                                sb.AppendLine($"                {{");
                                sb.AppendLine($"                    jArray.Add(JToken.FromObject(item)); // Use FromObject for list elements");
                                sb.AppendLine($"                }}");
                                sb.AppendLine($"                json[\"{jsonPropertyName}\"] = jArray;");
                            }
                            else
                            {
                                sb.AppendLine($"                // Custom type serialization would go here for {propertyType}, possibly using JToken.FromObject if safe or manual construction.");
                                sb.AppendLine($"                // json[\"{jsonPropertyName}\"] = JToken.FromObject({fieldName});");
                            }
                            break;
                    }
                    sb.AppendLine($"            }}");
                    sb.AppendLine($"            catch (Exception ex) {{ Debug.LogError($\"Error converting '{jsonPropertyName}' directly: {{ex.Message}}\"); }}");
                }
                sb.AppendLine($"        }}"); // End of null check
                sb.AppendLine(); // Add blank line for readability
            }
            
            sb.AppendLine("        return json;");
            sb.AppendLine("    }");
            sb.AppendLine();

            // Generate HasDefinedProperty method
            sb.AppendLine("    protected override bool HasDefinedProperty(string name)");
            sb.AppendLine("    {");
            sb.AppendLine("        switch (name)");
            sb.AppendLine("        {");
            
            foreach (var prop in properties)
            {
                var rawPropertyName = prop.Key;
                
                // Skip extraFields since it's not in the schema
                bool isExtraFields = rawPropertyName == "extraFields";
                if (isExtraFields) continue;
                
                // Keep original casing from schema for the switch statement
                var jsonPropertyName = rawPropertyName;
                sb.AppendLine($"            case \"{jsonPropertyName}\":");
            }
            
            // Add extraFields case explicitly for the base class property - use exact casing from base class
            sb.AppendLine("            case \"extraFields\":");
            
            sb.AppendLine("                return true;");
            sb.AppendLine("            default:");
            sb.AppendLine("                return false;");
            sb.AppendLine("        }");
            sb.AppendLine("    }");
        }

        // End class
        sb.AppendLine("}");

        return sb.ToString();
    }

    // Helper method to capitalize the first letter of a string
    private static string CapitalizeFirstLetter(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;
            
        return char.ToUpperInvariant(input[0]) + input.Substring(1);
    }

    private static string GetCSharpType(JObject schema)
    {
        var type = schema?["type"]?.ToString();
        
        if (type != null)
        {
            switch (type)
            {
                case "string":
                    return "string";
                case "number":
                    return "float";
                case "integer":
                    return "int";
                case "boolean":
                    return "bool";
                case "array":
                    // Handle array types
                    var items = schema["items"] as JObject;
                    if (items != null)
                    {
                        return $"List<{GetCSharpType(items)}>";
                    }
                    return "List<string>";
                case "object":
                    return "JObject";
                default:
                    return "string";
            }
        }
        
        // Handle anyOf/oneOf type fields - use string as a safe default
        return "string";
    }

    private static string GetDefaultValue(string typeName)
    {
        switch (typeName)
        {
            case "string":
                return "string.Empty";
            case "int":
                return "0";
            case "float":
                return "0f";
            case "bool":
                return "false";
            default:
                if (typeName.StartsWith("List<"))
                    return $"new {typeName}()";
                else if (typeName == "JObject")
                    return "new JObject()";
                else
                    return "null";
        }
    }

    // Existing instance method called by the button
    private void GenerateSchemas()
    {
        Debug.Log("Starting schema generation...");
        // Call the actual import function
        ImportAllSchemas();
        Debug.Log("Schema generation complete.");
        AssetDatabase.Refresh(); // Refresh assets after generation
    }
}
#endif // UNITY_EDITOR 
} // Close CraftSpace.Editor namespace 