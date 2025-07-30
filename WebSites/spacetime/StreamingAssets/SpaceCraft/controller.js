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
 * =============================================================================
 *                         CONTROLLER-AS-SERVICE-PROVIDER ARCHITECTURE
 * =============================================================================
 * 
 * This implements a "kitchen sink" Controller class that provides ALL services:
 * - Supabase communication
 * - Audio/sound synthesis
 * - Motion detection 
 * - Search functionality
 * - Event handling
 * - State management
 * - Logging/debugging
 * 
 * Tabs are thin wrappers that compose Controller services as needed.
 * No inheritance hierarchy - just service composition.
 * =============================================================================
 */

/**
 * Single Controller class - Kitchen Sink Service Provider
 * Contains ALL services that tabs can mix and match.
 */
window.Controller = class Controller {
    
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

    constructor() {
        // === IDENTITY & CORE STATE ===
        this.clientType = 'controller'; // Always controller now - tabs determine behavior
        this.clientId = this.generateClientId();
        this.clientName = this.generateTimestampName();
        
        // === UI & INTERACTION STATE ===
        this.targetElement = null;
        this.evCache = [];
        this.prevDiff = -1;
        this.prevX = 0;
        this.prevY = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.pointerDown = false;
        
        // === SCREEN & SIMULATOR STATE ===
        this.currentScreenId = 'main';
        this.currentSimulatorId = null;
        this.simulatorState = null;
        
        // === MOTION DETECTION STATE ===
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
        
        // === MOTION EVENT HANDLERS (bound for removal) ===
        this.boundHandleDeviceMotion = (event) => this.handleDeviceMotion(event);
        this.boundHandleDeviceOrientation = (event) => this.handleDeviceOrientation(event);
        
        // === PERMISSION TRACKING ===
        this.permissionStates = {
            'connection': 'unknown',
            'motion': 'inactive'
        };
        
        // === CONNECTION STATE ===
        this.clientChannel = null;
        this.supabaseClient = null;
        this.isSubscribed = false;
        this.tiltingActive = false;
        
        // === SOUND & SPEECH SERVICES ===
        this.soundEnabled = false; 
        this.audioContext = null;
        this.currentGain = null;
        this.gainNode = null;
        this.speechQueue = [];
        this.speechEnabled = false;
        this.isSpeaking = false;
        
        // === TAB MANAGEMENT ===
        this.currentTab = null;
        this.tabs = {};
        
        // === DEBUG & LOGGING ===
        this.debugLog = [];
        this.maxDebugEntries = 100;
    }

    // === CLIENT ID & NAMING SERVICES ===
    
    generateClientId() {
        return 'ctrl_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateTimestampName() {
        const now = new Date();
        return `ctrl-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    }

    // === LOGGING & DEBUG SERVICES ===
    
    logEvent(category, message, extra = '') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${category}: ${message} ${extra}`;
        
        console.log(logEntry);
        
        this.debugLog.push({
            timestamp,
            category,
            message,
            extra
        });
        
        if (this.debugLog.length > this.maxDebugEntries) {
            this.debugLog.shift();
        }
        
        this.updateDebugDisplay();
    }
    
    updateDebugDisplay() {
        const debugContent = document.getElementById('debug-content');
        if (debugContent) {
            const recent = this.debugLog.slice(-20);
            debugContent.textContent = recent.map(entry => 
                `[${entry.timestamp}] ${entry.category}: ${entry.message} ${entry.extra}`
            ).join('\n');
        }
    }

    // === PERMISSION & STATUS SERVICES ===
    
    updatePermissionStatus(permission, status) {
        this.permissionStates[permission] = status;
        this.updateStatusDisplay();
    }
    
    updateStatusDisplay() {
        const statusElement = document.getElementById('status');
        if (!statusElement) return;
        
        const connection = this.permissionStates.connection;
        const motion = this.permissionStates.motion;
        
        let statusText = '';
        let className = 'status';
        
        if (connection === 'granted') {
            statusText = 'Connected';
            className += ' connected';
            
            if (motion === 'active') {
                statusText += ' + Motion';
                className += ' motion-active';
            } else if (motion === 'inactive') {
                statusText += ' (Motion inactive)';
            }
        } else if (connection === 'pending') {
            statusText = 'Connecting...';
            className += ' pending';
        } else if (connection === 'error') {
            statusText = 'Connection failed';
            className += ' error';
        } else {
            statusText = 'Not connected';
            className += ' disconnected';
        }
        
        statusElement.textContent = statusText;
        statusElement.className = className;
    }

    // === AUDIO SERVICES ===
    
    initAudioContext() {
        if (this.audioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0.3;
            
            this.logEvent('Audio', 'Audio context initialized');
        } catch (error) {
            this.logEvent('Audio', 'Failed to initialize audio context', error.message);
        }
    }
    
    playTone(frequency = 440, duration = 200, type = 'sine') {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const envelope = this.audioContext.createGain();
            
            oscillator.connect(envelope);
            envelope.connect(this.gainNode);
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            const now = this.audioContext.currentTime;
            envelope.gain.setValueAtTime(0, now);
            envelope.gain.linearRampToValueAtTime(0.3, now + 0.01);
            envelope.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
            
            oscillator.start(now);
            oscillator.stop(now + duration / 1000);
            
        } catch (error) {
            this.logEvent('Audio', 'Failed to play tone', error.message);
        }
    }

    // === SEARCH SERVICES ===
    
    createSearchField() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'search-input';
        searchInput.placeholder = 'Search...';
        searchInput.className = 'search-input';
        
        searchInput.addEventListener('input', (e) => {
            this.onSearchInput(e.target.value);
        });
        
        searchContainer.appendChild(searchInput);
        return searchContainer;
    }
    
    onSearchInput(query) {
        this.logEvent('Search', `Query: "${query}"`);
        // Tabs can override this or listen for search events
        this.broadcastEvent('search', { query });
    }

    // === COMMUNICATION SERVICES ===
    
    broadcastEvent(eventType, data) {
        if (!this.clientChannel || !this.currentSimulatorId) return;
        
        const message = {
            clientId: this.clientId,
            clientType: this.clientType,
            clientName: this.clientName,
            screenId: this.currentScreenId,
            targetSimulatorId: this.currentSimulatorId,
            ...data
        };
        
        this.clientChannel.send({
            type: 'broadcast',
            event: eventType,
            payload: message
        });
    }

    // === MOTION DETECTION SERVICES ===
    
    handleDeviceMotion(event) {
        if (!this.motionListenerActive) return;
        
        const accel = event.acceleration || { x: 0, y: 0, z: 0 };
        const accelG = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
        
        this.lastAccel = accel;
        this.lastAccelG = accelG;
        
        const magnitude = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
        this.lastMotionMagnitude = magnitude;
        
        // Detect shake
        if (magnitude > 15) {
            const now = Date.now();
            if (now - this.lastShakeTime > 500) {
                this.lastShakeTime = now;
                this.onShakeDetected(magnitude);
            }
        }
    }
    
    onShakeDetected(magnitude) {
        this.logEvent('Motion', `Shake detected: ${magnitude.toFixed(2)}`);
        this.playTone(800, 100);
        // Tabs can listen for shake events
        document.dispatchEvent(new CustomEvent('controller-shake', { detail: { magnitude } }));
    }

    // === EVENT HANDLING SERVICES ===
    
    setupPageEventHandlers() {
        if (!this.targetElement) return;
        
        // Touch events
        this.targetElement.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.targetElement.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        this.targetElement.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        this.targetElement.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
        
        // Mouse wheel for zoom
        this.targetElement.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        this.logEvent('Events', 'Page event handlers set up');
    }
    
    handlePointerDown(e) {
        this.evCache.push(e);
        this.pointerDown = true;
        this.prevX = e.clientX;
        this.prevY = e.clientY;
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        
        // Let active tab handle this
        if (this.currentTab && this.currentTab.onPointerDown) {
            this.currentTab.onPointerDown(e);
        }
    }
    
    handlePointerMove(e) {
        if (!this.pointerDown) return;
        
        const deltaX = e.clientX - this.prevX;
        const deltaY = e.clientY - this.prevY;
        
        this.prevX = e.clientX;
        this.prevY = e.clientY;
        
        // Let active tab handle this
        if (this.currentTab && this.currentTab.onPointerMove) {
            this.currentTab.onPointerMove(e, deltaX, deltaY);
        }
    }
    
    handlePointerUp(e) {
        this.pointerDown = false;
        this.evCache = [];
        
        // Check if this was a tap (small movement)
        const deltaX = e.clientX - this.touchStartX;
        const deltaY = e.clientY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < 10) {
            // This was a tap
            if (this.currentTab && this.currentTab.onTap) {
                this.currentTab.onTap(e);
            }
        }
        
        // Let active tab handle this
        if (this.currentTab && this.currentTab.onPointerUp) {
            this.currentTab.onPointerUp(e);
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        // Let active tab handle this
        if (this.currentTab && this.currentTab.onWheel) {
            this.currentTab.onWheel(e);
        }
    }

    // === BUTTON SERVICES ===
    
    setupButtons() {
        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => this.toggleSound());
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
        
        // Motion toggle
        const motionBtn = document.getElementById('motion-toggle');
        if (motionBtn) {
            motionBtn.addEventListener('click', () => this.toggleMotion());
        }
        
        // Other service buttons can be added here
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
        
        if (this.soundEnabled) {
            this.initAudioContext();
            this.playTone(600, 100);
        }
        
        this.logEvent('Audio', `Sound ${this.soundEnabled ? 'enabled' : 'disabled'}`);
    }
    
    toggleMotion() {
        if (this.motionListenerActive) {
            this.stopMotionDetection();
        } else {
            this.startMotionDetection();
        }
    }
    
    startMotionDetection() {
        if (this.motionListenerActive) return;
        
        window.addEventListener('devicemotion', this.boundHandleDeviceMotion);
        window.addEventListener('deviceorientation', this.boundHandleDeviceOrientation);
        
        this.motionListenerActive = true;
        this.updatePermissionStatus('motion', 'active');
        this.logEvent('Motion', 'Motion detection started');
    }
    
    stopMotionDetection() {
        if (!this.motionListenerActive) return;
        
        window.removeEventListener('devicemotion', this.boundHandleDeviceMotion);
        window.removeEventListener('deviceorientation', this.boundHandleDeviceOrientation);
        
        this.motionListenerActive = false;
        this.updatePermissionStatus('motion', 'inactive');
        this.logEvent('Motion', 'Motion detection stopped');
    }

    // === SUPABASE CONNECTION SERVICES ===
    
    async initializeConnection() {
        this.logEvent('Init', 'Initializing controller connection');
        this.updatePermissionStatus('connection', 'pending');

        if (typeof supabase === 'undefined' || !supabase.createClient) {
            this.logEvent('Error', 'Supabase library missing');
            this.updatePermissionStatus('connection', 'error');
            return false;
        }

        try {
            this.initAudioContext();
            
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

            // Set up event handlers
            this.clientChannel
                .on('presence', { event: 'sync' }, () => this.handlePresenceSync())
                .on('presence', { event: 'join' }, ({ key, newPresences }) => this.handlePresenceJoin(key, newPresences))
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => this.handlePresenceLeave(key, leftPresences))
                .on('broadcast', { event: 'simulator_takeover' }, ({ payload }) => this.handleSimulatorTakeover(payload));

            await this.clientChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    this.isSubscribed = true;
                    this.updatePermissionStatus('connection', 'granted');
                    this.logEvent('Connection', 'Subscribed to channel');
                    
                    // Track our presence
                    await this.clientChannel.track({
                        clientId: this.clientId,
                        clientType: this.clientType,
                        clientName: this.clientName,
                        startTime: Date.now()
                    });
                }
            });

            return true;
        } catch (error) {
            this.logEvent('Error', 'Connection failed', error.message);
            this.updatePermissionStatus('connection', 'error');
            return false;
        }
    }
    
    handlePresenceSync() {
        const state = this.clientChannel.presenceState();
        this.updateSimulatorState(state);
        this.logEvent('Presence', `Sync: ${Object.keys(state).length} clients`);
    }
    
    handlePresenceJoin(key, newPresences) {
        this.logEvent('Presence', `Join: ${key}`);
        const state = this.clientChannel.presenceState();
        this.updateSimulatorState(state);
    }
    
    handlePresenceLeave(key, leftPresences) {
        this.logEvent('Presence', `Leave: ${key}`);
        const state = this.clientChannel.presenceState();
        this.updateSimulatorState(state);
    }
    
    handleSimulatorTakeover(payload) {
        this.logEvent('Takeover', `New simulator: ${payload.newSimulatorId}`);
        this.currentSimulatorId = payload.newSimulatorId;
    }
    
    updateSimulatorState(presenceState) {
        // Find the most recent simulator
        let latestSimulator = null;
        let latestTime = 0;
        
        Object.values(presenceState).forEach(presences => {
            presences.forEach(presence => {
                if (presence.clientType === 'simulator' && presence.startTime > latestTime) {
                    latestSimulator = presence;
                    latestTime = presence.startTime;
                }
            });
        });
        
        if (latestSimulator && latestSimulator.clientId !== this.currentSimulatorId) {
            this.currentSimulatorId = latestSimulator.clientId;
            this.simulatorState = latestSimulator;
            this.logEvent('Simulator', `Attached to: ${this.currentSimulatorId}`);
        }
    }

    // === TAB MANAGEMENT SERVICES ===
    
    registerTab(tabId, tab) {
        this.tabs[tabId] = tab;
        this.logEvent('Tab', `Registered: ${tabId}`);
    }
    
    async switchToTab(tabId) {
        if (this.currentTab) {
            this.currentTab.deactivate();
        }
        
        const tab = this.tabs[tabId];
        if (tab) {
            await tab.activate();
            this.currentTab = tab;
            this.logEvent('Tab', `Switched to: ${tabId}`);
        }
    }

    // === DOM CREATION SERVICES ===
    
    createContainer() {
        const container = document.createElement('div');
        container.className = 'container';
        return container;
    }
    
    createTitle(text) {
        const title = document.createElement('h1');
        title.className = 'page-title';
        title.textContent = text;
        return title;
    }
    
    createInstructions(html) {
        const instructions = document.createElement('p');
        instructions.className = 'instructions';
        instructions.innerHTML = html;
        return instructions;
    }
    
    createStatus() {
        const status = document.createElement('div');
        status.id = 'status';
        status.className = 'status';
        status.textContent = 'Initializing...';
        return status;
    }
    
    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        
        const debugContent = document.createElement('pre');
        debugContent.id = 'debug-content';
        debugContent.textContent = 'Initializing...';
        debugPanel.appendChild(debugContent);
        
        return debugPanel;
    }
    
    createTargetDiv() {
        const targetDiv = document.createElement('div');
        targetDiv.id = 'target';
        return targetDiv;
    }

    // === INITIALIZATION SERVICE ===
    
    async initialize() {
        // Create target element if it doesn't exist
        let targetElement = document.getElementById("target");
        if (!targetElement) {
            targetElement = this.createTargetDiv();
            document.body.appendChild(targetElement);
        }
        this.targetElement = targetElement;
        
        // Set up event handlers
        this.setupPageEventHandlers();
        this.setupButtons();
        
        // Initialize connection
        await this.initializeConnection();
        
        this.logEvent('Init', 'Controller initialization complete');
        return true;
    }
};

