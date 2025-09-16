using UnityEngine;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// Handles camera panning, zooming, physics-based movement, and item selection.
/// </summary>
public class InputManager : MonoBehaviour
{
    [Header("Physics")]

    [ExposedParameter(
        "Static Friction", 
        Category = "Physics", 
        Description = "Resistance to start moving", 
        Min = 0f, Max = 20f, 
        Default = 0.5f, Visible = true)]
    public float staticFriction = 0.5f;
    
    [ExposedParameter(
        "Dynamic Friction", 
        Category = "Physics", 
        Description = "Resistance while moving", 
        Min = 0f, Max = 20f, 
        Default = 0.3f, Visible = true)]
    public float dynamicFriction = 0.3f;
    
    [ExposedParameter(
        "Bounciness", 
        Category = "Physics",
        Description = "How much items bounce when they collide", 
        Min = 0f, Max = 1f, 
        Default = 0.3f, Visible = true)]
    public float bounciness = 0.3f;

    [ExposedParameter(
        "Rigidbody Drag", 
        Category = "Physics", 
        Description = "Linear drag for all items", 
        Min = 0f, Max = 20f, 
        Default = 1.5f, Visible = true)]
    public float rigidbodyDrag = 1.5f;
    
    [ExposedParameter(
        "Angular Drag", 
        Category = "Physics", 
        Description = "Angular drag for all items", 
        Min = 0f, Max = 20f, 
        Default = 5f, Visible = true)]
    public float rigidbodyAngularDrag = 5f;
    
    [ExposedParameter(
        "Max Item Velocity", 
        Category = "Physics",
        Description = "Maximum speed limit for items", 
        Min = 1f, Max = 100f, 
        Default = 30f, Visible = true)]
    public float maxItemVelocity = 30f;
    
    [Header("Mouse")]

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


    public bool enableItemDragging = true;
    public float mouseVelocityMultiplier = 1f;
    public float dragMassMultiplier = 10f;
    public float dragMaxVelocity = 30f;
    public float throwStrength = 3f;
    public float throwSensitivity = 2f;

    [Header("Controller")]

    [ExposedParameter(
        "View Pan Sensitivity", 
        Category = "Controller", 
        Description = "Scales pan movement from view.", 
        Min = 0.01f, 
        Max = 1f, 
        Default = 0.1f
    )]
    public float viewPanScaleFactor = 0.1f;

    [ExposedParameter(
        "View Zoom Sensitivity", 
        Category = "Controller", 
        Description = "Zoom speed from view input.", 
        Min = 0.1f, 
        Max = 5f, 
        Default = 1f
    )]
    public float viewZoomFactor = 1f;

    [ExposedParameter(
        "View Velocity Factor", 
        Category = "Controller", 
        Description = "Multiplier for velocity-based pan.", 
        Min = 0.1f, 
        Max = 5f, 
        Default = 1f
    )]
    public float viewVelocityFactor = 1f;

    [Header("View")]

    [ExposedParameter(
        "View Mode",
        Category = "View",
        Description = "Current view mode: magnets, selection, manual, or attract",
        Default = "magnets",
        Visible = true
    )]
    public string viewMode = "magnets";
    
    [ExposedParameter(
        "View Seek Position Speed", 
        Category = "View", 
        Description = "How quickly the camera centers toward the target", 
        Min = 0.1f, 
        Max = 20f, 
        Default = 1f, 
        Visible = true)]
    public float viewSeekPositionSpeed = 1f;
    
    [ExposedParameter(
        "View Seek Zoom Speed", 
        Category = "View", 
        Description = "How quickly the camera zooms toward the target", 
        Min = 0.1f, 
        Max = 20f, 
        Default = 1f, 
        Visible = true)]
    public float viewSeekZoomSpeed = 1f;
    
    [ExposedParameter(
        "View Seek Margin", 
        Category = "View", 
        Description = "Extra scale multiplier to fit bounds (1.0 = tight)", 
        Min = 1.0f, 
        Max = 2.0f, 
        Default = 1.05f, 
        Visible = true)]
    public float viewSeekScale = 1.02f;
    
    [ExposedParameter(
        "Selection View Ortho Size", 
        Category = "View", 
        Description = "Ortho size when seeking to a selected item", 
        Min = 0.5f, 
        Max = 200f, 
        Default = 5f, 
        Visible = true)]
    public float selectionViewOrthoSize = 5f;
    
    [ExposedParameter(
        "Attract Dwell Seconds", 
        Category = "View", 
        Description = "Pause at an item before hopping to the next in attract mode", 
        Min = 0f, 
        Max = 30f, 
        Default = 2f, 
        Visible = true)]
    public float attractDwellSeconds = 2f;

    [ExposedParameter(
        "Top UI Height (px)",
        Category = "View",
        Description = "Pixels reserved at top of screen (world camera excluded)",
        Min = 0f,
        Max = 400f,
        Default = 100f,
        Visible = true)]
    public float topUiHeightPixels = 100f;

    [ExposedParameter(
        "Magnets View Margin", 
        Category = "View", 
        Description = "Extra margin multiplier used only in magnets view", 
        Min = 1.0f, 
        Max = 2.0f, 
        Default = 1.06f, 
        Visible = true)]
    public float magnetsViewMargin = 1.06f;
    
    [ExposedParameter(
        "Scale Animation Speed", 
        Category = "View", 
        Description = "How quickly items change size", 
        Min = 0.1f, 
        Max = 10f, 
        Default = 2f, 
        Visible = true)]
    public float scaleAnimationSpeed = 2f;
    
