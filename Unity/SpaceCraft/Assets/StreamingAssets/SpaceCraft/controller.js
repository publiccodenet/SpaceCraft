// controller.js - Shared JavaScript utilities and setup for SpaceCraft controller pages
// (e.g., navigator.html, selector.html)

/**
 * =============================================================================
 *                       Message and Event Documentation
 * =============================================================================
 * This section documents all messages exchanged between controllers and Unity
 * via Bridge and Supabase to facilitate remote control and data synchronization.
 *
 * --- EVENTS SENT FROM CONTROLLERS TO UNITY (via Supabase broadcasts) ---
 * 'pan': Sent by navigator or selector during movement
 *    - Navigator: {controllerId, controllerType, controllerName, panXDelta, panYDelta}
 *    - Selector: {controllerId, controllerType, controllerName, selectXDelta, selectYDelta}
 *    - Sent during pointer movement, tilt detection
 *
 * 'zoom': Sent by navigator during zoom gestures
 *    - {controllerId, controllerType, controllerName, zoomDelta}
 *    - Sent during pinch/zoom gestures, mousewheel, trackpad gestures
 *
 * 'select': Sent by selector for selection actions
 *    - {controllerId, controllerType, controllerName, action}
 *    - action can be "tap" or directional ("north","south","east","west","up","down")
 *    - Sent during tap, swipe, or shake gestures
 *
 * 'RenameRequest': Sent when controller requests a name change
 *    - {controllerId, controllerType, controllerName, newName, direction}
 *    - direction can be "next" or "previous"
 *    - Triggered by rename button or gesture
 *
 * --- EVENTS RECEIVED FROM UNITY (via Supabase broadcasts) ---
 * 'contentUpdate': Received when joining or when content changes
 *    - {content: contentData}
 *    - Contains all data about collections and items
 * 'currentItemIdUpdated': Received when current item changes in Unity
 *    - {currentItemId: string}
 *    - Allows controllers to highlight/focus the currently selected item
 *
 * --- STATE TRACKED IN SPACECRAFT.JS ---
 * In the main application, these states are maintained:
 * - currentCollectionId: Tracks which collection is currently active
 * - highlightedItemIds: Array of all currently highlighted item IDs
 * - selectedItemIds: Array of all currently selected item IDs
 * Controller actions can affect these states through the events mentioned above
 *
 * --- PRESENCE TRACKING (via Supabase) ---
 * Controllers track presence with:
 *    - controllerId: Unique identifier for the controller
 *    - controllerType: "navigator" or "selector"
 *    - controllerName: User-friendly ship name
 *    - onlineAt: Timestamp of connection
 *
 * Controllers receive presence events:
 * 'presence' { event: 'sync' }: Full state of all connected controllers
 * 'presence' { event: 'join' }: New controller has connected
 * 'presence' { event: 'leave' }: Controller has disconnected
 *
 * --- GESTURE DETECTION ---
 * Controllers detect gestures and convert them to appropriate events:
 * - Tap: Triggers 'select' with action='tap'
 * - Swipe: Directional movement as 'select' with action=direction
 * - Shake: Directional acceleration as 'select' with action=direction
 * - Tilt: Continuous values sent as 'pan' deltas
 * - Pinch/Zoom: Continuous values sent as 'zoom' deltas
 * =============================================================================
 */

/**
 * Base Controller class that provides common functionality for all controller types
 */
