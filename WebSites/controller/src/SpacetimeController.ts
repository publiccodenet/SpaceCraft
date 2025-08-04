import { IoElement, IoElementProps, Register, ioNavigator, MenuOption, ioString, Storage as $, div, h1, h2, p } from '../lib/io-gui/index.js';
import { GestureServiceInstance } from './gesture.js';
import { Controller, SimulatorState } from './controller.js';

export type SpacetimeControllerProps = IoElementProps & {
};

const controller = new Controller();

export class SpacetimeController extends IoElement {

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
            {id: 'About', label: '📖 About'},
            {id: 'Navigate', label: '🧭 Navigate'},
            {id: 'Select', label: '👆 Select'},
            {id: 'Inspect', label: '🔍 Inspect'},
            {id: 'Magnet', label: '🧲 Magnet'},
            {id: 'Adjust', label: '⚙️ Adjust'},
          ],
          selectedID: $({key: 'path', storage: 'hash', value: 'About'})
        }),
        elements: [
          div({id: 'About'}, [
            h1('Spacetime Controller'),
            p('Unified Multi-Tab Interface'),
          ]),
          div({id: 'Navigate'}, [
            p('DRAG to pan • SCROLL to zoom • SEARCH to filter'),
            ioString({
              value: '',
              placeholder: 'Search',
              '@value-changed': (event: CustomEvent) => {
                controller.setSearchQuery(event.detail.value);
              }
            })
          ]),
          div({id: 'Select'}, [
            h1('Select'),
            p('Select an item'),
          ]),
          div({id: 'Inspect'}, [
            h1('Inspect'),
            p('Inspect an item'),
          ]),
          div({id: 'Magnet'}, [
            h1('Magnet'),
            p('Magnet an item'),
          ]),
          div({id: 'Adjust'}, [
            h2('Simulation Parameters'),
            p('Settings will be loaded from metadata'),
          ]),
        ]
      })
    ])
  }
}

Register(SpacetimeController);

export const spacetimeController = function(arg0?: SpacetimeControllerProps) {
  return SpacetimeController.vConstructor(arg0);
};