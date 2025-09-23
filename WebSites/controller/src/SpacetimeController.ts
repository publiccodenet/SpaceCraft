import { IoElement, Register, ioNavigator, MenuOption, Storage as $, ioMarkdown, ReactiveProperty, IoElementProps, ThemeSingleton, div, img, a } from 'io-gui';
import { VIEW_MODE_OPTIONS, DEFAULT_VIEW_MODE, ViewMode } from './types/ViewMode.js';
import { contentStore } from './services/ContentStore.js';
import type { SimulatorSharedContent } from './types/Content.js';
import { tabView } from './TabView.js';
import { tabSelect } from './TabSelect.js';
import { tabInspect } from './TabInspect.js';
import { tabArrange } from './TabArrange.js';
import { tabAbout } from './TabAbout.js';
import { SimulatorState } from './SimulatorState.js';
import './Icons.js';
import type { Magnet } from './types/Magnet';
import type { MagnetViewMetadata } from './types/MagnetViewMetatada.js';

ThemeSingleton.themeID = 'dark';

function generateClientId() {
    return 'controller-' + Math.random().toString(36).substr(2, 9);
}
function generateClientName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `Controller-${timestamp}`;
}

type PresenceState = {
  [key: string]: Presence[];
};

type Presence = {
  clientId: string;
  clientName: string;
  clientType: string;
  presence_ref: string;
  startTime: number;
}

type SimulatorPresence = {
  clientId: string;
  clientName: string;
  clientType: string;
  presence_ref: string;
  shared: SimulatorState;
  startTime: number;
}

@Register
export class SpacetimeController extends IoElement {
    static get Style() {
        return /* css */`
            :host {
                display: flex;
                flex-direction: column;
                height: 100vh; /* lock to viewport height so inner tabs can scroll */
                width: 100%;
                min-height: 0; /* allow children to define scrollable area */
            }
            :host .header {
                display: flex;
                align-items: center; /* vertical centering */
                justify-content: flex-start; /* inline flow: icons then buttons */
                gap: 8px;
                padding: 5px; /* at least 5px padding around row */
                flex-wrap: wrap; /* allow wrap if needed, but all are siblings */
                margin-bottom: 5px; /* ensure gap above tab row */
            }
            :host .header a.logo {
                display: inline-flex;
                padding: 5px; /* at least 5px around icons */
            }
            :host .header a.logo img {
                height: 35px; /* half-height for HiDPI (retina) while staying crisp */
                width: auto;
                display: block;
            }
            /* chips will be direct children of header after logos; wrapping allowed by header */
            :host .sim-btn {
                display: inline-flex;
                align-items: center;
                padding: 5px 10px; /* at least 5px padding on buttons */
                margin: 5px; /* keep 5px gap around each button */
                border-radius: 12px;
                border: 1px solid var(--io-color-2, #555);
                background: var(--io-bg-1, #222);
                color: var(--io-fg-1, #ddd);
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                white-space: nowrap;
                transition: none;
                font-size: 0.9em; /* slightly smaller label */
            }
            :host .sim-btn[selected] {
                font-weight: 700;
                filter: brightness(1.6) saturate(1.4);
                box-shadow: 0 0 0 2px rgba(255,255,255,0.8) inset,
                            0 0 6px rgba(255,255,255,0.35);
                outline: 2px solid rgba(255,255,255,0.6);
                outline-offset: -2px;
            }
			:host .sim-btn.is-selected {
                font-weight: 700;
                filter: brightness(1.6) saturate(1.4);
                box-shadow: 0 0 0 2px rgba(255,255,255,0.8) inset,
                            0 0 6px rgba(255,255,255,0.35);
                outline: 2px solid rgba(255,255,255,0.6);
                outline-offset: -2px;
			} */
            
			:host .sim-none {
				margin: 5px;
				padding: 6px 10px;
				border: 1px dashed #555;
				border-radius: 10px;
				color: #aaa;
			}
            :host > io-navigator {
                flex: 1 1 auto;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                min-height: 0; /* allow inner selector to size and scroll */
            }
            :host > io-navigator > io-selector {
                flex: 1 1 auto;
                min-height: 0; /* critical: lets tab hosts scroll instead of growing */
                overflow: hidden;
            }
            :host > io-navigator > io-menu-options {
              padding: 0 1px !important;
              background: transparent;
              border: 1px solid #555;
              border-width: 1px 0;
            }
            :host > io-navigator > io-menu-options > io-menu-item {
              height: inherit;
              display: flex;
              flex-direction: column;
              align-items: center;
              flex: 1 1 auto;
              padding: 1em;
              border-radius: 0;
              background: transparent;
              border: none;
              color: #000;
            }
            :host > io-navigator > io-menu-options > io-menu-item[selected] {
              background: #222;
              border: none;
            }
            :host > io-navigator > io-menu-options > io-menu-item[vmselected] {
              text-decoration: underline;
              text-decoration-thickness: 2px;
              text-underline-offset: 2px;
            }
            :host > io-navigator > io-menu-options > span.divider {
              margin: 0 !important;
              border-color: #555;
              border-width: 0 1px 0 0;
              opacity: 1;
            }
            :host io-object {
                flex: 1 1 auto;
            }
            :host io-property-editor > .row > :first-child {
                flex: 0 0 10em; 
            }
            :host io-property-editor > .row > :nth-child(2) {
                flex: 0 1 20em;
            }
            :host io-property-editor io-number-slider {
              flex: 1 1 auto; 
            }
            :host io-property-editor io-number-slider > io-number {
              flex-basis: 4.5em;
            }
    `;
    }

