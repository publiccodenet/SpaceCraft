/*
 * Copyright (C) 2011 Keijiro Takahashi
 * Copyright (C) 2012 GREE, Inc.
 * Copyright (C) 2017 by Don Hopkins, Ground Up Software.
 * 
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * 
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 
 * 1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 *    misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */


#if !(UNITY_EDITOR && USE_CEF) && !(UNITY_WEBGL && !UNITY_EDITOR)


using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.IO;
using System.Text.RegularExpressions;


public class BridgePlugin : MonoBehaviour {

    // This is an efficient, simplified direct alternative to UnitySendMessage, which is extremely slow.
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] // Enables getting a C callable function pointer.
    private delegate void UnitySendMessageDelegate(string target, string method, string message);
    static UnitySendMessageDelegate unitySendMessageDelegate;

    static IntPtr renderEventFunc;
    static Dictionary<string, BridgePlugin> plugins = new Dictionary<string, BridgePlugin>();

    public event System.Action<string> onJS;
    public event System.Action<string> onResult;
    public event System.Action<string> onError;
    public event System.Action<string> onLoaded;
    public event System.Action<string> onConsoleMessage;
    public event System.Action<Texture2D> onTexture;

    public string pluginID;
    public bool visibility;
    public long textureHandle = -1;
    public int textureWidth = 0;
    public int textureHeight = 0;
    public Texture2D texture;
    public bool issuePluginRenderEvents = true;
    public bool pluginRenderEventIssued;
    public List<string> messageQueue = new List<string>();

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE
    IntPtr plugin;
#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN
    // TODO
#elif UNITY_ANDROID
    AndroidJavaObject plugin;
#endif

#if !UNITY_IOS
    public bool isKeyboardVisible = false;
#endif


    public bool IsKeyboardVisible {
        get {
#if UNITY_ANDROID
            return isKeyboardVisible;
#elif UNITY_IPHONE
            return TouchScreenKeyboard.visible;
#else
            return false;
#endif
        }
    }


    /// Called from Java native plugin to set when the keyboard is opened
    public void SetKeyboardVisible(string isVisible)
    {
#if UNITY_ANDROID
        isKeyboardVisible = (isVisible == "true");
#endif
    }


#if UNITY_EDITOR_OSX
    private const string PLUGIN_DLL = "Bridge_Editor";
#elif UNITY_STANDALONE_OSX
    private const string PLUGIN_DLL = "Bridge";
#elif UNITY_EDITOR_WIN
    private const string PLUGIN_DLL = "Bridge_Editor";
#elif UNITY_STANDALONE_WIN
    private const string PLUGIN_DLL = "Bridge";
#elif UNITY_IPHONE
    private const string PLUGIN_DLL = "__Internal";
