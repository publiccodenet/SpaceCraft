using UnityEngine;
using System;
using System.Collections.Generic;
using UnityEngine.UI;
using TMPro;
using Newtonsoft.Json.Linq;

/// <summary>
/// Handles camera panning, zooming, physics-based movement, and item selection.
/// Relies on an assigned CameraController to access the camera and its rig.
/// </summary>
public class InputManager : MonoBehaviour
{
    [Header("Camera Control References")]
    public CameraController cameraController; // Reference to the controller holding Camera & Rig refs

    [Header("Pan Settings")]
    public float panSpeed = 3f;
    public float minX = -12f;
    public float maxX = 12f;
    public float minZ = -12f;
    public float maxZ = 12f;
    public bool invertDrag = false;
    public float navigatorPanScaleFactor = 0.1f; // Scales navigator pan delta based on zoom

    [Header("Zoom Settings")]
    public float minZoom = 0.1f; // Min Orthographic Size
    public float maxZoom = 100f; // Max Orthographic Size
    public float scrollWheelZoomFactor = 2f; // Multiplicative factor per scroll unit
    public float keyboardZoomFactor = 5f; // Multiplicative factor per second
    public float navigatorZoomFactor = 1f; // Was 0.5f 

    [Header("Physics Settings")]
    public float baseVelocityThreshold = 0.2f;
    public float velocitySmoothingFactor = 0.1f; 
    public float frictionFactor = 0.999f;
    public float bounceFactor = 0.9f; 
    public float navigatorVelocityFactor = 1f; // Multiplier for PushCameraVelocity

    [Header("UI References")]
    public ItemInfoPanel itemInfoPanel;
    public LayerMask itemLayer;

    [Header("UI Settings")]
    public float descriptionScale = 0.8f;
    
    [Header("Selection Settings")]
    public float maxSelectionDistance = 100f;
    public float selectMaxClickDistance = 0.1f; 
    public float selectMaxClickTime = 0.3f; 
    
    // State variables
    private bool isDragging = false;
    private Vector3 previousMousePosition;
    private Vector3 cameraVelocity = Vector3.zero;
    private Vector3 filteredVelocity = Vector3.zero;
    private bool physicsEnabled = true;
    private float lastDragTime;
    private Vector3 dragStartPosition;
    private Vector3 dragStartWorldPos;
    private ItemView itemAtDragStart;
    private ItemView hoveredItem;
    private SpaceCraft spaceCraft;
    private Camera _mainCamera; // Cache the controlled camera

    private void Start()
    {
        if (cameraController == null || cameraController.controlledCamera == null || cameraController.cameraRig == null)
        {
            Debug.LogError("InputManager: CameraController, its controlled Camera, or its CameraRig is not assigned!");
            enabled = false;
            return;
        }
        _mainCamera = cameraController.controlledCamera; // Cache the camera
        
        spaceCraft = GetComponent<SpaceCraft>();
        if (spaceCraft == null)
        {
            Debug.LogError("InputManager: No SpaceCraft found on the same GameObject.");
            enabled = false;
            return;
        }
    }

    private void Update()
    {
        HandleInput();
        UpdateHoveredItem();
    }

    private void HandleInput()
    {
        // Mouse Button Down (Start Drag / Potential Click)
        if (Input.GetMouseButtonDown(0))
        {
            isDragging = true;
            previousMousePosition = Input.mousePosition;
            dragStartPosition = Input.mousePosition;
            dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition); // Use helper
            lastDragTime = Time.realtimeSinceStartup;
            physicsEnabled = false;
            cameraVelocity = Vector3.zero;
            itemAtDragStart = hoveredItem;
        }
        // Mouse Button Up (End Drag / Complete Click)
        else if (Input.GetMouseButtonUp(0))
        {
            bool wasDragging = isDragging;
            isDragging = false;
            
            if (wasDragging)
            {
                float dragDistance = Vector3.Distance(dragStartWorldPos, GetWorldPositionAtScreenPoint(Input.mousePosition));
                float dragTime = Time.realtimeSinceStartup - lastDragTime;
                
                if (dragDistance < selectMaxClickDistance && dragTime < selectMaxClickTime && itemAtDragStart != null && itemAtDragStart.Model != null)
                {
                    // Pass default controller info for mouse click selection toggle
                    spaceCraft.ToggleItemSelection("mouse_input", "Local Mouse", itemAtDragStart.Model.Id);
                }
                else if (filteredVelocity.magnitude > GetScaledVelocityThreshold())
                {
                    cameraVelocity = filteredVelocity;
                    physicsEnabled = true;
                }
            }
            itemAtDragStart = null;
        }
        
