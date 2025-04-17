using System;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using UnityEngine.Events;

/// <summary>
/// Displays a single Item model as a 3D object in the scene.
/// Pure presentation component that doesn't handle any loading or serialization.
/// </summary>
[AddComponentMenu("Views/Item View")]
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
    
    // State
    private bool isHighlighted = false;
    private bool isSelected = false;
    private Material originalMaterial;
    private int highlightCount = 0;
    
    // Cached component references
    private MeshFilter meshFilter;
    private MeshRenderer meshRenderer;
    private BoxCollider boxCollider;
    
    // Collection context
    [SerializeField] private string collectionId;
    
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
        
        // Note: We don't create the highlight/selection meshes here anymore
        // They will be created lazily when needed in SetHighlighted/SetSelected
        
        if (model != null)
        {
            // Register with model on awake
            model.RegisterView(this);
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
        if (texture == null || meshRenderer == null) return;
        
        // Create material and apply texture
        Material material = new Material(Shader.Find("Unlit/Texture"));
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
        
        // Update collider if present
        if (boxCollider != null)
        {
            // Calculate collider size based on visual size, capping width at 1.0
            float colliderWidth = Mathf.Min(1f, width);
            float colliderHeight = height; // Use visual height directly
            float colliderThickness = 0.1f; // Keep thickness small

            boxCollider.size = new Vector3(colliderWidth, colliderThickness, colliderHeight);
            // Optional: Adjust center if needed, but likely okay at 0,0,0 if mesh is centered
            // boxCollider.center = Vector3.zero; 
        }
        
        // Update highlight and selection meshes to match the new size
        UpdateHighlightMeshSize();
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
    /// This method is called by SpaceShipBridge when highlight state changes
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
} 