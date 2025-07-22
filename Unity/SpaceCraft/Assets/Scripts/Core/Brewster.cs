using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json.Linq;

/// <summary>
/// Central content registry that loads all collections and items.
/// </summary>
[DefaultExecutionOrder(-200)] 
public class Brewster : MonoBehaviour
{
    public static Brewster Instance { get; private set; }
    
    // Event fired when ALL content is loaded
    public event Action OnAllContentLoaded;

    [Header("Content Settings")]
    public string baseResourcePath = "Content";
    
    // Collections and items - final loaded objects
    private Dictionary<string, Collection> _collections = new Dictionary<string, Collection>();
    private Dictionary<string, Item> _items = new Dictionary<string, Item>();
    
    // Add a texture cache
    private Dictionary<string, Texture2D> _textureCache = new Dictionary<string, Texture2D>();
    private HashSet<string> _texturesLoading = new HashSet<string>();
    
    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
    
    /*override*/ public void OnDestroy()
    {
        _collections.Clear();
        _items.Clear();
        
        // Clean up textures
        foreach (var texture in _textureCache.Values)
        {
            if (texture != null)
            {
                Destroy(texture);
            }
        }
        _textureCache.Clear();
        _texturesLoading.Clear();

        //base.OnDestroy();
    }

    /// <summary>
    /// Clears all collections and items to prepare for new content
    /// </summary>
    public void ClearContent()
    {
        foreach (var collection in _collections.Values)
        {
            if (collection != null)
            {
                ScriptableObject.Destroy(collection);
            }
        }
        
        foreach (var item in _items.Values)
        {
            if (item != null)
            {
                ScriptableObject.Destroy(item);
            }
        }
        
        _collections.Clear();
        _items.Clear();
    }
    
