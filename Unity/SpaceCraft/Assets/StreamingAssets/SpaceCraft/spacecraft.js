// SpaceCraft.js - Main JavaScript interface for the SpaceCraft Unity application
// This file handles the entire startup sequence, dependencies, and communication.

// =============================================================================
//                            Startup Sequence Overview
// =============================================================================
// 1. HTML Loads: Basic HTML structure is present.
// 2. Early JSON Fetch: `index-deep.json` fetch is initiated immediately (see below).
// 3. Dependencies Check: Wait for the DOM to be fully loaded.
// 4. QR Code Generation: Generate QR code for controller (requires QRCode lib).
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
// "ApplyTapScaleToHighlightedItem": [clientId, clientName, screenId]
//    - Applies a scale impulse to the currently highlighted item
// "MoveHighlight": [clientId, clientName, screenId, direction]
//    - Moves highlight in specified direction ("north","south","east","west","up","down")
//
// --- SUPABASE EVENTS (From clients to simulator) ---
// 'broadcast' { event: 'pan' }: 
//    - From controller: {clientId, clientType, clientName, panXDelta, panYDelta, screenId, targetSimulatorId} (navigate tab)
//    - From controller: {clientId, clientType, clientName, selectXDelta, selectYDelta, screenId, targetSimulatorId} (select tab)
//    - Used for continuous movement input
// 'broadcast' { event: 'zoom' }:
//    - {clientId, clientType, clientName, zoomDelta, screenId, targetSimulatorId}
//    - Controls camera zoom level
// 'broadcast' { event: 'select' }:
//    - {clientId, clientType, clientName, action, screenId, targetSimulatorId}
//    - action can be "tap" or directional ("north","south","east","west","up","down")
//    - "tap" applies a scale impulse to the highlighted item
//    - Directions call MoveHighlight
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
// - HTML Elements: #unity-container, #unity-canvas, #unity-fullscreen-button, #qrcodes-container
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
    static supabaseUrl = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
    static supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
    static deepIndexPath = 'StreamingAssets/Content/index-deep.json';
    static controllerHtmlPath = '../controller/';
    static clientChannelName = 'spacecraft';
    static simulatorNamePrefix = 'SpaceCraft';
    
    /**
     * Get the channel name from URL query parameter or use default
     * @returns {string} Channel name to use
     */
    static getChannelName() {
        const urlParams = new URLSearchParams(window.location.search);
        const channelFromUrl = urlParams.get('channel');
        if (channelFromUrl) return channelFromUrl;
        // Fallback: use the host name of the web page URL instead of the hard-coded default
        const host = window.location && window.location.hostname;
        return host;
    }

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
            clientName: SpaceCraftSim.simulatorNamePrefix, // Start without a number; will assign on presence
            simulatorIndex: 0,
            startTime: Date.now() // When this simulator instance started
        };

        // Initialize state with default values
        this.initializeState();

        // Private non-shared state
        this.spaceCraft = null; // Reference to the Bridge object representing SpaceCraft in Unity
        this.isInitialized = false; // Flag to track if basic init (like QR code check) is done
        this.domContentLoaded = false; // Flag to track if DOM is ready
        this.loadedContent = null; // Store the loaded content data here (private to simulator)
        this.availableTags = []; // Store tags from all items
        
        // --- Client Registry ---
        // Stores information about currently connected clients
        this.clients = {}; // Key: clientId, Value: client info object
        
        // Supabase channel reference
        this.clientChannel = null;
        this._indexClaims = [];
        this._indexTimer = null;
        this.presenceVersion = 0; // For tracking changes to presence state

        // Fetch timeout reference
        this.contentFetchTimeout = null;

        // QR Code configuration
        this.qrcodeDefaults = {
            dim: 100, // Default dimension (can be overridden in CSS)
            pad: 1, // Padding around QR code
            pal: ['#000', '#fff'] // Color palette [background, foreground]
        };
        
        // Define QR code to be generated
        this.qrCodeDefinitions = [
            {
                id: "controller-qr",
                targetHtml: SpaceCraftSim.controllerHtmlPath,
                // No type parameter - will default to about tab
                label: "Controller",
                position: "center"
            }
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
        // console.log("[SpaceCraft] Initiating early fetch for index-deep.json");
        
        window.contentPromise = fetch(SpaceCraftSim.deepIndexPath)
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
     * Called when the DOM is fully loaded. Checks dependencies and generates QR code.
     */
    initializeDOMAndQRCodes() {
        if (this.domContentLoaded) return; // Prevent double execution

        this.domContentLoaded = true;
        // console.log("[SpaceCraft] DOM loaded. Initializing QR code.");

        // Check for QR Code library dependency
        if (typeof QRCode === 'undefined') {
            console.error("[SpaceCraft] QRCode library (qrcode.min.js) not found! Cannot generate QR code.");
            return; // Stop further initialization if QR code can't be generated
        }
        
        // Generate QR code only after simulatorIndex is assigned; otherwise defer
        if (typeof this.simulatorIndex === 'number' && this.simulatorIndex > 0) {
        this.generateQRCodes();
        } else {
            try { console.log('[Sim] QR generation deferred until simulatorIndex is assigned'); } catch {}
        }

        // Basic initialization is considered complete after DOM/QR setup
        this.isInitialized = true; 
        // console.log("[SpaceCraft] DOM and QR code initialization complete.");
        
        // Now that the DOM is ready, proceed to configure and load Unity
        this.configureAndLoadUnity();
    }
    
    /**
     * Generate QR code for controller based on qrCodeDefinitions.
     */
    generateQRCodes() {
        // console.log("[SpaceCraft] Generating QR code based on definitions...");
        
        const qrContainer = document.getElementById('qrcodes-container');
        if (!qrContainer) {
            console.error("[SpaceCraft] QR Code container (#qrcodes-container) not found in the DOM.");
            this.isInitialized = false; // Mark as failure if container missing
            return;
        }

        // Clear any existing QR code in the container (optional, good for updates)
        qrContainer.innerHTML = ''; 

        try {
            // Get the current URL's query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const explicitBaseUrl = urlParams.get('base_url'); // Check for ?base_url=...
            
            // Build search parameters for QR codes, ensuring channel is included
            const qrParams = new URLSearchParams();
            
            // Copy existing parameters except base_url (which is for QR generation only)
            for (const [key, value] of urlParams) {
                if (key !== 'base_url') {
                    qrParams.set(key, value);
                }
            }
            
            // Ensure channel parameter is included (use current channel or default)
            const currentChannel = SpaceCraftSim.getChannelName();
            if (currentChannel !== SpaceCraftSim.clientChannelName) {
                qrParams.set('channel', currentChannel);
            }
            // Include simulator index so controllers target the right simulator
            try { if (this.simulatorIndex != null) qrParams.set('simulatorIndex', String(this.simulatorIndex)); } catch {}
            
            const currentSearchParams = qrParams.toString() ? '?' + qrParams.toString() : '';

            let baseDirectory;
            let usingExplicitUrl = false;

            // Use explicit base_url if provided and looks somewhat valid (starts with http)
            if (explicitBaseUrl && explicitBaseUrl.startsWith('http')) {
                // Ensure it ends with a slash if not already present
                baseDirectory = explicitBaseUrl.endsWith('/') ? explicitBaseUrl : explicitBaseUrl + '/';
                usingExplicitUrl = true;
                // console.log(`[SpaceCraft QR] Using explicit base_url from parameter: ${baseDirectory}`);
            } else {
                // Fallback: Calculate the base directory path from window.location
                baseDirectory = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                // console.log(`[SpaceCraft QR] Using detected origin: ${window.location.origin}`);
                // console.log(`[SpaceCraft QR] Calculated Base Directory: ${baseDirectory}`);
            }
            
            // if (!usingExplicitUrl) {
            //      console.log(`[SpaceCraft QR] Detected Origin: ${window.location.origin}`);
            //      console.log(`[SpaceCraft QR] Calculated Base Directory: ${baseDirectory}`);
            // }
            // console.log(`[SpaceCraft QR] Current Search Params: ${currentSearchParams || '(none)'}`);

            // Loop through the defined QR codes
            this.qrCodeDefinitions.forEach(definition => {
                // Clone the search params for each QR code
                const qrSpecificParams = new URLSearchParams(currentSearchParams);
                
                // Add the type parameter if defined
                if (definition.type) {
                    qrSpecificParams.set('type', definition.type);
                }
                // Always add simulator index to the QR links once assigned
                try { if (typeof this.simulatorIndex === 'number' && this.simulatorIndex > 0) qrSpecificParams.set('simulatorIndex', String(this.simulatorIndex)); } catch {}
                
                // Build the complete search params string
                const finalSearchParams = qrSpecificParams.toString() ? '?' + qrSpecificParams.toString() : '';
                
                // Construct the target URL for the link, including the query parameters
                const targetRelativeUrl = definition.targetHtml + finalSearchParams;
                // Construct the full absolute URL for the QR code message
                const fullAbsoluteUrl = new URL(targetRelativeUrl, baseDirectory).toString();
                
                // console.log(`[SpaceCraft QR] Generating for ${definition.label} at position '${definition.position || 'default'}':`);
                // console.log(`  - Relative URL: ${targetRelativeUrl}`);
                // console.log(`  - Absolute URL (for QR & window): ${fullAbsoluteUrl}`);

                // 1. Create the link element (standard anchor with href for accessibility/copyability)
                const linkElement = document.createElement('a');
                linkElement.classList.add('qrcode-link'); // Add a general class for styling
                linkElement.style.cursor = 'pointer'; 
                linkElement.href = fullAbsoluteUrl; // Allow right-click/copy link
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';

                // Add position class if defined
                if (definition.position) {
                    linkElement.classList.add(`qr-position-${definition.position}`);
                }

                // Define a unique window name if needed (left unused since standard anchor navigation is enabled)
                // const windowName = definition.id + '-window';

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

            // console.log("[SpaceCraft] QR code generated successfully.");
            this.qrCodesGenerated = true;

        } catch (error) {
            console.error("[SpaceCraft] Error generating QR code:", error);
             this.isInitialized = false; // Mark initialization as failed
        }
    }

    /**
     * Configure and initiate the loading of the Unity instance.
     */
    configureAndLoadUnity() {
        // console.log("[SpaceCraft] Configuring Unity...");

        // Ensure Bridge is available (should be loaded via script tag before this)
        window.bridge = window.bridge || new Bridge();
        if (!window.bridge || typeof window.bridge.start !== 'function') {
             console.error("[SpaceCraft] CRITICAL: Bridge object not found or invalid!");
             return; // Cannot proceed without the Bridge
        }
        // console.log("[SpaceCraft] Bridge instance checked/created.");

        // --- Unity Loader Configuration ---
        // Note: Template variables like {{{ LOADER_FILENAME }}} are replaced by Unity during build.
        const buildUrl = "Build";

        // IMPORTANT: Make sure these template variables match your Unity WebGL template settings
        const loaderUrl = buildUrl + "/SpaceCraft.loader.js"; // Assuming default naming
        // console.log("[SpaceCraft] Unity loader URL:", loaderUrl);

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
        // console.log("[SpaceCraft] Unity configuration prepared:", config);

        // --- Get DOM Elements ---
        const container = document.querySelector("#unity-container");
        const canvas = document.querySelector("#unity-canvas");
        const fullscreenButton = document.querySelector("#unity-fullscreen-button");
        // const progressBarFull = document.getElementById("unity-progress-bar-full"); // Optional progress bar

        if (!container || !canvas || !fullscreenButton) {
            console.error("[SpaceCraft] Required DOM elements (#unity-container, #unity-canvas, #unity-fullscreen-button) not found.");
            return; // Cannot proceed without essential DOM elements
        }
        // console.log("[SpaceCraft] Unity DOM elements retrieved.");

        // Force canvas fullscreen sizing
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        // --- Load Unity Script ---
        // console.log("[SpaceCraft] Creating Unity loader script element...");
        const script = document.createElement("script");
        script.src = loaderUrl;
        
        // --- Define Unity Instance Creation Logic (runs after loader script loads) ---
        script.onload = () => {
            // console.log("[SpaceCraft] Unity loader script loaded. Creating Unity instance...");
            
            // Check if createUnityInstance function exists (it should be defined by loaderUrl script)
            if (typeof createUnityInstance === 'undefined') {
                console.error("[SpaceCraft] createUnityInstance function not found. Unity loader script might have failed.");
                return;
            }

            createUnityInstance(canvas, config, (progress) => {
                // Optional: Update loading progress UI
                //console.log(`[SpaceCraft] Unity loading progress: ${Math.round(progress * 100)}%`);
                // if (progressBarFull) {
                //     progressBarFull.style.width = 100 * progress + "%";
                // }
            }).then((unityInstance) => {
                // Unity Instance Creation Complete
                // console.log("[SpaceCraft] Unity instance created successfully.");

                // Store Unity instance globally for access
                window.unityInstance = unityInstance;

                // Setup fullscreen button functionality
                fullscreenButton.onclick = () => {
                    // console.log("[SpaceCraft] Fullscreen button clicked.");
                    unityInstance.SetFullscreen(1);
                };

                // Initialize Bridge
                // This tells the Bridge JS library that Unity is ready and provides the instance.
                // The Bridge library internally handles linking with the Unity instance.
                // Bridge C# code (BridgeTransportWebGL.Awake/Start) will eventually send "StartedUnity".
                // console.log("[SpaceCraft] Starting Bridge with WebGL driver (triggers C# setup).");
                window.bridge.start("WebGL", JSON.stringify({})); // Empty config for now
                // console.log("[SpaceCraft] Bridge start initiated. Waiting for 'StartedUnity' event from C#...");

            }).catch((message) => {
                console.error("[SpaceCraft] Error creating Unity instance:", message);
            });
        };
        
        // --- Add Loader Script to Document ---
        document.body.appendChild(script);
        // console.log("[SpaceCraft] Unity loader script added to document.");
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
                        // console.log("[SpaceCraft] Successfully loaded content from early fetch");
                        return content;
                    }
                } catch (earlyFetchError) {
                    console.warn("[SpaceCraft] Early fetch failed, falling back to direct fetch:", earlyFetchError);
                }
            }
            
            // Direct fetch if early fetch failed or wasn't available
            // console.log(`[SpaceCraft] Fetching content from ${SpaceCraftSim.deepIndexPath}`);
            const response = await fetch(SpaceCraftSim.deepIndexPath);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
            }
            
            const content = await response.json();
            // console.log("[SpaceCraft] Content fetch successful, got:", Object.keys(content).join(", "));
            
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

        // console.log("[SpaceCraft] 'StartedUnity' event received. Loading content and creating SpaceCraft object...");

        // Ensure basic initialization (DOM, QR code) happened. It should have by now.
        if (!this.isInitialized) {
            console.warn("[SpaceCraft] loadCollectionsAndCreateSpaceCraft called before basic initialization was complete. This might indicate a timing issue.");
            // Attempt to initialize now, though it might be too late for some steps
            this.initializeDOMAndQRCodes();
        }

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

        // Extract tags from loaded content items
        this.availableTags = this.createUnifiedTagsList();
        this.state.tags = this.availableTags;
        // console.log(`[SpaceCraft] Loaded ${this.availableTags.length} tags from content items`);
        if (this.availableTags.length > 0) {
            // console.log(`[SpaceCraft] Available tags (${this.availableTags.length}):`, this.availableTags.slice(0, 10));
        } else {
            // console.log("[SpaceCraft] No tags found in content items");
        }
        
        this.setupSupabase();

        // Sync tags to presence immediately after loading
        this.syncStateToPresence();
        
        // Create the SpaceCraft object via Bridge - pass content exactly as received
        this.createSpaceCraftObject(this.loadedContent);
        
        // console.log("[SpaceCraft] Content loaded and SpaceCraft object created.");
    }

    /**
     * Creates the actual SpaceCraft object in the Bridge.
     * @param {Object} content - The content data to initialize SpaceCraft with
     */
    createSpaceCraftObject(content) {
        // console.log("[SpaceCraft] Creating SpaceCraft object in Bridge with loaded content...");
        
        // Create the actual SpaceCraft object via Bridge with content data
        this.spaceCraft = window.bridge.createObject({
            prefab: "Prefabs/SpaceCraft",
            obj: {
                // This obj is used as the wrapper object for the SpaceCraft prefab.
                // Here we can add methods and properties for the singleton SpaceCraft 
                // prefab wrapper object, for managing magnets, etc.

                // Map of magnet name => Unity bridge object (kept within the bridge object)
                magnets: new Map(),
                
                createMagnet: function (magnetData) {
                    try {
                        // console.log('[Sim JS] createMagnet received magnetData:', JSON.parse(JSON.stringify(magnetData)));
                    } catch (e) {
                        // console.log('[Sim JS] createMagnet received magnetData (raw):', magnetData);
                    }
                    let magnetId = magnetData.magnetId;
                    if (!magnetId) {
                        const timestamp = Date.now();
                        const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                        magnetId = magnetData.id = `${timestamp}${randomDigits}`;
                    }

                    const magnetBridge = window.bridge.createObject({
                        obj: {
                            magnetId: magnetId,
                        },
                        prefab: "Prefabs/MagnetView",
                        parent: this,
                        update: {
                            ...magnetData,
                            "method:MoveToPanCenter": []
                        },
                    });

                    this.magnets.set(magnetId, magnetBridge);

                    return magnetBridge;
                },

                updateMagnet: function (magnetData) {
                    try {
                        // console.log('[Sim JS] updateMagnet received magnetData:', JSON.parse(JSON.stringify(magnetData)));
                    } catch (e) {
                        // console.log('[Sim JS] updateMagnet received magnetData (raw):', magnetData);
                    }
                    const magnetId = magnetData.magnetId;
                    if (!magnetId) {
                        console.warn(`[Bridge] updateMagnet: magnetId is required`);
                        return false;
                    }
                    
                    const magnetBridge = this.magnets.get(magnetId);
                    if (!magnetBridge) {
                        console.warn(`[Bridge] updateMagnet: No magnet found with ID: "${magnetData.magnetId}"`);
                        return false;
                    }
                    
                    window.bridge.updateObject(magnetBridge, magnetData);

                    // Remove any method keys from magnetData to avoid sending them to Unity
                    const methodKeys = [];
                    for (const key in magnetData) {
                        if (key.startsWith("method:")) {
                            methodKeys.push(key);
                        }
                    }
                    
                    // Delete the method keys from magnetData
                    methodKeys.forEach(key => {
                        delete magnetData[key];
                    });
                    
                    return true;
                },

                deleteMagnet: function (magnetId) {
                     const magnetBridge = this.magnets.get(magnetId);
                     if (!magnetBridge) {
                         console.warn(`[Bridge] No magnet found to delete: "${magnetId}"`);
                         return false;
                     }
                     
                     this.magnets.delete(magnetId);

                     window.bridge.destroyObject(magnetBridge);

                     // console.log(`[Bridge] Deleted magnet: "${magnetId}". Total magnets: ${this.magnets.size}`);
                     
                     return true;
                 },

                 moveMagnet: function (magnetId, x, y) {
                    const magnetBridge = this.magnets.get(magnetId);
                    if (!magnetBridge) {
                        console.warn(`[Bridge] No magnet found to move: "${magnetId}"`);
                        return false;
                    }

                    window.bridge.updateObject(magnetBridge, {
                        "method:MovePosition": [x, y]
                    });
                },

                 pushMagnet: function (magnetId, deltaX, deltaY) {
                    const magnetBridge = this.magnets.get(magnetId);
                    if (!magnetBridge) {
                        console.warn(`[Bridge] No magnet found to push: "${magnetId}"`);
                        return false;
                    }

                    window.bridge.updateObject(magnetBridge, {
                        "method:PushPosition": [deltaX, deltaY]
                    });
                },

            },
            // Register all necessary Unity event interests with proper query structure
            interests: {

                "ContentLoaded": {
                    query: {
                        "unityMetaData": "UnityMetaData"
                    },
                    handler: (obj, results) => {
                        // console.log("[SpaceCraft] ContentLoaded event received from Unity");
                        // console.log("[SpaceCraft] unityMetaData:", results.unityMetaData);
                        // console.log("[SpaceCraft] MagnetView metadata sample:", results.unityMetaData.MagnetView?.slice(0, 3));
                        this.state.unityMetaData = results.unityMetaData;
                    }
                },

                "HighlightedItemsChanged": {
                    query: { 
                        "highlightedItemIds": "HighlightedItemIds"
                    },
                    handler: (obj, results) => {
                        if (results && results.highlightedItemIds) {
                            this.state.highlightedItemIds = results.highlightedItemIds;
                            this.updateHighlightedItem();
                        } else {
                            console.warn("[SpaceCraft JS DEBUG] HighlightedItemsChanged event: results or results.highlightedItemIds is missing.", results);
                        }
                    }
                },
                
                "SelectedItemsChanged": {
                    query: { "selectedItemIds": "SelectedItemIds" },
                    handler: (obj, results) => {
                        if (results && results.selectedItemIds) {
                            this.state.selectedItemIds = results.selectedItemIds;
                            // console.log("[SpaceCraft JS DEBUG] Calling updateSelectedItem(). New IDs:", JSON.parse(JSON.stringify(this.state.selectedItemIds)));
                            this.updateSelectedItem();
                        } else {
                            console.warn("[SpaceCraft JS DEBUG] SelectedItemsChanged event: results or results.selectedItemIds is missing.", results);
                        }
                    }
                },

            },
            update: { 
                content: content
            }
        });
        
        // Create the ground plane as a child of SpaceCraft
        this.groundPlane = window.bridge.createObject({
            prefab: "Prefabs/GroundPlane",
            parent: this.spaceCraft,
            update: {
                "transform:Cube/component:MeshRenderer/material/color": { r: 0.0, g: .2, b: 0.0 },
            }
        });
        
        // Store references globally
        window.spaceCraft = this.spaceCraft;
        window.groundPlane = this.groundPlane;
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
            clientName: 'Spacecraft',
            simulatorIndex: 0,
            
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
            
            // Available tags from content items
            tags: [],
            
            // Magnet system
            magnets: [],

            updateCounter: 0, // Add update counter
            
            // Last updated timestamp
            lastUpdated: new Date().toISOString(),

        };
    }
    
    /**
     * Updates the currently selected item based on selected items
     * Sets selectedItemId and selectedItem in the state
     */
    updateSelectedItem() {
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
    
    mirrorIdentityToState() {
        try {
            if (!this.state) return;
            this.state.clientId = this.identity.clientId;
            this.state.clientType = this.identity.clientType;
            this.state.clientName = this.identity.clientName;
            // simulatorIndex may be undefined for non-simulators; default to 0
            this.state.simulatorIndex = (typeof this.identity.simulatorIndex === 'number') ? this.identity.simulatorIndex : 0;
            try { console.log('[Sim] mirrorIdentityToState:', { id: this.state.clientId, name: this.state.clientName, simulatorIndex: this.state.simulatorIndex }); } catch {}
        } catch {}
    }

    syncStateToPresence() {
        if (!this.clientChannel) {
            return;
        }
        // Ensure identity is reflected in state before publishing
        this.mirrorIdentityToState();

        try { console.log('[Sim] syncStateToPresence track shared:', { simulatorIndex: this.state && this.state.simulatorIndex, clientName: this.state && this.state.clientName }); } catch {}
        this.clientChannel.track({
            ...this.identity,
            shared: { ...this.state } 
        }).catch(error => {
            console.error("[SpaceCraft] Error tracking presence:", error);
        });
    }

    setupSupabase() {
        const channelName = SpaceCraftSim.getChannelName();
        try { console.log('[Sim] setupSupabase channel =', channelName); } catch {}
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('[Sim] Supabase JS library missing or invalid on simulator page');
            return;
        }
        
        // Create a Supabase client
        const client = window.supabase.createClient(
            SpaceCraftSim.supabaseUrl,
            SpaceCraftSim.supabaseAnonKey
        );
        
        // Create a channel for client communication
        this.clientChannel = client.channel(channelName, { config: { presence: { key: this.identity.clientId } } });
        try { console.log('[Sim] clientChannel created for', channelName, 'with presence key', this.identity.clientId); } catch {}
        this._indexClaims = [];
        this._indexTimer = null;
    
        this.clientChannel

            .on('broadcast', {}, (data) => {
                // console.log(`[SpaceCraft] RECEIVED BROADCAST EVENT: ${data.event}`, data);
                if (data.payload && data.payload.targetSimulatorId) {
                    // console.log(`[SpaceCraft] Event targeted at simulator: ${data.payload.targetSimulatorId}, my ID: ${this.identity.clientId}`);
                }
            })

            .on('broadcast', { event: 'indexClaim' }, (data) => {
                try {
                    const claim = data && data.payload || {};
                    if (!claim.clientId || typeof claim.index !== 'number') return;
                    const now = Date.now();
                    this._indexClaims.push({ clientId: claim.clientId, index: claim.index, ts: now });
                    // keep recent 2s
                    this._indexClaims = this._indexClaims.filter(c => now - c.ts < 2000);
                    try {
                        console.log('[Sim] received indexClaim:', { clientId: claim.clientId, index: claim.index, ts: now });
                        console.log('[Sim] indexClaim window (<=2s):', this._indexClaims);
                    } catch {}
                } catch {}
            })

            .on('presence', { event: 'sync' }, () => {
                try { console.log('[Sim] presence:sync received'); this.ensureUniqueSimulatorName(); } catch (e) {
                    console.warn('[SpaceCraft] ensureUniqueSimulatorName error:', e);
                }
            })

            .on('broadcast', { event: 'pan' }, (data) => { 
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }

                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const panXDelta = data.payload.panXDelta;
                const panYDelta = data.payload.panYDelta;
                const screenId = data.payload.screenId || "main";
                
                this.updateClientInfo(clientId, data.payload.clientType, clientName);

                bridge.updateObject(this.spaceCraft, {
                    "method:PushCameraPosition": [clientId, clientName, screenId, panXDelta, panYDelta]
                });
            })

            .on('broadcast', { event: 'zoom' }, (data) => {
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const zoomDelta = data.payload.zoomDelta;
                const screenId = data.payload.screenId || "main";
                
                this.updateClientInfo(clientId, data.payload.clientType, clientName);

                bridge.updateObject(this.spaceCraft, {
                    "method:PushCameraZoom": [clientId, clientName, screenId, zoomDelta]
                });
            })

            .on('broadcast', { event: 'select' }, (data) => {
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const action = data.payload.action; // 'tap', 'north', 'south', etc.
                const screenId = data.payload.screenId || "main";
                const dx = data.payload.dx || 0; // Mouse delta X
                const dy = data.payload.dy || 0; // Mouse delta Y
                
                this.updateClientInfo(clientId, data.payload.clientType, clientName);

                if (action === 'tap') {
                    bridge.updateObject(this.spaceCraft, {
                        "method:ApplyTapScaleToHighlightedItem": [clientId, clientName, screenId]
                    });
                } else if (['north', 'south', 'east', 'west', 'up', 'down'].includes(action)) {
                    bridge.updateObject(this.spaceCraft, {
                        "method:MoveSelection": [clientId, clientName, screenId, action, dx, dy]
                    });
                } else {
                    console.warn(`[SpaceCraft] Invalid select action received: ${action}`);
                }
            })

            .on('broadcast', { event: 'setViewMode' }, (data) => {
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                const mode = (data.payload && data.payload.mode) || 'magnets';
                if (!this.state) return;
                if (mode !== this.state.viewMode) {
                    this.state.viewMode = mode;
                    try { console.log('[Sim] viewMode set via controller to', mode); } catch {}
                    try {
                        bridge.updateObject(this.spaceCraft, {
                            "inputManager/viewMode": mode
                        });
                    } catch {}
                    this.syncStateToPresence();
                }
            })

            .on('broadcast', { event: 'createMagnet' }, (data) => {
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetData = data.payload.magnetData;
                try {
                    // console.log('[Sim JS] broadcast createMagnet payload magnetData:', JSON.parse(JSON.stringify(magnetData)));
                } catch {}
                const magnetId = magnetData.magnetId;

                this.updateClientInfo(clientId, data.payload.clientType, clientName);

                if (!magnetId) {
                    console.warn(`[SpaceCraft] createMagnet event received with no magnetId`);
                    return;
                }

                const magnetBridge = this.spaceCraft.magnets.get(magnetId);
                if (magnetBridge) {
                    console.warn(`[SpaceCraft] Magnet "${magnetData.magnetId}" already exists, ignoring duplicate`);
                    return;
                }
                
                this.state.magnets.push(magnetData);
                
                this.spaceCraft.createMagnet(magnetData);

                this.syncStateToPresence();
            })

            .on('broadcast', { event: 'updateMagnet' }, (data) => {
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }

                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetData = data.payload.magnetData;
                try {
                    // console.log('[Sim JS] broadcast updateMagnet payload magnetData:', JSON.parse(JSON.stringify(magnetData)));
                } catch {}
                const magnetId = magnetData.magnetId;

                this.updateClientInfo(clientId, data.payload.clientType, clientName);

                if (!magnetId) {
                    console.warn(`[SpaceCraft] updateMagnet event received with no magnetId`);
                    return;
                }
                
                const magnetIndex = this.state.magnets.findIndex(m => 
                    m.magnetId === magnetData.magnetId
                );
                if (magnetIndex == -1) {
                    console.warn(`[SpaceCraft] No magnet found with ID "${magnetData.magnetId}" to update`);
                    return;
                }

                this.state.magnets[magnetIndex] = {
                    ...this.state.magnets[magnetIndex],
                    ...magnetData,
                };
                
                this.spaceCraft.updateMagnet(magnetData);

                this.syncStateToPresence();
            })

            .on('broadcast', { event: 'deleteMagnet' }, (data) => {
                
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetId = data.payload.magnetId;
                
                this.updateClientInfo(clientId, data.payload.clientType, clientName);

                if (!magnetId || typeof magnetId !== 'string') {
                    console.warn(`[SpaceCraft] Invalid magnetId received: ${magnetId}`);
                    return;
                }
                
                this.state.magnets = this.state.magnets.filter(m => 
                    m.magnetId !== magnetId
                );

                this.spaceCraft.deleteMagnet(magnetId);

                this.syncStateToPresence();
            })

            .on('broadcast', { event: 'pushMagnet' }, (data) => {
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetId = data.payload.magnetId;
                const deltaX = data.payload.deltaX;
                const deltaY = data.payload.deltaY;

                this.updateClientInfo(clientId, data.payload.clientType, clientName);
                
                if (!magnetId || typeof magnetId !== 'string') {
                    console.warn(`[SpaceCraft] Invalid magnetId received: ${magnetId}`);
                    return;
                }
                
                if (typeof deltaX !== 'number' || 
                    typeof deltaY !== 'number') {
                    console.warn(`[SpaceCraft] Invalid delta values received: deltaX=${deltaX}, deltaZ=${deltaY}`);
                    return;
                }

                const magnetBridge = this.spaceCraft.magnets.get(magnetId);
                if (!magnetBridge) {
                    console.warn(`[SpaceCraft] No magnet found matching "${magnetId}" to push`);
                    return;
                }
                
                this.spaceCraft.pushMagnet(magnetId, deltaX, deltaY);
            })

            .on('presence', { event: 'join' }, ({ newPresences }) => {                
                for (const presence of newPresences) {
                    // Skip our own presence
                    if (presence.clientId === this.identity.clientId) continue;
                    
                    // console.log(`[SpaceCraft] Another ${presence.clientType} joined: ${presence.clientId} ${presence.clientName}`);
                    
                    // Check if this is a simulator joining
                    if (presence.clientType === "simulator") {
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
                for (const presence of leftPresences) {
                    // Remove from our client registry
                    if (this.clients[presence.clientId]) {
                        // console.log(`[SpaceCraft] Client left: ${presence.clientId} (${presence.clientType || 'unknown type'})`);
                        delete this.clients[presence.clientId];
                    }
                }
            })

            .subscribe((status) => { 
                try { console.log('[Sim] subscribe status:', status); } catch {}
                 if (status === 'SUBSCRIBED') {
                    try { console.log('[Sim] SUBSCRIBED: tracking presence and starting index negotiation'); } catch {}
                    try { console.log('[Sim] track identity:', { clientId: this.identity.clientId, clientName: this.identity.clientName, simulatorIndex: this.identity.simulatorIndex }); } catch {}
                    this.clientChannel.track({
                        ...this.identity,
                        shared: { ...this.state }
                    });
                    try { this.ensureUniqueSimulatorName(); } catch {}
                }
            });

        // Attempt to restore previously assigned simulator index for this channel (persists across reconnects)
        // Intentionally NOT restoring simulatorIndex from localStorage to avoid duplicate indices across tabs
        try { console.log('[Sim] init: not restoring simulatorIndex from localStorage; will negotiate via presence'); } catch {}

        this.syncStateToPresence();
    }

    broadcastIndexClaim(index) {
        try {
            console.log('[Sim] broadcastIndexClaim sending', { index, clientId: this.identity && this.identity.clientId });
            this.clientChannel && this.clientChannel.send({
                type: 'broadcast',
                event: 'indexClaim',
                payload: { clientId: this.identity.clientId, index }
            });
        } catch {}
    }

    ensureUniqueSimulatorName() {
        try {
            // If already assigned, nothing to do
            if (this.simulatorIndex && this.simulatorIndex > 0) return;
            const state = this.clientChannel && this.clientChannel.presenceState ? this.clientChannel.presenceState() : null;
            if (!state) return;
            const prefix = SpaceCraftSim.simulatorNamePrefix;
            // Compute observed max from presence (explicit index, name suffix) and shared maxIndexSeen
            try { console.log('[Sim] ensureUniqueSimulatorName start; presence keys=', Object.keys(state || {})); } catch {}
            let totalSimulators = 0;
            let presenceMax = 0;
            let maxSeenShared = 0;
            Object.values(state).forEach((arr) => {
                (arr || []).forEach((p) => {
                    if (p.clientType === 'simulator') {
                        totalSimulators += 1;
                        try { console.log('[Sim] presence simulator:', { clientId: p.clientId, nameTop: p.clientName, nameShared: p.shared && p.shared.clientName, idxTop: p.simulatorIndex, idxShared: p.shared && p.shared.simulatorIndex, maxIndexSeen: p.shared && p.shared.maxIndexSeen }); } catch {}
                        if (typeof p.simulatorIndex === 'number' && p.simulatorIndex > presenceMax) presenceMax = p.simulatorIndex;
                        if (p.shared && typeof p.shared.simulatorIndex === 'number' && p.shared.simulatorIndex > presenceMax) presenceMax = p.shared.simulatorIndex;
                        if (typeof p.clientName === 'string') {
                            const m = p.clientName.match(/(\d+)\s*$/);
                            if (m) {
                                const n = parseInt(m[1], 10);
                                if (n > presenceMax) presenceMax = n;
                            }
                        }
                        if (p.shared && typeof p.shared.maxIndexSeen === 'number' && p.shared.maxIndexSeen > maxSeenShared) maxSeenShared = p.shared.maxIndexSeen;
                    }
                });
            });
            // Do not read maxIndexSeen from localStorage; avoid cross-tab coupling
            const now = Date.now();
            this._indexClaims = (this._indexClaims || []).filter(c => now - c.ts < 2000);
            const claimsMax = this._indexClaims.reduce((a, c) => Math.max(a, c.index), 0);
            const base = Math.max(presenceMax, maxSeenShared, claimsMax);
            const sameBaseClaims = this._indexClaims.filter(c => c.index === base);
            const rank = sameBaseClaims.filter(c => String(c.clientId) < String(this.identity.clientId)).length;
            const proposed = (totalSimulators <= 1 && base === 0) ? 1 : (base + rank + 1);
            console.log(`[Sim] proposal: ts=${now} tot=${totalSimulators} presenceMax=${presenceMax} maxSeenShared=${maxSeenShared} claimsMax=${claimsMax} base=${base} rank=${rank} proposed=${proposed}`);
            this.broadcastIndexClaim(proposed);
            // finalize after a short coordination window
            clearTimeout(this._indexTimer);
            this._indexTimer = setTimeout(() => {
                const now2 = Date.now();
                this._indexClaims = (this._indexClaims || []).filter(c => now2 - c.ts < 2000);
                const claimsMax2 = this._indexClaims.reduce((a, c) => Math.max(a, c.index), 0);
                const presenceMax2 = (() => {
                    let m = 0;
                    Object.values(this.clientChannel.presenceState() || {}).forEach((arr) => {
                        (arr || []).forEach((p) => {
                            if (p.clientType === 'simulator') {
                                if (typeof p.simulatorIndex === 'number' && p.simulatorIndex > m) m = p.simulatorIndex;
                                if (p.shared && typeof p.shared.simulatorIndex === 'number' && p.shared.simulatorIndex > m) m = p.shared.simulatorIndex;
                                if (typeof p.clientName === 'string') {
                                    const mm = p.clientName.match(/(\d+)\s*$/);
                                    if (mm) m = Math.max(m, parseInt(mm[1], 10));
                                }
                                if (p.shared && typeof p.shared.maxIndexSeen === 'number' && p.shared.maxIndexSeen > m) m = p.shared.maxIndexSeen;
                            }
                        });
                    });
                    return m;
                })();
                const base2 = Math.max(presenceMax2, claimsMax2);
                const sameBase2 = this._indexClaims.filter(c => c.index === base2);
                const rank2 = sameBase2.filter(c => String(c.clientId) < String(this.identity.clientId)).length;
                const finalIndex = (final => (final > 0 ? final : 1))( (base2 + rank2 + 1) );
                console.log(`[Sim] finalize: claimsMax2=${claimsMax2} presenceMax2=${presenceMax2} base2=${base2} rank2=${rank2} finalIndex=${finalIndex}`);
                if (!this.simulatorIndex || this.simulatorIndex === 0) {
                    this.simulatorIndex = finalIndex;
                    // Derive a stable hue from index (wrap 8 hues): 0..1
                    // Order: Green, Blue, Yellow, Cyan, Magenta, Orange, Violet, Red (last)
                    const hueDegs = [120, 210, 55, 180, 300, 30, 270, 0];
                    const hues = hueDegs.map(d => (d % 360) / 360);
                    this.simulatorHue = hues[(this.simulatorIndex - 1) % hues.length];
                    const nextName = `${prefix} ${this.simulatorIndex}`;
                    this.identity.clientName = nextName;
                    this.identity.simulatorIndex = this.simulatorIndex;
                    this.identity.simulatorHue = this.simulatorHue;
                    this.state.clientName = nextName;
                    this.state.simulatorIndex = this.simulatorIndex;
                    this.state.simulatorHue = this.simulatorHue;
                    const newMaxSeen = Math.max(base2, this.simulatorIndex);
                    this.state.maxIndexSeen = newMaxSeen;
                    // Do not persist indices to localStorage to avoid cross-tab duplication
                    console.log(`[Sim] assigned: simulatorIndex=${this.simulatorIndex} clientName="${this.identity.clientName}"`);
                    // Push to Unity immediately as well
                    try { bridge.updateObject(this.spaceCraft, { simulatorIndex: this.simulatorIndex, simulatorHue: this.simulatorHue }); } catch {}
                    this.syncStateToPresence();
                    if (this.domContentLoaded) {
                        this.generateQRCodes();
                    }
                }
            }, 400);
        } catch {}
    }

    // Takeover functionality removed: multi-simulator is supported

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

        // console.log(`[SpaceCraft] Sending '${eventName}' event to client ${clientId}`);
        
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

        // console.log(`[SpaceCraft] Broadcasting '${eventName}' event to all clients`);
        
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
        // console.log("[SpaceCraft Debug] Status:", { DOMReady: this.domContentLoaded, BasicInitialized: this.isInitialized, BridgeAvailable: !!window.bridge, SpaceCraft: !!this.spaceCraft, SupabaseLoaded: typeof window.supabase !== 'undefined' });
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
            // console.log(`[SpaceCraft] New client registered: ${clientId} (${clientType || 'unknown type'}, ${clientName || 'Unnamed'})`);
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
        
        // console.log("[SpaceCraft] State updated (counter: " + this.state.updateCounter + "):", stateChanges);
    }
    
    /**
     * Updates the highlighted item based on highlightedItemIds
     * Sets highlightedItemId and highlightedItem in the state
     */
    updateHighlightedItem() {
        // console.log("[SpaceCraft DEBUG] updateHighlightedItem called. Current highlightedItemIds:", JSON.parse(JSON.stringify(this.state.highlightedItemIds)));
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

    /**
     * Creates a unified, alphabetized, deduplicated list of all tags from all items in all collections
     * @returns {Array<string>} Array of unique tags in alphabetical order
     */
    createUnifiedTagsList() {
        if (!this.loadedContent || !this.loadedContent.collections) {
            // console.log("[SpaceCraft] No collections data available for creating tags list");
            return [];
        }

        const allTags = new Set();

        // Iterate through all collections
        for (const [collectionId, collection] of Object.entries(this.loadedContent.collections)) {
            if (!collection.items) continue;

            // Iterate through all items in the collection
            for (const [itemId, itemData] of Object.entries(collection.items)) {
                const item = itemData.item;

                // Add tags from the item if they exist
                if (item && item.tags && Array.isArray(item.tags)) {
                    item.tags.forEach(tag => {
                        if (typeof tag === 'string' && tag.trim()) {
                            allTags.add(tag.toLowerCase().trim());
                        }
                    });
                }
            }
        }

        const sortedTags = Array.from(allTags).sort();
        // console.log(`[SpaceCraft] Created unified tags list with ${sortedTags.length} unique tags`);
        return sortedTags;
    }
}

// =============================================================================
//                         Initialization Entry Point
// =============================================================================

// Create a global instance of our SpaceCraftSim class
window.SpaceCraft = new SpaceCraftSim();

// Ensure the HTML structure (canvas, buttons, svg placeholders) is ready 
// before attempting to interact with it or generate QR code.
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

// console.log("[SpaceCraft] spacecraft.js loaded. Waiting for DOMContentLoaded to initialize...");
