/////////////////////////////////////////////////////////////////////////
// Bridge.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.


using UnityEngine;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
#if !UNITY_EDITOR && UNITY_WEBGL
using System.Runtime.InteropServices;
#endif


public class Bridge : MonoBehaviour {


    ////////////////////////////////////////////////////////////////////////
    // Delegates


    public delegate bool ConvertToDelegate(JToken obj, System.Type systemType, ref object result);
    public delegate bool ConvertFromDelegate(object obj, System.Type systemType, ref JToken result);
    public delegate void TextureChannelDelegate(Texture2D texture, string channel, object data);


    ////////////////////////////////////////////////////////////////////////
    // Static Variables


    public static Bridge bridge;


    //////////////////////////////////////////////////////////////////////////////////
    // Instance Variables


    public Transform targetTransform;
    public Dictionary<string, object> idToObject = new Dictionary<string, object>();
    public Dictionary<object, string> objectToID = new Dictionary<object, string>();
    public Dictionary<string, object> keyToGlobal = new Dictionary<string, object>();
    public Dictionary<string, TextureChannelDelegate> textureChannels = new Dictionary<string, TextureChannelDelegate>();
    public string gameID = "";
    public string deployment = "";
    public string title = "";
    public string url = "bridge.html";
    public string configuration = "null";
#if USE_SOCKETIO && UNITY_EDITOR
    public bool useSocketIO = false;
    public string socketIOAddress;
#endif
    public int nextID = 1;
    public bool startedBridge = false;
    public bool restarting = false;
    public BridgeTransport transport;
    public string handleStartedScript = "";
    public string handleLoadedScript = "";
    public string handleLoadFailedScript = "";
    public bool applicationFocused = false;
    public bool applicationPaused = false;
    public Camera mainCamera;


    //////////////////////////////////////////////////////////////////////////////////
    // Instance Methods
    

    public void Awake()
    {
        Debug.Log("Bridge: Awake: this: " + this + " bridge: " +  ((bridge == null) ? "null" : ("" + bridge)) + " enabled: " + this.enabled);

        if (bridge == null) {
            bridge = this;
        } else {
            Debug.LogError("Bridge: Awake: There should only be one bridge!");
        }

        Boot();
    }


    void OnApplicationFocus(bool focused)
    {
        //Debug.Log("Bridge: OnApplicationFocus: focused: " + focused);
        applicationFocused = focused;
    }


    void OnApplicationPause(bool paused)
    {
        //Debug.Log("Bridge: OnApplicationPause: paused: " + paused);
        applicationPaused = paused;
    }


    public void Start()
    {
        Debug.Log("Bridge: Start: this: " + this + " bridge: " +  ((bridge == null) ? "null" : ("" + bridge)) + " enabled: " + this.enabled);

#if !UNITY_EDITOR && UNITY_WEBGL
        // Ensure WebGL input doesn't capture everything if running in browser
        // Use explicit namespace to resolve potential build issues
        UnityEngine.WebGLInput.captureAllKeyboardInput = true;
        //UnityEngine.WebGLInput.captureAllKeyboardInput = false;
#endif

        StartBridge();
    }


    public void OnDestroy()
    {
        Debug.Log("Bridge: OnDestroy: this: " + this + " bridge: " +  ((bridge == null) ? "null" : ("" + bridge)) + " enabled: " + this.enabled);

        if (bridge == this) {
            bridge = null;
        } else {
            if (bridge != null) {
                Debug.LogError("Bridge: OnDestroy: the global bridge: " + ((bridge == null) ? "null" : ("" + bridge)) + " isn't me!");
            }
        }
    }


    public void StartBridge()
    {
        Debug.Log("Bridge: StartBridge: creating maps");
        idToObject = new Dictionary<string, object>();
        objectToID = new Dictionary<object, string>();
        idToObject["bridge"] = this;
        objectToID[this] = "bridge";

        textureChannels = new Dictionary<string, TextureChannelDelegate>();

        StartTransport();
    }
    

    public void StopBridge()
    {
        DestroyTransport();
        idToObject = null;
        objectToID = null;
        textureChannels = null;
    }


