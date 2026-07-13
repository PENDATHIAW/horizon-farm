/**
 * Zones site AGRI FEEDS - prévues dès Phase 1 (réservation d’espaces).
 * Utilise feed_facility_zones si présent, sinon les zones planifiées par défaut.
 */
import {
  DEFAULT_PLANNED_FACILITY_ZONES,
  FACILITY_ZONE_STATUSES,
  FACILITY_ZONE_TYPES,
} from '../../config/agriFeeds.config.js';

const arr = (value) => (Array.isArray(value) ? value : []);

export function labelZoneType(value) {
  return FACILITY_ZONE_TYPES.find((z) => z.value === value)?.label || value;
}

export function labelZoneStatus(value) {
  return FACILITY_ZONE_STATUSES.find((z) => z.value === value)?.label || value;
}

/**
 * Fusionne zones persistées + zones prévues manquantes (par zone_type).
 */
export function resolveFacilityZones(dataMap = {}) {
  const stored = arr(dataMap.feed_facility_zones);
  if (!stored.length) {
    return DEFAULT_PLANNED_FACILITY_ZONES.map((z) => ({ ...z, source: 'planned_default' }));
  }
  const byType = new Set(stored.map((z) => z.zone_type));
  const missing = DEFAULT_PLANNED_FACILITY_ZONES
    .filter((z) => !byType.has(z.zone_type))
    .map((z) => ({ ...z, source: 'planned_default' }));
  return [
    ...stored.map((z) => ({ ...z, source: 'stored' })),
    ...missing,
  ];
}

export function facilityZonesSummary(dataMap = {}) {
  const zones = resolveFacilityZones(dataMap);
  const planned = zones.filter((z) => z.status === 'planned').length;
  const available = zones.filter((z) => z.status === 'available').length;
  const inUse = zones.filter((z) => z.status === 'in_use').length;
  return {
    total: zones.length,
    planned,
    available,
    in_use: inUse,
    separationNote: 'Ces zones doivent rester séparées des animaux, fientes, fumiers, zones humides et produits vétérinaires.',
    zones,
  };
}
