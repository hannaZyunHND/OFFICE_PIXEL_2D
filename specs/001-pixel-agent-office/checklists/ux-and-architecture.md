# Technical Architecture & UI/UX Requirements Quality Checklist: Pixel Agent Office

**Purpose**: Validate the completeness, clarity, consistency, and measurability of technical and UI/UX requirements ("Unit Tests for Requirements") prior to code implementation.
**Created**: 2026-11-14
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [MASTER.md](../../../design-system/pixel-agent-office/MASTER.md)

> **Note on Ownership**: Checkboxes (`[x]`) in this custom checklist indicate reviewer approval that the **requirement itself** is clearly and completely specified—not that implementation code is finished.

## Reactivity Boundary & 60 FPS Engine Requirements

- [ ] CHK001 Are the state boundaries between Vue/Pinia and the PixiJS `app.ticker` loop explicitly specified to forbid watching continuous `(x, y)` coordinates or animation frames? [Clarity, Constitution §II, Spec §FR-004]
- [ ] CHK002 Is the base grid tile dimension (`32x32px`), default desktop scale (`2x`), and zoom range (`1x–4x`) unambiguously quantified? [Clarity, Spec §FR-001, Design System MASTER.md §1]
- [ ] CHK003 Are nearest-neighbor pixel scaling rules (`image-rendering: pixelated` and `scaleMode = 'nearest'`) specified for both procedural graphics and uploaded sprite textures? [Consistency, Design System MASTER.md §1]

## Procedural Fallback & Spatial Data Contracts

- [ ] CHK004 Does the specification define the exact visual anatomy required for zero-asset procedural agents (`head`, `torso`, `boots`, and directional eyes for `UP`, `DOWN`, `LEFT`, `RIGHT`) when no `.png` sprite sheet is present? [Completeness, Spec §FR-002, Design System MASTER.md §5]
- [ ] CHK005 Are `footprint: [w, h]`, `interaction_point: [ix, iy]`, and `facing` direction requirements defined for all interactive furniture types so agents never clip into obstacles or sit facing away from desks? [Completeness, Spec §FR-003, Data Model §1.1]
- [ ] CHK006 Are validation rules specified for when a furniture item's `interaction_point` falls inside a blocked footprint or outside grid bounds? [Edge Case, Data Model §1.1]

## Agent Lifecycle FSM, Queue Throttling & Pathfinding

- [ ] CHK007 Is the minimum active state display duration (`min_duration = 1200ms`) explicitly specified for `WORKING` and `TOOL_CALL` states under high-frequency event bursts? [Clarity, Spec §FR-005]
- [ ] CHK008 Is the distance threshold (`< 6 tiles` Manhattan distance for physical walk vs. `>= 6 tiles` for quadratic Bézier packet flight) clearly quantified for `AGENT_HANDOFF` events? [Clarity, Spec §FR-008]
- [ ] CHK009 Are the inactivity timeout (`8000ms` after `AGENT_COMPLETE`) and proximity threshold (`<= 2 tiles` between two `IDLE` agents for watercooler chat bubbles) explicitly quantified? [Clarity, Spec §FR-007, §FR-009]
- [ ] CHK010 Does the specification define fallback behavior when all `IDLE` zone furniture items (`COFFEE_MACHINE`, `SOFA`) are already occupied by other idle agents? [Edge Case, Spec §Edge Cases]

## Real-Time Ingestion, Memory Cap & Telemetry Inspector

- [ ] CHK011 Are all three real-time event ingestion modes (WebSocket Client with exponential backoff reconnect, Window `postMessage`/`BroadcastChannel`, and Built-in Mock Scenario Simulator) specified? [Completeness, Spec §FR-010]
- [ ] CHK012 Are the in-memory telemetry Ring Buffer capacity (`200 events` maximum) and payload truncation threshold (`10KB` with `"Download Full JSON"` action) explicitly quantified? [Measurability, Constitution §V, Spec §FR-013]
- [ ] CHK013 Are the visual layout, width (`380px`), and required telemetry sections of the right-side Agent Inspector Drawer documented in the UI/UX design system? [Completeness, Spec §FR-012, Design System `inspector-and-simulator.md` §1]

## God-View, Interactive Map Editor & Two-Stage AI Compiler

- [ ] CHK014 Are the visual differences between Chill Mode and God-View (`Tab` shortcut, glowing DAG splines, active handoff pulse) clearly specified? [Clarity, Spec §FR-011, Design System `workspace-hud.md` §2]
- [ ] CHK015 Does the Interactive Map Editor specification define how grid lines, blocked collision tiles (`rgba(239,68,68,0.32)`), invalid drop previews, and live `EasyStar.js` path recalculations behave? [Completeness, Spec §FR-014, Design System `map-editor-and-compiler.md` §1]
- [ ] CHK016 Is the strict separation between Stage 1 (LLM semantic extraction with zero `(x, y)` coordinates) and Stage 2 (Deterministic TypeScript Auto-Layout with `>= 1 tile` walkable clearance) enforced in both schema contracts and plan? [Consistency, Constitution §IV, Spec §FR-015, Contract `llm-topology.schema.json`]
- [ ] CHK017 Are storage responsibilities clearly partitioned between `localStorage` (API keys, UI settings) and `IndexedDB` (`32x32px` 4-row directional `.png` sprite sheets and blueprint snapshots)? [Consistency, Constitution §V, Spec §FR-016]

## Notes

- All 17 requirement quality checks trace directly to `constitution.md`, `spec.md`, `plan.md`, `data-model.md`, JSON Schema `contracts/`, and `design-system/pixel-agent-office/MASTER.md`.