    public void StartTransport()
    {

        if (transport == null) {
            CreateTransport();
        }

        Debug.Log("Bridge: StartTransport: initializing transport: this: " + this);
        transport.Init(this);

        Debug.Log("Bridge: StartTransport: starting transport");
        transport.StartTransport();
        Debug.Log("Bridge: StartTransport: started transport");
    }

    
    public void CreateTransport()
    {
        Debug.Log("Bridge: CreateTransport");

        if (transport != null) {
            Debug.LogError("Bridge: CreateTransport: called multiple times!");
            return;
        }

#if UNITY_EDITOR
#if USE_SOCKETIO
        if (useSocketIO) {
            transport = gameObject.AddComponent<BridgeTransportSocketIO>();
        } else {
#endif
#if USE_CEF
            transport = gameObject.AddComponent<BridgeTransportCEF>();
#else
            #if USE_WEBVIEW
                transport = gameObject.AddComponent<BridgeTransportWebView>();
            #else
                // Default for Editor if others aren't defined - USE NULL TRANSPORT
                transport = gameObject.AddComponent<BridgeTransportNull>(); 
            #endif
#endif
#if USE_SOCKETIO
        }
#endif
#else
#if UNITY_WEBGL
        transport = gameObject.AddComponent<BridgeTransportWebGL>();
#else
    #if USE_SOCKETIO
        if (useSocketIO) {
            transport = gameObject.AddComponent<BridgeTransportSocketIO>();
        } else {
    #endif
    #if USE_WEBVIEW
        transport = gameObject.AddComponent<BridgeTransportWebView>();
    #else
        // Default for other builds if not WebGL/WebView/SocketIO
        transport = gameObject.AddComponent<BridgeTransportNull>(); 
    #endif
    #if USE_SOCKETIO
        }
    #endif
#endif
#endif

        Debug.Log("Bridge: CreateTransport: created transport: " + transport);
        
    }


    public void DestroyTransport()
    {
        if (transport == null) {
            return;
        }
        transport.StopTransport();
        DestroyImmediate(transport);
        transport = null;
    }


    public void HandleTransportStarted()
    {
        Debug.Log("Bridge: HandleTransportStarted: this: " + this);

        string js = "";

        if (!string.IsNullOrEmpty(handleStartedScript)) {
            js += 
                "bridge.handleStartedScript = " + 
                JsonConvert.ToString(handleStartedScript) +
                "; ";
        }

        if (!string.IsNullOrEmpty(handleLoadedScript)) {
            js += 
                "bridge.handleLoadedScript = " + 
                JsonConvert.ToString(handleLoadedScript) +
                "; ";
        }

        if (!string.IsNullOrEmpty(handleLoadFailedScript)) {
            js += 
                "bridge.handleLoadFailedScript = " + 
                JsonConvert.ToString(handleLoadFailedScript) +
                "; ";
        }

        js +=
            "bridge.start(" + 
            JsonConvert.ToString(transport.driver) +
            ", " + 
            JsonConvert.ToString(configuration) + 
            "); ";

        Debug.Log("Bridge: HandleTransportStarted: EvaluateJS: " + js);

        // Wrap the EvaluateJS call for bridge.start() so it doesn't run in WebGL builds.
#if !UNITY_WEBGL
        transport.EvaluateJS(js);
#else
        // For WebGL, JS side will call bridge.start() after instance creation.
        // Debug.Log("Bridge: HandleTransportStarted: WebGL build - Skipping EvaluateJS for bridge.start(). JS will initiate.");
#endif

        JObject ev = new JObject();
        ev.Add("event", "StartedUnity");

        Debug.Log("Bridge: HandleTransportStarted: sending StartedUnity ev: " + ev);
        SendEvent(ev);
    }


    public void HandleTransportStopped()
    {
        Debug.Log("Bridge: HandleTransportStopped: this: " + this);
    }


    public void SendEvent(JObject ev)
    {
        Debug.Log("Bridge: SendEvent: ev: " + ev);

        string evString = ev.ToString();

        transport.SendUnityToBridgeEvents(evString);
    }


