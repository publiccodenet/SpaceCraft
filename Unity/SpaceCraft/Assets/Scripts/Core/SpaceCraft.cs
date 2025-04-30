using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

/// <summary>
/// Central connection point for the main components of the SpaceCraft system.
/// This class should be placed on the Brewster prefab and will provide easy access
/// to core components and facilitate communication between them.
/// </summary>
public class SpaceCraft : BridgeObject
{
    [Header("Core System References")]
    public InputManager inputManager;
    public Brewster brewster;
    public CollectionsView collectionsView;
    public static SpaceCraft spaceCraft;
    
    // Public accessors
    public static SpaceCraft Instance => spaceCraft;
    public InputManager InputManager => inputManager;
    public Brewster Brewster => brewster;
    public CollectionsView CollectionsView => collectionsView;
    
    // Application state - exposed as public properties for Bridge JSON conversion
    [Header("Content State")]
    public JObject content;
    
    // Backing fields for state lists
    private List<string> _selectedItemIds = new List<string>();
    private List<string> _highlightedItemIds = new List<string>(); // Can contain duplicates for multiple highlights

    // Public properties with setters to trigger visual updates
    public List<string> SelectedItemIds
    {
        get => _selectedItemIds;
        set
        {
            // Optimization: If a change is already pending, don't re-evaluate
            if (selectedItemsChanged) return;

            // Check if the list content is actually different before updating
            HashSet<string> currentSet = new HashSet<string>(_selectedItemIds);
            HashSet<string> newSet = new HashSet<string>(value ?? new List<string>()); // Handle null input
            if (!currentSet.SetEquals(newSet))
            {
                 Debug.Log($"[SpaceCraft] Setter: Updating SelectedItemIds (Count: {newSet.Count})");
                _selectedItemIds = new List<string>(newSet); // Store a copy defensively
                selectedItemsChanged = true; // Set flag because state list changed
                UpdateSelectionVisuals(); 
            }
        }
    }

    public List<string> HighlightedItemIds
    {
        get => _highlightedItemIds;
        set
        {
            // Optimization: If a change is already pending, don't re-evaluate
            if (highlightedItemsChanged) return;

            // For highlights, order and duplicates matter, so use the helper
            var newValue = value ?? new List<string>();
            if (!AreEquivalentHighlightLists(_highlightedItemIds, newValue)) 
            {
                Debug.Log($"[SpaceCraft] Setter: Updating HighlightedItemIds (Count: {newValue.Count})");
                _highlightedItemIds = new List<string>(newValue); // Store a copy
                highlightedItemsChanged = true; // Set flag because state list changed
                UpdateHighlightVisuals();
            }
        }
    }
    
    // Helper to compare highlight lists (order doesn't matter, count does)
    private bool AreEquivalentHighlightLists(List<string> list1, List<string> list2)
    {
        if (list1.Count != list2.Count) return false;
        var counts1 = list1.GroupBy(id => id).ToDictionary(g => g.Key, g => g.Count());
        var counts2 = list2.GroupBy(id => id).ToDictionary(g => g.Key, g => g.Count());
        if (counts1.Count != counts2.Count) return false;
        foreach (var kvp in counts1)
        {
            if (!counts2.TryGetValue(kvp.Key, out int count2) || kvp.Value != count2)
            {
                return false;
            }
        }
        return true;
    }

    // Configuration
    public bool multiSelectEnabled = false;
    
    // Create events to notify Bridge when there are changes
    public bool selectedItemsChanged = false;
    public bool highlightedItemsChanged = false;

    // RENAMED: Event name for when content is processed
    private const string ContentLoadedEvent = "ContentLoaded";

