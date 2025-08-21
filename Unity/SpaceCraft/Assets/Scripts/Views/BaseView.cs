using System;
using System.Collections;
using UnityEngine;
using TMPro;

/// <summary>
/// Abstract base class for all view objects in the scene.
/// Provides shared functionality for physics, dynamic scaling, highlighting, selection, and mesh creation.
/// Inherits from BridgeObject to support Unity-JavaScript bridge communication.
/// </summary>
public abstract class BaseView : BridgeObject
{
    // Dynamic Scaling fields and properties - Public for direct bridge access
    [Header("Dynamic Scaling")]
    [NonSerialized]
    [SerializeField]
    [ExposedParameter(
        Category = "Scaling", 
        Description = "Target scale for this object", 
        Min = 0.1f, Max = 10f, Step = 0.1f, 
        Default = 1f, Visible = true
    )]
    public float viewScale = 1.0f;
    
    [SerializeField] public float currentScale = 1.0f;
    
    [SerializeField]
    [ExposedParameter(
        Category = "Scaling", 
        Description = "Speed of scale animation", 
        Min = 0.1f, Max = 10f, Step = 0.1f, 
        Default = 1.2f, Visible = true
    )]
    public float viewScaleSlerpRate = 1.2f;
    
    [SerializeField]
    [ExposedParameter(
        Category = "Scaling", 
        Description = "Minimum allowed scale", 
        Min = 0.01f, Max = 1f, Step = 0.01f, 
        Default = 0.1f, Visible = true
    )]
    public float minViewScale = 0.1f;
    
    [SerializeField]
    [ExposedParameter(
        Category = "Scaling", 
        Description = "Maximum allowed scale", 
        Min = 1f, Max = 20f, Step = 0.1f, 
        Default = 3f, Visible = true
    )]
    public float maxViewScale = 3.0f;

    // Mesh and Cover fields - Public for direct bridge access
    [Header("Mesh and Cover")]
    [SerializeField]
    [ExposedParameter(
        Category = "Mesh", 
        Description = "Width to height ratio", 
        Min = 0.1f, Max = 10f, Step = 0.1f, 
        Default = 1f, Visible = true
    )]
    public float aspectRatio = 1.0f; // Width/Height ratio for the main mesh
    
    [SerializeField] public float currentWidth = 1.0f;
    [SerializeField] public float currentHeight = 1.0f;

    // Label and Materials fields - Public for direct bridge access where applicable
    [Header("Label and Materials")]
    [SerializeField] protected TextMeshPro labelText; // Direct TextMeshPro reference
    [SerializeField] protected Material loadingMaterial; // Keep protected - complex type
    
    [SerializeField]
    [ExposedParameter(
        Category = "Display", 
        Description = "Text to display", 
        Unit = "", 
        Default = "", Visible = true
    )]
    public string displayText = "";

    // Physics Properties (shared by all objects) - Public for direct bridge access
    [Header("Physics Properties")]
    [NonSerialized]
    [SerializeField]
    [ExposedParameter(
        Category = "Physics", 
        Description = "Physical mass for rigidbody physics and inertia", 
        Min = 0.1f, Max = 1000000f, Step = 0.1f, Unit = "kg",
        Default = 1f, Visible = true
    )]
    [Tooltip("Physical mass for rigidbody physics and inertia")]
    [Range(0.1f, 1000000f)]
    public float mass = 1.0f;

    [NonSerialized]
    [SerializeField]
    [ExposedParameter(
        Category = "Physics", 
        Description = "Resistance to start moving when at rest", 
        Min = 0f, Max = 50f, Step = 0.1f, 
        Default = 0.5f, Visible = true
    )]
    [Tooltip("Resistance to start moving when at rest")]
    [Range(0f, 50f)]
    public float staticFriction = 0.5f;

    [NonSerialized]
    [SerializeField]
    [ExposedParameter(
        Category = "Physics", 
        Description = "Resistance while moving", 
        Min = 0f, Max = 50f, Step = 0.1f, 
        Default = 0.3f, Visible = true
    )]
    [Tooltip("Resistance while moving")]
    [Range(0f, 50f)]
    public float dynamicFriction = 0.3f;