/**
 * =============================================================================
 *                           ABSTRACT TAB BASE CLASS
 * =============================================================================
 */

/**
 * Abstract Tab base class - minimal interface for tabs
 * Tabs compose Controller services as needed
 */
window.Tab = class Tab {
    constructor(controller, tabId) {
        this.controller = controller; // Service provider
        this.tabId = tabId;
        this.isActive = false;
        this.isInitialized = false;
        
        // Find or create UI elements
        this.button = document.querySelector(`[data-tab="${tabId}"]`);
        this.pane = document.getElementById(`${tabId}-tab`);
        
        // Register with controller
        this.controller.registerTab(tabId, this);
    }
    
    // === ABSTRACT METHODS (implement in subclasses) ===
    async initialize() {
        // Override in subclasses
        this.isInitialized = true;
    }
    
    createContent() {
        // Override in subclasses to create tab content
        return document.createElement('div');
    }
    
    // === TAB LIFECYCLE ===
    async activate() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        this.isActive = true;
        
        if (this.pane) {
            this.pane.classList.add('active');
        }
        if (this.button) {
            this.button.classList.add('active');
        }
        
        this.onActivate();
    }
    
    deactivate() {
        this.isActive = false;
        
        if (this.pane) {
            this.pane.classList.remove('active');
        }
        if (this.button) {
            this.button.classList.remove('active');
        }
        
        this.onDeactivate();
    }
    
    // === EVENT HOOKS (override as needed) ===
    onActivate() {}
    onDeactivate() {}
    onPointerDown(e) {}
    onPointerMove(e, deltaX, deltaY) {}
    onPointerUp(e) {}
    onTap(e) {}
    onWheel(e) {}
    updateFromState() {}
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', function() {
    // Create single controller instance
    window.controller = new Controller();
    
    // For now, create a basic interface
    // TODO: Implement tab system
    const title = controller.createTitle('SpaceCraft Controller');
    const instructions = controller.createInstructions('<strong>Tab-based controller coming soon...</strong>');
    const status = controller.createStatus();
    const debugPanel = controller.createDebugPanel();
    
    const container = controller.createContainer();
    container.appendChild(title);
    container.appendChild(instructions);
    container.appendChild(status);
    
    document.body.appendChild(container);
    document.body.appendChild(debugPanel);
    
    // Initialize controller
    controller.initialize();
    
    console.log('Controller architecture refactored - single Controller class with Tab system ready');
});