window.BaseController = class BaseController {
    
    // API constants
    static SUPABASE_URL = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
    static SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
    static CONTROLLER_CHANNEL_NAME = 'controllers';

    // Permission constants
    static PERMISSION_CONNECTION = 'connection';
    static PERMISSION_MOTION = 'motion';
    
    // Storage key constants
    static CURRENT_NAME_KEY = 'shipName';
    static NAME_HISTORY_KEY = 'nameHistory';  
    static NAME_INDEX_KEY = 'nameIndex';
    
    // Shake detection constants
    static SHAKE_THRESHOLD = 15; // Acceleration threshold for shake detection WITHOUT gravity (m/s²)
    static SHAKE_IMPULSE_THRESHOLD = 5; // Lower threshold to detect initial impulse
    static SHAKE_DEBOUNCE_TIME_MS = 500; // Min time between shakes
    static SHAKE_DIRECTION_THRESHOLD = 8; // Threshold to determine direction (m/s²)
    static IMPULSE_MAX_DURATION_MS = 300; // Max time to consider part of the same impulse
    
    // Debug mode
    static isDebugMode = (new URLSearchParams(window.location.search)).get('debug') === 'true';
    
    // Sound categories
    static SOUND_CATEGORIES = {
        TOUCH: 'touch',      // Touch down sounds
        RELEASE: 'release',  // Touch release sounds
        FEEDBACK: 'feedback', // Feedback sounds (success, error)
        UI: 'ui',            // Button clicks
        EVENT: 'event'       // Join/leave, rename
    };
    
    // Global volume control
    static OVERALL_VOLUME = 0.25;
    
    // List of Fun Astronomical & Sci-Fi Names
    static funNameList = [
        // Solar System Planets & Moons
        'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus',
        'Neptune', 'Pluto', 'Luna', 'Io', 'Europa', 'Ganymede', 'Callisto',
        'Titan', 'Enceladus', 'Triton', 'Charon',

        // Well-Known Stars
        'Sol', 'Proxima Centauri', 'Alpha Centauri', 'Sirius', 'Vega',
        'Betelgeuse', 'Rigel', 'Polaris', 'Antares', 'Arcturus',
        'Capella', 'Aldebaran', 'Spica', 'Altair', 'Deneb',
        'Fomalhaut', 'Procyon', 'Achernar', 'Castor', 'Pollux',

        // Famous Nebulae & Galaxies
        'Andromeda Galaxy', 'Milky Way', 'Orion Nebula', 'Crab Nebula',
        'Eagle Nebula', 'Pillars of Creation', 'Horsehead Nebula',
        'Triangulum Galaxy', 'Whirlpool Galaxy', 'Sombrero Galaxy',
        'Cat\'s Eye Nebula', 'Boomerang Nebula', 'Ring Nebula',
        'Hourglass Nebula', 'Helix Nebula', 'Butterfly Nebula',
        
        // Star Trek Planets & Locations
        'Vulcan', 'Kronos', 'Romulus', 'Bajor', 'Risa', 'Betazed', 'Andoria',
        'Deep Space 9', 'Starbase 1', 'Guardian of Forever',

        // Star Trek Ships
        'USS Enterprise', 'USS Voyager', 'USS Defiant', 'USS Excelsior',
        'USS Stargazer', 'Bird-of-Prey',

        // Star Wars Planets & Moons
        'Tatooine', 'Hoth', 'Endor', 'Dagobah', 'Naboo', 'Coruscant',
        'Bespin', 'Kamino', 'Alderaan', 'Yavin 4', 'Kashyyyk', 'Mandalore',

        // Star Wars Ships & Stations
        'Millennium Falcon', 'X-Wing', 'TIE Fighter', 'Star Destroyer',
        'Death Star', 'Tantive IV', 'Home One',
        'Lambda Shuttle', 'Sandcrawler', 'Sail Barge',

        // Iain M. Banks' Culture Ships
        'Clear Air Turbulence', 'Limiting Factor', 'Just Read The Instructions',
        'Of Course I Still Love You', 'Sleeper Service', 'Grey Area',
        'Attitude Adjuster', 'Congenital Optimist', 'Size Isn\'t Everything',
        'Ethics Gradient', 'Just Testing', 'Frank Exchange Of Views',
        'No Fixed Abode', 'Very Little Gravitas Indeed',
        'Experiencing A Significant Gravitas Shortfall',
        'Sense Amid Madness, Wit Amidst Folly',
        'Falling Outside the Normal Moral Constraints',
        
        // More Culture Ships - Excellent for "I am..."
        'Serious Callers Only', 'Unfortunate Conflict Of Evidence',
        'Wisdom Like Silence', 'Zero Gravitas', 'Problem Child',
        'Unacceptable Behaviour', 'Honest Mistake', 'Fate Amenable To Change',
        'Jaundiced Outlook', 'Recent Convert', 'Yawning Angel',
        'Gunboat Diplomat', 'Ultimate Ship The Second', 'Kiss The Blade',
        'Boo!', 'Dramatic Exit', 'Awkward Customer', 'Reformed Nice Guy',
        'Now Look What You\'ve Made Me Do', 'Kiss This Then',
        'Different Tan', 'Sweet and Full of Grace',
        'Well I Was In The Neighbourhood',
        'Lapsed Pacifist', 'You\'ll Thank Me Later', 'Perfidy',
        'Synchronize Your Dogmas', 'God Told Me To Do It',
        'Just Another Victim Of The Ambient Morality',
        'Advanced Case Of Chronic Patheticism',
        'Don\'t Try This At Home', 'You Naughty Monsters',
        'It\'s My Party And I\'ll Sing If I Want To',
        'Lightly Seared On The Reality Grill',
        'Now We Try It My Way', 'Pure Big Mad Boat Man',
        'You\'ll Clean That Up Before You Leave',
        'Total Internal Reflection', 'Fixed Grin',
        'Me, I\'m Counting', 'Inappropriate Response',
        'Helpless In The Face Of Your Beauty',
        'Not Wanted on Voyage', 'Credibility Problem',
        'Dramatic Exit, Or, Thank you And Goodnight',
        'Synchronize Your Dogmas',
        'The Precise Nature Of The Catastrophe',

        // Other Iconic Sci-Fi Planets
        'Arrakis', 'Dune', 'Solaris', 'Pandora', 'Magrathea', 'Cybertron',
        'Gallifrey', 'Terminus', 'Trantor',
        'Caprica', 'Kobol', 'Reach', 'Genesis', 'Hyperion', 'Terra Nova',
        'Serenity Valley',

        // Other Iconic Sci-Fi Ships, Stations & Entities
        'Serenity', 'Nostromo', 'Discovery One', 'HAL 9000', 'Valley Forge',
        'Battlestar Galactica', 'Pegasus', 'Rama', 'Heart of Gold', 'Red Dwarf',
        'White Star', 'Babylon 5', 'Ark', 'Axiom', 'Rocinante', 'Tycho Station',
        'Ceres Station', 'ISV Venture Star', 'Gunstar', 'TARDIS',
        'Swordfish II', 'Bebop', 'Planet Express Ship', 'Moya',
        'Ansible',
        
        // More Sci-Fi Ships
        'Sulaco', 'Pillar of Autumn', 'Galactica', 'Normandy',
        'Tempest', 'Hyperion', 'Icarus', 'Event Horizon', 'Prometheus',
        'Nostradamus', 'Andromeda Ascendant', 'Lewis and Clark',
        'Excalibur', 'Odyssey', 'Destiny', 'Lexx', 'The Liberator',
        'The Yamato', 'Thunderbird 5', 'Eagle Transporter',
        'Jupiter 2', 'Rodger Young', 'Colonial One', 'Time Machine',
        'FTL Scout Ship', 'Nebuchadnezzar', 'Borg Cube', 'Soyuz',
        
        // Famous Real Space Mission Names
        'Apollo', 'Voyager', 'Cassini', 'Hubble', 'Curiosity',
        'Perseverance', 'Pioneer', 'New Horizons', 'Sputnik',
        'Rosetta', 'Galileo', 'Opportunity', 'Chandrayaan',
        'Mariner', 'Viking', 'Columbia', 'Challenger', 'Discovery',
        'Enterprise', 'Atlantis', 'Endeavour', 'Skylab', 'Mir',
        'Venera', 'Vostok', 'Kepler', 'Herschel', 'Spitzer',
    ];
    
    // Sound patterns - defined inline to avoid circular reference issues
    static SOUND_PATTERNS = {
        CLICK: { frequency: 1200, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        SUCCESS: { frequency: 880, duration: 60, type: 'sine', fadeOut: true, category: this.SOUND_CATEGORIES.FEEDBACK },
        ERROR: { frequency: 220, duration: 150, type: 'square', category: this.SOUND_CATEGORIES.FEEDBACK },
        RENAME: [
            { frequency: 660, duration: 50, type: 'sine', category: this.SOUND_CATEGORIES.EVENT },
            { frequency: 880, duration: 60, type: 'sine', category: this.SOUND_CATEGORIES.EVENT }
        ],
        TILT_ON: { frequency: 440, duration: 75, type: 'triangle', fadeIn: true, category: this.SOUND_CATEGORIES.FEEDBACK },
        TILT_OFF: { frequency: 330, duration: 75, type: 'triangle', fadeOut: true, category: this.SOUND_CATEGORIES.FEEDBACK },
        JOIN: [
            { frequency: 660, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.EVENT },
            { frequency: 880, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.EVENT }
        ],
        LEAVE: [
            { frequency: 880, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.EVENT },
            { frequency: 660, duration: 75, type: 'sine', fadeOut: true, category: this.SOUND_CATEGORIES.EVENT }
        ],
        BUTTON_TILT: { frequency: 1320, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        BUTTON_SPEECH: { frequency: 1100, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        BUTTON_SOUND: { frequency: 980, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        BUTTON_RENAME: { frequency: 860, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        
        // Generic ON/OFF button sounds
        BUTTON_ON: { frequency: 1000, duration: 20, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        BUTTON_OFF: { frequency: 700, duration: 20, type: 'sine', category: this.SOUND_CATEGORIES.UI },
        
        // Touch interaction sounds
        TOUCH: { frequency: 600, duration: 15, type: 'sine', category: this.SOUND_CATEGORIES.TOUCH },
        RELEASE_TAP: { frequency: 700, duration: 15, type: 'sine', category: this.SOUND_CATEGORIES.RELEASE },
        RELEASE_SOUTH: { frequency: 800, duration: 15, type: 'sine', category: this.SOUND_CATEGORIES.RELEASE },
        RELEASE_EAST: { frequency: 900, duration: 15, type: 'sine', category: this.SOUND_CATEGORIES.RELEASE },
        RELEASE_WEST: { frequency: 1000, duration: 15, type: 'sine', category: this.SOUND_CATEGORIES.RELEASE },
        RELEASE_NORTH: { frequency: 1100, duration: 15, type: 'sine', category: this.SOUND_CATEGORIES.RELEASE },
        
        // Threshold detection sounds
        IMPULSE_TRIGGER: { frequency: 200, duration: 5, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
        SHAKE_CONFIRM: { frequency: 400, duration: 10, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
        
        // Directional shake sounds
        SHAKE_NORTH: [
            { frequency: 440, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
            { frequency: 660, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK }
        ],
        SHAKE_SOUTH: [
            { frequency: 660, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
            { frequency: 440, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK }
        ],
        SHAKE_EAST: [
            { frequency: 550, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
            { frequency: 880, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK }
        ],
        SHAKE_WEST: [
            { frequency: 880, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
            { frequency: 550, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK }
        ],
        SHAKE_UP: [
            { frequency: 880, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
            { frequency: 550, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK }
        ],
        SHAKE_DOWN: [
            { frequency: 550, duration: 30, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK },
            { frequency: 880, duration: 40, type: 'sine', category: this.SOUND_CATEGORIES.FEEDBACK }
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

    constructor(controllerType) {
        this.controllerType = controllerType;
        this.targetElement = null;
        this.shipNameElement = null;
        this.evCache = [];
        this.prevDiff = -1;
        this.prevX = 0;
        this.prevY = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.pointerDown = false;
        
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
            [this.constructor.PERMISSION_CONNECTION]: 'unknown',
            [this.constructor.PERMISSION_MOTION]: 'inactive'
        };
        
        // Controller state
        this.controllerId = this.generateControllerId();
        this.currentName = this.getOrGenerateShipName();
        this.controllerChannel = null;
        this.supabaseClient = null;
        this.isSubscribed = false;
        this.tiltingActive = false;
        
        // Name history - initialize with current name
        this.nameHistory = []; 
        this.currentNameIndex = -1;
        this.initializeNameHistory();
        
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
        
        this.logEvent('Init', `Controller created: ${this.controllerType}, ID: ${this.controllerId}, Name: ${this.currentName}`);
    }
    
    /**
     * Generates a random controller ID
     */
    generateControllerId() {
        return 'controller_' + Math.random().toString(36).substring(2, 10);
    }
    
    /**
     * Generates a random name from the funNameList
     */
    generateRandomName() {
        const randomIndex = Math.floor(Math.random() * this.constructor.funNameList.length);
        return this.constructor.funNameList[randomIndex];
    }
    
    /**
     * Gets or generates a ship name
     */
    getOrGenerateShipName() {
        // Try to load from localStorage first
        try {
            const savedName = localStorage.getItem(this.constructor.CURRENT_NAME_KEY);
            if (savedName) {
                this.logEvent('Name', `Loaded saved name: ${savedName}`);
                return savedName;
            }
        } catch (e) {
            this.logEvent('Storage', 'Error loading name from localStorage:', e);
        }
        
        // Generate a new name
        const newName = this.generateRandomName();
        
        try {
            localStorage.setItem(this.constructor.CURRENT_NAME_KEY, newName);
        } catch (e) {
            this.logEvent('Storage', 'Error loading name from localStorage:', e);
        }
        
        this.logEvent('Name', `Generated new name: ${newName}`);
        return newName;
    }
    
    /**
     * Saves the current name history to localStorage
     */
    saveNameHistory(nameHistory, currentNameIndex, currentName) {
        try {
            localStorage.setItem(this.constructor.NAME_HISTORY_KEY, JSON.stringify(nameHistory));
            localStorage.setItem(this.constructor.NAME_INDEX_KEY, currentNameIndex.toString());
            localStorage.setItem(this.constructor.CURRENT_NAME_KEY, currentName);
            this.logEvent('Storage', `Saved name history: ${nameHistory.length} items, current index: ${currentNameIndex}`);
        } catch (e) {
            this.logEvent('Storage', 'Error saving name history to localStorage:', e);
        }
    }
    
    /**
     * Initializes the name history
     */
    initializeNameHistory() {
        // Try to load from localStorage
        try {
            const savedHistory = localStorage.getItem(this.constructor.NAME_HISTORY_KEY);
            const savedIndex = localStorage.getItem(this.constructor.NAME_INDEX_KEY);
            
            if (savedHistory) {
                this.nameHistory = JSON.parse(savedHistory);
                this.currentNameIndex = parseInt(savedIndex || "0", 10);
                
                // Ensure the current name is set to the current index
                if (this.nameHistory.length > 0 && this.currentNameIndex >= 0 && this.currentNameIndex < this.nameHistory.length) {
                    this.currentName = this.nameHistory[this.currentNameIndex];
                    this.logEvent('Name', `Loaded name history: ${this.nameHistory.length} items, current index: ${this.currentNameIndex}, current name: ${this.currentName}`);
                    
                    // Update localStorage with current name
                    localStorage.setItem(this.constructor.CURRENT_NAME_KEY, this.currentName);
                } else {
                    // Reset index if it's invalid
                    this.currentNameIndex = this.nameHistory.length - 1;
                    if (this.currentNameIndex >= 0) {
                        this.currentName = this.nameHistory[this.currentNameIndex];
                        localStorage.setItem(this.constructor.CURRENT_NAME_KEY, this.currentName);
                    }
                }
            }
        } catch (e) {
            this.logEvent('Storage', 'Error loading name history from localStorage:', e);
        }
        
        // If no history yet, or it's empty, initialize with current name
        if (!this.nameHistory || this.nameHistory.length === 0) {
            this.nameHistory = [this.currentName];
            this.currentNameIndex = 0;
            this.saveNameHistory(this.nameHistory, this.currentNameIndex, this.currentName);
        }
    }
    
    /**
     * Initialize controller
     */
    initialize(targetElement) {
        this.targetElement = targetElement;
        
        // Set up event handlers
        this.setupPageEventHandlers();
        
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
        
        // Handle rename button
        if (renameBtn) {
            renameBtn.addEventListener('click', () => {
                this.logEvent('UI', 'Rename button clicked');
                
                // Play rename button click
                if (this.soundEnabled) {
                    this.playSound(BaseController.SOUND_PATTERNS.BUTTON_ON);
                }
                
                // Directly call the instance's triggerRename method
                this.logEvent('Rename', 'Triggering rename');
                this.triggerRename('next');
            });
            
            this.logEvent('Init', 'Rename button setup complete');
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
            if (this.channel) {
                this.channel.untrack().catch(err => {
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
        
        ev.preventDefault();
    }
    
    /**
     * Handle pointer move event - empty backstop for subclasses
     */
    handlePointerMove(ev) {
        // Backstop handler - does nothing in base class
        // Subclasses like NavigatorController will override
        if (!this.isSubscribed) return;
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
        if (!this.channel || !this.isSubscribed) {
            this.logEvent('Send', `Cannot send update (${eventType}), channel not ready`);
            return;
        }
        
        try {
            this.channel.send({
                type: 'broadcast',
                event: eventType,
                payload: {
                    controllerId: this.controllerId,
                    controllerType: this.controllerType,
                    controllerName: this.currentName,
                    ...payload
                }
            });
        } catch (err) {
            this.logEvent('Error', `Error sending ${eventType}:`, err);
        }
    }
    
    /**
     * Trigger a rename operation
     */
    triggerRename(direction = 'next') {
        this.logEvent('Rename', `Generating ${direction} name...`);
        
        // 1. Play rename sound locally (different sounds for up/down)
        if (this.soundEnabled) {
            if (direction === 'previous') {
                this.playSound(this.constructor.SOUND_PATTERNS.RENAME);
            } else {
                // Play the rename sound in reverse for "down" direction
                this.playSound([
                    this.constructor.SOUND_PATTERNS.RENAME[1],
                    this.constructor.SOUND_PATTERNS.RENAME[0]
                ]);
            }
        }
        
        // 2. Get a new name based on direction
        const oldName = this.currentName;
        
        if (direction === 'next') {
            // Going forward in history or generating new name
            if (this.currentNameIndex < this.nameHistory.length - 1) {
                // We have names ahead in history, use the next one
                this.currentNameIndex++;
                this.currentName = this.nameHistory[this.currentNameIndex];
                this.logEvent('Rename', `Moved next in name history to: ${this.currentName}`);
            } else {
                // Generate new name and add to history
                this.currentName = this.generateRandomName();
                this.nameHistory.push(this.currentName);
                this.currentNameIndex = this.nameHistory.length - 1;
                this.logEvent('Rename', `Moved next in name history and generated new name: ${this.currentName}`);
            }
        } else {
            // Going backward in history or generating new name at beginning
            if (this.currentNameIndex > 0) {
                // We have names before in history, use the previous one
                this.currentNameIndex--;
                this.currentName = this.nameHistory[this.currentNameIndex];
                this.logEvent('Rename', `Moved backward in name history to: ${this.currentName}`);
            } else {
                // Generate new name and prepend to history
                this.currentName = this.generateRandomName();
                this.nameHistory.unshift(this.currentName);
                // Keep current index at 0 since we prepended
                this.currentNameIndex = 0;
                this.logEvent('Rename', `Moved backward in name history and generated new name: ${this.currentName}`);
            }
        }
        
        // 3. Save the name history and current index to localStorage
        localStorage.setItem(this.constructor.CURRENT_NAME_KEY, this.currentName);
        localStorage.setItem(this.constructor.NAME_HISTORY_KEY, JSON.stringify(this.nameHistory));
        localStorage.setItem(this.constructor.NAME_INDEX_KEY, this.currentNameIndex.toString());
        
        // Update the ship name in the UI
        this.updateShipNameUI();
        
        // 4. ALWAYS announce the new name using speech - NO COOLDOWN
        if (this.speechEnabled) {
            // Force immediate announcement regardless of any other speech
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel(); // Cancel any current speech
            }
            
            // Announce with a tiny delay to ensure the cancel completes
            setTimeout(() => {
                this.sayWhoIAm();
            }, 50);
        }
        
        // 5. Update presence - use track with full object rather than trying to use setState
        try {
            if (this.channel) {
                // Update presence data with full object including updated name (camelCase only)
                this.channel.track({
                    controllerId: this.controllerId,
                    controllerType: this.controllerType,
                    controllerName: this.currentName,
                    onlineAt: new Date().toISOString() 
                });
                this.logEvent('Rename', 'Updated presence with track()');
            }
        } catch (err) {
            this.logEvent('Rename', 'Error updating presence:', err);
        }
        
        // 6. Send an event to the host/sim 
        this.sendUpdate('RenameRequest', { 
            newName: this.currentName,
            direction: direction
        });
        this.logEvent('Rename', 'Sent rename request to host');
        
        // 7. Update debug overlay
        this.updateDebugOverlay();
        
        this.logEvent('Rename', `Changed from '${oldName}' to '${this.currentName}'`);
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
            const connectionState = this.permissionStates[this.constructor.PERMISSION_CONNECTION] || 'unknown';
            const motionState = this.permissionStates[this.constructor.PERMISSION_MOTION] || 'inactive';
            
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
                    <div>Ship: <b>${this.currentName || 'unknown'}</b></div>
                    <div>Connection: ${connectionState} (${channelInfo})</div>
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
     * Announces controller/ship name using speech.
     */
    sayWhoIAm() {
        const nameToSpeak = this.currentName; // Use the instance's current name
        this.logEvent('Speech', `Attempting to announce name: ${nameToSpeak}`);
        
        if (!nameToSpeak) {
            this.logEvent('Speech', 'No name available to speak');
            return false;
        }
        
        // Ensure we cancel any existing speech first
        if (this.speechSynthesis && this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        
        // Wait a short moment to ensure speech system is ready
        setTimeout(() => {
            this.logEvent('Speech', `Speaking just the name: "${nameToSpeak}"`);
            const result = this.speakText(nameToSpeak, { rate: 1.0, pitch: 1.0 });
            
            if (!result) {
                this.logEvent('Speech', 'Failed to speak name');
            }
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
     * Saves name history state to localStorage - Now static, called via BaseController.saveNameHistory
     */
    // saveNameHistory() removed as it's now static

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
     * Initialize name history - Now static, called via BaseController.initializeNameHistory
     */
    // initializeNameHistory() removed as it's now static

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
            
            this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'inactive');
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
                        this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'granted');
                    } else {
                        // Permission denied
                        this.logEvent('Motion', 'iOS motion permission denied');
                        this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'denied');
                    }
                })
                .catch(error => {
                    this.logEvent('Motion', 'Error requesting iOS motion permission:', error);
                    this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'error');
                });
                
            return true; // We started the permission flow
        } else if (typeof DeviceMotionEvent !== 'undefined') {
            this.logEvent('Motion', 'DeviceMotion API available, starting listeners');
            // For non-iOS or older iOS, just try to start listening
            this.startMotionListeners(); // Use class method
            this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'granted');
            return true;
        } else {
            // Device motion not supported
            this.logEvent('Motion', 'DeviceMotion API not supported on this device');
            this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'unavailable');
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
            this.updatePermissionStatus(this.constructor.PERMISSION_MOTION, 'error');
        }
    }
    
    /**
     * Initializes the controller connection.
     */
    initializeControllerConnection() {
        this.logEvent('Init', 'Initializing controller connection');
        this.updatePermissionStatus(this.constructor.PERMISSION_CONNECTION, 'pending');

        // Check if necessary libraries are available
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            this.logEvent('Error', 'Supabase library missing');
            this.updatePermissionStatus(this.constructor.PERMISSION_CONNECTION, 'error');
            return false;
        }

        try {
            // Initialize audio context
            this.initAudioContext();
            
            // Create Supabase client and channel
            this.logEvent('Init', 'Creating Supabase client and channel');
            this.supabaseClient = supabase.createClient(this.constructor.SUPABASE_URL, this.constructor.SUPABASE_ANON_KEY);
            this.channel = this.supabaseClient.channel(this.constructor.CONTROLLER_CHANNEL_NAME, {
                config: {
                    presence: {
                        key: this.controllerId,
                    },
                },
            });

            // --- Presence Event Listeners ---
            this.channel
                .on('presence', { event: 'sync' }, () => {
                    const newState = this.channel.presenceState();
                    this.logEvent('Presence', `Sync with ${Object.keys(newState).length} peers`);
                    this.updateDebugOverlay();
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    this.logEvent('Presence', `Join event for key: ${key}`, newPresences);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    this.logEvent('Presence', `Leave event for key: ${key}`, leftPresences);
                })
                .subscribe(async (status, err) => {
                    this.logEvent('Channel', `Status: ${status}`);
                    if (status === 'SUBSCRIBED') {
                        const initialPresenceData = {
                            // Use only camelCase naming
                            controllerId: this.controllerId,
                            controllerType: this.controllerType,
                            controllerName: this.currentName,
                            onlineAt: new Date().toISOString()
                        };
                        this.logEvent('Channel', `Attempting to track presence for ${this.controllerId}`);
                        
                        // Set initial state - properly using track API with key option
                        const trackStatus = await this.channel.track(initialPresenceData);
                        this.logEvent('Channel', `Track result: ${trackStatus}`);

                        if (trackStatus === 'ok') {
                            this.isSubscribed = true;
                            this.updatePermissionStatus(this.constructor.PERMISSION_CONNECTION, 'granted');
                            this.logEvent('Init', 'Connection successful');
                            
                            // Update the ship name in the UI
                            this.updateShipNameUI();
                            
                            // Update debug display
                            this.updateDebugOverlay();

                            // Start motion tracking directly
                            this.requestAndStartMotionTracking();
                        } else {
                            this.logEvent('Channel', `Presence tracking failed: ${trackStatus}`);
                            this.updatePermissionStatus(this.constructor.PERMISSION_CONNECTION, 'error');
                        }
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        this.logEvent('Channel', `Error status: ${status}`, err);
                        this.updatePermissionStatus(this.constructor.PERMISSION_CONNECTION, 'error');
                        this.isSubscribed = false;
                    }
                });
            
            this.logEvent('Init', 'Connection initialization complete');
            return true;

        } catch (error) {
            this.logEvent('Init', 'Initialization error:', error);
            this.updatePermissionStatus(this.constructor.PERMISSION_CONNECTION, 'error');
            return false;
        }
    }

    // END MOVED CODE TO REWRITE TO BE OOP AND USE RIGHT REFERENCES

    /**
     * Updates the ship name in the UI with the current name
     */
    updateShipNameUI() {
        // Update document title
        document.title = `${this.controllerType.charAt(0).toUpperCase() + this.controllerType.slice(1)} - ${this.currentName}`;
        
        // Update the ship name element if it exists
        const shipNameElement = document.getElementById('ship-name');
        if (shipNameElement) {
            shipNameElement.textContent = this.currentName;
            this.logEvent('UI', `Updated ship name in UI to: ${this.currentName}`);
        }
        
        // Also update the status element if it exists
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'status connected';
        }
    }

    /**
     * Sets the global sound volume
     * @param {number} volume - Volume level from 0 to 1
     */
    setVolume(volume) {
        // Ensure volume is between 0 and 1
        const newVolume = Math.max(0, Math.min(1, volume));
        
        // Update the static property
        this.constructor.OVERALL_VOLUME = newVolume;
        
        this.logEvent('Sound', `Volume set to ${newVolume.toFixed(2)}`);
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem('soundVolume', newVolume.toString());
        } catch (e) {
            this.logEvent('Storage', 'Error saving volume to localStorage:', e);
        }
        
        // Play a test sound if enabled
        if (this.soundEnabled) {
            this.playSound(this.constructor.SOUND_PATTERNS.CLICK);
        }
        
        return newVolume;
    }
    
    /**
     * Initializes and loads the saved volume setting
     */
    initVolume() {
        try {
            const savedVolume = localStorage.getItem('soundVolume');
            if (savedVolume !== null) {
                const volume = parseFloat(savedVolume);
                if (!isNaN(volume)) {
                    this.constructor.OVERALL_VOLUME = Math.max(0, Math.min(1, volume));
                    this.logEvent('Sound', `Loaded saved volume: ${this.constructor.OVERALL_VOLUME.toFixed(2)}`);
                }
            }
        } catch (e) {
            this.logEvent('Storage', 'Error loading volume from localStorage:', e);
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
        super.handlePointerDown(ev);
        
        // Additional navigator-specific handling
        this.evCache.push(ev);
        if (this.evCache.length === 1) {
            this.prevX = ev.clientX;
            this.prevY = ev.clientY;
        }
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
        // Don't call super.handlePointerUp as it would trigger gesture detection
        // which causes the "jerking" movement
        if (!this.isSubscribed || !this.pointerDown) return;
        
        ev.target.releasePointerCapture(ev.pointerId);
        this.pointerDown = false;
        
        // Just clean up pointer tracking without triggering gestures
        this.removeEvent(ev);
        if (this.evCache.length < 2) {
            this.prevDiff = -1;
        }
        if (this.evCache.length === 0) {
            this.prevX = 0;
            this.prevY = 0;
        }
        
        // Play a simple release sound
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
            this.sendUpdate('zoom', { zoomDelta: -0.2 });
        }
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
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
        if (this.channel) {
            this.sendUpdate('select', { action: 'down' });
        }
    }

};

// Simple initialization on DOM ready - directly instantiates the right controller
document.addEventListener('DOMContentLoaded', function() {
    
    const targetElement = document.getElementById("target");
    if (!targetElement) {
        console.error('Target element not found');
        return;
    }
    
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
    } else if (controllerType === 'selector') {
        controller = new SelectorController();
} else {
        console.error('Invalid controller type: ' + controllerType);
        return;
    }
    
    // Initialize it directly - this sets everything up 
    // including event handling and motion tracking
    controller.initialize(targetElement);
    
    // Make controller globally accessible
    window.controller = controller;
});
