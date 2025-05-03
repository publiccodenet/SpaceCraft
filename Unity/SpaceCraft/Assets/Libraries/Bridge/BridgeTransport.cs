////////////////////////////////////////////////////////////////////////
// BridgeTransport.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.


using UnityEngine;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

#if USE_SOCKETIO
using SocketIOClient;
using SocketIOClient.Newtonsoft.Json;
using SocketIOClient.Transport;
#endif


public class BridgeTransport : MonoBehaviour
{


    public string driver = "Unknown";
    public Bridge bridge;
    public List<string> bridgeToUnityEventQueue = new List<string>();
    public List<string> unityToBridgeEventQueue = new List<string>();
    public bool startedBridge = false;
    public int bridgeToUnityEventMaxCount = 100;
    public int unityToBridgeEventMaxCount = 100;


    public void Init(Bridge bridge0)
    {
        bridge = bridge0;
        //Debug.Log("BridgeTransport: Init: bridge: " + bridge);
        HandleInit();
    }


    public virtual void HandleInit()
    {
        //Debug.Log("BridgeTransport: HandleInit: this: " + this + " bridge: " + bridge);
    }


    void Awake()
    {
        //Debug.Log("BridgeTransport: Awake: this: " + this + " bridge: " + bridge);
        HandleAwake();
    }


    public virtual void HandleAwake()
    {
        //Debug.Log("BridgeTransport: HandleAwake: this: " + this + " bridge: " + bridge);
    }


    void Start()
    {
        //Debug.Log("BridgeTransport: Start: this: " + this + " bridge: " + bridge);
        HandleStart();
    }


    public virtual void HandleStart()
    {
        //Debug.Log("BridgeTransport: HandleStart: this: " + this + " bridge: " + bridge);
    }


    void OnDestroy()
    {
        HandleDestroy();

        if (bridge != null) {
            bridge.HandleTransportStopped();
            bridge = null;
        }
    }


    public virtual void HandleDestroy()
    {
        //Debug.Log("BridgeTransport: HandleDestroy: this: " + this + " bridge: " + bridge);
    }


    public virtual void StartTransport()
    {
    }


    public virtual void StopTransport()
    {
    }


    public virtual void SendBridgeToUnityEvents(string evListString)
    {
        //Debug.Log("BridgeTransport: SendBridgeToUnityEvents: evListString: " + evListString);

        bridgeToUnityEventQueue.Add(evListString);
    }


    public virtual string ReceiveBridgeToUnityEvents()
    {
        int eventCount = bridgeToUnityEventQueue.Count;

        if (eventCount == 0) {
            return null;
        }

        string evListString;

        if (eventCount <= bridgeToUnityEventMaxCount) {

            evListString =
                string.Join(",", bridgeToUnityEventQueue.ToArray());
            bridgeToUnityEventQueue.Clear();

        } else {

            List<string> firstEvents = 
                bridgeToUnityEventQueue.GetRange(0, bridgeToUnityEventMaxCount);
            bridgeToUnityEventQueue.RemoveRange(0, bridgeToUnityEventMaxCount);
            evListString =
                string.Join(",", firstEvents.ToArray());
        }

        //Debug.Log("BridgeTransport: ReceiveBridgeToUnityEvents: eventCount: " + eventCount + " evListString: " + evListString.Length + " " + evListString);

        return evListString;
    }


    public virtual void SendUnityToBridgeEvents(string evListString)
    {
        //Debug.Log("BridgeTransport: SendUnityToBridgeEvents: evListString: " + evListString);

        unityToBridgeEventQueue.Add(evListString);
    }


    public virtual string ReceiveUnityToBridgeEvents()
    {
        int eventCount = unityToBridgeEventQueue.Count;

        if (eventCount == 0) {
            return null;
        }

        string evListString;

        if (eventCount <= unityToBridgeEventMaxCount) {

            evListString =
                string.Join(",", unityToBridgeEventQueue.ToArray());
            unityToBridgeEventQueue.Clear();

        } else {

            List<string> firstEvents = 
                unityToBridgeEventQueue.GetRange(0, unityToBridgeEventMaxCount);
            unityToBridgeEventQueue.RemoveRange(0, unityToBridgeEventMaxCount);
            evListString =
                string.Join(",", firstEvents.ToArray());
        }

        //Debug.Log("BridgeTransport: ReceiveUnityToBridgeEvents: eventCount: " + eventCount + " evListString: " + evListString.Length + " " + evListString);

        return evListString;
    }


    public virtual void DistributeBridgeEvents()
    {
        if (!startedBridge) {
            return;
        }

        string evListString = ReceiveUnityToBridgeEvents();
        int evListStringLength = 0;
        if (string.IsNullOrEmpty(evListString)) {
            //evListString = "null";
            return;
        } else {
            evListString = "[" + evListString + "]";
            evListStringLength = evListString.Length;
        }

        string js =
            "bridge.distributeEvents(" +
                evListString + "," +
                evListStringLength + ");";

        //Debug.Log("BridgeTransport: DistributeBridgeEvents: js: " + js.Length + " " + js);

        EvaluateJS(js);
    }


    public virtual void EvaluateJS(string js)
    {
        Debug.LogError("BridgeTransport: TODO: EvaluateJS: js: " + js.Length + " " + js);
    }


    public virtual bool HasSharedTexture()
    {
        return false;
    }


    public virtual bool HasSharedData()
    {
        return false;
    }


    public virtual Texture2D GetSharedTexture(int id)
    {
        Debug.LogError("BridgeTransport: TODO: GetSharedTexture: id: " + id);
        return null;
    }


    public virtual byte[] GetSharedData(int id)
    {
        Debug.LogError("BridgeTransport: TODO: GetSharedData: id: " + id);
        return null;
    }


}