    void FixedUpdate()
    {
        DistributeUnityEvents();
        transport.DistributeBridgeEvents();
    }


    void DistributeUnityEvents()
    {
        string evListString = transport.ReceiveBridgeToUnityEvents();

        if (string.IsNullOrEmpty(evListString)) {
            return;
        }

        string json = "[" + evListString + "]";
        Debug.Log("Bridge: DistributeUnityEvents: json:\n" + json);

        JArray evList = JArray.Parse(json);
        Debug.Log("Bridge: DistributeUnityEvents: evList: " + evList);

        Debug.Log("Bridge: DistributeUnityEvents: evList.Count: " + evList.Count + " json.Length: " + json.Length);

        foreach (JObject ev in evList) {
            DistributeUnityEvent(ev);
        }
    }


    public void DistributeUnityEvent(JObject ev)
    {
        string eventName = (string)ev["event"];

        if (String.IsNullOrEmpty(eventName)) {
            Debug.LogWarning("Bridge: DistributeUnityEvent: missing event name from ev: " + ev);
            return;
        }

        Debug.Log("Bridge: DistributeUnityEvent: eventName: " + eventName + " ev: " + ev);

        switch (eventName) {

            case "StartedBridge": {
                HandleStartedBridge(ev);
                break;
            }

            case "Log": {
                HandleLog(ev);
                break;
            }

            case "Create": {
                HandleCreate(ev);
                break;
            }

            case "Query": {
                HandleQuery(ev);
                break;
            }

            default: {
                HandleDefaultEvent(ev);
                break;

            }

        }

    }


    public void HandleStartedBridge(JObject ev)
    {
        Debug.Log("Bridge: DistributeUnityEvent: StartedBridge: " + ev);
        startedBridge = true;
    }
    

    public void HandleLog(JObject ev)
    {
        JObject data = ev["data"] as JObject;
        string line = (string)data["line"];
        Debug.Log ("Bridge: DistributeUnityEvent: Log: line: " + line);

    }
    

