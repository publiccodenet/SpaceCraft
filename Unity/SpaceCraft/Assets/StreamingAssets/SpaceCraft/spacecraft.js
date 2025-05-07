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
//                         Message and Event Documentation
// =============================================================================
// This section documents all messages exchanged between Unity and controllers
// via Bridge and Supabase to facilitate remote control and data synchronization.
//
// --- BRIDGE INTERESTS (Events from Unity that JS listens to) ---
// "ContentLoaded": Unity signals when content is processed successfully.
// "HighlightedItemsChanged": Unity signals when highlighted items change.
//    - Queries for: highlightedItemIds (List<string>)
//    - JS stores complete list in highlightedItemIds property
// "SelectedItemsChanged": Unity signals when selected items change.
//    - Queries for: selectedItemIds (List<string>)
//    - JS stores complete list in selectedItemIds property
//
// --- STATE PROPERTIES (synchronized via presence) ---
// Simulator shares these properties in its presence state:
// - selectedItemIds: Array of all currently selected item IDs
// - highlightedItemIds: Array of all currently highlighted item IDs
// - selectedItemId: First item from selectedItemIds array
// - highlightedItemId: First item from highlightedItemIds array
// - selectedItem: Metadata for current selected item (without nested tree)
// - highlightedItem: Metadata for highlighted item (without nested tree)
// - currentCollectionId: ID of the currently active collection
// - currentCollection: Metadata for the current collection (without items array)
// - currentCollectionItems: Array of item IDs in the current collection
// - screenIds: Array of available screen IDs
// - currentScreenId: Current active screen ID
//
// --- BRIDGE METHODS (Called from JS to Unity) ---
// "PushCameraPosition": [clientId, clientName, screenId, panXDelta, panYDelta]
//    - Moves the camera position based on client input
// "PushCameraZoom": [clientId, clientName, screenId, zoomDelta]
//    - Zooms the camera based on client input
// "ToggleHighlightedItemSelection": [clientId, clientName, screenId]
//    - Toggles selection state of the currently highlighted item
// "MoveHighlight": [clientId, clientName, screenId, direction]
//    - Moves highlight in specified direction ("north","south","east","west","up","down")
//
// --- SUPABASE EVENTS (From clients to simulator) ---
// 'broadcast' { event: 'pan' }: 
//    - From navigator: {clientId, clientType, clientName, panXDelta, panYDelta, screenId, targetSimulatorId}
//    - From selector: {clientId, clientType, clientName, selectXDelta, selectYDelta, screenId, targetSimulatorId}
//    - Used for continuous movement input
// 'broadcast' { event: 'zoom' }:
//    - {clientId, clientType, clientName, zoomDelta, screenId, targetSimulatorId}
//    - Controls camera zoom level
// 'broadcast' { event: 'select' }:
//    - {clientId, clientType, clientName, action, screenId, targetSimulatorId}
//    - action can be "tap" or directional ("north","south","east","west","up","down")
//    - "tap" calls ToggleHighlightedItemSelection
//    - Directions call MoveHighlight
// 'broadcast' { event: 'simulator_takeover' }:
//    - {newSimulatorId, newSimulatorName, startTime}
//    - Signals that a new simulator has taken control
//    - Used to manage multiple simulator instances
//
// --- PRESENCE EVENTS (Client connection tracking) ---
// 'presence' { event: 'sync' }: Full state of all connected clients
// 'presence' { event: 'join' }: New client connects
//    - Sends 'contentUpdate' event to the new client with content data
// 'presence' { event: 'leave' }: Client disconnects
//
// --- EVENTS SENT TO CLIENTS ---
// 'contentUpdate': {content: contentData}
//    - Sent to newly joined clients with content data
// 'selectedItemIdUpdated': {selectedItemId: string}
//    - Sent to all clients when the current item (first selected item) changes
//    - Helps clients synchronize their UI with the main application state
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

/**
 * SpaceCraft class - encapsulates all SpaceCraft-specific logic and state.
 * Manages the startup sequence, communication with Unity, and remote control via Supabase.
 */
