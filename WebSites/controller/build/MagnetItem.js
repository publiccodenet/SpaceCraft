var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IoElement, Register, ReactiveProperty, ioObject, ioBoolean, ioButton, ioNumberSlider, ioString } from 'io-gui';
import { magnetJoystick } from './MagnetJoystick.js';
function generateMagnetEditorConfig(metadata) {
    const viewConfig = [];
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
                viewConfig.push([field.name, ioBoolean({ true: 'io:box_fill_checked', false: 'io:box' })]);
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
function generateMagnetEditorGroups(metadata) {
    const groups = {};
    metadata.forEach(field => {
        groups[field.category] = groups[field.category] || [];
        groups[field.category].push(field.name);
    });
    // groups.Main
    return new Map([
        [Object, groups],
    ]);
}
let MagnetItem = class MagnetItem extends IoElement {
    static get Style() {
        return /* css */ `
            :host {
                display: flex;
                flex-direction: column;
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
            :host > io-object io-number-slider {
              
              flex: 1 1 auto; 
            }
            :host > io-object io-number-slider > io-number {
              flex-basis: 4em;
            }
    `;
    }
    onDeleteMagnet() {
        if (this.magnet?.magnetId)
            this.controller.sendDeleteMagnetEvent(this.magnet.magnetId);
    }
    onJoystickControl(event) {
        const slider = event.target;
        if (this.magnet?.magnetId)
            this.controller.sendPushMagnetEvent(this.magnet.magnetId, slider.value[0], slider.value[1]);
    }
    magnetMutated() {
        this.controller.sendUpdateMagnetEvent(this.magnet);
    }
    changed() {
        const magnetEditorConfig = generateMagnetEditorConfig(this.controller.magnetViewMetadata);
        const magnetEditorGroups = generateMagnetEditorGroups(this.controller.magnetViewMetadata);
        this.render([
            h3(this.magnet.title),
            ioObject({ value: this.magnet, label: 'Magnet Data', config: magnetEditorConfig, groups: magnetEditorGroups,
                widgets: new Map([[
                        Object, magnetJoystick({ value: [0, 0], min: [-1, -1], max: [1, 1], '@control': this.onJoystickControl, ctrlTtimeout: 20 })
                    ]])
            }),
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