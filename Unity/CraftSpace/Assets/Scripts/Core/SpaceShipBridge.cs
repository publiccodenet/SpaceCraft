using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

/// <summary>
/// Central connection point for the main components of the SpaceCraft system.
/// This class should be placed on the Brewster prefab and will provide easy access
/// to core components and facilitate communication between them.
/// </summary>
public class SpaceShipBridge : BridgeObject
{
    [Header("Core System References")]
    public InputManager inputManager;
    public Brewster brewster;
    public CollectionDisplay collectionDisplay;
    public static SpaceShipBridge spaceShip;
    
    // Public accessors
    public static SpaceShipBridge Instance => spaceShip;
    public InputManager InputManager => inputManager;
    public Brewster Brewster => brewster;
    public CollectionDisplay CollectionDisplay => collectionDisplay;
    
    // Application state - exposed as public properties for Bridge JSON conversion
    public List<string> selectedItemIds = new List<string>();
    public List<string> highlightedItemIds = new List<string>(); // Can contain duplicates for multiple highlights
    
    // User tracking - mapping users to the items they're highlighting
    private Dictionary<string, List<string>> userHighlightedItems = new Dictionary<string, List<string>>();
    
    // Configuration
    public bool multiSelectEnabled = false;
    
    // Create events to notify Bridge when there are changes
    public bool selectedItemsChanged = false;
    public bool highlightedItemsChanged = false;

    private void Awake()
    {
        // Singleton pattern - only allow one instance
        if (spaceShip != null && spaceShip != this)
        {
            Debug.LogWarning("More than one SpaceShipBridge found in the scene. Only one should exist.");
            Destroy(this);
            return;
        }
        
        spaceShip = this;
        
        // Cache references if not assigned in inspector - use GetComponent since they're on the same GameObject
        if (inputManager == null)
            inputManager = GetComponent<InputManager>();
        
        if (brewster == null)
            brewster = GetComponent<Brewster>();
        
        // Check for missing components
        if (inputManager == null)
            Debug.LogError("SpaceShipBridge: InputManager reference not found!");
        
        if (brewster == null)
            Debug.LogError("SpaceShipBridge: Brewster reference not found!");
        
        if (collectionDisplay == null)
            Debug.LogError("SpaceShipBridge: CollectionDisplay reference not found!");
    }
    
    private void Update()
    {
        // Send events only when changes have occurred - reduce bridge traffic
        if (selectedItemsChanged)
        {
            SendEvent("SelectedItemsChanged", new { selectedItemIds });
            // CollectionDisplay will reset this flag after processing
        }
        
        if (highlightedItemsChanged)
        {
            SendEvent("HighlightedItemsChanged", new { highlightedItemIds });
            // CollectionDisplay will reset this flag after processing
        }
    }
    
    // Helper method to format event data and send it through the bridge
    private void SendEvent(string eventName, object data = null)
    {
        if (data == null)
        {
            SendEventName(eventName);
        }
        else
        {
            JObject jData = JObject.FromObject(data);
            SendEventName(eventName, jData);
        }
    }
    
    // ================== INPUT MANAGER EVENT HANDLERS ======================
    
    // Handle events from InputManager
    public void OnItemSelected(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        
        // Update selection state based on multiSelectEnabled settings
        if (!multiSelectEnabled)
        {
            // Single selection mode - clear existing selection
            ClearSelectionExcept(item.Model.Id);
        }
        
        // Add to our selected items list if not already there
        if (!selectedItemIds.Contains(item.Model.Id))
        {
            selectedItemIds.Add(item.Model.Id);
            selectedItemsChanged = true;
        }
        
        // Update visual state
        item.SetSelected(true);
    }
    
    public void OnItemDeselected(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        
        // Actually maintain the list of selected items here, not in InputManager
        if (selectedItemIds.Contains(item.Model.Id))
        {
            selectedItemIds.Remove(item.Model.Id);
            selectedItemsChanged = true;
        }
        
        // Update visual state
        item.SetSelected(false);
    }
    
