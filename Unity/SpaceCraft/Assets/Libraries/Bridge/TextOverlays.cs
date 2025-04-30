////////////////////////////////////////////////////////////////////////
// TextOverlays.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.


using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;


public class TextOverlays: Tracker {


    ////////////////////////////////////////////////////////////////////////
    // Instance Variables


    public Canvas canvas;
    public RectTransform canvasRect;
    public RectTransform panel;
    public Image panelImage;
    public RectTransform sidePanel;
    public RawImage sidePanelImage;
    public TextMeshProUGUI sideText;
    public RectTransform infoPanel;
    public RawImage infoPanelImage;
    public TextMeshProUGUI infoText;
    public RectTransform overlay;
    public TextMeshProUGUI centerText;
    public int canvasWidth = 0;
    public int canvasHeight = 0;


    ////////////////////////////////////////////////////////////////////////
    // Instance Methods


    public void Update()
    {
        
        if ((canvasWidth != canvasRect.sizeDelta.x) ||
            (canvasHeight != canvasRect.sizeDelta.y)) {
            canvasWidth = (int)Mathf.Floor(canvasRect.sizeDelta.x);
            canvasHeight = (int)Mathf.Floor(canvasRect.sizeDelta.y);
            SendEventName("ResizeCanvas");
        }
    }


    public void HandleClickInfoPanel()
    {
        //Debug.Log("TextOverlays: HandleClickInfoPanel");
        SendEventName("ClickInfoPanel");
    }
    

    public void HandleEventSidePanel(string eventName)
    {
        //Debug.Log("TextOverlays: HandleEventSidePanel", eventName);
        SendEventName(eventName);
    }
    

}
