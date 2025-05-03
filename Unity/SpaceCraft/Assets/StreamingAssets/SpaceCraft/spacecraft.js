// SpaceCraft.js - Main JavaScript interface for the SpaceCraft Unity application
// This file handles the entire startup sequence, dependencies, and communication.

// =============================================================================
//                            Startup Sequence Overview
// =============================================================================
// 1. HTML Loads: Basic HTML structure is present.
// 2. Early JSON Fetch: `index-deep.json` fetch is initiated immediately (see below).
// 3. Dependencies Check: Wait for the DOM to be fully loaded.
// 4. QR Code Generation: Generate QR codes for navigator/selector (requires QRCode lib).
// 5. Unity Configuration: Prepare Unity loader configuration.
// 6. Unity Loading: Load the Unity engine (Build/SpaceCraft.loader.js).
// 7. Unity Instance Creation: Create the Unity instance.
// 8. Bridge Initialization: Bridge.js calls `bridge.start("WebGL", ...)` which triggers C# side setup.
// 9. Unity Ready Signal: C# BridgeTransportWebGL sends "StartedUnity" event back to JS.
// 10. SpaceCraft Initialization: The "StartedUnity" event listener (in bridge.js) calls `SpaceCraft.loadCollectionsAndCreateSpaceCraft`.
// 11. Collections Loading: Wait for the early JSON fetch to complete.
// 12. SpaceCraft Object Creation: Create the main SpaceCraft object in the Bridge, passing collections data.
// 13. Supabase Setup: Initialize Supabase client and subscribe to channels for remote control.
// =============================================================================

// =============================================================================
//                                  Dependencies
// =============================================================================
// - HTML Elements: #unity-container, #unity-canvas, #unity-fullscreen-button, #navigator (svg), #selector (svg)
// - Libraries:
//   - bridge.js (core communication)
//   - unity.js (Unity specific Bridge functions)
//   - qrcode.min.js (QR code generation)
//   - supabase-js (optional, for remote control)
// - JSON Data: StreamingAssets/Content/index-deep.json
// - Unity Build Files: Located in the 'Build' directory (loader.js, data, framework.js, etc.)
// =============================================================================

// =============================================================================
//                                     Constants
// =============================================================================

const SUPABASE_URL = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
const DEEP_INDEX_PATH = 'StreamingAssets/Content/index-deep.json';
const NAVIGATOR_HTML_PATH = 'StreamingAssets/SpaceCraft/navigator.html';
const SELECTOR_HTML_PATH = 'StreamingAssets/SpaceCraft/selector.html';

// -----------------------------------------------------------------------------
// Step 2: Early JSON Fetch (Initiated as soon as this script loads)
// -----------------------------------------------------------------------------

// Fetch content data immediately so it's likely ready when needed later.
console.log("[SpaceCraft] Initiating early fetch for index-deep.json");

window.contentPromise = fetch(DEEP_INDEX_PATH)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error("[SpaceCraft] Early fetch for index-deep.json failed:", error);
        // Return null so the await later can detect the failure
        return null;
    });

// -----------------------------------------------------------------------------
// Global SpaceCraft Object Definition
// -----------------------------------------------------------------------------

