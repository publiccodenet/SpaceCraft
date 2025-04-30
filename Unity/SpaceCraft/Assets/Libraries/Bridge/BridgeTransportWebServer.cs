////////////////////////////////////////////////////////////////////////
// BridgeTransportWebServer.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.


#if !(UNITY_EDITOR && USE_CEF) && !(UNITY_WEBGL && !UNITY_EDITOR)


using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using System;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;


using StringCallback = System.Action<string>;


public class BridgeTransportWebServer : BridgeTransport
{

    public Renderer textureRenderer;
    public string textureChannel = "Texture";
    public Texture2D texture;
    public bool sendPoll = false;
    public bool sentPoll = false;
    public float startTime = 0.0f;
    public float textureUpdateStartDelay = 0.0f;
    public float textureUpdateTime = 0.0f;
    public float textureUpdateDelay = 0.1f;
    public bool initialFlushCaches = true;


    public override void HandleInit()
    {
        driver = "WebServer";
    }


    public void Update()
    {
        if ((textureUpdateDelay > 0.0f) &&
            (Time.time >= (startTime + textureUpdateStartDelay)) &&
            (Time.time >= (textureUpdateTime + textureUpdateDelay))) {
            textureUpdateTime = Time.time;
            //Debug.Log("BridgeTransportWebServer: Update: BEFORE UpdateTexture ================================");
            UpdateTexture();
            //Debug.Log("BridgeTransportWebServer: Update: AFTER UpdateTexture ================================");
        }
    }


    public void FixedUpdate()
    {
        if ((bridge != null) && !sentPoll && sendPoll) {
            sendPoll = false;
            sentPoll = true;
            PollForMessages();
        }
    }


    public void UpdateTexture()
    {
        //Debug.Log("BridgeTransportWebServer: UpdateTexture width: " + webServerWidth + " height: " + webServerHeight);
        // TODO
    }


    public void PollForMessages()
    {
        // TODO
        // EvaluateJSReturnResult("bridge.pollForEvents()");
    }


    public void HandleJS(string message)
    {
        //Debug.Log("BridgeTransportWebServer: HandleJS: message: " + message, this);

        if (bridge == null) {
            return;
        }

        if (message == "poll") {
            sendPoll = true;
            return;
        }
    }


    public void HandleResult(string result)
    {
        //Debug.Log("BridgeTransportWebServer: HandleResult: result: " + result.Length + " " + result);

        if (bridge == null) {
            return;
        }

        sentPoll = false;

        SendBridgeToUnityEvents(result);
    }


    public void HandleError(string message)
    {
        //Debug.Log("BridgeTransportWebServer: HandleError: message: " + message, this);
    }


    public void HandleLoaded(string url)
    {
        //Debug.Log("BridgeTransportWebServer: HandleLoaded: url: " + url, this);

        startedBridge = true;

        bridge.HandleTransportStarted();
    }


    public void HandleConsoleMessage(string message)
    {
        Debug.Log("BridgeTransportWebServer: HandleConsoleMessage: **** " + message, this);
    }


    public void HandleTexture(Texture2D texture)
    {
        //Debug.Log("BridgeTransportWebServer: HandleTexture: BEGIN: texture: " + texture, this);

        if (textureRenderer != null) {
            textureRenderer.material.mainTexture = texture;
        }

        bridge.DistributeTexture(textureChannel, texture, this);

        //Debug.Log("BridgeTransportWebServer: HandleTexture: DONE", this);
    }


    public override void EvaluateJS(string js)
    {
        Debug.Log("BridgeTransportWebServer: EvaluateJS: js: " + js.Length + " " + js);
        // TODO
    }


    public void EvaluateJSReturnResult(string js)
    {
        //Debug.Log("BridgeTransportWebServer: EvaluateJSReturnResult: js: " + js.Length + " " + js);
        // TODO
    }


}


#endif
