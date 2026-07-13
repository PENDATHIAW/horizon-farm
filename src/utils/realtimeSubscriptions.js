import { makeId } from './ids.js';

export function makeRealtimeChannelName(instanceId = makeId('RT')) {
  return `horizon-farm-realtime:${instanceId}`;
}

export function groupRealtimeModulesByTable(moduleConfig = {}) {
  const groups = new Map();
  Object.entries(moduleConfig).forEach(([moduleKey, config]) => {
    if (!config?.table) return;
    const moduleKeys = groups.get(config.table) || [];
    groups.set(config.table, [...moduleKeys, moduleKey]);
  });
  return [...groups.entries()].map(([table, moduleKeys]) => ({ table, moduleKeys }));
}
