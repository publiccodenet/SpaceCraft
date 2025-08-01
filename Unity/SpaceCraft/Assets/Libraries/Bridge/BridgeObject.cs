////////////////////////////////////////////////////////////////////////
// BridgeObject.cs
// Copyright (C) 2018 by Don Hopkins, Ground Up Software.


using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.InteropServices;
using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;


/// <summary>
/// Provides a bridge for configuring and addressing any GameObject via JSON
/// without modifying the original prefab or component structure
/// </summary>
public class BridgeObject : MonoBehaviour {


    ////////////////////////////////////////////////////////////////////////
    // Instance Variables


    public string id;
    public Bridge bridge;
    public JObject interests;
    public bool destroyed = false;
    public bool destroying = false;


    ////////////////////////////////////////////////////////////////////////
    // Instance Methods


    public virtual void OnDestroy()
    {
        //Debug.Log("BridgeObject: OnDestroy: ==== this: " + this + " destroying: " + destroying + " destroyed: " + destroyed);

        if (destroyed) {
            return;
        }

        destroying = true;

        //Debug.Log("BridgeObject: OnDestroy: not destroyed so set destroying: " + destroying + " and calling DestroyObject. bridge: " + ((bridge == null) ? "NULL" : bridge.id));
        if (bridge != null) {
            bridge.DestroyObject(this);
        }
    }


    public void HandleEvents(JArray events)
    {
        if (events == null) {
            return;
        }

        foreach (JObject ev in events) {
            HandleEvent(ev);
        }

    }


    public virtual void HandleEvent(JObject ev)
    {
        //Debug.Log("BridgeObject: HandleEvent: this: " + this + " ev: " + ev, this);
        Debug.Log($"Bridge: HandleEvent: {GetType().Name}#{id} - {ev}");

        string eventName = (string)ev["event"];
        //Debug.Log("BridgeObject: HandleEvent: eventName: " + eventName, this);

        if (string.IsNullOrEmpty(eventName)) {
            Debug.LogError("BridgeObject: HandleEvent: missing event name in ev: " + ev);
            return;
        }

        JToken data = ev["data"];
        Debug.Log($"Bridge: HandleEvent {eventName} data: {data}");

        switch (eventName) {

            case "Log": {
                string line = (string)data["line"];
                Debug.Log ("BridgeObject: HandleEvent: Log: this: " + this + " line: " + line);
                break;
            }

            case "Destroy": {
                bridge.DestroyObject(this);
                break;
            }

            case "Update": {
                JObject update = (JObject)data;
                // Debug.Log($"Bridge: Update event with data: {update}");
                LoadUpdate(update);
                break;
            }

            case "UpdateInterests": {
                JObject newInterests = (JObject)data;
                UpdateInterests(newInterests);
                break;
            }

            case "Animate": {
                JArray dataArray = (JArray)data;
                AnimateData(dataArray);
                break;
            }

            case "SetGlobals": {
                JObject dataObject = (JObject)data;
                JObject globals = (JObject)dataObject["globals"];
                //Debug.Log("BridgeObject: HandleEvent: SetGlobals: dataObject: " + dataObject + " globals: " + globals + " bridge: " + bridge);
                bridge.SetGlobals(this, globals);
                break;
            }

            case "AddComponent": {
                // TODO: AddComponent
                //JObject dataObject = (JObject)data;
                //string className = (string)dataObject["className"];
                //Debug.Log("BridgeObject: HandleEvent: AddComponent: className: " + className);
                break;
            }

            case "DestroyAfter": {
                JObject dataObject = (JObject)data;
                float delay = (float)dataObject["delay"];
                //Debug.Log("BridgeObject: HandleEvent: DestroyAfter: delay: " + delay + " this: " + this);
                UnityEngine.Object.Destroy(gameObject, delay);
                break;
            }

            case "AssignTo": {
                JObject dataObject = (JObject)data;
                string path = (string)dataObject["path"];
                //Debug.Log("BridgeObject: HandleEvent: AssignTo: path: " + path + " this: " + this);

                Accessor accessor = null;
                if (!Accessor.FindAccessor(
                        this,
                        path,
                        ref accessor)) {

                    Debug.LogError("BridgeObject: HandleEvent: AssignTo: can't find accessor for this: " + this + " path: " + path);

                } else {

                    if (!accessor.Set(this) &&
                        !accessor.conditional) {
                        Debug.LogError("BridgeObject: HandleEvent: AssignTo: can't set accessor: " + accessor + " this: " + this + " path: " + path);
                    }

                }
                break;
            }

            case "SetParent": {
                JObject dataObject = (JObject)data;
                //Debug.Log("BridgeObject: HandleEvent: SetParent: this: " + this + " data: " + data);
                string path = (string)dataObject["path"];
                //Debug.Log("BridgeObject: HandleEvent: SetParent: path: " + path + " this: " + this);

                if (string.IsNullOrEmpty(path)) {

                    transform.SetParent(null);

                } else {

                    Accessor accessor = null;
                    if (!Accessor.FindAccessor(
                            this,
                            path,
                            ref accessor)) {

                        Debug.LogError("BridgeObject: HandleEvent: SetParent: can't find accessor for this: " + this + " path: " + path);

                    } else {

                        object obj = null;
                        if (!accessor.Get(ref obj)) {

                            if (!accessor.conditional) {
                                Debug.LogError("BridgeObject: HandleEvent: SetParent: can't get accessor: " + accessor + " this: " + this + " path: " + path);
                            }

                        } else {

                            Component component = obj as Component;
                            if (component == null) {

                                if (!accessor.conditional) {
                                    Debug.LogError("BridgeObject: HandleEvent: SetParent: expected Component obj: " + obj + " this: " + this + " path: " + path);
                                }

                            } else {

                                GameObject go = component.gameObject;
                                Transform xform = go.transform;
                                bool worldPositionStays = data.GetBoolean("worldPositionStays", true);
                                transform.SetParent(xform, worldPositionStays);

                            }

                        }
                    }

                }

                break;

            }

        }

    }


