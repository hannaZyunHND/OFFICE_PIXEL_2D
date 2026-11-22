const rawPort = Number(import.meta.env?.VITE_CREWAI_PORT || 34214);

export const DEFAULT_CREWAI_PORT =
  Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 34214;

export const DEFAULT_CREWAI_WS_ORIGIN = (
  import.meta.env?.VITE_CREWAI_WS_URL || `ws://localhost:${DEFAULT_CREWAI_PORT}`
)
  .trim()
  .replace(/\/+$/, '');

export const DEFAULT_CREWAI_HTTP_ORIGIN = (
  import.meta.env?.VITE_CREWAI_HTTP_URL || `http://localhost:${DEFAULT_CREWAI_PORT}`
)
  .trim()
  .replace(/\/+$/, '');

/**
 * Rewrites legacy local ports (8765/8766/8767) saved in older SQLite or localStorage
 * entries to the currently configured env CrewAI origin (default ws://localhost:34214).
 */
export function normalizeLegacyCrewWsUrl(url?: string | null): string {
  const clean = (url || '').trim();
  if (!clean) return DEFAULT_CREWAI_WS_ORIGIN;
  return clean.replace(
    /^ws:\/\/(?:localhost|127\.0\.0\.1):(?:8765|8766|8767)\b/i,
    DEFAULT_CREWAI_WS_ORIGIN,
  );
}
