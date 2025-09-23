var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Register, iframe } from 'io-gui';
import { TabBase } from './TabBase.js';
let TabInspect = class TabInspect extends TabBase {
    static get Listeners() {
        return {
            'tab-selected': 'onTabSelected'
        };
    }
    onTabSelected() {
        // Inspect → selection
        this.controller?.sendEventToSimulator('setViewMode', { mode: 'selection' });
    }
    static get Style() {
        return /* css */ `
            :host {
                padding: 0;
            }
            :host > iframe {
                flex: 1 1 auto;
                border: none;
                align-self: stretch;
            }
        `;
    }
    changed() {
        const selected = this.simulatorState.selectedItem;
        let itemUrl = selected.url ?? '';
        if (!itemUrl && selected?.id) {
            // If no explicit URL found, construct from Internet Archive ID
            itemUrl = `https://archive.org/details/${selected.id}`;
        }
        this.render([
            iframe({ src: itemUrl || 'about:blank' }),
        ]);
    }
};
TabInspect = __decorate([
    Register
], TabInspect);
export { TabInspect };
export const tabInspect = function (arg0) {
    return TabInspect.vConstructor(arg0);
};
//# sourceMappingURL=TabInspect.js.map