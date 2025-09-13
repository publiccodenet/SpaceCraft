var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, Register, ReactiveProperty } from 'io-gui';
let SimulatorState = class SimulatorState extends Node {
    update(state) {
        this.setProperties({
            clientId: state.clientId || '',
            clientName: state.clientName || '',
            clientType: state.clientType || '',
            connectedClients: state.connectedClients || [],
            currentCollection: state.currentCollection || {},
            currentCollectionId: state.currentCollectionId || '',
            currentCollectionItems: state.currentCollectionItems || [],
            currentScreenId: state.currentScreenId || '',
            highlightedItem: state.highlightedItem || null,
            highlightedItemId: state.highlightedItemId || '',
            highlightedItemIds: state.highlightedItemIds || [],
            magnets: state.magnets || [],
            screenIds: state.screenIds || [],
            selectedItem: state.selectedItem || null,
            selectedItemId: state.selectedItemId || '',
            selectedItemIds: state.selectedItemIds || [],
            lastUpdated: state.lastUpdated,
            tags: state.tags || [],
            updateCounter: state.updateCounter,
            viewMode: state.viewMode || 'magnets',
        });
    }
};
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "clientId", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "clientName", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "clientType", void 0);
__decorate([
    ReactiveProperty()
], SimulatorState.prototype, "connectedClients", void 0);
__decorate([
    ReactiveProperty({ type: Object })
], SimulatorState.prototype, "currentCollection", void 0);
__decorate([
    ReactiveProperty()
], SimulatorState.prototype, "currentCollectionId", void 0);
__decorate([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "currentCollectionItems", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "currentScreenId", void 0);
__decorate([
    ReactiveProperty({ type: Object })
], SimulatorState.prototype, "highlightedItem", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "highlightedItemId", void 0);
__decorate([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "highlightedItemIds", void 0);
__decorate([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "magnets", void 0);
__decorate([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "screenIds", void 0);
__decorate([
    ReactiveProperty({ type: Object })
], SimulatorState.prototype, "selectedItem", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "selectedItemId", void 0);
__decorate([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "selectedItemIds", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "lastUpdated", void 0);
__decorate([
    ReactiveProperty({ type: Array })
], SimulatorState.prototype, "tags", void 0);
__decorate([
    ReactiveProperty({ type: Number })
], SimulatorState.prototype, "updateCounter", void 0);
__decorate([
    ReactiveProperty({ type: String })
], SimulatorState.prototype, "viewMode", void 0);
SimulatorState = __decorate([
    Register
], SimulatorState);
export { SimulatorState };
//# sourceMappingURL=SimulatorState.js.map