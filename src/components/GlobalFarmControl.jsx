import { useCallback, useMemo, useState } from 'react';
import { Building2, ChevronDown, Settings2 } from 'lucide-react';
import {
  canSelectAllFarmsScope,
  formatFarmScopeLabel,
  normalizeFarmScope,
  shouldShowFarmSelector,
} from '../utils/farmScope';
import { canManageFarms } from '../services/farmsService';
import { formatFarmActivitiesLabel } from '../config/farmAdaptation';

export default function GlobalFarmControl({
  farmScope = {},
  accessibleFarms = [],
  onChange,
  user = null,
  activeFarm = null,
  onManageFarms,
}) {
  const [open, setOpen] = useState(false);
  const farms = useMemo(
    () => (Array.isArray(accessibleFarms) ? accessibleFarms : []).filter((farm) => farm.status !== 'archived'),
    [accessibleFarms],
  );
  const multiFarm = shouldShowFarmSelector(farms);
  const allowAllFarms = canSelectAllFarmsScope(user);
  const canManage = canManageFarms(user);
  const normalizedScope = useMemo(
    () => normalizeFarmScope(farmScope, farms),
    [farmScope, farms],
  );
  const selectedFarm = useMemo(() => {
    if (normalizedScope.mode === 'all') return null;
    return activeFarm || farms.find((farm) => farm.id === normalizedScope.farmId) || farms[0] || null;
  }, [normalizedScope, activeFarm, farms]);

  const commitNow = useCallback((next) => {
    onChange?.(normalizeFarmScope(next, farms));
    setOpen(false);
  }, [farms, onChange]);

  const label = formatFarmScopeLabel(normalizedScope, farms);
  const activitiesLabel = selectedFarm ? formatFarmActivitiesLabel(selectedFarm.activity_type) : 'Consolidation multi-fermes';
  const statusLabel = selectedFarm?.status === 'paused' ? 'En pause' : selectedFarm?.status === 'archived' ? 'Archivée' : selectedFarm ? 'Active' : null;
  const statusTone = selectedFarm?.status === 'paused' ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive';

  if (!multiFarm) {
    return (
      <div className="border-b border-positive-bg bg-mist px-3 md:px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">
            <Building2 size={13} aria-hidden="true" />
            <span>{label}</span>
          </div>
          <span className="text-meta text-slate">Horizon Farm est votre ferme par défaut.</span>
          {canManage && onManageFarms ? (
            <button type="button" onClick={onManageFarms} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-meta font-semibold text-earth hover:bg-positive-bg">
              <Settings2 size={12} />
              Gérer les fermes
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-positive-bg bg-mist px-3 md:px-6 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-block">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-leaf/40 bg-white px-3 py-2 text-xs font-semibold text-earth hover:bg-positive-bg transition-colors"
          >
            <Building2 size={13} aria-hidden="true" />
            <span>{label}</span>
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open ? (
            <>
              <button
                type="button"
                aria-label="Fermer le sélecteur de ferme"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div
                role="listbox"
                className="absolute left-0 top-full z-30 mt-2 min-w-[240px] rounded-2xl border border-line bg-white p-2 shadow-float"
              >
                {allowAllFarms ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={normalizedScope.mode === 'all'}
                    onClick={() => commitNow({ mode: 'all' })}
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold ${normalizedScope.mode === 'all' ? 'bg-leaf text-earth' : 'text-earth hover:bg-positive-bg'}`}
                  >
                    Toutes les fermes
                  </button>
                ) : null}
                {farms.map((farm) => (
                  <button
                    key={farm.id}
                    type="button"
                    role="option"
                    aria-selected={normalizedScope.mode === 'single' && normalizedScope.farmId === farm.id}
                    onClick={() => commitNow({ mode: 'single', farmId: farm.id })}
                    className={`mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold ${normalizedScope.mode === 'single' && normalizedScope.farmId === farm.id ? 'bg-leaf text-earth' : 'text-earth hover:bg-positive-bg'}`}
                  >
                    {farm.name}
                    {farm.is_default ? <span className="ml-1 text-meta font-medium text-slate">(défaut)</span> : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <span className="text-meta text-slate">{activitiesLabel}</span>
        {statusLabel ? (
          <span className={`rounded-full border px-2 py-1 text-meta font-semibold ${statusTone}`}>{statusLabel}</span>
        ) : null}
        {canManage && onManageFarms ? (
          <button type="button" onClick={onManageFarms} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-meta font-semibold text-earth hover:bg-positive-bg">
            <Settings2 size={12} />
            Gérer les fermes
          </button>
        ) : null}
      </div>
    </div>
  );
}
