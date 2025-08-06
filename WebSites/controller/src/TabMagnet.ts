import { h2, p, Register, ioString, ioButton, div, IoString } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';
import { magnetItem } from './MagnetItem.js';

@Register
export class TabMagnet extends TabBase {
  static get Style() {
    return /* css */`
      :host {
        display: block;
      }
      :host > h2 {
        margin: 0;
      }
      :host .input-row {
        display: flex;
        flex-direction: row;
        gap: 10px;
      }
      :host .input-row > io-string {
        flex: 1 1 auto;
      }
      :host .input-row > io-button {
        flex: 0 0 4rem;
      }
    `;
  }
  onAddMagnet() {
    const input = this.$['input-magnet-name'] as IoString;
    const name = (input).value.trim();
    if (name) {
      input.value = '';

      const currentMagnets = this.simulatorState.magnets || [];
      const existingMagnet = currentMagnets.find(magnet => {
          return magnet.title.trim().toLowerCase() === name.toLowerCase();
      });
      if (existingMagnet) {
          console.warn(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
          // this.highlightExistingMagnet(existingMagnet.title);
          return;
      }
      this.controller.sendAddMagnetEvent(name);
    }
  }
  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onAddMagnet();
    }
  }
  changed() {
    const magnets = this.simulatorState.magnets || [];

    this.render([
      h2('Search Magnets'),
      p('Create magnets to attract related items'),
      div({class: 'input-row'}, [
        ioString({id: 'input-magnet-name', placeholder: 'Magnet Search String', live: true, '@keyup': this.onKeyUp}),
        ioButton({label: 'Add', action: this.onAddMagnet})
      ]),
      ...magnets.map(magnet => magnetItem({magnet: magnet, controller: this.controller}))
    ]);
  }
}

export const tabMagnet = function(arg0: TabBaseProps) {
  return TabMagnet.vConstructor(arg0);
};