import { TabBase, TabBaseProps } from './TabBase.js';
export declare class TabArrange extends TabBase {
    static get Listeners(): any;
    onTabSelected(): void;
    static get Style(): string;
    onCreateMagnet(): void;
    onKeyUp(event: KeyboardEvent): void;
    changed(): void;
}
export declare const tabArrange: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabArrange.d.ts.map