import { IoElement, Register, Property, IoElementProps, iframe, ReactiveProperty } from '../lib/io-gui/index.js';
import { Controller } from './controller.js';

export type SpacetimeInspectProps = IoElementProps & {
  controller: Controller;
};

@Register
export class SpacetimeInspect extends IoElement {

  static get Style() {
    return /* css */`
      :host {
        flex: 1 1 auto;
        display: flex;
      }
      iframe {
        flex: 1 1 auto;
        border: none;
      }
    `;
  }

  @Property()
  declare controller: Controller;

  @ReactiveProperty({type: String, value: ''})
  declare currentItemUrl: string;

  constructor(props: SpacetimeInspectProps) {
    super(props);
    this.controller.addEventListener('simulatorStateChange', this.onSimulatorStateChange);
  }

  onSimulatorStateChange(event: CustomEvent) {
    const state = event.detail;
    const selectedItem = state.selectedItem;
    
    let itemUrl = '';
    if (selectedItem) {
      itemUrl = selectedItem.url || 
                selectedItem.href || 
                selectedItem.link || 
                selectedItem.source || 
                selectedItem.archiveUrl || 
                selectedItem.pageUrl || 
                selectedItem.webUrl ||
                selectedItem.URL ||
                selectedItem.Link ||
                selectedItem.Source;
      
      // If no explicit URL found, construct from Internet Archive ID
      if (!itemUrl && selectedItem.id) {
        itemUrl = `https://archive.org/details/${selectedItem.id}`;
      }
    }
    this.currentItemUrl = itemUrl;
  }

  ready() {
    this.changed();
  }

  changed() {
    this.render([
      iframe({src: this.currentItemUrl || 'about:blank'}),
    ]);
  }
}

export const spacetimeInspect = function(arg0?: SpacetimeInspectProps) {
  return SpacetimeInspect.vConstructor(arg0);
};