    public void LoadUpdate(JObject update)
    {
        //Debug.Log("BridgeObject: LoadUpdate: this: " + this + " update: " + update);

        foreach (var item in update) {
            string key = item.Key;
            JToken value = (JToken)item.Value;

            //Debug.Log("BridgeObject: LoadUpdate: this: " + this + " SetProperty: " + key + ": " + value);

            Accessor.SetProperty(this, key, value);
        }

    }


    public virtual void AddInterests(JObject newInterests)
    {
        interests = newInterests;
    }


    public virtual void UpdateInterests(JObject newInterests)
    {
        //Debug.Log("BridgeObject: UpdateInterests: newInterests: " + newInterests, this);

        // TODO: Should we support multiple interests on the same event name?

        if (interests == null) {
            return;
        }

        foreach (var item in newInterests) {
            string eventName = item.Key;
            JToken interestUpdate = (JToken)item.Value;

            JObject interest = 
                (JObject)interests[eventName];

            if (interestUpdate == null) {

                if (interest != null) {
                    interests.Remove(eventName);
                }

            } else if (interestUpdate.Type == JTokenType.Boolean) {

                if (interest != null) {

                    bool disabled = 
                        !(bool)interestUpdate; // disabled = !enabled

                    interest["disabled"] = disabled;

                }

            } else if (interestUpdate.Type == JTokenType.Object) {

                if (interest == null) {

                    interests[eventName] = interestUpdate;

                } else {

                    foreach (var item2 in (JObject)interestUpdate) {
                        var key = item2.Key;
                        interest[key] = interestUpdate[key];
                    }

                }

            }

        }

    }


    public void SendEventName(string eventName, JObject data = null)
    {
        Debug.Log("BridgeObject: SendEventName: eventName: " + eventName + " data: " + data + " interests: " + interests);
        // Log the event and data as separate objects, not converted to string
        Debug.Log($"Bridge: SendEvent: {eventName} - data: {data}");

        if (bridge == null) {
            Debug.LogError("BridgeObject: SendEventName: bridge is null!");
            return;
        }

        bool foundInterest = false;
        bool doNotSend = false;

        if (interests != null) {

            JObject interest = interests[eventName] as JObject;
            Debug.Log("BridgeObject: SendEventName: eventName: " + eventName + " interest: " + interest, this);
            if (interest != null) {

                bool disabled = interest.GetBoolean("disabled");
                if (!disabled) {

                    foundInterest = true;
                    Debug.Log($"Bridge: Found interest: {eventName} - {interest}");

                    JObject update = interest["update"] as JObject;
                    if (update != null) {

                        Debug.Log("BridgeObject: SendEventName: event interest update: " + update);
                        Debug.Log($"Bridge: Interest update: {eventName} - {update}");
                        LoadUpdate(update);
                    }

                    JArray events = interest["events"] as JArray;
                    if (events != null) {

                        Debug.Log("BridgeObject: SendEventName: event interest events: " + events);
                        Debug.Log($"Bridge: Interest events: {eventName} - {events}");
                        HandleEvents(events);
                    }

                    doNotSend = interest.GetBoolean("doNotSend");

                    if (doNotSend) {
                        Debug.Log($"Bridge: Not sending event due to doNotSend: {eventName}");
                    }

                    if (!doNotSend) {

                        JObject query = interest["query"] as JObject;
                        if (query != null) {

                            //Debug.Log("BridgeObject: SendEventName: event interest query: " + query);
                            Debug.Log($"Bridge: Interest query: {eventName} - {query}");

                            if (data == null) {
                                data = new JObject();
                            }

                            bridge.AddQueryData(this, query, data);
                            Debug.Log($"Bridge: Updated data with query: {eventName} - {data}");
                        }
                    }
                }
            }
        }

        // Always send Created and Destroyed events.
        if ((!doNotSend) &&
            (foundInterest ||
             (eventName == "Created") ||
             (eventName == "Destroyed"))) {

            JObject ev = new JObject();

            ev.Add("event", eventName);
            ev.Add("id", id);

            if (data != null) {
                ev.Add("data", data);
            }

            //Debug.Log("BridgeObject: SendEventName: ev: " + ev, this);
            Debug.Log($"Bridge: Sending event: {eventName} - {ev}");

            bridge.SendEvent(ev);
        }
    }


    public virtual void AnimateData(JArray data)
    {
        //Debug.Log("BridgeObject: AnimateData: data: " + data, this);

#if USE_LEANTWEEN
        LeanTweenBridge.AnimateData(this, data);
#else
        // Animation disabled - LeanTween not available
        Debug.Log("Animation not available - LeanTween functionality is disabled");
#endif
    }
}
