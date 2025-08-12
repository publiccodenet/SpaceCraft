import { h2, p, Register, ioString, ioButton, div, IoString, ioNumberSlider } from 'io-gui';
import { TabBase, TabBaseProps } from './TabBase.js';
import { magnetItem, Magnet } from './MagnetItem.js';

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
export class TabMagnet extends TabBase {
    static get Style() {
        return /* css */`
          :host {
              display: block;
          }
          :host .input-row {
              display: flex;
              flex-direction: row;
              gap: 10px;
          }
          :host .input-row > io-string {
              flex: 1 1 auto;
          }
          :host .input-row > io-button {
              flex: 0 0 4rem;
          }
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
    onCreateMagnet() {
        const input = this.$['magnet-name-input'] as IoString;
        const name = (input).value.trim();
        if (name) {
            input.value = '';

            const currentMagnets = this.simulatorState.magnets || [];
            const existingMagnet = currentMagnets.find(magnet => {
                return magnet.title.trim().toLowerCase() === name.toLowerCase();
            });
            if (existingMagnet) {
                console.warn(`[Magnet] Duplicate magnet: "${existingMagnet.title}"`);
                // this.highlightExistingMagnet(existingMagnet.title);
                return;
            }
            const magnetData: Magnet = {
                dynamicFriction: number;
                enabled: boolean;
                magnetEnabled: boolean;
                magnetHoleRadius: number;
                magnetId: string;
                magnetRadius: number;
                magnetSoftness: number;
                magnetStrength: number;
                mass: number;
                scoreMax: number;
                scoreMin: number;
                searchExpression: string;
                searchType: string;
                staticFriction: number;
                title: string;
                viewScale: number;
                viewScaleInitial: number;
            };
            this.controller.sendCreateMagnetEvent(magnetData);
        }
    }
    onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.onCreateMagnet();
        }
    }
    changed() {
        const currentGravity = this.simulatorState.currentSearchGravity;
        const sliderValue = reverseGravityCurve(currentGravity);
        const magnets = this.simulatorState.magnets || [];

        this.render([
            h2('Gravity Force'),
            ioNumberSlider({min: -100, max: 100, step: 1, value: sliderValue, '@value-input': this.onGravitySet}),
            h2('Search Magnets'),
            p('Create magnets to attract related items'),
            div({class: 'input-row'}, [
                ioString({id: 'magnet-name-input', placeholder: 'Magnet Search String', live: true, '@keyup': this.onKeyUp}),
                ioButton({label: 'Add', action: this.onCreateMagnet})
            ]),
            ...magnets.map(magnet => magnetItem({magnet: magnet, controller: this.controller}))
        ]);
    }
}

export const tabMagnet = function(arg0: TabBaseProps) {
    return TabMagnet.vConstructor(arg0);
};