var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { h2, Register, IoOptionSelect, MenuOption, br } from 'io-gui';
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
        // Force rerender when simulator list changes by reading controller.simulatorRosterTick
        void this.controller.simulatorRosterTick;
        const simulators = Array.from(this.controller.currentSimulators?.values() || []);
        const hasSimulators = simulators.length > 0;
        const headerRow = hasSimulators
            ? [
                h2('Simulator:'),
                br(),
                IoOptionSelect.vConstructor({
                    value: this.controller.currentSimulatorId || '',
                    option: new MenuOption({
                        options: simulators
                            .map(s => ({ id: (s.clientName || s.clientId), value: s.clientId }))
                            .sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }))
                    }),
                    '@value-input': (e) => this.onSimulatorChange(e)
                })
            ]
            : [
                h2('Simulator:'),
                br(),
                IoOptionSelect.vConstructor({
                    value: '(none)',
                    option: new MenuOption({
                        options: [{ id: '(none)', value: '(none)' }],
                        disabled: true,
                    }),
                    // no handler; locked selector
                    'disabled': true
                })
            ];
        this.render([
            ...headerRow,
            h2('DRAG to pan • PINCH to zoom'),
        ]);
    }
    onSimulatorChange(event) {
        const newId = event.detail?.value;
        if (newId && newId !== this.controller.currentSimulatorId && newId !== '(none)') {
            this.controller.setCurrentSimulator?.(newId);
        }
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