// controller.js - Shared JavaScript utilities and setup for SpaceCraft controller pages
// (e.g., navigator.html, selector.html)

/**
 * =============================================================================
 *                       Message and Event Documentation
 * =============================================================================
 * This section documents all messages exchanged between controllers and Unity
 * via Supabase to facilitate remote control and data synchronization.
 *
 * --- EVENTS SENT FROM CONTROLLERS TO UNITY (via Supabase broadcasts) ---
 * 'pan': Sent by navigator or selector during movement
 *    - Navigator: {clientId, clientType, clientName, panXDelta, panYDelta, screenId, targetSimulatorId}
 *    - Selector: {clientId, clientType, clientName, selectXDelta, selectYDelta, screenId, targetSimulatorId}
 *    - Used for continuous movement input
 *
 * 'tap': Sent by selector for selection actions
 *    - {clientId, clientType, clientName, screenId, targetSimulatorId}
 *    - Used for discrete selection actions
 *
 * 'select': Sent by selector for directional selection
 *    - {clientId, clientType, clientName, action, screenId, targetSimulatorId}
 *    - action can be "tap" or directional ("north","south","east","west","up","down")
 *
 * 'zoom': Sent by navigator for zoom actions
 *    - {clientId, clientType, clientName, zoomDelta, screenId, targetSimulatorId}
 *    - Controls camera zoom level
 *
 * --- STATE SYNCHRONIZATION (via Supabase presence) ---
 * Controllers automatically observe simulator state through presence:
 * 
 * --- SHARED STATE PROPERTIES (synchronized via presence) ---
 * Simulator shares these properties in its presence state:
 * - selectedItemId: Currently selected item ID (string or null)
 * - highlightedItemId: Currently highlighted item ID (string or null)
 * - selectedItem: Metadata for current selected item (without nested tree)
 * - highlightedItem: Metadata for highlighted item (without nested tree)
 * - currentCollectionId: ID of the currently active collection
 * - currentCollection: Metadata for the current collection (without items array)
 * - currentCollectionItems: Array of item IDs in the current collection
 * - tags: Array of all available tags from all collections combined
 * - screenIds: Array of available screen IDs
 * - currentScreenId: Current active screen ID
 *
 * --- PRESENCE IDENTITY PROPERTIES ---
 * All clients track identity with:
 * - clientId: Unique identifier for the client
 * - clientType: "simulator", "navigator", or "selector"
 * - clientName: User-friendly name
 * - startTime: Timestamp of connection
 *
 * --- PRESENCE EVENTS ---
 * 'presence' { event: 'sync' }: Full state of all connected clients
 * 'presence' { event: 'join' }: New client has connected
 * 'presence' { event: 'leave' }: Client has disconnected
 *
 * --- SIMULATOR TAKEOVER ---
 * 'simulator_takeover': Sent when a new simulator takes over
 *    - {newSimulatorId, newSimulatorName, startTime}
 *    - Controllers will attach to most recent simulator
 * =============================================================================
 */

/**
 * Base Controller class that provides common functionality for all controller types
 */
