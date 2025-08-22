using System;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using UnityEngine.Events;

/// <summary>
/// Displays a single Item model as a 3D object in the scene.
/// Pure presentation component that doesn't handle any loading or serialization.
/// Inherits physics behavior, scaling, and component management from BaseView.
/// </summary>
public class ItemView : BaseView, IModelView<Item>
{
    [Header("Model Reference")]
    [SerializeField] private Item model;
    
    [Header("Item Display")]
    [SerializeField] private float itemWidth = 1.4f;
    [SerializeField] private float itemHeight = 1.0f;

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
    
    // Public accessors for state are now inherited from BaseView
    
    protected override void Awake()
    {
        // Set book-appropriate physics defaults before calling base
        mass = 1.0f;         // Books are lighter than magnets
        linearDrag = 0.5f;          // Books have less drag (paper, aerodynamic)
        angularDrag = 2.0f;         // Lower rotational resistance
        staticFriction = 0.5f;      // Easier to start moving (smooth covers)
        dynamicFriction = 0.3f;     // Low resistance when sliding
        
        // Call base awake to handle component caching and physics setup
        base.Awake();
        
        // Note: We don't create the highlight/selection meshes here anymore
        // They will be created lazily when needed in SetHighlighted/SetSelected
        
        if (model != null)
        {
            // Register with model on awake
            model.RegisterView(this);
        }
    }
    
    protected override void Update()
    {
        // Update tap scale decay
        UpdateTapScaleDecay();
        
        // Call base Update for normal scaling animation
        base.Update();
    }
    
    public override void SetSelected(bool selected)
    {
        // Reset tap scale when deselected
        if (!selected && isSelected)
        {
            ResetTapScale();
        }
        
        // Call base SetSelected
        base.SetSelected(selected);
    }
    


    
    public override void OnDestroy()
    {
        if (model != null)
        {
            // Unregister when view is destroyed
            model.UnregisterView(this);
        }
        
        // Call base OnDestroy to ensure proper cleanup
        base.OnDestroy();
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
        
        // Set display text from model using BaseView property
        DisplayText = model.Title;
        
        // Apply texture if available
        if (model.cover != null)
        {
            ApplyTexture(model.cover);
        }
        else
        {
            // Apply placeholder and request texture loading from Brewster
            ApplyLoadingMaterial();
            
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
        
        // Use BaseView method to apply material
        ApplyMaterial(material);
        
        // Update mesh to match texture dimensions
        float aspectRatio = (float)texture.width / texture.height;
        UpdateMeshForAspectRatio(aspectRatio);
        
        // Highlight and selection materials are now managed by BaseView
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

        // Item content change can affect magnet scoring (title/desc/creator/subject)
        SpaceCraft.BumpMagnetScoresEpoch();
    }
    

    

    
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
    

    
    // BaseView abstract method implementations
    
    /// <summary>
    /// Calculate target scale for items - applies selection multiplier if selected
    /// </summary>
    protected override float CalculateTargetScale()
    {
        float targetScale = viewScale;
        
        // Apply selection scale multiplier if this item is selected
        if (isSelected && SpaceCraft.Instance?.InputManager != null)
        {
            targetScale *= SpaceCraft.Instance.InputManager.SelectionScale;
        }
        
        // Apply tap scale multiplier if this item has been tapped
        if (tapScaleMultiplier > 1.0f)
        {
            targetScale *= tapScaleMultiplier;
        }
        
        return targetScale;
    }
    
    // Tap scaling system - allows cumulative tap scaling
    private float tapScaleMultiplier = 1.0f;
    private float tapScaleDecayRate = 0.95f; // Decay per second
    private float lastTapTime = 0f;
    
    /// <summary>
    /// Apply tap scaling that accumulates and decays over time
    /// </summary>
    public void ApplyTapScale(float tapScale)
    {
        // Multiply the current tap scale multiplier
        tapScaleMultiplier *= tapScale;
        lastTapTime = Time.time;
        
        Debug.Log($"[ItemView] Applied tap scale {tapScale}, new multiplier: {tapScaleMultiplier}");
    }
    
    /// <summary>
    /// Update tap scale decay - called from Update
    /// </summary>
    private void UpdateTapScaleDecay()
    {
        if (tapScaleMultiplier > 1.0f)
        {
            // Decay the tap scale multiplier over time
            float timeSinceLastTap = Time.time - lastTapTime;
            if (timeSinceLastTap > 0.1f) // Start decaying after 0.1 seconds
            {
                tapScaleMultiplier = Mathf.Lerp(tapScaleMultiplier, 1.0f, tapScaleDecayRate * Time.deltaTime);
                
                // Snap to 1.0 when very close to avoid floating point issues
                if (Mathf.Abs(tapScaleMultiplier - 1.0f) < 0.01f)
                {
                    tapScaleMultiplier = 1.0f;
                }
            }
        }
    }
    
    /// <summary>
    /// Reset tap scale multiplier (called when item is deselected)
    /// </summary>
    public void ResetTapScale()
    {
        tapScaleMultiplier = 1.0f;
        Debug.Log($"[ItemView] Reset tap scale multiplier for {name}");
    }
    
    /// <summary>
    /// Get default dimensions for items - standard book proportions
    /// </summary>
    protected override (float defaultWidth, float defaultHeight) GetDefaultDimensions()
    {
        return (itemWidth, itemHeight);
    }
} 