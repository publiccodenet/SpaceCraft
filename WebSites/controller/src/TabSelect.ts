import { h1, h2, p, Register, div, img, h4, ListenerDefinition } from 'io-gui';
import { magnetJoystick, MagnetJoystick } from './MagnetJoystick.js';
import { TabBase, TabBaseProps } from './TabBase.js';

const GESTURE_THRESHOLD = 20;

@Register
export class TabSelect extends TabBase {
    static get Listeners() {
        return {
            'pointerdown': 'onPointerdown',
            'tab-selected': 'onTabSelected',
        };
    }
    onTabSelected() {
        // Select → selection
        (this as any).controller?.sendEventToSimulator('setViewMode', { mode: 'selection' });
    }
    static get Style() {
        return /* css */`
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

    declare startX: number;
    declare startY: number;

    

    preventDefault(event: Event) {
        event.preventDefault();
    }
    onPointerdown(event: PointerEvent) {
        this.addEventListener('pointerup', this.onPointerup);
        this.addEventListener('pointercancel', this.onPointerup);
        this.startX = event.clientX;
        this.startY = event.clientY;
    }
    onPointerup(event: PointerEvent) {
        this.removeEventListener('pointerup', this.onPointerup);
        this.removeEventListener('pointercancel', this.onPointerup);
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let gesture = 'tap';
        if (distance > GESTURE_THRESHOLD) {
            if (Math.abs(dx) > Math.abs(dy)) {
                gesture = dx > 0 ? 'east' : 'west';
            } else {
                gesture = dy > 0 ? 'south' : 'north';
            }
        }

        switch (gesture) {
        case 'tap': this.controller.sendSelectEvent('tap'); break;
        case 'north': this.controller.sendSelectEvent('north'); break;
        case 'south': this.controller.sendSelectEvent('south'); break;
        case 'east': this.controller.sendSelectEvent('east'); break;
        case 'west': this.controller.sendSelectEvent('west'); break;
        }
    }

    changed() {
        let description = 'No description available';
        const selected = this.simulatorState?.selectedItem;
        if (selected?.description) {
            description = selected.description
                .split(/\n+/) // Split on any number of newlines
                .filter((line: string) => line.trim().length > 0) // Remove empty lines
                .map((line: string) => `<p>${line.trim()}</p>`) // Create paragraph for each line
                .join('');
        }

        // Resolve cover base from content store (built-in StreamingAssets path or external)
        const shared: any = (this.controller as any).simulatorState || {};
        const assetsBase = (shared as any).assetsBaseUrl || '../SpaceCraft/StreamingAssets/Content/';

        this.render([
            div({class: 'content'}, [
                selected.id ? div({class: 'top-row'}, [
                    div({class: 'cover'}, [
                        img({src: `${assetsBase}collections/scifi/items/${selected.id}/cover.jpg`, alt: `Cover for ${selected.title}`, class: 'cover-image'})
                    ]),
                    div({class: 'joy-col'}, [
                        div({class: 'joy-frame'}, [
                            magnetJoystick({class: 'joy', value: [0,0], min: [-0.1, -0.1], max: [0.1, 0.1], '@control': (e: CustomEvent) => this.onItemJoystickControl(e)})
                        ]),
                        div({class: 'hint', innerHTML: 'Joystick moves item.<br/>Swiping selects item.'})
                    ])
                ]) : null,
                selected.id ? h1({class: 'title'}, selected.title || 'Untitled') : null,
                selected.id ? div({class: 'description', innerHTML: description}) : p('No item selected')
            ])
        ]);
    }

    onItemJoystickControl(event: CustomEvent) {
        const slider = event.target as MagnetJoystick;
        const dx = slider.value[0];
        const dy = slider.value[1];
        const selected = (this as any).simulatorState?.selectedItem;
        const id = selected?.id;
        try {
            console.log('[Controller][Select] joystick control', { id, dx, dy });
        } catch {}
        if (id) {
            (this as any).controller?.sendPushItemEvent(id, dx, dy);
        } else {
            try { console.warn('[Controller][Select] No selected item id for joystick push'); } catch {}
        }
    }
}

export const tabSelect = function(arg0: TabBaseProps) {
    return TabSelect.vConstructor(arg0);
};