window.BaseController = class BaseController {
    
    // API constants
    static SUPABASE_URL = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
    static SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
    static CLIENT_CHANNEL_NAME = 'clients';
    
    /**
     * Get the channel name from URL query parameter or use default
     * @returns {string} Channel name to use
     */
    static getChannelName() {
    const urlParams = new URLSearchParams(window.location.search);
        const channelFromUrl = urlParams.get('channel');
        return channelFromUrl || this.CLIENT_CHANNEL_NAME;
    }
    
    // Shake detection constants
    static SHAKE_THRESHOLD = 15; // Acceleration threshold for shake detection WITHOUT gravity (m/s²)
    static SHAKE_IMPULSE_THRESHOLD = 5; // Lower threshold to detect initial impulse
    static SHAKE_DEBOUNCE_TIME_MS = 500; // Min time between shakes
    static SHAKE_DIRECTION_THRESHOLD = 8; // Threshold to determine direction (m/s²)
    static IMPULSE_MAX_DURATION_MS = 300; // Max time to consider part of the same impulse
    
    // Debug mode
    static isDebugMode = (new URLSearchParams(window.location.search)).get('debug') === 'true';
    
    // Global volume control
    static OVERALL_VOLUME = 0.25;
    
    // Controller names are now simple timestamps
    // Format: Controller-yyyy-mm-dd-hh-mm-ss-##
    // where ## is a random 2-digit number to prevent collisions
    
    // Sound patterns - defined inline to avoid circular reference issues
    static SOUND_PATTERNS = {
        CLICK: { frequency: 1200, duration: 40, type: 'sine', category: 'ui' },
        SUCCESS: { frequency: 880, duration: 60, type: 'sine', fadeOut: true, category: 'feedback' },
        ERROR: { frequency: 220, duration: 150, type: 'square', category: 'feedback' },
        TILT_ON: { frequency: 440, duration: 75, type: 'triangle', fadeIn: true, category: 'feedback' },
        TILT_OFF: { frequency: 330, duration: 75, type: 'triangle', fadeOut: true, category: 'feedback' },
        JOIN: [
            { frequency: 660, duration: 40, type: 'sine', category: 'event' },
            { frequency: 880, duration: 40, type: 'sine', category: 'event' }
        ],
        LEAVE: [
            { frequency: 880, duration: 40, type: 'sine', category: 'event' },
            { frequency: 660, duration: 75, type: 'sine', fadeOut: true, category: 'event' }
        ],
        BUTTON_TILT: { frequency: 1320, duration: 30, type: 'sine', category: 'ui' },
        BUTTON_SPEECH: { frequency: 1100, duration: 30, type: 'sine', category: 'ui' },
        BUTTON_SOUND: { frequency: 980, duration: 30, type: 'sine', category: 'ui' },
        
        // Generic ON/OFF button sounds
        BUTTON_ON: { frequency: 1000, duration: 20, type: 'sine', category: 'ui' },
        BUTTON_OFF: { frequency: 700, duration: 20, type: 'sine', category: 'ui' },
        
        // Touch interaction sounds
        TOUCH: { frequency: 600, duration: 15, type: 'sine', category: 'touch' },
        RELEASE_TAP: { frequency: 700, duration: 15, type: 'sine', category: 'release' },
        RELEASE_SOUTH: { frequency: 800, duration: 15, type: 'sine', category: 'release' },
        RELEASE_EAST: { frequency: 900, duration: 15, type: 'sine', category: 'release' },
        RELEASE_WEST: { frequency: 1000, duration: 15, type: 'sine', category: 'release' },
        RELEASE_NORTH: { frequency: 1100, duration: 15, type: 'sine', category: 'release' },
        
        // Threshold detection sounds
        IMPULSE_TRIGGER: { frequency: 200, duration: 5, type: 'sine', category: 'feedback' },
        SHAKE_CONFIRM: { frequency: 400, duration: 10, type: 'sine', category: 'feedback' },
        
        // Directional shake sounds
        SHAKE_NORTH: [
            { frequency: 440, duration: 30, type: 'sine', category: 'feedback' },
            { frequency: 660, duration: 40, type: 'sine', category: 'feedback' }
        ],
        SHAKE_SOUTH: [
            { frequency: 660, duration: 30, type: 'sine', category: 'feedback' },
            { frequency: 440, duration: 40, type: 'sine', category: 'feedback' }
        ],
        SHAKE_EAST: [
            { frequency: 550, duration: 30, type: 'sine', category: 'feedback' },
            { frequency: 880, duration: 40, type: 'sine', category: 'feedback' }
        ],
        SHAKE_WEST: [
            { frequency: 880, duration: 30, type: 'sine', category: 'feedback' },
            { frequency: 550, duration: 40, type: 'sine', category: 'feedback' }
        ],
        SHAKE_UP: [
            { frequency: 880, duration: 30, type: 'sine', category: 'feedback' },
            { frequency: 550, duration: 40, type: 'sine', category: 'feedback' }
        ],
        SHAKE_DOWN: [
            { frequency: 550, duration: 30, type: 'sine', category: 'feedback' },
            { frequency: 880, duration: 40, type: 'sine', category: 'feedback' }
        ]
    };
    // Gesture detection constants
    static INACTIVE_RADIUS = 20; // Radius in pixels within which a touch is considered a tap
    
    // Sensitivity settings
    static PAN_SENSITIVITY = 1.0;
    static ZOOM_SENSITIVITY = 1.0;
    static PINCH_ZOOM_SENSITIVITY = 0.04;
    static WHEEL_ZOOM_SENSITIVITY = 0.008;
    static TRACKPAD_ZOOM_SENSITIVITY = 0.016;

    constructor(clientType) {
        // Identity properties 
        this.clientType = clientType;
        this.clientId = this.generateClientId();
        this.clientName = this.generateTimestampName(); // Changed to timestamp format
        
        // UI elements
        this.targetElement = null;
        
        // Interaction state
        this.evCache = [];
        this.prevDiff = -1;
        this.prevX = 0;
        this.prevY = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.pointerDown = false;
        
        // Screen state
        this.currentScreenId = 'main';
        
        // Simulator state - initialize as null, will be populated from presence
        this.currentSimulatorId = null;
        this.simulatorState = null;
        
        // Motion detection state
        this.lastShakeTime = 0;
        this.isDetectingImpulse = false;
        this.impulseStartTime = 0;
        this.impulseAxis = null;
        this.impulseDirection = null;
        this.lastAccel = { x: 0, y: 0, z: 0 };
        this.lastAccelG = { x: 0, y: 0, z: 0 };
        this.lastOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.lastMotionMagnitude = 0;
        this.motionListenerActive = false;
        
        // Bound event handlers for motion detection (store references for removal)
        this.boundHandleDeviceMotion = (event) => this.handleDeviceMotion(event);
        this.boundHandleDeviceOrientation = (event) => this.handleDeviceOrientation(event);
        
        // Permission tracking
        this.permissionStates = {
            'connection': 'unknown',
            'motion': 'inactive'
        };
        
        // Connection state
        this.clientChannel = null;
        this.supabaseClient = null;
        this.isSubscribed = false;
        this.tiltingActive = false;
        
        // Sound and speech
        this.soundEnabled = false; // Default to disabled initially
        this.audioContext = null;
        this.speechEnabled = false; // Default to disabled initially
        this.speechSynthesis = window.speechSynthesis;
        this.speechUtterance = null;
        
        // Sensitivity settings - use static values as defaults
        this.userPanSensitivity = this.constructor.PAN_SENSITIVITY;
        this.userZoomSensitivity = this.constructor.ZOOM_SENSITIVITY;
        this.pinchZoomSensitivity = this.constructor.PINCH_ZOOM_SENSITIVITY;
        this.wheelZoomSensitivity = this.constructor.WHEEL_ZOOM_SENSITIVITY;
        this.trackpadZoomSensitivity = this.constructor.TRACKPAD_ZOOM_SENSITIVITY;
        
        // Gesture tracking (added for dx/dy support)
        this.lastGestureDeltaX = 0;
        this.lastGestureDeltaY = 0;
        
        // Keep currentName for compatibility
        this.currentName = this.clientName;
        
        // Search functionality
        this.currentSearchQuery = ''; // Initialize search query
        
        this.logEvent('Init', `Client created: type=${this.clientType}, id=${this.clientId}, name=${this.clientName}`);
    }
    
    /**
     * Generates a timestamp-based name
     * Format: Controller-yyyy-mm-dd-hh-mm-ss-##
     */
    generateTimestampName() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const randomSuffix = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        
        return `Controller-${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${randomSuffix}`;
    }
    
    /**
     * Generates a random client ID
     */
    generateClientId() {
        return 'client_' + Math.random().toString(36).substring(2, 10);
    }
    

    
    /**
     * Create DOM elements for the controller - must be overridden in subclasses
     */
    createDOM() {
        this.logEvent('Init', 'Base createDOM called - subclass should override');
    }
    
    /**
     * Initialize controller
     */
    initialize(skipPageHandlers) {
        if (! skipPageHandlers) {
            const targetElement = document.getElementById("target");
            if (!targetElement) {
                console.error('Target element not found');
                return;
            }
            this.targetElement = targetElement;
            
            // Set up event handlers
            this.setupPageEventHandlers();
        }
        
        // Set up UI buttons
        this.setupButtons();
        
        // Initialize the controller connection
        return this.initializeControllerConnection();
    }
    
    /**
     * Automatically finds and sets up buttons
     */
    setupButtons() {
        // Buttons have been removed from the UI
        // Functions remain available for programmatic use
        
        // Allow controller-specific UI setup
        this.setupControllerSpecificUI();
        
        this.logEvent('Init', 'Button setup complete (no buttons in UI)');
    }
    
    /**
     * Constructor-specific UI setup - override in subclasses
     */
    setupControllerSpecificUI() {
        // Base implementation does nothing
        // Subclasses should override this
        this.logEvent('Init', 'No controller-specific UI setup in base class');
    }
    
    /**
     * Set up basic page event handlers
     */
    setupPageEventHandlers() {
        // Get target element for event handling
        const targetElement = this.targetElement;
        if (!targetElement) {
            this.logEvent('Error', 'No target element for event handling');
            return;
        }
        
        // ---- Add all event listeners with arrow functions ----
        
        // Pointer events for tracking drag and pinch-zoom
        targetElement.addEventListener('pointerdown', (ev) => this.handlePointerDown(ev));
        targetElement.addEventListener('pointermove', (ev) => this.handlePointerMove(ev));
        targetElement.addEventListener('pointerup', (ev) => this.handlePointerUp(ev));
        targetElement.addEventListener('pointercancel', (ev) => this.handlePointerCancel(ev));
        
        // Wheel event for mousewheel/trackpad input
        targetElement.addEventListener('wheel', (ev) => this.handleWheel(ev), { passive: false });
        
        // ---- Global event handling ----
        
        // Disable double-tap-to-zoom on mobile devices
        document.addEventListener('touchstart', (event) => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // Track last tap time for double-tap detection
        let lastTapTime = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTapTime < 300) {
                event.preventDefault();
            }
            lastTapTime = now;
        }, { passive: false });

        // Set up error handler
        window.addEventListener('error', (event) => {
            this.logEvent('Error', 'Uncaught error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno
            });
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.logEvent('Lifecycle', 'Page unloading');
            if (this.clientChannel) {
                this.clientChannel.untrack().catch(err => {
                    this.logEvent('Error', 'Error untracking presence', err);
                });
            }
        });
        
        this.logEvent('Init', 'Event handlers registered');
    }
    
    /**
     * Handle pointer down event - empty backstop for subclasses
     */
    handlePointerDown(ev) {
        if (!this.isSubscribed) return;
        
        this.pointerDown = true;
        this.touchStartX = ev.clientX;
        this.touchStartY = ev.clientY;
        
        // Capture pointer for consistent events
        ev.target.setPointerCapture(ev.pointerId);
        
        // Play touch sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.TOUCH);
        }
        
        this.logEvent('Input', 'Pointer down', {
            x: this.touchStartX, 
            y: this.touchStartY,
            pointerId: ev.pointerId
        });
        
        // Allow clicks in input text elements (like the search box!)
        // This prevents the touch handler from interfering with typing
        if (ev.target?.tagName !== 'INPUT') ev.preventDefault();
    }
    
    /**
     * Handle pointer move event - empty backstop for subclasses
     */
    handlePointerMove(ev) {
        if (!this.isSubscribed || this.evCache.length === 0) return;

        const index = this.evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
        if (index === -1) return; 
        this.evCache[index] = ev; 

        if (this.evCache.length === 2) {
            const ptr1 = this.evCache[0];
            const ptr2 = this.evCache[1];
            const curDiff = Math.abs(ptr1.clientX - ptr2.clientX); 

            if (this.prevDiff > 0) { 
                let zoomDelta = (curDiff - this.prevDiff) * this.pinchZoomSensitivity * this.userZoomSensitivity;
                zoomDelta *= -1;

                if (Math.abs(zoomDelta) > 0.001) { 
                    this.sendUpdate('zoom', { zoomDelta: zoomDelta });
                    this.logEvent('Input', 'Pinch zoom', { zoomDelta, curDiff, prevDiff: this.prevDiff });
                }
            }
            this.prevDiff = curDiff;
        } else if (this.evCache.length === 1) {
            const currentPtr = this.evCache[0]; 
            if (ev.pointerId === currentPtr.pointerId) { 
                const dx = ev.clientX - this.prevX;
                const dy = ev.clientY - this.prevY;
                const finalPanXDelta = dx * this.userPanSensitivity * 0.125;
                const finalPanYDelta = dy * this.userPanSensitivity * 0.125;

                if (Math.abs(finalPanXDelta) > 0.001 || Math.abs(finalPanYDelta) > 0.001) {
                    this.sendUpdate('pan', { panXDelta: finalPanXDelta, panYDelta: finalPanYDelta });
                    this.logEvent('Input', 'Panning', { dx, dy, finalPanXDelta, finalPanYDelta });
                }
                this.prevX = ev.clientX;
                this.prevY = ev.clientY;
            }
        }
        ev.preventDefault();
    }
    
    /**
     * Handle pointer cancel event - empty backstop for subclasses
     */
    handlePointerCancel(ev) {
        // Similar to pointer up - reset state
        this.handlePointerUp(ev);
    }
    
    /**
     * Handle wheel event - empty backstop for subclasses
     */
    handleWheel(ev) {
        // Backstop handler - does nothing in base class
        // NavigatorController will override to implement zoom
        if (!this.isSubscribed) return;
        ev.preventDefault(); // Prevent default browser behavior
    }
    
    /**
     * Handle pointer up event - provides gesture detection for subclasses
     */
    handlePointerUp(ev) {
        if (!this.isSubscribed || !this.pointerDown) return;
        ev.target.releasePointerCapture(ev.pointerId);
        this.pointerDown = false;
        
        // Get release position
        const touchEndX = ev.clientX;
        const touchEndY = ev.clientY;
        
        // Calculate distance and direction
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Store the deltas for use in handlers
        this.lastGestureDeltaX = deltaX;
        this.lastGestureDeltaY = deltaY;
        
        // Default to tap
        let gestureType = 'tap';
        let releaseSound = this.constructor.SOUND_PATTERNS.RELEASE_TAP;
        
        // If moved beyond the inactive radius, determine direction
        if (distance > this.constructor.INACTIVE_RADIUS) {
            // Determine dominant axis (x or y)
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Primarily horizontal movement
                if (deltaX > 0) {
                    gestureType = 'east';
                    releaseSound = this.constructor.SOUND_PATTERNS.RELEASE_EAST;
                } else {
                    gestureType = 'west';
                    releaseSound = this.constructor.SOUND_PATTERNS.RELEASE_WEST;
                }
            } else {
                // Primarily vertical movement
                if (deltaY > 0) {
                    gestureType = 'south';
                    releaseSound = this.constructor.SOUND_PATTERNS.RELEASE_SOUTH;
                } else {
                    gestureType = 'north';
                    releaseSound = this.constructor.SOUND_PATTERNS.RELEASE_NORTH;
                }
            }
        }
        
        // Log gesture info
        this.logEvent('Input', `Detected ${gestureType}`, {
            deltaX, deltaY, distance, 
            start: { x: this.touchStartX, y: this.touchStartY },
            end: { x: touchEndX, y: touchEndY }
        });
        
        // Always play the appropriate release sound
        if (this.soundEnabled) {
            this.playSound(releaseSound);
        }
        
        // Handle the gesture based on its type
        this.handleGesture(gestureType);
        
        // Reset touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        ev.preventDefault();
    }
    
    /**
     * Handle gesture - central dispatcher for all gestures
     */
    handleGesture(gestureType) {
        this.logEvent('Gesture', `Detected ${gestureType} gesture`);
        
        // Route to appropriate handler based on gesture type
        switch(gestureType) {
            case 'north':
                this.handleNorth();
                break;
            case 'south':
                this.handleSouth();
                break;
            case 'east':
                this.handleEast();
                break;
            case 'west':
                this.handleWest();
                break;
            case 'up':
                this.handleUp();
                break;
            case 'down':
                this.handleDown();
                break;
            case 'tap':
                this.handleTap();
                break;
            // Add more gesture types as needed
        }
        
        return gestureType;
    }
    
    // Direction handlers - backstops that just log in the base class
    handleNorth() { this.logEvent('Direction', 'North - base handler'); }
    handleSouth() { this.logEvent('Direction', 'South - base handler'); }
    handleEast() { this.logEvent('Direction', 'East - base handler'); }
    handleWest() { this.logEvent('Direction', 'West - base handler'); }
    handleUp() { this.logEvent('Direction', 'Up - base handler'); }
    handleDown() { this.logEvent('Direction', 'Down - base handler'); }
    handleTap() { this.logEvent('Direction', 'Tap - base handler'); }
    
    /**
     * Helper to clean up pointer cache
     */
    removeEvent(ev) {
        // Remove this event from the target's cache
        const index = this.evCache.findIndex(cachedEv => cachedEv.pointerId === ev.pointerId);
        if (index !== -1) {
            this.evCache.splice(index, 1);
        }
    }
    
    /**
     * Sends an update event to the host/sim
     */
    sendUpdate(eventType, payload) {
        if (!this.clientChannel || !this.isSubscribed) {
            this.logEvent('Send', `Cannot send update (${eventType}), channel not ready`);
            return;
        }
        
        try {
            this.clientChannel.send({
                type: 'broadcast',
                event: eventType,
                payload: {
                    clientId: this.clientId,
                    clientType: this.clientType,
                    clientName: this.currentName,
                    ...payload
                }
            });
        } catch (err) {
            this.logEvent('Error', `Error sending ${eventType}:`, err);
        }
    }
    


    /**
     * Updates the debug overlay with current controller state
     */
    updateDebugOverlay() {
        const debugElement = document.getElementById('debug-panel');
        if (!debugElement) return; // No debug panel found
        
        // Only show debug panel if debug=true is in the URL
        if (!this.constructor.isDebugMode) {
            debugElement.style.display = 'none';
            return;
        } else {
            debugElement.style.display = 'block';
        }
        
        try {
            // Build debug info
            const timestamp = new Date().toLocaleTimeString();
            // Use instance properties for state
            const connectionState = this.permissionStates['connection'] || 'unknown';
            const motionState = this.permissionStates['motion'] || 'inactive';
            
            // Format acceleration values with fixed width
            function formatValue(val) {
                // Ensure sign and two decimal places
                const sign = val >= 0 ? '+' : '';
                // Use String.padStart to ensure fixed width - monospace font in CSS ensures alignment
                return (sign + val.toFixed(2)).padStart(6, ' ');
            }
            
            // Format acceleration values (without gravity) - use instance properties
            const accelInfo = this.lastAccel ? 
                `x:${formatValue(this.lastAccel.x)}, y:${formatValue(this.lastAccel.y)}, z:${formatValue(this.lastAccel.z)}` : 
                'unavailable';
                
            // Format acceleration with gravity values - use instance properties
            const accelGInfo = this.lastAccelG ? 
                `x:${formatValue(this.lastAccelG.x)}, y:${formatValue(this.lastAccelG.y)}, z:${formatValue(this.lastAccelG.z)}` : 
                'unavailable';
                
            // Format orientation values - use instance properties
            const orientationInfo = this.lastOrientation ? 
                `α:${this.lastOrientation.alpha?.toFixed(1) || 'N/A'}, β:${this.lastOrientation.beta?.toFixed(1) || 'N/A'}, γ:${this.lastOrientation.gamma?.toFixed(1) || 'N/A'}` : 
                'unavailable';
                
            // Magnitude (without gravity) - use instance properties
            const magnitudeInfo = this.lastMotionMagnitude ? 
                `${this.lastMotionMagnitude.toFixed(2).padStart(5, ' ')} (threshold: ${this.constructor.SHAKE_THRESHOLD})` : 
                'N/A';
                
            // Magnitude (with gravity for comparison) - use instance properties
            const magnitudeWithGravityInfo = this.lastMotionMagnitudeWithGravity ? 
                `${this.lastMotionMagnitudeWithGravity.toFixed(2).padStart(5, ' ')}` : 
                'N/A';
                
            // Direction threshold info
            const directionInfo = `Direction threshold: ${this.constructor.SHAKE_DIRECTION_THRESHOLD}`;
                
            // Channel state - use instance properties
            const channelInfo = this.isSubscribed ? 'connected' : 'disconnected';
            
            // Format output with both magnitude types
            let debugInfo = `
                <div class="debug-section">
                    <div>Connection: ${connectionState} (${channelInfo})</div>
                    <div>Search: "${this.currentSearchQuery || '(none)'}"</div>
                    <div>Motion: ${motionState} (${this.tiltingActive ? 'active' : 'inactive'})</div>
                    <div>Acceleration: ${accelInfo}</div>
                    <div>Mag: ${magnitudeInfo} With G: ${magnitudeWithGravityInfo}</div>
                    <div>Shake: Impulse: ${this.isDetectingImpulse ? `${this.impulseAxis}-${this.impulseDirection}` : 'none'}</div>
                    <div>Last Shake: ${this.lastShakeTime ? new Date(this.lastShakeTime).toLocaleTimeString() : 'none'}</div>
                </div>
            `;
            
            // Update the debug element
            debugElement.innerHTML = debugInfo;
            
        } catch (e) {
            console.error('Error updating debug overlay:', e);
        }
    }
    
    /**
     * Updates the permission status in the UI
     */
    updatePermissionStatus(permissionType, status) {
        this.permissionStates[permissionType] = status;
        this.updateDebugOverlay(); // Use class method
    }
    
    /**
     * Logs events with timestamp
     */
    logEvent(category, message, data) {
        const timestamp = new Date().toISOString().substring(11, 23);
        const prefix = `[${timestamp}][${category}]`;
        
        if (data !== undefined) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }
    }
    
    /**
     * Speaks the provided text using the Speech Synthesis API.
     */
    speakText(text, options = {}) {

        // Don't speak if speech is disabled
        if (!this.speechEnabled || !this.speechSynthesis) {
            this.logEvent('Speech', 'Speech not available or disabled');
            return false;
        }
        
        try {
            // Cancel any ongoing speech to prioritize new speech
            if (this.speechSynthesis.speaking) {
                this.speechSynthesis.cancel();
                // Give a moment for cancellation to complete
                setTimeout(() => {
                    processSpeech();
                }, 50);
            } else {
                processSpeech();
            }
            
            // Define processSpeech locally within speakText, referencing 'this' appropriately
            const processSpeech = () => {
                // Create a new utterance with the text
                this.speechUtterance = new SpeechSynthesisUtterance(text);
                
                // Apply options if provided
                if (options.voice) this.speechUtterance.voice = options.voice;
                if (options.rate) this.speechUtterance.rate = options.rate; 
                if (options.pitch) this.speechUtterance.pitch = options.pitch;
                if (options.volume) this.speechUtterance.volume = options.volume;
                
                this.logEvent('Speech', `Speaking: "${text}"`);
                
                // Add event listeners for speech events
                this.speechUtterance.onstart = () => this.logEvent('Speech', 'Speech started');
                this.speechUtterance.onend = () => this.logEvent('Speech', 'Speech ended');
                this.speechUtterance.onerror = (e) => this.logEvent('Speech', `Speech error: ${e.error}`);
                
                this.speechSynthesis.speak(this.speechUtterance);
            }
            
            return true;
        } catch (e) {
            this.logEvent('Speech', 'Error speaking text:', e);
            return false;
        }
    }
    

    
    /**
     * Toggles speech feedback on/off.
     */
    toggleSpeech() {
        // Check if speech can be enabled (sound must be possible)
        if (!this.soundEnabled && !this.speechEnabled) { // Trying to enable speech while sound is off
            this.logEvent('Speech', 'Enabling sound because speech was started.');
            // Attempt to enable sound first
            this.toggleSound(); 
            // If sound failed to enable (e.g., no audio context), speech cannot be enabled either.
            if (!this.soundEnabled) {
                this.logEvent('Speech', 'Cannot enable speech, failed to enable sound first.');
                // Ensure speech remains disabled
                this.speechEnabled = false;
                return this.speechEnabled;
            }
            // If sound enabled successfully, proceed to enable speech
            this.speechEnabled = true;
        } else {
            // Otherwise, just toggle speech state
            this.speechEnabled = !this.speechEnabled;
        }

        this.logEvent('Speech', `Speech ${this.speechEnabled ? 'enabled' : 'disabled'}`);
        
        // Provide audio feedback for enabling speech
        if (this.speechEnabled) {
            this.speakText(`Speech started.`);
        }
        
        return this.speechEnabled;
    }

    /**
     * Initialize the audio context for sound effects
     */
    initAudioContext() {
        if (this.audioContext) return this.audioContext;
        
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
                this.logEvent('Sound', 'Audio context initialized');
                return this.audioContext;
            } else {
                this.logEvent('Sound', 'Web Audio API not supported');
                return null;
            }
        } catch (e) {
            this.logEvent('Sound', 'Error initializing audio context:', e);
            return null;
        }
    }
    
    /**
     * Plays a tone using Web Audio API
     */
    playTone(options) {
        if (!this.soundEnabled || !options) return false;
        
        const ctx = this.initAudioContext();
        if (!ctx) return false;
        
        try {
            // Create oscillator
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            // Set oscillator properties
            oscillator.type = options.type || 'sine';
            oscillator.frequency.value = options.frequency || 440;
            
            // Connect the nodes
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Apply global volume scaling
            const volumeScale = this.constructor.OVERALL_VOLUME;
            
            // Set initial gain with volume scaling
            const initialGain = (options.fadeIn ? 0 : 1) * volumeScale;
            gainNode.gain.setValueAtTime(initialGain, ctx.currentTime);
            
            // Handle fade in
            if (options.fadeIn) {
                gainNode.gain.linearRampToValueAtTime(1 * volumeScale, ctx.currentTime + (options.duration / 1000) * 0.3);
            }
            
            // Handle fade out
            if (options.fadeOut) {
                gainNode.gain.setValueAtTime(1 * volumeScale, ctx.currentTime + (options.duration / 1000) * 0.7);
                gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + (options.duration / 1000));
            }
            
            // Start and stop the oscillator
            oscillator.start();
            oscillator.stop(ctx.currentTime + (options.duration / 1000));
            
            // Clean up when done
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
            
            return true;
        } catch (e) {
            this.logEvent('Sound', 'Error playing tone:', e);
            return false;
        }
    }
    
    /**
     * Plays a sequence of tones - Star Trek style with NO cooldowns!
     */
    playSound(pattern) {
        if (!this.soundEnabled) {
            this.logEvent('Sound', 'Sound not enabled');
            return false;
        }
        
        try {
            // Initialize audio context if needed
            if (!this.audioContext) {
                this.initAudioContext();
            }
            
            if (!this.audioContext) {
                this.logEvent('Sound', 'No audio context available');
                return false;
            }
            
            // Handle arrays of sound patterns
            if (Array.isArray(pattern)) {
                // Play a sequence of tones with delays between them
                let delay = 0;
                
                pattern.forEach((tone, index) => {
                    setTimeout(() => {
                        this.playTone(tone); // Use class method
                    }, delay);
                    
                    delay += tone.duration + 50; // Add small gap between tones
                });
                
                this.logEvent('Sound', 'Playing sound sequence', pattern);
                return true;
            } else {
                // Play a single tone - No cooldowns!
                this.logEvent('Sound', 'Playing sound', pattern);
                return this.playTone(pattern); // Use class method
            }
        } catch (e) {
            this.logEvent('Sound', 'Error playing sound:', e);
            return false;
        }
    }
    
    /**
     * Toggles sound effects on/off
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.logEvent('Sound', `Sound ${this.soundEnabled ? 'enabled' : 'disabled'}`);
        
        // If sound is disabled, speech must also be disabled
        if (!this.soundEnabled) {
            this.speechEnabled = false;
            this.logEvent('Speech', 'Speech disabled because sound is disabled');
        }
        
        // Play test sound when enabled
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SUCCESS);
        }
        
        return this.soundEnabled;
    }
    
    /**
     * Process device motion data for shake detection.
     */
    handleDeviceMotion(event) {
        if (!this.motionListenerActive) return;
        
        try {
            // Get acceleration data WITHOUT gravity
            const accelWithoutG = event.acceleration;
            
            // Get acceleration data WITH gravity
            const accelWithG = event.accelerationIncludingGravity;
            
            // Store last acceleration values
            if (accelWithoutG && accelWithoutG.x !== null) {
                this.lastAccel = {
                    x: accelWithoutG.x,
                    y: accelWithoutG.y,
                    z: accelWithoutG.z
                };
            }
            
            if (accelWithG && accelWithG.x !== null) {
                this.lastAccelG = {
                    x: accelWithG.x,
                    y: accelWithG.y,
                    z: accelWithG.z
                };
            }
            
            // Calculate magnitude of acceleration WITHOUT gravity (for shake detection)
            let magnitudeWithoutG = 0;
            
            if (accelWithoutG && accelWithoutG.x !== null) {
                magnitudeWithoutG = Math.sqrt(
                    accelWithoutG.x * accelWithoutG.x +
                    accelWithoutG.y * accelWithoutG.y +
                    accelWithoutG.z * accelWithoutG.z
                );
            }
            
            // Calculate magnitude of acceleration WITH gravity (just for debug display)
            let magnitudeWithG = 0;
            
            if (accelWithG && accelWithG.x !== null) {
                magnitudeWithG = Math.sqrt(
                    accelWithG.x * accelWithG.x +
                    accelWithG.y * accelWithG.y +
                    accelWithG.z * accelWithG.z
                );
                
                // Store for debug display
                this.lastMotionMagnitudeWithGravity = magnitudeWithG;
            }
            
            // Store magnitude for use elsewhere
            this.lastMotionMagnitude = magnitudeWithoutG;
            
            // Skip further processing if a shake was recently detected (debounce)
            const now = Date.now();
            if (now - this.lastShakeTime < this.constructor.SHAKE_DEBOUNCE_TIME_MS) {
                this.updateDebugOverlay();
                return;
            }
            
            // Impulse detection (the start of a potential shake)
            if (!this.isDetectingImpulse && 
                magnitudeWithoutG > this.constructor.SHAKE_IMPULSE_THRESHOLD) {
                this.isDetectingImpulse = true;
                this.impulseStartTime = now;
                
                // Determine the axis with the strongest movement
                const absX = Math.abs(accelWithoutG.x);
                const absY = Math.abs(accelWithoutG.y);
                const absZ = Math.abs(accelWithoutG.z);
                
                if (absX > absY && absX > absZ) {
                    this.impulseAxis = 'x';
                    this.impulseDirection = accelWithoutG.x > 0 ? 'positive' : 'negative';
                } else if (absY > absX && absY > absZ) {
                    this.impulseAxis = 'y';
                    this.impulseDirection = accelWithoutG.y > 0 ? 'positive' : 'negative';
                } else {
                    this.impulseAxis = 'z';
                    this.impulseDirection = accelWithoutG.z > 0 ? 'positive' : 'negative';
                }
                
                // Play impulse sound
                if (this.soundEnabled) {
                    this.playSound(this.constructor.SOUND_PATTERNS.IMPULSE_TRIGGER);
                }
                
                this.logEvent('Motion', `Impulse detected: ${this.impulseAxis}-${this.impulseDirection}, magnitude: ${magnitudeWithoutG.toFixed(2)}`);
            }
            
            // Check if we're in the middle of detecting an impulse
            if (this.isDetectingImpulse) {
                // If the impulse duration is too long, reset detection
                if (now - this.impulseStartTime > this.constructor.IMPULSE_MAX_DURATION_MS) {
                    this.logEvent('Motion', 'Impulse timed out, resetting detection');
                    this.isDetectingImpulse = false;
                    this.impulseAxis = null;
                    this.impulseDirection = null;
                }
                // Check if acceleration magnitude exceeds the threshold for a confirmed shake
                else if (magnitudeWithoutG > this.constructor.SHAKE_THRESHOLD) {
                    // Determine the direction of the confirmed shake
                    let shakeDirection = '';
                    
                    // Direction depends on the axis of movement
                    if (this.impulseAxis === 'x') {
                        if (Math.abs(accelWithoutG.x) > this.constructor.SHAKE_DIRECTION_THRESHOLD) {
                            shakeDirection = accelWithoutG.x > 0 ? 'east' : 'west';
                        }
                    } else if (this.impulseAxis === 'y') {
                        if (Math.abs(accelWithoutG.y) > this.constructor.SHAKE_DIRECTION_THRESHOLD) {
                            shakeDirection = accelWithoutG.y > 0 ? 'north' : 'south';
                        }
                    } else if (this.impulseAxis === 'z') {
                        if (Math.abs(accelWithoutG.z) > this.constructor.SHAKE_DIRECTION_THRESHOLD) {
                            shakeDirection = accelWithoutG.z > 0 ? 'up' : 'down';
                        }
                    }
                    
                    // Only count it if we detected a direction
                    if (shakeDirection) {
                        // Play confirm sound
                        if (this.soundEnabled) {
                            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_CONFIRM);
                        }
                        
                        // Update last shake time and reset impulse detection
                        this.lastShakeTime = now;
                        this.isDetectingImpulse = false;
                        this.impulseAxis = null;
                        this.impulseDirection = null;
                        
                        this.logEvent('Motion', `Shake confirmed: ${shakeDirection}, magnitude: ${magnitudeWithoutG.toFixed(2)}`);
                        
                        this.handleGesture(shakeDirection);

                    }
                }
            }
            
            // Update debug overlay
            this.updateDebugOverlay();
            
        } catch (e) {
            console.error('Error processing motion event:', e);
            this.logEvent('Error', 'Error processing motion event', e);
        }
    }

    /**
     * Process device orientation data.
     */
    handleDeviceOrientation(event) {
        if (!event) return;
        
        // Store orientation values for debugging
        this.lastOrientation = {
            alpha: event.alpha, // compass direction (0-360)
            beta: event.beta,   // front-to-back tilt (-180 to 180)
            gamma: event.gamma  // left-to-right tilt (-90 to 90)
        };
        
        // Update debug information
        this.updateDebugOverlay();
    }

    /**
     * Check if the device is iOS.
     */
    isIOS() {
        return [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ].includes(navigator.platform) || 
        (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }

    /**
     * Stops motion tracking and removes event listeners.
     */
    stopMotionTracking() {
        try {
            if (!this.motionListenerActive) {
                this.logEvent('Motion', 'No active motion tracking to stop');
                return true;
            }
            
            this.logEvent('Motion', 'Removing motion listeners');
            window.removeEventListener('devicemotion', this.boundHandleDeviceMotion);
            window.removeEventListener('deviceorientation', this.boundHandleDeviceOrientation);
            this.motionListenerActive = false;
            this.tiltingActive = false;
            
            this.updatePermissionStatus('motion', 'inactive');
            this.logEvent('Motion', 'Motion tracking stopped');
            this.updateDebugOverlay();
            return true;
        } catch (e) {
            this.logEvent('Motion', 'Error stopping motion tracking:', e);
            return false;
        }
    }

    /**
     * Requests permission and starts motion tracking.
     */
    requestAndStartMotionTracking() {
        // Don't restart if already active
        if (this.motionListenerActive) {
            this.logEvent('Motion', 'Motion tracking already active');
            return true;
        }
        
        this.logEvent('Motion', 'Starting motion tracking...');
        
        // Stop any existing listeners just in case
        this.stopMotionTracking();
        
        // Check for iOS permission API
        if (this.isIOS() && typeof DeviceMotionEvent.requestPermission === 'function') {
            this.logEvent('Motion', 'iOS detected, requesting permission...');
            // iOS 13+ requires explicit permission
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    this.logEvent('Motion', `iOS permission result: ${permissionState}`);
                    if (permissionState === 'granted') {
                        // Permission granted, start tracking
                        this.startMotionListeners(); // Use class method
                        this.updatePermissionStatus('motion', 'granted');
                    } else {
                        // Permission denied
                        this.logEvent('Motion', 'iOS motion permission denied');
                        this.updatePermissionStatus('motion', 'denied');
                    }
                })
                .catch(error => {
                    this.logEvent('Motion', 'Error requesting iOS motion permission:', error);
                    this.updatePermissionStatus('motion', 'error');
                });
                
            return true; // We started the permission flow
        } else if (typeof DeviceMotionEvent !== 'undefined') {
            this.logEvent('Motion', 'DeviceMotion API available, starting listeners');
            // For non-iOS or older iOS, just try to start listening
            this.startMotionListeners(); // Use class method
            this.updatePermissionStatus('motion', 'granted');
            return true;
        } else {
            // Device motion not supported
            this.logEvent('Motion', 'DeviceMotion API not supported on this device');
            this.updatePermissionStatus('motion', 'unavailable');
            return false;
        }
    }

    /**
     * Attaches event listeners for motion and orientation.
     */
    startMotionListeners() {
        try {
            this.logEvent('Motion', 'Attaching devicemotion and deviceorientation listeners');
            
            // Use the stored bound handlers
            window.addEventListener('devicemotion', this.boundHandleDeviceMotion);
            window.addEventListener('deviceorientation', this.boundHandleDeviceOrientation);
            this.motionListenerActive = true;
            this.tiltingActive = true;
            
            this.logEvent('Motion', 'Motion listeners attached successfully');
            this.updateDebugOverlay();
        } catch (e) {
            this.logEvent('Motion', 'Error starting motion listeners:', e);
            this.updatePermissionStatus('motion', 'error');
        }
    }
    
    /**
     * Initializes the controller connection.
     */
    initializeControllerConnection() {
        this.logEvent('Init', 'Initializing client connection');
        this.updatePermissionStatus('connection', 'pending');

        // Check if necessary libraries are available
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            this.logEvent('Error', 'Supabase library missing');
            this.updatePermissionStatus('connection', 'error');
            return false;
        }

        try {
            // Initialize audio context
            this.initAudioContext();
            
            // Create Supabase client and channel
            const channelName = this.constructor.getChannelName();
            this.logEvent('Init', `Creating Supabase client and channel: ${channelName}`);
            this.supabaseClient = supabase.createClient(this.constructor.SUPABASE_URL, this.constructor.SUPABASE_ANON_KEY);
            this.clientChannel = this.supabaseClient.channel(channelName, {
                config: {
                    presence: {
                        key: this.clientId,
                    },
                },
            });

            // --- Presence Event Handlers ---
            this.clientChannel
                .on('presence', { event: 'sync' }, () => {
                    const presenceState = this.clientChannel.presenceState();
                    this.logEvent('Presence', `Sync with ${Object.keys(presenceState).length} peers`, presenceState);
                    
                    // Find the current simulator from presence
                    const simulator = this.findCurrentSimulator(presenceState);
                    if (simulator) {
                        // Set the current simulator ID
                        const previousSimulatorId = this.currentSimulatorId;
                        this.currentSimulatorId = simulator.clientId;
                        
                        // If simulator changed, log it
                        if (previousSimulatorId !== this.currentSimulatorId) {
                            this.logEvent('Simulator', `Connected to simulator: ${simulator.clientName || 'Unnamed'} (${simulator.clientId})`);
                        }
                        
                        // Update state from simulator
                        this.updateSimulatorState(simulator);
                    } else {
                        this.logEvent('Simulator', 'No simulator found in presence');
                        this.currentSimulatorId = null;
                    }
                    
                    // Update UI elements
                    this.updateDebugOverlay();
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    this.logEvent('Presence', `Join event for key: ${key}`, newPresences);
                    
                    // Check if the new presence is a simulator
                    for (const presence of newPresences) {
                        if (presence.clientType === 'simulator') {
                            this.logEvent('Simulator', `New simulator joined: ${presence.clientName || 'Unnamed'} (${presence.clientId})`);
                            
                            // Trigger a full presence sync to update current simulator
                            const presenceState = this.clientChannel.presenceState();
                            const simulator = this.findCurrentSimulator(presenceState);
                            
                            if (simulator && simulator.clientId === presence.clientId) {
                                this.logEvent('Simulator', `Setting new simulator as current: ${simulator.clientId}`);
                                this.currentSimulatorId = simulator.clientId;
                                this.updateSimulatorState(simulator);
                            }
                        }
                    }
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    this.logEvent('Presence', `Leave event for key: ${key}`, leftPresences);
                    
                    // Check if the current simulator left
                    for (const presence of leftPresences) {
                        if (presence.clientId === this.currentSimulatorId) {
                            this.logEvent('Simulator', `Current simulator left: ${presence.clientId}`);
                            
                            // Find a new simulator if available
                            this.currentSimulatorId = null;
                        }
                    }
                });
                
            // Actually subscribe to the channel and track the client's presence
            this.clientChannel
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        this.logEvent('Connection', 'Successfully subscribed to client channel');
                        this.isSubscribed = true;
                        this.updatePermissionStatus('connection', 'granted');
                        
                        // Track client presence - include search query from the start!
                        this.clientChannel.track({
                            clientId: this.clientId,
                            clientType: this.clientType,
                            clientName: this.currentName,
                            screenId: this.currentScreenId,
                            searchQuery: this.currentSearchQuery  // Start with empty search, ready for updates!
                        });
                    } else {
                        this.logEvent('Connection', `Channel subscription status: ${status}`);
                    }
                });
                
            return true;
        } catch (e) {
            this.logEvent('Error', 'Error initializing client connection:', e);
            this.updatePermissionStatus('connection', 'error');
            return false;
        }
    }
    
    /**
     * Updates simulator state based on presence data
     * @param {Object} simulator - The simulator's presence data
     */
    updateSimulatorState(simulator) {
        if (!simulator || !simulator.shared) {
            this.logEvent('State', 'Received invalid simulator presence data', simulator);
            this.currentSimulatorId = null;
            this.simulatorState = null;
            this.updateUIFromState();
            return;
        }

        const newSharedState = simulator.shared;
        const previousSelectedItemId = this.simulatorState ? this.simulatorState.selectedItemId : null;
        
        // Update the local simulatorState with all new shared data
        this.simulatorState = { ...newSharedState };

        // Debug log to see what state is being received
        console.log("[Controller] Received simulator state update. Tags count:", this.simulatorState.tags?.length || 0);

        // MAX: Log new selected item JSON if its ID has changed
        if (this.simulatorState.selectedItemId !== previousSelectedItemId) {
            this.logEvent('MAX', 'New selected item json (ID changed):', this.simulatorState.selectedItem);
        }
        
        this.updateUIFromState();
    }

    /**
     * Updates UI elements based on current simulator state
     * Override in subclasses for specific UI updates
     */
    updateUIFromState() {
        // Base implementation - subclasses should override

        // Update status display
        const statusElement = document.getElementById('status');
        if (statusElement) {
            if (this.currentSimulatorId && this.simulatorState) {
                // Try to display a more informative status if possible
                let statusText = `Connected to: ${this.simulatorState.clientName || 'Simulator'}`;
                if (this.simulatorState.selectedItem && this.simulatorState.selectedItem.title) {
                    const collectionTitle = this.simulatorState.currentCollection?.title || 'Unknown Collection';
                    statusText += ` (Selected: ${collectionTitle}\n${this.simulatorState.selectedItem.title})`;
                } else if (this.simulatorState.highlightedItem && this.simulatorState.highlightedItem.title) {
                    const collectionTitle = this.simulatorState.currentCollection?.title || 'Unknown Collection';
                    statusText += ` (Highlighted: ${collectionTitle}\n${this.simulatorState.highlightedItem.title})`;
                }
                statusElement.textContent = statusText;
            } else {
                statusElement.textContent = 'Searching for simulator...';
            }
        }
        
        // Update debug panel if enabled
        this.updateDebugOverlay();
        
        this.logEvent('UI', 'Base updateUIFromState completed'); // Changed log message for clarity
    }
    

    
    /**
     * Finds and returns the most current simulator from presence data
     * @param {Object} presenceState - The complete presence state
     * @returns {Object|null} The simulator presence data or null
     */
    findCurrentSimulator(presenceState) {
        if (!presenceState) return null;
        
        let currentSimulator = null;
        let newestTime = 0;
        
        // Search through all presences
        Object.values(presenceState).forEach(presences => {
            presences.forEach(presence => {
                // Check if this is a simulator
                if (presence.clientType === 'simulator' && 
                    presence.clientId && 
                    presence.startTime) {
                    
                    // Keep track of the newest simulator by startTime
                    if (presence.startTime > newestTime) {
                        newestTime = presence.startTime;
                        currentSimulator = presence;
                    }
                }
            });
        });

        if (currentSimulator) {
            this.logEvent('Simulator', `Found current simulator: ${currentSimulator.clientId} (${currentSimulator.clientName || 'unnamed'})`);
        } else {
            this.logEvent('Simulator', 'No simulator found in presence data');
        }
        
        return currentSimulator;
    }

    /**
     * Sends an event to the current simulator
     * @param {string} eventType - The type of event to send
     * @param {Object} payload - Additional payload data to include
     */
    sendUpdate(eventType, payload = {}) {
        if (!this.clientChannel || !this.isSubscribed) {
            this.logEvent('Send', `Cannot send update (${eventType}), channel not ready`, { subscribed: this.isSubscribed });
            return false;
        }
        
        if (!this.currentSimulatorId) {
            this.logEvent('Send', `Cannot send update (${eventType}), no current simulator`, { payload });
            return false;
        }
        
        try {
            // Prepare the full payload with client info
            const fullPayload = {
                clientId: this.clientId,
                clientType: this.clientType,
                clientName: this.clientName,
                screenId: this.currentScreenId,
                targetSimulatorId: this.currentSimulatorId,
                                                ...payload
            };
            
            this.logEvent('Send', `Sending ${eventType} to simulator ${this.currentSimulatorId}`, fullPayload);
            
            // Send the event
            this.clientChannel.send({
                type: 'broadcast',
                event: eventType,
                payload: fullPayload
            });
            
            return true;
        } catch (err) {
            this.logEvent('Error', `Error sending ${eventType}:`, err);
            return false;
        }
    }

    
    /**
     * Updates the search query and syncs it via presence state
     * We update local state then sync it to Supabase presence so the simulator can see it!
     * @param {string} query - The new search query (empty string to clear)
     */
    updateSearchQuery(query) {
        // Normalize the query (trim whitespace, handle empty)
        const normalizedQuery = (query || '').trim();
        
        // Only update if the query actually changed
        if (normalizedQuery === this.currentSearchQuery) {
            this.logEvent('Search', 'Search query unchanged, skipping update');
            return;
        }
        
        // Store the old query for logging
        const oldQuery = this.currentSearchQuery;
        this.currentSearchQuery = normalizedQuery;
        
        this.logEvent('Search', `Search query updated: "${oldQuery}" → "${this.currentSearchQuery}"`);
        
        // Play a little search sound for feedback
        if (this.soundEnabled && this.currentSearchQuery) {
            this.playSound(BaseController.SOUND_PATTERNS.CLICK);
        }
        
        // Announce the search if speech is enabled
        if (this.speechEnabled && this.currentSearchQuery) {
            this.speakText(`Searching for ${this.currentSearchQuery}`);
        }
        
        // Update presence state with the new search query
        if (this.clientChannel && this.isSubscribed) {
            try {
                this.clientChannel.track({
                    clientId: this.clientId,
                    clientType: this.clientType,
                    clientName: this.currentName,
                    screenId: this.currentScreenId,
                    searchQuery: this.currentSearchQuery,  // ← The magic happens here!
                    onlineAt: new Date().toISOString()
                });
                this.logEvent('Search', 'Updated presence with search query');
            } catch (err) {
                this.logEvent('Error', 'Error updating presence with search:', err);
            }
        } else {
            this.logEvent('Search', 'Cannot update presence - channel not ready');
        }
        
        // Update debug overlay to show the new search query
        this.updateDebugOverlay();
    }
    
    /**
     * Create search field UI - for navigator only
     * @returns {HTMLElement} The search container element
     */
    createSearchField() {
        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        // Create search input wrapper
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'search-wrapper';
        
        // Create tag menu button (moved to LEFT of text field)
        const tagButton = document.createElement('button');
        tagButton.id = 'tag-menu-button';
        tagButton.className = 'tag-menu-button';
        tagButton.innerHTML = '?';
        tagButton.title = 'Browse tags';
        searchWrapper.appendChild(tagButton);
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Search items...';
        searchInput.autocomplete = 'off';
        searchInput.autocorrect = 'off';
        searchInput.autocapitalize = 'off';
        searchInput.spellcheck = 'false';
        searchInput.value = this.currentSearchQuery || '';
        searchWrapper.appendChild(searchInput);
        
        searchContainer.appendChild(searchWrapper);
        
        // Create tag menu (initially hidden)
        const tagMenu = this.createTagMenu();
        searchContainer.appendChild(tagMenu);
        
        return searchContainer;
    }
    
    /**
     * Create tag menu for tag selection
     */
    createTagMenu() {
        const menu = document.createElement('div');
        menu.id = 'tag-menu';
        menu.className = 'tag-menu';
        menu.style.display = 'none';
        
        const menuHeader = document.createElement('div');
        menuHeader.className = 'tag-menu-header';
        menuHeader.textContent = 'Select Tags:';
        menu.appendChild(menuHeader);
        
        const menuList = document.createElement('div');
        menuList.id = 'tag-menu-list';
        menuList.className = 'tag-menu-list';
        menu.appendChild(menuList);
        
        return menu;
    }
    
    /**
     * Set up search input field event handlers - shared functionality
     */
    setupSearchField() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            // Prevent pointer events from bubbling to the drag handler
            searchInput.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
            });
            
            searchInput.addEventListener('pointerup', (e) => {
                e.stopPropagation();
            });
            
            searchInput.addEventListener('pointermove', (e) => {
                e.stopPropagation();
            });
            
            // Handle input changes
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                this.updateSearchQuery(query);
            });
            
            // Handle Enter key
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value;
                    this.updateSearchQuery(query);
                    // Optionally blur the input to hide keyboard on mobile
                    // searchInput.blur();
                }
            });
            
            // Focus the search field
            searchInput.focus();
            
            this.logEvent('Init', 'Search input field initialized');
        } else {
            this.logEvent('Error', 'Search input field not found!');
        }
        
        // Set up tag menu button
        const tagButton = document.getElementById('tag-menu-button');
        const tagMenu = document.getElementById('tag-menu');
        
        if (tagButton && tagMenu) {
            tagButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Toggle menu visibility
                if (tagMenu.style.display === 'none' || !tagMenu.style.display) {
                    tagMenu.style.display = 'block';
                    this.updateTagMenu(); // Populate with latest tags
                } else {
                    tagMenu.style.display = 'none';
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!tagButton.contains(e.target) && !tagMenu.contains(e.target)) {
                    tagMenu.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * Update tag menu with available tags from simulator
     */
    updateTagMenu() {
        const menuList = document.getElementById('tag-menu-list');
        if (!menuList) return;
        
        // Clear existing items
        menuList.innerHTML = '';
        
        // Get tags from simulator state
        const tags = this.simulatorState?.tags || [];
        
        console.log("[Controller] updateTagMenu called. Tags available:", tags.length);
        if (tags.length > 0) {
            console.log("[Controller] First 5 tags:", tags.slice(0, 5));
        }
        
        if (tags.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'tag-menu-empty';
            emptyMessage.textContent = 'No tags available';
            menuList.appendChild(emptyMessage);
            return;
        }
        
        // Create tag items
        tags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'tag-menu-item';
            item.textContent = tag; // Remove # prefix from display
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Add tag to search with smart spacing
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    const currentValue = searchInput.value;
                    let newValue;
                    
                    if (currentValue === '') {
                        // Empty field: just set tag plus space
                        newValue = `${tag} `;
                    } else {
                        // Not empty: add space if needed, then tag plus space
                        if (currentValue.endsWith(' ')) {
                            newValue = `${currentValue}${tag} `;
                        } else {
                            newValue = `${currentValue} ${tag} `;
                        }
                    }
                    
                    searchInput.value = newValue;
                    // Move cursor to end and focus
                    searchInput.setSelectionRange(newValue.length, newValue.length);
                    searchInput.focus();
                    
                    this.updateSearchQuery(newValue);
                }
                
                // Hide menu
                const tagMenu = document.getElementById('tag-menu');
                if (tagMenu) {
                    tagMenu.style.display = 'none';
                }
            });
            
            menuList.appendChild(item);
        });
    }
};