    [ExposedParameter(
        "Selection Scale Min", 
        Category = "View", 
        Description = "Minimum selection scale", 
        Min = 0.1f, 
        Max = 2f, 
        Default = 0.5f, 
        Visible = true)]
    public float SelectionScaleMin = 0.5f;
    
    [ExposedParameter(
        "Selection Scale", 
        Category = "View", 
        Description = "Selection scale multiplier", 
        Min = 0.5f, 
        Max = 3f, 
        Default = 1.2f, 
        Visible = true)]
    public float SelectionScale = 1.2f;
    
    [ExposedParameter(
        "Selection Tap Scale", 
        Category = "View", 
        Description = "Tap scale multiplier", 
        Min = 0.5f, 
        Max = 3f, 
        Default = 1.2f, 
        Visible = true)]
    [UnityEngine.Serialization.FormerlySerializedAs("selectionTapScale")]
    public float SelectionTapScale = 1.2f;
 
    public float panSpeed = 10f;

    private Dictionary<KeyCode, Vector3> thrustDirections = new Dictionary<KeyCode, Vector3>
    {
        { KeyCode.LeftArrow,  new Vector3(-1, 0, 0) },
        { KeyCode.RightArrow, new Vector3( 1, 0, 0) },
        { KeyCode.UpArrow,    new Vector3( 0, 0, 1) },
        { KeyCode.DownArrow,  new Vector3( 0, 0,-1) },
    };
    private HashSet<KeyCode> activeThrustKeys = new HashSet<KeyCode>();
    private string thrustingItemId = null;
    private bool capsLockToggled = false;

    [Header("Camera Boundaries")]
    public float minX = -1000f;
    public float maxX = 1000f;
    public float minZ = -1000f;
    public float maxZ = 1000f;
    public float minZoom = 2f;
    public float maxZoom = 100f;
    public float cameraVelocitySmoothingFactor = 0.05f; // for smooth release physics
    public float cameraFrictionFactor = 0.999f;
    public float cameraBounceFactor = 0.9f;
    public float cameraBaseVelocityThreshold = 2.0f;
    public float cameraReleaseVelocityDamping = 0.3f;
    public float scrollWheelZoomFactor = 5f;
    public float keyboardZoomFactor = 5f;
    
    // Raycast filtering for item detection (from main)
    public LayerMask itemLayer = -1;
    private float maxSelectionDistance = 200f;
    
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
    private ItemView hoveredItem;
    private BaseView draggedItem;
    
    // Camera state
    private Vector3 previousMousePosition;
    private Vector3 cameraVelocity = Vector3.zero;
    private Vector3 filteredVelocity = Vector3.zero;
    private bool viewSeekEnabled = false;
    private Vector2 viewSeekTargetCenter = Vector2.zero;
    private float viewSeekTargetOrtho = 20f;
    private ItemView attractCurrentTarget = null;
    private float attractLastPickTime = 0f;
    private bool cameraPhysicsEnabled = true;
    private float lastDragTime;
    private Vector3 dragStartPosition;
    private Vector3 dragStartWorldPos;
    private ItemView itemAtDragStart;
    private Vector3 dragLocalOffset = Vector3.zero; // Local offset on the item that was clicked
    private Rigidbody draggedRigidbody = null;
    private float originalMass = 1f; // Store original mass to restore later
    private Vector3 previousMouseWorldPos = Vector3.zero; // Track mouse movement for velocity
    private Vector3 mouseVelocity = Vector3.zero; // Current mouse velocity in world space

    private class VelocitySample
    {
        public Vector3 position;
        public float time;
        public VelocitySample(Vector3 pos, float t) { position = pos; time = t; }
    }
    
    private List<VelocitySample> velocityBuffer = new List<VelocitySample>();
    private const int VELOCITY_BUFFER_SIZE = 10; // Keep last N samples
    private const float VELOCITY_SAMPLE_WINDOW = 0.1f; // Use samples from last 100ms (from main)
    private Vector3 dragStartItemPosition = Vector3.zero; // World position of item when drag started
    public float dragMaxDistance = 15f;
    
    void Start()
    {
        spaceCraft = FindFirstObjectByType<SpaceCraft>();
        cameraController = FindFirstObjectByType<CameraController>();
        if (cameraController != null)
        {
            _mainCamera = cameraController.controlledCamera;
            ApplyTopUiViewport();
        }
        
        UpdatePhysicsMaterials();
        UpdateRigidbodySettings();
    }

    void Update()
    {
        HandleInput();
        UpdateHoveredItem();
        UpdatePhysicsMaterials();
        HandleKeyboardInput();
        // If resolution changes, keep viewport reserved for top UI
        ApplyTopUiViewport();
    }

    private void ApplyTopUiViewport()
    {
        if (_mainCamera == null) return;
        float h = Mathf.Max(0f, topUiHeightPixels);
        float pixelH = Mathf.Max(1f, (float)_mainCamera.pixelHeight);
        float yMin = h / pixelH;
        yMin = Mathf.Clamp01(yMin);
        float height = Mathf.Max(1f / Mathf.Max(1f, pixelH), 1f - yMin); // ensure at least 1px high
        Rect r = _mainCamera.rect;
        r.x = 0f;
        r.width = 1f;
        r.y = 0f; // viewport starts at bottom
        r.height = height; // exclude top strip, clamped to >=1px
        _mainCamera.rect = r;
    }
    
