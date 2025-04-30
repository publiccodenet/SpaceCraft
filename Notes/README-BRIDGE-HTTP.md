# Notes/README-BRIDGE-HTTP.md

# Bridge HTTP Interface: Design & Roadmap

## 1. Overview

This document outlines the design for a comprehensive HTTP interface to the existing Unity "Bridge" system. The goal is to expose the Bridge's powerful capabilities – including object management, path expression evaluation, and event handling – via standard HTTP protocols, making it accessible to a wider range of clients beyond the dedicated JavaScript environment (e.g., `curl`, Python scripts, CI/CD pipelines, external services).

This design leverages the existing `UniWebServer` library (specifically `UniWebServer.WebServer` located in `Assets/Libraries/UniWebServer/`) and the core Bridge architecture (`Bridge.cs`, `Accessor.cs`, `BridgeJsonConverter.cs`, `BridgeObject.cs`, etc.), extending them with well-defined HTTP endpoints. It supports both stable ID-based object addressing and intuitive scene hierarchy path-based addressing, incorporating efficient batching and asynchronous handling.

## 2. Core Concepts

*   **Unified Server:** A single HTTP server framework based on `UniWebServer.WebServer` handles requests. Separate instances will run for Editor (Build Server, using a copied core library in `Assets/Editor/`) and Runtime (Bridge Server, using the library in `Assets/Libraries/`) on different ports to ensure isolation.
*   **Dual Addressing:** Objects can be targeted via their unique Bridge `id` (managed by `BridgeObject` and `Bridge.cs`) OR by traversing a symbolic path based on the Unity `Transform` hierarchy (e.g., `/scene/Player/Head`).
*   **Accessor Engine:** The existing Bridge `Accessor` system (`Assets/Scripts/Bridge/Accessor.cs`) is the *single source of truth* for property/component/method access via path expressions, regardless of how the target object was identified (ID or hierarchy path).
*   **JSON Transport:** `Newtonsoft.Json` (with existing Bridge type converters like `BridgeJsonConverter.cs` and others) is used for request/response bodies. Payloads will be minimized (`Formatting.None`).
*   **Batching:** Dedicated endpoints handle sending and receiving arrays of events efficiently, mirroring the existing `pump_events` pattern.
*   **Asynchronous Handlers:** Request handlers are designed using `async`/`await` to prevent blocking the server during potentially long-running operations (Unity logic, I/O, external requests).
*   **Modular Routing:** A central registry (`WebServerRegistry`) dispatches requests to specialized handlers implementing `IHttpRequestHandler` (e.g., `EditorBuildHandler`, `RuntimeBridgeHandler`).

## 3. Architecture

*   **WebServer (`UniWebServer.WebServer`):** Provides low-level TCP listening (via `System.Net.TcpListener`) and basic HTTP request parsing. Leverages `ThreadedTaskQueue` for asynchronous I/O and worker threads. Separate instances run for Editor and Runtime.
*   **WebServerRegistry:** A static registry mapping request characteristics (path prefixes, etc.) to handlers. Handles `async` dispatching via `DispatchRequestAsync`.
*   **IHttpRequestHandler:** Interface defining the `async Task<bool> HandleRequestAsync(...)` method for handlers.
*   **Handlers:**
    *   `EditorBuildHandler` (Editor Assembly, e.g., `Assets/Editor/BuildServer/`): Handles `/build`, `/schema/generate`, etc. Uses `UnityEditor` APIs. Lives alongside a *copy* of essential `UniWebServer` files (`Assets/Editor/UniWebServer_EditorCopy/`) for compilation independence.
    *   `RuntimeBridgeHandler` (Runtime Assembly, e.g., `Assets/Scripts/Bridge/`): Handles global Bridge operations (`/bridge/...`), hierarchy path routing (`/scene/...`), interacts with the main `Bridge` instance (`Bridge.Instance`) and `Accessor` engine. Adapts logic from the existing `BridgeWebServer.cs`.
*   **Bridge Integration:** Handlers call methods on `Bridge.Instance` (`FindObject`, `DistributeUnityEvent`, `CreateObject`, etc.) and the static `Accessor` engine (`GetProperty`, `SetProperty`).
*   **JSON Converters:** Existing `BridgeJsonConverter` and related converters ensure seamless Unity type handling.

## 4. API Design

### 4.1. Global Bridge API (ID-Based)

These endpoints interact directly with the Bridge using object IDs. Handled by `RuntimeBridgeHandler`.

