////////////////////////////////////////////////////////////////////////
// UnityBridge.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.
// This is for access to various Unity functions and properties.

using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.EventSystems;


public class UnityBridge : BridgeObject {


    public float time {
        get {
            return Time.time;
        }
    }


    public float timeScale {
        get {
            return Time.timeScale;
        }
        set {
            Debug.Log("UnityBridge: timeScale: set: old: " + Time.timeScale + " value: " + value);
            Time.timeScale = value;
        }
    }


}
