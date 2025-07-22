using System;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using UnityEngine.Events;

/// <summary>
/// Displays a single Item model as a 3D object in the scene.
/// Pure presentation component that doesn't handle any loading or serialization.
/// </summary>
public class ItemView : MonoBehaviour, IModelView<Item>
{
    [Header("Model Reference")]
    [SerializeField] private Item model;
    
    [Header("UI References")]
    [SerializeField] private ItemLabel itemLabel;
    
    [Header("Item Display")]
    [SerializeField] private float itemWidth = 1.4f;
    [SerializeField] private float itemHeight = 1.0f;

    [Header("Materials")]
    [SerializeField] private Material loadingMaterial;
    
    [Header("Highlighting and Selecting")]
    [SerializeField] private GameObject highlightMesh; // Dedicated mesh for highlighting
    [SerializeField] private Material highlightMaterial; // Material for highlight state
    [SerializeField] private float highlightElevation = -0.01f; // Slight back offset for highlight mesh
    [SerializeField] private float highlightMargin = 0.1f; // Margin around the item for highlight mesh
    [SerializeField] private Color highlightColor = new Color(1f, 0.8f, 0.2f, 0.7f);

    [Header("Selection")]
    [SerializeField] private GameObject selectionMesh; // Dedicated mesh for selection
    [SerializeField] private Material selectionMaterial; // Material for selection state
    [SerializeField] private float selectionElevation = -0.02f; // Further back offset for selection mesh
    [SerializeField] private float selectionMargin = 0.2f; // Larger margin around the item for selection mesh
    [SerializeField] private Color selectionColor = new Color(0f, 0.5f, 0f, 1.0f);
    
    [Header("Dynamic Scaling")]
    [SerializeField] private float viewScale = 1.0f; // Aspirational scale (1.0 = normal size)
    [SerializeField] private float currentScale = 1.0f; // Current actual scale (for smooth transitions)
    [SerializeField] private float viewScaleSlerpRate = 3.0f; // Rate of scale transitions (higher = faster) - increased for responsive scaling
    [SerializeField] private float minViewScale = 0.1f; // Minimum scale to prevent books from disappearing
    [SerializeField] private float maxViewScale = 3.0f; // Maximum scale to prevent giant books
    
    // State
    private bool isHighlighted = false;
    private bool isSelected = false;
    private Material originalMaterial;
    private int highlightCount = 0;
    
    // Cached component references
    private MeshFilter meshFilter;
    private MeshRenderer meshRenderer;
    private BoxCollider boxCollider;
    private Rigidbody rigidBody; // Physics body for movement (if present)
    
    // Collection context
    [SerializeField] public string collectionId;
    
    // Unity event for item changes
    [SerializeField] private UnityEvent<Item> onItemChanged = new UnityEvent<Item>();
    public UnityEvent<Item> OnItemChanged => onItemChanged;
    
    // Property to get/set the model (implementing IModelView)
    public Item Model 
    {
        get => model;
        set => SetModel(value);
    }
    
    // Parent reference
    public CollectionView ParentCollectionView { get; set; }
    
    // Public accessors for state
    public bool IsHighlighted => isHighlighted;
    public bool IsSelected => isSelected;
    public int CurrentHighlightCount => highlightCount; // Public getter for the count
    
    /// <summary>
    /// The target view scale set by SpaceCraft (excludes selection multiplier)
    /// This is the scale the item is animating towards.
    /// </summary>
    public float ViewScale 
    { 
        get => viewScale; 
        set => viewScale = Mathf.Clamp(value, minViewScale, maxViewScale); 
    }
    
    /// <summary>
    /// The current instantaneous scale of the item
    /// </summary>
    public float CurrentScale => currentScale;
    