    public void OnItemHighlightStart(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        
        // Track local user's highlight
        TrackUserHighlight("local", item.Model.Id);
        
        // Add to highlighted list (allows duplicates)
        highlightedItemIds.Add(item.Model.Id);
        highlightedItemsChanged = true;
        
        // Set item's highlight count
        item.SetHighlightCount(GetHighlightCount(item.Model.Id));
    }
    
    public void OnItemHighlightEnd(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        
        // Untrack local user's highlight
        UntrackUserHighlight("local", item.Model.Id);
        
        // Remove ONE instance of this ID from the list
        if (highlightedItemIds.Contains(item.Model.Id))
        {
            highlightedItemIds.Remove(item.Model.Id); // Removes first occurrence only
            highlightedItemsChanged = true;
        }
        
        // Update the item's visual state
        int count = GetHighlightCount(item.Model.Id);
        item.SetHighlightCount(count);
    }
    
    // ================== SELECTION API ======================
    
    /// <summary>
    /// Find an ItemView by its ID, handling null cases gracefully
    /// </summary>
    private ItemView FindItemSafe(string itemId)
    {
        if (string.IsNullOrEmpty(itemId) || inputManager == null)
        {
            return null;
        }
        
        ItemView itemView = inputManager.FindItemViewById(itemId);
        if (itemView == null)
        {
            Debug.LogWarning($"SpaceShipBridge: Item with ID '{itemId}' not found");
        }
        
        return itemView;
    }
    
    /// <summary>
    /// Clear all selected items except for the one with the given ID
    /// </summary>
    private void ClearSelectionExcept(string exceptItemId)
    {
        if (inputManager == null) return;
        
        List<string> itemsToDeselect = new List<string>(selectedItemIds);
        foreach (string itemId in itemsToDeselect)
        {
            if (itemId != exceptItemId)
            {
                // Find and deselect the item
                ItemView itemView = FindItemSafe(itemId);
                if (itemView != null)
                {
                    itemView.SetSelected(false);
                }
                
                // Remove from our list
                selectedItemIds.Remove(itemId);
                selectedItemsChanged = true;
            }
        }
    }
    
    /// <summary>
    /// Select an item by ID. Will apply constraints before selecting.
    /// </summary>
    public void SelectItem(string itemId, string userId = "default")
    {
        ItemView itemView = FindItemSafe(itemId);
        if (itemView == null) return;
        
        // Handle single selection mode
        if (!multiSelectEnabled)
        {
            ClearSelectionExcept(itemId);
        }
        
        // Add to our selected items list if not already there
        if (!selectedItemIds.Contains(itemId))
        {
            selectedItemIds.Add(itemId);
            selectedItemsChanged = true;
        }
        
        // Update visual state directly on the item view
        itemView.SetSelected(true);
    }
    
    /// <summary>
    /// Deselect an item by ID
    /// </summary>
    public void DeselectItem(string itemId, string userId = "default")
    {
        // Remove from our list, even if the item isn't found visually
        if (selectedItemIds.Contains(itemId))
        {
            selectedItemIds.Remove(itemId);
            selectedItemsChanged = true;
        }
        
        ItemView itemView = FindItemSafe(itemId);
        if (itemView == null) return;
        
        // Update visual state directly
        itemView.SetSelected(false);
    }
    
    /// <summary>
    /// Deselect all items
    /// </summary>
    public void DeselectAllItems()
    {
        if (inputManager == null) return;
        
        // Get all selected items before clearing the list
        List<string> itemsToDeselect = new List<string>(selectedItemIds);
        
        // Clear our list
        if (selectedItemIds.Count > 0)
        {
            selectedItemIds.Clear();
            selectedItemsChanged = true;
        }
        
        // Update visual state for each previously selected item
        foreach (string itemId in itemsToDeselect)
        {
            ItemView itemView = FindItemSafe(itemId);
            if (itemView != null)
            {
                itemView.SetSelected(false);
            }
        }
    }
    
    /// <summary>
    /// Toggle selection state of an item
    /// </summary>
    public void ToggleItemSelection(string itemId, string userId = "default")
    {
        if (selectedItemIds.Contains(itemId))
        {
            DeselectItem(itemId, userId);
        }
        else
        {
            SelectItem(itemId, userId);
        }
    }
    
