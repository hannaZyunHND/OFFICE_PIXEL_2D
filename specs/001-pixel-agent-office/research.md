# Phase 0 Architectural Research: Pixel Agent Office

**Branch**: `001-pixel-agent-office` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## 1. Vue 3 + Pinia ↔ PixiJS v8 Reactivity Boundary (`60 FPS` Guarantee)

- **Decision**: Maintain a strict unidirectional command/event bridge (`EngineBridge`) between Pinia stores and the PixiJS v8 `OfficeRenderer` instance, storing the PixiJS `Application` and `AgentEntity` instances inside `shallowRef` / non-reactive TypeScript class fields outside Pinia state.
- **Rationale**:
  - Wrapping PixiJS `Container`, `Graphics`, or `Sprite` instances inside Vue `ref()` or `reactive()` recursively proxies internal WebGL/WebGPU buffers and transform matrices, degrading frame rates from `60 FPS` to `< 15 FPS`.
  - Pinia stores (`useBlueprintStore`, `useTelemetryStore`, `useUiStore`) hold coarse business state only (`OfficeBlueprint`, agent high-level FSM enum, bounded Ring Buffer of 200 events, active selected agent ID, HUD mode flags).
  - Continuous spatial state (`pixelX`, `pixelY`, A* waypoint progression, Bézier packet `t` parameter `[0..1]`, sprite animation frame index, and particle alpha) updates exclusively inside `app.ticker.add((ticker) => ...)`.
- **Alternatives Considered**:
  - *Declarative Vue-Pixi wrapper libraries (`vue3-pixi`)*: Rejected because reactive prop diffing on 60Hz coordinate ticks violates Constitution Principle II and introduces unnecessary reconciliation overhead.

---

## 2. Asynchronous A* Pathfinding with `easystarjs` on a `32x32px` Tile Grid

- **Decision**: Represent the office walkability matrix as a 2D number array (`0 = walkable`, `1 = blocked wall/furniture footprint`) synchronized with `EasyStar.js`, with `enableDiagonals()` disabled (strictly 4-directional orthogonal movement `UP`, `DOWN`, `LEFT`, `RIGHT` for authentic top-down pixel-art ergonomics).
- **Rationale**:
  - Orthogonal 4-directional movement matches the 4-row sprite sheet standard (`Down`, `Left`, `Right`, `Up`) and prevents diagonal corner-clipping across `footprint: [w, h]` boundaries.
  - Calling `easystar.calculate()` inside the PixiJS ticker loop with `iterationsPerCalculation(1000)` resolves paths on a `24x16` to `64x64` grid in `< 0.2ms` within the same frame.
  - Whenever furniture is moved in **Edit Mode**, rebuilding the walkability matrix and re-requesting active paths takes `< 1ms`.
- **Alternatives Considered**:
  - *8-directional movement*: Rejected because agents visually clip desk corners and require 8-direction sprite rows.
  - *NavMesh pathfinding*: Rejected as over-engineered for discrete `32x32px` tile grids.

---

## 3. Per-Agent Event Queue, Throttling (`1200ms`), and `8000ms` Slacking Timer

- **Decision**: Equip each `AgentEntity` with a dedicated FIFO queue (`AgentEvent[]`) and a state timer managed by the engine loop:
  1. When an event arrives for `agent_id`, it is pushed to the global `RingBuffer(200)` immediately (for telemetry accuracy) and enqueued into `AgentEntity.eventQueue`.
  2. If the agent is not at its target `interaction_point`, it first enters `MOVING` and traverses the A* path (`speed = 4 tiles/sec` default, configurable `1x`/`2x`).
  3. Upon arrival, the agent enters `WORKING` or `TOOL_CALL` and starts a hold timer of `max(1200ms, metadata.duration_ms_clamped)`. New queued events wait until `1200ms` has elapsed in the active visual state.
  4. When `AGENT_COMPLETE` pops and `eventQueue` becomes empty, an `8000ms` countdown starts. If no event arrives before expiry, the agent queries `OfficeScene` for an unoccupied `IDLE` zone `FurnitureItem` (or fallback walkable tile in an `IDLE` zone) and pathfinds there.
  5. Every `1000ms`, the scene checks pairs of `IDLE` agents; if Manhattan distance `|x1 - x2| + |y1 - y2| <= 2`, both display synchronized pixel chat bubbles (`"Did you see that prompt?"`, `"Token budget looking good!"`, `"Coffee #4 today..."`).