/**
 * =============================================================================
 *                           CONCRETE TAB IMPLEMENTATIONS
 * =============================================================================
 */

/**
 * AboutTab - Welcome and help information
 * Demonstrates how tabs compose Controller services
 */
window.AboutTab = class AboutTab extends Tab {
    constructor(controller) {
        super(controller, 'about');
    }
    
    async initialize() {
        this.controller.logEvent('Tab', 'Initializing AboutTab');
        
        // Create our tab content
        const content = this.createContent();
        
        // Find or create our tab pane
        if (!this.pane) {
            this.pane = document.createElement('div');
            this.pane.id = 'about-tab';
            this.pane.className = 'tab-pane';
            document.body.appendChild(this.pane);
        }
        
        this.pane.appendChild(content);
        
        // Use controller's audio service for feedback
        this.controller.playTone(440, 100);
        
        await super.initialize();
    }
    
    createContent() {
        const content = document.createElement('div');
        content.className = 'about-content';
        
        // Use controller's DOM creation services
        const title = this.controller.createTitle('Welcome to SpaceCraft');
        title.style.color = '#4CAF50';
        
        const intro = document.createElement('div');
        intro.className = 'about-intro';
        intro.innerHTML = `
            <p><strong>🚀 SpaceCraft Controller</strong></p>
            <p>A unified controller with multiple interaction modes.</p>
        `;
        
        // Tab descriptions
        const tabsInfo = document.createElement('div');
        tabsInfo.className = 'tabs-info';
        tabsInfo.innerHTML = `
            <h3>Available Tabs:</h3>
            <div class="tab-list">
                <div class="tab-item">
                    <strong>📖 About</strong> - This welcome screen and help
                </div>
                <div class="tab-item">
                    <strong>🧭 Navigate</strong> - Pan and zoom controls
                </div>
                <div class="tab-item">
                    <strong>👆 Select</strong> - Item selection and gestures
                </div>
                <div class="tab-item">
                    <strong>🔍 Inspect</strong> - Item details and metadata
                </div>
                <div class="tab-item">
                    <strong>⚙️ Adjust</strong> - Settings and preferences
                </div>
            </div>
        `;
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.className = 'instructions';
        instructions.innerHTML = `
            <h3>How to Use:</h3>
            <ul>
                <li><strong>Switch Tabs:</strong> Click tab buttons to change modes</li>
                <li><strong>Touch & Gestures:</strong> Each tab responds to different gestures</li>
                <li><strong>Audio Feedback:</strong> Enable sound for interaction feedback</li>
                <li><strong>Motion Controls:</strong> Enable motion for shake gestures</li>
            </ul>
        `;
        
        // Status info using controller services
        const statusInfo = document.createElement('div');
        statusInfo.className = 'status-info';
        statusInfo.innerHTML = `
            <h3>Controller Status:</h3>
            <div id="about-status-details">
                <p>Connection: ${this.controller.permissionStates.connection}</p>
                <p>Motion: ${this.controller.permissionStates.motion}</p>
                <p>Sound: ${this.controller.soundEnabled ? 'enabled' : 'disabled'}</p>
                <p>Client ID: ${this.controller.clientId}</p>
            </div>
        `;
        
        // Controls
        const controls = document.createElement('div');
        controls.className = 'about-controls';
        
        const soundButton = document.createElement('button');
        soundButton.textContent = this.controller.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
        soundButton.addEventListener('click', () => {
            this.controller.toggleSound();
            soundButton.textContent = this.controller.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
            this.updateStatusInfo();
        });
        
        const motionButton = document.createElement('button');
        motionButton.textContent = this.controller.motionListenerActive ? '📱 Motion On' : '📱 Motion Off';
        motionButton.addEventListener('click', () => {
            this.controller.toggleMotion();
            motionButton.textContent = this.controller.motionListenerActive ? '📱 Motion On' : '📱 Motion Off';
            this.updateStatusInfo();
        });
        
        controls.appendChild(soundButton);
        controls.appendChild(motionButton);
        
        // Assemble content
        content.appendChild(title);
        content.appendChild(intro);
        content.appendChild(tabsInfo);
        content.appendChild(instructions);
        content.appendChild(statusInfo);
        content.appendChild(controls);
        
        return content;
    }
    
    updateStatusInfo() {
        const statusElement = document.getElementById('about-status-details');
        if (statusElement) {
            statusElement.innerHTML = `
                <p>Connection: ${this.controller.permissionStates.connection}</p>
                <p>Motion: ${this.controller.permissionStates.motion}</p>
                <p>Sound: ${this.controller.soundEnabled ? 'enabled' : 'disabled'}</p>
                <p>Client ID: ${this.controller.clientId}</p>
            `;
        }
    }
    
    onActivate() {
        this.controller.logEvent('Tab', 'AboutTab activated');
        this.updateStatusInfo(); // Refresh status when tab becomes active
    }
    
    onDeactivate() {
        this.controller.logEvent('Tab', 'AboutTab deactivated');
    }
    
    onTap(e) {
        // Use controller's audio service
        this.controller.playTone(600, 50);
        this.controller.logEvent('About', 'Tab tapped');
    }
};