    /// <summary>
    /// Set a specific set of items as selected, deselecting all others
    /// </summary>
    public void SetSelectedItems(List<string> itemIds, string userId = "default")
    {
        if (inputManager == null || itemIds == null) return;
        
        // In single select mode, only select the last item
        if (!multiSelectEnabled && itemIds.Count > 1)
        {
            // Only select the last item
            SelectItem(itemIds[itemIds.Count - 1], userId);
            return;
        }
        
        // First check if there's actually a change to avoid unnecessary updates
        bool hasChanges = false;
        
        // Quick check if counts are different
        if (selectedItemIds.Count != itemIds.Count)
        {
            hasChanges = true;
        }
        else
        {
            // Check if the contents are different
            foreach (string itemId in itemIds)
            {
                if (!selectedItemIds.Contains(itemId))
                {
                    hasChanges = true;
                    break;
                }
            }
            
            if (!hasChanges)
            {
                foreach (string itemId in selectedItemIds)
                {
                    if (!itemIds.Contains(itemId))
                    {
                        hasChanges = true;
                        break;
                    }
                }
            }
        }
        
        if (!hasChanges) return; // No need to update if nothing changed
        
        // First deselect all
        DeselectAllItems();
        
        // Now select the ones in the list
        AddSelectedItems(itemIds, userId);
    }
    
    /// <summary>
    /// Add multiple items to the selection
    /// </summary>
    public void AddSelectedItems(List<string> itemIds, string userId = "default")
    {
        if (inputManager == null || itemIds == null) return;
        
        // In single select mode, only select the last item
        if (!multiSelectEnabled)
        {
            if (itemIds.Count > 0)
            {
                SelectItem(itemIds[itemIds.Count - 1], userId);
            }
            return;
        }
        
        bool anySelected = false;
        
        foreach (string itemId in itemIds)
        {
            ItemView item = FindItemSafe(itemId);
            if (item == null) continue;
            
            // Add to our list 
            if (!selectedItemIds.Contains(itemId))
            {
                selectedItemIds.Add(itemId);
                anySelected = true;
            }
            
            // Update visual state
            item.SetSelected(true);
        }
        
        if (anySelected)
        {
            selectedItemsChanged = true;
        }
    }
    
    /// <summary>
    /// Remove multiple items from the selection
    /// </summary>
    public void RemoveSelectedItems(List<string> itemIds, string userId = "default")
    {
        if (inputManager == null || itemIds == null) return;
        
        bool anyDeselected = false;
        
        foreach (string itemId in itemIds)
        {
            // Remove from our list regardless of visual state
            if (selectedItemIds.Contains(itemId))
            {
                selectedItemIds.Remove(itemId);
                anyDeselected = true;
            }
            
            // Update visual state if item exists
            ItemView item = FindItemSafe(itemId);
            if (item != null)
            {
                item.SetSelected(false);
            }
        }
        
        if (anyDeselected)
        {
            selectedItemsChanged = true;
        }
    }
    
    /// <summary>
    /// Toggle multi-select mode
    /// </summary>
    public void SetMultiSelectMode(bool enable)
    {
        if (inputManager == null) return;
        
        if (multiSelectEnabled != enable)
        {
            multiSelectEnabled = enable;
            inputManager.multiSelect = enable;
            
            // If turning off multi-select and we have multiple selections, keep only the first one
            if (!enable && selectedItemIds.Count > 1)
            {
                string keepItemId = selectedItemIds[0];
                SetSelectedItems(new List<string> { keepItemId });
            }
        }
    }
    
    // ================== HIGHLIGHT API ======================
    
    /// <summary>
    /// Get the highlight count for an item
    /// </summary>
    public int GetHighlightCount(string itemId)
    {
        if (string.IsNullOrEmpty(itemId))
            return 0;
            
        return highlightedItemIds.Count(id => id == itemId);
    }
    
