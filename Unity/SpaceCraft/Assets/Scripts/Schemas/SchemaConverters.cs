//------------------------------------------------------------------------------
// <file_path>Unity/SpaceCraft/Assets/Scripts/Schemas/SchemaConverter.cs</file_path>
// <namespace>SpaceCraft</namespace>
// <assembly>Assembly-CSharp</assembly>
//
// IMPORTANT: This contains MANUAL JSON converters for schema serialization.
// It is NOT generated and should be maintained manually.
// These converters are used by the schema-generated classes.
//
// Full absolute path: /Users/a2deh/GroundUp/SpaceCraft/SpaceCraft/Unity/SpaceCraft/Assets/Scripts/Schemas/SchemaConverter.cs
//------------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;

/// <summary>
/// IL2CPP-safe JSON converters that normalize data into consistent formats.
/// No runtime polymorphism - everything is converted to a fixed type at deserialization.
/// All converters handle both explicit null and missing fields the same way.
/// </summary>
public static class SchemaConverters
{
    // NOTE: We don't register converters globally with Json.NET
    // Instead, we use direct lookup by name in UnitySchemaConverter.cs
    // This ensures exact naming matches between JSON schema metadata and converter implementations
}

/// <summary>
/// Converts string or null/missing to string (default to empty string).
/// - string → unchanged
/// - null/undefined → empty string
/// </summary>
public class StringOrNullToStringConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(string);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        //Debug.Log($"StringOrNullToStringConverter: reader {reader} tokenType {reader.TokenType} objectType {objectType} existingValue {existingValue}");

        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
        {
            //Debug.Log($"StringOrNullToStringConverter: reader.TokenType is {reader.TokenType} so returning empty string");
            return "";
        }

        var token = JToken.ReadFrom(reader);
        //Debug.Log($"StringOrNullToStringConverter: token is {token} value {token.Value<string>()}");

        if (token.Type == JTokenType.String)
            return token.Value<string>() ?? "";

        //Debug.Log($"StringOrNullToStringConverter: fallback to token.ToString() {token.ToString()}");

        // Fallback for other token types
        return token.ToString();
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value?.ToString() ?? "");
    }
}

/// <summary>
/// Converts string, number, or null/missing to number (default to 0).
/// - number → unchanged
/// - string → parsed to number (0 if invalid)
/// - null/undefined → 0
/// </summary>
public class StringOrNumberOrNullToNumberConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(int) || objectType == typeof(float) || objectType == typeof(double);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return 0;

        var token = JToken.ReadFrom(reader);
        
        // For string representations, try to parse
        if (token.Type == JTokenType.String)
        {
            var str = token.ToString();
            if (objectType == typeof(int))
            {
                if (int.TryParse(str, out var result))
                    return result;
                return 0;
            }
            else if (objectType == typeof(float))
            {
                if (float.TryParse(str, out var result))
                    return result;
                return 0f;
            }
            else if (objectType == typeof(double))
            {
                if (double.TryParse(str, out var result))
                    return result;
                return 0.0;
            }
        }
        
        // For non-string (likely numeric already)
        try
        {
            if (objectType == typeof(int))
                return token.ToObject<int>();
            else if (objectType == typeof(float))
                return token.ToObject<float>();
            else if (objectType == typeof(double))
                return token.ToObject<double>();
        }
        catch
        {
            return 0; // Default to 0 on error
        }
        
        return 0; // Default fallback
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value ?? 0);
    }
}

/// <summary>
/// Converts string, number, or null/missing to integer (default to 0).
/// - number → converted to int
/// - string → parsed to int (0 if invalid)
/// - null/undefined → 0
/// </summary>
public class StringOrNumberOrNullToIntegerConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(int);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return 0;

        var token = JToken.ReadFrom(reader);
        
        // For string representations, try to parse
        if (token.Type == JTokenType.String)
        {
            var str = token.ToString();
            if (int.TryParse(str, out var result))
                return result;
            return 0;
        }
        
        // For non-string (likely numeric already)
        try
        {
            return token.ToObject<int>();
        }
        catch
        {
            return 0; // Default to 0 on error
        }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value ?? 0);
    }
}

