import { IoElement, IoElementProps, Register, ioNavigator, MenuOption, ioString, Storage as $, div, h1, h2, p, ioMarkdown } from '../lib/io-gui/index.js';
import { Controller } from './controller.js';
import { spacetimeNavigate } from './SpacetimeNavigate.js';
import { spacetimeSelect } from './SpacetimeSelect.js';
import { spacetimeInspect } from './SpacetimeInspect.js';
import { spacetimeGravity } from './SpacetimeGravity.js';
import { spacetimeMagnet } from './SpacetimeMagnet.js'; 
import { spacetimeAdjust } from './SpacetimeAdjust.js';

export type SpacetimeControllerProps = IoElementProps & {
};

const controller = new Controller({});

export class SpacetimeController extends IoElement {

  static get Style() {
    return /* css */`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
      }
    `;
  }

  constructor(props: SpacetimeControllerProps) {
    super(props);
    controller.initialize();
  }

  ready() {
    this.render([
      ioNavigator({
        menu: 'top',
        option: new MenuOption({
          id: 'root',
          options: [
            {id: 'About', icon: '📖'},
            {id: 'Navigate', icon: '🧭'},
            {id: 'Select', icon: '👆'},
            {id: 'Inspect', icon: '🔍'},
            {id: 'Gravity', icon: '🌍'},
            {id: 'Magnet', icon: '🧲'},
            {id: 'Adjust', icon: '⚙️'},
          ],
          selectedID: $({key: 'path', storage: 'hash', value: 'About'})
        }),
        elements: [
          ioMarkdown({id: 'About', src: './docs/About.md'}),
          spacetimeNavigate({id: 'Navigate', controller: controller}),
          spacetimeSelect({id: 'Select', controller: controller}),
          spacetimeInspect({id: 'Inspect', controller: controller}),
          spacetimeGravity({id: 'Gravity'}),
          spacetimeMagnet({id: 'Magnet'}),
          spacetimeAdjust({id: 'Adjust'}),
        ]
      })
    ])
  }
}

Register(SpacetimeController);

export const spacetimeController = function(arg0?: SpacetimeControllerProps) {
  return SpacetimeController.vConstructor(arg0);
};