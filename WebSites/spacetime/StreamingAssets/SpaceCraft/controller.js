// SpaceCraft Controller - Clean, Simple, Complete Implementation

import { AudioModule } from './audio.js';
import { LoggingModule } from './logging.js';
import { MotionModule } from './motion.js';
import { GestureService } from './gesture.js';

/**
 * Single Controller class - proper module usage, consistent naming, complete features
 */
export class Controller {
    // API Constants
    static supabaseUrl = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
    static supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
    static clientChannelName = 'spacecraft';
    static clientType = 'controller';
    static defaultTabId = 'about';
    
    // Interaction Constants
    static panSensitivity = 0.333;
    static zoomSensitivity = 0.008;
    static gestureThreshold = 20;

    constructor() {
        // Client Identity
        this.clientId = this.generateClientId();
        this.clientName = this.generateClientName();
        
        // Initialize modules
        this.loggingModule = new LoggingModule();
        this.audioModule = new AudioModule(this.loggingModule);
        this.motionModule = new MotionModule(this.loggingModule);
        this.gestureService = new GestureService(this.motionModule, this.loggingModule);
        
        // Tab Management  
        this.tabs = new Map();
        this.activeTabId = null;
        
        // UI Elements
        this.targetElement = null;
        this.contentArea = null;
        
        // Connection State
        this.supabaseClient = null;
        this.clientChannel = null;
        this.isConnected = false;
        this.currentSimulatorId = null;
        this.simulatorState = {
            selectedItem: null,
            currentCollectionItems: [],
            tags: [],
            magnets: []
        };
        
        // Search State
        this.currentSearchQuery = '';
        this.currentSearchGravity = 0.0; // -100 to 100 for gravity force modulation
        this.filteredItems = [];
        
        // Input State
        this.pointerStartX = 0;
        this.pointerStartY = 0;
        this.isDragging = false;
        
        console.log('Controller', `Created: ${this.clientId}`);
    }

    // === TAB MANAGEMENT ===
    
    registerTab(TabClass) {
        const tab = new TabClass(this);
        this.tabs.set(TabClass.tabId, tab);
        console.log('Tab', `Registered: ${TabClass.tabId}`);
    }

    showTab(tabId) {
        // Hide current tab
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            this.tabs.get(this.activeTabId).hide();
            const oldButton = document.querySelector(`[data-tab="${this.activeTabId}"]`);
            if (oldButton) oldButton.classList.remove('active');
        }
        
