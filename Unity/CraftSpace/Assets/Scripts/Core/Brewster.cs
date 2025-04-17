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
    public bool loadOnStart = true;
    
    // Collections and items - final loaded objects
    private Dictionary<string, Collection> _collections = new Dictionary<string, Collection>();
    private Dictionary<string, Item> _items = new Dictionary<string, Item>();
    
    // Tracking for collection loading phases
    private List<string> _collectionIdsPending = new List<string>();
    private HashSet<string> _collectionIdsLoading = new HashSet<string>();
    
    // Tracking for item loading phases
    private HashSet<string> _itemIdsPending = new HashSet<string>();
    private HashSet<string> _itemIdsLoading = new HashSet<string>();
    
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

        if (loadOnStart)
            StartCoroutine(LoadContentSequence());
    }
    
    /*override*/ public void OnDestroy()
    {
        _collections.Clear();
        _items.Clear();
        _collectionIdsPending.Clear();
        _collectionIdsLoading.Clear();
        _itemIdsPending.Clear();
        _itemIdsLoading.Clear();
        
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
    /// Main sequence that loads all content in the correct order
    /// </summary>
    private IEnumerator LoadContentSequence()
    {
        Debug.Log("Brewster: Starting content loading sequence");
        
        _collections.Clear();
        _items.Clear();
        _collectionIdsPending.Clear();
        _collectionIdsLoading.Clear();
        _itemIdsPending.Clear();
        _itemIdsLoading.Clear();
        
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
        
        // PHASE 1: Load collection index
        Debug.Log("Brewster: PHASE 1 - Loading collection index");
        yield return LoadCollectionIndex();
        
        if (_collectionIdsPending.Count == 0)
        {
            Debug.LogError("Brewster: Failed to load collection index");
            yield break;
        }
        
        // PHASE 2: Load ALL collections
        Debug.Log("Brewster: PHASE 2 - Loading all collections");
        yield return LoadAllCollections();
        
        // PHASE 3: Load ALL item indexes
        Debug.Log("Brewster: PHASE 3 - Loading all item indexes");
        yield return LoadAllItemIndexes();
        
        // PHASE 4: Load ALL items
        Debug.Log("Brewster: PHASE 4 - Loading all items");
        yield return LoadAllItems();
        
        // COMPLETE: All content is loaded
        Debug.Log($"Brewster: Content loading complete. Loaded {_collections.Count} collections and {_items.Count} items.");
        
        // Notify listeners that all content is loaded
        OnAllContentLoaded?.Invoke();
    }
    
    /// <summary>
    /// Phase 1: Load collection index
    /// </summary>
    private IEnumerator LoadCollectionIndex()
    {
        string indexPath = Path.Combine(Application.streamingAssetsPath, baseResourcePath, "collections-index.json");
        
        JToken indexToken = null;
        yield return LoadJson(indexPath, token => indexToken = token);
        
        if (indexToken != null)
            ProcessCollectionIndex(indexToken);
    }
    
    /// <summary>
    /// Phase 2: Load all collections
    /// </summary>
    private IEnumerator LoadAllCollections()
    {
        List<Coroutine> loadingRoutines = new List<Coroutine>();
        
        foreach (string collectionId in _collectionIdsPending)
        {
            loadingRoutines.Add(StartCoroutine(LoadCollection(collectionId)));
        }
        
        // Wait for all collections to finish loading
        foreach (var routine in loadingRoutines)
        {
            yield return routine;
        }
    }
    
    /// <summary>
    /// Load a single collection
    /// </summary>
    private IEnumerator LoadCollection(string collectionId)
    {
        // Skip if already loaded
        if (_collections.ContainsKey(collectionId))
            yield break;
        
        // Skip if already being loaded by another coroutine
        if (_collectionIdsLoading.Contains(collectionId))
            yield break;
        
        // Mark collection as being loaded
        _collectionIdsLoading.Add(collectionId);
        
        try
        {
            string collectionPath = Path.Combine(Application.streamingAssetsPath, baseResourcePath, "collections", collectionId, "collection.json");
            
            JToken collectionToken = null;
            yield return LoadJson(collectionPath, token => collectionToken = token);
            
            if (collectionToken == null || !(collectionToken is JObject collectionObj)) 
                yield break;
            
            // Create and initialize collection directly
            Collection collection = ScriptableObject.CreateInstance<Collection>();
            collection.ImportFromJToken(collectionObj);
            
            if (string.IsNullOrEmpty(collection.Id))
            {
                Debug.LogError($"Brewster: Collection loaded from {collectionPath} has no ID");
                ScriptableObject.Destroy(collection);
                yield break;
            }
            
            _collections[collectionId] = collection;
        }
        finally
        {
            // Remove from loading set regardless of success or failure
            _collectionIdsLoading.Remove(collectionId);
        }
    }
    
    /// <summary>
    /// Phase 3: Load all item indexes
    /// </summary>
    private IEnumerator LoadAllItemIndexes()
    {
        List<Coroutine> loadingRoutines = new List<Coroutine>();
        
        foreach (string collectionId in _collections.Keys)
        {
            loadingRoutines.Add(StartCoroutine(LoadItemIndex(collectionId)));
        }
        
        // Wait for all item indexes to finish loading
        foreach (var routine in loadingRoutines)
        {
            yield return routine;
        }
    }
    
    /// <summary>
    /// Load item index for a single collection
    /// </summary>
    private IEnumerator LoadItemIndex(string collectionId)
    {
        // Add log at the very start
        // Debug.Log($"Brewster: Entering LoadItemIndex for collection ID: {collectionId}"); // REMOVED

        // Check if collection exists (should always exist at this phase)
        if (!_collections.TryGetValue(collectionId, out Collection collection))
        {
            Debug.LogError($"Brewster: Collection '{collectionId}' not found in collections dictionary");
            yield break;
        }
        
        string itemsIndexPath = Path.Combine(Application.streamingAssetsPath, baseResourcePath, "collections", collectionId, "items-index.json");
        
        // Log the path we are attempting to load
        // Debug.Log($"Brewster: Attempting to load item index for collection '{collectionId}' from: {itemsIndexPath}"); // REMOVED
        
        JToken itemsIndexToken = null;
        yield return LoadJson(itemsIndexPath, token => itemsIndexToken = token);
        
        if (itemsIndexToken == null || itemsIndexToken.Type != JTokenType.Array) 
            yield break;
        
        // Process items index - extract string IDs from the array
        List<string> itemIds = new List<string>();
        
        foreach (var idToken in itemsIndexToken)
        {
            if (idToken.Type == JTokenType.String)
            {
                string id = (string)idToken;
                if (!string.IsNullOrEmpty(id))
                {
                    itemIds.Add(id);
                    // Add to pending items set - only load each unique item once
                    _itemIdsPending.Add(id);
                }
            }
        }
        
        // Log the count of item IDs parsed from the index
        // Debug.Log($"Brewster: Parsed {itemIds.Count} item IDs from index for collection '{collectionId}'."); // REMOVED

        // Set the item IDs on the collection - this is our source of truth
        // about which items belong to which collection
        collection.ItemIds = itemIds;
    }
    
    /// <summary>
    /// Phase 4: Load all items
    /// </summary>
    private IEnumerator LoadAllItems()
    {
        if (_itemIdsPending.Count == 0) yield break;
        
        // Load items collection-by-collection to maintain proper context
        foreach (var collectionEntry in _collections)
        {
            string collectionId = collectionEntry.Key;
            Collection collection = collectionEntry.Value;
            
            // Get the item IDs for this collection.
            // Expect ItemIds to be a List<string> as set by LoadItemIndex.
            // Explicitly create a new List<string> to resolve potential type mismatch (CS0266)
            List<string> collectionItemIds = new List<string>(collection.ItemIds ?? Enumerable.Empty<string>());

            // Bold check: If ItemIds is null (which shouldn't happen after LoadItemIndex),
            // log it and skip this collection. Don't guess or create an empty list.
            if (collectionItemIds == null)
            {
                Debug.LogWarning($"Brewster: Collection '{collectionId}' has null ItemIds. Skipping item loading for this collection.");
                continue;
            }

            if (collectionItemIds.Count == 0)
                continue; // Skip if no items anyway
                
            // Filter to only pending items that haven't been loaded yet
            List<string> itemsToLoad = collectionItemIds
                .Where(id => _itemIdsPending.Contains(id))
                .ToList();
                
            // Process in batches
            int batchSize = 10;
            int itemsRemaining = itemsToLoad.Count;
            int batchIndex = 0;
            
            while (itemsRemaining > 0)
            {
                List<Coroutine> batchRoutines = new List<Coroutine>();
                int itemsInBatch = Math.Min(batchSize, itemsRemaining);
                
                for (int i = 0; i < itemsInBatch; i++)
                {
                    string itemId = itemsToLoad[batchIndex + i];
                    
                    // Remove from pending as we process it
                    _itemIdsPending.Remove(itemId);
                    
                    // Load the item with proper collection context
                    batchRoutines.Add(StartCoroutine(LoadItem(collectionId, itemId)));
                }
                
                // Wait for the batch to complete
                foreach (var routine in batchRoutines)
                {
                    yield return routine;
                }
                
                // Update counters
                batchIndex += itemsInBatch;
                itemsRemaining -= itemsInBatch;
                
                // Small delay between batches to avoid hiccups
                yield return new WaitForEndOfFrame();
            }
        }
    }
    
    /// <summary>
    /// Load a single item
    /// </summary>
    private IEnumerator LoadItem(string collectionId, string itemId)
    {
        // Skip if already loaded
        if (_items.ContainsKey(itemId))
            yield break;
        
        // Skip if already being loaded by another coroutine
        if (_itemIdsLoading.Contains(itemId))
            yield break;
        
        // Mark item as being loaded
        _itemIdsLoading.Add(itemId);
        
        try
        {
            string itemPath = Path.Combine(Application.streamingAssetsPath, baseResourcePath, "collections", collectionId, "items", itemId, "item.json");
            
            JToken itemToken = null;
            yield return LoadJson(itemPath, token => itemToken = token);
            
            if (itemToken == null || !(itemToken is JObject itemObj))
                yield break;
            
            // Create and initialize item directly
            Item item = ScriptableObject.CreateInstance<Item>();
            item.ImportFromJToken(itemObj);
            
            if (string.IsNullOrEmpty(item.Id))
            {
                Debug.LogError($"Brewster: Item loaded from {itemPath} has no ID");
                ScriptableObject.Destroy(item);
                yield break;
            }
            
            // Store the item in our registry
            _items[itemId] = item;
        }
        finally
        {
            // Remove from loading set regardless of success or failure
            _itemIdsLoading.Remove(itemId);
        }
    }
    
    /// <summary>
    /// Loads JSON from any URI
    /// </summary>
    private IEnumerator LoadJson(string uri, Action<JToken> callback)
    {
        // Convert file path to correct format for local files
        string fullUri = uri.StartsWith("http") ? uri : "file://" + uri;
        
        using (UnityWebRequest www = UnityWebRequest.Get(fullUri))
        {
            yield return www.SendWebRequest();
            
            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"Failed to load JSON from {uri}, Error: {www.error}");
                callback?.Invoke(null);
                yield break;
            }
            
            // Parse JSON exactly once at the boundary
            string jsonContent = www.downloadHandler.text;
            if (string.IsNullOrEmpty(jsonContent))
            {
                callback?.Invoke(null);
                yield break;
            }
            
            try
            {
                JToken token = JToken.Parse(jsonContent);
                callback?.Invoke(token);
            }
            catch (Exception e)
            {
                // Log the URI and the specific error message
                Debug.LogError($"Error parsing JSON from {uri}: {e.GetType().Name} - {e.Message}");
                // Log the raw content that failed to parse (limit length)
                string snippet = jsonContent.Length > 500 ? jsonContent.Substring(0, 500) + "..." : jsonContent;
                Debug.LogError($"JSON content snippet:\n{snippet}"); 
                callback?.Invoke(null);
            }
        }
    }
    
    /// <summary>
    /// Process collection index token
    /// </summary>
    private void ProcessCollectionIndex(JToken token)
    {
        if (token == null || token.Type != JTokenType.Array) return;
        
        foreach (JToken idToken in token)
        {
            string id = (idToken.Type == JTokenType.String) ? (string)idToken : null;
            
            if (!string.IsNullOrEmpty(id) && !_collectionIdsPending.Contains(id))
                _collectionIdsPending.Add(id);
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
