import { h2, Register } from 'io-gui';
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
        this.render([
            h2('DRAG to pan • SCROLL to zoom'),
        ]);
    }
}

export const tabNavigate = function(arg0: TabBaseProps) {
    return TabNavigate.vConstructor(arg0);
};