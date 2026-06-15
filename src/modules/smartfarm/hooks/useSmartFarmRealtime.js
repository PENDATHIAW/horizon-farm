import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const arr = (v) => (Array.isArray(v) ? v : []);

/**
 * Souscription Realtime Supabase — smartfarm_events + refresh capteurs/caméras.
 */
export function useSmartFarmRealtime({
  enabled = true,
  onRefreshSensors,
  onRefreshCameras,
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
    setLiveEvents((prev) => mergeSeed(prev));
  }, [seedEvents, mergeSeed]);

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
      await Promise.allSettled([onRefreshEvents?.(), onRefreshSensors?.(), onRefreshCameras?.()]);
    } catch {
      /* fallback silencieux */
    }
  }, [mergeSeed, onRefreshEvents, onRefreshSensors, onRefreshCameras]);

  useEffect(() => {
    if (!enabled) return undefined;

    refreshEvents();

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_devices' }, () => {
        onRefreshCameras?.();
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, mergeSeed, onRefreshSensors, onRefreshCameras, refreshEvents]);

  return {
    liveEvents,
    connected,
    lastPulse,
    refreshEvents,
  };
}
