import { IoElement, Register, ioNavigator, MenuOption, Storage as $, ioMarkdown, ReactiveProperty, IoElementProps, ThemeSingleton } from 'io-gui';
import { tabNavigate } from './TabNavigate.js';
import { tabSelect } from './TabSelect.js';
import { tabInspect } from './TabInspect.js';
import { tabMagnet } from './TabMagnet.js';
import { tabAdjust } from './TabAdjust.js';
import { SimulatorState } from './SimulatorState.js';
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

type SimulatorTakeoverPayload = {
  newSimulatorId: string;
  newSimulatorName: string;
  startTime: number;
}

@Register
export class SpacetimeController extends IoElement {
    static get Style() {
        return /* css */`
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
        this.render([
            ioNavigator({
                menu: 'top',
                caching: 'proactive',
                option: new MenuOption({
                    id: 'root',
                    options: [
                        {id: 'About', icon: '📖'},
                        {id: 'Navigate', icon: '🧭'},
                        {id: 'Select', icon: '👆'},
                        {id: 'Inspect', icon: '🔍'},
                        {id: 'Magnet', icon: '🧲'},
                        {id: 'Adjust', icon: '⚙️'},
                    ],
                    selectedID: $({key: 'page', storage: 'hash', value: 'About'})
                }),
                elements: [
                    ioMarkdown({id: 'About', src: './docs/About.md'}),
                    tabNavigate({id: 'Navigate', controller: this, simulatorState: this.simulatorState}),
                    tabSelect({id: 'Select', controller: this, simulatorState: this.simulatorState}),
                    tabInspect({id: 'Inspect', controller: this, simulatorState: this.simulatorState}),
                    tabMagnet({id: 'Magnet', controller: this, simulatorState: this.simulatorState}),
                    tabAdjust({id: 'Adjust', controller: this, simulatorState: this.simulatorState}),
                ]
            })
        ]);
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
        }).catch((err: any) => {
            console.error(`[Controller] Send '${eventType}' failed:`, err);
        });
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
                
                if (simulator) {
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
