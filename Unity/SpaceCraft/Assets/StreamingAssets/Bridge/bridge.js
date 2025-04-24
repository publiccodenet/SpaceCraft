////////////////////////////////////////////////////////////////////////
// bridge.js
// Unity3D / JavaScript Bridge
// Don Hopkins, Ground Up Software.


"use strict";


////////////////////////////////////////////////////////////////////////
// Bridge


class Bridge {


    constructor()
    {
        //console.log("Bridge: constructor: this:", this);
        this.id = 'bridge';
        this.startedUnity = false;
        this.startedJS = false;
        this.driver = null;
        this.live = false;
        this.configuration = null;
        this.nextID = 0;
        this.blobID = 0;
        this.objects = {
            bridge: this
        };
        this.callbacks = {};
        this.spreadsheets = {};
        this.world = {};
        this.pollCount = 0;
        this.jsToUnityEventQueueTimer = null;
        this.jsToUnityEventQueue = [];
        this.jsToUnityEventCount = 0;
        this.jsToUnityEventBytes = 0;
        this.unityToJSEventCount = 0;
        this.unityToJSEventBytes = 0;
        this.zeroScale = { x: 0, y: 0, z: 0 };
        this.unitScale = { x: 1, y: 1, z: 1 };
        this.tinyScale = { x: 0.00001, y: 0.00001, z: 0.00001 };
        this.handleStartedScript = "";
        this.handleLoadedScript = "";
        this.handleLoadFailedScript = "";
    }


    start(driver, configuration)
    {
        console.log("Bridge: start: driver:", driver, "configuration:", configuration);

        this.driver = driver || "Unknown";
        this.configuration = configuration || "{}";
        this.startedUnity = true;
        this.startedJS = true;

        this.sendEvent({
            event: 'StartedBridge'
        });

        this.handleStarted();

        this.load();
    }


    handleStarted()
    {
        //console.log("Bridge: handleStarted: handleStartedScript:", this.handleStartedScript);
        if (this.handleStartedScript) {
            eval(this.handleStartedScript);
        }
    }
    

    handleLoaded()
    {
        //console.log("Bridge: handleLoaded: handleLoadedScript:", this.handleLoadedScript);
        if (this.handleLoadedScript) {
            eval(this.handleLoadedScript);
        }
    }


    handleLoadFailed(errorMessage)
    {
        console.log("Bridge: handleLoadFailed: errorMessage:", errorMessage, "handleLoadFailedScript:", this.handleLoadFailedScript);
        if (this.handleLoadFailedScript) {
            eval(this.handleLoadFailedScript);
        }
        // TODO: Report error to booter.
    }


    makeID(kind)
    {
        // We don't want slashes in the object ids.
        kind = kind.replace(/\//g, '_');
        return kind + "_" + this.nextID++;
    }


    // searchDefault searches a list of dictionaries for
    // a key, the its value in the first dictionary that
    // contains it, or returns a default value if it's
    // not found. The first argument is the key, the next
    // one or more arguments are the dictionaries to search,
    // and the last argument is the default value.
    // So there must be at least three arguments.
    searchDefault()
    {
        //console.log("Bridge: searchDefault: key:", arguments[0], "arguments:", arguments);

        var argumentCount = arguments.length;

        if (argumentCount < 3) {
            console.log("Bridge: searchDefault: Called with nonsensically too few arguments! Should be: key, object..., default", arguments);
            return null;
        }

        // The first argument is the key to search for.
        var key = arguments[0];

        // Search the rest of arguments for the key, except for the last one.
        // The last argument is the default value so don't search that one.

        for (var argumentIndex = 1;
             argumentIndex < (argumentCount - 1);
             argumentIndex++) {

            var dict = arguments[argumentIndex];

            // Skip null dicts, for convenience.
            if (!dict) {
                continue;
            }

            var value = dict[key];

            if (value !== undefined) {
                // Found it!
                return value;
            }

        }

        // Didn't find it, so return the default.
        return arguments[argumentCount - 1];
    }


    objToId(obj)
    {
        if (typeof(obj) == 'string') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(subObj => this.objToId(subObj));
        }

        const id = obj.id;
        if (id) {
            return id;
        }

        console.log('Bridge.objToId: unexpected type: obj:', obj);

        return null;
    }


