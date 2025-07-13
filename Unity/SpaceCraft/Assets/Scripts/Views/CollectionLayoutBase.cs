using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Base class for defining collection item layout logic.
/// Inherits from MonoBehaviour so it can be added as a component.
/// </summary>
public abstract class CollectionLayoutBase : MonoBehaviour
{
    /// <summary>
    /// Abstract method to apply layout positioning.
    /// </summary>
    /// <param name="containers">The list of ItemViewsContainer objects to position.</param>
    /// <param name="parent">The parent transform under which containers are organized.</param>
    public abstract void ApplyLayout(List<ItemViewsContainer> containers, Transform parent);

    /// <summary>
    /// Abstract method to calculate the ID of the next item in a given direction.
    /// </summary>
    /// <param name="currentItemId">The ID of the starting item.</param>
    /// <param name="direction">Direction to move (e.g., "north", "south", "east", "west").</param>
    /// <param name="dx">Mouse delta X in pixels</param>
    /// <param name="dy">Mouse delta Y in pixels</param>
    /// <returns>The ID of the next item in the direction, or null if no valid move exists.</returns>
    public abstract string GetNextItemId(string currentItemId, string direction, float dx = 0f, float dy = 0f);
    
    /// <summary>
    /// Virtual method to calculate the ID of the next item using grid-based logic.
    /// Can be overridden by subclasses that support grid-based navigation.
    /// </summary>
    /// <param name="currentItemId">The ID of the starting item.</param>
    /// <param name="direction">Direction to move (e.g., "north", "south", "east", "west").</param>
    /// <returns>The ID of the next item in the direction, or null if no valid move exists.</returns>
    public virtual string GetNextGridItemId(string currentItemId, string direction)
    {
        // Default implementation returns null - subclasses can override
        return null;
    }
} 