    void FixedUpdate()
    {
        // Apply magnet physics forces
        ApplyMagnetForces();
        // Apply continuous thrust during physics
        ApplyContinuousThrust();


        switch (viewMode) {

            case "attract":
                viewSeekEnabled = true;
                ViewSeekAttract();
                break;

            case "magnets":
                viewSeekEnabled = true;
                ViewSeekMagnets();
                break;

            case "selection":
                viewSeekEnabled = true;
                ViewSeekSelection();
                break;

            case "manual":
            default:
                viewSeekEnabled = false;
                break;

        }

        if (viewSeekEnabled)
        {
            ApplyViewSeek();
        }
        else if (cameraPhysicsEnabled)
        {
            ApplyCameraPhysics();
        }

    }
    
    void ViewSeekAttract()
    {
        ItemView[] allItems = FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        if (allItems.Length == 0)
        {
            viewSeekEnabled = false;
            return;
        }
        bool needPick = attractCurrentTarget == null;
        if (!needPick)
        {
            // If arrived and dwell elapsed, pick a new target
            float arrivedDist = ViewSeekDistance();
            if (arrivedDist < 0.05f && (Time.realtimeSinceStartup - attractLastPickTime) >= attractDwellSeconds)
            {
                needPick = true;
            }
        }
        if (needPick)
        {
            int idx = Random.Range(0, allItems.Length);
            attractCurrentTarget = allItems[idx];
            attractLastPickTime = Time.realtimeSinceStartup;
        }
        if (attractCurrentTarget != null)
        {
            // Reuse selection logic targetting
            Vector3 p = attractCurrentTarget.transform.position;
            viewSeekTargetCenter = new Vector2(p.x, p.z);
            viewSeekTargetOrtho = Mathf.Clamp(selectionViewOrthoSize, minZoom, maxZoom);
        }
    }

    void ViewSeekMagnets()
    {
        // Compute bbox of all items that are affected by any enabled magnet.
        // If no magnets or no affected items, fall back to bbox of all items.
        ItemView[] allItems = FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        if (allItems.Length == 0)
        {
            viewSeekEnabled = false;
            return;
        }

        MagnetView[] magnets = FindObjectsByType<MagnetView>(FindObjectsSortMode.None);
        bool anyMagnet = false;
        foreach (var m in magnets)
        {
            if (m != null && m.magnetEnabled) { anyMagnet = true; break; }
        }

        bool anyAffected = false;
        Vector3 min = new Vector3(float.PositiveInfinity, 0, float.PositiveInfinity);
        Vector3 max = new Vector3(float.NegativeInfinity, 0, float.NegativeInfinity);

        if (anyMagnet)
        {
            foreach (var item in allItems)
            {
                if (item == null) continue;
                Vector3 pos = item.transform.position;
                Vector3 net = Vector3.zero;
                foreach (var mag in magnets)
                {
                    if (mag == null || !mag.magnetEnabled) continue;
                    net += mag.CalculateMagneticForce(item, pos);
                }
                if (net.sqrMagnitude > 0.00001f)
                {
                    anyAffected = true;
                    if (pos.x < min.x) min.x = pos.x;
                    if (pos.z < min.z) min.z = pos.z;
                    if (pos.x > max.x) max.x = pos.x;
                    if (pos.z > max.z) max.z = pos.z;
                }
            }
        }

        if (!anyAffected)
        {
            // Fallback: use all items' bbox
            foreach (var item in allItems)
            {
                if (item == null) continue;
                Vector3 pos = item.transform.position;
                if (pos.x < min.x) min.x = pos.x;
                if (pos.z < min.z) min.z = pos.z;
                if (pos.x > max.x) max.x = pos.x;
                if (pos.z > max.z) max.z = pos.z;
            }
        }

        Vector2 center = new Vector2((min.x + max.x) * 0.5f, (min.z + max.z) * 0.5f);
        float width = Mathf.Max(0.1f, max.x - min.x);
        float height = Mathf.Max(0.1f, max.z - min.z);
        // Add an item-visual padding so top/bottom rows are not clipped
        float perItemPad = 1.0f; // world units padding per edge
        width += perItemPad * 2f;
        height += perItemPad * 2f;
        // Convert bbox to orthographic size using camera aspect; ensure both axes fit with margin
        float aspect = (_mainCamera != null && _mainCamera.pixelHeight > 0) ? ((float)_mainCamera.pixelWidth / (float)_mainCamera.pixelHeight) : 1f;
        float modeMargin = viewMode == "magnets" ? (viewSeekScale * magnetsViewMargin) : viewSeekScale;
        float halfWidth = (width * 0.5f) * modeMargin;
        float halfHeight = (height * 0.5f) * modeMargin;
        float orthoFromWidth = (aspect > 0.0001f) ? (halfWidth / aspect) : halfWidth;
        float orthoFromHeight = halfHeight;
        float targetOrtho = Mathf.Clamp(Mathf.Max(orthoFromWidth, orthoFromHeight), minZoom, maxZoom);

        viewSeekTargetCenter = center;
        viewSeekTargetOrtho = targetOrtho;
    }

    void ViewSeekSelection()
    {
        if (spaceCraft == null) return;
        if (spaceCraft.SelectedItemIds.Count == 0)
        {
            viewSeekEnabled = false;
            return;
        }
        string id = spaceCraft.SelectedItemIds[0];
        ItemView item = spaceCraft.FindItemViewById(id);
        if (item == null)
        {
            viewSeekEnabled = false;
            return;
        }
        Vector3 pos = item.transform.position;
        viewSeekTargetCenter = new Vector2(pos.x, pos.z);
        viewSeekTargetOrtho = Mathf.Clamp(selectionViewOrthoSize, minZoom, maxZoom);
    }

