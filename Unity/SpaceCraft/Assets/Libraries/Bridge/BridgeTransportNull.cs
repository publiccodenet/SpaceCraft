using UnityEngine;

public class BridgeTransportNull : BridgeTransport
{
    public override void HandleInit()
    {
        driver = "Null";
        Debug.Log("BridgeTransportNull: HandleInit");
        base.HandleInit();
        // Immediately signal the bridge that the "transport" is ready
        // so the bridge doesn't wait indefinitely.
         if (bridge != null) {
             // Use Task.Run to avoid potential deadlocks if HandleTransportStarted tries
             // to call back into the transport immediately within the same frame.
             System.Threading.Tasks.Task.Run(() => bridge.HandleTransportStarted());
         }
    }

    public override void EvaluateJS(string js)
    {
        // Do nothing
        Debug.Log($"BridgeTransportNull: EvaluateJS called with: {js}");
    }

    public override void SendUnityToBridgeEvents(string evListString)
    {
        // Do nothing
        Debug.Log($"BridgeTransportNull: SendUnityToBridgeEvents called with: {evListString}");
    }

    public override string ReceiveBridgeToUnityEvents()
    {
        // Return null, indicating no events
        //Debug.Log("BridgeTransportNull: ReceiveBridgeToUnityEvents called");
        return null;
    }

    public override void DistributeBridgeEvents()
    {
        // Do nothing - no events coming from JS side
        //Debug.Log("BridgeTransportNull: DistributeBridgeEvents called");
    }

    // Keep HasSharedTexture/Data returning false as default
    // public override bool HasSharedTexture() { return false; }
    // public override bool HasSharedData() { return false; }
    // public override Texture2D GetSharedTexture(int id) { return null; }
    // public override byte[] GetSharedData(int id) { return null; }
} 