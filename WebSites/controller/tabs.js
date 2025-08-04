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
    
    constructor(controller) {
        super(controller);
    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'about-content';
        this.contentElement.innerHTML = `
            <h1>SpaceCraft Controller</h1>
            <p><strong>🏠 About</strong> - App information and getting started</p>
            <p><strong>🧭 Navigate</strong> - Move your view around the 3D space, pan and zoom to explore collections</p>
            <p><strong>👆 Select</strong> - Point and choose items, select multiple things, toggle selections on/off</p>
            <p><strong>🔍 Inspect</strong> - Look inside items in detail, view web pages and documents embedded in the simulator</p>
            <p><strong>🌍 Gravity</strong> - Search for items and make matching ones attract or repel with physics forces - type "science" and crank up gravity to pull all science books toward the center, or reverse it to scatter them away</p>
            <p><strong>🧲 Magnet</strong> - Create magnetic hotspots that pull items around - drop a "fiction" magnet and watch novels fly toward it, use device tilt to move magnets around in real-time</p>
            <p><strong>⚙️ Adjust</strong> - Fine-tune physics settings, friction, forces, and visual parameters to get the simulation feeling just right</p>
            <p>Each tab gives you different powers over the physics simulation - from gently browsing to dramatically reshaping how thousands of items behave based on their content and your interests.</p>
        `;
    }
}

/**
 * Navigate Tab - Pan and zoom controls
 */
export class NavigateTab extends BaseTab {
    static tabId = 'navigate';
    static tabLabel = '🧭 Navigate';
    
    constructor(controller) {
        super(controller);

    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'navigate-content';
        
        const instructions = document.createElement('p');
        instructions.className = 'instructions';
        instructions.innerHTML = '<strong>DRAG to pan • SCROLL to zoom</strong><br><small>Search functionality moved to Gravity tab</small>';
        this.contentElement.appendChild(instructions);
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
}

/**
 * Select Tab - Item selection with gestures (no search interface)
 */
export class SelectTab extends BaseTab {
    static tabId = 'select';
    static tabLabel = '👆 Select';
    
    constructor(controller) {
        super(controller);

    }
    
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
        this.selectionDisplay.innerHTML = '<p>No item selected</p>';
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
            // Format description as paragraphs, splitting on any number of newlines
            const descriptionText = selectedItem.description || 'No description available';
            const paragraphs = descriptionText
                .split(/\n+/) // Split on any number of newlines
                .filter(line => line.trim().length > 0) // Remove empty lines
                .map(line => `<p>${line.trim()}</p>`) // Create paragraph for each line
                .join('');
            
            // Construct cover image path (relative to current directory)
            const coverImagePath = `../Content/collections/scifi/items/${selectedItem.id}/cover.jpg`;
            
            this.selectionDisplay.innerHTML = `
                <div class="selected-item">
                    <img src="${coverImagePath}" alt="Cover for ${selectedItem.title}" class="cover-image" onerror="this.style.display='none'">
                    <h4>${selectedItem.title || 'Untitled'}</h4>
                    <div class="description">${paragraphs}</div>
                </div>
            `;
        } else {
            this.selectionDisplay.innerHTML = '<p>No item selected</p>';
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
        this.lastSelectedItemId = null;

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
            console.log('Inspect', `Iframe loaded: ${this.iframe.src}`);
        });
        
        this.iframe.addEventListener('error', (e) => {
            console.log('Error', `Iframe load failed: ${this.iframe.src}`);
        });
        
        this.contentElement.appendChild(this.iframe);
        
        // Test if iframe can load anything at all with a simple test
        setTimeout(() => {
            console.log('Inspect', 'Testing iframe with about:blank');
            this.iframe.src = 'about:blank';
        }, 1000);
    }
    
    activate() {
        // Update iframe when tab becomes active
        this.updateIframeUrl();
        
        // Verify iframe is in DOM
        if (!this.iframe || !this.iframe.parentNode) {
            console.error('[InspectTab] Iframe not in DOM');
        }
    }
    
    updateIframeUrl() {
        if (!this.iframe) {
            console.error('[InspectTab] Iframe element missing');
            return;
        }
        
        if (this.currentItemUrl) {
            try {
                this.iframe.src = this.currentItemUrl;
                console.log(`[Inspect] URL updated: ${this.currentItemUrl}`);
            } catch (error) {
                console.error(`[Inspect] Failed to set iframe URL:`, error);
            }
        } else {
            this.iframe.src = '';
            console.log(`[Inspect] URL cleared`);
        }
    }
    
    onSimulatorStateChange(state) {
        const selectedItem = state.selectedItem;
        const selectedItemId = selectedItem?.id || null;
        
        // Check if the selected item has actually changed
        if (selectedItemId === this.lastSelectedItemId) {
            return;
        }
        
                    console.log(`[Inspect] Item changed: ${this.lastSelectedItemId} → ${selectedItemId}`);
        this.lastSelectedItemId = selectedItemId;
        
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
            
            // If no explicit URL found, construct from Internet Archive ID
            if (!itemUrl && selectedItem.id) {
                itemUrl = `https://archive.org/details/${selectedItem.id}`;
            }
        }
        
        // Always store the current item URL
        this.currentItemUrl = itemUrl;
        
        // Only update iframe if this tab is currently active
        if (this.controller.activeTabId === InspectTab.tabId) {
            this.updateIframeUrl();
        }
    }
}