    /// <summary>
    /// Set which items are highlighted by specific users, removing all previous highlights
    /// </summary>
    public void SetHighlightedItems(List<string> itemIds, string userId)
    {
        if (inputManager == null || itemIds == null) return;
        
        // Clear existing highlights for this user
        ClearUserHighlights(userId);
        
        // Add new highlights
        AddHighlightedItems(itemIds, userId);
    }
    
    /// <summary>
    /// Add multiple items to highlighted state for a user
    /// </summary>
    public void AddHighlightedItems(List<string> itemIds, string userId)
    {
        if (inputManager == null || itemIds == null) return;
        
        bool anyChanged = false;
        
        foreach (var itemId in itemIds)
        {
            if (string.IsNullOrEmpty(itemId)) continue;
            
            // Track this highlight for the user
            bool added = TrackUserHighlight(userId, itemId);
            if (added) 
            {
                anyChanged = true;
                
                // Add to the highlights list (allows duplicates)
                highlightedItemIds.Add(itemId);
                
                // Apply visual highlight if item exists
                ItemView item = FindItemSafe(itemId);
                if (item != null)
                {
                    item.SetHighlightCount(GetHighlightCount(itemId));
                }
            }
        }
        
        if (anyChanged)
        {
            highlightedItemsChanged = true;
        }
    }
    
    /// <summary>
    /// Remove multiple items from highlighted state for a user
    /// </summary>
    public void RemoveHighlightedItems(List<string> itemIds, string userId)
    {
        if (inputManager == null || itemIds == null) return;
        
        bool anyChanged = false;
        
        foreach (var itemId in itemIds)
        {
            if (string.IsNullOrEmpty(itemId)) continue;
            
            // Untrack this highlight for the user
            bool removed = UntrackUserHighlight(userId, itemId);
            if (removed)
            {
                anyChanged = true;
                
                // Remove one instance of this ID from the highlighted list
                if (highlightedItemIds.Contains(itemId))
                {
                    highlightedItemIds.Remove(itemId); // Removes first occurrence only
                }
                
                // Update visual state if item exists
                ItemView item = FindItemSafe(itemId);
                if (item != null)
                {
                    item.SetHighlightCount(GetHighlightCount(itemId));
                }
            }
        }
        
        if (anyChanged)
        {
            highlightedItemsChanged = true;
        }
    }
    
    /// <summary>
    /// Highlight a specific item by ID
    /// </summary>
    public void HighlightItem(string itemId, string userId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        
        // Track this highlight for the user
        bool added = TrackUserHighlight(userId, itemId);
        
        if (added)
        {
            // Add to highlighted list (allows duplicates)
            highlightedItemIds.Add(itemId);
            highlightedItemsChanged = true;
            
            // Apply visual highlight if item exists
            ItemView item = FindItemSafe(itemId);
            if (item != null)
            {
                item.SetHighlightCount(GetHighlightCount(itemId));
            }
        }
    }
    
    /// <summary>
    /// Remove highlight from a specific item by ID
    /// </summary>
    public void UnhighlightItem(string itemId, string userId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        
        // Untrack this highlight for the user
        bool removed = UntrackUserHighlight(userId, itemId);
        
        if (removed)
        {
            // Remove one instance of this ID from the highlighted list
            if (highlightedItemIds.Contains(itemId))
            {
                highlightedItemIds.Remove(itemId); // Removes first occurrence only
                highlightedItemsChanged = true;
            }
            
            // Update visual state if item exists
            ItemView item = FindItemSafe(itemId);
            if (item != null)
            {
                item.SetHighlightCount(GetHighlightCount(itemId));
            }
        }
    }
    
    /// <summary>
    /// Navigate to a specific collection
    /// </summary>
    public void NavigateToCollection(string collectionId)
    {
        if (collectionDisplay == null || string.IsNullOrEmpty(collectionId))
            return;
            
        collectionDisplay.ShowCollection(collectionId);
    }
    
    // ================== HELPER METHODS ======================
    
