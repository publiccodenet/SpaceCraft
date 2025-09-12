import { h2, Register, IoOptionSelect, MenuOption, IoOptionSelectProps, br } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

@Register
export class TabNavigate extends TabBase {
    static get Style() {
        return /* css */`
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

    onPointermove(event: PointerEvent) {
        super.onPointermove(event);
        if (event.movementX || event.movementY) {
            this.controller.sendPanEvent(
                event.movementX * 0.03,
                event.movementY * 0.03
            );
        }
    }

    changed() {
        // Force rerender when simulator list changes by reading controller.simulatorRosterTick
        void (this.controller as any).simulatorRosterTick;
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
                    '@value-input': (e: CustomEvent) => this.onSimulatorChange(e)
                } as IoOptionSelectProps)
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
                } as IoOptionSelectProps)
            ];

        this.render([
            ...headerRow,
            h2('DRAG to pan • PINCH to zoom'),
        ]);
    }

    onSimulatorChange(event: CustomEvent) {
        const newId = event.detail?.value;
        if (newId && newId !== this.controller.currentSimulatorId && newId !== '(none)') {
            (this.controller as any).setCurrentSimulator?.(newId);
        }
    }
}

export const tabNavigate = function(arg0: TabBaseProps) {
    return TabNavigate.vConstructor(arg0);
};