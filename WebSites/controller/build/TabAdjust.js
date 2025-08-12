var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Register, h2, ioInspector } from 'io-gui';
import { TabBase } from './TabBase.js';
let TabAdjust = class TabAdjust extends TabBase {
    static get Style() {
        return /* css */ `
            :host > io-inspector {
              align-self: stretch;
            }
            :host io-property-editor > .row > span {
              flex: 0 1 10rem;
            }
        `;
    }
    changed() {
        this.render([
            h2('Simulation State'),
            ioInspector({
                value: this.simulatorState,
                groups: new Map([
                    [Object, {
                            'Hidden': ['reactivity'],
                        }],
                ]),
            })
        ]);
    }
};
TabAdjust = __decorate([
    Register
], TabAdjust);
export { TabAdjust };
export const tabAdjust = function (arg0) {
    return TabAdjust.vConstructor(arg0);
};
//# sourceMappingURL=TabAdjust.js.map