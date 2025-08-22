var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { h2, Register } from 'io-gui';
import { TabBase } from './TabBase.js';
let TabNavigate = class TabNavigate extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                justify-content: center;
            }
            :host > h2 {
                pointer-events: none;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
        `;
    }
    onPointermove(event) {
        super.onPointermove(event);
        if (event.movementX || event.movementY) {
            this.controller.sendPanEvent(event.movementX * 0.03, event.movementY * 0.03);
        }
    }
    changed() {
        this.render([
            h2('DRAG to pan • SCROLL to zoom'),
        ]);
    }
};
TabNavigate = __decorate([
    Register
], TabNavigate);
export { TabNavigate };
export const tabNavigate = function (arg0) {
    return TabNavigate.vConstructor(arg0);
};
//# sourceMappingURL=TabNavigate.js.map