# Design System Master File — Pixel Agent Office

> **HIERARCHICAL RETRIEVAL LOGIC:** When building a specific view or surface, first check `design-system/pixel-agent-office/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Pixel Agent Office — Framework-Agnostic 2D Multi-Agent Visual Renderer & Simulator
**Generated & Refined:** 2026-11-14
**Category:** Developer Tool / 2D Multi-Agent Telemetry Visualizer & Simulator
**Aesthetic Direction:** **Retro-Modern Pixel Observatory** (Dark OLED Telemetry HUD + Crisp `32x32px` 2D Pixel Art World)
**Design Dials:** Variance `7/10` (Asymmetric Canvas + Floating HUD) | Motion `6/10` (60 FPS Canvas + Snappy 150ms HUD) | Density `8/10` (High-Density Developer Telemetry)

---

## 1. Dual-Surface Architecture (HUD Layer vs. 2D Pixel Canvas)

Pixel Agent Office combines two distinct visual layers that must harmonize without visual clutter:
1. **Layer A — 2D Pixel Canvas (`PixiJS v8`, `z-index: 0`)**:
   - Full-viewport interactive stage (`100vw x 100vh`) with deep slate void backdrop (`#020617`).
   - Base tile unit: **`32x32px`**, rendered at **`2x` integer scale (`64x64px` screen pixels)** by default on desktop.
   - Strict pixel-art rendering: `image-rendering: pixelated` and `TextureStyle.defaultOptions.scaleMode = 'nearest'`. Never apply bilinear blur to tiles or sprites.
2. **Layer B — Retro-Modern Floating HUD (`Vue 3 + Tailwind CSS`, `z-index: 10–50`)**:
   - Translucent dark obsidian panels (`rgba(15, 23, 42, 0.88)` with `backdrop-filter: blur(8px)`) framed by crisp `1px` slate borders (`#334155`) and subtle pixel-bevel accents.
   - Uses `pointer-events: none` on full-screen HUD wrappers and `pointer-events: auto` only on interactive bars, drawers, and modals so canvas pan/zoom and agent clicking are never obstructed.

---

## 2. Three-Layer Color & Token System

All tokens are defined in [design-tokens.json](../../assets/design-tokens.json) and exposed as CSS variables in [design-tokens.css](../../assets/design-tokens.css).

### 2.1 Semantic HUD Palette (Dark OLED Theme)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Canvas Void** | `#020617` | `--color-canvas-void` | Infinite background outside office walls |
| **HUD Surface Primary** | `#0F172A` | `--color-background` | Main HUD bar, Inspector drawer background |
| **HUD Surface Elevated** | `#1E293B` | `--color-card` | Cards, payload code boxes, modal body |
| **HUD Surface Muted** | `#272F42` | `--color-muted` | Inactive tabs, table headers, hover fills |
| **Foreground Primary** | `#F8FAFC` | `--color-foreground` | Primary labels, agent names, headers |
| **Foreground Muted** | `#94A3B8` | `--color-muted-foreground` | Timestamps, grid coordinates, secondary metadata |
| **Accent / Run CTA** | `#22C55E` | `--color-accent` | "▶ Run Demo Simulation" button, `WORKING` indicator |
| **God-View Cyan** | `#38BDF8` | `--color-godview` | God-View (`Tab`) active state, DAG spline base glow |
| **Handoff Amber** | `#F59E0B` | `--color-handoff` | Bézier handoff packet glow, `TOOL_CALL` badge |
| **Edit Mode Violet** | `#A855F7` | `--color-editmode` | Map Editor active toggle, selected furniture outline |
| **Error / Collision Red** | `#EF4444` | `--color-destructive` | `AGENT_ERROR` state, Collision Map blocked tiles (`rgba(239,68,68,0.35)`) |
| **Border Default** | `#334155` | `--color-border` | Crisp 1px HUD borders and dividers |

### 2.2 2D Pixel Office Zone & Procedural Asset Palette

To ensure the zero-asset Procedural Pixel Graphics (`PIXI.Graphics`) look like an authentic, high-contrast 2D game right out of the box:

