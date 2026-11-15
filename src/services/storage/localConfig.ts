export type LlmProviderType = 'gemini' | 'openai';
export type TransportMode = 'mock' | 'websocket' | 'postmessage';

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
}

const STORAGE_KEY = 'pixel_agent_office_settings_v1';

const DEFAULT_SETTINGS: LocalOfficeSettings = {
  llmProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',
  wsEndpoint: 'ws://localhost:8765/events',
  transportMode: 'mock',
  simulationSpeed: 1,
};

export function loadLocalSettings(): LocalOfficeSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<LocalOfficeSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveLocalSettings(settings: LocalOfficeSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[LocalConfig] Failed to save settings to localStorage:', err);
  }
}
