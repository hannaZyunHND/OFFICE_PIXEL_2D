# Page Override: Workspace Canvas, Top HUD & God-View (`workspace-hud`)

> **Overrides:** [MASTER.md](../MASTER.md) for `PixelOfficeCanvas.vue`, `TopHudBar.vue`, `ModeStatusBanner.vue`, and `DagOverlayLayer.ts`.

---

## 1. Layout & Viewport Allocation

- **Full-Bleed Canvas (`100vw x 100vh`)**: The PixiJS `<canvas>` occupies the entire browser window (`position: fixed; inset: 0; overflow: hidden`).
- **Top HUD Bar (`height: 48px`)**: Docked along the top edge (`fixed top-0 inset-x-0 z-20`) with background `rgba(15, 23, 42, 0.90)`, bottom border `1px solid #334155`, and horizontal padding `16px`.
  - **Left Cluster**:
    - Pixel brand badge + Project Name (`meta.project_name` in `--font-pixel`, `14px`, `#F8FAFC`).
    - Live Connection Pill:
      - `SIMULATOR READY` (Emerald dot `#22C55E`)
      - `WS CONNECTED` (Cyan dot `#38BDF8` + endpoint URL in `--font-mono`)
      - `RECONNECTING (Attempt N)` (Amber pulsing dot `#F59E0B`)
      - `POSTMESSAGE LISTENING` (Indigo dot `#818CF8`)
  - **Center Cluster (Primary Simulation & Mode Controls)**:
    - **"▶ Run Demo Simulation"** CTA Button (`bg-[#22C55E] text-[#0F172A] font-semibold px-3 py-1.5 rounded-md shadow-sm hover:bg-[#16A34A]`). Turns into **"⏹ Stop Demo"** (`bg-[#EF4444] text-white`) while running.
    - **God-View Toggle Button**: Displays keyboard shortcut hint `[Tab]`. When active, styled with `border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8]` and a subtle cyan outer glow.
    - **Edit Mode Toggle Button**: Displays grid icon. When active, styled with `border-[#A855F7] bg-[#A855F7]/15 text-[#C084FC]`.
  - **Right Cluster (Compiler & Asset Actions)**:
    - **"✨ AI Compiler (.md)"** button → opens `MarkdownCompilerModal.vue`.
    - **"🎨 Custom Assets"** button → opens `CustomAssetLoaderModal.vue`.
    - **Camera Reset (`100%` / `2x`)** icon button → re-centers the office blueprint in the viewport.

---

## 2. Chill Mode vs. God-View (`Tab` Toggle) Visual Specification

| Feature | Chill Mode (Default) | God-View (`Tab` Active) |
|---------|----------------------|-------------------------|
| **Canvas Dimming** | `100%` brightness on floor & furniture | Floor & non-desk props dimmed slightly (`alpha: 0.78`) to make glowing workflow edges pop |
| **DAG Edge Splines** | Hidden (`visible: false`) | Visible (`visible: true`): Quadratic Bézier splines connecting source desk center to target desk center |
| **Spline Visual Style** | N/A | Base line `2px` `#38BDF8` (`alpha: 0.45`) + outer glow `6px` (`alpha: 0.18`) + animated directional flow dashes + pill label (`edge.label`) at curve midpoint |
| **Active Handoff Pulse** | Flying packet only | Spline flashes bright `#F59E0B` (`width: 4px`, `alpha: 1.0`) while the Bézier data packet travels from Agent A to Agent B |
| **Agent Node Rings** | Shown only on hover/selection | Persistent `1px` colored ring (`agent.color`) under every agent + live state label pill |

---

## 3. Overhead Agent Bubble Specification (`BubbleRenderer.ts`)

- Positioned `8px` above the top of the agent's `32x32` bounding box (`y = -10` in local entity coordinates).
- **Status Bubble (`WORKING`)**:
  - Max width `160px`, single-line ellipsis truncation (`max 36 chars`), background `#0F172A` (`alpha: 0.92`), `1px` border in `agent.color`, `4px` downward pointer triangle.
- **Tool Call Badge (`TOOL_CALL`)**:
  - Compact `24x24px` pill badge with `#F59E0B` border and distinct pixel/vector icon:
    - `search`: Magnifying glass (`#38BDF8`)
    - `code`: Gear / terminal brackets (`#A855F7`)
    - `db`: Database cylinder (`#22C55E`)
    - `error`: Warning triangle (`#EF4444`)
- **Idle Watercooler Chat Bubble (`IDLE`, distance `<= 2 tiles`)**:
  - Speech bubble with `#10B981` border showing short randomized developer/office banter for `3500ms`.