    [SerializeField]
    [ExposedParameter(
        Category = "Physics", 
        Description = "Air resistance while moving", 
        Min = 0f, Max = 1000f, Step = 0.1f, 
        Default = 1f, Visible = true
    )]
    [Tooltip("Air resistance while moving")]
    [Range(0f, 1000f)]
    public float linearDrag = 1.0f;

    [SerializeField]
    [ExposedParameter(
        Category = "Physics", 
        Description = "Rotational air resistance", 
        Min = 0f, Max = 1000f, Step = 0.1f, 
        Default = 5f, Visible = true
    )]
    [Tooltip("Rotational air resistance")]
    [Range(0f, 1000f)]
    public float angularDrag = 5.0f;

    [SerializeField]
    [ExposedParameter(
        Category = "Physics", 
        Description = "Whether rigidbody is kinematic (ignores physics forces)", 
        Default = false, Visible = true
    )]
    [Tooltip("Kinematic rigidbodies ignore physics forces")]
    public bool isKinematic = false;

    // Cached component references (protected so subclasses can access them)
    protected MeshFilter meshFilter;
    protected MeshRenderer meshRenderer;
    protected BoxCollider boxCollider;
    protected Rigidbody rigidBody;

    // Cover collider reference (assign in Unity Editor)
    [Header("Cover Collider")]
    [SerializeField] protected BoxCollider coverCollider; // Direct reference to cover collider (optional)

    // Visual Meshes fields
    [Header("Visual Meshes")]
    [SerializeField] protected GameObject highlightMesh; // Dedicated mesh for highlighting
    [SerializeField] protected GameObject selectionMesh; // Dedicated mesh for selection

    // Materials fields (keep protected - complex Unity types)
    [Header("Materials")]
    [SerializeField] protected Material highlightMaterial;
    [SerializeField] protected Material selectionMaterial;

    // Highlighting and Selecting fields - Public for direct bridge access
    [Header("Highlighting and Selecting")]
    [SerializeField]
    [ExposedParameter(
        Category = "Visual", 
        Description = "Z-offset for highlight mesh", 
        Min = -1f, Max = 1f, Step = 0.001f, 
        Default = -0.01f, Visible = true
    )]
    public float highlightElevation = -0.01f; // Slight back offset for highlight mesh
    
    [SerializeField]
    [ExposedParameter(
        Category = "Visual", 
        Description = "Margin around object for highlight", 
        Min = 0f, Max = 1f, Step = 0.01f, 
        Default = 0.1f, Visible = true
    )]
    public float highlightMargin = 0.1f; // Margin around the object for highlight mesh
    
    [SerializeField] public Color highlightColor = new Color(1f, 0.8f, 0.2f, 0.7f);
    
    [SerializeField]
    [ExposedParameter(
        Category = "Visual", 
        Description = "Z-offset for selection mesh", 
        Min = -1f, Max = 1f, Step = 0.001f, 
        Default = -0.02f, Visible = true
    )]
    public float selectionElevation = -0.02f; // Further back offset for selection mesh
    
    [SerializeField]
    [ExposedParameter(
        Category = "Visual", 
        Description = "Margin around object for selection", 
        Min = 0f, Max = 1f, Step = 0.01f, 
        Default = 0.2f, Visible = true
    )]
    public float selectionMargin = 0.2f; // Larger margin around the object for selection mesh
    [SerializeField] public Color selectionColor = new Color(0f, 0.5f, 0f, 1.0f);

    // State - Public for direct bridge access
    [Header("State")]
    public bool isHighlighted = false;
    public bool isSelected = false;
    public int highlightCount = 0;
    protected Material originalMaterial; // Keep protected - complex Unity type

    // Note: State fields are now directly public above

