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
    // ==========================================
    // SECTION 1: PHYSICS SIMULATION PARAMETERS
    // Core physics that affect all objects
    // ==========================================
    
    [Header("═══════════════════════════════════════")]
    [Header("PHYSICS SIMULATION (Runtime Priority)")]
    [Header("═══════════════════════════════════════")]
    
    [Header("Physics Materials - Global Settings")]
    
    [ExposedParameter("Static Friction", Category = "Physics Materials", Description = "Resistance to start moving", Min = 0f, Max = 20f)]
    [Tooltip("Static friction - resistance to start moving")]
    [Range(0f, 20f)]
    public float staticFriction = 0.5f;
    
    [ExposedParameter("Dynamic Friction", Category = "Physics Materials", Description = "Resistance while moving", Min = 0f, Max = 20f)]
    [Tooltip("Dynamic friction - resistance while moving")]
    [Range(0f, 20f)]
    public float dynamicFriction = 0.3f;
    
    [ExposedParameter("Bounciness",
        Category = "Physics Materials",
        Description = "How much items bounce when they collide. 0 = no bounce, 1 = perfect bounce.",
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Tooltip("Physics material bounciness")]
    [Range(0f, 1f)]
    public float bounciness = 0.3f;
    
    [Tooltip("Shared physics material for item surfaces (updated globally)")]
    public PhysicsMaterial itemPhysicsMaterial;
    
    [Tooltip("Shared physics material for ground/surfaces (updated globally)")]
    public PhysicsMaterial groundPhysicsMaterial;
    
    [Header("Rigidbody Physics - All Items")]
    
    [ExposedParameter("Linear Drag",
        Category = "Rigidbody Physics",
        Description = "Air resistance for movement. Higher values make items slow down faster.",
        Min = 0f, Max = 10f, Step = 0.1f)]
    [Tooltip("Linear resistance - higher values slow movement")]
    [Range(0f, 10f)]
    public float rigidbodyDrag = 0.05f;
    
    [ExposedParameter("Angular Drag", 
        Category = "Rigidbody Physics",
        Description = "Rotational resistance. Higher values reduce spinning.",
        Min = 0f, Max = 20f, Step = 0.1f)]
    [Tooltip("Rotational resistance - higher values reduce spinning")]
    [Range(0f, 20f)]
    public float rigidbodyAngularDrag = 0.1f;
    
    [ExposedParameter("Sleep Threshold",
        Category = "Rigidbody Physics",
        Description = "Velocity below which items go to sleep to save performance.",
        Min = 0.01f, Max = 1f, Step = 0.01f, Unit = "m/s")]
    [Tooltip("Velocity threshold below which rigidbodies go to sleep")]
    [Range(0.01f, 1f)]
    public float rigidbodySleepThreshold = 0.05f;
    
    [ExposedParameter("Gravity Strength",
        Category = "Rigidbody Physics",
        Description = "Global gravity multiplier. Higher values make items fall faster.",
        Min = 0.1f, Max = 3f, Step = 0.1f)]
    [Tooltip("Global gravity strength multiplier")]
    [Range(0.1f, 3f)]
    public float gravityMultiplier = 1.2f;
    
    [ExposedParameter("Continuous Collision",
        Category = "Rigidbody Physics",
        Description = "Use precise collision detection for fast-moving objects. Disable for better performance.")]
    [Tooltip("Use continuous collision detection for fast-moving objects")]
    public bool rigidbodyUseContinuousDetection = true;
    
    [Header("Rotation Control")]
    
    [ExposedParameter("Freeze Rotation",
        Category = "Rotation Control",
        Description = "Completely prevent items from rotating. Good for a stable, organized look.")]
    [Tooltip("Force freeze rotation on all rigidbodies (overrides constraints)")]
    public bool freezeRotation = true;
    
    [Tooltip("Extreme angular drag to stop any residual rotation")]
    public float extremeAngularDrag = 1000f;
    
    [ExposedParameter("Max Angular Velocity",
        Category = "Rotation Control",
        Description = "Maximum rotation speed. Set to 0 to prevent all rotation.",
        Min = 0f, Max = 10f, Step = 0.1f, Unit = "rad/s")]
    [Tooltip("Maximum angular velocity for rigidbodies")]
    public float maxAngularVelocity = 0.0f;
    
    [Tooltip("Rotation constraints: 0=None, 1=FreezeRotationX, 2=FreezeRotationY, 4=FreezeRotationZ (combine with +)")]
    public int rotationConstraints = (int)(RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationY | RigidbodyConstraints.FreezeRotationZ);
    
    [Tooltip("Direct center of mass control for all rigidbodies")]
    public Vector3 centerOfMass = new Vector3(0, 0, 0);
    
    [Header("Center Force / Magnet Physics")]
    
    [ExposedParameter("Enable Center Force", 
        Category = "Center Force",
        Description = "Enable magnetic force that pulls items toward the center point.")]
    [Tooltip("Apply center force to books")]
    public bool enableCenterForce = true;
    
    [ExposedParameter("Constant Force Mode",
        Category = "Center Force",
        Description = "Use constant force regardless of distance (vs distance-based falloff).")]
    [Tooltip("Use constant force regardless of size or distance")]
    public bool useConstantCenterForce = false;
    
    [ExposedParameter("Center Force Strength", 
        Category = "Center Force",
        Description = "Maximum force in variable mode or constant force strength.",
        Min = 0f, Max = 1000f, Step = 1f, Unit = "N")]
    [Tooltip("Maximum force strength in variable mode")]
    [Range(0f, 500f)]
    public float centerForceMaxStrength = 200f;
    
    [ExposedParameter("Constant Force",
        Category = "Center Force",
        Description = "Force strength when using constant mode. Applied uniformly regardless of distance.",
        Min = 0f, Max = 1000f, Step = 1f, Unit = "N")]
    [Tooltip("Constant center force strength (when useConstantCenterForce = true)")]
    [Range(0f, 1000f)]
    public float constantCenterForce = 50f;
    
    [ExposedParameter("Center Force Min Floor",
        Category = "Center Force",
        Description = "Minimum force that extends to infinity. Prevents items from escaping completely.",
        Min = 0f, Max = 100f, Step = 0.1f, Unit = "N")]
    [Tooltip("Minimum center force that extends to infinity")]
    [Range(0f, 100f)]
    public float centerForceMinFloor = 5f;
    
    [ExposedParameter("Center Force Radius",
        Category = "Center Force", 
        Description = "Distance where force reaches minimum (in variable mode).",
        Min = 1f, Max = 200f, Step = 1f, Unit = "m")]
    [Tooltip("Maximum distance where force applies (variable mode)")]
    [Range(1f, 200f)]
    public float centerForceMaxDistance = 10f;
    
    [Tooltip("Center point for gravitational force")]
    public Vector3 centerPoint = new Vector3(0, 0, 0);
    
    [Tooltip("Manual offset to center point (X, Y, Z adjustment)")]
    public Vector3 manualCenterOffset = new Vector3(0, 0, 0);
    
    [Tooltip("Scale-based force multiplier - bigger books get MORE force")]
    public bool enableScaleBasedForce = true;
    
    [Tooltip("Minimum force multiplier for smallest books")]
    [Range(0.5f, 1f)]
    public float minForceMultiplier = 5.0f;
    
    [Tooltip("Maximum force multiplier for largest books")]
    [Range(1f, 5f)]
    public float maxForceMultiplier = 20.0f;
    
    [ExposedParameter("Min Scale for Force",
        Category = "Center Force",
        Description = "Items smaller than this scale ignore center force. Prevents tiny items from clustering.",
        Min = 0.1f, Max = 1f, Step = 0.01f)]
    [Tooltip("Minimum scale threshold - items smaller than this ignore center force")]
    [Range(0.1f, 1f)]
    public float centerForceMinScale = 0.8f;
    
    [ExposedParameter("Limit to Collection",
        Category = "Center Force",
        Description = "Only apply center force to items in the current collection.")]
    [Tooltip("Only apply physics to items in the current collection")]
    public bool limitToCurrentCollection = false;
    
    [ExposedParameter("Max Item Velocity",
        Category = "Physics Limits",
        Description = "Maximum speed limit for items. Prevents runaway physics.",
        Min = 1f, Max = 100f, Step = 1f, Unit = "m/s")]
    [Tooltip("Maximum velocity for any item")]
    [Range(1f, 100f)]
    public float maxItemVelocity = 30f;
    
    [Header("Search-Based Scaling Physics")]
    
    [ExposedParameter("Min Book Scale",
        Category = "Search Scaling",
        Description = "Smallest size for items when search relevance is low.",
        Min = 0.01f, Max = 1f, Step = 0.01f)]
    [Tooltip("Minimum scale for books (valley/pebble size)")]
    [Range(0.01f, 1f)]
    public float minBookScale = 0.2f;
    
    [ExposedParameter("Max Book Scale",
        Category = "Search Scaling",
        Description = "Largest size for items when search relevance is high.",
        Min = 1f, Max = 10f, Step = 0.1f)]
    [Tooltip("Maximum scale for books (mountain size)")]
    [Range(1f, 10f)]
    public float maxBookScale = 3.0f;
    
    [ExposedParameter("Neutral Scale",
        Category = "Search Scaling",
        Description = "Default size when no search is active.",
        Min = 0.1f, Max = 2f, Step = 0.01f)]
    [Tooltip("Base scale when no search is active")]
    [Range(0.1f, 2f)]
    public float neutralBookScale = 1.0f;
    
    [ExposedParameter("Scale Animation Speed",
        Category = "Search Scaling",
        Description = "How quickly items change size when search changes.",
        Min = 0.1f, Max = 10f, Step = 0.1f)]
    [Tooltip("Scaling animation speed (how fast books change size)")]
    [Range(0.1f, 10f)]
    public float scaleAnimationSpeed = 3.0f;
    
    [ExposedParameter("Curve Type",
        Category = "Search Scaling",
        Description = "Mathematical curve for mapping relevance to scale. Options: Sigmoid, PowerLaw, etc.")]
    [Tooltip("Curve type name for Bridge control")]
    public string curveTypeName = "Sigmoid";
    
    [ExposedParameter("Curve Intensity",
        Category = "Search Scaling",
        Description = "Controls how steep the scaling curve is. Higher = more dramatic differences.",
        Min = 0.1f, Max = 20f, Step = 0.1f)]
    [Tooltip("Curve intensity/steepness")]
    [Range(0.1f, 20f)]
    public float curveIntensity = 5f;
    
    [ExposedParameter("Curve Power",
        Category = "Search Scaling",
        Description = "Exponent for power-based curves. Higher = more extreme scaling.",
        Min = 0.1f, Max = 10f, Step = 0.1f)]
    [Tooltip("Power/exponential parameter")]
    [Range(0.1f, 10f)]
    public float curvePower = 2f;
    
    [ExposedParameter("Curve Alpha",
        Category = "Search Scaling",
        Description = "Shape parameter for distribution curves. Controls curve characteristics.",
        Min = 0.1f, Max = 5f, Step = 0.01f)]
    [Tooltip("Alpha/shape parameter")]
    [Range(0.1f, 5f)]
    public float curveAlpha = 1.16f;
    
    [Tooltip("Curve that maps relevance score (0-1) to scale multiplier")]
    public AnimationCurve scoreToScaleCurve = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);
    
    // ==========================================
    // SECTION 2: REMOTE CONTROLLER PARAMETERS
    // What navigator/selector users feel
    // ==========================================
    
    [Header("")]
    [Header("═══════════════════════════════════════")]
    [Header("REMOTE CONTROLLER PARAMETERS")]
    [Header("═══════════════════════════════════════")]
    
    [Header("Navigator Controller - Pan & Zoom")]
    
    [ExposedParameter("Navigator Pan Sensitivity",
        Category = "Navigator Controller",
        Description = "Scales pan movement from navigator. Higher = faster panning.",
        Min = 0.01f, Max = 1f, Step = 0.01f)]
    [Tooltip("Scales navigator pan delta based on zoom")]
    public float navigatorPanScaleFactor = 0.1f;
    
    [ExposedParameter("Navigator Zoom Sensitivity",
        Category = "Navigator Controller",
        Description = "Zoom speed from navigator input. Higher = faster zoom.",
        Min = 0.1f, Max = 5f, Step = 0.1f)]
    [Tooltip("Navigator zoom sensitivity")]
    public float navigatorZoomFactor = 1f;
    
    [ExposedParameter("Navigator Velocity Factor",
        Category = "Navigator Controller",
        Description = "Multiplier for velocity-based pan from navigator.",
        Min = 0.1f, Max = 5f, Step = 0.1f)]
    [Tooltip("Multiplier for PushCameraVelocity from navigator")]
    public float navigatorVelocityFactor = 1f;
    
    [Header("Item Interaction (All Inputs)")]
    
    [ExposedParameter("Tap Scale Multiplier",
        Category = "Item Interaction",
        Description = "Scale boost when tapping items (controllers, mouse, or spacebar).",
        Min = 0.8f, Max = 1.5f, Step = 0.01f)]
    [SerializeField, Tooltip("Scale multiplier for tap action via selector")]
    [Range(0.8f, 1.5f)]
    private float selectionTapScale = 1.1f;
    public float SelectionTapScale => selectionTapScale;
    
    [ExposedParameter("Selection Scale",
        Category = "Item Interaction", 
        Description = "Visual scale multiplier for selected items.",
        Min = 1f, Max = 2f, Step = 0.01f)]
    [SerializeField, Tooltip("Scale multiplier for selected items visual feedback")]
    [Range(1f, 2f)]
    private float selectionScale = 1.2f;
    public float SelectionScale => selectionScale;
    
    [ExposedParameter("Selection Nav Min Scale",
        Category = "Item Interaction",
        Description = "Minimum scale threshold for item selection navigation.",
        Min = 0.01f, Max = 1f, Step = 0.01f)]
    [SerializeField, Tooltip("Minimum scale threshold for item selection navigation")]
    [Range(0.01f, 1f)]
    private float selectionScaleMin = 0.1f;
    public float SelectionScaleMin => selectionScaleMin;
    
    [Header("Tilt Control (Mobile Controllers)")]
    
    [Tooltip("Tilt-based offset to center point (from controller input)")]
    public Vector3 centerOffset = new Vector3(0, 0, 0);
    
    [ExposedParameter("Tilt Sensitivity",
        Category = "Tilt Control",
        Description = "How strongly device tilt affects center point offset.",
        Min = 0f, Max = 50f, Step = 0.5f)]
    [Tooltip("How strongly tilt affects center position")]
    [Range(0f, 50f)]
    public float tiltSensitivity = 10f;
    
    [Header("Search Integration")]
    [Tooltip("Current search query from controllers")]
    public string searchString = "";
    
    // ==========================================
    // SECTION 3: UNITY LOCAL UI PARAMETERS
    // Desktop mouse/keyboard controls
    // ==========================================
    
    [Header("")]
    [Header("═══════════════════════════════════════")]
    [Header("UNITY LOCAL UI (Desktop Controls)")]
    [Header("═══════════════════════════════════════")]
    
    [Header("Core References")]
    public CameraController cameraController;
    
    [Header("Mouse Controls - Camera")]
    public bool invertDrag = false;
    
    [Tooltip("Velocity threshold below which camera stops on drag release - HIGHER = easier to stop")]
    public float cameraBaseVelocityThreshold = 2.0f; // INCREASED from 0.2f - much easier to stop!
    
    [Tooltip("Mouse drag velocity smoothing - LOWER = more responsive to sudden stops")]
    [Range(0.01f, 1f)]
    public float cameraVelocitySmoothingFactor = 0.05f; // REDUCED from 0.1f - more responsive
    
    [Tooltip("Velocity damping on mouse release - helps eliminate tiny drifts")]
    [Range(0f, 1f)]
    public float cameraReleaseVelocityDamping = 0.3f; // NEW - strong damping on release
    
    public float cameraFrictionFactor = 0.999f;
    public float cameraBounceFactor = 0.9f;
    
    [Header("Mouse Controls - Item Dragging")]
    
    [Tooltip("Enable mouse dragging of items")]
    public bool enableItemDragging = true;
    
    [Tooltip("Force strength for rubber band dragging")]
    [Range(10f, 1000f)]
    public float dragForceStrength = 400f;
    
    [Tooltip("Maximum distance for drag force")]
    [Range(1f, 50f)]
    public float dragMaxDistance = 15f;
    
    [Tooltip("Drag force damping")]
    [Range(0f, 20f)]
    public float dragDamping = 3f;
    
    [Tooltip("Mass multiplier when dragging")]
    [Range(1f, 50f)]
    public float dragMassMultiplier = 10f;
    
    [Tooltip("Default mass when not dragging")]
    [Range(0.1f, 10f)]
    public float defaultItemMass = 1f;
    
    [Tooltip("Mouse velocity multiplier")]
    [Range(0f, 10f)]
    public float mouseVelocityMultiplier = 1f;
    
    [Tooltip("Maximum velocity for dragged item")]
    [Range(1f, 100f)]
    public float dragMaxVelocity = 30f;
    
    [Tooltip("Velocity multiplier when throwing")]
    [Range(0f, 10f)]
    public float throwStrength = 3f;
    
    [Tooltip("Throw sensitivity multiplier")]
    [Range(0.5f, 5f)]
    public float throwSensitivity = 2f;
    
    [Header("Keyboard & Scroll Controls")]
    
    [Tooltip("Keyboard pan speed")]
    public float panSpeed = 10f;
    
    [Tooltip("Scroll wheel zoom sensitivity")]
    public float scrollWheelZoomFactor = 5f;
    
    [Tooltip("Keyboard zoom speed")]
    public float keyboardZoomFactor = 5f;
    
    [Tooltip("Trackpad pinch zoom sensitivity")]
    public float pinchZoomSensitivity = 0.04f;
    
    [Tooltip("Mouse wheel zoom sensitivity")]
    public float wheelZoomSensitivity = 0.008f;
    
    [Tooltip("Trackpad zoom sensitivity")]
    public float trackpadZoomSensitivity = 0.016f;
    
    [Header("Keyboard Physics Controls")]
    
    [ExposedParameter("Keyboard Nudge Force",
        Category = "Keyboard Physics",
        Description = "Impulse force when tapping Shift/CapsLock+Arrow keys.",
        Min = 1f, Max = 500f, Step = 1f, Unit = "N·s")]
    [Tooltip("Force strength for initial nudge (Shift/CapsLock+Arrow tap)")]
    [Range(1f, 500f)]
    public float selectionNudgeForce = 20f;
    public float SelectionNudgeForce => selectionNudgeForce;
    
    [ExposedParameter("Keyboard Thrust Force",
        Category = "Keyboard Physics",
        Description = "Continuous force when holding Shift/CapsLock+Arrow keys.",
        Min = 1f, Max = 500f, Step = 1f, Unit = "N")]
    [Tooltip("Continuous thrust force (Shift/CapsLock+Arrow hold)")]
    [Range(1f, 500f)]
    public float selectionThrustForce = 10f;
    public float SelectionThrustForce => selectionThrustForce;
    
    [Header("Camera Boundaries")]
    
    [ExposedParameter("Min Zoom",
        Category = "Camera Boundaries",
        Description = "Closest camera zoom (smallest orthographic size).",
        Min = 1f, Max = 50f, Step = 1f)]
    [Tooltip("Minimum orthographic size")]
    public float minZoom = 10f;
    
    [ExposedParameter("Max Zoom",
        Category = "Camera Boundaries",
        Description = "Farthest camera zoom (largest orthographic size).",
        Min = 10f, Max = 200f, Step = 1f)]
    [Tooltip("Maximum orthographic size")]
    public float maxZoom = 100f;
    
    public float minX = -12f;
    public float maxX = 12f;
    public float minZ = -12f;
    public float maxZ = 12f;
    
    [Header("UI Interaction")]
    
    [Tooltip("Layer mask for mouse hit detection")]
    public LayerMask itemLayer = -1;
    
    [Tooltip("Maximum distance for raycast selection")]
    [SerializeField]
    private float maxSelectionDistance = 200f;
    
    [SerializeField]
    private float selectMaxClickTime = 0.3f;
    
    // ==========================================
    // PRIVATE FIELDS AND STATE
    // ==========================================
    
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
    
    // Velocity filtering for more consistent throwing
    private class VelocitySample
    {
        public Vector3 position;
        public float time;
        public VelocitySample(Vector3 pos, float t) { position = pos; time = t; }
    }
    private List<VelocitySample> velocityBuffer = new List<VelocitySample>();
    private const int VELOCITY_BUFFER_SIZE = 10; // Keep last N samples
    private const float VELOCITY_SAMPLE_WINDOW = 0.1f; // Use samples from last 100ms

    private float lastLoggedStatic = -1f;
    private float lastLoggedDynamic = -1f;
    
    // Thrust tracking for Shift/CapsLock+Arrow keys
    private Dictionary<KeyCode, Vector3> thrustDirections = new Dictionary<KeyCode, Vector3>
    {
        { KeyCode.LeftArrow, Vector3.left },
        { KeyCode.RightArrow, Vector3.right },
        { KeyCode.UpArrow, Vector3.forward },
        { KeyCode.DownArrow, Vector3.back }
    };
    private HashSet<KeyCode> activeThrustKeys = new HashSet<KeyCode>();
    private string thrustingItemId = null; // Track which item is being thrust to exclude from center force
    
    // Track Caps Lock toggle state since Unity doesn't provide direct access
    private bool capsLockToggled = false;

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
        
        // Check if shared materials are assigned
        if (itemPhysicsMaterial == null)
        {
            Debug.LogError("[Physics Init] CRITICAL: itemPhysicsMaterial is NOT assigned in InputManager!");
        }
        else
        {
            Debug.Log($"[Physics Init] itemPhysicsMaterial assigned. Initial values: static={itemPhysicsMaterial.staticFriction}, dynamic={itemPhysicsMaterial.dynamicFriction}, bounce={itemPhysicsMaterial.bounciness}");
        }
        
        if (groundPhysicsMaterial == null)
        {
            Debug.LogError("[Physics Init] CRITICAL: groundPhysicsMaterial is NOT assigned in InputManager!");
        }
        else
        {
            Debug.Log($"[Physics Init] groundPhysicsMaterial assigned. Initial values: static={groundPhysicsMaterial.staticFriction}, dynamic={groundPhysicsMaterial.dynamicFriction}, bounce={groundPhysicsMaterial.bounciness}");
        }
        
        // Initialize physics settings on all existing ItemViews
        UpdatePhysicsMaterials(); // This will set the initial values
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
        
        // Update shared physics material properties EVERY FRAME
        // This is the ONLY place we need to update - the materials are SHARED!
        if (itemPhysicsMaterial != null)
        {
            // Log only when values actually change
            if (itemPhysicsMaterial.staticFriction != staticFriction || itemPhysicsMaterial.dynamicFriction != dynamicFriction)
            {
                if (staticFriction != lastLoggedStatic || dynamicFriction != lastLoggedDynamic)
                {
                    Debug.Log($"[Physics] Updating shared material: static {itemPhysicsMaterial.staticFriction} → {staticFriction}, dynamic {itemPhysicsMaterial.dynamicFriction} → {dynamicFriction}");
                    lastLoggedStatic = staticFriction;
                    lastLoggedDynamic = dynamicFriction;
                }
            }
            
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

    private void FixedUpdate()
    {
        // Apply physics forces in FixedUpdate for proper physics integration
        if (enableCenterForce)
        {
            ApplyCenterForce();
        }
        
        // Apply continuous thrust forces for held Shift/CapsLock+Arrow keys
        ApplyContinuousThrust();
        
        // Debug: Log active thrust keys every 30 frames
        if (activeThrustKeys.Count > 0 && Time.frameCount % 30 == 0)
        {
            string keysStr = string.Join(", ", activeThrustKeys);
            Debug.Log($"[FixedUpdate] Active thrust keys: [{keysStr}] | Frame: {Time.frameCount}");
        }
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
            // Get item under mouse RIGHT NOW (not from hoveredItem which might be stale)
            ItemView clickedItem = GetItemUnderMouse();
            Debug.Log($"[LEFT MOUSE] Processing left click - clickedItem: {(clickedItem?.name ?? "null")}");
            
            if (clickedItem != null)
            {
                dragStartPosition = Input.mousePosition;
                dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
                lastDragTime = Time.realtimeSinceStartup;
                itemAtDragStart = clickedItem;
                
                // Check if item is already selected to decide action
                string itemId = clickedItem.Model?.Id;
                if (!string.IsNullOrEmpty(itemId))
                {
                    if (spaceCraft.SelectedItemIds.Contains(itemId))
                    {
                        // Item is already selected - apply tap scale IMMEDIATELY
                        Debug.Log($"[LEFT MOUSE] Item already selected, applying tap scale: {clickedItem.name}");
                        float tapScale = selectionTapScale;
                        float newScale = clickedItem.CurrentScale * tapScale;
                        Debug.Log($"[LEFT MOUSE] Applying tap scale {tapScale} to clicked item. Current: {clickedItem.CurrentScale} → New: {newScale}");
                        clickedItem.SetCurrentScale(newScale);
                    }
                    else
                    {
                        // Item is not selected - select it IMMEDIATELY
                        Debug.Log($"[LEFT MOUSE] Selecting item: {clickedItem.name}");
                        spaceCraft.SelectItem("mouse_input", "Local Mouse", itemId);
                    }
                }
                
                // Start item dragging if enabled
                if (enableItemDragging && clickedItem.GetComponent<Rigidbody>() != null)
                {
                    Debug.Log($"[LEFT MOUSE] Starting item drag on {clickedItem.name}");
                    StartItemDrag(clickedItem, Input.mousePosition);
                }
            }
            else
            {
                Debug.Log($"[LEFT MOUSE] No item under cursor - starting camera pan");
                // Start camera dragging (same as right mouse)
                isDragging = true;
                previousMousePosition = Input.mousePosition;
                dragStartPosition = Input.mousePosition;
                dragStartWorldPos = GetWorldPositionAtScreenPoint(Input.mousePosition);
                lastDragTime = Time.realtimeSinceStartup;
                physicsEnabled = false;
                cameraVelocity = Vector3.zero;
            }
        }
        else if (Input.GetMouseButtonUp(0))
        {
            Debug.Log($"[LEFT MOUSE] Left button up - isDraggingItem: {isDraggingItem}, isDragging: {isDragging}, itemAtDragStart: {(itemAtDragStart?.name ?? "null")}");
            
            // Handle item drag end
            if (isDraggingItem)
            {
                Debug.Log($"[LEFT MOUSE] Ending item drag");
                EndItemDrag();
            }
            else if (isDragging)
            {
                // Handle camera drag end (same as right mouse)
                Debug.Log($"[LEFT MOUSE] Ending camera drag with velocity: {filteredVelocity.magnitude:F3}");
                isDragging = false;
                
                if (filteredVelocity.magnitude > GetScaledVelocityThreshold())
                {
                    // Apply release damping to reduce tiny unwanted drifts
                    Vector3 dampedVelocity = filteredVelocity * cameraReleaseVelocityDamping;
                    
                    // Double-check threshold after damping - prevents micro-drifts
                    if (dampedVelocity.magnitude > GetScaledVelocityThreshold() * 0.5f) // Lower threshold for damped velocity
                    {
                        cameraVelocity = dampedVelocity;
                        physicsEnabled = true;
                        Debug.Log($"[LEFT MOUSE] Physics enabled: original={filteredVelocity.magnitude:F3}, damped={dampedVelocity.magnitude:F3}");
                    }
                    else
                    {
                        // Velocity too small even after damping - force stop
                        cameraVelocity = Vector3.zero;
                        physicsEnabled = false;
                        Debug.Log($"[LEFT MOUSE] Forced stop: damped velocity too small");
                    }
                }
                else
                {
                    // Below threshold - clean stop
                    cameraVelocity = Vector3.zero;
                    physicsEnabled = false;
                    Debug.Log($"[LEFT MOUSE] Clean stop: velocity below threshold");
                }
            }
            else if (itemAtDragStart != null)
            {
                // Selection/tap already handled on mouse down
                Debug.Log($"[LEFT MOUSE] Click released on item (selection/tap was already handled on mouse down)");
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
                    Vector3 dampedVelocity = filteredVelocity * cameraReleaseVelocityDamping;
                    
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
        
        // Active Camera Dragging - Can happen with either LEFT (on empty space) or RIGHT mouse button
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
        HandleKeyboardInput();
        HandleMouseZoom(Input.GetAxis("Mouse ScrollWheel"));
        HandleKeyboardZoom();
        
        // Physics
        if (physicsEnabled)
        {
            ApplyPhysics();
        }
        
        // Center force is now applied in FixedUpdate() for proper physics integration
    }

    // --- Internal Input Handling Methods ---

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
        MoveCameraRig(worldDelta); 

        // Update velocity tracking for potential physics release
        Vector3 instantVelocity = worldDelta / deltaTime;
        filteredVelocity = Vector3.Lerp(filteredVelocity, instantVelocity, cameraVelocitySmoothingFactor);
        
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
        
        // Clear velocity buffer for fresh start
        velocityBuffer.Clear();
        mouseVelocity = Vector3.zero;
        
        // Set up item drag state
        isDraggingItem = true;
        draggedItem = item;
        draggedRigidbody = rb;
        dragStartItemPosition = itemWorldPos;
        
        // Don't lock highlight on dragged item - it interferes with selection visuals
        // item.SetHighlighted(true); // REMOVED - let normal highlight/selection system work
        
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
        float currentTime = Time.realtimeSinceStartup;
        
        // Add to velocity buffer
        velocityBuffer.Add(new VelocitySample(mouseWorldPos, currentTime));
        
        // Keep buffer size limited
        while (velocityBuffer.Count > VELOCITY_BUFFER_SIZE)
        {
            velocityBuffer.RemoveAt(0);
        }
        
        // Calculate filtered velocity using recent samples
        mouseVelocity = CalculateFilteredVelocity(currentTime);
        
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
            // Calculate final filtered velocity for more consistent throws
            Vector3 finalVelocity = CalculateFilteredVelocity(Time.realtimeSinceStartup);
            
            // Apply throw velocity based on filtered mouse movement with sensitivity boost
            Vector3 throwVelocity = finalVelocity * throwStrength * throwSensitivity;
            
            // Clamp the throw velocity to prevent extreme speeds
            if (throwVelocity.magnitude > dragMaxVelocity)
            {
                throwVelocity = throwVelocity.normalized * dragMaxVelocity;
            }
            
            // Apply the throw velocity to the rigidbody (already clamped by dragMaxVelocity)
            draggedRigidbody.linearVelocity = throwVelocity;
            
            // Double-check against global max velocity limit
            if (draggedRigidbody.linearVelocity.magnitude > maxItemVelocity)
            {
                draggedRigidbody.linearVelocity = draggedRigidbody.linearVelocity.normalized * maxItemVelocity;
            }
            
            // RESTORE NORMAL WEIGHT: Return to lightweight physics
            draggedRigidbody.mass = originalMass;
            Debug.Log($"[ItemDrag] Ended HEAVY dragging {draggedItem.name} - restored mass: {draggedRigidbody.mass:F1}, throw velocity: {throwVelocity.magnitude:F2}, filtered from {velocityBuffer.Count} samples");
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
        velocityBuffer.Clear(); // Clear velocity buffer
        
        // Don't need to unlock highlight since we're not locking it anymore
        // if (draggedItemRef != null)
        // {
        //     draggedItemRef.SetHighlighted(false);
        // }
        
        // Re-enable physics
        physicsEnabled = true;
    }
    
    /// <summary>
    /// Calculate filtered velocity from recent mouse position samples
    /// This provides more consistent throwing behavior across different frame rates
    /// </summary>
    private Vector3 CalculateFilteredVelocity(float currentTime)
    {
        if (velocityBuffer.Count < 2) return Vector3.zero;
        
        // Find samples within the time window
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
            // Not enough recent samples, use last two available
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
        
        // Calculate weighted average velocity
        // More recent samples get higher weight
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
                
                // Weight based on how recent the sample is (newer = higher weight)
                float age = currentTime - current.time;
                float weight = Mathf.Exp(-age / VELOCITY_SAMPLE_WINDOW * 2f); // Exponential decay
                
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

    private void HandleKeyboardInput()
    {
        // Track Caps Lock toggle state
        bool capsLockJustToggled = false;
        if (Input.GetKeyDown(KeyCode.CapsLock))
        {
            capsLockToggled = !capsLockToggled;
            capsLockJustToggled = true;
            Debug.Log($"[Keyboard] Caps Lock toggled: {(capsLockToggled ? "ON" : "OFF")}");
        }
        
        // Check if Shift is held
        bool isShiftHeld = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        
        // Determine if we should thrust based on Shift and Caps Lock states
        // Normal (Caps Lock OFF): Shift = thrust, No Shift = selection
        // With Caps Lock ON: No Shift = thrust, Shift = selection (inverted)
        bool shouldThrust = capsLockToggled ? !isShiftHeld : isShiftHeld;
        
        // Check if Shift was JUST pressed (for adding already-held keys)
        bool shiftJustPressed = (Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift));
        
        // If we just entered thrust mode, check all arrow keys that are currently held
        // This happens when:
        // - Shift was just pressed (and Caps Lock is OFF)
        // - Shift was just released (and Caps Lock is ON) 
        // - Caps Lock was just toggled (and the new thrust condition is met)
        bool justEnteredThrustMode = (shiftJustPressed && !capsLockToggled) || 
                                     (!isShiftHeld && capsLockToggled && (Input.GetKeyUp(KeyCode.LeftShift) || Input.GetKeyUp(KeyCode.RightShift))) ||
                                     (capsLockJustToggled && shouldThrust);
        
        if (justEnteredThrustMode)
        {
            foreach (var kvp in thrustDirections)
            {
                KeyCode key = kvp.Key;
                Vector3 direction = kvp.Value;
                
                // If this arrow key is currently held and not already tracked
                if (Input.GetKey(key) && !activeThrustKeys.Contains(key))
                {
                    Debug.Log($"[Keyboard] Entering thrust mode with {key} already held - starting thrust");
                    // Don't apply nudge here since the key was already down
                    activeThrustKeys.Add(key);
                }
            }
        }
        
        // Handle arrow keys for selection navigation OR nudging/thrusting
        foreach (var kvp in thrustDirections)
        {
            KeyCode key = kvp.Key;
            Vector3 direction = kvp.Value;
            
            if (Input.GetKeyDown(key))
            {
                if (shouldThrust)
                {
                    // Apply initial nudge AND start tracking for thrust
                    Debug.Log($"[Keyboard] {(capsLockToggled ? "CapsLock Mode" : "Shift")}+{key} down - nudge {direction} and start thrust");
                    ApplyNudgeToSelectedItem(direction);
                    activeThrustKeys.Add(key);
                }
                else
                {
                    // Normal selection movement
                    string dirName = key == KeyCode.LeftArrow ? "west" : 
                                   key == KeyCode.RightArrow ? "east" : 
                                   key == KeyCode.UpArrow ? "north" : "south";
                    Debug.Log($"[Keyboard] {key} - move selection {dirName}");
                    spaceCraft.MoveSelection("keyboard_input", "Keyboard", "main", dirName);
                }
            }
            else if (Input.GetKeyUp(key))
            {
                // Stop thrusting when key is released
                if (activeThrustKeys.Contains(key))
                {
                    Debug.Log($"[Keyboard] {(capsLockToggled ? "CapsLock Mode" : "Shift")}+{key} up - stop thrust");
                    activeThrustKeys.Remove(key);
                    
                    // If no more thrust keys are active, clear the thrusting item
                    if (activeThrustKeys.Count == 0)
                    {
                        thrustingItemId = null;
                    }
                }
            }
        }
        
        // Clean up thrust keys if we exit thrust mode
        if (!shouldThrust && activeThrustKeys.Count > 0)
        {
            Debug.Log($"[Keyboard] Exiting thrust mode (CapsLock: {capsLockToggled}) - stopping all thrust");
            activeThrustKeys.Clear();
            thrustingItemId = null; // Clear thrusting item
        }
        
        // Handle space key for tap (scale selected item)
        if (Input.GetKeyDown(KeyCode.Space))
        {
            Debug.Log("[Keyboard] Space - tap action");
            
            // If we have a selected item, apply tap scale to it
            if (spaceCraft.SelectedItemIds.Count > 0)
            {
                string selectedId = spaceCraft.SelectedItemIds[0];
                ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
                
                if (selectedItem != null)
                {
                    float tapScale = selectionTapScale;
                    float newScale = selectedItem.CurrentScale * tapScale;
                    Debug.Log($"[Keyboard] Applying tap scale {tapScale} to selected item {selectedId}. Current: {selectedItem.CurrentScale} → New: {newScale}");
                    selectedItem.SetCurrentScale(newScale);
                }
            }
            else
            {
                Debug.Log("[Keyboard] No item selected for tap action");
            }
        }
        
        // Handle WASD for camera panning
        Vector3 moveDirectionDelta = Vector3.zero;
        if (Input.GetKey(KeyCode.A)) moveDirectionDelta.x -= 1;
        if (Input.GetKey(KeyCode.D)) moveDirectionDelta.x += 1;
        if (Input.GetKey(KeyCode.W)) moveDirectionDelta.z += 1;
        if (Input.GetKey(KeyCode.S)) moveDirectionDelta.z -= 1;

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

    /// <summary>
    /// Apply a nudge force to the currently selected item in the specified direction
    /// </summary>
    private void ApplyNudgeToSelectedItem(Vector3 direction)
    {
        // Check if we have a selected item
        if (spaceCraft.SelectedItemIds.Count == 0)
        {
            Debug.Log("[Nudge] No item selected to nudge");
            return;
        }
        
        // Get the first selected item
        string selectedId = spaceCraft.SelectedItemIds[0];
        ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
        
        if (selectedItem == null)
        {
            Debug.Log($"[Nudge] Could not find ItemView for selected item {selectedId}");
            return;
        }
        
        // Get the rigidbody
        Rigidbody rb = selectedItem.GetComponent<Rigidbody>();
        if (rb == null)
        {
            Debug.Log($"[Nudge] Selected item {selectedItem.name} has no Rigidbody");
            return;
        }
        
        // Wake up the rigidbody if it's sleeping
        if (rb.IsSleeping())
        {
            rb.WakeUp();
        }
        
        // Apply the nudge force as an impulse
        Vector3 forceVector = direction.normalized * selectionNudgeForce;
        rb.AddForce(forceVector, ForceMode.Impulse);
        
        Debug.Log($"[Nudge] Applied impulse {forceVector} to {selectedItem.name} (force: {selectionNudgeForce})");
        
        // Enforce maximum velocity limit immediately after nudge
        if (rb.linearVelocity.magnitude > maxItemVelocity)
        {
            rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
            Debug.Log($"[Nudge] Velocity clamped to max: {maxItemVelocity}");
        }
    }
    
    /// <summary>
    /// Apply continuous thrust force to the selected item for all active thrust keys
    /// Called from FixedUpdate for proper physics integration
    /// </summary>
    private void ApplyContinuousThrust()
    {
        // No active thrust keys? Nothing to do
        if (activeThrustKeys.Count == 0) return;
        
        // Debug log entry
        if (Time.frameCount % 15 == 0) // Every 15 frames
        {
            Debug.Log($"[Thrust] ApplyContinuousThrust ENTERED - Keys: {activeThrustKeys.Count}");
        }
        
        // Check if we have a selected item
        if (spaceCraft.SelectedItemIds.Count == 0) 
        {
            if (Time.frameCount % 60 == 0) Debug.Log("[Thrust] No selected item - aborting thrust");
            return;
        }
        
        // Get the first selected item
        string selectedId = spaceCraft.SelectedItemIds[0];
        ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
        
        if (selectedItem == null) 
        {
            if (Time.frameCount % 60 == 0) Debug.Log($"[Thrust] Could not find ItemView for {selectedId}");
            return;
        }
        
        // Track this item as being thrust (to exclude from center force)
        thrustingItemId = selectedId;
        
        // Get the rigidbody
        Rigidbody rb = selectedItem.GetComponent<Rigidbody>();
        if (rb == null) 
        {
            if (Time.frameCount % 60 == 0) Debug.Log($"[Thrust] No rigidbody on {selectedItem.name}");
            return;
        }
        
        // Calculate combined thrust direction from all active keys
        Vector3 combinedThrust = Vector3.zero;
        foreach (KeyCode key in activeThrustKeys)
        {
            if (thrustDirections.ContainsKey(key))
            {
                combinedThrust += thrustDirections[key];
            }
        }
        
        // Normalize if multiple keys (for consistent diagonal thrust)
        if (combinedThrust.magnitude > 1f)
        {
            combinedThrust = combinedThrust.normalized;
        }
        
        // Apply continuous thrust force (not impulse!)
        if (combinedThrust.magnitude > 0.01f)
        {
            Vector3 thrustForce = combinedThrust * selectionThrustForce;
            
            // Log BEFORE applying force
            if (Time.frameCount % 5 == 0) // Very frequent logging
            {
                Debug.Log($"[Thrust] PRE-FORCE: rb.velocity={rb.linearVelocity.magnitude:F3} | Applying force: {thrustForce.magnitude:F1}");
            }
            
            rb.AddForce(thrustForce, ForceMode.Force);
            
            // Keep item awake while thrusting
            if (rb.IsSleeping())
            {
                rb.WakeUp();
                Debug.Log($"[Thrust] Woke up sleeping rigidbody!");
            }
            
            // Log AFTER applying force
            if (Time.frameCount % 5 == 0) // Very frequent logging
            {
                string activeKeysStr = string.Join(", ", activeThrustKeys);
                Debug.Log($"[Thrust] POST-FORCE: {thrustForce} to {selectedItem.name} | Keys: [{activeKeysStr}] | Vel: {rb.linearVelocity.magnitude:F3} | Drag: {rb.linearDamping} | Mass: {rb.mass}");
            }
            
            // Enforce maximum velocity limit
            if (rb.linearVelocity.magnitude > maxItemVelocity)
            {
                rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
                if (Time.frameCount % 30 == 0) Debug.Log($"[Thrust] Velocity clamped to max: {maxItemVelocity}");
            }
        }
        else
        {
            Debug.LogWarning($"[Thrust] Combined thrust too small: {combinedThrust.magnitude}");
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
        if (Input.GetKey(KeyCode.Q)) keyboardZoomDelta -= 1f; // Q = Zoom Out (+) Ortho Size
        if (Input.GetKey(KeyCode.E)) keyboardZoomDelta += 1f; // E = Zoom In (-) Ortho Size
        
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
            case "centerForceMaxStrength":
                centerForceMaxStrength = Mathf.Clamp(value, 0f, 500f);
                break;
            case "centerForceMaxDistance":
                centerForceMaxDistance = Mathf.Clamp(value, 1f, 200f);
                break;
            case "constantCenterForce":
                constantCenterForce = Mathf.Clamp(value, 0f, 1000f);
                break;
            case "useConstantCenterForce":
                useConstantCenterForce = value > 0.5f;
                break;
            case "enableCenterForce":
                enableCenterForce = value > 0.5f;
                break;
            case "enableScaleBasedForce":
                enableScaleBasedForce = value > 0.5f;
                break;
            case "minForceMultiplier":
                minForceMultiplier = Mathf.Clamp(value, 0.1f, 10f);
                break;
            case "maxForceMultiplier":
                maxForceMultiplier = Mathf.Clamp(value, 1f, 20f);
                break;
            case "centerForceMinScale":
                centerForceMinScale = Mathf.Clamp(value, 0.1f, 2f);
                break;
            case "tiltSensitivity":
                tiltSensitivity = Mathf.Clamp(value, 0f, 50f);
                break;
            case "staticFriction":
                staticFriction = Mathf.Clamp(value, 0f, 20f);
                // Don't call UpdatePhysicsMaterials - Update() does it every frame
                break;
            case "dynamicFriction":
                dynamicFriction = Mathf.Clamp(value, 0f, 20f);
                // Don't call UpdatePhysicsMaterials - Update() does it every frame
                break;
            case "bounciness":
                bounciness = Mathf.Clamp(value, 0f, 1f);
                // Don't call UpdatePhysicsMaterials - Update() does it every frame
                break;
            case "gravityMultiplier":
                gravityMultiplier = Mathf.Clamp(value, 0.1f, 3f);
                Physics.gravity = new Vector3(0, -9.81f * gravityMultiplier, 0);
                break;
            case "rigidbodyDrag":
                rigidbodyDrag = Mathf.Clamp(value, 0f, 10f);
                UpdateRigidbodySettings();
                break;
            case "rigidbodyAngularDrag":
                rigidbodyAngularDrag = Mathf.Clamp(value, 0f, 20f);
                UpdateRigidbodySettings();
                break;
            case "rigidbodySleepThreshold":
                rigidbodySleepThreshold = Mathf.Clamp(value, 0.01f, 1f);
                UpdateRigidbodySettings();
                break;
            case "selectionTapScale":
                selectionTapScale = Mathf.Clamp(value, 0.5f, 2f);
                break;
            case "throwStrength":
                throwStrength = Mathf.Clamp(value, 0f, 50f);
                break;
            case "throwSensitivity":
                throwSensitivity = Mathf.Clamp(value, 0.5f, 5f);
                break;
            case "selectionNudgeForce":
                selectionNudgeForce = Mathf.Clamp(value, 1f, 100f);
                break;
            case "selectionThrustForce":
                selectionThrustForce = Mathf.Clamp(value, 1f, 50f);
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
        
        cameraVelocity *= cameraFrictionFactor;
        Vector3 positionDelta = cameraVelocity * Time.deltaTime;
        
        Vector3 currentPosition = cameraController.cameraRig.position;
        Vector3 targetPosition = currentPosition + positionDelta;
        
        // bool bounced = false; // Unused variable
        // Check boundaries and bounce
        if (targetPosition.x < minX || targetPosition.x > maxX)
        {
            targetPosition.x = Mathf.Clamp(targetPosition.x, minX, maxX);
            cameraVelocity.x *= -cameraBounceFactor;
            // bounced = true;
        }
        if (targetPosition.z < minZ || targetPosition.z > maxZ)
        {
            targetPosition.z = Mathf.Clamp(targetPosition.z, minZ, maxZ);
            cameraVelocity.z *= -cameraBounceFactor;
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
    
    /// <summary>
    /// Get the item directly under the mouse cursor using raycasting
    /// </summary>
    private ItemView GetItemUnderMouse()
    {
        Ray ray = _mainCamera.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;
        
        if (Physics.Raycast(ray, out hit, maxSelectionDistance, itemLayer))
        {
            ItemView itemView = hit.collider.GetComponentInParent<ItemView>();
            if (itemView != null)
            {
                Debug.Log($"[GetItemUnderMouse] Found item: {itemView.name}");
                return itemView;
            }
        }
        
        return null;
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
    
    private Vector3 GetWorldPositionAtScreenCenter()
    {
        return GetWorldPositionAtScreenPoint(new Vector3(_mainCamera.pixelWidth / 2f, _mainCamera.pixelHeight / 2f, 0));
    }
    
    private float GetScaledVelocityThreshold()
    {
        // Scale threshold based on zoom - but limit the scaling to prevent tiny thresholds
        float zoomScale = Mathf.Clamp(_mainCamera.orthographicSize / 10f, 0.5f, 2.0f); // Limit zoom effect
        return cameraBaseVelocityThreshold * zoomScale;
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
    /// Properly integrates with Unity physics to overcome static friction
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
        int sleepingBodies = 0;
        
        foreach (var itemView in allItemViews)
        {
            if (itemView?.GetComponent<Rigidbody>() == null) continue;
            
            // Skip the item that's currently being thrust
            if (!string.IsNullOrEmpty(thrustingItemId) && itemView.Model?.Id == thrustingItemId)
            {
                continue; // Don't apply center force to thrusting item
            }
            
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
            
            // Skip if too close to avoid jitter
            if (distanceToCenter < 0.01f) continue;
            
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
                // CONSTANT FORCE - same strength regardless of distance
                centerForce = toCenter.normalized * constantCenterForce * scaleBasedMultiplier;
            }
            else
            {
                // Variable force system with minimum floor
                float forceStrength;
                
                if (distanceToCenter < centerForceMaxDistance)
                {
                    // Within radius: Linear falloff from max to min
                    float distanceRatio = distanceToCenter / centerForceMaxDistance;
                    float variableStrength = centerForceMaxStrength * (1f - distanceRatio);
                    
                    // Ensure we don't go below the minimum floor
                    forceStrength = Mathf.Max(variableStrength, centerForceMinFloor);
                }
                else
                {
                    // Beyond radius: Apply minimum floor force that extends to infinity
                    forceStrength = centerForceMinFloor;
                }
                
                forceStrength *= scaleBasedMultiplier; // Apply scale-based adjustment
                centerForce = toCenter.normalized * forceStrength;
            }
            
            // Calculate minimum force needed to overcome static friction
            // Force to overcome static friction = mass * gravity * staticFriction * safety factor
            float gravityMagnitude = Mathf.Abs(Physics.gravity.y) * gravityMultiplier;
            float minForceToMove = rb.mass * gravityMagnitude * staticFriction * 1.1f; // 10% safety margin
            
            // Check if the rigidbody is sleeping (not moving)
            bool isEffectivelyStopped = rb.linearVelocity.magnitude < rigidbodySleepThreshold;
            
            // If stopped and force is too weak to overcome friction, boost it
            if (isEffectivelyStopped && centerForce.magnitude > 0.01f && centerForce.magnitude < minForceToMove)
            {
                // Boost force to just overcome static friction
                centerForce = centerForce.normalized * minForceToMove;
                
                // Wake up the rigidbody if it's sleeping
                if (rb.IsSleeping())
                {
                    rb.WakeUp();
                    sleepingBodies++;
                }
            }
            
            // Apply force only if it's meaningful
            if (centerForce.magnitude > 0.01f)
            {
                // Use ForceMode.Force for smooth, mass-dependent acceleration
                rb.AddForce(centerForce, ForceMode.Force);
                forcesApplied++;
                
                // For very light forces on stationary objects, give a tiny velocity nudge
                // This helps overcome the static friction "sticking" effect
                if (isEffectivelyStopped && centerForce.magnitude < minForceToMove * 2f)
                {
                    Vector3 nudgeVelocity = centerForce.normalized * 0.01f; // Tiny nudge
                    rb.linearVelocity += nudgeVelocity;
                }
            }
            
            // Enforce maximum velocity limit to prevent runaway physics
            if (rb.linearVelocity.magnitude > maxItemVelocity)
            {
                rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
            }
        }
        
        // Debug logging (only occasionally)
        if (Time.frameCount % 300 == 0 && forcesApplied > 0) // Every 5 seconds at 60fps
        {
            Debug.Log($"[CenterForce] Applied to {forcesApplied} items, {sleepingBodies} woken, {kinematicBodies} kinematic skipped");
        }
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
    /// Updates both shared materials and applies them to all colliders (including box colliders)
    /// </summary>
    private void UpdatePhysicsMaterials()
    {
        // Just update the shared material values - that's ALL we need!
        if (itemPhysicsMaterial != null)
        {
            itemPhysicsMaterial.staticFriction = staticFriction;
            itemPhysicsMaterial.dynamicFriction = dynamicFriction;
            itemPhysicsMaterial.bounciness = bounciness;
            itemPhysicsMaterial.frictionCombine = PhysicsMaterialCombine.Average;
            itemPhysicsMaterial.bounceCombine = PhysicsMaterialCombine.Average;
        }
        
        if (groundPhysicsMaterial != null)
        {
            groundPhysicsMaterial.staticFriction = staticFriction;
            groundPhysicsMaterial.dynamicFriction = dynamicFriction;
            groundPhysicsMaterial.bounciness = bounciness;
            groundPhysicsMaterial.frictionCombine = PhysicsMaterialCombine.Average;
            groundPhysicsMaterial.bounceCombine = PhysicsMaterialCombine.Average;
        }
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
                
                // Enforce velocity limit
                if (rb.linearVelocity.magnitude > maxItemVelocity)
                {
                    rb.linearVelocity = rb.linearVelocity.normalized * maxItemVelocity;
                }
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

    [ContextMenu("Debug Physics State")]
    public void DebugPhysicsState()
    {
        Debug.Log("=== PHYSICS STATE DEBUG ===");
        Debug.Log($"Static Friction: {staticFriction}");
        Debug.Log($"Dynamic Friction: {dynamicFriction}");
        Debug.Log($"Bounciness: {bounciness}");
        Debug.Log($"Gravity Multiplier: {gravityMultiplier}");
        Debug.Log($"Current Gravity: {Physics.gravity}");
        
        if (itemPhysicsMaterial != null)
        {
            Debug.Log($"Item Material - Static: {itemPhysicsMaterial.staticFriction}, Dynamic: {itemPhysicsMaterial.dynamicFriction}, Bounce: {itemPhysicsMaterial.bounciness}");
            Debug.Log($"Item Material - Friction Combine: {itemPhysicsMaterial.frictionCombine}, Bounce Combine: {itemPhysicsMaterial.bounceCombine}");
        }
        else
        {
            Debug.LogError("Item Physics Material is NULL!");
        }
        
        if (groundPhysicsMaterial != null)
        {
            Debug.Log($"Ground Material - Static: {groundPhysicsMaterial.staticFriction}, Dynamic: {groundPhysicsMaterial.dynamicFriction}, Bounce: {groundPhysicsMaterial.bounciness}");
        }
        else
        {
            Debug.LogError("Ground Physics Material is NULL!");
        }
        
        // Check a few items
        List<ItemView> items = GetAllItemViews();
        Debug.Log($"Total ItemViews in scene: {items.Count}");
        
        int sampleCount = Mathf.Min(3, items.Count);
        for (int i = 0; i < sampleCount; i++)
        {
            ItemView item = items[i];
            if (item == null) continue;
            
            Rigidbody rb = item.GetComponent<Rigidbody>();
            if (rb != null)
            {
                Debug.Log($"Item '{item.name}': isKinematic={rb.isKinematic}, mass={rb.mass}, drag={rb.linearDamping}, angularDrag={rb.angularDamping}");
                
                Collider[] colliders = item.GetComponentsInChildren<Collider>();
                foreach (var col in colliders)
                {
                    if (col != null && !col.isTrigger && col.material != null)
                    {
                        bool isShared = (col.material == itemPhysicsMaterial || col.material == groundPhysicsMaterial);
                        Debug.Log($"  - Collider '{col.name}': Material friction (static={col.material.staticFriction}, dynamic={col.material.dynamicFriction}) SHARED={isShared}");
                        
                        if (!isShared)
                        {
                            Debug.LogWarning($"    WARNING: This collider is NOT using the shared material!");
                        }
                    }
                }
            }
        }
        
        Debug.Log("=== END PHYSICS DEBUG ===");
    }

    [ContextMenu("Test Magnet Physics")]
    public void TestMagnetPhysics()
    {
        Debug.Log("=== MAGNET PHYSICS TEST ===");
        Debug.Log($"Static Friction: {staticFriction}");
        Debug.Log($"Gravity: {Physics.gravity.y * gravityMultiplier}");
        Debug.Log($"Constant Force: {constantCenterForce}");
        Debug.Log($"Force Mode: {(useConstantCenterForce ? "Constant" : "Variable")}");
        
        float gravityMagnitude = Mathf.Abs(Physics.gravity.y) * gravityMultiplier;
        float minForceRequired = 1.0f * gravityMagnitude * staticFriction * 1.1f;
        Debug.Log($"Min force to overcome friction (1kg object): {minForceRequired:F2}N");
        Debug.Log($"Current constant force is {(constantCenterForce >= minForceRequired ? "SUFFICIENT" : "INSUFFICIENT")}");
        
        // Test on all items
        List<ItemView> items = GetAllItemViews();
        int stuckItems = 0;
        int movingItems = 0;
        
        foreach (var item in items)
        {
            if (item?.GetComponent<Rigidbody>() != null)
            {
                Rigidbody rb = item.GetComponent<Rigidbody>();
                if (!rb.isKinematic)
                {
                    bool isMoving = rb.linearVelocity.magnitude > rigidbodySleepThreshold;
                    if (isMoving)
                        movingItems++;
                    else
                        stuckItems++;
                        
                    if (!isMoving && rb.IsSleeping())
                    {
                        Debug.Log($"Item '{item.name}' is SLEEPING - needs wake up!");
                    }
                }
            }
        }
        
        Debug.Log($"Items status: {movingItems} moving, {stuckItems} stationary");
        Debug.Log("=== END MAGNET PHYSICS TEST ===");
    }
    
    [ContextMenu("Force Wake All Items")]
    public void ForceWakeAllItems()
    {
        List<ItemView> allItems = GetAllItemViews();
        int wokenCount = 0;
        
        foreach (ItemView item in allItems)
        {
            Rigidbody rb = item.GetComponent<Rigidbody>();
            if (rb != null && rb.IsSleeping())
            {
                rb.WakeUp();
                wokenCount++;
            }
        }
        
        Debug.Log($"[Physics] Force woke {wokenCount} sleeping items out of {allItems.Count} total");
    }
    
    [ContextMenu("Debug Thrust System")]
    public void DebugThrustSystem()
    {
        Debug.Log($"[THRUST DEBUG] ===== THRUST SYSTEM STATUS =====");
        Debug.Log($"[THRUST DEBUG] selectionThrustForce: {selectionThrustForce}");
        Debug.Log($"[THRUST DEBUG] selectionNudgeForce: {selectionNudgeForce}");
        Debug.Log($"[THRUST DEBUG] Active thrust keys: {activeThrustKeys.Count}");
        
        if (activeThrustKeys.Count > 0)
        {
            string keysStr = string.Join(", ", activeThrustKeys);
            Debug.Log($"[THRUST DEBUG] Keys: [{keysStr}]");
        }
        
        // Check physics settings
        Debug.Log($"[THRUST DEBUG] === PHYSICS SETTINGS ===");
        Debug.Log($"[THRUST DEBUG] rigidbodyDrag: {rigidbodyDrag}");
        Debug.Log($"[THRUST DEBUG] rigidbodyAngularDrag: {rigidbodyAngularDrag}");
        Debug.Log($"[THRUST DEBUG] staticFriction: {staticFriction}");
        Debug.Log($"[THRUST DEBUG] dynamicFriction: {dynamicFriction}");
        Debug.Log($"[THRUST DEBUG] rigidbodySleepThreshold: {rigidbodySleepThreshold}");
        Debug.Log($"[THRUST DEBUG] Fixed timestep: {Time.fixedDeltaTime} ({1f/Time.fixedDeltaTime:F1} Hz)");
        
        // Check selected item
        if (spaceCraft.SelectedItemIds.Count > 0)
        {
            string selectedId = spaceCraft.SelectedItemIds[0];
            ItemView selectedItem = spaceCraft.FindItemViewById(selectedId);
            
            if (selectedItem != null)
            {
                Rigidbody rb = selectedItem.GetComponent<Rigidbody>();
                if (rb != null)
                {
                    Debug.Log($"[THRUST DEBUG] === SELECTED ITEM: {selectedItem.name} ===");
                    Debug.Log($"[THRUST DEBUG] Mass: {rb.mass}");
                    Debug.Log($"[THRUST DEBUG] Drag: {rb.linearDamping}");
                    Debug.Log($"[THRUST DEBUG] Angular Drag: {rb.angularDamping}");
                    Debug.Log($"[THRUST DEBUG] Velocity: {rb.linearVelocity.magnitude:F3}");
                    Debug.Log($"[THRUST DEBUG] Is Sleeping: {rb.IsSleeping()}");
                    Debug.Log($"[THRUST DEBUG] Use Gravity: {rb.useGravity}");
                    
                    // Calculate what thrust force should do
                    float acceleration = selectionThrustForce / rb.mass;
                    Debug.Log($"[THRUST DEBUG] Expected acceleration: {acceleration:F2} m/s²");
                    Debug.Log($"[THRUST DEBUG] Expected velocity gain per second: {acceleration:F2} m/s");
                }
            }
        }
    }
}
