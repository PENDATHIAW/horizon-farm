import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const arr = (v) => (Array.isArray(v) ? v : []);

/**
 * Souscription Realtime Supabase — événements et dispositifs terrain.
 */
export function useSmartFarmRealtime({
  enabled = true,
  onRefreshSensors,
  onRefreshEvents,
  seedEvents = [],
} = {}) {
  const [liveEvents, setLiveEvents] = useState(() => arr(seedEvents));
  const [connected, setConnected] = useState(false);
  const [lastPulse, setLastPulse] = useState(null);
  const seedRef = useRef(arr(seedEvents));

  const mergeSeed = useCallback((rows = []) => {
    const map = new Map();
    [...arr(rows), ...seedRef.current].forEach((row) => {
      if (row?.id) map.set(String(row.id), row);
    });
    return [...map.values()].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 200);
  }, []);

  useEffect(() => {
    seedRef.current = arr(seedEvents);
  }, [seedEvents]);

  const refreshEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('smartfarm_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && data) {
        setLiveEvents(mergeSeed(data));
        setLastPulse(new Date().toISOString());
      }
      await Promise.allSettled([onRefreshEvents?.(), onRefreshSensors?.()]);
    } catch {
      /* fallback silencieux */
    }
  }, [mergeSeed, onRefreshEvents, onRefreshSensors]);

  useEffect(() => {
    if (!enabled) return undefined;

    const refreshTimer = window.setTimeout(() => refreshEvents(), 0);

    const channel = supabase
      .channel('smartfarm-telemetry-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'smartfarm_events' }, (payload) => {
        const row = payload.new;
        if (!row?.id) return;
        setLiveEvents((prev) => mergeSeed([row, ...prev]));
        setLastPulse(new Date().toISOString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensor_devices' }, () => {
        onRefreshSensors?.();
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, mergeSeed, onRefreshSensors, refreshEvents]);

  return {
    liveEvents,
    connected,
    lastPulse,
    refreshEvents,
  };
}