    /// <summary>
    /// Sets the current instantaneous scale directly.
    /// This is used for scale impulses (like tap scaling) that modify the current scale,
    /// which will then smoothly animate back to the target scale.
    /// </summary>
    public void SetCurrentScale(float scale)
    {
        currentScale = scale;
        transform.localScale = Vector3.one * currentScale;
        UpdatePhysicsForScale();
    }
    
    // Public accessors for dynamic scaling
    public float ViewScaleSlerpRate 
    { 
        get => viewScaleSlerpRate; 
        set => viewScaleSlerpRate = Mathf.Max(0.1f, value); 
    }
    
    private void Awake()
    {
        // Cache component references
        meshFilter = GetComponent<MeshFilter>();
        if (meshFilter == null)
            meshFilter = gameObject.AddComponent<MeshFilter>();
            
        meshRenderer = GetComponent<MeshRenderer>();
        if (meshRenderer == null)
            meshRenderer = gameObject.AddComponent<MeshRenderer>();
            
        boxCollider = GetComponent<BoxCollider>();
        
        // Setup physics behavior (works with whatever colliders exist in prefab)
        SetupPhysicsBehavior();
        
        // Note: We don't create the highlight/selection meshes here anymore
        // They will be created lazily when needed in SetHighlighted/SetSelected
        
        if (model != null)
        {
            // Register with model on awake
            model.RegisterView(this);
        }
        
        // Initialize scaling - start with normal size and apply to transform
        viewScale = 1.0f;
        currentScale = 1.0f;
        transform.localScale = Vector3.one * currentScale;
    }
    
    private void Update()
    {
        // Calculate the target scale based on viewScale and selection state
        float targetScale = viewScale;
        
        // Apply selection scale multiplier if this item is selected
        if (isSelected && SpaceCraft.Instance?.InputManager != null)
        {
            targetScale *= SpaceCraft.Instance.InputManager.SelectionScale;
        }
        
        // Handle smooth scaling transitions - the "dirty but sweet" incremental slerp technique!
        if (!Mathf.Approximately(currentScale, targetScale))
        {
            // Get dynamic animation speed from InputManager for real-time control
            float animationSpeed = GetAnimationSpeedFromInputManager();
            
            // Incremental slerp towards target scale - not mathematically pure but aesthetically pleasing
            currentScale = Mathf.Lerp(currentScale, targetScale, Time.deltaTime * animationSpeed);
            
            // Snap to target when very close to prevent infinite tiny movements
            if (Mathf.Abs(currentScale - targetScale) < 0.001f)
            {
                currentScale = targetScale;
            }
            
            // Apply the current scale to the transform
            transform.localScale = Vector3.one * currentScale;
            
            // Update physics properties for new scale
            UpdatePhysicsForScale();
        }
    }
    
    /// <summary>
    /// Get the current animation speed from InputManager, fallback to local setting
    /// This enables real-time control of scaling speed via Bridge from controllers!
    /// </summary>
    private float GetAnimationSpeedFromInputManager()
    {
        // Use the singleton reference instead of expensive scene search
        if (SpaceCraft.Instance?.InputManager != null)
        {
            return SpaceCraft.Instance.InputManager.scaleAnimationSpeed;
        }
        
        // Fallback to local setting if SpaceCraft/InputManager not found
        return viewScaleSlerpRate;
    }
    
