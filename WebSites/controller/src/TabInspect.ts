import { Register, iframe } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

@Register
export class TabInspect extends TabBase {
    static get Style() {
        return /* css */`
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
            iframe({src: itemUrl || 'about:blank'}),
        ]);
    }
}

export const tabInspect = function(arg0: TabBaseProps) {
    return TabInspect.vConstructor(arg0);
};