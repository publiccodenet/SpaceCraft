using System;
using System.Collections.Generic;
using System.Linq;
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
    
    // ================== IDENTITY ==================
    [ExposedParameter(Category = "Identity", Description = "Unique magnet identifier", Unit = "", Default = "", Visible = true)]
    public string magnetId = "";
    
    [ExposedParameter(Category = "Identity", Description = "User-visible title", Unit = "", Default = "", Visible = true)]
    public string title
    {
        get => DisplayText;
        set => DisplayText = value;
    }
    
    // ================== SEARCH ==================
    [SerializeField] private string _searchExpression = "";
    [ExposedParameter(Category = "Search", Description = "Search expression for this magnet", Unit = "", Default = "", Visible = true)]
    public string searchExpression
    {
        get => _searchExpression;
        set
        {
            if (_searchExpression == value) return;
            _searchExpression = value;
            Debug.Log($"[MagnetView] searchExpression set: '{_searchExpression}' on {name}");
            InvalidateScores(tokensToo: true);
            SpaceCraft.BumpMagnetScoresEpoch();
        }
    }
    
    [SerializeField] private string _searchType = "fuzzy";
    [ExposedParameter(Category = "Search", Description = "Type of search (fuzzy, exact, etc.)", Unit = "", Default = "fuzzy", Visible = true)]
    public string searchType
    {
        get => _searchType;
        set
        {
            if (_searchType == value) return;
            _searchType = value;
            Debug.Log($"[MagnetView] searchType set: '{_searchType}' on {name}");
            InvalidateScores(tokensToo: true);
            SpaceCraft.BumpMagnetScoresEpoch();
        }
    }
    
    [ExposedParameter(
        Category = "Search", 
        Description = "Whether magnet is enabled", 
        Unit = "", 
        Default = true, 
        Visible = true
    )]
    public new bool enabled = true;
    
    // ================== MAGNETIC FIELD ==================

    [ExposedParameter("Magnet Enabled", 
        Category = "Magnetic Field", 
        Description = "Whether the magnetic field is active", Default = true, Visible = true,
        Unit = "")]
    [SerializeField] public bool magnetEnabled = true;
    
    [ExposedParameter("Magnet Strength", 
        Category = "Magnetic Field", 
        Description = "Strength of the magnetic field", Default = 50f, Visible = true,
        Min = 0f, Max = 100f, Step = 0.1f)]
    [Range(0f, 100f)]
    [SerializeField] public float magnetStrength = 50f;
    
    [ExposedParameter("Magnet Radius", 
        Category = "Magnetic Field", 
        Description = "Effective radius of magnetic field influence", Default = 100f, Visible = true,
        Min = 1f, Max = 1000f, Step = 1f, Unit = "units")]
    [Tooltip("Effective radius of magnetic field influence")]
    [Range(1f, 1000f)]
    [SerializeField] public float magnetRadius = 100f;
    
    [ExposedParameter("Magnet Softness", 
        Category = "Magnetic Field", 
        Description = "How gradually the magnetic field effect falls off with distance", Default = 0f, Visible = true,
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Tooltip("How gradually the magnetic field effect falls off with distance (0 = hard edge, 1 = very soft)")]
    [Range(0f, 1f)]
    [SerializeField] public float magnetSoftness = 0f;
    
    [ExposedParameter("Magnet Hole Radius", 
        Category = "Magnetic Field", 
        Description = "Radius of the magnet's hole/center", Default = 0f, Visible = true,
        Min = 0f, Max = 100f, Step = 0.1f, Unit = "units")]
    [Range(0f, 100f)]
    [SerializeField] public float magnetHoleRadius = 0f;

    [ExposedParameter("Magnet Hole Strength",
        Category = "Magnetic Field",
        Description = "Strength of force inside the hole (0 disables). Can be negative to push outward and form rings.", Default = 0f, Visible = true,
        Min = -100f, Max = 100f, Step = 0.1f)]
    [SerializeField] public float magnetHoleStrength = -50f;
    
    [SerializeField] private float _scoreMin = 0.25f;
    [ExposedParameter("Score Min", 
        Category = "Magnetic Field", 
        Description = "Minimum relevance score for items to be affected by this magnet", Default = 0.25f, Visible = true,
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Range(0f, 1f)]
    public float scoreMin
    {
        get => _scoreMin;
        set
        {
            float v = Mathf.Clamp01(value);
            if (Mathf.Approximately(_scoreMin, v)) return;
            _scoreMin = v;
            // eligibility window changed; scores remain valid but IsItemEligible decisions change
            // No cache invalidation needed; keep fast-path
        }
    }
    
    [SerializeField] private float _scoreMax = 1f;
    [ExposedParameter("Score Max", 
        Category = "Magnetic Field", 
        Description = "Maximum relevance score for items to be affected by this magnet", Default = 1f, Visible = true,
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Range(0f, 1f)]
    public float scoreMax
    {
        get => _scoreMax;
        set
        {
            float v = Mathf.Clamp01(value);
            if (Mathf.Approximately(_scoreMax, v)) return;
            _scoreMax = v;
            // eligibility window changed; scores remain valid but IsItemEligible decisions change
            // No cache invalidation needed; keep fast-path
        }
    }
    
    // ================== VISUAL ==================
    [ExposedParameter("View Scale", 
        Category = "Visual", 
        Description = "Target scale for the magnet", Default = 1f, Visible = true,
        Min = 0.1f, Max = 20f, Step = 0.1f)]
    [Range(0.1f, 20f)]
    [SerializeField] public new float viewScale = 1f;
    
    [ExposedParameter("Initial Scale", 
        Category = "Visual", 
        Description = "Starting scale for the magnet", Default = 0.01f, Visible = true,
        Min = 0.01f, Max = 10f, Step = 0.01f)]
    [Range(0.01f, 10f)]
    [SerializeField] public float viewScaleInitial = 0.01f;
    
    [Header("UI References")]
    // Uses labelText from BaseView (now properly typed as TextMeshPro)
    
    [Header("Materials")]
    [SerializeField] public Material magnetMaterial;
    
    // ================== SCORING CACHE ==================
    [Header("Scoring Cache")]
    [SerializeField] private Dictionary<string, float> itemScoreCache = new Dictionary<string, float>();
    private bool cacheValid = false;
    private int localEpoch = -1;
    private string[] cachedSearchTokens = null;
    
    protected override void Awake()
    {
        // Set magnet-appropriate defaults before calling base
        // Note: These are now public fields that can be set from JS
        // mass, staticFriction, dynamicFriction are now public fields
        
        // Set initial scale to tiny, target to full size
        currentScale = viewScaleInitial;
        
        // Call base Awake to initialize components and physics
        base.Awake();
        
        // Initialize physics material
        UpdatePhysicsMaterial();
    }

    private void Start()
    {
        Debug.Log($"MagnetView: Start() called for magnet with initial title: '{title}'");
        
        // Debug physics settings
        if (rigidBody != null)
        {
            Debug.Log($"[MagnetView] Physics on {name}: mass={mass}, linearDrag={linearDrag}, angularDrag={angularDrag}, isKinematic={isKinematic}");
            Debug.Log($"[MagnetView] Rigidbody on {name}: mass={rigidBody.mass}, drag={rigidBody.linearDamping}, angularDrag={rigidBody.angularDamping}, isKinematic={rigidBody.isKinematic}");
            Debug.Log($"[MagnetView] ALIASES CHECK: linearDamping={rigidBody.linearDamping}, angularDamping={rigidBody.angularDamping}");
        }
        
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
        Debug.Log($"MagnetView: MoveToPanCenter: title: {title} panCenter: {panCenter.x} {panCenter.y}");
        transform.position = new Vector3(panCenter.x, transform.position.y, panCenter.y);
    }
    
    /// <summary>
    /// Calculate relevance score for an item based on this magnet's search expression
    /// </summary>
    public float CalculateItemScore(Item item)
    {
        if (item == null) return 0f;

        EnsureCacheValid();
        if (string.IsNullOrEmpty(searchExpression)) return 0f;
        
        // Check if we have a cached score
        if (itemScoreCache.TryGetValue(item.Id, out float cachedScore))
        {
            return cachedScore;
        }
        
        // Calculate score using cached tokens
        if (cachedSearchTokens == null)
        {
            cachedSearchTokens = TokenizeAndNormalize(searchExpression);
        }
        float score = CalculateRelevanceScore(item, cachedSearchTokens);
        
        // Cache the result
        itemScoreCache[item.Id] = score;
        // Debug log first time we compute a given item's score for this magnet
        Debug.Log($"[MagnetView] Computed score for item '{item.Id}' with search='{searchExpression}', type='{searchType}': {score:0.000}");
        
        return score;
    }
    
    /// <summary>
    /// Check if an item is eligible for this magnet's influence
    /// </summary>
    public bool IsItemEligible(Item item)
    {
        if (!magnetEnabled || item == null) return false;
        
        float score = CalculateItemScore(item);
        return score >= scoreMin && score <= scoreMax;
    }
    
    /// <summary>
    /// Apply magnetic force to an item based on distance and relevance
    /// </summary>
    public Vector3 CalculateMagneticForce(ItemView itemView, Vector3 itemPosition)
    {
        if (!magnetEnabled || itemView?.Model == null) return Vector3.zero;
        
        // Check eligibility by score window
        if (!IsItemEligible(itemView.Model)) return Vector3.zero;
        
        Vector3 magnetPosition = transform.position;
        Vector3 toMagnet = magnetPosition - itemPosition;
        float distance = toMagnet.magnitude;
        
        // Skip if too close to avoid jitter
        if (distance < 0.0001f) return Vector3.zero;
        
        // Radial boundaries
        float innerR = Mathf.Max(0f, magnetHoleRadius);
        float outerR = Mathf.Max(innerR, magnetRadius);
        if (distance >= outerR) return Vector3.zero; // beyond influence
        
        // Modulate by similarity score (0..1)
        float score = CalculateItemScore(itemView.Model);
        float scoreMultiplier = Mathf.Clamp01(score);
        
        // HANDLE HOLE FORCE (inside the hole)
        if (distance < innerR && Mathf.Abs(magnetHoleStrength) > 0.001f)
        {
            // Inside the hole - apply hole force
            float holeU = distance / Mathf.Max(innerR, 0.0001f); // 0 at center, 1 at hole edge
            
            // Apply softness to hole edge
            float s = Mathf.Clamp01(magnetSoftness);
            float holeEdgeWidth = 0.5f * s;
            float holeEdgeFactor;
            
            if (holeEdgeWidth > 0f)
            {
                // Soft edge: force fades out as we approach hole boundary
                holeEdgeFactor = 1f - SmoothStep(1f - holeEdgeWidth, 1f, holeU);
            }
            else
            {
                // Sharp edge: full force until hole boundary
                holeEdgeFactor = 1f;
            }
            
            float holeForceStrength = magnetHoleStrength * holeEdgeFactor * scoreMultiplier;
            return toMagnet.normalized * holeForceStrength;
        }
        
        // HANDLE OUTER RING FORCE (between hole and outer radius)
        if (distance >= innerR && distance < outerR)
        {
            // Normalize radial position between edges
            float u = (distance - innerR) / Mathf.Max(outerR - innerR, 0.0001f); // u in (0,1)
            
            // Softness controls the width of softened ramps on both edges
            float s = Mathf.Clamp01(magnetSoftness);
            float edgeWidth = 0.5f * s; // 0 = sharp; 0.5 = widest ramps
            
            // Inner ramp (apply only if inner region is present)
            float a;
            if (innerR > 0f && edgeWidth > 0f)
            {
                a = SmoothStep(0f, edgeWidth, u);
            }
            else
            {
                a = (u > 0f) ? 1f : 0f; // sharp edge at inner boundary
            }
            
            // Outer ramp (always present)
            float b;
            if (edgeWidth > 0f)
            {
                b = 1f - SmoothStep(1f - edgeWidth, 1f, u);
            }
            else
            {
                b = (u < 1f) ? 1f : 0f; // sharp edge at outer boundary
            }
            
            // Combined edge factor: rises from 0 after inner edge, falls to 0 near outer edge
            float edgeFactor = Mathf.Clamp01(a * b);
            
            float forceStrength = magnetStrength * edgeFactor * scoreMultiplier;
            return toMagnet.normalized * forceStrength;
        }
        
        return Vector3.zero;
    }

    // Cubic Hermite smoothstep
    private static float SmoothStep(float edge0, float edge1, float x)
    {
        if (edge1 <= edge0) return (x >= edge1) ? 1f : 0f;
        float t = Mathf.Clamp01((x - edge0) / (edge1 - edge0));
        return t * t * (3f - 2f * t);
    }
    
    /// <summary>
    /// Clear the scoring cache
    /// </summary>
    public void ClearScoreCache()
    {
        itemScoreCache.Clear();
        Debug.Log($"[MagnetView] Cleared score cache for magnet: {title}");
    }

    private void InvalidateScores(bool tokensToo = false)
    {
        cacheValid = false;
        if (tokensToo) cachedSearchTokens = null;
    }

    private void EnsureCacheValid()
    {
        if (localEpoch != SpaceCraft.MagnetScoresEpoch || !cacheValid)
        {
            ClearScoreCache();
            localEpoch = SpaceCraft.MagnetScoresEpoch;
            cacheValid = true;
        }
    }
    
    // Helper methods for scoring (copied from InputManager)
    private string[] TokenizeAndNormalize(string text)
    {
        if (string.IsNullOrEmpty(text)) return new string[0];
        
        return text.ToLowerInvariant()
            .Split(new char[] { ' ', '\t', '\n', '\r', ',', '.', '!', '?', ';', ':', '-', '_', '(', ')', '[', ']', '{', '}', '"', '\'' }, 
                   StringSplitOptions.RemoveEmptyEntries)
            .Where(token => token.Length > 0)
            .ToArray();
    }
    
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
                    // Exact substring match
                    matchScore = 1.0f;
                }
                else if (searchToken.Contains(itemToken))
                {
                    // Reverse substring match
                    matchScore = 0.8f;
                }
                else
                {
                    // Fuzzy match using Levenshtein distance
                    int maxLength = Mathf.Max(searchToken.Length, itemToken.Length);
                    if (maxLength == 0) continue;
                    
                    int distance = CalculateLevenshteinDistance(searchToken, itemToken);
                    float similarity = 1f - ((float)distance / maxLength);
                    
                    // Only count as match if similarity is above threshold
                    if (similarity > 0.6f)
                    {
                        matchScore = similarity * 0.6f; // Fuzzy matches are worth less than exact matches
                    }
                    else
                    {
                        continue; // No match
                    }
                }
                
                bestMatchScore = Mathf.Max(bestMatchScore, matchScore);
            }
            
            if (bestMatchScore > 0f)
            {
                totalScore += bestMatchScore;
                matchCount++;
            }
        }
        
        // Normalize score by number of search tokens
        return matchCount > 0 ? totalScore / searchTokens.Length : 0f;
    }
    
    private int CalculateLevenshteinDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source))
        {
            return string.IsNullOrEmpty(target) ? 0 : target.Length;
        }
        
        if (string.IsNullOrEmpty(target))
        {
            return source.Length;
        }
        
        int[,] distance = new int[source.Length + 1, target.Length + 1];
        
        for (int i = 0; i <= source.Length; i++)
        {
            distance[i, 0] = i;
        }
        
        for (int j = 0; j <= target.Length; j++)
        {
            distance[0, j] = j;
        }
        
        for (int i = 1; i <= source.Length; i++)
        {
            for (int j = 1; j <= target.Length; j++)
            {
                int cost = source[i - 1] == target[j - 1] ? 0 : 1;
                distance[i, j] = Mathf.Min(
                    distance[i - 1, j] + 1,      // deletion
                    distance[i, j - 1] + 1,      // insertion
                    distance[i - 1, j - 1] + cost // substitution
                );
            }
        }
        
        return distance[source.Length, target.Length];
    }
    
    /// <summary>
    /// Teleports magnet to specific position (initial positioning)
    /// </summary>
    public void MovePosition(float x, float y)
    {
        Debug.Log($"MagnetView: MovePosition: title: {title} x: {x} y: {y}");
        transform.position = 
            new Vector3(x, transform.position.y, y);
    }
    
    /// <summary>
    /// Applies a world coordinate offset to the magnet using physics position
    /// </summary>
    public void PushPosition(float xDelta, float yDelta)
    {
        if (rigidBody == null) return;
        
        Debug.Log($"MagnetView: PushPosition: title: {title} xDelta: {xDelta} yDelta: {yDelta}");
        
        Vector3 newPosition = 
            transform.position + 
            new Vector3(xDelta, 0, yDelta);
        rigidBody.MovePosition(newPosition);
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
    /// Calculate target scale for magnets - IMMEDIATE sizing, no animation
    /// </summary>
    protected override float CalculateTargetScale()
    {
        return viewScale; // Magnets don't have selection scaling like items
    }
    
    /// <summary>
    /// FixedUpdate - Updates physics properties each fixed timestep
    /// </summary>
    protected override void FixedUpdate()
    {
        base.FixedUpdate();
        // No magnet-specific override of Rigidbody mass/drag here; BaseView handles sync.
        // Ensure non-kinematic if not explicitly kinematic
        if (rigidBody != null && !isKinematic && rigidBody.isKinematic)
        {
            rigidBody.isKinematic = false;
        }
        // Physics material is now handled by BaseView
        // Just ensure our material is up to date
        UpdatePhysicsMaterial();
    }
}