/**
 * Navigator Controller - specializes in panning and zooming
 */
window.NavigatorController = class NavigatorController extends BaseController {
    constructor() {
        super('navigator');
    }
    
    /**
     * Create Navigator-specific DOM elements
     */
    createDOM() {
        this.logEvent('Init', 'Creating Navigator DOM');
        
        // Set page title
        document.title = 'SpaceCraft Navigator';
        
        // Add body class
        document.body.classList.add('navigator-container');
        
        // Create target div first (outside container)
        const targetDiv = document.createElement('div');
        targetDiv.id = 'target';
        document.body.appendChild(targetDiv);
        
        // Create main container
        const container = document.createElement('div');
        container.className = 'container';
        
        // Create title
        const title = document.createElement('h1');
        title.className = 'page-title';
        title.textContent = 'Navigator';
        container.appendChild(title);
        
        // Create instructions
        const instructions = document.createElement('p');
        instructions.className = 'instructions';
        instructions.innerHTML = '<strong>DRAG to move, PINCH to zoom</strong>';
        container.appendChild(instructions);
        
        // Create search container
        const searchContainer = this.createSearchField();
        container.appendChild(searchContainer);
        
        // Create status
        const status = document.createElement('div');
        status.id = 'status';
        status.className = 'status';
        status.textContent = 'Connecting...';
        container.appendChild(status);
        
        document.body.appendChild(container);
        
        // Create debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        
        const debugContent = document.createElement('pre');
        debugContent.id = 'debug-content';
        debugContent.textContent = 'Initializing...';
        debugPanel.appendChild(debugContent);
        
        document.body.appendChild(debugPanel);
    }
    
    /**
     * Set up Navigator-specific UI elements
     */
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Navigator-specific UI');
        
        this.setupSearchField();
    }
    
    /**
     * Handle pointer down event - specialized for navigator
     */
    handlePointerDown(ev) {
        this.logEvent('Input', 'Navigator Pointer down', { x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId });
        ev.target.setPointerCapture(ev.pointerId); 
        this.evCache.push(ev);

        if (this.evCache.length === 1) { // First finger down
            this.prevX = ev.clientX;
            this.prevY = ev.clientY;
        }
        // prevDiff is reset when a pointer goes up and cache < 2, or on new two-finger touch
        if (this.evCache.length === 2) {
             this.prevDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);
        }

        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.TOUCH);
        }
        
        // Allow clicks in input text elements (like the search box!)
        // This prevents the touch handler from interfering with typing
        if (ev.target?.tagName !== 'INPUT') ev.preventDefault(); 
    }

    /**
     * Handle pointer move event - specialized for navigator panning and zooming
     */
    handlePointerMove(ev) {
        if (!this.isSubscribed || this.evCache.length === 0) return;

        const index = this.evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
        if (index === -1) return; 
        this.evCache[index] = ev;

        if (this.evCache.length === 2) {
            // --- Pinch Zoom (Touchscreen) ---
            const curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);
            if (this.prevDiff > 0) {
                const zoomDelta = (curDiff - this.prevDiff) * this.pinchZoomSensitivity * this.userZoomSensitivity * -1;
                this.sendUpdate('zoom', { zoomDelta: zoomDelta }); 
                this.logEvent('Input', 'Pinch zoom', {zoomDelta, curDiff, prevDiff: this.prevDiff});
            }
            this.prevDiff = curDiff;
        } else if (this.evCache.length === 1) {
            // --- Panning ---
            const dx = ev.clientX - this.prevX;
            const dy = ev.clientY - this.prevY;
            const finalPanXDelta = dx * this.userPanSensitivity * 0.125;
            const finalPanYDelta = dy * this.userPanSensitivity * 0.125;
            if (Math.abs(finalPanXDelta) > 0.001 || Math.abs(finalPanYDelta) > 0.001) {
                this.sendUpdate('pan', { panXDelta: finalPanXDelta, panYDelta: finalPanYDelta });
                this.logEvent('Input', 'Panning', {dx, dy, finalPanXDelta, finalPanYDelta});
            }
            this.prevX = ev.clientX;
            this.prevY = ev.clientY;
        }
        
        // Only prevent default if we're actually dragging on the target area, not on input elements
        if (ev.target?.tagName !== 'INPUT') ev.preventDefault();
    }

    /**
     * Handle pointer up event - specialized for navigator
     */
    handlePointerUp(ev) {
        if (!this.isSubscribed) return;
        ev.target.releasePointerCapture(ev.pointerId);

        const index = this.evCache.findIndex(cachedEv => cachedEv.pointerId === ev.pointerId);
        if (index !== -1) {
            this.evCache.splice(index, 1); 
            this.logEvent('Input', 'Navigator Pointer up', { pointerId: ev.pointerId, remainingPointers: this.evCache.length });
        }

        if (this.evCache.length < 2) {
            this.prevDiff = -1; 
        }
        if (this.evCache.length === 1) {
            this.prevX = this.evCache[0].clientX;
            this.prevY = this.evCache[0].clientY;
        } else if (this.evCache.length === 0) {
            this.prevX = 0;
            this.prevY = 0;
        }

        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.RELEASE_TAP);
        }
        
        // Allow normal behavior for input elements
        if (ev.target?.tagName !== 'INPUT') ev.preventDefault();
    }
    
    /**
     * Handle wheel event - specialized for navigator zoom
     */
    handleWheel(ev) {
        if (!this.isSubscribed) return;
        
        // Always prevent default browser zoom/scroll
        ev.preventDefault();

        const isTrackpadPinch = ev.ctrlKey;
        const sensitivity = isTrackpadPinch ? this.trackpadZoomSensitivity : this.wheelZoomSensitivity;
        const zoomDelta = ev.deltaY * sensitivity * this.userZoomSensitivity;
        
        this.sendUpdate('zoom', { zoomDelta: zoomDelta });
        this.logEvent('Input', 'Wheel zoom', {zoomDelta, deltaY: ev.deltaY, isTrackpadPinch});
    }
    
    /**
     * Handle confirmed shake in north direction
     */
    handleNorth() {
        this.logEvent('Direction', 'North shake in navigator');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_NORTH);
        }
        
        // Pan upward
        if (this.clientChannel) {
            this.sendUpdate('pan', { panXDelta: 0, panYDelta: -5 });
        }
    }
    
    /**
     * Handle confirmed shake in south direction
     */
    handleSouth() {
        this.logEvent('Direction', 'South shake in navigator');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_SOUTH);
        }
        
        // Pan downward
        if (this.clientChannel) {
            this.sendUpdate('pan', { panXDelta: 0, panYDelta: 5 });
        }
    }
    
    /**
     * Handle confirmed shake in east direction
     */
    handleEast() {
        this.logEvent('Direction', 'East shake in navigator');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_EAST);
        }
        
        // Pan right
        if (this.clientChannel) {
            this.sendUpdate('pan', { panXDelta: 5, panYDelta: 0 });
        }
    }
    
    /**
     * Handle confirmed shake in west direction
     */
    handleWest() {
        this.logEvent('Direction', 'West shake in navigator');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_WEST);
        }
        
        // Pan left
        if (this.clientChannel) {
            this.sendUpdate('pan', { panXDelta: -5, panYDelta: 0 });
        }
    }
    
    /**
     * Handle confirmed shake in up direction
     */
    handleUp() {
        this.logEvent('Direction', 'Up shake in navigator');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_UP);
        }
        
        // Zoom out
        if (this.clientChannel) {
            this.sendUpdate('zoom', { zoomDelta: 0.2 });
        }
    }
    
    /**
     * Handle confirmed shake in down direction
     */
    handleDown() {
        this.logEvent('Direction', 'Down shake in navigator');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_DOWN);
        }
        
        // Zoom in
        if (this.clientChannel) {
            this.sendUpdate('zoom', { zoomDelta: -0.2 });
        }
    }
    
    handlePointerCancel(ev) {
        this.logEvent('Input', 'Navigator Pointer cancel', { pointerId: ev.pointerId });
        this.handlePointerUp(ev); // Treat cancel like up for cleanup
    }
};