    public void HandleCreate(JObject ev)
    {
        JObject data = ev["data"] as JObject;
        string id = (string)data["id"];
        string prefab = data.GetString("prefab");
        string component = data.GetString("component");
        JArray preEvents = data.GetArray("preEvents");
        string parent = data.GetString("parent");
        bool worldPositionStays = data.GetBoolean("worldPositionStays", true);
        JObject update = data.GetObject("update");
        JObject interests = data.GetObject("interests");
        JArray postEvents = data.GetArray("postEvents");

        Debug.Log("Bridge: HandleCreate: id: " + id + " prefab: " + prefab + " component: " + component + " preEvents: " + preEvents + " parent: " + parent + " worldPositionStay: " + worldPositionStays + " update: " + update + " interests: " + interests + " postEvents: " + postEvents);

        GameObject instance = null;
        if (string.IsNullOrEmpty(prefab)) {
            instance = new GameObject();
        } else {
            GameObject prefabObject = Resources.Load<GameObject>(prefab);
            Debug.Log("Bridge: HandleCreate: prefab: " + prefab + " prefabObject: " + prefabObject);
            if (prefabObject == null) {
                Debug.LogError("Bridge: HandleCreate: Can't find prefab: " + prefab);
                return;
            }
            instance = Instantiate(prefabObject);
            Debug.Log("Bridge: HandleCreate: instance: " + instance);
            if (instance == null) {
                Debug.LogError("Bridge: HandleCreate: Can't instantiate prefab: " + prefab + " prefabObject: " + prefabObject);
                return;
            }
        }

        BridgeObject bridgeObject;

        if (string.IsNullOrEmpty(component)) {

            bridgeObject = instance.GetComponent<BridgeObject>();
            //Debug.Log("Bridge: HandleCreate: bridgeObject: " + bridgeObject);

            if (bridgeObject == null) {
                bridgeObject = instance.AddComponent<BridgeObject>();
            }

        } else {

            Type componentType = Type.GetType(component);

            if (componentType == null) {
                componentType = Type.GetType("Bridge." + component);
            }

            if (componentType == null) {
                componentType = Type.GetType("UnityEngine." + component);
            }

            if (componentType == null) {
                Debug.LogError("Bridge: HandleCreate: undefined component class: " + component);
                return;
            }

            if ((componentType != typeof(BridgeObject)) &&
                (!componentType.IsSubclassOf(typeof(BridgeObject)))) {
                Debug.LogError("Bridge: HandleCreate: component class is not subclass of BridgeObject: " + component);
                return;
            }

            bridgeObject = (BridgeObject)instance.AddComponent(componentType);
        }

        instance.name = id;
        bridgeObject.id = id;
        bridgeObject.bridge = this;
        bridgeObject.AddInterests(interests);
        objectToID[bridgeObject] = id;
        idToObject[id] = bridgeObject;

        Debug.Log("Bridge: HandleCreate: created, position: " + bridgeObject.transform.position.x + " " + bridgeObject.transform.position.y + " " + bridgeObject.transform.position.z + " bridgeObject: " + bridgeObject, bridgeObject);

        if (preEvents != null) {
            bridgeObject.HandleEvents(preEvents);
        }

        if (!String.IsNullOrEmpty(parent)) {
            Debug.Log("BridgeObject: HandleCreate: parent: bridgeObject: " + bridgeObject + " parent: " + parent);

            Accessor accessor = null;
            if (!Accessor.FindAccessor(
                    bridgeObject,
                    parent,
                    ref accessor)) {

                Debug.LogError("Bridge: HandleCreate: parent: can't find accessor for bridgeObject: " + bridgeObject + " parent: " + parent);

            } else {

                object obj = null;
                if (!accessor.Get(ref obj)) {

                    if (!accessor.conditional) {
                        Debug.LogError("Bridge: HandleCreate: parent: can't get accessor: " + accessor + " bridgeObject: " + bridgeObject + " parent: " + parent);
                    }

                } else {

                    Component comp = obj as Component;
                    if (comp == null) {

                        if (!accessor.conditional) {
                            Debug.LogError("Bridge: HandleCreate: parent: expected Component obj: " + obj + " this: " + this + " parent: " + parent);
                        }

                    } else {

                        GameObject go = comp.gameObject;
                        Transform xform = go.transform;
                        //Debug.Log("Bridge: HandleCreate: parent: xform: " + xform + " parent: " + parent + " worldPositionStays: " + worldPositionStays);

                        bridgeObject.transform.SetParent(xform, worldPositionStays);

                    }

                }

            }

        }

        if (update != null) {
            bridgeObject.LoadUpdate(update);
        }

        bridgeObject.SendEventName("Created");

        if (postEvents != null) {
            bridgeObject.HandleEvents(postEvents);
        }

        Debug.Log("Bridge: HandleCreate: done, position: " + bridgeObject.transform.position.x + " " + bridgeObject.transform.position.y + " " + bridgeObject.transform.position.z + " bridgeObject: " + bridgeObject);
    }
    

