var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Register, IoSlider2d } from 'io-gui';
let MagnetJoystick = class MagnetJoystick extends IoSlider2d {
    static get Style() {
        return /* css */ `
        :host {
          align-self: flex-start;
        }
    `;
    }
    _isLooping = false;
    constructor(args = {}) {
        super(args);
        this.controlLoop = this.controlLoop.bind(this);
    }
    controlLoop() {
        if (this._isLooping) {
            this.dispatch('control');
            requestAnimationFrame(this.controlLoop);
        }
    }
    onPointerdown(event) {
        super.onPointerdown(event);
        this._isLooping = true;
        this.controlLoop();
    }
    onPointermove(event) {
        super.onPointermove(event);
    }
    onPointerup(event) {
        super.onPointerup(event);
        this.value[0] = 0;
        this.value[1] = 0;
        this.dispatchMutation(this.value);
        this._isLooping = false;
    }
};
MagnetJoystick = __decorate([
    Register
], MagnetJoystick);
export { MagnetJoystick };
export const magnetJoystick = function (arg0) {
    return MagnetJoystick.vConstructor(arg0);
};
//# sourceMappingURL=MagnetJoystick.js.map