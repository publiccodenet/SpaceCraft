# SpaceCraft Overview

## Executive summary

SpaceCraft is a Unity application that renders collections of items and exposes a bidirectional “Bridge” to a web-based controller UI. The controller orchestrates selection, highlighting, navigation, and parameter editing (including “magnets”) and synchronizes presence and state via Supabase Realtime. The Unity side centers on `SpaceCraft` + content loader (`Brewster`) + views/layout, while the Bridge layer shuttles JSON events and queries through a browser-hosted WebGL bridge. The web side is implemented with TypeScript using io-gui.

## Architecture at a glance

- Unity runtime
  - Core: `SpaceCraft` (facade/orchestrator), `Brewster` (content ingest), `CollectionsView`/`CollectionView`/`ItemView` (UI), `InputManager` (camera/selection inputs), layouts/renderers.
  - Data model: `Collection`, `Item`, schema types and converters.
  - Bridge: `Bridge`, `BridgeObject`, `BridgeTransport*`, `BridgePlugin`, `BridgeJsonConverter`, `BridgeExtensions`.
- Web controller
  - App: `index.html` + `lib/io-gui` + `supabase.min.js`.
  - State: `SimulatorState`.
  - Control: `SpacetimeController` (presence, events), tab UIs (`Tab*`), `MagnetItem` editor.
  - Content/bootstrap: `spacecraft.js` (Unity boot, QR, content fetch, presence sync).
- Realtime sync
  - Supabase Realtime presence channels for discovering/controlling simulators.

## Bridge: message bus between Unity and web

- `Assets/Libraries/Bridge/Bridge.cs`: Central bridge; starts the WebGL transport; drains/dispatches events; handles create/query/log/start.
- `Assets/Libraries/Bridge/BridgeObject.cs`: Base for bridged objects; handles `Update/Query/Destroy/AddComponent/SetParent/Animate`; manages `interests`; emits events.
- `Assets/Libraries/Bridge/BridgeTransportWebGL.cs`: WebGL transport; registers native callbacks with `Bridge.jslib`, signals started, and delegates distribution/evaluation to the JS bridge.
- `Assets/Plugins/WebGL/Bridge.jslib`: Emscripten-side library maintaining Unity→JS and JS→Unity event queues and marshalling strings/buffers; invokes `bridge.distributeEvents` and `bridge.evaluateJS` in the browser.
- Support: `BridgeJsonConverter.cs` (serialization), `BridgeExtensions.cs` (material/config helpers).

## Unity runtime: orchestrator, content, views, input

- `Assets/Scripts/Core/SpaceCraft.cs`
  - Central facade tying `InputManager`, `Brewster`, and `CollectionsView` together; also a `BridgeObject` to receive/send events.
  - Content ingest: on `FixedUpdate`, if `content` (JObject) set by JS, clears current views, calls `brewster.LoadContentFromJson`, then `collectionsView.DisplayAllCollections()`, auto-selects the first item, sends `ContentLoaded` bridge event, and resets panel state.
  - Selection/highlight model:
    - `SelectedItemIds` (unique set, single or multi-select) and `HighlightedItemIds` (ordered, duplicates allowed) with change-detection and visual sync.
    - Public API invoked by controller and local input: `SelectItem`, `DeselectItem`, `ToggleItemSelection`, `SetSelectedItems`, `Add/RemoveSelectedItems` and `Set/Add/RemoveHighlightedItems`, `ToggleItemHighlight`, `ToggleHighlightedItemSelection`.
    - Emits `SelectedItemsChanged` and `HighlightedItemsChanged` only when lists actually change.
  - Navigation/camera forwarding: `MoveSelection`, `MoveHighlight` delegate to `CollectionsView`; camera panning/zoom to `InputManager`.
  - Parameter reflection: `UnityMetaData` collects `[ExposedParameter]`-annotated public fields/properties across `InputManager`, `SpaceCraft`, and `MagnetView` to drive dynamic editor UIs on the web side.

- `Assets/Scripts/Core/InputManager.cs`
  - Manages camera inputs and selection interactions; exposes tunables (e.g., `SelectionTapScale`) used by `SpaceCraft` to apply impulses; enumerates all `ItemView`s for visual updates.

- Camera
  - `CameraController.cs`: pan/rotate/zoom logic for a rigged camera; `FocusOnCollection(Collection)` coroutine animates to a canonical vantage point.
  - `CameraBackgroundColor.cs`: utility to drive camera background from theme or state (not shown above, see file).