#endif

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_SetUnitySendMessageCallback(IntPtr unitySendMessageCallback);

    [DllImport(PLUGIN_DLL)]
    private static extern IntPtr _CBridgePlugin_Init(bool transparent);

    [DllImport(PLUGIN_DLL)]
    private static extern int _CBridgePlugin_Destroy(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_SetRect(IntPtr instance, int width, int height);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_SetVisibility(IntPtr instance, bool visibility);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_LoadURL(IntPtr instance, string url);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_EvaluateJS(IntPtr instance, string js);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_EvaluateJSReturnResult(IntPtr instance, string js);

    [DllImport(PLUGIN_DLL)]
    private static extern bool _CBridgePlugin_CanGoBack(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern bool _CBridgePlugin_CanGoForward(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_GoBack(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_GoForward(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern string _CBridgePlugin_GetPluginID(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_RenderIntoTextureSetup(IntPtr instance, int width, int height);

    [DllImport(PLUGIN_DLL)]
    private static extern long _CBridgePlugin_GetRenderTextureHandle(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern int _CBridgePlugin_GetRenderTextureWidth(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern int _CBridgePlugin_GetRenderTextureHeight(IntPtr instance);

    [DllImport(PLUGIN_DLL)]
    private static extern IntPtr _CBridgePlugin_GetRenderEventFunc();

    [DllImport(PLUGIN_DLL)]
    private static extern void _CBridgePlugin_FlushCaches(IntPtr instance);

#endif


    public static void DestroyPlugins()
    {
        //Debug.Log("BridgePlugin: DestroyPlugins");

        List<BridgePlugin> pluginsToDestroy = new List<BridgePlugin>();
        foreach (BridgePlugin plugin in plugins.Values) {
            pluginsToDestroy.Add(plugin);
        }
        foreach (BridgePlugin plugin in pluginsToDestroy) {
            //Debug.Log("BridgePlugin: DestroyPlugins: destroying plugin id " + plugin.pluginID + " " + plugin);
            plugin.OnDestroy();
        }
    }


    public void Init(bool transparent=false)
    {
        //Debug.Log("BridgePlugin: Init: transparent: " + transparent);

        if (unitySendMessageDelegate == null) {

            unitySendMessageDelegate =
                new UnitySendMessageDelegate(
                    HandleUnitySendMessageDispatch);
            IntPtr unitySendMessageCallback =
                Marshal.GetFunctionPointerForDelegate(
                    unitySendMessageDelegate);

            //Debug.Log("BridgePlugin: Init: unitySendMessageDelegate: " + unitySendMessageDelegate);

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IOS

            _CBridgePlugin_SetUnitySendMessageCallback(
                unitySendMessageCallback);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

            // TODO

#elif UNITY_ANDROID

            AndroidJavaClass pluginClass =
                new AndroidJavaClass(
                    "com.groundupsoftware.brige.CBridgePlugin");

            pluginClass.CallStatic(
                "SetUnitySendMessageCallback",
                (long)unitySendMessageCallback);

#endif

        }

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IOS

        plugin =
            _CBridgePlugin_Init(
                transparent);

        pluginID =
            _CBridgePlugin_GetPluginID(plugin);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        plugin =
            new AndroidJavaObject(
                "com.groundupsoftware.bridge.CBridgePlugin");

        plugin.Call(
            "Init", 
            transparent);

        pluginID = 
            plugin.Call<string>("GetPluginID");

#endif

        plugins[pluginID] = this;
    }


    protected virtual void OnDestroy()
    {

        //Debug.Log("BridgePlugin: OnDestroy: pluginID: " + pluginID);

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            //Debug.Log("BridgePlugin: OnDestroy: pluginID: " + pluginID + " plugin was null");
            return;
        }

        //Debug.Log("BridgePlugin: OnDestroy: pluginID: " + pluginID + " destroying plugin " + plugin);
        _CBridgePlugin_Destroy(plugin);

        plugin = IntPtr.Zero;

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("Destroy");

        plugin = null;

#endif

        if (!string.IsNullOrEmpty(pluginID) &&
            plugins.ContainsKey(pluginID)) {
            plugins.Remove(pluginID);
        }

    }


    [MonoPInvokeCallback(typeof(UnitySendMessageDelegate))]
    public static void HandleUnitySendMessageDispatch(string target, string method, string message)
    {
        //Debug.Log("BridgePlugin: HandleUnitySendMessageDispatch: target: " + target + " method: " + method + " message: " + message);

        if (!plugins.ContainsKey(target)) {
            //Debug.Log("BridgePlugin: HandleUnitySendMessageDispatch: missing target: " + target + " method: " + method + " message: " + message);
            return;
        }

        BridgePlugin obj = plugins[target];
        //Debug.Log("BridgePlugin: HandleUnitySendMessageDispatch: sending to obj: " + ((obj == null) ? "null" : "OBJ"));

        obj.HandleUnitySendMessage(method, message);
    }


    public void HandleUnitySendMessage(string method, string message)
    {
        //Debug.Log("BridgePlugin: HandleUnitySendMessage: BEGIN: pluginID: " + pluginID + " method: " + method + " message: " + message);

        lock (messageQueue) {
            messageQueue.Add(method);
            messageQueue.Add(message);
        }

        //Debug.Log("BridgePlugin: HandleUnitySendMessage: DONE: pluginID: " + pluginID + " method: " + method + " message: " + message);
    }


    public void PumpMessageQueue()
    {
        lock (messageQueue) {

            int messageQueueCount = messageQueue.Count & ~1;

            if (messageQueueCount < 2) {
                return;
            }

            //Debug.Log("BridgePlugin: PumpMessageQueue: BEGIN: pluginID: " + pluginID + " messageQueue.Count: " + messageQueue.Count + " messageQueueCount: " + messageQueueCount);

            for (int i = 0; i < messageQueueCount; i += 2) {

                string method = messageQueue[i];
                string message = messageQueue[i + 1];

                //Debug.Log("BridgePlugin: PumpMessageQueue: pluginID: " + pluginID + " i: " + i + " messageQueueCount: " + messageQueueCount + " method: " + method + " message: " + message + " messageQueue.Count: " + ((messageQueue == null) ? "NULL" : ("" + messageQueue.Count)));

                switch (method) {

                    case "Loaded":
                        CallOnLoaded(message);
                        break;

                    case "Error":
                        CallOnError(message);
                        break;

                    case "CallFromJS":
                        CallFromJS(message);
                        break;

                    case "ResultFromJS":
                        ReturnResultFromJS(message);
                        break;

                    case "MessageFromJS":
                        ReturnResultFromJS(message);
                        break;

                    case "ConsoleMessage":
                        CallOnConsoleMessage(message);
                        break;

                    case "Texture":
                        CallOnTexture();
                        break;

                    case "SetKeyboardVisible":
                        SetKeyboardVisible(message);
                        break;

                    default:
                        Debug.LogError("BridgePlugin: PumpMessageQueue: pluginID: " + pluginID + " undefined method: " + method + " message: " + message);
                        break;

                }

            }

            messageQueue.RemoveRange(0, messageQueueCount);

            //Debug.Log("BridgePlugin: PumpMessageQueue: END: pluginID: " + pluginID + " messageQueue.Count: " + messageQueue.Count + " messageQueueCount: " + messageQueueCount);

        }

    }


    public void SetRect(int width, int height)
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return;
        }

        _CBridgePlugin_SetRect(plugin, width, height);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("SetRect", width, height);

#endif

    }


    public void SetVisibility(bool v)
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return;
        }

        _CBridgePlugin_SetVisibility(plugin, v);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("SetVisibility", v);

#endif

        visibility = v;
    }


    public bool GetVisibility()
    {
        return visibility;
    }


    public void LoadURL(string url)
    {
        //Debug.Log("BridgePlugin: LoadURL: url: " + url);

        if (string.IsNullOrEmpty(url)) {
            return;
        }

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return;
        }

        _CBridgePlugin_LoadURL(plugin, url);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("LoadURL", url);

#endif

    }


    public void EvaluateJS(string js)
    {
        //Debug.Log("BridgePlugin: EvaluateJS: js: " + js, this);

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            //Debug.Log("BridgePlugin: EvaluateJS: no plugin", this);
            return;
        }

        //Debug.Log("BridgePlugin: EvaluateJS: CBridgePlugin EvaluateJS: js: " + js, this); 

        _CBridgePlugin_EvaluateJS(plugin, js);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            //Debug.Log("BridgePlugin: EvaluateJS: no plugin", this);
            return;
        }

        plugin.Call("EvaluateJS", js);

#endif

    }


    public void EvaluateJSReturnResult(string js)
    {
        //Debug.Log("BridgePlugin: EvaluateJSReturnResult: js: " + js, this);

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            //Debug.Log("BridgePlugin: EvaluateJSReturnResult: no plugin", this);
            return;
        }

        _CBridgePlugin_EvaluateJSReturnResult(plugin, js);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            //Debug.Log("BridgePlugin: EvaluateJSReturnResult: no plugin", this);
            return;
        }

        plugin.Call("EvaluateJSReturnResult", js);

