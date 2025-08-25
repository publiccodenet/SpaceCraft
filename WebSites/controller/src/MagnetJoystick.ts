import { Register, ReactiveProperty, IoSlider2d, IoSlider2dProps } from 'io-gui';

type MagnetJoystickProps = IoSlider2dProps & {
  ctrlTtimeout?: number;
}

@Register
export class MagnetJoystick extends IoSlider2d {

  static get Style() {
    return /* css */`
        :host {
          align-self: flex-start;
        }
    `;
  }

  @ReactiveProperty({type: Number, value: 25})
  declare ctrlTtimeout: number;

  #active = false;

  constructor(args: MagnetJoystickProps = {}) {
    super(args);
    this.controlLoop = this.controlLoop.bind(this);
  }
  controlLoop() {
    if (this.#active) {
      this.dispatch('control');
      setTimeout(this.controlLoop, this.ctrlTtimeout);
    }
  }
  onPointerdown(event: PointerEvent) {
    super.onPointerdown(event);
    this.#active = true;
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
    this.#active = false;
  }
}

export const magnetJoystick = function(arg0: MagnetJoystickProps) {
  return MagnetJoystick.vConstructor(arg0);
};