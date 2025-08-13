var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IoElement, Register, ReactiveProperty, h3, ioObject, ioButton } from 'io-gui';
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
            :host > io-object {
                flex: 1 1 auto;
            }
    `;
    }
    onDeleteMagnet() {
        this.controller.sendDeleteMagnetEvent(this.magnet.magnetId);
    }
    changed() {
        this.render([
            h3(this.magnet.title),
            ioObject({ value: this.magnet, label: 'Magnet Data' }),
            ioButton({ label: 'Delete', action: this.onDeleteMagnet, class: 'red' })
        ]);
    }
};
__decorate([
    ReactiveProperty({ type: Object })
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