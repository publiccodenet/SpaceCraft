var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { h2, div, Register, IoOptionSelect, MenuOption } from 'io-gui';
import { VIEW_MODE_OPTIONS, DEFAULT_VIEW_MODE } from './types/ViewMode.js';
import { TabBase } from './TabBase.js';
let TabView = class TabView extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                display: flex;
                flex-direction: column;
                align-items: stretch;
            }
            :host > h2 {
                pointer-events: none;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                margin: 0 0 6px 0;
            }
            :host .view-controls {
                align-self: flex-end;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 6px 8px 6px 8px;
            }
        `;
    }
    onPointermove(event) {
        super.onPointermove(event);
        if (event.movementX || event.movementY) {
            this.controller.sendPanEvent(event.movementX * 0.03, event.movementY * 0.03);
        }
    }
    onViewModeChange(event) {
        const newMode = event.detail?.value;
        if (!newMode || !this.controller?.clientChannel)
            return;
        this.controller.clientChannel.send({
            type: 'broadcast',
            event: 'setViewMode',
            payload: { mode: newMode, targetSimulatorId: this.controller.currentSimulatorId }
        }).catch((err) => console.error('[Controller] setViewMode send failed:', err));
    }
    changed() {
        const vm = this.simulatorState?.viewMode || DEFAULT_VIEW_MODE;
        this.render([
            div({ class: 'view-controls' }, [
                h2('View Mode:'),
                IoOptionSelect.vConstructor({
                    value: vm,
                    option: new MenuOption({ options: VIEW_MODE_OPTIONS }),
                    '@value-input': (e) => this.onViewModeChange(e)
                }),
            ]),
            h2('DRAG to pan • SCROLL to zoom'),
        ]);
    }
};
TabView = __decorate([
    Register
], TabView);
export { TabView };
export const tabView = function (arg0) {
    return TabView.vConstructor(arg0);
};
//# sourceMappingURL=TabView.js.map