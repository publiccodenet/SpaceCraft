import { IoElement, IoElementProps, Register, ReactiveProperty, h2, div, ioNumberSlider, ioObject, ioButton, PropertyConfig, ioString, ioBoolean, PropertyGroups } from 'io-gui';
import { SpacetimeController } from './SpacetimeController.js';
import type { Magnet } from './types/Magnet';
import type { MagnetViewMetadata } from './types/MagnetViewMetatada.js';
import { magnetJoystick, MagnetJoystick } from './MagnetJoystick.js';

export type MagnetItemProps = IoElementProps & {
  magnet: Magnet;
  controller: SpacetimeController;
}

function generateMagnetEditorConfig(metadata: Array<MagnetViewMetadata>) {
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
        viewConfig.push([field.name, ioBoolean({true: 'io:box_fill_checked', false: 'io:box'})]);
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

function generateMagnetEditorGroups(metadata: Array<MagnetViewMetadata>) {
  const groups: PropertyGroups = {};
  metadata.forEach(field => {
    groups[field.category] = groups[field.category] || [];
    groups[field.category].push(field.name);
  });
  // groups.Main
  return new Map([
    [Object, groups],
  ])
}

@Register
export class MagnetItem extends IoElement {
    static get Style() {
        return /* css */`
            :host {
                display: flex;
                flex-direction: column;
                gap: 0.4em;
                border: var(--io_border);
                border-color: var(--io_borderColorOutset);
                margin: 0.4em 0;
                padding: 0.4em;
                border-radius: var(--io_borderRadius);
                background-color: var(--io_bgColor);
            }
            :host .header {
                display: flex;
                align-items: center;
                gap: 0.75em;
            }
            :host .header > h2 {
                margin: 0;
                line-height: 1.2;
            }
            :host .header > io-slider-2d, :host .header > magnet-joystick, :host .header > io-slider2d {
                margin-left: auto;
                align-self: center;
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

    onJoystickControl(event: CustomEvent) {
      const slider = event.target as MagnetJoystick;
      if (this.magnet?.magnetId) this.controller.sendPushMagnetEvent(this.magnet.magnetId, slider.value[0], slider.value[1]);
    }

    magnetMutated() {
      this.controller.sendUpdateMagnetEvent(this.magnet);
    }

    changed() {
        const magnetEditorConfig = generateMagnetEditorConfig(this.controller.magnetViewMetadata);
        const magnetEditorGroups = generateMagnetEditorGroups(this.controller.magnetViewMetadata);
        this.render([
            div({class: 'header'}, [
                h2(this.magnet.title),
                magnetJoystick({value: [0, 0], min: [-0.1, -0.1], max: [0.1, 0.1], '@control': this.onJoystickControl})
            ]),
            ioObject({
                value: this.magnet,
                label: 'Magnet Data',
                config: magnetEditorConfig,
                groups: magnetEditorGroups
            }),
            ioButton({label: 'Delete', action: this.onDeleteMagnet, class: 'red'})
        ]);
    }
}

export const magnetItem = function(arg0: MagnetItemProps) {
    return MagnetItem.vConstructor(arg0);
};