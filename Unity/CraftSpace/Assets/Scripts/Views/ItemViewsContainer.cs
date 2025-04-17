using UnityEngine;
using System;
using System.Collections.Generic;

/// <summary>
/// Container for managing multiple ItemView instances in 3D space.
/// This handles creating item views for a given item model and manages their lifecycle.
/// </summary>
public class ItemViewsContainer : MonoBehaviour
{
    [Tooltip("Transform to parent item views under. If null, will use this transform.")]
    [SerializeField] private Transform contentContainer;
    
    [Tooltip("Prefab to use for creating item views. Must have an ItemView component.")]
    [SerializeField] private GameObject itemViewPrefab;
    
    private List<ItemView> itemViews = new List<ItemView>();
    private Item _item;
    private string _collectionId;
    
    /// <summary>
    /// The transform where item views will be parented
    /// </summary>
    public Transform ContentContainer => contentContainer;
    
    /// <summary>
    /// All item views managed by this container
    /// </summary>
    public List<ItemView> ItemViews => itemViews;
    
    /// <summary>
    /// The item model this container is displaying
    /// </summary>
    public Item Item
    {
        get => _item;
        set
        {
            _item = value;
            
            // If we have an item but no item views, create one automatically
            if (_item != null && (itemViews == null || itemViews.Count == 0))
            {
                // Create a view using the configured prefab
                AddItemView(_item);
            }
            else
            {
                // Update any existing views with the new item
                UpdateItemViews();
            }
        }
    }
    
    private void Awake()
    {
        // If no content container is assigned, use this transform
        if (contentContainer == null)
        {
            contentContainer = transform;
        }
        
        // Collect any existing item views that might already be children
        ItemView[] existingViews = GetComponentsInChildren<ItemView>();
        foreach (var view in existingViews)
        {
            if (!itemViews.Contains(view))
            {
                itemViews.Add(view);
            }
        }
    }
    
    /// <summary>
    /// Updates all item views to display the current item
    /// </summary>
    private void UpdateItemViews()
    {
        if (_item == null) return;
        
        foreach (var view in itemViews)
        {
            if (view != null)
            {
                view.Model = _item;
            }
        }
    }
    
    /// <summary>
    /// Initialize the container with multiple items (not typically used)
    /// </summary>
    public void Initialize(List<Item> items)
    {
        Clear();
        
        if (items == null || items.Count == 0) return;
        
        foreach (var item in items)
        {
            AddItemView(item);
        }
    }
    
    /// <summary>
    /// Sets the collection context for this container and its item views
    /// </summary>
    public void SetCollectionContext(string collectionId)
    {
        _collectionId = collectionId;
        
        // Update any existing item views
        foreach (var view in itemViews)
        {
            if (view != null)
            {
                view.SetCollectionContext(collectionId);
            }
        }
    }
    
    /// <summary>
    /// Add an item view for a specific item
    /// </summary>
    public ItemView AddItemView(Item item)
    {
        if (item == null)
        {
            Debug.LogError("[ItemViewsContainer] Cannot add view for null item");
            return null;
        }
        
        if (itemViewPrefab == null)
        {
            Debug.LogError("[ItemViewsContainer] Missing itemViewPrefab in ItemViewsContainer");
            return null;
        }
        
        // Ensure we have a valid content container
        if (contentContainer == null)
        {
            contentContainer = transform;
        }
        
        // Instantiate the view prefab as a child of the content container
        GameObject viewObj = Instantiate(itemViewPrefab, contentContainer);
        viewObj.name = $"ItemView_{item.Id}";
        
        // Get the ItemView component from the instantiated prefab
        ItemView itemView = viewObj.GetComponent<ItemView>();
        
        if (itemView != null)
        {
            // Set the collection context on the view
            if (!string.IsNullOrEmpty(_collectionId))
            {
                itemView.SetCollectionContext(_collectionId);
            }
            
            // Set the item model on the view
            itemView.SetModel(item);
            itemViews.Add(itemView);
        }
        else
        {
            Debug.LogError("[ItemViewsContainer] ItemViewPrefab doesn't have an ItemView component");
        }
        
        return itemView;
    }
    
    /// <summary>
    /// Remove an item view
    /// </summary>
    public void RemoveItemView(ItemView itemView)
    {
        if (itemView == null) return;
        
        itemViews.Remove(itemView);
        Destroy(itemView.gameObject);
    }
    
    /// <summary>
    /// Clear all item views
    /// </summary>
    public void Clear()
    {
        foreach (var itemView in itemViews)
        {
            if (itemView != null && itemView.gameObject != null)
            {
                Destroy(itemView.gameObject);
            }
        }
        
        itemViews.Clear();
    }
    
    /// <summary>
    /// Apply position, rotation and scale to this container
    /// </summary>
    public void ApplyLayout(Vector3 position, Quaternion rotation, Vector3 scale)
    {
        transform.localPosition = position;
        transform.localRotation = rotation;
        transform.localScale = scale;
    }
} 