    // Dynamic scaling properties with validation
    public float ViewScale 
    { 
        get => viewScale; 
        set => viewScale = Mathf.Clamp(value, minViewScale, maxViewScale);
    }
    
    public float CurrentScale => currentScale;
    
    public void SetCurrentScale(float scale)
    {
        currentScale = Mathf.Clamp(scale, minViewScale, maxViewScale);
    }
    
    public float ViewScaleSlerpRate 
    { 
        get => viewScaleSlerpRate; 
        set => viewScaleSlerpRate = Mathf.Clamp(value, 0.1f, 10.0f);
    }

    // Mesh and cover properties
    public float AspectRatio 
    { 
        get => aspectRatio; 
        set => aspectRatio = Mathf.Max(0.1f, value);
    }

    public float CurrentWidth => currentWidth;
    public float CurrentHeight => currentHeight;

    // Generic display text property
    public virtual string DisplayText 
    { 
        get => displayText; 
        set 
        {
            displayText = value;
            UpdateDisplay();
        }
    }

    // Core Unity lifecycle methods (virtual so subclasses can override)
    protected virtual void Awake()
    {
        // Cache component references
        meshFilter = GetComponent<MeshFilter>();
        if (meshFilter == null)
            meshFilter = gameObject.AddComponent<MeshFilter>();
            
        meshRenderer = GetComponent<MeshRenderer>();
        if (meshRenderer == null)
            meshRenderer = gameObject.AddComponent<MeshRenderer>();
            
        boxCollider = GetComponent<BoxCollider>();
        rigidBody = GetComponent<Rigidbody>();

        // Store original material
        originalMaterial = meshRenderer.material;

        // Setup physics behavior
        SetupPhysicsBehavior();
    }

    protected virtual void Update()
    {
        float targetScale = CalculateTargetScale();
        if (!Mathf.Approximately(currentScale, targetScale))
        {
            currentScale = Mathf.Lerp(currentScale, targetScale, viewScaleSlerpRate * Time.deltaTime);
            transform.localScale = Vector3.one * currentScale;
            
            // Update physics when scale changes significantly
            if (Mathf.Abs(currentScale - targetScale) < 0.01f)
            {
                UpdatePhysicsForScale();
            }
        }

        // Always sync rigidbody properties from exposed parameters so controller adjustments apply live
        if (rigidBody != null)
        {
            // AGGRESSIVE DEBUGGING - Log every frame for magnets
            if (name.Contains("Magnet") && Time.frameCount % 60 == 0)
            {
                Debug.LogError($"[DRAG DEBUG] {name}: linearDrag={linearDrag}, rigidBody.drag={rigidBody.linearDamping}, isKinematic={rigidBody.isKinematic}, velocity={rigidBody.linearVelocity.magnitude:F3}");
            }
            
            if (!Mathf.Approximately(rigidBody.linearDamping, linearDrag)) 
            {
                Debug.LogError($"[BaseView] DRAG SYNC: Setting drag from {rigidBody.linearDamping} to {linearDrag} on {name}");
                rigidBody.linearDamping = linearDrag;
            }
            if (!Mathf.Approximately(rigidBody.angularDamping, angularDrag)) 
            {
                Debug.LogError($"[BaseView] ANGULAR DRAG SYNC: Setting angularDrag from {rigidBody.angularDamping} to {angularDrag} on {name}");
                rigidBody.angularDamping = angularDrag;
            }
            if (rigidBody.isKinematic != isKinematic) 
            {
                Debug.LogError($"[BaseView] KINEMATIC SYNC: Setting isKinematic from {rigidBody.isKinematic} to {isKinematic} on {name}");
                rigidBody.isKinematic = isKinematic;
            }
        }
    }

    public override void OnDestroy()
    {
        // Clean up any created meshes
        if (highlightMesh != null)
        {
            DestroyImmediate(highlightMesh);
        }
        if (selectionMesh != null)
        {
            DestroyImmediate(selectionMesh);
        }
        
        // Call base cleanup
        base.OnDestroy();
    }

