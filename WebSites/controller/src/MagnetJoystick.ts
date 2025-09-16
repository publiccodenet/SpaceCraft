import { Register, ReactiveProperty, IoSlider2d, IoSlider2dProps } from 'io-gui';

@Register
export class MagnetJoystick extends IoSlider2d {

  static get Style() {
    return /* css */`
        :host {
          align-self: flex-start;
        }
    `;
  }
  private _isLooping = false;

  constructor(args: IoSlider2dProps = {}) {
    super(args);
    this.controlLoop = this.controlLoop.bind(this);
  }
  controlLoop() {
    if (this._isLooping) {
      this.dispatch('control');
      requestAnimationFrame(this.controlLoop);
    }
  }
  onPointerdown(event: PointerEvent) {
    super.onPointerdown(event);
    this._isLooping = true;
    this.controlLoop();
  }
  onPointermove(event: PointerEvent) {
    super.onPointermove(event);
  }
  onPointerup(event: PointerEvent) {
    super.onPointerup(event);
    this.value[0] = 0;
    this.value[1] = 0;
    this.dispatchMutation(this.value);
    this._isLooping = false;
  }
}

export const magnetJoystick = function(arg0: IoSlider2dProps) {
  return MagnetJoystick.vConstructor(arg0);
};