    static supabaseUrl = 'https://gwodhwyvuftyrvbymmvc.supabase.co';
    static supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2Rod3l2dWZ0eXJ2YnltbXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNDkyMDMsImV4cCI6MjA1NzkyNTIwM30.APVpyOupY84gQ7c0vBZkY-GqoJRPhb4oD4Lcj9CEzlc';
    static clientChannelName = 'spacecraft';
    static clientType = 'controller';

    declare clientId: string;
    declare clientName: string;
    declare supabaseClient: any;
    declare clientChannel: any;
    declare clientConnected: boolean;
    declare currentSimulatorId: string | null;
    declare currentSimulators: Map<string, SimulatorPresence>;

    declare magnetViewMetadata: Array<MagnetViewMetadata>;

    @ReactiveProperty({type: SimulatorState, init: null})
    declare simulatorState: SimulatorState;

    @ReactiveProperty({type: Number})
    declare simulatorRosterTick: number;

    constructor(props: IoElementProps) {
        super(props);
        // Client Identity
        this.clientId = generateClientId();
        this.clientName = generateClientName();

        // Connection State
        this.supabaseClient = null;
        this.clientChannel = null;
        this.clientConnected = false;
        this.currentSimulatorId = null;
        this.currentSimulators = new Map();
        this.magnetViewMetadata = [];
        this.simulatorRosterTick = 0;
        this.connect();
    }