    // Abstract methods for subclasses to implement
    protected abstract float CalculateTargetScale();
    
    /// <summary>
    /// Get the default dimensions for this view type.
    /// Used as base dimensions before aspect ratio adjustments.
    /// Returns (defaultWidth, defaultHeight).
    /// </summary>
    protected abstract (float defaultWidth, float defaultHeight) GetDefaultDimensions();

    /// <summary>
    /// Get the current mesh dimensions after aspect ratio calculations.
    /// Used for creating properly sized highlight and selection meshes.
    /// Returns (width, height) of the main mesh.
    /// </summary>
    protected virtual (float width, float height) GetMeshDimensions()
    {
        return (currentWidth, currentHeight);
    }

    // Mesh creation and shaping methods
    
    /// <summary>
    /// Update mesh based on aspect ratio to fit within the default dimensions
    /// </summary>
    protected virtual void UpdateMeshForAspectRatio(float newAspectRatio)
    {
        aspectRatio = newAspectRatio;
        
        var (defaultWidth, defaultHeight) = GetDefaultDimensions();
        float width, height;
        
        if (aspectRatio >= 1f) // Landscape or square
        {
            // Set width to default, scale height
            width = defaultWidth;
            height = width / aspectRatio; 
        }
        else // Portrait
        {
            // Set height to default, scale width
            height = defaultHeight;
            width = height * aspectRatio;
        }
        
        CreateOrUpdateMesh(width, height);
    }

    /// <summary>
    /// Create or update the main mesh with specified dimensions
    /// </summary>
    protected virtual void CreateOrUpdateMesh(float width, float height)
    {
        if (meshFilter == null) return;
        if (width <= 0 || height <= 0) return;
        
        // Store current dimensions for highlight/selection meshes to use
        currentWidth = width;
        currentHeight = height;
        
        // Create a simple quad mesh
        Mesh mesh = new Mesh();
        
        Vector3[] vertices = new Vector3[4]
        {
            new Vector3(-width/2, 0, -height/2),
            new Vector3(width/2, 0, -height/2),
            new Vector3(-width/2, 0, height/2),
            new Vector3(width/2, 0, height/2)
        };
        
        Vector2[] uv = new Vector2[4]
        {
            new Vector2(0, 0),
            new Vector2(1, 0),
            new Vector2(0, 1),
            new Vector2(1, 1)
        };
        
        int[] triangles = new int[6]
        {
            0, 2, 1,
            2, 3, 1
        };
        
        mesh.vertices = vertices;
        mesh.uv = uv;
        mesh.triangles = triangles;
        mesh.RecalculateNormals();
        
        meshFilter.mesh = mesh;
        
        // Update collider to match cover dimensions exactly
        UpdateCoverCollider(width, height);
        
        // Update highlight and selection meshes if they exist
        if (highlightMesh != null)
            UpdateHighlightMeshSize();
        if (selectionMesh != null)
            UpdateSelectionMeshSize();
    }

    /// <summary>
    /// Update the cover collider to exactly match the cover dimensions.
    /// This ensures mouse detection area perfectly fits the visual cover.
    /// </summary>
    protected virtual void UpdateCoverCollider(float coverWidth, float coverHeight)
    {
        // Use direct reference to cover collider if assigned
        if (coverCollider != null)
        {
            // Set collider size to exactly match cover (no capping, perfect fit)
            float colliderThickness = 0.1f; // Thin thickness for trigger detection
            coverCollider.size = new Vector3(coverWidth, colliderThickness, coverHeight);
            
            // Ensure it's positioned correctly (slightly above the cover surface)
            coverCollider.center = new Vector3(0, colliderThickness/2, 0);
            
            // Debug.Log($"[{GetType().Name}] Updated cover collider: {coverWidth:F2} x {coverHeight:F2} for {name}");
        }
        
        // Also update main object box collider if it exists (fallback/legacy support)
        if (boxCollider != null)
        {
            float colliderThickness = 0.1f;
            boxCollider.size = new Vector3(coverWidth, colliderThickness, coverHeight);
            boxCollider.center = new Vector3(0, colliderThickness/2, 0);
        }
    }

