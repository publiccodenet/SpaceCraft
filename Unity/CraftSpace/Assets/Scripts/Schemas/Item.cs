//------------------------------------------------------------------------------
// <file_path>Unity/CraftSpace/Assets/Scripts/Schemas/Item.cs</file_path>
// <namespace>CraftSpace</namespace>
// <assembly>Assembly-CSharp</assembly>
//
// IMPORTANT: This is a MANUAL EXTENSION of a generated schema class.
// DO NOT DELETE this file - it extends the generated ItemSchema.cs.
//
// WARNING: KEEP THIS CLASS THIN AND SIMPLE!
// DO NOT PUT FUNCTIONALITY HERE THAT SHOULD GO IN THE SHARED BASE CLASS SchemaGeneratedObject.
// This class MUST agree with BOTH the SchemaGeneratedObject base class AND the generated ItemSchema.cs.
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
using System.Collections;

[Serializable]
public class Item : ItemSchema
{
    // Runtime-only state (not serialized)
    [NonSerialized] public Texture2D cover;
    
    public override void RegisterView(object view)
    {
        base.RegisterView(view);
        
        // If this is the first view, we might need to ensure the cover is loaded
        if (view is IItemView && cover == null)
        {
            // Cover loading would happen here (if it was automatically loading)
        }
    }
    
    public override void UnregisterView(object view)
    {
        base.UnregisterView(view);
        
        // Count how many IItemView views are left
        int itemViewCount = GetViewsOfType<IItemView>().Count();
        
        // If this was the last view, cleanup the texture to avoid memory leaks
        if (itemViewCount == 0 && cover != null)
        {
            Debug.Log($"[Item/MEMORY] No more views registered for {Title}, destroying cover texture");
            UnityEngine.Object.Destroy(cover);
            cover = null;
        }
    }
    
    public void NotifyViewsOfUpdate()
    {
        NotifyViewsOfType<IModelView<Item>>(view => view.HandleModelUpdated());
    }
    
    // Add an explicit cleanup method for when items are unloaded
    public void Cleanup()
    {
        Debug.Log($"[Item/MEMORY] Cleaning up item {Id} - {Title}");
        
        // Clean up texture
        if (cover != null)
        {
            Debug.Log($"[Item/MEMORY] Destroying cover texture for {Id}");
            UnityEngine.Object.Destroy(cover);
            cover = null;
        }
    }
} 