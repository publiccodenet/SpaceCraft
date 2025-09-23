import { h2, p, Register, div, ListenerDefinition } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

@Register
export class TabAbout extends TabBase {
    static get Style() {
        return /* css */`
            :host {
                display: flex;
                flex-direction: column;
                gap: 0.5em;
            }
        `;
    }

    static get Listeners() {
        return {
            'tab-selected': 'onTabSelected',
        } as any;
    }

    onTabSelected() {
        // About → attract
        (this as any).controller?.sendEventToSimulator('setViewMode', { mode: 'attract' });
    }

    changed() {
        this.render([
            div([
                p('SpaceCraft controller.'),
                p('Tap any tab to steer the simulator view mode.'),
            ])
        ]);
    }
}

export const tabAbout = function(arg0: TabBaseProps) {
    return TabAbout.vConstructor(arg0);
};


