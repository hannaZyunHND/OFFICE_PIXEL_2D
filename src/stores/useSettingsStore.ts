import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import {
  loadLocalSettings,
  saveLocalSettings,
  type LocalOfficeSettings,
} from '@/services/storage/localConfig';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<LocalOfficeSettings>(loadLocalSettings());

  watch(
    settings,
    (next) => {
      saveLocalSettings(next);
    },
    { deep: true },
  );

  function updateSettings(patch: Partial<LocalOfficeSettings>): void {
    settings.value = {
      ...settings.value,
      ...patch,
    };
  }

  return {
    settings,
    updateSettings,
  };
});
