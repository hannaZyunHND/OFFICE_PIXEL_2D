<!--
Sync Impact Report
- Version change: 0.0.0 (template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. 100% Client-Side & Framework-Agnostic Architecture
  - [PRINCIPLE_2_NAME] → II. Strict Vue/Pinia ↔ PixiJS Reactivity Boundary (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Zero-Asset Procedural Pixel Graphics Fallback
  - [PRINCIPLE_4_NAME] → IV. Two-Stage Deterministic Spatial Layout & Collision Integrity
  - [PRINCIPLE_5_NAME] → V. Bounded Telemetry Memory & Local-First Persistence
- Added sections:
  - Strict Technology Stack & Data Contract Constraints
  - Milestone-Driven Execution & Quality Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (compatible with Constitution Check gates)
  - ✅ .specify/templates/spec-template.md (compatible)
  - ✅ .specify/templates/tasks-template.md (compatible)
- Follow-up TODOs: None
-->

# Pixel Agent Office Constitution

## Core Principles

### I. 100% Client-Side & Framework-Agnostic Architecture
Pixel Agent Office MUST operate as a pure frontend (100% client-side) 2D visual renderer and state simulator without requiring any dedicated backend server or coupling to a specific AI framework (LangGraph, CrewAI, AutoGen, Swarm, etc.). All external communication MUST strictly adhere to two standardized JSON contracts:
- Static Spatial & Organizational Topology (`OfficeBlueprint.json`).
- Real-Time Telemetry Event Stream (`AgentEvent` via WebSocket Client, Window `postMessage`/`BroadcastChannel`, or the Built-in Mock Scenario Simulator).
Rationale: Decoupling the visualizer from AI backend runtimes allows any multi-agent system—or standalone browser demo—to drive the simulation immediately.

### II. Strict Vue/Pinia ↔ PixiJS Reactivity Boundary (NON-NEGOTIABLE)
To guarantee a locked `60 FPS` canvas frame rate, Vue 3 reactivity and Pinia stores MUST NEVER track, `watch`, or mutate continuous frame-by-frame spatial coordinates `(x, y)`, pathfinding interpolation steps, particle states, or sprite animation frames.
- Pinia stores MUST only hold coarse-grained business and UI state (`OfficeBlueprint`, high-level `Agent FSM State`, `RingBuffer Event Logs`, `Connection Status`, and `UI Mode` flags).
- The PixiJS v8 `app.ticker` loop MUST exclusively own all continuous coordinate interpolation, A* path traversal (`EasyStar.js`), Bézier handoff packet trajectories, and directional sprite frame cycling.
Rationale: Bridging 60Hz spatial mutations through Vue's reactive proxy system causes severe garbage collection stalls and DOM diffing bottlenecks.

### III. Zero-Asset Procedural Pixel Graphics Fallback
The rendering engine MUST use a canonical base grid tile size of `32x32px` (rendered at `2x` integer scale by default on desktop displays with `NEAREST` scale mode for crisp pixel edges) and MUST be 100% functional with zero external image assets.
- Whenever a custom `.png` sprite sheet is absent, `OfficeRenderer` and `AgentEntity` MUST automatically render recognizable, high-contrast procedural pixel graphics using `PIXI.Graphics` (including distinct agent head, body, eyes, directional orientation `UP`/`DOWN`/`LEFT`/`RIGHT`, zone floors, walls, and furniture items `DESK_PC`, `COFFEE_MACHINE`, `SOFA`, `PLANT`).
Rationale: Eliminates broken-asset states and guarantees instant boot and deterministic visual testing in Milestone 1 before custom sprite sheets are uploaded.

### IV. Two-Stage Deterministic Spatial Layout & Collision Integrity
Converting natural-language Markdown workflows into an office map MUST strictly separate semantic extraction from spatial geometry:
- **Stage 1 (LLM Topology Extraction)**: The AI compiler (`@google/genai` or OpenAI SDK) MUST output structured JSON containing only `zones`, `agents`, required furniture types, and workflow `edges`. The LLM MUST NOT generate `(x, y)` coordinates.
- **Stage 2 (Deterministic Auto-Layout Engine)**: A pure TypeScript layout engine MUST compute grid dimensions (`grid_cols x grid_rows`), partition non-overlapping zone rectangles, place furniture with explicit `footprint: [w, h]`, `interaction_point: [x, y]`, and `facing` direction, and enforce a minimum `1 tile` walkable clearance around every interactive furniture item.
Rationale: LLMs hallucinate overlapping coordinates and unreachable tiles; deterministic geometry guarantees valid A* pathfinding and prevents agents from walking through furniture or sitting backward.

### V. Bounded Telemetry Memory & Local-First Persistence
Long-running multi-agent simulations MUST protect browser memory and persist user customizations locally without external databases:
- Telemetry logs MUST use a fixed-capacity Ring Buffer capped at a maximum of `200 events` in memory.
- Any `input_payload` or `output_payload` exceeding `10KB` MUST be truncated for UI rendering while preserving an on-demand "Download Full JSON" export action.
- User API keys and UI preferences MUST persist in `localStorage`, while uploaded `32x32px` custom `.png` sprite sheets and large exported archives MUST persist in `IndexedDB`.
Rationale: Prevents browser tab OOM crashes during high-frequency agent tool calls and keeps user credentials and custom art strictly on the client device.

## Strict Technology Stack & Data Contract Constraints

The implementation MUST adhere to the following locked technology stack and runtime rules:
- **UI Framework & State**: Vue 3 (`<script setup>` Composition API) + TypeScript (strict mode) + Pinia + Tailwind CSS.
- **2D Engine & Pathfinding**: PixiJS v8 (`Application`, `Container`, `Graphics`, `Sprite`, `Ticker`) + `easystarjs` (2D grid A* pathfinding).
- **AI Compiler SDKs**: Client-side `@google/genai` (Gemini Structured Outputs) and OpenAI-compatible REST/SDK using user-supplied API keys stored in `localStorage`.
- **FSM Throttling & Lifecycle**: Each `AgentEntity` MUST maintain a dedicated Per-Agent Event Queue enforcing `min_duration = 1200ms` for active states (`WORKING`, `TOOL_CALL`) and an `8000ms` inactivity timer before transitioning to `IDLE / SLACKING` (auto-pathfinding to unoccupied `IDLE` zone furniture and triggering proximity chat bubbles when two idle agents are within `<= 2 tiles`).
- **Handoff & God-View Rules**: `AGENT_HANDOFF` events MUST animate a Bézier curve data packet between desks (or physical agent walk if Manhattan distance `< 6 tiles`) and illuminate the corresponding DAG spline when God-View (`Tab`) is active.

## Milestone-Driven Execution & Quality Gates

All engineering and design work MUST progress sequentially through four independently verifiable milestones:
1. **Milestone 1 (Core Engine & Procedural Office Renderer)**: Project scaffold, `OfficeBlueprint.json` loader, procedural pixel art renderer (`32x32px` tiles, zones, furniture), and camera pan/zoom.
2. **Milestone 2 (Agent FSM, Pathfinding & Mock Simulator)**: `AgentEntity` A* movement, Per-Agent Event Queue (`1200ms` throttling, `8s` idle timeout), speech/status bubbles, Bézier handoffs, and the Built-in Mock Scenario Simulator ("▶ Run Demo Simulation").
3. **Milestone 3 (God-View HUD, Inspector & Map Editor)**: Retro-Modern HUD top bar, `Tab` God-View glowing DAG overlay, right-side Agent Telemetry Inspector Drawer (Ring Buffer + 10KB truncation), and interactive Map Editor (grid overlay, red collision map, drag-and-drop furniture with live `EasyStar.js` matrix recalculation).
4. **Milestone 4 (AI Markdown-to-Office Compiler & Custom Assets)**: Two-stage Markdown-to-Blueprint compiler modal with API key config and Custom Sprite Sheet (`32x32px` 4-row directional PNG) loader backed by `IndexedDB`.

## Governance

This Constitution is the supreme architectural contract for **Pixel Agent Office**. All specifications (`spec.md`), implementation plans (`plan.md`), design systems (`MASTER.md`), and task breakdowns (`tasks.md`) MUST pass a Constitution Check against Core Principles I–V before code generation begins.
- **Amendment Procedure**: Any modification to a Core Principle, the Vue/PixiJS reactivity boundary, or canonical JSON schemas requires an explicit amendment to `.specify/memory/constitution.md` accompanied by a Sync Impact Report.
- **Versioning Policy**: Semantic versioning (`MAJOR.MINOR.PATCH`) applies—`MAJOR` for breaking architectural or schema changes, `MINOR` for new principles or milestone expansions, and `PATCH` for clarifications.
- **Compliance Verification**: Every milestone completion review MUST verify `60 FPS` rendering separation, zero-asset procedural fallback, deterministic non-overlapping layouts, and the 200-event / 10KB memory cap.

**Version**: 1.0.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-14
