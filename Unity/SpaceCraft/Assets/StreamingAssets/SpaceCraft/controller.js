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
 * - selectedItemIds: Array of all currently selected item IDs
 * - highlightedItemIds: Array of all currently highlighted item IDs  
 * - selectedItemId: First item from selectedItemIds array
 * - highlightedItemId: First item from highlightedItemIds array
 * - selectedItem: Metadata for current selected item (without nested tree)
 * - highlightedItem: Metadata for highlighted item (without nested tree)
 * - currentCollectionId: ID of the currently active collection
 * - currentCollection: Metadata for the current collection (without items array)
 * - currentCollectionItems: Array of item IDs in the current collection
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
 * 'presence' { event: 'join' }, 'presence' { event: 'leave' }: New client has connected/disconnected
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
    
    // Generate timestamp-based anonymous name
    static generateAnonymousName() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        // Get 2 significant figures of the second fraction (milliseconds / 10)
        const fraction = String(Math.floor(now.getUTCMilliseconds() / 10)).padStart(2, '0');
        
        return `Anonymous-${year}-${month}-${day}-${hours}-${minutes}-${seconds}-${fraction}`;
    }
    

    
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
        this.anonymousName = this.constructor.generateAnonymousName();
        
        // UI elements
        this.targetElement = null;
        this.shipNameElement = null;
        
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
        
        // Search state
        this.currentSearchQuery = '';
        
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
        
        // Tilt tracking for force field control
        this.neutralOrientation = null; // Captured on touch down
        this.currentTiltX = 0; // Front-back tilt relative to neutral
        this.currentTiltZ = 0; // Left-right tilt relative to neutral
        this.isTiltTransmitting = false; // Only transmit while touching
        this.lastTiltUpdateTime = 0; // For throttling tilt presence updates
        this.lastSentTiltX = 0; // Track last sent values to avoid redundant updates
        this.lastSentTiltZ = 0;
        
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
        
        this.logEvent('Init', `Client created: type=${this.clientType}, id=${this.clientId}, name=${this.anonymousName}`);
    }
    
    /**
     * Generates a random client ID
     */
    generateClientId() {
        return 'client_' + Math.random().toString(36).substring(2, 10);
    }
    
    // Ship naming methods removed - all controllers are anonymous
    
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
        // Find all button elements
        const tiltToggleBtn = document.getElementById('tilt-toggle');
        const soundToggleBtn = document.getElementById('sound-toggle');
        const speechToggleBtn = document.getElementById('speech-toggle');
        const renameBtn = document.getElementById('rename-button');
        
        this.logEvent('Init', 'Setting up UI buttons');
        
        // Handle tilt toggle button
        if (tiltToggleBtn) {
            const enableText = "Start<br/>Tilting";
            const disableText = "Stop<br/>Tilting";
            
            // Set initial button state - always show "Start Tilting" initially
            tiltToggleBtn.innerHTML = enableText;
            this.tiltingActive = false;
            
            tiltToggleBtn.addEventListener('click', () => {
                this.logEvent('UI', 'Tilt toggle button clicked');
                
                // Determine new state (opposite of current)
                const newState = !this.tiltingActive;
                
                // Play appropriate button sound based on new state
                if (this.soundEnabled) {
                    this.playSound(BaseController.SOUND_PATTERNS.BUTTON_ON);
                }
                
                if (newState) {
                    this.logEvent('Motion', 'Attempting to start motion tracking');
                    const success = this.requestAndStartMotionTracking();
                    if (success) {
                        this.tiltingActive = true;
                        tiltToggleBtn.innerHTML = disableText;
                        this.logEvent('Motion', 'Started motion tracking');
                        
                        // CAPTURE NEUTRAL ORIENTATION FOR TILT REFERENCE!
                        if (this.lastOrientation) {
                            this.neutralOrientation = { ...this.lastOrientation };
                            this.isTiltTransmitting = true;
                            this.currentTiltX = 0;
                            this.currentTiltZ = 0;
                            this.updateTiltPresence();
                            this.logEvent('Tilt', 'Captured neutral orientation, starting continuous tilt transmission');
                        }
                        
                        // Play success sound
                        if (this.soundEnabled) {
                            this.playSound(BaseController.SOUND_PATTERNS.TILT_ON);
                        }
                        
                        // Speak button action if speech is enabled
                        if (this.speechEnabled) {
                            this.speakText(`Start Tilting.`);
                        }
                        
                    } else {
                        this.logEvent('Error', 'Failed to start motion tracking');
                        // Play error sound
                        if (this.soundEnabled) {
                            this.playSound(BaseController.SOUND_PATTERNS.ERROR);
                        }
                    }
                } else {
                    this.logEvent('Motion', 'Attempting to stop motion tracking');
                    const success = this.stopMotionTracking();
                    if (success) {
                        this.tiltingActive = false;
                        tiltToggleBtn.innerHTML = enableText;
                        this.logEvent('Motion', 'Stopped motion tracking');
                        
                        // STOP TILT TRANSMISSION!
                        this.isTiltTransmitting = false;
                        this.currentTiltX = 0;
                        this.currentTiltZ = 0;
                        this.neutralOrientation = null;
                        this.updateTiltPresence();
                        this.logEvent('Tilt', 'Stopped continuous tilt transmission');
                        
                        // Play tone-down sound
                        if (this.soundEnabled) {
                            this.playSound(BaseController.SOUND_PATTERNS.TILT_OFF);
                        }
                        
                        // Speak button action if speech is enabled
                        if (this.speechEnabled) {
                            this.speakText("Stop Tilting.");
                        }
                        
                    } else {
                        this.logEvent('Error', 'Failed to stop motion tracking');
                        // Play error sound
                        if (this.soundEnabled) {
                            this.playSound(BaseController.SOUND_PATTERNS.ERROR);
                        }
                    }
                }
                this.updateDebugOverlay();
            });
            
            this.logEvent('Init', 'Tilt toggle button setup complete');
        }
        
        // Handle sound toggle button
        if (soundToggleBtn) {
            const enableText = "Start<br/>Sound";
            const disableText = "Stop<br/>Sound";
            
            // Set initial state - disabled by default
            soundToggleBtn.innerHTML = enableText;
            
            // Hide sound button initially - it's a secret feature!
            soundToggleBtn.style.display = 'none';
            
            soundToggleBtn.addEventListener('click', () => {
                this.logEvent('UI', 'Sound toggle button clicked');
                
                // Determine intended new state (opposite of current)
                const intendedState = !this.soundEnabled;
                
                // Play sound button click (even if sound is disabled, as feedback)
                if (this.audioContext) {
                    this.playTone(intendedState ? BaseController.SOUND_PATTERNS.BUTTON_ON : BaseController.SOUND_PATTERNS.BUTTON_OFF);
                }
                
                const isEnabled = this.toggleSound();
                soundToggleBtn.innerHTML = isEnabled ? disableText : enableText;
                this.logEvent('Sound', isEnabled ? 'Enabled' : 'Disabled');
                
                // Test sound when enabled
                if (isEnabled) {
                    this.logEvent('Sound', 'Testing sound');
                    this.playSound(BaseController.SOUND_PATTERNS.SUCCESS);
                    // Speak status only if speech is *already* enabled
                    if (this.speechEnabled) {
                        this.speakText("Sound effects enabled.");
                    }
                } else {
                     // If speech was enabled, announce sound stopping
                     if (this.speechEnabled) {
                         // Speech gets disabled by toggleSound(), announce it here
                         this.speakText("Sound effects disabled. Speech disabled."); 
                     } else {
                         // If only sound was on, just log, no speech needed
                         this.logEvent('Sound', 'Sound stopped, speech was already off.');
                     }
                     // Update speech button state if it exists and sound was turned off
                     if (speechToggleBtn) {
                         speechToggleBtn.innerHTML = "Start<br/>Speech"; // Set speech button to "Start"
                     }
                }
            });
            
            this.logEvent('Init', 'Sound toggle button setup complete');
        }
        
        // Handle speech toggle button
        if (speechToggleBtn) {
            const enableText = "Start<br/>Speech";
            const disableText = "Stop<br/>Speech";
            
            // Set initial state - ensure it matches speechEnabled reality
            speechToggleBtn.innerHTML = this.speechEnabled ? disableText : enableText;
            
            // Hide speech button initially - it's a secret feature!
            speechToggleBtn.style.display = 'none';
            
            speechToggleBtn.addEventListener('click', () => {
                this.logEvent('UI', 'Speech toggle button clicked');
                
                // Determine intended new state (opposite of current)
                const intendedState = !this.speechEnabled;
                
                // Play speech button click with ON/OFF sound *if sound is available*
                if (this.soundEnabled || intendedState) { // Play sound if sound is on OR if we are trying to turn speech on (which will turn sound on)
                     if (this.audioContext) { // Check context before playing
                        this.playTone(intendedState ? BaseController.SOUND_PATTERNS.BUTTON_ON : BaseController.SOUND_PATTERNS.BUTTON_OFF);
                    }
                }
                
                const isEnabled = this.toggleSpeech();
                speechToggleBtn.innerHTML = isEnabled ? disableText : enableText;
                this.logEvent('Speech', isEnabled ? 'Enabled' : 'Disabled');

                // Update sound button if speech enabling turned sound on
                if (isEnabled && soundToggleBtn && !this.soundEnabled) {
                    soundToggleBtn.innerHTML = "Stop<br/>Sound"; // Set sound button to "Stop"
                }
            });
            
            this.logEvent('Init', 'Speech toggle button setup complete');
        }
        
        // Handle rename button - now does nothing since all controllers are anonymous
        if (renameBtn) {
            renameBtn.style.display = 'none'; // Hide the rename button
            this.logEvent('Init', 'Rename button hidden (anonymous mode)');
        }
        
        // Make ship name clickable to say who I am
        const shipNameElement = document.getElementById('ship-name');
        const shipNameDisplayContainer = document.querySelector('.ship-name-display');
        
        if (shipNameElement || shipNameDisplayContainer) {
            const target = shipNameElement || shipNameDisplayContainer;
            
            target.style.cursor = 'pointer'; // Show it's clickable
            target.addEventListener('click', () => {
                this.logEvent('UI', 'Ship name clicked');
                
                // Play click sound
                if (this.soundEnabled) {
                    this.playSound(BaseController.SOUND_PATTERNS.CLICK);
                }
                
                if (this.speechEnabled) {
                    this.sayWhoIAm();
                }
            });
            
            this.logEvent('Init', 'Ship name element setup complete');
        }
        
        // Allow controller-specific UI setup
        this.setupControllerSpecificUI();
        
        this.logEvent('Init', 'All UI buttons setup complete');
    }
    
    /**
     * Controller-specific UI setup - override in subclasses
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
        const gestureHandlers = {
            'north': () => this.handleNorth(),
            'south': () => this.handleSouth(),
            'east': () => this.handleEast(),
            'west': () => this.handleWest(),
            'up': () => this.handleUp(),
            'down': () => this.handleDown(),
            'tap': () => this.handleTap()
        };
        
        const handler = gestureHandlers[gestureType];
        if (handler) {
            handler();
        }
        
        return gestureType;
    }
    
    // Direction handlers - base class provides empty implementations
    handleNorth() { }
    handleSouth() { }
    handleEast() { }
    handleWest() { }
    handleUp() { }
    handleDown() { }
    handleTap() { }
    
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
                    clientName: this.anonymousName,
                    ...payload
                }
            });
        } catch (err) {
            this.logEvent('Error', `Error sending ${eventType}:`, err);
        }
    }
    
    // Rename functionality removed - all controllers are anonymous

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
                    <div>Ship: <b>${this.anonymousName}</b></div>
                    <div>Connection: ${connectionState} (${channelInfo})</div>
                    <div>Search: "${this.currentSearchQuery || '(none)'}"</div>
                    <div>Motion: ${motionState} (${this.tiltingActive ? 'active' : 'inactive'})</div>
                    <div>Acceleration: ${accelInfo}</div>
                    <div>Mag: ${magnitudeInfo} With G: ${magnitudeWithGravityInfo}</div>
                    <div>Shake: Impulse: ${this.isDetectingImpulse ? `${this.impulseAxis}-${this.impulseDirection}` : 'none'}</div>
                    <div>Last Shake: ${this.lastShakeTime ? new Date(this.lastShakeTime).toLocaleTimeString() : 'none'}</div>
                    <div>Tilt TX: ${this.isTiltTransmitting ? 'ON' : 'OFF'} X:${this.currentTiltX.toFixed(1)}° Z:${this.currentTiltZ.toFixed(1)}°</div>
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
     * Announces controller name using speech.
     */
    sayWhoIAm() {
        const nameToSpeak = this.anonymousName;
        this.logEvent('Speech', `Speaking name: ${nameToSpeak}`);
        
        // Ensure we cancel any existing speech first
        if (this.speechSynthesis && this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        
        // Wait a short moment to ensure speech system is ready
        setTimeout(() => {
            this.speakText(nameToSpeak, { rate: 1.0, pitch: 1.0 });
        }, 100);
        
        return true;
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
        
        // Calculate relative tilt if we have a neutral orientation and tilting is active
        if (this.neutralOrientation && this.tiltingActive && this.isTiltTransmitting) {
            // Calculate relative tilts
            // Beta is front-back tilt, Gamma is left-right tilt
            const prevTiltX = this.currentTiltX;
            const prevTiltZ = this.currentTiltZ;
            this.currentTiltX = event.beta - this.neutralOrientation.beta;
            this.currentTiltZ = event.gamma - this.neutralOrientation.gamma;
            
            // Clamp to reasonable ranges
            this.currentTiltX = Math.max(-90, Math.min(90, this.currentTiltX));
            this.currentTiltZ = Math.max(-90, Math.min(90, this.currentTiltZ));
            
            // Log significant changes
            if (Math.abs(this.currentTiltX - prevTiltX) > 1 || Math.abs(this.currentTiltZ - prevTiltZ) > 1) {
                this.logEvent('Tilt', `Orientation changed: X=${this.currentTiltX.toFixed(1)}° Z=${this.currentTiltZ.toFixed(1)}° (raw beta=${event.beta?.toFixed(1)}° gamma=${event.gamma?.toFixed(1)}°)`);
            }
            
            // Update presence with tilt data
            this.updateTiltPresence();
        } else if (this.tiltingActive && !this.neutralOrientation && this.lastOrientation) {
            // We're supposed to be tilting but haven't captured neutral yet
            // Try to capture it now
            this.neutralOrientation = { ...this.lastOrientation };
            this.isTiltTransmitting = true;
            this.currentTiltX = 0;
            this.currentTiltZ = 0;
            this.logEvent('Tilt', `Captured neutral orientation on demand: Beta=${this.neutralOrientation.beta?.toFixed(1)}° Gamma=${this.neutralOrientation.gamma?.toFixed(1)}°`);
            this.updateTiltPresence();
        }
        
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
            
            // Also stop any tilt transmission
            if (this.isTiltTransmitting) {
                this.isTiltTransmitting = false;
                this.currentTiltX = 0;
                this.currentTiltZ = 0;
                this.neutralOrientation = null;
                this.updateTiltPresence();
            }
            
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
            
            // Start tilt transmission immediately with first available orientation
            setTimeout(() => {
                if (this.tiltingActive && this.lastOrientation && !this.neutralOrientation) {
                    this.neutralOrientation = { ...this.lastOrientation };
                    this.isTiltTransmitting = true;
                    this.currentTiltX = 0;
                    this.currentTiltZ = 0;
                    this.updateTiltPresence();
                    this.logEvent('Tilt', `Captured initial neutral orientation: Beta=${this.neutralOrientation.beta?.toFixed(1)}° Gamma=${this.neutralOrientation.gamma?.toFixed(1)}°`);
                } else {
                    this.logEvent('Tilt', `Could not capture neutral orientation - tiltingActive:${this.tiltingActive} hasOrientation:${!!this.lastOrientation} hasNeutral:${!!this.neutralOrientation}`);
                }
            }, 100); // Small delay to ensure we get first orientation event
            
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
                    // Only log sync events that involve simulators
                    
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
                    } else if (this.currentSimulatorId) { // Only log if we're losing a simulator
                        this.logEvent('Simulator', 'No simulator found in presence');
                        this.currentSimulatorId = null;
                    }
                    
                    // Update UI elements
                    this.updateDebugOverlay();
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    // Only log if it's a simulator joining
                    const hasSimulator = newPresences.some(p => p.clientType === 'simulator');
                    if (hasSimulator) {
                        this.logEvent('Presence', `Simulator join event`, newPresences.filter(p => p.clientType === 'simulator'));
                    }
                    
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
                    // Only log if it's important (simulator leaving or our simulator)
                    const hasSimulator = leftPresences.some(p => p.clientType === 'simulator' || p.clientId === this.currentSimulatorId);
                    if (hasSimulator) {
                        this.logEvent('Presence', `Important leave event`, leftPresences.filter(p => p.clientType === 'simulator' || p.clientId === this.currentSimulatorId));
                    }
                    
                    // Check if the current simulator left
                    for (const presence of leftPresences) {
                        if (presence.clientId === this.currentSimulatorId) {
                            this.logEvent('Simulator', `Current simulator left: ${presence.clientId}`);
                            
                            // Find a new simulator if available
                            this.currentSimulatorId = null;
                        }
                    }
                });
                
            // --- Broadcast Event Handlers ---
            this.clientChannel
                .on('broadcast', { event: 'search_string_update' }, (payload) => {
                    // Handle search string updates from the simulator/Unity
                    if (payload && payload.payload && payload.payload.searchString !== undefined) {
                        const newSearchString = payload.payload.searchString;
                        
                        // Only update if it's different and it came from Unity (not another controller)
                        if (newSearchString !== this.currentSearchQuery && payload.payload.sourceType === 'unity') {
                            this.currentSearchQuery = newSearchString;
                            
                            // Update the search input field if it exists
                            const searchElement = document.getElementById('searchBox');
                            if (searchElement) {
                                searchElement.value = newSearchString;
                                this.logEvent('Search', `Search field updated from Unity: "${newSearchString}"`);
                            }
                            
                            // Update debug overlay
                            this.updateDebugOverlay();
                            
                            // Announce the search update if speech is enabled
                            if (this.speechEnabled && newSearchString) {
                                this.speakText(`Search updated to ${newSearchString}`);
                            }
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
                            clientName: this.anonymousName,
                            screenId: this.currentScreenId,
                            searchQuery: this.currentSearchQuery,  // Start with empty search, ready for updates!
                            tiltEnabled: false, // Start with tilt disabled
                            tiltX: 0,
                            tiltZ: 0
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
        
        // Update ship name display with anonymous name
        const shipNameElement = document.getElementById('ship-name');
        if (shipNameElement) {
            shipNameElement.textContent = this.anonymousName;
        }

        // Update status display
        const statusElement = document.getElementById('status');
        if (statusElement) {
            if (this.currentSimulatorId && this.simulatorState) {
                // Try to display a more informative status if possible
                let statusText = `Connected to: ${this.simulatorState.clientName || 'Simulator'}`;
                if (this.simulatorState.selectedItem && this.simulatorState.selectedItem.title) {
                    statusText += ` (Selected: ${this.simulatorState.selectedItem.title})`;
                } else if (this.simulatorState.highlightedItem && this.simulatorState.highlightedItem.title) {
                    statusText += ` (Highlighted: ${this.simulatorState.highlightedItem.title})`;
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
                clientName: this.anonymousName,
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
     * Updates the ship name displayed in the UI
     */
    updateShipNameUI() {
        const shipNameElement = document.getElementById('ship-name');
        if (shipNameElement) {
            shipNameElement.textContent = this.anonymousName;
            this.logEvent('UI', `Updated ship name in UI to: ${this.anonymousName}`);
        }
    }
    
    /**
     * Updates the search query and syncs it via presence state
     * This follows the same pattern as triggerRename - we update local state
     * then sync it to Supabase presence so the simulator can see it!
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
        // This follows the exact same pattern as triggerRename!
        if (this.clientChannel && this.isSubscribed) {
            try {
                this.clientChannel.track({
                    clientId: this.clientId,
                    clientType: this.clientType,
                    clientName: this.anonymousName,
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
     * Command parser for speech-friendly input
     * Inspired by LLOGO's user-friendly synonym handling
     * 
     * Based on MIT LOGO (LLOGO) from the 1970s
     * Original LISP implementation by Seymour Papert, Cynthia Solomon, and the MIT LOGO team
     * 
     * The LLOGO parser accepted multiple variations of common responses,
     * treating the user with respect and understanding that there are many
     * valid ways to express the same idea. This philosophy is carried forward here.
     */
    parseCommand(input) {
        // Canonicalize input: lowercase, trim, remove punctuation
        const canonical = (input || '')
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:'"]/g, '') // Remove common punctuation
            .replace(/\s+/g, ' '); // Normalize whitespace
        
        this.logEvent('Command', `Parsing: "${input}" → "${canonical}"`);
        
        // Command synonym lists (inspired by LLOGO's ASK function)
        const COMMANDS = {
            // Debug mode activation
            debug: {
                synonyms: ['debug', 'sudo', 'xyzzy', 'plugh', 'admin', 'developer', 'dev mode', 'debug mode'],
                action: 'enableDebug'
            },
            
            // Reset view/navigation
            reset: {
                synonyms: ['reset', 'reset view', 'home', 'go home', 'center', 'origin', 'start'],
                action: 'resetView'
            },
            
            // Secret speech synthesis activation!
            speech: {
                synonyms: ['hal', 'speak', 'voice', 'hello computer', 'computer', 'engage voice', 'activate speech'],
                action: 'enableSpeech'
            },
            
            // Yes/No commands from MIT LOGO (LLOGO) circa 1970s
            // Original LISP code by MIT LOGO team (Papert, Solomon, et al.):
            // (DEFUN ASK NIL 
            //        ;;USER IS ASKED YES-NO QUESTION.  IT RETURNS T OR NIL.
            //        ...
            //        (COND ((MEMQ ANS '(YES Y T TRUE RIGHT)) (RETURN T))
            //              ((MEMQ ANS '(NO N NIL F FALSE WRONG)) (RETURN NIL))
            //              ((DPRINC '";PLEASE TYPE YES OR NO. ")
            //               (GO A))))))
            // Plus modern additions: 1 for true, 0 for false
            yes: {
                // EXACTLY matching LLOGO: '(YES Y T TRUE RIGHT) plus 1
                synonyms: ['yes', 'y', 't', 'true', 'right', '1'],
                action: 'confirmYes'
            },
            
            no: {
                // EXACTLY matching LLOGO: '(NO N NIL F FALSE WRONG) plus 0
                synonyms: ['no', 'n', 'nil', 'f', 'false', 'wrong', '0'],
                action: 'confirmNo'
            },
            
            // Help command
            help: {
                synonyms: ['help', 'what can i do', 'what can you do', 'commands', 'instructions', '?'],
                action: 'showHelp'
            }
        };
        
        // Check for debug mode parameters
        // Uses LLOGO boolean expressions for parameters
        let debugParam = null;
        const debugMatch = canonical.match(/^(debug|sudo|xyzzy|plugh)\s+(.+)$/);
        if (debugMatch) {
            const param = debugMatch[2];
            // Use LLOGO's exact boolean expressions
            // YES Y T TRUE RIGHT 1 = enable
            // NO N NIL F FALSE WRONG 0 = disable
            const isEnable = ['yes', 'y', 't', 'true', 'right', '1'].includes(param);
            const isDisable = ['no', 'n', 'nil', 'f', 'false', 'wrong', '0'].includes(param);
            
            if (isEnable || isDisable) {
                return {
                    command: 'debug',
                    action: 'enableDebug',
                    params: { enable: isEnable }
                };
            }
        }
        
        // Check for speech mode parameters
        const speechMatch = canonical.match(/^(hal|speak|voice|computer)\s+(.+)$/);
        if (speechMatch) {
            const param = speechMatch[2];
            const isEnable = ['yes', 'y', 't', 'true', 'right', '1'].includes(param);
            const isDisable = ['no', 'n', 'nil', 'f', 'false', 'wrong', '0'].includes(param);
            
            if (isEnable || isDisable) {
                return {
                    command: 'speech',
                    action: 'toggleSpeech',
                    params: { enable: isEnable }
                };
            }
        }
        
        // Find matching command
        for (const [cmdName, cmdDef] of Object.entries(COMMANDS)) {
            if (cmdDef.synonyms.some(syn => canonical === syn || canonical.startsWith(syn + ' '))) {
                return {
                    command: cmdName,
                    action: cmdDef.action,
                    params: {}
                };
            }
        }
        
        // No command found - treat as regular search
        return null;
    }
    
    /**
     * Execute a parsed command
     */
    executeCommand(parsedCommand) {
        if (!parsedCommand) return false;
        
        const { command, action, params } = parsedCommand;
        
        this.logEvent('Command', `Executing: ${action}`, params);
        
        // Play command feedback sound
        if (this.soundEnabled) {
            this.playSound(BaseController.SOUND_PATTERNS.SUCCESS);
        }
        
        switch (action) {
            case 'enableDebug':
                const enable = params.enable !== false; // Default to true
                if (enable) {
                    this.enableDebugMode();
                } else {
                    this.disableDebugMode();
                }
                break;
                
            case 'resetView':
                this.resetView();
                break;
                
            case 'confirmYes':
                this.handleConfirmation(true);
                break;
                
            case 'confirmNo':
                this.handleConfirmation(false);
                break;
                
            case 'showHelp':
                this.showHelp();
                break;
                
            case 'enableSpeech':
                this.enableSpeechSynthesis();
                break;
                
            case 'toggleSpeech':
                if (params.enable) {
                    this.enableSpeechSynthesis();
                } else {
                    this.disableSpeechSynthesis();
                }
                break;
                
            default:
                this.logEvent('Command', `Unknown action: ${action}`);
                return false;
        }
        
        return true;
    }
    
    /**
     * Enable debug mode with enhanced features
     */
    enableDebugMode() {
        this.debugModeEnabled = true;
        this.logEvent('Command', 'Debug mode ENABLED');
        
        // Update UI to show debug features
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
        }
        
        // Add debug tab if using unified controller
        if (this.addDebugTab) {
            this.addDebugTab();
        }
        
        // Announce if speech enabled
        if (this.speechEnabled) {
            this.speakText('Debug mode activated');
        }
        
        // Update debug overlay
        this.updateDebugOverlay();
    }
    
    /**
     * Disable debug mode
     */
    disableDebugMode() {
        this.debugModeEnabled = false;
        this.logEvent('Command', 'Debug mode DISABLED');
        
        // Hide debug features
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel && !BaseController.isDebugMode) {
            debugPanel.style.display = 'none';
        }
        
        // Remove debug tab if using unified controller
        if (this.removeDebugTab) {
            this.removeDebugTab();
        }
        
        // Announce if speech enabled
        if (this.speechEnabled) {
            this.speakText('Debug mode deactivated');
        }
    }
    
    /**
     * Enable speech synthesis via secret command
     * References: HAL 9000 from 2001: A Space Odyssey
     * and Star Trek IV's "Hello, computer" scene
     */
    enableSpeechSynthesis() {
        this.logEvent('Command', '🎤 SECRET SPEECH COMMAND ACTIVATED!');
        
        // Enable sound first (required for speech)
        if (!this.soundEnabled) {
            this.soundEnabled = true;
            this.initAudioContext();
            
            // Update sound button if it exists
            const soundToggleBtn = document.getElementById('sound-toggle');
            if (soundToggleBtn) {
                soundToggleBtn.innerHTML = "Stop<br/>Sound";
                soundToggleBtn.style.display = 'block'; // Reveal the secret button!
            }
        }
        
        // Enable speech
        this.speechEnabled = true;
        
        // Update speech button if it exists
        const speechToggleBtn = document.getElementById('speech-toggle');
        if (speechToggleBtn) {
            speechToggleBtn.innerHTML = "Stop<br/>Speech";
            speechToggleBtn.style.display = 'block'; // Reveal the secret button!
        }
        
        // Play activation sound
        if (this.soundEnabled) {
            this.playSound([
                { frequency: 440, duration: 100, type: 'sine' },
                { frequency: 880, duration: 150, type: 'sine' }
            ]);
        }
        
        // Announce activation with a fun message
        const greetings = [
            "Hello, Dave. I am now speaking.",
            "Speech synthesis activated. How may I assist you?",
            "Voice interface online. Welcome to SpaceCraft.",
            "Greetings, human. Speech mode engaged.",
            "I can speak! Try saying my name."
        ];
        
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        this.speakText(greeting);
        
        // Update debug overlay
        this.updateDebugOverlay();
    }
    
    /**
     * Disable speech synthesis via command
     */
    disableSpeechSynthesis() {
        this.logEvent('Command', 'Disabling speech synthesis');
        
        // Announce before disabling
        if (this.speechEnabled) {
            this.speakText('Speech synthesis deactivating. Goodbye.');
        }
        
        // Wait for speech to finish before disabling
        setTimeout(() => {
            this.speechEnabled = false;
            
            // Update speech button if it exists
            const speechToggleBtn = document.getElementById('speech-toggle');
            if (speechToggleBtn) {
                speechToggleBtn.innerHTML = "Start<br/>Speech";
                // Keep button visible once revealed
            }
            
            // Play deactivation sound
            if (this.soundEnabled) {
                this.playSound([
                    { frequency: 880, duration: 100, type: 'sine' },
                    { frequency: 440, duration: 150, type: 'sine' }
                ]);
            }
            
            this.updateDebugOverlay();
        }, 1500);
    }
    
    /**
     * Reset view to origin/home
     */
    resetView() {
        this.logEvent('Command', 'Resetting view to origin');
        
        // Send reset command to Unity
        if (this.clientChannel) {
            this.sendUpdate('reset_view', {});
        }
        
        // Announce if speech enabled
        if (this.speechEnabled) {
            this.speakText('View reset to origin');
        }
    }
    
    /**
     * Handle yes/no confirmations
     */
    handleConfirmation(isYes) {
        this.lastConfirmation = isYes;
        this.logEvent('Command', `Confirmation: ${isYes ? 'YES' : 'NO'}`);
        
        // Trigger any pending confirmation callbacks
        if (this.pendingConfirmation) {
            this.pendingConfirmation(isYes);
            this.pendingConfirmation = null;
        }
    }
    
    /**
     * Show help/available commands
     */
    showHelp() {
        const helpText = `
🎮 SECRET CHEAT COMMANDS 🎮

Magic words:
- "xyzzy" or "plugh" - Enable debug mode
- "hal" or "hello computer" - Activate speech synthesis
- "reset" or "home" - Reset view to origin

Debug commands:
- "debug yes/no" - Toggle debug mode
- "sudo t/f" - Another way to toggle debug
- "xyzzy 1/0" - Using numeric booleans

Boolean expressions (LOGO-style):
- YES: "yes", "y", "t", "true", "right", "1"
- NO: "no", "n", "nil", "f", "false", "wrong", "0"

Based on MIT LOGO's user-friendly boolean handling from the 1970s.
Try searching for special items too... you never know what you'll find!
        `.trim();
        
        this.logEvent('Command', 'Showing help');
        
        // Show help in UI if available
        if (this.showHelpUI) {
            this.showHelpUI(helpText);
        }
        
        // Speak help if enabled
        if (this.speechEnabled) {
            this.speakText('You have discovered the secret cheat commands! Try saying xyzzy for debug mode, or reset to go home.');
        }
    }
    
    /**
     * Initialize speech recognition (Web Speech API)
     */
    initSpeechRecognition() {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.logEvent('Speech', 'Web Speech API not supported in this browser');
            return false;
        }
        
        try {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            // Handle speech results
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Update search box with interim results for feedback
                const searchBox = document.getElementById('searchBox');
                if (searchBox) {
                    searchBox.value = finalTranscript || interimTranscript;
                    
                    // If we have a final result, process it
                    if (finalTranscript) {
                        this.logEvent('Speech', `Final transcript: "${finalTranscript}"`);
                        
                        // Trigger the search handler
                        const event = new Event('keyup');
                        searchBox.dispatchEvent(event);
                    }
                }
            };
            
            // Handle speech recognition errors
            this.recognition.onerror = (event) => {
                this.logEvent('Speech', `Recognition error: ${event.error}`);
                
                // Update button state
                const speechButton = document.getElementById('speechButton');
                if (speechButton) {
                    speechButton.textContent = '🎤';
                    speechButton.classList.remove('recording');
                }
                
                // Provide user feedback
                if (this.soundEnabled) {
                    this.playSound(BaseController.SOUND_PATTERNS.ERROR);
                }
                
                if (event.error === 'no-speech') {
                    if (this.speechEnabled) {
                        this.speakText('No speech detected. Please try again.');
                    }
                } else if (event.error === 'not-allowed') {
                    alert('Microphone access denied. Please enable microphone permissions.');
                }
            };
            
            // Handle speech end
            this.recognition.onend = () => {
                this.logEvent('Speech', 'Recognition ended');
                
                // Update button state
                const speechButton = document.getElementById('speechButton');
                if (speechButton) {
                    speechButton.textContent = '🎤';
                    speechButton.classList.remove('recording');
                }
            };
            
            this.logEvent('Speech', 'Speech recognition initialized');
            return true;
            
        } catch (e) {
            this.logEvent('Speech', 'Error initializing speech recognition:', e);
            return false;
        }
    }
    
    /**
     * Toggle speech recognition on/off
     */
    toggleSpeechRecognition() {
        if (!this.recognition) {
            if (!this.initSpeechRecognition()) {
                alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
                return;
            }
        }
        
        const speechButton = document.getElementById('speechButton');
        
        try {
            if (this.recognition && speechButton) {
                if (speechButton.classList.contains('recording')) {
                    // Stop recognition
                    this.recognition.stop();
                    this.logEvent('Speech', 'Stopping recognition');
                } else {
                    // Start recognition
                    this.recognition.start();
                    speechButton.textContent = '🔴';
                    speechButton.classList.add('recording');
                    this.logEvent('Speech', 'Starting recognition');
                    
                    // Play feedback sound
                    if (this.soundEnabled) {
                        this.playSound(BaseController.SOUND_PATTERNS.CLICK);
                    }
                }
            }
        } catch (e) {
            this.logEvent('Speech', 'Error toggling speech recognition:', e);
            
            // Reset button state
            if (speechButton) {
                speechButton.textContent = '🎤';
                speechButton.classList.remove('recording');
            }
        }
    }
    
    /**
     * Updates presence with current tilt data
     */
    updateTiltPresence() {
        if (!this.clientChannel || !this.isSubscribed) {
            return;
        }
        
        // Throttle updates to prevent spam - max 10 updates per second
        const now = Date.now();
        if (now - this.lastTiltUpdateTime < 100) { // 100ms minimum between updates
            return;
        }
        
        // Only update if values have changed significantly (more than 0.5 degrees)
        const tiltXChanged = Math.abs(this.currentTiltX - this.lastSentTiltX) > 0.5;
        const tiltZChanged = Math.abs(this.currentTiltZ - this.lastSentTiltZ) > 0.5;
        const enabledChanged = this.isTiltTransmitting !== (this.lastSentTiltX !== 0 || this.lastSentTiltZ !== 0);
        
        if (!tiltXChanged && !tiltZChanged && !enabledChanged) {
            return; // No significant change, skip update
        }
        
        try {
            // Log non-zero tilt updates
            if (this.isTiltTransmitting && (this.currentTiltX !== 0 || this.currentTiltZ !== 0)) {
                this.logEvent('Tilt', `Sending tilt update: X=${this.currentTiltX.toFixed(1)}° Z=${this.currentTiltZ.toFixed(1)}°`);
            }
            
            // Update presence with tilt data
            this.clientChannel.track({
                clientId: this.clientId,
                clientType: this.clientType,
                clientName: this.constructor.ANONYMOUS_NAME,
                screenId: this.currentScreenId,
                searchQuery: this.currentSearchQuery,
                tiltEnabled: this.isTiltTransmitting,
                tiltX: this.currentTiltX,
                tiltZ: this.currentTiltZ,
                onlineAt: new Date().toISOString()
            });
            
            // Update tracking variables
            this.lastTiltUpdateTime = now;
            this.lastSentTiltX = this.currentTiltX;
            this.lastSentTiltZ = this.currentTiltZ;
        } catch (err) {
            this.logEvent('Error', 'Error updating tilt presence:', err);
        }
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
     * Set up Navigator-specific UI elements
     */
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Navigator-specific UI');
        // No specific UI elements for navigator at this time
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
        ev.preventDefault(); 
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
        ev.preventDefault();
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
        ev.preventDefault();
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
     * Set up Selector-specific UI elements
     */
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Selector-specific UI');
        // No specific UI elements for selector at this time
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
            this.sendUpdate('select', { action: 'tap' });
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
            this.sendUpdate('select', { action: 'north' });
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
            this.sendUpdate('select', { action: 'south' });
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
            this.sendUpdate('select', { action: 'east' });
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
            this.sendUpdate('select', { action: 'west' });
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
            this.sendUpdate('select', { action: 'up' });
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
            this.sendUpdate('select', { action: 'down' });
        }
    }

};

/**
 * Inspector Controller - specializes in displaying item data
 */
window.InspectorController = class InspectorController extends BaseController {
    constructor() {
        super('inspector'); // Client type
        this.jsonOutputElement = null;
        this.iframeElement = null;
    }
    
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Inspector-specific UI');
        this.jsonOutputElement = document.getElementById('inspector-json-output');
        this.iframeElement = document.getElementById('inspector-iframe');
        
        if (!this.jsonOutputElement) {
            this.logEvent('Error', 'Inspector JSON output element not found!');
        }
    }
    
    // This method will be called when the selected item data changes
    selectedItemChanged(selectedItemJSON) {
        this.logEvent('Inspector', 'Received new selected item JSON:', selectedItemJSON);
        if (this.iframeElement) {
            if (selectedItemJSON) {
                // this.jsonOutputElement.innerHTML = JSON.stringify(selectedItemJSON)
                this.iframeElement.src = `https://archive.org/details/${selectedItemJSON['id']}`;
                this.jsonOutputElement.textContent = JSON.stringify(selectedItemJSON);
        } else {
                this.jsonOutputElement.textContent = 'No item currently selected.';
            }
        }
    }
};