    /// <summary>
    /// Setup physics behavior for marble madness rolling physics!
    /// Ensures proper collider configuration:
    /// - Box collider (trigger) on "Items" layer for mouse detection
    /// - Sphere colliders (non-trigger) for physics, will be excluded by layer mask in InputManager
    /// </summary>
    private void SetupPhysicsBehavior()
    {
        // Get rigidbody if it exists (configured in prefab) 
        rigidBody = GetComponent<Rigidbody>();
        
        // If no rigidbody, this ItemView doesn't use physics
        if (rigidBody == null) 
        {
            return; // No physics for this item
        }
        
        // Configure initial mass (other settings applied by InputManager.UpdateRigidbodySettings)
        rigidBody.mass = GetPhysicsMass(); // Dynamic mass based on scale
        
        // Anti-jiggle initialization - start stable and settled
        rigidBody.linearVelocity = Vector3.zero;
        rigidBody.angularVelocity = Vector3.zero;
        
        // Apply current InputManager physics settings
        ApplyInputManagerPhysicsSettings();
        
        // Materials are already assigned in prefabs - no need to apply them
        
        // Start in kinematic mode to prevent initial jiggling, then enable physics after settling
        StartCoroutine(EnablePhysicsAfterSettling());
    }
    

    

    
    /// <summary>
    /// Apply physics settings from InputManager to this rigidbody
    /// Called during setup and when InputManager settings change
    /// </summary>
    private void ApplyInputManagerPhysicsSettings()
    {
        if (rigidBody == null) return;
        
        InputManager inputManager = SpaceCraft.Instance.InputManager;
        
        // Direct physics control - no modes or complexity
        rigidBody.linearDamping = inputManager.rigidbodyDrag;
        rigidBody.angularDamping = inputManager.freezeRotation ? inputManager.extremeAngularDrag : inputManager.rigidbodyAngularDrag;
        rigidBody.sleepThreshold = inputManager.rigidbodySleepThreshold;
        rigidBody.centerOfMass = inputManager.centerOfMass; // Apply InputManager center of mass
        rigidBody.maxAngularVelocity = inputManager.freezeRotation ? 0f : inputManager.maxAngularVelocity;
        
        // NUCLEAR ROTATION STOP
        rigidBody.freezeRotation = inputManager.freezeRotation;
        rigidBody.constraints = (RigidbodyConstraints)inputManager.rotationConstraints;
        rigidBody.angularVelocity = Vector3.zero; // Force stop any current rotation
        
        rigidBody.collisionDetectionMode = inputManager.rigidbodyUseContinuousDetection ? 
            CollisionDetectionMode.ContinuousDynamic : 
            CollisionDetectionMode.Discrete;
    }
    
    /// <summary>
    /// DO NOTHING - Materials are already assigned in prefabs!
    /// </summary>
    private void ApplyPhysicsMaterials()
    {
        // Materials are ALREADY assigned in the prefabs
        // The whole point of SHARED materials is we don't reassign them!
    }
    
    /// <summary>
    /// Starts kinematic then enables physics after a brief delay to prevent creation jiggling
    /// </summary>
    private System.Collections.IEnumerator EnablePhysicsAfterSettling()
    {
        if (rigidBody == null) yield break;
        
        // Start kinematic (no physics forces)
        rigidBody.isKinematic = true;
        
        // Wait for layout positioning to complete
        yield return new WaitForSeconds(0.1f);
        
        // Enable physics smoothly
        rigidBody.isKinematic = false;
        rigidBody.linearVelocity = Vector3.zero;
        rigidBody.angularVelocity = Vector3.zero;
        
        // FORCE ALL rotation controls again to override prefab settings
        InputManager inputManager = SpaceCraft.Instance.InputManager;
        if (inputManager != null)
        {
            // NUCLEAR OPTION - apply all rotation stopping measures
            rigidBody.freezeRotation = inputManager.freezeRotation;
            rigidBody.constraints = (RigidbodyConstraints)inputManager.rotationConstraints;
            rigidBody.maxAngularVelocity = inputManager.freezeRotation ? 0f : inputManager.maxAngularVelocity;
            rigidBody.angularDamping = inputManager.freezeRotation ? inputManager.extremeAngularDrag : inputManager.rigidbodyAngularDrag;
            rigidBody.angularVelocity = Vector3.zero;
        }
    }
    
    /// <summary>
    /// Force the book to settle immediately (useful when layout changes)
    /// </summary>
    public void ForceSettle()
    {
        if (rigidBody != null)
        {
            rigidBody.linearVelocity = Vector3.zero;
            rigidBody.angularVelocity = Vector3.zero;
            rigidBody.Sleep(); // Force physics sleep state
        }
    }
    
