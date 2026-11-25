import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  buildDefaultSeedWorkflows,
  generateCrewAiIntegrationDoc,
  type StoredWorkflowRecord,
} from '@/services/compiler/workflowGenerator';
import {
  decorateBlueprintWithRichFurniture,
  ensureDirectorRoomAndFurniture,
  findBestSlotForFurniture,
  generateProductHunterMinimalBlueprint,
} from '@/services/compiler/deterministicLayoutEngine';
import {
  PRODUCT_HUNTER_MARKDOWN,
  parseMarkdownDeterministically,
} from '@/services/compiler/llmTopologyExtractor';
import {
  getCanonicalFootprint,
  type OfficeBlueprint,
} from '@/types/blueprint';
import { useBlueprintStore } from './useBlueprintStore';
import { useSettingsStore } from './useSettingsStore';
import { pickRandomAgentAvatarId } from '@/data/agentAvatarCatalog';
import { normalizeLegacyCrewWsUrl } from '@/config/runtimeEndpoints';

const LOCAL_MIRROR_KEY = 'pixel_office_sqlite_workflows_mirror_v1';
const RETIRED_WORKFLOW_IDS = new Set([
  'game_factory_crewai',
  'research_crew_full',
  'cybersec_product_crew',
]);

function withoutRetiredWorkflows(
  list: StoredWorkflowRecord[],
): StoredWorkflowRecord[] {
  return list.filter((workflow) => !RETIRED_WORKFLOW_IDS.has(workflow.id));
}