/**
 * Selector Controller - specializes in selection and highlighting
 */
window.SelectorController = class SelectorController extends BaseController {
    constructor() {
        super('selector');
    }
    
    /**
     * Create Selector-specific DOM elements
     */
    createDOM() {
        this.logEvent('Init', 'Creating Selector DOM');
        
        // Set page title
        document.title = 'SpaceCraft Selector';
        
        // Add body class
        document.body.classList.add('selector-container');
        
        // Create target div first (outside container)
        const targetDiv = document.createElement('div');
        targetDiv.id = 'target';
        document.body.appendChild(targetDiv);
        
        // Create main container
        const container = document.createElement('div');
        container.className = 'container';
        
        // Create title
        const title = document.createElement('h1');
        title.className = 'page-title';
        title.textContent = 'Selector';
        container.appendChild(title);
        
        // Create instructions
        const instructions = document.createElement('p');
        instructions.className = 'instructions';
        instructions.innerHTML = '<strong>TAP or SWIPE left/right/up/down</strong>';
        container.appendChild(instructions);
        
        // Create status
        const status = document.createElement('div');
        status.id = 'status';
        status.className = 'status';
        status.textContent = 'Connecting...';
        container.appendChild(status);
        
        document.body.appendChild(container);
        
        // Create debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        
        const debugContent = document.createElement('pre');
        debugContent.id = 'debug-content';
        debugContent.textContent = 'Initializing...';
        debugPanel.appendChild(debugContent);
        
        document.body.appendChild(debugPanel);
    }
    
    /**
     * Set up Selector-specific UI elements
     */
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Selector-specific UI');
        this.setupSearchField();
    }
    
    /**
     * Handle tap gesture - send selection event
     */
    handleTap() {
        this.logEvent('Direction', 'Tap in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.RELEASE_TAP);
        }
        
        // Send tap selection event
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'tap',
                dx: 0,
                dy: 0
            });
        }
    }
    
    /**
     * Handle confirmed shake in north direction 
     */
    handleNorth() {
        this.logEvent('Direction', 'North shake in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_NORTH);
        }
        
        // Select up
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'north',
                dx: this.lastGestureDeltaX || 0,
                dy: this.lastGestureDeltaY || 0
            });
        }
    }
    
    /**
     * Handle confirmed shake in south direction
     */
    handleSouth() {
        this.logEvent('Direction', 'South shake in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_SOUTH);
        }
        
        // Select down
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'south',
                dx: this.lastGestureDeltaX || 0,
                dy: this.lastGestureDeltaY || 0
            });
        }
    }
    
    /**
     * Handle confirmed shake in east direction
     */
    handleEast() {
        this.logEvent('Direction', 'East shake in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_EAST);
        }
        
        // Select right
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'east',
                dx: this.lastGestureDeltaX || 0,
                dy: this.lastGestureDeltaY || 0
            });
        }
    }
    
    /**
     * Handle confirmed shake in west direction
     */
    handleWest() {
        this.logEvent('Direction', 'West shake in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_WEST);
        }
        
        // Select left
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'west',
                dx: this.lastGestureDeltaX || 0,
                dy: this.lastGestureDeltaY || 0
            });
        }
    }
    
    /**
     * Handle confirmed shake in up direction
     */
    handleUp() {
        this.logEvent('Direction', 'Up shake in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_UP);
        }
        
        // Select up layer
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'up',
                dx: 0,
                dy: 0
            });
        }
    }
    
    /**
     * Handle confirmed shake in down direction
     */
    handleDown() {
        this.logEvent('Direction', 'Down shake in selector');
        
        // Play appropriate sound
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.SHAKE_DOWN);
        }
        
        // Select down layer
        if (this.clientChannel) {
            this.sendUpdate('select', { 
                action: 'down',
                dx: 0,
                dy: 0
            });
        }
    }

};