    void ApplyViewSeek()
    {
        if (!viewSeekEnabled) return;
        if (_mainCamera == null || cameraController == null || cameraController.cameraRig == null) return;

        // Smoothly move center
        Vector3 current = cameraController.cameraRig.position;
        Vector3 desired = new Vector3(viewSeekTargetCenter.x, current.y, viewSeekTargetCenter.y);
        float posT = 1f - Mathf.Exp(-viewSeekPositionSpeed * Time.deltaTime);
        Vector3 next = Vector3.Lerp(current, desired, posT);
        cameraController.cameraRig.position = new Vector3(
            Mathf.Clamp(next.x, minX, maxX),
            next.y,
            Mathf.Clamp(next.z, minZ, maxZ)
        );

        // Smoothly adjust zoom (orthographic size)
        float currentOrtho = _mainCamera.orthographicSize;
        float targetOrtho = Mathf.Clamp(viewSeekTargetOrtho, minZoom, maxZoom);
        float zoomT = 1f - Mathf.Exp(-viewSeekZoomSpeed * Time.deltaTime);
        _mainCamera.orthographicSize = Mathf.Lerp(currentOrtho, targetOrtho, zoomT);
    }

    private void HandleInput()
    {
        // LEFT MOUSE BUTTON - Item Interaction Only
        if (Input.GetMouseButtonDown(0))
        {
            ItemView clickedItem = GetItemUnderMouse();
            if (clickedItem != null)
            {
                dragStartPosition = Input.mousePosition;
                dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
                lastDragTime = Time.realtimeSinceStartup;
                itemAtDragStart = clickedItem;
                string itemId = clickedItem.Model?.Id;
                if (!string.IsNullOrEmpty(itemId))
                {
                    if (spaceCraft.SelectedItemIds.Contains(itemId))
                    {
                        float tapScale = SelectionTapScale;
                        float newScale = clickedItem.CurrentScale * tapScale;
                        clickedItem.SetCurrentScale(newScale);
                    }
                    else
                    {
                        spaceCraft.SelectItem("mouse_input", "Local Mouse", itemId);
                    }
                }
                if (enableItemDragging && clickedItem.GetComponent<Rigidbody>() != null)
                {
                    StartItemDrag(clickedItem, Input.mousePosition);
                }
            }
            else
            {
                // Try dragging a magnet before falling back to camera drag
                MagnetView clickedMagnet = GetMagnetUnderMouse();
                if (enableItemDragging && clickedMagnet != null && clickedMagnet.GetComponent<Rigidbody>() != null)
                {
                    StartMagnetDrag(clickedMagnet, Input.mousePosition);
                }
                else
                {
                    isDragging = true;
                    previousMousePosition = Input.mousePosition;
                    dragStartPosition = Input.mousePosition;
                    dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
                    lastDragTime = Time.realtimeSinceStartup;
                    cameraPhysicsEnabled = false;
                    cameraVelocity = Vector3.zero;
                }
            }
        }
        else if (Input.GetMouseButtonUp(0))
        {
            if (isDraggingItem)
            {
                EndItemDrag();
            }
            else if (isDragging)
            {
                isDragging = false;
                if (filteredVelocity.magnitude > GetScaledVelocityThreshold())
                {
                    Vector3 dampedVelocity = filteredVelocity * cameraReleaseVelocityDamping;
                    if (dampedVelocity.magnitude > GetScaledVelocityThreshold() * 0.5f)
                    {
                        cameraVelocity = dampedVelocity;
                        cameraPhysicsEnabled = true;
                    }
                    else
                    {
                        cameraVelocity = Vector3.zero;
                        cameraPhysicsEnabled = false;
                    }
                }
                else
                {
                    cameraVelocity = Vector3.zero;
                    cameraPhysicsEnabled = false;
                }
            }
            else if (itemAtDragStart != null)
            {
                itemAtDragStart = null;
            }
        }
        
        if (Input.GetMouseButtonDown(1))
        {
            isDragging = true;
            previousMousePosition = Input.mousePosition;
            dragStartPosition = Input.mousePosition;
            dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
            lastDragTime = Time.realtimeSinceStartup;
            cameraPhysicsEnabled = false;
            cameraVelocity = Vector3.zero;
        }
        else if (Input.GetMouseButtonUp(1))
        {
            bool wasDragging = isDragging;
            isDragging = false;
            if (wasDragging)
            {
                if (filteredVelocity.magnitude > GetScaledVelocityThreshold())
                {
                    Vector3 dampedVelocity = filteredVelocity * cameraReleaseVelocityDamping;
                    if (dampedVelocity.magnitude > GetScaledVelocityThreshold() * 0.5f)
                    {
                        cameraVelocity = dampedVelocity;
                        cameraPhysicsEnabled = true;
                    }
                    else
                    {
                        cameraVelocity = Vector3.zero;
                        cameraPhysicsEnabled = false;
                    }
                }
                else
                {
                    cameraVelocity = Vector3.zero;
                    cameraPhysicsEnabled = false;
                }
            }
        }
        
        if (isDragging)
        {   
            HandleMouseDrag();
        }

        if (isDraggingItem)
        {
            HandleItemDrag();
        }
 
        // Per-frame update for item dragging (from main)
        // (inline removed; handled by HandleItemDrag())
 
        // Zoom handlers from main
        HandleMouseZoom(Input.GetAxis("Mouse ScrollWheel"));
        HandleKeyboardZoom();
    }
    
