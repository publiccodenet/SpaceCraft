import { Node, Register } from 'io-gui';
import { Collection } from './types/Collection.js';
import { Magnet } from './types/Magnet.js';
import { Item } from './types/Item.js';

@Register
export class SimulatorState extends Node {
    clientId: string = '';
    clientName: string = '';
    clientType: string = '';
    currentCollection: Collection = {};
    currentCollectionId: string = '';
    currentCollectionItems: Array<string> = [];
    currentScreenId: string = '';
    highlightedItem: Item = {};
    highlightedItemId: string = '';
    highlightedItemIds: Array<string> = [];
    magnets: Array<Magnet> = [];
    screenIds: Array<string> = [];
    selectedItem: Item = {};
    selectedItemId: string = '';
    selectedItemIds: Array<string> = [];
    lastUpdated: string = '';
    tags: Array<string> = [];
    updateCounter: number = 0;

    update(state: SimulatorState) {
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

      this.dispatchMutation(this);
    }
}