class SpaceCraftSim {
    /**
     * Static constants
     */
    static get SUPABASE_URL() { return 'https://gwodhwyvuftyrvbymmvc.supabase.co'; }
    static get SUPABASE_ANON_KEY() { return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc'; }
    static get DEEP_INDEX_PATH() { return 'StreamingAssets/Content/index-deep.json'; }
    static get NAVIGATOR_HTML_PATH() { return 'StreamingAssets/SpaceCraft/navigator.html'; }
    static get SELECTOR_HTML_PATH() { return 'StreamingAssets/SpaceCraft/selector.html'; }
    static get CONTROLLER_CHANNEL_NAME() { return 'controllers'; }

    /**
     * Constructor - initializes instance properties
     */
    constructor() {
        // Generate our clientId first so it's available to other initialization methods
        this.clientId = this.generateClientId();
        
        // Identity - constant properties of this client 
        this.identity = {
            clientId: this.clientId, // Unique ID for this simulator instance
            clientType: "simulator", // Fixed type for simulator
            clientName: "SpaceCraft Simulator", // Human-readable name
            startTime: Date.now() // When this simulator instance started
        };

        // Initialize state with default values
        this.initializeState();

        // Private non-shared state
        this.spaceCraft = null; // Reference to the Bridge object representing SpaceCraft in Unity
        this.isInitialized = false; // Flag to track if basic init (like QR code check) is done
        this.domContentLoaded = false; // Flag to track if DOM is ready
        this.loadedContent = null; // Store the loaded content data here (private to simulator)
        
        // --- Client Registry ---
        // Stores information about currently connected clients
        this.clients = {}; // Key: clientId, Value: client info object
        
        // Supabase channel reference
        this.clientChannel = null;
        this.presenceVersion = 0; // For tracking changes to presence state
        
        // Fetch timeout reference
        this.contentFetchTimeout = null;
        
        // QR Code configuration
        this.qrcodeDefaults = {
      dim: 100, // Default dimension (can be overridden in CSS)
            pad: 1, // Padding around QR code
      pal: ['#000', '#fff'] // Color palette [background, foreground]
        };
        
        // Define all QR codes to be generated
        this.qrCodeDefinitions = [
            {
                id: "navigator-qr",
                targetHtml: SpaceCraftSim.NAVIGATOR_HTML_PATH,
                label: "Navigator",
                position: "top-left"
            },
            {
                id: "selector-qr",
                targetHtml: SpaceCraftSim.SELECTOR_HTML_PATH,
                label: "Selector",
                position: "top-right"
            },
            {
                id: "inspector-qr",
                targetHtml: "StreamingAssets/SpaceCraft/inspector.html",
                label: "Inspector",
                position: "bottom-left" // Or another suitable position
            },
        ];
        
        // Initialize content promise
        this.initContentPromise();
    }
    
    /**
     * Generates a unique client ID
     */
    generateClientId() {
        return 'simulator_' + Math.random().toString(36).substring(2, 10);
    }
    
    /**
     * Initializes the content promise to fetch data early
     */
    initContentPromise() {
        console.log("[SpaceCraft] Initiating early fetch for index-deep.json");
        
        window.contentPromise = fetch(SpaceCraftSim.DEEP_INDEX_PATH)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error("[SpaceCraft] Early fetch for index-deep.json failed:", error);
                throw error; // Re-throw the error, don't swallow it
            });
    }
    
    /**
     * Called when the DOM is fully loaded. Checks dependencies and generates QR codes.
     */
    initializeDOMAndQRCodes() {
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
    }
    
    /**
     * Generate QR codes for navigator and selector based on qrCodeDefinitions.
     */
    generateQRCodes() {
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
    }

    /**
     * Configure and initiate the loading of the Unity instance.
     */
    configureAndLoadUnity() {
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
                // Unity Instance Creation Complete
                console.log("[SpaceCraft] Unity instance created successfully.");

                // Store Unity instance globally for access
                window.unityInstance = unityInstance;

                // Setup fullscreen button functionality
                fullscreenButton.onclick = () => {
                    console.log("[SpaceCraft] Fullscreen button clicked.");
                    unityInstance.SetFullscreen(1);
                };

                // Initialize Bridge
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
    }

    /**
     * Fetch content from the early content promise or make a new fetch
     * @returns {Promise<Object>} Content data
     */
    async fetchContent() {
        try {
            // Use the early fetch result if available
            if (window.contentPromise) {
                try {
                    const content = await window.contentPromise;
                    if (content) {
                        console.log("[SpaceCraft] Successfully loaded content from early fetch");
                        return content;
                    }
                } catch (earlyFetchError) {
                    console.warn("[SpaceCraft] Early fetch failed, falling back to direct fetch:", earlyFetchError);
                }
            }
            
            // Direct fetch if early fetch failed or wasn't available
            console.log(`[SpaceCraft] Fetching content from ${SpaceCraftSim.DEEP_INDEX_PATH}`);
            const response = await fetch(SpaceCraftSim.DEEP_INDEX_PATH);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
            }
            
            const content = await response.json();
            console.log("[SpaceCraft] Content fetch successful, got:", 
                Object.keys(content).join(", ")
            );
            
            // Return the exact content as-is, expecting it to be correctly formatted
            return content;
        } catch (error) {
            console.error("[SpaceCraft] Error in fetchContent:", error);
            throw error; // Rethrow the error - fail fast, don't return fake data
        }
    }

    /**
     * Load Content and Create the SpaceCraft Bridge Object.
     * This function is called externally by bridge.js when the "StartedUnity" event is received.
     */
    async loadCollectionsAndCreateSpaceCraft() {
        console.log("[SpaceCraft] 'StartedUnity' event received. Loading content and creating SpaceCraft object...");

        // Ensure basic initialization (DOM, QR codes) happened. It should have by now.
        if (!this.isInitialized) {
            console.warn("[SpaceCraft] loadCollectionsAndCreateSpaceCraft called before basic initialization was complete. This might indicate a timing issue.");
            // Attempt to initialize now, though it might be too late for some steps
            this.initializeDOMAndQRCodes();
        }

        try {
            // Clear any previous timeout if it exists
            if (this.contentFetchTimeout) {
                clearTimeout(this.contentFetchTimeout);
                this.contentFetchTimeout = null;
            }

            // Load content
            this.loadedContent = await this.fetchContent();
            
            // DIRECT OBJECT ACCESS - collections is an object, not an array
            const defaultCollection = this.loadedContent.collections[this.state.currentCollectionId];
            if (defaultCollection) {
                // Store minimal collection metadata without items array
                this.state.currentCollection = {
                    id: defaultCollection.id,
                    name: defaultCollection.collection.name,
                    description: defaultCollection.collection.description
                };
                
                // Store array of item IDs from the itemsIndex (single source of truth)
                this.state.currentCollectionItems = defaultCollection.itemsIndex;
            } else {
                console.warn(`[SpaceCraft] Collection with ID '${this.state.currentCollectionId}' not found in content.`);
            }

            // Create the SpaceCraft object via Bridge - pass content exactly as received
            const success = this.createSpaceCraftObject(this.loadedContent);
            
            // Only attempt Supabase setup if SpaceCraft was created successfully
            if (success !== false && typeof window.supabase?.createClient === 'function') {
                this.setupSupabase();
                
                if (this.clientChannel) {
                    this.setupSupabaseChannel();
                }
            } else if (!success) {
                console.warn("[SpaceCraft] Skipping Supabase setup due to SpaceCraft creation failure");
            } else {
                console.warn("[SpaceCraft] Supabase client not available or incompatible. No real-time functionality.");
            }
            
            console.log("[SpaceCraft] Content loaded and SpaceCraft object created.");
        } catch (error) {
            console.error("[SpaceCraft] Error in loadCollectionsAndCreateSpaceCraft:", error);
            throw error; // Rethrow to show the error without hiding it
        }
    }

    /**
     * Creates the actual SpaceCraft object in the Bridge.
     * @param {Object} content - The content data to initialize SpaceCraft with
     * @returns {boolean} Success or failure
     */
    createSpaceCraftObject(content) {
        console.log("[SpaceCraft] Creating SpaceCraft object in Bridge with loaded content...");
        
        // Create the actual SpaceCraft object via Bridge with content data
        this.spaceCraft = window.bridge.createObject({
            prefab: "Prefabs/SpaceCraft",
            // Register all necessary Unity event interests with proper query structure
            interests: {
                // Listen for when content is processed in Unity
                "ContentLoaded": {
                    handler: () => {
                        console.log("[SpaceCraft] ContentLoaded event received from Unity");
                    }
                },
                
                // Listen for changes to highlighted items
                "HighlightedItemsChanged": {
                    query: { "highlightedItemIds": "HighlightedItemIds" },
                    handler: (obj, results) => {
                        console.log("[SpaceCraft JS EVENT HANDLER] HighlightedItemsChanged HANDLER ENTERED"); 
                        console.log("[SpaceCraft JS DEBUG] Raw HighlightedItemsChanged event from Unity. Results:", JSON.parse(JSON.stringify(results)));
                        if (results && results.highlightedItemIds) {
                            this.state.highlightedItemIds = results.highlightedItemIds;
                            console.log("[SpaceCraft JS DEBUG] Calling updateHighlightedItem(). New IDs:", JSON.parse(JSON.stringify(this.state.highlightedItemIds)));
                            this.updateHighlightedItem();
                        } else {
                            console.warn("[SpaceCraft JS DEBUG] HighlightedItemsChanged event: results or results.highlightedItemIds is missing.", results);
                        }
                    }
                },
                
                // Listen for changes to selected items
                "SelectedItemsChanged": {
                    query: { "selectedItemIds": "SelectedItemIds" },
                    handler: (obj, results) => {
                        console.log("[SpaceCraft JS EVENT HANDLER] SelectedItemsChanged HANDLER ENTERED"); 
                        console.log("[SpaceCraft JS DEBUG] Raw SelectedItemsChanged event from Unity. Results:", JSON.parse(JSON.stringify(results)));
                        if (results && results.selectedItemIds) {
                            this.state.selectedItemIds = results.selectedItemIds;
                            console.log("[SpaceCraft JS DEBUG] Calling updateSelectedItem(). New IDs:", JSON.parse(JSON.stringify(this.state.selectedItemIds)));
                            this.updateSelectedItem();
                        } else {
                            console.warn("[SpaceCraft JS DEBUG] SelectedItemsChanged event: results or results.selectedItemIds is missing.", results);
                        }
                    }
                }
            },
            // Initial data to send when the object is created.
            update: { 
                content: content
            }
        });
        
        // Store the reference globally
        window.spaceCraft = this.spaceCraft;
        
        console.log("[SpaceCraft] SpaceCraft object created with content data");
        return true;
    }
    
    /**
     * Initialize state object with default values
     */
    initializeState() {
        // Default state for simulator
        this.state = {
            // Client identity
            clientType: 'simulator',
            clientId: this.clientId,
            clientName: 'Spacecraft Simulator',
            
            // Collection/screen state
            currentScreenId: 'main',
            screenIds: ['main'],
            currentCollectionId: 'scifi',  // Default collection
            currentCollection: null,
            currentCollectionItems: [],
            
            // Selection state
            selectedItemIds: [],
            selectedItemId: null,
            selectedItem: null,
            
            // Highlight state
            highlightedItemIds: [],
            highlightedItemId: null,
            highlightedItem: null,
            
            // Connected clients tracking
            connectedClients: [],
            
            updateCounter: 0, // Add update counter
            
            // Last updated timestamp
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Updates the currently selected item based on selected items
     * Sets selectedItemId and selectedItem in the state
     */
    updateSelectedItem() {
        console.log("[SpaceCraft DEBUG] updateSelectedItem called. Current selectedItemIds:", JSON.parse(JSON.stringify(this.state.selectedItemIds)));
        if (this.state.selectedItemIds && this.state.selectedItemIds.length > 0) {
            const newSelectedItemId = this.state.selectedItemIds[0];
            
            if (newSelectedItemId !== this.state.selectedItemId) {
                let newSelectedItem = this.findItemById(newSelectedItemId); 
                
                this.updateState({
                    selectedItemId: newSelectedItemId,
                    selectedItem: newSelectedItem
                });
            }
        } else {
            if (this.state.selectedItemId !== null) {
                this.updateState({
                    selectedItemId: null,
                    selectedItem: null
                });
            }
        }
    }
    
    /**
     * Syncs the current state to Supabase presence
     */
    syncStateToPresence() {
        if (!this.clientChannel) {
            console.warn("[SpaceCraft] Attempted to sync presence, but clientChannel is null.");
            return;
        }
        
        // Log exactly what is being synced, especially selectedItem
        console.log("[SpaceCraft] Syncing state to presence. Current selectedItem:", JSON.parse(JSON.stringify(this.state.selectedItem))); 
        
        this.clientChannel.track({
            ...this.identity,
            shared: { ...this.state } 
        }).catch(error => {
            console.error("[SpaceCraft] Error tracking presence:", error);
        });
    }

    /**
     * Initialize Supabase client and channel
     */
    setupSupabase() {
        console.log("[SpaceCraft] Setting up Supabase client");
        
        // Create a Supabase client
        const client = window.supabase.createClient(
            SpaceCraftSim.SUPABASE_URL, 
            SpaceCraftSim.SUPABASE_ANON_KEY
        );
        
        // Create a channel for client communication
        this.clientChannel = client.channel('clients');
        
        console.log("[SpaceCraft] Supabase client and channel created");
    }
    
    /**
     * Set up Supabase channel subscription
     */
    setupSupabaseChannel() {
        console.log("[SpaceCraft] Setting up Supabase channel subscription");
        
        // Subscribe to the channel and set up event handlers
        this.subscribeToClientChannel(this.clientChannel);
    }

    /**
     * Subscribe to the client channel and set up event handlers
     */
    subscribeToClientChannel(channel) {
        console.log("[SpaceCraft] Subscribing to Supabase 'clients' channel");

        channel
            .on('broadcast', { event: 'pan' }, (data) => { 
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                // Navigator controllers always send pan events with panXDelta/panYDelta
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const panXDelta = data.payload.panXDelta;
                const panYDelta = data.payload.panYDelta;
                const screenId = data.payload.screenId || "main";
                
                // Simple direct call - no type checking or processing
                bridge.updateObject(this.spaceCraft, {
                    "method:PushCameraPosition": [clientId, clientName, screenId, panXDelta, panYDelta]
                });
                
                // Track client info for presence
                this.updateClientInfo(clientId, data.payload.clientType, clientName);
            })
            .on('broadcast', { event: 'zoom' }, (data) => {
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                // Navigator controllers always send zoom events with zoomDelta
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const zoomDelta = data.payload.zoomDelta;
                const screenId = data.payload.screenId || "main";
                
                // Simple direct call - no type checking or processing
                bridge.updateObject(this.spaceCraft, {
                    "method:PushCameraZoom": [clientId, clientName, screenId, zoomDelta]
                });
                
                // Track client info for presence
                this.updateClientInfo(clientId, data.payload.clientType, clientName);
            })
            .on('broadcast', { event: 'select' }, (data) => {
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                // Selector controllers always send select events with action
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const action = data.payload.action; // 'tap', 'north', 'south', etc.
                const screenId = data.payload.screenId || "main";
                
                if (action === 'tap') {
                    // Handle tap action
                    bridge.updateObject(this.spaceCraft, {
                        "method:ToggleHighlightedItemSelection": [clientId, clientName, screenId]
                    });
                } else if (['north', 'south', 'east', 'west', 'up', 'down'].includes(action)) {
                    // Handle directional actions
                    bridge.updateObject(this.spaceCraft, {
                        "method:MoveHighlight": [clientId, clientName, screenId, action]
                    });
                }
                
                // Track client info for presence
                this.updateClientInfo(clientId, data.payload.clientType, clientName);
            })
            .on('broadcast', { event: 'simulator_takeover' }, (data) => {
                // Another simulator is trying to take over
                if (data.payload.newSimulatorId === this.identity.clientId) {
                    return; // Our own takeover message, ignore
                }
                
                // If this simulator started later than the new one, let it take over
                if (this.identity.startTime < data.payload.startTime) {
                    console.log(`[SpaceCraft] Another simulator has taken over: ${data.payload.newSimulatorId}`);
                    this.shutdown();
                } else {
                    console.log(`[SpaceCraft] Ignoring takeover from older simulator: ${data.payload.newSimulatorId}`);
                    this.sendTakeoverEvent();
                }
            })
            .on('presence', { event: 'sync' }, () => {
                // Get all current presences in the channel
                const allPresences = channel.presenceState();
                console.log("[SpaceCraft] Presence sync event. Current presences:", allPresences);
                
                // Process connected clients
                for (const presenceKey in allPresences) {
                    const presences = allPresences[presenceKey];
                    for (const presence of presences) {
                        // Skip our own presence
                        if (presence.clientId === this.identity.clientId) continue;
                        
                        this.updateClientInfo(
                            presence.clientId,
                            presence.clientType,
                            presence.clientName || "Unknown Client"
                        );
                    }
                }
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log("[SpaceCraft] New presences joined:", newPresences);
                
                for (const presence of newPresences) {
                    // Skip our own presence
                    if (presence.clientId === this.identity.clientId) continue;
                    
                    // Check if this is a simulator joining
                    if (presence.clientType === "simulator") {
                        console.log(`[SpaceCraft] Another simulator joined: ${presence.clientId}`);
                        // Send takeover event to establish dominance
                        this.sendTakeoverEvent();
                    } else {
                        // A controller client joined
                        this.updateClientInfo(
                            presence.clientId,
                            presence.clientType,
                            presence.clientName || "Unknown Client"
                        );
                    }
                }
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log("[SpaceCraft] Presences left:", leftPresences);
                
                for (const presence of leftPresences) {
                    // Remove from our client registry
                    if (this.clients[presence.clientId]) {
                        console.log(`[SpaceCraft] Client left: ${presence.clientId} (${presence.clientType || 'unknown type'})`);
                        delete this.clients[presence.clientId];
                    }
                }
            })
            .subscribe((status) => { 
                 if (status === 'SUBSCRIBED') {
                    console.log("[SpaceCraft] Successfully subscribed to client channel");
                    
                    // Track our own presence with identity and state
                    channel.track({
                        ...this.identity,
                        shared: { ...this.state } // Nest state under 'shared'
                    });
                    
                    // Send takeover event to establish this simulator as the active one
                    this.sendTakeoverEvent();
                }
            });
    }

    /**
     * Sends a takeover event to notify other simulators and clients
     */
    sendTakeoverEvent() {
        if (!this.clientChannel) {
            console.warn("[SpaceCraft] Cannot send takeover event: Client channel not initialized.");
            return;
        }
        
        console.log(`[SpaceCraft] Sending simulator takeover notification`);
        
        this.clientChannel.send({
            type: 'broadcast',
            event: 'simulator_takeover',
            payload: {
                newSimulatorId: this.identity.clientId,
                newSimulatorName: this.identity.clientName,
                startTime: this.identity.startTime
            }
        }).catch(err => console.error("[SpaceCraft] Error sending takeover event:", err));
    }
    
    /**
     * Gracefully shuts down this simulator instance
     */
    shutdown() {
        console.log("[SpaceCraft] Shutting down simulator due to takeover");
        
        // Clean up resources - no try/catch, just direct error logging
        if (this.clientChannel) {
            this.clientChannel.unsubscribe().catch(err => {
                console.error("[SpaceCraft] Error unsubscribing from channel:", err);
            });
        }
        
        // Redirect to a shutdown page or reload
        alert("Another SpaceCraft simulator has taken control. This window will now close.");
        window.close();
        
        // If window doesn't close (e.g., window not opened by script), reload
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    /**
     * Sends a Supabase broadcast event on the channel.
     * @param {string} clientId - The unique ID of the target client.
     * @param {string} eventName - The name of the event to broadcast.
     * @param {object} payload - The data payload for the event.
     */
    sendEventToClientById(clientId, eventName, payload) {
        const clientInfo = this.clients[clientId];
        if (!clientInfo) {
            console.warn(`[SpaceCraft] Cannot send event: Client ID '${clientId}' not found in registry.`);
            return;
        }

        if (!this.clientChannel) {
            console.warn(`[SpaceCraft] Cannot send event: Client channel not initialized.`);
            return;
        }

        console.log(`[SpaceCraft] Sending '${eventName}' event to client ${clientId}`);
        
        // Add simulator ID to payload so client knows who sent it
        const fullPayload = {
            ...payload,
            sourceSimulatorId: this.identity.clientId
        };
        
        this.clientChannel.send({
            type: 'broadcast',
            event: eventName,
            payload: fullPayload
        });
    }

    /**
     * Broadcasts an event to all connected clients.
     * @param {string} eventName - The name of the event to broadcast.
     * @param {object} payload - The data payload for the event.
     */
    sendEventToAllClients(eventName, payload) {
        if (!this.clientChannel) {
            console.warn(`[SpaceCraft] Cannot broadcast event: Client channel not initialized.`);
            return;
        }

        console.log(`[SpaceCraft] Broadcasting '${eventName}' event to all clients`);
        
        // Add simulator ID to payload so clients know who sent it
        const fullPayload = {
            ...payload,
            sourceSimulatorId: this.identity.clientId
        };
        
        this.clientChannel.send({
            type: 'broadcast',
            event: eventName,
            payload: fullPayload
        });
    }

    /**
     * Helper to find an item by ID in the loaded content
     * @param {string} itemId - The ID of the item to find
     * @returns {Object|null} The found item or null
     */
    findItemById(itemId) {
        if (!this.loadedContent || !itemId) return null;
        
        // Collections is an object with collection IDs as keys
        if (this.loadedContent.collections && typeof this.loadedContent.collections === 'object') {
            for (const collectionId in this.loadedContent.collections) {
                const collection = this.loadedContent.collections[collectionId];
                // Items is an object with item IDs as keys
                if (collection.items && collection.items[itemId]) {
                    // Return direct reference to the item
                    return collection.items[itemId].item;
                }
            }
        }
        return null;
    }
    
    /**
     * Get placeholder content in case real content fails to load
     * @returns {Object} Placeholder content structure
     */
    getPlaceholderContent() {
        // Used if loading from JSON fails
        console.warn("[SpaceCraft] Using placeholder content data.");
        // Return placeholder structure matching index-deep.json
        return { collections: [] }; 
    }
    
    /**
     * Logs the current status of the SpaceCraft instance
     */
    logStatus() {
        console.log("[SpaceCraft Debug] Status:", {
             DOMReady: this.domContentLoaded,
             BasicInitialized: this.isInitialized,
             BridgeAvailable: !!window.bridge,
             SpaceCraft: !!this.spaceCraft,
             SupabaseLoaded: typeof window.supabase !== 'undefined'
        });
    }

    /**
     * Updates the client info in our registry
     * @param {string} clientId - The unique identifier for the client
     * @param {string} clientType - The type of client (navigator, selector, etc.)
     * @param {string} clientName - Human-readable name of the client
     */
    updateClientInfo(clientId, clientType, clientName) {
        if (!clientId) return;
        
        const isNew = !this.clients[clientId];
        
        this.clients[clientId] = {
            id: clientId,
            type: clientType || "unknown",
            name: clientName || "Unnamed Client",
            lastSeen: Date.now()
        };
        
        if (isNew) {
            console.log(`[SpaceCraft] New client registered: ${clientId} (${clientType || 'unknown type'}, ${clientName || 'Unnamed'})`);
        }
    }
    
    /**
     * Updates the state and synchronizes it via Supabase presence
     * @param {Object} stateChanges - Object containing state properties to update
     */
    updateState(stateChanges) {
        // Increment update counter first
        this.state.updateCounter = (this.state.updateCounter || 0) + 1;
        
        // Update local state with changes
        Object.assign(this.state, stateChanges);
        
        // Sync the updated state
        this.syncStateToPresence(); // This will now send the incremented counter
        
        console.log("[SpaceCraft] State updated (counter: " + this.state.updateCounter + "):", stateChanges);
    }

    /**
     * Updates the highlighted item based on highlightedItemIds
     * Sets highlightedItemId and highlightedItem in the state
     */
    updateHighlightedItem() {
        console.log("[SpaceCraft DEBUG] updateHighlightedItem called. Current highlightedItemIds:", JSON.parse(JSON.stringify(this.state.highlightedItemIds)));
        if (this.state.highlightedItemIds && this.state.highlightedItemIds.length > 0) {
            const newHighlightedItemId = this.state.highlightedItemIds[0];
            
            if (newHighlightedItemId !== this.state.highlightedItemId) {
                let newHighlightedItem = this.findItemById(newHighlightedItemId); 
                
                this.updateState({
                    highlightedItemId: newHighlightedItemId,
                    highlightedItem: newHighlightedItem
                });
            }
        } else {
            if (this.state.highlightedItemId !== null) {
                this.updateState({
                    highlightedItemId: null,
                    highlightedItem: null
                });
            }
        }
    }
}

// =============================================================================
//                         Initialization Entry Point
// =============================================================================

// Create a global instance of our SpaceCraftSim class
window.SpaceCraft = new SpaceCraftSim();

// Ensure the HTML structure (canvas, buttons, svg placeholders) is ready 
// before attempting to interact with it or generate QR codes.
if (document.readyState === 'loading') {
    // Loading hasn't finished yet
    document.addEventListener('DOMContentLoaded', () => {
        window.SpaceCraft.initializeDOMAndQRCodes();
        // Optional: Log status periodically for debugging startup issues
        // setInterval(() => window.SpaceCraft.logStatus(), 5000); 
    });
} else {
    // DOMContentLoaded has already fired
    window.SpaceCraft.initializeDOMAndQRCodes();
    // Optional: Log status periodically for debugging startup issues
    // setInterval(() => window.SpaceCraft.logStatus(), 5000);
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
