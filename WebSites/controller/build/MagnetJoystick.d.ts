import { IoSlider2d, IoSlider2dProps } from 'io-gui';
export declare class MagnetJoystick extends IoSlider2d {
    static get Style(): string;
    private _isLooping;
    constructor(args?: IoSlider2dProps);
    controlLoop(): void;
    onPointerdown(event: PointerEvent): void;
    onPointermove(event: PointerEvent): void;
    onPointerup(event: PointerEvent): void;
}
export declare const magnetJoystick: (arg0: IoSlider2dProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=MagnetJoystick.d.ts.map