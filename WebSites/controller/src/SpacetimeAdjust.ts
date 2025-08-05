import { IoElement, h1, p, Register } from '../lib/io-gui/index.js';

@Register
export class SpacetimeAdjust extends IoElement {
  ready() {
    this.render([
      h1('Simulation Parameters'),
      p('Settings will be loaded from metadata')
    ]);
  }
}

export const spacetimeAdjust = SpacetimeAdjust.vConstructor;