- Content loader and models
  - `Brewster.cs`: owns data ingest and raises `OnAllContentLoaded`. Offers lookups like `GetAllCollections()` and `GetCollection(id)` consumed by views.
  - Models: `Views/Schemas/{Collection.cs, Item.cs}` and generated schema twins `Schemas/Generated/{CollectionSchema.cs, ItemSchema.cs}` with converters (`SchemaConverters.cs`, `UnitySchemaConverter.cs`, `SchemaGeneratedObject.cs`).

- Views, layout, renderers
  - `CollectionsView.cs`: manages many `CollectionView`s, positions them, and maintains the item detail panel. Provides directional navigation (`MoveSelection`, `MoveHighlight`) that defers “next item” computation to the collection’s layout manager.
  - `CollectionView.cs`: binds a `Collection` model, instantiates `ItemViewsContainer` per item, and applies a `CollectionLayoutBase` (e.g., `CollectionLayoutGrid.cs`) to position child `ItemView`s.
  - Item views: `ItemViewsContainer`, `ItemView`, `ItemLabel`, `ItemInfoPanel` display; `MagnetView`, `MagnetLabel` represent magnet overlays/controls.
  - Rendering: `Renderers/{BaseViewRenderer.cs, SingleImageRenderer.cs}` for textured quads, etc.

## Web controller (io-gui) and presence

- Entry/doc assets
  - `WebSites/controller/index.html`: loads io-gui bundles, controller app, and Supabase client.
  - `lib/io-gui/.../index.{js,d.ts}`: compiled io-gui library and type definitions used by TS components.
  - `lib/supabase.min.js`: Supabase JS client for Realtime.

- App state and controller
  - `src/SimulatorState.ts`: plain reactive state node (io-gui `Node`) mirroring simulator fields (client identity, connected clients, current collection/screens, tags, highlighted/selected items, magnets, counters).
  - `src/SpacetimeController.ts`: primary controller custom element; creates Supabase client (`supabaseUrl`/`supabaseAnonKey`), discovers “simulator” (Unity) via presence, and sends user intents as events: pan/zoom/select, magnet CRUD/push; subscribes to presence and channel broadcasts, reconciles `SimulatorState`.
  - Tabs: `TabBase.ts` (pointer handlers, common props), `TabNavigate.ts` (panning), `TabSelect.ts` (selection box or tap), `TabInspect.ts` (inspector), `TabAdjust.ts` (tuning), `TabMagnet.ts` (magnet creation defaults from metadata, keyboard handlers).
  - Magnet editing: `MagnetItem.ts` uses io-gui’s `IoInspector` and metadata to edit a `Magnet` record and push updates to simulator.

- Unity bootstrap and content
  - `Assets/StreamingAssets/SpaceCraft/spacecraft.js`: boots the Unity WebGL build, renders QR codes for controller pairing, fetches content JSON (e.g., `StreamingAssets/Content/index-deep.json`), maintains client identity and a Supabase presence/channel (`clientChannelName`), and forwards bridge events to/from Unity instance. It includes hard-coded Supabase config (rotate in production).

## Data and event flow

- Presence and pairing
  - Controller joins `spacecraft` (default) presence channel; simulator (Unity) publishes presence with shared state and start time. Controller finds latest simulator by `startTime` and syncs.

- Bridge events
  - Controller sends high-level intents: `Pan`, `Zoom`, `Select`, `CreateMagnet`/`UpdateMagnet`/`DeleteMagnet`/`PushMagnet`, etc., via the channel or direct bridge events when embedded (WebGL/WebView).
  - Unity emits lifecycle and state events: `StartedUnity`, `Created`/`Destroyed` for bridged objects, `ContentLoaded`, `SelectedItemsChanged`, `HighlightedItemsChanged`. Unity also services `Query` for on-demand property snapshots.

- Updates
  - Structural: `Create` with `{prefab, component, parent, interests, update, preEvents, postEvents}` builds scene nodes and wires event interests.
  - Property: `Update` applies JSON to properties (through `Accessor.SetProperty`/`BridgeJsonConverter`).
  - Query/callback: `Query` returns requested properties; `SendCallbackData(callbackID, data)` routes to JS promise resolution.

## Key public APIs (Unity)

