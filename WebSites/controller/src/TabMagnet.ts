import { h2, p, Register, ioString, ioButton, div, IoString } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';
import { magnetItem, Magnet } from './MagnetItem.js';

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
        const name = (input).value.trim();
        if (name) {
            input.value = '';

            const currentMagnets = this.simulatorState.magnets || [];
            const existingMagnet = currentMagnets.find(magnet => {
                return magnet.title.trim().toLowerCase() === name.toLowerCase();
            });

            if (existingMagnet) {
                console.warn(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
                // this.highlightExistingMagnet(existingMagnet.title);
                return;
            }

            const timestamp = Date.now();
            const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const magnetId = `Magnet_${timestamp}${randomDigits}`;

            const magnetData: Magnet = {
                magnetId: magnetId,
                title: name,
                searchExpression: name,
                searchType: 'fuzzy',
                enabled: true,
                magnetEnabled: true,
                mass: 1.0,
                staticFriction: 10.0,
                dynamicFriction: 8.0,
                magnetRadius: 100.0,
                magnetSoftness: 0.5,
                magnetHoleRadius: 10.0,
                magnetStrength: 1.0,
                scoreMin: 0.0,
                scoreMax: 1.0,
                viewScale: 4.0,
                viewScaleInitial: 0.01
            };

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