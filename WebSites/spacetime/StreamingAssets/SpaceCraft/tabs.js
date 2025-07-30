// SpaceCraft Tabs - Clean, Simple, Complete Implementation

import { GestureServiceInstance } from './gesture.js';

/**
 * Base tab class - consistent BIG_ENDIAN naming, no over-abstraction
 */
export class BaseTab {
    static tabId = undefined;
    static tabLabel = undefined;
    
    constructor(controller) {
        this.controller = controller;
        this.contentElement = null;
    }
    
    createContent() {
    }
    
    show() {
        if (this.contentElement) {
            this.contentElement.style.display = 'block';
            this.activate();
        }
    }
    
    hide() {
        if (this.contentElement) {
            this.contentElement.style.display = 'none';
            this.deactivate();
        }
    }
    
    activate() {
        // Subclasses MAY override this method
    }
    
    deactivate() {
        // Subclasses MAY override this method
    }
    
    handleGesture(gestureType) {
        // Subclasses MAY override this method
    }
    
    onSimulatorStateChange(state) {
        // Subclasses MAY override this method
    }
}

/**
 * About Tab - Simple status and controls
 */
export class AboutTab extends BaseTab {
    static tabId = 'about';
    static tabLabel = '📖 About';
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'about-content';
        this.contentElement.innerHTML = `
            <h1>SpaceCraft Controller</h1>
            <p>Unified Multi-Tab Interface</p>
        `;
    }
}

/**
 * Navigate Tab - Pan/zoom and COMPLETE search functionality
 */
export class NavigateTab extends BaseTab {
    static tabId = 'navigate';
    static tabLabel = '🧭 Navigate';
    
    constructor(controller) {
        super(controller);
        this.searchInput = null;
        this.tagMenu = null;
    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'navigate-content';
        
        const instructions = document.createElement('p');
        instructions.className = 'instructions';
        instructions.innerHTML = '<strong>DRAG to pan • SCROLL to zoom • SEARCH to filter</strong>';
        this.contentElement.appendChild(instructions);
        
        this.contentElement.appendChild(this.createSearchInterface());
    }
    
    createSearchInterface() {
        const container = document.createElement('div');
        container.className = 'search-container';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'search-wrapper';
        
        // Question mark button (LEFT of search field)
        const tagButton = document.createElement('button');
        tagButton.className = 'tag-menu-button';
        tagButton.textContent = '?';
        tagButton.onclick = () => this.toggleTagMenu();
        wrapper.appendChild(tagButton);
        
        // Search input field
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'search-input';
        this.searchInput.placeholder = 'Search items...';
        this.searchInput.oninput = () => this.handleSearchInput();
        this.searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.controller.setSearchQuery(this.searchInput.value);
                this.tagMenu.style.display = 'none';
            }
        };
        
        // Prevent search input from triggering drag events
        this.searchInput.onpointerdown = (e) => e.stopPropagation();
        this.searchInput.onpointermove = (e) => e.stopPropagation();
        this.searchInput.onpointerup = (e) => e.stopPropagation();
        
        wrapper.appendChild(this.searchInput);
        container.appendChild(wrapper);
        
        // Tag menu (hidden initially)
        this.tagMenu = this.createTagMenu();
        container.appendChild(this.tagMenu);
        
        return container;
    }
    
    createTagMenu() {
        const menu = document.createElement('div');
        menu.className = 'tag-menu';
        menu.style.display = 'none';
        
        const header = document.createElement('div');
        header.className = 'tag-menu-header';
        header.textContent = 'Select Tags:';
        menu.appendChild(header);
        
        const list = document.createElement('div');
        list.className = 'tag-menu-list';
        menu.appendChild(list);
        
        return menu;
    }
    
    toggleTagMenu() {
        const isVisible = this.tagMenu.style.display !== 'none';
        this.tagMenu.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            console.log('NavigateTab: Toggling tag menu visible, populating...');
            this.populateTagMenu();
        }
    }
    
    populateTagMenu() {
        const list = this.tagMenu.querySelector('.tag-menu-list');
        if (!list) {
            console.log('NavigateTab: No tag menu list found');
            return;
        }
        
        list.innerHTML = '';
        
        // Get filtered tags based on current search
        const tags = this.controller.getFilteredTags();
        console.log('NavigateTab: Got tags:', tags);
        
        if (tags.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tag-menu-empty';
            empty.textContent = 'No tags available';
            list.appendChild(empty);
            console.log('NavigateTab: No tags available');
            return;
        }
        
        // Display tags one-per-line
        tags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'tag-menu-item';
            item.textContent = tag; // No # prefix
            item.onclick = () => this.addTagToSearch(tag);
            list.appendChild(item);
        });
        
        console.log('NavigateTab: Populated', tags.length, 'tags');
    }
    
    addTagToSearch(tag) {
        const currentValue = this.searchInput.value;
        let newValue;
        
        if (!currentValue) {
            newValue = tag + ' ';
        } else {
            // Smart spacing - add space if needed, then tag, then space
            const needsSpace = !currentValue.endsWith(' ');
            newValue = currentValue + (needsSpace ? ' ' : '') + tag + ' ';
        }
        
        this.searchInput.value = newValue;
        this.searchInput.focus();
        this.searchInput.setSelectionRange(newValue.length, newValue.length);
        
        this.tagMenu.style.display = 'none';
        this.handleSearchInput();
    }
    
    handleSearchInput() {
        const query = this.searchInput.value;
        this.controller.setSearchQuery(query);
        
        // Update tag menu if visible to show filtered tags
        if (this.tagMenu.style.display !== 'none') {
            this.populateTagMenu();
        }
    }
    
    handleGesture(gestureType) {
        // Convert gestures to pan events
        const panAmount = 17;
        switch (gestureType) {
            case 'north': this.controller.sendPanEvent(0, -panAmount); break;
            case 'south': this.controller.sendPanEvent(0, panAmount); break;
            case 'east': this.controller.sendPanEvent(panAmount, 0); break;
            case 'west': this.controller.sendPanEvent(-panAmount, 0); break;
        }
    }
    
    onSimulatorStateChange(state) {
        // Update tag menu if visible
        if (this.tagMenu && this.tagMenu.style.display !== 'none') {
            this.populateTagMenu();
        }
    }
}

