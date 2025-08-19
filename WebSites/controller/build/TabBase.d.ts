import { IoElement, IoElementProps, ListenerDefinition } from 'io-gui';
import { SpacetimeController } from './SpacetimeController.js';
import { SimulatorState } from './SimulatorState.js';
export type TabBaseProps = IoElementProps & {
    controller: SpacetimeController;
    simulatorState: SimulatorState;
};
export declare class TabBase extends IoElement {
    static get Style(): string;
    controller: SpacetimeController;
    simulatorState: SimulatorState;
    static get Listeners(): {
        contextmenu: string;
        pointerdown: string;
        touchstart: ListenerDefinition;
        touchmove: ListenerDefinition;
    };
    constructor(props: TabBaseProps);
    preventDefault(event: Event): void;
    onPointerdown(event: PointerEvent): void;
    onPointermove(event: PointerEvent): void;
    onPointerup(event: PointerEvent): void;
    ready(): void;
    simulatorStateMutated(): void;
    changed(): void;
}
export declare const tabBase: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabBase.d.ts.map