| Canvas Element | Base Fill | Checker / Highlight | Border / Outline | Notes |
|----------------|-----------|---------------------|------------------|-------|
| **`WORK` Zone Floor** | `#1E293B` | `#243247` (checkerboard) | `#38BDF8` (`1px` dashed zone border) | Cool tech slate floor for focus & coding |
| **`APPROVAL` Zone Floor** | `#2E1F3E` | `#38264B` (checkerboard) | `#C084FC` (`1px` dashed zone border) | Executive royal plum floor for review/boss |
| **`IDLE` Pantry Floor** | `#1F2E2B` | `#263935` (checkerboard) | `#34D399` (`1px` dashed zone border) | Warm emerald-slate tile for coffee & sofa lounge |
| **Outer Walls** | `#090D16` | `#475569` (top cap) | `#020617` | `32x32` brick/panel wall with 4px top highlight |
| **`DESK_PC` (`2x1`)** | `#78350F` (wood) | `#92400E` (grain) | `#451A03` | Monitor dark `#1E293B` when off; glowing `#38BDF8` / `#22C55E` when `WORKING` |
| **`COFFEE_MACHINE` (`1x1`)** | `#374151` | `#EF4444` (brew LED) | `#111827` | Emits rising white steam pixel particles during `IDLE` interaction |
| **`SOFA` (`2x1`)** | `#4F46E5` | `#6366F1` (cushion) | `#312E81` | Cozy indigo lounge couch in `IDLE` zone |
| **`PLANT` (`1x1`)** | `#15803D` (leaves) | `#22C55E` (tips) | `#9A3412` (terracotta pot) | Decorative obstacle (`1x1` footprint) |

### 2.3 Agent FSM Status Color Coding

| FSM State | Badge / Bubble Accent | Hex | Canvas Visual Indicator |
|-----------|-----------------------|-----|-------------------------|
| `IDLE` | Emerald Muted | `#10B981` | Relaxed breathing bob (`1px` at `0.5Hz`), optional watercooler chat bubble |
| `MOVING` | Sky Cyan | `#38BDF8` | 4-directional walking leg alternation (`8 FPS` sprite cycle) along A* path |
| `WORKING` | Neon Green | `#22C55E` | Seated facing PC, monitor screen illuminated, rapid typing hands + status text bubble |
| `TOOL_CALL` | Amber Gold | `#F59E0B` | Overhead pulsing badge with crisp pixel SVG icon (`search`, `code`, `db`, `error`) |
| `HANDOFF` | Electric Purple | `#C084FC` | Glowing Bézier data packet (`#F59E0B` → `#38BDF8`) flying from source desk to target desk |
| `COMPLETE` | Bright Mint | `#4ADE80` | Checkmark bubble (`✓`), `8000ms` countdown bar before returning to `IDLE` |
| `ERROR` | Crimson Alert | `#EF4444` | Red pulsing warning triangle + shake micro-animation |

---

## 3. Typography System

