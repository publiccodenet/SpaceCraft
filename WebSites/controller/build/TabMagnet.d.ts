import { TabBase, TabBaseProps } from './TabBase.js';
export declare class TabMagnet extends TabBase {
    static get Style(): string;
    onGravitySet(event: CustomEvent): void;
    onCreateMagnet(): void;
    onKeyUp(event: KeyboardEvent): void;
    changed(): void;
}
export declare const tabMagnet: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabMagnet.d.ts.map