var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IoElement, h2, Register, Property, ReactiveProperty } from 'io-gui';
import { SimulatorState } from './SimulatorState.js';
let TabBase = class TabBase extends IoElement {
    static get Style() {
        return /* css */ `
            :host {
                flex: 1 1 auto;
                display: flex;
                flex-direction: column;
                align-items: stretch; /* allow children to take full width */
                justify-content: flex-start;
                padding: 0.5em 0.75em;
                overflow: auto; /* enable scrolling by default for tall tab content */
                height: 100%;
                min-height: 0; /* allow inner flex children to shrink and scroll */
            }
        `;
    }
    constructor(props) {
        super(props);
    }
    ready() {
        this.changed();
    }
    simulatorStateMutated() {
        this.changed();
    }
    changed() {
        this.render([
            h2('TabBase'),
        ]);
    }
};
__decorate([
    Property()
], TabBase.prototype, "controller", void 0);
__decorate([
    ReactiveProperty({ type: SimulatorState })
], TabBase.prototype, "simulatorState", void 0);
TabBase = __decorate([
    Register
], TabBase);
export { TabBase };
export const tabBase = function (arg0) {
    return TabBase.vConstructor(arg0);
};
//# sourceMappingURL=TabBase.js.map