    private void HandleItemDrag()
    {
        if (!isDraggingItem || draggedItem == null || draggedRigidbody == null) return;
        
        Vector3 mouseWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
        float currentTime = Time.realtimeSinceStartup;
        
        velocityBuffer.Add(new VelocitySample(mouseWorldPos, currentTime));
        while (velocityBuffer.Count > VELOCITY_BUFFER_SIZE)
        {
            velocityBuffer.RemoveAt(0);
        }
        
        mouseVelocity = CalculateFilteredVelocity(currentTime);
        previousMouseWorldPos = mouseWorldPos;
        
        Vector3 targetWorldPos = mouseWorldPos;
        Vector3 currentGrabWorldPos = draggedItem.transform.TransformPoint(dragLocalOffset);
        Vector3 rubberBandVector = targetWorldPos - currentGrabWorldPos;
        float distance = rubberBandVector.magnitude;
        
        if (distance > 0.001f)
        {
            float pullStrength = Mathf.Clamp01(distance / dragMaxDistance);
            float smoothedPull = pullStrength * 0.95f + 0.05f;
            Vector3 currentItemPos = draggedItem.transform.position;
            Vector3 targetItemPos = targetWorldPos - draggedItem.transform.TransformDirection(dragLocalOffset);
            Vector3 newItemPos = Vector3.Lerp(currentItemPos, targetItemPos, smoothedPull);
            draggedRigidbody.MovePosition(newItemPos);
            draggedRigidbody.angularVelocity = Vector3.zero;
        }
    }
    
    // Removed obsolete HandleMouseDown/HandleMouseUp (behavior handled in HandleInput)
    
    private void HandleMouseDrag()
    {
        Vector3 currentMousePos = Input.mousePosition;
        float deltaTime = Time.realtimeSinceStartup - lastDragTime;
        if (deltaTime < 0.001f) return; // Avoid excessive calculations if time hasn't passed

        // PERFECT CURSOR TRACKING:
        // The world point that was under the cursor at drag start (dragStartWorldPos)
        // must ALWAYS remain under the cursor throughout the drag
        
        // Get the current world position under the mouse
        Vector3 currentWorldUnderMouse = GetWorldPositionAtScreenPoint(currentMousePos);
        
        // Calculate how far the camera needs to move to keep dragStartWorldPos under the cursor
        // If dragStartWorldPos should be at currentMousePos, but it's currently at currentWorldUnderMouse,
        // then camera needs to move by the difference
        Vector3 worldDelta = dragStartWorldPos - currentWorldUnderMouse;
        
        // Note: NO inversion needed! The math above directly calculates the required camera movement
        // to keep the initial point under the cursor

        // Directly move the camera rig
        Vector3 positionBeforeMove = cameraController.cameraRig.position;
        MoveCameraRig(worldDelta); 
        Vector3 positionAfterMove = cameraController.cameraRig.position;
        Vector3 actualWorldDelta = positionAfterMove - positionBeforeMove;

        // Update velocity tracking for potential physics release
        Vector3 instantVelocity = actualWorldDelta / deltaTime;
        filteredVelocity = Vector3.Lerp(filteredVelocity, instantVelocity, cameraVelocitySmoothingFactor);
        
        previousMousePosition = currentMousePos;
        lastDragTime = Time.realtimeSinceStartup;
    }
    
