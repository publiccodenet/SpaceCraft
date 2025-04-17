////////////////////////////////////////////////////////////////////////
// BridgeTransportWebView.cs
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


public class BridgeTransportWebView : BridgeTransport
{

    public Renderer webViewRenderer;
    public BridgePlugin bridgePlugin;
    public bool visibility = false;
    public bool transparent = true;
    public int initialScale = 50;
    public int webViewWidth = 1024;
    public int webViewHeight = 1024;
    public string textureChannel = "WebView";
    public Texture2D webViewTexture;
    public bool sendPoll = false;
    public bool sentPoll = false;
    public float startTime = 0.0f;
    public float webViewTextureUpdateStartDelay = 0.0f;
    public float webViewTextureUpdateTime = 0.0f;
    public float webViewTextureUpdateDelay = 0.1f;
    public bool initialFlushCaches = true;


    public override void HandleInit()
    {
        driver = "WebView";

        StartCoroutine(StartWebView());
    }


    public IEnumerator StartWebView()
    {
        //Debug.Log("BridgeTransportWebView: StartWebView: url: " + url);

#if UNITY_ANDROID && !UNITY_EDITOR
        //Debug.Log("BridgeTransportWebView: StartWebView: Android");

        string sourceDir = Application.streamingAssetsPath;
        string destDir = Application.persistentDataPath;

        string filesPath = sourceDir + "/files.txt";
        string filesData = null;
        if (filesPath.Contains("://")) { // Android jar: URLs
            //Debug.Log("BridgeTransportWebView: StartWebView: www reading filesPath: " + filesPath);
            var www = new WWW(filesPath);
            yield return www;
            filesData = www.text;
        } else {
            //Debug.Log("BridgeTransportWebView: StartWebView: reading filesPath: " + filesPath);
            filesData = File.ReadAllText(filesPath);
        }

        //Debug.Log("BridgeTransportWebView: StartWebView: filesData: " + filesData);

        string[] fileNames = filesData.Split(new char[] { '\n' });

        foreach (string fileName in fileNames) {

            //Debug.Log("BridgeTransportWebView: StartWebView: fileName: " + fileName);

            if (fileName == "" ||
                fileName.StartsWith(".") ||
                fileName.EndsWith(".meta")) {
                continue;
            }

            string sourceFile = sourceDir + "/" + fileName;
            string destFile = destDir + "/" + fileName;

            //Debug.Log("BridgeTransportWebView: StartWebView: Copying sourceFile: " + sourceFile + " to destFile: " + destFile);

            if (File.Exists(destFile)) {
                File.Delete(destFile);
            }

            byte[] data = null;
            if (sourceFile.Contains("://")) { // Android jar: URLs
                //Debug.Log("BridgeTransportWebView: www reading: " + sourceFile);
                var www = new WWW(sourceFile);
                yield return www;
                data = www.bytes;
            } else {
                data = System.IO.File.ReadAllBytes(sourceFile);
            }
            //Debug.Log("BridgeTransportWebView: read " + data.Length + " bytes from: " + sourceFile);

            System.IO.File.WriteAllBytes(destFile, data);
            //Debug.Log("BridgeTransportWebView: wrote " + data.Length + " bytes to: " + destFile);

        }
#endif

        startTime = Time.time;

        bridgePlugin = gameObject.AddComponent<BridgePlugin>();

        bridgePlugin.onJS += HandleJS;
        bridgePlugin.onResult += HandleResult;
        bridgePlugin.onError += HandleError;
        bridgePlugin.onLoaded += HandleLoaded;
        bridgePlugin.onConsoleMessage += HandleConsoleMessage;
        bridgePlugin.onTexture += HandleTexture;

        bridgePlugin.Init(transparent: transparent);

        if (initialFlushCaches) {
            bridgePlugin.FlushCaches();
        }

        bridgePlugin.SetRect(webViewWidth, webViewHeight);
        bridgePlugin.SetVisibility(visibility);

        string cleanURL = CleanURL(bridge.url);
        bridgePlugin.LoadURL(cleanURL);

        yield break;
    }


