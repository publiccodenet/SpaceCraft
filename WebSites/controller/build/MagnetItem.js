var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IoElement, Register, ReactiveProperty, h3, ioSlider, ioSlider2d, ioObject, ioButton } from 'io-gui';
function generateMagnetEditorConfig(metadata) {
    const viewConfig = [];
    metadata.forEach(field => {
        if (field.type === 'float') {
            viewConfig.push([field.name, ioSlider({
                    min: field.min,
                    max: field.max,
                    step: field.step,
                })]);
        }
    });
    return new Map([
        [Object, viewConfig]
    ]);
}
let MagnetItem = class MagnetItem extends IoElement {
    static get Style() {
        return /* css */ `
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
    `;
    }
    onDeleteMagnet() {
        this.controller.sendDeleteMagnetEvent(this.magnet.magnetId);
    }
    onPushMagnet() {
        const slider = this.$.moveslider;
        this.controller.sendPushMagnetEvent(this.magnet.magnetId, slider.value[0], slider.value[1]);
    }
    magnetMutated() {
        this.controller.sendUpdateMagnetEvent(this.magnet);
    }
    changed() {
        const magnetEditorConfig = generateMagnetEditorConfig(this.controller.magnetViewMetadata);
        this.render([
            h3(this.magnet.title),
            ioSlider2d({ id: 'moveslider', value: [0, 0], min: [-1, -1], max: [1, 1], '@value-input': this.onPushMagnet }),
            ioObject({ value: this.magnet, label: 'Magnet Data', config: magnetEditorConfig }),
            ioButton({ label: 'Delete', action: this.onDeleteMagnet, class: 'red' })
        ]);
    }
};
__decorate([
    ReactiveProperty({ type: Object, init: null })
], MagnetItem.prototype, "magnet", void 0);
__decorate([
    ReactiveProperty({ type: Object })
], MagnetItem.prototype, "controller", void 0);
MagnetItem = __decorate([
    Register
], MagnetItem);
export { MagnetItem };
export const magnetItem = function (arg0) {
    return MagnetItem.vConstructor(arg0);
};
//# sourceMappingURL=MagnetItem.js.map