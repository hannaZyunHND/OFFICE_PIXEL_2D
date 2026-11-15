# Feature Specification: Pixel Agent Office — 2D Multi-Agent Visual Renderer & Simulator

**Feature Branch**: `001-pixel-agent-office`

**Created**: 2026-11-14

**Status**: Approved

**Input**: User description: "PROJECT SPECIFICATION: PIXEL AGENT OFFICE — Framework-Agnostic 2D Multi-Agent Visual Renderer & Simulator (100% Client-Side)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore 2D Pixel Office Map with Zero-Asset Procedural Fallback (Priority: P1)

As an AI engineer or team observer, I want to open Pixel Agent Office in my browser and immediately see a crisp 2D top-down pixel-art office rendered from an `OfficeBlueprint.json` topology—complete with functional zones (`WORK`, `APPROVAL`, `IDLE`), desks, computers, coffee machines, sofas, plants, and interactive camera pan/zoom—even when no external sprite image assets are provided.

**Why this priority**: The visual canvas and spatial coordinate grid (`32x32px` base tile at `2x` desktop scale) are the foundational stage for every subsequent simulation, telemetry overlay, and editor capability.

**Independent Test**: Load the application with the default `Autonomous Research Crew` blueprint (`24x16` grid) and verify that all zones, walls, floor tiles, and furniture items (`DESK_PC`, `COFFEE_MACHINE`, `SOFA`, `PLANT`) render cleanly at `60 FPS` with crisp procedural pixel art and respond smoothly to mouse drag panning and scroll-wheel zooming.

**Acceptance Scenarios**:

1. **Given** the application loads with a valid `OfficeBlueprint.json` and no external `.png` assets, **When** the canvas initializes, **Then** the engine renders all grid tiles (`32x32px` at `2x` default scale), labeled zones (`WORK`, `APPROVAL`, `IDLE`), furniture footprints, and directional procedural agent avatars without missing-asset errors.
2. **Given** the office canvas is displayed, **When** the user drags with the left or middle mouse button and scrolls the mouse wheel, **Then** the camera pans smoothly across the office and zooms between `1x` and `4x` while maintaining crisp nearest-neighbor pixel boundaries.
3. **Given** any furniture item in the blueprint, **When** it is rendered on the grid, **Then** its `footprint: [w, h]` marks impassable collision cells while its `interaction_point: [x, y]` remains walkable and aligned with the specified `facing` direction (`UP`, `DOWN`, `LEFT`, `RIGHT`).

---

### User Story 2 - Watch Real-Time & Simulated Multi-Agent Workflows with Lifecycle FSM (Priority: P2)

As a user evaluating or demonstrating a multi-agent workflow, I want to click **"▶ Run Demo Simulation"** (or connect a live WebSocket / `postMessage` / `BroadcastChannel` event stream) and watch agents navigate along collision-free A* paths, queue rapid events smoothly (`min_duration = 1200ms`), type at glowing PCs, display tool-call badges, pass data packets along Bézier arcs during handoffs, and walk to the pantry to drink coffee or chat when idle for `8 seconds`.

**Why this priority**: Delivers the core value proposition—turning abstract multi-agent execution traces into an intuitive, living 2D simulation that works out-of-the-box without requiring a running backend.

**Independent Test**: Click **"▶ Run Demo Simulation"** on the HUD to trigger the built-in 4-Agent Research Report scenario and observe the complete lifecycle (`IDLE` → `MOVING` → `WORKING` → `TOOL_CALL` → `HANDOFF` → `COMPLETE` → `IDLE/SLACKING` after `8s`) at a steady `60 FPS`.

**Acceptance Scenarios**:

1. **Given** an agent is in `IDLE` state in the pantry, **When** an `AGENT_START` event arrives for that agent, **Then** the agent transitions to `MOVING`, follows an A* path around furniture obstacles to its assigned desk's `interaction_point`, turns to the desk's `facing` direction, switches to `WORKING`, illuminates the PC screen, and displays a status bubble.
2. **Given** an external backend emits 5 rapid events for the same agent within `500ms`, **When** the agent's Per-Agent Event Queue processes them, **Then** each active state (`WORKING`, `TOOL_CALL`) remains visible for at least `1200ms` (plus movement travel time) before transitioning to the next queued event.
3. **Given** an `AGENT_HANDOFF` event from Agent A to Agent B, **When** the handoff executes, **Then** a glowing document/data packet animates along a quadratic Bézier curve from Desk A to Desk B (or Agent A physically walks to Desk B if Manhattan distance `< 6 tiles`) before Agent B begins working.
4. **Given** an agent completes its task (`AGENT_COMPLETE`) and receives no new events for `8 seconds`, **When** the inactivity timer expires, **Then** the agent transitions to `IDLE / SLACKING`, pathfinds to an unoccupied `IDLE` zone furniture item (e.g., `COFFEE_MACHINE`, `SOFA`, `AQUARIUM`), and if another `IDLE` agent stands within `<= 2 tiles`, both display randomized watercooler chat bubbles.

