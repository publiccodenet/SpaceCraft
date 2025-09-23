var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { p, Register, div } from 'io-gui';
import { TabBase } from './TabBase.js';
let TabAbout = class TabAbout extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                display: flex;
                flex-direction: column;
                gap: 0.5em;
            }
        `;
    }
    static get Listeners() {
        return {
            'tab-selected': 'onTabSelected',
        };
    }
    onTabSelected() {
        // About → attract
        this.controller?.sendEventToSimulator('setViewMode', { mode: 'attract' });
    }
    changed() {
        this.render([
            div([
                p('SpaceCraft controller.'),
                p('Tap any tab to steer the simulator view mode.'),
            ])
        ]);
    }
};
TabAbout = __decorate([
    Register
], TabAbout);
export { TabAbout };
export const tabAbout = function (arg0) {
    return TabAbout.vConstructor(arg0);
};
//# sourceMappingURL=TabAbout.js.map