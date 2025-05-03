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
    /// <returns>The ID of the next item in the direction, or null if no valid move exists.</returns>
    public abstract string GetNextItemId(string currentItemId, string direction);
} 