    public void HandleQuery(JObject ev)
    {
        JObject data = ev["data"] as JObject;
        JObject query = (JObject)data["query"];
        string callbackID = (string)data["callbackID"];
        Debug.Log("Bridge: HandleQuery: data: " + data + " query: " + query + " callbackID: " + callbackID + " bridge: " + bridge);

        JToken idToken = ev["id"];
        string idString = idToken.IsString() ? (string)idToken : null;
        JArray idArray = idToken.IsArray() ? (JArray)idToken : null;
        bool isSingle = idString != null;
        if ((idString == null) && 
            (idArray == null)) {
            Debug.Log("Bridge: HandleQuery: bad id: " + idToken + " data: " + data);
            return;
        }

        JArray queryResults = new JArray();

        for (int i = 0, n = isSingle ? 1 : idArray.ArrayLength(); i < n; i++) {
            string id = isSingle ? idString : (string)idArray[i];
            if (id == null) {
                Debug.Log("Bridge: HandleQuery: empty id!");
                continue;
            }

            Debug.Log("Bridge: HandleQuery: id: " + id + " ev: " + ev);

            if (string.IsNullOrEmpty(id)) {
                Debug.LogError("Bridge: HandleQuery: undefined id on eventName: Query id: " + id + " ev: " + ev);
                continue;
            }

            if (!idToObject.ContainsKey(id)) {
                Debug.LogWarning("Bridge: HandleQuery: missing id: " + id + " ev: " + ev);
                continue;
            }

            object obj = idToObject[id];
            Debug.Log("Bridge: HandleQuery: obj: " + obj);

#if false
            BridgeObject bridgeObject = obj as BridgeObject;

            if (bridgeObject == null) {
                // TODO: maybe we can handle this?
                Debug.LogError("Bridge: HandleQuery: tried to send eventName: Query to non-BridgeObject obj: " + obj + " id: " + id + " ev: " + ev);
                continue;
            }
#endif

            JObject queryResult = new JObject();
            AddQueryData(obj, query, queryResult);

            Debug.Log("Bridge: QueryData: queryResult: " + queryResult);

            queryResults.Add(queryResult);
        }

        if (!string.IsNullOrEmpty(callbackID)) {
            SendCallbackData(callbackID, isSingle ? queryResults[0] : queryResults);
        }

    }


    public void HandleDefaultEvent(JObject ev)
    {
        string eventName = (string)ev["event"];
        string id = (string)ev["id"];
        Debug.Log("Bridge: HandleDefaultEvent: id: " + id + " ev: " + ev);

        if (string.IsNullOrEmpty(id)) {
            Debug.LogError("Bridge: HandleDefaultEvent: undefined id on eventName: " + eventName + " ev: " + ev);
            return;
        }

        if (!idToObject.ContainsKey(id)) {
            Debug.LogWarning("Bridge: HandleDefaultEvent: missing id: " + id + " ev: " + ev);
            return;
        }

        object obj = idToObject[id];

        BridgeObject bridgeObject = obj as BridgeObject;

        Debug.Log("Bridge: HandleDefaultEvent: id: " + id + " obj: " + obj + " type:" + obj.GetType().ToString() + " bridgeObject: " + bridgeObject + " bridge: " + bridge.ToString());

        if (bridgeObject == null) {
            Debug.LogError("Bridge: HandleDefaultEvent: tried to send eventName: " + eventName + " to non-BridgeObject obj: " + obj + " id: " + id + " ev: " + ev);
            return;
        }

        bridgeObject.HandleEvent(ev);
    }


    public void Boot()
    {
        string js = "bridge.boot();";

        Debug.Log("Bridge: Boot: destroying objects");

        restarting = true;

        ClearGlobals();

        string[] keys = new string[idToObject.Keys.Count];
        idToObject.Keys.CopyTo(keys, 0);
        foreach (string objectID in keys) {

            // Don't destroy the bridge itself.
            if (objectID == "bridge") {
                continue;
            }

            if (!idToObject.ContainsKey(objectID)) {
                Debug.Log("Bridge: Boot: HardBoot: undefined objectID: " + objectID);
                continue;
            }

            var obj = idToObject[objectID];

            Debug.Log("Bridge: Boot: HardBoot: destroying object: " + objectID + " obj: " + obj);

            DestroyObject(obj);
        }

        idToObject = new Dictionary<string, object>();
        objectToID = new Dictionary<object, string>();
        idToObject["bridge"] = this;
        objectToID[this] = "bridge";

        Debug.Log("Bridge: Boot: set global bridge: " + bridge);

        textureChannels = new Dictionary<string, TextureChannelDelegate>();

        startedBridge = false;
        restarting = false;

        idToObject = new Dictionary<string, object>();
        objectToID = new Dictionary<object, string>();
        startedBridge = false;

        Debug.Log("Bridge: Boot: transport: " + transport + " NOT calling EvaluateJS: " + js);
        // transport.EvaluateJS(js); // This line doesn't belong here anyway
    }


    public object GetObject(string id)
    {
        if (!idToObject.ContainsKey(id)) {
            return null;
        }

        object obj = idToObject[id];

        return obj;
    }