    createObject(template)
    {

        if (!template) {
            template = {};
        }

        //console.log("Bridge: createObject: prefab:", template.prefab, Object.keys(template));
        //console.log("Bridge: createObject: update:", (template.update && Object.keys(template.update)), '\n' + JSON.stringify(template.update, null, 4));

        // obj, prefab, component, preEvents, parent, worldPositionStays, update, interests, postEvents

        var obj = template.obj || {};
        var prefab = template.prefab || null;
        var component = template.component || null;
        var preEvents = template.preEvents || null;
        var parent = template.parent || null;
        var worldPositionStays = template.worldPositionStays;
        var update = template.update || null;
        var interests = template.interests || null;
        var postEvents = template.postEvents || null;

        //console.log("Bridge: createObject: obj:", obj, "prefab:", prefab, "component:", component, "preEvents:", preEvents, "parent:", parent, "worldPositionStays:", worldPositionStays, "update:", update, "interests:", JSON.stringify(interests), "postEvents:", postEvents);

        if ((parent !== null) &&
            (typeof parent === "object") &&
            parent.id) {
            parent = 'object:' + parent.id;
        }

        var remoteInterests = {};
        if (interests) {
            for (var eventName in interests) {
                var interest = interests[eventName];
                var remoteInterest = {};
                remoteInterests[eventName] = remoteInterest;
                for (var key in interest) {
                    if (key == 'handler') {
                        continue;
                    }
                    remoteInterest[key] = interest[key];
                }
            }
        }

        //console.log("Bridge: createObject: remoteInterests:", JSON.stringify(remoteInterests));

        var id = this.makeID(prefab || 'GameObject');

        obj.id = id;
        obj.interests = interests;

        this.objects[id] = obj;

        var data = {
            id: id,
        };

        if (prefab && prefab.length) {
            data.prefab = prefab;
        }

        if (component && component.length) {
            data.component = component;
        }

        if (preEvents && preEvents.length) {
            data.preEvents = preEvents;
        }

        if (parent && parent.length) {
            data.parent = parent;
        }

        if (worldPositionStays !== undefined) {
            data.worldPositionStays = !!worldPositionStays;
        }

        if (update && Object.keys(update).length) {
            data.update = update;
        }

        if (remoteInterests && Object.keys(remoteInterests).length) {
            data.interests = remoteInterests;
        }

        if (postEvents && postEvents.length) {
            data.postEvents = postEvents;
        }

        this.sendEvent({
            event: 'Create',
            data: data,
        });

        return obj;
    }


    destroyObject(obj)
    {
        if (obj == null) {
            console.log("Bridge: destroyObject: obj is null", JSON.stringify(query));
            return;
        }

        this.sendEvent({
            event: 'Destroy',
            id: this.objToId(obj),
        });
    }


    updateObject(obj, data)
    {
        if (obj == null) {
            console.log("Bridge: updateObject: obj is null", "data", JSON.stringify(data));
            return;
        }

        this.sendEvent({
            event: 'Update',
            id: this.objToId(obj),
            data: data,
        });
    }


    queryObject(obj, query, callback)
    {
        //console.log("Bridge.queryObject", "obj:", obj, obj.id, "query:", query, "callback:", callback, "id", this.objToId(obj));

        if (obj == null) {
            console.log("Bridge: queryObject: obj is null", "query", JSON.stringify(query), "callback", callback);
            return;
        }

        var callbackID =
            callback &&
            this.makeCallbackID(obj, callback, true);

        var data = {
            query: query,
            callbackID: callbackID
        };

        this.sendEvent({
            event: 'Query',
            id: this.objToId(obj),
            data: data,
        });
    }


    setGlobals(obj, globals)
    {
        if (obj == null) {
            console.log("Bridge: setGlobals: obj is null", "globals", JSON.stringify(globals));
            return;
        }

        var data = {
            globals: globals,
        };

        this.sendEvent({
            event: 'SetGlobals',
            id: this.objToId(obj),
            data: data,
        });
    }


    animateObject(obj, data)
    {
        if (obj == null) {
            console.log("Bridge: animateObject: obj is null", "data", JSON.stringify(data));
            return;
        }

        //console.log("Bridge: animateObject: data:", JSON.stringify(data, null, 4));

        this.sendEvent({
            event: 'Animate',
            id: this.objToId(obj),
            data: data,
        });
    }


    updateInterests(obj, data)
    {
        if (obj == null) {
            console.log("Bridge: updateInterests: obj is null", "data", data);
            return;
        }

        this.sendEvent({
            event: 'UpdateInterests',
            id: this.objToId(obj),
            data: data,
        });
    }


