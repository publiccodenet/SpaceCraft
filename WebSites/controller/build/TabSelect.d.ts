import { TabBase, TabBaseProps } from './TabBase.js';
export declare class TabSelect extends TabBase {
    static get Style(): string;
    startX: number;
    startY: number;
    onPointerdown(event: PointerEvent): void;
    onPointerup(event: PointerEvent): void;
    changed(): void;
}
export declare const tabSelect: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabSelect.d.ts.map