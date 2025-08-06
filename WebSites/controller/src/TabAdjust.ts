import { Register, h2, ioInspector } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

@Register
export class TabAdjust extends TabBase {
  static get Style() {
    return /* css */`
      :host > io-inspector {
        align-self: stretch;
      }
    `;
  }
  changed() {
    this.render([
      h2('Simulation State'),
      ioInspector({
        value: this.simulatorState,
        groups: new Map([
          [Object, {
            'Hidden': ['reactivity'],
          }],
        ]),
      })
    ]);
  }
}

export const tabAdjust = function(arg0: TabBaseProps) {
  return TabAdjust.vConstructor(arg0);
};