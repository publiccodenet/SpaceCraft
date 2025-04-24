using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using System; // Needed for Action

/// <summary>
/// Manages the display of multiple collections and item details.
/// </summary>
public class CollectionsView : MonoBehaviour
{
    [Header("Collections Display")]
    public CollectionView collectionViewPrefab;
    public Transform collectionsContainer;
    public float collectionGapX = 10f;
    
    [Header("Item Detail Display")]
    public ItemInfoPanel itemInfoPanel;
    
    // Collection views management
    private List<CollectionView> collectionViews = new List<CollectionView>();
    private Item currentDisplayedItem;
    
    // Reference to SpaceCraft
    private SpaceCraft spaceCraft;
    
    private void Start()
    {
        // Ensure Brewster instance exists
        if (Brewster.Instance == null)
        {
            Debug.LogError("CollectionsView requires Brewster instance in the scene!");
            enabled = false;
            return;
        }

        // Subscribe to Brewster event for content loading
        Brewster.Instance.OnAllContentLoaded += HandleAllContentLoaded;
        
        // Get the SpaceCraft reference
        spaceCraft = SpaceCraft.spaceCraft;
        if (spaceCraft == null)
        {
            Debug.LogError("No SpaceCraft found. Required for collections display functionality.");
            enabled = false;
            return;
        }
    }
    
    private void Update()
    {
        if (spaceCraft == null) return;
        
        // Check for state changes that require UI updates
        if (spaceCraft.selectedItemsChanged || spaceCraft.highlightedItemsChanged)
        {
            UpdateDetailPanel();
            
            // Reset the flags after we've processed them
            spaceCraft.selectedItemsChanged = false;
            spaceCraft.highlightedItemsChanged = false;
        }
    }
    
    public void OnDestroy()
    {
        // Unsubscribe from Brewster event
        if (Brewster.Instance != null)
        {
            Brewster.Instance.OnAllContentLoaded -= HandleAllContentLoaded;
        }
    }
    
    /// <summary>
    /// Displays all available collections
    /// </summary>
    public void DisplayAllCollections()
    {
        // Clear any existing collection views
        ClearAllViews();
        
        if (Brewster.Instance == null)
        {
            Debug.LogError("Brewster instance is null. Cannot display collections.");
            return;
        }
        
        // Get all collections from Brewster
        Dictionary<string, Collection> collections = Brewster.Instance.GetAllCollections();
        if (collections == null || collections.Count == 0)
        {
            Debug.LogWarning("No collections available to display.");
            return;
        }
        
        // Create a view for each collection
        float xOffset = 0f;
        foreach (var collection in collections.Values)
        {
            if (collection != null)
            {
                // Create a collection view
                CollectionView view = CreateCollectionView(collection);
                
                // Position the view
                RectTransform rectTransform = view.GetComponent<RectTransform>();
                if (rectTransform != null)
                {
                    rectTransform.anchoredPosition = new Vector2(xOffset, 0);
                    xOffset += rectTransform.rect.width + collectionGapX;
                }
            }
        }
        
        Debug.Log($"CollectionsView: Displayed {collectionViews.Count} collections.");
    }
    
    /// <summary>
    /// Display a specific collection by ID
    /// </summary>
    public void DisplayCollection(string collectionId)
    {
        if (string.IsNullOrEmpty(collectionId))
        {
            Debug.LogWarning("Cannot display collection: collectionId is null or empty");
            return;
        }
        
        // Get the collection from Brewster
        Collection collection = Brewster.Instance.GetCollection(collectionId);
        if (collection == null)
        {
            Debug.LogError($"Collection with ID '{collectionId}' not found.");
            return;
        }
        
        // Clear existing views and display just this collection
        ClearAllViews();
        CreateCollectionView(collection);
    }
    