    private void Awake()
    {
        Debug.Log("SpaceCraft Awake");

        // Singleton pattern - only allow one instance
        if (spaceCraft != null && spaceCraft != this)
        {
            Debug.LogWarning("More than one SpaceCraft found in the scene. Only one should exist.");
            Destroy(this);
            return;
        }
        
        spaceCraft = this;
        
        // Cache references if not assigned in inspector - use GetComponent since they're on the same GameObject
        if (inputManager == null)
            inputManager = GetComponent<InputManager>();
        
        if (brewster == null)
            brewster = GetComponent<Brewster>();
        
        // Check for missing components
        if (inputManager == null)
            Debug.LogError("SpaceCraft: InputManager reference not found!");
        
        if (brewster == null)
            Debug.LogError("SpaceCraft: Brewster reference not found!");
        
        if (collectionsView == null)
            Debug.LogError("SpaceCraft: CollectionsView reference not found!");
    }
    
    private void FixedUpdate()
    {
        // Check if content has been updated via the Bridge
        if (content == null)
        {
            return;
        }

        Debug.Log("SpaceCraft FixedUpdate processing new content");

        // Store the new content and clear the input field immediately
        var newContent = content;
        content = null; // Prevent reprocessing in the next frame
        
        // Clear any existing views before loading new data
        collectionsView?.ClearAllViews();
        
        // Load the content data into Brewster
        brewster?.LoadContentFromJson(newContent);
            
        // Display all collections after loading is complete (assuming Brewster organizes it)
        collectionsView?.DisplayAllCollections();

        // --- Select the first item automatically ---
        if (collectionsView != null) 
        {
            string firstItemId = collectionsView.GetFirstDisplayedItemId(); // Assumes this method exists
            if (!string.IsNullOrEmpty(firstItemId))
            {
                Debug.Log($"[SpaceCraft] Automatically selecting first item: {firstItemId}");
                // Ensure selection list is clear before selecting the first item
                if (SelectedItemIds.Count > 0) { 
                     SelectedItemIds.Clear(); // Use internal field to avoid immediate visual update loop
                     selectedItemsChanged = true; // Ensure the change is flagged
                 }
                // Update call to pass default controller info
                SelectItem("auto_select", "System", firstItemId);
                
                // Also highlight the first item
                HighlightItem("auto_select", "System", firstItemId);
            }
            else
            {
                Debug.Log("[SpaceCraft] No first item found to select automatically.");
            }
        }
        // -------------------------------------------

        // Notify JS that the content has been loaded and processed
        SendEventName(ContentLoadedEvent);
    }
    
    /// <summary>
    /// Select an item by ID. Will apply constraints before selecting.
    /// </summary>
    public void SelectItem(string controllerId, string controllerName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        // Log controller info
        Debug.Log($"[SpaceCraft] SelectItem API called by {controllerName}({controllerId}): {itemId}");

        List<string> newList;
        // Handle single selection mode
        if (!multiSelectEnabled)
        {
            // If it's already the only selected item, do nothing extra
            if (_selectedItemIds.Count == 1 && _selectedItemIds[0] == itemId) return;
            // Create a new list containing only this item
            newList = new List<string> { itemId };
        }
        else
        {   // Multi-select: Add if not already present
            if (_selectedItemIds.Contains(itemId)) return; // Already selected
            // Create a new list with the added item
            newList = new List<string>(_selectedItemIds);
            newList.Add(itemId);
        }
        // Assign the new list to the property to trigger setter logic
        SelectedItemIds = newList;
    }
    