        // Show new tab
        if (this.tabs.has(tabId)) {
            this.tabs.get(tabId).show();
            this.activeTabId = tabId;
            const newButton = document.querySelector(`[data-tab="${tabId}"]`);
            if (newButton) newButton.classList.add('active');
            
            // Configure input target based on tab type
            this.configureInputTarget(tabId);
            
            // Update URL hash
            this.updateUrlHash(tabId);
            
            // Update presence state with current tab
            this.updatePresenceState();
        }
    }

    // === UI CREATION ===
    
    createUI() {
        this.createTabBar();
        this.createContentArea();
        this.createTargetElement();
        this.createAllTabContent();
        this.setupInputHandlers();
    }

    createTabBar() {
        const tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        
        this.tabs.forEach((tab, tabId) => {
            const button = document.createElement('button');
            button.className = 'tab-button';
            button.textContent = tab.constructor.tabLabel;
            button.dataset.tab = tabId;
            button.onclick = () => this.showTab(tabId);
            
            // Mark about tab as active by default
            if (tabId === Controller.defaultTabId) {
                button.classList.add('active');
            }
            
            tabBar.appendChild(button);
        });
        
        document.body.appendChild(tabBar);
    }

    createContentArea() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'tab-content-area';
        document.body.appendChild(this.contentArea);
    }

    createTargetElement() {
        this.targetElement = document.createElement('div');
        this.targetElement.id = 'target';
        this.targetElement.className = 'input-target';
        document.body.appendChild(this.targetElement); // Fullscreen overlay
    }

    createAllTabContent() {
        this.tabs.forEach((tab, tabId) => {
            tab.createContent();
            
            if (tab.contentElement) {
                tab.contentElement.className = `tab-content tab-content-${tabId}`;
                
                // Show about tab content by default, hide others
                if (tabId === Controller.defaultTabId) {
                    tab.contentElement.style.display = 'block';
                    this.activeTabId = tabId;
                } else {
                    tab.contentElement.style.display = 'none';
                }
                
                this.contentArea.appendChild(tab.contentElement);
            }
        });
    }

    // === INPUT HANDLING ===
    
    setupInputHandlers() {
        this.targetElement.onpointerdown = (e) => this.handlePointerDown(e);
        this.targetElement.onpointermove = (e) => this.handlePointerMove(e);
        this.targetElement.onpointerup = (e) => this.handlePointerUp(e);
        this.targetElement.onwheel = (e) => this.handleWheel(e);
        
        // Prevent mobile zoom/scroll
        document.ontouchstart = (e) => { if (e.touches.length > 1) e.preventDefault(); };
        document.ontouchmove = (e) => e.preventDefault();
    }
    
    configureInputTarget(tabId) {
        // Enable gesture capture for tabs that need it, disable for interactive tabs
        const gestureEnabledTabs = ['navigate', 'select'];
        
        if (gestureEnabledTabs.includes(tabId)) {
            this.targetElement.classList.add('gesture-active');
            console.log(`Controller: Enabled gesture capture for ${tabId} tab`);
        } else {
            this.targetElement.classList.remove('gesture-active');
            console.log(`Controller: Disabled gesture capture for ${tabId} tab`);
        }
    }

    handlePointerDown(e) {
        console.log('Controller: handlePointerDown called', e.clientX, e.clientY);
        if (!this.isConnected) return;
        
        this.pointerStartX = e.clientX;
        this.pointerStartY = e.clientY;
        this.isDragging = true;
        
        this.audioModule.playTouchSound();
        e.preventDefault();
    }

    handlePointerMove(e) {
        if (!this.isConnected || !this.isDragging) return;
        
        const deltaX = e.clientX - this.pointerStartX;
        const deltaY = e.clientY - this.pointerStartY;
        
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            // Only send pan events for NavigateTab - other tabs handle gestures on release
            if (this.activeTabId === 'navigate') {
                this.sendPanEvent(deltaX * Controller.panSensitivity, deltaY * Controller.panSensitivity);
                this.pointerStartX = e.clientX;
                this.pointerStartY = e.clientY;
            }
        }
    }

    handlePointerUp(e) {
        if (!this.isConnected) return;
        
        const deltaX = e.clientX - this.pointerStartX;
        const deltaY = e.clientY - this.pointerStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        let gestureType = 'tap';
        if (distance > Controller.gestureThreshold) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                gestureType = deltaX > 0 ? 'east' : 'west';
                } else {
                gestureType = deltaY > 0 ? 'south' : 'north';
            }
        }
        
        this.handleGesture(gestureType);
        this.isDragging = false;
    }

    handleWheel(e) {
        if (!this.isConnected) return;
        
        // Negate wheel sensitivity for select tab only
        const sensitivity = this.activeTabId === 'select' ? -Controller.zoomSensitivity : Controller.zoomSensitivity;
        const zoomDelta = -e.deltaY * sensitivity;
        this.sendZoomEvent(zoomDelta);
        e.preventDefault();
    }

    handleGesture(gestureType) {
        console.log(`Controller: handleGesture called with: ${gestureType}, activeTabId: ${this.activeTabId}`);
        const activeTab = this.tabs.get(this.activeTabId);
        if (activeTab && activeTab.handleGesture) {
            console.log(`Controller: Calling handleGesture on ${this.activeTabId} tab`);
            activeTab.handleGesture(gestureType);
        } else {
            console.log(`Controller: No handleGesture method on ${this.activeTabId} tab`);
        }
        
        // Use audio module for gesture sounds
        this.audioModule.playReleaseSound(gestureType);
    }

    // === UNITY COMMUNICATION ===
    
    sendPanEvent(deltaX, deltaY) {
        this.sendEventToSimulator('pan', { panXDelta: deltaX, panYDelta: deltaY });
    }

    sendZoomEvent(zoomDelta) {
        this.sendEventToSimulator('zoom', { zoomDelta });
    }

    sendSelectEvent(action) {
        this.sendEventToSimulator('select', { action });
    }

    sendAddMagnetEvent(magnetName) {
        this.sendEventToSimulator('AddMagnet', { magnetName });
    }

    sendDeleteMagnetEvent(magnetName) {
        this.sendEventToSimulator('DeleteMagnet', { magnetName });
    }

    sendPushMagnetEvent(magnetName, deltaX, deltaZ) {
        this.sendEventToSimulator('PushMagnet', { magnetName, deltaX, deltaZ });
    }
    
    sendPanEvent(deltaX, deltaY) {
        this.sendEventToSimulator('pan', { panXDelta: deltaX, panYDelta: deltaY });
    }
    
    sendSelectEvent(action) {
        this.sendEventToSimulator('select', { action });
    }

    sendEventToSimulator(eventType, data) {
        console.log(`Controller: sendEventToSimulator called - eventType: ${eventType}, data:`, data);
        console.log(`Controller: clientChannel exists: ${!!this.clientChannel}`);
        console.log(`Controller: currentSimulatorId: ${this.currentSimulatorId}`);
        
        if (!this.clientChannel) {
            console.error('Controller: Cannot send event - no client channel');
            return;
        }
        
        if (!this.currentSimulatorId) {
            console.error('Controller: Cannot send event - no current simulator ID');
            return;
        }

        const payload = {
            clientId: this.clientId,
            clientType: Controller.clientType,
            clientName: this.clientName,
            screenId: 'main',
            targetSimulatorId: this.currentSimulatorId,
            ...data
        };
        
        console.log(`Controller: Sending event '${eventType}' with payload:`, payload);
        
        this.clientChannel.send({
            type: 'broadcast',
            event: eventType,
            payload: payload
        }).then(() => {
            console.log(`Controller: Successfully sent event '${eventType}'`);
        }).catch(err => {
            console.error(`Controller: Error sending event '${eventType}':`, err);
            console.log('Error', `Send error: ${err}`);
        });
    }

    // === CONNECTION MANAGEMENT ===
    
    initializeConnection() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library missing!');
            console.log('Error', 'Supabase library missing');
                return;
            }
            
        try {
            const channelName = new URLSearchParams(window.location.search).get('channel') || Controller.clientChannelName;
            console.log(`Controller connecting to channel: ${channelName}`);
            
            this.supabaseClient = supabase.createClient(Controller.supabaseUrl, Controller.supabaseAnonKey);
            this.clientChannel = this.supabaseClient.channel(channelName, {
                config: { presence: { key: this.clientId } }
            });

            console.log('Controller: Setting up presence handlers and subscribing...');
            this.setupPresenceHandlers();
            this.subscribeToChannel();
            
            // Debug: Check presence state after a delay
            setTimeout(() => {
                const presenceState = this.clientChannel.presenceState();
                console.log('Controller: Current presence state after 2s:', presenceState);
                Object.entries(presenceState).forEach(([key, presence]) => {
                    presence.forEach(client => {
                        console.log(`Controller: Found client: ${client.clientId} (${client.clientType})`);
                    });
                });
            }, 2000);
            
        } catch (error) {
            console.error('Controller connection failed:', error);
            console.log('Error', 'Connection failed', error);
        }
    }

    setupPresenceHandlers() {
            this.clientChannel
                .on('presence', { event: 'sync' }, () => {
                    const presenceState = this.clientChannel.presenceState();
                const simulator = this.findLatestSimulator(presenceState);
                    if (simulator) {
                        this.currentSimulatorId = simulator.clientId;
                        this.updateSimulatorState(simulator);
                    console.log('Connection', 'Received simulator state update', {
                        simulatorId: simulator.clientId,
                        tags: simulator.tags?.length || 0,
                        magnets: simulator.magnets?.length || 0,
                        selectedItem: simulator.selectedItem?.title || 'none'
                    });
                }
            })
            .on('broadcast', { event: 'simulator_takeover' }, ({ payload }) => {
                this.currentSimulatorId = payload.newSimulatorId;
            });
    }

    subscribeToChannel() {
        this.clientChannel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                this.isConnected = true;
                await this.clientChannel.track({
                            clientId: this.clientId,
                    clientType: Controller.clientType,
                    clientName: this.clientName,
                    currentTabId: this.activeTabId,
                    startTime: Date.now()
                });
                console.log('Connection', 'Connected to simulator');
            }
        });
    }
    
    async updatePresenceState() {
        if (this.isConnected && this.clientChannel) {
            try {
                await this.clientChannel.track({
                clientId: this.clientId,
                    clientType: Controller.clientType,
                clientName: this.clientName,
                    currentTabId: this.activeTabId,
                    startTime: Date.now()
                });
                console.log('Connection', `Updated presence with tab: ${this.activeTabId}`);
            } catch (error) {
                console.log('Connection', `Failed to update presence: ${error.message}`);
            }
        }
    }

    findLatestSimulator(presenceState) {
        console.log('Controller: findLatestSimulator called with presence state:', presenceState);
        let latestSimulator = null;
        let latestStartTime = 0;

        Object.values(presenceState).forEach(presences => {
            presences.forEach(presence => {
                console.log(`Controller: Checking presence - clientType: ${presence.clientType}, startTime: ${presence.startTime}`);
                if (presence.clientType === 'simulator' && presence.startTime > latestStartTime) {
                    latestSimulator = presence;
                    latestStartTime = presence.startTime;
                    console.log('Controller: Found newer simulator:', presence.clientId);
                }
            });
        });

        console.log('Controller: Latest simulator found:', latestSimulator);
        return latestSimulator;
    }

    updateSimulatorState(simulator) {
        console.log('Controller: updateSimulatorState called with:', simulator);
        console.log('Controller: Full simulator object:', JSON.stringify(simulator, null, 2));
        
        // Access state from the 'shared' property where the simulator publishes it
        const simState = simulator.shared || {};
        console.log('Controller: Simulator shared state:', simState);
        console.log('Controller: Simulator tags:', simState.tags);
        console.log('Controller: Simulator magnets:', simState.magnets);
        console.log('Controller: Simulator selectedItem:', simState.selectedItem);
        
        this.simulatorState = {
            selectedItemIds: simState.selectedItemIds || [],
            highlightedItemIds: simState.highlightedItemIds || [],
            selectedItem: simState.selectedItem || null,
            highlightedItem: simState.highlightedItem || null,
            currentCollectionId: simState.currentCollectionId || null,
            currentCollection: simState.currentCollection || null,
            currentCollectionItems: simState.currentCollectionItems || [],
            tags: simState.tags || [],
            screenIds: simState.screenIds || [],
            currentScreenId: simState.currentScreenId || 'main',
            magnets: simState.magnets || []
        };
        
        console.log('Controller: Updated simulator state:', this.simulatorState);
        
        this.performSearch(); // Update search results when state changes
        
        // Notify ALL tabs of state changes, not just active tab
        let notifiedTabs = 0;
        this.tabs.forEach((tab, tabId) => {
            if (tab && tab.onSimulatorStateChange) {
                console.log(`Controller: Notifying tab '${tabId}' of state change`);
                tab.onSimulatorStateChange(this.simulatorState);
                notifiedTabs++;
            }
        });
        console.log(`Controller: Notified ${notifiedTabs} tabs of simulator state change`);
    }

    // === SEARCH IMPLEMENTATION ===
    
    setSearchQuery(query) {
        this.currentSearchQuery = query.trim().toLowerCase();
        this.performSearch();
    }
    
    setSearchGravity(gravity) {
        this.currentSearchGravity = Math.max(-100, Math.min(100, gravity));
        this.sendSearchToUnity();
    }
    
    setSearchQueryAndGravity(query, gravity) {
        this.currentSearchQuery = query.trim().toLowerCase();
        this.currentSearchGravity = Math.max(-100, Math.min(100, gravity));
        this.performSearch();
    }

    performSearch() {
        if (!this.simulatorState || !this.simulatorState.currentCollectionItems) {
            this.filteredItems = [];
            return;
        }
        
        const items = this.simulatorState.currentCollectionItems;
        const query = this.currentSearchQuery;
        
        if (!query) {
            this.filteredItems = items;
            return;
        }

        this.filteredItems = items.filter(item => {
            const searchText = [
                item.title || '',
                item.author || '',
                item.description || '',
                ...(item.tags || [])
            ].join(' ').toLowerCase();
            
            return searchText.includes(query);
        });

        console.log('Search', `"${query}" found ${this.filteredItems.length} items`);
        this.sendSearchToUnity();
    }
    
    sendSearchToUnity() {
        // Send both search query and gravity to Unity
        this.sendEvent('searchUpdate', {
            searchQuery: this.currentSearchQuery,
            searchGravity: this.currentSearchGravity
        });
        
        console.log('Search', `Sent to Unity: "${this.currentSearchQuery}" gravity=${this.currentSearchGravity}`);
    }

    getFilteredTags() {
        console.log('Controller.getFilteredTags() called');
        console.log('Current simulator state:', this.simulatorState);
        
        if (!this.simulatorState) {
            console.log('No simulator state available');
            console.log('Tags', 'No simulator state available');
            return [];
        }
        
        if (!this.simulatorState.tags) {
            console.log('No tags in simulator state, state keys:', Object.keys(this.simulatorState));
            console.log('Tags', 'No tags in simulator state');
            return [];
        }
        
        console.log('Tags available:', this.simulatorState.tags);
        console.log('Tags', `Available tags: ${this.simulatorState.tags.length}`);
        
        const query = this.currentSearchQuery;
        if (!query) {
            console.log('No search query, returning all tags:', this.simulatorState.tags);
            return this.simulatorState.tags;
        }
        
        const filtered = this.simulatorState.tags.filter(tag => 
            tag.toLowerCase().includes(query.toLowerCase())
        ).sort((a, b) => {
            // Tags starting with query come first
            const aStarts = a.toLowerCase().startsWith(query.toLowerCase());
            const bStarts = b.toLowerCase().startsWith(query.toLowerCase());
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
        });
        
        console.log('Filtered tags for query "' + query + '":', filtered);
        return filtered;
    }

    // === HIGH-LEVEL AUDIO INTERFACE ===
    
    toggleSound() {
        return this.audioModule.toggleSound();
    }

    // === URL HASH MANAGEMENT ===
    
    getTabFromUrl() {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            const tabId = hash.substring(1); // Remove the #
            // Validate that this is a registered tab
            if (this.tabs.has(tabId)) {
                return tabId;
            }
        }
        return null;
    }
    
    updateUrlHash(tabId) {
        // Only update hash if it's different to avoid triggering hashchange
        const currentHash = window.location.hash.substring(1);
        if (currentHash !== tabId) {
            // Use replaceState for default tab to keep URL clean
            if (tabId === Controller.defaultTabId) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
                console.log('Controller', `Cleared URL hash (default tab: ${tabId})`);
            } else {
                history.replaceState(null, '', `#${tabId}`);
                console.log('Controller', `Updated URL hash to: #${tabId}`);
            }
        }
    }

    // === INITIALIZATION ===
    
    initialize() {
        this.createUI();
        
        // Read initial tab from URL hash
        const initialTab = this.getTabFromUrl() || Controller.defaultTabId;
        console.log('Controller', `Initial tab from URL: ${initialTab}`);
        this.showTab(initialTab);
        
        // Listen for browser navigation (back/forward)
        window.addEventListener('hashchange', () => {
            const tabFromUrl = this.getTabFromUrl();
            if (tabFromUrl && tabFromUrl !== this.activeTabId) {
                console.log('Controller', `Hash changed to: ${tabFromUrl}`);
                this.showTab(tabFromUrl);
            }
        });
        
        this.initializeConnection();
        
        console.log('Controller', 'Initialized successfully');
    }

    // === UTILITIES ===
    
    generateClientId() {
        return 'controller-' + Math.random().toString(36).substr(2, 9);
    }

    generateClientName() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `Controller-${timestamp}`;
    }
}