    private void UpdateHoveredItem()
    {
        if (_mainCamera == null || spaceCraft == null) return;
        
        Ray ray = _mainCamera.ScreenPointToRay(Input.mousePosition);
        ItemView newlyHovered = null;
        
        // Use SphereCast for slightly more forgiving hover detection
        // Only detect TRIGGER colliders on itemLayer (mouse detection boxes)
        if (Physics.SphereCast(ray, 0.05f, out RaycastHit hit, maxSelectionDistance, itemLayer, QueryTriggerInteraction.Collide))
        {
            newlyHovered = hit.collider.GetComponentInParent<ItemView>();
        }
        
        if (newlyHovered != hoveredItem)
        {
            if (hoveredItem != null && hoveredItem.Model != null)
            {
                spaceCraft.UnhighlightItem("mouse_input", "Local Mouse", hoveredItem.Model.Id);
            }
            
            hoveredItem = newlyHovered;
            
            if (hoveredItem != null && hoveredItem.Model != null)
            {
                spaceCraft.HighlightItem("mouse_input", "Local Mouse", hoveredItem.Model.Id);
            }
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
        ItemView[] allItems = FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        foreach (var itemView in allItems)
        {
            Rigidbody rb = itemView.GetComponent<Rigidbody>();
            if (rb == null) continue;
            // Do not reset drag/damping here; BaseView manages per-object physics.
            // Only clamp item velocity.
            if (rb.linearVelocity.magnitude > maxItemVelocity)
            {
                rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
            }
        }
    }
    
    private void ApplyMagnetForces()
    {
        MagnetView[] allMagnets = FindObjectsByType<MagnetView>(FindObjectsSortMode.None);
        if (allMagnets.Length == 0) return;
        
        ItemView[] allItems = FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        if (allItems.Length == 0) return;
        
        foreach (MagnetView magnet in allMagnets)
        {
            if (magnet == null || !magnet.magnetEnabled) continue;
            
            foreach (ItemView itemView in allItems)
            {
                if (itemView?.GetComponent<Rigidbody>() == null) continue;
                
                Rigidbody rb = itemView.GetComponent<Rigidbody>();
                    if (rb.isKinematic) continue;
                    
                    Vector3 magneticForce = magnet.CalculateMagneticForce(itemView, itemView.transform.position);
                    
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
        ItemView[] allItemViewsArray = FindObjectsByType<ItemView>(FindObjectsSortMode.None);
        return new List<ItemView>(allItemViewsArray);
    }
    
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

    private void ApplyCameraPhysics()
    {
        if (cameraVelocity.sqrMagnitude < 0.0001f)
        {
            cameraVelocity = Vector3.zero;
            return;
        }
        
        cameraVelocity *= cameraFrictionFactor;
        Vector3 positionDelta = cameraVelocity * Time.deltaTime;
        
        Vector3 currentPosition = cameraController.cameraRig.position;
        Vector3 targetPosition = currentPosition + positionDelta;
        
        if (targetPosition.x < minX || targetPosition.x > maxX)
        {
            targetPosition.x = Mathf.Clamp(targetPosition.x, minX, maxX);
            cameraVelocity.x *= -cameraBounceFactor;
        }
        if (targetPosition.z < minZ || targetPosition.z > maxZ)
        {
            targetPosition.z = Mathf.Clamp(targetPosition.z, minZ, maxZ);
            cameraVelocity.z *= -cameraBounceFactor;
        }
        
        cameraController.cameraRig.position = targetPosition;
    }
    
    public Vector2 GetPanCenter()
    {
        return new Vector2(cameraController.cameraRig.position.x, cameraController.cameraRig.position.z);
    }
    
    private ItemView GetItemUnderMouse()
    {
        Ray ray = _mainCamera.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;
        
        if (Physics.Raycast(ray, out hit, maxSelectionDistance, itemLayer))
        {
            ItemView itemView = hit.collider.GetComponentInParent<ItemView>();
            if (itemView != null)
            {
                return itemView;
            }
        }
        
        return null;
    }

    private void StartItemDrag(ItemView item, Vector3 mouseScreenPos)
    {
        if (item == null) return;
        
        Rigidbody rb = item.GetComponent<Rigidbody>();
        if (rb == null) return;
        
        Vector3 mouseWorldPos = GetWorldPositionAtScreenPoint(mouseScreenPos);
        dragLocalOffset = item.transform.InverseTransformPoint(mouseWorldPos);
        Vector3 itemWorldPos = item.transform.position;
        dragStartItemPosition = itemWorldPos;
        
        originalMass = rb.mass;
        rb.mass = originalMass * dragMassMultiplier;
        
        velocityBuffer.Clear();
        mouseVelocity = Vector3.zero;
        
        isDraggingItem = true;
        draggedItem = item;
        draggedRigidbody = rb;
        
    }

    private void EndItemDrag()
    {
        if (isDraggingItem && draggedItem != null && draggedRigidbody != null)
        {
            Vector3 finalVelocity = CalculateFilteredVelocity(Time.realtimeSinceStartup);
            Vector3 throwVelocity = finalVelocity * throwStrength * throwSensitivity;
            if (throwVelocity.magnitude > dragMaxVelocity)
            {
                throwVelocity = throwVelocity.normalized * dragMaxVelocity;
            }
            draggedRigidbody.linearVelocity = throwVelocity;
            if (draggedRigidbody.linearVelocity.magnitude > maxItemVelocity)
            {
                draggedRigidbody.linearVelocity = draggedRigidbody.linearVelocity.normalized * maxItemVelocity;
            }
            // Ensure damping and kinematic state are correct for deceleration after release
            if (draggedItem is BaseView bv)
            {
                draggedRigidbody.linearDamping = bv.linearDrag;
                draggedRigidbody.angularDamping = bv.angularDrag;
                draggedRigidbody.isKinematic = false;
            }
            draggedRigidbody.mass = originalMass;
        }
        isDraggingItem = false;
        draggedItem = null;
        draggedRigidbody = null;
        dragLocalOffset = Vector3.zero;
        originalMass = 1f;
        mouseVelocity = Vector3.zero;
        previousMouseWorldPos = Vector3.zero;
        dragStartItemPosition = Vector3.zero;
        velocityBuffer.Clear();
    }

    private Vector3 CalculateFilteredVelocity(float currentTime)
    {
        if (velocityBuffer.Count < 2) return Vector3.zero;
        
        List<VelocitySample> recentSamples = new List<VelocitySample>();
        float windowStart = currentTime - VELOCITY_SAMPLE_WINDOW;
        
        foreach (var sample in velocityBuffer)
        {
            if (sample.time >= windowStart)
            {
                recentSamples.Add(sample);
            }
        }
        
        if (recentSamples.Count < 2) 
        {
            int count = velocityBuffer.Count;
            var lastSample = velocityBuffer[count - 1];
            var prevSample = velocityBuffer[count - 2];
            float dt = lastSample.time - prevSample.time;
            if (dt > 0.0001f)
            {
                return (lastSample.position - prevSample.position) / dt;
            }
            return Vector3.zero;
        }
        
        Vector3 weightedVelocity = Vector3.zero;
        float totalWeight = 0f;
        
        for (int i = 1; i < recentSamples.Count; i++)
        {
            var current = recentSamples[i];
            var previous = recentSamples[i - 1];
            float dt = current.time - previous.time;
            
            if (dt > 0.0001f)
            {
                Vector3 velocity = (current.position - previous.position) / dt;
                float age = currentTime - current.time;
                float weight = Mathf.Exp(-age / VELOCITY_SAMPLE_WINDOW * 2f);
                
                weightedVelocity += velocity * weight;
                totalWeight += weight;
            }
        }
        
        if (totalWeight > 0.0001f)
        {
            return weightedVelocity / totalWeight;
        }
        
        return Vector3.zero;
    }

    private float GetScaledVelocityThreshold()
    {
        float zoomScale = Mathf.Clamp(_mainCamera.orthographicSize / 10f, 0.5f, 2.0f);
        return cameraBaseVelocityThreshold * zoomScale;
    }
    
    public void PushCameraPosition(string controllerId, string controllerName, string screenId, float panXDelta, float panYDelta)
    {
        if (cameraController == null)
        {
            Debug.LogWarning($"PushCameraPosition ({controllerId} '{controllerName}'): Missing CameraController.");
            return;
        }

        Vector3 worldDelta = new Vector3(-panXDelta, 0, panYDelta);
        worldDelta *= (_mainCamera.orthographicSize * viewPanScaleFactor);

        cameraPhysicsEnabled = false;
        cameraVelocity = Vector3.zero;
        filteredVelocity = Vector3.zero;

        MoveCameraRig(worldDelta);
    }

    public void PushCameraZoom(string controllerId, string controllerName, string screenId, float zoomDelta)
    {
         if (cameraController == null)
        {
            Debug.LogWarning($"PushCameraZoom ({controllerId} '{controllerName}'): Missing CameraController.");
            return;
        }

        if (Mathf.Approximately(zoomDelta, 0)) return;

        float currentZoom = _mainCamera.orthographicSize;
        float zoomMultiplier = 1.0f + (zoomDelta * viewZoomFactor); 
        zoomMultiplier = Mathf.Max(0.01f, zoomMultiplier);
        float targetZoom = currentZoom * zoomMultiplier;
        targetZoom = Mathf.Clamp(targetZoom, minZoom, maxZoom);

        ApplyZoomAroundPoint(targetZoom, GetWorldPositionAtScreenCenter());
    }

    public void PushCameraVelocity(string controllerId, string controllerName, float panXDelta, float panYDelta)
    {
        if (cameraController == null)
        {
             Debug.LogWarning($"PushCameraVelocity ({controllerId} '{controllerName}'): Missing CameraController.");
            return;
        }

        Vector3 worldVelocityDelta = new Vector3(-panXDelta, 0, panYDelta);
        worldVelocityDelta *= viewVelocityFactor; 

        cameraVelocity += worldVelocityDelta;
        cameraPhysicsEnabled = true;
    }

    private void ApplyZoomAroundPoint(float targetOrthoSize, Vector3 zoomCenterWorldPos)
    {
        if (_mainCamera == null || cameraController == null || cameraController.cameraRig == null) return;
        
        float currentOrthoSize = _mainCamera.orthographicSize;
        if (Mathf.Approximately(currentOrthoSize, targetOrthoSize)) return; 

        Vector3 zoomCenterScreenPos = _mainCamera.WorldToScreenPoint(zoomCenterWorldPos);
        _mainCamera.orthographicSize = targetOrthoSize; 
        Vector3 zoomCenterWorldPosAfter = GetWorldPositionAtScreenPoint(zoomCenterScreenPos);
        Vector3 adjustment = zoomCenterWorldPos - zoomCenterWorldPosAfter;
        
        if (cameraPhysicsEnabled && !Mathf.Approximately(currentOrthoSize, 0))
        {
            float velocityScale = targetOrthoSize / currentOrthoSize;
            cameraVelocity *= velocityScale;
        }

        MoveCameraRig(adjustment);
    }

    private Vector3 GetWorldPositionAtScreenCenter()
    {
        return GetWorldPositionAtScreenPoint(new Vector3(_mainCamera.pixelWidth / 2f, _mainCamera.pixelHeight / 2f, 0));
    }

    private float ViewSeekDistance()
    {
        if (cameraController == null || cameraController.cameraRig == null) return float.PositiveInfinity;
        Vector2 center = new Vector2(cameraController.cameraRig.position.x, cameraController.cameraRig.position.z);
        return Vector2.Distance(center, viewSeekTargetCenter) + Mathf.Abs(_mainCamera.orthographicSize - viewSeekTargetOrtho) * 0.01f;
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
        if (Input.GetKey(KeyCode.Q)) keyboardZoomDelta -= 1f; // Q = Zoom Out (+) Ortho Size
        if (Input.GetKey(KeyCode.E)) keyboardZoomDelta += 1f; // E = Zoom In (-) Ortho Size
        
        if (!Mathf.Approximately(keyboardZoomDelta, 0))
        {
            float currentZoom = _mainCamera.orthographicSize;
            float zoomChange = -keyboardZoomDelta * keyboardZoomFactor * Time.deltaTime; // Invert delta, scale by time
            float targetZoom = currentZoom + zoomChange;
            targetZoom = Mathf.Clamp(targetZoom, minZoom, maxZoom);
            ApplyZoomAroundPoint(targetZoom, GetWorldPositionAtScreenCenter());
        }
    }

    private MagnetView GetMagnetUnderMouse()
    {
        Ray ray = _mainCamera.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;
        // Use an unfiltered raycast to allow magnets on other layers
        if (Physics.Raycast(ray, out hit, maxSelectionDistance))
        {
            return hit.collider.GetComponentInParent<MagnetView>();
        }
        return null;
    }

    private void StartMagnetDrag(MagnetView magnet, Vector3 mouseScreenPos)
    {
        if (magnet == null) return;
        Rigidbody rb = magnet.GetComponent<Rigidbody>();
        if (rb == null) return;

        Vector3 mouseWorldPos = GetWorldPositionAtScreenPoint(mouseScreenPos);
        dragLocalOffset = magnet.transform.InverseTransformPoint(mouseWorldPos);

        originalMass = rb.mass;
        rb.mass = originalMass * dragMassMultiplier;

        velocityBuffer.Clear();
        mouseVelocity = Vector3.zero;

        isDraggingItem = true;
        draggedItem = magnet;
        draggedRigidbody = rb;
    }

    private void HandleKeyboardInput()
    {
        bool capsLockJustToggled = false;
        if (Input.GetKeyDown(KeyCode.CapsLock))
        {
            capsLockToggled = !capsLockToggled;
            capsLockJustToggled = true;
        }
        bool isShiftHeld = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        bool shouldThrust = capsLockToggled ? !isShiftHeld : isShiftHeld;
        bool shiftJustPressed = (Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift));
        bool justEnteredThrustMode = (shiftJustPressed && !capsLockToggled) || 
                                     (!isShiftHeld && capsLockToggled && (Input.GetKeyUp(KeyCode.LeftShift) || Input.GetKeyUp(KeyCode.RightShift))) ||
                                     (capsLockJustToggled && shouldThrust);
        if (justEnteredThrustMode)
        {
            foreach (var kvp in thrustDirections)
            {
                KeyCode key = kvp.Key;
                if (Input.GetKey(key) && !activeThrustKeys.Contains(key))
                {
                    activeThrustKeys.Add(key);
                }
            }
        }
        foreach (var kvp in thrustDirections)
        {
            KeyCode key = kvp.Key;
            Vector3 direction = kvp.Value;
            if (Input.GetKeyDown(key))
            {
                if (shouldThrust)
                {
                    ApplyNudgeToSelectedItem(direction);
                    activeThrustKeys.Add(key);
                }
                else
                {
                    string dirName = key == KeyCode.LeftArrow ? "west" : 
                                     key == KeyCode.RightArrow ? "east" : 
                                     key == KeyCode.UpArrow ? "north" : "south";
                    spaceCraft.MoveSelection("keyboard_input", "Keyboard", "main", dirName);
                }
            }
            else if (Input.GetKeyUp(key))
            {
                if (activeThrustKeys.Contains(key))
                {
                    activeThrustKeys.Remove(key);
                    if (activeThrustKeys.Count == 0)
                    {
                        thrustingItemId = null;
                    }
                }
            }
        }
        if (!shouldThrust && activeThrustKeys.Count > 0)
        {
            activeThrustKeys.Clear();
            thrustingItemId = null;
        }
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (spaceCraft.SelectedItemIds.Count > 0)
            {
                string selectedId = spaceCraft.SelectedItemIds[0];
                ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
                if (selectedItem != null)
                {
                    float tapScale = SelectionTapScale;
                    float newScale = selectedItem.CurrentScale * tapScale;
                    selectedItem.SetCurrentScale(newScale);
                }
            }
        }
        Vector3 moveDirectionDelta = Vector3.zero;
        if (Input.GetKey(KeyCode.A)) moveDirectionDelta.x -= 1;
        if (Input.GetKey(KeyCode.D)) moveDirectionDelta.x += 1;
        if (Input.GetKey(KeyCode.W)) moveDirectionDelta.z += 1;
        if (Input.GetKey(KeyCode.S)) moveDirectionDelta.z -= 1;
        if (moveDirectionDelta != Vector3.zero)
        {
            cameraPhysicsEnabled = false;
            cameraVelocity = Vector3.zero;
            moveDirectionDelta.Normalize();
            float scaleFactor = panSpeed * Time.deltaTime * _mainCamera.orthographicSize * 0.5f;
            Vector3 worldPanDelta = moveDirectionDelta * scaleFactor;
            MoveCameraRig(worldPanDelta);
        }
        else if (!isDragging && !cameraPhysicsEnabled)
        {
            cameraPhysicsEnabled = true;
        }
    }

    private void ApplyNudgeToSelectedItem(Vector3 direction)
    {
        if (spaceCraft.SelectedItemIds.Count == 0) return;
        string selectedId = spaceCraft.SelectedItemIds[0];
        ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
        if (selectedItem == null) return;
        Rigidbody rb = selectedItem.GetComponent<Rigidbody>();
        if (rb == null) return;
        if (rb.IsSleeping()) rb.WakeUp();
        Vector3 forceVector = direction.normalized * selectionNudgeForce;
        rb.AddForce(forceVector, ForceMode.Impulse);
        if (rb.linearVelocity.magnitude > maxItemVelocity)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
        }
    }

    private void ApplyContinuousThrust()
    {
        if (activeThrustKeys.Count == 0) return;
        if (spaceCraft.SelectedItemIds.Count == 0) return;
        string selectedId = spaceCraft.SelectedItemIds[0];
        ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
        if (selectedItem == null) return;
        thrustingItemId = selectedId;
        Rigidbody rb = selectedItem.GetComponent<Rigidbody>();
        if (rb == null) return;
        Vector3 combinedThrust = Vector3.zero;
        foreach (KeyCode key in activeThrustKeys)
        {
            if (thrustDirections.ContainsKey(key)) combinedThrust += thrustDirections[key];
        }
        if (combinedThrust.magnitude > 1f) combinedThrust = combinedThrust.normalized;
        if (combinedThrust.magnitude > 0.01f)
        {
            Vector3 thrustForce = combinedThrust * selectionThrustForce;
            rb.AddForce(thrustForce, ForceMode.Force);
            if (rb.IsSleeping()) rb.WakeUp();
            if (rb.linearVelocity.magnitude > maxItemVelocity)
            {
                rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
            }
        }
    }

}
