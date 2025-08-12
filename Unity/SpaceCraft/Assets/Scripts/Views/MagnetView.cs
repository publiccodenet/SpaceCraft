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
    [ExposedParameter(Category = "Identity", Description = "Unique magnet identifier", Unit = "")]
    public string magnetId = "";
    
    [ExposedParameter(Category = "Identity", Description = "User-visible title", Unit = "")]
    public string title
    {
        get => DisplayText;
        set => DisplayText = value;
    }
    
    // ================== SEARCH ==================
    [ExposedParameter(Category = "Search", Description = "Search expression for this magnet", Unit = "")]
    public string searchExpression = "";
    
    [ExposedParameter(Category = "Search", Description = "Type of search (fuzzy, exact, etc.)", Unit = "")]
    public string searchType = "fuzzy";
    
    [ExposedParameter(Category = "Search", Description = "Whether magnet is enabled", Unit = "")]
    public new bool enabled = true;
    
    // ================== PHYSICS ==================
    [ExposedParameter("Mass", 
        Category = "Physics", 
        Description = "Mass of the magnet", 
        Min = 0.1f, Max = 100f, Step = 0.1f)]
    [Range(0.1f, 100f)]
    [SerializeField] public new float mass = 2.0f;
    
    [ExposedParameter("Static Friction", 
        Category = "Physics", 
        Description = "Static friction coefficient", 
        Min = 0f, Max = 100f, Step = 0.1f)]
    [Range(0f, 100f)]
    [SerializeField] public new float staticFriction = 50.0f;
    
    [ExposedParameter("Dynamic Friction", 
        Category = "Physics", 
        Description = "Dynamic friction coefficient", 
        Min = 0f, Max = 100f, Step = 0.1f)]
    [Range(0f, 100f)]
    [SerializeField] public new float dynamicFriction = 40.0f;
    
    // ================== MAGNETIC FIELD ==================

    [ExposedParameter("Magnet Enabled", 
        Category = "Magnetic Field", 
        Description = "Whether the magnetic field is active", 
        Unit = "")]
    [SerializeField] public bool magnetEnabled = true;
    
    [ExposedParameter("Magnet Strength", 
        Category = "Magnetic Field", 
        Description = "Strength of the magnetic field", 
        Min = 0f, Max = 100f, Step = 0.1f)]
    [Range(0f, 100f)]
    [SerializeField] public float magnetStrength = 1.0f;
    
    [ExposedParameter("Magnet Radius", 
        Category = "Magnetic Field", 
        Description = "Effective radius of magnetic field influence", 
        Min = 1f, Max = 1000f, Step = 1f, Unit = "units")]
    [Tooltip("Effective radius of magnetic field influence")]
    [Range(1f, 1000f)]
    [SerializeField] public float magnetRadius = 100f;
    
    [ExposedParameter("Magnet Softness", 
        Category = "Magnetic Field", 
        Description = "How gradually the magnetic field effect falls off with distance", 
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Tooltip("How gradually the magnetic field effect falls off with distance (0 = hard edge, 1 = very soft)")]
    [Range(0f, 1f)]
    [SerializeField] public float magnetSoftness = 0.5f;
    
    [ExposedParameter("Magnet Hole Radius", 
        Category = "Magnetic Field", 
        Description = "Radius of the magnet's hole/center", 
        Min = 0f, Max = 100f, Step = 0.1f, Unit = "units")]
    [Range(0f, 100f)]
    [SerializeField] public float magnetHoleRadius = 10f;
    
    [ExposedParameter("Score Min", 
        Category = "Magnetic Field", 
        Description = "Minimum relevance score for items to be affected by this magnet", 
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Range(0f, 1f)]
    [SerializeField] public float scoreMin = 0.0f;
    
    [ExposedParameter("Score Max", 
        Category = "Magnetic Field", 
        Description = "Maximum relevance score for items to be affected by this magnet", 
        Min = 0f, Max = 1f, Step = 0.01f)]
    [Range(0f, 1f)]
    [SerializeField] public float scoreMax = 1.0f;
    
    // ================== VISUAL ==================
    [ExposedParameter("View Scale", 
        Category = "Visual", 
        Description = "Target scale for the magnet", 
        Min = 0.1f, Max = 20f, Step = 0.1f)]
    [Range(0.1f, 20f)]
    [SerializeField] public new float viewScale = 4.0f;
    
    [ExposedParameter("Initial Scale", 
        Category = "Visual", 
        Description = "Starting scale for the magnet", 
        Min = 0.01f, Max = 10f, Step = 0.01f)]
    [Range(0.01f, 10f)]
    [SerializeField] public float initialScale = 0.01f;
    
    [Header("UI References")]
    // Uses labelText from BaseView (now properly typed as TextMeshPro)
    
    [Header("Materials")]
    [SerializeField] public Material magnetMaterial;
    
    // ================== SCORING CACHE ==================
    [Header("Scoring Cache")]
    [SerializeField] private Dictionary<string, float> itemScoreCache = new Dictionary<string, float>();
    [SerializeField] private float lastCacheUpdateTime = 0f;
    [SerializeField] private const float CACHE_UPDATE_INTERVAL = 1.0f; // Update cache every second
    
    /// <summary>
    /// Set the initial and target scales for this magnet
    /// </summary>
    /// <param name="initial">Starting scale</param>
    /// <param name="target">Final scale</param>
    public void SetScales(float initial, float target)
    {
        initialScale = initial;
        viewScale = target;
        currentScale = initialScale;
        Debug.Log($"[MagnetView] SetScales: {title} initial={initialScale}, target={viewScale}");
    }
    
    protected override void Awake()
    {
        // Set magnet-appropriate defaults before calling base
        // Note: These are now public fields that can be set from JS
        // mass, staticFriction, dynamicFriction are now public fields
        
        // Set initial scale to tiny, target to full size
        currentScale = initialScale;
        
        // Call base Awake to initialize components and physics
        base.Awake();
        
        // Initialize physics material
        UpdatePhysicsMaterial();
    }

    private void Start()
    {
        Debug.Log($"MagnetView: Start() called for magnet with initial title: '{title}'");
        
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
        if (string.IsNullOrEmpty(searchExpression) || item == null) return 0f;
        
        // Check if we have a cached score
        if (itemScoreCache.TryGetValue(item.Id, out float cachedScore))
        {
            return cachedScore;
        }
        
        // Calculate score using the same logic as InputManager
        string[] searchTokens = TokenizeAndNormalize(searchExpression);
        float score = CalculateRelevanceScore(item, searchTokens);
        
        // Cache the result
        itemScoreCache[item.Id] = score;
        
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
        
        // Check eligibility
        if (!IsItemEligible(itemView.Model)) return Vector3.zero;
        
        Vector3 magnetPosition = transform.position;
        Vector3 toMagnet = magnetPosition - itemPosition;
        float distance = toMagnet.magnitude;
        
        // Skip if too close to avoid jitter
        if (distance < 0.01f) return Vector3.zero;
        
        // Calculate force based on distance and magnet properties
        float forceStrength = 0f;
        
        if (distance < magnetRadius)
        {
            // Within radius: calculate force based on distance and softness
            float distanceRatio = distance / magnetRadius;
            float falloff = 1f - (distanceRatio * magnetSoftness);
            forceStrength = magnetStrength * falloff;
        }
        else
        {
            // Beyond radius: no force
            return Vector3.zero;
        }
        
        // Apply score-based modulation
        float score = CalculateItemScore(itemView.Model);
        float scoreMultiplier = Mathf.Lerp(0f, 1f, score); // Normalize score to 0-1
        forceStrength *= scoreMultiplier;
        
        return toMagnet.normalized * forceStrength;
    }
    
    /// <summary>
    /// Update the scoring cache for all items
    /// </summary>
    public void UpdateScoreCache()
    {
        if (Time.time - lastCacheUpdateTime < CACHE_UPDATE_INTERVAL) return;
        
        itemScoreCache.Clear();
        lastCacheUpdateTime = Time.time;
        
        // The cache will be populated as items are scored
        Debug.Log($"[MagnetView] Updated score cache for magnet: {title}");
    }
    
    /// <summary>
    /// Clear the scoring cache
    /// </summary>
    public void ClearScoreCache()
    {
        itemScoreCache.Clear();
        Debug.Log($"[MagnetView] Cleared score cache for magnet: {title}");
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
    public void SetPosition(float x, float y)
    {
        Debug.Log($"MagnetView: MovePosition: title: {title} x: {x} y: {y}");
        transform.position = new Vector3(x, transform.position.y, y);
    }
    
    /// <summary>
    /// Applies a world coordinate offset to the magnet using physics position
    /// </summary>
    public void PushPosition(float xDelta, float yDelta)
    {
        if (rigidBody == null) return;
        
        Debug.Log($"MagnetView: PushPosition: title: {title} xDelta: {xDelta} yDelta: {yDelta}");
        
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
    /// Calculate target scale for magnets - IMMEDIATE sizing, no animation
    /// </summary>
    protected override float CalculateTargetScale()
    {
        // MAGNETS SHOULD ALWAYS BE THE SAME SIZE - NO DYNAMIC SCALING!
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