- `SpaceCraft` selection/highlight
  - `SelectItem(clientId, clientName, itemId)` / `DeselectItem(...)`
  - `ToggleItemSelection(clientId, clientName, screenId, itemId)`
  - `SetSelectedItems(clientId, clientName, List<string>)`, `AddSelectedItems(...)`, `RemoveSelectedItems(...)`
  - `SetHighlightedItems(clientId, clientName, List<string>)`, `AddHighlightedItems(...)`, `RemoveHighlightedItems(...)`, `ToggleItemHighlight(...)`
  - `MoveSelection(controllerId, controllerName, screenId?, direction, dx?, dy?)`
  - `MoveHighlight(controllerId, controllerName, screenId?, direction)`
  - `SetMultiSelectMode(bool)`

- Camera forwarding (to `InputManager`)
  - `PushCameraPosition(controllerId, controllerName, screenId, panXDelta, panYDelta)`
  - `PushCameraZoom(controllerId, controllerName, screenId, zoomDelta)`
  - `PushCameraVelocity(controllerId, controllerName, panXDelta, panYDelta)`

- Bridge object lifecycle (implicit via `BridgeObject`)
  - Events handled: `Update`, `Query`, `Destroy`/`DestroyAfter`, `AddComponent`, `SetParent`, `Animate`
  - Emitted: `Created`, `Destroyed`, and object-specific events based on `interests`

## Notable files and roles

- Bridge core (WebGL path): `Bridge.cs`, `BridgeObject.cs`, `BridgeTransportWebGL.cs`, `BridgeJsonConverter.cs`, `BridgeExtensions.cs`, `Plugins/WebGL/Bridge.jslib`.
- Unity core: `SpaceCraft.cs`, `InputManager.cs`, `CameraController.cs`, `CameraBackgroundColor.cs`.
- Views/layout/renderers: `CollectionsView.cs`, `CollectionView.cs`, `CollectionLayoutBase.cs`, `CollectionLayoutGrid.cs`, `ItemViewsContainer.cs`, `ItemView.cs`, `ItemLabel.cs`, `ItemInfoPanel.cs`, `MagnetView.cs`, `MagnetLabel.cs`, `Renderers/*`.
- Models/schemas: `Views/Schemas/{Collection.cs, Item.cs}`, `Views/Schemas/Generated/{CollectionSchema.cs, ItemSchema.cs}`, `SchemaConverters.cs`, `UnitySchemaConverter.cs`, `SchemaGeneratedObject.cs`.
- Web controller: `WebSites/controller/src/{SpacetimeController.ts, SimulatorState.ts, MagnetItem.ts, Tab*.ts}`, `lib/{io-gui, supabase.min.js}`, `index.html`.
- Bootstrap: `Assets/StreamingAssets/SpaceCraft/spacecraft.js` (Unity-side web app and content orchestrator).

## Operational notes (WebGL)

- Lifecycle: JS calls `bridge.start("WebGL", ...)` after Unity instance creation; `BridgeTransportWebGL` registers callbacks with `Bridge.jslib` and signals Unity started; content ingest and bridge object creation follow.
- Content: Keep `Assets/StreamingAssets/SpaceCraft/Content/` present; `spacecraft.js` fetches `index-deep.json` and passes it to `SpaceCraft` via bridge.
- Channeling: Override the Supabase channel with `?channel=...` as needed; QR can inject `base_url` for cross-host pairing.
- io-gui: Use declarative editors and vDOM factories; prefer one-way data flow from presence into `SimulatorState`, sending explicit broadcasts for actions.
- Security: Rotate Supabase credentials and inject at build/deploy time; avoid hardcoding in production artifacts.

## Message taxonomy

### Controller ↔ Simulator (Supabase Realtime)

- Channel
  - Default: `spacecraft` (override with `?channel=...`).
  - Presence identity (tracked by both sides): `{ clientId, clientType, clientName, startTime }`.
  - Presence shared state (from simulator): mirrors `SimulatorState`, including `{ currentCollectionId, currentCollection, currentCollectionItems, screenIds, currentScreenId, selectedItemIds, selectedItemId, selectedItem, highlightedItemIds, highlightedItemId, highlightedItem, magnets, tags, updateCounter, lastUpdated }`.

