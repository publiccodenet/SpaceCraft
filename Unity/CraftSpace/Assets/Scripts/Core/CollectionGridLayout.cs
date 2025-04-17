using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Arranges collection items in a 3D grid layout with configurable dimensions and spacing.
/// Works directly with standard 3D transforms - no UI/RectTransform dependency.
/// </summary>
[RequireComponent(typeof(CollectionView))]
public class CollectionGridLayout : MonoBehaviour
{
    #region Inspector Settings

    [Header("Grid Settings")]
    [Tooltip("Size of each cell in the grid")]
    public float cellSize = 1f;
    
    [Tooltip("Horizontal spacing between cells")]
    public float spacingHorizontal = 0.2f;
    
    [Tooltip("Vertical spacing between cells")]
    public float spacingVertical = 0.8f;
    
    [Tooltip("Number of columns in the grid")]
    public int columns = 4;
    
    [Header("Advanced Settings")]
    [Tooltip("Should layout update automatically when items are added/removed")]
    public bool autoUpdateLayout = true;
    
    [Tooltip("Center the grid horizontally relative to the transform")]
    public bool centerHorizontally = true;

    #endregion

    #region Private Fields

    public List<Transform> itemTransforms = new List<Transform>();
    public Collection collection;
    public CollectionView collectionView;
    public bool initialized = false;

    #endregion

    #region Unity Lifecycle

    private void Awake()
    {
        collectionView = GetComponent<CollectionView>();
        if (collectionView != null)
        {
            collectionView.ModelUpdated += OnModelUpdated;
        }
        initialized = true;
    }

    public void OnDestroy()
    {
        if (collectionView != null)
        {
            collectionView.ModelUpdated -= OnModelUpdated;
        }

        //base.OnDestroy();
    }