- **Rationale**: Prevents visual flicker when fast LLM streaming or cached tool calls emit 5+ events in `< 500ms`, ensuring humans can visually follow every step of the workflow.
- **Alternatives Considered**:
  - *Global single event queue*: Rejected because independent parallel agents (e.g., Researcher A and Researcher B in a Map-Reduce step) must move and work simultaneously rather than blocking each other globally.

---

## 4. Two-Stage AI Markdown-to-Office Compiler + Deterministic Auto-Layout

- **Decision**: Split Markdown compilation into two strictly isolated modules:
  - **Stage 1 (`llmCompiler.ts`)**: Calls `@google/genai` (`gemini-2.5-flash`) or OpenAI (`gpt-4o-mini`) with `responseSchema` enforcing `SemanticTopologySchema` (`project_name`, `zones[]`, `agents[]`, `edges[]`). Zero coordinates exist in this schema.
  - **Stage 2 (`autoLayoutEngine.ts`)**: Pure TypeScript deterministic spatial packer:
    1. Groups agents by their semantic zone (defaulting to a primary `WORK` zone, an `APPROVAL` zone for reviewer/supervisor roles, and a mandatory `IDLE` pantry zone).
    2. Calculates required room dimensions so each agent desk (`DESK_PC`, footprint `[2, 1]`) occupies a `4x3` cell slot (guaranteeing `>= 1 tile` walkable margin on all sides and an unobstructed `interaction_point`).
    3. Packs zone rectangles onto the master grid (`grid_cols x grid_rows`) using a Left-to-Right / Top-to-Bottom BSP (Binary Space Partition) / Shelf layout with a `1-tile` corridor buffer between zones.
    4. Auto-populates the `IDLE` zone with `COFFEE_MACHINE`, `SOFA`, `PLANT`, and `AQUARIUM` items, and verifies A* reachability from every desk `interaction_point` to the `IDLE` zone before returning `OfficeBlueprint.json`.
- **Rationale**: Guarantees 100% collision-free maps on the first try regardless of LLM temperature or model variance.
- **Alternatives Considered**:
  - *Asking the LLM to output `(x, y)` coordinates directly*: Rejected per Constitution Principle IV because LLMs frequently overlap furniture footprints and block doorways.

---

## 5. Procedural Pixel Art Fallback & `IndexedDB` Custom Sprite Loader

- **Decision**:
  - Enable `TextureStyle.defaultOptions.scaleMode = 'nearest'` globally in PixiJS v8.
  - Build `ProceduralSprites.ts` using `PIXI.Graphics` pixel-aligned rectangles (`1px` / `2px` virtual pixel blocks within the `32x32` coordinate space) for every furniture type and directional agent pose (`UP`, `DOWN`, `LEFT`, `RIGHT`, 2-frame walk bob + 2-frame typing animation).
  - Build `assetStorage.ts` using a lightweight zero-dependency `IndexedDB` store (`pixel_office_assets_db`) that saves uploaded `32x32` sprite sheets as `Blob` / `ArrayBuffer`, slices them into `PIXI.Texture` frames (`row 0: DOWN`, `row 1: LEFT`, `row 2: RIGHT`, `row 3: UP`), and swaps agent/furniture textures at runtime.
- **Rationale**: Zero external network asset dependencies at startup while enabling full pixel-art customization that survives browser refreshes beyond `localStorage`'s `5MB` quota limit.
- **Alternatives Considered**:
  - *Storing base64 PNGs in `localStorage`*: Rejected because multiple sprite sheets and exported event logs quickly exceed the `5MB` `localStorage` ceiling.