    public override void HandleDestroy()
    {
        //Debug.Log("BridgeTransportWebView: HandleDestroy");

        base.HandleDestroy();

        if (bridgePlugin != null) {
            //UnityEngine.Object.DestroyImmediate(bridgePlugin);
            UnityEngine.Object.Destroy(bridgePlugin);
            bridgePlugin = null;
        }
    }


    private void OnApplicationQuit()
    {
        //Debug.Log("BridgeTransportWebView: OnApplicationQuit");
        BridgePlugin.DestroyPlugins();
    }


    public string CleanURL(string url)
    {
        string cleanURL = url;

        if (!cleanURL.StartsWith("http")) {

            cleanURL =
                "file://" + 
#if UNITY_ANDROID && !UNITY_EDITOR
                Application.persistentDataPath + 
#else
                Application.streamingAssetsPath +
#endif
                "/" + cleanURL;

        }

        cleanURL = cleanURL.Replace(" ", "%20");

        //Debug.Log("BridgeTransportWebView: CleanURL: url: " + url + " cleanURL: " + cleanURL);

        return cleanURL;
    }


    public void Update()
    {
        if ((webViewTextureUpdateDelay > 0.0f) &&
            (Time.time >= (startTime + webViewTextureUpdateStartDelay)) &&
            (Time.time >= (webViewTextureUpdateTime + webViewTextureUpdateDelay))) {
            webViewTextureUpdateTime = Time.time;
            //Debug.Log("BridgeTransportWebView: Update: BEFORE UpdateWebViewTexture ================================");
            UpdateWebViewTexture();
            //Debug.Log("BridgeTransportWebView: Update: AFTER UpdateWebViewTexture ================================");
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


    public void UpdateWebViewTexture()
    {
        //Debug.Log("BridgeTransportWebView: UpdateWebViewTexture pluginID: " + bridgePlugin.pluginID + " bridgePlugin: " +  bridgePlugin + " width: " + webViewWidth + " height: " + webViewHeight);
        if (bridgePlugin != null) {
            bridgePlugin.RenderIntoTexture(webViewWidth, webViewHeight);
        }
    }


    public void PollForMessages()
    {
#if UNITY_ANDROID && !UNITY_EDITOR
        EvaluateJSReturnResult("bridge.pollForEventsAndroid()");
#else
        EvaluateJSReturnResult("bridge.pollForEvents()");
#endif
    }


    public void UpdateVisibility()
    {
        bridgePlugin.SetVisibility(visibility);
    }


    public void HandleJS(string message)
    {
        //Debug.Log("BridgeTransportWebView: HandleJS: message: " + message, this);

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
        //Debug.Log("BridgeTransportWebView: HandleResult: result: " + result.Length + " " + result);

        if (bridge == null) {
            return;
        }

        sentPoll = false;

        SendBridgeToUnityEvents(result);
    }


    public void HandleError(string message)
    {
        //Debug.Log("BridgeTransportWebView: HandleError: message: " + message, this);
    }


    public void HandleLoaded(string url)
    {
        //Debug.Log("BridgeTransportWebView: HandleLoaded: url: " + url, this);

        startedBridge = true;

        bridge.HandleTransportStarted();
    }


    public void HandleConsoleMessage(string message)
    {
        Debug.Log("BridgeTransportWebView: HandleConsoleMessage: **** " + message, this);
    }


    public void HandleTexture(Texture2D texture)
    {
        //Debug.Log("BridgeTransportWebView: HandleTexture: BEGIN: texture: " + texture, this);

        if (webViewRenderer != null) {
            webViewRenderer.material.mainTexture = texture;
        }

        bridge.DistributeTexture(textureChannel, texture, this);

        //Debug.Log("BridgeTransportWebView: HandleTexture: DONE", this);
    }


    public void ToggleVisibility()
    {
        visibility = !visibility;
        UpdateVisibility();
    }


    public override void EvaluateJS(string js)
    {
        //Debug.Log("BridgeTransportWebView: EvaluateJS: js: " + js.Length + " " + js);
        bridgePlugin.EvaluateJS(js);
    }


    public void EvaluateJSReturnResult(string js)
    {
        //Debug.Log("BridgeTransportWebView: EvaluateJSReturnResult: js: " + js.Length + " " + js);
        bridgePlugin.EvaluateJSReturnResult(js);
    }


}


#endif
