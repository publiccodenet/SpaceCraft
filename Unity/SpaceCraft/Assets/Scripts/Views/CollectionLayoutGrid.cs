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
    public float startOffsetX = 0f;  // Changed from 0.8f to center at origin
    public float startOffsetY = 0f;  // Changed from -0.6f to center at origin

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
        int rowCount = Mathf.CeilToInt((float)itemCount / columnCount);

        // Calculate the offset to center the grid around (0, 0, 0)
        float gridWidth = (columnCount - 1) * cellWidth;
        float gridHeight = (rowCount - 1) * cellHeight;
        float centerOffsetX = -gridWidth * 0.5f;
        float centerOffsetZ = gridHeight * 0.5f; // Z is positive upward in the layout

        int col = 0;
        int row = 0;

        for (int i = 0; i < itemCount; i++)
        {
            ItemViewsContainer container = containers[i];
            if (container == null) continue;

            // Position relative to center
            float xPos = centerOffsetX + col * cellWidth + startOffsetX;
            float zPos = centerOffsetZ - row * cellHeight + startOffsetY; // Y in layout is Z in world
            
            container.transform.SetParent(parent, false); // Ensure parent is set
            container.transform.localPosition = new Vector3(xPos, 0, zPos); // Use Z for depth/vertical on ground plane

            col++;
            if (col >= columnCount)
            {
                col = 0;
                row++;
            }
        }
    }

    /// <summary>
    /// Calculates the next item ID based on position and scale.
    /// </summary>
    public override string GetNextItemId(string currentItemId, string direction, float dx = 0f, float dy = 0f)
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
        
        // Find the current ItemView
        ItemView currentItemView = allItemViews.FirstOrDefault(view => 
            view != null && view.Model != null && view.Model.Id == currentItemId);
            
        if (currentItemView == null)
        {
            Debug.LogError($"{logPrefix} Could not find current ItemView with ID: {currentItemId}");
            return null;
        }
        
        // Get the scale threshold from InputManager
        float scaleThreshold = 0.5f; // Default fallback
        if (SpaceCraft.spaceCraft != null && SpaceCraft.spaceCraft.InputManager != null)
        {
            scaleThreshold = SpaceCraft.spaceCraft.InputManager.SelectionScaleMin;
        }
        
        Vector3 currentPos = currentItemView.transform.position;
        
        // Calculate preferred angle from mouse deltas if available
        float preferredAngle = 0f;
        bool hasMouseDelta = (Mathf.Abs(dx) > 0.01f || Mathf.Abs(dy) > 0.01f);
        if (hasMouseDelta)
        {
            // Convert mouse dy to Unity's z axis (forward/back)
            // Note: mouse Y increases downward, Unity Z increases forward
            preferredAngle = Mathf.Atan2(-dy, dx) * Mathf.Rad2Deg; // Negate dy for intuitive control
            Debug.Log($"{logPrefix} Using mouse deltas dx:{dx}, dy:{dy} for preferred angle: {preferredAngle}°");
        }
        
        // Find candidate items in the specified direction
        List<ItemView> candidatesAboveThreshold = new List<ItemView>();
        List<ItemView> allCandidates = new List<ItemView>();
        
        foreach (ItemView itemView in allItemViews)
        {
            // Skip null items, items without models, and the current item
            if (itemView == null || itemView.Model == null || itemView == currentItemView)
                continue;
                
            Vector3 candidatePos = itemView.transform.position;
            Vector3 direction2D = candidatePos - currentPos;
            direction2D.y = 0; // Project to horizontal plane
            
            // Skip if exactly at the same position
            if (direction2D.magnitude < 0.001f)
                continue;
                
            float itemDx = direction2D.x;
            float itemDz = direction2D.z; // Note: using z for forward/back
            
            // Check if item is in the correct pie slice based on direction
            bool inPieSlice = false;
            
            switch (direction.ToLower())
            {
                case "north": // Forward in Unity is +Z
                    inPieSlice = itemDz > 0 && Mathf.Abs(itemDz) > Mathf.Abs(itemDx);
                    break;
                case "south": // Backward is -Z
                    inPieSlice = itemDz < 0 && Mathf.Abs(itemDz) > Mathf.Abs(itemDx);
                    break;
                case "east": // Right is +X
                    inPieSlice = itemDx > 0 && Mathf.Abs(itemDx) > Mathf.Abs(itemDz);
                    break;
                case "west": // Left is -X
                    inPieSlice = itemDx < 0 && Mathf.Abs(itemDx) > Mathf.Abs(itemDz);
                    break;
                default:
                    Debug.LogWarning($"{logPrefix} Invalid direction: {direction}");
                    return null;
            }
            
            if (inPieSlice)
            {
                allCandidates.Add(itemView);
                
                // Check if this item meets the scale threshold
                float itemScale = itemView.CurrentScale;
                if (itemScale >= scaleThreshold)
                {
                    candidatesAboveThreshold.Add(itemView);
                }
            }
        }
        
        // Choose which list to search
        List<ItemView> searchList = candidatesAboveThreshold.Count > 0 ? candidatesAboveThreshold : allCandidates;
        
        if (searchList.Count == 0)
        {
            Debug.Log($"{logPrefix} No candidates found in direction {direction}.");
            return null;
        }
        
        // Find best candidate based on scoring
        ItemView bestCandidate = null;
        float bestScore = float.MaxValue;
        
        foreach (ItemView candidate in searchList)
        {
            Vector3 toCandidateDir = candidate.transform.position - currentPos;
            toCandidateDir.y = 0;
            float distance = toCandidateDir.magnitude;
            
            // Base score is distance
            float score = distance;
            
            // If we have mouse deltas, weight by angular alignment
            if (hasMouseDelta && distance > 0.01f)
            {
                // Calculate angle to this candidate
                float candidateAngle = Mathf.Atan2(toCandidateDir.z, toCandidateDir.x) * Mathf.Rad2Deg;
                
                // Calculate angular difference (handles wrap-around)
                float angleDiff = Mathf.DeltaAngle(preferredAngle, candidateAngle);
                float angleAlignment = Mathf.Abs(angleDiff) / 180f; // Normalize to 0-1
                
                // Weight score by angle alignment (closer alignment = lower multiplier)
                // Add 0.5 to prevent multiplying by 0 for perfect alignment
                score *= (0.5f + angleAlignment);
                
                Debug.Log($"{logPrefix} Candidate {candidate.Model.Id}: dist={distance:F2}, angle={candidateAngle:F1}°, diff={angleDiff:F1}°, score={score:F2}");
            }
            
            if (score < bestScore)
            {
                bestScore = score;
                bestCandidate = candidate;
            }
        }
        
        // Return the best candidate's ID, or null if none found
        if (bestCandidate != null && bestCandidate.Model != null)
        {
            Debug.Log($"{logPrefix} Found next item: {bestCandidate.Model.Id} with score {bestScore:F2}, scale: {bestCandidate.CurrentScale:F2}");
            return bestCandidate.Model.Id;
        }
        
        Debug.Log($"{logPrefix} No valid item found in direction {direction}. Staying on current item.");
        return null;
    }

    /// <summary>
    /// Calculates the next item ID based on grid navigation.
    /// </summary>
    public override string GetNextGridItemId(string currentItemId, string direction)
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