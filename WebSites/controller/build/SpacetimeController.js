import { ReactiveProperty, Register, Node, Property, IoElement, h2, div, p, img, h4, iframe, h3, ioObject, ioButton, ioNumberSlider, ioString, ioInspector, ioNavigator, ioMarkdown, MenuOption, Storage } from 'io-gui';

var __decorate$8 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let SimulatorState = class SimulatorState extends Node {
    update(state) {
        this.setProperties({
            clientId: state.clientId || '',
            clientName: state.clientName || '',
            clientType: state.clientType || '',
            connectedClients: state.connectedClients || [],
            currentCollection: state.currentCollection || {},
            currentCollectionId: state.currentCollectionId || '',
            currentCollectionItems: state.currentCollectionItems || [],
            currentScreenId: state.currentScreenId || '',
            currentSearchGravity: state.currentSearchGravity || 0,
            currentSearchString: state.currentSearchString || '',
            highlightedItem: state.highlightedItem || null,
            highlightedItemId: state.highlightedItemId || '',
            highlightedItemIds: state.highlightedItemIds || [],
            magnets: state.magnets || [],
            screenIds: state.screenIds || [],
            selectedItem: state.selectedItem || null,
            selectedItemId: state.selectedItemId || '',
            selectedItemIds: state.selectedItemIds || [],
            lastUpdated: state.lastUpdated,
            tags: state.tags || [],
            updateCounter: state.updateCounter,
        });
    }
};
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "clientId", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "clientName", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "clientType", void 0);
__decorate$8([
    ReactiveProperty()
], SimulatorState.prototype, "connectedClients", void 0);
__decorate$8([
    ReactiveProperty({ type: Object })
], SimulatorState.prototype, "currentCollection", void 0);
__decorate$8([
    ReactiveProperty()
], SimulatorState.prototype, "currentCollectionId", void 0);
__decorate$8([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "currentCollectionItems", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "currentScreenId", void 0);
__decorate$8([
    ReactiveProperty({ type: Number })
], SimulatorState.prototype, "currentSearchGravity", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "currentSearchString", void 0);
__decorate$8([
    ReactiveProperty({ type: Object })
], SimulatorState.prototype, "highlightedItem", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "highlightedItemId", void 0);
__decorate$8([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "highlightedItemIds", void 0);
__decorate$8([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "magnets", void 0);
__decorate$8([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "screenIds", void 0);
__decorate$8([
    ReactiveProperty({ type: Object })
], SimulatorState.prototype, "selectedItem", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "selectedItemId", void 0);
__decorate$8([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "selectedItemIds", void 0);
__decorate$8([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "lastUpdated", void 0);
__decorate$8([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "tags", void 0);
__decorate$8([
    ReactiveProperty({ type: Number })
], SimulatorState.prototype, "updateCounter", void 0);
SimulatorState = __decorate$8([
    Register
], SimulatorState);

var __decorate$7 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let TabBase = class TabBase extends IoElement {
    static get Style() {
        return /* css */ `
            :host {
                flex: 1 1 auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 2em;
                overflow-y: auto;
            }
        `;
    }
    static get Listeners() {
        return {
            'contextmenu': 'preventDefault',
            'pointerdown': 'onPointerdown',
            'touchstart': ['preventDefault', { passive: false }],
            'touchmove': ['preventDefault', { passive: false }],
        };
    }
    constructor(props) {
        super(props);
    }
    preventDefault(event) {
        event.preventDefault();
    }
    onPointerdown(event) {
        this.setPointerCapture(event.pointerId);
        this.addEventListener('pointerup', this.onPointerup);
        this.addEventListener('pointermove', this.onPointermove);
        this.addEventListener('pointercancel', this.onPointerup);
    }
    onPointermove(event) { }
    onPointerup(event) {
        this.releasePointerCapture(event.pointerId);
        this.removeEventListener('pointerup', this.onPointerup);
        this.removeEventListener('pointermove', this.onPointermove);
        this.removeEventListener('pointercancel', this.onPointerup);
    }
    ready() {
        this.changed();
    }
    simulatorStateMutated() {
        this.changed();
    }
    changed() {
        this.render([
            h2('TabBase'),
        ]);
    }
};
__decorate$7([
    Property()
], TabBase.prototype, "controller", void 0);
__decorate$7([
    ReactiveProperty({ type: SimulatorState })
], TabBase.prototype, "simulatorState", void 0);
TabBase = __decorate$7([
    Register
], TabBase);

var __decorate$6 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let TabNavigate = class TabNavigate extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                justify-content: center;
            }
            :host > h2 {
                pointer-events: none;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
        `;
    }
    onPointermove(event) {
        super.onPointermove(event);
        if (event.movementX || event.movementY) {
            this.controller.sendPanEvent(event.movementX * 0.03, event.movementY * 0.03);
        }
    }
    changed() {
        this.render([
            h2('DRAG to pan • SCROLL to zoom'),
        ]);
    }
};
TabNavigate = __decorate$6([
    Register
], TabNavigate);
const tabNavigate = function (arg0) {
    return TabNavigate.vConstructor(arg0);
};

var __decorate$5 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const GESTURE_THRESHOLD = 20;
let TabSelect = class TabSelect extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                text-align: justify;
            }
            :host .cover-image {
                float: right;
                margin: 4.2em 0 0.5em 1em;
            }
        `;
    }
    onPointerdown(event) {
        super.onPointerdown(event);
        this.startX = event.clientX;
        this.startY = event.clientY;
    }
    onPointerup(event) {
        super.onPointerup(event);
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let gesture = 'tap';
        if (distance > GESTURE_THRESHOLD) {
            if (Math.abs(dx) > Math.abs(dy)) {
                gesture = dx > 0 ? 'east' : 'west';
            }
            else {
                gesture = dy > 0 ? 'south' : 'north';
            }
        }
        switch (gesture) {
            case 'tap':
                this.controller.sendSelectEvent('tap');
                break;
            case 'north':
                this.controller.sendSelectEvent('north');
                break;
            case 'south':
                this.controller.sendSelectEvent('south');
                break;
            case 'east':
                this.controller.sendSelectEvent('east');
                break;
            case 'west':
                this.controller.sendSelectEvent('west');
                break;
        }
    }
    changed() {
        let description = 'No description available';
        const selected = this.simulatorState?.selectedItem;
        if (selected?.description) {
            description = selected.description
                .split(/\n+/) // Split on any number of newlines
                .filter((line) => line.trim().length > 0) // Remove empty lines
                .map((line) => `<p>${line.trim()}</p>`) // Create paragraph for each line
                .join('');
        }
        this.render([
            h2('TAP or SWIPE to select items'),
            selected ? div([
                img({ src: `../spacetime/StreamingAssets/Content/collections/scifi/items/${selected.id}/cover.jpg`, alt: `Cover for ${selected.title}`, class: 'cover-image' }),
                h4(selected.title || 'Untitled'),
                div({ class: 'description', innerHTML: description }),
            ]) : p('No item selected'),
        ]);
    }
};
TabSelect = __decorate$5([
    Register
], TabSelect);
const tabSelect = function (arg0) {
    return TabSelect.vConstructor(arg0);
};

var __decorate$4 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let TabInspect = class TabInspect extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                padding: 0;
            }
            :host > iframe {
                flex: 1 1 auto;
                border: none;
                align-self: stretch;
            }
        `;
    }
    changed() {
        const selected = this.simulatorState.selectedItem;
        let itemUrl = '';
        if (selected) {
            itemUrl = selected.url;
            // If no explicit URL found, construct from Internet Archive ID
            if (!itemUrl && selected.id) {
                itemUrl = `https://archive.org/details/${selected.id}`;
            }
        }
        this.render([
            iframe({ src: itemUrl || 'about:blank' }),
        ]);
    }
};
TabInspect = __decorate$4([
    Register
], TabInspect);
const tabInspect = function (arg0) {
    return TabInspect.vConstructor(arg0);
};