/**
 * Select Tab - Item selection with gestures (no search interface)
 */
export class SelectTab extends BaseTab {
    static tabId = 'select';
    static tabLabel = '👆 Select';
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'select-content';
        
        const instructions = document.createElement('p');
        instructions.className = 'instructions';
        instructions.innerHTML = '<strong>TAP or SWIPE to select items</strong>';
        this.contentElement.appendChild(instructions);
        
        // Current selection display
        this.selectionDisplay = document.createElement('div');
        this.selectionDisplay.className = 'current-selection';
        this.selectionDisplay.innerHTML = '<h3>Current Selection:</h3><p>No item selected</p>';
        this.contentElement.appendChild(this.selectionDisplay);
    }
    
    handleGesture(gestureType) {
        // Convert gestures to select events
        switch (gestureType) {
            case 'tap': this.controller.sendSelectEvent('tap'); break; // Fixed: should be 'tap', not 'select'
            case 'north': this.controller.sendSelectEvent('north'); break;
            case 'south': this.controller.sendSelectEvent('south'); break;
            case 'east': this.controller.sendSelectEvent('east'); break;
            case 'west': this.controller.sendSelectEvent('west'); break;
        }
    }
    
    onSimulatorStateChange(state) {
        if (!this.selectionDisplay) return;
        
        const selectedItem = state.selectedItem;
        if (selectedItem) {
            this.selectionDisplay.innerHTML = `
                <h3>Current Selection:</h3>
                <div class="selected-item">
                    <h4>${selectedItem.title || 'Untitled'}</h4>
                    <p>${selectedItem.description || 'No description available'}</p>
                </div>
            `;
        } else {
            this.selectionDisplay.innerHTML = '<h3>Current Selection:</h3><p>No item selected</p>';
        }
    }
}

/**
 * Inspect Tab - Item details viewer
 */
export class InspectTab extends BaseTab {
    static tabId = 'inspect';
    static tabLabel = '🔍 Inspect';
    
