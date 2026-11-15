export type CrewRunStatus = 'running' | 'completed' | 'error';

export interface CrewRunRecord {
  id: string;
  workflow_id: string;
  workflow_name: string;
  endpoint_url: string;
  prompt: string;
  attached_file_name: string;
  attached_file_preview: string;
  status: CrewRunStatus;
  started_at: number;
  finished_at: number | null;
  elapsed_seconds: number | null;
  llm_engine: string;
  total_tokens: number;
  qa_score: number | null;
  qa_decision: string;
  portal_url: string;
  result_url: string;
  zip_url: string;
  zip_filename: string;
  result_json: string;
  error_message: string;
  event_count?: number;
}

export interface CrewRunEventRecord {
  id?: number;
  run_id: string;
  seq: number;
  event_id: string;
  timestamp: number;
  event_type: string;
  agent_id: string;
  agent_name: string;
  target_agent_id: string;
  status_text: string;
  icon: string;
  tokens_used: number;
  payload_json: string;
}

export interface CrewRunDetail {
  run: CrewRunRecord;
  events: CrewRunEventRecord[];
}