#endif

    }


    public bool CanGoBack()
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return false;
        }

        return _CBridgePlugin_CanGoBack(plugin);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO
        return false;

#elif UNITY_ANDROID

        if (plugin == null) {
            return false;
        }

        return plugin.Get<bool>("canGoBack");

#endif

    }


    public bool CanGoForward()
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return false;
        }

        return _CBridgePlugin_CanGoForward(plugin);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO
        return false;

#elif UNITY_ANDROID

        if (plugin == null) {
            return false;
        }

        return plugin.Get<bool>("canGoForward");

#endif

    }


    public void GoBack()
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return;
        }

        _CBridgePlugin_GoBack(plugin);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("GoBack");

#endif

    }


    public void GoForward()
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE
        if (plugin == IntPtr.Zero) {
            return;
        }

        _CBridgePlugin_GoForward(plugin);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("GoForward");

#endif
    }


    public void CallOnError(string errorMessage)
    {

        //Debug.Log("BridgePlugin: CallOnError: errorMessage: " + errorMessage, this);

        if (onError != null) {
            onError(errorMessage);
        }

    }


    public void CallOnLoaded(string loadedUrl)
    {
        //Debug.Log("BridgePlugin: CallOnLoaded: loadedUrl: " + loadedUrl, this);

        if (onLoaded != null) {
            onLoaded(loadedUrl);
        }
    }


    public void CallFromJS(string data)
    {
        //Debug.Log("BridgePlugin: CallFromJS: data: " + data);

        if (onJS != null) {
            onJS(data);
        }
    }


    public void ReturnResultFromJS(string data)
    {
        //Debug.Log("BridgePlugin: ReturnResultFromJS: data: " + data);

        if (onResult != null) {
            onResult(data);
        }
    }


    public void CallOnConsoleMessage(string consoleMessage)
    {
        //Debug.Log("BridgePlugin: CallOnConsoleMessage: consoleMessage: " + consoleMessage, this);

        if (onConsoleMessage != null) {
            onConsoleMessage(consoleMessage);
        }
    }


    public void CallOnTexture()
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE
        long newTextureHandle = _CBridgePlugin_GetRenderTextureHandle(plugin);