/**
 * Abstract Tab class - base for all tab implementations
 */
window.Tab = class Tab {
    constructor(controller, tabId) {
        this.controller = controller;
        this.tabId = tabId;
        this.button = document.querySelector(`[data-tab="${tabId}"]`);
        this.pane = document.getElementById(`${tabId}-tab`);
        this.isActive = false;
        this.isInitialized = false;
    }
    
    /**
     * Initialize the tab (called once on first activation)
     */
    async initialize() {
        this.isInitialized = true;
    }
    
    /**
     * Activate the tab
     */
    async activate() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        this.isActive = true;
        this.button.classList.add('active');
        this.pane.classList.add('active');
        this.onActivate();
    }
    
    /**
     * Deactivate the tab
     */
    deactivate() {
        this.isActive = false;
        this.button.classList.remove('active');
        this.pane.classList.remove('active');
        this.onDeactivate();
    }
    
    /**
     * Called when tab becomes active - override in subclasses
     */
    onActivate() {}
    
    /**
     * Called when tab becomes inactive - override in subclasses
     */
    onDeactivate() {}
    
    /**
     * Update UI from controller state - override in subclasses
     */
    updateFromState() {}
};

/**
 * About Tab - Welcome and help information
 */
window.AboutTab = class AboutTab extends Tab {
    constructor(controller) {
        super(controller, 'about');
    }
    
    async initialize() {
        await super.initialize();
        
        // Set up ship name click handler
        const shipNameEl = this.pane.querySelector('#ship-name');
        if (shipNameEl) {
            shipNameEl.style.cursor = 'pointer';
            shipNameEl.addEventListener('click', () => {
                if (this.controller.soundEnabled) {
                    this.controller.playSound(BaseController.SOUND_PATTERNS.CLICK);
                }
                if (this.controller.speechEnabled) {
                    this.controller.sayWhoIAm();
                }
            });
        }
    }
    
    updateFromState() {
        const shipNameEl = this.pane.querySelector('#ship-name');
        if (shipNameEl) {
            shipNameEl.textContent = BaseController.ANONYMOUS_NAME;
        }
    }
};

