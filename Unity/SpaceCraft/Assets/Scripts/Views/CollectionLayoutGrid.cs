using UnityEngine;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Implements collection layout logic in a grid format.
/// </summary>
public class CollectionLayoutGrid : CollectionLayoutBase
{
    // [Header("Grid Settings")] // REMOVED hardcoded settings
    public float cellWidth = 1.6f; // Includes item width + spacing
    public float cellHeight = 1.2f; // Includes item height + spacing
    public float startOffsetX = 0.8f;
    public float startOffsetY = -0.6f;

    /// <summary>
    /// Applies grid layout positioning.
    /// </summary>
    public override void ApplyLayout(List<ItemViewsContainer> containers, Transform parent)
    {
        if (containers == null || parent == null) return;
        int itemCount = containers.Count;
        if (itemCount == 0) return;

        // Calculate grid dimensions dynamically
        int columnCount = Mathf.Max(1, Mathf.CeilToInt(Mathf.Sqrt(itemCount))); // Ensure at least 1 column

        int col = 0;
        int row = 0;

        for (int i = 0; i < itemCount; i++)
        {
            ItemViewsContainer container = containers[i];
            if (container == null) continue;

            float xPos = startOffsetX + col * cellWidth;
            float yPos = startOffsetY - row * cellHeight; // Y decreases as row increases
            
            container.transform.SetParent(parent, false); // Ensure parent is set
            container.transform.localPosition = new Vector3(xPos, 0, yPos); // Use Z for depth/vertical on ground plane

            col++;
            if (col >= columnCount)
            {
                col = 0;
                row++;
            }
        }
    }

    /// <summary>
    /// Calculates the next item ID based on grid navigation.
    /// </summary>
    public override string GetNextItemId(string currentItemId, string direction)
    {
        string logPrefix = "[CollectionLayoutGrid:GetNextItemId]";
        
        // Get the parent CollectionView to access its items
        CollectionView parentView = GetComponentInParent<CollectionView>();
        if (parentView == null)
        {
            Debug.LogError($"{logPrefix} Cannot find parent CollectionView.");
            return null;
        }
        List<ItemView> allItemViews = parentView.GetCurrentItemViews();
        if (allItemViews == null || allItemViews.Count == 0)
        {
            Debug.LogWarning($"{logPrefix} Parent CollectionView has no items.");
            return null;
        }

        // Find the current ItemView based on the ID within the parent's list
        ItemView currentItemView = allItemViews.FirstOrDefault(view => view != null && view.Model != null && view.Model.Id == currentItemId);

        if (currentItemView == null)
        {
            Debug.LogError($"{logPrefix} Could not find current ItemView with ID: {currentItemId} in the parent CollectionView's list.");
            return null;
        }
        
        // --- Grid calculation logic remains the same, using allItemViews obtained above ---
        int totalItems = allItemViews.Count;
        if (totalItems == 0)
        {
            Debug.LogWarning($"{logPrefix} Provided item view list is empty.");
            return null;
        }

        // Calculate grid dimensions dynamically
        int columnCount = Mathf.Max(1, Mathf.CeilToInt(Mathf.Sqrt(totalItems)));

        int currentIndex = allItemViews.IndexOf(currentItemView);
        if (currentIndex < 0)
        { 
             Debug.LogError($"{logPrefix} Could not find index for current item view '{currentItemView.name}'.");
             return null;
        }
        
        int currentRow = currentIndex / columnCount;
        int currentCol = currentIndex % columnCount;
        
        // Calculate Raw Target Position
        int targetRow = currentRow;
        int targetCol = currentCol;
        switch (direction.ToLower())
        {
            case "north": targetRow--; break;
            case "south": targetRow++; break;
            case "west": targetCol--; break;
            case "east": targetCol++; break;
            default:
                Debug.LogWarning($"{logPrefix} Invalid direction: {direction}");
                return null;
        }

        // Boundary Checks
        int totalRows = Mathf.CeilToInt((float)totalItems / columnCount);
        int newIndex = -1; // Indicate no valid move yet

        // Check grid dimensions first
        if (targetRow >= 0 && targetRow < totalRows && targetCol >= 0 && targetCol < columnCount)
        {
            // If within grid, check item count
            int potentialNewIndex = targetRow * columnCount + targetCol;
            if (potentialNewIndex < totalItems)
            {
                // Valid move within items
                newIndex = potentialNewIndex;
            }
            // No 'else' needed, newIndex remains -1 if move is invalid
        }
        
        // Return Result
        if (newIndex != -1 && newIndex != currentIndex)
        {
            ItemView newItemView = allItemViews[newIndex];
            if (newItemView != null && newItemView.Model != null)
            {
                return newItemView.Model.Id;
            }
            else
            {
                Debug.LogError($"{logPrefix} ItemView or Model is null at calculated valid index {newIndex}.");
                return null;
            }
        }
        else
        {
            return null; // No move possible or target is same as start
        }
    }
} 