*   **Create Object:**
    *   `POST /bridge/objects`
    *   `curl -X POST http://localhost:7777/bridge/objects -H "Content-Type: application/json" -d '{ "prefab": "Prefabs/Cube", "id": "myCube1", "update": { "transform/position": {"x": 5} } }'`
    *   **(Response: 201 Created)** `{"success": true, "id": "myCube1" /* Maybe echo back config */}`

*   **Update Object:**
    *   `PATCH /bridge/objects/{id}`
    *   `curl -X PATCH http://localhost:7777/bridge/objects/myCube1 -H "Content-Type: application/json" -d '{ "transform/localScale": {"x": 2, "y": 2, "z": 2}, "component:Renderer/material/color": "#FF0000" }'`
    *   **(Response: 200 OK)** `{"success": true}`

*   **Query Object:**
    *   `POST /bridge/objects/{id}/query`
    *   `curl -X POST http://localhost:7777/bridge/objects/myCube1/query -H "Content-Type: application/json" -d '{ "pos": "transform/position", "matColor": "component:Renderer/material/color" }'`
    *   **(Response: 200 OK)** `{"pos": {"x": 5.0, ...}, "matColor": {"r": 1.0, ...} }`

*   **Destroy Object:**
    *   `DELETE /bridge/objects/{id}`
    *   `curl -X DELETE http://localhost:7777/bridge/objects/myCube1`
    *   **(Response: 204 No Content)**

*   **Update Interests:** (See Section 4.4 for future enhancements)
    *   `PUT /bridge/objects/{id}/interests`
    *   `curl -X PUT http://localhost:7777/bridge/objects/myCube1/interests -H "Content-Type: application/json" -d '{ "Collision": { "query": {"pt": "collision/contacts/0/point"} } }'`
    *   **(Response: 200 OK)** `{"success": true}`

### 4.2. Hierarchy API (Path-Based)

These endpoints allow addressing objects via their scene hierarchy path, seamlessly integrating Bridge path expressions. Handled by `RuntimeBridgeHandler`.

*Design:* This approach treats the *entire* path after the initial context prefix (e.g., `/scene/`) as a single, continuous Bridge path expression. The server iteratively processes the path according to these rules:

1.  **Root Context:** Starts from a known root object (e.g., the Scene root for `/scene/`, or the specific object for `/bridge/objects/{id}/...`). The initial context is typically a `GameObject` or `Transform`.
2.  **Default Search (GameObject/Transform Context):** If the current context is a `GameObject` or `Transform`, and the next path segment *does not* have a prefix, the default action is to search for a **child `Transform`** with that exact name (e.g., using `transform.Find()`). If found, the context switches to that child `Transform`. If not found, the path resolution fails for that segment (no implicit fallback).
3.  **Default Search (Component Context):** If the current context is a specific `Component` (e.g., reached via `component:Collider`), and the next path segment *does not* have a prefix, the default action is to search for a **public member (property, field, method)** with that name *within that component type*. If found, the context may change depending on the member accessed (e.g., accessing the `transform` property switches the context to the `Transform`). If no such member exists, the path resolution fails.
4.  **Prefix Handling:** If a path segment *begins* with a known Bridge prefix (`transform:`, `component:<TypeName>`, `property:`, `field:`, `method:` etc.), the prefix dictates the interpretation. The default search is bypassed. The prefix is processed against the *current* context object. For example, `transform:` accesses the `Transform` component of the current GameObject context. `component:Light` accesses the `Light` component. `property:intensity` accesses the `intensity` property of the current Component context. After processing the prefix, the context changes accordingly (e.g., to the `Light` component).
5.  **Iteration:** This process repeats for each segment until the path is fully resolved or fails. The final resolved object and any remaining path expression (if a prefix was encountered mid-path) are then passed to the `Accessor` engine along with the data from the HTTP request body (if applicable) for the final Get, Set, or Method Call operation.

This explicit, context-aware approach allows for intuitive path expressions that mirror Unity's object structure while remaining robust and predictable. It avoids the ambiguity of implicit fallbacks.

