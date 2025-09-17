import { TabBase, TabBaseProps } from './TabBase.js';
export declare class TabSelect extends TabBase {
    static get Style(): string;
    startX: number;
    startY: number;
    static get Listeners(): {
        pointerdown: string;
    };
    preventDefault(event: Event): void;
    onPointerdown(event: PointerEvent): void;
    onPointerup(event: PointerEvent): void;
    changed(): void;
    onItemJoystickControl(event: CustomEvent): void;
}
export declare const tabSelect: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabSelect.d.ts.map