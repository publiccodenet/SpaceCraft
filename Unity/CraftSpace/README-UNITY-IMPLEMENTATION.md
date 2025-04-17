# CraftSpace Unity Implementation Guide

This document provides a comprehensive guide to the Unity implementation of CraftSpace, explaining the architecture, components, and setup process.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [View System](#view-system)
4. [Layout System](#layout-system)
5. [Control System](#control-system)
6. [Prefab Setup](#prefab-setup)
7. [Scene Setup](#scene-setup)

## Architecture Overview

CraftSpace follows a Model-View-Renderer architecture:

- **Models**: Data containers that hold collection and item metadata (Schema-based)
- **Views**: Components that display models and manage user interaction
- **Renderers**: Specialized components that provide specific visualizations of models
- **Layout**: Components that arrange views in 3D space
- **Controls**: Components that handle user input and camera movement

This architecture provides:
- Clean separation of concerns
- Type-safe data handling
- Flexible visualization options
- Reusable components

## Core Components

### Brewster

Named after Brewster Kahle (founder of the Internet Archive), the Brewster class is the central orchestrator that:

- Manages content discovery and loading
- Handles the lifecycle of collections and items
- Provides registry functionality for models
- Coordinates asset management and caching

```csharp
public class Brewster : MonoBehaviour
{
    // Singleton instance
    public static Brewster Instance { get; private set; }
    
    // Collection management
    public Dictionary<string, Collection> Collections { get; private set; }
    
    // Core methods
    public void GetCollection(string collectionId, Action<Collection> callback);
    public Item GetItem(string itemId);
    public void LoadCollectionAsync(string collectionId, Action<Collection> callback);
    // ...
}
```

### CollectionBrowserManager

Manages the display of multiple collections:

- Creates layout objects for collections
- Handles collection selection and focusing
- Coordinates collection-level operations

```csharp
public class CollectionBrowserManager : MonoBehaviour
{
    public ViewFactory viewFactory;
    public Transform collectionsContainer;
    
    // Methods
    public void DisplayCollection(string collectionId);
    public void FocusCollection(Collection collection);
    // ...
}
```

## View System

The view system follows a generic Model-View pattern using the `IModelView<T>` interface:

```csharp
public interface IModelView<T> where T : class
{
    T Model { get; }
    void HandleModelUpdated();
}
```

### CollectionView

Displays a collection and manages its item views:

```csharp
public class CollectionView : MonoBehaviour, IModelView<Collection>
{
    public Collection model;
    public Transform itemContainer;
    public event Action ModelUpdated;
    
    // IModelView implementation
    public Collection Model { get => model; }
    
    // Methods
    public void SetModel(Collection value);
    public void HandleModelUpdated();
    public void CreateItemViews();
    // ...
}
```

### ItemViewsContainer

A key component that manages multiple visualizations of a single item:

```csharp
public class ItemViewsContainer : MonoBehaviour
{
    private List<ItemView> itemViews = new List<ItemView>();
    private Item _item;
    
    // Properties
    public Item Item { get => _item; set => SetItem(value); }
    public List<ItemView> ItemViews => itemViews;
    
    // Methods
    private void SetItem(Item value);
    private void UpdateItemViews();
    public void SetCollectionContext(string collectionId);
    // ...
}
```

### ItemView

Base class for item visualizations:

```csharp
public class ItemView : MonoBehaviour, IModelView<Item>
{
    public Item model;
    
    // IModelView implementation
    public Item Model { get => model; set => SetModel(value); }
    
    // Methods
    public void SetModel(Item newModel);
    public void HandleModelUpdated();
    public void UpdateView();
    public void SetHighlighted(bool highlighted);
    public void SetSelected(bool selected);
    // ...
}
```

### ViewFactory

Creates and configures view objects:

```csharp
public class ViewFactory : MonoBehaviour
{
    // Prefab references
    public GameObject collectionViewPrefab;
    public GameObject itemViewPrefab;
    public GameObject itemViewsContainerPrefab;
    
    // Methods
    public CollectionView CreateCollectionView(Collection model, Transform container);
    public ItemView CreateItemView(Item model, Transform container, string collectionId);
    public ItemViewsContainer CreateItemViewsContainer(Item model, Transform container, string collectionId);
    // ...
}
```

## Layout System

### CollectionGridLayout

Arranges items in a configurable grid:

```csharp
public class CollectionGridLayout : MonoBehaviour
{
    // Configuration
    public float cellSize = 1f;
    public float spacingHorizontal = 0.2f;
    public float spacingVertical = 0.8f;
    public int columns = 4;
    public bool autoUpdateLayout = true;
    public bool centerHorizontally = true;
    
    // State
    public List<Transform> itemTransforms = new List<Transform>();
    public Collection collection;
    public CollectionView collectionView;
    
    // Methods
    public void ApplyLayout();
    public Vector2 GetGridSize();
    public Vector2Int GetGridPosition(int index);
    public Vector3 GetPositionForGridPosition(Vector2Int gridPosition);
    // ...
}
```

## Control System

### CameraController

Handles camera movement and interaction:

```csharp
public class CameraController : MonoBehaviour
{
    // Camera reference
    public Camera targetCamera;
    
    // Movement settings
    public float moveSpeed = 5f;
    public float fastMoveSpeed = 15f;
    public float rotationSpeed = 60f;
    public float zoomSpeed = 10f;
    
    // Smoothing
    public float movementSmoothTime = 0.2f;
    public float rotationSmoothTime = 0.1f;
    public float zoomSmoothTime = 0.1f;
    
    // Methods
    public void FocusOnPosition(Vector3 position);
    public void FocusOnObject(GameObject target);
    // ...
}
```

### InputManager

Manages input handling and item interaction:

```csharp
public class InputManager : MonoBehaviour
{
    // Camera references
    public Camera camera;
    
    // UI references
    public ItemInfoPanel itemInfoPanel;
    public CollectionDisplay collectionDisplay;
    
    // Event system
    public UnityEvent<ItemView> OnItemSelected;
    public UnityEvent<ItemView> OnItemDeselected;
    public UnityEvent<ItemView> OnItemHoverStart;
    public UnityEvent<ItemView> OnItemHoverEnd;
    
    // Methods
    private void UpdateHoveredItem();
    public void SelectItem(ItemView itemView);
    public void DeselectItem();
    // ...
}
```

### CollectionDisplay

Manages the display of item details:

```csharp
public class CollectionDisplay : MonoBehaviour
{
    // References
    public CollectionView collectionView;
    public GameObject itemInfoPanel;
    public TextMeshProUGUI itemTitleText;
    public InputManager inputManager;
    
    // Event handlers
    private void HandleItemHoverStart(ItemView itemView);
    private void HandleItemHoverEnd(ItemView itemView);
    private void HandleItemSelected(ItemView itemView);
    private void HandleItemDeselected(ItemView itemView);
    
    // Methods
    public void DisplayItemDetails(Item item);
    public void HideItemDetails();
    // ...
}
```

## Prefab Setup

### ItemView Prefab

The base ItemView prefab is a template for item visualization:

1. Create an empty GameObject named "ItemViewPrefab"
2. Add these components:
   - **ItemView** script
   - **BoxCollider** (Size: X=1.5, Y=1.5, Z=0.1, Is Trigger: true)
3. Set Layer to "Items"
4. Configure ItemView component settings:
   - Set appropriate distances for different detail levels

### ItemViewsContainer Prefab

The container manages multiple ItemView instances for a single item:

1. Create an empty GameObject named "ItemViewsContainer"
2. Add these components:
   - **ItemViewsContainer** script
   - **BoxCollider** (Size: X=1.5, Y=1.5, Z=0.1, Is Trigger: true)
3. Set Layer to "Items"
4. Add specialized view prefabs as children:
   - **SingleImageItemView**
   - **ItemLabelView**
5. Configure references in the ItemViewsContainer component

### CollectionView Prefab

The collection view manages a set of items:

1. Create an empty GameObject named "CollectionViewPrefab"
2. Add these components:
   - **CollectionView** script
   - **CollectionGridLayout** script
3. Configure CollectionGridLayout settings:
   - Cell Size: 1.0
   - Spacing Horizontal: 0.2
   - Spacing Vertical: 0.8
   - Columns: 4
   - Auto Update Layout: true
   - Center Horizontally: true
4. Configure item container references

## Scene Setup

### Required Components

A properly configured scene requires these key components:

1. **Managers GameObject**
   - Add **Brewster** component
   - Add **ViewFactory** component
   - Add **CollectionBrowserManager** component
   - Add **InputManager** component

2. **Camera Rig**
   - Add **Camera** component
   - Add **CameraController** component
   - Configure camera settings (orthographic, etc.)

3. **UI Canvas**
   - Add **ItemInfoPanel**
   - Add **CollectionDisplay** component
   - Configure UI elements

4. **Collections Container**
   - Empty transform to hold collection views

### Layer Setup

1. Go to Edit > Project Settings > Tags and Layers
2. Configure Layer 6 as "Items"
3. Set up appropriate layer collision matrix

### Required Prefabs

Ensure these prefabs are created and assigned:

1. **ItemViewPrefab**
2. **ItemViewsContainerPrefab**
3. **CollectionViewPrefab**
4. **SingleImageItemViewPrefab**
5. **ItemLabelViewPrefab**

### Component Configuration

1. **Brewster**:
   - Set default collection IDs
   - Configure caching settings

2. **ViewFactory**:
   - Assign all required prefabs
   - Set default containers

3. **InputManager**:
   - Assign camera reference
   - Configure selection settings
   - Set up event listeners

4. **CollectionDisplay**:
   - Assign CollectionView reference
   - Configure UI elements
   - Set up InputManager reference

### Step-by-Step Scene Creation

1. Create a new scene
2. Create a "Managers" GameObject
   - Add Brewster component
   - Add ViewFactory component
   - Add CollectionBrowserManager component
   - Add InputManager component

3. Create a "CameraRig" GameObject
   - Add Camera component
   - Add CameraController component
   - Configure camera settings

4. Create a "UI" GameObject
   - Add Canvas component
   - Add ItemInfoPanel prefab
   - Add CollectionDisplay component
   - Configure UI layout

5. Create a "Collections" GameObject
   - This will be the container for collection views

6. Configure component references:
   - Set ViewFactory prefab references
   - Set CollectionBrowserManager.viewFactory
   - Set InputManager.camera
   - Set CollectionDisplay.inputManager
   - Set CollectionDisplay.collectionView (after first collection is created)

7. Set up event subscriptions:
   - InputManager events to CollectionDisplay
   - Model update events to views

8. Run the scene and test with:
   - Brewster.Instance.GetCollection("test", OnCollectionLoaded); 