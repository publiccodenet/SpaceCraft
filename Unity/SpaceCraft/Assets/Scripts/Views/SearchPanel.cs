using UnityEngine;
using System;
using System.Collections.Generic;
using UnityEngine.UI;
using TMPro;

public class SearchPanel : MonoBehaviour
{
    [Header("UI References")]
    public TMP_InputField InputField;  // Reference to the search input field - public for InputManager access

    /// <summary>
    /// Get the current search text from the input field
    /// </summary>
    public string GetSearchText()
    {
        return InputField != null ? InputField.text : string.Empty;
    }
    
    /// <summary>
    /// Set the search text in the input field
    /// </summary>
    public void SetSearchText(string text)
    {
        if (InputField != null)
        {
            InputField.text = text;
        }
    }
    
    /// <summary>
    /// Clear the search input field
    /// </summary>
    public void ClearSearch()
    {
        SetSearchText(string.Empty);
    }
} 