import { IoElement, h2, Register, IoElementProps, Property, ReactiveProperty } from 'io-gui';
import { SpacetimeController } from './SpacetimeController.js';
import { SimulatorState } from './SimulatorState.js';

export type TabBaseProps = IoElementProps & {
  controller: SpacetimeController;
  simulatorState: SimulatorState;
};

@Register
export class TabBase extends IoElement {
    static get Style() {
        return /* css */`
            :host {
                flex: 1 1 auto;
                display: flex;
                flex-direction: column;
                align-items: stretch; /* allow children to take full width */
                justify-content: flex-start;
                padding: 0.5em 0.75em;
                overflow: auto; /* enable scrolling by default for tall tab content */
                height: 100%;
                min-height: 0; /* allow inner flex children to shrink and scroll */
            }
        `;
    }

    @Property()
    declare controller: SpacetimeController;

    @ReactiveProperty({type: SimulatorState})
    declare simulatorState: SimulatorState;

    constructor(props: TabBaseProps) {
        super(props);
    }

    ready() {
        this.changed();
    }

    simulatorStateMutated() {
        this.changed();
    }

    changed() {
        this.render([
            h2('TabBase'),
        ]);
    }
}

export const tabBase = function(arg0: TabBaseProps) {
    return TabBase.vConstructor(arg0);
};