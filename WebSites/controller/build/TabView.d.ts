import { TabBase, TabBaseProps } from './TabBase.js';
export declare class TabView extends TabBase {
    static get Style(): string;
    onPointermove(event: PointerEvent): void;
    onViewModeChange(event: CustomEvent): void;
    changed(): void;
}
export declare const tabView: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabView.d.ts.map