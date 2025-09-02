import { IoSlider2d, IoSlider2dProps } from 'io-gui';
type MagnetJoystickProps = IoSlider2dProps & {
    ctrlTtimeout?: number;
};
export declare class MagnetJoystick extends IoSlider2d {
    static get Style(): string;
    ctrlTtimeout: number;
    private _isLooping;
    constructor(args?: MagnetJoystickProps);
    controlLoop(): void;
    onPointerdown(event: PointerEvent): void;
    onPointermove(event: PointerEvent): void;
    onPointerup(event: PointerEvent): void;
}
export declare const magnetJoystick: (arg0: MagnetJoystickProps) => import("io-gui").VDOMElement;
export {};
//# sourceMappingURL=MagnetJoystick.d.ts.map