    /// <summary>
    /// Loads collections and items from a JObject containing the full content data
    /// </summary>
    public void LoadContentFromJson(JObject content)
    {
        if (content == null)
        {
            Debug.LogError("Brewster: Received null content");
            return;
        }
            
        Debug.Log("Brewster: Starting to load content from JSON");
        //Debug.Log($"Brewster: Content JSON structure: {content}");
            
        // Clear existing content first
        ClearContent();
        
        JToken collectionsToken = content["collections"];
        if (collectionsToken == null)
        {
            Debug.LogError("Brewster: Collections token is null in content JSON");
            return;
        }

        JObject collectionsDir = collectionsToken as JObject;
        if (collectionsToken == null)
        {
            Debug.Log($"Brewster: Brewster: Invalid 'collections' object found in content JSON. collectionsToken: {collectionsToken}");
            return;
        }

        //Debug.Log($"Brewster: Found collections dir with {collectionsDir.Count} properties");
        
        foreach (var collectionProp in collectionsDir.Properties())
        {
            string collectionId = collectionProp.Name;
            //Debug.Log($"Brewster: Collection dir for '{collectionId}': {collectionDir}");
            
            JObject collectionDir = collectionProp.Value as JObject;
            if (collectionDir == null)
            {
                Debug.LogError($"Brewster: Collection dir '{collectionId}' is null");
                continue;
            }
            
            // Get the nested collection metadata object
            JObject collectionJson = collectionDir["collection"] as JObject;
            if (collectionJson == null)
            {
                Debug.LogError($"Brewster: Collection '{collectionId}' has no nested 'collection' json object");
                continue;
            }

            // Log before import
            //Debug.Log($"Brewster: Importing collection dir '{collectionId}' with {collectionDir.Count} properties");

            Collection collection = ScriptableObject.CreateInstance<Collection>();
            
            // Debug the JSON before import
            Debug.Log($"Brewster: About to import collection '{collectionId}' from JSON: {collectionJson}");
            
            // Import from the nested collection object
            collection.ImportFromJToken(collectionJson);
            
            // Debug the collection after import
            Debug.Log($"Brewster: After import - collection ID='{collection.Id}', Title='{collection.Title}'");
            
            // Collection should already have ID from ImportFromJToken,
            // but if not, use the collection ID from the JSON key
            if (string.IsNullOrEmpty(collection.Id))
            {
                Debug.Log($"Brewster: Setting explicit ID for collection '{collectionId}' as it was not found in metadata");
                collection.Id = collectionId;
            }

            _collections[collectionId] = collection;
            Debug.Log($"Brewster: Successfully added collection '{collectionId}' with ID '{collection.Id}'");

            // Check for itemsIndex in the collection
            JArray itemsIndex = collectionDir["itemsIndex"] as JArray;
            if (itemsIndex == null)
            {
                //Debug.LogWarning($"Brewster: Collection dir '{collectionId}' has no itemsIndex property");
                continue;
            }

            //Debug.Log($"Brewster: Collection dir '{collectionId}' has itemsIndex property of type {itemsIndex.Type}");
            
            var itemIds = itemsIndex.Values<string>().ToList();
            //Debug.Log($"Brewster: Found {itemIds.Count} item IDs in collection '{collectionId}' itemsIndex: {string.Join(", ", itemIds)}");

            // Set the item IDs on the collection
            collection.ItemIds = itemIds;
            
            JObject itemsDir = collectionDir["items"] as JObject;
            if (itemsDir == null)
            {
                Debug.LogError($"Brewster: Items dir of '{collectionId}' is missing");
                continue;
            }

            //Debug.Log($"Brewster: Processing items dir for collection '{collectionId}' with {itemsDir.Count} properties");

            foreach (var itemProp in itemsDir.Properties())
            {
                string itemId = itemProp.Name;
                //Debug.Log($"Brewster: Processing item '{itemId}'");

                if (_items.ContainsKey(itemId))
                {
                    Debug.LogError($"Brewster: Item '{itemId}' from collection '{collectionId}' already exists, ignoring");
                    continue;
                }

                JObject itemDir = itemProp.Value as JObject;
                if (itemDir == null)
                {
                    Debug.LogError($"Brewster: Item '{itemId}' from collection '{collectionId}' has no nested 'item' json object");
                    continue;
                }

                // Log before import
                //Debug.Log($"Brewster: Importing item '{itemId}' with {itemDir.Count} properties");
                
                // Check if the item has nested data
                JObject itemJson = itemDir["item"] as JObject;
                if (itemJson == null)
                {
                    Debug.LogError($"Brewster: Item '{itemId}' has no nested 'item' json object. Available keys: {string.Join(", ", itemDir.Properties().Select(p => p.Name))}");
                    continue;
                }

                //Debug.Log($"Brewster: Importing item '{itemId}' from itemJson {itemJson}");

                Item item = ScriptableObject.CreateInstance<Item>();
                
                try 
                {
                    item.ImportFromJToken(itemJson);
                    
                    // Validate critical fields and log what's missing
                    List<string> missingFields = new List<string>();
                    if (string.IsNullOrEmpty(item.Id)) missingFields.Add("id");
                    if (string.IsNullOrEmpty(item.Title)) missingFields.Add("title");
                    
                    if (missingFields.Count > 0)
                    {
                        Debug.LogWarning($"Brewster: Item '{itemId}' has missing/empty fields: {string.Join(", ", missingFields)}. Available JSON keys: {string.Join(", ", itemJson.Properties().Select(p => p.Name))}");
                    }
                    
                    // If no ID from JSON, use the key as ID
                    if (string.IsNullOrEmpty(item.Id))
                    {
                        Debug.Log($"Brewster: Setting explicit ID for item '{itemId}' as it was not found in metadata");
                        item.Id = itemId;
                    }

                    _items[itemId] = item;
                    Debug.Log($"Brewster: Successfully added item '{itemId}' with ID '{item.Id}' title '{item.Title ?? "NULL"}'");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Brewster: Failed to import item '{itemId}': {ex.Message}. ItemJson structure: {itemJson}");
                    continue;
                }
                
            }
    
        }
        
        // Notify that content is loaded
        Debug.Log($"Brewster: Content loading complete. Loaded {_collections.Count} collections and {_items.Count} items from provided JSON.");

        // Fire the event to notify all listeners
        OnAllContentLoaded?.Invoke();
    }

