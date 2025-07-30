using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using System;
using System.Reflection;

/// <summary>
/// Attribute to mark public parameters that should be exposed to JavaScript controllers
/// with metadata for creating dynamic control panels
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class ExposedParameterAttribute : Attribute
{
    public string DisplayName { get; set; }
    public string Category { get; set; }
    public string Description { get; set; }
    public float Min { get; set; } = float.MinValue;
    public float Max { get; set; } = float.MaxValue;
    public float Step { get; set; } = 0.01f;
    public string Unit { get; set; }
    public bool ReadOnly { get; set; } = false;
    
    public ExposedParameterAttribute(string displayName = null)
    {
        DisplayName = displayName;
    }
}

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
                Debug.Log($"[SpaceCraft] Setter: SelectedItemIds updated to {string.Join(", ", _selectedItemIds)}");
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
                Debug.Log($"[SpaceCraft] Setter: HighlightedItemIds updated to {string.Join(", ", _highlightedItemIds)}");
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
    
    /// <summary>
    /// Returns metadata for all parameters marked with ExposedParameter attribute.
    /// Used by JavaScript controllers to build dynamic parameter control panels.
    /// Property is PascalCase but will serialize to camelCase for JavaScript.
    /// </summary>
    [Newtonsoft.Json.JsonProperty("parameterMetaData")]
    public JArray ParameterMetaData
    {
        get
        {
            var metadataArray = new JArray();
            
            // Get InputManager parameters if available
            if (inputManager != null)
            {
                CollectParametersFromObject(inputManager, "InputManager", metadataArray);
            }
            
            // Get SpaceCraft's own parameters
            CollectParametersFromObject(this, "SpaceCraft", metadataArray);
            
            // Could add other components here as needed
            
            return metadataArray;
        }
    }
    
    /// <summary>
    /// Helper method to collect parameter metadata from an object using reflection
    /// </summary>
    private void CollectParametersFromObject(object obj, string componentName, JArray metadataArray)
    {
        Type type = obj.GetType();
        
        // Get all public fields and properties
        var members = type.GetMembers(BindingFlags.Public | BindingFlags.Instance)
            .Where(m => m.MemberType == MemberTypes.Field || m.MemberType == MemberTypes.Property);
        
        foreach (var member in members)
        {
            // Check for our custom attribute
            var attr = member.GetCustomAttribute<ExposedParameterAttribute>();
            if (attr == null) continue;
            
            // Get member info
            string memberName = member.Name;
            Type memberType = null;
            object currentValue = null;
            bool canWrite = true;
            
            if (member is FieldInfo field)
            {
                memberType = field.FieldType;
                currentValue = field.GetValue(obj);
                canWrite = !field.IsInitOnly && !field.IsLiteral;
            }
            else if (member is PropertyInfo prop)
            {
                memberType = prop.PropertyType;
                if (prop.CanRead)
                {
                    try 
                    {
                        currentValue = prop.GetValue(obj);
                    }
                    catch 
                    {
                        // Some properties might throw exceptions
                        currentValue = null;
                    }
                }
                canWrite = prop.CanWrite;
            }
            
            // Check for Range attribute for numeric types
            float? min = null, max = null;
            var rangeAttr = member.GetCustomAttribute<RangeAttribute>();
            if (rangeAttr != null)
            {
                min = rangeAttr.min;
                max = rangeAttr.max;
            }
            
            // Use Range values from ExposedParameter if Range attribute not found
            if (!min.HasValue && attr.Min != float.MinValue)
                min = attr.Min;
            if (!max.HasValue && attr.Max != float.MaxValue)
                max = attr.Max;
            
            // Get tooltip from Unity's Tooltip attribute if description not provided
            string description = attr.Description;
            if (string.IsNullOrEmpty(description))
            {
                var tooltipAttr = member.GetCustomAttribute<TooltipAttribute>();
                if (tooltipAttr != null)
                    description = tooltipAttr.tooltip;
            }
            
            // Create metadata object
            var metadata = new JObject
            {
                ["component"] = componentName,
                ["name"] = memberName,
                ["displayName"] = attr.DisplayName ?? memberName,
                ["type"] = GetTypeString(memberType),
                ["currentValue"] = currentValue != null ? JToken.FromObject(currentValue) : null,
                ["canWrite"] = canWrite && !attr.ReadOnly,
                ["category"] = attr.Category ?? "General",
                ["unityType"] = "unity",
                ["path"] = memberName
            };
            
            // Add optional fields if they have values
            if (!string.IsNullOrEmpty(description))
                metadata["description"] = description;
                
            if (min.HasValue)
                metadata["min"] = min.Value;
                
            if (max.HasValue)
                metadata["max"] = max.Value;
                
            if (attr.Step != 0.01f)
                metadata["step"] = attr.Step;
                
            if (!string.IsNullOrEmpty(attr.Unit))
                metadata["unit"] = attr.Unit;
                
            metadataArray.Add(metadata);
        }
    }
    
    /// <summary>
    /// Convert C# type to a string representation for JavaScript
    /// </summary>
    private string GetTypeString(Type type)
    {
        if (type == typeof(float) || type == typeof(double) || type == typeof(decimal))
            return "float";
        if (type == typeof(int) || type == typeof(long) || type == typeof(short) || type == typeof(byte))
            return "int";
        if (type == typeof(bool))
            return "bool";
        if (type == typeof(string))
            return "string";
        if (type == typeof(Vector2))
            return "vector2";
        if (type == typeof(Vector3))
            return "vector3";
        if (type == typeof(Color))
            return "color";
        if (type.IsEnum)
            return "enum";
        
        return type.Name.ToLower();
    }

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
                     Debug.Log($"[SpaceCraft] Setter: SelectedItemIds cleared to {string.Join(", ", SelectedItemIds)}");
                }
                // Update call to pass default controller info
                SelectItem("auto_select", "System", firstItemId);
                
                // SelectItem now automatically highlights the selected item, no need for separate highlight
            }
            else
            {
                Debug.Log("[SpaceCraft] No first item found to select automatically.");
            }
        }
        // -------------------------------------------

        // Notify JS that the content has been loaded and processed
        SendEventName(ContentLoadedEvent);
        
        // Clear the title display after loading
        if (collectionsView?.itemInfoPanel != null)
        {
            collectionsView.itemInfoPanel.ClearInfo();
            collectionsView.itemInfoPanel.gameObject.SetActive(true); // Keep it active but empty
        }
    }
    
    private void LateUpdate()
    {
        SendEvents();
    }

    /// <summary>
    /// Select an item by ID. Will apply constraints before selecting.
    /// </summary>
    public void SelectItem(string clientId, string clientName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        // Log client info
        Debug.Log($"[SpaceCraft] SelectItem API called by {clientName}({clientId}): {itemId}");

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
        
        // When selecting an item, also set it as the only highlighted item
        HighlightedItemIds = new List<string> { itemId };
    }
    
    /// <summary>
    /// Deselect an item by ID
    /// </summary>
    public void DeselectItem(string clientId, string clientName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId) || !_selectedItemIds.Contains(itemId)) return;
         // Log client info
        Debug.Log($"[SpaceCraft] DeselectItem API called by {clientName}({clientId}): {itemId}");
        
        // Create a new list without the item
        List<string> newList = new List<string>(_selectedItemIds);
        newList.Remove(itemId);
        // Assign the new list to the property
        SelectedItemIds = newList;
        
        // Also remove from highlights if it's there
        if (_highlightedItemIds.Contains(itemId))
        {
            List<string> newHighlights = new List<string>(_highlightedItemIds);
            newHighlights.Remove(itemId);
            HighlightedItemIds = newHighlights;
        }
        
        // If we still have selected items, highlight the first one
        if (newList.Count > 0)
        {
            HighlightedItemIds = new List<string> { newList[0] };
        }
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
            // Also clear highlights
            HighlightedItemIds = new List<string>();
        }
    }
    
    /// <summary>
    /// Toggles the selection of the first currently selected item.
    /// If nothing is selected, it tries to toggle the selection of the last focused item.
    /// If there was no last focused item, it selects the first available item.
    /// </summary>
    public void ToggleCurrentItemSelection(string clientId, string clientName, string screenId, string itemId = null)
    {
        string logPrefix = "[SpaceCraft ToggleCurrentItemSelection]";
        Debug.Log($"{logPrefix} Called by {clientName}({clientId}) with itemId: {itemId}");

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
            ToggleItemSelection(clientId, clientName, screenId, targetItemId);
        }
        else
        {
            Debug.LogWarning($"{logPrefix} No valid item found to toggle selection.");
        }
    }

    /// <summary>
    /// Toggle selection state of an item
    /// </summary>
    public void ToggleItemSelection(string clientId, string clientName, string screenId, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        Debug.Log($"[SpaceCraft] ToggleItemSelection API called by clientId: {clientId}, clientName: {clientName}, screenId: {screenId}, itemId: {itemId}");

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
        
        // Sync highlight with selection
        if (newList.Contains(itemId))
        {
            // Item is now selected, make it the only highlighted item
            HighlightedItemIds = new List<string> { itemId };
        }
        else if (HighlightedItemIds.Contains(itemId))
        {
            // Item was deselected, remove it from highlights too
            List<string> newHighlights = new List<string>(HighlightedItemIds);
            newHighlights.Remove(itemId);
            HighlightedItemIds = newHighlights;
        }
    }
    
    /// <summary>
    /// Set a specific set of items as selected.
    /// </summary>
    public void SetSelectedItems(string clientId, string clientName, List<string> itemIds)
    {
        List<string> newList = itemIds ?? new List<string>();
         // Log client info
        Debug.Log($"[SpaceCraft] SetSelectedItems API called by {clientName}({clientId}) with {newList.Count} items.");
        
        // Enforce single selection mode if active
        if (!multiSelectEnabled && newList.Count > 1)
        {
            string lastItem = newList.LastOrDefault(); // Keep only the last one
            newList = string.IsNullOrEmpty(lastItem) ? new List<string>() : new List<string> { lastItem };
        }
        
        // Assign the validated list to the property
        SelectedItemIds = newList;
        
        // Sync highlight with selection - highlight the first selected item if any
        if (newList.Count > 0)
        {
            HighlightedItemIds = new List<string> { newList[0] };
        }
        else
        {
            HighlightedItemIds = new List<string>();
        }
    }
    
    /// <summary>
    /// Add multiple items to the selection
    /// </summary>
    public void AddSelectedItems(string clientId, string clientName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0) return;
         // Log client info
        Debug.Log($"[SpaceCraft] AddSelectedItems API called by {clientName}({clientId}) with {itemIds.Count} items.");

        // Handle single select mode separately
        if (!multiSelectEnabled)
        {
            // Call the primary SelectItem method (which will handle highlight sync)
            SelectItem(clientId, clientName, itemIds.LastOrDefault());
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
            
            // Highlight the first selected item
            if (newList.Count > 0)
            {
                HighlightedItemIds = new List<string> { newList[0] };
            }
        }
    }
    
    /// <summary>
    /// Remove multiple items from the selection
    /// </summary>
    public void RemoveSelectedItems(string clientId, string clientName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0 || _selectedItemIds.Count == 0) return;
        // Log client info
        Debug.Log($"[SpaceCraft] RemoveSelectedItems API called by {clientName}({clientId}) with {itemIds.Count} items.");

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
            
            // Update highlights - if we still have selected items, highlight the first one
            if (newList.Count > 0)
            {
                HighlightedItemIds = new List<string> { newList[0] };
            }
            else
            {
                HighlightedItemIds = new List<string>();
            }
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
    public void SetHighlightedItems(string clientId, string clientName, List<string> itemIds)
    {
        Debug.Log($"[SpaceCraft] SetHighlightedItems API called by {clientName}({clientId}) with {itemIds?.Count ?? 0} items.");
        
        // Assign the new list to the property to trigger updates if different
        HighlightedItemIds = itemIds ?? new List<string>(); 
    }
    
    /// <summary>
    /// Add multiple items to highlighted state
    /// </summary>
    public void AddHighlightedItems(string clientId, string clientName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0) return;
        Debug.Log($"[SpaceCraft] AddHighlightedItems API called by {clientName}({clientId}) with {itemIds.Count} items.");

        // Create new list, add items, and assign back to property
        List<string> newList = new List<string>(HighlightedItemIds);
        newList.AddRange(itemIds); // Add all specified items
        HighlightedItemIds = newList; // Assign to trigger setter logic (comparison & visual update)
    }
    
    /// <summary>
    /// Remove multiple items from highlighted state
    /// </summary>
    public void RemoveHighlightedItems(string clientId, string clientName, List<string> itemIds)
    {
        if (itemIds == null || itemIds.Count == 0 || HighlightedItemIds.Count == 0) return;
        Debug.Log($"[SpaceCraft] RemoveHighlightedItems API called by {clientName}({clientId}) with {itemIds.Count} items.");

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
    public void HighlightItem(string clientId, string clientName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        // Delegate to AddHighlightedItems
        AddHighlightedItems(clientId, clientName, new List<string>{ itemId }); 
    }
    
    /// <summary>
    /// Remove highlight from a specific item by ID
    /// </summary>
    public void UnhighlightItem(string clientId, string clientName, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        // Delegate to RemoveHighlightedItems
        RemoveHighlightedItems(clientId, clientName, new List<string>{ itemId });
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
    public void ToggleHighlightedItemSelection(string clientId, string clientName, string screenId)
    {
        string logPrefix = "[SpaceCraft ToggleHighlightedItemSelection]";
        Debug.Log($"{logPrefix} Called by {clientName}({clientId}) for screen {screenId}.");

        string targetItemId = null;

        if (HighlightedItemIds.Count > 0)
        {
            // If items are highlighted, use the first one
            targetItemId = HighlightedItemIds[0];
            Debug.Log($"{logPrefix} Found highlighted item. Toggling selection for: {targetItemId}");
            ToggleItemSelection(clientId, clientName, screenId, targetItemId);
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
                    HighlightItem(clientId, clientName, targetItemId);
                    
                    // Then toggle its selection
                    ToggleItemSelection(clientId, clientName, screenId, targetItemId);
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
    /// Applies a scale impulse to the first highlighted item.
    /// This scales the item's instantaneous size (not target size) by the selectionTapScale factor.
    /// </summary>
    public void ApplyTapScaleToHighlightedItem(string clientId, string clientName, string screenId)
    {
        string logPrefix = "[SpaceCraft ApplyTapScaleToHighlightedItem]";
        Debug.Log($"{logPrefix} Called by {clientName}({clientId}) for screen {screenId}.");

        if (HighlightedItemIds.Count > 0)
        {
            string targetItemId = HighlightedItemIds[0];
            ItemView itemView = FindItemViewById(targetItemId);
            
            if (itemView != null && inputManager != null)
            {
                // Apply scale impulse by directly modifying the item's current scale
                float tapScale = inputManager.SelectionTapScale;
                float newScale = itemView.CurrentScale * tapScale;
                
                Debug.Log($"{logPrefix} Applying tap scale {tapScale} to item {targetItemId}. Current: {itemView.CurrentScale} → New: {newScale}");
                
                // Set the current scale directly (this will smoothly animate back to target scale)
                itemView.SetCurrentScale(newScale);
            }
            else
            {
                Debug.LogWarning($"{logPrefix} Could not find ItemView for highlighted item: {targetItemId}");
            }
        }
        else
        {
            Debug.Log($"{logPrefix} No items highlighted. Attempting to highlight first item and apply scale.");
            
            if (collectionsView != null)
            {
                string targetItemId = collectionsView.GetFirstDisplayedItemId();
                if (!string.IsNullOrEmpty(targetItemId))
                {
                    Debug.Log($"{logPrefix} Found first item: {targetItemId}. Highlighting and applying scale.");
                    
                    // First highlight the item
                    HighlightItem(clientId, clientName, targetItemId);
                    
                    // Then apply scale to it
                    ItemView itemView = FindItemViewById(targetItemId);
                    if (itemView != null && inputManager != null)
                    {
                        float tapScale = inputManager.SelectionTapScale;
                        float newScale = itemView.CurrentScale * tapScale;
                        Debug.Log($"{logPrefix} Applying tap scale {tapScale} to item {targetItemId}. Current: {itemView.CurrentScale} → New: {newScale}");
                        itemView.SetCurrentScale(newScale);
                    }
                }
                else
                {
                    Debug.LogWarning($"{logPrefix} No first item found to highlight and scale.");
                }
            }
            else
            {
                Debug.LogWarning($"{logPrefix} Cannot highlight and scale because CollectionsView is null.");
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
    
    /// <summary>
    /// Finds a MagnetView by its name by searching all MagnetView components in the scene.
    /// </summary>
    public MagnetView FindMagnetViewByName(string magnetName)
    {
        if (string.IsNullOrEmpty(magnetName)) return null;
        
        // Find all MagnetView components in the scene
        MagnetView[] allMagnets = FindObjectsByType<MagnetView>(FindObjectsSortMode.None);
        
        foreach (MagnetView magnet in allMagnets)
        {
            if (magnet.magnetName == magnetName)
            {
                return magnet;
            }
        }
        
        return null;
    }
    
    /// <summary>
    /// Gets all MagnetView components currently in the scene.
    /// </summary>
    public MagnetView[] GetAllMagnetViews()
    {
        return FindObjectsByType<MagnetView>(FindObjectsSortMode.None);
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
            if (view.isSelected != shouldBeSelected)
            {
                 view.SetSelected(shouldBeSelected); 
            }
        }
    }

    /// <summary>
    /// Updates the title display to show the first selected item's title
    /// </summary>
    private void UpdateTitleDisplay()
    {
        if (collectionsView?.itemInfoPanel == null) return;
        
        string titleToDisplay = "";
        
        // Show the title of the first selected item
        if (SelectedItemIds.Count > 0)
        {
            string selectedId = SelectedItemIds[0];
            ItemView itemView = FindItemViewById(selectedId);
            if (itemView?.Model != null)
            {
                titleToDisplay = itemView.Model.Title;
            }
        }
        
        // Update the info panelimage.pngimage.png
        if (string.IsNullOrEmpty(titleToDisplay))
        {
            collectionsView.itemInfoPanel.ClearInfo();
        }
        else
        {
            collectionsView.itemInfoPanel.gameObject.SetActive(true);
            collectionsView.itemInfoPanel.ShowInfo(titleToDisplay);
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
            if (view.highlightCount != newCount) 
            {
                view.SetHighlightCount(newCount);
            }
        }
    }

    // ================== BRIDGE API FORWARDERS TO INPUT MANAGER ======================

    /// <summary>
    /// Bridge forwarder: Receives position DELTA from Bridge and passes it to InputManager.
    /// </summary>
    public void PushCameraPosition(string controllerId, string controllerName, string screenId, float panXDelta, float panYDelta)
    {
        if (inputManager != null)
        {
             inputManager.PushCameraPosition(controllerId, controllerName, screenId, panXDelta, panYDelta);
        }
        else
        {
            Debug.LogWarning("[SpaceCraft] PushCameraPosition called but InputManager is null.");
        }
    }

    /// <summary>
    /// Bridge forwarder: Receives zoom DELTA from Bridge and passes it to InputManager.
    /// </summary>
    public void PushCameraZoom(string controllerId, string controllerName, string screenId, float zoomDelta)
    {
        if (inputManager != null)
        {
            inputManager.PushCameraZoom(controllerId, controllerName, screenId, zoomDelta);
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
    /// Forward tilt input to InputManager (Bridge compatibility)
    /// </summary>
    // Tilt input removed - was causing excessive message spam and is not currently used

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
            Debug.Log("SpaceCraft: SelectedItemsChanged: selectedItemIds: " + string.Join(",", SelectedItemIds));
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
    public void ToggleItemHighlight(string controllerId, string controllerName, string screenId, string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return;
        Debug.Log($"[SpaceCraft] ToggleItemHighlight API called by controllerId:     {controllerId}, controllerName: {controllerName}, screenId: {screenId}, itemId: {itemId}");

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

    /// <summary>
    /// Move the selection in a specific direction.
    /// </summary>
    public void MoveSelection(string controllerId, string controllerName, string screenId, string direction, float dx = 0f, float dy = 0f)
    {
        // Expects "north", "south", "east", "west" from controller
        Debug.Log($"[SpaceCraft] MoveSelection called with controllerId: {controllerId}, controllerName: {controllerName}, screenId: {screenId}, direction: {direction}, dx: {dx}, dy: {dy}");
        // Pass direction and mouse deltas to CollectionsView
        collectionsView?.MoveSelection(controllerId, controllerName, direction, dx, dy);
        // Note: CollectionsView will call SelectItem which will sync the highlight
    }

    /// <summary>
    /// Move the highlight in a specific direction.
    /// </summary>
    public void MoveHighlight(string controllerId, string controllerName, string screenId, string direction)
    {
        // Expects "north", "south", "east", "west" from controller
        Debug.Log($"[SpaceCraft] MoveHighlight called with controllerId: {controllerId}, controllerName: {controllerName}, screenId: {screenId}, direction: {direction}");
        // Pass direction directly to CollectionsView
        collectionsView?.MoveHighlight(controllerId, controllerName, direction);
    }
}
