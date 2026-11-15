import type { FurnitureType, ZoneType } from './blueprint';

export type SpriteAssetCategory = 'AGENT' | 'FURNITURE';

export interface CustomSpriteAsset {
  id: string;
  name: string;
  category: SpriteAssetCategory;
  target_id: string; // Agent ID (e.g. "agent_researcher") or FurnitureType (e.g. "DESK_PC")
  tile_width: 32;
  tile_height: 32;
  rows: 4 | 1;
  frames_per_row: number;
  png_blob: Blob;
  data_url?: string;
  created_at: number;
}

/**
 * Stage 1 Semantic Topology Schema (LLM Output — Strictly NO (x, y) coordinates)
 */
export interface SemanticZoneSpec {
  id: string;
  name: string;
  type: ZoneType;
  props: Exclude<FurnitureType, 'DESK_PC'>[];
}

export interface SemanticAgentSpec {
  id: string;
  name: string;
  role: string;
  zone_id: string;
  color: string;
  avatar_sprite: string;
}

export interface SemanticEdgeSpec {
  from: string;
  to: string;
  label: string;
}

export interface Stage1SemanticTopology {
  project_name: string;
  zones: SemanticZoneSpec[];
  agents: SemanticAgentSpec[];
  edges: SemanticEdgeSpec[];
}