/**
 * Navigate Tab - Pan and zoom controls
 */
window.NavigateTab = class NavigateTab extends Tab {
    constructor(controller) {
        super(controller, 'navigate');
        this.target = null;
        this.evCache = [];
        this.prevDiff = -1;
        this.prevX = 0;
        this.prevY = 0;
    }
    
    async initialize() {
        await super.initialize();
        
        this.target = this.pane.querySelector('#nav-target');
        if (!this.target) return;
        
        // Set up event handlers
        this.target.addEventListener('pointerdown', (ev) => this.handlePointerDown(ev));
        this.target.addEventListener('pointermove', (ev) => this.handlePointerMove(ev));
        this.target.addEventListener('pointerup', (ev) => this.handlePointerUp(ev));
        this.target.addEventListener('pointercancel', (ev) => this.handlePointerCancel(ev));
        this.target.addEventListener('wheel', (ev) => this.handleWheel(ev), { passive: false });
        
        // Set up search box
        const searchBox = this.pane.querySelector('#searchBox');
        if (searchBox) {
            searchBox.onkeyup = BaseController.debounce(() => {
                const inputValue = searchBox.value;
                const parsedCommand = this.controller.parseCommand(inputValue);
                
                if (parsedCommand) {
                    this.controller.executeCommand(parsedCommand);
                    searchBox.value = '';
                    this.controller.updateSearchQuery('');
                } else {
                    this.controller.updateSearchQuery(inputValue);
                }
            }, 100);
        }
    }
    
    updateFromState() {
        // Update ship name
        const shipNameEl = this.pane.querySelector('.ship-name-nav');
        if (shipNameEl) {
            shipNameEl.textContent = BaseController.ANONYMOUS_NAME;
        }
        
        // Update status
        const statusEl = this.pane.querySelector('#status');
        if (statusEl && this.controller.simulatorState) {
            statusEl.textContent = `Connected to: ${this.controller.simulatorState.clientName || 'Simulator'}`;
        }
    }
    
    handlePointerDown(ev) {
        if (!this.controller.isSubscribed) return;
        ev.target.setPointerCapture(ev.pointerId);
        this.evCache.push(ev);
        
        if (this.evCache.length === 1) {
            this.prevX = ev.clientX;
            this.prevY = ev.clientY;
        }
        if (this.evCache.length === 2) {
            this.prevDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);
        }
        
        if (this.controller.soundEnabled) {
            this.controller.playSound(BaseController.SOUND_PATTERNS.TOUCH);
        }
        ev.preventDefault();
    }
    
    handlePointerMove(ev) {
        if (!this.controller.isSubscribed || this.evCache.length === 0) return;
        
        const index = this.evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
        if (index === -1) return;
        this.evCache[index] = ev;
        
        if (this.evCache.length === 2) {
            // Pinch zoom
            const curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);
            if (this.prevDiff > 0) {
                const zoomDelta = (curDiff - this.prevDiff) * this.controller.pinchZoomSensitivity * this.controller.userZoomSensitivity * -1;
                this.controller.sendUpdate('zoom', { zoomDelta });
            }
            this.prevDiff = curDiff;
        } else if (this.evCache.length === 1) {
            // Panning
            const dx = ev.clientX - this.prevX;
            const dy = ev.clientY - this.prevY;
            const panXDelta = dx * this.controller.userPanSensitivity * 0.125;
            const panYDelta = dy * this.controller.userPanSensitivity * 0.125;
            if (Math.abs(panXDelta) > 0.001 || Math.abs(panYDelta) > 0.001) {
                this.controller.sendUpdate('pan', { panXDelta, panYDelta });
            }
            this.prevX = ev.clientX;
            this.prevY = ev.clientY;
        }
        ev.preventDefault();
    }
    
    handlePointerUp(ev) {
        if (!this.controller.isSubscribed) return;
        ev.target.releasePointerCapture(ev.pointerId);
        
        const index = this.evCache.findIndex(cachedEv => cachedEv.pointerId === ev.pointerId);
        if (index !== -1) {
            this.evCache.splice(index, 1);
        }
        
        if (this.evCache.length < 2) {
            this.prevDiff = -1;
        }
        if (this.evCache.length === 1) {
            this.prevX = this.evCache[0].clientX;
            this.prevY = this.evCache[0].clientY;
        }
        
        if (this.controller.soundEnabled) {
            this.controller.playSound(BaseController.SOUND_PATTERNS.RELEASE_TAP);
        }
        ev.preventDefault();
    }
    
    handlePointerCancel(ev) {
        this.handlePointerUp(ev);
    }
    
    handleWheel(ev) {
        if (!this.controller.isSubscribed) return;
        ev.preventDefault();
        
        const isTrackpadPinch = ev.ctrlKey;
        const sensitivity = isTrackpadPinch ? this.controller.trackpadZoomSensitivity : this.controller.wheelZoomSensitivity;
        const zoomDelta = ev.deltaY * sensitivity * this.controller.userZoomSensitivity;
        
        this.controller.sendUpdate('zoom', { zoomDelta });
    }
};

