using UnityEngine;
using System;
using System.Collections.Generic;

/// <summary>
/// Displays a collection and its items.
/// Pure presentation component that doesn't handle any loading or serialization.
/// </summary>
public class CollectionView : MonoBehaviour, IModelView<Collection>
{
    [Header("Model Reference")]
    [SerializeField] private Collection model;
    
    [Header("Child Item Views")]
    [SerializeField] private Transform itemContainer;
    [SerializeField] private GameObject itemViewsContainerPrefab;
    
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
    
    private void Awake()
    {
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
        
        // Apply layout if there's a layout component
        var layoutComponent = GetComponent<CollectionGridLayout>();
        if (layoutComponent != null)
        {
            layoutComponent.ApplyLayout();
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
} 