Combines developer-grade monospace precision for telemetry/coordinates with a clean geometric sans-serif for Vietnamese + English UI labels and a crisp pixel display font for canvas headers.

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Silkscreen:wght@400;700&display=swap');
```

| Token | Font Stack | Size / Line-Height | Usage |
|-------|------------|--------------------|-------|
| `--font-pixel` | `'Silkscreen', 'JetBrains Mono', monospace` | `12px–16px` / `1.2` | Brand title, Zone headers on canvas, Mode banners (`GOD-VIEW`, `EDIT MODE`) |
| `--font-mono` | `'JetBrains Mono', monospace` | `11px–14px` / `1.35` | FSM state pills, token counters, `(x, y)` coordinates, JSON payload viewer, event timestamps |
| `--font-sans` | `'IBM Plex Sans', system-ui, sans-serif` | `13px–16px` / `1.5` | Vietnamese & English descriptions, agent roles, speech bubbles, modal instructions |

---

## 4. Spacing, Elevation & Z-Index Layering

### 4.1 High-Density Dashboard Spacing (`Density: 8/10`)
- `--space-2xs`: `2px` (pixel border offsets, badge padding)
- `--space-xs`: `4px` (inline icon gaps)
- `--space-sm`: `8px` (HUD button internal padding, compact list rows)
- `--space-md`: `12px` (card & drawer section padding)
- `--space-lg`: `16px` (panel outer padding)
- `--space-xl`: `24px` (modal padding)

### 4.2 Z-Index Hierarchy (Strict Non-Overlapping Contract)

| Z-Index | Layer Name | Component / Canvas Container |
|---------|------------|------------------------------|
| `0` | `canvas-floor` | PixiJS Floor tiles, Zone rectangles & Zone labels |
| `1` | `canvas-grid-collision` | Edit Mode `32x32` Grid lines & Red Collision Map (`rgba(239,68,68,0.35)`) |
| `2` | `canvas-dag-splines` | God-View (`Tab`) glowing DAG splines between desks |
| `3` | `canvas-entities` | Y-sorted Furniture (`DESK_PC`, `SOFA`) and `AgentEntity` sprites |
| `4` | `canvas-handoff-fx` | Flying Bézier handoff packets & coffee steam particles |
| `5` | `canvas-bubbles` | Overhead Agent Status Bubbles, Tool Icons & Idle Chat Bubbles |
| `10` | `hud-floating` | Bottom Simulator Control Bar & Mode Status Banner |
| `20` | `hud-topbar` | Top HUD Navigation & Status Bar (`height: 48px`) |
| `30` | `hud-drawer` | Right-side Agent Telemetry Inspector Drawer (`width: 380px`) |
| `40` | `hud-modals` | AI Markdown-to-Office Compiler Modal & Custom Asset Loader Modal |
| `50` | `hud-toasts` | Connection alerts, validation warnings & compile notifications |

---

## 5. Procedural Pixel Avatar Anatomy (`32x32px` Zero-Asset Specification)

When no custom `.png` sprite sheet is uploaded in `IndexedDB`, `ProceduralSprites.ts` MUST draw each `AgentEntity` inside a `32x32px` local coordinate grid using crisp integer rectangles:
- **Drop Shadow**: `y: 26..29, x: 9..23` — translucent black oval (`rgba(0,0,0,0.45)`).
- **Legs / Boots**: `y: 22..27` — two `4x5px` dark slate boots (`#1E293B`) that alternate `±2px` vertically during `MOVING`.
- **Torso / Role Coat**: `y: 13..22, x: 9..23` (`14x9px`) — colored with `agent.color` (e.g., `#38BDF8`) plus a `2px` darker shading edge on the right/bottom for 2.5D depth.
- **Head**: `y: 4..13, x: 10..22` (`12x9px`) — warm pixel skin tone (`#FDBA74`) with hair cap (`y: 3..6`).
- **Directional Eyes (`facing` indicator)**:
  - `DOWN`: Two `2x2px` dark eyes (`#0F172A`) with `1px` white catchlight at `x: 12, y: 8` and `x: 18, y: 8`.
  - `LEFT`: Single `2x2px` eye on left profile (`x: 11, y: 8`), nose pixel at `x: 9, y: 9`.
  - `RIGHT`: Single `2x2px` eye on right profile (`x: 19, y: 8`), nose pixel at `x: 22, y: 9`.
  - `UP`: Full back-of-head hair cap (`y: 4..11, x: 10..22`) so the user clearly sees the character facing away toward an upper desk/monitor.

---

## 6. Anti-Patterns & Guardrails (CRITICAL)

- ❌ **NEVER bind PixiJS `(x, y)` or animation frame state to Vue `ref`/`reactive`/Pinia**: All 60Hz spatial updates stay inside `src/engine/`.
- ❌ **NEVER use blurred/anti-aliased canvas scaling**: Enforce `image-rendering: pixelated` on `<canvas>` and `scaleMode = 'nearest'` on all PixiJS textures.
- ❌ **NEVER render raw >10KB JSON strings in the DOM**: Always display `StoredTelemetryEvent.input_preview` / `output_preview` (capped at `10KB`) with a **"Download Full JSON"** button.
- ❌ **NEVER use emojis as primary UI icons**: Use `lucide-vue-next` SVG icons in Vue HUD components and crisp procedural pixel icons on the PixiJS canvas.
- ❌ **NEVER block canvas pointer events with invisible HUD containers**: Root HUD overlays must use `pointer-events-none`, enabling `pointer-events-auto` only on child panels.
