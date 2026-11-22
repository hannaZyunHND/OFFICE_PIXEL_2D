export type AgentEventType =
  | 'AGENT_START'
  | 'AGENT_TOOL_CALL'
  | 'AGENT_HANDOFF'
  | 'AGENT_COMPLETE'
  | 'AGENT_ERROR'
  | 'HUMAN_APPROVAL';

export interface HitlChoiceOption {
  id: string;
  label: string;
  description?: string;
  default_selected?: boolean;
}

export interface HitlFormField {
  key: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  default_value?: string | number;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface HitlApprovalRequest {
  approval_id: string;
  agent_id: string;
  step_title: string;
  stage?: string;
  summary_md: string;
  choices?: HitlChoiceOption[];
  multi_select?: boolean;
  form_fields?: HitlFormField[];
  context_payload?: Record<string, unknown>;
  estimated_cost_usd?: number;
}

export interface HitlApprovalResponse {
  approval_id: string;
  decision: 'approve' | 'edit' | 'reject';
  selected_choices: string[];
  inputs: Record<string, string | number>;
  note?: string;
}

export interface ExternalToolMetadata {
  name: string;
  provider: string;
  description: string;
  cost_tier: 'free' | 'credit' | 'paid';
  estimated_cost_usd: number;
  requires_hitl: boolean;
  parameters_schema?: Record<string, unknown>;
  tags?: string[];
}

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
