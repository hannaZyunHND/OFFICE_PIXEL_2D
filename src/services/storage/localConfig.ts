import {
  DEFAULT_CREWAI_WS_ORIGIN,
  normalizeLegacyCrewWsUrl,
} from '@/config/runtimeEndpoints';

export type LlmProviderType = 'gemini' | 'openai';
export type TransportMode = 'mock' | 'websocket' | 'postmessage';
export type HitlPolicyMode = 'standard_2_gates' | 'heavy_tools_only' | 'auto_skip';

export interface ProviderExtrasConfig {
  addlivetagApiKey: string;
  apifyApiToken: string;
  serperApiKey: string;
  apifyMaxItemsPerPlatform: number;
  hitlPolicy: HitlPolicyMode;
  allowSandboxFallback: boolean;
}

export interface LocalOfficeSettings {
  llmProvider: LlmProviderType;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  wsEndpoint: string;
  transportMode: TransportMode;
  simulationSpeed: 1 | 2;
  extras: ProviderExtrasConfig;
  extrasPolicyMigratedV2?: boolean;
}

const STORAGE_KEY = 'pixel_agent_office_settings_v1';

const DEFAULT_EXTRAS: ProviderExtrasConfig = {
  addlivetagApiKey: '',
  apifyApiToken: '',
  serperApiKey: '',
  apifyMaxItemsPerPlatform: 20,
  hitlPolicy: 'auto_skip',
  allowSandboxFallback: true,
};

const DEFAULT_SETTINGS: LocalOfficeSettings = {
  llmProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',
  wsEndpoint: `${DEFAULT_CREWAI_WS_ORIGIN}/events`,
  transportMode: 'mock',
  simulationSpeed: 1,
  extras: { ...DEFAULT_EXTRAS },
  extrasPolicyMigratedV2: true,
};

export function loadLocalSettings(): LocalOfficeSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, extras: { ...DEFAULT_EXTRAS } };
    const parsed = JSON.parse(raw) as Partial<LocalOfficeSettings>;
    const needsAutoPolicyMigration = !parsed.extrasPolicyMigratedV2;
    const normalizedWs = normalizeLegacyCrewWsUrl(parsed.wsEndpoint || DEFAULT_SETTINGS.wsEndpoint);
    const mergedExtras: ProviderExtrasConfig = {
      ...DEFAULT_EXTRAS,
      ...(parsed.extras || {}),
      ...(needsAutoPolicyMigration ? { hitlPolicy: 'auto_skip' } : {}),
    };
    const nextSettings: LocalOfficeSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      wsEndpoint: normalizedWs,
      extras: mergedExtras,
      extrasPolicyMigratedV2: true,
    };
    if (needsAutoPolicyMigration || normalizedWs !== parsed.wsEndpoint) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    }
    return nextSettings;
  } catch {
    return { ...DEFAULT_SETTINGS, extras: { ...DEFAULT_EXTRAS } };
  }
}

export function saveLocalSettings(settings: LocalOfficeSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[LocalConfig] Failed to save settings to localStorage:', err);
  }
}
