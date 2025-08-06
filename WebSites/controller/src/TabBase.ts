import { IoElement, h2, Register, IoElementProps, Property, ReactiveProperty, ListenerDefinition } from 'io-gui';
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
        align-items: center;
        justify-content: flex-start;
        margin: 2em;
      }
    `;
  }

  @Property()
  declare controller: SpacetimeController;

  @ReactiveProperty({type: SimulatorState})
  declare simulatorState: SimulatorState;

  static get Listeners() {
    return {
      'contextmenu': 'preventDefault',
      'pointerdown': 'onPointerdown',
      'touchstart': ['preventDefault', {passive: false}] as ListenerDefinition,
      'touchmove': ['preventDefault', {passive: false}] as ListenerDefinition,
    };
  }

  constructor(props: TabBaseProps) {
    super(props);
  }

  preventDefault(event: Event) {
    event.preventDefault();
  }
  onPointerdown(event: PointerEvent) {
    this.setPointerCapture(event.pointerId);
    this.addEventListener('pointerup', this.onPointerup);
    this.addEventListener('pointermove', this.onPointermove);
    this.addEventListener('pointercancel', this.onPointerup);
  }
  onPointermove(event: PointerEvent) {}
  onPointerup(event: PointerEvent) {
    this.releasePointerCapture(event.pointerId);
    this.removeEventListener('pointerup', this.onPointerup);
    this.removeEventListener('pointermove', this.onPointermove);
    this.removeEventListener('pointercancel', this.onPointerup);
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