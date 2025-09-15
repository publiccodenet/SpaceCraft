import { h2, div, Register, IoOptionSelect, MenuOption, IoOptionSelectProps, ListenerDefinition } from 'io-gui';
import { VIEW_MODE_OPTIONS, DEFAULT_VIEW_MODE } from './types/ViewMode.js';
import { TabBase, TabBaseProps } from './TabBase.js';

@Register
export class TabView extends TabBase {
    static get Style() {
        return /* css */`
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
                align-self: flex-start;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 2px 8px 4px 8px;
            }
        `;
    }

    static get Listeners() {
        return {
            'pointerdown': 'onPointerdown',
            'touchstart': ['preventDefault', {passive: false}] as ListenerDefinition,
            'touchmove': ['preventDefault', {passive: false}] as ListenerDefinition,
            'wheel': 'onWheel',
        };
    }

    preventDefault(event: Event) {
        event.preventDefault();
    }
    onPointerdown(event: PointerEvent) {
        this.setPointerCapture(event.pointerId);
        this.addEventListener('pointerup', this.onPointerup);
        this.addEventListener('pointermove', this.onPointermove);
        this.addEventListener('pointercancel', this.onPointerup);
    }
    onPointermove(event: PointerEvent) {
        if (event.movementX || event.movementY) {
            this.controller.sendPanEvent(
                event.movementX * 0.03,
                event.movementY * 0.03
            );
        }
    }
    onPointerup(event: PointerEvent) {
        this.releasePointerCapture(event.pointerId);
        this.removeEventListener('pointerup', this.onPointerup);
        this.removeEventListener('pointermove', this.onPointermove);
        this.removeEventListener('pointercancel', this.onPointerup);
    }

    onWheel(event: WheelEvent) {
      this.controller.sendZoomEvent(event.deltaY * 0.01);
    }

    onViewModeChange(event: CustomEvent) {
        const newMode = event.detail?.value;
        if (!newMode || !this.controller?.clientChannel) return;
        this.controller.clientChannel.send({
            type: 'broadcast',
            event: 'setViewMode',
            payload: { mode: newMode, targetSimulatorId: this.controller.currentSimulatorId }
        }).catch((err: any) => console.error('[Controller] setViewMode send failed:', err));
    }

    changed() {
        const vm = this.simulatorState?.viewMode || DEFAULT_VIEW_MODE;
        this.render([
            div({ class: 'view-controls' }, [
                h2('View Mode:'),
                IoOptionSelect.vConstructor({
                    value: vm,
                    option: new MenuOption({ options: VIEW_MODE_OPTIONS }),
                    '@value-input': (e: CustomEvent) => this.onViewModeChange(e)
                } as IoOptionSelectProps),
            ]),
            h2('DRAG to pan • SCROLL to zoom'),
        ]);
    }
}

export const tabView = function(arg0: TabBaseProps) {
    return TabView.vConstructor(arg0);
};