    /// <summary>
    /// Track which items are highlighted by which users
    /// Returns true if this is a new highlight that was added
    /// </summary>
    private bool TrackUserHighlight(string userId, string itemId)
    {
        if (!userHighlightedItems.TryGetValue(userId, out List<string> items))
        {
            items = new List<string>();
            userHighlightedItems[userId] = items;
        }
        
        // Add to the user's highlight list
        items.Add(itemId);
        return true;
    }
    
    /// <summary>
    /// Untrack a user's highlight on an item
    /// Returns true if this item was actually removed
    /// </summary>
    private bool UntrackUserHighlight(string userId, string itemId)
    {
        if (!userHighlightedItems.TryGetValue(userId, out List<string> items))
        {
            return false;
        }
        
        // Find first occurrence of this ID and remove it
        int index = items.IndexOf(itemId);
        if (index >= 0)
        {
            items.RemoveAt(index);
            
            // Remove the user entry if they're not highlighting anything
            if (items.Count == 0)
            {
                userHighlightedItems.Remove(userId);
            }
            
            return true;
        }
        
        return false;
    }
    
    /// <summary>
    /// Check if an item is highlighted by any user
    /// </summary>
    private bool IsItemHighlightedByAnyUser(string itemId)
    {
        foreach (var userItems in userHighlightedItems.Values)
        {
            if (userItems.Contains(itemId))
            {
                return true;
            }
        }
        
        return false;
    }
    
    /// <summary>
    /// Clear all highlights for a specific user
    /// </summary>
    private void ClearUserHighlights(string userId)
    {
        if (!userHighlightedItems.TryGetValue(userId, out List<string> items))
        {
            return; // User has no highlights
        }
        
        // Copy the list to avoid modification during iteration
        List<string> itemsCopy = new List<string>(items);
        
        // Clear the user's highlights
        userHighlightedItems.Remove(userId);
        
        // Update visual state for each item that was highlighted by this user
        foreach (var itemId in itemsCopy)
        {
            // Remove one instance of this ID from the highlighted list for each
            // time it appears in the user's list
            if (highlightedItemIds.Contains(itemId))
            {
                highlightedItemIds.Remove(itemId); // Removes first occurrence only
                highlightedItemsChanged = true;
            }
            
            // Update visual state if item exists
            ItemView item = FindItemSafe(itemId);
            if (item != null)
            {
                item.SetHighlightCount(GetHighlightCount(itemId));
            }
        }
    }

    // ================== BRIDGE API METHODS ======================
    
    /// <summary>
    /// Enables or disables multi-select mode
    /// </summary>
    public void setMultiSelectMode(JObject data)
    {
        if (data == null) return;
        
        bool enable = data.Value<bool>("enable");
        SetMultiSelectMode(enable);
        
        // Send back the current state
        SendEvent("MultiSelectChanged", new { multiSelectEnabled });
    }

    // Add a single item to highlighted state
    public void AddHighlightedItem(string itemId, string userId = "local")
    {
        if (string.IsNullOrEmpty(itemId)) return;
        
        // Track this highlight for the user
        bool added = TrackUserHighlight(userId, itemId);
        
        if (added)
        {
            // Add to highlighted list (allows duplicates)
            highlightedItemIds.Add(itemId);
            highlightedItemsChanged = true;
            
            // Apply visual highlight if item exists
            ItemView item = FindItemSafe(itemId);
            if (item != null)
            {
                item.SetHighlightCount(GetHighlightCount(itemId));
            }
        }
    }
    
    // Remove a single item from highlighted state
    public void RemoveHighlightedItem(string itemId, string userId = "local")
    {
        if (string.IsNullOrEmpty(itemId)) return;
        
        // Untrack this highlight for the user
        bool removed = UntrackUserHighlight(userId, itemId);
        
        if (removed)
        {
            // Remove one instance of this ID from the highlighted list
            if (highlightedItemIds.Contains(itemId))
            {
                highlightedItemIds.Remove(itemId); // Removes first occurrence only
                highlightedItemsChanged = true;
            }
            
            // Update visual state if item exists
            ItemView item = FindItemSafe(itemId);
            if (item != null)
            {
                item.SetHighlightCount(GetHighlightCount(itemId));
            }
        }
    }

}