    makeCallbackID(obj, callback, oneTime)
    {
        var callbackID = this.makeID("Callback");

        this.callbacks[callbackID] = (data) => {
            //console.log("Bridge: makeCallbackID:", "callback:", callback, "callbackID:", callbackID, "data:", data);
            callback(data);
            if (oneTime) {
                this.clearCallback(callbackID);
            }
        };

        return callbackID;
    }


    invokeCallback(callbackID, data)
    {
        var callback = this.callbacks[callbackID];
        if (callback == null) {
            console.log("Bridge: invokeCallback: undefined callbackID:", callbackID);
            return;
        }

        callback(data);
    }


    clearCallback(callbackID)
    {
        delete this.callbacks[callbackID];
    }


    sendEvent(ev)
    {
        var evString = JSON.stringify(ev);

        //console.log("======== Bridge: sendEvent", evString);

        this.jsToUnityEventQueue.push(evString);
        this.jsToUnityEventCount++;
        this.jsToUnityEventBytes += evString.length;

        if (this.startedUnity) {
            if (!this.jsToUnityEventQueueTimer) {
                this.jsToUnityEventQueueTimer = window.setTimeout(() => {
                    this.flushJSToUnityEventQueue();
                }, 0);
            }
        } else {
            this.flushJSToUnityEventQueue();
        }
    }


    distributeEvents(evList, evListStringLength)
    {
        this.pollCount++;
        if (evList != null) {
            this.unityToJSEventCount += evList.length;
            this.unityToJSEventBytes += evListStringLength;

            for (var i = 0, n = evList.length; i < n; i++) {
                var ev = evList[i];
                this.distributeEvent(ev);
            }

        }

        this.flushJSToUnityEventQueue();
    }


    distributeEvent(ev)
    {
        var eventName = ev.event;
        var id = ev.id;
        var data = ev.data;

        switch (eventName) {

            case "StartedUnity":
                //console.log("Bridge: distributeEvent: StartedUnity:", ev);
                break;

            case "Callback":
                //console.log("Bridge: distributeEvent: Callback:", id, data);
                this.invokeCallback(id, data);
                break;

            default:

                var obj = (id && this.objects[id]) || null;
                if (obj == null) {
                    console.log("Bridge: distributeEvent: undefined object id: " + id + " eventName: " + eventName + " data: " + data);
                    return;
                }

                var interests = obj['interests'];
                if (!interests) {
                    //console.log("Bridge: distributeEvent: no interests for object id: " + id + " eventName: " + eventName + " data: " + data);
                    return;
                }

                var interest = interests[eventName];
                if (interest) {
                    interest.handler(obj, data);
                } else if ((eventName != "Created") &&
                           (eventName != "Destroyed")) {
                    console.log("Bridge: distributeEvent: no interest for object id: " + id + " eventName: " + eventName + " data: " + data);
                }

                if ((eventName == "Destroyed") &
                    (obj != null)) {
                    //console.log("Bridge: distributeEvent: Destroy", "id", ev.id, "obj", obj);
                    delete this.objects[id];
                }

                break;

        }
    }


    evaluateJS(js)
    {
        //console.log("Bridge: evaluateJS: js:", js);

        try {
            eval(js);
        } catch (error) {
            console.log("Bridge: evaluateJS: error:", error, "js:", js);
        }
    }


    consoleLog()
    {
        var parts = [];
        for (var i = 0, n = arguments.length; i < n; i++) {
            parts.push("" + arguments[i]);
        }

        var data = {
            line: parts.join(" ")
        };

        this.sendEvent({
                event: "Log",
                data: data
            });

    }


    pollForEventsAndroid()
    {
        // TODO
    }


    pollForEvents()
    {
        if (this.jsToUnityEventQueue.length == 0) {
            return "";
        }

        var evListString = this.jsToUnityEventQueue.join(',');
        //console.log("Bridge: pollForEvents: queue length: " + this.jsToUnityEventQueue.length + " evListString length: " + evListString.length);

        this.jsToUnityEventQueue = [];

        return evListString;
    }


