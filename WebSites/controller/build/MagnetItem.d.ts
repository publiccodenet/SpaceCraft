import { IoElement, IoElementProps } from 'io-gui';
import { SpacetimeController } from './SpacetimeController';
export type Magnet = {
    dynamicFriction: number;
    enabled: boolean;
    magnetEnabled: boolean;
    magnetHoleRadius: number;
    magnetId: string;
    magnetRadius: number;
    magnetSoftness: number;
    magnetStrength: number;
    mass: number;
    scoreMax: number;
    scoreMin: number;
    searchExpression: string;
    searchType: string;
    staticFriction: number;
    title: string;
    viewScale: number;
    viewScaleInitial: number;
};
export type MagnetItemProps = IoElementProps & {
    magnet: Magnet;
    controller: SpacetimeController;
};
export declare class MagnetItem extends IoElement {
    static get Style(): string;
    magnet: Magnet;
    controller: SpacetimeController;
    onDeleteMagnet(): void;
    onPushMagnet(): void;
    magnetMutated(): void;
    changed(): void;
}
export declare const magnetItem: (arg0: MagnetItemProps) => import("io-gui").VDOMElement;
//# sourceMappingURL=MagnetItem.d.ts.map