#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN
        // TODO
        long newTextureHandle = 0;
#elif UNITY_ANDROID
        long newTextureHandle = plugin.Call<long>("GetRenderTextureHandle");
#endif

        //Debug.Log("BridgePlugin: CallOnTexture: newTextureHandle: " + newTextureHandle + " textureHandle: " + textureHandle);
        if (newTextureHandle != textureHandle) {
            //Debug.Log("BridgePlugin: CallOnTexture: textureHandle changed from: " + textureHandle + " to: " + newTextureHandle);
            textureHandle = newTextureHandle;
            texture = null;
        }

        if ((texture == null) && (textureHandle != 0)) {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE
            textureWidth = _CBridgePlugin_GetRenderTextureWidth(plugin);
            textureHeight = _CBridgePlugin_GetRenderTextureHeight(plugin);
#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN
            // TODO
            textureWidth = 0;
            textureHeight = 0;
#elif UNITY_ANDROID
            textureWidth = plugin.Call<int>("GetRenderTextureWidth");
            textureHeight = plugin.Call<int>("GetRenderTextureHeight");
#endif

            texture = Texture2D.CreateExternalTexture(textureWidth, textureHeight, TextureFormat.RGBA32, false, true, (IntPtr)textureHandle);

            //Debug.Log("BridgePlugin: CallOnTexture: CreateExternalTexture width: " + textureWidth + " height: " + textureHeight + " textureHandle: " + textureHandle + " texture: " + texture);
        }

        //Debug.Log("BridgePlugin: CallOnTexture texture: " + texture + " onTexture: " + onTexture, this);

        if (onTexture != null) {
            onTexture(texture);
        }

    }


    private IntPtr GetRenderEventFunc()
    {
        if (renderEventFunc == (IntPtr)0) {
            renderEventFunc =
#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE
                (IntPtr)_CBridgePlugin_GetRenderEventFunc();
#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN
                (IntPtr)0; // TODO
#elif UNITY_ANDROID
                (IntPtr)plugin.CallStatic<long>("GetRenderEventFunc");
#endif
            //Debug.Log("BridgePlugin: GetRenderEventFunc: Got renderEventFunc: " + renderEventFunc);
        }

        return renderEventFunc;
    }


    public void RenderIntoTexture(int width, int height)
    {
        //Debug.Log("BridgePlugin: RenderIntoTexture: time: " + Time.time + " width: " + width + " height: " + height);

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE
        _CBridgePlugin_RenderIntoTextureSetup(plugin, width, height);
#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN
        // TODO
#elif UNITY_ANDROID
        plugin.Call("RenderIntoTextureSetup", width, height);
#endif
    }


    public void FlushCaches()
    {

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE

        if (plugin == IntPtr.Zero) {
            return;
        }

        _CBridgePlugin_FlushCaches(plugin);

#elif UNITY_EDITOR_WIN || UNITY_STANDALONE_WIN

        // TODO

#elif UNITY_ANDROID

        if (plugin == null) {
            return;
        }

        plugin.Call("FlushCaches");

#endif

    }


    void Update()
    {
        pluginRenderEventIssued = false;
    }


    void FixedUpdate()
    {
        PumpMessageQueue();
    }


    void LateUpdate()
    {
        // This must only happen once per render frame!
        if (issuePluginRenderEvents &&
            !pluginRenderEventIssued) {
            pluginRenderEventIssued = true;
            IssuePluginRenderEvent();
        }
    }


    public void IssuePluginRenderEvent()
    {
        //Debug.Log("BridgePlugin: IssuePluginRenderEvent: time: " + Time.time + " pluginID: " + pluginID + " this: " + this);

#if UNITY_EDITOR_OSX || UNITY_STANDALONE_OSX || UNITY_IPHONE || UNITY_ANDROID
        GL.IssuePluginEvent(GetRenderEventFunc(), 2);
#endif
    }


}


#endif