    connect() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase library missing!');
            return;
        }
        try {
            const params = new URLSearchParams(window.location.search);
            const channelName = params.get('channel') || SpacetimeController.clientChannelName;
            this.supabaseClient = supabase.createClient(SpacetimeController.supabaseUrl, SpacetimeController.supabaseAnonKey);
            this.clientChannel = this.supabaseClient.channel(channelName, {
                config: { presence: { key: this.clientId } }
            });
            this.setupPresenceHandlers();
            this.subscribeToChannel();
            // Only honor simulatorIndex param (no legacy)
            const simIndexFromUrl = params.get('simulatorIndex');
            if (simIndexFromUrl) {
                (this as any)._preselectSimulatorIndex = parseInt(simIndexFromUrl, 10);
            }
        } catch (error) {
            console.error('Controller connection failed:', error);
            console.error('[Controller] Connection failed:', error);
        }
    }
    
    ready() {
        this.changed();
        // Send initial viewMode based on current tab and watch for tab changes
        this.handleHashChange();
        try { window.addEventListener('hashchange', (ev: HashChangeEvent) => this.handleHashChange()); } catch {}
        // Capture tab clicks for logging
        try {
            const root: any = (this as any).shadowRoot || this;
            root.addEventListener('click', (ev: MouseEvent) => this.handleMenuClickCapture(ev), { capture: true } as any);
        } catch {}
    }

    changed() {
        // Force re-render of simulator menu on roster updates
        void this.simulatorRosterTick;

        const simList = Array.from((this.currentSimulators && this.currentSimulators.values && this.currentSimulators.values()) ? this.currentSimulators.values() : []) as any[];
        const simOptions = simList
            // Render only sims with a non-zero simulator index
            .filter((s: any) => {
                const idx = s.simulatorIndex || (s.shared && s.shared.simulatorIndex) || 0;
                return idx > 0;
            })
            .map((s: any) => ({
                id: (() => {
                    const idx = s.simulatorIndex || (s.shared && s.shared.simulatorIndex);
                    const base = (s.clientName || (s.shared && s.shared.clientName) || 'SpaceCraft');
                    return (idx ? `${base} ${idx}` : base);
                })(),
                value: s.clientId,
                hue: s.simulatorHue
            }))
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }));

        this.render([
            // Top header row: simple siblings (logos then chips), all wrap together
            div({ class: 'header' }, [
                a({href: 'https://archive.org/', target: '_blank', class: 'logo'}, [
                    img({src: 'content/internet_archive_europe_logo.jpeg', alt: 'Internet Archive Europe'})
                ]),
                a({href: 'https://www.spacecraft.ing/', target: '_blank', class: 'logo'}, [
                    img({src: 'content/spacecraft_logo.png', alt: 'SpaceCraft'})
                ]),
                ...simOptions.map(opt => {
                    const hueDeg = Math.round((opt.hue as number) * 360);
                    const isSelected = (opt.value === (this.currentSimulatorId || ''));
                    return div({
                        class: `sim-btn${isSelected ? ' is-selected' : ''}`,
                        selected: isSelected,
                        style: {
                            background: `hsl(${hueDeg} 60% 20%)`,
                            borderColor: `hsl(${hueDeg} 60% 45%)`,
                        },
                        '@click': () => this.onTopBarSimulatorClick(opt.value)
                    }, `${opt.id}`);
                })
            ]),
            ioNavigator({
                menu: 'top',
                caching: 'proactive',
                option: new MenuOption({
                    id: 'root',
                    options: [
                        {id: 'About', icon: '🚀', value: 'about'},
                        {id: 'Arrange', icon: '🧲', value: 'arrange'},
                        {id: 'View', icon: '👀', value: 'view'},
                        {id: 'Select', icon: '👆', value: 'select'},
                        {id: 'Inspect', icon: '🔍', value: 'inspect'},
                    ],
                    selectedID: $({key: 'page', storage: 'hash', value: 'About'})
                }),
                elements: [
                    tabAbout({id: 'About', controller: this, simulatorState: this.simulatorState}),
                    tabArrange({id: 'Arrange', controller: this, simulatorState: this.simulatorState}),
                    tabView({id: 'View', controller: this, simulatorState: this.simulatorState}),
                    tabSelect({id: 'Select', controller: this, simulatorState: this.simulatorState}),
                    tabInspect({id: 'Inspect', controller: this, simulatorState: this.simulatorState}),
                ]
            })
        ]);

        // After render, underline the tab that matches simulator viewMode
        try { requestAnimationFrame(() => this.updateViewModeTabUnderline()); } catch {}
    }

    // Parse current tab id from location.hash and broadcast as viewMode
    handleHashChange() {
        try {
            const hash = (window.location && window.location.hash || '').replace(/^#/, '');
            const params = new URLSearchParams(hash);
            const page = (params.get('page') || 'About').trim();
            const mode = page.toLowerCase();
            try { console.log('[Controller] hashchange → page:', page, 'mode:', mode, 'simId:', this.currentSimulatorId); } catch {}
            if (['about','arrange','view','select','inspect'].includes(mode)) {
                try { console.log('[Controller] sending setViewMode from tab click', { mode, currentSimulatorId: this.currentSimulatorId }); } catch {}
                this.sendEventToSimulator('setViewMode', { mode });
            }
        } catch {}
    }

    // Visually mark the tab that matches the current simulator viewMode
    updateViewModeTabUnderline() {
        try {
            const mode = (this.simulatorState?.viewMode || '').toLowerCase();
            try { console.log('[Controller] viewMode presence update →', mode); } catch {}
            const root = (this as any).shadowRoot || document;
            const items = root.querySelectorAll(':host > io-navigator > io-menu-options > io-menu-item, io-navigator > io-menu-options > io-menu-item');
            items.forEach((el: Element) => {
                const val = (((el as any).value) || (el.getAttribute && el.getAttribute('value')) || '').toString().toLowerCase();
                if (mode && val === mode) el.setAttribute('vmselected', '');
                else el.removeAttribute('vmselected');
            });
        } catch {}
    }

    // Log menu item clicks (tab clicks)
    handleMenuClickCapture(ev: MouseEvent) {
        try {
            const path = (ev.composedPath && (ev.composedPath() as any[])) || [];
            const item = path.find((el: any) => el && typeof el.tagName === 'string' && el.tagName.toUpperCase() === 'IO-MENU-ITEM');
            if (item && typeof item.textContent === 'string') {
                const txt = (item.textContent as string).trim();
                // Derive mode strictly from current hash (exact tab ID)
                const hash = (window.location && window.location.hash || '').replace(/^#/, '');
                const params = new URLSearchParams(hash);
                const page = (params.get('page') || 'About').trim();
                const mode = page.toLowerCase();
                console.log('[Controller] tab click captured →', txt, 'mode(from-hash):', mode);
                const allowed = ['about','arrange','view','select','inspect'];
                if (allowed.includes(mode)) {
                    try { console.log('[Controller] sending setViewMode (direct from click)', { mode, currentSimulatorId: this.currentSimulatorId }); } catch {}
                    this.sendEventToSimulator('setViewMode', { mode });
                }
            }
        } catch {}
    }

    simulatorStateMutated() {
        try { console.log('[Controller] simulatorStateMutated → viewMode:', (this.simulatorState?.viewMode || '')); } catch {}
        // Update underline without re-rendering everything
        this.updateViewModeTabUnderline();
    }

    onTopBarSimulatorClick(simId: string) {
        if (simId && simId !== this.currentSimulatorId) {
            (this as any).setCurrentSimulator?.(simId);
        }
    }

    // === UNITY COMMUNICATION ===

    sendPanEvent(deltaX: number, deltaY: number) {
        this.sendEventToSimulator('pan', { panXDelta: deltaX, panYDelta: deltaY });
    }

    sendZoomEvent(zoomDelta: number) {
        this.sendEventToSimulator('zoom', { zoomDelta });
    }

    sendSelectEvent(action: string) {
        this.sendEventToSimulator('select', { action });
    }

    sendCreateMagnetEvent(magnetData: Magnet) {
        try {
            console.log('[Controller] sendCreateMagnetEvent magnetData:', JSON.parse(JSON.stringify(magnetData)));
        } catch (e) {
            console.log('[Controller] sendCreateMagnetEvent magnetData (raw):', magnetData);
        }
        this.sendEventToSimulator('createMagnet', { magnetData });
    }

    sendUpdateMagnetEvent(magnetData: Magnet) {
        this.sendEventToSimulator('updateMagnet', { magnetData });
    }

    sendDeleteMagnetEvent(magnetId: string) {
        this.sendEventToSimulator('deleteMagnet', { magnetId });
    }

    sendPushMagnetEvent(magnetId: string, deltaX: number, deltaY: number) {
        this.sendEventToSimulator('pushMagnet', { magnetId, deltaX, deltaY });
    }

    // Push a single item by id (joystick on Select tab)
    sendPushItemEvent(itemId: string, deltaX: number, deltaY: number) {
        try { console.log('[Controller] sendPushItemEvent', { itemId, deltaX, deltaY }); } catch {}
        this.sendEventToSimulator('pushItem', { itemId, deltaX, deltaY });
    }

    sendEventToSimulator(eventType: string, data: any) {
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
            clientType: SpacetimeController.clientType,
            clientName: this.clientName,
            screenId: 'main',
            targetSimulatorId: this.currentSimulatorId,
            ...data
        };

        this.clientChannel.send({
            type: 'broadcast',
            event: eventType,
            payload: payload
        }).then(() => { try { console.log(`[Controller] Sent '${eventType}'`, payload); } catch {} })
          .catch((err: any) => { console.error(`[Controller] Send '${eventType}' failed:`, err); });
    }

    setupPresenceHandlers() {
        this.clientChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = this.clientChannel.presenceState();
                try {
                    const raw = Object.values(presenceState || {}).flat();
                    const sims = raw.filter((p: any) => p && p.clientType === 'simulator');
                    console.log('[Controller][presence:sync] presences:', raw.length, 'simulators:', sims.length);
                    console.log('[Controller][presence:sync] simulators raw:', sims.map((p: any) => ({
                        clientId: p.clientId,
                        nameTop: p.clientName,
                        nameShared: p.shared && p.shared.clientName,
                        idxTop: typeof p.simulatorIndex === 'number' ? p.simulatorIndex : 0,
                        idxShared: p.shared && typeof p.shared.simulatorIndex === 'number' ? p.shared.simulatorIndex : 0
                    })));
                } catch {}

				const simulator = this.findSimulator(presenceState);
				
				const simArray = Array.from(this.currentSimulators.values()) as any[];
				if (simArray.length === 0) {
					// No simulators available: clear selection and state, update UI
					this.currentSimulatorId = null;
					this.magnetViewMetadata = [];
					try { console.log('[Controller] No simulators present → clearing UI state'); } catch {}
					this.simulatorState.update({
						clientId: '',
						clientName: '',
						clientType: '',
						currentCollection: {},
						currentCollectionId: '',
						currentCollectionItems: [],
						currentScreenId: '',
						highlightedItem: {},
						highlightedItemId: '',
						highlightedItemIds: [],
						magnets: [],
						screenIds: [],
						selectedItem: {},
						selectedItemId: '',
						selectedItemIds: [],
						lastUpdated: '',
						tags: [],
						updateCounter: 0,
						viewMode: 'magnets',
					} as any);
					// bump tick so header shows "(No Simulators)"
					this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
					return;
				}

				// If our current simulator vanished, pick a fallback by index
				if (!this.currentSimulatorId || !this.currentSimulators.has(this.currentSimulatorId)) {
					let target: any = null;
					// try to match previous index if we had one
					let prevIndex = 0;
					try {
						const prev = simArray.find((s: any) => s.clientId === this.currentSimulatorId);
						prevIndex = prev ? (prev.simulatorIndex || (prev.shared && prev.shared.simulatorIndex) || 0) : 0;
					} catch {}
					if (prevIndex > 0) {
						target = simArray.find((s: any) => (s.simulatorIndex || (s.shared && s.shared.simulatorIndex)) === prevIndex) || null;
					}
					// otherwise choose the highest index below previous, else lowest index
					if (!target) {
						const byIndex = [...simArray].sort((a: any, b: any) => {
							const ia = a.simulatorIndex || (a.shared && a.shared.simulatorIndex) || 0;
							const ib = b.simulatorIndex || (b.shared && b.shared.simulatorIndex) || 0;
							return ia - ib;
						});
						target = byIndex[0] || null;
					}
					if (target) {
						this.currentSimulatorId = target.clientId;
						try { console.log('[Controller] Fallback selected simulator', { clientId: target.clientId, index: target.simulatorIndex || (target.shared && target.shared.simulatorIndex) }); } catch {}
					}
				}

				if (simulator) {
                    // Resolve content for current simulator (async, fire-and-forget)
                    const shared = (simulator.shared || {}) as SimulatorSharedContent;
                    contentStore.ensureContent({
                        contentKey: shared.contentKey,
                        contentHash: shared.contentHash,
                        contentIndexUrl: shared.contentIndexUrl,
                    }).catch(() => {});
                    contentStore.ensureUnityMeta({
                        unityMetaKey: shared.unityMetaKey,
                        unityMetaHash: shared.unityMetaHash,
                        unityMetaUrl: (shared as any).unityMetaUrl,
                    }).catch(() => {});
                    // Prefetch others in the background
                    const others = Array.from(this.currentSimulators.values())
                      .map((s: any) => s.shared || {})
                      .filter((s: any) => s && (s.contentKey || s.contentIndexUrl))
                      .map((s: any) => ({
                        contentKey: s.contentKey || s.contentIndexUrl,
                        contentHash: s.contentHash || '',
                        contentIndexUrl: s.contentIndexUrl || s.contentKey,
                      }));
                    contentStore.prefetch(others);

                    // If preselect by index requested, override with match when available
                    if ((this as any)._preselectSimulatorIndex) {
                        for (const sim of this.currentSimulators.values()) {
                            const idx = (sim as any).simulatorIndex || ((sim as any).shared && (sim as any).shared.simulatorIndex);
                            if (idx === (this as any)._preselectSimulatorIndex) {
                                this.currentSimulatorId = (sim as any).clientId;
                                break;
                            }
                        }
                        (this as any)._preselectSimulatorIndex = null;
                    }
                    this.magnetViewMetadata = (simulator.shared as any).unityMetaData?.MagnetView || [];
                    this.currentSimulatorId = this.currentSimulatorId || simulator.clientId;
                    this.simulatorState.update(simulator.shared);
                    // bump tick so UI re-renders simulator menus
                    this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
                    try {
                        const list = Array.from(this.currentSimulators.values()).map((s: any) => ({
                            clientId: s.clientId,
                            clientName: s.clientName || (s.shared && s.shared.clientName),
                            simulatorIndex: s.simulatorIndex || (s.shared && s.shared.simulatorIndex)
                        }));
                        console.log('[Controller] roster updated (tick', this.simulatorRosterTick, '):', list);
                        console.log('[Controller] currentSimulatorId:', this.currentSimulatorId);
                    } catch {}
				} else {
					// No simulator selected yet; still bump tick to refresh menu state
					this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
				}
            });
    }

    subscribeToChannel() {
        this.clientChannel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                this.clientConnected = true;
                await this.clientChannel.track({
                    clientId: this.clientId,
                    clientType: SpacetimeController.clientType,
                    clientName: this.clientName,
                    startTime: Date.now()
                });
            }
        });
    }

    setCurrentSimulator(simId: string) {
        this.currentSimulatorId = simId;
        if (!this.clientChannel) return;
        // Pull fresh presence state from Supabase and switch to the selected simulator's state
        const presenceState = this.clientChannel.presenceState();
        const sim = this.findSimulator(presenceState);
        if (sim) {
            this.magnetViewMetadata = (sim.shared as any).unityMetaData?.MagnetView || [];
            this.simulatorState.update(sim.shared);
            // Ensure content for selected simulator
            const shared = (sim.shared || {}) as SimulatorSharedContent;
            contentStore.ensureContent({
                contentKey: shared.contentKey,
                contentHash: shared.contentHash,
                contentIndexUrl: shared.contentIndexUrl,
            }).catch(() => {});
            contentStore.ensureUnityMeta({
                unityMetaKey: shared.unityMetaKey,
                unityMetaHash: shared.unityMetaHash,
                unityMetaUrl: (shared as any).unityMetaUrl,
            }).catch(() => {});
        }
        try {
            const sel = this.currentSimulators.get(simId) as any;
            console.log('[Controller] setCurrentSimulator:', simId, 'name=', sel && (sel.clientName || (sel.shared && sel.shared.clientName)), 'index=', sel && (sel.simulatorIndex || (sel.shared && sel.shared.simulatorIndex)));
        } catch {}
        // Persist simulatorIndex in URL
        try {
            const selected = this.currentSimulators.get(simId) as any;
            const simIndex = selected && (selected.simulatorIndex || (selected.shared && selected.shared.simulatorIndex));
            if (simIndex) {
                const url = new URL(window.location.href);
                url.searchParams.set('simulatorIndex', String(simIndex));
                window.history.replaceState({}, '', url.toString());
                console.log('[Controller] URL simulatorIndex set to', simIndex);
            }
        } catch {}
        // Force UI re-render so selection highlight updates immediately
        this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
    }

    async updatePresenceState() {
        if (this.clientConnected && this.clientChannel) {
            try {
                await this.clientChannel.track({
                    clientId: this.clientId,
                    clientType: SpacetimeController.clientType,
                    clientName: this.clientName,
                    startTime: Date.now()
                });
            } catch (error) {
                console.error('[Connection] Failed to update presence:', error);
            }
        }
    }

    findSimulator(presenceState: PresenceState): SimulatorPresence | null {
        let lastSimulator: SimulatorPresence | null = null;
        let simulator: SimulatorPresence | null = null;
        const values = Object.values(presenceState);
        this.currentSimulators = new Map();
        for (const presences of values) {
            for (const presence of presences as Presence[]) {
                // Only count fully-initialized simulators (index assigned)
                const meta: any = presence as any;
                const simIndexTop = typeof meta.simulatorIndex === 'number' ? meta.simulatorIndex : 0;
                const simIndexShared = meta.shared && typeof meta.shared.simulatorIndex === 'number' ? meta.shared.simulatorIndex : 0;
                const simIndex = simIndexTop || simIndexShared;
                if (meta.clientType === 'simulator' && simIndex > 0) {
                    // Prefer shared view of fields if available
                    const merged: any = {
                        ...meta,
                        clientName: (meta.shared && meta.shared.clientName) ? meta.shared.clientName : meta.clientName,
                        simulatorIndex: simIndex,
                        shared: meta.shared || {}
                    };
                    lastSimulator = merged as SimulatorPresence;
                    this.currentSimulators.set(meta.clientId, merged as SimulatorPresence);
                    if (meta.clientId == this.currentSimulatorId) {
                        simulator = lastSimulator;
                    }
                } else if (meta.clientType === 'simulator') {
                    console.log('[Controller] ignoring simulator without index yet:', {
                        clientId: meta.clientId,
                        nameTop: meta.clientName,
                        nameShared: meta.shared && meta.shared.clientName,
                        idxTop: simIndexTop,
                        idxShared: simIndexShared
                    });
                }
            }
        }
        if (!simulator) {
            simulator = lastSimulator;
        }
        this.currentSimulatorId = simulator?.clientId || null;
        try {
            const list = Array.from(this.currentSimulators.values()).map((s: any) => ({
                clientId: s.clientId,
                clientName: s.clientName || (s.shared && s.shared.clientName),
                simulatorIndex: s.simulatorIndex || (s.shared && s.shared.simulatorIndex)
            }));
            console.log('[Controller] currentSimulators:', list);
        } catch {}
        return simulator;
    }
}
