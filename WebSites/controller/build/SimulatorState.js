var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, Register } from 'io-gui';
let SimulatorState = class SimulatorState extends Node {
    clientId = '';
    clientName = '';
    clientType = '';
    currentCollection = {};
    currentCollectionId = '';
    currentCollectionItems = [];
    currentScreenId = '';
    highlightedItem = {};
    highlightedItemId = '';
    highlightedItemIds = [];
    magnets = [];
    screenIds = [];
    selectedItem = {};
    selectedItemId = '';
    selectedItemIds = [];
    lastUpdated = '';
    tags = [];
    updateCounter = 0;
    viewMode = '';
    update(state) {
        this.clientId = state.clientId || '',
            this.clientName = state.clientName || '',
            this.clientType = state.clientType || '',
            this.currentCollection = state.currentCollection || {},
            this.currentCollectionId = state.currentCollectionId || '',
            this.currentCollectionItems = state.currentCollectionItems || [],
            this.currentScreenId = state.currentScreenId || '',
            this.highlightedItem = state.highlightedItem || null,
            this.highlightedItemId = state.highlightedItemId || '',
            this.highlightedItemIds = state.highlightedItemIds || [],
            this.magnets = state.magnets || [],
            this.screenIds = state.screenIds || [],
            this.selectedItem = state.selectedItem || null,
            this.selectedItemId = state.selectedItemId || '',
            this.selectedItemIds = state.selectedItemIds || [],
            this.lastUpdated = state.lastUpdated,
            this.tags = state.tags || [],
            this.updateCounter = state.updateCounter,
            this.viewMode = state.viewMode || 'magnets',
            this.dispatchMutation(this);
    }
};
SimulatorState = __decorate([
    Register
], SimulatorState);
export { SimulatorState };
//# sourceMappingURL=SimulatorState.js.map