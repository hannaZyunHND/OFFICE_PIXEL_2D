export type AgentEventType =
  | 'AGENT_START'
  | 'AGENT_TOOL_CALL'
  | 'AGENT_HANDOFF'
  | 'AGENT_COMPLETE'
  | 'AGENT_ERROR';

export type ToolIconType = 'search' | 'code' | 'db' | 'error' | 'message' | 'check';

export type IdleHobbyIconType =
  | 'lol_game'
  | 'music_sing'
  | 'sleepy_yawn'
  | 'ps5_pes';

export interface AgentEventMetadata {
  status_text?: string;
  icon?: ToolIconType;
  input_payload?: Record<string, unknown> | string | unknown[];
  output_payload?: Record<string, unknown> | string | unknown[];
  tokens_used?: number;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface AgentEvent {
  event_id: string;
  timestamp: number;
  event_type: AgentEventType;
  agent_id: string;
  target_agent_id?: string;
  metadata: AgentEventMetadata;
}

export interface StoredTelemetryEvent extends AgentEvent {
  received_at_ms: number;
  input_truncated: boolean;
  output_truncated: boolean;
  input_preview: string;
  output_preview: string;
  input_byte_length: number;
  output_byte_length: number;
  full_input_json?: string;
  full_output_json?: string;
}
