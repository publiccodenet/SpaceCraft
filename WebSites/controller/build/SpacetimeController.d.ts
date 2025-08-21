import { IoElement, IoElementProps } from 'io-gui';
import { SimulatorState } from './SimulatorState.js';
import type { Magnet } from './types/Magnet';
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
export type ViewMetadata = {
    canWrite: boolean;
    category: string;
    component: string;
    defaultValue: any;
    description: string;
    displayName: string;
    name: string;
    path: string;
    type: 'bool' | 'float' | 'string';
    unityType: string;
    min?: number;
    max?: number;
    step?: number;
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
    magnetViewMetadata: Array<ViewMetadata>;
    simulatorState: SimulatorState;
    constructor(props: IoElementProps);
    connect(): void;
    ready(): void;
    sendPanEvent(deltaX: number, deltaY: number): void;
    sendZoomEvent(zoomDelta: number): void;
    sendSelectEvent(action: string): void;
    sendCreateMagnetEvent(magnetData: Magnet): void;
    sendUpdateMagnetEvent(magnetData: Magnet): void;
    sendDeleteMagnetEvent(magnetId: string): void;
    sendPushMagnetEvent(magnetId: string, deltaX: number, deltaY: number): void;
    sendEventToSimulator(eventType: string, data: any): void;
    setupPresenceHandlers(): void;
    subscribeToChannel(): void;
    updatePresenceState(): Promise<void>;
    findLatestSimulator(presenceState: PresenceState): SimulatorPresence | null;
}
export {};
//# sourceMappingURL=SpacetimeController.d.ts.map