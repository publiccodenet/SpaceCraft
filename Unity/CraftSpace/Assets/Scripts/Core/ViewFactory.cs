using UnityEngine;
using System.Collections.Generic;

public class ViewFactory : MonoBehaviour
{
    [Header("Prefabs")]
    public GameObject collectionViewPrefab;
    public GameObject itemViewPrefab;
    public GameObject itemViewsContainerPrefab;
    public List<GameObject> itemViewVariantPrefabs = new List<GameObject>();
    
    // Create a new collection view
    public CollectionView CreateCollectionView(Collection model, Transform container)
    {
        if (collectionViewPrefab == null)
        {
            Debug.LogError("CollectionViewPrefab is not assigned in ViewFactory");
            return null;
        }
        
        if (container == null)
        {
            Debug.LogError("Container must be provided when creating a CollectionView");
            return null;
        }
            
        GameObject viewObj = Instantiate(collectionViewPrefab, container);
        CollectionView view = viewObj.GetComponent<CollectionView>();
        
        if (view != null)
        {
            // Set the model (view will handle its own setup)
            view.SetModel(model);
        }
        
        return view;
    }
    
    // Create a new item view
    public ItemView CreateItemView(Item model, Transform container, string collectionId)
    {
        if (itemViewPrefab == null)
        {
            Debug.LogError("ItemViewPrefab is not assigned in ViewFactory");
            return null;
        }
        
        if (container == null)
        {
            Debug.LogError("Container must be provided when creating an ItemView");
            return null;
        }
        
        if (string.IsNullOrEmpty(collectionId))
        {
            Debug.LogError("CollectionId must be provided when creating an ItemView");
            return null;
        }
            
        GameObject viewObj = Instantiate(itemViewPrefab, container);
        ItemView view = viewObj.GetComponent<ItemView>();
        
        if (view != null)
        {
            // Set collection context
            view.SetCollectionContext(collectionId);
            
            // Set the model (view will handle its own setup)
            view.SetModel(model);
        }
        
        return view;
    }
    
    // Create a container with multiple views for an item
    public ItemViewsContainer CreateItemViewsContainer(Item model, Transform container, string collectionId)
    {
        if (itemViewsContainerPrefab == null)
        {
            Debug.LogError("ItemViewsContainerPrefab is not assigned in ViewFactory");
            return null;
        }
        
        if (container == null)
        {
            Debug.LogError("Container must be provided when creating an ItemViewsContainer");
            return null;
        }
        
        if (string.IsNullOrEmpty(collectionId))
        {
            Debug.LogError("CollectionId must be provided when creating an ItemViewsContainer");
            return null;
        }
            
        // Create container
        GameObject containerObj = Instantiate(itemViewsContainerPrefab, container);
        containerObj.name = $"ItemViews_{model?.Id ?? "Unknown"}";
        
        ItemViewsContainer containerComponent = containerObj.GetComponent<ItemViewsContainer>();
        if (containerComponent == null)
        {
            containerComponent = containerObj.AddComponent<ItemViewsContainer>();
        }
        
        // Set collection context
        containerComponent.SetCollectionContext(collectionId);
        
        // Set the model (container will handle its own setup)
        containerComponent.Item = model;
        
        // Create child views if needed
        if (containerObj.transform.childCount == 0 && itemViewVariantPrefabs.Count > 0)
        {
            foreach (var prefab in itemViewVariantPrefabs)
            {
                if (prefab != null)
                {
                    AddViewToPrefab(containerComponent, prefab);
                }
            }
        }
        
        return containerComponent;
    }
    
    // Add a view to a container
    public ItemView AddViewToPrefab(ItemViewsContainer container, GameObject prefab)
    {
        if (container == null || prefab == null)
            return null;
            
        GameObject viewObj = Instantiate(prefab, container.transform);
        ItemView view = viewObj.GetComponent<ItemView>();
        
        // Items will get their model from the container
        
        return view;
    }
} 