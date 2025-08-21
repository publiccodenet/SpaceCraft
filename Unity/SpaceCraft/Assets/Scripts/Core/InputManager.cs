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
    
    [Header("Camera Boundaries")]
    public float minX = -12f;
    public float maxX = 12f;
    public float minZ = -12f;
    public float maxZ = 12f;
    public float minZoom = 10f;
    public float maxZoom = 100f;
    public float cameraVelocitySmoothingFactor = 0.05f; // for smooth release physics

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
    
    // Camera state
    private Vector3 previousMousePosition;
    private Vector3 cameraVelocity = Vector3.zero;
    private Vector3 filteredVelocity = Vector3.zero;
    private bool physicsEnabled = true;
    private float lastDragTime;
    private Vector3 dragStartPosition;
    private Vector3 dragStartWorldPos;
     
    void Start()
    {
        spaceCraft = FindObjectOfType<SpaceCraft>();
        cameraController = FindObjectOfType<CameraController>();
        if (cameraController != null)
        {
            _mainCamera = cameraController.controlledCamera;
        }
        
        UpdatePhysicsMaterials();
        UpdateRigidbodySettings();
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
        } else {
            // Start camera dragging
            dragStartPosition = Input.mousePosition;
            dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
            lastDragTime = Time.realtimeSinceStartup;
            physicsEnabled = false;
            cameraVelocity = Vector3.zero;
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
            // This part of the code seems to have been reimplemented and might need further restoration if item dragging is also broken.
            // For now, focusing on the camera pan.
            Vector3 worldDelta = _mainCamera.ScreenToWorldPoint(new Vector3(mouseDelta.x, mouseDelta.y, _mainCamera.WorldToScreenPoint(draggedItem.transform.position).z));
            draggedItem.transform.position += worldDelta;
        }
        else
        {
            // Pan the camera (restored logic)
            float deltaTime = Time.realtimeSinceStartup - lastDragTime;
            if (deltaTime < 0.001f) return;

            Vector3 currentWorldUnderMouse = GetWorldPositionAtScreenPoint(currentMousePos);
            Vector3 worldDelta = dragStartWorldPos - currentWorldUnderMouse;

            MoveCameraRig(worldDelta); 

            Vector3 instantVelocity = worldDelta / deltaTime;
            filteredVelocity = Vector3.Lerp(filteredVelocity, instantVelocity, cameraVelocitySmoothingFactor);
            
            lastDragTime = Time.realtimeSinceStartup;
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
    
    private void UpdateRigidbodySettings()
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
        ItemView[] allItemViewsArray = UnityEngine.Object.FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        return new List<ItemView>(allItemViewsArray);
    }
    
    // --- Restored Camera Methods ---

    private Vector3 GetWorldPositionAtScreenPoint(Vector3 screenPos)
    {
        Plane plane = new Plane(Vector3.up, Vector3.zero); // Ground plane
        Ray ray = _mainCamera.ScreenPointToRay(screenPos);
        
        if (plane.Raycast(ray, out float enter))
        {
            return ray.GetPoint(enter);
        }
        
        Debug.LogWarning("GetWorldPositionAtScreenPoint: Raycast did not hit ground plane.");
        screenPos.z = _mainCamera.nearClipPlane;
        return _mainCamera.ScreenToWorldPoint(screenPos); 
    }

    private void MoveCameraRig(Vector3 worldDelta)
    {
        if (cameraController == null || cameraController.cameraRig == null) return;
        Vector3 currentPosition = cameraController.cameraRig.position;
        Vector3 targetPosition = currentPosition + worldDelta;
        
        targetPosition.x = Mathf.Clamp(targetPosition.x, minX, maxX);
        targetPosition.y = currentPosition.y;
        targetPosition.z = Mathf.Clamp(targetPosition.z, minZ, maxZ);
        
        cameraController.cameraRig.position = targetPosition;
        EnforceBoundaries();
    }

    private void EnforceBoundaries()
    {
        if (cameraController == null || cameraController.cameraRig == null) return;
        Vector3 position = cameraController.cameraRig.position;
        position.x = Mathf.Clamp(position.x, minX, maxX);
        position.z = Mathf.Clamp(position.z, minZ, maxZ);
        if (cameraController.cameraRig.position != position)
        {
            cameraController.cameraRig.position = position;
        }
    }

    // Missing methods that other classes depend on
    public Vector3 GetPanCenter()
    {
        // This method was not in the original file, so it's not included here.
        // If it's needed, it should be added to the original file or this one.
        return Vector3.zero; // Placeholder
    }
}