---

### User Story 3 - Inspect Telemetry in God-View & Customize Layout in Interactive Map Editor (Priority: P3)

As a multi-agent system developer, I want to press `Tab` to toggle between **Chill Mode** and **God-View** (revealing glowing DAG workflow splines between desks), click any agent or desk to inspect its live prompt/output payloads, token usage, and bounded event logs, and switch to **Edit Mode** to drag-and-drop furniture with instant collision-grid recalculation.

**Why this priority**: Bridges visual aesthetics with actionable developer observability and spatial customization.

**Independent Test**: Press `Tab` to enable God-View and verify glowing DAG splines illuminate during handoffs; click an agent to open the right-side Telemetry Inspector Drawer and verify payload truncation above `10KB` and Ring Buffer capping at `200 events`; toggle Edit Mode, drag a desk to a new tile, and verify red collision overlays and live A* rerouting.

**Acceptance Scenarios**:

1. **Given** the simulation is running in Chill Mode, **When** the user presses `Tab` (or clicks the God-View HUD toggle), **Then** glowing spline curves render along all blueprint `edges` and pulse brightly whenever an `AGENT_HANDOFF` traverses that edge.
2. **Given** any agent on the canvas, **When** the user clicks the agent or its desk, **Then** the right-side Agent Inspector Drawer opens showing current FSM state, role, cumulative token count, latest prompt/output payloads, and the agent's filtered event history.
3. **Given** a high-volume event stream with payloads exceeding `10KB` and more than `200 total events`, **When** the telemetry store ingests them, **Then** the Ring Buffer retains only the newest `200 events` in memory and truncates oversized payloads in the UI while offering a **"Download Full JSON"** action.
4. **Given** the user activates **Edit Mode**, **When** the user drags a furniture item to a valid grid coordinate and drops it, **Then** the `32x32px` grid overlay and translucent red collision map update immediately, and agents currently moving recalculate their A* paths without walking through the new obstacle.

---

### User Story 4 - Generate Offices from Markdown via AI Compiler & Load Custom Sprite Sheets (Priority: P4)

As a workflow architect or pixel artist, I want to paste or upload a `.md` multi-agent architecture document so the two-stage AI Compiler + Deterministic Auto-Layout Engine generates a collision-free `OfficeBlueprint.json`, and I want to upload custom `32x32px` `.png` sprite sheets stored in `IndexedDB` to customize agent avatars and furniture.

**Why this priority**: Enables rapid onboarding of any custom multi-agent project from existing Markdown documentation and full visual personalization without backend storage.

**Independent Test**: Paste a sample Markdown multi-agent description into the AI Compiler Modal, execute Stage 1 (LLM structured topology extraction) + Stage 2 (Deterministic Auto-Layout), verify the new office renders with zero overlapping furniture and `>= 1 tile` walkways, then upload a `32x32px` 4-row directional PNG sprite sheet and confirm it persists across page reloads via `IndexedDB`.

**Acceptance Scenarios**:

1. **Given** the user opens the Markdown-to-Office Compiler Modal, enters a Gemini or OpenAI API key (saved in `localStorage`), and submits a `.md` workflow description, **When** Stage 1 completes, **Then** the LLM returns a validated JSON topology (`zones`, `agents`, furniture requirements, `edges`) containing zero hardcoded `(x, y)` coordinates.
2. **Given** the extracted semantic topology from Stage 1, **When** Stage 2 (Deterministic Auto-Layout Engine) runs, **Then** it outputs a complete `OfficeBlueprint.json` where all zones fit within `grid_cols x grid_rows`, every agent has a dedicated desk, and every furniture item has at least `1 tile` of walkable clearance around its footprint and `interaction_point`.
3. **Given** the user uploads a custom `.png` sprite sheet (`32x32px` grid cells arranged by rows: `Down`, `Left`, `Right`, `Up`), **When** the asset is assigned to an agent or furniture type, **Then** the binary texture is persisted in `IndexedDB`, immediately replaces the procedural fallback graphic on the canvas, and reloads automatically on subsequent browser sessions.

---

### Edge Cases