var __decorate$3 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let MagnetItem = class MagnetItem extends IoElement {
    static get Style() {
        return /* css */ `
            :host {
                display: flex;
                flex-direction: row;
                gap: 0.5em;
                border: var(--io_border);
                border-color: var(--io_borderColorOutset);
                margin: 0.5em 0;
                padding: 0.5em;
                border-radius: var(--io_borderRadius);
                background-color: var(--io_bgColor);
            }
            :host > h3 {
                margin: 0 1em 0 0;
            }
            :host > io-object {
                flex: 1 1 auto;
            }
    `;
    }
    onDeleteMagnet() {
        this.controller.sendDeleteMagnetEvent(this.magnet.title);
    }
    changed() {
        this.render([
            h3(this.magnet.title),
            ioObject({ value: this.magnet, label: 'Magnet Data' }),
            ioButton({ label: 'Delete', action: this.onDeleteMagnet, class: 'red' })
        ]);
    }
};
__decorate$3([
    ReactiveProperty({ type: Object })
], MagnetItem.prototype, "magnet", void 0);
__decorate$3([
    ReactiveProperty({ type: Object })
], MagnetItem.prototype, "controller", void 0);
MagnetItem = __decorate$3([
    Register
], MagnetItem);
const magnetItem = function (arg0) {
    return MagnetItem.vConstructor(arg0);
};

