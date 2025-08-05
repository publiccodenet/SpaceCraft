import { IoElement, h1, p, Register } from '../lib/io-gui/index.js';

@Register
export class SpacetimeMagnet extends IoElement {
  ready() {
    this.render([
      h1('Magnet'),
      p('Magnet an item'),
    ]);
  }
}

export const spacetimeMagnet = SpacetimeMagnet.vConstructor;