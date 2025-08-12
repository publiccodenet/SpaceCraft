var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SpacetimeController_1;
import { IoElement, Register, ioNavigator, MenuOption, Storage as $, ioMarkdown, ReactiveProperty } from 'io-gui';
import { tabNavigate } from './TabNavigate.js';
import { tabSelect } from './TabSelect.js';
import { tabInspect } from './TabInspect.js';
import { tabMagnet } from './TabMagnet.js';
import { tabAdjust } from './TabAdjust.js';
import { SimulatorState } from './SimulatorState.js';
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
                    selectedID: $({ key: 'page', storage: 'hash', value: 'About' })
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
    sendCreateMagnetEvent(magnetData) {
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
            .on('broadcast', { event: 'simulatorTakeover' }, (payload) => {
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
//# sourceMappingURL=SpacetimeController.js.map