*   **Query Property via Path:**
    *   `GET /scene/{unity-path}/component:{TypeName}/{member-path...}`
    *   Example: `curl "http://localhost:7777/scene/Environment/Lights/Directional/component:Light/intensity"`
        *   `/scene/Environment/Lights/Directional`: Navigates `Transform` hierarchy (Rule 2). Context is `Directional` GameObject.
        *   `component:Light`: Prefix switches context to the `Light` component (Rule 4).
        *   `intensity`: Member lookup within `Light` context (Rule 3). -> Calls `Accessor.GetProperty(lightComponent, "intensity")`.
    *   Example: `curl "http://localhost:7777/scene/Player/Head/transform:position/x"`
        *   `/scene/Player/Head`: Navigates `Transform` hierarchy (Rule 2). Context is `Head` GameObject.
        *   `transform:position`: Prefix `transform:` switches context to `Transform` component, `position` is member lookup (Rule 4 & 3). -> Calls `Accessor.GetProperty(headTransform, "position")`.
        *   `x`: Member lookup within `Vector3` context (Rule 3). -> Accesses `x` field.
    *   Example (Using default member access from Component): `curl "http://localhost:7777/scene/Player/Head/component:Collider/transform/position/y"`
        *   `/scene/Player/Head`: Navigates `Transform` hierarchy (Rule 2). Context `Head` GameObject.
        *   `component:Collider`: Prefix switches context to `Collider` (Rule 4).
        *   `transform`: Member lookup in `Collider` finds `.transform` property (Rule 3). Context implicitly switches to `Transform`.
        *   `position`: Member lookup in `Transform` finds `.position` property (Rule 3). Context implicitly switches to `Vector3`.
        *   `y`: Member lookup in `Vector3` finds `y` field (Rule 3).
    *   **(Response: 200 OK)** `{\"result\": /* Value returned by Accessor */}`

*   **Update Property via Path:**
    *   `PATCH /scene/{unity-path}/{bridge-path-expression...}`
    *   Example: `curl -X PATCH "http://localhost:7777/scene/Player/Head/transform:localScale" -H "Content-Type: application/json" -d '{\"x\": 1.1, \"y\": 1.1, \"z\": 1.1}'`
        *   Path resolved similarly to GET. Calls `Accessor.SetProperty(headTransform, "localScale", jsonData)`.
    *   **(Response: 200 OK)** `{\"success\": true}`

*   **Call Method via Path:**
    *   `POST /scene/{unity-path}/{bridge-path-expression...}`
    *   Example: `curl -X POST "http://localhost:7777/scene/GameManager/method:StartRound" -H "Content-Type: application/json" -d '[5]'` // Arguments in body
        *   `/scene/GameManager`: Navigates `Transform` hierarchy (Rule 2). Context `GameManager` GameObject.
        *   `method:StartRound`: Prefix switches context to the `GameManager` script component (assuming it exists) and targets the `StartRound` method (Rule 4). -> Calls `Accessor.SetProperty(gameManagerScript, "StartRound", jsonDataAsArgs)`.
    *   **(Response: 200 OK)** `{\"success\": true, \"result\": ... /* Optional method return value */}`

*   **Symlinks (`WebRouteLink` Component):** The `Transform` hierarchy traversal logic (Rule 2) will need to specifically check for and follow `WebRouteLink` components.

### 4.3. Unified Event Endpoint

Handles batch sending and receiving of Bridge events, consolidating the functionality previously in `send_events`, `receive_events`, `pump_events`. Handled by `RuntimeBridgeHandler`. Uses minimized, single-line JSON per event in arrays.

*   **Retrieve Events (Polling / Long Polling):**
    *   `GET /bridge/events`
    *   `GET /bridge/events?wait=true&timeout=60` (Enables long polling)
    *   `curl "http://localhost:7777/bridge/events?wait=true"`
    *   **(Response: 200 OK)** `[{"event":"Collision",...},{"event":"Click",...}]` (Minimized JSON array, possibly empty)

*   **Send Events / Pump Events:**
    *   `POST /bridge/events` (Default: Send events, receive pending events back)
    *   `POST /bridge/events?poll=false` (Send only, minimal response)
    *   `curl -X POST http://localhost:7777/bridge/events -H "Content-Type: application/json" -d '[{"event":"input",...},{"event":"action",...}]'`
    *   **(Response if polling (default): 200 OK)** `[{"event":"Damage",...}]` (Outgoing events)
    *   **(Response if `poll=false`: 204 No Content)**

### 4.4. Interest Management & Polling API (Future Enhancement)

Allows more granular event polling based on registered interests.

*   **Register Interest:**
    *   `POST /bridge/objects/{id}/interests`
    *   `curl -X POST .../objects/myCube1/interests -d '{ "eventName": "Collision", "query": {...} }'`
    *   **(Response: 201 Created)** `{"interestId": "guid-interest-123"}`

*   **Poll Specific Interest:**
    *   `GET /bridge/objects/{id}/interests/{interest-id}/events?wait=true`
    *   `curl .../objects/myCube1/interests/guid-interest-123/events?wait=true`
    *   **(Response: 200 OK)** `[...]` (Events matching this interest)

