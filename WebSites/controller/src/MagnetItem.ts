import { IoElement, IoElementProps, Register, ReactiveProperty, h3,
    ioObject, ioButton } from 'io-gui';
import { SpacetimeController } from './SpacetimeController';

export type Magnet = {
  dynamicFriction: number;
  enabled: boolean;
  initialScale: number;
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
}

export type MagnetItemProps = IoElementProps & {
  magnet: Magnet;
  controller: SpacetimeController;
}

@Register
export class MagnetItem extends IoElement {
    static get Style() {
        return /* css */`
            :host {
                display: flex;
                flex-direction: row;
                gap: 0.5em;
                border: var(--io_border);
                border-color: var(--io_borderColorOutset);
                margin: 0.5em 0;
                padding: 0.5em;
                border-radius: var(--io_borderRadius);
                background-color: var(--io_bgColor);
            }
            :host > h3 {
                margin: 0 1em 0 0;
            }
            :host > io-object {
                flex: 1 1 auto;
            }
    `;
    }

    @ReactiveProperty({type: Object})
    declare magnet: Magnet;

    @ReactiveProperty({type: Object})
    declare controller: SpacetimeController;

    onDeleteMagnet() {
        this.controller.sendDeleteMagnetEvent(this.magnet.title);
    }

    changed() {
        this.render([
            h3(this.magnet.title),
            ioObject({value: this.magnet, label: 'Magnet Data'}),
            ioButton({label: 'Delete', action: this.onDeleteMagnet, class: 'red'})
        ]);
    }
}

export const magnetItem = function(arg0: MagnetItemProps) {
    return MagnetItem.vConstructor(arg0);
};