using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using System; // Needed for Action
using System.Linq;

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
    public string lastSelectedItemOrHighlightId = null; // Remember the last item focused (Public)
    
    // Reference to SpaceCraft
    private SpaceCraft spaceCraft;
    
    private void Start()
    {
        // Check itemInfoPanel assignment
        if (itemInfoPanel == null)
        {
            Debug.LogError("CollectionsView: itemInfoPanel is not assigned in Unity Inspector!");
        }
        else
        {
            Debug.Log($"CollectionsView: itemInfoPanel is assigned: {itemInfoPanel.name}");
        }
        
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
        // Update detail panel based on current selection state
        UpdateDetailPanel();
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
    /// Updates the detail panel based on selected items only (shows first selected item)
    /// </summary>
    private void UpdateDetailPanel()
    {
        if (spaceCraft == null)
        {
            Debug.LogWarning("CollectionsView: UpdateDetailPanel - spaceCraft is null");
            HideItemDetails();
            return;
        }
        
        Item itemToDisplay = null;
        
        // Show the first selected item if any exist
        if (spaceCraft.SelectedItemIds.Count > 0)
        {
            string selectedId = spaceCraft.SelectedItemIds[0];
            // Debug.Log($"CollectionsView: UpdateDetailPanel - Found selected item: {selectedId}");
            if (!string.IsNullOrEmpty(selectedId))
            {
                ItemView itemView = spaceCraft.FindItemViewById(selectedId);
                if (itemView != null && itemView.Model != null)
                {
                    itemToDisplay = itemView.Model;
                    // Debug.Log($"CollectionsView: UpdateDetailPanel - Will display selected item: {itemToDisplay.Title}");
                }
                else
                {
                    Debug.LogWarning($"CollectionsView: UpdateDetailPanel - Could not find ItemView for selected id: {selectedId}");
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
                Debug.Log($"CollectionsView: UpdateDetailPanel - Displaying item details for: {itemToDisplay.Title}");
                DisplayItemDetails(itemToDisplay);
            }
        }
        else
        {
            // No item to display
            if (currentDisplayedItem != null)
            {
                currentDisplayedItem = null;
                Debug.Log("CollectionsView: UpdateDetailPanel - Hiding item details (no item to display)");
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
            // Get collection title
            string displayTitle = item.Title;
            
            // Find the ItemView to get collection information
            if (spaceCraft != null && spaceCraft.SelectedItemIds.Count > 0)
            {
                string selectedId = spaceCraft.SelectedItemIds[0];
                ItemView itemView = spaceCraft.FindItemViewById(selectedId);
                
                if (itemView != null && !string.IsNullOrEmpty(itemView.collectionId))
                {
                    Collection collection = Brewster.Instance.GetCollection(itemView.collectionId);
                    Debug.Log($"CollectionsView: Retrieved collection with ID='{collection?.Id}', Title='{collection?.Title}', Type={collection?.GetType().Name}");
                    if (collection != null)
                    {
                        Debug.Log($"CollectionsView: About to format title - collection.Title='{collection.Title}', item.Title='{item.Title}'");
                        displayTitle = $"{collection.Title}\n{item.Title}";
                        Debug.Log($"CollectionsView: Final formatted displayTitle='{displayTitle}'");
                    }
                    else
                    {
                        Debug.LogWarning($"CollectionsView: GetCollection('{itemView.collectionId}') returned null!");
                    }
                }
                else
                {
                    Debug.LogWarning("CollectionsView: itemView.collectionId is null or empty!");
                }
            }
            else
            {
                if (spaceCraft == null)
                    Debug.LogWarning("CollectionsView: spaceCraft is null!");
                else
                    Debug.LogWarning($"CollectionsView: SelectedItemIds.Count = {spaceCraft.SelectedItemIds.Count}");
            }
            
            Debug.Log($"CollectionsView: DisplayItemDetails - Activating panel and showing title: {displayTitle}");
            itemInfoPanel.gameObject.SetActive(true);
            itemInfoPanel.ShowInfo(displayTitle);
        }
        else
        {
            Debug.LogError("CollectionsView: DisplayItemDetails - itemInfoPanel is NULL! Check Unity Inspector.");
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

    /// <summary>
    /// Moves the current selection in the specified direction.
    /// </summary>
    public void MoveSelection(string controllerId, string controllerName, string direction, float dx = 0f, float dy = 0f)
    {
        string logPrefix = "[CollectionsView:MoveSelection]";
        if (spaceCraft == null) return;

        // 1. Determine starting point
        string currentItemId = spaceCraft.SelectedItemIds.FirstOrDefault();
        bool restoredFocus = false;
        if (string.IsNullOrEmpty(currentItemId))
        {
            if (!string.IsNullOrEmpty(lastSelectedItemOrHighlightId) && spaceCraft.FindItemViewById(lastSelectedItemOrHighlightId) != null)
            {
                currentItemId = lastSelectedItemOrHighlightId;
                restoredFocus = true;
                Debug.Log($"{logPrefix} Restoring focus to last known item: {currentItemId}");
            }
            else
            {
                SelectOrHighlightFirstItem(true); // Select first
                return;
            }
        }

        // 2. Calculate next item ID
        string newItemId = CalculateNextItemId(currentItemId, direction, dx, dy);

        // 3. Handle outcome
        if (string.IsNullOrEmpty(newItemId)) // No valid move found
        {
            if (restoredFocus)
            { 
                 // No move calculated, but we restored focus, so re-select the restored item
                 Debug.Log($"{logPrefix} No move from restored item {currentItemId}, re-applying selection.");
                 newItemId = currentItemId; 
                 // Proceed to apply action below
            }
            else
            {   
                Debug.Log($"{logPrefix} No valid move found in direction {direction} from {currentItemId}.");
                return; // Stay put
            }
        }

        // --- Apply action --- 
        Debug.Log($"{logPrefix} Target determined: {newItemId}");
        lastSelectedItemOrHighlightId = currentItemId; // Store the item we are moving FROM (or restored to)
        spaceCraft.SelectItem("grid_nav", "Grid Navigation", newItemId);
        Debug.Log($"{logPrefix} Selection applied to item: {newItemId}");
    }

    /// <summary>
    /// Moves the current highlight in the specified direction.
    /// </summary>
    public void MoveHighlight(string controllerId, string controllerName, string direction)
    {
        string logPrefix = "[CollectionsView:MoveHighlight]";
        if (spaceCraft == null) return;

        // 1. Determine starting point
        string currentItemId = spaceCraft.HighlightedItemIds.FirstOrDefault();
        bool restoredFocus = false;
        if (string.IsNullOrEmpty(currentItemId))
        {
            if (!string.IsNullOrEmpty(lastSelectedItemOrHighlightId) && spaceCraft.FindItemViewById(lastSelectedItemOrHighlightId) != null)
            {
                currentItemId = lastSelectedItemOrHighlightId;
                restoredFocus = true;
                Debug.Log($"{logPrefix} Restoring focus to last known item: {currentItemId}");
            }
            else
            {
                SelectOrHighlightFirstItem(false); // Highlight first
                return;
            }
        }

        // 2. Calculate next item ID
        string newItemId = CalculateNextItemId(currentItemId, direction);

        // 3. Handle outcome
        if (string.IsNullOrEmpty(newItemId)) // No valid move found
        {
            if (restoredFocus)
            { 
                 // No move calculated, but we restored focus, so re-highlight the restored item
                 Debug.Log($"{logPrefix} No move from restored item {currentItemId}, re-applying highlight.");
                 newItemId = currentItemId; 
                 // Proceed to apply action below
            }
            else
            {
                Debug.Log($"{logPrefix} No valid move found in direction {direction} from {currentItemId}.");
                return; // Stay put
            }
        }
        
        // --- Apply action --- 
        Debug.Log($"{logPrefix} Target determined: {newItemId}");
        lastSelectedItemOrHighlightId = currentItemId; // Store the item we are moving FROM (or restored to)
        spaceCraft.SetHighlightedItems("grid_nav", "Grid Navigation", new List<string> { newItemId }); 
        Debug.Log($"{logPrefix} Highlight applied to item: {newItemId}");
    }

    /// <summary>
    /// Helper method to select or highlight the very first item in the first collection.
    /// </summary>
    /// <param name="select">True to select, false to highlight.</param>
    private void SelectOrHighlightFirstItem(bool select)
    {
        string actionType = select ? "select" : "highlight";
        Debug.Log($"[CollectionsView] Attempting to {actionType} the first item.");

        // Find the first CollectionView managed by this CollectionsView
        CollectionView firstCollectionView = collectionViews.FirstOrDefault();
        if (firstCollectionView == null)
        {
            Debug.LogWarning("[CollectionsView] No collection views found to select/highlight the first item.");
            return;
        }

        // Get the list of ItemViews from that first CollectionView
        List<ItemView> itemViews = firstCollectionView.GetCurrentItemViews();
        ItemView firstItemView = itemViews.FirstOrDefault();

        if (firstItemView == null || firstItemView.Model == null)
        {
            Debug.LogWarning($"[CollectionsView] First collection view '{firstCollectionView.name}' has no items or item model to {actionType}.");
            return;
        }

        string firstItemId = firstItemView.Model.Id;
        Debug.Log($"[CollectionsView] Found first item: ID = {firstItemId}");

        // Perform the action via SpaceCraft
        if (select)
        {
            spaceCraft.SelectItem("grid_nav", "Grid Navigation", firstItemId);
            Debug.Log($"[CollectionsView] Selected first item: {firstItemId}");
        }
        else
        {
            spaceCraft.SetHighlightedItems("grid_nav", "Grid Navigation", new List<string> { firstItemId });
            Debug.Log($"[CollectionsView] Highlighted first item: {firstItemId}");
        }
    }

    /// <summary>
    /// Calculates the ID of the next navigable item based on the current item and direction,
    /// using the appropriate layout manager.
    /// </summary>
    /// <returns>The next item ID, or null if no valid move exists.</returns>
    private string CalculateNextItemId(string currentItemId, string direction, float dx = 0f, float dy = 0f)
    {
        string logPrefix = "[CollectionsView:CalculateNextItemId]";

        // Find Current ItemView and its CollectionView + Layout Manager
        ItemView currentItemView = spaceCraft?.FindItemViewById(currentItemId);
        if (currentItemView == null)
        {
            Debug.LogError($"{logPrefix} Could not find ItemView for current ID: {currentItemId}");
            return null; // Cannot calculate without a starting point
        }
        CollectionView currentCollectionView = currentItemView.GetComponentInParent<CollectionView>();
        if (currentCollectionView == null) { 
             Debug.LogError($"{logPrefix} Could not find parent CollectionView for Item: {currentItemId}");
             return null; 
        }
        CollectionLayoutBase layoutManager = currentCollectionView.GetComponent<CollectionLayoutBase>();
        if (layoutManager == null)
        {
             Debug.LogError($"{logPrefix} Could not find CollectionLayoutBase on CollectionView '{currentCollectionView.name}'.");
             return null;
        }

        // Delegate the calculation to the layout manager
        return layoutManager.GetNextItemId(currentItemId, direction, dx, dy);
    }

    /// <summary>
    /// Finds an ItemView by its ID across all managed collections.
    /// </summary>
    /// <param name="itemId">The ID of the item to find.</param>
    /// <returns>The ItemView if found, otherwise null.</returns>
    public ItemView FindItemViewById(string itemId)
    {
        if (string.IsNullOrEmpty(itemId)) return null;

        foreach (var collectionView in collectionViews)
        {
            ItemView foundView = collectionView?.FindItemViewById(itemId);
            if (foundView != null)
            {
                return foundView;
            }
        }
        // Debug.LogWarning($"[CollectionsView] ItemView with ID '{itemId}' not found in any collection.");
        return null; // Not found in any collection
    }
    
    /// <summary>
    /// Calculates the ID of the next item in the specified direction from the given item,
    /// by delegating to the layout manager of the item's collection view.
    /// </summary>
    /// <param name="currentItemId">The ID of the starting item.</param>
    /// <param name="direction">Direction to move (north, south, east, west).</param>
    /// <returns>The ID of the next item in the direction, or null if no valid move exists.</returns>
    public string GetNextItemIdInDirection(string currentItemId, string direction)
    {
        string logPrefix = "[CollectionsView:GetNextItemId]";

        // 1. Validate currentItemId and find parent CollectionView
        if (string.IsNullOrEmpty(currentItemId))
        {
            Debug.LogWarning($"{logPrefix} Provided currentItemId is null or empty.");
            return null;
        }
        // Find the view using SpaceCraft, which delegates down
        ItemView currentItemView = spaceCraft?.FindItemViewById(currentItemId);
        if (currentItemView == null)
        {
            // SpaceCraft.FindItemViewById would have logged the error if it reached CollectionsView
            // This likely means the item ID wasn't found anywhere
            return null;
        }
        CollectionView currentCollectionView = currentItemView.GetComponentInParent<CollectionView>();
        if (currentCollectionView == null)
        {   
            Debug.LogError($"{logPrefix} Could not find parent CollectionView for ItemView: {currentItemView.name}");
            return null;
        }
        
        // 2. Get the Layout Manager from the specific CollectionView
        CollectionLayoutBase layout = currentCollectionView.GetComponent<CollectionLayoutBase>(); // Assumes layout is on the same GameObject as CollectionView
        if (layout == null)
        {
            Debug.LogError($"{logPrefix} CollectionView '{currentCollectionView.name}' does not have a CollectionLayoutBase component.");
            return null;
        }

        // 3. Delegate the calculation to the layout manager
        return layout.GetNextItemId(currentItemId, direction);
    }

    /// <summary>
    /// Gets the ID of the first item currently displayed in the first collection.
    /// </summary>
    /// <returns>The Item ID string, or null if no collections/items are displayed.</returns>
    public string GetFirstDisplayedItemId()
    {
        // Find the first CollectionView managed by this CollectionsView
        CollectionView firstCollectionView = collectionViews.FirstOrDefault();
        if (firstCollectionView == null)
        {
            Debug.LogWarning("[CollectionsView] GetFirstDisplayedItemId: No collection views found.");
            return null;
        }

        // Get the list of ItemViews from that first CollectionView
        // Assuming CollectionView has a method to get its current items
        List<ItemView> itemViews = firstCollectionView.GetCurrentItemViews(); // Need GetCurrentItemViews() on CollectionView
        ItemView firstItemView = itemViews.FirstOrDefault();

        if (firstItemView == null || firstItemView.Model == null)
        {
            Debug.LogWarning($"[CollectionsView] GetFirstDisplayedItemId: First collection view '{firstCollectionView.name}' has no items or item model.");
            return null;
        }

        return firstItemView.Model.Id;
    }
} 