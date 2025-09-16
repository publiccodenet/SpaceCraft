import { ListenerDefinition } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';
export declare class TabView extends TabBase {
    static get Style(): string;
    static get Listeners(): {
        pointerdown: string;
        touchstart: ListenerDefinition;
        touchmove: ListenerDefinition;
        wheel: string;
    };
    preventDefault(event: Event): void;
    onPointerdown(event: PointerEvent): void;
    onPointermove(event: PointerEvent): void;
    onPointerup(event: PointerEvent): void;
    onWheel(event: WheelEvent): void;
    onViewModeChange(event: CustomEvent): void;
    changed(): void;
}
export declare const tabView: (arg0: TabBaseProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=TabView.d.ts.map