export const useWorkflowStore = defineStore('workflow', () => {
  const blueprintStore = useBlueprintStore();
  const settingsStore = useSettingsStore();

  const workflows = ref<StoredWorkflowRecord[]>(buildDefaultSeedWorkflows());
  const activeWorkflowId = ref<string>('product_hunter_v2_crewai');
  const sqliteReady = ref<boolean>(false);
  const lastSavedAt = ref<number>(Date.now());

  const activeWorkflow = computed<StoredWorkflowRecord | undefined>(
    () =>
      workflows.value.find((w) => w.id === activeWorkflowId.value) ||
      workflows.value[0],
  );

  async function initWorkflows(): Promise<void> {
    const defaults = buildDefaultSeedWorkflows();
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        const dbList: StoredWorkflowRecord[] = withoutRetiredWorkflows(
          Array.isArray(data.workflows) ? data.workflows : [],
        );
        const retiredIds = (Array.isArray(data.workflows) ? data.workflows : [])
          .map((workflow: StoredWorkflowRecord) => workflow.id)
          .filter((id: string) => RETIRED_WORKFLOW_IDS.has(id));

        if (dbList.length === 0) {
          await fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflows: defaults }),
          });
          workflows.value = defaults;
        } else {
          // Automatically enrich any office in SQLite that still has < 30 furniture items
          // OR whose Eco-Zone items still use legacy small footprints (< 4x3 for ECO_BIOME_DOME)
          let upgradedAny = false;
          const enrichedDbList = dbList.map((w) => {
            const normalizedEndpoint = normalizeLegacyCrewWsUrl(
              w.crew_endpoint_url,
            );
            const needsEndpointMigration =
              normalizedEndpoint !== w.crew_endpoint_url;
            if (needsEndpointMigration) {
              upgradedAny = true;
            }
            const nextDoc = needsEndpointMigration
              ? generateCrewAiIntegrationDoc(
                  w.blueprint,
                  w.id,
                  w.raw_requirement,
                  normalizedEndpoint,
                )
              : w.integration_doc_md;

            const furnList = w.blueprint?.furniture || [];
            if (w.id === 'product_hunter_crewai') {
              const hunterSeed = defaults.find((d) => d.id === 'product_hunter_crewai');
              const needsMinimalUpgrade =
                w.blueprint?.meta?.layout_profile !== 'product_hunter_minimal_v4';
              const needsCopyRefresh = Boolean(
                hunterSeed &&
                  (w.name !== hunterSeed.name || w.description !== hunterSeed.description),
              );
              if (needsMinimalUpgrade || needsCopyRefresh || needsEndpointMigration) {
                upgradedAny = true;
                const minimalBp =
                  needsMinimalUpgrade || needsCopyRefresh
                    ? generateProductHunterMinimalBlueprint(
                        parseMarkdownDeterministically(
                          hunterSeed?.raw_requirement ||
                            w.raw_requirement ||
                            PRODUCT_HUNTER_MARKDOWN,
                        ),
                      )
                    : w.blueprint;
                return {
                  ...w,
                  name: hunterSeed?.name || w.name,
                  description: hunterSeed?.description || w.description,
                  raw_requirement: hunterSeed?.raw_requirement || w.raw_requirement,
                  crew_endpoint_url: normalizedEndpoint,
                  integration_doc_md: generateCrewAiIntegrationDoc(
                    minimalBp,
                    w.id,
                    hunterSeed?.raw_requirement || w.raw_requirement,
                    normalizedEndpoint,
                  ),
                  avatar_catalog_v2: true,
                  minimal_layout_v1: true,
                  blueprint: minimalBp,
                };
              }
              return w;
            }
            if (w.id === 'product_hunter_v2_crewai') {
              const v2Seed = defaults.find((d) => d.id === 'product_hunter_v2_crewai');
              const needsV2Layout =
                w.blueprint?.meta?.layout_profile !== 'product_hunter_v2_v1';
              const needsV2Copy = Boolean(
                v2Seed &&
                  (w.name !== v2Seed.name || w.description !== v2Seed.description),
              );
              if ((needsV2Layout || needsV2Copy || needsEndpointMigration) && v2Seed) {
                upgradedAny = true;
                const nextBp =
                  needsV2Layout || needsV2Copy ? v2Seed.blueprint : w.blueprint;
                return {
                  ...w,
                  name: v2Seed.name,
                  description: v2Seed.description,
                  raw_requirement: v2Seed.raw_requirement,
                  crew_endpoint_url: normalizeLegacyCrewWsUrl(v2Seed.crew_endpoint_url),
                  integration_doc_md: generateCrewAiIntegrationDoc(
                    nextBp,
                    w.id,
                    v2Seed.raw_requirement,
                    normalizeLegacyCrewWsUrl(v2Seed.crew_endpoint_url),
                  ),
                  avatar_catalog_v2: true,
                  blueprint: nextBp,
                };
              }
              return w;
            }
            const ecoDome = furnList.find((f) => f.type === 'ECO_BIOME_DOME');
            const needsEcoUpgrade = !ecoDome || ecoDome.footprint[0] < 4;
            const hasLegacyUnswappedQuarterTurn = furnList.some((f) => {
              if (f.facing !== 'LEFT' && f.facing !== 'RIGHT') return false;
              const [cw, ch] = getCanonicalFootprint(f.type);
              return cw !== ch && f.footprint[0] === cw && f.footprint[1] === ch;
            });
            const needsDirectorRoom =
              !w.blueprint?.zones?.some((z) => z.type === 'DIRECTOR') ||
              !furnList.some((f) => f.type === 'DIRECTOR_DESK');
            const needsPs5Upgrade = !furnList.some(
              (f) => f.type === 'PS5_PES_STATION',
            );
            const needsAvatarDiversification =
              !w.avatar_catalog_v2 &&
              (w.blueprint?.agents?.length ?? 0) > 0 &&
              w.blueprint.agents.every(
                (a) => !a.avatar_sprite || a.avatar_sprite.startsWith('default_'),
              );

            const applyRandomAvatarVariety = (bp: OfficeBlueprint): OfficeBlueprint => {
              const used: string[] = [];
              return {
                ...bp,
                agents: bp.agents.map((a) => {
                  if (a.avatar_sprite === 'director_ceo') return a;
                  const sprite = pickRandomAgentAvatarId({ excludeIds: used });
                  used.push(sprite);
                  return { ...a, avatar_sprite: sprite };
                }),
              };
            };

            if (
              furnList.length < 30 ||
              needsEcoUpgrade ||
              hasLegacyUnswappedQuarterTurn
            ) {
              upgradedAny = true;
              const baseBp: OfficeBlueprint = JSON.parse(JSON.stringify(w.blueprint));
              if ((needsEcoUpgrade || hasLegacyUnswappedQuarterTurn) && furnList.length >= 30) {
                // Keep all agent desks and user-spawned items, and re-layout auto-decorated items with grand Eco-Zone footprints
                baseBp.furniture = baseBp.furniture.filter(
                  (f) =>
                    Boolean(f.agent_id) ||
                    f.type === 'DESK_PC' ||
                    f.type === 'DIRECTOR_DESK' ||
                    f.id.includes('_spawn_'),
                );
              }
              let enrichedBp = decorateBlueprintWithRichFurniture(
                baseBp,
                45,
              );
              if (needsAvatarDiversification) {
                enrichedBp = applyRandomAvatarVariety(enrichedBp);
              }
              return {
                ...w,
                crew_endpoint_url: normalizedEndpoint,
                integration_doc_md: nextDoc,
                avatar_catalog_v2: true,
                blueprint: enrichedBp,
              };
            }
            if (needsDirectorRoom || needsPs5Upgrade || needsAvatarDiversification) {
              upgradedAny = true;
              let nextBp: OfficeBlueprint = needsDirectorRoom
                ? ensureDirectorRoomAndFurniture(w.blueprint)
                : JSON.parse(JSON.stringify(w.blueprint));
              if (!nextBp.furniture.some((f) => f.type === 'PS5_PES_STATION')) {
                const ps5Slot = findBestSlotForFurniture(
                  nextBp,
                  'PS5_PES_STATION',
                  [2, 1],
                  'IDLE',
                  'ps5_pes',
                );
                if (ps5Slot) {
                  nextBp = {
                    ...nextBp,
                    furniture: [...nextBp.furniture, ps5Slot],
                  };
                }
              }
              if (needsAvatarDiversification) {
                nextBp = applyRandomAvatarVariety(nextBp);
              }
              return {
                ...w,
                crew_endpoint_url: normalizedEndpoint,
                integration_doc_md: nextDoc,
                avatar_catalog_v2: true,
                blueprint: nextBp,
              };
            }
            if (needsEndpointMigration) {
              return {
                ...w,
                crew_endpoint_url: normalizedEndpoint,
                integration_doc_md: nextDoc,
              };
            }
            return w;
          });

          const existingIds = new Set(enrichedDbList.map((w) => w.id));
          const missingSeeds = defaults.filter((d) => !existingIds.has(d.id));
          const mergedList = [
            ...enrichedDbList,
            ...missingSeeds,
          ];
          workflows.value = mergedList;

          if (upgradedAny || missingSeeds.length > 0) {
            await fetch('/api/workflows', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workflows: mergedList }),
            });
          }
        }
        await Promise.all(
          retiredIds.map((id) =>
            fetch(`/api/workflows?id=${encodeURIComponent(id)}`, {
              method: 'DELETE',
            }),
          ),
        );
        sqliteReady.value = true;
        saveLocalMirror(workflows.value);
      } else {
        loadFromLocalMirror(defaults);
      }
    } catch {
      loadFromLocalMirror(defaults);
    }

    const targetId = workflows.value.some((w) => w.id === activeWorkflowId.value)
      ? activeWorkflowId.value
      : workflows.value[0]?.id;
    if (targetId) {
      activateWorkflow(targetId);
    }
  }

  function activateWorkflow(
    workflowId: string,
    options?: { keepEndpoint?: boolean },
  ): StoredWorkflowRecord | null {
    const found = workflows.value.find((w) => w.id === workflowId);
    if (!found) return null;
    activeWorkflowId.value = found.id;
    blueprintStore.setBlueprint(found.blueprint);
    if (found.crew_endpoint_url && !options?.keepEndpoint) {
      settingsStore.updateSettings({ wsEndpoint: found.crew_endpoint_url });
    }
    return found;
  }

  /**
   * Persists the edited OfficeBlueprint (furniture positions, newly spawned props, rotations, deletions)
   * directly into the currently active workflow record in SQLite (`data/pixel_office.sqlite`).
   */
  async function syncActiveBlueprintToSqlite(
    updatedBlueprint?: OfficeBlueprint,
  ): Promise<boolean> {
    const bp = JSON.parse(
      JSON.stringify(updatedBlueprint || blueprintStore.blueprint),
    ) as OfficeBlueprint;

    const idx = workflows.value.findIndex((w) => w.id === activeWorkflowId.value);
    if (idx < 0) return false;

    const current = workflows.value[idx];
    const updatedRecord: StoredWorkflowRecord = {
      ...current,
      blueprint: bp,
      integration_doc_md: generateCrewAiIntegrationDoc(
        bp,
        current.id,
        current.raw_requirement,
        current.crew_endpoint_url,
      ),
    };

    workflows.value[idx] = updatedRecord;
    saveLocalMirror(workflows.value);

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: updatedRecord }),
      });
      if (res.ok) {
        sqliteReady.value = true;
        lastSavedAt.value = Date.now();
        return true;
      }
    } catch {
      // Saved in local mirror fallback
    }
    return false;
  }

  async function saveAndActivateWorkflow(
    record: StoredWorkflowRecord,
  ): Promise<void> {
    const idx = workflows.value.findIndex((w) => w.id === record.id);
    if (idx >= 0) {
      workflows.value[idx] = record;
    } else {
      workflows.value.push(record);
    }

    saveLocalMirror(workflows.value);
    activateWorkflow(record.id);

    try {
      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: record }),
      });
      sqliteReady.value = true;
      lastSavedAt.value = Date.now();
    } catch {
      // Saved in local mirror fallback
    }
  }

  async function deleteWorkflow(workflowId: string): Promise<void> {
    if (workflows.value.length <= 1) return;
    workflows.value = workflows.value.filter((w) => w.id !== workflowId);
    saveLocalMirror(workflows.value);

    if (activeWorkflowId.value === workflowId && workflows.value[0]) {
      activateWorkflow(workflows.value[0].id);
    }

    try {
      await fetch(`/api/workflows?id=${encodeURIComponent(workflowId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore offline error
    }
  }

  function saveLocalMirror(list: StoredWorkflowRecord[]): void {
    try {
      window.localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(list));
    } catch {
      // Ignore quota errors
    }
  }

  function loadFromLocalMirror(defaults: StoredWorkflowRecord[]): void {
    try {
      const raw = window.localStorage.getItem(LOCAL_MIRROR_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredWorkflowRecord[];
        const kept = withoutRetiredWorkflows(
          Array.isArray(parsed) ? parsed : [],
        );
        if (kept.length > 0) {
          const normalized = kept.map((w) => ({
            ...w,
            crew_endpoint_url: normalizeLegacyCrewWsUrl(w.crew_endpoint_url),
          }));
          const ids = new Set(normalized.map((w) => w.id));
          workflows.value = [
            ...normalized,
            ...defaults.filter((seed) => !ids.has(seed.id)),
          ];
          return;
        }
      }
    } catch {
      // Fallback
    }
    workflows.value = defaults;
  }

  return {
    workflows,
    activeWorkflowId,
    activeWorkflow,
    sqliteReady,
    lastSavedAt,
    initWorkflows,
    activateWorkflow,
    syncActiveBlueprintToSqlite,
    saveAndActivateWorkflow,
    deleteWorkflow,
  };
});