// Encapsulates all SpaceCraft-specific logic and state.
window.SpaceCraft = {

    spaceCraft: null,       // Reference to the Bridge object representing SpaceCraft in Unity
    isInitialized: false,       // Flag to track if basic init (like QR code check) is done
    domContentLoaded: false,    // Flag to track if DOM is ready
    loadedContent: null,        // Store the loaded content data here
    lastHighlightedItemId: null, // Track the last highlighted item ID
    lastSelectedItemId: null,    // Track the last selected item ID
    
    // --- Controller Registry ---
    // Stores information about currently connected controllers (navigators, selectors, etc.)
    // Key: controllerId (from presence payload), Value: { id: string, type: string, joinedAt: string, ... }
    controllers: {},
    // References to Supabase channels (initialized in setupSupabase)
    controllerChannel: null, // Single channel for all controllers
    
    // --- QR Code Configuration ---

    // Default QR code configuration.
    qrcodeDefaults: {
      dim: 100, // Default dimension (can be overridden in CSS)
      pad: 1,   // Padding around QR code
      pal: ['#000', '#fff'] // Color palette [background, foreground]
    },

    // Define all QR codes to be generated here.
    // Each object needs: id (for SVG element), targetHtml (relative path), label (text below QR code)
    // Added 'position' for CSS layout control
    qrCodeDefinitions: [
        {
            id: "navigator-qr",
            targetHtml: NAVIGATOR_HTML_PATH,
            label: "Navigator",
            position: "top-left"
        },
        {
            id: "selector-qr",
            targetHtml: SELECTOR_HTML_PATH,
            label: "Selector",
            position: "top-right"
        },
        // Add more QR code definitions here if needed, specifying position
    ],

    // --- Core Initialization and Setup ---

    // Step 3 & 4: Called when the DOM is fully loaded.
    // Checks dependencies and generates QR codes.
    initializeDOMAndQRCodes: function() {

        if (this.domContentLoaded) return; // Prevent double execution

        this.domContentLoaded = true;
        console.log("[SpaceCraft] DOM loaded. Initializing QR Codes.");

        // Check for QR Code library dependency
        if (typeof QRCode === 'undefined') {
            console.error("[SpaceCraft] QRCode library (qrcode.min.js) not found! Cannot generate QR codes.");
            return; // Stop further initialization if QR codes can't be generated
        }
        
        // Generate QR codes
        this.generateQRCodes();

        // Basic initialization is considered complete after DOM/QR setup
        this.isInitialized = true; 
        console.log("[SpaceCraft] DOM and QR Code initialization complete.");
        
        // Now that the DOM is ready, proceed to configure and load Unity
        this.configureAndLoadUnity();
    },
    
    // Step 4: Generate QR codes for navigator and selector based on qrCodeDefinitions.
    generateQRCodes: function() {

        console.log("[SpaceCraft] Generating QR codes based on definitions...");
        
        const qrContainer = document.getElementById('qrcodes-container');
        if (!qrContainer) {
            console.error("[SpaceCraft] QR Code container (#qrcodes-container) not found in the DOM.");
            this.isInitialized = false; // Mark as failure if container missing
            return;
        }

        // Clear any existing QR codes in the container (optional, good for updates)
        qrContainer.innerHTML = ''; 

        try {
            // Get the current URL's query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const explicitBaseUrl = urlParams.get('base_url'); // Check for ?base_url=...
            const currentSearchParams = window.location.search;

            let baseDirectory;
            let usingExplicitUrl = false;

            // Use explicit base_url if provided and looks somewhat valid (starts with http)
            if (explicitBaseUrl && explicitBaseUrl.startsWith('http')) {
                // Ensure it ends with a slash if not already present
                baseDirectory = explicitBaseUrl.endsWith('/') ? explicitBaseUrl : explicitBaseUrl + '/';
                usingExplicitUrl = true;
                console.log(`[SpaceCraft QR] Using explicit base_url from parameter: ${baseDirectory}`);
            } else {
                // Fallback: Calculate the base directory path from window.location
                baseDirectory = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                console.log(`[SpaceCraft QR] Using detected origin: ${window.location.origin}`);
                console.log(`[SpaceCraft QR] Calculated Base Directory: ${baseDirectory}`);
            }
            
            if (!usingExplicitUrl) {
                 console.log(`[SpaceCraft QR] Detected Origin: ${window.location.origin}`);
                 console.log(`[SpaceCraft QR] Calculated Base Directory: ${baseDirectory}`);
            }
            console.log(`[SpaceCraft QR] Current Search Params: ${currentSearchParams || '(none)'}`);

            // Loop through the defined QR codes
            this.qrCodeDefinitions.forEach(definition => {
                // Construct the target URL for the link, including the query parameters
                const targetRelativeUrl = definition.targetHtml + currentSearchParams;
                // Construct the full absolute URL for the QR code message
                const fullAbsoluteUrl = new URL(targetRelativeUrl, baseDirectory).toString();
                
                console.log(`[SpaceCraft QR] Generating for ${definition.label} at position '${definition.position || 'default'}':`);
                console.log(`  - Relative URL: ${targetRelativeUrl}`);
                console.log(`  - Absolute URL (for QR & window): ${fullAbsoluteUrl}`);

                // 1. Create the link element (will act as a button/link)
                const linkElement = document.createElement('a');
                linkElement.classList.add('qrcode-link'); // Add a general class for styling
                linkElement.style.cursor = 'pointer'; 

                // Add position class if defined
                if (definition.position) {
                    linkElement.classList.add(`qr-position-${definition.position}`);
                }

                // Define window features (optional, but helps encourage a new window)
                const windowFeatures = 'width=600,height=800,resizable=yes,scrollbars=yes';
                // Define a unique window name based on the definition ID
                const windowName = definition.id + '-window'; // e.g., "navigator-qr-window"

                // Add onclick handler to open in a new window
                linkElement.onclick = (event) => {
                    event.preventDefault(); // Prevent any default link behavior if href was somehow still present
                    console.log(`[SpaceCraft QR Click] Opening ${windowName} for ${definition.label} with URL: ${fullAbsoluteUrl}`);
                    window.open(fullAbsoluteUrl, windowName, windowFeatures);
                    return false; // Prevent further event propagation
                };

                // 2. Generate the QR code SVG
                const qrSvgElement = QRCode({ 
                    ...this.qrcodeDefaults, 
                    msg: fullAbsoluteUrl // Use the full absolute URL + params for the QR code message
                }); 
                qrSvgElement.id = definition.id; // Assign ID
                qrSvgElement.classList.add('qrcode'); // Assign class for styling

                // 3. Create the label element
                const labelElement = document.createElement('div');
                labelElement.classList.add('label');
                labelElement.textContent = definition.label;

                // 4. Assemble the structure: <a> contains QR SVG and label
                linkElement.appendChild(qrSvgElement);
                linkElement.appendChild(labelElement);

                // 5. Append the complete link element to the container
                qrContainer.appendChild(linkElement);
            });

            console.log("[SpaceCraft] QR codes generated successfully.");

        } catch (error) {
            console.error("[SpaceCraft] Error generating QR codes:", error);
             this.isInitialized = false; // Mark initialization as failed
        }
    },

    // Step 5 & 6: Configure and initiate the loading of the Unity instance.
    configureAndLoadUnity: function() {

        console.log("[SpaceCraft] Configuring Unity...");

        // Ensure Bridge is available (should be loaded via script tag before this)
        window.bridge = window.bridge || new Bridge();
        if (!window.bridge || typeof window.bridge.start !== 'function') {
             console.error("[SpaceCraft] CRITICAL: Bridge object not found or invalid!");
             return; // Cannot proceed without the Bridge
        }
        console.log("[SpaceCraft] Bridge instance checked/created.");

        // --- Unity Loader Configuration ---
        // Note: Template variables like {{{ LOADER_FILENAME }}} are replaced by Unity during build.
        const buildUrl = "Build";

        // IMPORTANT: Make sure these template variables match your Unity WebGL template settings
        const loaderUrl = buildUrl + "/SpaceCraft.loader.js"; // Assuming default naming
        console.log("[SpaceCraft] Unity loader URL:", loaderUrl);

        const config = {
            dataUrl: buildUrl + "/SpaceCraft.data",
            frameworkUrl: buildUrl + "/SpaceCraft.framework.js",
            codeUrl: buildUrl + "/SpaceCraft.wasm", // Assuming WASM build
            streamingAssetsUrl: "StreamingAssets",
            companyName: "SpaceCraft",
            productName: "SpaceCraft",
            productVersion: "0.1",
            // --- Optional Parameters (Uncomment/adjust if used) ---
            // memoryUrl: buildUrl + "/{{{ MEMORY_FILENAME }}}", 
            // symbolsUrl: buildUrl + "/{{{ SYMBOLS_FILENAME }}}", 
        };
        console.log("[SpaceCraft] Unity configuration prepared:", config);

        // --- Get DOM Elements ---
        const container = document.querySelector("#unity-container");
        const canvas = document.querySelector("#unity-canvas");
        const fullscreenButton = document.querySelector("#unity-fullscreen-button");
        // const progressBarFull = document.getElementById("unity-progress-bar-full"); // Optional progress bar

        if (!container || !canvas || !fullscreenButton) {
            console.error("[SpaceCraft] Required DOM elements (#unity-container, #unity-canvas, #unity-fullscreen-button) not found.");
            return; // Cannot proceed without essential DOM elements
        }
        console.log("[SpaceCraft] Unity DOM elements retrieved.");

        // Force canvas fullscreen sizing
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        // --- Load Unity Script ---
        console.log("[SpaceCraft] Creating Unity loader script element...");
        const script = document.createElement("script");
        script.src = loaderUrl;
        
        // --- Define Unity Instance Creation Logic (runs after loader script loads) ---
        script.onload = () => {

            console.log("[SpaceCraft] Unity loader script loaded. Creating Unity instance...");
            
            // Check if createUnityInstance function exists (it should be defined by loaderUrl script)
            if (typeof createUnityInstance === 'undefined') {
                console.error("[SpaceCraft] createUnityInstance function not found. Unity loader script might have failed.");
                return;
            }

            createUnityInstance(canvas, config, (progress) => {
                // Optional: Update loading progress UI
                 console.log("[SpaceCraft] Unity loading progress:", Math.round(progress * 100) + "%");
                // if (progressBarFull) {
                //     progressBarFull.style.width = 100 * progress + "%";
                // }
            }).then((unityInstance) => {
                // Step 7: Unity Instance Creation Complete
                console.log("[SpaceCraft] Unity instance created successfully.");

                // Store Unity instance globally for access
                window.unityInstance = unityInstance;

                // Setup fullscreen button functionality
                fullscreenButton.onclick = () => {
                    console.log("[SpaceCraft] Fullscreen button clicked.");
                    unityInstance.SetFullscreen(1);
                };

                // Step 8: Initialize Bridge
                // This tells the Bridge JS library that Unity is ready and provides the instance.
                // The Bridge library internally handles linking with the Unity instance.
                // Bridge C# code (BridgeTransportWebGL.Awake/Start) will eventually send "StartedUnity".
                console.log("[SpaceCraft] Starting Bridge with WebGL driver (triggers C# setup).");
                window.bridge.start("WebGL", JSON.stringify({})); // Empty config for now
                console.log("[SpaceCraft] Bridge start initiated. Waiting for 'StartedUnity' event from C#...");

            }).catch((message) => {
                console.error("[SpaceCraft] Error creating Unity instance:", message);
            });
        };
        
        // --- Add Loader Script to Document ---
        document.body.appendChild(script);
        console.log("[SpaceCraft] Unity loader script added to document.");
    },

    // Step 10, 11, 12: Load Content and Create the SpaceCraft Bridge Object.
    // This function is EXPORTED and designed to be called externally by bridge.js 
    // when the "StartedUnity" event is received from the C# side.
    loadCollectionsAndCreateSpaceCraft: async function() {
        console.log("[SpaceCraft] 'StartedUnity' event received. Loading content and creating SpaceCraft object...");

        // Ensure basic initialization (DOM, QR codes) happened. It should have by now.
        if (!this.isInitialized) {
            console.warn("[SpaceCraft] loadCollectionsAndCreateSpaceCraft called before basic initialization was complete. This might indicate a timing issue.");
            // Attempt to initialize now, though it might be too late for some steps
            this.initializeDOMAndQRCodes(); 
            if (!this.isInitialized) {
                console.error("[SpaceCraft] Basic initialization failed. Aborting SpaceCraft object creation.");
                return;
            }
        }
        
        // Ensure Bridge is available
        if (!window.bridge) {
            console.error("[SpaceCraft] Bridge not available when trying to create SpaceCraft object.");
            return;
        }

        // Step 11: Wait for the early JSON fetch to complete
        console.log("[SpaceCraft] Waiting for contentPromise to resolve...");
        const content = await window.contentPromise;

        // Check if fetch failed
        if (content === null) {
            console.error("[SpaceCraft] Failed to load content from index-deep.json. Cannot create SpaceCraft object with real data.");
            // Decide how to handle: use placeholder, show error, etc.
            // Example: this.createSpaceCraft(this.getPlaceholderContent()); 
            return; // Abort if content is essential
        }
        console.log("[SpaceCraft] Content data loaded successfully.");

        // Store the loaded content for later use (e.g., presence)
        this.loadedContent = content;

        // Step 12: Create the SpaceCraft object via the Bridge
        this.createSpaceCraft(content);
    },

    // Step 12 (continued): Creates the actual SpaceCraft object in the Bridge.
    createSpaceCraft: function(content) {
        console.log("[SpaceCraft] Creating SpaceCraft object in Bridge with loaded content...");
        try {
            this.spaceCraft = window.bridge.createObject({
                prefab: "Prefabs/SpaceCraft", // Path within Resources folder
                obj: {
                    id: "spacecraft", // Unique ID for this object in the Bridge
                    // Define interests (events from Unity we want to listen to)
                    interests: {
                        "ContentLoaded": { // Event name from Unity
                            handler: (obj, data) => {
                                console.log("[SpaceCraft <-> Unity] Event: ContentLoaded", data);
                            }
                        },
                        "HighlightedItemsChanged": {
                            query: { "highlightedItemIds": "HighlightedItemIds" }, // Data to request
                            handler: (obj, results) => {
                                if (results.highlightedItemIds.length > 0) {
                                    this.lastHighlightedItemId = results.highlightedItemIds[0];
                                }
                                console.log("[SpaceCraft <-> Unity] Event: HighlightedItemsChanged:", results, 'lastHighlightedItemId:', this.lastHighlightedItemId);
                            }
                        },
                        "SelectedItemsChanged": {
                            query: { "selectedItemIds": "SelectedItemIds" },
                            handler: (obj, results) => {
                                if (results.selectedItemIds.length > 0) {
                                    this.lastSelectedItemId = results.selectedItemIds[0];
                                }
                                console.log("[SpaceCraft <-> Unity] Event: SelectedItemsChanged:", results, 'lastSelectedItemId:', this.lastSelectedItemId);
                            }
                        }
                        // Add other interests as needed
                    }
                },
                // Initial data to send when the object is created. 
                // This loads all the content into Unity and creates all the views.
                update: {
                    content: content 
                }
            });

            // Store a global reference for convenience (optional)
            window.spaceCraft = this.spaceCraft;
            console.log("[SpaceCraft] SpaceCraft Bridge object created successfully:", this.spaceCraft);

            // Step 13: Set up Supabase for remote control (if library is available)
            this.setupSupabase();

        } catch (error) {
            console.error("[SpaceCraft] Error creating SpaceCraft Bridge object:", error);
        }
    },

    // --- Supabase Integration (Remote Control) ---
    
    // Step 13: Initialize Supabase client and subscriptions.
    setupSupabase: function() {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.warn("[SpaceCraft] Supabase library not found or invalid. Skipping remote control setup.");
            return;
        }
        
        console.log("[SpaceCraft] Setting up Supabase for remote control...");
        try {
            const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Initialize single channel
            this.controllerChannel = client.channel("controllers");

            // Subscribe to the single channel
            this.subscribeToControllerChannel(this.controllerChannel, this.loadedContent);

            console.log("[SpaceCraft] Supabase setup complete and channels subscribed.");

        } catch (error) {
            console.error("[SpaceCraft] Error setting up Supabase:", error);
        }
    },

    subscribeToControllerChannel: function(channel, currentContent) {
        console.log("[SpaceCraft] Subscribing to single Supabase 'controllers' channel...");

        channel
            .on('broadcast', { event: 'pan' }, (data) => { 
                if (window.bridge && this.spaceCraft && data.payload 
                    && typeof data.payload.controllerId === 'string'
                    && typeof data.payload.controllerType === 'string') 
                {
                    const { controllerId, controllerType } = data.payload;
                    
                    // Dispatch based on controller type
                    if (controllerType === 'navigator' 
                        && typeof data.payload.panXDelta === 'number' 
                        && typeof data.payload.panYDelta === 'number') 
                    {
                        const { panXDelta, panYDelta } = data.payload;
                        const controllerName = this.controllers[controllerId]?.controllerName || '';
                        // Send data to Unity via bridge update: controllerId, controllerName, panXDelta, panYDelta
                        if (this.spaceCraft) { // Ensure bridge object exists
                            bridge.updateObject(this.spaceCraft, {
                                "method:PushCameraPosition": [controllerId, controllerName, panXDelta, panYDelta]
                            });
                        } else {
                            console.warn("[SpaceCraft] Cannot send 'pan' update, spaceCraft is null.");
                        }
                    } else if (controllerType === 'selector'
                               && typeof data.payload.selectXDelta === 'number' 
                               && typeof data.payload.selectYDelta === 'number') 
                    {
                        const { selectXDelta, selectYDelta } = data.payload;
                        const controllerName = this.controllers[controllerId]?.controllerName || '';
                        
                        // Convert tilt values to directions
                        // Use larger threshold for tilt (0.3) compared to typical swipe thresholds
                        const tiltThreshold = 0.3;
                        let direction = null;
                        
                        // Determine the dominant direction based on which delta is larger
                        if (Math.abs(selectXDelta) > Math.abs(selectYDelta)) {
                            // X-axis tilt is dominant
                            if (selectXDelta > tiltThreshold) {
                                direction = 'east';
                            } else if (selectXDelta < -tiltThreshold) {
                                direction = 'west';
                            }
                        } else {
                            // Y-axis tilt is dominant
                            if (selectYDelta > tiltThreshold) {
                                direction = 'south';  // Positive Y is down
                            } else if (selectYDelta < -tiltThreshold) {
                                direction = 'north';  // Negative Y is up
                            }
                        }
                        
                        // If we detected a significant tilt in a direction, send the movement command
                        // using the SAME method as stroke gestures
                        if (direction) {
                            console.log(`[Supabase -> Unity] Selector tilt from ${controllerId} ('${controllerName}'): Direction=${direction}`);
                            bridge.updateObject(this.spaceCraft, {
                                "method:MoveHighlight": [controllerId, controllerName, direction]
                            });
                        }
                    } else {
                        console.warn(`[SpaceCraft] Received 'pan' event from ${controllerId} with invalid type or missing pan data:`, data.payload);
                    }
                } else {
                     if (data.payload) {
                        console.warn("[SpaceCraft] Received 'pan' event with missing/invalid core data (controllerId/Type):", data.payload);
                    }
                }
            })
            .on('broadcast', { event: 'zoom' }, (data) => {
                if (window.bridge && this.spaceCraft && data.payload 
                    && typeof data.payload.controllerId === 'string'
                    && typeof data.payload.controllerType === 'string'
                    && typeof data.payload.zoomDelta === 'number') 
                {
                     const { controllerId, controllerType, zoomDelta } = data.payload;
                     
                     // Dispatch based on controller type
                     if (controllerType === 'navigator') {
                         const controllerName = this.controllers[controllerId]?.controllerName || ''; // Get name or mysterious default
                         bridge.updateObject(this.spaceCraft, {
                            // Pass controllerId, controllerName, zoomDelta
                            "method:PushCameraZoom": [controllerId, controllerName, zoomDelta]
                        });
                     } else {
                         console.warn(`[SpaceCraft] Received 'zoom' event from ${controllerId} with invalid type:`, data.payload);
                     }
                } else {
                    if (data.payload) {
                        console.warn("[SpaceCraft] Received 'zoom' event with missing/invalid data:", data.payload);
                     }
                }
            })
            .on('broadcast', { event: 'select' }, (data) => {
                // --- Handle Selector Events --- 
                if (window.bridge && this.spaceCraft && data.payload 
                    && typeof data.payload.controllerId === 'string'
                    && typeof data.payload.controllerType === 'string'
                    && data.payload.controllerType === 'selector' // Ensure it's from a selector
                    && typeof data.payload.action === 'string') 
                {
                    const { controllerId, controllerName, action } = data.payload;
                    console.log(`[Supabase -> Unity] Selector event from ${controllerId} ('${controllerName}'): Action=${action}`);

                    if (action === 'tap') {
                        bridge.updateObject(this.spaceCraft, {
                            // Target the InputManager's SelectItem method
                            "method:ToggleHighlightedItemSelection": [controllerId, controllerName]
                        });
                    } else if (['north', 'south', 'east', 'west', 'up', 'down'].includes(action)) {
                        bridge.updateObject(this.spaceCraft, {
                            // Target the InputManager's MoveHighlight method
                            "method:MoveHighlight": [controllerId, controllerName, action]
                        });
                    } else {
                        console.warn(`[SpaceCraft] Received 'select' event with unknown action: ${action}`);
                    }
                } else {
                    if (data.payload) {
                        console.warn("[SpaceCraft] Received 'select' event with missing/invalid data or wrong type:", data.payload);
                    }
                }
            })
            .on('presence', { event: 'sync' }, () => {
                // Initial state sync
                const presenceState = channel.presenceState();
                console.log('[SpaceCraft] Controller Presence SYNC:', JSON.stringify(presenceState));
                // Optional: Populate initial controllers from sync state
                this.controllers = {}; // Clear previous state on sync
                Object.values(presenceState).flat().forEach(p => {
                    // Read properties from presence data using camelCase only
                    const { controllerId, controllerType, controllerName, onlineAt } = p;
                    
                    if (controllerId && controllerType) { 
                        this.controllers[controllerId] = { 
                            controllerId, 
                            controllerType, 
                            controllerName: controllerName || '',
                            joinedAt: onlineAt, 
                            ...p // Include any other tracked data
                        };
                    }
                });
                console.log('[SpaceCraft] Initial controllers registered (sync):', Object.keys(this.controllers).length);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('[SpaceCraft] Controller Presence JOIN:', key, JSON.stringify(newPresences));
                newPresences.forEach(presence => {
                    // Read properties from presence data using camelCase only
                    const { controllerId, controllerType, controllerName, onlineAt } = presence;
                    
                    if (controllerId && controllerType) { 
                        // Add to registry
                        this.controllers[controllerId] = { 
                            controllerId, 
                            controllerType, 
                            controllerName: controllerName || '',
                            joinedAt: onlineAt, 
                            ...presence // Store any other tracked data
                        };
                        console.log(`[SpaceCraft] Controller registered: ID=${controllerId}, Type=${controllerType}`);
                        
                        // Send current content to the newly joined controller
                        this.sendEventToControllerById(controllerId, 'contentUpdate', { content: currentContent });
                    }
                });
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('[SpaceCraft] Controller Presence LEAVE:', key, JSON.stringify(leftPresences));
                leftPresences.forEach(presence => {
                    // Use property from presence event to find ID (camelCase only)
                    const { controllerId } = presence;
                    if (controllerId && this.controllers[controllerId]) { 
                        // Remove from registry
                        delete this.controllers[controllerId];
                        console.log(`[SpaceCraft] Controller unregistered: ID=${controllerId}`);
                    }
                });
            })
            .subscribe((status) => { 
                 if (status === 'SUBSCRIBED') {
                     console.log('[SpaceCraft] Successfully subscribed to Supabase controllers channel!');
                 } else {
                      console.warn('[SpaceCraft] Supabase controllers channel subscription status:', status);
                 }
            });
    },

    // --- Event Sending Functions ---

    /**
     * Sends a Supabase broadcast event on the channel associated with a specific controller ID.
     * Note: This still broadcasts to *all* subscribers on that channel.
     *       Targeting requires client-side filtering or different Supabase features (e.g., direct messages if available/needed).
     * @param {string} controllerId - The unique ID of the target controller.
     * @param {string} eventName - The name of the event to broadcast.
     * @param {object} payload - The data payload for the event.
     */
    sendEventToControllerById: function(controllerId, eventName, payload) {
        const controllerInfo = this.controllers[controllerId];
        if (!controllerInfo) {
            console.warn(`[SpaceCraft] Cannot send event: Controller ID '${controllerId}' not found in registry.`);
            return;
        }

        // Use the single controller channel
        const targetChannel = this.controllerChannel;

        if (!targetChannel) {
            console.error(`[SpaceCraft] Cannot send event: Controller channel not initialized.`);
            return;
        }

        // Log includes the intended recipient's type and ID for clarity, though it broadcasts channel-wide
        console.log(`[SpaceCraft -> Supabase] Broadcasting to 'controllers' channel (for ${controllerInfo.controllerType} controllerId ${controllerId}): Event='${eventName}', Payload=`, payload);
        targetChannel.send({
            type: 'broadcast',
            event: eventName,
            payload: payload // Ensure the payload sent here is structured as expected by receivers
        }).catch(err => console.error(`[SpaceCraft] Error broadcasting event '${eventName}' on 'controllers' channel (intended for controllerId '${controllerId}'):`, err));
    },

    // --- Utility / Placeholder ---

    getPlaceholderContent: function() {
        // Used if loading from JSON fails
        console.warn("[SpaceCraft] Using placeholder content data.");
        // Return placeholder structure matching index-deep.json
        return { /* ... placeholder data ... */ }; 
    },
    
    // --- Debugging ---
    
    logStatus: function() {
        console.log("[SpaceCraft Debug] Status:", {
             DOMReady: this.domContentLoaded,
             BasicInitialized: this.isInitialized,
             BridgeAvailable: !!window.bridge,
             SpaceCraft: !!this.spaceCraft,
             SupabaseLoaded: typeof supabase !== 'undefined'
        });
    }
};

