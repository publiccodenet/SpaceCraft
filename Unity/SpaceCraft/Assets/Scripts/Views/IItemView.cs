//------------------------------------------------------------------------------
// <file_path>Unity/SpaceCraft/Assets/Scripts/Schemas/IItemView.cs</file_path>
// <namespace>SpaceCraft</namespace>
// <assembly>Assembly-CSharp</assembly>
//
// IMPORTANT: This is a MANUAL interface for item views.
// It is NOT generated and should be maintained manually.
//
// Full absolute path: /Users/a2deh/GroundUp/SpaceCraft/SpaceCraft/Unity/SpaceCraft/Assets/Scripts/Schemas/IItemView.cs
//------------------------------------------------------------------------------

/// <summary>
/// Interface for views that observe items
/// </summary>
public interface IItemView
{
    /// <summary>
    /// Called when an Item is updated
    /// </summary>
    /// <param name="item">The updated item</param>
    void OnItemUpdated(Item item);
} 