/// <summary>
/// Converts string, number, or null/missing to float (default to 0).
/// - number → converted to float
/// - string → parsed to float (0 if invalid)
/// - null/undefined → 0
/// </summary>
public class StringOrNumberOrNullToFloatConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(float);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return 0f;

        var token = JToken.ReadFrom(reader);
        
        // For string representations, try to parse
        if (token.Type == JTokenType.String)
        {
            var str = token.ToString();
            if (float.TryParse(str, out var result))
                return result;
            return 0f;
        }
        
        // For non-string (likely numeric already)
        try
        {
            return token.ToObject<float>();
        }
        catch
        {
            return 0f; // Default to 0 on error
        }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value ?? 0f);
    }
}

/// <summary>
/// Converts string array, string, or null/missing to string.
/// - string[] → newline-joined string
/// - string → unchanged
/// - null/undefined → empty string
/// </summary>
public class StringArrayOrStringOrNullToStringConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(string);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return "";

        var token = JToken.ReadFrom(reader);

        switch (token.Type)
        {
            case JTokenType.String:
                return token.Value<string>() ?? "";

            case JTokenType.Array:
                var array = token.ToObject<string[]>();
                if (array == null || array.Length == 0)
                    return "";
                // Filter out null or empty strings before joining
                return string.Join("\n", array.Where(s => !string.IsNullOrEmpty(s)));

            default:
                // Fallback for other unexpected token types
                return token.ToString();
        }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value?.ToString() ?? "");
    }
}

/// <summary>
/// Converts string array, string, or null/missing to string array.
/// - string[] → filtered string[] (removes nulls and empty strings)
/// - string → single-element array [string]
/// - null/undefined → empty array []
/// </summary>
public class StringArrayOrStringOrNullToStringArrayConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(string[]);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return new string[0];

        var token = JToken.ReadFrom(reader);

        switch (token.Type)
        {
            case JTokenType.Array:
                var array = token.ToObject<string[]>();
                if (array == null)
                    return new string[0];
                // Filter out null or empty strings
                return array.Where(s => !string.IsNullOrEmpty(s)).ToArray();

            case JTokenType.String:
                var str = token.Value<string>();
                // If the string itself is null or empty, return empty array
                return string.IsNullOrEmpty(str) ? new string[0] : new[] { str };

            default:
                // Fallback for other unexpected token types, return as single element array
                var fallbackStr = token.ToString();
                return string.IsNullOrEmpty(fallbackStr) ? new string[0] : new[] { fallbackStr };
        }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteStartArray();
        if (value is string[] array && array.Length > 0)
        {
            // Filter out null or empty strings before writing
            foreach (var item in array.Where(s => !string.IsNullOrEmpty(s)))
            {
                writer.WriteValue(item);
            }
        }
        writer.WriteEndArray();
    }
}

/// <summary>
/// Converts string with semicolons, string array, or null/missing to string array.
/// - string[] → filtered string[] (removes nulls and empty strings)
/// - string → split by semicolons, trimmed, and filtered
/// - null/undefined → empty array []
/// </summary>
public class SemicolonSplitStringOrStringArrayOrNullToStringArrayConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(string[]);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return new string[0];

        var token = JToken.ReadFrom(reader);

        switch (token.Type)
        {
            case JTokenType.Array:
                var array = token.ToObject<string[]>();
                if (array == null)
                    return new string[0];
                // Filter out null or empty strings
                return array.Where(s => !string.IsNullOrEmpty(s)).ToArray();

            case JTokenType.String:
                var str = token.Value<string>();
                if (string.IsNullOrEmpty(str))
                    return new string[0];
                    
                // Split by semicolons, trim each element, and filter out empty strings
                return str.Split(';')
                          .Select(s => s.Trim())
                          .Where(s => !string.IsNullOrEmpty(s))
                          .ToArray();

            default:
                // Fallback for other unexpected token types
                var fallbackStr = token.ToString();
                if (string.IsNullOrEmpty(fallbackStr))
                    return new string[0];
                    
                // Split by semicolons, trim each element, and filter out empty strings
                return fallbackStr.Split(';')
                                 .Select(s => s.Trim())
                                 .Where(s => !string.IsNullOrEmpty(s))
                                 .ToArray();
        }
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteStartArray();
        if (value is string[] array && array.Length > 0)
        {
            // Filter out null or empty strings before writing
            foreach (var item in array.Where(s => !string.IsNullOrEmpty(s)))
            {
                writer.WriteValue(item);
            }
        }
        writer.WriteEndArray();
    }
}