    public string GetID(object obj)
    {
        if (objectToID.ContainsKey(obj)) {
            return objectToID[obj];
        }

        string id = "_Object_" + nextID++;

        objectToID[obj] = id;
        idToObject[id] = obj;

        return id;
    }


    public void DestroyObject(object obj)
    {
        BridgeObject bridgeObject = obj as BridgeObject;

        Debug.Log("Bridge: DestroyObject: ======== obj: " + obj + " bridgeObject: " + bridgeObject + " destroying: " + bridgeObject.destroying + " destroyed: " + bridgeObject.destroyed);

        string id = null;

        if ((bridgeObject != null) &&
            (bridgeObject.gameObject != null)) {

            id = bridgeObject.id;

            //Debug.Log("Bridge: DestroyObject: bridgeObject: " + bridgeObject + " id: " + id + " checking destroyed: " + bridgeObject.destroyed + " destroying: " + bridgeObject.destroying);

            if (bridgeObject.destroyed) {
                Debug.Log("Bridge: DestroyObject: already destroyed!");
                return;
            }

            bridgeObject.destroyed = true;

            //Debug.Log("Bridge: DestroyObject: bridgeObject: " + bridgeObject + " id: " + id + " restarting: " + restarting);

            if (!restarting) {
                bridgeObject.SendEventName("Destroyed");
            }

            //Debug.Log("Bridge: DestroyObject: DestroyImmediate: id: " + bridgeObject.id + " gameObject: " + bridgeObject.gameObject + " destroying: " + bridgeObject.destroying);
            if (!bridgeObject.destroying) {
                DestroyImmediate(bridgeObject.gameObject);
            }
        }

        if (objectToID.ContainsKey(obj)) {
            id = objectToID[obj];
            objectToID.Remove(obj);
        } else {
            //Debug.Log("Bridge: DestroyObject: objectToID missing obj: " + obj, this);
        }

        if ((id != null) &&
            (id != "bridge") &&
            idToObject.ContainsKey(id)) {
            idToObject.Remove(id);
        } else {
            //Debug.Log("Bridge: DestroyObject: idToObject missing id: " + id, this);
        }

    }


    public bool CheckGlobal(string key)
    {
        return keyToGlobal.ContainsKey(key);
    }
    

    public bool GetGlobal(string key, out object value)
    {
        if (keyToGlobal.ContainsKey(key)) {
            value = keyToGlobal[key];
            //Debug.Log("Bridge: GetGlobal: found key: " + key + " value: " + value);
            return true;
        } else {
            value = null;
            Debug.Log("Bridge: GetGlobal: undefined key: " + key);
            return false;
        }
    }


    public void SetGlobal(string key, object value)
    {
        //Debug.Log("Bridge: SetGlobal: key: " + key + " value: " + value);
        keyToGlobal[key] = value;
    }


    public void DeleteGlobal(string key)
    {
        //Debug.Log("Bridge: DeleteGlobal: key: " + key);
        if (keyToGlobal.ContainsKey(key)) {
            keyToGlobal.Remove(key);
        }
    }


    public void ClearGlobals()
    {
        //Debug.Log("Bridge: ClearGlobals");
        keyToGlobal.Clear();
    }


    public void SetGlobals(object obj, JObject globals)
    {
        //Debug.Log("Bridge: SetGlobals: globals: " + globals);

        foreach (var item in globals) {
            string key = item.Key;
            string path = (string)item.Value;
            object value = null;

            //Debug.Log("Bridge: SetGlobals: obj: " + obj + " key: " + key + " path: " + path);

            Accessor accessor = null;
            if (Accessor.FindAccessor(obj, path, ref accessor) &&
                accessor.Get(ref value)) {
                SetGlobal(key, value);
            }
        }
    }


    public void SendCallbackData(string callbackID, JToken data)
    {
        //Debug.Log("Bridge: SendCallbackData: callbackID: " + callbackID + " results: " + results);
        JObject ev = new JObject();
        ev.Add("event", "Callback");
        ev.Add("id", callbackID);
        ev.Add("data", data);

        //Debug.Log("Bridge: SendCallbackData: sending ev: " + ev);

        SendEvent(ev);
    }


