import type { AgentEvent, ToolIconType } from './events';

export type AgentFsmState =
  | 'IDLE'
  | 'MOVING'
  | 'WORKING'
  | 'TOOL_CALL'
  | 'HANDOFF'
  | 'COMPLETE'
  | 'ERROR';

export interface QueuedAgentAction {
  event: AgentEvent;
  enqueuedAtMs: number;
}

export interface AgentRuntimeSnapshot {
  id: string;
  fsmState: AgentFsmState;
  statusText: string;
  activeToolIcon: ToolIconType | null;
  queueDepth: number;
  tokensUsed: number;
  eventsProcessed: number;
  currentFurnitureId: string | null;
}

export const FSM_CONSTANTS = {
  /** Minimum display duration for WORKING / TOOL_CALL states (ms) */
  MIN_ACTIVE_STATE_DURATION_MS: 1200,
  /** Inactivity timeout after AGENT_COMPLETE before walking to IDLE zone (ms) */
  IDLE_SLACKING_TIMEOUT_MS: 8000,
  /** Maximum Manhattan distance for physical walk handoff instead of Bézier packet */
  WALK_HANDOFF_MAX_TILES: 6,
  /** Maximum Manhattan distance between two IDLE agents to trigger watercooler chat */
  IDLE_CHAT_MAX_DISTANCE_TILES: 2,
  /** Duration of overhead watercooler chat bubble (ms) */
  IDLE_CHAT_DURATION_MS: 3600,
  /** Cooldown between watercooler chats for the same agent pair (ms) */
  IDLE_CHAT_COOLDOWN_MS: 9000,
} as const;
