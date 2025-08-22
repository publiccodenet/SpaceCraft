var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { h2, p, Register, ioString, ioButton, div } from 'io-gui';
import { TabBase } from './TabBase.js';
import { magnetItem } from './MagnetItem.js';
function generateMagnetDataFromMetadata(metadata) {
    const data = {};
    metadata.forEach((field) => {
        // Only set fields with non-null defaults; otherwise omit so Unity prefab values remain
        if (field.defaultValue !== null && field.defaultValue !== undefined) {
            data[field.name] = field.defaultValue;
        }
    });
    return data;
}
let TabMagnet = class TabMagnet extends TabBase {
    static get Style() {
        return /* css */ `
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
        const input = this.$['magnet-name-input'];
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
            magnetData.viewScale = 3;
            magnetData.mass = 1000; // Heavy magnets resist being pushed by books
            magnetData.linearDrag = 1000; // Very high drag so magnets stop immediately
            magnetData.angularDrag = 1000; // Very high angular drag
            magnetData.magnetRadius = 500;
            magnetData.magnetHoleStrength = 1;
            magnetData.magnetHoleRadius = 0;
            magnetData.magnetHoleStrength = -1;
            magnetData.scoreMin = 0.75;
            this.controller.sendCreateMagnetEvent(magnetData);
        }
    }
    onKeyUp(event) {
        if (event.key === 'Enter') {
            this.onCreateMagnet();
        }
    }
    changed() {
        const magnets = this.simulatorState.magnets || [];
        this.render([
            h2('Magnets'),
            p('Create magnets to attract related items'),
            div({ class: 'input-row' }, [
                ioString({ id: 'magnet-name-input', placeholder: 'Magnet Search String', live: true, '@keyup': this.onKeyUp }),
                ioButton({ label: 'Add', action: this.onCreateMagnet })
            ]),
            ...magnets.map(magnet => magnetItem({ magnet: magnet, controller: this.controller }))
        ]);
    }
};
TabMagnet = __decorate([
    Register
], TabMagnet);
export { TabMagnet };
export const tabMagnet = function (arg0) {
    return TabMagnet.vConstructor(arg0);
};
//# sourceMappingURL=TabMagnet.js.map