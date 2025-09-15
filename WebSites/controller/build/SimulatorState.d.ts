import { Node } from 'io-gui';
import { Collection } from './types/Collection.js';
import { Magnet } from './types/Magnet.js';
import { Item } from './types/Item.js';
export declare class SimulatorState extends Node {
    clientId: string;
    clientName: string;
    clientType: string;
    currentCollection: Collection;
    currentCollectionId: string;
    currentCollectionItems: Array<string>;
    currentScreenId: string;
    highlightedItem: Item;
    highlightedItemId: string;
    highlightedItemIds: Array<string>;
    magnets: Array<Magnet>;
    screenIds: Array<string>;
    selectedItem: Item;
    selectedItemId: string;
    selectedItemIds: Array<string>;
    lastUpdated: string;
    tags: Array<string>;
    updateCounter: number;
    viewMode: string;
    update(state: SimulatorState): void;
}
//# sourceMappingURL=SimulatorState.d.ts.map