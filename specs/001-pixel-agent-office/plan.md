# Implementation Plan: Pixel Agent Office — 2D Multi-Agent Visual Renderer & Simulator

**Branch**: `001-pixel-agent-office` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pixel-agent-office/spec.md`

## Summary

**Pixel Agent Office** is a 100% client-side, framework-agnostic 2D top-down pixel-art visual renderer and state simulator for multi-agent AI workflows (LangGraph, CrewAI, AutoGen, Swarm, etc.). Built with **Vue 3 (`<script setup>`), TypeScript, Pinia, Tailwind CSS, PixiJS v8, and EasyStar.js**, the system enforces a strict reactivity boundary where Pinia manages coarse business state while the PixiJS `app.ticker` loop drives `60 FPS` A* movement, Per-Agent Event Queues (`1200ms` throttling, `8s` idle timeout), quadratic Bézier handoff packets, and procedural pixel graphics fallbacks (`32x32px` base tile at `2x` scale). It includes a two-stage **Markdown-to-Office AI Compiler + Deterministic Auto-Layout Engine**, a **Built-in Mock Scenario Simulator**, **God-View DAG overlay (`Tab`)**, a bounded **Telemetry Inspector Drawer (`200-event` Ring Buffer, `10KB` truncation)**, an **Interactive Map Editor**, and an **`IndexedDB` Custom Sprite Sheet Loader**.

## Technical Context

**Language/Version**: TypeScript 5.6+ (Strict Mode), HTML5 / ES2022

**Primary Dependencies**:
- **UI & State**: Vue 3.5+ (`<script setup>` Composition API), Pinia 2.2+, Tailwind CSS 3.4+, Lucide Icons (`lucide-vue-next`)
- **2D Rendering & Pathfinding**: PixiJS v8 (`pixi.js@^8.x`), EasyStar.js (`easystarjs@^0.4.4`)
- **AI Compiler SDKs**: `@google/genai` (Gemini Structured Output) and OpenAI REST/SDK client (API keys stored in `localStorage`)

**Storage**:
- `localStorage`: LLM API keys (`gemini_api_key`, `openai_api_key`), active provider/model config, HUD preferences, WebSocket URL
- `IndexedDB` (`pixel_agent_office_db`): Custom `32x32px` `.png` sprite sheets (`Blob`), custom/compiled `OfficeBlueprint.json` snapshots, and oversized payload blobs

**Testing**: Vitest (unit tests for Deterministic Auto-Layout Engine, Per-Agent Event Queue throttling, Ring Buffer truncation, and Blueprint JSON validator)

**Target Platform**: Modern Desktop & Tablet Web Browsers (WebGL2 / WebGPU via PixiJS v8, 100% Client-Side SPA)

**Project Type**: Single-Page Web Application (`web-app` / visual simulator engine)

**Performance Goals**:
- Locked `60 FPS` (`<= 16.6ms` frame budget) with up to 12 concurrent moving/animating agents and active Bézier handoff particles
- `< 1.5s` cold boot to interactive procedural pixel office canvas with `0` external image assets
- `< 50ms` mode switch latency for God-View (`Tab`) and Interactive Map Editor overlays

**Constraints**:
- **CRITICAL REACTIVITY RULE**: NEVER use Vue `watch` or reactive refs/stores for `60 FPS` `(x, y)` coordinates, pathfinding interpolation, or sprite animation frames
- **MEMORY CAP**: Telemetry Ring Buffer capped at `200 events`; payloads `> 10KB` truncated in UI with on-demand JSON download
- **SPATIAL DETERMINISM**: LLM Stage 1 compiler NEVER outputs `(x, y)` coordinates; Stage 2 TypeScript Auto-Layout Engine enforces `>= 1 tile` walkable margin around all furniture footprints

**Scale/Scope**: Grid maps from `12x10` up to `64x64` tiles (`24x16` default), `1–16` concurrent agents, `3` real-time ingestion transports (WebSocket, `postMessage`/`BroadcastChannel`, Built-in Mock Simulator), delivered across 4 sequential milestones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked and verified after Phase 1 design.*

| Constitution Principle | Gate Requirement | Status | Verification Artifact |
|------------------------|------------------|--------|-----------------------|
| **I. 100% Client-Side & Framework-Agnostic** | Zero backend lock-in; communicates solely via `OfficeBlueprint.json` and `AgentEvent` JSON contracts; includes Built-in Mock Simulator. | ✅ PASS | [office-blueprint.schema.json](./contracts/office-blueprint.schema.json), [realtime-event.schema.json](./contracts/realtime-event.schema.json) |
| **II. Strict Vue/Pinia ↔ PixiJS Boundary** | Pinia stores only coarse business state (`Blueprint`, `FSM State`, `Event Logs`, `UI Mode`); PixiJS `app.ticker` owns `(x, y)` interpolation, A*, and sprite frames. | ✅ PASS | [research.md §1](./research.md), [data-model.md §1.3](./data-model.md) |
| **III. Zero-Asset Procedural Graphics Fallback** | `32x32px` base tile (`2x` desktop scale); `PIXI.Graphics` procedural renderer draws all zones, furniture, and directional agents when no PNG sprite sheet is present. | ✅ PASS | [research.md §5](./research.md), [MASTER.md](../../design-system/pixel-agent-office/MASTER.md) |
| **IV. Two-Stage Deterministic Spatial Layout** | Stage 1 LLM schema excludes `(x, y)` coordinates; Stage 2 TypeScript packer computes non-overlapping zones, footprints, `interaction_point`, `facing`, and `>= 1 tile` walkways. | ✅ PASS | [llm-topology.schema.json](./contracts/llm-topology.schema.json), [research.md §4](./research.md) |
| **V. Bounded Telemetry Memory & Local Persistence** | `200-event` Ring Buffer, `10KB` payload truncation + full JSON download, `localStorage` for keys/settings, `IndexedDB` for custom `32x32` sprite sheets. | ✅ PASS | [data-model.md §1.2 & §1.4](./data-model.md) |

## Project Structure

### Documentation (this feature)

```text
specs/001-pixel-agent-office/
├── plan.md                                  # Implementation Plan & Architecture (this file)
├── spec.md                                  # Feature Specification (P1–P4 User Stories & FRs)
├── research.md                              # Phase 0 Architectural Decisions
├── data-model.md                            # Phase 1 Entities, TypeScript Interfaces & FSM Matrix
├── quickstart.md                            # Phase 1 Milestone Verification Guide
├── contracts/                               # Phase 1 JSON Schema Contracts
│   ├── office-blueprint.schema.json         # Static spatial & workflow topology contract
│   ├── realtime-event.schema.json           # WebSocket / postMessage / Simulator event contract
│   └── llm-topology.schema.json             # Stage 1 LLM Structured Output contract (no x,y coords)
├── checklists/                              # Spec Kit Quality & Domain Checklists
│   ├── requirements.md                      # Specification Quality Checklist
│   └── ux-and-architecture.md               # Technical & UI/UX Requirements Quality Checklist
└── tasks.md                                 # Phase 2 Actionable Task Breakdown (T001–T056)
```

### UI/UX Design System (UI/UX Pro Max + Design System Skill)

```text
design-system/pixel-agent-office/
├── MASTER.md                                # Global Source of Truth: Retro-Modern HUD + Pixel Canvas
└── pages/
    ├── workspace-hud.md                     # Main Canvas, Top HUD Bar, God-View vs Chill Mode
    ├── inspector-and-simulator.md           # Agent Telemetry Inspector Drawer & Mock Simulator Panel
    └── map-editor-and-compiler.md           # Interactive Map Editor, AI Compiler Modal & Asset Loader

