var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { h1, p, Register, div, img } from 'io-gui';
import { magnetJoystick } from './MagnetJoystick.js';
import { TabBase } from './TabBase.js';
const GESTURE_THRESHOLD = 20;
let TabSelect = class TabSelect extends TabBase {
    static get Style() {
        return /* css */ `
            :host {
                text-align: justify;
                display: flex;
                flex-direction: column;
                overflow: hidden;  /* let inner container scroll */
                min-height: 0;     /* critical for flex scrolling */
                height: 100%;      /* fill available space inside io-selector */
            }
            :host .content {
                display: flex;
                flex-direction: column;
                gap: 0.75em;
                overflow: auto;    /* scrolling container */
                min-height: 0;
                flex: 1 1 auto;
                height: 100%;
                max-height: calc(100vh - 180px); /* viewport constraint to force scroll */
                -webkit-overflow-scrolling: touch;
                padding: 0.25em 0.25em 0.5em 0.25em;
            }
            :host .top-row {
                display: flex;
                align-items: flex-start;      /* top-justify both */
                justify-content: space-between;
                gap: 1em;
            }
            :host .top-row .cover {
                flex: 0 0 auto;
                max-width: 45vw;
            }
            :host .cover-image {
                pointer-events: none;
                display: block;
                max-width: 100%;
                height: auto;
            }
            :host .top-row .joy-col {
                flex: 0 0 auto;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 6px;
            }
            :host .joy-frame {
                background: var(--io_bgColor, #333);
                padding: 5px;
                border-radius: 6px;
            }
            :host .hint {
                font-style: italic;
                font-size: 0.9em;
                text-align: right;
                line-height: 1.2;
                opacity: 0.85;
                align-self: flex-end; /* hard right-justify within the column */
            }
            :host h1.title {
                margin: 0.15em 0 0.25em 0;
                line-height: 1.2;
                font-size: 1.8em;   /* larger item title */
                text-align: left;
            }
        `;
    }
    static get Listeners() {
        return {
            'pointerdown': 'onPointerdown',
        };
    }
    preventDefault(event) {
        event.preventDefault();
    }
    onPointerdown(event) {
        this.addEventListener('pointerup', this.onPointerup);
        this.addEventListener('pointercancel', this.onPointerup);
        this.startX = event.clientX;
        this.startY = event.clientY;
    }
    onPointerup(event) {
        this.removeEventListener('pointerup', this.onPointerup);
        this.removeEventListener('pointercancel', this.onPointerup);
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let gesture = 'tap';
        if (distance > GESTURE_THRESHOLD) {
            if (Math.abs(dx) > Math.abs(dy)) {
                gesture = dx > 0 ? 'east' : 'west';
            }
            else {
                gesture = dy > 0 ? 'south' : 'north';
            }
        }
        switch (gesture) {
            case 'tap':
                this.controller.sendSelectEvent('tap');
                break;
            case 'north':
                this.controller.sendSelectEvent('north');
                break;
            case 'south':
                this.controller.sendSelectEvent('south');
                break;
            case 'east':
                this.controller.sendSelectEvent('east');
                break;
            case 'west':
                this.controller.sendSelectEvent('west');
                break;
        }
    }
    changed() {
        let description = 'No description available';
        const selected = this.simulatorState?.selectedItem;
        if (selected?.description) {
            description = selected.description
                .split(/\n+/) // Split on any number of newlines
                .filter((line) => line.trim().length > 0) // Remove empty lines
                .map((line) => `<p>${line.trim()}</p>`) // Create paragraph for each line
                .join('');
        }
        // Resolve cover base from content store (built-in StreamingAssets path or external)
        const shared = this.controller.simulatorState || {};
        const assetsBase = shared.assetsBaseUrl || '../SpaceCraft/StreamingAssets/Content/';
        this.render([
            div({ class: 'content' }, [
                selected.id ? div({ class: 'top-row' }, [
                    div({ class: 'cover' }, [
                        img({ src: `${assetsBase}collections/scifi/items/${selected.id}/cover.jpg`, alt: `Cover for ${selected.title}`, class: 'cover-image' })
                    ]),
                    div({ class: 'joy-col' }, [
                        div({ class: 'joy-frame' }, [
                            magnetJoystick({ class: 'joy', value: [0, 0], min: [-0.1, -0.1], max: [0.1, 0.1], '@control': (e) => this.onItemJoystickControl(e) })
                        ]),
                        div({ class: 'hint', innerHTML: 'Joystick moves item.<br/>Swiping selects item.' })
                    ])
                ]) : null,
                selected.id ? h1({ class: 'title' }, selected.title || 'Untitled') : null,
                selected.id ? div({ class: 'description', innerHTML: description }) : p('No item selected')
            ])
        ]);
    }
    onItemJoystickControl(event) {
        const slider = event.target;
        const dx = slider.value[0];
        const dy = slider.value[1];
        const selected = this.simulatorState?.selectedItem;
        const id = selected?.id;
        try {
            console.log('[Controller][Select] joystick control', { id, dx, dy });
        }
        catch { }
        if (id) {
            this.controller?.sendPushItemEvent(id, dx, dy);
        }
        else {
            try {
                console.warn('[Controller][Select] No selected item id for joystick push');
            }
            catch { }
        }
    }
};
TabSelect = __decorate([
    Register
], TabSelect);
export { TabSelect };
export const tabSelect = function (arg0) {
    return TabSelect.vConstructor(arg0);
};
//# sourceMappingURL=TabSelect.js.map