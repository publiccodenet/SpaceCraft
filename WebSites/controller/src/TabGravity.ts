import { Register, h2, ioNumberSlider } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';

function reverseGravityCurve(gravityValue: number) {
  // Reverse the curve mapping: given a gravity value, find the raw slider position
  if (Math.abs(gravityValue) < 0.01) {
      // Zero gravity always maps to exact center of dead zone
      return 0;
  }

  const sign = gravityValue >= 0 ? 1 : -1;
  const absGravity = Math.abs(gravityValue);

  // Reverse the quadratic curve: if output = sign * (input/100)^2 * 100
  // then input = sign * sqrt(output/100) * 100
  const normalizedAbs = absGravity / 100;
  const rawValue = sign * Math.sqrt(normalizedAbs) * 100;

  // Ensure we're outside the dead zone (±5) if the gravity is non-zero
  if (Math.abs(rawValue) <= 5 && absGravity > 0) {
      // Force outside dead zone while preserving sign
      return sign * 6; // Just outside the dead zone
  }

  return Math.max(-100, Math.min(100, rawValue));
}

function applyGravityCurve(rawValue: number) {
  // Dead zone: snap to 0 if within ±5 of center
  if (Math.abs(rawValue) <= 5) {
      return 0;
  }
  // Apply quadratic curve for more precision near zero
  // Formula: sign(input) * (abs(input)/100)^2 * 100
  const sign = rawValue >= 0 ? 1 : -1;
  const normalizedAbs = Math.abs(rawValue) / 100;
  const curved = normalizedAbs * normalizedAbs * 100;
  return Math.round(sign * curved);
}

@Register
export class TabGravity extends TabBase {
  static get Style() {
    return /* css */`
      :host > io-number-slider {
        align-self: stretch;
      }
      :host > io-number-slider > io-number {
        flex-basis: 4rem;
      }
    `;
  }

  onGravitySet(event: CustomEvent) {
    const curvedValue = applyGravityCurve(event.detail.value);
    this.controller.setSearchGravity(curvedValue);
  }

  changed() {
    const currentGravity = this.simulatorState.currentSearchGravity;
    const sliderValue = reverseGravityCurve(currentGravity);
    this.render([
      h2('Gravity Force'),
      ioNumberSlider({min: -100, max: 100, step: 1, value: sliderValue, '@value-input': this.onGravitySet}),
    ]);
  }
}

export const tabGravity = function(arg0: TabBaseProps) {
  return TabGravity.vConstructor(arg0);
};