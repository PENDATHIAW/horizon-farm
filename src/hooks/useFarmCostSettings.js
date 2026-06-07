import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_FARM_COST_SETTINGS } from '../services/farmCostSettings.js';
import { farmCostSettingsService } from '../services/farmCostSettingsService.js';

export default function useFarmCostSettings() {
  const [settings, setSettings] = useState(() => farmCostSettingsService.getCached());
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await farmCostSettingsService.load();
      setSettings(next);
      setSynced(true);
    } catch {
      setSettings(farmCostSettingsService.getCached());
      setSynced(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh().catch(() => {
        setSettings(DEFAULT_FARM_COST_SETTINGS);
        setSynced(false);
        setLoading(false);
      });
    });

    const onLocalChange = (event) => {
      if (event?.detail) setSettings(event.detail);
    };
    window.addEventListener('horizon-farm-cost-settings-changed', onLocalChange);

    const channel = supabase
      .channel('farm-cost-settings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_cost_settings' }, () => {
        refresh().catch(() => undefined);
      })
      .subscribe();

    return () => {
      window.removeEventListener('horizon-farm-cost-settings-changed', onLocalChange);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const save = useCallback(async (next) => {
    setSettings(next);
    const saved = await farmCostSettingsService.save(next);
    setSettings(saved);
    setSynced(true);
    return saved;
  }, []);

  const reset = useCallback(async () => {
    const defaults = farmCostSettingsService.reset();
    setSettings(defaults);
    await farmCostSettingsService.save(defaults);
    return defaults;
  }, []);

  return useMemo(
    () => ({ settings, loading, synced, save, reset, refresh }),
    [settings, loading, synced, save, reset, refresh],
  );
}
