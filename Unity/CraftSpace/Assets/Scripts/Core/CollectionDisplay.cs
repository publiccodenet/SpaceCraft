using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using System; // Needed for Action

/// <summary>
/// Manages the display of a collection and item details.
/// Waits for Brewster to fully load content before displaying.
/// </summary>
public class CollectionDisplay : MonoBehaviour
{
    [Header("Collection Display")]
    public CollectionView collectionView;
    
    [Header("Item Detail Display")]
    public ItemInfoPanel itemInfoPanel;
    
    [Header("Settings")]
    public bool loadOnStart = true;
    public string collectionId;
    
    // Cache for collections and pending display
    private Dictionary<string, Collection> cachedCollections = new Dictionary<string, Collection>();
    private Item currentDisplayedItem;
    
    // Reference to SpaceShipBridge
    private SpaceShipBridge spaceShip;
    
    private void Start()
    {
        // Ensure Brewster instance exists
        if (Brewster.Instance == null)
        {
            Debug.LogError("CollectionDisplay requires Brewster instance in the scene!");
            enabled = false;
            return;
        }

        // Subscribe to Brewster event *before* potentially loading
        Brewster.Instance.OnAllContentLoaded += HandleAllContentLoaded;
        
        // Get the SpaceShipBridge reference
        spaceShip = SpaceShipBridge.spaceShip;
        if (spaceShip == null)
        {
            Debug.LogError("No SpaceShipBridge found. Required for collection display functionality.");
            enabled = false;
            return;
        }
    }
    
    private void Update()
    {
        if (spaceShip == null) return;
        
        // Check for state changes that require UI updates
        if (spaceShip.selectedItemsChanged || spaceShip.highlightedItemsChanged)
        {
            UpdateDetailPanel();
            
            // Reset the flags after we've processed them
            spaceShip.selectedItemsChanged = false;
            spaceShip.highlightedItemsChanged = false;
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
    /// Display a collection by ID - Now only stores ID, display happens on content loaded
    /// </summary>
    public void DisplayCollection(string collectionId)
    {
        if (string.IsNullOrEmpty(collectionId))
        {
            Debug.LogWarning("Cannot display collection: collectionId is null or empty");
            this.collectionId = null; // Clear potentially invalid ID
            return;
        }
        
        // Store the ID. The actual display will happen in HandleAllContentLoaded
        this.collectionId = collectionId;
        Debug.Log($"CollectionDisplay: Queued display for collection ID: {collectionId}. Waiting for OnAllContentLoaded.");
    }
    
    /// <summary>
    /// Called when Brewster finishes loading all content.
    /// Now responsible for getting and displaying the collection.
    /// </summary>
    private void HandleAllContentLoaded()
    {
        Debug.Log("CollectionDisplay: Received OnAllContentLoaded event.");
        
        // Hide details panel initially now that content is loaded
        HideItemDetails();

        // If we are set to load on start and have a valid ID
        if (loadOnStart && !string.IsNullOrEmpty(collectionId))
        {    
            Debug.Log($"CollectionDisplay: Attempting to get collection '{collectionId}' from Brewster...");
            Collection collection = Brewster.Instance.GetCollection(this.collectionId);

            if (collection != null)
            {
                // Set the collection on the view now that all content is loaded
                if (collectionView != null)
                {
                    Debug.Log($"CollectionDisplay: Setting model on CollectionView for collection '{collection.Id}'.");
                    collectionView.SetModel(collection);
                }
                else
                {    
                    Debug.LogWarning("No CollectionView assigned. Cannot display collection even after load.");
                }
            }
            else
            {
                 Debug.LogError($"CollectionDisplay: Failed to get collection '{this.collectionId}' from Brewster even after OnAllContentLoaded.");
            }
        }
        else
        {
            Debug.Log("CollectionDisplay: Not configured to load a collection on start or collectionId is invalid.");
        }
    }
    
    /// <summary>
    /// Updates the detail panel based on item state (highlighted first, then selected)
    /// </summary>
    private void UpdateDetailPanel()
    {
        if (spaceShip == null)
        {
            HideItemDetails();
            return;
        }
        
        Item itemToDisplay = null;
        
        // Priority 1: Show the first highlighted item if any exist
        if (spaceShip.highlightedItemIds.Count > 0)
        {
            string highlightedId = spaceShip.highlightedItemIds[0];
            if (!string.IsNullOrEmpty(highlightedId))
            {
                ItemView itemView = spaceShip.InputManager?.FindItemViewById(highlightedId);
                if (itemView != null && itemView.Model != null)
                {
                    itemToDisplay = itemView.Model;
                }
            }
        }
        
        // Priority 2: If no highlighted items, show the first selected item
        if (itemToDisplay == null && spaceShip.selectedItemIds.Count > 0)
        {
            string selectedId = spaceShip.selectedItemIds[0];
            if (!string.IsNullOrEmpty(selectedId))
            {
                ItemView itemView = spaceShip.InputManager?.FindItemViewById(selectedId);
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
    /// Displays a collection by ID (alias for DisplayCollection to match SpaceShipBridge reference)
    /// </summary>
    public void ShowCollection(string collectionId)
    {
        DisplayCollection(collectionId);
    }
} 