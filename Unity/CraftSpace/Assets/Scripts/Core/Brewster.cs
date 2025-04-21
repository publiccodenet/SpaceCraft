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
    public void LoadContentFromJson(JObject contentJson)
    {
        if (contentJson == null)
        {
            Debug.LogError("Brewster: Received null contentJson");
            return;
        }
            
        Debug.Log("Brewster: Starting to load content from JSON");
        //Debug.Log($"Brewster: Content JSON structure: {contentJson}");
            
        // Clear existing content first
        ClearContent();
        
        try
        {
            // Debug the structure of the incoming JSON
            foreach (var prop in contentJson.Properties())
            {
                Debug.Log($"Brewster: Found top-level property '{prop.Name}' of type {prop.Value.Type}");
            }
            
            // Process collections
            JToken collectionsToken = contentJson["collections"];
            if (collectionsToken != null && collectionsToken is JObject collectionsObj)
            {
                Debug.Log($"Brewster: Found collections object with {collectionsObj.Count} properties");
                
                foreach (var collectionProp in collectionsObj.Properties())
                {
                    string collectionId = collectionProp.Name;
                    JObject collectionData = collectionProp.Value as JObject;
                    
                    Debug.Log($"Brewster: Processing collection '{collectionId}'");
                    //Debug.Log($"Brewster: Collection data for '{collectionId}': {collectionData}");
                    
                    if (collectionData != null)
                    {
                        Collection collection = ScriptableObject.CreateInstance<Collection>();
                        
                        // Log before import
                        Debug.Log($"Brewster: Importing collection '{collectionId}' with {collectionData.Count} properties");
                        
                        // Get the nested collection metadata object
                        JObject metadataObj = collectionData["collection"] as JObject;
                        if (metadataObj != null)
                        {
                            // Import from the nested collection object
                            collection.ImportFromJToken(metadataObj);
                            
                            // Check for itemsIndex in the collection
                            JArray itemsIndexArray = collectionData["itemsIndex"] as JArray;
                            if (itemsIndexArray != null)
                            {
                                Debug.Log($"Brewster: Collection '{collectionId}' has itemsIndex property of type {itemsIndexArray.Type}");
                                
                                try
                                {
                                    var itemIds = itemsIndexArray.Values<string>().ToList();
                                    Debug.Log($"Brewster: Found {itemIds.Count} item IDs in collection '{collectionId}' itemsIndex: {string.Join(", ", itemIds)}");
                                    
                                    // Set the item IDs on the collection
                                    collection.ItemIds = itemIds;
                                }
                                catch (Exception ex)
                                {
                                    Debug.LogError($"Brewster: Error extracting item IDs from itemsIndex for collection '{collectionId}': {ex.Message}");
                                }
                            }
                            else
                            {
                                Debug.LogWarning($"Brewster: Collection '{collectionId}' has no itemsIndex property");
                            }
                            
                            if (!string.IsNullOrEmpty(collection.Id))
                            {
                                _collections[collectionId] = collection;
                                Debug.Log($"Brewster: Successfully added collection '{collectionId}' with ID '{collection.Id}'");
                            }
                            else
                            {
                                Debug.LogError($"Brewster: Collection with ID {collectionId} has no ID property. collection: {collection}");
                                ScriptableObject.Destroy(collection);
                            }
                        }
                        else
                        {
                            Debug.LogError($"Brewster: Collection '{collectionId}' has no nested 'collection' metadata object");
                            ScriptableObject.Destroy(collection);
                        }
                    }
                }
            }
            else
            {
                Debug.LogWarning("Brewster: No 'collections' object found in content JSON or it's not an object");
                Debug.Log($"Brewster: collections token: {collectionsToken}");
            }
            
            // Process items
            JToken itemsToken = contentJson["items"];
            if (itemsToken != null && itemsToken is JObject itemsObj)
            {
                Debug.Log($"Brewster: Found items object with {itemsObj.Count} properties");
                Debug.Log($"Brewster: Items object: {itemsObj}");
                
                foreach (var itemProp in itemsObj.Properties())
                {
                    string itemId = itemProp.Name;
                    JObject itemData = itemProp.Value as JObject;
                    
                    Debug.Log($"Brewster: Processing item '{itemId}'");
                    
                    if (itemData != null)
                    {
                        Item item = ScriptableObject.CreateInstance<Item>();
                        
                        // Log before import
                        Debug.Log($"Brewster: Importing item '{itemId}' with {itemData.Count} properties");
                        
                        item.ImportFromJToken(itemData);
                        
                        if (!string.IsNullOrEmpty(item.Id))
                        {
                            _items[itemId] = item;
                            Debug.Log($"Brewster: Successfully added item '{itemId}' with ID '{item.Id}'");
                        }
                        else
                        {
                            Debug.LogError($"Brewster: Item with ID {itemId} has no ID property");
                            ScriptableObject.Destroy(item);
                        }
                    }
                }
            }
            else
            {
                Debug.LogWarning("Brewster: No 'items' object found in content JSON or it's not an object");
                Debug.Log($"Brewster: items token: {itemsToken}");
            }
            
            // Log collection item assignments
            foreach (var collection in _collections.Values)
            {
                Debug.Log($"Brewster: Collection '{collection.Id}' has {(collection.ItemIds?.Count ?? 0)} items: {(collection.ItemIds != null ? string.Join(", ", collection.ItemIds) : "none")}");
            }
            
            // Notify that content is loaded
            Debug.Log($"Brewster: Content loading complete. Loaded {_collections.Count} collections and {_items.Count} items from provided JSON.");
            
            // Fire the event to notify all listeners
            OnAllContentLoaded?.Invoke();
        }
        catch (Exception ex)
        {
            Debug.LogError($"Brewster: Error loading content from JSON: {ex.Message}");
            Debug.LogException(ex);
        }
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
