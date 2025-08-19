import { IoElement, IoElementProps, Register, ReactiveProperty, h3, ioNumberSlider, ioSlider2d, IoSlider2d, ioObject, ioButton, PropertyConfig } from 'io-gui';
import { SpacetimeController, ViewMetadata } from './SpacetimeController';

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
}

export type MagnetItemProps = IoElementProps & {
  magnet: Magnet;
  controller: SpacetimeController;
}

function generateMagnetEditorConfig(metadata: Array<ViewMetadata>) {
  const viewConfig: PropertyConfig[] = [];
  metadata.forEach(field => {
    if (field.type === 'float') {
      viewConfig.push([field.name, ioNumberSlider({
        min: field.min ?? 0,
        max: field.max ?? 1,
        step: field.step ?? 0.001,
      })]);
    }
  });
  return new Map([
    [Object, viewConfig]
  ]);
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
            :host > io-slider-2d {
                align-self: flex-start;
            }
            :host > io-object {
                flex: 1 1 auto;
            }
            :host > io-object io-property-editor > .row > :first-child {
                flex: 0 1 10em; 
            }
            :host > io-object io-property-editor io-number-slider {
                flex: 1 1 auto; 
            }
    `;
    }

    @ReactiveProperty({type: Object, init: null})
    declare magnet: Magnet;

    @ReactiveProperty({type: Object})
    declare controller: SpacetimeController;

    onDeleteMagnet() {
        this.controller.sendDeleteMagnetEvent(this.magnet.magnetId);
    }

    onPushMagnet() {
      const slider = this.$.moveslider as IoSlider2d;
      this.controller.sendPushMagnetEvent(this.magnet.magnetId, slider.value[0], slider.value[1]);
    }

    magnetMutated() {
      this.controller.sendUpdateMagnetEvent(this.magnet);
    }

    changed() {
        const magnetEditorConfig = generateMagnetEditorConfig(this.controller.magnetViewMetadata);
        this.render([
            h3(this.magnet.title),
            ioSlider2d({id: 'moveslider', value: [0, 0], min: [-1, -1], max: [1, 1], '@value-input': this.onPushMagnet}),
            ioObject({value: this.magnet, label: 'Magnet Data', config: magnetEditorConfig}),
            ioButton({label: 'Delete', action: this.onDeleteMagnet, class: 'red'})
        ]);
    }
}

export const magnetItem = function(arg0: MagnetItemProps) {
    return MagnetItem.vConstructor(arg0);
};