/**
 * Gravity Tab - DEPRECATED - Replaced by magnet-based system
 * This tab is being phased out in favor of the new magnet-based scoring and scaling system
 */
export class GravityTab extends BaseTab {
    static tabId = 'gravity';
    static tabLabel = '🌍 Gravity';
    
    constructor(controller) {
        super(controller);
        this.officialSearchDisplay = null;
        this.newSearchInput = null;
        this.changeButton = null;
        this.makeMagnetButton = null;
        this.clearButton = null;
        this.tagSuggestionsPanel = null;
        this.tagSuggestionsVisible = true; // Always visible now
        this.suggestionsMode = 'matching'; // 'matching', 'all', 'recent'
        this.recentTags = []; // Track recently used tags
        this.gravitySlider = null;
        this.gravityValue = null;
        this.currentOfficialSearch = '';
        this.isDraggingGravitySlider = false;
        this.isEditingSearchInput = false;
    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'gravity-content flex-fill';
        
        const instructions = document.createElement('h2');
        instructions.className = 'instructions';
        instructions.innerHTML = 'Search with Gravity Force';
        instructions.style.cssText = `
            margin-bottom: 20px;
            color: #fff;
        `;
        this.contentElement.appendChild(instructions);
        
        // Gravity slider at the top
        this.contentElement.appendChild(this.createGravitySlider());
        
        // Current official search string display
        this.contentElement.appendChild(this.createOfficialSearchDisplay());
        
        // New search input interface
        this.contentElement.appendChild(this.createNewSearchInterface());
        
        // Tag suggestions panel (collapsible, below the interface)
        this.tagSuggestionsPanel = this.createTagSuggestionsPanel();
        this.contentElement.appendChild(this.tagSuggestionsPanel);
    }
    
    createOfficialSearchDisplay() {
        const container = document.createElement('div');
        container.className = 'official-search-container';
        
        const label = document.createElement('label');
        label.innerHTML = '<strong>Search String:</strong>';
        container.appendChild(label);
        
        this.officialSearchDisplay = document.createElement('div');
        this.officialSearchDisplay.className = 'official-search-display no-search';
        this.officialSearchDisplay.textContent = '(no search active)';
        container.appendChild(this.officialSearchDisplay);
        
        return container;
    }
    
