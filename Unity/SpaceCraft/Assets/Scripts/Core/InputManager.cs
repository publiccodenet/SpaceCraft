using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine.UI;
using TMPro;
using Newtonsoft.Json.Linq;



/// <summary>
/// Handles camera panning, zooming, physics-based movement, and item selection.
/// Relies on an assigned CameraController to access the camera and its rig.
/// 
/// COLLIDER ARCHITECTURE:
/// - Mouse Hit Detection: Uses TRIGGER colliders on itemLayer (no physics interaction)
/// - Physics Rolling: Uses NON-TRIGGER colliders on other layers (no mouse interaction)  
/// - Separation: Allows independent mouse detection and physics behavior
/// - Data-Driven: All collider setup done in Unity Editor, code only handles behavior
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
    public float scrollWheelZoomFactor = 5f; // Multiplicative factor per scroll unit - INCREASED for more powerful scrolling
    public float keyboardZoomFactor = 5f; // Multiplicative factor per second
    public float navigatorZoomFactor = 1f; // Was 0.5f 

    [Header("Physics Settings")]
    [Tooltip("Velocity threshold below which camera stops on drag release - HIGHER = easier to stop")]
    public float baseVelocityThreshold = 2.0f; // INCREASED from 0.2f - much easier to stop!
    [Tooltip("Velocity smoothing - LOWER = more responsive to sudden stops")]
    public float velocitySmoothingFactor = 0.05f; // REDUCED from 0.1f - more responsive
    [Tooltip("Additional velocity damping on release - helps eliminate tiny drifts")]
    public float releaseVelocityDamping = 0.3f; // NEW - strong damping on release
    public float frictionFactor = 0.999f;
    public float bounceFactor = 0.9f; 
    public float navigatorVelocityFactor = 1f; // Multiplier for PushCameraVelocity

    [Header("UI References")]
    public ItemInfoPanel itemInfoPanel;
    
    [Tooltip("Layer mask for mouse hit detection - use TRIGGER colliders on this layer for clicks, physics colliders on other layers")]
    public LayerMask itemLayer;

    [Header("UI Settings")]
    public float descriptionScale = 0.8f;
    
    [Header("Selection Settings")]
    public float maxSelectionDistance = 100f;
    public float selectMaxClickDistance = 0.1f; 
    public float selectMaxClickTime = 0.3f;
    
    [Header("Item Dragging Settings")]
    [Tooltip("Enable physics-based item dragging")]
    public bool enableItemDragging = true;
    [Tooltip("Force strength for rubber band dragging")]
    [Range(10f, 500000f)]
    public float dragForceStrength = 100000f;
    [Tooltip("Maximum distance for drag force (like rubber band stretch limit)")]
    [Range(1f, 50f)]
    public float dragMaxDistance = 10f;
    [Tooltip("Drag force damping (higher = less oscillation)")]
    [Range(0.01f, 10f)]
    public float dragDamping = 0.1f;
    [Tooltip("Mass multiplier when dragging (heavier = pushes others away)")]
    [Range(1f, 500f)]
    public float dragMassMultiplier = 100f;
    [Tooltip("Normal mass when not dragging")]
    [Range(0.1f, 10f)]
    public float normalMass = 1f;
    [Tooltip("Mouse velocity multiplier for direct velocity application")]
    [Range(0f, 1000f)]
    public float mouseVelocityMultiplier = 20f;
    [Tooltip("Maximum velocity that can be applied to dragged item")]
    [Range(1f, 2000f)]
    public float maxDragVelocity = 50f;
    [Tooltip("Velocity multiplier when throwing item on release")]
    [Range(0f, 50f)]
    public float throwStrength = 10f; 
    
    [Header("Search Settings")]
    public string searchString = ""; // Current search query for filtering
    
    [Header("Search Scaling - Bridge Controllable")]
    [Tooltip("Curve type name (bridge-compatible string)")]
    public string curveTypeName = "Sigmoid";
    
    [Tooltip("Minimum scale for books (valley/pebble size)")]
    [Range(0.01f, 1f)]
    public float minBookScale = 0.2f; // DOUBLED from 0.1f - bigger small books!
    
    [Tooltip("Maximum scale for books (mountain size)")]
    [Range(1f, 10f)]  
    public float maxBookScale = 3.0f;
    
    [Tooltip("Base scale when no search is active")]
    [Range(0.1f, 2f)]
    public float neutralBookScale = 1.0f;
    
    [Tooltip("Scaling animation speed (how fast books change size)")]
    [Range(0.1f, 10f)]
    public float scaleAnimationSpeed = 3.0f;
    
    [Header("Curve Parameters - Bridge Controllable")]
    [Tooltip("Intensity/steepness parameter")]
    [Range(0.1f, 20f)]
    public float curveIntensity = 5f;
    
    [Tooltip("Power/exponential parameter")]
    [Range(0.1f, 10f)]
    public float curvePower = 2f;
    
    [Tooltip("Alpha/shape parameter")]
    [Range(0.1f, 5f)]
    public float curveAlpha = 1.16f;
    
    [Tooltip("Curve that maps relevance score (0-1) to scale multiplier. X=score, Y=scale")]
    public AnimationCurve scoreToScaleCurve = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);
    
    [Header("Physics Forces - Bridge Controllable")]
    [Tooltip("Maximum force strength at zero distance")]
    [Range(0f, 500f)]
    public float centerForceMaxStrength = 200f;
    
    [Tooltip("Maximum distance where force applies (linear falloff to zero)")]
    [Range(1f, 200f)]
    public float centerForceMaxDistance = 10f;
    
    [Tooltip("Center point for gravitational force")]
    public Vector3 centerPoint = Vector3.zero;
    
    [Tooltip("Manual offset to center point (X, Y, Z adjustment)")]
    public Vector3 manualCenterOffset = new Vector3(0, -0.5f, 0); // Default gravity pulls down!
    
    [Tooltip("Tilt-based offset to center point (from controller input)")]
    public Vector3 centerOffset = Vector3.zero;
    
    [Tooltip("How strongly tilt affects center position")]
    [Range(0f, 50f)]
    public float tiltSensitivity = 20f;
    
    [Tooltip("Apply center force to books")]
    public bool enableCenterForce = true;
    
    [Tooltip("Use constant force regardless of size or distance")]
    public bool useConstantCenterForce = true;
    
    [Tooltip("Constant center force strength (ignores all scaling and distance)")]
    [Range(0f, 1000f)]
    public float constantCenterForce = 50f;
    
    [Tooltip("Scale-based force multiplier - bigger books get MORE force")]
    public bool enableScaleBasedForce = true;
    
    [Tooltip("Minimum force multiplier for smallest books (0.5-1)")]
    [Range(0.5f, 1f)]
    public float minForceMultiplier = 5.0f; // Small books get 100% center force (normal attraction)
    
    [Tooltip("Maximum force multiplier for largest books (1-5)")]  
    [Range(1f, 5f)]
    public float maxForceMultiplier = 20.0f; // Big books get 300% center force (3x stronger attraction!)
    
    [Tooltip("Only apply physics to items in the current collection")]
    public bool limitToCurrentCollection = false;
    
    [Tooltip("Minimum scale threshold - items smaller than this ignore center force")]
    [Range(0.1f, 1f)]
    public float centerForceMinScale = 0.8f;
    
    [Header("Physics Material Properties - Bridge Controllable")]
    [Tooltip("Physics material friction")]
    [Range(0f, 2f)]
    public float physicsFriction = 0.001f; // VIRTUALLY ZERO - perfect sliding!
    
    [Tooltip("Physics material bounciness")]
    [Range(0f, 1f)]
    public float physicsBounciness = 0.5f;
    
    [Tooltip("Global gravity strength multiplier")]
    [Range(0.1f, 3f)]
    public float gravityMultiplier = 1.2f;
    
    [Header("Rigidbody Physics Parameters - Bridge Controllable")]
    [Tooltip("Linear resistance - higher values slow movement")]
    [Range(0f, 10f)]
    public float rigidbodyDrag = 0.05f; // Increased drag to slow down movement and reduce drift
    
    [Tooltip("Rotational resistance - higher values reduce spinning")]
    [Range(0f, 20f)]
    public float rigidbodyAngularDrag = 0.1f;
    
    [Tooltip("Velocity threshold below which rigidbodies go to sleep")]
    [Range(0.01f, 1f)]
    public float rigidbodySleepThreshold = 0.05f;
    
    [Tooltip("Direct center of mass control for all rigidbodies")]
    public Vector3 centerOfMass = new Vector3(0, 0, 0);
    
    [Tooltip("Rotation constraints: 0=None, 1=FreezeRotationX, 2=FreezeRotationY, 4=FreezeRotationZ (combine with +)")]
    public int rotationConstraints = (int)(RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationY | RigidbodyConstraints.FreezeRotationZ); // ALL ROTATION FROZEN
    //public int rotationConstraints = (int)RigidbodyConstraints.FreezeRotationY; // WEEBLE WOBBLE: Only freeze Y rotation (no spinning toward camera)
    //public int rotationConstraints = (int)RigidbodyConstraints.FreezeRotationX;
    //public int rotationConstraints = (int)0;
    
    [Tooltip("Maximum angular velocity for rigidbodies")]
    //public float maxAngularVelocity = 0f;
    public float maxAngularVelocity = 0.0f;
    
    [Tooltip("Force freeze rotation on all rigidbodies (overrides constraints)")]
    public bool freezeRotation = true;
    
    [Tooltip("Extreme angular drag to stop any residual rotation")]
    public float extremeAngularDrag = 1000f;
    
    [Tooltip("Use continuous collision detection for fast-moving objects")]
    public bool rigidbodyUseContinuousDetection = true;
    
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
    private string searchStringLast = null; // Track last processed search to detect changes
    
    // Item dragging state
    private bool isDraggingItem = false;
    private ItemView draggedItem = null;
    private Vector3 dragLocalOffset = Vector3.zero; // Local offset on the item that was clicked
    private Vector3 dragStartItemPosition = Vector3.zero; // World position of item when drag started
    private Rigidbody draggedRigidbody = null;
    private float originalMass = 1f; // Store original mass to restore later
    private Vector3 previousMouseWorldPos = Vector3.zero; // Track mouse movement for velocity
    private Vector3 mouseVelocity = Vector3.zero; // Current mouse velocity in world space

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
        
        // Initialize physics settings on all existing ItemViews
        UpdatePhysicsMaterials();
        UpdateRigidbodySettings();
    }

    private void Update()
    {
        HandleInput();
        
        // Don't update hover during item dragging - keep dragged item highlighted
        if (!isDraggingItem)
        {
            UpdateHoveredItem();
        }
        
        CheckForSearchStringChanges();
    }

    private void HandleInput()
    {
        // DEBUG: Log all mouse button presses
        if (Input.GetMouseButtonDown(0))
            Debug.Log($"[MOUSE DEBUG] LEFT BUTTON DOWN - hoveredItem: {(hoveredItem?.name ?? "null")}, isDragging: {isDragging}, isDraggingItem: {isDraggingItem}");
        if (Input.GetMouseButtonDown(1))
            Debug.Log($"[MOUSE DEBUG] RIGHT BUTTON DOWN - hoveredItem: {(hoveredItem?.name ?? "null")}, isDragging: {isDragging}, isDraggingItem: {isDraggingItem}");
        if (Input.GetMouseButtonUp(0))
            Debug.Log($"[MOUSE DEBUG] LEFT BUTTON UP - isDragging: {isDragging}, isDraggingItem: {isDraggingItem}");
        if (Input.GetMouseButtonUp(1))
            Debug.Log($"[MOUSE DEBUG] RIGHT BUTTON UP - isDragging: {isDragging}, isDraggingItem: {isDraggingItem}");
            
        // LEFT MOUSE BUTTON - Item Interaction Only
        if (Input.GetMouseButtonDown(0))
        {
            Debug.Log($"[LEFT MOUSE] Processing left click - hoveredItem: {(hoveredItem?.name ?? "null")}");
            
            // Check if we should start item dragging
            if (enableItemDragging && hoveredItem != null && hoveredItem.GetComponent<Rigidbody>() != null)
            {
                Debug.Log($"[LEFT MOUSE] Starting item drag on {hoveredItem.name}");
                StartItemDrag(hoveredItem, Input.mousePosition);
            }
            else if (hoveredItem != null)
            {
                Debug.Log($"[LEFT MOUSE] Storing item for potential selection: {hoveredItem.name}");
                // Store for potential click selection (no camera dragging)
                dragStartPosition = Input.mousePosition;
                dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
                lastDragTime = Time.realtimeSinceStartup;
                itemAtDragStart = hoveredItem;
            }
            else
            {
                Debug.Log($"[LEFT MOUSE] No item under cursor - doing nothing (NO camera pan)");
            }
        }
        else if (Input.GetMouseButtonUp(0))
        {
            Debug.Log($"[LEFT MOUSE] Left button up - isDraggingItem: {isDraggingItem}, itemAtDragStart: {(itemAtDragStart?.name ?? "null")}");
            
            // Handle item drag end
            if (isDraggingItem)
            {
                Debug.Log($"[LEFT MOUSE] Ending item drag");
                EndItemDrag();
            }
            else if (itemAtDragStart != null)
            {
                Debug.Log($"[LEFT MOUSE] Checking for item selection");
                // Handle item selection (click without drag)
                float dragDistance = Vector3.Distance(dragStartWorldPos, GetWorldPositionAtScreenPoint(Input.mousePosition));
                float dragTime = Time.realtimeSinceStartup - lastDragTime;
                
                if (dragDistance < selectMaxClickDistance && dragTime < selectMaxClickTime && itemAtDragStart.Model != null)
                {
                    Debug.Log($"[LEFT MOUSE] Selecting item: {itemAtDragStart.name}");
                    // Pass default controller info for mouse click selection toggle
                    spaceCraft.ToggleItemSelection("mouse_input", "Local Mouse", "main", itemAtDragStart.Model.Id);
                }
                itemAtDragStart = null;
            }
        }
        
        // RIGHT MOUSE BUTTON - Camera Panning Only
        if (Input.GetMouseButtonDown(1))
        {
            Debug.Log($"[RIGHT MOUSE] Starting camera drag - SHOULD WORK!");
            // Start camera dragging
            isDragging = true;
            previousMousePosition = Input.mousePosition;
            dragStartPosition = Input.mousePosition;
            dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
            lastDragTime = Time.realtimeSinceStartup;
            physicsEnabled = false;
            cameraVelocity = Vector3.zero;
        }
        else if (Input.GetMouseButtonUp(1))
        {
            Debug.Log($"[RIGHT MOUSE] Right button up - wasDragging: {isDragging}");
            // Handle camera drag end
            bool wasDragging = isDragging;
            isDragging = false;
            
            if (wasDragging)
            {
                Debug.Log($"[RIGHT MOUSE] Ending camera drag with velocity: {filteredVelocity.magnitude:F3}");
                if (filteredVelocity.magnitude > GetScaledVelocityThreshold())
                {
                    // Apply release damping to reduce tiny unwanted drifts
                    Vector3 dampedVelocity = filteredVelocity * releaseVelocityDamping;
                    
                    // Double-check threshold after damping - prevents micro-drifts
                    if (dampedVelocity.magnitude > GetScaledVelocityThreshold() * 0.5f) // Lower threshold for damped velocity
                    {
                        cameraVelocity = dampedVelocity;
                        physicsEnabled = true;
                        Debug.Log($"[RIGHT MOUSE] Physics enabled: original={filteredVelocity.magnitude:F3}, damped={dampedVelocity.magnitude:F3}");
                    }
                    else
                    {
                        // Velocity too small even after damping - force stop
                        cameraVelocity = Vector3.zero;
                        physicsEnabled = false;
                        Debug.Log($"[RIGHT MOUSE] Forced stop: damped velocity too small");
                    }
                }
                else
                {
                    // Below threshold - clean stop
                    cameraVelocity = Vector3.zero;
                    physicsEnabled = false;
                    Debug.Log($"[RIGHT MOUSE] Clean stop: velocity below threshold");
                }
            }
        }
        
        // Active Dragging (Mouse) - Should ONLY happen with RIGHT mouse button
        if (isDragging)
        {   
            Debug.Log($"[MOUSE DEBUG] HandleMouseDrag called - isDragging: {isDragging}");
            HandleMouseDrag();
        }
        
        // Active Item Dragging
        if (isDraggingItem)
        {
            HandleItemDrag();
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
        
        // Apply center force to books
        if (enableCenterForce)
        {
            ApplyCenterForce();
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
    
    /// <summary>
    /// Start dragging an item with precise local coordinate tracking
    /// </summary>
    private void StartItemDrag(ItemView item, Vector3 mouseScreenPos)
    {
        if (item == null) return;
        
        Rigidbody rb = item.GetComponent<Rigidbody>();
        if (rb == null) return;
        
        // Calculate the local offset on the item that was clicked
        Vector3 mouseWorldPos = GetWorldPositionAtScreenPoint(mouseScreenPos);
        Vector3 itemWorldPos = item.transform.position;
        
        // Convert world offset to local item coordinates
        dragLocalOffset = item.transform.InverseTransformPoint(mouseWorldPos);
        
        // BULLDOZER MODE: Make item HEAVY to push others out of the way!
        originalMass = rb.mass;
        rb.mass = originalMass * dragMassMultiplier;
        
        // Set up item drag state
        isDraggingItem = true;
        draggedItem = item;
        draggedRigidbody = rb;
        dragStartItemPosition = itemWorldPos;
        
        // LOCK HIGHLIGHT on dragged item
        item.SetHighlighted(true);
        
        // Disable camera dragging while dragging an item
        isDragging = false;
        physicsEnabled = false;
        cameraVelocity = Vector3.zero;
        
        Debug.Log($"[ItemDrag] Started SUPER-HEAVY dragging {item.name} - mass: {originalMass:F1} → {rb.mass:F1} (x{dragMassMultiplier}) + VELOCITY!");
    }
    
    /// <summary>
    /// Handle ongoing item drag with SMOOTH POSITION MOVEMENT + SUPER STRONG RUBBER BAND
    /// </summary>
    private void HandleItemDrag()
    {
        if (!isDraggingItem || draggedItem == null || draggedRigidbody == null) return;
        
        // Get current mouse world position EVERY FRAME with high precision
        Vector3 mouseWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
        
        // Track mouse velocity for throwing
        if (previousMouseWorldPos != Vector3.zero)
        {
            mouseVelocity = (mouseWorldPos - previousMouseWorldPos) / Time.deltaTime;
        }
        previousMouseWorldPos = mouseWorldPos;
        
        // Calculate where the grabbed point on the item SHOULD be (target position)
        Vector3 targetWorldPos = mouseWorldPos;
        
        // Calculate where the grabbed point on the item ACTUALLY is (current position)
        Vector3 currentGrabWorldPos = draggedItem.transform.TransformPoint(dragLocalOffset);
        
        // Calculate the rubber band vector (from current grab point to target)
        Vector3 rubberBandVector = targetWorldPos - currentGrabWorldPos;
        float distance = rubberBandVector.magnitude;
        
        // SMOOTH POSITION MOVEMENT with SUPER STRONG RUBBER BAND
        if (distance > 0.001f)
        {
            // Much more aggressive rubber band for instant snapping
            float pullStrength = Mathf.Clamp01(distance / dragMaxDistance);
            
            // ULTRA STRONG rubber band - more responsive
            float smoothedPull = pullStrength * 0.95f + 0.05f; // Always at least 5% pull, up to 95%
            
            // Calculate target item position directly
            Vector3 currentItemPos = draggedItem.transform.position;
            Vector3 targetItemPos = targetWorldPos - draggedItem.transform.TransformDirection(dragLocalOffset);
            
            // SMOOTH LERP for buttery movement - much more aggressive
            Vector3 newItemPos = Vector3.Lerp(currentItemPos, targetItemPos, smoothedPull);
            
            // Use MovePosition for smooth rigidbody movement instead of direct transform
            draggedRigidbody.MovePosition(newItemPos);
            
            // Still clear angular velocity to prevent spinning
            draggedRigidbody.angularVelocity = Vector3.zero;
        }
    }
    
    /// <summary>
    /// End item dragging and restore normal weight
    /// </summary>
    private void EndItemDrag()
    {
        if (isDraggingItem && draggedItem != null && draggedRigidbody != null)
        {
            // Apply throw velocity based on mouse movement
            Vector3 throwVelocity = mouseVelocity * throwStrength;
            
            // Clamp the throw velocity to prevent extreme speeds
            if (throwVelocity.magnitude > maxDragVelocity)
            {
                throwVelocity = throwVelocity.normalized * maxDragVelocity;
            }
            
            // Apply the throw velocity to the rigidbody
            draggedRigidbody.linearVelocity = throwVelocity;
            
            // RESTORE NORMAL WEIGHT: Return to lightweight physics
            draggedRigidbody.mass = originalMass;
            Debug.Log($"[ItemDrag] Ended HEAVY dragging {draggedItem.name} - restored mass: {draggedRigidbody.mass:F1}, throw velocity: {throwVelocity.magnitude:F2}");
        }
        
        // Reset item drag state
        ItemView draggedItemRef = draggedItem; // Store reference before clearing
        isDraggingItem = false;
        draggedItem = null;
        draggedRigidbody = null;
        dragLocalOffset = Vector3.zero;
        dragStartItemPosition = Vector3.zero;
        originalMass = 1f;
        mouseVelocity = Vector3.zero;
        previousMouseWorldPos = Vector3.zero;
        
        // UNLOCK HIGHLIGHT - let normal hover system take over
        if (draggedItemRef != null)
        {
            draggedItemRef.SetHighlighted(false);
        }
        
        // Re-enable physics
        physicsEnabled = true;
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
    /// Expects parameters: controllerId (string), controllerName (string), screenId (string), panXDelta (float), panYDelta (float)
    /// </summary>
    public void PushCameraPosition(string controllerId, string controllerName, string screenId, float panXDelta, float panYDelta)
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
    /// Expects parameters: controllerId (string), controllerName (string), screenId (string), zoomDelta (float)
    /// </summary>
    public void PushCameraZoom(string controllerId, string controllerName, string screenId, float zoomDelta)
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

    // --- Bridge Methods for Real-Time Physics Control ---

    /// <summary>
    /// Update curve type from controller
    /// Expects parameters: controllerId (string), controllerName (string), curveType (string)
    /// </summary>
    public void SetCurveType(string controllerId, string controllerName, string curveType)
    {
        curveTypeName = curveType;
        Debug.Log($"Physics: Curve type changed to '{curveType}' by {controllerId} ('{controllerName}')");
        
        // Immediately reapply current search to show effect
        if (!string.IsNullOrEmpty(searchString))
        {
            ApplySearchBasedScaling(searchString);
        }
    }

    /// <summary>
    /// Update curve parameters from controller
    /// Expects parameters: controllerId (string), controllerName (string), parameterName (string), value (float)
    /// </summary>
    public void SetCurveParameter(string controllerId, string controllerName, string parameterName, float value)
    {
        switch (parameterName.ToLower())
        {
            case "intensity":
                curveIntensity = Mathf.Clamp(value, 0.1f, 20f);
                break;
            case "power":
                curvePower = Mathf.Clamp(value, 0.1f, 10f);
                break;
            case "alpha":
                curveAlpha = Mathf.Clamp(value, 0.1f, 5f);
                break;
            case "minscale":
                minBookScale = Mathf.Clamp(value, 0.01f, 1f);
                break;
            case "maxscale":
                maxBookScale = Mathf.Clamp(value, 1f, 10f);
                break;
            case "animationspeed":
                scaleAnimationSpeed = Mathf.Clamp(value, 0.1f, 10f);
                break;
            default:
                Debug.LogWarning($"Unknown curve parameter: {parameterName}");
                return;
        }
        
        Debug.Log($"Physics: {parameterName} = {value} by {controllerId} ('{controllerName}')");
        
        // Immediately reapply current search to show effect
        if (!string.IsNullOrEmpty(searchString))
        {
            ApplySearchBasedScaling(searchString);
        }
    }

    /// <summary>
    /// Update physics parameters from controller
    /// Expects parameters: controllerId (string), controllerName (string), parameterName (string), value (float or bool)
    /// </summary>
    public void SetPhysicsParameter(string controllerId, string controllerName, string parameterName, float value)
    {
        switch (parameterName.ToLower())
        {
            case "centerforce":
            case "centerforcemaxstrength":
                centerForceMaxStrength = Mathf.Clamp(value, 0f, 200f);
                break;
            case "centerradius":
            case "centerforcemaxdistance":
                centerForceMaxDistance = Mathf.Clamp(value, 1f, 200f);
                break;
            case "tiltsensitivity":
                tiltSensitivity = Mathf.Clamp(value, 0f, 50f);
                break;
            case "friction":
                physicsFriction = Mathf.Clamp(value, 0f, 2f);
                UpdatePhysicsMaterials();
                break;
            case "bounciness":
                physicsBounciness = Mathf.Clamp(value, 0f, 1f);
                UpdatePhysicsMaterials();
                break;
            case "gravity":
                gravityMultiplier = Mathf.Clamp(value, 0.1f, 3f);
                Physics.gravity = new Vector3(0, -9.81f * gravityMultiplier, 0);
                break;
            case "drag":
                rigidbodyDrag = Mathf.Clamp(value, 0f, 10f);
                UpdateRigidbodySettings();
                break;
            case "angulardrag":
                rigidbodyAngularDrag = Mathf.Clamp(value, 0f, 20f);
                UpdateRigidbodySettings();
                break;
            case "sleepthreshold":
                rigidbodySleepThreshold = Mathf.Clamp(value, 0.01f, 1f);
                UpdateRigidbodySettings();
                break;
            case "freezerotation":
                // Rotation control is now handled via rotationConstraints int
                //rotationConstraints = value > 0.5f ? 112 : 0; // 112 = all frozen, 0 = none frozen
                UpdateRigidbodySettings();
                break;
            case "continuousdetection":
                rigidbodyUseContinuousDetection = value > 0.5f; // Treat as boolean (>0.5 = true)
                UpdateRigidbodySettings();
                break;
            default:
                Debug.LogWarning($"Unknown physics parameter: {parameterName}");
                return;
        }
        
        Debug.Log($"Physics: {parameterName} = {value} by {controllerId} ('{controllerName}')");
    }

    /// <summary>
    /// Receive tilt input from controller to offset center gravity point
    /// Coordinate system: Camera looks down at books from above
    /// - Phone face up toward ceiling = neutral (0, 0)
    /// - Phone tilt left/right = World X offset (left = negative, right = positive)  
    /// - Phone tilt forward/back = World Z offset (forward = positive, back = negative)
    /// Expects parameters: controllerId (string), controllerName (string), normalizedTiltX (float -1 to +1), normalizedTiltZ (float -1 to +1)
    /// </summary>
    public void PushTiltInput(string controllerId, string controllerName, float normalizedTiltX, float normalizedTiltZ)
    {
        // Clamp inputs to safe range
        normalizedTiltX = Mathf.Clamp(normalizedTiltX, -1f, 1f);
        normalizedTiltZ = Mathf.Clamp(normalizedTiltZ, -1f, 1f);
        
        // Convert normalized tilt (-1 to +1) to world offset using sensitivity
        centerOffset.x = normalizedTiltX * tiltSensitivity;
        centerOffset.z = normalizedTiltZ * tiltSensitivity;
        
        // Log tilt input (only if actually tilting to reduce spam)
        if (Mathf.Abs(normalizedTiltX) > 0.01f || Mathf.Abs(normalizedTiltZ) > 0.01f)
        {
            Debug.Log($"Physics: Tilt input ({normalizedTiltX:F2}, {normalizedTiltZ:F2}) -> Center offset ({centerOffset.x:F1}, {centerOffset.z:F1}) by {controllerId}");
        }
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
        // Scale threshold based on zoom - but limit the scaling to prevent tiny thresholds
        float zoomScale = Mathf.Clamp(_mainCamera.orthographicSize / 10f, 0.5f, 2.0f); // Limit zoom effect
        return baseVelocityThreshold * zoomScale;
    }

    private void UpdateHoveredItem()
    {
        if (_mainCamera == null || spaceCraft == null) return;
        
        Ray ray = _mainCamera.ScreenPointToRay(Input.mousePosition);
        ItemView newlyHovered = null;
        
        // Use SphereCast for slightly more forgiving hover detection
        // NOTE: Only detect TRIGGER colliders on itemLayer (box colliders for mouse detection)
        // Physics colliders (sphere colliders) are on child objects and excluded from detection
        if (Physics.SphereCast(ray, 0.05f, out RaycastHit hit, maxSelectionDistance, itemLayer, QueryTriggerInteraction.Collide))
        {
            newlyHovered = hit.collider.GetComponentInParent<ItemView>();
            
            // Debug: Show exactly what type of collider was detected
            string colliderInfo = $"Detected {hit.collider.GetType().Name}";
            if (hit.collider.isTrigger) colliderInfo += " (trigger)";
            else colliderInfo += " (physics)";
            colliderInfo += $" on layer {hit.collider.gameObject.layer}";
            
            Debug.Log($"[Mouse Detection] {colliderInfo} - Item: {newlyHovered?.Model?.Title ?? "Unknown"}");
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

    /// <summary>
    /// Check if the search string has changed and process the update
    /// </summary>
    private void CheckForSearchStringChanges()
    {
        // Normalize the current search string
        string normalizedSearch = (searchString ?? "").Trim();
        
        // Check if the search string has changed
        if (normalizedSearch != searchStringLast)
        {
            searchStringLast = normalizedSearch;
            searchStringChanged(normalizedSearch);
        }
    }

    /// <summary>
    /// Called whenever the search string changes, logs the new value and applies scaling
    /// </summary>
    private void searchStringChanged(string newSearchString)
    {
        // Log the search update
        Debug.Log($"Search: String changed to: '{newSearchString}'");
        
        // Process the search change
        if (string.IsNullOrEmpty(newSearchString))
        {
            Debug.Log("Search: Cleared search filter - all books should return to normal size");
        }
        else
        {
            Debug.Log($"Search: Filtering for '{newSearchString}' - matching books should grow, non-matching should shrink");
        }
        
        // Apply search-based scaling to all books for physics-based semantic landscape!
        ApplySearchBasedScaling(newSearchString);
    }

    /// <summary>
    /// Apply search-based scaling to create physics-based semantic landscape!
    /// Uses Levenshtein distance for fuzzy matching and flexible curve mapping for scaling.
    /// </summary>
    /// <param name="searchQuery">The search query to score against</param>
    private void ApplySearchBasedScaling(string searchQuery)
    {
        List<ItemView> allItemViews = GetAllItemViews();
        if (allItemViews.Count == 0) return;
        
        // Filter to current collection if enabled
        if (limitToCurrentCollection && spaceCraft != null)
        {
            allItemViews = FilterToCurrentCollection(allItemViews);
        }
        
        // If no search query, reset all scales to neutral
        if (string.IsNullOrEmpty(searchQuery))
        {
            foreach (var itemView in allItemViews)
            {
                if (itemView != null)
                {
                    itemView.ViewScale = neutralBookScale;
                }
            }
            return;
        }
        
        // Tokenize search query for better matching
        string[] searchTokens = TokenizeAndNormalize(searchQuery);
        
        // Calculate relevance scores for all items
        List<(ItemView view, float score)> itemScores = new List<(ItemView, float)>();
        float minScore = float.MaxValue;
        float maxScore = float.MinValue;
        
        foreach (var itemView in allItemViews)
        {
            if (itemView?.Model == null) continue;
            
            float score = CalculateRelevanceScore(itemView.Model, searchTokens);
            itemScores.Add((itemView, score));
            
            minScore = Mathf.Min(minScore, score);
            maxScore = Mathf.Max(maxScore, score);
        }
        
        // Normalize scores and apply curve-based scaling
        float scoreRange = maxScore - minScore;
        if (scoreRange < 0.001f) scoreRange = 1.0f; // Prevent division by zero
        
        foreach (var (itemView, score) in itemScores)
        {
            // Normalize score to 0-1 range for curve evaluation
            float normalizedScore = (score - minScore) / scoreRange;
            
            // Apply the selected scaling method
            float curveScale = ApplyScalingMethod(normalizedScore);
            
            // Clamp to min/max bounds
            float finalScale = Mathf.Clamp(curveScale, minBookScale, maxBookScale);
            
            itemView.ViewScale = finalScale;
        }
        
        Debug.Log($"[Search Landscape] Applied curve-based scaling to {itemScores.Count} books. Score range: {minScore:F3} - {maxScore:F3}");
    }
    
    /// <summary>
    /// Calculate relevance score for an item based on search tokens
    /// Uses fuzzy string matching with Levenshtein distance for near matches
    /// </summary>
    private float CalculateRelevanceScore(Item item, string[] searchTokens)
    {
        if (searchTokens.Length == 0) return 0f;
        
        float totalScore = 0f;
        int matchCount = 0;
        
        // Get all searchable text from the item
        List<string> itemTokens = new List<string>();
        itemTokens.AddRange(TokenizeAndNormalize(item.Title ?? ""));
        itemTokens.AddRange(TokenizeAndNormalize(item.Description ?? ""));
        itemTokens.AddRange(TokenizeAndNormalize(item.Creator ?? ""));
        
        // Add subject keywords if available
        if (item.Subject != null)
        {
            foreach (string subject in item.Subject)
            {
                itemTokens.AddRange(TokenizeAndNormalize(subject));
            }
        }
        
        // Score each search token against all item tokens
        foreach (string searchToken in searchTokens)
        {
            float bestMatchScore = 0f;
            
            foreach (string itemToken in itemTokens)
            {
                float matchScore;
                
                if (itemToken.Contains(searchToken))
                {
                    // Exact substring match - high score
                    matchScore = 1.0f;
                }
                else if (searchToken.Contains(itemToken))
                {
                    // Item token is substring of search - good score
                    matchScore = 0.8f;
                }
                else
                {
                    // Use Levenshtein distance for fuzzy matching
                    int editDistance = CalculateLevenshteinDistance(searchToken, itemToken);
                    int maxLength = Mathf.Max(searchToken.Length, itemToken.Length);
                    
                    if (maxLength == 0) continue;
                    
                    // Convert edit distance to similarity score (0-1)
                    float similarity = 1.0f - (float)editDistance / maxLength;
                    
                    // Only consider matches above threshold to avoid noise
                    matchScore = similarity > 0.6f ? similarity * 0.7f : 0f;
                }
                
                bestMatchScore = Mathf.Max(bestMatchScore, matchScore);
            }
            
            if (bestMatchScore > 0f)
            {
                totalScore += bestMatchScore;
                matchCount++;
            }
        }
        
        // Average score across all search tokens, with bonus for matching multiple terms
        if (matchCount == 0) return 0f;
        
        float averageScore = totalScore / searchTokens.Length;
        float completenessBonus = (float)matchCount / searchTokens.Length;
        
        return averageScore * (0.7f + 0.3f * completenessBonus);
    }
    
    /// <summary>
    /// Tokenize and normalize text for search matching
    /// </summary>
    private string[] TokenizeAndNormalize(string text)
    {
        if (string.IsNullOrEmpty(text)) return new string[0];
        
        // Convert to lowercase, split on whitespace and punctuation, filter empty
        return text.ToLowerInvariant()
                  .Split(new char[] { ' ', '\t', '\n', '\r', '.', ',', ';', ':', '!', '?', '-', '_', '(', ')', '[', ']', '{', '}' }, 
                         StringSplitOptions.RemoveEmptyEntries)
                  .Where(token => token.Length > 1) // Filter out single characters
                  .ToArray();
    }
    
    /// <summary>
    /// Calculate Levenshtein distance between two strings for fuzzy matching
    /// The "Lichtenwhatshisname" algorithm the user mentioned! 
    /// </summary>
    private int CalculateLevenshteinDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source)) return target?.Length ?? 0;
        if (string.IsNullOrEmpty(target)) return source.Length;
        
        int sourceLength = source.Length;
        int targetLength = target.Length;
        
        // Create matrix
        int[,] matrix = new int[sourceLength + 1, targetLength + 1];
        
        // Initialize first row and column
        for (int i = 0; i <= sourceLength; i++) matrix[i, 0] = i;
        for (int j = 0; j <= targetLength; j++) matrix[0, j] = j;
        
        // Fill matrix
        for (int i = 1; i <= sourceLength; i++)
        {
            for (int j = 1; j <= targetLength; j++)
            {
                int cost = source[i - 1] == target[j - 1] ? 0 : 1;
                
                matrix[i, j] = Mathf.Min(
                    Mathf.Min(
                        matrix[i - 1, j] + 1,     // Deletion
                        matrix[i, j - 1] + 1),   // Insertion
                    matrix[i - 1, j - 1] + cost  // Substitution
                );
            }
        }
        
        return matrix[sourceLength, targetLength];
    }
    
    /// <summary>
    /// Test method to demonstrate search-based scaling with sample queries
    /// Call this from inspector or via code to test the semantic landscape system
    /// </summary>
    [ContextMenu("Test Search Scaling")]
    public void TestSearchScaling()
    {
        Debug.Log("[Test] Testing search-based scaling system...");
        
        // Simulate a search for "science fiction" 
        ApplySearchBasedScaling("science fiction");
        
        // You can test other searches by calling this method with different terms:
        // ApplySearchBasedScaling("adventure");
        // ApplySearchBasedScaling("mystery"); 
        // ApplySearchBasedScaling("romance");
        // ApplySearchBasedScaling(""); // Reset to normal
    }
    
    /// <summary>
    /// Create a random search landscape for testing physics interactions
    /// </summary>
    [ContextMenu("Test Random Landscape")]  
    public void TestRandomLandscape()
    {
        List<ItemView> allItemViews = GetAllItemViews();
        Debug.Log($"[Test] Creating random landscape with {allItemViews.Count} books...");
        
        foreach (var itemView in allItemViews)
        {
            if (itemView != null)
            {
                // Create random scale distribution for testing physics
                float randomScale = UnityEngine.Random.Range(0.2f, 2.5f);
                itemView.ViewScale = randomScale;
            }
        }
    }
    
    /// <summary>
    /// Test center force by scattering books randomly and watching them get pulled back
    /// </summary>
    [ContextMenu("Test Center Force")]
    public void TestCenterForce()
    {
        List<ItemView> allItemViews = GetAllItemViews();
        Debug.Log($"[Test] Scattering {allItemViews.Count} books to test center force...");
        
        foreach (var itemView in allItemViews)
        {
            if (itemView?.GetComponent<Rigidbody>() != null)
            {
                // Scatter books randomly with some velocity
                Vector3 randomPosition = centerPoint + UnityEngine.Random.insideUnitSphere * (centerForceMaxDistance * 2f);
                randomPosition.y = Mathf.Max(1f, randomPosition.y); // Keep above ground
                
                itemView.transform.position = randomPosition;
                
                Rigidbody rb = itemView.GetComponent<Rigidbody>();
                rb.linearVelocity = UnityEngine.Random.insideUnitSphere * 5f; // Random initial velocity
            }
        }
    }
    
    /// <summary>
    /// Filter ItemViews to only include those in the current collection
    /// </summary>
    /// <param name="allItemViews">All ItemViews in the scene</param>
    /// <returns>Filtered list of ItemViews in current collection</returns>
    private List<ItemView> FilterToCurrentCollection(List<ItemView> allItemViews)
    {
        if (spaceCraft == null) return allItemViews;
        
        // Get current collection ID from SpaceCraft (you'll need to expose this)
        // For now, return all items - this can be enhanced later
        // TODO: Get current collection from SpaceCraft and filter by collection membership
        
        return allItemViews; // Placeholder - return all for now
    }
    
    /// <summary>
    /// Calculate the actual center point of the collection based on book positions
    /// Uses bounding box calculation to find the true geometric center in WORLD coordinates
    /// </summary>
    /// <param name="itemViews">List of ItemViews to calculate center for</param>
    /// <returns>The geometric center point of all books in world space</returns>
    private Vector3 CalculateCollectionCenter(List<ItemView> itemViews)
    {
        if (itemViews == null || itemViews.Count == 0) 
        {
            Debug.LogWarning("[CenterForce] No items to calculate center for - using Vector3.zero");
            return Vector3.zero;
        }
        
        // Calculate bounding box using WORLD positions (not local!)
        Vector3 minBounds = Vector3.positiveInfinity;
        Vector3 maxBounds = Vector3.negativeInfinity;
        Vector3 sumPositions = Vector3.zero;
        int validPositions = 0;
        
        foreach (var itemView in itemViews)
        {
            if (itemView != null && itemView.transform != null)
            {
                // Use world position for correct coordinate space
                Vector3 worldPosition = itemView.transform.position;
                
                // Expand bounding box
                minBounds = Vector3.Min(minBounds, worldPosition);
                maxBounds = Vector3.Max(maxBounds, worldPosition);
                sumPositions += worldPosition;
                validPositions++;
            }
        }
        
        if (validPositions == 0)
        {
            Debug.LogWarning("[CenterForce] No valid item positions found - using Vector3.zero");
            return Vector3.zero;
        }
        
        // Use CENTER OF MASS (average position) instead of bounding box center
        // This is more accurate for irregular distributions
        Vector3 calculatedCenterOfMass = sumPositions / validPositions;
        
        // Optional: Use bounding box center instead (geometric center)
        Vector3 boundingBoxCenter = (minBounds + maxBounds) * 0.5f;
        
        // Choose center of mass for more natural physics behavior
        Vector3 calculatedCenter = calculatedCenterOfMass;
        
        // Debug info (only log occasionally to avoid spam)
        if (Time.frameCount % 300 == 0) // Every 5 seconds at 60fps
        {
            Vector3 boundingSize = maxBounds - minBounds;
            Debug.Log($"[CenterForce] Center of mass from {validPositions} books: {calculatedCenter:F1}");
            Debug.Log($"[CenterForce] Bounding box: {minBounds:F1} to {maxBounds:F1} (size: {boundingSize:F1})");
            Debug.Log($"[CenterForce] Center of mass vs bbox center: {calculatedCenterOfMass:F1} vs {boundingBoxCenter:F1}");
        }
        
        return calculatedCenter;
    }
    
    /// <summary>
    /// Apply center force to draw books toward the center point
    /// Creates a gentle gravitational effect to keep books from drifting too far
    /// </summary>
    private void ApplyCenterForce()
    {
        List<ItemView> allItemViews = GetAllItemViews();
        
        // Filter to current collection if enabled
        if (limitToCurrentCollection && spaceCraft != null)
        {
            allItemViews = FilterToCurrentCollection(allItemViews);
        }
        
        // Use FIXED center point - the magnet should NEVER move with the books!
        Vector3 fixedCenterPoint = centerPoint; // Fixed at (0,0,0) or whatever is set in inspector
        
        int forcesApplied = 0;
        int kinematicBodies = 0;
        
        foreach (var itemView in allItemViews)
        {
            if (itemView?.GetComponent<Rigidbody>() == null) continue;
            
            Rigidbody rb = itemView.GetComponent<Rigidbody>();
            
            // Skip kinematic bodies (they won't respond to forces)
            if (rb.isKinematic) 
            {
                kinematicBodies++;
                continue;
            }
            
            Vector3 itemPosition = itemView.transform.position;
            
            // Check scale threshold - skip center force for small items (pebbles)
            float currentScale = itemView.CurrentScale;
            if (currentScale < centerForceMinScale)
            {
                continue; // Skip center force for items below threshold
            }
            
            // Calculate distance from FIXED center (including manual offset + tilt offset)
            Vector3 effectiveCenterPoint = fixedCenterPoint + manualCenterOffset + centerOffset;
            Vector3 toCenter = effectiveCenterPoint - itemPosition;
            float distanceToCenter = toCenter.magnitude;
            
            // Calculate scale-based force multiplier
            float scaleBasedMultiplier = 1.0f;
            if (enableScaleBasedForce && itemView != null)
            {
                // Normalize scale to 0-1 range based on min/max book scales
                float normalizedScale = Mathf.InverseLerp(minBookScale, maxBookScale, currentScale);
                
                // Apply linear interpolation for force multiplier
                scaleBasedMultiplier = Mathf.Lerp(minForceMultiplier, maxForceMultiplier, normalizedScale);
            }
            
            // Choose between constant force or distance-based force
            Vector3 centerForce = Vector3.zero;
            
            if (useConstantCenterForce)
            {
                // CONSTANT FORCE - same strength regardless of distance or scale
                if (distanceToCenter > 0.01f) // Avoid division by zero
                {
                    centerForce = toCenter.normalized * constantCenterForce;
                }
            }
            else
            {
                // Original variable force system
                if (distanceToCenter < centerForceMaxDistance && distanceToCenter > 0.01f) // Avoid division by zero
                {
                    // Linear falloff: force = maxStrength * (1 - distance/maxDistance)
                    float distanceRatio = distanceToCenter / centerForceMaxDistance;
                    float forceStrength = centerForceMaxStrength * (1f - distanceRatio);
                    forceStrength *= scaleBasedMultiplier; // Apply scale-based adjustment
                    
                    centerForce = toCenter.normalized * forceStrength;
                }
            }
            
            if (centerForce.magnitude > 0.01f) // Only apply meaningful forces
            {
                rb.AddForce(centerForce, ForceMode.Force);
                forcesApplied++;
                
                // No spam debug logging
            }
        }
        
        // No spam debug logging
    }
    
    /// <summary>
    /// Apply the selected scaling method to map normalized score (0-1) to scale value
    /// Uses string-based curve type selection for Bridge compatibility
    /// </summary>
    /// <param name="normalizedScore">Score normalized to 0-1 range</param>
    /// <returns>Scale value based on selected method</returns>
    private float ApplyScalingMethod(float normalizedScore)
    {
        switch (curveTypeName.ToLower())
        {
            case "animationcurve":
            case "curve":
                return scoreToScaleCurve.Evaluate(normalizedScore);
                
            case "sigmoid":
                return SigmoidCurve(normalizedScore);
                
            case "swish":
                return SwishCurve(normalizedScore);
                
            case "tanh":
                return TanhCurve(normalizedScore);
                
            case "gelu":
                return GeluCurve(normalizedScore);
                
            case "powerlaw":
            case "power":
                return PowerLawCurve(normalizedScore);
                
            case "logperceptual":
            case "log":
                return LogPerceptualCurve(normalizedScore);
                
            case "pareto":
                return ParetoCurve(normalizedScore);
                
            case "linear":
                return Mathf.Lerp(minBookScale, maxBookScale, normalizedScore);
                
            default:
                Debug.LogWarning($"Unknown curve type: {curveTypeName}, using linear");
                return Mathf.Lerp(minBookScale, maxBookScale, normalizedScore);
        }
    }
    
    // ===== NEURAL NETWORK ACTIVATION FUNCTIONS =====
    
    /// <summary>
    /// Sigmoid activation - creates S-curve with clear boundaries
    /// Good for: Creating distinct size classes, avoiding extreme tiny/huge books
    /// </summary>
    private float SigmoidCurve(float x)
    {
        float adjusted = (x - 0.5f) * curveIntensity;
        float sigmoid = 1f / (1f + Mathf.Exp(-adjusted));
        // Map from [0,1] sigmoid output to [minScale, maxScale] range
        return Mathf.Lerp(minBookScale, maxBookScale, sigmoid);
    }
    
    /// <summary>
    /// Swish activation (x * sigmoid(x)) - smooth, non-monotonic
    /// Good for: Smooth transitions with slight emphasis on mid-range scores
    /// </summary>
    private float SwishCurve(float x)
    {
        float sigmoid = 1f / (1f + Mathf.Exp(-curveIntensity * x));
        float swish = x * sigmoid;
        return Mathf.Lerp(minBookScale, maxBookScale, swish);
    }
    
    /// <summary>
    /// Hyperbolic tangent - smoother than sigmoid
    /// Good for: Gentle S-curve with less aggressive extremes
    /// </summary>
    private float TanhCurve(float x)
    {
        float adjusted = (x - 0.5f) * curveIntensity;
        float tanh = (Mathf.Exp(adjusted) - Mathf.Exp(-adjusted)) / 
                     (Mathf.Exp(adjusted) + Mathf.Exp(-adjusted));
        // Map tanh output [-1,1] to [0,1], then to scale range
        float normalized = (tanh + 1f) * 0.5f;
        return Mathf.Lerp(minBookScale, maxBookScale, normalized);
    }
    
    /// <summary>
    /// GELU (Gaussian Error Linear Unit) - used in transformers
    /// Good for: Very smooth scaling with natural probability-like curve
    /// </summary>
    private float GeluCurve(float x)
    {
        // Approximate GELU: 0.5 * x * (1 + tanh(sqrt(2/π) * (x + 0.044715 * x^3)))
        float inner = Mathf.Sqrt(2f / Mathf.PI) * (x + 0.044715f * x * x * x);
        float tanh = (Mathf.Exp(inner) - Mathf.Exp(-inner)) / (Mathf.Exp(inner) + Mathf.Exp(-inner));
        float gelu = 0.5f * x * (1f + tanh);
        return Mathf.Lerp(minBookScale, maxBookScale, Mathf.Clamp01(gelu));
    }
    
    // ===== DISTRIBUTION SHAPING FUNCTIONS =====
    
    /// <summary>
    /// Power law scaling - creates natural hierarchies (Zipf-like distribution)
    /// Good for: Few giant books, many small ones (like city sizes, word frequencies)
    /// </summary>
    private float PowerLawCurve(float x)
    {
        float powered = Mathf.Pow(x, curvePower);
        return Mathf.Lerp(minBookScale, maxBookScale, powered);
    }
    
    /// <summary>
    /// Logarithmic perceptual scaling (Weber-Fechner law)
    /// Good for: How humans actually perceive size differences
    /// </summary>
    private float LogPerceptualCurve(float x)
    {
        // Logarithmic scaling: log(1 + x * (base-1)) / log(base)
        float baseValue = 10f; // Can be adjusted for different steepness
        float logged = Mathf.Log(1f + x * (baseValue - 1f)) / Mathf.Log(baseValue);
        return Mathf.Lerp(minBookScale, maxBookScale, logged);
    }
    
    /// <summary>
    /// Pareto distribution (80/20 rule) - dramatic size differences
    /// Good for: Creating very dramatic landscapes with few massive mountains
    /// </summary>
    private float ParetoCurve(float x)
    {
        // Inverse Pareto CDF: 1 - (1-x)^(1/alpha)
        float pareto = 1f - Mathf.Pow(1f - x, 1f / curveAlpha);
        return Mathf.Lerp(minBookScale, maxBookScale, pareto);
    }
    
    /// <summary>
    /// Update physics materials on all ItemViews with current friction/bounciness values
    /// Only updates NON-TRIGGER colliders (physics colliders, not mouse hit zones)
    /// </summary>
    private void UpdatePhysicsMaterials()
    {
        List<ItemView> allItemViews = GetAllItemViews();
        
        foreach (var itemView in allItemViews)
        {
            // Get all colliders and update only non-trigger ones (physics colliders)
            Collider[] colliders = itemView.GetComponents<Collider>();
            foreach (var collider in colliders)
            {
                if (collider != null && !collider.isTrigger) // Only physics colliders
                {
                    // Create or update physics material
                    if (collider.material == null)
                    {
                        collider.material = new PhysicsMaterial("DynamicBookMaterial");
                    }
                    
                    collider.material.dynamicFriction = physicsFriction;
                    collider.material.staticFriction = physicsFriction;
                    collider.material.bounciness = physicsBounciness;
                    collider.material.frictionCombine = PhysicsMaterialCombine.Average;
                    collider.material.bounceCombine = PhysicsMaterialCombine.Average;
                }
            }
        }
        
        Debug.Log($"[Physics] Updated materials: friction={physicsFriction:F2}, bounciness={physicsBounciness:F2}");
    }
    
    /// <summary>
    /// Update rigidbody settings on all ItemViews with current parameter values
    /// </summary>
    private void UpdateRigidbodySettings()
    {
        List<ItemView> allItemViews = GetAllItemViews();
        
        foreach (var itemView in allItemViews)
        {
            Rigidbody rb = itemView.GetComponent<Rigidbody>();
            if (rb != null)
            {
                // Apply all rigidbody settings from InputManager parameters
                rb.linearDamping = rigidbodyDrag;
                rb.angularDamping = freezeRotation ? extremeAngularDrag : rigidbodyAngularDrag;
                rb.sleepThreshold = rigidbodySleepThreshold;
                
                // NUCLEAR ROTATION STOP
                rb.freezeRotation = freezeRotation;
                rb.constraints = (RigidbodyConstraints)rotationConstraints;
                rb.centerOfMass = centerOfMass; // Apply InputManager center of mass to all items
                rb.maxAngularVelocity = freezeRotation ? 0f : maxAngularVelocity;
                rb.angularVelocity = Vector3.zero; // Force stop any current rotation
                
                rb.collisionDetectionMode = rigidbodyUseContinuousDetection ? 
                    CollisionDetectionMode.ContinuousDynamic : 
                    CollisionDetectionMode.Discrete;
                
                // Mass is handled separately in UpdatePhysicsForScale()
            }
        }
        
        Debug.Log($"[Physics] Updated rigidbody settings: drag={rigidbodyDrag:F1}, angularDrag={rigidbodyAngularDrag:F1}, sleepThreshold={rigidbodySleepThreshold:F2}");
        Debug.Log($"[Physics] ROTATION LOCKED on all {allItemViews.Count} rigidbodies - no spinning allowed!");
    }
    
    /// <summary>
    /// Coroutine that tests various tilt patterns
    /// </summary>
    private System.Collections.IEnumerator TiltTestSequence()
    {
        Debug.Log("[Test] Tilt sequence: Starting neutral...");
        PushTiltInput("test", "Tilt Test", 0f, 0f);
        yield return new WaitForSeconds(2f);
        
        Debug.Log("[Test] Tilt sequence: Tilting right...");
        PushTiltInput("test", "Tilt Test", 0.5f, 0f);
        yield return new WaitForSeconds(2f);
        
        Debug.Log("[Test] Tilt sequence: Tilting forward...");
        PushTiltInput("test", "Tilt Test", 0f, 0.5f);
        yield return new WaitForSeconds(2f);
        
        Debug.Log("[Test] Tilt sequence: Tilting left-back...");
        PushTiltInput("test", "Tilt Test", -0.5f, -0.5f);
        yield return new WaitForSeconds(2f);
        
        Debug.Log("[Test] Tilt sequence: Circular motion...");
        for (float angle = 0; angle < 360; angle += 30)
        {
            float x = Mathf.Sin(angle * Mathf.Deg2Rad) * 0.7f;
            float z = Mathf.Cos(angle * Mathf.Deg2Rad) * 0.7f;
            PushTiltInput("test", "Tilt Test", x, z);
            yield return new WaitForSeconds(0.5f);
        }
        
        Debug.Log("[Test] Tilt sequence: Return to neutral");
        PushTiltInput("test", "Tilt Test", 0f, 0f);
        Debug.Log("[Test] Tilt test complete!");
    }
    
    /// <summary>
    /// Force-refresh all physics settings if books are still rotating (emergency fix!)
    /// </summary>
    [ContextMenu("EMERGENCY: Force Stop All Rotation")]
    public void EmergencyStopAllRotation()
    {
        List<ItemView> allItemViews = GetAllItemViews();
        int fixedBooks = 0;
        
        foreach (var itemView in allItemViews)
        {
            Rigidbody rb = itemView.GetComponent<Rigidbody>();
            if (rb != null)
            {
                // NUCLEAR OPTION - force stop everything!
                rb.freezeRotation = true;
                rb.constraints = RigidbodyConstraints.FreezeRotationX | 
                                RigidbodyConstraints.FreezeRotationY | 
                                RigidbodyConstraints.FreezeRotationZ;
                rb.angularVelocity = Vector3.zero;
                rb.maxAngularVelocity = 0f;
                rb.angularDamping = 1000f; // Extreme angular drag as backup
                
                // Also reset transform rotation to identity
                itemView.transform.rotation = Quaternion.identity;
                
                fixedBooks++;
            }
        }
        
        Debug.Log($"[EMERGENCY] FORCE-STOPPED rotation on {fixedBooks} books! They should be completely locked now!");
        
        // Also refresh materials and settings
        UpdatePhysicsMaterials();
        UpdateRigidbodySettings();
    }
}
