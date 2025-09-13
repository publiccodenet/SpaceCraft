import { Node, Register, ReactiveProperty, NodeProps } from 'io-gui';
import type { ViewMode } from './types/ViewMode.js';

export type Collection = {
  description: string;
  id: string;
}

export type SimulatorStateProps = NodeProps & {
};

@Register
export class SimulatorState extends Node {

    @ReactiveProperty({type: String})
    declare clientId: string;

    @ReactiveProperty({type: String})
    declare clientName: string;

    @ReactiveProperty({type: String})
    declare clientType: string;

    @ReactiveProperty()
    declare connectedClients: Array<any>; // TODO: define type

    @ReactiveProperty({type: Object})
    declare currentCollection: Collection;

    @ReactiveProperty()
    declare currentCollectionId: string;

    @ReactiveProperty({type: Array})
    declare currentCollectionItems: Array<string>;

    @ReactiveProperty({type: String})
    declare currentScreenId: string;

    @ReactiveProperty({type: Object})
    declare highlightedItem: any; // TODO: define type? // {collection: Array(2), coverHeight: 283, coverImage: 'https://archive.org/services/img/5thwave0000yanc', coverWidth: 180, creator: 'Yancey, Richard', …}

    @ReactiveProperty({type: String})
    declare highlightedItemId: string;

    @ReactiveProperty({type: Array})
    declare highlightedItemIds: Array<string>;

    @ReactiveProperty({type: Array})
    declare magnets: Array<any>; // TODO: define type

    @ReactiveProperty({type: Array})
    declare screenIds: Array<string>;

    @ReactiveProperty({type: Object})
    declare selectedItem: any; // TODO: define type? // {collection: Array(2), coverHeight: 283, coverImage: 'https://archive.org/services/img/5thwave0000yanc', coverWidth: 180, creator: 'Yancey, Richard', …}

    @ReactiveProperty({type: String})
    declare selectedItemId: string; // {collection: Array(2), coverHeight: 283, coverImage: 'https://archive.org/services/img/5thwave0000yanc', coverWidth: 180, creator: 'Yancey, Richard', …}

    @ReactiveProperty({type: Array})
    declare selectedItemIds: Array<string>;

    @ReactiveProperty({type: String})
    declare lastUpdated: string;

    @ReactiveProperty({type: Array})
    declare tags: Array<string>;

    @ReactiveProperty({type: Number})
    declare updateCounter: number;

    @ReactiveProperty({type: String})
    declare viewMode: ViewMode;

    update(state: SimulatorState) {
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
            viewMode: (state as any).viewMode || 'magnets',
        });
    }

}