/**
 * Inspector Controller - specializes in displaying item data
 */
window.InspectorController = class InspectorController extends BaseController {
    // Debounce time for iframe changes (in milliseconds)
    static IFRAME_DEBOUNCE_TIME = 1000; // 1 second - adjust this value as needed
    
    constructor() {
        super('inspector'); // Client type
        this.jsonOutputElement = null;
        this.iframeElement = null;
        this.currentSelectedItemId = null;
        this.iframeDebounceTimer = null; // Timer for debouncing iframe changes
        this.pendingIframeUrl = null; // Store pending URL during debounce
        this.lastLoadTime = 0; // Track when we last loaded an iframe
        this.isFirstLoad = true; // Track if this is the first load
        this.trailingDebounceTimer = null; // For trailing edge debouncing
    }
    
    /**
     * Create Inspector-specific DOM elements
     */
    createDOM() {
        this.logEvent('Init', 'Creating Inspector DOM');
        
        // Set page title
        document.title = 'SpaceCraft Inspector';
        
        // Add body class
        document.body.classList.add('inspector-container');
        
        // Create iframe ONLY - no container div blocking it!
        const iframe = document.createElement('iframe');
        iframe.id = 'inspector-iframe';
        iframe.src = 'about:blank';
        iframe.width = '100%';
        iframe.height = '100%';
        document.body.appendChild(iframe);
        
        // Create JSON output (for debug mode) - hidden by default
        const jsonOutput = document.createElement('div');
        jsonOutput.id = 'inspector-json-output';
        document.body.appendChild(jsonOutput);
        
        // NO CONTAINER DIV - just iframe and debug output
    }
    
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Inspector-specific UI');
        this.jsonOutputElement = document.getElementById('inspector-json-output');
        this.iframeElement = document.getElementById('inspector-iframe');
        
        if (!this.jsonOutputElement) {
            this.logEvent('Error', 'Inspector JSON output element not found!');
        }
        if (!this.iframeElement) {
            this.logEvent('Error', 'Inspector iframe element not found!');
        }
    }
    
    /**
     * Override updateUIFromState to handle selected item changes
     */
    updateUIFromState() {
        // Call parent implementation first
        super.updateUIFromState();
        
        // Check if selected item has changed
        if (this.simulatorState && this.simulatorState.selectedItem) {
            const newSelectedItemId = this.simulatorState.selectedItemId;
            if (newSelectedItemId !== this.currentSelectedItemId) {
                this.currentSelectedItemId = newSelectedItemId;
                this.selectedItemChanged(this.simulatorState.selectedItem);
            }
        } else if (this.currentSelectedItemId !== null) {
            // Item was deselected
            this.currentSelectedItemId = null;
            this.selectedItemChanged(null);
        }
    }
    
    // This method will be called when the selected item data changes
    selectedItemChanged(selectedItemJSON) {
        this.logEvent('Inspector', 'Received new selected item JSON:', selectedItemJSON);
        
        // Clear any existing trailing debounce timer
        if (this.trailingDebounceTimer) {
            clearTimeout(this.trailingDebounceTimer);
            this.trailingDebounceTimer = null;
            this.logEvent('Inspector', 'Cleared trailing debounce timer');
        }
        
        // Determine the URL to load
        let targetUrl = 'about:blank';
        if (selectedItemJSON) {
            // Check for custom URL first (spacecraft_custom_url)
            if (selectedItemJSON.spacecraft_custom_url) {
                targetUrl = selectedItemJSON.spacecraft_custom_url;
                this.logEvent('Inspector', `Using custom URL: ${targetUrl}`);
            } else {
                // Fall back to archive.org URL
                const archiveId = selectedItemJSON.identifier || selectedItemJSON.id;
                if (archiveId) {
                    targetUrl = `https://archive.org/details/${archiveId}`;
                    this.logEvent('Inspector', `Preparing to load archive.org page: ${targetUrl}`);
                } else {
                    this.logEvent('Error', 'Selected item has no identifier field', selectedItemJSON);
                }
            }
        }
        
        // Store the pending URL
        this.pendingIframeUrl = targetUrl;
        
        const now = Date.now();
        const timeSinceLastLoad = now - this.lastLoadTime;
        
        // Clever debouncing logic
        if (this.isFirstLoad || timeSinceLastLoad >= InspectorController.IFRAME_DEBOUNCE_TIME) {
            // IMMEDIATE load: First load OR enough time has passed since last load
            this.logEvent('Inspector', `Loading iframe immediately (first load: ${this.isFirstLoad}, time since last: ${timeSinceLastLoad}ms)`);
            
            if (this.iframeElement && this.pendingIframeUrl !== null) {
                this.logEvent('Inspector', `Loading iframe with URL: ${this.pendingIframeUrl}`);
                this.iframeElement.src = this.pendingIframeUrl;
                this.lastLoadTime = now;
                this.isFirstLoad = false;
                this.pendingIframeUrl = null;
            }
        } else {
            // RATE LIMITED: Too soon since last load, set up trailing edge debounce
            this.logEvent('Inspector', `Rate limited (only ${timeSinceLastLoad}ms since last load). Setting up trailing edge debounce.`);
            
            // Set up trailing edge debounce - wait for 1 second of no changes
            this.trailingDebounceTimer = setTimeout(() => {
                if (this.iframeElement && this.pendingIframeUrl !== null) {
                    this.logEvent('Inspector', `Loading iframe after trailing debounce: ${this.pendingIframeUrl}`);
                    this.iframeElement.src = this.pendingIframeUrl;
                    this.lastLoadTime = Date.now();
                    this.pendingIframeUrl = null;
                }
                this.trailingDebounceTimer = null;
            }, InspectorController.IFRAME_DEBOUNCE_TIME);
        }
        
        // Update JSON output immediately (no debounce for debug info)
        if (this.jsonOutputElement) {
            if (selectedItemJSON) {
                this.jsonOutputElement.textContent = JSON.stringify(selectedItemJSON, null, 2);
            } else {
                this.jsonOutputElement.textContent = 'No item currently selected.';
            }
        }
    }
};

// Simple initialization on DOM ready - directly instantiates the right controller
document.addEventListener('DOMContentLoaded', function() {
    
    // Get controller type from URL parameter, default to 'navigator'
    const urlParams = new URLSearchParams(window.location.search);
    const controllerType = urlParams.get('type') || 'navigator';
    
    console.log(`Initializing controller type: ${controllerType}`);
    
    // Create the appropriate controller based on the URL parameter
    let controller;
    if (controllerType === 'navigator') {
        controller = new NavigatorController();
        controller.createDOM();
        controller.initialize();
    } else if (controllerType === 'selector') {
        controller = new SelectorController();
        controller.createDOM();
        controller.initialize();
    } else if (controllerType === 'inspector') {
        controller = new InspectorController();
        controller.createDOM();
        controller.initialize(true);
    } else {
        console.error('Invalid controller type: ' + controllerType);
        // Default to navigator
        controller = new NavigatorController();
        controller.createDOM();
        controller.initialize();
    }
    
    // Make controller globally accessible
    window.controller = controller;
});

