var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SpacetimeController_1;
import { IoElement, Register, ioNavigator, MenuOption, Storage as $, ReactiveProperty, ThemeSingleton, div } from 'io-gui';
import { contentStore } from './services/ContentStore.js';
import { tabView } from './TabView.js';
import { tabSelect } from './TabSelect.js';
import { tabInspect } from './TabInspect.js';
import { tabArrange } from './TabArrange.js';
import { SimulatorState } from './SimulatorState.js';
import './Icons.js';
ThemeSingleton.themeID = 'dark';
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
            :host .top-controls {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 6px;
                flex-wrap: wrap;
            }
            :host .sim-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            :host .sim-btn {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 12px;
                border: 1px solid var(--io-color-2, #555);
                background: var(--io-bg-1, #222);
                color: var(--io-fg-1, #ddd);
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                white-space: nowrap;
                transition: none;
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
            }
            :host > io-navigator {
                flex: 1 1 auto;
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
            }
            :host > io-navigator > io-menu-options > io-menu-item[selected] {
              background: #222;
              border: none;
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
            const channelName = params.get('channel') || SpacetimeController_1.clientChannelName;
            this.supabaseClient = supabase.createClient(SpacetimeController_1.supabaseUrl, SpacetimeController_1.supabaseAnonKey);
            this.clientChannel = this.supabaseClient.channel(channelName, {
                config: { presence: { key: this.clientId } }
            });
            this.setupPresenceHandlers();
            this.subscribeToChannel();
            // Only honor simulatorIndex param (no legacy)
            const simIndexFromUrl = params.get('simulatorIndex');
            if (simIndexFromUrl) {
                this._preselectSimulatorIndex = parseInt(simIndexFromUrl, 10);
            }
        }
        catch (error) {
            console.error('Controller connection failed:', error);
            console.error('[Controller] Connection failed:', error);
        }
    }
    ready() {
        this.changed();
    }
    changed() {
        // Force re-render of simulator menu on roster updates
        void this.simulatorRosterTick;
        const simList = Array.from((this.currentSimulators && this.currentSimulators.values && this.currentSimulators.values()) ? this.currentSimulators.values() : []);
        const hasSims = simList.length > 0;
        const simOptions = simList
            .map((s) => ({ id: (s.clientName || s.clientId), value: s.clientId, hue: ((s.simulatorIndex || (s.shared && s.shared.simulatorIndex)) ? (((s.simulatorIndex || (s.shared && s.shared.simulatorIndex)) - 1) % 8) / 8 : 0) }))
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }));
        if (!hasSims)
            simOptions.push({ id: '(none)', value: '(none)', hue: 0 });
        this.render([
            // Top simulator control row (always visible)
            div({ class: 'top-controls' }, [
                div({ class: 'sim-list' }, [
                    ...simOptions.map(opt => {
                        const hueDeg = Math.round(opt.hue * 360);
                        const isSelected = (opt.value === (this.currentSimulatorId || ''));
                        return div({
                            class: `sim-btn${isSelected ? ' is-selected' : ''}`,
                            selected: isSelected,
                            style: {
                                background: `hsl(${hueDeg} 60% 20%)`,
                                borderColor: `hsl(${hueDeg} 60% 45%)`,
                            },
                            '@click': () => this.onTopBarSimulatorClick(opt.value)
                        }, `🚀 ${opt.id}`);
                    })
                ]),
            ]),
            ioNavigator({
                menu: 'top',
                caching: 'proactive',
                option: new MenuOption({
                    id: 'root',
                    options: [
                        { id: 'View', icon: 'sc:view' },
                        { id: 'Select', icon: 'sc:select' },
                        { id: 'Inspect', icon: 'sc:inspect' },
                        { id: 'Arrange', icon: 'sc:arrange' },
                    ],
                    selectedID: $({ key: 'page', storage: 'hash', value: 'Arrange' })
                }),
                elements: [
                    // ioMarkdown({id: 'About', src: './docs/About.md'}),
                    tabView({ id: 'View', controller: this, simulatorState: this.simulatorState }),
                    tabSelect({ id: 'Select', controller: this, simulatorState: this.simulatorState }),
                    tabInspect({ id: 'Inspect', controller: this, simulatorState: this.simulatorState }),
                    tabArrange({ id: 'Arrange', controller: this, simulatorState: this.simulatorState }),
                ]
            })
        ]);
    }
    onTopBarSimulatorChange(event) {
        const newId = event.detail?.value;
        if (newId && newId !== this.currentSimulatorId && newId !== '(none)') {
            this.setCurrentSimulator?.(newId);
        }
    }
    onTopBarSimulatorClick(simId) {
        if (simId && simId !== this.currentSimulatorId) {
            this.setCurrentSimulator?.(simId);
        }
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
    sendCreateMagnetEvent(magnetData) {
        try {
            console.log('[Controller] sendCreateMagnetEvent magnetData:', JSON.parse(JSON.stringify(magnetData)));
        }
        catch (e) {
            console.log('[Controller] sendCreateMagnetEvent magnetData (raw):', magnetData);
        }
        this.sendEventToSimulator('createMagnet', { magnetData });
    }
    sendUpdateMagnetEvent(magnetData) {
        this.sendEventToSimulator('updateMagnet', { magnetData });
    }
    sendDeleteMagnetEvent(magnetId) {
        this.sendEventToSimulator('deleteMagnet', { magnetId });
    }
    sendPushMagnetEvent(magnetId, deltaX, deltaY) {
        this.sendEventToSimulator('pushMagnet', { magnetId, deltaX, deltaY });
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
    setupPresenceHandlers() {
        this.clientChannel
            .on('presence', { event: 'sync' }, () => {
            const presenceState = this.clientChannel.presenceState();
            try {
                const raw = Object.values(presenceState || {}).flat();
                const sims = raw.filter((p) => p && p.clientType === 'simulator');
                console.log('[Controller][presence:sync] presences:', raw.length, 'simulators:', sims.length);
                console.log('[Controller][presence:sync] simulators raw:', sims.map((p) => ({
                    clientId: p.clientId,
                    nameTop: p.clientName,
                    nameShared: p.shared && p.shared.clientName,
                    idxTop: typeof p.simulatorIndex === 'number' ? p.simulatorIndex : 0,
                    idxShared: p.shared && typeof p.shared.simulatorIndex === 'number' ? p.shared.simulatorIndex : 0
                })));
            }
            catch { }
            const simulator = this.findSimulator(presenceState);
            if (simulator) {
                // Resolve content for current simulator (async, fire-and-forget)
                const shared = (simulator.shared || {});
                contentStore.ensureContent({
                    contentKey: shared.contentKey,
                    contentHash: shared.contentHash,
                    contentIndexUrl: shared.contentIndexUrl,
                }).catch(() => { });
                contentStore.ensureUnityMeta({
                    unityMetaKey: shared.unityMetaKey,
                    unityMetaHash: shared.unityMetaHash,
                    unityMetaUrl: shared.unityMetaUrl,
                }).catch(() => { });
                // Prefetch others in the background
                const others = Array.from(this.currentSimulators.values())
                    .map((s) => s.shared || {})
                    .filter((s) => s && (s.contentKey || s.contentIndexUrl))
                    .map((s) => ({
                    contentKey: s.contentKey || s.contentIndexUrl,
                    contentHash: s.contentHash || '',
                    contentIndexUrl: s.contentIndexUrl || s.contentKey,
                }));
                contentStore.prefetch(others);
                // If preselect by index requested, override with match when available
                if (this._preselectSimulatorIndex) {
                    for (const sim of this.currentSimulators.values()) {
                        const idx = sim.simulatorIndex || (sim.shared && sim.shared.simulatorIndex);
                        if (idx === this._preselectSimulatorIndex) {
                            this.currentSimulatorId = sim.clientId;
                            break;
                        }
                    }
                    this._preselectSimulatorIndex = null;
                }
                this.magnetViewMetadata = simulator.shared.unityMetaData?.MagnetView || [];
                this.currentSimulatorId = this.currentSimulatorId || simulator.clientId;
                this.simulatorState.update(simulator.shared);
                // bump tick so UI re-renders simulator menus
                this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
                try {
                    const list = Array.from(this.currentSimulators.values()).map((s) => ({
                        clientId: s.clientId,
                        clientName: s.clientName || (s.shared && s.shared.clientName),
                        simulatorIndex: s.simulatorIndex || (s.shared && s.shared.simulatorIndex)
                    }));
                    console.log('[Controller] roster updated (tick', this.simulatorRosterTick, '):', list);
                    console.log('[Controller] currentSimulatorId:', this.currentSimulatorId);
                }
                catch { }
            }
            else {
                // No simulator selected yet; still bump tick to refresh menu state
                this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
            }
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
    setCurrentSimulator(simId) {
        this.currentSimulatorId = simId;
        if (!this.clientChannel)
            return;
        // Pull fresh presence state from Supabase and switch to the selected simulator's state
        const presenceState = this.clientChannel.presenceState();
        const sim = this.findSimulator(presenceState);
        if (sim) {
            this.magnetViewMetadata = sim.shared.unityMetaData?.MagnetView || [];
            this.simulatorState.update(sim.shared);
            // Ensure content for selected simulator
            const shared = (sim.shared || {});
            contentStore.ensureContent({
                contentKey: shared.contentKey,
                contentHash: shared.contentHash,
                contentIndexUrl: shared.contentIndexUrl,
            }).catch(() => { });
            contentStore.ensureUnityMeta({
                unityMetaKey: shared.unityMetaKey,
                unityMetaHash: shared.unityMetaHash,
                unityMetaUrl: shared.unityMetaUrl,
            }).catch(() => { });
        }
        try {
            const sel = this.currentSimulators.get(simId);
            console.log('[Controller] setCurrentSimulator:', simId, 'name=', sel && (sel.clientName || (sel.shared && sel.shared.clientName)), 'index=', sel && (sel.simulatorIndex || (sel.shared && sel.shared.simulatorIndex)));
        }
        catch { }
        // Persist simulatorIndex in URL
        try {
            const selected = this.currentSimulators.get(simId);
            const simIndex = selected && (selected.simulatorIndex || (selected.shared && selected.shared.simulatorIndex));
            if (simIndex) {
                const url = new URL(window.location.href);
                url.searchParams.set('simulatorIndex', String(simIndex));
                window.history.replaceState({}, '', url.toString());
                console.log('[Controller] URL simulatorIndex set to', simIndex);
            }
        }
        catch { }
        // Force UI re-render so selection highlight updates immediately
        this.simulatorRosterTick = (this.simulatorRosterTick || 0) + 1;
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
    findSimulator(presenceState) {
        let lastSimulator = null;
        let simulator = null;
        const values = Object.values(presenceState);
        this.currentSimulators = new Map();
        for (const presences of values) {
            for (const presence of presences) {
                // Only count fully-initialized simulators (index assigned)
                const meta = presence;
                const simIndexTop = typeof meta.simulatorIndex === 'number' ? meta.simulatorIndex : 0;
                const simIndexShared = meta.shared && typeof meta.shared.simulatorIndex === 'number' ? meta.shared.simulatorIndex : 0;
                const simIndex = simIndexTop || simIndexShared;
                if (meta.clientType === 'simulator' && simIndex > 0) {
                    // Prefer shared view of fields if available
                    const merged = {
                        ...meta,
                        clientName: (meta.shared && meta.shared.clientName) ? meta.shared.clientName : meta.clientName,
                        simulatorIndex: simIndex,
                        shared: meta.shared || {}
                    };
                    lastSimulator = merged;
                    this.currentSimulators.set(meta.clientId, merged);
                    if (meta.clientId == this.currentSimulatorId) {
                        simulator = lastSimulator;
                    }
                }
                else if (meta.clientType === 'simulator') {
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
            const list = Array.from(this.currentSimulators.values()).map((s) => ({
                clientId: s.clientId,
                clientName: s.clientName || (s.shared && s.shared.clientName),
                simulatorIndex: s.simulatorIndex || (s.shared && s.shared.simulatorIndex)
            }));
            console.log('[Controller] currentSimulators:', list);
        }
        catch { }
        return simulator;
    }
};
__decorate([
    ReactiveProperty({ type: SimulatorState, init: null })
], SpacetimeController.prototype, "simulatorState", void 0);
__decorate([
    ReactiveProperty({ type: Number })
], SpacetimeController.prototype, "simulatorRosterTick", void 0);
SpacetimeController = SpacetimeController_1 = __decorate([
    Register
], SpacetimeController);
export { SpacetimeController };
//# sourceMappingURL=SpacetimeController.js.map