    constructor(controller) {
        super(controller);
        this.iframe = null;
        this.currentItemUrl = null;
        console.log('InspectTab: constructor called');
    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'inspect-content';
        this.contentElement.style.height = '100%';
        this.contentElement.style.margin = '0';
        this.contentElement.style.padding = '0';
        
        // Archive.org iframe - ENTIRE AREA
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'inspector-iframe';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.margin = '0';
        this.iframe.style.padding = '0';
        
        // Add detailed iframe loading event listeners
        this.iframe.addEventListener('load', () => {
            console.log('InspectTab: Iframe loaded successfully, src:', this.iframe.src);
        });
        
        this.iframe.addEventListener('error', (e) => {
            console.error('InspectTab: Iframe load error:', e);
            console.error('InspectTab: Failed to load URL:', this.iframe.src);
        });
        
        this.contentElement.appendChild(this.iframe);
        
        console.log('InspectTab: createContent completed, iframe added to DOM');
        
        // Test if iframe can load anything at all with a simple test
        setTimeout(() => {
            console.log('InspectTab: Testing iframe with simple URL...');
            console.log('InspectTab: Setting test URL: about:blank');
            this.iframe.src = 'about:blank';
        }, 1000);
    }
    
    activate() {
        console.log('InspectTab: activate() called');
        console.log('InspectTab: iframe exists:', !!this.iframe);
        console.log('InspectTab: contentElement exists:', !!this.contentElement);
        console.log('InspectTab: currentItemUrl:', this.currentItemUrl);
        
        // Update iframe when tab becomes active
        this.updateIframeUrl();
        
        // Additional debug: Check if iframe is actually in DOM
        if (this.iframe && this.iframe.parentNode) {
            console.log('InspectTab: iframe is in DOM, parent:', this.iframe.parentNode);
        } else {
            console.warn('InspectTab: iframe is NOT in DOM!');
        }
    }
    
    updateIframeUrl() {
        if (!this.iframe) {
            console.log('InspectTab: updateIframeUrl - no iframe element');
            return;
        }
        
        console.log('InspectTab: updateIframeUrl called');
        console.log('InspectTab: currentItemUrl:', this.currentItemUrl);
        console.log('InspectTab: iframe element exists:', !!this.iframe);
        console.log('InspectTab: current iframe.src before update:', this.iframe.src);
        
        if (this.currentItemUrl) {
            console.log('InspectTab: Setting iframe.src to:', this.currentItemUrl);
            try {
                this.iframe.src = this.currentItemUrl;
                console.log('InspectTab: iframe.src set successfully to:', this.iframe.src);
            } catch (error) {
                console.error('InspectTab: Error setting iframe.src:', error);
            }
        } else {
            console.log('InspectTab: Clearing iframe.src (no URL available)');
            this.iframe.src = '';
        }
    }
    
    onSimulatorStateChange(state) {
        console.log('InspectTab: onSimulatorStateChange called with state:', state);
        console.log('InspectTab: state keys:', Object.keys(state || {}));
        
        const selectedItem = state.selectedItem;
        
        console.log('InspectTab: onSimulatorStateChange - selectedItem:', selectedItem);
        if (selectedItem) {
            console.log('InspectTab: selectedItem keys:', Object.keys(selectedItem));
            console.log('InspectTab: selectedItem full object:', JSON.stringify(selectedItem, null, 2));
        } else {
            console.log('InspectTab: No selectedItem in state');
        }
        
        // Try multiple possible URL field names
        let itemUrl = null;
        if (selectedItem) {
            // Try common URL field names first
            itemUrl = selectedItem.url || 
                      selectedItem.href || 
                      selectedItem.link || 
                      selectedItem.source || 
                      selectedItem.archiveUrl || 
                      selectedItem.pageUrl || 
                      selectedItem.webUrl ||
                      selectedItem.URL ||
                      selectedItem.Link ||
                      selectedItem.Source;
            
            console.log('InspectTab: Found explicit URL field:', itemUrl);
            
            // If no explicit URL found, construct from Internet Archive ID
            if (!itemUrl && selectedItem.id) {
                itemUrl = `https://archive.org/details/${selectedItem.id}`;
                console.log('InspectTab: Constructed Archive.org URL from ID:', itemUrl);
            }
        }
        
        // Always store the current item URL
        if (itemUrl) {
            this.currentItemUrl = itemUrl;
            console.log('InspectTab: Setting iframe URL to:', itemUrl);
        } else {
            this.currentItemUrl = null;
            console.log('InspectTab: No URL found, clearing iframe');
        }
        
        // Only update iframe if this tab is currently active
        if (this.controller.activeTabId === InspectTab.tabId) {
            this.updateIframeUrl();
        }
    }
}

