import { IoElement, IoElementProps, Register, ReactiveProperty, h3, ioNumberSlider, ioSlider2d, IoSlider2d, ioObject, ioButton, PropertyConfig, ioString, ioBoolean } from 'io-gui';
// Note: io-menus not available in this build; using fallback for booleans
import { SpacetimeController, ViewMetadata } from './SpacetimeController';
import type { Magnet } from './types/Magnet';

export type MagnetItemProps = IoElementProps & {
  magnet: Magnet;
  controller: SpacetimeController;
}

function generateMagnetEditorConfig(metadata: Array<ViewMetadata>) {
  const viewConfig: PropertyConfig[] = [];
  metadata.forEach(field => {
    switch (field.type) {
      case 'float':
        viewConfig.push([field.name, ioNumberSlider({
          min: field.min ?? 0,
          max: field.max ?? 1,
          step: field.step ?? 0.001,
        })]);
        break;
      case 'bool':
        viewConfig.push([field.name, ioBoolean({true: 'io:circle_fill_checked', false: 'io:circle_fill'})]);
        break;
      case 'string':
        viewConfig.push([field.name, ioString({})]);
        break;
      default:
        break;
    }
  });
  return new Map([[Object, viewConfig]]);
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
            :host > io-object io-property-editor > .row > :nth-child(2) {
                flex: 0 1 20em; 
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
        if (this.magnet?.magnetId) this.controller.sendDeleteMagnetEvent(this.magnet.magnetId);
    }

    onPushMagnet() {
      const slider = this.$.moveslider as IoSlider2d;
      try {
        console.log('[Controller] pushMagnet', this.magnet?.magnetId, 'delta', slider.value);
      } catch {}
      if (this.magnet?.magnetId) this.controller.sendPushMagnetEvent(this.magnet.magnetId, slider.value[0], slider.value[1]);
    }

    magnetMutated() {
      try {
        console.log('[Controller] magnetMutated -> sendUpdateMagnetEvent:', JSON.parse(JSON.stringify(this.magnet)));
      } catch {
        console.log('[Controller] magnetMutated -> sendUpdateMagnetEvent:', this.magnet);
      }
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