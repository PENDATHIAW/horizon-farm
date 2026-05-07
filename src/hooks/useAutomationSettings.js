import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { automationSettingsService, defaultAutomationSettings } from '../services/automationSettingsService';

const mergeSettings = (rows = []) =>
  defaultAutomationSettings.map((setting) => rows.find((row) => row.key === setting.key) || setting);

export default function useAutomationSettings() {
  const [settings, setSettings] = useState(defaultAutomationSettings);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await automationSettingsService.getAll();
      setSettings(mergeSettings(rows));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh().catch(() => setSettings(defaultAutomationSettings));
    });

    const channel = supabase
      .channel('automation-settings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automation_settings' }, () => {
        refresh().catch(() => undefined);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const toggle = useCallback(async (key) => {
    const current = settings.find((setting) => setting.key === key);
    if (!current) return;

    const next = { ...current, enabled: !current.enabled };
    setSettings((prev) => prev.map((setting) => (setting.key === key ? next : setting)));
    await automationSettingsService.upsert(next);
  }, [settings]);

  return useMemo(() => ({ settings, loading, toggle, refresh }), [settings, loading, toggle, refresh]);
}
