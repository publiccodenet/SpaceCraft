# CollectionLayoutPrefab Creation Instructions

Follow these steps to create the CollectionLayoutPrefab:

1. In Unity, right-click in the Hierarchy window and select "Create Empty"
2. Rename the new GameObject to "CollectionLayoutPrefab"
3. With the CollectionLayoutPrefab GameObject selected, add these components in the Inspector:
   - Add Component > Scripts > Layout > CollectionGridLayout
4. Configure the CollectionGridLayout component:
   - Item Width: 2.0
   - Item Height: 2.5
   - Item Spacing: 0.5
   - Center Grid: true
   - Item View Prefab: Drag your ItemViewPrefab here
5. Save the prefab:
   - Drag the GameObject from the Hierarchy to your Assets/Prefabs folder
   - This creates a prefab asset that can be used by the CollectionBrowserManager

The CollectionLayoutPrefab manages the spatial arrangement of items in a collection.
It will instantiate and position ItemView objects in a grid layout based on collection data. 