/**
 * Magnet Tab - Search magnet creation and management
 */
export class MagnetTab extends BaseTab {
    static tabId = 'magnet';
    static tabLabel = '🧲 Magnet';

    constructor(controller) {
        super(controller);
        
        // Cache for HTML sync optimization
        this.displayedMagnetNames = [];
        
        // Gesture tracking for magnets
        this.magnetGestures = new Map(); // magnetName -> gestureInstanceId
    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'magnet-content';
        this.contentElement.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
        `;
        
        const header = document.createElement('div');
        header.innerHTML = '<h2>Search Magnets</h2><p>Create magnets to attract related items</p>';
        header.style.cssText = `flex-shrink: 0;`;
        this.contentElement.appendChild(header);
        
        const controls = document.createElement('div');
        controls.className = 'magnet-controls';
        
        const tagInput = document.createElement('input');
        tagInput.type = 'text';
        tagInput.id = 'magnet-tag-input';
        tagInput.className = 'magnet-tag-input';
        tagInput.placeholder = 'Magnet Search String';
        
        const addButton = document.createElement('button');
        addButton.id = 'add-magnet';
        addButton.className = 'magnet-add-button';
        addButton.textContent = 'Add';
        
        // Attach event handlers directly
        addButton.onclick = (e) => {
            e.stopPropagation(); // Prevent any parent event handling
            const tag = tagInput.value.trim();
            if (tag) {
                this.addMagnet(tag);
                tagInput.value = '';
                tagInput.focus(); // Keep focus for easy multiple additions
            }
        };
        
        tagInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                addButton.click();
            }
        };
        
        controls.appendChild(tagInput);
        controls.appendChild(addButton);
        this.contentElement.appendChild(controls);
        
        const magnetsList = document.createElement('div');
        magnetsList.id = 'magnets-list';
        magnetsList.className = 'magnets-list';
        this.contentElement.appendChild(magnetsList);
        
        // Initialize magnet list display
        this.updateMagnetsList();
    }
    
    activate() {
        // Initialize orientation tracking when magnet tab becomes active
        if (!this.controller.motionModule.isOrientationActive) {
            this.controller.motionModule.initializeOrientationTracking().then(success => {
                if (success) {
                    console.log('MagnetTab: Device orientation tracking initialized');
                } else {
                    console.log('MagnetTab: Device orientation tracking failed to initialize');
                }
            });
        }
        
        // Auto-focus the magnet search input field
        setTimeout(() => {
            const magnetInput = document.getElementById('magnet-tag-input');
            if (magnetInput) {
                magnetInput.focus();
                console.log('MagnetTab: Focused magnet input field');
            }
        }, 100); // Small delay to ensure DOM is ready
        
        this.updateMagnetsList();
        console.log('MagnetTab: Activated');
    }
    
    addMagnet(tag) {
        // Trim the tag (case preserving) but check for duplicates case-insensitively
        const trimmedTag = tag.trim();
        if (!trimmedTag) return;
        
        console.log(`MagnetTab: addMagnet called with "${trimmedTag}"`);
        
        // Get current magnets from simulator state
        const currentMagnets = this.controller.simulatorState.magnets || [];
        console.log('MagnetTab: Current magnets in state:', currentMagnets);
        
        // Check if magnet with same tag already exists (case-insensitive, trimmed comparison)
        const existingMagnet = currentMagnets.find(magnetName => 
            magnetName.trim().toLowerCase() === trimmedTag.toLowerCase()
        );
        
        if (existingMagnet) {
            console.log(`MagnetTab: Duplicate magnet found: "${existingMagnet}"`);
            this.highlightExistingMagnet(existingMagnet);
            return;
        }
        
        console.log(`MagnetTab: No duplicate found, sending AddMagnet event...`);
        
        // Send AddMagnet event to simulator
        this.controller.sendAddMagnetEvent(trimmedTag);
        this.controller.loggingModule.log('Magnet', `Sent AddMagnet command for: ${trimmedTag}`);
    }
    
    highlightExistingMagnet(magnetName) {
        const list = document.getElementById('magnets-list');
        const magnetElement = list.querySelector(`[data-magnet-name="${magnetName}"]`);
        
        if (magnetElement && list) {
            // Scroll to the magnet
            magnetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Blink animation
            const originalBackground = magnetElement.style.background;
            let blinkCount = 0;
            const blinkInterval = setInterval(() => {
                magnetElement.style.background = blinkCount % 2 === 0 ? '#4a4a4a' : originalBackground;
                blinkCount++;
                if (blinkCount >= 6) { // 3 full blinks
                    clearInterval(blinkInterval);
                    magnetElement.style.background = originalBackground;
                }
            }, 200);
        }
    }
    
    deleteMagnet(magnetName) {
        // Send DeleteMagnet event to simulator
        this.controller.sendDeleteMagnetEvent(magnetName);
        this.controller.loggingModule.log('Magnet', `Sent DeleteMagnet command for: ${magnetName}`);
    }
    
    updateMagnetsList() {
        console.log('MagnetTab: updateMagnetsList called');
        const list = document.getElementById('magnets-list');
        if (!list) {
            console.warn('MagnetTab: magnets-list element not found');
            return;
        }
        
        // Get magnets from simulator state
        const magnets = this.controller.simulatorState.magnets || [];
        console.log('MagnetTab: Current magnets:', magnets);
        console.log('MagnetTab: Displayed magnets cache:', this.displayedMagnetNames);
        
        // Compare current magnets to cached displayed magnets
        const magnetsChanged = !this.arraysEqual(magnets, this.displayedMagnetNames);
        
        if (!magnetsChanged) {
            console.log('MagnetTab: Magnet list unchanged, skipping HTML rebuild');
            return;
        }
        
        console.log('MagnetTab: Magnet list changed, rebuilding HTML');
        
        // Tear down and recreate
        list.innerHTML = '';
        
        // Update cache
        this.displayedMagnetNames = [...magnets];
        
        if (magnets.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'magnet-empty-message';
            emptyMsg.textContent = 'No magnets created yet';
            list.appendChild(emptyMsg);
            return;
        }
        
        magnets.forEach((magnetName, index) => {
            // Create gesture instance for this magnet if not exists
            if (!this.magnetGestures.has(magnetName)) {
                this.createMagnetGesture(magnetName);
            }
            
            const item = document.createElement('div');
            item.className = 'magnet-item';
            item.dataset.magnetName = magnetName;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'magnet-name';
            nameSpan.textContent = magnetName;
            
            // Add touch event handlers ONLY to the magnet name area for dragging
            nameSpan.addEventListener('touchstart', (e) => this.handleTouchStart(e, magnetName));
            nameSpan.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            nameSpan.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            nameSpan.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'magnet-delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = (e) => {
                e.stopPropagation(); // Prevent any parent event handling
                this.deleteMagnet(magnetName);
            };
            
            item.appendChild(nameSpan);
            item.appendChild(deleteButton);
            list.appendChild(item);
        });
        
        // Remove gesture instances for magnets that no longer exist
        for (const [magnetName, gestureInstanceId] of this.magnetGestures.entries()) {
            if (!magnets.includes(magnetName)) {
                this.removeMagnetGesture(magnetName);
            }
        }
    }
    
    onSimulatorStateChange(state) {
        // Update magnet list when simulator state changes
        console.log('MagnetTab: onSimulatorStateChange called with magnets:', state.magnets);
        this.updateMagnetsList();
    }
    
    
    deactivate() {
        // Deactivate all gesture instances when switching away from magnet tab
        for (const [magnetName, gestureInstanceId] of this.magnetGestures.entries()) {
            const gestureInstance = this.controller.gestureService.getGestureInstance(gestureInstanceId);
            if (gestureInstance && gestureInstance.isActive) {
                this.controller.gestureService.deactivateTarget();
            }
        }
        
        console.log('MagnetTab: Deactivated, stopped all gesture tracking');
    }
    
    
    activate() {
        // Initialize orientation tracking when magnet tab becomes active
        if (!this.controller.motionModule.isOrientationActive) {
            this.controller.motionModule.initializeOrientationTracking().then(success => {
                if (success) {
                    console.log('MagnetTab: Device orientation tracking initialized');
                } else {
                    console.log('MagnetTab: Device orientation tracking failed to initialize');
                }
            });
        }
        
        console.log('MagnetTab: Activated');
    }
    
    
    /**
     * Helper method to compare two arrays for equality
     */
    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    
    

    
    
    /**
     * Create a gesture instance for a magnet
     */
    createMagnetGesture(magnetName) {
        const gestureInstanceId = `magnet-${magnetName}`;
        
        const gestureInstance = new GestureServiceInstance({
            targetId: gestureInstanceId,
            propertyName: 'magnetPosition',
            
            // Drag configuration for position control
            dragScaleFactor: 0.01,
            dragDeadZone: 1.0,
            
            // Tilt configuration for continuous movement
            tiltScaleFactor: 2.0,
            tiltDeadZoneRadius: 0.1,
            tiltMaxRadius: 0.5,
            
            // Twist configuration for strength control (future)
            twistScaleFactor: 1.0,
            twistDeadZoneRadius: 0.05,
            twistMaxRadius: 1.0,
            
            // Callbacks
            onDrag: (deltaX, deltaZ, touchId) => {
                console.log(`MagnetTab: Drag gesture for ${magnetName}: (${deltaX.toFixed(4)}, ${deltaZ.toFixed(4)})`);
                this.controller.sendPushMagnetEvent(magnetName, deltaX, deltaZ);
            },
            
            onTilt: (deltaX, deltaZ, touchId) => {
                console.log(`MagnetTab: Tilt gesture for ${magnetName}: (${deltaX.toFixed(4)}, ${deltaZ.toFixed(4)})`);
                this.controller.sendPushMagnetEvent(magnetName, deltaX, deltaZ);
            },
            
            onTwist: (strengthDelta, direction, touchId) => {
                const directionText = direction > 0 ? 'CW' : 'CCW';
                console.log(`MagnetTab: Twist gesture for ${magnetName}: ${directionText} strength delta ${strengthDelta.toFixed(4)}`);
                // TODO: Future - send magnet strength change command
                // this.controller.sendMagnetStrengthEvent(magnetName, strengthDelta);
            },
            
            onSelect: () => {
                console.log(`MagnetTab: Selected magnet: ${magnetName}`);
            },
            
            onDeselect: () => {
                console.log(`MagnetTab: Deselected magnet: ${magnetName}`);
            }
        });
        
        // Register with gesture service
        this.controller.gestureService.registerTarget(gestureInstanceId, gestureInstance);
        this.magnetGestures.set(magnetName, gestureInstanceId);
        
        console.log(`MagnetTab: Created gesture instance for magnet: ${magnetName}`);
    }
    
    
    /**
     * Remove gesture instance for a magnet
     */
    removeMagnetGesture(magnetName) {
        const gestureInstanceId = this.magnetGestures.get(magnetName);
        if (gestureInstanceId) {
            this.controller.gestureService.unregisterTarget(gestureInstanceId);
            this.magnetGestures.delete(magnetName);
            console.log(`MagnetTab: Removed gesture instance for magnet: ${magnetName}`);
        }
    }
    
    
    /**
     * Handle touch start on magnet - use gesture service
     */
    handleTouchStart(e, magnetName) {
        e.preventDefault();
        
        const gestureInstanceId = this.magnetGestures.get(magnetName);
        if (!gestureInstanceId) {
            console.warn(`MagnetTab: No gesture instance found for magnet: ${magnetName}`);
            return;
        }
        
        // Process all touches for this magnet
        for (let touch of e.changedTouches) {
            this.controller.gestureService.handleTouchStart(touch, gestureInstanceId);
        }
        
        console.log(`MagnetTab: Started gesture tracking for magnet: ${magnetName}`);
    }
    
    
    /**
     * Handle touch move - use gesture service
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            this.controller.gestureService.handleTouchMove(touch);
        }
    }
    
    
    /**
     * Handle touch end - use gesture service
     */
    handleTouchEnd(e) {
        for (let touch of e.changedTouches) {
            this.controller.gestureService.handleTouchEnd(touch);
        }
    }
}

/**
 * Adjust Tab - Simulation parameter controls
 */
export class AdjustTab extends BaseTab {
    static tabId = 'adjust';
    static tabLabel = '⚙️ Adjust';
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'adjust-content';
        
        const header = document.createElement('div');
        header.innerHTML = '<h2>Simulation Parameters</h2><p>Settings will be loaded from metadata</p>';
        this.contentElement.appendChild(header);
    }
    

} 