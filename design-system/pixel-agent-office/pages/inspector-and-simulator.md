# Page Override: Telemetry Inspector Drawer & Mock Simulator Panel (`inspector-and-simulator`)

> **Overrides:** [MASTER.md](../MASTER.md) for `AgentInspectorDrawer.vue`, `PayloadViewerCard.vue`, and `SimulatorControlBar.vue`.

---

## 1. Right-Side Agent Telemetry Inspector Drawer (`AgentInspectorDrawer.vue`)

- **Position & Dimensions**: Fixed right slide-over panel (`top: 48px; right: 0; bottom: 0; width: 380px; z-index: 30`), background `rgba(15, 23, 42, 0.95)`, left border `1px solid #334155`.
- **Slide Transition**: `transform 180ms cubic-bezier(0.16, 1, 0.3, 1)` (`translateX(100%)` → `translateX(0)`).
- **Internal Structure (4 Vertical Sections)**:
  1. **Agent Identity Header (`padding: 12px 16px`)**:
     - `32x32px` live preview of the agent's avatar (scaled `1.5x` to `48x48px`) with colored ring (`agent.color`).
     - Agent Name (`15px` bold `#F8FAFC`), Role subtitle (`12px` `#94A3B8`), and Desk ID badge (`furn_desk_1` in `--font-mono`).
     - Live FSM State Pill (`IDLE` / `MOVING` / `WORKING` / `TOOL_CALL` / `HANDOFF` / `COMPLETE` / `ERROR`).
  2. **Telemetry KPI Strip (`grid-cols-3 gap-2 px-4 py-2 bg-[#1E293B]/60 border-y border-[#334155]`)**:
     - **Total Tokens**: Cumulative `tokens_used` for this agent formatted in `--font-mono` (`e.g., 2,450 tok`).
     - **Queue Depth**: Current items waiting in `AgentEntity.eventQueue` (`e.g., 2 queued`).
     - **Events Logged**: Count of events for this agent in the `200-event` Ring Buffer.
  3. **Latest Input / Output Payload Accordion (`px-4 py-3`)**:
     - Displays `input_preview` and `output_preview` in a scrollable monospace code box (`max-height: 160px`, `--font-mono`, `11.5px`, background `#020617`, border `#334155`).
     - **10KB Truncation Banner**: Whenever `input_truncated` or `output_truncated` is `true`, display an amber badge (`"Truncated to 10KB for memory safety"`) paired with an interactive **"⬇ Download Full JSON"** button (`cursor-pointer text-[#38BDF8] hover:underline`).
  4. **Per-Agent Event Timeline (`flex-1 overflow-y-auto px-4 py-2`)**:
     - Reverse-chronological list of events from the Ring Buffer filtered by `agent_id` (with a toggle to view **All Office Events (`max 200`)**).
     - Each row displays timestamp (`HH:mm:ss.SSS`), event type badge, duration (`1850ms`), and `status_text`.

---

## 2. Bottom Mock Scenario Simulator Control Bar (`SimulatorControlBar.vue`)

- **Position**: Floating bottom-center HUD dock (`fixed bottom-4 left-1/2 -translate-x-1/2 z-10`), background `rgba(15, 23, 42, 0.92)`, border `1px solid #334155`, `border-radius: 10px`, `padding: 8px 14px`.
- **Controls**:
  - **Transport Selector Dropdown**:
    1. `Built-in Mock Simulator` (Default)
    2. `WebSocket Client (ws:// / wss://)`
    3. `Window postMessage / BroadcastChannel`
  - **Scenario Preset Selector** (when Mock Simulator active):
    - `"Autonomous 4-Agent Research Crew (Default)"`
    - `"High-Frequency Burst Stress Test (5 Events / 0.5s)"`
    - `"Idle Pantry & Watercooler Chat Demo (8s Timeout)"`
  - **Playback Controls**:
    - `▶ Play / ⏸ Pause`
    - `⏭ Step Next Event` (manual single-step debugging)
    - `⚡ Trigger 5x Burst` (demonstrates Per-Agent Event Queue `1200ms` throttling)
    - Speed multiplier toggle: `1x` | `2x`
  - **Ring Buffer Memory Gauge**: Compact pill showing `Events: 42 / 200` so the user can visually verify the memory cap in real time.
