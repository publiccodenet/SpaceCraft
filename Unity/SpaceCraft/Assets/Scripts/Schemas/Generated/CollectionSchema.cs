//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by SpaceCraft Schema Generator.
//     Runtime Version: 1.0
//
//     ██████╗  ██████╗     ███╗   ██╗ ██████╗ ████████╗    ███████╗██████╗ ██╗████████╗
//     ██╔══██╗██╔═══██╗    ████╗  ██║██╔═══██╗╚══██╔══╝    ██╔════╝██╔══██╗██║╚══██╔══╝
//     ██║  ██║██║   ██║    ██╔██╗ ██║██║   ██║   ██║       █████╗  ██║  ██║██║   ██║   
//     ██║  ██║██║   ██║    ██║╚██╗██║██║   ██║   ██║       ██╔══╝  ██║  ██║██║   ██║   
//     ██████╔╝╚██████╔╝    ██║ ╚████║╚██████╔╝   ██║       ███████╗██████╔╝██║   ██║   
//     ╚═════╝  ╚═════╝     ╚═╝  ╚═══╝ ╚═════╝    ╚═╝       ╚══════╝╚═════╝ ╚═╝   ╚═╝   
//
//     CRITICAL WARNING: THIS FILE IS AUTO-GENERATED
//     DO NOT MODIFY THIS FILE DIRECTLY UNDER ANY CIRCUMSTANCES
//
//     Path: Unity/SpaceCraft/Assets/Scripts/Schemas/Generated/CollectionSchema.cs
//
//     If this file needs to be updated:
//     1. NEVER modify this generated file directly
//     2. ALWAYS modify the schema generator: Unity/SpaceCraft/Assets/Editor/SchemaGenerator/SchemaGenerator.cs
//     3. Update schema definitions in SvelteKit/BackSpace/src/lib/schemas/
//     4. Run  npm run schemas:export in SvelteKit/BackSpace directory
//     5. Regenerate using SpaceCraft > Schema Generator in Unity
//
//     Any changes made directly to this file WILL BE LOST when regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;

[System.Serializable]
public class CollectionSchema : SchemaGeneratedObject
{
    // WARNING: This is an auto-generated class. DO NOT MODIFY DIRECTLY.
    // If changes are needed, modify the schema generator instead.

    /// <summary>
    /// Unique identifier for the collection
    /// Schema Path: id
    /// UnitySchemaConverter: StringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _id = string.Empty;
    public override string Id { get { return _id; } set { _id = value; } }

    /// <summary>
    /// Primary display title for the collection
    /// Schema Path: title
    /// UnitySchemaConverter: StringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _title = string.Empty;
    public string Title { get { return _title; } set { _title = value; } }

    /// <summary>
    /// Optional description for the collection
    /// Schema Path: description
    /// UnitySchemaConverter: StringArrayOrStringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _description = string.Empty;
    public string Description { get { return _description; } set { _description = value; } }

    /// <summary>
    /// Creator(s) of this collection.
    /// Schema Path: creator
    /// UnitySchemaConverter: StringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _creator = string.Empty;
    public string Creator { get { return _creator; } set { _creator = value; } }

    /// <summary>
    /// Subject tags for this collection.
    /// Schema Path: subject
    /// UnitySchemaConverter: SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter
    /// </summary>
    [SerializeField] private string[] _subject = null;
    public string[] Subject { get { return _subject; } set { _subject = value; } }

    /// <summary>
    /// Type of media (always "collection" for collections).
    /// Schema Path: mediatype
    /// UnitySchemaConverter: StringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _mediatype = string.Empty;
    public string Mediatype { get { return _mediatype; } set { _mediatype = value; } }

    /// <summary>
    /// URL or path to the cover image.
    /// Schema Path: coverImage
    /// UnitySchemaConverter: StringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _coverImage = string.Empty;
    public string CoverImage { get { return _coverImage; } set { _coverImage = value; } }

    /// <summary>
    /// The query used to populate this collection (e.g., from an external API)
    /// Schema Path: query
    /// UnitySchemaConverter: StringOrNullToStringConverter
    /// </summary>
    [SerializeField] private string _query = string.Empty;
    public string Query { get { return _query; } set { _query = value; } }

