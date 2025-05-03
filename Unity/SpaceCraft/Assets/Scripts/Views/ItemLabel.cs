using UnityEngine;
using System;
using System.Collections.Generic;
using TMPro;

public class ItemLabel : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private TextMeshPro _titleText;
    
    [Header("Styling")]
    [SerializeField] private Color _textColor = Color.white;
    [SerializeField] private float _fontSize = 0.25f;

    // Public accessor for the TextMeshPro component
    public TextMeshPro TitleText => _titleText;

    private void Awake()
    {
        // Ensure the label is set up when the component is initialized
        SetupLabel();
    }

    // Simple public method to just set the text
    public void SetText(string text)
    {
        if (_titleText != null)
        {
            _titleText.text = text ?? "Unknown";
        }
    }

    // Called when the item view is created or updated - more full configuration
    public void Configure(string title)
    {
        if (_titleText != null)
        {
            _titleText.text = title ?? "Unknown";
            _titleText.color = _textColor;
            _titleText.fontSize = _fontSize;
        }
    }
    
    // Initialize the label with some default settings
    public void SetupLabel()
    {
        if (_titleText == null)
        {
            // Create TextMeshPro component if it doesn't exist
            GameObject titleObj = new GameObject("Label_Text");
            titleObj.transform.SetParent(transform);
            _titleText = titleObj.AddComponent<TextMeshPro>();
            
            // Configure TextMeshPro with default settings
            _titleText.alignment = TextAlignmentOptions.Center;
            _titleText.fontSize = _fontSize;
            _titleText.color = _textColor;
            
            // Position it properly - flat on the XZ plane
            _titleText.rectTransform.localPosition = new Vector3(0, 0.01f, 0);
            _titleText.rectTransform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            _titleText.rectTransform.sizeDelta = new Vector2(1.4f, 0.4f);
        }
    }
}