    private void OnValidate()
    {
        // Ensure columns is at least 1
        columns = Mathf.Max(1, columns);
        
        // If already initialized in play mode, update the layout
        if (initialized && autoUpdateLayout && Application.isPlaying)
        {
            UpdateLayout();
        }
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Sets the collection and updates the associated CollectionView
    /// </summary>
    /// <param name="collection">The collection to display</param>
    public void SetCollection(Collection collection)
    {
        this.collection = collection;
        
        // Get the CollectionView component and update it
        if (collectionView != null)
        {
            collectionView.SetModel(collection);
        }
        else 
        {
            Debug.LogWarning($"[CollectionGridLayout] Missing CollectionView component on {gameObject.name}");
        }
        
        if (autoUpdateLayout)
        {
            ApplyLayout();
        }
    }
    
    /// <summary>
    /// Forces the layout to update with current items from the CollectionView
    /// </summary>
    public void ApplyLayout()
    {
        try 
        {
            // Get all item containers from the CollectionView
            if (collectionView == null)
            {
                collectionView = GetComponent<CollectionView>();
                if (collectionView == null)
                {
                    Debug.LogError($"[CollectionGridLayout] Cannot apply layout - missing CollectionView component on {gameObject.name}");
                    return;
                }
            }
            
            // Clear existing items
            itemTransforms.Clear();
            
            // Get all containers
            var containers = collectionView.GetItemContainers();
            if (containers == null || containers.Count == 0)
            {
                Debug.Log($"[CollectionGridLayout] No item containers found in CollectionView on {gameObject.name}");
                return;
            }
            
            // Add their transforms to our layout items
            foreach (var container in containers)
            {
                if (container != null)
                {
                    itemTransforms.Add(container.transform);
                }
            }
            
            // Calculate optimal columns based on item count
            CalculateOptimalColumns();
            
            // Update the layout
            UpdateLayout();
        }
        catch (Exception ex)
        {
            Debug.LogError($"[CollectionGridLayout] Error in ApplyLayout: {ex.Message}\n{ex.StackTrace}");
        }
    }
    
    /// <summary>
    /// Gets the dimensions of the grid based on current settings and item count
    /// </summary>
    /// <returns>Vector2 with width and height of the entire grid</returns>
    public Vector2 GetGridSize()
    {
        int itemCount = GetItemCount();
        
        // Default to a single cell if no items
        if (itemCount == 0)
            return new Vector2(cellSize, cellSize);
            
        int rows = Mathf.CeilToInt((float)itemCount / columns);
        
        float width = columns * cellSize + (columns - 1) * spacingHorizontal;
        float height = rows * cellSize + (rows - 1) * spacingVertical;
        
        return new Vector2(width, height);
    }
    
    /// <summary>
    /// Adds a single transform to the grid and updates layout if autoUpdateLayout is true
    /// </summary>
    /// <param name="transform">The Transform to add</param>
    public void AddItem(Transform transform)
    {
        if (transform == null) return;
        
        itemTransforms.Add(transform);
        
        if (autoUpdateLayout)
        {
            UpdateLayout();
        }
    }
    
    /// <summary>
    /// Removes a single transform from the grid and updates layout if autoUpdateLayout is true
    /// </summary>
    /// <param name="transform">The Transform to remove</param>
    public void RemoveItem(Transform transform)
    {
        if (transform == null) return;
        
        itemTransforms.Remove(transform);
        
        if (autoUpdateLayout)
        {
            UpdateLayout();
        }
    }
    
    /// <summary>
    /// Clears all items from the grid and updates layout if autoUpdateLayout is true
    /// </summary>
    public void Clear()
    {
        itemTransforms.Clear();
        
        if (autoUpdateLayout)
        {
            UpdateLayout();
        }
    }
    
    /// <summary>
    /// Gets the row and column for a specific item index
    /// </summary>
    /// <param name="index">Item index in the collection</param>
    /// <returns>Vector2Int where x is the column and y is the row</returns>
    public Vector2Int GetGridPosition(int index)
    {
        if (columns <= 0) columns = 1; // Safety check
        
        int row = index / columns;
        int col = index % columns;
        
        return new Vector2Int(col, row);
    }
    
    /// <summary>
    /// Gets the world position for a specific grid position
    /// </summary>
    /// <param name="gridPosition">Grid position (column, row)</param>
    /// <returns>Vector3 position in world space</returns>
    public Vector3 GetPositionForGridPosition(Vector2Int gridPosition)
    {
        // Calculate base position - use different spacing for horizontal and vertical
        float xPos = gridPosition.x * (cellSize + spacingHorizontal);
        float zPos = -gridPosition.y * (cellSize + spacingVertical); // Negative to grow downward in z
        
        // Apply horizontal centering if enabled
        if (centerHorizontally)
        {
            float gridWidth = columns * (cellSize + spacingHorizontal) - spacingHorizontal; // Subtract trailing spacing
            float offset = gridWidth * 0.5f - cellSize * 0.5f;
            xPos -= offset;
        }
        
        return new Vector3(xPos, 0, zPos);
    }

    #endregion

    #region Private Methods

    /// <summary>
    /// Updates the layout of all items based on current settings
    /// </summary>
    private void UpdateLayout()
    {
        try
        {
            if (itemTransforms == null || itemTransforms.Count == 0) return;
            
            // Recalculate optimal columns before layout
            CalculateOptimalColumns();
            
            for (int i = 0; i < itemTransforms.Count; i++)
            {
                var item = itemTransforms[i];
                if (item == null) continue;
                
                Vector2Int gridPos = GetGridPosition(i);
                Vector3 position = GetPositionForGridPosition(gridPos);
                
                // Apply position directly to the transform
                // Use localPosition to position relative to the grid's parent
                item.localPosition = position;
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"[CollectionGridLayout] Error in UpdateLayout: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Gets the total item count, either from direct items list or from the collection
    /// </summary>
    private int GetItemCount()
    {
        // First check our direct items list
        if (itemTransforms != null && itemTransforms.Count > 0)
            return itemTransforms.Count;
            
        // Otherwise check the collection
        if (collection != null) 
        {
            return collection.Items.Count();
        }
        
        return 0;
    }
    
    /// <summary>
    /// Called when the CollectionView's model is updated
    /// </summary>
    private void OnModelUpdated()
    {
        if (autoUpdateLayout)
        {
            ApplyLayout();
        }
    }

    /// <summary>
    /// Calculates the optimal number of columns based on item count
    /// </summary>
    private void CalculateOptimalColumns()
    {
        int itemCount = GetItemCount();
        
        // Handle special cases to avoid crashes
        if (itemCount <= 0)
        {
            columns = 1; // Default to 1 column for empty collections
            return;
        }
        
        if (itemCount == 1)
        {
            columns = 1; // Single item needs just 1 column
            return;
        }
        
        // Calculate columns as ceiling of square root of item count
        // This creates a grid that's roughly square
        columns = Mathf.CeilToInt(Mathf.Sqrt(itemCount));
    }

    #endregion
} 