    // Physics methods (virtual so subclasses can override if needed)
    protected virtual float GetAnimationSpeedFromInputManager()
    {
        if (SpaceCraft.Instance?.InputManager != null)
        {
            return SpaceCraft.Instance.InputManager.scaleAnimationSpeed;
        }
        return 3.0f; // Default fallback
    }

    protected virtual void SetupPhysicsBehavior()
    {
        if (rigidBody != null)
        {
            ApplyInputManagerPhysicsSettings();
        }
    }

    protected virtual void ApplyInputManagerPhysicsSettings()
    {
        if (rigidBody == null) return;
        
        // Set mass and physics properties from per-object values
        rigidBody.mass = mass;
        rigidBody.linearDamping = linearDrag;
        rigidBody.angularDamping = angularDrag;
        
        // AGGRESSIVE DEBUGGING
        Debug.LogError($"[PHYSICS SETUP] {name}: Applied mass={mass}, drag={linearDrag}, angularDrag={angularDrag}");
        
        // Update physics material properties
        UpdatePhysicsMaterial();
        
        // Only do kinematic settling if isKinematic is false; otherwise keep kinematic
        if (!isKinematic)
        {
            rigidBody.isKinematic = true;
            StartCoroutine(EnablePhysicsAfterSettling());
        }
        else
        {
            rigidBody.isKinematic = true;
        }
    }

    /// <summary>
    /// Update physics material properties based on current friction settings
    /// </summary>
    protected virtual void UpdatePhysicsMaterial()
    {
        Collider collider = GetComponent<Collider>();
        if (collider != null)
        {
            // Create or update physics material
            if (collider.material == null)
            {
                collider.material = new PhysicsMaterial($"{gameObject.name}Physics");
            }
            
            collider.material.staticFriction = staticFriction;
            collider.material.dynamicFriction = dynamicFriction;
        }
    }

    protected virtual IEnumerator EnablePhysicsAfterSettling()
    {
        // Wait for a short period to let positioning settle
        yield return new WaitForSeconds(0.1f);
        
        if (rigidBody != null && !isKinematic)
        {
            rigidBody.isKinematic = false;
        }
    }

    public virtual void ForceSettle()
    {
        if (rigidBody != null)
        {
            rigidBody.linearVelocity = Vector3.zero;
            rigidBody.angularVelocity = Vector3.zero;
        }
    }

    protected virtual void UpdatePhysicsForScale()
    {
        if (rigidBody != null)
        {
            // Mass scales with volume (scale cubed) but clamped for gameplay
            float scaledMass = mass * Mathf.Pow(currentScale, 1.5f);
            rigidBody.mass = Mathf.Clamp(scaledMass, 0.1f, 50f);
        }
    }

    // Physics property accessors
    public virtual float GetPhysicsMass()
    {
        return mass;
    }

    public virtual void SetPhysicsMass(float newMass)
    {
        mass = Mathf.Clamp(newMass, 0.1f, 100f);
        if (rigidBody != null)
        {
            UpdatePhysicsForScale();
        }
    }

    // Scaling utility methods
    public bool IsScaling => !Mathf.Approximately(currentScale, viewScale);
    
    public virtual void SetScaleImmediate(float scale)
    {
        viewScale = Mathf.Clamp(scale, minViewScale, maxViewScale);
        currentScale = viewScale;
        transform.localScale = Vector3.one * currentScale;
        UpdatePhysicsForScale();
    }

    // Highlighting and Selection methods (virtual so subclasses can override if needed)
    public virtual void SetHighlighted(bool highlighted)
    {
        if (isHighlighted == highlighted) return;
        
        isHighlighted = highlighted;
        
        if (highlighted)
        {
            // Create highlight mesh if it doesn't exist yet
            if (highlightMesh == null)
            {
                CreateHighlightMesh();
            }
            
            // Ensure mesh is active and has the right material
            highlightMesh.SetActive(true);
            MeshRenderer highlightRenderer = highlightMesh.GetComponent<MeshRenderer>();
            if (highlightRenderer != null && highlightMaterial != null)
            {
                highlightRenderer.material = highlightMaterial;
            }
        }
        else if (highlightMesh != null)
        {
            // Deactivate the mesh when not highlighted
            highlightMesh.SetActive(false);
        }
    }

