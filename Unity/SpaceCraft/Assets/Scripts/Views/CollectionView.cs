using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Displays a collection and its items.
/// Pure presentation component that doesn't handle any loading or serialization.
/// </summary>
public class CollectionView : MonoBehaviour, IModelView<Collection>
{
    [Header("Model Reference")]
    [SerializeField] private Collection model;
    
    [Header("View Configuration")]
    [SerializeField] private Transform itemContainer; // Parent for item containers
    [SerializeField] private GameObject itemViewsContainerPrefab;
    [SerializeField] private CollectionLayoutBase layoutManager; // Reference to the layout component
    
    // List of item view containers this collection view is managing
    private List<ItemViewsContainer> itemContainers = new List<ItemViewsContainer>();
    
    // Property to get/set the model
    public Collection Model 
    { 
        get => model;
        set => SetModel(value);
    }
    
    // Collection property as an alias for Model
    public Collection Collection => model;
    
    // Event for model updates
    public event Action ModelUpdated;
    
    // Public property for grid layout (if applicable) - REMOVED, now handled by layoutManager
    // public int gridColumnCount = 5; 
    
    private void Awake()
    {
        // Ensure we have a layout manager
        if (layoutManager == null) {
             layoutManager = GetComponent<CollectionLayoutBase>(); // Try to find it on the same GameObject
             if (layoutManager == null) {
                  Debug.LogWarning($"CollectionView '{name}' requires a CollectionLayoutBase component (e.g., CollectionGridLayout). Add one or assign it in the inspector.");
                  // Optionally add a default layout here if none is found
                  // layoutManager = gameObject.AddComponent<CollectionGridLayout>();
             }
        }

        if (model != null)
        {
            // Register with model on awake
            model.RegisterView(this);
        }
    }
    
    private void OnDestroy()
    {
        if (model != null)
        {
            // Unregister when view is destroyed
            model.UnregisterView(this);
        }
        
        // Clean up child item views
        ClearItemViews();
    }
    
    // Set the model and update the view
    public void SetModel(Collection value) 
    { 
        if (model == value) return;
        
        // Unregister from old model
        if (model != null)
        {
            model.UnregisterView(this);
        }
        
        model = value;
        
        // Register with new model
        if (model != null)
        {
            model.RegisterView(this);
            
            // Create item views for the new model
            CreateItemViews();
        }
        else
        {
            // Clear item views if model is null
            ClearItemViews();
        }
        
        // Update the view
        UpdateView();
    }
    
    // Update the view based on the model
    protected virtual void UpdateView()
    {
        // Update name for debugging
        gameObject.name = model != null 
            ? $"Collection: {model.Title}" 
            : "Collection: [No Model]";
            
        // Notify listeners
        ModelUpdated?.Invoke();
    }
    
    // Handle model updates
    public void HandleModelUpdated()
    {
        UpdateView();
    }
    
    // Create item views for all items in the collection
    public void CreateItemViews()
    {
        // Clear any existing item views
        ClearItemViews();
        
        if (model == null || itemViewsContainerPrefab == null || itemContainer == null)
            return;
            
        foreach (var item in model.Items)
        {
            CreateItemViewContainer(item, Vector3.zero);
        }
        
        // Apply layout using the assigned layout manager
        if (layoutManager != null)
        {
            layoutManager.ApplyLayout(itemContainers, itemContainer);
        }
        else
        {
            Debug.LogError($"CollectionView '{name}' is missing a LayoutManager component. Cannot apply layout.");
        }
    }
    
    // Create a container with views for a specific item
    public ItemViewsContainer CreateItemViewContainer(Item itemModel, Vector3 position)
    {
        if (itemModel == null || itemViewsContainerPrefab == null)
            return null;
            
        // Create container
        GameObject containerObj = Instantiate(itemViewsContainerPrefab, itemContainer);
        containerObj.name = $"ItemViews_{itemModel.Id}";
        containerObj.transform.localPosition = position;
        
        // Get or add container component
        ItemViewsContainer container = containerObj.GetComponent<ItemViewsContainer>();
        if (container == null)
        {
            container = containerObj.AddComponent<ItemViewsContainer>();
        }
        
        // Set the collection context on the container
        if (model != null && !string.IsNullOrEmpty(model.Id))
        {
            container.SetCollectionContext(model.Id);
        }
        
        // Set the item model - the container will create its own item view
        container.Item = itemModel;
        
        // Keep track of the container
        itemContainers.Add(container);
        
        return container;
    }
    
    // Clear all item containers
    public void ClearItemViews()
    {
        foreach (var container in itemContainers)
        {
            if (container != null)
            {
                Destroy(container.gameObject);
            }
        }
        
        itemContainers.Clear();
    }
    
    // Get all item containers
    public List<ItemViewsContainer> GetItemContainers()
    {
        return new List<ItemViewsContainer>(itemContainers);
    }

    /// <summary>
    /// Gets a flat list of all ItemView components managed by this CollectionView.
    /// </summary>
    /// <returns>A list of ItemView components.</returns>
    public List<ItemView> GetCurrentItemViews()
    {
        List<ItemView> allItemViews = new List<ItemView>();
        foreach (var container in itemContainers)
        {
            // Get the first ItemView from the container's list (if any)
            ItemView view = container?.ItemViews?.FirstOrDefault(); 
            if (view != null)
            {
                allItemViews.Add(view);
            }
        }
        return allItemViews;
    }

    /// <summary>
    /// Finds the ItemView associated with the given item ID within this collection.
    /// Assumes only one view exists per item ID within this collection.
    /// </summary>
    /// <param name="itemId">The ID of the item to find.</param>
    /// <returns>The ItemView if found, otherwise null.</returns>
    public ItemView FindItemViewById(string itemId)
    {
        foreach (var container in itemContainers)
        {
            // Check the primary view (assuming only one view per item in a collection)
            if (container?.PrimaryItemView?.Model?.Id == itemId)
            {
                return container.PrimaryItemView;
            }
        }
        return null; // Not found in this collection
    }
} 