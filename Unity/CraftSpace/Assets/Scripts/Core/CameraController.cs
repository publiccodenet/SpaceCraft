using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class CameraController : MonoBehaviour
{
    [Header("Camera Reference")]
    public Camera controlledCamera;
    [Tooltip("Set this to the camera you want to control")]
    public Transform cameraRig;
    [Tooltip("Set this to the parent transform used for panning/translation")]
    
    [Header("Movement Settings")]
    public float moveSpeed = 5f;
    public float fastMoveSpeed = 15f;
    public float rotationSpeed = 60f;
    public float zoomSpeed = 10f;
    public float minZoom = 2f;
    public float maxZoom = 20f;
    
    [Header("Smoothing")]
    public float movementSmoothTime = 0.2f;
    public float rotationSmoothTime = 0.1f;
    public float zoomSmoothTime = 0.1f;
    
    [Header("Collection Focus")]
    public float collectionFocusDistance = 10f;
    public float collectionFocusHeight = 5f;
    public float focusTransitionTime = 1.0f;
    
    // Internal state
    private Vector3 moveVelocity = Vector3.zero;
    private float rotationVelocity = 0f;
    private float zoomVelocity = 0f;
    private float currentZoomLevel;
    
    private Transform cameraTransform;
    private Coroutine focusCoroutine;
    
    private void Awake()
    {
        // Use the directly referenced camera instead of Camera.main
        if (controlledCamera == null)
        {
            Debug.LogError("CameraController: No camera assigned! Please assign a camera in the inspector.");
            enabled = false; // Disable the script to prevent further errors
            return;
        }
        
        cameraTransform = controlledCamera.transform;
        currentZoomLevel = Vector3.Distance(cameraTransform.position, transform.position);
    }
    
    private void Update()
    {
        HandleMovementInput();
        HandleRotationInput();
        HandleZoomInput();
    }
    
    /// <summary>
    /// Focus the camera on a collection
    /// </summary>
    public void FocusOnCollection(Collection collection, float transitionTime = -1f)
    {
        if (collection == null)
        {
            Debug.LogWarning("CameraController: Cannot focus on null collection");
            return;
        }
        
        // Stop any existing focus operation
        if (focusCoroutine != null)
        {
            StopCoroutine(focusCoroutine);
        }
        
        // Use default transition time if not specified
        if (transitionTime < 0)
        {
            transitionTime = focusTransitionTime;
        }
        
        // Start focus coroutine
        focusCoroutine = StartCoroutine(FocusOnCollectionCoroutine(collection, transitionTime));
    }
    
    private IEnumerator FocusOnCollectionCoroutine(Collection collection, float transitionTime)
    {
        // Get collection position - for now we'll use this transform's position
        // In a real application, you'd get the actual collection's position
        Vector3 targetPosition = new Vector3(0, collectionFocusHeight, -collectionFocusDistance);
        Quaternion targetRotation = Quaternion.Euler(30f, 0f, 0f);
        
        Vector3 startPosition = cameraTransform.position;
        Quaternion startRotation = cameraTransform.rotation;
        
        float elapsedTime = 0f;
        
        while (elapsedTime < transitionTime)
        {
            float t = elapsedTime / transitionTime;
            
            // Smooth interpolation
            float smoothT = Mathf.SmoothStep(0f, 1f, t);
            
            // Lerp position and rotation
            cameraTransform.position = Vector3.Lerp(startPosition, targetPosition, smoothT);
            cameraTransform.rotation = Quaternion.Slerp(startRotation, targetRotation, smoothT);
            
            elapsedTime += Time.deltaTime;
            yield return null;
        }
        
        // Ensure we end at exactly the target
        cameraTransform.position = targetPosition;
        cameraTransform.rotation = targetRotation;
        
        focusCoroutine = null;
    }
    
    private void HandleMovementInput()
    {
        // Implementation of HandleMovementInput method
    }
    
    private void HandleRotationInput()
    {
        // Implementation of HandleRotationInput method
    }
    
    private void HandleZoomInput()
    {
        // Implementation of HandleZoomInput method
    }
} 