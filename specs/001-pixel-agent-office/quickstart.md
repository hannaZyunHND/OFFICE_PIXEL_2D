# Quickstart & Milestone Validation Guide: Pixel Agent Office

**Branch**: `001-pixel-agent-office` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## 1. Prerequisites & Development Setup

- **Node.js**: v20+ or Bun v1.1+
- **Browser**: Modern desktop browser with WebGL2 / WebGPU support (Chrome, Edge, Firefox, Safari)
- **External Backend Required?**: **No** (100% Client-Side; includes Built-in Mock Scenario Simulator and Zero-Asset Procedural Graphics)

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Type-check & run unit tests (Auto-Layout, FSM Queue, Ring Buffer)
npm run typecheck
npm run test
```

---

## 2. End-to-End Validation Scenarios by Milestone

### Scenario 1: Milestone 1 — Zero-Asset Procedural Office & Camera Controls
1. Open `http://localhost:5173`.
2. Confirm the default `Autonomous Research Crew` blueprint ([office-blueprint.schema.json](./contracts/office-blueprint.schema.json)) loads in `< 1.5s` with zero network image errors.
3. Verify the `24x16` grid renders `WORK`, `APPROVAL`, and `IDLE` zones, desks (`DESK_PC`), coffee machine (`COFFEE_MACHINE`), sofa (`SOFA`), and procedural pixel agents facing their desks.
4. Drag the canvas with the left/middle mouse button to pan; scroll the mouse wheel to zoom between `1x` and `4x` while pixel edges stay crisp (`nearest` scaling).

### Scenario 2: Milestone 2 — Agent Lifecycle FSM, A* Pathfinding & Mock Simulator
1. Click **"▶ Run Demo Simulation"** in the top HUD bar.
2. Observe `Alice (Researcher)` transition from `IDLE` → `MOVING` (following an orthogonal A* path around furniture) → `WORKING` at `furn_desk_1` (`[4, 5]` facing `UP`) with glowing PC monitor and status bubble.
3. Trigger a rapid burst test ("⚡ Burst 5 Events") in the Simulator Panel and verify the Per-Agent Event Queue holds each `WORKING` / `TOOL_CALL` visual state for at least `1200ms`.
4. Observe `AGENT_HANDOFF` from `agent_researcher` to `agent_writer`: a glowing packet flies along a quadratic Bézier arc between desks (or the agent walks if `< 6 tiles`).
5. Wait `8 seconds` after `AGENT_COMPLETE` and verify agents automatically pathfind to unoccupied `IDLE` furniture in the Pantry (`zone_pantry`) and trigger proximity chat bubbles when standing within `<= 2 tiles`.

### Scenario 3: Milestone 3 — God-View DAG, Telemetry Inspector & Interactive Map Editor
1. Press `Tab` (or click the **God-View** toggle in the HUD) to switch from **Chill Mode** to **God-View**:
   - Confirm glowing spline curves connect agent desks according to `blueprint.edges`.
   - Confirm active `AGENT_HANDOFF` events pulse along the corresponding spline.
2. Click any agent or desk to open the right-side **Agent Telemetry Inspector Drawer**:
   - Verify FSM state badge, cumulative `tokens_used`, and event history from the `200-event` Ring Buffer.
   - Stream a test event with a `> 10KB` payload and verify the Inspector truncates the preview and shows **"Download Full JSON"**.
3. Click **Edit Mode** in the HUD:
   - Verify the `32x32px` grid lines and translucent red Collision Map overlay appear.
   - Drag `furn_desk_1` to a new valid tile, release, and confirm the collision overlay and A* pathfinding matrix update immediately.

### Scenario 4: Milestone 4 — AI Markdown-to-Office Compiler & Custom `IndexedDB` Assets
1. Click **"✨ AI Compiler (.md)"** in the HUD, paste a multi-agent workflow `.md` file, and configure a Gemini or OpenAI API key (stored in `localStorage`).
2. Run compilation and verify:
   - **Stage 1** outputs semantic topology matching [llm-topology.schema.json](./contracts/llm-topology.schema.json) with zero coordinates.
   - **Stage 2** deterministically packs zones and desks with `>= 1 tile` walkable clearance and renders the new `OfficeBlueprint.json` on the canvas.
3. Open **"🎨 Custom Assets"**, upload a `32x32px` 4-row directional `.png` sprite sheet, assign it to an agent, refresh the browser (`F5`), and verify the custom sprite reloads automatically from `IndexedDB`.