// Create initial AboutTab to demonstrate the system
document.addEventListener('DOMContentLoaded', function() {
    // Override the previous simple initialization
    setTimeout(() => {
        // Clear existing content
        document.body.innerHTML = '';
        
        // Create controller
        window.controller = new Controller();
        
        // Create a simple tab bar
        const tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        tabBar.innerHTML = `
            <button class="tab-button active" data-tab="about">📖 About</button>
            <button class="tab-button" data-tab="navigate">🧭 Navigate</button>
            <button class="tab-button" data-tab="select">👆 Select</button>
            <button class="tab-button" data-tab="inspect">🔍 Inspect</button>
            <button class="tab-button" data-tab="adjust">⚙️ Adjust</button>
        `;
        
        // Add tab switching functionality
        tabBar.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                const tabId = e.target.dataset.tab;
                
                // Update button states
                tabBar.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // Switch tabs if implemented
                if (controller.switchToTab) {
                    controller.switchToTab(tabId);
                }
            }
        });
        
        document.body.appendChild(tabBar);
        
        // Create and initialize AboutTab
        const aboutTab = new AboutTab(controller);
        aboutTab.activate(); // Show about tab by default
        
        // Initialize controller
        controller.initialize();
        
        console.log('AboutTab demonstration ready - single Controller + Tab composition pattern working!');
    }, 100);
});

