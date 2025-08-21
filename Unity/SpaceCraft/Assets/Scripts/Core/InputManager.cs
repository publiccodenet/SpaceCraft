using UnityEngine;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// Handles camera panning, zooming, physics-based movement, and item selection.
/// </summary>
public class InputManager : MonoBehaviour
{
    [Header("Physics Materials")]
    [ExposedParameter(
        "Static Friction", 
        Category = "Physics Materials", 
        Description = "Resistance to start moving", 
        Min = 0f, Max = 20f, 
        Default = 0.5f, Visible = true)]
    public float staticFriction = 0.5f;
    
    [ExposedParameter(
        "Dynamic Friction", 
        Category = "Physics Materials", 
        Description = "Resistance while moving", 
        Min = 0f, Max = 20f, 
        Default = 0.3f, Visible = true)]
    public float dynamicFriction = 0.3f;
    
    [ExposedParameter(
        "Bounciness", 
        Category = "Physics Materials",
        Description = "How much items bounce when they collide", 
        Min = 0f, Max = 1f, 
        Default = 0.3f, Visible = true)]
    public float bounciness = 0.3f;
    
    [Header("Rigidbody Settings")]
    [ExposedParameter(
        "Rigidbody Drag", 
        Category = "Rigidbody", 
        Description = "Linear drag for all items", 
        Min = 0f, Max = 20f, 
        Default = 1.5f, Visible = true)]
    public float rigidbodyDrag = 1.5f;
    
    [ExposedParameter(
        "Angular Drag", 
        Category = "Rigidbody", 
        Description = "Angular drag for all items", 
        Min = 0f, Max = 20f, 
        Default = 5f, Visible = true)]
    public float rigidbodyAngularDrag = 5f;
    
    [ExposedParameter(
        "Max Item Velocity", 
        Category = "Physics Limits",
        Description = "Maximum speed limit for items", 
        Min = 1f, Max = 100f, 
        Default = 30f, Visible = true)]
    public float maxItemVelocity = 30f;
    
    [Header("Mouse Controls")]
    [ExposedParameter(
        "Tap Scale", 
        Category = "Mouse", 
        Description = "Scale multiplier when tapping items", 
        Min = 0.5f, Max = 2f, 
        Default = 1.2f, Visible = true)]
    public float tapScale = 1.2f;
    
    [ExposedParameter(
        "Nudge Force", 
        Category = "Mouse", 
        Description = "Force applied when nudging items", 
        Min = 1f, Max = 100f, 
        Default = 10f, Visible = true)]
    public float selectionNudgeForce = 10f;
    
    [ExposedParameter(
        "Thrust Force", 
        Category = "Mouse", 
        Description = "Force applied when thrusting items", 
        Min = 1f, Max = 50f, 
        Default = 5f, Visible = true)]
    public float selectionThrustForce = 5f;
    
    // Physics materials
    public PhysicsMaterial itemPhysicsMaterial;
    public PhysicsMaterial groundPhysicsMaterial;
    
    // References
    private SpaceCraft spaceCraft;
    private Camera _mainCamera;
    private CameraController cameraController;
    
    // Mouse state
    private bool isDragging = false;
    private bool isDraggingItem = false;
    private Vector3 lastMousePosition;
    private BaseView hoveredItem;
    private BaseView draggedItem;
    
    void Start()
    {
        spaceCraft = FindObjectOfType<SpaceCraft>();
        cameraController = FindObjectOfType<CameraController>();
        if (cameraController != null)
        {
            _mainCamera = cameraController.controlledCamera;
        }
        
        UpdatePhysicsMaterials();
        UpdateItemViewRigidbodySettings();
    }

    void Update()
    {
        HandleInput();
            UpdateHoveredItem();
        UpdatePhysicsMaterials();
    }
    
    void FixedUpdate()
    {
        // Apply magnet physics forces
            ApplyMagnetForces();
    }

    private void HandleInput()
    {
        // Mouse input handling
        if (Input.GetMouseButtonDown(0))
        {
            HandleMouseDown();
        }
        else if (Input.GetMouseButtonUp(0))
        {
            HandleMouseUp();
        }
        
        if (isDragging)
        {   
            HandleMouseDrag();
        }
    }
    