    public void AddQueryData(object obj, JObject query, JObject data)
    {
        //Debug.Log("Bridge: AddQueryData: query: " + query);

        foreach (var item in query) {
            string key = item.Key;
            string path = (string)item.Value;
            object value = null;
            JToken valueData = null;

            //Debug.Log("Bridge: AddQueryData: get property obj: " + obj + " path: " + path);

            if (!Accessor.GetProperty(obj, path, ref value)) {

                Debug.LogError("Bridge: AddQueryData: can't get property path: " + path);

            } else {

                //Debug.Log("Bridge: AddQueryData: got property value: " + ((value == null) ? "null" : ("" + value)));

                if (!BridgeJsonConverter.ConvertFromType(value, ref valueData)) {

                    Debug.LogError("Bridge: AddQueryData: can't convert from JSON for type: " + ((valueData == null) ? "null" : ("" + valueData.GetType())) + " obj: " + obj + " key: " + key + " path: " + path + " value: " + value + " valueData: " + valueData);

                } else {

                    //Debug.Log("Bridge: AddQueryData: obj: " + obj + " key: " + key + " path: " + path + " value: " + value + " valueData: " + valueData);

                    data[key] = valueData;

                }

            }

        }

    }


#if false

    public override void HandleEvent(JObject ev)
    {
        base.HandleEvent(ev);

        //Debug.Log("Bridge: HandleEvent: this: " + this + " ev: " + ev, this);

        string eventName = (string)ev["event"];
        //Debug.Log("Bridge: HandleEvent: eventName: " + eventName, this);
        if (string.IsNullOrEmpty(eventName)) {
            Debug.LogError("Bridge: HandleEvent: missing event name in ev: " + ev);
            return;
        }

        JObject data = (JObject)ev["data"];
        //Debug.Log("Bridge: HandleEvent: eventName: " + eventName, this);

        switch (eventName) {

            case "ResetBootConfigurations": {
                //Debug.Log("Bridge: HandleEvent: ResetBootConfigurations: ev: " + ev);
                if (booter != null) {
                    booter.ResetBootConfigurations();
                }
                break;
            }

            case "ShowBootCanvas": {
                //Debug.Log("Bridge: HandleEvent: Boot: ev: " + ev);
                if (booter != null) {
                    booter.ShowBootCanvas();
                }
                break;
            }

            case "Boot": {
                //Debug.Log("Bridge: HandleEvent: Boot: ev: " + ev);
                if (booter != null) {
                    booter.BootNow();
                }
                break;
            }

        }
    }

#endif


    ////////////////////////////////////////////////////////////////////////
    // Texture channels.


    public void DistributeTexture(string channel, Texture2D texture, object data)
    {
        if (!textureChannels.ContainsKey(channel)) {
            //Debug.Log("Bridge: SendTexture: not sending to dead channel: " + channel + " texture: " + texture + " data: " + data);
            return;
        }

        TextureChannelDelegate handler = textureChannels[channel];
        //Debug.Log("Bridge: SendTexture: sending to live channel: " + channel + " texture: " + texture + " data: " + data + " handler: " + handler);

        handler(texture, channel, data);
    }


    public void TextureChannelSubscribe(string channel, TextureChannelDelegate handler)
    {
        //Debug.Log("Bridge: TextureChannelSubscribe: channel: " + channel + " handler: " + handler + " exists: " + textureChannels.ContainsKey(channel));

        if (!textureChannels.ContainsKey(channel)) {
            textureChannels.Add(channel, null);
        }

        textureChannels[channel] += handler;
    }


    public void TextureChannelUnsubscribe(string channel, TextureChannelDelegate handler)
    {
        //Debug.Log("Bridge: TextureChannelUnsubscribe: channel: " + channel + " handler: " + handler + " exists: " + textureChannels.ContainsKey(channel));

        if (!textureChannels.ContainsKey(channel)) {
            return;
        }

        textureChannels[channel] -= handler;
    }


    public Texture2D GetSharedTexture(int id)
    {
        return transport.GetSharedTexture(id);
    }


}
