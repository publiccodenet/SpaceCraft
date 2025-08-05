import { IoElement, h2, p, Register, IoElementProps, Property, ReactiveProperty, div, img, h4, WithBinding, ListenerDefinition } from '../lib/io-gui/index.js';
import { Controller } from './controller.js';

export type SpacetimeSelectProps = IoElementProps & {
  controller: Controller;
};

@Register
export class SpacetimeSelect extends IoElement {
  static get Style() {
    return /* css */`
      :host {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
      }
    `;
  }

  @Property()
  declare controller: Controller;

  @ReactiveProperty({type: Object, value: undefined})
  declare selectedItem: any;

  declare startX: number;
  declare startY: number;

  static get Listeners() {
    return {
      'contextmenu': 'preventDefault',
      'pointerdown': 'onPointerdown',
      'touchstart': ['preventDefault', {passive: false}] as ListenerDefinition,
      'touchmove': ['preventDefault', {passive: false}] as ListenerDefinition,
    };
  }

  constructor(props: SpacetimeSelectProps) {
    super(props);
    this.controller.addEventListener('simulatorStateChange', this.onSimulatorStateChange);
  }

  onSimulatorStateChange(event: CustomEvent) {
    this.selectedItem = event.detail.selectedItem;
  }

  preventDefault(event: Event) {
    event.preventDefault();
  }
  onPointerdown(event: PointerEvent) {
    this.setPointerCapture(event.pointerId);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.addEventListener('pointerup', this.onPointerup);
    this.addEventListener('pointercancel', this.onPointerup);
  }
  onPointerup(event: PointerEvent) {
    this.releasePointerCapture(event.pointerId);
    this.removeEventListener('pointerup', this.onPointerup);
    this.removeEventListener('pointercancel', this.onPointerup);

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let gestureType = 'tap';
    if (distance > Controller.gestureThreshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
          gestureType = deltaX > 0 ? 'east' : 'west';
        } else {
          gestureType = deltaY > 0 ? 'south' : 'north';
      }
    }

    switch (gestureType) {
      case 'tap': this.controller.sendSelectEvent('tap'); break;
      case 'north': this.controller.sendSelectEvent('north'); break;
      case 'south': this.controller.sendSelectEvent('south'); break;
      case 'east': this.controller.sendSelectEvent('east'); break;
      case 'west': this.controller.sendSelectEvent('west'); break;
    }
  }

  ready() {
    this.changed();
  }

  changed() {
    let descriptionText = 'No description available';
    if (this.selectedItem?.description) {
      descriptionText = this.selectedItem.description
        .split(/\n+/) // Split on any number of newlines
        .filter((line: string) => line.trim().length > 0) // Remove empty lines
        .map((line: string) => `<p>${line.trim()}</p>`) // Create paragraph for each line
        .join('');
    }

    this.render([
      h2('TAP or SWIPE to select items'),
      this.selectedItem ? div([
        img({src: `../spacetime/StreamingAssets/Content/collections/scifi/items/${this.selectedItem.id}/cover.jpg`, alt: `Cover for ${this.selectedItem.title}`, class: 'cover-image'}),
        h4(this.selectedItem.title || 'Untitled'),
        div({class: 'description', innerHTML: descriptionText}),
      ]) : p('No item selected'),
    ]);
  }
}

export const spacetimeSelect = function(arg0?: SpacetimeSelectProps) {
  return SpacetimeSelect.vConstructor(arg0);
};