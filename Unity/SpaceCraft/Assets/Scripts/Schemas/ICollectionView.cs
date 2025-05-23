//------------------------------------------------------------------------------
// <file_path>Unity/SpaceCraft/Assets/Scripts/Schemas/ICollectionView.cs</file_path>
// <namespace>SpaceCraft</namespace>
// <assembly>Assembly-CSharp</assembly>
//
// IMPORTANT: This is a MANUAL interface for collection views.
// It is NOT generated and should be maintained manually.
//
// Full absolute path: /Users/a2deh/GroundUp/SpaceCraft/SpaceCraft/Unity/SpaceCraft/Assets/Scripts/Schemas/ICollectionView.cs
//------------------------------------------------------------------------------

using UnityEngine;

/// <summary>
/// Interface for views that observe collections
/// </summary>
public interface ICollectionView
{
    /// <summary>
    /// Called when the observed collection is updated
    /// </summary>
    /// <param name="collection">The updated collection</param>
    void OnCollectionUpdated(Collection collection);
} 