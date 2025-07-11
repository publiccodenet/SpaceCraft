//------------------------------------------------------------------------------
// <file_path>Unity/SpaceCraft/Assets/Scripts/Schemas/Collection.cs</file_path>
// <namespace>SpaceCraft</namespace>
// <assembly>Assembly-CSharp</assembly>
//
// IMPORTANT: This is a MANUAL EXTENSION of a generated schema class.
// DO NOT DELETE this file - it extends the generated CollectionSchema.cs.
//
// WARNING: KEEP THIS CLASS THIN AND SIMPLE!
// DO NOT PUT FUNCTIONALITY HERE THAT SHOULD GO IN THE SHARED BASE CLASS SchemaGeneratedObject.
// This class MUST agree with BOTH the SchemaGeneratedObject base class AND the generated CollectionSchema.cs.
//
// ALWAYS verify against schema generator when encountering errors.
// Fix errors in the schema generator FIRST before modifying this file or any generated code.
// Generated files may be out of date, and the best fix is regenerating them with updated generator.
//------------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.IO; // Required for Path.Combine
using System.Collections;

[Serializable]
public class Collection : CollectionSchema
{    
    // Private backing field
    [SerializeField] private List<string> _itemIds = new List<string>();
    
    /// <summary>
    /// List of item IDs that belong to this collection
    /// </summary>
    public IList<string> ItemIds
    {
        get { return _itemIds; }
        set { _itemIds = new List<string>(value); }
    }
    
    /// <summary>
    /// Gets the items associated with this collection.
    /// Performs on-demand loading via the Brewster registry.
    /// </summary>
    public IEnumerable<Item> Items 
    { 
        get 
        { 
            if (_itemIds == null)
            {
                Debug.LogWarning($"[Collection:{Id ?? "UNKNOWN"}] ItemIds list is null - no items available.");
                yield break;
            }

            if (_itemIds.Count == 0)
            {
                Debug.LogWarning($"[Collection:{Id ?? "UNKNOWN"}] No item IDs available.");
                yield break;
            }
            
            if (Brewster.Instance == null)
            {
                Debug.LogError($"[Collection:{Id ?? "UNKNOWN"}] Brewster instance is null - cannot retrieve items.");
                yield break;
            }
            
            int foundCount = 0;
            int missingCount = 0;
            int totalCount = _itemIds.Count;
            
            foreach (string itemId in _itemIds)
            {
                if (string.IsNullOrEmpty(itemId))
                {
                    Debug.LogWarning($"[Collection:{Id ?? "UNKNOWN"}] Found null/empty item ID in collection.");
                    missingCount++;
                    continue;
                }

                Item item = null;
                try
                {
                    item = Brewster.Instance.GetItem(itemId);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[Collection:{Id ?? "UNKNOWN"}] Exception retrieving item '{itemId}': {ex.Message}");
                    missingCount++;
                    continue;
                }

                if (item != null)
                {
                    foundCount++;
                    yield return item;
                }
                else
                {
                    missingCount++;
                    Debug.LogWarning($"[Collection:{Id ?? "UNKNOWN"}] Failed to retrieve Item with ID '{itemId}' from registry.");
                }
            }
            
            // Only log summary if we had missing items or for debugging
            if (missingCount > 0 || Debug.isDebugBuild)
            {
                Debug.Log($"[Collection:{Id ?? "UNKNOWN"}] Items summary - Found: {foundCount}, Missing: {missingCount}, Total: {totalCount}");
            }
        }
    }

    /// <summary>
    /// Safely gets the count of available items (excludes missing items)
    /// </summary>
    public int AvailableItemCount
    {
        get
        {
            try
            {
                return Items?.Count() ?? 0;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Collection:{Id ?? "UNKNOWN"}] Error counting available items: {ex.Message}");
                return 0;
            }
        }
    }

    /// <summary>
    /// Gets the total count of item IDs (includes missing items)
    /// </summary>
    public int TotalItemIdCount
    {
        get
        {
            return _itemIds?.Count ?? 0;
        }
    }

    /// <summary>
    /// Safely checks if this collection has any valid items
    /// </summary>
    public bool HasItems
    {
        get
        {
            try
            {
                return Items?.Any() == true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Collection:{Id ?? "UNKNOWN"}] Error checking if collection has items: {ex.Message}");
                return false;
            }
        }
    }

    /// <summary>
    /// Gets a specific item by ID if it exists in this collection
    /// </summary>
    public Item GetItem(string itemId)
    {
        if (string.IsNullOrEmpty(itemId))
        {
            Debug.LogWarning($"[Collection:{Id ?? "UNKNOWN"}] Cannot get item with null/empty ID");
            return null;
        }

        if (_itemIds == null || !_itemIds.Contains(itemId))
        {
            Debug.LogWarning($"[Collection:{Id ?? "UNKNOWN"}] Item '{itemId}' is not in this collection's item list");
            return null;
        }

        if (Brewster.Instance == null)
        {
            Debug.LogError($"[Collection:{Id ?? "UNKNOWN"}] Brewster instance is null - cannot retrieve item '{itemId}'");
            return null;
        }

        try
        {
            return Brewster.Instance.GetItem(itemId);
        }
        catch (Exception ex)
        {
            Debug.LogError($"[Collection:{Id ?? "UNKNOWN"}] Exception getting item '{itemId}': {ex.Message}");
            return null;
        }
    }

    // Notify all registered views that the model has changed
    public void NotifyViewsOfUpdate()
    {
        NotifyViewsOfType<IModelView<Collection>>(view => view.HandleModelUpdated());
    }
    
    /// <summary>
    /// Gets a specific item by ID using the lazy-loading Items property.
    /// </summary>
    public Item GetItemById(string itemId)
    {
        if (string.IsNullOrEmpty(itemId))
            return null;
        
        // Use Linq on the Items property (which uses the registry)
        return this.Items.FirstOrDefault(item => item.Id == itemId);
    }
} 