- **Burst Event Flooding**: When 50+ events arrive within 1 second over WebSocket, Per-Agent Event Queues buffer transitions per agent (`1200ms` minimum active duration) while the global telemetry log evicts oldest entries beyond `200 events` via the Ring Buffer without dropping frame rate below `60 FPS`.
- **Unreachable Interaction Point in Edit Mode**: If a user drags furniture in Edit Mode such that an agent's destination `interaction_point` becomes completely walled off, the pathfinder detects `no path found`, keeps the agent at its current valid tile, displays a warning indicator (`error` icon bubble), and highlights the blocked tile in Edit Mode.
- **All Idle Furniture Occupied**: If 6 agents enter `IDLE / SLACKING` simultaneously but the `IDLE` zone only has 3 furniture items (`COFFEE_MACHINE`, `SOFA`), excess idle agents pathfind to unoccupied walkable floor tiles inside the `IDLE` zone rectangle and wander/chat without overlapping.
- **Invalid or Offline WebSocket Endpoint**: When a configured `ws://` or `wss://` endpoint disconnects or fails to connect, the HUD connection badge switches to `RECONNECTING` with exponential backoff (`1s`, `2s`, `4s`, `8s`, max `30s`) while allowing the user to switch seamlessly to the Built-in Mock Simulator at any time.
- **Malformed Markdown or Invalid LLM API Key**: If Stage 1 LLM compilation fails due to an invalid API key, quota error, or malformed schema, the Compiler Modal surfaces a clear actionable error banner and offers a "Load Sample Blueprint" fallback without corrupting the active office canvas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a 2D top-down pixel-art office canvas using a base grid tile size of `32x32px` scaled at `2x` by default on desktop viewports, supporting smooth mouse-drag camera panning and scroll-wheel zooming (`1x` to `4x`).
- **FR-002**: System MUST provide a zero-asset Procedural Pixel Graphics engine (`PIXI.Graphics`) that automatically draws recognizable floor tiles, walls, zone borders, furniture (`DESK_PC`, `COFFEE_MACHINE`, `SOFA`, `PLANT`, `AQUARIUM`, `WHITEBOARD`), and directional agents (head, torso, eyes, facing `UP`/`DOWN`/`LEFT`/`RIGHT`) whenever custom sprite sheets are not loaded.
- **FR-003**: System MUST parse and validate `OfficeBlueprint.json` files containing `meta` (`project_name`, `grid_cols`, `grid_rows`, `tile_size`), `zones` (`WORK`, `APPROVAL`, `IDLE`), `furniture` (with `footprint`, `interaction_point`, `facing`, optional `agent_id`), `agents`, and workflow `edges`.
- **FR-004**: System MUST maintain a strict reactivity boundary where continuous `60 FPS` spatial coordinates `(x, y)`, A* movement interpolation, particle trajectories, and sprite frame animations run exclusively inside the 2D canvas ticker loop and are NEVER watched or mutated at 60Hz inside reactive UI stores.
- **FR-005**: Each agent MUST be governed by a Finite State Machine (`IDLE`, `MOVING`, `WORKING`, `TOOL_CALL`, `HANDOFF`, `COMPLETE`, `ERROR`) paired with a Per-Agent Event Queue that enforces a minimum display duration of `1200ms` for active states (`WORKING`, `TOOL_CALL`).
- **FR-006**: Agents MUST compute collision-free paths across the 2D tile grid using A* pathfinding, treating all furniture `footprint: [w, h]` tiles and outer walls as impassable obstacles while navigating to exact `interaction_point: [x, y]` coordinates and rotating to match `facing`.
- **FR-007**: System MUST render contextual overhead indicators on agents: status text bubbles during `WORKING`, distinct tool icons (`search` magnifying glass, `code` gear, `db` cylinder, `error` warning triangle) during `TOOL_CALL`, and randomized chat bubbles when two `IDLE` agents stand within `<= 2 tiles` of each other.
- **FR-008**: Upon receiving an `AGENT_HANDOFF` event from `agent_id` to `target_agent_id`, the system MUST animate a visual data packet/document along a quadratic Bézier curve between the source and target desks (or walk the source agent to the target desk when Manhattan distance `< 6 tiles`).
- **FR-009**: When an agent completes a task and receives no new events for `8000ms`, the system MUST automatically transition the agent to `IDLE / SLACKING` and route it via A* to an unoccupied interactive point or walkable tile within an `IDLE` zone.
- **FR-010**: System MUST support three real-time event ingestion modes: (1) WebSocket Client Mode (`ws://` / `wss://` with auto-reconnect), (2) Window `postMessage` & `BroadcastChannel` Mode for multi-tab/iframe embedding, and (3) a Built-in Mock Scenario Simulator with a one-click **"▶ Run Demo Simulation"** button.
- **FR-011**: System MUST provide a keyboard shortcut (`Tab`) and HUD button to toggle instantly between **Chill Mode** (clean pixel office view) and **God-View** (displaying glowing spline curves for all blueprint `edges` that intensify during active `AGENT_HANDOFF` events).
- **FR-012**: Clicking an agent or its assigned desk MUST open a right-side Agent Telemetry Inspector Drawer displaying current FSM state, agent metadata, latest `input_payload` and `output_payload`, cumulative `tokens_used`, and per-agent event logs.
- **FR-013**: System MUST cap in-memory telemetry storage using a Ring Buffer limited to the `200` most recent events and MUST truncate any `input_payload` or `output_payload` string exceeding `10KB` in the Inspector UI while providing a **"Download Full JSON"** button for the untruncated payload.
- **FR-014**: System MUST provide an interactive **Edit Mode** displaying a `32x32px` grid overlay and a translucent red Collision Map, allowing users to drag-and-drop furniture items, validate non-overlapping footprints, and immediately recalculate the A* pathfinding walkability matrix.
- **FR-015**: System MUST provide a Two-Stage Markdown-to-Office Auto-Generator: Stage 1 calls Gemini (`@google/genai`) or OpenAI with Structured Output JSON Schema to extract semantic `zones`, `agents`, furniture needs, and `edges` (with zero LLM-generated coordinates); Stage 2 runs a deterministic TypeScript Auto-Layout algorithm that partitions zones, assigns desks with `>= 1 tile` walkable clearance, and outputs a valid `OfficeBlueprint.json`.
- **FR-016**: System MUST provide a Custom Asset Loader allowing users to upload `32x32px` `.png` sprite sheets (4 directional rows: `Down`, `Left`, `Right`, `Up` for agents, or static/animated tiles for furniture) and persist them in `IndexedDB`, while storing API keys and user settings in `localStorage`.

