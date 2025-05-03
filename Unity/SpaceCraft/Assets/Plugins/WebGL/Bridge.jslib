/*
* Bridge.jslib
* Unity3D / JavaScript Bridge
* Don Hopkins, Ground Up Software.
*/


mergeInto(LibraryManager.library, {


    //console.log("Bridge.jslib: called mergeInfo ================");

    // Called by Unity when awakened.
    _Bridge_HandleAwake: function _Bridge_HandleAwake(allocateTextureCallback, freeTextureCallback, lockTextureCallback, unlockTextureCallback, allocateDataCallback, freeDataCallback, lockDataCallback, unlockDataCallback)
    {
        //console.log("Bridge.jslib: _Bridge_HandleAwake: allocateTextureCallback: " + allocateTextureCallback + " freeTextureCallback: " + freeTextureCallback + " lockTextureCallback: " + lockTextureCallback + " unlockTextureCallback: " + unlockTextureCallback + allocateDataCallback: " + allocateDataCallback + " freeDataCallback: " + freeDataCallback + " lockDataCallback: " + lockDataCallback + " unlockDataCallback: " + unlockDataCallback);

        if (!window.bridge) {
            window.bridge = new Bridge();
        }

        if (!window.bridge._Bridge_BridgeToUnityEventQueue) {
            window.bridge._Bridge_BridgeToUnityEventQueue = [];
        }

        if (!window.bridge._Bridge_UnityToBridgeEventQueue) {
            window.bridge._Bridge_UnityToBridgeEventQueue = [];
        }

        // Called by JS to queue events to Unity.
        function _Bridge_SendBridgeToUnityEvents (evListString) {
            window.bridge._Bridge_BridgeToUnityEventQueue.push(evListString);
        }

        window.bridge._Bridge_SendBridgeToUnityEvents = _Bridge_SendBridgeToUnityEvents;

        function _Bridge_AllocateTexture(width, height)
        {
            //console.log("Bridge.jslib: _Bridge_AllocateTexture: width: " + width + " height: " + height + " allocateTextureCallback: " + allocateTextureCallback);
            var result = Runtime.dynCall('iii', allocateTextureCallback, [width, height]);
            //console.log("Bridge.jslib: _Bridge_AllocateTexture: result: " + result);
            return result;
        };
        window.bridge._Bridge_AllocateTexture = _Bridge_AllocateTexture;

        function _Bridge_FreeTexture(id)
        {
            //console.log("Bridge.jslib: _Bridge_FreeTexture: id: " + id + " freeTextureCallback: " + freeTextureCallback);
            Runtime.dynCall('vi', freeTextureCallback, [id]);
        }
        window.bridge._Bridge_FreeTexture = _Bridge_FreeTexture;

        function _Bridge_LockTexture(id)
        {
            //console.log("Bridge.jslib: _Bridge_LockTexture: id: " + id + " lockTextureCallback: " + lockTextureCallback);
            var result = Runtime.dynCall('ii', lockTextureCallback, [id]);
            //console.log("Bridge.jslib: _Bridge_LockTexture: result: " + result);
            return result;
        }
        window.bridge._Bridge_LockTexture = _Bridge_LockTexture;

        function _Bridge_UnlockTexture(id)
        {
            //console.log("Bridge.jslib: _Bridge_UnlockTexture: id: " + id + " unlockTextureCallback: " + unlockTextureCallback);
            Runtime.dynCall('vi', unlockTextureCallback, [id]);
        }
        window.bridge._Bridge_UnlockTexture = _Bridge_UnlockTexture;

        function _Bridge_UpdateTexture(id, imageData)
        {
            //console.log("Bridge.jslib: _Bridge_UpdateTexture: id: " + id + " imageData: " + imageData + " width: " + imageData.width + " height: " + imageData.height + " data: " + imageData.data);
            var pointer = _Bridge_LockTexture(id);
            var byteCount = imageData.width * imageData.height * 4;
            var heapBytes = new Uint8Array(Module.HEAPU8.buffer, pointer, byteCount);
            //console.log("Bridge.jslib: _Bridge_UpdateTexture: pointer: " + pointer + " byteCount: " + byteCount + " buffer: " + buffer + " heapBytes: " + heapBytes);
            heapBytes.set(imageData.data);
            _Bridge_UnlockTexture(id);
            //console.log("Bridge.jslib: _Bridge_UpdateTexture: done");
        }
        window.bridge._Bridge_UpdateTexture = _Bridge_UpdateTexture;

        function _Bridge_AllocateData(size)
        {
            //console.log("Bridge.jslib: _Bridge_AllocateData: size: " + size + " allocateDataCallback: " + allocateDataCallback);
            var result = Runtime.dynCall('ii', allocateDataCallback, [size]);
            //console.log("Bridge.jslib: _Bridge_AllocateData: result: " + result);
            return result;
        };
        window.bridge._Bridge_AllocateData = _Bridge_AllocateData;

        function _Bridge_FreeData(id)
        {
            //console.log("Bridge.jslib: _Bridge_FreeData: id: " + id + " freeDataCallback: " + freeDataCallback);
            Runtime.dynCall('vi', freeDataCallback, [id]);
        }
        window.bridge._Bridge_FreeData = _Bridge_FreeData;

        function _Bridge_LockData(id)
        {
            //console.log("Bridge.jslib: _Bridge_LockData: id: " + id + " lockDataCallback: " + lockDataCallback);
            var result = Runtime.dynCall('ii', lockDataCallback, [id]);
            //console.log("Bridge.jslib: _Bridge_LockData: result: " + result);
            return result;
        }
        window.bridge._Bridge_LockData = _Bridge_LockData;

        function _Bridge_UnlockData(id)
        {
            //console.log("Bridge.jslib: _Bridge_UnlockData: id: " + id + " unlockDataCallback: " + unlockDataCallback);
            Runtime.dynCall('vi', unlockDataCallback, [id]);
        }
        window.bridge._Bridge_UnlockData = _Bridge_UnlockData;

        function _Bridge_UpdateData(id, data)
        {
            //console.log("Bridge.jslib: _Bridge_UpdateData: id: " + id + " data: " + data + " length: " + data.length);
            var pointer = _Bridge_LockData(id);
            var byteCount = data.length;
            var heapBytes = new Uint8Array(Module.HEAPU8.buffer, pointer, byteCount);
            //console.log("Bridge.jslib: _Bridge_UpdateData: pointer: " + pointer + " byteCount: " + byteCount + " buffer: " + buffer + " heapBytes: " + heapBytes);
            heapBytes.set(data);
            _Bridge_UnlockData(id);
            //console.log("Bridge.jslib: _Bridge_UpdateData: done");
        }
        window.bridge._Bridge_UpdateData = _Bridge_UpdateData;

    },


    // Called by Unity when destroyed.
    _Bridge_HandleDestroy: function _Bridge_HandleDestroy()
    {
        //console.log("Bridge.jslib: _Bridge_HandleDestroy");
    },


    // Called by Unity to evaluate JS code.
    _Bridge_EvaluateJS: function _Bridge_EvaluateJS(jsPointer)
    {
        var js = UTF8ToString(jsPointer);
        //console.log("Bridge.jslib: _Bridge_EvaluateJS: js:", js);
        bridge.evaluateJS(js);
    },


    // Called by Unity to receive all events from JS.
    _Bridge_ReceiveBridgeToUnityEvents: function _Bridge_ReceiveBridgeToUnityEvents()
    {
        var eventCount = window.bridge._Bridge_BridgeToUnityEventQueue.length;
        if (eventCount == 0) {
            return null;
        }

        var str =
            window.bridge._Bridge_BridgeToUnityEventQueue.join(',');

        window.bridge._Bridge_BridgeToUnityEventQueue.splice(0, eventCount);

        var bufferSize = lengthBytesUTF8(str) + 1;
        var buffer = _malloc(bufferSize);
        stringToUTF8(str, buffer, bufferSize);

        return buffer;
    },


    // Called by Unity to queue events to JS.
    _Bridge_SendUnityToBridgeEvents: function _Bridge_SendUnityToBridgeEvents(evListStringPointer)
    {
        var evListString = UTF8ToString(evListStringPointer);
        window.bridge._Bridge_UnityToBridgeEventQueue.push(evListString);
    },

    // Called by Unity to distribute queued events from Unity to JS.
    _Bridge_DistributeBridgeEvents: function _Bridge_DistributeBridgeEvents()
    {
        var evList = null;
        var evListStringLength = 0;
        var eventCount = window.bridge._Bridge_UnityToBridgeEventQueue.length;

        var evListString = null;
        if (eventCount) {
            evListString = window.bridge._Bridge_UnityToBridgeEventQueue.join(',');
            window.bridge._Bridge_UnityToBridgeEventQueue.splice(0, eventCount);
        }

        if (evListString) {
            var json = "[" + evListString + "]";
            evListStringLength = json.length;
            evList = JSON.parse(json);
        }

        window.bridge.distributeEvents(evList, evListStringLength);
    }


});
