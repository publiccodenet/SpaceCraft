import { IoElement, Register, ioNavigator, MenuOption, Storage as $, ioMarkdown, ReactiveProperty, IoElementProps } from 'io-gui';
import { tabNavigate } from './TabNavigate.js';
import { tabSelect } from './TabSelect.js';
import { tabInspect } from './TabInspect.js';
import { tabGravity } from './TabGravity.js';
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

  @ReactiveProperty({type: SimulatorState, init: null})
  declare simulatorState: SimulatorState;

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
    this.connect();
  }

  connect() {
    if (typeof supabase === 'undefined') {
      console.error('Supabase library missing!');
      return;
    }
    try {
        const channelName = new URLSearchParams(window.location.search).get('channel') || SpacetimeController.clientChannelName;
        this.supabaseClient = supabase.createClient(SpacetimeController.supabaseUrl, SpacetimeController.supabaseAnonKey);
        this.clientChannel = this.supabaseClient.channel(channelName, {
            config: { presence: { key: this.clientId } }
        });
        this.setupPresenceHandlers();
        this.subscribeToChannel();
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
            {id: 'Gravity', icon: '🌍'},
            {id: 'Magnet', icon: '🧲'},
            {id: 'Adjust', icon: '⚙️'},
          ],
          selectedID: $({key: 'path', storage: 'hash', value: 'About'})
        }),
        elements: [
          ioMarkdown({id: 'About', src: './docs/About.md'}),
          tabNavigate({id: 'Navigate', controller: this, simulatorState: this.simulatorState}),
          tabSelect({id: 'Select', controller: this, simulatorState: this.simulatorState}),
          tabInspect({id: 'Inspect', controller: this, simulatorState: this.simulatorState}),
          tabGravity({id: 'Gravity', controller: this, simulatorState: this.simulatorState}),
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

  sendAddMagnetEvent(magnetName: string) {
      this.sendEventToSimulator('AddMagnet', { magnetName });
  }

  sendDeleteMagnetEvent(magnetName: string) {
      this.sendEventToSimulator('DeleteMagnet', { magnetName });
  }

  sendPushMagnetEvent(magnetName: string, deltaX: number, deltaZ: number) {
      this.sendEventToSimulator('PushMagnet', { magnetName, deltaX, deltaZ });
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

  setSearchGravity(gravity: number) {
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
      .on('broadcast', { event: 'simulator_takeover' }, (payload: SimulatorTakeoverPayload) => {
          this.currentSimulatorId = payload.newSimulatorId;
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

  findLatestSimulator(presenceState: PresenceState): SimulatorPresence | null {
      let latestSimulator = null;
      let latestStartTime = 0;
      Object.values(presenceState).forEach(presences => {
          presences.forEach((presence: Presence) => {
              if (presence.clientType === 'simulator' && presence.startTime > latestStartTime) {
                  latestSimulator = presence;
                  latestStartTime = presence.startTime;
              }
          });
      });
      return latestSimulator;
  }
}