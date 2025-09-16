import { IoElement, IoElementProps } from 'io-gui';
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
    constructor(props: TabBaseProps);
    ready(): void;
    simulatorStateMutated(): void;
    changed(): void;
}
export declare const tabBase: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabBase.d.ts.map