/**
 * Select Tab - Selection controls
 */
window.SelectTab = class SelectTab extends Tab {
    constructor(controller) {
        super(controller, 'select');
        this.target = null;
        this.pointerDown = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
    }
    
    async initialize() {
        await super.initialize();
        
        this.target = this.pane.querySelector('#sel-target');
        if (!this.target) return;
        
        // Set up event handlers
        this.target.addEventListener('pointerdown', (ev) => this.handlePointerDown(ev));
        this.target.addEventListener('pointermove', (ev) => this.handlePointerMove(ev));
        this.target.addEventListener('pointerup', (ev) => this.handlePointerUp(ev));
        this.target.addEventListener('pointercancel', (ev) => this.handlePointerCancel(ev));
    }
    
    updateFromState() {
        // Update ship name
        const shipNameEl = this.pane.querySelector('.ship-name-sel');
        if (shipNameEl) {
            shipNameEl.textContent = BaseController.ANONYMOUS_NAME;
        }
        
        // Update selected item info
        const selectedInfoEl = this.pane.querySelector('#selected-item-info');
        if (selectedInfoEl && this.controller.simulatorState && this.controller.simulatorState.selectedItem) {
            selectedInfoEl.textContent = this.controller.simulatorState.selectedItem.title || 'Unknown item';
        }
    }
    
    handlePointerDown(ev) {
        if (!this.controller.isSubscribed) return;
        
        this.pointerDown = true;
        this.touchStartX = ev.clientX;
        this.touchStartY = ev.clientY;
        
        ev.target.setPointerCapture(ev.pointerId);
        
        if (this.controller.soundEnabled) {
            this.controller.playSound(BaseController.SOUND_PATTERNS.TOUCH);
        }
        
        ev.preventDefault();
    }
    
    handlePointerMove(ev) {
        ev.preventDefault();
    }
    
    handlePointerUp(ev) {
        if (!this.controller.isSubscribed || !this.pointerDown) return;
        ev.target.releasePointerCapture(ev.pointerId);
        this.pointerDown = false;
        
        // Detect gesture
        const deltaX = ev.clientX - this.touchStartX;
        const deltaY = ev.clientY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        let gestureType = 'tap';
        let releaseSound = BaseController.SOUND_PATTERNS.RELEASE_TAP;
        
        if (distance > BaseController.INACTIVE_RADIUS) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    gestureType = 'east';
                    releaseSound = BaseController.SOUND_PATTERNS.RELEASE_EAST;
                } else {
                    gestureType = 'west';
                    releaseSound = BaseController.SOUND_PATTERNS.RELEASE_WEST;
                }
            } else {
                if (deltaY > 0) {
                    gestureType = 'south';
                    releaseSound = BaseController.SOUND_PATTERNS.RELEASE_SOUTH;
                } else {
                    gestureType = 'north';
                    releaseSound = BaseController.SOUND_PATTERNS.RELEASE_NORTH;
                }
            }
        }
        
        if (this.controller.soundEnabled) {
            this.controller.playSound(releaseSound);
        }
        
        this.controller.sendUpdate('select', { action: gestureType });
        
        ev.preventDefault();
    }
    
    handlePointerCancel(ev) {
        this.handlePointerUp(ev);
    }
};