var __decorate$2 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
function reverseGravityCurve(gravityValue) {
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
function applyGravityCurve(rawValue) {
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
let TabMagnet = class TabMagnet extends TabBase {
    static get Style() {
        return /* css */ `
          :host {
              display: block;
          }
          :host .input-row {
              display: flex;
              flex-direction: row;
              gap: 10px;
          }
          :host .input-row > io-string {
              flex: 1 1 auto;
          }
          :host .input-row > io-button {
              flex: 0 0 4rem;
          }
          :host > io-number-slider {
              align-self: stretch;
          }
          :host > io-number-slider > io-number {
              flex-basis: 4rem;
          }
      `;
    }
    onGravitySet(event) {
        const curvedValue = applyGravityCurve(event.detail.value);
        this.controller.setSearchGravity(curvedValue);
    }
    onAddMagnet() {
        const input = this.$['magnet-name-input'];
        const name = (input).value.trim();
        if (name) {
            input.value = '';
            const currentMagnets = this.simulatorState.magnets || [];
            const existingMagnet = currentMagnets.find(magnet => {
                return magnet.title.trim().toLowerCase() === name.toLowerCase();
            });
            if (existingMagnet) {
                console.warn(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
                // this.highlightExistingMagnet(existingMagnet.title);
                return;
            }
            this.controller.sendAddMagnetEvent(name);
        }
    }
    onKeyUp(event) {
        if (event.key === 'Enter') {
            this.onAddMagnet();
        }
    }
    changed() {
        const currentGravity = this.simulatorState.currentSearchGravity;
        const sliderValue = reverseGravityCurve(currentGravity);
        const magnets = this.simulatorState.magnets || [];
        this.render([
            h2('Gravity Force'),
            ioNumberSlider({ min: -100, max: 100, step: 1, value: sliderValue, '@value-input': this.onGravitySet }),
            h2('Search Magnets'),
            p('Create magnets to attract related items'),
            div({ class: 'input-row' }, [
                ioString({ id: 'magnet-name-input', placeholder: 'Magnet Search String', live: true, '@keyup': this.onKeyUp }),
                ioButton({ label: 'Add', action: this.onAddMagnet })
            ]),
            ...magnets.map(magnet => magnetItem({ magnet: magnet, controller: this.controller }))
        ]);
    }
};
TabMagnet = __decorate$2([
    Register
], TabMagnet);
const tabMagnet = function (arg0) {
    return TabMagnet.vConstructor(arg0);
};

var __decorate$1 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let TabAdjust = class TabAdjust extends TabBase {
    static get Style() {
        return /* css */ `
            :host > io-inspector {
              align-self: stretch;
            }
            :host io-property-editor > .row > span {
              flex: 0 1 10rem;
            }
        `;
    }
    changed() {
        this.render([
            h2('Simulation State'),
            ioInspector({
                value: this.simulatorState,
                groups: new Map([
                    [Object, {
                            'Hidden': ['reactivity'],
                        }],
                ]),
            })
        ]);
    }
};
TabAdjust = __decorate$1([
    Register
], TabAdjust);
const tabAdjust = function (arg0) {
    return TabAdjust.vConstructor(arg0);
};

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SpacetimeController_1;
function generateClientId() {
    return 'controller-' + Math.random().toString(36).substr(2, 9);
}
function generateClientName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `Controller-${timestamp}`;
}
let SpacetimeController = class SpacetimeController extends IoElement {
    static { SpacetimeController_1 = this; }
    static get Style() {
        return /* css */ `
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
            }
            :host > io-navigator {
                flex: 1 1 auto;
                overflow: hidden;
            }
    `;
    }
    static supabaseUrl = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
    static supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
    static clientChannelName = 'spacecraft';
    static clientType = 'controller';
    constructor(props) {
        super(props);
        // Client Identity
        this.clientId = generateClientId();
        this.clientName = generateClientName();
        // Connection State
        this.supabaseClient = null;
        this.clientChannel = null;
        this.clientConnected = false;
        this.currentSimulatorId = null;
        this.connect();
    }
    connect() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library missing!');
            return;
        }
        try {
            const channelName = new URLSearchParams(window.location.search).get('channel') || SpacetimeController_1.clientChannelName;
            this.supabaseClient = supabase.createClient(SpacetimeController_1.supabaseUrl, SpacetimeController_1.supabaseAnonKey);
            this.clientChannel = this.supabaseClient.channel(channelName, {
                config: { presence: { key: this.clientId } }
            });
            this.setupPresenceHandlers();
            this.subscribeToChannel();
        }
        catch (error) {
            console.error('Controller connection failed:', error);
            console.error('[Controller] Connection failed:', error);
        }
    }
    ready() {
        this.render([
            ioNavigator({
                menu: 'top',
                caching: 'proactive',
                option: new MenuOption({
                    id: 'root',
                    options: [
                        { id: 'About', icon: '📖' },
                        { id: 'Navigate', icon: '🧭' },
                        { id: 'Select', icon: '👆' },
                        { id: 'Inspect', icon: '🔍' },
                        { id: 'Magnet', icon: '🧲' },
                        { id: 'Adjust', icon: '⚙️' },
                    ],
                    selectedID: Storage({ key: 'page', storage: 'hash', value: 'About' })
                }),
                elements: [
                    ioMarkdown({ id: 'About', src: './docs/About.md' }),
                    tabNavigate({ id: 'Navigate', controller: this, simulatorState: this.simulatorState }),
                    tabSelect({ id: 'Select', controller: this, simulatorState: this.simulatorState }),
                    tabInspect({ id: 'Inspect', controller: this, simulatorState: this.simulatorState }),
                    tabMagnet({ id: 'Magnet', controller: this, simulatorState: this.simulatorState }),
                    tabAdjust({ id: 'Adjust', controller: this, simulatorState: this.simulatorState }),
                ]
            })
        ]);
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
    sendEventToSimulator(eventType, data) {
        if (!this.clientChannel) {
            console.error('[Controller] Cannot send event - no client channel');
            return;
        }
        if (!this.currentSimulatorId) {
            console.error('[Controller] Cannot send event - no current simulator ID');
            return;
        }
        const payload = {
            clientId: this.clientId,
            clientType: SpacetimeController_1.clientType,
            clientName: this.clientName,
            screenId: 'main',
            targetSimulatorId: this.currentSimulatorId,
            ...data
        };
        this.clientChannel.send({
            type: 'broadcast',
            event: eventType,
            payload: payload
        }).catch((err) => {
            console.error(`[Controller] Send '${eventType}' failed:`, err);
        });
    }
    setSearchGravity(gravity) {
        this.simulatorState.currentSearchGravity = Math.max(-100, Math.min(100, gravity));
        this.sendEventToSimulator('gravityUpdate', {
            searchGravity: this.simulatorState.currentSearchGravity
        });
    }
    setupPresenceHandlers() {
        this.clientChannel
            .on('presence', { event: 'sync' }, () => {
            const presenceState = this.clientChannel.presenceState();
            const simulator = this.findLatestSimulator(presenceState);
            if (simulator) {
                this.currentSimulatorId = simulator.clientId;
                this.simulatorState.update(simulator.shared);
            }
        })
            .on('broadcast', { event: 'simulator_takeover' }, (payload) => {
            this.currentSimulatorId = payload.newSimulatorId;
        });
    }
    subscribeToChannel() {
        this.clientChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                this.clientConnected = true;
                await this.clientChannel.track({
                    clientId: this.clientId,
                    clientType: SpacetimeController_1.clientType,
                    clientName: this.clientName,
                    startTime: Date.now()
                });
            }
        });
    }
    async updatePresenceState() {
        if (this.clientConnected && this.clientChannel) {
            try {
                await this.clientChannel.track({
                    clientId: this.clientId,
                    clientType: SpacetimeController_1.clientType,
                    clientName: this.clientName,
                    startTime: Date.now()
                });
            }
            catch (error) {
                console.error('[Connection] Failed to update presence:', error);
            }
        }
    }
    findLatestSimulator(presenceState) {
        let latestSimulator = null;
        let latestStartTime = 0;
        Object.values(presenceState).forEach(presences => {
            presences.forEach((presence) => {
                if (presence.clientType === 'simulator' && presence.startTime > latestStartTime) {
                    latestSimulator = presence;
                    latestStartTime = presence.startTime;
                }
            });
        });
        return latestSimulator;
    }
};
__decorate([
    ReactiveProperty({ type: SimulatorState, init: null })
], SpacetimeController.prototype, "simulatorState", void 0);
SpacetimeController = SpacetimeController_1 = __decorate([
    Register
], SpacetimeController);

export { SpacetimeController };