assets/
├── design-tokens.json                       # 3-Layer Tokens (Primitive → Semantic → Component)
└── design-tokens.css                        # Generated CSS Custom Properties for Vue + Tailwind HUD
```

### Source Code (repository root)

```text
src/
├── main.ts                                  # Vue 3 + Pinia bootstrap
├── App.vue                                  # Root viewport layout (Canvas Stage + Retro-Modern HUD)
├── assets/
│   └── styles/
│       ├── main.css                         # Tailwind imports + design-tokens.css integration
│       └── pixel-hud.css                    # Crisp pixel borders, scanlines & God-View glow utilities
├── types/
│   ├── blueprint.ts                         # OfficeBlueprint, ZoneDefinition, FurnitureItem, AgentBlueprint
│   ├── events.ts                            # AgentEvent, StoredTelemetryEvent, ToolIconType
│   ├── fsm.ts                               # AgentFsmState, Per-Agent Queue item types
│   └── assets.ts                            # CustomSpriteAsset & IndexedDB record types
├── data/
│   ├── defaultBlueprint.json                # Default "Autonomous Research Crew" (24x16 grid)
│   └── mockScenarios.ts                     # Built-in 4-Agent Research Crew & Burst Test scenarios
├── stores/                                  # Pinia Stores (Coarse Business State ONLY — NO 60Hz x,y)
│   ├── useBlueprintStore.ts                 # Active OfficeBlueprint, validation & zone/desk lookups
│   ├── useTelemetryStore.ts                 # 200-Event RingBuffer, 10KB payload truncation, token totals
│   ├── useUiStore.ts                        # Mode toggles (God-View Tab, Edit Mode, Active Drawer/Modal)
│   └── useSettingsStore.ts                  # localStorage API keys, WS URL, simulation speed
├── engine/                                  # PixiJS v8 + EasyStar.js Core (60 FPS Non-Reactive Loop)
│   ├── OfficeRenderer.ts                    # PixiJS Application lifecycle, layers, ticker orchestration
│   ├── CameraController.ts                  # Mouse drag pan & wheel zoom (1x–4x integer-friendly)
│   ├── GridPathfinder.ts                    # EasyStar.js 2D collision matrix & 4-way A* path resolver
│   ├── AgentEntity.ts                       # Per-agent FSM, 1200ms queue throttle, 8s idle timer, A* step
│   ├── FurnitureEntity.ts                   # Footprint rendering, PC screen glow state, edit drag handle
│   ├── HandoffAnimator.ts                   # Quadratic Bézier packet particles & <6 tile walk handoffs
│   ├── DagOverlayLayer.ts                   # God-View glowing spline curves & active edge pulse
│   ├── MapEditorLayer.ts                    # 32x32 grid overlay, red collision map & drag-drop snapping
│   └── graphics/
│       ├── ProceduralSprites.ts             # Zero-asset PIXI.Graphics pixel renderer (agents & furniture)
│       ├── BubbleRenderer.ts                # Overhead status text, tool icons & idle watercooler chat
│       └── SpriteSheetSlicer.ts             # Slices 32x32 4-row PNG blobs from IndexedDB into Textures
├── services/
│   ├── transport/
│   │   ├── EventBusManager.ts               # Unified dispatcher feeding Engine + TelemetryStore
│   │   ├── WebSocketClient.ts               # ws:// / wss:// client with exponential backoff reconnect
│   │   ├── PostMessageBridge.ts             # window.postMessage & BroadcastChannel listener
│   │   └── MockSimulatorEngine.ts           # Built-in deterministic & burst scenario playback timer
│   ├── compiler/
│   │   ├── llmTopologyExtractor.ts          # Stage 1: Gemini (@google/genai) & OpenAI structured extractor
│   │   └── deterministicLayoutEngine.ts     # Stage 2: Pure TS zone packer, desk placer & A* verifier
│   └── storage/
│       ├── ringBuffer.ts                    # Fixed-capacity (200) circular buffer + 10KB truncator
│       ├── indexedDbAssets.ts               # IndexedDB CRUD for custom 32x32 PNG sprite sheets
│       └── localConfig.ts                   # Typed localStorage wrapper for API keys & preferences
└── components/
    ├── canvas/
    │   └── PixelOfficeCanvas.vue            # Mounts OfficeRenderer via shallowRef; handles resize/Tab key
    ├── hud/
    │   ├── TopHudBar.vue                    # Connection badge, ▶ Run Demo, God-View (Tab), Edit Mode, Modals
    │   ├── SimulatorControlBar.vue          # Scenario selector, Play/Pause/Step, Burst Stress Test button
    │   └── ModeStatusBanner.vue             # Floating contextual banner for God-View & Edit Mode
    ├── inspector/
    │   ├── AgentInspectorDrawer.vue         # Right slide-over: FSM state, tokens, prompt/output, logs
    │   └── PayloadViewerCard.vue            # 10KB truncated JSON code viewer + "Download Full JSON" button
    ├── editor/
    │   └── MapEditorToolbar.vue             # Add/delete furniture, collision toggle, Export Blueprint JSON
    └── modals/
        ├── MarkdownCompilerModal.vue        # Paste/upload .md, API key setup, 2-stage compile preview
        └── CustomAssetLoaderModal.vue       # Upload 32x32 PNG sprite sheets, preview 4-row frames, assign

tests/
├── unit/
│   ├── ringBuffer.spec.ts                   # Validates 200-event cap & 10KB payload truncation
│   ├── deterministicLayoutEngine.spec.ts    # Validates 0 overlaps & >=1 tile clearance on generated maps
│   ├── agentFsmQueue.spec.ts                # Validates 1200ms active state hold & 8000ms idle transition
│   └── gridPathfinder.spec.ts               # Validates EasyStar.js collision matrix & dynamic rerouting
```

**Structure Decision**: Single-project pure frontend SPA architecture (`src/engine/` strictly isolated from `src/stores/` and `src/components/`). All continuous `60 FPS` rendering and A* movement reside inside `src/engine/` (plain TypeScript classes driven by PixiJS `app.ticker`), while `src/stores/` and `src/components/` handle coarse state transitions and the Retro-Modern HUD.

## Complexity Tracking

No Constitution violations exist. All five Core Principles are satisfied natively by the architecture above.