    private void HandleMouseDown()
    {
        Vector3 mousePos = Input.mousePosition;
        Ray ray = _mainCamera.ScreenPointToRay(mousePos);
        
        if (Physics.Raycast(ray, out RaycastHit hit))
        {
            BaseView clickedObject = hit.collider.GetComponent<BaseView>();
            if (clickedObject != null)
            {
                if (clickedObject is ItemView itemView)
                {
                    // Select and tap scale the item
                    spaceCraft?.SelectItem("mouse", "Mouse", itemView.Model?.Id ?? "");
                    itemView.ApplyTapScale(tapScale);
                }
                
                // Start dragging
                draggedItem = clickedObject;
                isDraggingItem = true;
            }
        }
        
        isDragging = true;
        lastMousePosition = mousePos;
    }
    
    private void HandleMouseUp()
    {
        isDragging = false;
        isDraggingItem = false;
        draggedItem = null;
    }
    
    private void HandleMouseDrag()
    {
        Vector3 currentMousePos = Input.mousePosition;
        Vector3 mouseDelta = currentMousePos - lastMousePosition;
        
        if (isDraggingItem && draggedItem != null)
        {
            // Drag the item
            Vector3 worldDelta = _mainCamera.ScreenToWorldPoint(new Vector3(mouseDelta.x, mouseDelta.y, _mainCamera.WorldToScreenPoint(draggedItem.transform.position).z));
            draggedItem.transform.position += worldDelta;
                }
                else
                {
            // Pan the camera
            cameraController?.HandlePan(-mouseDelta);
        }
        
        lastMousePosition = currentMousePos;
    }
    
    private void UpdateHoveredItem()
    {
        if (isDraggingItem) return;
        
        Vector3 mousePos = Input.mousePosition;
        Ray ray = _mainCamera.ScreenPointToRay(mousePos);
        
        BaseView newHoveredItem = null;
        if (Physics.Raycast(ray, out RaycastHit hit))
        {
            newHoveredItem = hit.collider.GetComponent<BaseView>();
        }
        
        if (newHoveredItem != hoveredItem)
        {
            hoveredItem?.OnHoverExit();
            hoveredItem = newHoveredItem;
            hoveredItem?.OnHoverEnter();
        }
    }
    
    private void UpdatePhysicsMaterials()
    {
        if (itemPhysicsMaterial != null)
        {
            itemPhysicsMaterial.staticFriction = staticFriction;
            itemPhysicsMaterial.dynamicFriction = dynamicFriction;
            itemPhysicsMaterial.bounciness = bounciness;
        }
        
        if (groundPhysicsMaterial != null)
        {
            groundPhysicsMaterial.staticFriction = staticFriction;
            groundPhysicsMaterial.dynamicFriction = dynamicFriction;
            groundPhysicsMaterial.bounciness = bounciness;
        }
    }
    
    private void UpdateItemViewRigidbodySettings()
    {
        ItemView[] allItems = UnityEngine.Object.FindObjectsByType<ItemView>();
        foreach (var itemView in allItems)
        {
            Rigidbody rb = itemView.GetComponent<Rigidbody>();
            if (rb != null && itemView.GetComponent<MagnetView>() == null)
            {
                rb.drag = rigidbodyDrag;
                rb.angularDrag = rigidbodyAngularDrag;
                
                if (rb.velocity.magnitude > maxItemVelocity)
                {
                    rb.velocity = rb.velocity.normalized * maxItemVelocity;
                }
            }
        }
    }
    
    private void ApplyMagnetForces()
    {
        MagnetView[] allMagnets = UnityEngine.Object.FindObjectsByType<MagnetView>();
        if (allMagnets.Length == 0) return;
        
        ItemView[] allItems = UnityEngine.Object.FindObjectsByType<ItemView>();
        if (allItems.Length == 0) return;
        
        foreach (MagnetView magnet in allMagnets)
        {
            if (magnet == null || !magnet.magnetEnabled) continue;
            
            foreach (ItemView itemView in allItems)
        {
            if (itemView?.GetComponent<Rigidbody>() == null) continue;
            
            Rigidbody rb = itemView.GetComponent<Rigidbody>();
                if (rb.isKinematic) continue;
                
                Vector3 magneticForce = magnet.CalculateMagneticForce(itemView);
                
                if (magneticForce.magnitude > 0.001f)
                {
                    rb.AddForce(magneticForce, ForceMode.Force);
                    
                    if (rb.IsSleeping() && magneticForce.magnitude > 0.1f)
                {
                    rb.WakeUp();
                    }
                }
                
            if (rb.linearVelocity.magnitude > maxItemVelocity)
            {
                rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
            }
        }
        }
    }
    
    public List<ItemView> GetAllItemViews()
    {
        ItemView[] allItemViewsArray = UnityEngine.Object.FindObjectsByType<ItemView>();
        return new List<ItemView>(allItemViewsArray);
    }
}
