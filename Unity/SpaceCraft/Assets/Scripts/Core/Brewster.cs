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
            Debug.LogError("Brewster: Received null content JSON - cannot load data");
            return;
        }

        try
        {
            Debug.Log("Brewster: Starting to load content from JSON");
            
            // Clear existing content first
            ClearContent();
            
            JToken collectionsToken = content["collections"];
            if (collectionsToken == null)
            {
                Debug.LogError("Brewster: No 'collections' property found in content JSON");
                return;
            }

            JObject collectionsDir = collectionsToken as JObject;
            if (collectionsDir == null)
            {
                Debug.LogError($"Brewster: 'collections' property is not a valid object. Type: {collectionsToken?.Type}");
                return;
            }

            if (collectionsDir.Count == 0)
            {
                Debug.LogWarning("Brewster: Collections directory is empty - no content to load");
                OnAllContentLoaded?.Invoke();
                return;
            }

            Debug.Log($"Brewster: Found collections directory with {collectionsDir.Count} collections");
            
            foreach (var collectionProp in collectionsDir.Properties())
            {
                if (collectionProp?.Name == null)
                {
                    Debug.LogWarning("Brewster: Skipping collection with null name");
                    continue;
                }

                string collectionId = collectionProp.Name;
                
                try
                {
                    ProcessCollection(collectionId, collectionProp.Value as JObject);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Brewster: Failed to process collection '{collectionId}': {ex.Message}\nStackTrace: {ex.StackTrace}");
                    // Continue processing other collections
                }
            }
            
            // --- Content Validation ---
            ValidateLoadedContent();
            // --- End Content Validation ---
            
            // Notify that content is loaded
            Debug.Log($"Brewster: Content loading complete. Loaded {_collections.Count} collections and {_items.Count} items from provided JSON.");

            // Fire the event to notify all listeners
            OnAllContentLoaded?.Invoke();
        }
        catch (Exception ex)
        {
            Debug.LogError($"Brewster: Fatal error during content loading: {ex.Message}\nStackTrace: {ex.StackTrace}");
            
            // Ensure we still fire the event even if loading failed
            OnAllContentLoaded?.Invoke();
        }
    }

    /// <summary>
    /// Process a single collection from JSON data
    /// </summary>
    private void ProcessCollection(string collectionId, JObject collectionDir)
    {
        if (string.IsNullOrEmpty(collectionId))
        {
            Debug.LogError("Brewster: Collection ID is null or empty");
            return;
        }

        if (collectionDir == null)
        {
            Debug.LogError($"Brewster: Collection directory for '{collectionId}' is null");
            return;
        }
        
        // Get the nested collection metadata object
        JObject collectionJson = collectionDir["collection"] as JObject;
        if (collectionJson == null)
        {
            Debug.LogError($"Brewster: Collection '{collectionId}' has no valid 'collection' metadata object");
            return;
        }

        // Create and import collection
        Collection collection = null;
        try
        {
            collection = ScriptableObject.CreateInstance<Collection>();
            collection.ImportFromJToken(collectionJson);
            
            // Ensure collection has an ID
            if (string.IsNullOrEmpty(collection.Id))
            {
                Debug.Log($"Brewster: Setting explicit ID for collection '{collectionId}' as it was not found in metadata");
                collection.Id = collectionId;
            }

            _collections[collectionId] = collection;
            Debug.Log($"Brewster: Successfully added collection '{collectionId}' with ID '{collection.Id}'");
        }
        catch (Exception ex)
        {
            Debug.LogError($"Brewster: Failed to create collection '{collectionId}': {ex.Message}");
            if (collection != null)
            {
                ScriptableObject.Destroy(collection);
            }
            return;
        }

        // Process items index
        ProcessCollectionItems(collectionId, collection, collectionDir);
    }

    /// <summary>
    /// Process items for a collection
    /// </summary>
    private void ProcessCollectionItems(string collectionId, Collection collection, JObject collectionDir)
    {
        if (collection == null || collectionDir == null)
        {
            Debug.LogError($"Brewster: Cannot process items for collection '{collectionId}' - null parameters");
            return;
        }

        // Check for itemsIndex in the collection
        JArray itemsIndex = collectionDir["itemsIndex"] as JArray;
        if (itemsIndex == null)
        {
            Debug.LogWarning($"Brewster: Collection '{collectionId}' has no itemsIndex - no items to load");
            return;
        }

        List<string> itemIds = new List<string>();
        try
        {
            foreach (var token in itemsIndex)
            {
                string itemId = token?.Value<string>();
                if (!string.IsNullOrEmpty(itemId))
                {
                    itemIds.Add(itemId);
                }
                else
                {
                    Debug.LogWarning($"Brewster: Collection '{collectionId}' contains null/empty item ID in itemsIndex");
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"Brewster: Failed to parse itemsIndex for collection '{collectionId}': {ex.Message}");
            return;
        }

        // Set the item IDs on the collection
        collection.ItemIds = itemIds;
        Debug.Log($"Brewster: Collection '{collectionId}' has {itemIds.Count} items in index");
        
        // Process items directory
        JObject itemsDir = collectionDir["items"] as JObject;
        if (itemsDir == null)
        {
            Debug.LogWarning($"Brewster: Collection '{collectionId}' has no items directory");
            return;
        }

        int successCount = 0;
        int failureCount = 0;

        foreach (var itemProp in itemsDir.Properties())
        {
            if (itemProp?.Name == null)
            {
                Debug.LogWarning($"Brewster: Collection '{collectionId}' contains item with null name");
                continue;
            }

            string itemId = itemProp.Name;
            
            try
            {
                if (ProcessSingleItem(itemId, itemProp.Value as JObject, collectionId))
                {
                    successCount++;
                }
                else
                {
                    failureCount++;
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"Brewster: Exception processing item '{itemId}' in collection '{collectionId}': {ex.Message}");
                failureCount++;
            }
        }

        Debug.Log($"Brewster: Collection '{collectionId}' processing complete. Success: {successCount}, Failed: {failureCount}");
    }

    /// <summary>
    /// Process a single item from JSON data
    /// </summary>
    private bool ProcessSingleItem(string itemId, JObject itemDir, string collectionId)
    {
        if (string.IsNullOrEmpty(itemId))
        {
            Debug.LogError("Brewster: Item ID is null or empty");
            return false;
        }

        if (itemDir == null)
        {
            Debug.LogError($"Brewster: Item directory for '{itemId}' is null");
            return false;
        }

        if (_items.ContainsKey(itemId))
        {
            Debug.LogWarning($"Brewster: Item '{itemId}' already exists in registry, skipping duplicate");
            return false;
        }

        // Check if the item has nested data
        JObject itemJson = itemDir["item"] as JObject;
        if (itemJson == null)
        {
            var availableKeys = itemDir.Properties().Select(p => p.Name).ToArray();
            Debug.LogError($"Brewster: Item '{itemId}' has no valid 'item' json object. Available keys: {string.Join(", ", availableKeys)}");
            return false;
        }

        Item item = null;
        try 
        {
            item = ScriptableObject.CreateInstance<Item>();
            item.ImportFromJToken(itemJson);
            
            // Validate critical fields
            ValidateItem(item, itemId, itemJson);
            
            // If no ID from JSON, use the key as ID
            if (string.IsNullOrEmpty(item.Id))
            {
                Debug.Log($"Brewster: Setting explicit ID for item '{itemId}' as it was not found in metadata");
                item.Id = itemId;
            }

            _items[itemId] = item;
            return true;
        }
        catch (Exception ex)
        {
            Debug.LogError($"Brewster: Failed to import item '{itemId}': {ex.Message}");
            if (item != null)
            {
                ScriptableObject.Destroy(item);
            }
            return false;
        }
    }

    /// <summary>
    /// Validate an imported item
    /// </summary>
    private void ValidateItem(Item item, string itemId, JObject itemJson)
    {
        if (item == null)
        {
            throw new ArgumentNullException(nameof(item), "Item cannot be null");
        }

        if (itemJson == null)
        {
            throw new ArgumentNullException(nameof(itemJson), "Item JSON cannot be null");
        }

        List<string> missingFields = new List<string>();
        List<string> warnings = new List<string>();

        // Critical fields
        if (string.IsNullOrEmpty(item.Id)) missingFields.Add("id");
        if (string.IsNullOrEmpty(item.Title)) missingFields.Add("title");

        // Important but not critical fields
        if (string.IsNullOrEmpty(item.Creator)) warnings.Add("creator");
        if (string.IsNullOrEmpty(item.Description)) warnings.Add("description");

        if (missingFields.Count > 0)
        {
            var availableKeys = itemJson.Properties().Select(p => p.Name).ToArray();
            Debug.LogWarning($"Brewster: Item '{itemId}' missing critical fields: {string.Join(", ", missingFields)}. Available JSON keys: {string.Join(", ", availableKeys)}");
        }

        if (warnings.Count > 0)
        {
            Debug.Log($"Brewster: Item '{itemId}' missing optional fields: {string.Join(", ", warnings)}");
        }

        Debug.Log($"Brewster: Successfully added item '{itemId}' with ID '{item.Id}' title '{item.Title ?? "NULL"}'");
    }

    /// <summary>
    /// Validate loaded content for consistency
    /// </summary>
    private void ValidateLoadedContent()
    {
        if (_collections == null || _items == null)
        {
            Debug.LogError("Brewster: Collections or items dictionary is null during validation");
            return;
        }

        try
        {
            foreach (var collectionKvp in _collections)
            {
                if (collectionKvp.Value == null)
                {
                    Debug.LogError($"Brewster: Collection '{collectionKvp.Key}' is null in registry");
                    continue;
                }

                string collectionId = collectionKvp.Key;
                Collection collection = collectionKvp.Value;
                
                if (collection.ItemIds == null)
                {
                    Debug.LogWarning($"Brewster: Collection '{collectionId}' has null ItemIds list");
                    continue;
                }

                var missingItems = new List<string>();
                var validItems = new List<string>();

                foreach (string itemId in collection.ItemIds)
                {
                    if (string.IsNullOrEmpty(itemId))
                    {
                        Debug.LogWarning($"Brewster: Collection '{collectionId}' contains null/empty item ID");
                        continue;
                    }

                    if (!_items.ContainsKey(itemId))
                    {
                        missingItems.Add(itemId);
                    }
                    else
                    {
                        validItems.Add(itemId);
                    }
                }
                
                if (missingItems.Count > 0)
                {
                    var displayItems = missingItems.Take(5).ToArray();
                    var moreText = missingItems.Count > 5 ? "..." : "";
                    Debug.LogWarning($"Brewster: Collection '{collectionId}' references {missingItems.Count} missing items: {string.Join(", ", displayItems)}{moreText}");
                }

                Debug.Log($"Brewster: Collection '{collectionId}' validation - Valid: {validItems.Count}, Missing: {missingItems.Count}, Total: {collection.ItemIds.Count()}");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"Brewster: Error during content validation: {ex.Message}");
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
