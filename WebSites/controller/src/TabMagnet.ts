import { h2, p, Register, ioString, ioButton, div, IoString } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';
import { magnetItem, Magnet } from './MagnetItem.js';
import type { ViewMetadata } from './SpacetimeController.js';

type MagnetData = {
    title: string,
    magnetId: string,
    searchExpression: string,
    searchType: string,
    enabled: boolean,
    mass: number,
    staticFriction: number,
    dynamicFriction: number,
    magnetEnabled: boolean,
    magnetStrength: number,
    magnetRadius: number,
    magnetSoftness: number,
    magnetHoleRadius: number,
    magnetHoleStrength: number,
    scoreMin: number,
    scoreMax: number,
    viewScale: number,
    viewScaleInitial: number,
    viewScaleSlerpRate: number,
    minViewScale: number,
    maxViewScale: number,
    aspectRatio: number,
    displayText: string,
    linearDrag: number,
    angularDrag: number,
    highlightElevation: number,
    highlightMargin: number,
    selectionElevation: number,
    selectionMargin: number,
};

function generateMagnetDataFromMetadata(metadata: Array<ViewMetadata>): MagnetData {
  const data = {} as any;
  metadata.forEach((field) => {
    data[field.name as keyof MagnetData] = field.defaultValue;
    if (data[field.name] == null) {
      switch(field.type) {
        case 'string':
          data[field.name] = '';
          break;
        case 'float':
          data[field.name] = 0;
          break;
        case 'bool':
          data[field.name] = false;
          break;
      }
    }
  })
  return data;
}


@Register
export class TabMagnet extends TabBase {
    static get Style() {
        return /* css */`
          :host {
              display: block;
          }
          :host .input-row {
              display: flex;
              flex-direction: row;
              gap: 10px;
          }
          :host .input-row > io-string {
              flex: 1 1 auto;
          }
          :host .input-row > io-button {
              flex: 0 0 4rem;
          }
          :host > io-number-slider {
              align-self: stretch;
          }
          :host > io-number-slider > io-number {
              flex-basis: 4rem;
          }
      `;
    }
    onCreateMagnet() {
        const input = this.$['magnet-name-input'] as IoString;
        const title = (input).value.trim();
        if (title) {
            input.value = '';

            const currentMagnets = this.simulatorState.magnets || [];
            const existingMagnet = currentMagnets.find(magnet => {
                return magnet.title.trim().toLowerCase() === title.toLowerCase();
            });

            if (existingMagnet) {
                console.warn(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
                // this.highlightExistingMagnet(existingMagnet.title);
                return;
            }

            const timestamp = Date.now();
            const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const magnetId = `Magnet_${timestamp}${randomDigits}`;

            const magnetData = generateMagnetDataFromMetadata(this.controller.magnetViewMetadata);

            magnetData.magnetId = magnetId;
            magnetData.title = title;
            magnetData.searchExpression = title;
            magnetData.searchType = 'fuzzy';

            this.controller.sendCreateMagnetEvent(magnetData);
        }
    }
    onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.onCreateMagnet();
        }
    }
    changed() {
        const magnets = this.simulatorState.magnets || [];

        this.render([
            h2('Magnets'),
            p('Create magnets to attract related items'),
            div({class: 'input-row'}, [
                ioString({id: 'magnet-name-input', placeholder: 'Magnet Search String', live: true, '@keyup': this.onKeyUp}),
                ioButton({label: 'Add', action: this.onCreateMagnet})
            ]),
            ...magnets.map(magnet => magnetItem({magnet: magnet, controller: this.controller}))
        ]);
    }
}

export const tabMagnet = function(arg0: TabBaseProps) {
    return TabMagnet.vConstructor(arg0);
};