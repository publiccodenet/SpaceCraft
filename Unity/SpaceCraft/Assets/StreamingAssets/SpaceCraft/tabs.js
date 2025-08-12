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
        instructions.innerHTML = '<strong>DRAG to pan • SCROLL to zoom</strong><br>';
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
 * Magnets Tab - Search magnets creation and management
 */
export class MagnetsTab extends BaseTab {
    static tabId = 'magnets';
    static tabLabel = '🧲 Magnets';

    constructor(controller) {
        super(controller);
        
        // Cache for HTML sync optimization
        this.displayedMagnetNames = [];
        
        // Gesture tracking for magnets
        this.magnetGestures = new Map(); // magnetName -> gestureInstanceId
        
        // Track which magnets are being deleted
        this.deletingMagnets = new Set();
        
        // Sub-panel management
        this.currentPanel = null; // 'edit' or null
        this.mainButtonsContainer = null;
        this.subPanelContainer = null;
        this.magnetsListContainer = null;
        
        // Unified edit panel elements (simplified)
        this.searchInput = null;
        this.tagSuggestionsPanel = null;
        
        // Modal search editor
        this.modalSearchEditor = null;
        this.isModalOpen = false;
        
        // Edit panel state management
        this.editMode = null; // 'add' or 'frob'
        this.currentMagnetId = null; // null for add mode, magnetId for frob mode
        this.pendingMagnetId = null; // Used during add mode waiting
        this.isWaitingForMagnet = false; // True when waiting for new magnet to appear
    }
    
    createContent() {
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'magnets-content';
        this.contentElement.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
        `;
        
        // Title
        const header = document.createElement('div');
        header.innerHTML = '<h2>Magnets</h2>';
        header.style.cssText = `flex-shrink: 0; margin-bottom: 20px;`;
        this.contentElement.appendChild(header);
        
        // Main buttons row: Add
        this.mainButtonsContainer = document.createElement('div');
        this.mainButtonsContainer.className = 'main-buttons-row';
        this.mainButtonsContainer.style.cssText = `
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-shrink: 0;
        `;
        
        const addButton = document.createElement('button');
        addButton.className = 'main-button';
        addButton.textContent = 'Add';
        addButton.onclick = () => this.showEditPanel('add', null);
        
        this.mainButtonsContainer.appendChild(addButton);
        this.contentElement.appendChild(this.mainButtonsContainer);
        
        // Sub-panel container (replaces everything below when active)
        this.subPanelContainer = document.createElement('div');
        this.subPanelContainer.className = 'sub-panel-container';
        this.subPanelContainer.style.cssText = `
            flex: 1;
            display: none;
        `;
        this.contentElement.appendChild(this.subPanelContainer);
        
        // Default magnets list container
        this.magnetsListContainer = document.createElement('div');
        this.magnetsListContainer.className = 'magnets-list-container';
        this.magnetsListContainer.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;
        
        const magnetsList = document.createElement('div');
        magnetsList.id = 'magnets-list';
        magnetsList.className = 'magnets-list';
        this.magnetsListContainer.appendChild(magnetsList);
        this.contentElement.appendChild(this.magnetsListContainer);
        
        // Initialize magnets list display
        this.updateMagnetsList();
    }
    
    showEditPanel(mode, magnetId) {
        this.currentPanel = 'edit';
        this.editMode = mode;
        this.currentMagnetId = magnetId;
        this.isWaitingForMagnet = false;
        this.pendingMagnetId = null;
        
        // Hide magnets list and show sub-panel
        this.magnetsListContainer.style.display = 'none';
        this.subPanelContainer.style.display = 'flex';
        this.subPanelContainer.style.flexDirection = 'column';
        
        // Clear and populate sub-panel
        this.subPanelContainer.innerHTML = '';
        
        this.createEditPanel();
    }
    
    hidePanel() {
        this.currentPanel = null;
        this.editMode = null;
        this.currentMagnetId = null;
        this.pendingMagnetId = null;
        this.isWaitingForMagnet = false;
        this.subPanelContainer.style.display = 'none';
        this.magnetsListContainer.style.display = 'flex';
    }
    
    generateMagnetId() {
        // Generate unique ID: timestamp + 4 random digits
        const timestamp = Date.now();
        const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${timestamp}${randomDigits}`;
    }
    