- Broadcast events (Controller → Simulator)
  - pan
    - Payload: `{ clientId, clientType: 'controller', clientName, screenId, targetSimulatorId, panXDelta: number, panYDelta: number }`.
  - zoom
    - Payload: `{ clientId, clientType: 'controller', clientName, screenId, targetSimulatorId, zoomDelta: number }`.
  - select
    - Payload: `{ clientId, clientType: 'controller', clientName, screenId, targetSimulatorId, action: 'tap' | 'north' | 'south' | 'east' | 'west' | 'up' | 'down', dx?: number, dy?: number }`.
  - createMagnet
    - Payload: `{ clientId, clientType: 'controller', clientName, targetSimulatorId, magnetData: Magnet }`.
  - updateMagnet
    - Payload: `{ clientId, clientType: 'controller', clientName, targetSimulatorId, magnetData: Magnet }`.
  - deleteMagnet
    - Payload: `{ clientId, clientType: 'controller', clientName, targetSimulatorId, magnetId: string }`.
  - pushMagnet
    - Payload: `{ clientId, clientType: 'controller', clientName, targetSimulatorId, magnetId: string, deltaX: number, deltaY: number }`.

- Broadcast events (Simulator ↔ Simulator / Simulator → all)
  - simulatorTakeover
    - From simulator to simulators/controllers.
    - Payload: `{ newSimulatorId: string, newSimulatorName: string, startTime: number }`.

- Presence events
  - sync: full presence map, used by controller to select the latest simulator by highest `startTime`.
  - join: new clients and simulators appear; simulator may assert takeover on join.
  - leave: clients removed from registry.

- Optional outbound simulator notifications (as implemented or reserved)
  - contentUpdate (to a newly joined client): `{ content }`.
  - selectedItemIdUpdated: `{ selectedItemId: string }`.

Note: All controller-originated messages must include `targetSimulatorId` (the currently selected simulator) to avoid affecting other simulators on the same channel.

### Simulator (browser JS) ↔ Unity (Bridge, WebGL)

- Bridge lifecycle
  - JS → Unity: `bridge.start('WebGL', config)` after Unity instance is created.
  - Unity → JS: `StartedUnity` (transport signals Unity is ready; triggers content load and object creation on JS side).

- Object graph operations (JS → Unity)
  - createObject
    - Parameters: `{ prefab?: string, obj?: object (wrapper with helper methods/state), parent?: object|id, update?: object (initial property set), interests?: Record<string, Interest> }`.
    - Purpose: instantiate a prefab or empty GameObject, attach a `BridgeObject`-derived component, set initial state, and subscribe to Unity events.
  - updateObject
    - Parameters: `(targetObject, updateObject)` where `updateObject` is a JSON object mapping property names and method invocations (e.g., `"method:MovePosition": [x, y]`).
  - destroyObject
    - Parameters: `(targetObject)` to destroy the bridged GameObject.

- Method calls (JS → Unity via `updateObject`)
  - Camera: `method:PushCameraPosition(clientId, clientName, screenId, panXDelta, panYDelta)`, `method:PushCameraZoom(clientId, clientName, screenId, zoomDelta)`.
  - Selection/navigation: `method:MoveSelection(clientId, clientName, screenId, direction, dx, dy)`, `method:ApplyTapScaleToHighlightedItem(clientId, clientName, screenId)`.
  - Magnets (on root wrapper or child magnet objects): `method:MoveToPanCenter()`, `method:MovePosition(x, y)`, `method:PushPosition(deltaX, deltaY)`.

- Unity events and queries (Unity → JS)
  - Event interests are registered when creating objects. For `SpaceCraft`, typical interests are:
    - ContentLoaded
      - Query fields: `{ unityMetaData: 'UnityMetaData' }`.
    - SelectedItemsChanged
      - Query fields: `{ selectedItemIds: 'SelectedItemIds' }`.
    - HighlightedItemsChanged
      - Query fields: `{ highlightedItemIds: 'HighlightedItemIds' }`.
  - Query/Callback pattern
    - Unity sends event → JS receives and (optionally) issues a structured `Query` back to Unity (automated via interests), Unity replies with a JSON payload containing requested fields.
y 
- Shared buffers (WebGL)
  - `Bridge.jslib` exposes texture/data allocation/lock/unlock functions; `BridgeTransportWebGL` maps these to Unity textures/byte arrays when used. Not required for the controller workflow but available for streaming.

Magnet type (controller → simulator payloads): `{ magnetId: string, title: string, enabled: boolean, mass: number, staticFriction: number, dynamicFriction: number, magnetEnabled: boolean, magnetStrength: number, magnetRadius: number, magnetSoftness: number, magnetHoleRadius: number, magnetHoleStrength: number, scoreMin: number, scoreMax: number, viewScale: number, viewScaleInitial: number, searchExpression: string, searchType: string, ... }` (plus any additional Unity-exposed fields discovered via `unityMetaData.MagnetView`).
