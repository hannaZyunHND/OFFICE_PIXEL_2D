# Page Override: Interactive Map Editor, AI Markdown Compiler & Asset Loader (`map-editor-and-compiler`)

> **Overrides:** [MASTER.md](../MASTER.md) for `MapEditorLayer.ts`, `MapEditorToolbar.vue`, `MarkdownCompilerModal.vue`, and `CustomAssetLoaderModal.vue`.

---

## 1. Interactive Map Editor (`Edit Mode`)

When the user toggles **Edit Mode** in the Top HUD Bar:
1. **Canvas Visual Overlays (`MapEditorLayer.ts`)**:
   - **Grid Overlay**: Crisp `1px` grid lines (`rgba(148, 163, 184, 0.22)`) drawn every `32x32px` tile across `grid_cols x grid_rows`, with `(col, row)` coordinate tooltip following the cursor.
   - **Collision Map Overlay**: Every blocked tile (`walkability[y][x] === 1`, including outer walls and furniture `footprint: [w, h]`) renders a translucent crimson fill (`rgba(239, 68, 68, 0.32)`) with a `1px` `#EF4444` border.
   - **Interaction Point Marker**: Each furniture item's `interaction_point: [ix, iy]` renders a small emerald directional arrow (`#22C55E`) indicating the exact tile where an agent stands and its `facing` orientation (`UP`, `DOWN`, `LEFT`, `RIGHT`).
2. **Drag-and-Drop & Footprint Validation**:
   - Hovering over any furniture item shows a violet selection outline (`2px solid #A855F7`) and `cursor: grab`.
   - While dragging (`cursor: grabbing`), the furniture snaps to integer grid coordinates `(x, y)`.
   - **Live Placement Preview**:
     - **Valid Drop**: Footprint preview outline is Emerald (`#22C55E`) when all footprint tiles are inside a zone, do not overlap other furniture/walls, and the `interaction_point` remains walkable.
     - **Invalid Drop**: Footprint preview outline turns Crimson (`#EF4444`) if overlapping another object or out of bounds; releasing the mouse snaps the item back to its previous valid `(x, y)` coordinate.
   - Upon a valid drop, `GridPathfinder.ts` immediately updates the `EasyStar.js` collision matrix and recalculates any active agent paths.
3. **Floating Map Editor Toolbar (`MapEditorToolbar.vue`)**:
   - Positioned below the Top HUD Bar (`top: 60px; left: 16px; z-index: 20`).
   - Tools: **Select/Move**, **Rotate Facing (`R`)**, **Add Furniture (`DESK_PC`, `COFFEE_MACHINE`, `SOFA`, `PLANT`, `AQUARIUM`, `WHITEBOARD`)**, **Delete Selected (`Del`)**, **Export `OfficeBlueprint.json`**, and **Reset to Default Layout**.

---

## 2. AI Markdown-to-Office Compiler Modal (`MarkdownCompilerModal.vue`)

- **Dimensions**: Centered modal (`max-width: 760px`, `width: 92vw`, background `#0F172A`, border `1px solid #334155`, `border-radius: 12px`, `z-index: 40`).
- **Two-Column / Stepper Workflow UI**:
  - **Top Provider & API Key Bar**:
    - Provider selector: `Google Gemini (@google/genai - gemini-2.5-flash)` or `OpenAI (gpt-4o-mini)`.
    - Password input for API Key (persisted in `localStorage` with a `"Saved locally in browser"` security badge).
    - **"Try Offline Sample Markdown"** quick-fill button (allows testing Stage 2 Deterministic Auto-Layout even without an API key using pre-extracted or rule-parsed Markdown).
  - **Left Pane — Markdown Input**:
    - Drag-and-drop `.md` file zone or monospace textarea (`height: 280px`) pre-populated with a realistic multi-agent workflow template (e.g., LangGraph / CrewAI architecture spec).
  - **Right Pane — Two-Stage Pipeline Visualizer**:
    - **Stage 1 Status (`LLM Semantic Topology`)**: Displays extracted counts (`3 Zones`, `5 Agents`, `6 Edges` — strictly `0` coordinates) with collapsible JSON preview.
    - **Stage 2 Status (`Deterministic Auto-Layout Engine`)**: Displays computed grid dimensions (`28x18 tiles`), walkability validation (`100% A* reachable, >= 1 tile clearance`), and a **"🚀 Apply Blueprint to Office"** primary CTA button.

---

## 3. Custom Sprite Sheet Asset Loader Modal (`CustomAssetLoaderModal.vue`)

- **Purpose**: Upload and manage `32x32px` `.png` sprite sheets persisted in `IndexedDB` (`pixel_agent_office_db`).
- **UI Features**:
  - **Upload Dropzone**: Accepts `.png` files; validates image dimensions are multiples of `32px` (e.g., `96x128px` or `128x128px` for 4-row directional agent sheets: `Row 0: Down`, `Row 1: Left`, `Row 2: Right`, `Row 3: Up`).
  - **Live 4-Direction Animation Preview**: Renders a `64x64px` (`2x` magnified) pixelated preview box cycling through the uploaded `Down / Left / Right / Up` frames at `8 FPS` before saving.
  - **Assignment Matrix**: Dropdown to bind the uploaded asset to any specific `AgentBlueprint.id` (e.g., `Alice (Researcher)`) or `FurnitureType` (e.g., `DESK_PC`), with a **"Revert to Procedural Pixel Art"** button at any time.
