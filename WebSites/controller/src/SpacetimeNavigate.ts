import { IoElement, h2, Register, ListenerDefinition, IoElementProps, Property } from '../lib/io-gui/index.js';
import { Controller } from './controller.js';

export type SpacetimeNavigateProps = IoElementProps & {
  controller: Controller;
};

@Register
export class SpacetimeNavigate extends IoElement {
  static get Style() {
    return /* css */`
      :host {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      :host > h2 {
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
    `;
  }

  @Property()
  declare controller: Controller;

  static get Listeners() {
    return {
      'contextmenu': 'preventDefault',
      'pointerdown': 'onPointerdown',
      'touchstart': ['preventDefault', {passive: false}] as ListenerDefinition,
      'touchmove': ['preventDefault', {passive: false}] as ListenerDefinition,
    };
  }
  constructor(props: SpacetimeNavigateProps) {
    super(props);
  }

  preventDefault(event: Event) {
    event.preventDefault();
  }
  onPointerdown(event: PointerEvent) {
    this.setPointerCapture(event.pointerId);
    this.addEventListener('pointermove', this.onPointermove);
    this.addEventListener('pointerup', this.onPointerup);
    this.addEventListener('pointercancel', this.onPointerup);
  }
  onPointermove(event: PointerEvent) {
    if (event.movementX || event.movementY) {
      this.controller.sendPanEvent(
        event.movementX * 0.03,
        event.movementY * 0.03
      );
    }
  }
  onPointerup(event: PointerEvent) {
    this.releasePointerCapture(event.pointerId);
    this.removeEventListener('pointermove', this.onPointermove);
    this.removeEventListener('pointerup', this.onPointerup);
    this.removeEventListener('pointercancel', this.onPointerup);
  }
  ready() {
    this.render([
      h2('DRAG to pan • SCROLL to zoom'),
    ]);
  }
}

export const spacetimeNavigate = function(arg0?: SpacetimeNavigateProps) {
  return SpacetimeNavigate.vConstructor(arg0);
};