    /// <summary>
    /// Update physics properties when scale changes (mass only - other settings from InputManager)
    /// Called automatically when scale changes during Update()
    /// </summary>
    private void UpdatePhysicsForScale()
    {
        if (rigidBody != null)
        {
            // Update mass based on current scale - larger books = more mass
            // All other physics settings are controlled by InputManager
            rigidBody.mass = GetPhysicsMass();
        }
    }
    
    private void CreateHighlightMesh()
    {
        // Create a highlight object as a child
        highlightMesh = new GameObject("HighlightMesh");
        highlightMesh.transform.SetParent(transform, false);
        highlightMesh.transform.localPosition = Vector3.zero;
        
        // Add mesh components
        MeshFilter highlightFilter = highlightMesh.AddComponent<MeshFilter>();
        MeshRenderer highlightRenderer = highlightMesh.AddComponent<MeshRenderer>();
        
        // Create a slightly larger quad
        Mesh highlightQuad = new Mesh();
        
        Vector3[] vertices = new Vector3[4]
        {
            new Vector3(-(itemWidth + highlightMargin)/2, highlightElevation, -(itemHeight + highlightMargin)/2),
            new Vector3((itemWidth + highlightMargin)/2, highlightElevation, -(itemHeight + highlightMargin)/2),
            new Vector3(-(itemWidth + highlightMargin)/2, highlightElevation, (itemHeight + highlightMargin)/2),
            new Vector3((itemWidth + highlightMargin)/2, highlightElevation, (itemHeight + highlightMargin)/2)
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
        
        // Create default material if not assigned
        if (highlightMaterial == null)
        {
            highlightMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            highlightMaterial.color = highlightColor;
        }
        if (selectionMaterial == null)
        {
            selectionMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            selectionMaterial.color = selectionColor;
        }
    }
    
    private void CreateSelectionMesh()
    {
        // Create a selection object as a child
        selectionMesh = new GameObject("SelectionMesh");
        selectionMesh.transform.SetParent(transform, false);
        selectionMesh.transform.localPosition = Vector3.zero;
        
        // Add mesh components
        MeshFilter selectionFilter = selectionMesh.AddComponent<MeshFilter>();
        MeshRenderer selectionRenderer = selectionMesh.AddComponent<MeshRenderer>();
        
        // Create an even larger quad for selection
        Mesh selectionQuad = new Mesh();
        
        Vector3[] vertices = new Vector3[4]
        {
            new Vector3(-(itemWidth + selectionMargin)/2, selectionElevation, -(itemHeight + selectionMargin)/2),
            new Vector3((itemWidth + selectionMargin)/2, selectionElevation, -(itemHeight + selectionMargin)/2),
            new Vector3(-(itemWidth + selectionMargin)/2, selectionElevation, (itemHeight + selectionMargin)/2),
            new Vector3((itemWidth + selectionMargin)/2, selectionElevation, (itemHeight + selectionMargin)/2)
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
        
        // Create default material if not assigned
        if (selectionMaterial == null)
        {
            selectionMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            selectionMaterial.color = selectionColor;
        }
    }
    
    private void OnDestroy()
    {
        if (model != null)
        {
            // Unregister when view is destroyed
            model.UnregisterView(this);
        }
    }
    
    /// <summary>
    /// Sets the collection context for this view
    /// </summary>
    public void SetCollectionContext(string id)
    {
        collectionId = id;
    }
    
    // Implement the IModelView interface method
    public void HandleModelUpdated()
    {
        UpdateView();
    }
    
    // Update view based on the current model
    public void UpdateView()
    {
        if (model == null) return;
        
        // Set title label
        if (itemLabel != null)
        {
            itemLabel.SetText(model.Title);
        }
        
        // Apply texture if available
        if (model.cover != null)
        {
            ApplyTexture(model.cover);
        }
        else
        {
            // Apply placeholder and request texture loading from Brewster
            ApplyPlaceholder();
            
            // Request texture from Brewster
            Brewster.Instance.LoadItemCover(model.Id, texture => {
                // Texture will be set on the model by Brewster, and the model will notify us
                // This will trigger OnItemUpdated which calls UpdateView
            });
        }
    }
    
    // Apply texture to the mesh renderer
    private void ApplyTexture(Texture2D texture)
    {
        // Debug.Log($"Applying texture to {texture}");
        
        if (texture == null || meshRenderer == null) return;
        
        string shaderName = "Unlit/Texture";
        var shader = Shader.Find(shaderName);
        if (shader == null)
        {
            Debug.LogError($"Shader not found: {shaderName}");
            return;
        }
        
        // Create material and apply texture
        Material material = new Material(shader);
        material.mainTexture = texture;
        
        // Store as original material
        originalMaterial = material;
        
        // Apply material to main mesh
        meshRenderer.material = material;
        
        // Update mesh to match texture dimensions
        float aspectRatio = (float)texture.width / texture.height;
        UpdateMeshForAspectRatio(aspectRatio);
        
        // Apply highlight and selection colors to ensure they're visible
        if (highlightMesh != null)
        {
            MeshRenderer highlightRenderer = highlightMesh.GetComponent<MeshRenderer>();
            if (highlightRenderer != null && highlightMaterial != null)
            {
                highlightMaterial.color = highlightColor;
                highlightRenderer.material = highlightMaterial;
            }
        }
        
        if (selectionMesh != null)
        {
            MeshRenderer selectionRenderer = selectionMesh.GetComponent<MeshRenderer>();
            if (selectionRenderer != null && selectionMaterial != null)
            {
                selectionMaterial.color = selectionColor;
                selectionRenderer.material = selectionMaterial;
            }
        }
    }
    
    // Apply placeholder material
    private void ApplyPlaceholder()
    {
        if (meshRenderer == null) return;
        
        Material material;
        if (loadingMaterial != null)
        {
            material = loadingMaterial;
        }
        else
        {
            // Create a simple placeholder material
            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.color = Color.gray;
        }
        
        // Store as original material
        originalMaterial = material;
        
        // Apply material to main mesh
        meshRenderer.material = material;
        
        // Use standard book aspect ratio (2:3)
        UpdateMeshForAspectRatio(2f/3f);
        
        // Update highlight and selection mesh sizes
        UpdateHighlightMeshSize();
    }
    
    // Update highlight mesh to match current item dimensions
    private void UpdateHighlightMeshSize()
    {
        // Use the stored dimensions instead of trying to get from mesh bounds
        float width = itemWidth;
        float height = itemHeight;
        
        if (width <= 0 || height <= 0) return;
        
        // Update highlight mesh if it exists
        if (highlightMesh != null)
        {
            MeshFilter highlightFilter = highlightMesh.GetComponent<MeshFilter>();
            if (highlightFilter != null)
            {
                // Create a slightly larger quad that matches the item's aspect ratio
                Mesh highlightQuad = new Mesh();
                
                Vector3[] vertices = new Vector3[4]
                {
                    new Vector3(-(width + highlightMargin)/2, highlightElevation, -(height + highlightMargin)/2),
                    new Vector3((width + highlightMargin)/2, highlightElevation, -(height + highlightMargin)/2),
                    new Vector3(-(width + highlightMargin)/2, highlightElevation, (height + highlightMargin)/2),
                    new Vector3((width + highlightMargin)/2, highlightElevation, (height + highlightMargin)/2)
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
                
                // Make sure the material is applied
                MeshRenderer highlightRenderer = highlightMesh.GetComponent<MeshRenderer>();
                if (highlightRenderer != null && highlightMaterial != null)
                {
                    highlightRenderer.material = highlightMaterial;
                }
            }
        }
        
        // Update selection mesh if it exists
        if (selectionMesh != null)
        {
            MeshFilter selectionFilter = selectionMesh.GetComponent<MeshFilter>();
            if (selectionFilter != null)
            {
                // Create an even larger quad for selection that matches the item's aspect ratio
                Mesh selectionQuad = new Mesh();
                
                Vector3[] vertices = new Vector3[4]
                {
                    new Vector3(-(width + selectionMargin)/2, selectionElevation, -(height + selectionMargin)/2),
                    new Vector3((width + selectionMargin)/2, selectionElevation, -(height + selectionMargin)/2),
                    new Vector3(-(width + selectionMargin)/2, selectionElevation, (height + selectionMargin)/2),
                    new Vector3((width + selectionMargin)/2, selectionElevation, (height + selectionMargin)/2)
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
                
                // Make sure the material is applied
                MeshRenderer selectionRenderer = selectionMesh.GetComponent<MeshRenderer>();
                if (selectionRenderer != null && selectionMaterial != null)
                {
                    selectionRenderer.material = selectionMaterial;
                }
            }
        }
    }
    
    // Update mesh based on aspect ratio to fit within a 1x1 unit square
    private void UpdateMeshForAspectRatio(float aspectRatio)
    {
        float width, height;
        
        if (aspectRatio >= 1f) // Landscape or square
        {
            // Set width to 1, scale height
            width = itemWidth;
            height = width / aspectRatio; 
        }
        else // Portrait
        {
            // Set height to 1, scale width
            height = itemHeight;
            width = height * aspectRatio;
        }
        
        CreateOrUpdateMesh(width, height);
        
        // Update highlight and selection meshes to match the new size
        UpdateHighlightMeshSize();
    }
    
    // Create or update the mesh
    private void CreateOrUpdateMesh(float width, float height)
    {
        if (meshFilter == null) return;
        if (width <= 0 || height <= 0) return;
        
        // Store dimensions for highlight/selection meshes to use
        itemWidth = width;
        itemHeight = height;
        
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
        
        // Update box collider to match book cover dimensions exactly
        UpdateBookCoverCollider(width, height);
        
        // Update highlight and selection meshes to match the new size
        UpdateHighlightMeshSize();
    }
    
    /// <summary>
    /// Update the BookCoverBox child's box collider to exactly match the book cover dimensions
    /// This ensures mouse detection area perfectly fits the visual book cover
    /// </summary>
    private void UpdateBookCoverCollider(float bookWidth, float bookHeight)
    {
        // Find BookCoverBox child (from prefab structure)
        Transform bookCoverBox = transform.Find("BookCoverBox");
        if (bookCoverBox != null)
        {
            BoxCollider childBoxCollider = bookCoverBox.GetComponent<BoxCollider>();
            if (childBoxCollider != null)
            {
                // Set collider size to exactly match book cover (no capping, perfect fit)
                float colliderThickness = 0.1f; // Thin thickness for trigger detection
                childBoxCollider.size = new Vector3(bookWidth, colliderThickness, bookHeight);
                
                // Ensure it's positioned correctly (slightly above the book surface)
                childBoxCollider.center = new Vector3(0, colliderThickness/2, 0);
                
                // Debug.Log($"[ItemView] Updated BookCoverBox collider: {bookWidth:F2} x {bookHeight:F2} for {Model?.Title ?? "Unknown"}");
            }
            else
            {
                Debug.LogWarning($"[ItemView] BookCoverBox found but no BoxCollider component on {name}");
            }
        }
        else
        {
            Debug.LogWarning($"[ItemView] BookCoverBox child not found on {name}");
        }
        
        // Also update main object box collider if it exists (legacy support)
        if (boxCollider != null)
        {
            float colliderThickness = 0.1f;
            boxCollider.size = new Vector3(bookWidth, colliderThickness, bookHeight);
            boxCollider.center = new Vector3(0, colliderThickness/2, 0);
        }
    }
    
    // Set the model and update the view
    public void SetModel(Item newModel)
    {
        // Don't do anything if the model is the same
        if (model == newModel)
            return;
            
        // Unregister from old model
        if (model != null)
        {
            model.UnregisterView(this);
        }
        
        model = newModel;
        
        // Register with new model
        if (model != null)
        {
            model.RegisterView(this);
        }
        
        // Update view with the new model
        UpdateView();
        
        // Trigger event for external listeners
        onItemChanged.Invoke(model);
    }
    
    /// <summary>
    /// Set this item's highlight state. This is typically used for mouse interaction or other highlighting mechanisms.
    /// </summary>
    public void SetHighlighted(bool highlighted)
    {
        // Debug.Log($"[ItemView:{Model?.Title ?? "NULL"}] SetHighlighted({highlighted})"); // REMOVED
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
    
    /// <summary>
    /// Set this item's selection state
    /// </summary>
    public void SetSelected(bool selected)
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
    
    /// <summary>
    /// Set the highlight count for this item.
    /// For now, this just enables/disables the highlight when count > 0,
    /// but in the future it could adjust visual properties based on count.
    /// 
    /// Future enhancement possibilities:
    /// - Vary highlight color intensity based on count
    /// - Increase margin/size of highlight mesh for higher counts
    /// - Add pulsing/animation effects for high counts
    /// - Display numeric indicator for multiple users
    /// 
    /// This method is called by SpaceCraft when highlight state changes
    /// either locally or from networked users.
    /// </summary>
    public void SetHighlightCount(int count)
    {
        highlightCount = count;
        SetHighlighted(highlightCount > 0);
        
        // In future: Adjust highlight appearance based on count
        // if (highlightMesh != null && highlightCount > 0)
        // {
        //     MeshRenderer renderer = highlightMesh.GetComponent<MeshRenderer>();
        //     if (renderer != null && renderer.material != null)
        //     {
        //         // Example of how we could vary appearance by count:
        //         // float intensity = Mathf.Min(0.5f + (0.1f * highlightCount), 1.0f);
        //         // renderer.material.color = new Color(highlightColor.r, highlightColor.g, highlightColor.b, intensity);
        //         
        //         // Example of how to scale highlight size with count:
        //         // float scale = 1.0f + (0.05f * highlightCount);
        //         // highlightMesh.transform.localScale = new Vector3(scale, 1f, scale);
        //     }
        // }
    }
    
    /// <summary>
    /// Check if the item is currently scaling (useful for physics interactions)
    /// </summary>
    public bool IsScaling => !Mathf.Approximately(currentScale, viewScale);
    
    /// <summary>
    /// Get the relative size category for physics interactions
    /// Useful for determining how this book should interact with others in the landscape
    /// </summary>
    public string GetSizeCategory()
    {
        if (viewScale >= 2.0f) return "mountain";      // Big books - create terrain features
        if (viewScale >= 1.2f) return "hill";         // Medium books - gentle slopes  
        if (viewScale >= 0.6f) return "ground";       // Normal books - flat terrain
        if (viewScale >= 0.3f) return "pebble";       // Small books - roll easily
        return "grain";                                // Tiny books - roll into cracks
    }
    
    /// <summary>
    /// Calculate the physics mass that should be used based on current scale
    /// All items now have the same mass for equal physics response
    /// </summary>
    public float GetPhysicsMass()
    {
        // Fixed mass for all items regardless of scale
        return 1.0f;
    }
    
    /// <summary>
    /// Set scale immediately without transition (useful for initialization)
    /// </summary>
    public void SetScaleImmediate(float scale)
    {
        viewScale = Mathf.Clamp(scale, minViewScale, maxViewScale);
        currentScale = viewScale;
        transform.localScale = Vector3.one * currentScale;
    }
} 