import { IoElement, IoElementProps } from 'io-gui';
import { SimulatorState } from './SimulatorState.js';
type PresenceState = {
    [key: string]: Presence[];
};
type Presence = {
    clientId: string;
    clientName: string;
    clientType: string;
    presence_ref: string;
    startTime: number;
};
type SimulatorPresence = {
    clientId: string;
    clientName: string;
    clientType: string;
    presence_ref: string;
    shared: SimulatorState;
    startTime: number;
};
export declare class SpacetimeController extends IoElement {
    static get Style(): string;
    static supabaseUrl: string;
    static supabaseAnonKey: string;
    static clientChannelName: string;
    static clientType: string;
    clientId: string;
    clientName: string;
    supabaseClient: any;
    clientChannel: any;
    clientConnected: boolean;
    currentSimulatorId: string | null;
    simulatorState: SimulatorState;
    constructor(props: IoElementProps);
    connect(): void;
    ready(): void;
    sendPanEvent(deltaX: number, deltaY: number): void;
    sendZoomEvent(zoomDelta: number): void;
    sendSelectEvent(action: string): void;
    sendAddMagnetEvent(magnetName: string): void;
    sendDeleteMagnetEvent(magnetName: string): void;
    sendPushMagnetEvent(magnetName: string, deltaX: number, deltaZ: number): void;
    sendEventToSimulator(eventType: string, data: any): void;
    setSearchGravity(gravity: number): void;
    setupPresenceHandlers(): void;
    subscribeToChannel(): void;
    updatePresenceState(): Promise<void>;
    findLatestSimulator(presenceState: PresenceState): SimulatorPresence | null;
}
export {};
//# sourceMappingURL=SpacetimeController.d.ts.map