//------------------------------------------------------------------------------
// <file_path>Unity/CraftSpace/Assets/Scripts/Schemas/SchemaConverter.cs</file_path>
// <namespace>CraftSpace</namespace>
// <assembly>Assembly-CSharp</assembly>
//
// IMPORTANT: This contains MANUAL JSON converters for schema serialization.
// It is NOT generated and should be maintained manually.
// These converters are used by the schema-generated classes.
//
// Full absolute path: /Users/a2deh/GroundUp/SpaceCraft/CraftSpace/Unity/CraftSpace/Assets/Scripts/Schemas/SchemaConverter.cs
//------------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

/// <summary>
/// IL2CPP-safe JSON converters that normalize data into consistent formats.
/// No runtime polymorphism - everything is converted to a fixed type at deserialization.
/// All converters handle both explicit null and missing fields the same way.
/// </summary>
public static class SchemaConverters
{
    /// <summary>
    /// Get all schema converters in a deterministic order
    /// </summary>
    public static IEnumerable<JsonConverter> All => new JsonConverter[]
    {
        new StringOrNullToStringConverter(),
        new StringOrArrayOrNullToStringConverter(),
        new ArrayOrNullToStringArrayConverter(),
    };
}

/// <summary>
/// Converts string or null/missing to string.
/// Null/missing -> empty string
/// </summary>
public class StringOrNullToStringConverter : JsonConverter
{
    public override bool CanConvert(Type objectType) => objectType == typeof(string);

    public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null || reader.TokenType == JsonToken.None)
            return "";

        var token = JToken.ReadFrom(reader);
        return token.ToString();
    }

    public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
    {
        writer.WriteValue(value?.ToString() ?? "");
    }
}

/// <summary>
/// Converts string, string[], or null/missing to string.
/// String[] -> newline-separated string
/// Null/missing -> empty string
/// </summary>
public class StringOrArrayOrNullToStringConverter : JsonConverter
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
/// Converts string[], string, or null/missing to string[].
/// String -> single-element array
/// Null/missing -> empty array
/// </summary>
public class ArrayOrNullToStringArrayConverter : JsonConverter
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