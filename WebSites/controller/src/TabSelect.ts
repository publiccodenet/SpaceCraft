import { h2, p, Register, div, img, h4 } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

const GESTURE_THRESHOLD = 20;

@Register
export class TabSelect extends TabBase {
    static get Style() {
        return /* css */`
            :host {
                text-align: justify;
            }
            :host .cover-image {
                pointer-events: none;
                float: right;
                margin: 4.2em 0 0.5em 1em;
            }
        `;
    }

    declare startX: number;
    declare startY: number;

    onPointerdown(event: PointerEvent) {
        super.onPointerdown(event);
        this.startX = event.clientX;
        this.startY = event.clientY;
    }
    onPointerup(event: PointerEvent) {
        super.onPointerup(event);

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

        this.render([
            h2('TAP or SWIPE to select items'),
            selected ? div([
                img({src: `../SpaceCraft/StreamingAssets/Content/collections/scifi/items/${selected.id}/cover.jpg`, alt: `Cover for ${selected.title}`, class: 'cover-image'}),
                h4(selected.title || 'Untitled'),
                div({class: 'description', innerHTML: description}),
            ]) : p('No item selected'),
        ]);
    }
}

export const tabSelect = function(arg0: TabBaseProps) {
    return TabSelect.vConstructor(arg0);
};