    /// <summary>
    /// Gets a collection by ID from cache.
    /// </summary>
    public Collection GetCollection(string collectionId)
    {
        if (string.IsNullOrEmpty(collectionId)) return null;
        
        _collections.TryGetValue(collectionId, out Collection collection);
        return collection;
    }

    /// <summary>
    /// Gets all collections from the cache.
    /// </summary>
    public Dictionary<string, Collection> GetAllCollections()
    {
        return new Dictionary<string, Collection>(_collections);
    }

    /// <summary>
    /// Gets an item by ID from cache.
    /// </summary>
    public Item GetItem(string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return null;
        
        _items.TryGetValue(itemId, out Item item);
        return item;
    }

    /// <summary>
    /// Gets a texture by path from cache.
    /// </summary>
    public Texture2D GetCachedTexture(string path)
    {
        if (string.IsNullOrEmpty(path)) return null;
        
        _textureCache.TryGetValue(path, out Texture2D texture);
        return texture;
    }
    
    /// <summary>
    /// Load a texture from any path
    /// </summary>
    public void LoadTexture(string path, Action<Texture2D> onLoaded)
    {
        // Path is now used as the cache key
        // If already cached, return immediately
        if (_textureCache.TryGetValue(path, out Texture2D cachedTexture))
        {
            onLoaded?.Invoke(cachedTexture);
            return;
        }
        
        // If already loading, skip
        if (_texturesLoading.Contains(path))
            return;
            
        // Mark as loading
        _texturesLoading.Add(path);
        
        // Start texture loading coroutine
        StartCoroutine(LoadTextureCoroutine(path, onLoaded));
    }
    
    /// <summary>
    /// Load an item's cover texture
    /// </summary>
    public void LoadItemCover(string itemId, Action<Texture2D> onLoaded)
    {
        if (string.IsNullOrEmpty(itemId)) 
        {
            onLoaded?.Invoke(null);
            return;
        }
        
        // Get the item
        Item item = GetItem(itemId);
        if (item == null)
        {
            onLoaded?.Invoke(null);
            return;
        }
        
        // Find a collection for this item
        string collectionId = null;
        foreach (var collection in _collections.Values)
        {
            if (collection.ItemIds.Contains(itemId))
            {
                collectionId = collection.Id;
                break;
            }
        }
        
        if (string.IsNullOrEmpty(collectionId))
        {
            Debug.LogWarning($"Brewster: Cannot load cover for item {itemId} - not found in any collection");
            onLoaded?.Invoke(null);
            return;
        }
        
        // Build the path to the cover image
        string coverPath = Path.Combine(Application.streamingAssetsPath, baseResourcePath, "collections", 
            collectionId, "items", itemId, "cover.jpg");
            
        // Load the texture using the path as the cache key
        LoadTexture(coverPath, texture => {
            // When loaded, set it on the item and invoke callback
            if (item != null && texture != null)
            {
                item.cover = texture;
                item.NotifyViewsOfUpdate();
            }
            onLoaded?.Invoke(texture);
        });
    }
    
    /// <summary>
    /// Coroutine to load a texture with UnityWebRequest
    /// </summary>
    private IEnumerator LoadTextureCoroutine(string path, Action<Texture2D> onLoaded)
    {
        // Convert file path to URI
        string uri = path.StartsWith("http") ? path : "file://" + path;
        
        using (UnityWebRequest www = UnityWebRequestTexture.GetTexture(uri))
        {
            yield return www.SendWebRequest();
            
            // Handle errors
            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"Failed to load texture from {path}: {www.error}");
                _texturesLoading.Remove(path);
                onLoaded?.Invoke(null);
                yield break;
            }
            
            // Get the texture
            Texture2D texture = DownloadHandlerTexture.GetContent(www);
            if (texture != null)
            {
                // Cache the texture using the path as key
                _textureCache[path] = texture;
            }
            
            // Mark as no longer loading
            _texturesLoading.Remove(path);
            
            // Invoke callback
            onLoaded?.Invoke(texture);
        }
    }
}