    public virtual void SetSelected(bool selected)
    {
        if (isSelected == selected) return;
        
        isSelected = selected;
        
        if (selected)
        {
            // Create selection mesh if it doesn't exist yet
            if (selectionMesh == null)
            {
                CreateSelectionMesh();
            }
            
            // Ensure mesh is active and has the right material
            selectionMesh.SetActive(true);
            MeshRenderer selectionRenderer = selectionMesh.GetComponent<MeshRenderer>();
            if (selectionRenderer != null && selectionMaterial != null)
            {
                selectionRenderer.material = selectionMaterial;
            }
        }
        else if (selectionMesh != null)
        {
            // Deactivate the mesh when not selected
            selectionMesh.SetActive(false);
        }
    }

    public virtual void SetHighlightCount(int count)
    {
        highlightCount = count;
        
        // For now, just treat any count > 0 as highlighted
        SetHighlighted(count > 0);
    }

    /// <summary>
    /// Create the highlight mesh as a child object with appropriate material
    /// </summary>
    protected virtual void CreateHighlightMesh()
    {
        if (highlightMesh != null) return;

        // Create the highlight mesh GameObject
        highlightMesh = new GameObject($"{gameObject.name}_Highlight");
        highlightMesh.transform.SetParent(transform);
        highlightMesh.transform.localPosition = Vector3.zero;
        highlightMesh.transform.localRotation = Quaternion.identity;
        highlightMesh.transform.localScale = Vector3.one;

        // Add MeshFilter and MeshRenderer
        MeshFilter highlightFilter = highlightMesh.AddComponent<MeshFilter>();
        MeshRenderer highlightRenderer = highlightMesh.AddComponent<MeshRenderer>();

        // Set material if available
        if (highlightMaterial != null)
        {
            highlightRenderer.material = highlightMaterial;
        }

        // Create the mesh
        UpdateHighlightMeshSize();
    }

    /// <summary>
    /// Create the selection mesh as a child object with appropriate material
    /// </summary>
    protected virtual void CreateSelectionMesh()
    {
        if (selectionMesh != null) return;

        // Create the selection mesh GameObject
        selectionMesh = new GameObject($"{gameObject.name}_Selection");
        selectionMesh.transform.SetParent(transform);
        selectionMesh.transform.localPosition = Vector3.zero;
        selectionMesh.transform.localRotation = Quaternion.identity;
        selectionMesh.transform.localScale = Vector3.one;

        // Add MeshFilter and MeshRenderer
        MeshFilter selectionFilter = selectionMesh.AddComponent<MeshFilter>();
        MeshRenderer selectionRenderer = selectionMesh.AddComponent<MeshRenderer>();

        // Set material if available
        if (selectionMaterial != null)
        {
            selectionRenderer.material = selectionMaterial;
        }

        // Create the mesh
        UpdateSelectionMeshSize();
    }

