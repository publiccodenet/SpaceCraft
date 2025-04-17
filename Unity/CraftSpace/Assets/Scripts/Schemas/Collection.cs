//------------------------------------------------------------------------------
// <file_path>Unity/CraftSpace/Assets/Scripts/Schemas/Collection.cs</file_path>
// <namespace>CraftSpace</namespace>
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
            if (_itemIds.Count == 0)
            {
                Debug.LogWarning($"[Collection:{Id}] No item IDs available.");
                yield break;
            }
            
            foreach (string itemId in _itemIds)
            {
                Item item = Brewster.Instance.GetItem(itemId);
                if (item != null)
                {
                    yield return item;
                }
                else 
                {
                    Debug.LogWarning($"[Collection:{Id}] Failed to retrieve Item with ID '{itemId}' from registry.");
                }
            }
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