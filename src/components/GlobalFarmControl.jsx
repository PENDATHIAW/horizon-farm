import { useCallback, useMemo, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import {
  formatFarmScopeLabel,
  normalizeFarmScope,
  shouldShowFarmSelector,
} from '../utils/farmScope';

export default function GlobalFarmControl({
  farmScope = {},
  accessibleFarms = [],
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const farms = useMemo(
    () => (Array.isArray(accessibleFarms) ? accessibleFarms : []).filter((farm) => farm.status !== 'archived'),
    [accessibleFarms],
  );
  const multiFarm = shouldShowFarmSelector(farms);
  const normalizedScope = useMemo(
    () => normalizeFarmScope(farmScope, farms),
    [farmScope, farms],
  );

  const commitNow = useCallback((next) => {
    onChange?.(normalizeFarmScope(next, farms));
    setOpen(false);
  }, [farms, onChange]);

  const label = formatFarmScopeLabel(normalizedScope, farms);

  if (!multiFarm) {
    return (
      <div className="border-b border-[#dcfce7] bg-[#f8fcf8] px-3 md:px-6 py-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d1e5d1] bg-white px-3 py-1.5 text-xs font-semibold text-[#052e16]">
          <Building2 size={13} aria-hidden="true" />
          <span>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[#dcfce7] bg-[#f8fcf8] px-3 md:px-6 py-2">
      <div className="relative inline-block">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#052e16] hover:bg-[#dcfce7] transition-colors"
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
              className="absolute left-0 top-full z-30 mt-2 min-w-[240px] rounded-2xl border border-[#d1e5d1] bg-white p-2 shadow-2xl"
            >
              <button
                type="button"
                role="option"
                aria-selected={normalizedScope.mode === 'all'}
                onClick={() => commitNow({ mode: 'all' })}
                className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold ${normalizedScope.mode === 'all' ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#052e16] hover:bg-[#dcfce7]'}`}
              >
                Toutes les fermes
              </button>
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  type="button"
                  role="option"
                  aria-selected={normalizedScope.mode === 'single' && normalizedScope.farmId === farm.id}
                  onClick={() => commitNow({ mode: 'single', farmId: farm.id })}
                  className={`mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold ${normalizedScope.mode === 'single' && normalizedScope.farmId === farm.id ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#052e16] hover:bg-[#dcfce7]'}`}
                >
                  {farm.name}
                  {farm.is_default ? <span className="ml-1 text-[10px] font-medium text-[#6b8a6b]">(défaut)</span> : null}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