// -----------------------------------------------------------------------------
// Step 3: Entry Point - Wait for DOMContentLoaded
// -----------------------------------------------------------------------------
// Ensures the HTML structure (canvas, buttons, svg placeholders) is ready 
// before attempting to interact with it or generate QR codes.
if (document.readyState === 'loading') {
    // Loading hasn't finished yet
    document.addEventListener('DOMContentLoaded', () => {
        SpaceCraft.initializeDOMAndQRCodes();
        // Optional: Log status periodically for debugging startup issues
        // setInterval(() => SpaceCraft.logStatus(), 5000); 
    });
} else {
    // DOMContentLoaded has already fired
    SpaceCraft.initializeDOMAndQRCodes();
    // Optional: Log status periodically for debugging startup issues
    // setInterval(() => SpaceCraft.logStatus(), 5000);
}

console.log("[SpaceCraft] spacecraft.js loaded. Waiting for DOMContentLoaded to initialize...");

// =============================================================================
//                      Bridge Event Handling (Implicit)
// =============================================================================
// NOTE: The crucial step of listening for "StartedUnity" and calling 
// `SpaceCraft.loadCollectionsAndCreateSpaceCraft` is handled within 
// `bridge.js`. This keeps the event distribution logic centralized in the 
// Bridge library itself. See `bridge.js`'s `distributeEvent` function (or similar).
// ============================================================================= 