/**
 * Inspect Tab - Item inspection
 */
window.InspectTab = class InspectTab extends Tab {
    constructor(controller) {
        super(controller, 'inspect');
    }
    
    updateFromState() {
        if (!this.controller.simulatorState || !this.controller.simulatorState.selectedItem) return;
        
        const item = this.controller.simulatorState.selectedItem;
        const iframe = this.pane.querySelector('#inspector-iframe');
        const jsonOutput = this.pane.querySelector('#inspector-json-output');
        
        if (iframe && item.id) {
            iframe.src = `https://archive.org/details/${item.id}`;
        }
        
        if (jsonOutput) {
            jsonOutput.textContent = JSON.stringify(item, null, 2);
        }
    }
};

/**
 * Adjust Tab - Settings controls
 */
window.AdjustTab = class AdjustTab extends Tab {
    constructor(controller) {
        super(controller, 'adjust');
    }
    
    async initialize() {
        await super.initialize();
        
        // Pan sensitivity
        const panSlider = this.pane.querySelector('#pan-sensitivity');
        const panValue = this.pane.querySelector('#pan-value');
        if (panSlider && panValue) {
            panSlider.value = this.controller.userPanSensitivity;
            panValue.textContent = this.controller.userPanSensitivity.toFixed(1);
            
            panSlider.addEventListener('input', (e) => {
                this.controller.userPanSensitivity = parseFloat(e.target.value);
                panValue.textContent = this.controller.userPanSensitivity.toFixed(1);
                
                if (this.controller.soundEnabled) {
                    this.controller.playSound(BaseController.SOUND_PATTERNS.CLICK);
                }
            });
        }
        
        // Zoom sensitivity
        const zoomSlider = this.pane.querySelector('#zoom-sensitivity');
        const zoomValue = this.pane.querySelector('#zoom-value');
        if (zoomSlider && zoomValue) {
            zoomSlider.value = this.controller.userZoomSensitivity;
            zoomValue.textContent = this.controller.userZoomSensitivity.toFixed(1);
            
            zoomSlider.addEventListener('input', (e) => {
                this.controller.userZoomSensitivity = parseFloat(e.target.value);
                zoomValue.textContent = this.controller.userZoomSensitivity.toFixed(1);
                
                if (this.controller.soundEnabled) {
                    this.controller.playSound(BaseController.SOUND_PATTERNS.CLICK);
                }
            });
        }
        
        // Theme select
        const themeSelect = this.pane.querySelector('#theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.controller.logEvent('Settings', `Theme changed to ${e.target.value}`);
                // TODO: Implement theme switching
                
                if (this.controller.soundEnabled) {
                    this.controller.playSound(BaseController.SOUND_PATTERNS.CLICK);
                }
            });
        }
        
        // Debug panel toggle
        const debugToggle = this.pane.querySelector('#show-debug');
        if (debugToggle) {
            debugToggle.checked = BaseController.isDebugMode || this.controller.debugModeEnabled;
            debugToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.controller.enableDebugMode();
                } else {
                    this.controller.disableDebugMode();
                }
            });
        }
    }
};