    flushJSToUnityEventQueue()
    {
        if (!this._Bridge_SendBridgeToUnityEvents) {
            console.log("Bridge: flushJSToUnityEventQueue: _Bridge_SendBridgeToUnityEvents is not defined! jsToUnityEventQueue:", this.jsToUnityEventQueue);
            return;
        }

        if (this.jsToUnityEventQueueTimer) {
            window.clearTimeout(this.jsToUnityEventQueueTimer);
            this.jsToUnityEventQueueTimer = null;
        }

        if (this.jsToUnityEventQueue.length == 0) {
            return null;
        }

        var evListString = this.jsToUnityEventQueue.join(',');
        //console.log("Bridge: flushJSToUnityEventQueue: queue length: " + this.jsToUnityEventQueue.length + " evListString length: " + evListString.length);

        this.jsToUnityEventQueue = [];

        switch (this.driver) {

            case "WebServer":
                // TODO
                break;

            case "WebView":
                window.webkit.messageHandlers.bridge.postMessage(evListString);
                break;

            case "WebGL":
                // WebGL Runtime
                this._Bridge_SendBridgeToUnityEvents(evListString);
                break;

            case "SocketIO":
                this._Bridge_Socket.emit('SendEventList', evListString);
                break;

            case "CEF":
                // Unity Editor Runtime
                unityAsync({
                    className: "Bridge",
                    funcName: "SendEventList",
                    funcArgs: [evListString]
                });
                break;

            default:
                console.log("Bridge: flushJSToUnityEventQueue: unknown driver:", this.driver);
                break;

        }
    }


    load()
    {
        this.handleLoaded();
    }


    boot()
    {
        console.log("Bridge: boot");

        this.nextID = 0;
        this.blobID = 0;
        this.objects = {
            'bridge': this
        };
        this.callbacks = {};
        this.spreadsheets = {};
        this.world = {};
    }


    ////////////////////////////////////////////////////////////////////////
    // Canvas drawing utilities.


    // Draw to a canvas and send its pixels to Unity using a driver specific transport.
    //
    // drawToCanvas(params, drawer, success, error)
    //     params is an object that contains width and height, and is passed to the drawer, success and error functions.
    //     drawer is a function that takes a canvas, a 2d context, the params object, a success function, and an error function.
    //     success function takes a texture object, a uvRect object, and the params object.
    //     texture object is driver specific:
    //         WebGL:    var texture = { type: 'sharedtexture', id: id };
    //             Copies to Unity texture memory with:
    //                 this._Bridge_AllocateTexture(params.width, params.height);
    //                 this._Bridge_UpdateTexture(id, imageData);
    //         SocketID: var texture = { type: 'blob',          width: width, height: height, blobID: blobID };
    //             Sends binary blob with:
    //                 this._Bridge_Socket.binary(true).emit('SendBlob', blobID, blob);
    //         default:  var texture = { type: 'datauri',       width: width, height: height, uri: data };
    //             Sends data uri with:
    //                 canvas.toBlob();
    //                 reader.readAsDataURL(blob);
    //     uvRect object contains x, y, width, and height.
    //     error function takes the params object.
    //
    drawToCanvas(params, drawer, success, error)
    {
        var width = params.width;
        var height = params.height;
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
        canvas.style = 'display: none;';
        document.body.appendChild(canvas);

        //console.log("drawToCanvas", width, height, canvas, drawer);

        drawer(
            canvas,
            context,
            params,
            () => {
                //console.log("drawToCanvas driver", this.driver, "params", params);
                var texture = null;
                switch (this.driver) {

                    case "WebGL":
                        var id = params.cache.sharedTextureID;
                        //console.log("drawToCanvas WebGL sharedTextureID", params.cache.sharedTextureID, "sharedTextureWidth", params.cache.sharedTextureWidth, "sharedTextureHeight", params.cache.sharedTextureHeight, "width", width, "height", height);
                        if (!id ||
                            (width !== params.cache.sharedTextureWidth) ||
                            (height !== params.cache.sharedTextureHeight)) {
                            if (id) {
                                //console.log("Bridge: drawToCanvas: WebGL: resizing FreeTexture: id: " + id + " from: " + params.cache.sharedTextureWidth + " " + params.cache.sharedTextureHeight + " to: " + params.width + " " + params.height);
                                this._Bridge_FreeTexture(id);
                            }
                            params.cache.sharedTextureID = id =
                                this._Bridge_AllocateTexture(width, height);
                            //console.log("Bridge: drawToCanvas: WebGL: AllocateTexture: id: " + id + " width: " + params.width + " height: " + params.height);
                            params.cache.sharedTextureWidth = width;
                            params.cache.sharedTextureHeight = height;
                        }
                        var imageData =
                            context.getImageData(0, 0, width, height);
                        this._Bridge_UpdateTexture(id, imageData);
                        texture = {
                            type: 'sharedtexture',
                            id: id
                        };
                        var uvRect = { x: 0, y: 0, width: 1, height: -1 };
                        //console.log("drawToCanvas WebGL success");
                        success(texture, uvRect, params);
                        canvas.parentNode.removeChild(canvas);
                        break;

                    case "SocketIO":
                        canvas.toBlob((blob) => {
                            var reader = new FileReader();
                            reader.onload = (e) => {
                                var blob = e.target.result;
                                //console.log("Bridge: drawToCanvas: SocketIO: to blob:", blob, "length:", blob.length, "data:", blob[0], blob[1], blob[2], blob[3]);
                                var blobID = this.blobID++;
                                this._Bridge_Socket.binary(true).emit('SendBlob', blobID, blob);
                                var texture = {
                                    type: 'blob',
                                    blobID: blobID,
                                    width: width,
                                    height: height
                                };
                                var uvRect = { x: 0, y: 0, width: 1, height: 1 };
                                success(texture, uvRect, params);
                                canvas.parentNode.removeChild(canvas);
                            };
                            reader.onerror = reader.onabort = (e) => {
                                error(params);
                                canvas.parentNode.removeChild(canvas);
                            };
                            reader.readAsArrayBuffer(blob);
                        });
                        break;

                    default:
                        //console.log("drawToCanvas default width", width, "height", height);
                        canvas.toBlob((blob) => {
                            var reader = new FileReader();
                            reader.onload = (e) => {
                                var data = e.target.result;
                                //console.log("drawToCanvas default onload", e, data);
                                var texture = {
                                    type: 'datauri',
                                    uri: data,
                                    width: width,
                                    height: height
                                };
                                var uvRect = { x: 0, y: 0, width: 1, height: 1 };
                                success(texture, uvRect, params);
                                canvas.parentNode.removeChild(canvas);
                            };
                            reader.onerror = reader.onabort = (e) => {
                                //console.log("drawToCanvas default error", e, params);
                                error(params);
                                canvas.parentNode.removeChild(canvas);
                            };
                            //console.log("drawToCanvas default blob", blob);
                            reader.readAsDataURL(blob);
                        });
                        break;

                }
            },
            () => {
                error(params);
                canvas.parentNode.removeChild(canvas);
            });

        //console.log("drawToCanvas drawer done");

    }