    protected override void ImportKnownProperties(JObject json)
    {
        // Use converter: StringOrNullToStringConverter
        if (json["id"] != null)
        {
            try
            {
                var converter = new StringOrNullToStringConverter();
                var reader = json["id"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _id = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'id' with StringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: id is null" );
        }

        // Use converter: StringOrNullToStringConverter
        if (json["title"] != null)
        {
            try
            {
                var converter = new StringOrNullToStringConverter();
                var reader = json["title"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _title = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'title' with StringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: title is null" );
        }

        // Use converter: StringArrayOrStringOrNullToStringConverter
        if (json["description"] != null)
        {
            try
            {
                var converter = new StringArrayOrStringOrNullToStringConverter();
                var reader = json["description"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _description = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'description' with StringArrayOrStringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: description is null" );
        }

        // Use converter: StringOrNullToStringConverter
        if (json["creator"] != null)
        {
            try
            {
                var converter = new StringOrNullToStringConverter();
                var reader = json["creator"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _creator = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'creator' with StringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: creator is null" );
        }

        // Use converter: SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter
        if (json["subject"] != null)
        {
            try
            {
                var converter = new SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter();
                var reader = json["subject"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _subject = (string[])converter.ReadJson(reader, typeof(string[]), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'subject' with SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: subject is null" );
        }

        // Use converter: StringOrNullToStringConverter
        if (json["mediatype"] != null)
        {
            try
            {
                var converter = new StringOrNullToStringConverter();
                var reader = json["mediatype"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _mediatype = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'mediatype' with StringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: mediatype is null" );
        }

        // Use converter: StringOrNullToStringConverter
        if (json["coverImage"] != null)
        {
            try
            {
                var converter = new StringOrNullToStringConverter();
                var reader = json["coverImage"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _coverImage = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'coverImage' with StringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: coverImage is null" );
        }

        // Use converter: StringOrNullToStringConverter
        if (json["query"] != null)
        {
            try
            {
                var converter = new StringOrNullToStringConverter();
                var reader = json["query"].CreateReader();
                reader.Read(); // Move to the first token - important for WebGL compatibility
                _query = (string)converter.ReadJson(reader, typeof(string), null, null);
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'query' with StringOrNullToStringConverter: {ex.Message}"); }
        } else {
            Debug.Log($"ItemSchema: query is null" );
        }

    }

    protected override JObject ExportKnownProperties()
    {
        var json = new JObject();
        // Use converter: StringOrNullToStringConverter
        if (_id != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _id, null);
                json["id"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'id' with StringOrNullToStringConverter: {ex.Message}"); }
        }
        // Use converter: StringOrNullToStringConverter
        if (_title != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _title, null);
                json["title"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'title' with StringOrNullToStringConverter: {ex.Message}"); }
        }
        // Use converter: StringArrayOrStringOrNullToStringConverter
        if (_description != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringArrayOrStringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _description, null);
                json["description"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'description' with StringArrayOrStringOrNullToStringConverter: {ex.Message}"); }
        }
        // Use converter: StringOrNullToStringConverter
        if (_creator != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _creator, null);
                json["creator"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'creator' with StringOrNullToStringConverter: {ex.Message}"); }
        }
        // Use converter: SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter
        if (_subject != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter();
                converter.WriteJson(tempWriter, _subject, null);
                json["subject"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'subject' with SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter: {ex.Message}"); }
        }
        // Use converter: StringOrNullToStringConverter
        if (_mediatype != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _mediatype, null);
                json["mediatype"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'mediatype' with StringOrNullToStringConverter: {ex.Message}"); }
        }
        // Use converter: StringOrNullToStringConverter
        if (_coverImage != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _coverImage, null);
                json["coverImage"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'coverImage' with StringOrNullToStringConverter: {ex.Message}"); }
        }
        // Use converter: StringOrNullToStringConverter
        if (_query != null)
        {
            try
            {
                var tempWriter = new JTokenWriter();
                var converter = new StringOrNullToStringConverter();
                converter.WriteJson(tempWriter, _query, null);
                json["query"] = tempWriter.Token;
            }
            catch (Exception ex) { Debug.LogError($"Error converting 'query' with StringOrNullToStringConverter: {ex.Message}"); }
        }

        return json;
    }

    protected override bool HasDefinedProperty(string name)
    {
        switch (name)
        {
            case "id":
            case "title":
            case "description":
            case "creator":
            case "subject":
            case "mediatype":
            case "coverImage":
            case "query":
            case "extraFields":
                return true;
            default:
                return false;
        }
    }
}
