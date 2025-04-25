// SpaceCraft.js - Main JavaScript interface for the SpaceCraft Unity application
// This file handles communication between Unity and the web browser

// Global flag to track initialization status
window.spaceCraftInitialized = false;

// Create global SpaceCraft object
window.SpaceCraft = {
    // Store reference to our spacecraft object
    spaceCraftObject: null,
    
    // Initialize SpaceCraft - only called once Unity and Bridge are ready
    initialize: function() {
        console.log("[SpaceCraft] Initializing...");
        
        // Check for required dependencies
        if (typeof QRCode === 'undefined') {
            console.error("[SpaceCraft] QRCode library not found!");
            return;
        }
        
        // Basic initialization is complete
        console.log("[SpaceCraft] Basic initialization complete");
        window.spaceCraftInitialized = true;
    },
    
    // Load collections and create SpaceCraft object
    // This should be called AFTER Unity is loaded and Bridge is started
    loadCollectionsAndCreateSpaceCraft: function() {
        console.log("[SpaceCraft] Loading collections from JSON");
        
        // Make sure we're initialized first
        if (!window.spaceCraftInitialized) {
            console.log("[SpaceCraft] Not initialized yet, initializing now");
            this.initialize();
        }
        
        // Asynchronously load collections and create SpaceCraft
        this.loadCollectionsFromJson()
            .then(collections => {
                console.log("[SpaceCraft] Collections loaded successfully");
                this.createSpaceCraftObject(collections);
            })
            .catch(error => {
                console.error("[SpaceCraft] Error loading collections:", error);
                console.log("[SpaceCraft] Using placeholder collections instead");
                this.createSpaceCraftObject(this.getPlaceholderCollections());
            });
    },
    
    // Load collections from JSON file
    loadCollectionsFromJson: async function() {
        const response = await fetch("StreamingAssets/Content/index-deep.json");
        if (!response.ok) {
            throw new Error(`Failed to fetch collections: ${response.status}`);
        }
        return await response.json();
    },
    
    // Create the SpaceCraft object in Bridge
    createSpaceCraftObject: function(collections) {
        if (!window.bridge) {
            console.error("[SpaceCraft] Bridge not available");
            return;
        }
        
        console.log("[SpaceCraft] Creating SpaceCraft object with collections");
        
        try {
            // Create SpaceCraft object in Bridge
            this.spaceCraftObject = window.bridge.createObject({
                prefab: "Resources/Prefabs/SpaceCraft",
                obj: {
                    id: "spacecraft",
                    interests: {
                        "CollectionsLoaded": {
                            handler: (obj, data) => {
                                console.log("[SpaceCraft] Collections loaded in Unity");
                            }
                        },
                        "HighlightedItemsChanged": {
                            query: {
                                "highlightedItemIds": "highlightedItemIds"
                            },
                            handler: (obj, results) => {
                                console.log("[SpaceCraft] HighlightedItemsChanged:", results);
                            }
                        },
                        "SelectedItemsChanged": {
                            query: {
                                "selectedItemIds": "selectedItemIds"
                            },
                            handler: (obj, results) => {
                                console.log("[SpaceCraft] SelectedItemsChanged:", results);
                            }
                        }
                    }
                },
                update: {
                    collections: collections
                }
            });
            
            // Store a global reference for easy access
            window.spaceCraft = this.spaceCraftObject;
            
            console.log("[SpaceCraft] SpaceCraft object created:", this.spaceCraftObject);
            
            // Set up Supabase for remote control
            this.setupSupabase();
        } catch (error) {
            console.error("[SpaceCraft] Error creating SpaceCraft object:", error);
        }
    },
    
    // Set up Supabase for remote control
    setupSupabase: function() {
        if (typeof supabase === 'undefined') {
            console.error("[SpaceCraft] Supabase not available");
            return;
        }
        
        try {
            // Create a Supabase client
            const client = supabase.createClient(
                'https://gwodhwyvuftyrvbymmvc.supabase.co', 
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc'
            );
            
            // Subscribe to channels
            this.subscribeToNavigatorChannel(client);
            this.subscribeToSelectorChannel(client);
            
            console.log("[SpaceCraft] Supabase set up successfully");
        } catch (error) {
            console.error("[SpaceCraft] Error setting up Supabase:", error);
        }
    },
    
    // Subscribe to the navigator channel
    subscribeToNavigatorChannel: function(client) {
        const navigatorChannel = client.channel("navigators");
        navigatorChannel
            .subscribe()
            .on('broadcast', { event: 'pos' }, (data) => {
                if (window.bridge && this.spaceCraftObject) {
                    bridge.updateObject(this.spaceCraftObject, {
                        "component:InputManager/method:PushCameraPosition": [-data.payload.x, data.payload.y]
                    });
                }
            })
            .on('broadcast', { event: 'zoom' }, (data) => {
                if (window.bridge && this.spaceCraftObject) {
                    bridge.updateObject(this.spaceCraftObject, {
                        "component:InputManager/method:PushCameraZoom": [data.payload.zoom]
                    });
                }
            });
    },
    
    // Subscribe to the selector channel
    subscribeToSelectorChannel: function(client) {
        const selectorChannel = client.channel("selectors");
        selectorChannel.subscribe();
        // Add event handlers as needed
    },
    
    // Get placeholder collections data
    getPlaceholderCollections: function() {
        console.log("[SpaceCraft] Using placeholder collections");
        
        return [
            {
                id: "collection1",
                name: "Sample Collection 1",
                items: [
                    { id: "item1", name: "Item 1" },
                    { id: "item2", name: "Item 2" }
                ]
            },
            {
                id: "collection2",
                name: "Sample Collection 2",
                items: [
                    { id: "item3", name: "Item 3" },
                    { id: "item4", name: "Item 4" }
                ]
            }
        ];
    }
};

// Log initialization
console.log("[SpaceCraft] Script loaded and ready");

// NOTE: Initialization and collection loading are now triggered 
// directly from bridge.js when the StartedUnity event is received. 