    ////////////////////////////////////////////////////////////////////////
    // Utilities


    getQueryParams()
    {
        var pairs = window.location.search.substring(1).split("&");
        var obj = {};

        for (var i in pairs ) {
            if (pairs[i] === "") continue;

            var pair = pairs[i].split("=");
            obj[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }

        return obj;
    }


    createPlace()
    {
        var world = bridge.world;

        world.leanTweenBridge = bridge.createObject({
            "prefab": "Prefabs/LeanTweenBridge",
            "update": {
                "maxTweens": 1000
            }
        });

        world.light = bridge.createObject({
            "prefab": "Prefabs/Light",
            "update": {
                "component:Light/type": "Directional",
                "transform/localRotation": {
                    "pitch": 40,
                    "yaw": 300
                }
            }
        });

        world.camera = bridge.createObject({
            "prefab": "Prefabs/ProCamera",
            "update": {
                "transform/localPosition": {
                    "x": 0,
                    "y": 10,
                    "z": -10
                },
                "transform/localRotation": {
                    "pitch": 30
                },
                "moveSpeed": 60,
                "yawSpeed": 60,
                "pitchSpeed": 60,
                "orbitYawSpeed": 60,
                "orbitPitchSpeed": 60,
                "wheelPanSpeed": -30,
                "wheelZoomSpeed": 20,
                "positionMin": {
                    "x": -1000,
                    "y": 1,
                    "z": -1000
                },
                "positionMax": {
                    "x": 1500,
                    "y": 1000,
                    "z": 1500
                },
                "pitchMin": -90,
                "pitchMax": 90
            }
        });

        world.ground = bridge.createObject({
            obj: {
                pieID: null,
                getPieID: (obj, results, target) => {
                    return 'topLevel';
                }
            },
            prefab: 'Prefabs/Cuboid',
            update: {
                'transform/localPosition': {
                    x: 0,
                    y: -5,
                    z: 0
                },
                'transform/localScale': {
                    x: 5000,
                    y: 10,
                    z: 5000
                },
                'component:Collider/sharedMaterial': 'PhysicMaterials/HighFrictionLowBounce',
                'component:Rigidbody/isKinematic': true,
                'tiles/index:0/textureScale': {
                    x: 50,
                    y: 50
                },
                'tiles/index:0/component:MeshRenderer/material/method:UpdateMaterial': [
                    {
                        texture_MainTex: 'Textures/Floor'
                    }
                ],
                'tiles/index:1/textureScale': {
                    x: 50,
                    y: 50
                },
                'tiles/index:1/component:MeshRenderer/material/method:UpdateMaterial': [
                    {
                        texture_MainTex: 'Textures/Floor'
                    }
                ],
                'tiles/index:2/textureScale': {
                    x: 50,
                    y: 0.5
                },
                'tiles/index:2/component:MeshRenderer/material/method:UpdateMaterial': [
                    {
                        texture_MainTex: 'Textures/Floor'
                    }
                ],
                'tiles/index:3/textureScale': {
                    x: 50,
                    y: 0.5
                },
                'tiles/index:3/component:MeshRenderer/material/method:UpdateMaterial': [
                    {
                        texture_MainTex: 'Textures/Floor'
                    }
                ],
                'tiles/index:4/textureScale': {
                    x: 50,
                    y: 0.5
                },
                'tiles/index:4/component:MeshRenderer/material/method:UpdateMaterial': [
                    {
                        texture_MainTex: 'Textures/Floor'
                    }
                ],
                'tiles/index:5/textureScale': {
                    x: 50,
                    y: 0.5
                },
                'tiles/index:5/component:MeshRenderer/material/method:UpdateMaterial': [
                    {
                        texture_MainTex: 'Textures/Floor'
                    }
                ]
            },
            interests: {
                MouseDown: {
                    query: {
                        mousePosition: 'mousePosition',
                        shiftKey: 'shiftKey',
                        controlKey: 'controlKey',
                        altKey: 'altKey',
                        isPointerOverUIObject: 'isPointerOverUIObject'
                    },
                    handler: (obj, results) => {
                        obj.mouseDownPosition = results.mousePosition;
                        obj.mousePosition = results.mousePosition;
                        obj.shiftKey = results.shiftKey;
                        obj.controlKey = results.controlKey;
                        obj.altKey = results.altKey;
                        obj.isPointerOverUIObject = results.isPointerOverUIObject;

                        //console.log("ground: MouseDown: mousePosition:", results.mousePosition.x, results.mousePosition.y, "shiftKey:", results.shiftKey, "controlKey:", results.controlKey, "altKey:", results.altKey, "isPointerOverUIObject", results.isPointerOverUIObject);

                        var menuModifiers =
                            results.shiftKey &&
                            !results.controlKey &&
                            !results.altKey;
                        var dragging =
                            !results.isPointerOverUIObject &&
                            !menuModifiers;

                        // Drag:        none
                        // Menu:        shift
                        // Orbit:       control
                        // Tilt:        alt
                        // Pedestal:    alt control
                        // Approach:    alt shift
                        // Interpolate: control shift
                        // Zoom:        alt control shift

                        var tracking = 
                            dragging
                                ? (results.controlKey
                                    ? (results.altKey
                                        ? (results.shiftKey
                                            ? "Zoom" // control alt shift
                                            : "Pedestal") // control alt
                                        : (results.shiftKey
                                            ? "Interpolate" // control shift
                                            : "Orbit")) // control
                                    : (results.altKey
                                        ? (results.shiftKey
                                            ? "Approach" // alt shift
                                            : "Tilt") // alt
                                        : "Drag")) // none
                                : "None";
                        //console.log("dragging: " + dragging + " tracking: " + tracking);

                        if (tracking == "Interpolate") {
                            tracking = null; // TODO
                        }

                        if (tracking) {
                            bridge.updateObject(world.camera, {
                                dragging: dragging,
                                tracking: tracking
                            });
                        }
                    }
                },
                MouseDrag: {
                    query: {
                        mousePosition: 'mousePosition'
                    },
                    handler: (obj, results) => {
                        obj.mousePosition = results.mousePosition;
                        //console.log("ground: MouseDrag: mousePosition:", results.mousePosition.x, results.mousePosition.y);
                    }
                },
                MouseUp: {
                    query: {
                        mousePosition: 'mousePosition'
                    },
                    handler: (obj, results) => {
                        obj.mousePosition = results.mousePosition;
                        //console.log("ground: MouseUp: mousePosition:", results.mousePosition.x, results.mousePosition.y);
                        bridge.updateObject(world.camera, {
                            dragging: false
                        });
                    }
                }
            }
        });

    }


    ////////////////////////////////////////////////////////////////////////

}


////////////////////////////////////////////////////////////////////////


// Simply make Bridge available globally for browser usage
window.Bridge = Bridge;

////////////////////////////////////////////////////////////////////////