    /// <summary>
    /// Deselect an item by ID
    /// </summary>
    public void DeselectItem(string controllerId, string controllerName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId) || !_selectedItemIds.Contains(itemId)) return;
         // Log controller info
        Debug.Log($"[SpaceCraft] DeselectItem API called by {controllerName}({controllerId}): {itemId}");
        
        // Create a new list without the item
        List<string> newList = new List<string>(_selectedItemIds);
        newList.Remove(itemId);
        // Assign the new list to the property
        SelectedItemIds = newList;
    }
    
    /// <summary>
    /// Deselect all items
    /// </summary>
    public void DeselectAllItems()
    {
        Debug.Log("[SpaceCraft] DeselectAllItems API called");
        if (_selectedItemIds.Count > 0)
        {
            // Assign an empty list to the property
            SelectedItemIds = new List<string>();
        }
    }
    
    /// <summary>
    /// Toggles the selection of the first currently selected item.
    /// If nothing is selected, it tries to toggle the selection of the last focused item.
    /// If there was no last focused item, it selects the first available item.
    /// </summary>
    public void ToggleCurrentItemSelection(string controllerId, string controllerName, string itemId = null)
    {
        string logPrefix = "[SpaceCraft ToggleCurrentItemSelection]";
        Debug.Log($"{logPrefix} Called by {controllerName}({controllerId}) with itemId: {itemId}");

        string targetItemId = itemId;

        if (string.IsNullOrEmpty(targetItemId))
        {
            if (SelectedItemIds.Count > 0)
            {
                targetItemId = SelectedItemIds[0];
                Debug.Log($"{logPrefix} No itemId provided. Using first selected item: {targetItemId}");
            }
            else if (collectionsView != null &&
                     !string.IsNullOrEmpty(collectionsView.lastSelectedItemOrHighlightId) &&
                     FindItemViewById(collectionsView.lastSelectedItemOrHighlightId) != null)
            {
                targetItemId = collectionsView.lastSelectedItemOrHighlightId;
                Debug.Log($"{logPrefix} Using last focused item: {targetItemId}");
            }
            else if (collectionsView != null)
            {
                targetItemId = collectionsView.GetFirstDisplayedItemId();
                Debug.Log($"{logPrefix} Using first displayed item: {targetItemId}");
            }
        }

        if (!string.IsNullOrEmpty(targetItemId))
        {
            ToggleItemSelection(controllerId, controllerName, targetItemId);
        }
        else
        {
            Debug.LogWarning($"{logPrefix} No valid item found to toggle selection.");
        }
    }

    public void ToggleCurrentItemHighlight(string controllerId, string controllerName)
    {
        string logPrefix = "[SpaceCraft ToggleCurrentItemHighlight]";
        Debug.Log($"{logPrefix} Called by {controllerName}({controllerId}).");

        if (HighlightedItemIds.Count > 0)
        {
            // If items are highlighted, toggle the first one (remove one instance)
            string firstHighlightedId = HighlightedItemIds[0];
            Debug.Log($"{logPrefix} Found highlighted items. Toggling first one: {firstHighlightedId}");
            UnhighlightItem(controllerId, controllerName, firstHighlightedId);
        }
        else
        {   
            // If nothing is highlighted, try using the last focused item
            Debug.Log($"{logPrefix} No items highlighted. Checking last focused item.");
            string targetItemId = null;
            if (collectionsView != null && 
                !string.IsNullOrEmpty(collectionsView.lastSelectedItemOrHighlightId) && 
                FindItemViewById(collectionsView.lastSelectedItemOrHighlightId) != null) // Check if item still exists
            {
                targetItemId = collectionsView.lastSelectedItemOrHighlightId;
                Debug.Log($"{logPrefix} Found valid last focused item: {targetItemId}. Highlighting it.");
                HighlightItem(controllerId, controllerName, targetItemId); // Highlight last focused
            }
            else
            {   
                // If no valid last focused item, highlight the first displayed item
                 Debug.Log($"{logPrefix} No valid last focused item. Attempting to highlight first displayed item.");
                if (collectionsView != null)
                {
                    targetItemId = collectionsView.GetFirstDisplayedItemId();
                    if (!string.IsNullOrEmpty(targetItemId))
                    {
                        Debug.Log($"{logPrefix} Highlighting first displayed item: {targetItemId}");
                        // Use SetHighlightedItems to ensure only this one is highlighted
                        SetHighlightedItems(controllerId, controllerName, new List<string> { targetItemId }); 
                    }
                    else
                    {
                        Debug.LogWarning($"{logPrefix} No first displayed item found to highlight.");
                    }
                }
                else
                {
                     Debug.LogWarning($"{logPrefix} Cannot highlight first item because CollectionsView is null.");
                }
            }
        }
    }
    
    /// <summary>
    /// Toggle selection state of an item
    /// </summary>
    public void ToggleItemSelection(string controllerId, string controllerName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        Debug.Log($"[SpaceCraft] ToggleItemSelection API called by {controllerName}({controllerId}): {itemId}");

        List<string> newList = new List<string>(_selectedItemIds);
        if (newList.Contains(itemId))
        {   // Item is selected, so deselect it
            Debug.Log($"[SpaceCraft] Toggle: Deselecting {itemId}");
            newList.Remove(itemId);
        }
        else
        {   // Item is not selected, so select it
             Debug.Log($"[SpaceCraft] Toggle: Selecting {itemId}");
           if (!multiSelectEnabled)
            {
                // Single select mode: clear list before adding
                newList.Clear();
            }
            newList.Add(itemId);
        }
        // Assign the potentially modified list back to the property
        SelectedItemIds = newList;
    }
    
    /// <summary>
    /// Set a specific set of items as selected.
    /// </summary>
    public void SetSelectedItems(string controllerId, string controllerName, List<string> itemIds)
    {
        List<string> newList = itemIds ?? new List<string>();
         // Log controller info
        Debug.Log($"[SpaceCraft] SetSelectedItems API called by {controllerName}({controllerId}) with {newList.Count} items.");
        
        // Enforce single selection mode if active
        if (!multiSelectEnabled && newList.Count > 1)
        {
            string lastItem = newList.LastOrDefault(); // Keep only the last one
            newList = string.IsNullOrEmpty(lastItem) ? new List<string>() : new List<string> { lastItem };
        }
        
        // Assign the validated list to the property
        SelectedItemIds = newList;
    }
    
    /// <summary>
    /// Add multiple items to the selection
    /// </summary>
    public void AddSelectedItems(string controllerId, string controllerName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0) return;
         // Log controller info
        Debug.Log($"[SpaceCraft] AddSelectedItems API called by {controllerName}({controllerId}) with {itemIds.Count} items.");

        // Handle single select mode separately
        if (!multiSelectEnabled)
        {
            // Call the primary SelectItem method
            SelectItem(controllerId, controllerName, itemIds.LastOrDefault());
            return;
        }
        
        // Multi-select mode: add new unique items
        List<string> newList = new List<string>(_selectedItemIds);
        bool changed = false;
        foreach (string itemId in itemIds)
        {   
            if (!string.IsNullOrEmpty(itemId) && !newList.Contains(itemId))
            {
                newList.Add(itemId);
                changed = true;
            }
        }
        
        if (changed)
        {
            SelectedItemIds = newList; // Assign if changes were made
        }
    }
    
    /// <summary>
    /// Remove multiple items from the selection
    /// </summary>
    public void RemoveSelectedItems(string controllerId, string controllerName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0 || _selectedItemIds.Count == 0) return;
        // Log controller info
        Debug.Log($"[SpaceCraft] RemoveSelectedItems API called by {controllerName}({controllerId}) with {itemIds.Count} items.");

        List<string> newList = new List<string>(_selectedItemIds);
        bool changed = false;
        foreach (string itemId in itemIds)
        {
             if (!string.IsNullOrEmpty(itemId) && newList.Remove(itemId))
            {
                changed = true;
            }
        }
        
        if (changed)
        {
            SelectedItemIds = newList; // Assign if changes were made
        }
    }
    
    /// <summary>
    /// Toggle multi-select mode
    /// </summary>
    public void SetMultiSelectMode(bool enable)
    {
        if (inputManager == null) return;
        Debug.Log($"[SpaceCraft] SetMultiSelectMode called: {enable}");
        
        if (multiSelectEnabled != enable)
        {
            multiSelectEnabled = enable;
            
            // If turning off multi-select and we have multiple selections, keep only the first one
            if (!enable && SelectedItemIds.Count > 1)
            {
                string keepItemId = SelectedItemIds[0];
                SelectedItemIds = new List<string> { keepItemId }; // Directly assign new list via setter
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
            
        int count = 0;
        foreach (string id in HighlightedItemIds)
        {
            if (id == itemId)
            {
                count++;
            }
        }
        return count;
    }
    
    /// <summary>
    /// Set which items are highlighted.
    /// </summary>
    public void SetHighlightedItems(string controllerId, string controllerName, List<string> itemIds)
    {
        Debug.Log($"[SpaceCraft] SetHighlightedItems API called by {controllerName}({controllerId}) with {itemIds?.Count ?? 0} items.");
        
        // Assign the new list to the property to trigger updates if different
        HighlightedItemIds = itemIds ?? new List<string>(); 
    }
    
    /// <summary>
    /// Add multiple items to highlighted state
    /// </summary>
    public void AddHighlightedItems(string controllerId, string controllerName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0) return;
        Debug.Log($"[SpaceCraft] AddHighlightedItems API called by {controllerName}({controllerId}) with {itemIds.Count} items.");

        // Create new list, add items, and assign back to property
        List<string> newList = new List<string>(HighlightedItemIds);
        newList.AddRange(itemIds); // Add all specified items
        HighlightedItemIds = newList; // Assign to trigger setter logic (comparison & visual update)
    }
    
    /// <summary>
    /// Remove multiple items from highlighted state
    /// </summary>
    public void RemoveHighlightedItems(string controllerId, string controllerName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0 || HighlightedItemIds.Count == 0) return;
        Debug.Log($"[SpaceCraft] RemoveHighlightedItems API called by {controllerName}({controllerId}) with {itemIds.Count} items.");

        // Create new list and remove one instance of each specified item
        List<string> newList = new List<string>(HighlightedItemIds);
        bool changed = false;
        foreach (string itemId in itemIds)
        {
             if (!string.IsNullOrEmpty(itemId) && newList.Remove(itemId)) // Remove first occurrence
            {
                changed = true;
            }
        }
        
        if (changed)
        {
            HighlightedItemIds = newList; // Assign if changes were made to trigger setter
        }
    }
    
    /// <summary>
    /// Highlight a specific item by ID
    /// </summary>
    public void HighlightItem(string controllerId, string controllerName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        // Delegate to AddHighlightedItems
        AddHighlightedItems(controllerId, controllerName, new List<string>{ itemId }); 
    }
    
    /// <summary>
    /// Remove highlight from a specific item by ID
    /// </summary>
    public void UnhighlightItem(string controllerId, string controllerName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        // Delegate to RemoveHighlightedItems
        RemoveHighlightedItems(controllerId, controllerName, new List<string>{ itemId });
    }
    
    /// <summary>
    /// Navigate to a specific collection
    /// </summary>
    public void NavigateToCollection(string collectionId)
    {
        if (collectionsView == null || string.IsNullOrEmpty(collectionId))
            return;
            
        collectionsView.ShowCollection(collectionId);
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
        SendEventName("MultiSelectChanged");
    }

    /// <summary>
    /// Toggles the selection of the first highlighted item.
    /// If no item is highlighted, it first highlights the first available item and then toggles its selection.
    /// </summary>
    public void ToggleHighlightedItemSelection(string controllerId, string controllerName)
    {
        string logPrefix = "[SpaceCraft ToggleHighlightedItemSelection]";
        Debug.Log($"{logPrefix} Called by {controllerName}({controllerId}).");

        string targetItemId = null;

        if (HighlightedItemIds.Count > 0)
        {
            // If items are highlighted, use the first one
            targetItemId = HighlightedItemIds[0];
            Debug.Log($"{logPrefix} Found highlighted item. Toggling selection for: {targetItemId}");
            ToggleItemSelection(controllerId, controllerName, targetItemId);
        }
        else
        {
            // If nothing is highlighted, highlight the first item and toggle its selection
            Debug.Log($"{logPrefix} No items highlighted. Attempting to highlight and toggle selection of first item.");
            
            if (collectionsView != null)
            {
                targetItemId = collectionsView.GetFirstDisplayedItemId();
                if (!string.IsNullOrEmpty(targetItemId))
                {
                    Debug.Log($"{logPrefix} Found first item: {targetItemId}. Highlighting and toggling selection.");
                    
                    // First highlight the item
                    HighlightItem(controllerId, controllerName, targetItemId);
                    
                    // Then toggle its selection
                    ToggleItemSelection(controllerId, controllerName, targetItemId);
                }
                else
                {
                    Debug.LogWarning($"{logPrefix} No first item found to highlight and toggle selection.");
                }
            }
            else
            {
                Debug.LogWarning($"{logPrefix} Cannot highlight and toggle selection because CollectionsView is null.");
            }
        }
    }

    /// <summary>
    /// Find an ItemView by its ID, handling null cases gracefully
    /// </summary>
    private ItemView FindItemSafe(string itemId)
    {
        if (string.IsNullOrEmpty(itemId) || collectionsView == null)
        {
            return null;
        }
        
        ItemView itemView = FindItemViewById(itemId); // Call local method
        if (itemView == null)
        {
            Debug.LogWarning($"[SpaceCraft] FindItemSafe: Item with ID '{itemId}' not found via CollectionsView.");
        }
        
        return itemView;
    }
    
    /// <summary>
    /// Finds an ItemView by its ID by delegating to CollectionsView.
    /// </summary>
    public ItemView FindItemViewById(string id)
    {
        return collectionsView?.FindItemViewById(id);
    }

    // ================== CAMERA VIBRATION ======================
    
    /// <summary>
    /// Vibrates the camera with the specified pattern.
    /// Matches the Web Vibration API parameters: either a single duration in milliseconds,
    /// or an array of alternating vibration/pause durations.
    /// Currently just logs the parameters, will be enhanced later to actually vibrate the camera.
    /// </summary>
    /// <param name="pattern">A single duration in milliseconds, or an array of alternating vibration/pause durations</param>
    /// <returns>True if the request was received and processed</returns>
    public bool VibrateCamera(object pattern)
    {
        // Log the vibration pattern details
        if (pattern is int duration)
        {
            Debug.Log($"[Camera Vibration] Single duration: {duration}ms");
        }
        else if (pattern is int[] durations)
        {
            string patternString = string.Join(", ", durations);
            Debug.Log($"[Camera Vibration] Pattern: [{patternString}]ms");
        }
        else if (pattern is List<int> durationsList)
        {
            string patternString = string.Join(", ", durationsList);
            Debug.Log($"[Camera Vibration] Pattern: [{patternString}]ms");
        }
        else
        {
            Debug.LogWarning($"[Camera Vibration] Invalid pattern type: {pattern?.GetType().Name ?? "null"}");
            return false;
        }
        
        // TODO: Implement actual camera vibration effect
        
        return true;
    }
    
    /// <summary>
    /// Bridge-accessible version of VibrateCamera that accepts a JObject with the pattern.
    /// </summary>
    public void vibrateCamera(JObject data)
    {
        if (data == null) return;
        
        try
        {
            if (data.TryGetValue("duration", out JToken durationToken) && durationToken.Type == JTokenType.Integer)
            {
                // Single duration
                int duration = durationToken.Value<int>();
                VibrateCamera(duration);
            }
            else if (data.TryGetValue("pattern", out JToken patternToken) && patternToken.Type == JTokenType.Array)
            {
                // Pattern of durations
                List<int> pattern = patternToken.ToObject<List<int>>();
                VibrateCamera(pattern);
            }
            else
            {
                Debug.LogWarning("[Camera Vibration] Invalid vibration data format");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Camera Vibration] Error processing vibration request: {ex.Message}");
        }
    }

    /// <summary>
    /// Move the selection in a specific direction.
    /// </summary>
    public void MoveSelection(string controllerId, string controllerName, string direction)
    {
        // Expects "north", "south", "east", "west" from controller
        Debug.Log($"[SpaceCraft] MoveSelection called with controllerId: {controllerId}, controllerName: {controllerName}, direction: {direction}");
        // Pass direction directly to CollectionsView, assuming it now handles these terms
        collectionsView?.MoveSelection(controllerId, controllerName, direction); 
    }

    /// <summary>
    /// Move the highlight in a specific direction.
    /// </summary>
    public void MoveHighlight(string controllerId, string controllerName, string direction)
    {
        // Expects "north", "south", "east", "west" from controller
        Debug.Log($"[SpaceCraft] MoveHighlight called with controllerId: {controllerId}, controllerName: {controllerName}, direction: {direction}");
        // Pass direction directly to CollectionsView, assuming it now handles these terms
        collectionsView?.MoveHighlight(controllerId, controllerName, direction);
    }

    /// <summary>
    /// Bridge method to calculate the next item ID in a given direction without moving the selection.
    /// </summary>
    /// <param name="data">JObject containing 'currentItemId' (string) and 'direction' (string).</param>
    /// <returns>The ID of the next item, or null if no move is possible.</returns>
    public string getNextItemId(JObject data)
    {
        if (collectionsView == null || data == null) 
        {
            Debug.LogError("[SpaceCraft:getNextItemId] CollectionsView is null or data is null.");
            return null; 
        }

        string currentId = data.Value<string>("currentItemId");
        string direction = data.Value<string>("direction"); // Expects "north", "south", "east", "west"

        if (string.IsNullOrEmpty(currentId) || string.IsNullOrEmpty(direction))
        {
            Debug.LogWarning("[SpaceCraft:getNextItemId] Missing 'currentItemId' or 'direction' in data.");
            return null;
        }

        // Call the calculation method on CollectionsView, passing the direction directly
        return collectionsView.GetNextItemIdInDirection(currentId, direction);
    }

    /// <summary>
    /// Iterates through all known ItemViews and updates their selected state based on the selectedItemIds list.
    /// </summary>
    public void UpdateSelectionVisuals()
    {
        if (inputManager == null) return;

        Debug.Log($"[SpaceCraft] Updating selection visuals for {SelectedItemIds.Count} selected items.");
        List<ItemView> allItemViews = inputManager.GetAllItemViews(); 
        
        foreach (ItemView view in allItemViews)
        {
            if (view == null || view.Model == null) continue;
            
            bool shouldBeSelected = SelectedItemIds.Contains(view.Model.Id);
            if (view.IsSelected != shouldBeSelected)
            {
                 view.SetSelected(shouldBeSelected); 
            }
        }
    }

    /// <summary>
    /// Iterates through all known ItemViews and updates their highlight count based on the HighlightedItemIds list.
    /// </summary>
    public void UpdateHighlightVisuals()
    {
        if (inputManager == null) return;
        
        Debug.Log($"[SpaceCraft] Updating highlight visuals for {HighlightedItemIds.Count} total highlights.");
        List<ItemView> allItemViews = inputManager.GetAllItemViews(); 
        
        // Calculate counts first 
        Dictionary<string, int> highlightCounts = new Dictionary<string, int>();
        foreach (string id in HighlightedItemIds)
        {
            if (highlightCounts.ContainsKey(id)) { highlightCounts[id]++; }
            else { highlightCounts[id] = 1; }
        }

        foreach (ItemView view in allItemViews)
        {
            if (view == null || view.Model == null) continue;
            
            int newCount = highlightCounts.ContainsKey(view.Model.Id) ? highlightCounts[view.Model.Id] : 0;
            if (view.CurrentHighlightCount != newCount) 
            {
                view.SetHighlightCount(newCount);
            }
        }
    }

    // ================== BRIDGE API FORWARDERS TO INPUT MANAGER ======================

    /// <summary>
    /// Bridge forwarder: Receives position DELTA from Bridge and passes it to InputManager.
    /// </summary>
    public void PushCameraPosition(string controllerId, string controllerName, float panXDelta, float panYDelta)
    {
        if (inputManager != null)
        {
             inputManager.PushCameraPosition(controllerId, controllerName, panXDelta, panYDelta);
        }
        else
        {
            Debug.LogWarning("[SpaceCraft] PushCameraPosition called but InputManager is null.");
        }
    }

    /// <summary>
    /// Bridge forwarder: Receives zoom DELTA from Bridge and passes it to InputManager.
    /// </summary>
    public void PushCameraZoom(string controllerId, string controllerName, float zoomDelta)
    {
        if (inputManager != null)
        {
            inputManager.PushCameraZoom(controllerId, controllerName, zoomDelta);
        }
        else
        {
            Debug.LogWarning("[SpaceCraft] PushCameraZoom called but InputManager is null.");
        }
    }

    /// <summary>
    /// Bridge forwarder: Receives velocity PUSH as 2D deltas from Bridge and passes it to InputManager.
    /// </summary>
    public void PushCameraVelocity(string controllerId, string controllerName, float panXDelta, float panYDelta)
    {
        if (inputManager != null)
        {
            inputManager.PushCameraVelocity(controllerId, controllerName, panXDelta, panYDelta);
        }
        else
        {
            Debug.LogWarning("[SpaceCraft] PushCameraVelocity called but InputManager is null.");
        }
    }

    /// <summary>
    /// Send events only when changes have occurred - reduce bridge traffic
    /// </summary>
    private void SendEvents()
    {
        // Send events only when changes have occurred - reduce bridge traffic
        if (selectedItemsChanged)
        {
            Debug.Log("SpaceCraft: SelectedItemsChanged: selectedItemIds: " + string.Join(",", SelectedItemIds));
            SendEventName("SelectedItemsChanged");
            selectedItemsChanged = false; // Reset flag here
        }
        
        if (highlightedItemsChanged)
        {
            Debug.Log("SpaceCraft: HighlightedItemsChanged: highlightedItemIds: " + string.Join(",", HighlightedItemIds));
            SendEventName("HighlightedItemsChanged");
            highlightedItemsChanged = false; // Reset flag here
        }
    }

    // ================== INPUT MANAGER EVENT HANDLERS ======================
    
    // Handle events from InputManager
    public void OnItemSelected(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        SelectItem("local_input", "Local Input", item.Model.Id); // Call the main SelectItem logic
    }
    
    public void OnItemDeselected(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        DeselectItem("local_input", "Local Input", item.Model.Id); // Call the main DeselectItem logic
    }
    
    public void OnItemHighlightStart(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        HighlightItem("local_input", "Local Input", item.Model.Id); // Call the public API method
    }
    
    public void OnItemHighlightEnd(ItemView item)
    {
        if (item?.Model?.Id == null) return;
        UnhighlightItem("local_input", "Local Input", item.Model.Id); // Call the public API method
    }

    /// <summary>
    /// Toggle highlight state of an item
    /// </summary>
    public void ToggleItemHighlight(string controllerId, string controllerName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        Debug.Log($"[SpaceCraft] ToggleItemHighlight API called by {controllerName}({controllerId}): {itemId}");

        List<string> newList = new List<string>(HighlightedItemIds);
        if (newList.Contains(itemId))
        {   // Item is highlighted, so unhighlight it
            Debug.Log($"[SpaceCraft] Toggle: Unhighlighting {itemId}");
            newList.Remove(itemId);
        }
        else
        {   // Item is not highlighted, so highlight it
            Debug.Log($"[SpaceCraft] Toggle: Highlighting {itemId}");
            newList.Add(itemId);
        }
        // Assign the potentially modified list back to the property
        HighlightedItemIds = newList;
    }
}