    extractTimestampFromId(id) {
        // Extract timestamp from magnet ID (first 13 digits)
        if (!id || typeof id !== 'string') return null;
        const timestampStr = id.substring(0, 13);
        const timestamp = parseInt(timestampStr, 10);
        return isNaN(timestamp) ? null : timestamp;
    }
    
    createEditPanel() {
        // Buttons row - changes based on mode and state
        const buttonsRow = document.createElement('div');
        buttonsRow.className = 'edit-panel-buttons';
        buttonsRow.style.cssText = `
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-shrink: 0;
        `;
        
        // Create buttons based on current mode and state
        this.createEditPanelButtons(buttonsRow);
        this.subPanelContainer.appendChild(buttonsRow);
        
        if (this.editMode === 'add') {
            // Add mode: Simple text input with suggestions
            this.createAddModeInterface();
        } else if (this.editMode === 'frob') {
            // Frob mode: Structured interface with modal editor
            this.    createFrobModeInterface();
        }
    }
    
    createAddModeInterface() {
        // Full width text field
        const inputRow = document.createElement('div');
        inputRow.className = 'search-input-row';
        inputRow.style.cssText = `margin-bottom: 20px; flex-shrink: 0;`;
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'search-input full-width';
        this.searchInput.placeholder = 'Enter search text...';
        
        this.searchInput.oninput = () => this.populateTagSuggestions();
        this.searchInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !this.isWaitingForMagnet) {
                this.commitAddMagnet();
            }
        };
        
        // Disable input if waiting for magnet
        this.searchInput.disabled = this.isWaitingForMagnet;
        
        inputRow.appendChild(this.searchInput);
        this.subPanelContainer.appendChild(inputRow);
        
        // Add suggestions interface for add mode
        this.createSuggestionsInterface();
    }
    
    createFrobModeInterface() {
        // Get current magnet data
        const magnet = this.findMagnetById(this.currentMagnetId);
        if (!magnet) return;
        
        // Search Text row with Edit button
        const searchTextRow = document.createElement('div');
        searchTextRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
            flex-shrink: 0;
        `;
        
        const searchLabel = document.createElement('span');
        searchLabel.textContent = 'Search Text:';
        searchLabel.style.cssText = `
            font-weight: bold;
            color: #fff;
            min-width: 100px;
        `;
        
        const searchDisplay = document.createElement('span');
        searchDisplay.textContent = magnet.title || '';
        searchDisplay.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            background: #444;
            border-radius: 4px;
            color: #fff;
            border: 1px solid #666;
        `;
        
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.style.cssText = `
            padding: 8px 16px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        editButton.onclick = () => this.openModalSearchEditor(magnet.title || '');
        
        searchTextRow.appendChild(searchLabel);
        searchTextRow.appendChild(searchDisplay);
        searchTextRow.appendChild(editButton);
        this.subPanelContainer.appendChild(searchTextRow);
        
        // Store reference to display for updates
        this.searchDisplay = searchDisplay;
        
        // Magnet Strength slider (-100 to 100)
        const strengthRow = document.createElement('div');
        strengthRow.style.cssText = `
            margin-bottom: 15px;
            flex-shrink: 0;
        `;
        
        const strengthLabel = document.createElement('label');
        strengthLabel.textContent = 'Magnet Strength:';
        strengthLabel.style.cssText = `
            display: block;
            font-weight: bold;
            color: #fff;
            margin-bottom: 5px;
        `;
        
        const strengthSlider = document.createElement('input');
        strengthSlider.type = 'range';
        strengthSlider.min = '-100';
        strengthSlider.max = '100';
        strengthSlider.value = magnet.magnetStrength ? (magnet.magnetStrength * 100).toString() : '100';
        strengthSlider.style.cssText = `
            width: 100%;
            margin-bottom: 5px;
        `;
        
        const strengthValue = document.createElement('span');
        strengthValue.textContent = strengthSlider.value;
        strengthValue.style.cssText = `
            font-weight: bold;
            color: #fff;
        `;
        
        strengthSlider.oninput = () => {
            strengthValue.textContent = strengthSlider.value;
            // TODO: Update magnet strength in real-time
        };
        
        strengthRow.appendChild(strengthLabel);
        strengthRow.appendChild(strengthSlider);
        strengthRow.appendChild(strengthValue);
        this.subPanelContainer.appendChild(strengthRow);
        
        // Enabled checkbox
        const enabledRow = document.createElement('div');
        enabledRow.style.cssText = `
            margin-bottom: 15px;
            flex-shrink: 0;
        `;
        
        const enabledLabel = document.createElement('label');
        enabledLabel.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            color: #fff;
            cursor: pointer;
        `;
        
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.checked = magnet.enabled !== false;
        enabledCheckbox.style.cssText = `
            transform: scale(1.2);
        `;
        
        enabledCheckbox.onchange = () => {
            // TODO: Update magnet enabled state in real-time
        };
        
        const enabledText = document.createElement('span');
        enabledText.textContent = 'Enabled';
        enabledText.style.cssText = `font-weight: bold;`;
        
        enabledLabel.appendChild(enabledCheckbox);
        enabledLabel.appendChild(enabledText);
        enabledRow.appendChild(enabledLabel);
        this.subPanelContainer.appendChild(enabledRow);
    }
    
    createSuggestionsInterface() {
        // Simple suggestions label (no mode controls needed)
        const suggestionsLabel = document.createElement('div');
        suggestionsLabel.textContent = 'Tag Suggestions:';
        suggestionsLabel.style.cssText = `
            font-weight: bold;
            margin: 10px 0 5px 0;
            color: #fff;
        `;
        this.subPanelContainer.appendChild(suggestionsLabel);
        
        // Tag suggestions panel
        this.tagSuggestionsPanel = this.createTagSuggestionsPanel();
        this.subPanelContainer.appendChild(this.tagSuggestionsPanel);
        
        // Populate initial suggestions
        this.populateTagSuggestions();
    }
    
    openModalSearchEditor(currentText) {
        if (this.isModalOpen) return;
        this.isModalOpen = true;
        
        // Create modal overlay
        this.modalSearchEditor = document.createElement('div');
        this.modalSearchEditor.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;
        
        // Modal content container
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #333;
            margin: 20px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            height: calc(100vh - 40px);
        `;
        
        // Header with title and buttons
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #555;
            flex-shrink: 0;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Enter Search String';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #fff;
            text-align: center;
        `;
        
        // Text input (pinned to top)
        const modalInput = document.createElement('input');
        modalInput.type = 'text';
        modalInput.value = currentText;
        modalInput.style.cssText = `
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: 2px solid #555;
            border-radius: 4px;
            background: #444;
            color: #fff;
            box-sizing: border-box;
        `;
        
        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = `
            display: flex;
            gap: 15px;
            margin-top: 15px;
        `;
        
        const setButton = document.createElement('button');
        setButton.textContent = 'Set';
        setButton.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #007acc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
        `;
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
        `;
        
        // Suggestions list (scrollable)
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        `;
        
        const suggestionsList = document.createElement('div');
        suggestionsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
        `;
        
        // Populate suggestions
        const availableTags = this.controller.simulatorState.tags || [];
        availableTags.forEach(tag => {
            const item = document.createElement('div');
            item.textContent = tag;
            item.style.cssText = `
                padding: 12px;
                cursor: pointer;
                background: #444;
                border-radius: 4px;
                color: #fff;
                transition: background-color 0.2s;
            `;
            item.onmouseenter = () => item.style.backgroundColor = '#555';
            item.onmouseleave = () => item.style.backgroundColor = '#444';
            item.onclick = () => {
                modalInput.value = tag;
                modalInput.focus();
            };
            suggestionsList.appendChild(item);
        });
        
        // Event handlers
        const closeModal = () => {
            if (this.modalSearchEditor) {
                document.body.removeChild(this.modalSearchEditor);
                this.modalSearchEditor = null;
                this.isModalOpen = false;
            }
        };
        
        const saveAndClose = () => {
            const newText = modalInput.value.trim();
            if (newText && this.searchDisplay) {
                this.searchDisplay.textContent = newText;
                // Update the magnet with new search text
                this.updateMagnetSearchText(newText);
            }
            closeModal();
        };
        
        setButton.onclick = saveAndClose;
        cancelButton.onclick = closeModal;
        
        modalInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveAndClose();
            } else if (e.key === 'Escape') {
                closeModal();
            }
        };
        
        // Filter suggestions as user types
        modalInput.oninput = () => {
            const searchText = modalInput.value.toLowerCase();
            const items = suggestionsList.children;
            
            for (let item of items) {
                const tag = item.textContent.toLowerCase();
                if (!searchText || tag.includes(searchText)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            }
        };
        
        // Assemble modal
        buttonRow.appendChild(setButton);
        buttonRow.appendChild(cancelButton);
        header.appendChild(title);
        header.appendChild(modalInput);
        header.appendChild(buttonRow);
        suggestionsContainer.appendChild(suggestionsList);
        modalContent.appendChild(header);
        modalContent.appendChild(suggestionsContainer);
        this.modalSearchEditor.appendChild(modalContent);
        
        // Add to DOM and focus
        document.body.appendChild(this.modalSearchEditor);
        setTimeout(() => {
            modalInput.focus();
            modalInput.select();
        }, 100);
    }
    
    updateMagnetSearchText(newText) {
        if (this.editMode === 'frob' && this.currentMagnetId) {
            // For now, use the existing pattern - delete old and add new with same ID
            this.controller.sendDeleteMagnetEvent(this.currentMagnetId);
            setTimeout(() => {
                this.controller.sendAddMagnetEvent(newText, this.currentMagnetId);
            }, 50);
            console.log(`[Magnets] Updated magnet ${this.currentMagnetId} search text: ${newText}`);
        }
        
        // Auto-focus the search input if not waiting
        if (!this.isWaitingForMagnet) {
            setTimeout(() => {
                if (this.searchInput) {
                    this.searchInput.focus();
                }
            }, 100);
        }
    }
    
    createEditPanelButtons(buttonsRow) {
        if (this.editMode === 'add') {
            if (this.isWaitingForMagnet) {
                // Waiting for magnet to be created
                const cancelButton = document.createElement('button');
                cancelButton.className = 'panel-button';
                cancelButton.textContent = 'Cancel';
                cancelButton.onclick = () => this.cancelAddMagnet();
                buttonsRow.appendChild(cancelButton);
                
                const statusSpan = document.createElement('span');
                statusSpan.textContent = 'Creating magnet...';
                statusSpan.style.cssText = 'color: #fff; font-style: italic; align-self: center;';
                buttonsRow.appendChild(statusSpan);
            } else {
                // Normal add mode
                const addMagnetButton = document.createElement('button');
                addMagnetButton.className = 'panel-button';
                addMagnetButton.textContent = 'Add Magnet';
                addMagnetButton.onclick = () => this.commitAddMagnet();
                
                const cancelButton = document.createElement('button');
                cancelButton.className = 'panel-button';
                cancelButton.textContent = 'Cancel';
                cancelButton.onclick = () => this.hidePanel();
                
                buttonsRow.appendChild(addMagnetButton);
                buttonsRow.appendChild(cancelButton);
            }
        } else if (this.editMode === 'frob') {
            // Frob mode
            const removeMagnetButton = document.createElement('button');
            removeMagnetButton.className = 'panel-button remove-button';
            removeMagnetButton.textContent = 'Remove Magnet';
            removeMagnetButton.onclick = () => this.removeMagnetAndClose();
            
            const doneButton = document.createElement('button');
            doneButton.className = 'panel-button';
            doneButton.textContent = 'Done';
            doneButton.onclick = () => this.hidePanel();
            
            buttonsRow.appendChild(removeMagnetButton);
            buttonsRow.appendChild(doneButton);
        }
    }
    
    // Methods moved from GravityTab

    
    createTagSuggestionsPanel() {
        const panel = document.createElement('div');
        panel.className = 'suggestions-panel';
        panel.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;
        
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
            flex-shrink: 0;
        `;
        panel.appendChild(header);
        
        const list = document.createElement('div');
        list.className = 'suggestions-list scroll-area';
        list.style.cssText = `
            flex: 1;
            overflow-y: auto;
        `;
        panel.appendChild(list);
        
        return panel;
    }
    
    populateTagSuggestions() {
        if (!this.tagSuggestionsPanel) return;
        
        const list = this.tagSuggestionsPanel.querySelector('.suggestions-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        const searchText = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
        const availableTags = this.controller.simulatorState.tags || [];
        
        let tagsToShow = [];
        
        if (searchText) {
            // Separate prefix and infix matches
            const prefixMatches = [];
            const infixMatches = [];
            
            availableTags.forEach(tag => {
                const lowerTag = tag.toLowerCase();
                if (lowerTag.startsWith(searchText)) {
                    prefixMatches.push(tag);
                } else if (lowerTag.includes(searchText)) {
                    infixMatches.push(tag);
                }
            });
            
            // Show prefix matches first, then infix matches
            tagsToShow = [...prefixMatches, ...infixMatches];
        } else {
            // Show all tags when no search text
            tagsToShow = [...availableTags];
        }
        
        // Limit to 50 suggestions for performance
        tagsToShow = tagsToShow.slice(0, 50);
        
        // Update header with count
        const header = this.tagSuggestionsPanel.querySelector('.suggestions-header');
        if (header) {
            const count = tagsToShow.length;
            const plural = count === 1 ? '' : 's';
            header.textContent = `${count} Tag Suggestion${plural}:`;
        }
        
        // Create suggestion items
        tagsToShow.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = tag;
            item.style.cssText = `
                padding: 8px;
                cursor: pointer;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            `;
            item.onclick = () => this.selectTag(tag);
            list.appendChild(item);
        });
    }
    
    selectTag(tag) {
        if (this.searchInput) {
            this.searchInput.value = tag;
            this.populateTagSuggestions();
        }
    }
    
    commitAddMagnet() {
        const searchText = this.searchInput ? this.searchInput.value.trim() : '';
        if (!searchText) return;
        
        // Generate unique magnet ID
        this.pendingMagnetId = this.generateMagnetId();
        this.isWaitingForMagnet = true;
        
        // Update UI to waiting state
        this.updateEditPanelButtons();
        this.searchInput.disabled = true;
        
        // Create magnet JSON
        const magnetData = {
            id: this.pendingMagnetId,
            title: searchText,
            timestamp: Date.now()
        };
        
        // Send create magnet command
        this.controller.sendAddMagnetEvent(searchText, this.pendingMagnetId);
        console.log(`[Magnets] Creating magnet with ID: ${this.pendingMagnetId}`);
    }
    
    cancelAddMagnet() {
        if (this.pendingMagnetId) {
            // Send delete command for the pending magnet
            this.controller.sendDeleteMagnetEvent(this.pendingMagnetId);
            console.log(`[Magnets] Cancelling magnet creation: ${this.pendingMagnetId}`);
        }
        this.hidePanel();
    }
    
    updateMagnetLive() {
        if (this.editMode === 'frob' && this.currentMagnetId) {
            const searchText = this.searchInput ? this.searchInput.value.trim() : '';
            if (searchText) {
                // For now, use the existing pattern - delete old and add new with same ID
                // This gives live update behavior until we have a proper update method
                const currentMagnet = this.findMagnetById(this.currentMagnetId);
                if (currentMagnet && currentMagnet.title !== searchText) {
                    // Only update if the text actually changed
                    this.controller.sendDeleteMagnetEvent(this.currentMagnetId);
                    // Use a small delay to ensure delete completes before add
                    setTimeout(() => {
                        this.controller.sendAddMagnetEvent(searchText, this.currentMagnetId);
                    }, 50);
                    console.log(`[Magnets] Live updating magnet ${this.currentMagnetId}: ${searchText}`);
                }
            }
        }
    }
    
    removeMagnetAndClose() {
        if (this.currentMagnetId) {
            this.deleteMagnet(this.currentMagnetId);
            this.hidePanel();
        }
    }
    
    findMagnetById(magnetId) {
        const magnets = this.controller.simulatorState.magnets || [];
        return magnets.find(magnet => magnet.id === magnetId || magnet.title === magnetId);
    }
    
    updateEditPanelButtons() {
        // Update the buttons in the current edit panel
        const buttonsRow = this.subPanelContainer.querySelector('.edit-panel-buttons');
        if (buttonsRow) {
            buttonsRow.innerHTML = '';
            this.createEditPanelButtons(buttonsRow);
        }
    }
    
    addMagnetFromSearch() {
        // Legacy method - redirect to commitAddMagnet
        this.commitAddMagnet();
    }
    
    activate() {
        // Initialize orientation tracking when magnets tab becomes active
        if (!this.controller.motionModule.isOrientationActive) {
            this.controller.motionModule.initializeOrientationTracking().then(success => {
                if (success) {
                    console.log(`[Magnets] Device orientation tracking initialized`);
                } else {
                    console.log(`[Magnets] Device orientation tracking failed`);
                }
            });
        }
        
        this.updateMagnetsList();
        console.log('Tab', 'MagnetsTab activated');
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
            console.log(`[Magnets] Duplicate magnet: "${existingMagnet.title}"`);
            this.highlightExistingMagnet(existingMagnet.title);
            return;
        }
        
        // Send AddMagnet event to simulator
        this.controller.sendAddMagnetEvent(trimmedTag);
        console.log(`[Magnets] Sent AddMagnet command for: ${trimmedTag}`);
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
            console.log(`[Magnets] Delete already in progress for: ${magnetName}`);
            return;
        }
        
        // Add to deleting set
        this.deletingMagnets.add(magnetName);
        
        // Find the magnet item and button elements
        const magnetElement = document.querySelector(`[data-magnet-name="${magnetName}"]`);
        if (magnetElement) {
            // Add deleting class to the entire row
            magnetElement.classList.add('deleting');
            
            // Find and disable the frob button (or delete button for backward compatibility)
            const frobButton = magnetElement.querySelector('.magnet-frob-button, .magnet-delete-button');
            if (frobButton) {
                frobButton.classList.add('deleting');
                frobButton.disabled = true;
            }
        }
        
        // Send DeleteMagnet event to simulator
        this.controller.sendDeleteMagnetEvent(magnetName);
        console.log(`[Magnets] Sent DeleteMagnet command for: ${magnetName}`);
    }
    
    updateMagnetsList() {
        // Don't update if content hasn't been created yet
        if (!this.contentElement) {
            return;
        }
        
        const list = document.getElementById('magnets-list');
        if (!list) {
            console.error('[MagnetsTab] magnets-list element not found');
            return;
        }
        
        // Get magnets from simulator state
        const rawMagnets = this.controller.simulatorState.magnets || [];
        
        // Sort magnets by timestamp (newest first) - extract timestamp from ID if available
        const magnets = rawMagnets.sort((a, b) => {
            const aTimestamp = this.extractTimestampFromId(a.id || a.title) || 0;
            const bTimestamp = this.extractTimestampFromId(b.id || b.title) || 0;
            return bTimestamp - aTimestamp; // Descending order (newest first)
        });
        
        // Extract magnet titles for comparison
        const magnetTitles = magnets.map(m => m.title);
        
        // Compare current magnets to cached displayed magnets
        const magnetsChanged = !this.arraysEqual(magnetTitles, this.displayedMagnetNames);
        
        if (!magnetsChanged) {
            return;
        }
        
        console.log(`[Magnets] Updating list: ${magnets.length} magnets`);
        
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
            
            const frobButton = document.createElement('button');
            frobButton.className = 'magnet-frob-button';
            frobButton.textContent = 'Frob';
            
            // Apply deleting state if this magnet is being deleted
            if (this.deletingMagnets.has(magnetName)) {
                frobButton.classList.add('deleting');
                frobButton.disabled = true;
            }
            
            frobButton.onclick = (e) => {
                e.stopPropagation(); // Prevent any parent event handling
                const magnetId = magnet.id || magnetName; // Use ID if available, fallback to name
                this.showEditPanel('frob', magnetId);
            };
            
            item.appendChild(nameSpan);
            item.appendChild(frobButton);
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
        // Check if we're waiting for a magnet to be created
        if (this.isWaitingForMagnet && this.pendingMagnetId) {
            const magnets = state.magnets || [];
            const newMagnet = magnets.find(magnet => 
                magnet.id === this.pendingMagnetId || 
                magnet.title === this.pendingMagnetId
            );
            
            if (newMagnet) {
                // Magnet was created successfully - switch to frob mode
                console.log(`[Magnets] New magnet created successfully: ${newMagnet.title}`);
                this.isWaitingForMagnet = false;
                this.editMode = 'frob';
                this.currentMagnetId = newMagnet.id || newMagnet.title;
                this.pendingMagnetId = null;
                
                // Update the edit panel to frob mode
                this.updateEditPanelButtons();
                this.searchInput.disabled = false;
                this.searchInput.focus();
            }
        }
        
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
        
        console.log('Tab', 'MagnetsTab deactivated');
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
                console.log(`[Magnets] Selected: ${magnetName}`);
            },
            
            onDeselect: () => {
                console.log(`[Magnets] Deselected: ${magnetName}`);
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
            console.error(`[MagnetsTab] No gesture instance found for magnet: ${magnetName}`);
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
