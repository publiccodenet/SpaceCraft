using UnityEngine;
using System;
using System.Collections.Generic;
using UnityEngine.UI;
using TMPro;

public class ItemInfoPanel : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI _infoText;

    public void ShowInfo(string title)
    {
        if (_infoText != null)
        {
            _infoText.text = title;
        }
    }

    public void ClearInfo()
    {
        if (_infoText != null)
        {
            _infoText.text = "";
        }
    }
} 