### Key Entities

- **`OfficeBlueprint`**: Root spatial and organizational configuration document defining `meta` grid dimensions, `zones`, `furniture`, `agents`, and directed workflow `edges`.
- **`ZoneDefinition`**: Rectangular office room (`id`, `name`, `type: 'WORK' | 'APPROVAL' | 'IDLE'`, `rect: [x, y, width, height]`) that governs floor styling and furniture placement rules.
- **`FurnitureItem`**: Physical object placed on the grid (`id`, `type`, `x`, `y`, `footprint: [w, h]`, `interaction_point: [x, y]`, `facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'`, optional `agent_id`).
- **`AgentEntity`**: Autonomous simulated character with static blueprint metadata (`id`, `name`, `role`, `color`, `avatar_sprite`, `desk_id`) and runtime canvas state (grid position, pixel position, A* path queue, FSM state, Per-Agent Event Queue, `8s` idle timer, token counter).
- **`AgentEvent`**: Standardized real-time telemetry packet (`event_id`, `timestamp`, `event_type`, `agent_id`, optional `target_agent_id`, `metadata` containing `status_text`, `icon`, `input_payload`, `output_payload`, `tokens_used`, `duration_ms`).
- **`CustomSpriteAsset`**: User-uploaded `.png` sprite sheet stored in `IndexedDB` (`id`, `category: 'AGENT' | 'FURNITURE'`, `tile_width: 32`, `tile_height: 32`, `blob`, `frame_map`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application boots to an interactive, fully rendered 2D pixel office canvas in under `1.5 seconds` on a standard desktop browser with `0` external image assets required.
- **SC-002**: Canvas maintains a sustained `60 FPS` (`<= 16.6ms` frame time) during simultaneous movement, A* pathfinding, and Bézier handoff animations of up to `12 concurrent agents`.
- **SC-003**: First-time users can trigger and observe a complete multi-agent workflow lifecycle (`IDLE` → `MOVING` → `WORKING` → `TOOL_CALL` → `HANDOFF` → `COMPLETE` → `IDLE`) within `1 click` using the Built-in Mock Scenario Simulator without configuring any backend or API key.
- **SC-004**: 100% of `OfficeBlueprint.json` layouts produced by the Stage 2 Deterministic Auto-Layout Engine have `0` overlapping furniture footprints and guarantee a valid A* walkable path (`>= 1 tile` clearance) between every agent desk and at least one `IDLE` zone interaction point.
- **SC-005**: Browser heap memory dedicated to telemetry logs remains strictly bounded (never exceeding `200` retained events in the Ring Buffer and `10KB` rendered payload text per event) even after streaming `10,000+` continuous events.
- **SC-006**: Toggling God-View (`Tab`) or Edit Mode updates the canvas overlay in under `50ms` without interrupting active agent pathfinding or dropping frames.

## Assumptions

- Target primary viewport is desktop/laptop browsers (`>= 1024px` width) with WebGL2 / WebGPU support for hardware-accelerated 2D rendering, though tablet/responsive viewports can pan and zoom the canvas via touch/pointer events.
- Users utilizing the optional Stage 1 AI Markdown-to-Office Compiler will supply their own Gemini API key or OpenAI API key via the client-side Settings modal (stored exclusively in browser `localStorage`); all other simulator, editor, and live event features work with zero API keys.
- Custom uploaded sprite sheets follow the documented `32x32px` tile grid convention (`Down`, `Left`, `Right`, `Up` rows for character animations).
