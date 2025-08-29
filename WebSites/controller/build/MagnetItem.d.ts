import { IoElement, IoElementProps } from 'io-gui';
import { SpacetimeController } from './SpacetimeController.js';
import type { Magnet } from './types/Magnet';
export type MagnetItemProps = IoElementProps & {
    magnet: Magnet;
    controller: SpacetimeController;
};
export declare class MagnetItem extends IoElement {
    static get Style(): string;
    magnet: Magnet;
    controller: SpacetimeController;
    onDeleteMagnet(): void;
    onJoystickControl(event: CustomEvent): void;
    magnetMutated(): void;
    changed(): void;
}
export declare const magnetItem: (arg0: MagnetItemProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=MagnetItem.d.ts.map