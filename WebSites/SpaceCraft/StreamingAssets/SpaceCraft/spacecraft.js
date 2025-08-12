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
    
    /**
     * Get the channel name from URL query parameter or use default
     * @returns {string} Channel name to use
     */
    static getChannelName() {
        const urlParams = new URLSearchParams(window.location.search);
        const channelFromUrl = urlParams.get('channel');
        return channelFromUrl || this.clientChannelName;
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
        this.availableTags = []; // Store tags from all items
        
        // Search state
        this.currentSearchQuery = ''; // Track current search query for change detection
        
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
        console.log("[SpaceCraft] Initiating early fetch for index-deep.json");
        
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
        console.log("[SpaceCraft] DOM loaded. Initializing QR code.");

        // Check for QR Code library dependency
        if (typeof QRCode === 'undefined') {
            console.error("[SpaceCraft] QRCode library (qrcode.min.js) not found! Cannot generate QR code.");
            return; // Stop further initialization if QR code can't be generated
        }
        
        // Generate QR code
        this.generateQRCodes();

        // Basic initialization is considered complete after DOM/QR setup
        this.isInitialized = true; 
        console.log("[SpaceCraft] DOM and QR code initialization complete.");
        
        // Now that the DOM is ready, proceed to configure and load Unity
        this.configureAndLoadUnity();
    }
    
    /**
     * Generate QR code for controller based on qrCodeDefinitions.
     */
    generateQRCodes() {
        console.log("[SpaceCraft] Generating QR code based on definitions...");
        
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
            
            const currentSearchParams = qrParams.toString() ? '?' + qrParams.toString() : '';

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
                // Clone the search params for each QR code
                const qrSpecificParams = new URLSearchParams(currentSearchParams);
                
                // Add the type parameter if defined
                if (definition.type) {
                    qrSpecificParams.set('type', definition.type);
                }
                
                // Build the complete search params string
                const finalSearchParams = qrSpecificParams.toString() ? '?' + qrSpecificParams.toString() : '';
                
                // Construct the target URL for the link, including the query parameters
                const targetRelativeUrl = definition.targetHtml + finalSearchParams;
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
                const windowFeatures = 'resizable=yes,scrollbars=yes';
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

            console.log("[SpaceCraft] QR code generated successfully.");

        } catch (error) {
            console.error("[SpaceCraft] Error generating QR code:", error);
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
        const buildUrl = "/SpaceCraft/Build";

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
                 console.log(`[SpaceCraft] Unity loading progress: ${Math.round(progress * 100)}%`);
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
                    console.log(`[SpaceCraft] Fetching content from ${SpaceCraftSim.deepIndexPath}`);
        const response = await fetch(SpaceCraftSim.deepIndexPath);
            
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

        // Ensure basic initialization (DOM, QR code) happened. It should have by now.
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

            // Extract tags from loaded content items
            this.availableTags = this.createUnifiedTagsList();
            this.state.tags = this.availableTags;
            console.log(`[SpaceCraft] Loaded ${this.availableTags.length} tags from content items`);
            if (this.availableTags.length > 0) {
                console.log(`[SpaceCraft] Available tags (${this.availableTags.length}):`, this.availableTags.slice(0, 10));
            } else {
                console.log("[SpaceCraft] No tags found in content items");
            }
            
            // Sync tags to presence immediately after loading
            this.syncStateToPresence();
            
            // Create the SpaceCraft object via Bridge - pass content exactly as received
            const success = this.createSpaceCraftObject(this.loadedContent);
            
            // Only attempt Supabase setup if SpaceCraft was created successfully
            if (success !== false && typeof window.supabase?.createClient === 'function') {
                this.setupSupabase();
                
                if (this.clientChannel) {
                    this.setupSupabaseChannel();
                    
                    // Sync tags to presence after Supabase channel is set up
                    this.syncStateToPresence();
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
            obj: {
                // This obj is used as the wrapper object for the SpaceCraft prefab.
                // Here we can add methods and properties for the singleton SpaceCraft 
                // prefab wrapper object, for managing magnets, etc.

                // Map of magnet name => Unity bridge object (kept within the bridge object)
                magnetViews: new Map(),
                
                getMagnetView: function (magnetId) {
                    console.log(`[Bridge] getMagnetView called with: "${magnetId}"`);
                    return this.magnetViews.get(magnetId) || null;
                },
                
                createMagnetView: function (magnetData) {
                    console.log(`[Bridge] this: ${this} createMagnetView called with:`, magnetData);
                    
                    // Use provided magnetId or generate one if not provided
                    const magnetId = magnetData.magnetId || (() => {
                        const timestamp = Date.now();
                        const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                        return `${timestamp}${randomDigits}`;
                    })();
                    
                    const magnetBridge = window.bridge.createObject({
                            prefab: "Prefabs/MagnetView",
                            parent: this,
                            update: {
                                "magnetId": magnetId,
                                "title": magnetData.title,
                                "searchExpression": magnetData.searchExpression,
                                "searchType": magnetData.searchType,
                                "enabled": magnetData.enabled,
                                "mass": magnetData.mass,
                                "staticFriction": magnetData.staticFriction,
                                "dynamicFriction": magnetData.dynamicFriction,
                                "magnetRadius": magnetData.magnetRadius,
                                "magnetSoftness": magnetData.magnetSoftness,
                                "magnetHoleRadius": magnetData.magnetHoleRadius,
                                "magnetStrength": magnetData.magnetStrength,
                                "magnetEnabled": magnetData.magnetEnabled,
                                "scoreMin": magnetData.scoreMin,
                                "scoreMax": magnetData.scoreMax,
                                "viewScale": magnetData.viewScale,
                                "viewScaleInitial": magnetData.viewScaleInitial,
                                "method:MoveToPanCenter": [],
                            }
                        });
                    
                    // Store in our magnetViews map using magnetId as key
                    this.magnetViews.set(magnetId, magnetBridge);
                    console.log(`[Bridge] Created and stored magnet: "${magnetData.title}" (ID: ${magnetId}). Total magnets: ${this.magnetViews.size}`);
                    
                    return magnetBridge;
                },
                
                updateMagnetView: function (magnetData) {
                    console.log(`[Bridge] updateMagnetView called with:`, magnetData);
                    
                    if (!magnetData.magnetId) {
                        console.warn(`[Bridge] updateMagnetView: magnetId is required`);
                        return false;
                    }
                    
                    const magnetBridge = this.magnetViews.get(magnetData.magnetId);
                    if (!magnetBridge) {
                        console.warn(`[Bridge] updateMagnetView: No magnet found with ID: "${magnetData.magnetId}"`);
                        return false;
                    }
                    
                    // Update the Unity bridge object with new magnet data
                    window.bridge.updateObject(magnetBridge, magnetData);
                    
                    console.log(`[Bridge] Updated magnet: "${magnetData.title}" (ID: ${magnetData.magnetId})`);
                    return true;
                },
                deleteMagnetView: function (magnetId) {
                     console.log(`[Bridge] deleteMagnetView called with: "${magnetId}"`);
                     
                     const magnetBridge = this.magnetViews.get(magnetId);
                     if (!magnetBridge) {
                         console.warn(`[Bridge] No magnet found to delete: "${magnetId}"`);
                         return false;
                     }
                     
                     // Destroy the Unity bridge object (this will destroy the prefab)
                     window.bridge.destroyObject(magnetBridge);
                     
                     // Remove from our map
                     this.magnetViews.delete(magnetId);
                     console.log(`[Bridge] Deleted magnet: "${magnetId}". Total magnets: ${this.magnetViews.size}`);
                     
                     return true;
                 }               
            },
            // Register all necessary Unity event interests with proper query structure
            interests: {
                // Listen for when content is processed in Unity
                "ContentLoaded": {
                    query: {
                        "unityMetaData": "UnityMetaData"
                    },
                    handler: (obj, results) => {
                        console.log("[SpaceCraft] ContentLoaded event received from Unity");
                        console.log("[SpaceCraft] unityMetaData:", results.unityMetaData);
                        this.unityMetaData = results.unityMetaData;
                    }
                },
                
                // Listen for changes to highlighted items
                "HighlightedItemsChanged": {
                    query: { 
                        "highlightedItemIds": "HighlightedItemIds"
                    },
                    handler: (obj, results) => {
                        console.log("[SpaceCraft JS EVENT HANDLER] HighlightedItemsChanged HANDLER ENTERED"); 
                        console.log("[SpaceCraft JS DEBUG] Raw HighlightedItemsChanged event from Unity. Results:", JSON.parse(JSON.stringify(results)));
                        if (results && results.highlightedItemIds) {
                            this.state.highlightedItemIds = results.highlightedItemIds;
                            // console.log("[SpaceCraft JS DEBUG] Calling updateHighlightedItem(). New IDs:", JSON.parse(JSON.stringify(this.state.highlightedItemIds)));
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
                            // console.log("[SpaceCraft JS DEBUG] Calling updateSelectedItem(). New IDs:", JSON.parse(JSON.stringify(this.state.selectedItemIds)));
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
        
        // Create the ground plane as a child of SpaceCraft
        this.groundPlane = window.bridge.createObject({
            prefab: "Prefabs/GroundPlane",
            parent: this.spaceCraft
        });
        
        // Store references globally
        window.spaceCraft = this.spaceCraft;
        window.groundPlane = this.groundPlane;
        
        console.log("[SpaceCraft] SpaceCraft object and ground plane created with content data");
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
            
            // Available tags from content items
            tags: [],
            
            // Magnet system
            magnets: [],
            
            // Search system
            currentSearchString: '', // Official search string coordinated across all controllers
            currentSearchGravity: 0, // Current gravity setting (-100 to +100)
            
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
        // console.log("[SpaceCraft DEBUG] updateSelectedItem called. Current selectedItemIds:", JSON.parse(JSON.stringify(this.state.selectedItemIds)));
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
        
        // Log exactly what is being synced, especially selectedItem and tags
        console.log("[SpaceCraft] Syncing state to presence. Current selectedItem:", JSON.parse(JSON.stringify(this.state.selectedItem))); 
        console.log("[SpaceCraft] Syncing state to presence. Tags count:", this.state.tags?.length || 0);
        
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
        const channelName = SpaceCraftSim.getChannelName();
        console.log(`[SpaceCraft] Setting up Supabase client with channel: ${channelName}`);
        
        // Create a Supabase client
        const client = window.supabase.createClient(
                        SpaceCraftSim.supabaseUrl,
            SpaceCraftSim.supabaseAnonKey
        );
        
        // Create a channel for client communication
        this.clientChannel = client.channel(channelName);
        
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
        console.log(`[SpaceCraft] Subscribing to Supabase '${SpaceCraftSim.getChannelName()}' channel`);
        console.log(`[SpaceCraft] My simulator identity:`, this.identity);

        // DEBUG: Log ALL broadcast events
        channel.on('broadcast', {}, (data) => {
            console.log(`[SpaceCraft] RECEIVED BROADCAST EVENT: ${data.event}`, data);
            if (data.payload && data.payload.targetSimulatorId) {
                console.log(`[SpaceCraft] Event targeted at simulator: ${data.payload.targetSimulatorId}, my ID: ${this.identity.clientId}`);
            }
        });

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
                const dx = data.payload.dx || 0; // Mouse delta X
                const dy = data.payload.dy || 0; // Mouse delta Y
                
                if (action === 'tap') {
                    // Handle tap action - apply scale impulse to highlighted item
                    bridge.updateObject(this.spaceCraft, {
                        "method:ApplyTapScaleToHighlightedItem": [clientId, clientName, screenId]
                    });
                } else if (['north', 'south', 'east', 'west', 'up', 'down'].includes(action)) {
                    // Handle directional actions with dx/dy
                    bridge.updateObject(this.spaceCraft, {
                        "method:MoveSelection": [clientId, clientName, screenId, action, dx, dy]
                    });
                }
                
                // Track client info for presence
                this.updateClientInfo(clientId, data.payload.clientType, clientName);
            })

            .on('broadcast', { event: 'searchStringUpdate' }, (data) => {
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                console.log(`[SpaceCraft] SearchStringUpdate event received:`, data.payload);
                
                const newSearchString = data.payload.newSearchString || "";
                
                console.log(`[SpaceCraft] Updating official search string to: "${newSearchString}"`);
                
                // Update our official search string state
                this.state.currentSearchString = newSearchString;
                
                // Send search string and current gravity to Unity
                bridge.updateObject(this.spaceCraft, {
                    "inputManager/searchString": newSearchString,
                    "inputManager/searchGravity": this.state.currentSearchGravity || 0
                });
                
                // Update presence to share with all controllers
                this.syncStateToPresence();
                
                // Track client info for presence
                this.updateClientInfo(data.payload.clientId, data.payload.clientType, data.payload.clientName);
            })
            .on('broadcast', { event: 'gravityUpdate' }, (data) => {
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    return;
                }
                
                console.log(`[SpaceCraft] GravityUpdate event received:`, data.payload);
                
                const searchGravity = data.payload.searchGravity || 0;
                
                console.log(`[SpaceCraft] Updating search gravity to: ${searchGravity}`);
                
                // Update our gravity state
                this.state.currentSearchGravity = searchGravity;
                
                // Send gravity to Unity (with current search string)
                bridge.updateObject(this.spaceCraft, {
                    "inputManager/searchString": this.state.currentSearchString,
                    "inputManager/searchGravity": searchGravity
                });
                
                // Update presence to share with all controllers
                this.syncStateToPresence();
                
                // Track client info for presence
                this.updateClientInfo(data.payload.clientId, data.payload.clientType, data.payload.clientName);
            })
            .on('broadcast', { event: 'AddMagnet' }, (data) => {
                console.log(`[SpaceCraft] AddMagnet event handler triggered!`, data);
                
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    console.log(`[SpaceCraft] AddMagnet skipped - wrong target simulator (${data.payload.targetSimulatorId} vs ${this.identity.clientId})`);
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetName = data.payload.magnetName;
                
                console.log(`[SpaceCraft] AddMagnet event received from client ${clientId} (${clientName}): "${magnetName}"`);
                
                if (!magnetName || typeof magnetName !== 'string') {
                    console.warn(`[SpaceCraft] Invalid magnet name received: ${magnetName}`);
                    return;
                }
                
                const trimmedName = magnetName.trim();
                if (!trimmedName) {
                    console.warn(`[SpaceCraft] Empty magnet name received after trimming`);
                    return;
                }
                
                // Generate magnetId (timestamp + 4 random digits)
                const timestamp = Date.now();
                const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const magnetId = `${timestamp}${randomDigits}`;
                
                // Create magnet object with all properties
                const magnetObject = {
                    magnetId: magnetId,
                    title: trimmedName,
                    searchExpression: trimmedName,
                    searchType: "fuzzy",
                    enabled: true,
                    magnetEnabled: true,
                    mass: 1.0,
                    staticFriction: 10.0,
                    dynamicFriction: 8.0,
                    magnetRadius: 100.0,
                    magnetSoftness: 0.5,
                    magnetHoleRadius: 10.0,
                    magnetStrength: 1.0,
                    scoreMin: 0.0,
                    scoreMax: 1.0,
                    viewScale: 4.0,
                    viewScaleInitial: 0.01
                };
                
                // Check if magnet already exists (case-insensitive by title)
                const existingMagnet = this.state.magnets.find(m => 
                    m.title.toLowerCase() === trimmedName.toLowerCase()
                );
                
                if (existingMagnet) {
                    console.log(`[SpaceCraft] Magnet "${trimmedName}" already exists as "${existingMagnet.title}", ignoring duplicate`);
                    return;
                }
                
                // Add magnet to state
                this.state.magnets.push(magnetObject);
                console.log(`[SpaceCraft] Added magnet "${trimmedName}" (ID: ${magnetId}) to state. Total magnets: ${this.state.magnets.length}`);
                console.log(`[SpaceCraft] Current magnets: [${this.state.magnets.map(m => m.title).join(', ')}]`);
                
                // Create Unity magnet prefab
                this.createUnityMagnet(magnetObject);
                
                // Update presence to sync with controllers
                this.syncStateToPresence();
                
                // Track client info for presence
                this.updateClientInfo(clientId, data.payload.clientType, clientName);
            })
            .on('broadcast', { event: 'DeleteMagnet' }, (data) => {
                console.log(`[SpaceCraft] DeleteMagnet event handler triggered!`, data);
                
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    console.log(`[SpaceCraft] DeleteMagnet skipped - wrong target simulator (${data.payload.targetSimulatorId} vs ${this.identity.clientId})`);
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetName = data.payload.magnetName;
                
                console.log(`[SpaceCraft] DeleteMagnet event received from client ${clientId} (${clientName}): "${magnetName}"`);
                
                if (!magnetName || typeof magnetName !== 'string') {
                    console.warn(`[SpaceCraft] Invalid magnet name received: ${magnetName}`);
                    return;
                }
                
                const trimmedName = magnetName.trim();
                if (!trimmedName) {
                    console.warn(`[SpaceCraft] Empty magnet name received after trimming`);
                    return;
                }
                
                // Find the exact magnet to delete (case-insensitive match by title)
                const magnetToDelete = this.state.magnets.find(m => 
                    m.title.toLowerCase() === trimmedName.toLowerCase()
                );
                
                if (magnetToDelete) {
                    // Destroy Unity magnet prefab first
                    this.destroyUnityMagnet(magnetToDelete.magnetId);
                    
                    // Remove from state
                    this.state.magnets = this.state.magnets.filter(m => 
                        m.title.toLowerCase() !== trimmedName.toLowerCase()
                    );
                    
                    console.log(`[SpaceCraft] Removed magnet "${magnetToDelete.title}" (ID: ${magnetToDelete.magnetId}). Total magnets: ${this.state.magnets.length}`);
                    console.log(`[SpaceCraft] Current magnets: [${this.state.magnets.map(m => m.title).join(', ')}]`);
                    
                    // Update presence to sync with controllers
                    this.syncStateToPresence();
                } else {
                    console.log(`[SpaceCraft] No magnet found matching "${trimmedName}" to delete`);
                }
                
                // Track client info for presence
                this.updateClientInfo(clientId, data.payload.clientType, clientName);
            })
            .on('broadcast', { event: 'PushMagnet' }, (data) => {
                console.log(`[SpaceCraft] PushMagnet event handler triggered!`, data);
                
                // Skip messages targeted at other simulators
                if (data.payload.targetSimulatorId && data.payload.targetSimulatorId !== this.identity.clientId) {
                    console.log(`[SpaceCraft] PushMagnet skipped - wrong target simulator (${data.payload.targetSimulatorId} vs ${this.identity.clientId})`);
                    return;
                }
                
                const clientId = data.payload.clientId;
                const clientName = data.payload.clientName || "";
                const magnetName = data.payload.magnetName;
                const deltaX = data.payload.deltaX;
                const deltaZ = data.payload.deltaZ;
                
                console.log(`[SpaceCraft] PushMagnet event received from client ${clientId} (${clientName}): "${magnetName}" by (${deltaX}, ${deltaZ})`);
                
                if (!magnetName || typeof magnetName !== 'string') {
                    console.warn(`[SpaceCraft] Invalid magnet name received: ${magnetName}`);
                    return;
                }
                
                if (typeof deltaX !== 'number' || typeof deltaZ !== 'number') {
                    console.warn(`[SpaceCraft] Invalid delta values received: deltaX=${deltaX}, deltaZ=${deltaZ}`);
                    return;
                }
                
                // Find the magnet by title (case-insensitive)
                const magnet = this.state.magnets.find(m => 
                    m.title.toLowerCase() === magnetName.toLowerCase()
                );
                
                if (magnet) {
                    // Push the Unity magnet using magnetId
                    const success = this.pushUnityMagnet(magnet.magnetId, deltaX, deltaZ);
                    if (success) {
                        console.log(`[SpaceCraft] Successfully pushed magnet "${magnet.title}" (ID: ${magnet.magnetId}) by (${deltaX}, ${deltaZ})`);
                    } else {
                        console.warn(`[SpaceCraft] Failed to push magnet "${magnet.title}" (ID: ${magnet.magnetId})`);
                    }
                } else {
                    console.warn(`[SpaceCraft] No magnet found matching "${magnetName}" to push`);
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
                const allPresences = channel.presenceState();
                // Check for search queries from controllers
                this.checkForSearchQueries(allPresences);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                // console.log("[SpaceCraft] New presences joined:", newPresences);
                
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
                
                // Check for search queries from the new presences
                this.checkForSearchQueries(channel.presenceState());
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                // console.log("[SpaceCraft] Presences left:", leftPresences);
                
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
        
                        // console.log(`[SpaceCraft] Sending simulator takeover notification`);
        
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
     * Creates a Unity magnet prefab at the current view pan location
     * @param {Object} magnetData - The magnet object with all properties
     */
    createUnityMagnet(magnetData) {
        console.log(`[SpaceCraft] Creating Unity magnet: "${magnetData.title}" (ID: ${magnetData.magnetId})`, magnetData);
        
        // Create magnet prefab via bridge object (magnetViews managed inside bridge)
        const magnetBridge = this.spaceCraft.createMagnetView(magnetData);
        
        if (magnetBridge) {
            console.log(`[SpaceCraft] Successfully created Unity magnet: "${magnetData.title}" (ID: ${magnetData.magnetId})`);
            return magnetBridge;
        } else {
            console.error(`[SpaceCraft] Failed to create Unity magnet: "${magnetData.title}" (ID: ${magnetData.magnetId})`);
            return null;
        }
    }
    
    
    /**
     * Destroys a Unity magnet prefab
     * @param {string} magnetId - The ID of the magnet to destroy
     */
    destroyUnityMagnet(magnetId) {
        console.log(`[SpaceCraft] Destroying Unity magnet prefab for ID: "${magnetId}"`);
        
        if (!this.spaceCraft) {
            console.warn(`[SpaceCraft] Cannot destroy magnet - spaceCraft bridge not available`);
            return false;
        }
        
        // Delete magnet via bridge object (magnetViews managed inside bridge)
        const success = this.spaceCraft.deleteMagnetView(magnetId);
        
        if (success) {
            console.log(`[SpaceCraft] Successfully destroyed Unity magnet with ID: "${magnetId}"`);
            return true;
        } else {
            console.warn(`[SpaceCraft] Failed to destroy Unity magnet with ID: "${magnetId}"`);
            return false;
        }
    }
    
    /**
     * Pushes a Unity magnet by world coordinate offset
     * @param {string} magnetId - The ID of the magnet to push
     * @param {number} deltaX - World coordinate X offset
     * @param {number} deltaZ - World coordinate Z offset
     */
    pushUnityMagnet(magnetId, deltaX, deltaZ) {
        console.log(`[SpaceCraft] Pushing Unity magnet with ID "${magnetId}" by (${deltaX}, ${deltaZ})`);
        
        if (!this.spaceCraft) {
            console.warn(`[SpaceCraft] Cannot push magnet - spaceCraft bridge not available`);
            return false;
        }
        
        // Get magnet from bridge object
        const magnetBridge = this.spaceCraft.getMagnetView(magnetId);
        
        if (!magnetBridge) {
            console.warn(`[SpaceCraft] No magnet found to push with ID: "${magnetId}"`);
            return false;
        }
        
        // Send push command to Unity magnet via bridge update
        // Note: deltaZ maps to Y coordinate in Unity (Y screen movement -> Z world movement)
        window.bridge.updateObject(magnetBridge, {
            "method:PushPosition": [deltaX, deltaZ]
        });
        
        console.log(`[SpaceCraft] Successfully pushed Unity magnet with ID: "${magnetId}"`);
        return true;
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
     * Checks for search queries from controllers in the presence state
     * Finds the first non-empty search query and sends it to Unity
     * @param {Object} presences - The presence state object
     */
    checkForSearchQueries(presences) {
        if (!this.spaceCraft) {
            // SpaceCraft bridge object not ready yet
            return;
        }
        
        let foundSearchQuery = '';
        let searchSourceClient = null;
        
        // Look through all presences for controller search queries
        for (const presenceKey in presences) {
            const presenceList = presences[presenceKey];
            for (const presence of presenceList) {
                // Skip our own presence
                if (presence.clientId === this.identity.clientId) continue;
                
                // Skip non-controller clients
                if (!presence.clientType || presence.clientType === 'simulator') continue;
                
                // Check if this presence has a search query
                if (presence.searchQuery && typeof presence.searchQuery === 'string' && presence.searchQuery.trim()) {
                    foundSearchQuery = presence.searchQuery.trim();
                    searchSourceClient = {
                        id: presence.clientId,
                        name: presence.clientName || "Unknown Controller",
                        type: presence.clientType
                    };
                    console.log(`[SpaceCraft] Found search query: "${foundSearchQuery}" from ${searchSourceClient.name} (${searchSourceClient.id})`);
                    break; // Use the first non-empty search query we find
                }
            }
            
            if (foundSearchQuery) break; // Found a search query, stop looking
        }
        
        // Update our stored search query and send to Unity if it changed
        if (foundSearchQuery !== this.currentSearchQuery) {
            this.currentSearchQuery = foundSearchQuery;
            
            if (searchSourceClient) {
                console.log(`[SpaceCraft] Sending search query "${foundSearchQuery}" from ${searchSourceClient.name}`);
                
                // Send search update to Unity via bridge (simple property update)
                bridge.updateObject(this.spaceCraft, {
                    "inputManager/searchString": foundSearchQuery
                });
            } else if (foundSearchQuery === '') {
                // Search was cleared
                console.log(`[SpaceCraft] Search query cleared`);
                
                bridge.updateObject(this.spaceCraft, {
                    "inputManager/searchString": ""
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
            console.log("[SpaceCraft] No collections data available for creating tags list");
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
        console.log(`[SpaceCraft] Created unified tags list with ${sortedTags.length} unique tags`);
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

console.log("[SpaceCraft] spacecraft.js loaded. Waiting for DOMContentLoaded to initialize...");

// =============================================================================
//                           Controller Initialization
// =============================================================================
// Check if this is a controller page and initialize the Controller if needed
async function initializeControllerIfNeeded() {
    // Check if we're on a controller page (has controller-specific elements or URL params)
    const urlParams = new URLSearchParams(window.location.search);
    const hasControllerParam = urlParams.has('tab') || window.location.pathname.includes('controller');
    const hasControllerElements = document.querySelector('.tab-bar') || document.querySelector('#target');
    
    if (hasControllerParam || hasControllerElements || window.location.pathname.includes('controller')) {
        try {
            console.log("[SpaceCraft] Detected controller page, initializing Controller...");
            
            // Import controller and tab modules
            console.log('[SpaceCraft] About to import controller.js');
            const { Controller } = await import('./controller.js');
            console.log('[SpaceCraft] Controller imported successfully');
            
            console.log('[SpaceCraft] About to import tabs.js');
            const { 
                BaseTab, 
                AboutTab, 
                NavigateTab, 
                SelectTab, 
                InspectTab, 
                GravityTab, 
                MagnetTab, 
                AdjustTab 
            } = await import('./tabs.js');
            console.log('[SpaceCraft] All tabs imported successfully');
            
            // Create controller instance
            const controller = new Controller();
            console.log('[SpaceCraft] Controller created successfully');
            
            // Register all tabs
            controller.registerTab(AboutTab);
            controller.registerTab(NavigateTab);
            controller.registerTab(SelectTab);
            controller.registerTab(InspectTab);
            controller.registerTab(GravityTab);
            controller.registerTab(MagnetTab);
            controller.registerTab(AdjustTab);
            
            console.log('[SpaceCraft] All tabs registered successfully');
            
            // Initialize the controller
            controller.initialize();
            
            // Make controller globally accessible
            window.controller = controller;
            
            console.log("[SpaceCraft] Controller initialized successfully");
            
        } catch (error) {
            console.error("[SpaceCraft] Error initializing Controller:", error);
        }
    } else {
        console.log("[SpaceCraft] Not a controller page, skipping Controller initialization");
    }
}

// Initialize controller after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeControllerIfNeeded);
} else {
    initializeControllerIfNeeded();
}