    createNewSearchInterface() {
        const container = document.createElement('div');
        container.className = 'mb-md';
        
        // Top row: full width search input
        const inputRow = document.createElement('div');
        inputRow.className = 'mb-sm';
        
        // New search input field (full width)
        this.newSearchInput = document.createElement('input');
        this.newSearchInput.type = 'text';
        this.newSearchInput.className = 'search-input full-width';
        this.newSearchInput.placeholder = 'New search string...';
        this.newSearchInput.onfocus = () => {
            this.isEditingSearchInput = true;
            console.log(`[GravityTab] Started editing search input`);
        };
        this.newSearchInput.onblur = () => {
            this.isEditingSearchInput = false;
            console.log(`[GravityTab] Stopped editing search input`);
        };
        this.newSearchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Shift+Enter: Make Magnet
                    e.preventDefault();
                    this.animateMakeMagnetButtonClick();
                    this.makeMagnetFromSearch();
                } else {
                    // Enter: New Search
                    this.animateButtonClick();
                    this.commitNewSearch();
                }
            }
        };
        this.newSearchInput.oninput = () => {
            // Update button states
            this.updateChangeButtonState();
            this.updateMakeMagnetButtonState();
            
            // Always update suggestions
            this.populateTagSuggestions();
        };
        
        // Prevent search input from triggering drag events
        this.newSearchInput.onpointerdown = (e) => e.stopPropagation();
        this.newSearchInput.onpointermove = (e) => e.stopPropagation();
        this.newSearchInput.onpointerup = (e) => e.stopPropagation();
        
        inputRow.appendChild(this.newSearchInput);
        container.appendChild(inputRow);
        
        // Bottom row: buttons
        const buttonRow = document.createElement('div');
        buttonRow.className = 'flex-row';
        buttonRow.style.gap = '15px'; // Consistent gaps
        
        // New Search button (disabled by default) - FIRST
        this.changeButton = document.createElement('button');
        this.changeButton.className = 'magnet-add-button btn disabled';
        this.changeButton.textContent = '🔄 New Search';
        this.changeButton.onclick = () => this.commitNewSearch();
        this.changeButton.disabled = true; // Start disabled
        buttonRow.appendChild(this.changeButton);
        
        // Clear Search button - SECOND
        this.clearButton = document.createElement('button');
        this.clearButton.className = 'magnet-delete-button btn disabled';
        this.clearButton.textContent = '🗑️ Clear Search';
        this.clearButton.onclick = (e) => this.clearSearch(e);
        this.clearButton.disabled = true; // Start disabled
        buttonRow.appendChild(this.clearButton);
        
        // Make Magnet button - THIRD
        this.makeMagnetButton = document.createElement('button');
        this.makeMagnetButton.className = 'make-magnet-button btn disabled';
        this.makeMagnetButton.textContent = '🧲 Make Magnet';
        this.makeMagnetButton.onclick = () => this.makeMagnetFromSearch();
        this.makeMagnetButton.disabled = true; // Start disabled
        buttonRow.appendChild(this.makeMagnetButton);
        
        container.appendChild(buttonRow);
        
        // Suggestions controls row
        const suggestionsRow = document.createElement('div');
        suggestionsRow.className = 'suggestions-controls mb-sm';
        suggestionsRow.appendChild(this.createSuggestionsControls());
        container.appendChild(suggestionsRow);
        
        return container;
    }
    
    applyGravityCurve(rawValue) {
        // Dead zone: snap to 0 if within ±5 of center
        if (Math.abs(rawValue) <= 5) {
            return 0;
        }
        
        // Apply quadratic curve for more precision near zero
        // Formula: sign(input) * (abs(input)/100)^2 * 100
        const sign = rawValue >= 0 ? 1 : -1;
        const normalizedAbs = Math.abs(rawValue) / 100;
        const curved = normalizedAbs * normalizedAbs * 100;
        
        return Math.round(sign * curved);
    }
    
    reverseGravityCurve(gravityValue) {
        // Reverse the curve mapping: given a gravity value, find the raw slider position
        if (Math.abs(gravityValue) < 0.01) {
            // Zero gravity always maps to exact center of dead zone
            return 0;
        }
        
        const sign = gravityValue >= 0 ? 1 : -1;
        const absGravity = Math.abs(gravityValue);
        
        // Reverse the quadratic curve: if output = sign * (input/100)^2 * 100
        // then input = sign * sqrt(output/100) * 100
        const normalizedAbs = absGravity / 100;
        const rawValue = sign * Math.sqrt(normalizedAbs) * 100;
        
        // Ensure we're outside the dead zone (±5) if the gravity is non-zero
        if (Math.abs(rawValue) <= 5 && absGravity > 0) {
            // Force outside dead zone while preserving sign
            return sign * 6; // Just outside the dead zone
        }
        
        return Math.max(-100, Math.min(100, rawValue));
    }
    
    animateButtonClick() {
        // Add click animation class
        this.changeButton.classList.add('btn-animate-click');
        
        // Remove the class after animation completes
        setTimeout(() => {
            this.changeButton.classList.remove('btn-animate-click');
        }, 200);
    }
    
    animateMakeMagnetButtonClick() {
        // Add click animation class to make magnet button
        this.makeMagnetButton.classList.add('btn-animate-click');
        
        // Remove the class after animation completes
        setTimeout(() => {
            this.makeMagnetButton.classList.remove('btn-animate-click');
        }, 200);
    }
    
    animateClearButtonClick() {
        // Add click animation class to clear button
        this.clearButton.classList.add('btn-animate-click');
        
        // Remove the class after animation completes
        setTimeout(() => {
            this.clearButton.classList.remove('btn-animate-click');
        }, 200);
    }
    
    updateChangeButtonState() {
        const inputValue = this.newSearchInput.value.trim();
        const isDifferent = inputValue !== this.currentOfficialSearch;
        
        this.changeButton.disabled = !isDifferent;
        
        if (isDifferent) {
            this.changeButton.classList.remove('disabled');
        } else {
            this.changeButton.classList.add('disabled');
        }
        
        // Also update clear button
        this.updateClearButtonState();
    }
    
    updateClearButtonState() {
        const inputValue = this.newSearchInput.value.trim();
        const officialValue = this.currentOfficialSearch || '';
        const hasContent = inputValue.length > 0 || officialValue.length > 0;
        
        this.clearButton.disabled = !hasContent;
        
        if (hasContent) {
            this.clearButton.classList.remove('disabled');
        } else {
            this.clearButton.classList.add('disabled');
        }
    }
    
    createTagSuggestionsPanel() {
        const panel = document.createElement('div');
        panel.className = 'suggestions-panel flex-fill';
        panel.style.display = 'flex'; // Always visible
        
        const header = document.createElement('div');
        header.className = 'suggestions-header';
        header.textContent = 'Tag Suggestions:';
        header.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 10px;
            padding: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        `;
        panel.appendChild(header);
        
        const list = document.createElement('div');
        list.className = 'suggestions-list scroll-area';
        panel.appendChild(list);
        
        return panel;
    }
    
    createSuggestionsControls() {
        const container = document.createElement('div');
        container.className = 'suggestions-controls-container';
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 8px 0;
        `;
        
        // Label
        const label = document.createElement('label');
        label.textContent = 'Suggestions:';
        label.style.cssText = `
            color: #fff;
            font-weight: bold;
            font-size: 14px;
        `;
        container.appendChild(label);
        
        // Radio buttons container
        const radioContainer = document.createElement('div');
        radioContainer.className = 'flex-row';
        radioContainer.style.cssText = `
            gap: 12px;
        `;
        
        // Create radio buttons
        const modes = [
            { value: 'matching', label: 'Matching' },
            { value: 'all', label: 'All' },
            { value: 'recent', label: 'Recent' }
        ];
        
        modes.forEach(mode => {
            const radioWrapper = document.createElement('label');
            radioWrapper.style.cssText = `
                display: flex;
                align-items: center;
                gap: 4px;
                color: #fff;
                font-size: 14px;
                cursor: pointer;
            `;
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'suggestions-mode';
            radio.value = mode.value;
            radio.checked = mode.value === 'matching';
            radio.onchange = () => {
                if (radio.checked) {
                    this.setSuggestionsMode(mode.value);
                }
            };
            
            const labelText = document.createElement('span');
            labelText.textContent = mode.label;
            
            radioWrapper.appendChild(radio);
            radioWrapper.appendChild(labelText);
            radioContainer.appendChild(radioWrapper);
        });
        
        container.appendChild(radioContainer);
        return container;
    }
    
    setSuggestionsMode(mode) {
        this.suggestionsMode = mode;
        this.populateTagSuggestions();
    }
    
    clearSearch(event) {
        // Clear the input field
        this.newSearchInput.value = '';
        
        // If Shift key is held, also clear recent tags
        if (event && event.shiftKey) {
            this.recentTags = [];
            console.log(`[GravityTab] Shift+click: Cleared recent tags list`);
        }
        
        // Animate button click effect on Clear Search button
        this.animateClearButtonClick();
        
        // Send empty search string
        this.controller.sendEventToSimulator('searchStringUpdate', {
            newSearchString: ''
        });
        
        // Update button states
        this.updateChangeButtonState();
        this.updateMakeMagnetButtonState();
        this.updateClearButtonState();
        
        // Update suggestions to reflect cleared recent tags
        this.populateTagSuggestions();
    }
    
    createGravitySlider() {
        const container = document.createElement('div');
        container.className = 'gravity-slider-container';
        container.style.cssText = `
            margin-top: 20px;
        `;
        
        const label = document.createElement('label');
        label.innerHTML = '<strong>Search Gravity:</strong>';
        label.style.cssText = `
            display: block;
            margin-bottom: 10px;
            color: #fff;
        `;
        container.appendChild(label);
        
        // Value display
        this.gravityValue = document.createElement('span');
        this.gravityValue.textContent = '0';
        this.gravityValue.style.cssText = `
            color: #0ff;
            font-weight: bold;
            margin-left: 10px;
        `;
        label.appendChild(this.gravityValue);
        
        // Slider
        this.gravitySlider = document.createElement('input');
        this.gravitySlider.type = 'range';
        this.gravitySlider.min = '-100';
        this.gravitySlider.max = '100';
        this.gravitySlider.value = '0';
        this.gravitySlider.step = '1';
        this.gravitySlider.className = 'gravity-slider';
        this.gravitySlider.style.cssText = `
            width: 100%;
            margin: 10px 0;
        `;
        
        // Track dragging state
        this.gravitySlider.onmousedown = () => {
            this.isDraggingGravitySlider = true;
            console.log(`[GravityTab] Started dragging gravity slider`);
        };
        
        this.gravitySlider.onmouseup = () => {
            this.isDraggingGravitySlider = false;
            console.log(`[GravityTab] Stopped dragging gravity slider`);
        };
        
        // Also handle touch events for mobile
        this.gravitySlider.ontouchstart = () => {
            this.isDraggingGravitySlider = true;
            console.log(`[GravityTab] Started touch dragging gravity slider`);
        };
        
        this.gravitySlider.ontouchend = () => {
            this.isDraggingGravitySlider = false;
            console.log(`[GravityTab] Stopped touch dragging gravity slider`);
        };
        
        this.gravitySlider.oninput = () => {
            const rawValue = parseFloat(this.gravitySlider.value);
            const curvedValue = this.applyGravityCurve(rawValue);
            
            // Update display with current values during dragging
            this.updateGravityValueDisplay(curvedValue, this.currentOfficialSearch);
            
            // Log gravity change for debugging
            console.log(`[GravityTab] Gravity slider changed to: ${curvedValue} (raw: ${rawValue}) [dragging: ${this.isDraggingGravitySlider}]`);
            
            this.controller.setSearchGravity(curvedValue);
        };
        
        container.appendChild(this.gravitySlider);
        
        // Range labels
        const rangeLabels = document.createElement('div');
        rangeLabels.style.cssText = `
            display: flex;
            justify-content: space-between;
            color: #aaa;
            font-size: 12px;
        `;
        rangeLabels.innerHTML = '<span>-100 (Repel)</span><span>0 (None)</span><span>+100 (Attract)</span>';
        container.appendChild(rangeLabels);
        
        return container;
    }
    
    // Suggestions are always visible now - this method is no longer needed
    // but keeping for compatibility if called elsewhere
    
    populateTagSuggestions() {
        const list = this.tagSuggestionsPanel.querySelector('.suggestions-list');
        if (!list) {
            console.error('GravityTab suggestions list not found');
            return;
        }
        
        list.innerHTML = '';
        
        // Get tags based on current mode
        const inputValue = this.newSearchInput.value.trim().toLowerCase();
        const allTags = this.controller.simulatorState.tags || [];
        
        let filteredTags;
        let headerMessage = null;
        
        switch (this.suggestionsMode) {
            case 'all':
                filteredTags = allTags;
                break;
                
            case 'recent':
                filteredTags = this.recentTags.filter(tag => allTags.includes(tag));
                if (filteredTags.length === 0) {
                    headerMessage = 'No recent tags - showing all:';
                    filteredTags = allTags;
                }
                break;
                
            case 'matching':
            default:
                if (!inputValue) {
                    // Empty search string: show all tags
                    filteredTags = allTags;
                } else {
                    // Filter tags based on input - show only matches
                    filteredTags = allTags.filter(tag => 
                        tag.toLowerCase().includes(inputValue)
                    ).sort((a, b) => {
                        // Tags starting with input come first
                        const aStarts = a.toLowerCase().startsWith(inputValue);
                        const bStarts = b.toLowerCase().startsWith(inputValue);
                        if (aStarts && !bStarts) return -1;
                        if (!aStarts && bStarts) return 1;
                        return a.localeCompare(b);
                    });
                    
                    // In matching mode: if no matches, show nothing (don't fallback to all)
                }
                break;
        }
        
        // Update the main suggestions header with count
        const header = this.tagSuggestionsPanel.querySelector('.suggestions-header');
        if (header) {
            const count = filteredTags.length;
            const plural = count === 1 ? '' : 's';
            header.textContent = `${count} Tag Suggestion${plural}:`;
        }
        
        // Add header message if needed
        if (headerMessage) {
            const header = document.createElement('div');
            header.className = 'suggestions-header-message';
            header.textContent = headerMessage;
            header.style.cssText = `
                text-align: center;
                color: rgba(255, 255, 150, 0.8);
                padding: 8px;
                font-style: italic;
                font-size: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 8px;
            `;
            list.appendChild(header);
        }
        
        // Handle empty states
        if (allTags.length === 0) {
            // No tags in the system at all
            const empty = document.createElement('div');
            empty.className = 'suggestions-empty';
            empty.textContent = 'No tags available in system';
            empty.style.cssText = `
                text-align: center;
                color: rgba(255, 255, 255, 0.5);
                padding: 20px;
            `;
            list.appendChild(empty);
            return;
        } else if (filteredTags.length === 0) {
            // No matches found in matching mode
            if (this.suggestionsMode === 'matching' && inputValue) {
                const empty = document.createElement('div');
                empty.className = 'suggestions-empty';
                empty.textContent = `No matches for "${inputValue}"`;
                empty.style.cssText = `
                    text-align: center;
                    color: rgba(255, 255, 150, 0.6);
                    padding: 20px;
                    font-style: italic;
                `;
                list.appendChild(empty);
                return;
            } else if (this.suggestionsMode === 'recent') {
                // Already handled in the switch statement above
                return;
            }
        }
        
        // Display tags one-per-line
        filteredTags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = tag; // No # prefix
            item.onclick = () => this.addTagToSearch(tag);
            item.ondblclick = (e) => this.handleTagDoubleClick(tag, e);
            list.appendChild(item);
        });
    }
    
    addTagToSearch(tag) {
        // Replace the current search string with the selected tag
        this.newSearchInput.value = tag;
        this.newSearchInput.focus();
        this.newSearchInput.setSelectionRange(tag.length, tag.length);
        
        // Add to recent tags
        this.addToRecentTags(tag);
        
        // Update button state after adding tag
        this.updateChangeButtonState();
        this.updateMakeMagnetButtonState();
        
        // Update suggestions
        this.populateTagSuggestions();
    }
    
    handleTagDoubleClick(tag, event) {
        // First, add the tag to the search field (same as single click)
        this.addTagToSearch(tag);
        
        // Then, based on modifier keys, perform the appropriate action
        if (event.shiftKey) {
            // Shift+Double-click: Make/Delete Magnet
            this.animateMakeMagnetButtonClick();
            this.makeMagnetFromSearch();
        } else {
            // Normal Double-click: Commit New Search
            this.animateButtonClick();
            this.commitNewSearch();
        }
    }
    
    addToRecentTags(tag) {
        // Remove if already exists
        this.recentTags = this.recentTags.filter(t => t !== tag);
        // Add to front
        this.recentTags.unshift(tag);
        // Keep only last 20
        this.recentTags = this.recentTags.slice(0, 20);
    }
    
    commitNewSearch() {
        const newSearchString = this.newSearchInput.value.trim();
        
        console.log(`[GravityTab] Committing new search: "${newSearchString}"`);
        
        // Add to recent tags if non-empty
        if (newSearchString) {
            this.addToRecentTags(newSearchString);
        }
        
        // Send search update to simulator (not Unity directly)
        this.controller.sendEventToSimulator('searchStringUpdate', {
            newSearchString: newSearchString
        });
        
        // Clear the input field
        this.newSearchInput.value = '';
        
        // Update button states after clearing input
        this.updateChangeButtonState();
        this.updateMakeMagnetButtonState();
    }
    
    activate() {
        // Update button states when tab becomes active
        this.updateChangeButtonState();
        this.updateMakeMagnetButtonState();
        
        // Always update suggestions
        this.populateTagSuggestions();
    }
    
    onSimulatorStateChange(state) {
        // Update official search display (always update the official display)
        const currentSearch = state.currentSearchString || '';
        this.currentOfficialSearch = currentSearch;
        
        if (currentSearch) {
            this.officialSearchDisplay.textContent = currentSearch;
            this.officialSearchDisplay.classList.remove('no-search');
        } else {
            this.officialSearchDisplay.textContent = '(no search active)';
            this.officialSearchDisplay.classList.add('no-search');
        }
        
        // Update button states when official search changes
        this.updateChangeButtonState();
        this.updateMakeMagnetButtonState();
        
        // Update gravity slider to match simulator state (only if not currently being dragged)
        const currentGravity = state.currentSearchGravity || 0;
        
        if (!this.isDraggingGravitySlider) {
            // Reverse the curve to find the slider position for this gravity value
            const sliderValue = this.reverseGravityCurve(currentGravity);
            this.gravitySlider.value = sliderValue;
            console.log(`[GravityTab] Updated slider from simulator: gravity=${currentGravity} → slider=${sliderValue}`);
        }
        
        // Always update the displayed value to show official gravity with status
        this.updateGravityValueDisplay(currentGravity, currentSearch);
        
        // Always update suggestions
        this.populateTagSuggestions();
        
        // Update Make Magnet button state when magnets list changes
        this.updateMakeMagnetButtonState();
    }
    
    updateGravityValueDisplay(gravityValue, searchString) {
        if (!this.gravityValue) return;
        
        let statusText = '';
        
        if (!searchString) {
            // No search string - gravity affects all items equally
            if (Math.abs(gravityValue) < 0.01) {
                statusText = ' (floating all items)';
            } else if (gravityValue > 0) {
                statusText = ` (attracting all items)`;
            } else {
                statusText = ` (repelling all items)`;
            }
        } else {
            // Abbreviate search string for display if it's too long
            const displaySearchString = searchString.length > 20 
                ? searchString.substring(0, 20) + '...' 
                : searchString;
            // With search string - gravity affects matching items
            if (Math.abs(gravityValue) < 0.01) {
                statusText = ` (floating "${displaySearchString}" items)`;
            } else if (gravityValue > 0) {
                statusText = ` (attracting "${displaySearchString}" items)`;
            } else {
                statusText = ` (repelling "${displaySearchString}" items)`;
            }
        }
        
        this.gravityValue.textContent = gravityValue + statusText;
    }
    
    updateMakeMagnetButtonState() {
        if (!this.makeMagnetButton) return;
        
        // Get search string to use (input field takes priority, then official)
        const magnetName = this.getMagnetNameForCreation();
        
        if (!magnetName) {
            // No search string available
            this.makeMagnetButton.disabled = true;
            this.makeMagnetButton.classList.add('disabled');
            this.makeMagnetButton.textContent = '🧲 Make Magnet';
            return;
        }
        
        // Check if magnet with this name already exists
        const currentMagnets = this.controller.simulatorState.magnets || [];
        const existingMagnet = currentMagnets.find(magnet => {
            return magnet.title.trim().toLowerCase() === magnetName.trim().toLowerCase();
        });
        
        // Always enable the button when there's a valid magnetName
        this.makeMagnetButton.disabled = false;
        this.makeMagnetButton.classList.remove('disabled');
        
        if (existingMagnet) {
            // Magnet already exists - show delete option
            this.makeMagnetButton.textContent = '🗑️ Delete Magnet';
        } else {
            // Can create magnet
            this.makeMagnetButton.textContent = '🧲 Make Magnet';
        }
    }
    
    getMagnetNameForCreation() {
        // Use input field if non-empty, otherwise use official search string
        const inputValue = this.newSearchInput.value.trim();
        if (inputValue) {
            return inputValue;
        }
        
        const officialValue = this.currentOfficialSearch.trim();
        if (officialValue) {
            return officialValue;
        }
        
        return null;
    }
    
    makeMagnetFromSearch() {
        const magnetName = this.getMagnetNameForCreation();
        
        if (!magnetName) {
            console.warn(`[GravityTab] Cannot create/delete magnet: no search string available`);
            return;
        }
        
        // Check if magnet already exists
        const currentMagnets = this.controller.simulatorState.magnets || [];
        const existingMagnet = currentMagnets.find(magnet => {
            return magnet.title.trim().toLowerCase() === magnetName.trim().toLowerCase();
        });
        
        if (existingMagnet) {
            // Delete the existing magnet
            console.log(`[GravityTab] Deleting magnet: "${existingMagnet.title}"`);
            this.controller.sendDeleteMagnetEvent(existingMagnet.title);
        } else {
            // Create new magnet
            console.log(`[GravityTab] Creating magnet: "${magnetName}"`);
            this.controller.sendAddMagnetEvent(magnetName);
        }
        
        // Update button state after action
        this.updateMakeMagnetButtonState();
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
        
        // Track which magnets are being deleted
        this.deletingMagnets = new Set();
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
                    console.log(`[Magnet] Device orientation tracking initialized`);
                } else {
                    console.log(`[Magnet] Device orientation tracking failed`);
                }
            });
        }
        
        // Auto-focus the magnet search input field
        setTimeout(() => {
            const magnetInput = document.getElementById('magnet-tag-input');
            if (magnetInput) {
                magnetInput.focus();
            }
        }, 100); // Small delay to ensure DOM is ready
        
        this.updateMagnetsList();
        console.log('Tab', 'MagnetTab activated');
    }
    
    addMagnet(tag) {
        // Trim the tag (case preserving) but check for duplicates case-insensitively
        const trimmedTag = tag.trim();
        if (!trimmedTag) return;
        
        // Get current magnets from simulator state
        const currentMagnets = this.controller.simulatorState.magnets || [];
        
        // Check if magnet with same tag already exists (case-insensitive, trimmed comparison)
        const existingMagnet = currentMagnets.find(magnet => {
            return magnet.title.trim().toLowerCase() === trimmedTag.toLowerCase();
        });
        
        if (existingMagnet) {
            console.log(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
            this.highlightExistingMagnet(existingMagnet.title);
            return;
        }
        
        // Send AddMagnet event to simulator
        this.controller.sendAddMagnetEvent(trimmedTag);
        console.log(`[Magnet] Sent AddMagnet command for: ${trimmedTag}`);
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
        // Prevent multiple delete attempts for the same magnet
        if (this.deletingMagnets.has(magnetName)) {
            console.log(`[Magnet] Delete already in progress for: ${magnetName}`);
            return;
        }
        
        // Add to deleting set
        this.deletingMagnets.add(magnetName);
        
        // Find the magnet item and button elements
        const magnetElement = document.querySelector(`[data-magnet-name="${magnetName}"]`);
        if (magnetElement) {
            // Add deleting class to the entire row
            magnetElement.classList.add('deleting');
            
            // Find and disable the delete button
            const deleteButton = magnetElement.querySelector('.magnet-delete-button');
            if (deleteButton) {
                deleteButton.classList.add('deleting');
                deleteButton.disabled = true;
            }
        }
        
        // Send DeleteMagnet event to simulator
        this.controller.sendDeleteMagnetEvent(magnetName);
        console.log(`[Magnet] Sent DeleteMagnet command for: ${magnetName}`);
    }
    
    updateMagnetsList() {
        // Don't update if content hasn't been created yet
        if (!this.contentElement) {
            return;
        }
        
        const list = document.getElementById('magnets-list');
        if (!list) {
            console.error('[MagnetTab] magnets-list element not found');
            return;
        }
        
        // Get magnets from simulator state
        const magnets = this.controller.simulatorState.magnets || [];
        
        // Extract magnet titles for comparison
        const magnetTitles = magnets.map(m => m.title);
        
        // Compare current magnets to cached displayed magnets
        const magnetsChanged = !this.arraysEqual(magnetTitles, this.displayedMagnetNames);
        
        if (!magnetsChanged) {
            return;
        }
        
        console.log(`[Magnet] Updating list: ${magnets.length} magnets`);
        
        // Tear down and recreate
        list.innerHTML = '';
        
        // Update cache with magnet titles
        this.displayedMagnetNames = [...magnetTitles];
        
        if (magnets.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'magnet-empty-message';
            emptyMsg.textContent = 'No magnets created yet';
            list.appendChild(emptyMsg);
            return;
        }
        
        magnets.forEach((magnet, index) => {
            // Handle both old string format and new object format
            const magnetName = magnet.title;
            
            // Create gesture instance for this magnet if not exists
            if (!this.magnetGestures.has(magnetName)) {
                this.createMagnetGesture(magnetName);
            }
            
            const item = document.createElement('div');
            item.className = 'magnet-item';
            item.dataset.magnetName = magnetName;
            
            // Apply deleting state if this magnet is being deleted
            if (this.deletingMagnets.has(magnetName)) {
                item.classList.add('deleting');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'magnet-name';
            nameSpan.textContent = magnetName;
            
            // Add touch event handlers to the ENTIRE ROW for dragging (Fitts' Law!)
            item.addEventListener('touchstart', (e) => this.handleTouchStart(e, magnetName));
            item.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            item.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            item.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'magnet-delete-button';
            deleteButton.textContent = 'Delete';
            
            // Apply deleting state if this magnet is being deleted
            if (this.deletingMagnets.has(magnetName)) {
                deleteButton.classList.add('deleting');
                deleteButton.disabled = true;
            }
            
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
            const magnetExists = magnets.some(m => {
                return m.title === magnetName;
            });
            
            if (!magnetExists) {
                this.removeMagnetGesture(magnetName);
                // Clean up deleting state when magnet is actually removed
                this.deletingMagnets.delete(magnetName);
            }
        }
    }
    
    onSimulatorStateChange(state) {
        // Update magnet list when simulator state changes
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
        
        console.log('Tab', 'MagnetTab deactivated');
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
                this.controller.sendPushMagnetEvent(magnetName, deltaX, deltaZ);
            },
            
            onTilt: (deltaX, deltaZ, touchId) => {
                this.controller.sendPushMagnetEvent(magnetName, deltaZ, deltaZ);
            },
            
            onTwist: (strengthDelta, direction, touchId) => {
                // TODO: Future - send magnet strength change command

            },
            
            onSelect: () => {
                console.log(`[Magnet] Selected: ${magnetName}`);
            },
            
            onDeselect: () => {
                console.log(`[Magnet] Deselected: ${magnetName}`);
            }
        });
        
        // Register with gesture service
        this.controller.gestureService.registerTarget(gestureInstanceId, gestureInstance);
        this.magnetGestures.set(magnetName, gestureInstanceId);
    }
    
    
    /**
     * Remove gesture instance for a magnet
     */
    removeMagnetGesture(magnetName) {
        const gestureInstanceId = this.magnetGestures.get(magnetName);
        if (gestureInstanceId) {
            this.controller.gestureService.unregisterTarget(gestureInstanceId);
            this.magnetGestures.delete(magnetName);
        }
    }
    
    
    /**
     * Handle touch start on magnet - use gesture service
     */
    handleTouchStart(e, magnetName) {
        e.preventDefault();
        
        const gestureInstanceId = this.magnetGestures.get(magnetName);
        if (!gestureInstanceId) {
            console.error(`[MagnetTab] No gesture instance found for magnet: ${magnetName}`);
            return;
        }
        
        // Process all touches for this magnet
        for (let touch of e.changedTouches) {
            this.controller.gestureService.handleTouchStart(touch, gestureInstanceId);
        }
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
    
    constructor(controller) {
        super(controller);

    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'adjust-content';
        
        const header = document.createElement('div');
        header.innerHTML = '<h2>Simulation Parameters</h2><p>Settings will be loaded from metadata</p>';
        this.contentElement.appendChild(header);
    }
}
