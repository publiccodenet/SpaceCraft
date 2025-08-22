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
        //Debug.Log($"Bridge: HandleEvent {eventName} data: {data}");

        switch (eventName) {

            case "Log": {
                string line = (string)data["line"];
                Debug.Log("BridgeObject: HandleEvent: Log: this: " + this + " line: " + line);
                break;
            }

            case "Destroy": {
                string path = (string)ev["path"];
                HandleDestroy(path);
                break;
            }

            case "Update": {
                JObject update = (JObject)data;
                string path = (string)ev["path"];
                //Debug.Log($"Bridge: Update event with data: {update}");
                LoadUpdate(update, path);
                break;
            }

            case "Query": {
                JObject queryData = (JObject)data;
                string path = (string)ev["path"];
                JObject query = (JObject)queryData["query"];
                string callbackID = (string)queryData["callbackID"];
                //Debug.Log($"Bridge: Query event with query: {query}, path: {path}, callbackID: {callbackID}");
                HandleQuery(query, callbackID, path);
                break;
            }

            case "UpdateInterests": {
                JObject newInterests = (JObject)data;
                string path = (string)ev["path"];
                UpdateInterests(newInterests, path);
                break;
            }

            case "Animate": {
                JArray dataArray = (JArray)data;
                string path = (string)ev["path"];
                AnimateData(dataArray, path);
                break;
            }



            case "AddComponent": {
                JObject dataObject = (JObject)data;
                string path = (string)ev["path"];
                string className = (string)dataObject["className"];
                //Debug.Log("BridgeObject: HandleEvent: AddComponent: className: " + className + " path: " + path);
                HandleAddComponent(className, path);
                break;
            }

            case "DestroyAfter": {
                JObject dataObject = (JObject)data;
                string path = (string)ev["path"];
                float delay = (float)dataObject["delay"];
                //Debug.Log("BridgeObject: HandleEvent: DestroyAfter: delay: " + delay + " this: " + this);
                HandleDestroyAfter(delay, path);
                break;
            }



            case "SetParent": {
                JObject dataObject = (JObject)data;
                string subjectPath = (string)ev["path"];
                string parentPath = (string)dataObject["path"];
                bool worldPositionStays = dataObject.GetBoolean("worldPositionStays", true);
                //Debug.Log("BridgeObject: HandleEvent: SetParent: parentPath: " + parentPath + " subjectPath: " + subjectPath + " this: " + this);
                HandleSetParent(parentPath, worldPositionStays, subjectPath);
                break;

            }

        }

    }


    public void LoadUpdate(JObject update, string path = null)
    {
        //Debug.Log("BridgeObject: LoadUpdate: this: " + this + " update: " + update + " path: " + path);

        object target = ResolvePath(path, "LoadUpdate");
        if (target == null) return;

        foreach (var item in update) {
            string key = item.Key;
            JToken value = (JToken)item.Value;

            //Debug.Log("BridgeObject: LoadUpdate: target: " + target + " SetProperty: " + key + ": " + value);

            Accessor.SetProperty(target, key, value);
        }
    }


    public virtual void AddInterests(JObject newInterests)
    {
        interests = newInterests;
    }


    public virtual void UpdateInterests(JObject newInterests, string path = null)
    {
        //Debug.Log("BridgeObject: UpdateInterests: newInterests: " + newInterests + " path: " + path, this);

        object target = ResolvePath(path, "UpdateInterests");
        if (target == null) return;

        BridgeObject bridgeObject = target as BridgeObject;
        if (bridgeObject == null)
        {
            Debug.LogError($"BridgeObject: UpdateInterests: Target object at path '{path}' is not a BridgeObject: {target}");
            return;
        }

        // TODO: Should we support multiple interests on the same event name?

        if (bridgeObject.interests == null) {
            return;
        }

        foreach (var item in newInterests) {
            string eventName = item.Key;
            JToken interestUpdate = (JToken)item.Value;

            JObject interest = 
                (JObject)bridgeObject.interests[eventName];

            if (interestUpdate == null) {

                if (interest != null) {
                    bridgeObject.interests.Remove(eventName);
                }

            } else if (interestUpdate.Type == JTokenType.Boolean) {

                if (interest != null) {

                    bool disabled = 
                        !(bool)interestUpdate; // disabled = !enabled

                    interest["disabled"] = disabled;

                }

            } else if (interestUpdate.Type == JTokenType.Object) {

                if (interest == null) {

                    bridgeObject.interests[eventName] = interestUpdate;

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
        //Debug.Log("BridgeObject: SendEventName: eventName: " + eventName + " data: " + data + " interests: " + interests);
        // Log the event and data as separate objects, not converted to string
        //Debug.Log($"Bridge: SendEvent: {eventName} - data: {data}");

        if (bridge == null) {
            Debug.LogError("BridgeObject: SendEventName: bridge is null!");
            return;
        }

        bool foundInterest = false;
        bool doNotSend = false;

        if (interests != null) {

            JObject interest = interests[eventName] as JObject;
            //Debug.Log("BridgeObject: SendEventName: eventName: " + eventName + " interest: " + interest, this);
            if (interest != null) {

                bool disabled = interest.GetBoolean("disabled");
                if (!disabled) {

                    foundInterest = true;
                    //Debug.Log($"Bridge: Found interest: {eventName} - {interest}");

                    JObject update = interest["update"] as JObject;
                    if (update != null) {

                        //Debug.Log("BridgeObject: SendEventName: event interest update: " + update);
                        //Debug.Log($"Bridge: Interest update: {eventName} - {update}");
                        LoadUpdate(update);
                    }

                    JArray events = interest["events"] as JArray;
                    if (events != null) {

                        //Debug.Log("BridgeObject: SendEventName: event interest events: " + events);
                        //Debug.Log($"Bridge: Interest events: {eventName} - {events}");
                        HandleEvents(events);
                    }

                    doNotSend = interest.GetBoolean("doNotSend");

                    if (doNotSend) {
                        //Debug.Log($"Bridge: Not sending event due to doNotSend: {eventName}");
                    }

                    if (!doNotSend) {

                        JObject query = interest["query"] as JObject;
                        if (query != null) {

                            //Debug.Log("BridgeObject: SendEventName: event interest query: " + query);
                            //Debug.Log($"Bridge: Interest query: {eventName} - {query}");

                            if (data == null) {
                                data = new JObject();
                            }

                            bridge.AddQueryData(this, query, data);
                            //Debug.Log($"Bridge: Updated data with query: {eventName} - {data}");
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
            //Debug.Log($"Bridge: Sending event: {eventName} - {ev}");

            bridge.SendEvent(ev);
        }
    }


    public virtual void AnimateData(JArray data, string path = null)
    {
        //Debug.Log("BridgeObject: AnimateData: data: " + data + " path: " + path, this);

        object target = ResolvePath(path, "AnimateData");
        if (target == null) return;

        BridgeObject bridgeObject = target as BridgeObject;
        if (bridgeObject == null)
        {
            Debug.LogError($"BridgeObject: AnimateData: Target object at path '{path}' is not a BridgeObject: {target}");
            return;
        }

#if USE_LEANTWEEN
        LeanTweenBridge.AnimateData(bridgeObject, data);
#else
        // Animation disabled - LeanTween not available
        Debug.Log("Animation not available - LeanTween functionality is disabled");
#endif
    }


    public virtual void HandleQuery(JObject query, string callbackID, string path = null)
    {
        //Debug.Log($"BridgeObject: HandleQuery: query: {query}, callbackID: {callbackID}, path: {path}");

        object target = ResolvePath(path, "HandleQuery");
        if (target == null) return;

        // Execute query on target object and send result back via callback
        JObject result = new JObject();
        
        foreach (var item in query)
        {
            string propertyName = item.Key;
            string propertyPath = item.Value.ToString();
            
            object value = null;
            if (Accessor.GetProperty(target, propertyPath, ref value))
            {
                if (value != null)
                {
                    result[propertyName] = JToken.FromObject(value);
                }
                else
                {
                    result[propertyName] = null;
                }
            }
            else
            {
                Debug.LogWarning($"BridgeObject: HandleQuery: Could not get property '{propertyPath}' from {target}");
                result[propertyName] = null;
            }
        }

        // Send result back via callback
        if (!string.IsNullOrEmpty(callbackID))
        {
            bridge?.InvokeCallback(callbackID, result);
        }
    }


    public virtual void HandleDestroy(string path = null)
    {
        //Debug.Log($"BridgeObject: HandleDestroy: path: {path}");

        object target = ResolvePath(path, "HandleDestroy");
        if (target == null) return;

        if (target is BridgeObject bridgeObject)
        {
            bridge.DestroyObject(bridgeObject);
        }
        else if (target is GameObject gameObject)
        {
            UnityEngine.Object.Destroy(gameObject);
        }
        else if (target is Component component)
        {
            UnityEngine.Object.Destroy(component.gameObject);
        }
        else
        {
            Debug.LogError($"BridgeObject: HandleDestroy: Cannot destroy object of type {target.GetType()}: {target}");
        }
    }


    public virtual void HandleDestroyAfter(float delay, string path = null)
    {
        //Debug.Log($"BridgeObject: HandleDestroyAfter: delay: {delay}, path: {path}");

        object target = ResolvePath(path, "HandleDestroyAfter");
        if (target == null) return;

        if (target is BridgeObject bridgeObject)
        {
            UnityEngine.Object.Destroy(bridgeObject.gameObject, delay);
        }
        else if (target is GameObject gameObject)
        {
            UnityEngine.Object.Destroy(gameObject, delay);
        }
        else if (target is Component component)
        {
            UnityEngine.Object.Destroy(component.gameObject, delay);
        }
        else
        {
            Debug.LogError($"BridgeObject: HandleDestroyAfter: Cannot destroy object of type {target.GetType()}: {target}");
        }
    }








    public virtual void HandleSetParent(string parentPath, bool worldPositionStays = true, string subjectPath = null)
    {
        //Debug.Log($"BridgeObject: HandleSetParent: parentPath: {parentPath}, worldPositionStays: {worldPositionStays}, subjectPath: {subjectPath}");

        object subject = ResolvePath(subjectPath, "HandleSetParent");
        if (subject == null) return;

        BridgeObject subjectBridge = subject as BridgeObject;
        if (subjectBridge == null)
        {
            Debug.LogError($"BridgeObject: HandleSetParent: Subject object at path '{subjectPath}' is not a BridgeObject: {subject}");
            return;
        }

        if (string.IsNullOrEmpty(parentPath))
        {
            // Set parent to null (unparent)
            subjectBridge.transform.SetParent(null, worldPositionStays);
        }
        else
        {
            // Find the parent object
            Accessor accessor = null;
            if (!Accessor.FindAccessor(this, parentPath, ref accessor))
            {
                Debug.LogError($"BridgeObject: HandleSetParent: Can't find accessor for parentPath: {parentPath} from {this}");
                return;
            }

            object parentObj = null;
            if (!accessor.Get(ref parentObj))
            {
                if (!accessor.conditional)
                {
                    Debug.LogError($"BridgeObject: HandleSetParent: Can't get accessor: {accessor} from {this} parentPath: {parentPath}");
                }
                return;
            }

            Component component = parentObj as Component;
            if (component == null)
            {
                if (!accessor.conditional)
                {
                    Debug.LogError($"BridgeObject: HandleSetParent: Expected Component parentObj: {parentObj} from {this} parentPath: {parentPath}");
                }
                return;
            }

            GameObject go = component.gameObject;
            Transform parentTransform = go.transform;
            subjectBridge.transform.SetParent(parentTransform, worldPositionStays);
        }
    }


    public virtual void HandleAddComponent(string className, string path = null)
    {
        //Debug.Log($"BridgeObject: HandleAddComponent: className: {className}, path: {path}");

        object target = ResolvePath(path, "HandleAddComponent");
        if (target == null) return;

        BridgeObject bridgeObject = target as BridgeObject;
        if (bridgeObject == null)
        {
            Debug.LogError($"BridgeObject: HandleAddComponent: Target object at path '{path}' is not a BridgeObject: {target}");
            return;
        }

        // Try to find the component type
        System.Type componentType = System.Type.GetType(className);
        if (componentType == null)
        {
            // Try common Unity namespace
            componentType = System.Type.GetType($"UnityEngine.{className}");
        }
        
        if (componentType == null)
        {
            Debug.LogError($"BridgeObject: HandleAddComponent: Could not find component type: {className}");
            return;
        }

        if (!typeof(Component).IsAssignableFrom(componentType))
        {
            Debug.LogError($"BridgeObject: HandleAddComponent: Type {className} is not a Component");
            return;
        }

        // Add the component
        bridgeObject.gameObject.AddComponent(componentType);
    }


    public virtual object ResolvePath(string path, string context = "")
    {
        if (string.IsNullOrEmpty(path))
        {
            return this;
        }

        object result = null;
        if (Accessor.GetProperty(this, path, ref result))
        {
            return result;
        }

        if (!string.IsNullOrEmpty(context))
        {
            Debug.LogError($"BridgeObject: {context}: Could not resolve path '{path}' from {this}");
        }
        return null;
    }
}
