var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IoElement, Register, ReactiveProperty, h2, div, ioNumberSlider, ioObject, ioButton, ioString, ioBoolean } from 'io-gui';
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
            div({ class: 'header' }, [
                h2(this.magnet.title),
                magnetJoystick({ value: [0, 0], min: [-0.1, -0.1], max: [0.1, 0.1], '@control': this.onJoystickControl })
            ]),
            ioObject({
                value: this.magnet,
                label: 'Magnet Data',
                config: magnetEditorConfig,
                groups: magnetEditorGroups
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