*   **Poll Object (and optionally Children):**
    *   `GET /bridge/objects/{id}/events?includeChildren=true&wait=true`
    *   `curl .../objects/myCube1/events?includeChildren=true&wait=true`
    *   **(Response: 200 OK)** `[...]` (Aggregated events from object and children's interests)

*   **Unregister Interest:**
    *   `DELETE /bridge/objects/{id}/interests/{interest-id}`
    *   `curl -X DELETE .../objects/myCube1/interests/guid-interest-123`
    *   **(Response: 204 No Content)**

### 4.5. Long-Running Task API (Future Enhancement)

For operations that don't fit immediate request/response.

*   **Start Task:**
    *   `POST /bridge/tasks/{taskType}` (e.g., `/bridge/tasks/generateReport`)
    *   `curl -X POST .../tasks/heavyCalculation -d '{ ...params... }'`
    *   **(Response: 202 Accepted)** `{"taskId": "guid-task-456"}`

*   **Check Status:**
    *   `GET /bridge/tasks/status/{taskId}`
    *   `curl .../tasks/status/guid-task-456`
    *   **(Response: 200 OK)** `{"status": "complete", "result": {...}}` or `{"status": "pending"}` or `{"status": "error", ...}`

### 4.6. Editor Build API (Editor Only)

Handled by `EditorBuildHandler`.

*   **Trigger Build:**
    *   `POST /build/trigger`
    *   `curl -X POST http://localhost:7778/build/trigger -d '{ "platform": "WebGL", "options": ... }'`
    *   **(Response: 202 Accepted)** `{"message": "Build started...", "buildId": "..."}` (Build runs async)

*   **Generate Schemas:**
    *   `POST /schema/generate`
    *   `curl -X POST http://localhost:7778/schema/generate`
    *   **(Response: 200 OK)** `{"success": true, "message": "Schemas regenerated."}`

## 5. Implementation Details

*   **Async Handlers:** All `IHttpRequestHandler.HandleRequestAsync` methods will use `async`/`await`. `uniwebserver`'s `ThreadedTaskQueue` provides the initial worker threads.
*   **Main Thread Dispatch:** A mechanism (e.g., custom queue checked in `Update`, UniTask) is crucial for safely marshalling calls to Unity APIs (like `Accessor` or `Bridge` methods that interact with GameObjects) from handlers, especially after an `await`.
*   **JSON Handling:** Use `Newtonsoft.Json.Linq` (`JObject`, `JToken`) for parsing/construction. Leverage existing Bridge converters (`BridgeJsonConverter.cs`). Use `Formatting.None` for serialization.
*   **Error Handling:** Implement robust error handling, returning appropriate HTTP status codes (400, 404, 405, 500) and JSON error bodies (`{"error": true, "message": "..."}`).
*   **uniwebserver Integration:** Adapt the core `WebServer.cs` to support the `async` handler pipeline. Refactor or replace the existing `BridgeWebServer.cs` MonoBehaviour with the new `RuntimeBridgeHandler` approach.
*   **Accessor Engine:** The `Accessor.cs` functions (`GetProperty`, `SetProperty`) will be the workhorses called by handlers after identifying the target object and path expression.

## 6. Roadmap

1.  **Foundation & Separation:**
    *   Establish separate Editor (`EditorBuildServer`+`EditorBuildHandler`) and Runtime (`RuntimeWebServerManager`+`RuntimeBridgeHandler`) server instances using `uniwebserver` library (core lib duplicated in `Assets/Editor/`).
    *   Define `IHttpRequestHandler` with `async Task<bool> HandleRequestAsync`. Implement `WebServerRegistry` with `async` dispatch.
2.  **Core Bridge API & Async:**
    *   Implement the ID-based Bridge endpoints (Create, Update, Query, Delete) in `RuntimeBridgeHandler` using `async`/`await`.
    *   Implement main thread dispatch mechanism for Unity API calls within handlers.
3.  **Unified Event Endpoint (Basic):**
    *   Implement `GET /bridge/events` (basic polling) and `POST /bridge/events` (send/pump) using the existing global Bridge event queue. Ensure JSON minimization.
4.  **Path-Based API:**
    *   Implement `TraversePath` logic (including symlink handling) that uses the prefix-detection approach described in 4.2.
    *   Add routing logic to `RuntimeBridgeHandler` to handle `/scene/...` requests, identify the target GameObject via traversal, extract the remaining path as the Bridge expression, and call the `Accessor`.
5.  **Long Polling:**
    *   Implement `