    /// <summary>
    /// Creates a CollectionView for the specified collection
    /// </summary>
    private CollectionView CreateCollectionView(Collection collection)
    {
        if (collectionViewPrefab == null)
        {
            Debug.LogError("CollectionView prefab is not assigned.");
            return null;
        }
        
        if (collectionsContainer == null)
        {
            Debug.LogError("Collections container is not assigned.");
            return null;
        }
        
        // Instantiate the prefab
        CollectionView view = Instantiate(collectionViewPrefab, collectionsContainer);
        view.name = $"CollectionView_{collection.Id}";
        
        // Set the collection model
        view.SetModel(collection);
        
        // Add to our list
        collectionViews.Add(view);
        
        return view;
    }
    
    /// <summary>
    /// Called when Brewster finishes loading all content.
    /// </summary>
    private void HandleAllContentLoaded()
    {
        Debug.Log("CollectionsView: Received OnAllContentLoaded event.");
        
        // Hide details panel initially
        HideItemDetails();
        
        // Display all available collections
        DisplayAllCollections();
    }
    
    /// <summary>
    /// Updates the detail panel based on item state (highlighted first, then selected)
    /// </summary>
    private void UpdateDetailPanel()
    {
        if (spaceCraft == null)
        {
            HideItemDetails();
            return;
        }
        
        Item itemToDisplay = null;
        
        // Priority 1: Show the first highlighted item if any exist
        if (spaceCraft.highlightedItemIds.Count > 0)
        {
            string highlightedId = spaceCraft.highlightedItemIds[0];
            if (!string.IsNullOrEmpty(highlightedId))
            {
                ItemView itemView = spaceCraft.InputManager?.FindItemViewById(highlightedId);
                if (itemView != null && itemView.Model != null)
                {
                    itemToDisplay = itemView.Model;
                }
            }
        }
        
        // Priority 2: If no highlighted items, show the first selected item
        if (itemToDisplay == null && spaceCraft.selectedItemIds.Count > 0)
        {
            string selectedId = spaceCraft.selectedItemIds[0];
            if (!string.IsNullOrEmpty(selectedId))
            {
                ItemView itemView = spaceCraft.InputManager?.FindItemViewById(selectedId);
                if (itemView != null && itemView.Model != null)
                {
                    itemToDisplay = itemView.Model;
                }
            }
        }
        
        // Update the UI based on the item to display
        if (itemToDisplay != null)
        {
            // Check if this is a different item than what's currently displayed
            if (currentDisplayedItem != itemToDisplay)
            {
                currentDisplayedItem = itemToDisplay;
                DisplayItemDetails(itemToDisplay);
            }
        }
        else
        {
            // No item to display
            if (currentDisplayedItem != null)
            {
                currentDisplayedItem = null;
                HideItemDetails();
            }
        }
    }
    
    /// <summary>
    /// Display item title in the InfoText panel
    /// </summary>
    public void DisplayItemDetails(Item item)
    {
        if (item == null)
        {
            HideItemDetails();
            return;
        }
        
        // Show title in the InfoText component
        if (itemInfoPanel != null)
        {
            itemInfoPanel.gameObject.SetActive(true);
            itemInfoPanel.ShowInfo(item.Title);
        }
    }
    
    /// <summary>
    /// Hide item details panel
    /// </summary>
    public void HideItemDetails()
    {
        // Hide panel if present
        if (itemInfoPanel != null)
        {
            itemInfoPanel.ClearInfo();
            itemInfoPanel.gameObject.SetActive(false);
        }
    }
    
    /// <summary>
    /// Clear the detail panel
    /// </summary>
    public void CloseDetailPanel()
    {
        HideItemDetails();
    }

    /// <summary>
    /// Displays a collection by ID (alias for DisplayCollection)
    /// </summary>
    public void ShowCollection(string collectionId)
    {
        DisplayCollection(collectionId);
    }
    
    /// <summary>
    /// Clears all views when collections data is updated
    /// </summary>
    public void ClearAllViews()
    {
        // Destroy each collection view
        foreach (var view in collectionViews)
        {
            if (view != null)
            {
                Destroy(view.gameObject);
            }
        }
        
        // Clear the list
        collectionViews.Clear();
        
        // Hide any item details
        HideItemDetails();
        
        // Reset current displayed item
        currentDisplayedItem = null;
    }
} 