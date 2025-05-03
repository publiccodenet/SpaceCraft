using UnityEngine;

public class CameraBackgroundColor : MonoBehaviour
{
    [SerializeField] private Color backgroundColor = new Color(0.1f, 0.1f, 0.2f);
    
    private void Start()
    {
        Camera cam = GetComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = backgroundColor;
    }
}