    /// <summary>
    /// Update the highlight mesh size based on current object dimensions
    /// </summary>
    protected virtual void UpdateHighlightMeshSize()
    {
        if (highlightMesh == null) return;

        var (width, height) = GetMeshDimensions();

        MeshFilter highlightFilter = highlightMesh.GetComponent<MeshFilter>();
        if (highlightFilter == null) return;

        Mesh highlightQuad = new Mesh();

        // Create vertices with margin around the object
        float highlightWidth = width + (highlightMargin * 2);
        float highlightHeight = height + (highlightMargin * 2);

        Vector3[] vertices = new Vector3[4]
        {
            new Vector3(-highlightWidth/2, highlightElevation, -highlightHeight/2),
            new Vector3(highlightWidth/2, highlightElevation, -highlightHeight/2),
            new Vector3(-highlightWidth/2, highlightElevation, highlightHeight/2),
            new Vector3(highlightWidth/2, highlightElevation, highlightHeight/2)
        };

        Vector2[] uv = new Vector2[4]
        {
            new Vector2(0, 0),
            new Vector2(1, 0),
            new Vector2(0, 1),
            new Vector2(1, 1)
        };

        int[] triangles = new int[6]
        {
            0, 2, 1,
            2, 3, 1
        };

        highlightQuad.vertices = vertices;
        highlightQuad.uv = uv;
        highlightQuad.triangles = triangles;
        highlightQuad.RecalculateNormals();

        highlightFilter.mesh = highlightQuad;

        // Ensure the highlight mesh uses the highlight material
        MeshRenderer highlightRenderer = highlightMesh.GetComponent<MeshRenderer>();
        if (highlightRenderer != null && highlightMaterial != null)
        {
            highlightRenderer.material = highlightMaterial;
        }
    }

    /// <summary>
    /// Update the selection mesh size based on current object dimensions
    /// </summary>
    protected virtual void UpdateSelectionMeshSize()
    {
        if (selectionMesh == null) return;

        var (width, height) = GetMeshDimensions();

        MeshFilter selectionFilter = selectionMesh.GetComponent<MeshFilter>();
        if (selectionFilter == null) return;

        Mesh selectionQuad = new Mesh();

        // Create vertices with margin around the object
        float selectionWidth = width + (selectionMargin * 2);
        float selectionHeight = height + (selectionMargin * 2);

        Vector3[] vertices = new Vector3[4]
        {
            new Vector3(-selectionWidth/2, selectionElevation, -selectionHeight/2),
            new Vector3(selectionWidth/2, selectionElevation, -selectionHeight/2),
            new Vector3(-selectionWidth/2, selectionElevation, selectionHeight/2),
            new Vector3(selectionWidth/2, selectionElevation, selectionHeight/2)
        };

        Vector2[] uv = new Vector2[4]
        {
            new Vector2(0, 0),
            new Vector2(1, 0),
            new Vector2(0, 1),
            new Vector2(1, 1)
        };

        int[] triangles = new int[6]
        {
            0, 2, 1,
            2, 3, 1
        };

        selectionQuad.vertices = vertices;
        selectionQuad.uv = uv;
        selectionQuad.triangles = triangles;
        selectionQuad.RecalculateNormals();

        selectionFilter.mesh = selectionQuad;

        // Ensure the selection mesh uses the selection material
        MeshRenderer selectionRenderer = selectionMesh.GetComponent<MeshRenderer>();
        if (selectionRenderer != null && selectionMaterial != null)
        {
            selectionRenderer.material = selectionMaterial;
        }
    }

    /// <summary>
    /// Updates the display text on the label component.
    /// Text auto-sizing should be configured manually in Unity Inspector.
    /// </summary>
    protected virtual void UpdateDisplay()
    {
        if (labelText != null)
        {
            labelText.text = displayText;
            
            // Force mesh update to apply text changes
            labelText.ForceMeshUpdate();
        }
    }


    /// <summary>
    /// Apply a material to the main mesh renderer and store it as the original.
    /// </summary>
    protected virtual void ApplyMaterial(Material material)
    {
        if (meshRenderer == null || material == null) return;
        
        originalMaterial = material;
        meshRenderer.material = material;
    }

    /// <summary>
    /// Apply the loading/placeholder material while content is being loaded.
    /// </summary>
    protected virtual void ApplyLoadingMaterial()
    {
        if (loadingMaterial != null)
        {
            ApplyMaterial(loadingMaterial);
        }
        else
        {
            // Create a simple placeholder material
            Material material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.color = Color.gray;
            ApplyMaterial(material);
        }
        
        // Use default aspect ratio when no content is loaded
        UpdateMeshForAspectRatio(aspectRatio);
    }
} 