var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { h2, p, Register, div, img, h4 } from 'io-gui';
import { TabBase } from './TabBase.js';
import { contentStore } from './services/ContentStore.js';
const GESTURE_THRESHOLD = 20;
let TabSelect = class TabSelect extends TabBase {
    static get Style() {
        return /* css */ `
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
    static get Listeners() {
        return {
            'pointerdown': 'onPointerdown',
            'touchstart': ['preventDefault', { passive: false }],
            'touchmove': ['preventDefault', { passive: false }],
            'wheel': 'onScroll',
        };
    }
    preventDefault(event) {
        event.preventDefault();
    }
    onPointerdown(event) {
        this.setPointerCapture(event.pointerId);
        this.addEventListener('pointerup', this.onPointerup);
        this.addEventListener('pointercancel', this.onPointerup);
        this.startX = event.clientX;
        this.startY = event.clientY;
    }
    onPointerup(event) {
        this.releasePointerCapture(event.pointerId);
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
        const contentKey = shared.contentKey || shared.contentIndexUrl;
        const contentRec = contentStore.getContent(contentKey);
        const assetsBase = shared.assetsBaseUrl || '../SpaceCraft/StreamingAssets/Content/';
        this.render([
            h2('TAP or SWIPE to select items'),
            selected ? div([
                img({ src: `${assetsBase}collections/scifi/items/${selected.id}/cover.jpg`, alt: `Cover for ${selected.title}`, class: 'cover-image' }),
                h4(selected.title || 'Untitled'),
                div({ class: 'description', innerHTML: description }),
            ]) : p('No item selected'),
        ]);
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