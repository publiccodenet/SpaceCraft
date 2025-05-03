# Unity WebGL Startup Sequence (SpaceCraft Template)

This document precisely outlines the step-by-step initialization sequence for the SpaceCraft Unity WebGL application, emphasizing the critical path of function calls and events between HTML, JavaScript (`spacecraft.js`), and the Bridge system.

For detailed information on the Bridge system's internal implementation, refer to its dedicated documentation (e.g., `Bridge/README.md`).

## Core Initialization Flow

1.  **HTML Parsing (`index.html`)**: Browser parses HTML, identifies CSS and JS files.
    *   CSS (`spacecraft.css`) is requested.
    *   External JS libraries (Supabase, QRCode) are requested.
    *   Bridge JS (`bridge.js`, `unity.js`) is requested.
    *   Application JS (`spacecraft.js`) is requested.

2.  **`spacecraft.js` Execution (Initial)**: Browser executes `spacecraft.js` as soon as it's loaded.
    *   **`fetch` initiated**: `window.indexDeepPromise = fetch(...)` starts loading `index-deep.json` asynchronously.
    *   **`SpaceCraft` object defined**: The global `window.SpaceCraft` object is created.
    *   **`DOMContentLoaded` listener attached**: An event listener is set for `DOMContentLoaded` to trigger `SpaceCraft.initializeDOMAndQRCodes()`.

3.  **DOM Ready**: Browser fires `DOMContentLoaded` event.
    *   **Listener triggers**: `SpaceCraft.initializeDOMAndQRCodes()` is called.

4.  **DOM Initialization (`SpaceCraft.initializeDOMAndQRCodes`)**: 
    *   Checks for `QRCode` library availability.
    *   Calls `SpaceCraft.generateQRCodes()`.
    *   Calls `SpaceCraft.configureAndLoadUnity()`.

5.  **QR Code Generation (`SpaceCraft.generateQRCodes`)**: 
    *   Reads `SpaceCraft.qrCodeDefinitions`.
    *   Loops through definitions, dynamically creating HTML elements (`<a>`, `<svg>`, `<div>`) and invoking `QRCode({...})` for each.
    *   Appends generated elements to `#qrcodes-container`.

6.  **Unity Configuration (`SpaceCraft.configureAndLoadUnity`)**: 
    *   Prepares the `config` object for Unity.
    *   Dynamically creates a `<script>` tag for `Build/SpaceCraft.loader.js`.
    *   Assigns an `onload` handler to this script tag.
    *   Appends the script tag to the document, initiating the loader script download.

7.  **Unity Loader Execution (`Build/SpaceCraft.loader.js`)**: Browser downloads and executes the loader script.
    *   **`createUnityInstance` defined**: The loader script defines the global `createUnityInstance` function.
    *   **`onload` handler triggers**: The handler assigned in Step 6 executes.
    *   **`createUnityInstance()` called**: The handler calls `createUnityInstance(canvas, config, progressCallback)`.

8.  **Unity Engine Loading (`createUnityInstance`)**: 
    *   Downloads Unity data (`.data`), framework (`.framework.js`), and code (`.wasm`).
    *   Initializes the Unity engine and WebGL context.
    *   Returns a Promise that resolves when the engine is ready.

9.  **Unity Instance Ready (`.then()` handler in `SpaceCraft.configureAndLoadUnity`)**: The Promise from `createUnityInstance` resolves.
    *   Fullscreen button handler is attached.
    *   **`bridge.start()` called**: `window.bridge.start("WebGL", ...)` is invoked, notifying the Bridge JS that Unity is ready.

10. **Bridge C# Initialization**: The `bridge.start()` call triggers initialization within the Bridge's C# components in Unity.
    *   **`StartedUnity` event sent**: The C# `BridgeTransportWebGL` sends the `StartedUnity` event back to JavaScript via JSLib (`_Bridge_SendBridgeToUnityEvents`).

11. **Bridge JS Event Handling (`bridge.js`)**: The Bridge's central event handler receives the `StartedUnity` event.
    *   **Callback triggered**: Recognizing the event, `bridge.js` calls `SpaceCraft.loadCollectionsAndCreateSpaceCraft()`.

12. **Collections Load & SpaceCraft Creation (`SpaceCraft.loadCollectionsAndCreateSpaceCraft`)**: 
    *   **`await window.indexDeepPromise`**: Waits for the JSON data fetch (initiated in Step 2) to complete.
    *   **`this.createSpaceCraftObject()` called**: If JSON fetch succeeded, passes the loaded `collections` data.

13. **Bridge Object Creation (`SpaceCraft.createSpaceCraftObject`)**: 
    *   **`bridge.createObject()` called**: Sends a request to the Bridge containing prefab path, object ID, interests, and initial `collections` data.
    *   (Bridge system handles instantiation and data application in Unity).
    *   **`this.setupSupabase()` called**: Initiates Supabase setup.

14. **Supabase Setup (`SpaceCraft.setupSupabase`)**: 
    *   Initializes the Supabase client.
    *   Subscribes to `navigators` and `selectors` channels.

## Critical Dependencies & Timing

*   **DOM Readiness**: `initializeDOMAndQRCodes` requires `DOMContentLoaded`.
*   **Script Load Order**: `bridge.js`/`unity.js` must load *before* `spacecraft.js`. `qrcode.min.js` must load *before* `generateQRCodes` executes.
*   **Unity Loader**: `createUnityInstance` function must be defined by `Build/SpaceCraft.loader.js` *before* the `onload` handler in `spacecraft.js` calls it.
*   **`StartedUnity` Event**: `SpaceCraft.loadCollectionsAndCreateSpaceCraft` *only* runs if the C# Bridge sends `StartedUnity` and the JS Bridge correctly handles it.
*   **JSON Data**: `SpaceCraft.createSpaceCraftObject` requires the `indexDeepPromise` to resolve successfully *before* it is called.

Failure to respect these dependencies will break the initialization chain. 