/**
 * Unified Controller - manages tabs and delegates to BaseController functionality
 */
window.UnifiedController = class UnifiedController extends BaseController {
    constructor() {
        super('unified');
        
        // Tab management
        this.tabs = {};
        this.currentTab = null;
        
        // Override targetElement since we don't use a single target
        this.targetElement = document.createElement('div');
        this.targetElement.id = 'unified-target';
    }
    
    /**
     * Initialize the unified controller
     */
    initialize() {
        // Initialize base controller without page handlers
        super.initialize(true);
        
        // Create tab instances
        this.tabs = {
            about: new AboutTab(this),
            navigate: new NavigateTab(this),
            select: new SelectTab(this),
            inspect: new InspectTab(this),
            adjust: new AdjustTab(this)
        };
        
        // Set up tab switching
        this.setupTabSwitching();
        
        // Activate default tab
        this.switchTab('about');
        
        // Initialize connection
        return this.initializeControllerConnection();
    }
    
    /**
     * Set up tab button click handlers
     */
    setupTabSwitching() {
        Object.values(this.tabs).forEach(tab => {
            if (tab.button) {
                tab.button.addEventListener('click', () => {
                    this.switchTab(tab.tabId);
                });
            }
        });
    }
    
    /**
     * Switch to a different tab
     */
    async switchTab(tabId) {
        const newTab = this.tabs[tabId];
        if (!newTab || newTab === this.currentTab) return;
        
        this.logEvent('Tabs', `Switching to ${tabId}`);
        
        // Play tab switch sound
        if (this.soundEnabled) {
            this.playSound(BaseController.SOUND_PATTERNS.CLICK);
        }
        
        // Deactivate current tab
        if (this.currentTab) {
            this.currentTab.deactivate();
        }
        
        // Activate new tab
        this.currentTab = newTab;
        await this.currentTab.activate();
        
        // Announce tab change if speech enabled
        if (this.speechEnabled) {
            this.speakText(`${tabId} tab`);
        }
    }
    
    /**
     * Override setupControllerSpecificUI to update all tabs
     */
    setupControllerSpecificUI() {
        this.logEvent('Init', 'Setting up Unified-specific UI');
        
        // Let each tab update its UI
        Object.values(this.tabs).forEach(tab => {
            tab.updateFromState();
        });
    }
    
    /**
     * Override updateUIFromState to update all tabs
     */
    updateUIFromState() {
        // Let each tab update from current state
        Object.values(this.tabs).forEach(tab => {
            tab.updateFromState();
        });
        
        // Update debug panel
        this.updateDebugOverlay();
    }
    
    /**
     * Add static debounce utility to BaseController
     */
    static debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
};

// Add debounce to BaseController as a static method
BaseController.debounce = UnifiedController.debounce;

// Simple initialization on DOM ready - directly instantiates the right controller
document.addEventListener('DOMContentLoaded', function() {
    
    // Get controller type from meta tag
    const metaTag = document.querySelector('meta[name="controller-type"]');
    if (!metaTag) {
        console.error('Missing controller type meta tag. Add <meta name="controller-type" content="navigator|selector"> to the page.');
        return;
    }
    
    const controllerType = metaTag.getAttribute('content');
    
    // Create the appropriate controller based on the page type and assign to controller variable
    let controller;
    if (controllerType === 'navigator') {
        controller = new NavigatorController();
        controller.initialize();
    } else if (controllerType === 'selector') {
        controller = new SelectorController();
        controller.initialize();
    } else if (controllerType === 'inspector') { // ADD THIS BLOCK
        controller = new InspectorController();
        controller.initialize(true);
    } else if (controllerType === 'unified') {
        controller = new UnifiedController();
        controller.initialize();
    } else {
        console.error('Invalid controller type: ' + controllerType);
        return;
    }
    
    // Make controller globally accessible
    window.controller = controller;
});

