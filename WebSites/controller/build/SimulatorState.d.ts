import { Node, NodeProps } from 'io-gui';
export type Collection = {
    description: string;
    id: string;
};
export type SimulatorStateProps = NodeProps & {};
export declare class SimulatorState extends Node {
    clientId: string;
    clientName: string;
    clientType: string;
    connectedClients: Array<any>;
    currentCollection: Collection;
    currentCollectionId: string;
    currentCollectionItems: Array<string>;
    currentScreenId: string;
    currentSearchGravity: number;
    currentSearchString: string;
    highlightedItem: any;
    highlightedItemId: string;
    highlightedItemIds: Array<string>;
    magnets: Array<any>;
    screenIds: Array<string>;
    selectedItem: any;
    selectedItemId: string;
    selectedItemIds: Array<string>;
    lastUpdated: string;
    tags: Array<string>;
    updateCounter: number;
    update(state: SimulatorState): void;
}
//# sourceMappingURL=SimulatorState.d.ts.map