        // Active Dragging (Mouse)
        if (isDragging)
        {   
            HandleMouseDrag();
        }

        // Other Inputs
        HandleKeyboardPan();
        HandleMouseZoom(Input.GetAxis("Mouse ScrollWheel"));
        HandleKeyboardZoom();
        
        // Physics
        if (physicsEnabled)
        {
            ApplyPhysics();
        }
    }

    // --- Internal Input Handling Methods ---

    private void HandleMouseDrag()
    { 
        Vector3 currentMousePos = Input.mousePosition;
        float deltaTime = Time.realtimeSinceStartup - lastDragTime;
        if (deltaTime < 0.001f) return; // Avoid excessive calculations if time hasn't passed

        // Get world positions on the ground plane (y=0)
        Vector3 oldWorldPos = GetWorldPositionAtScreenPoint(previousMousePosition);
        Vector3 newWorldPos = GetWorldPositionAtScreenPoint(currentMousePos);
        Vector3 worldDelta = oldWorldPos - newWorldPos; // This is the desired camera movement

        if (invertDrag) worldDelta = -worldDelta;

        // Directly move the camera rig
        MoveCameraRig(worldDelta); 

        // Update velocity tracking for potential physics release
        Vector3 instantVelocity = worldDelta / deltaTime;
        filteredVelocity = Vector3.Lerp(filteredVelocity, instantVelocity, velocitySmoothingFactor);
        
        previousMousePosition = currentMousePos;
        lastDragTime = Time.realtimeSinceStartup;
    }

    private void HandleKeyboardPan()
    {
        Vector3 moveDirectionDelta = Vector3.zero;
        if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) moveDirectionDelta.x -= 1;
        if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) moveDirectionDelta.x += 1;
        if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) moveDirectionDelta.z += 1;
        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) moveDirectionDelta.z -= 1;

        if (moveDirectionDelta != Vector3.zero)
        {
            physicsEnabled = false;
            cameraVelocity = Vector3.zero;
            moveDirectionDelta.Normalize();
            
            // Scale delta by speed, time, and current zoom
            float scaleFactor = panSpeed * Time.deltaTime * _mainCamera.orthographicSize * 0.5f; // Adjust pan speed based on zoom
            Vector3 worldPanDelta = moveDirectionDelta * scaleFactor;
            
            // Directly move the camera rig
            MoveCameraRig(worldPanDelta);
        }
        else if (!isDragging && !physicsEnabled) 
        { 
            // Only re-enable physics if not dragging AND keyboard was just released
            // This check might need refinement depending on desired interaction
             physicsEnabled = true; 
        }
    }

    private void HandleMouseZoom(float scrollWheelDelta)
    {
        if (Mathf.Approximately(scrollWheelDelta, 0)) return;
        
        float currentZoom = _mainCamera.orthographicSize;
        float zoomMultiplier = 1.0f - (scrollWheelDelta * scrollWheelZoomFactor); // Invert scroll delta
        float targetZoom = currentZoom * zoomMultiplier;
        targetZoom = Mathf.Clamp(targetZoom, minZoom, maxZoom);
        
        ApplyZoomAroundPoint(targetZoom, GetWorldPositionAtScreenPoint(Input.mousePosition)); // Zoom relative to mouse
    }
    
    private void HandleKeyboardZoom()
    {
        float keyboardZoomDelta = 0f;
        if (Input.GetKey(KeyCode.Comma)) keyboardZoomDelta += 1f; // Zoom In (-) Ortho Size
        if (Input.GetKey(KeyCode.Period)) keyboardZoomDelta -= 1f; // Zoom Out (+) Ortho Size
        
        if (!Mathf.Approximately(keyboardZoomDelta, 0))
        {
            float currentZoom = _mainCamera.orthographicSize;
            // Note: Keyboard zoom is often additive or scaled by time, multiplicative feels too fast here
            float zoomChange = -keyboardZoomDelta * keyboardZoomFactor * Time.deltaTime; // Invert delta, scale by time
            float targetZoom = currentZoom + zoomChange;

            targetZoom = Mathf.Clamp(targetZoom, minZoom, maxZoom);
            
            // Apply zoom centered on screen center
            ApplyZoomAroundPoint(targetZoom, GetWorldPositionAtScreenCenter());
        }
    }
    
    // --- Bridge Methods --- 

    /// <summary>
    /// Receives position DELTA from Bridge (e.g., navigator controller)
    /// and applies it to the camera controller.
    /// Expects parameters: controllerId (string), controllerName (string), panXDelta (float), panYDelta (float)
    /// </summary>
    public void PushCameraPosition(string controllerId, string controllerName, float panXDelta, float panYDelta)
    {
        if (cameraController == null)
        {
            Debug.LogWarning($"PushCameraPosition ({controllerId} '{controllerName}'): Missing CameraController.");
            return;
        }

        // Invert panXDelta to correct left/right movement
        Vector3 worldDelta = new Vector3(-panXDelta, 0, panYDelta);

        // Log the input including the name
        Debug.Log($"Input: Pos from {controllerId} ('{controllerName}'): Delta=({panXDelta}, {panYDelta})");

        // Scale by current zoom level for consistent feel across zoom levels
        worldDelta *= (_mainCamera.orthographicSize * navigatorPanScaleFactor);

        // Stop existing physics movement when remote input is received
        physicsEnabled = false;
        cameraVelocity = Vector3.zero;
        filteredVelocity = Vector3.zero;

        // Directly move the camera rig
        MoveCameraRig(worldDelta);

        //Debug.Log($"PushCameraPosition from {controllerId}: Delta=({panXDelta}, {panYDelta}) -> World=({worldDelta.x}, {worldDelta.z})");
    }

    /// <summary>
    /// Receives zoom DELTA from Bridge (e.g., navigator controller)
    /// and applies it to the camera controller.
    /// Expects parameters: controllerId (string), controllerName (string), zoomDelta (float)
    /// </summary>
    public void PushCameraZoom(string controllerId, string controllerName, float zoomDelta)
    {
         if (cameraController == null)
        {
            Debug.LogWarning($"PushCameraZoom ({controllerId} '{controllerName}'): Missing CameraController.");
            return;
        }

        if (Mathf.Approximately(zoomDelta, 0)) return;

        float currentZoom = _mainCamera.orthographicSize;

        // Log the input including the name
        Debug.Log($"Input: Zoom from {controllerId} ('{controllerName}'): Delta={zoomDelta}");

        // Use a multiplicative factor based on the delta
        // A positive delta usually means zoom out (increase ortho size), negative means zoom in
        float zoomMultiplier = 1.0f + (zoomDelta * navigatorZoomFactor); 

        // Ensure multiplier is positive
        zoomMultiplier = Mathf.Max(0.01f, zoomMultiplier);

        float targetZoom = currentZoom * zoomMultiplier;
        targetZoom = Mathf.Clamp(targetZoom, minZoom, maxZoom);

        // Apply zoom centered on the screen center for navigator input
        ApplyZoomAroundPoint(targetZoom, GetWorldPositionAtScreenCenter());

        //Debug.Log($"PushCameraZoom from {controllerId}: Delta={zoomDelta}, TargetZoom={targetZoom}");
    }

    /// <summary>
    /// Receives velocity PUSH from Bridge (e.g., navigator controller) as 2D deltas
    /// and applies it as physics-based camera velocity.
    /// Expects parameters: controllerId (string), controllerName (string), panXDelta (float), panYDelta (float)
    /// </summary>
    public void PushCameraVelocity(string controllerId, string controllerName, float panXDelta, float panYDelta)
    {
        if (cameraController == null)
        {
             Debug.LogWarning($"PushCameraVelocity ({controllerId} '{controllerName}'): Missing CameraController.");
            return;
        }

        // Convert 2D pan deltas to a world-space velocity vector (similar to PushCameraPosition)
        // Invert panXDelta to correct left/right movement interpretation
        Vector3 worldVelocityDelta = new Vector3(-panXDelta, 0, panYDelta);

        // Log the input including the name
        Debug.Log($"Input: Velocity from {controllerId} ('{controllerName}'): Delta=({panXDelta}, {panYDelta})");

        // Apply sensitivity/scaling factor for navigator input
        // Maybe scale by zoom here too? Let's try without first, can add later if needed.
        worldVelocityDelta *= navigatorVelocityFactor; 

        // Add this velocity delta to the current camera velocity
        cameraVelocity += worldVelocityDelta;

        // Ensure physics simulation is enabled
        physicsEnabled = true;

        //Debug.Log($"PushCameraVelocity from {controllerId}: Delta=({panXDelta}, {panYDelta}) -> WorldVelDelta=({worldVelocityDelta.x}, {worldVelocityDelta.z}), NewTotalVelocity=({cameraVelocity.x}, {cameraVelocity.z})");
    }

    // --- Core Logic Helpers ---

    /// <summary>
    /// Moves the camera rig by a world-space delta, enforcing boundaries.
    /// </summary>
    private void MoveCameraRig(Vector3 worldDelta)
    {
        if (cameraController == null || cameraController.cameraRig == null) return;
        Vector3 currentPosition = cameraController.cameraRig.position;
        Vector3 targetPosition = currentPosition + worldDelta;
        
        // Clamp position immediately
        targetPosition.x = Mathf.Clamp(targetPosition.x, minX, maxX);
        targetPosition.y = currentPosition.y; // Keep Y the same
        targetPosition.z = Mathf.Clamp(targetPosition.z, minZ, maxZ);
        
        cameraController.cameraRig.position = targetPosition;
        EnforceBoundaries(); // Extra check
    }

    /// <summary>
    /// Applies zoom change and adjusts camera position to keep a world point stationary on screen.
    /// </summary>
    private void ApplyZoomAroundPoint(float targetOrthoSize, Vector3 zoomCenterWorldPos)
    {
        if (_mainCamera == null || cameraController == null || cameraController.cameraRig == null) return;
        
        float currentOrthoSize = _mainCamera.orthographicSize;
        if (Mathf.Approximately(currentOrthoSize, targetOrthoSize)) return; 

        // --- Calculate position adjustment --- 
        // Screen point corresponding to the zoom center *before* zoom
        Vector3 zoomCenterScreenPos = _mainCamera.WorldToScreenPoint(zoomCenterWorldPos);
        
        // Set the new zoom level directly
        _mainCamera.orthographicSize = targetOrthoSize; 

        // World position under that same screen point *after* zoom
        Vector3 zoomCenterWorldPosAfter = GetWorldPositionAtScreenPoint(zoomCenterScreenPos);
        
        // The difference is how much the rig needs to move to compensate
        Vector3 adjustment = zoomCenterWorldPos - zoomCenterWorldPosAfter;
        
        // --- Scale Physics Velocity (if active) --- 
        if (physicsEnabled && !Mathf.Approximately(currentOrthoSize, 0))
        {
            float velocityScale = targetOrthoSize / currentOrthoSize;
            cameraVelocity *= velocityScale;
        }

        // --- Apply Adjustment --- 
        MoveCameraRig(adjustment); // Move rig and clamp
    }

    private void ApplyPhysics()
    {
        if (cameraVelocity.sqrMagnitude < 0.0001f)
        {
            cameraVelocity = Vector3.zero;
            return;
        }
        
        cameraVelocity *= frictionFactor;
        Vector3 positionDelta = cameraVelocity * Time.deltaTime;
        
        Vector3 currentPosition = cameraController.cameraRig.position;
        Vector3 targetPosition = currentPosition + positionDelta;
        
        // bool bounced = false; // Unused variable
        // Check boundaries and bounce
        if (targetPosition.x < minX || targetPosition.x > maxX)
        {
            targetPosition.x = Mathf.Clamp(targetPosition.x, minX, maxX);
            cameraVelocity.x *= -bounceFactor;
            // bounced = true;
        }
        if (targetPosition.z < minZ || targetPosition.z > maxZ)
        {
            targetPosition.z = Mathf.Clamp(targetPosition.z, minZ, maxZ);
            cameraVelocity.z *= -bounceFactor;
            //  bounced = true;
        }
        
        cameraController.cameraRig.position = targetPosition;
    }
    
    private void EnforceBoundaries()
    {
        if (cameraController == null || cameraController.cameraRig == null) return;
        Vector3 position = cameraController.cameraRig.position;
        position.x = Mathf.Clamp(position.x, minX, maxX);
        // Keep Y as is: position.y = Mathf.Clamp(position.y, minY, maxY); 
        position.z = Mathf.Clamp(position.z, minZ, maxZ);
        if (cameraController.cameraRig.position != position)
        {
            cameraController.cameraRig.position = position;
            // Optionally kill velocity if hitting boundary hard
            // cameraVelocity = Vector3.zero;
        }
    }

    // --- Utility Methods ---

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
    
    private Vector3 GetWorldPositionAtScreenCenter()
    {
        return GetWorldPositionAtScreenPoint(new Vector3(_mainCamera.pixelWidth / 2f, _mainCamera.pixelHeight / 2f, 0));
    }
    
    private float GetScaledVelocityThreshold()
    {
        // Scale threshold based on zoom - higher zoom means smaller threshold for physics to feel right
        return baseVelocityThreshold * (_mainCamera.orthographicSize / 10f); // Adjust '10f' as a reference zoom level 
    }

    private void UpdateHoveredItem()
    {
        if (_mainCamera == null || spaceCraft == null) return;
        
        Ray ray = _mainCamera.ScreenPointToRay(Input.mousePosition);
        ItemView newlyHovered = null;
        
        // Use SphereCast for slightly more forgiving hover detection
        if (Physics.SphereCast(ray, 0.05f, out RaycastHit hit, maxSelectionDistance, itemLayer))
        {
            newlyHovered = hit.collider.GetComponentInParent<ItemView>();
        }

        // Check if hover state changed
        if (newlyHovered != hoveredItem)
        {
            // End previous hover
            if (hoveredItem != null && hoveredItem.Model != null)
            {
                // Pass default controller info for mouse hover
                spaceCraft.UnhighlightItem("mouse_input", "Local Mouse", hoveredItem.Model.Id); 
            }

            hoveredItem = newlyHovered;

            // Start new hover
            if (hoveredItem != null && hoveredItem.Model != null)
            {
                 // Pass default controller info for mouse hover
                spaceCraft.HighlightItem("mouse_input", "Local Mouse", hoveredItem.Model.Id); 
            }
        }
    }

    /// <summary>
    /// Gets all active ItemView components in the scene.
    /// NOTE: This can be expensive if called frequently with many items.
    /// Consider caching if performance becomes an issue.
    /// </summary>
    /// <returns>A list of all active ItemView components.</returns>
    public List<ItemView> GetAllItemViews()
    {
        // Find all active ItemView components in the scene
        ItemView[] allItemViewsArray = FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        // Convert the array to a list and return it
        return new List<ItemView>(allItemViewsArray);
    }
}
