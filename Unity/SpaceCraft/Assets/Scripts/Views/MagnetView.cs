using System;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using UnityEngine.Events;

/// <summary>
/// Displays a single magnet as a 3D object in the scene.
/// Inherits physics behavior, scaling, and component management from BaseView.
/// </summary>
public class MagnetView : BaseView
{
    [Header("═══════════════════════════════════════")]
    [Header("MAGNET PROPERTIES (Editable)")]
    [Header("═══════════════════════════════════════")]
    
    [ExposedParameter(Category = "Display", Description = "Display name", Unit = "")]
    public string magnetName
    {
        get => DisplayText;
        set => DisplayText = value;
    }
    

    
    [ExposedParameter("Strength", 
        Category = "Magnet Field", 
        Description = "Magnetic field strength for attraction/repulsion effects", 
        Min = -100f, Max = 100f, Step = 0.1f)]
    [Tooltip("Magnetic field strength for attraction/repulsion effects (future implementation)")]
    [Range(0f, 100f)]
    [SerializeField] public float magnetStrength = 1.0f;
    
    [ExposedParameter("Radius", 
        Category = "Magnet Field", 
        Description = "Effective radius of magnetic field influence", 
        Min = 1f, Max = 1000f, Step = 1f, Unit = "units")]
    [Tooltip("Effective radius of magnetic field influence")]
    [Range(1f, 1000f)]
    [SerializeField] public float magnetRadius = 100f;
    
    [ExposedParameter("Softness", 
        Category = "Magnet Field", 
        Description = "How gradually the magnetic field effect falls off with distance", 
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Tooltip("How gradually the magnetic field effect falls off with distance (0 = hard edge, 1 = very soft)")]
    [Range(0f, 1f)]
    [SerializeField] public float magnetSoftness = 0.5f;
    
    [Header("UI References")]
    // Uses labelText from BaseView (now properly typed as TextMeshPro)
    
    [Header("Materials")]
    [SerializeField] public Material magnetMaterial;



    protected override void Awake()
    {
        // Set magnet-appropriate defaults before calling base
        mass = 2.0f;         // Magnets are heavier than books
        linearDrag = 3.0f;          // Magnets have lots of drag (dense metal)
        angularDrag = 8.0f;         // High rotational resistance
        staticFriction = 50.0f;     // EXTREMELY hard to start moving
        dynamicFriction = 40.0f;    // EXTREMELY high resistance when moving
        viewScale = 4.0f;           // Magnets are bigger than books by default
        
        // Call base Awake to initialize components and physics
        base.Awake();
        
        // Initialize name display
        // UpdateNameDisplay(); // This is now handled by BaseView
        
        // Initialize physics material
        UpdatePhysicsMaterial();
    }

    private void Start()
    {
        Debug.Log($"MagnetView: Start() called for magnet with initial name: '{magnetName}'");
        
        // Create the visual mesh and apply permanent magnet material
        ApplyMagnetMaterial();
        
        // Initialize name display
        UpdateDisplay();
        
        // Initialize physics material
        UpdatePhysicsMaterial();
    }
    
    /// <summary>
    /// Apply the permanent magnet material and create the visual mesh
    /// </summary>
    private void ApplyMagnetMaterial()
    {
        if (magnetMaterial != null)
        {
            ApplyMaterial(magnetMaterial);
        }
        else
        {
            // Fall back to the same gray material as loading material
            Material material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.color = Color.gray;
            ApplyMaterial(material);
        }
        
        // Create the mesh geometry (magnets are square by default)
        UpdateMeshForAspectRatio(aspectRatio);
    }

    /// <summary>
    /// Teleports magnet to pan center (initial positioning)
    /// </summary>
    public void MoveToPanCenter()
    {
        Vector2 panCenter = SpaceCraft.Instance.InputManager.GetPanCenter();
        Debug.Log($"MagnetView: MoveToPanCenter: magnetName: {magnetName} panCenter: {panCenter.x} {panCenter.y}");
        transform.position = new Vector3(panCenter.x, transform.position.y, panCenter.y);
    }
    
    /// <summary>
    /// Teleports magnet to specific position (initial positioning)
    /// </summary>
    public void SetPosition(float x, float y)
    {
        Debug.Log($"MagnetView: MovePosition: magnetName: {magnetName} x: {x} y: {y}");
        transform.position = new Vector3(x, transform.position.y, y);
    }
    
    /// <summary>
    /// Applies a world coordinate offset to the magnet using physics position
    /// </summary>
    public void PushPosition(float xDelta, float yDelta)
    {
        if (rigidBody == null) return;
        
        Debug.Log($"MagnetView: PushPosition: magnetName: {magnetName} xDelta: {xDelta} yDelta: {yDelta}");
        
        Vector3 newPosition = transform.position + new Vector3(xDelta, 0, yDelta);
        rigidBody.MovePosition(newPosition);
    }
    

    
    /// <summary>
    /// Updates the physics material properties based on current magnet settings
    /// </summary>
    protected override void UpdatePhysicsMaterial()
    {
        if (rigidBody != null)
        {
            // Mass is now handled by BaseView physics system
            // Physics material is also handled by BaseView
            
            // Just call the base class physics material update
            base.UpdatePhysicsMaterial();
        }
    }

    /// <summary>
    /// Get default dimensions for magnets - square by default
    /// </summary>
    protected override (float defaultWidth, float defaultHeight) GetDefaultDimensions()
    {
        return (1.2f, 1.2f); // Square magnet dimensions
    }

    // BaseView abstract method implementations
    
    /// <summary>
    /// Calculate target scale for magnets - just use the base viewScale for now
    /// </summary>
    protected override float CalculateTargetScale()
    {
        return viewScale; // Magnets don't have selection scaling like items
    }
    
    /// <summary>
    /// FixedUpdate - Updates physics properties each fixed timestep
    /// </summary>
    private void FixedUpdate()
    {
        // Physics material is now handled by BaseView
        // Just ensure our material is up to date
        UpdatePhysicsMaterial();
    }
}
