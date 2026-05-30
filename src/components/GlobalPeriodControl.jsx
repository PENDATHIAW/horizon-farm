import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import {
  currentMonthKey,
  formatPeriodScopeLabel,
  listRecentMonthKeys,
  normalizePeriodScope,
  toggleMonthKey,
} from '../utils/periodScope';

const MONTH_NAMES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DEBOUNCE_MS = 320;

function shortMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  const name = MONTH_NAMES[(month || 1) - 1] || monthKey;
  if (monthKey === currentMonthKey()) return 'Mois en cours';
  return `${name} ${year}`;
}

export default function GlobalPeriodControl({ periodScope = {}, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftScope, setDraftScope] = useState(() => normalizePeriodScope(periodScope));
  const commitTimer = useRef(null);
  const pendingScope = useRef(null);

  useEffect(() => {
    setDraftScope(normalizePeriodScope(periodScope));
  }, [periodScope]);

  const flushPending = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (pendingScope.current) {
      onChange?.(pendingScope.current);
      pendingScope.current = null;
    }
  }, [onChange]);

  useEffect(() => () => flushPending(), [flushPending]);

  const commitNow = useCallback((next) => {
    flushPending();
    const normalized = normalizePeriodScope(next);
    setDraftScope(normalized);
    onChange?.(normalized);
  }, [flushPending, onChange]);

  const commitDebounced = useCallback((next) => {
    const normalized = normalizePeriodScope(next);
    setDraftScope(normalized);
    pendingScope.current = normalized;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      if (pendingScope.current) {
        onChange?.(pendingScope.current);
        pendingScope.current = null;
      }
    }, DEBOUNCE_MS);
  }, [onChange]);

  const normalized = draftScope;
  const mode = normalized.mode === 'all' ? 'all' : 'months';
  const monthOptions = useMemo(() => listRecentMonthKeys(18), []);
  const selected = new Set(normalized.mode === 'months' ? normalized.monthKeys : []);

  const selectAllRecent = () => commitNow({ mode: 'months', monthKeys: [...monthOptions] });
  const selectCurrentMonth = () => commitNow({ mode: 'months', monthKeys: [currentMonthKey()] });
  const closePanel = () => {
    flushPending();
    setOpen(false);
  };

  return (
    <div className="relative border-b border-[#dcfce7] bg-[#f8fcf8] px-3 py-2 md:px-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#6b8a6b]">
          <CalendarRange size={13} aria-hidden="true" />
          Période ERP · {formatPeriodScopeLabel(normalized)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#d1e5d1] bg-white p-0.5">
            <button
              type="button"
              onClick={() => commitNow({ mode: 'months', monthKeys: normalized.mode === 'months' ? normalized.monthKeys : [currentMonthKey()] })}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${mode === 'months' ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#6b8a6b] hover:bg-[#f8fcf8]'}`}
            >
              Mois
            </button>
            <button
              type="button"
              onClick={() => commitNow({ mode: 'all' })}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${mode === 'all' ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#6b8a6b] hover:bg-[#f8fcf8]'}`}
            >
              Depuis le début
            </button>
          </div>
          {mode === 'months' ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-[#d1e5d1] bg-white px-3 py-1.5 text-xs font-bold text-[#052e16]"
              >
                {normalized.monthKeys.length} mois
                <ChevronDown size={14} className={open ? 'rotate-180 transition' : 'transition'} />
              </button>
              <button type="button" onClick={selectCurrentMonth} className="rounded-xl border border-[#d1e5d1] bg-white px-3 py-1.5 text-xs font-bold text-[#6b8a6b]">
                Mois en cours
              </button>
              <button type="button" onClick={selectAllRecent} className="rounded-xl border border-[#d1e5d1] bg-white px-3 py-1.5 text-xs font-bold text-[#6b8a6b]">
                18 derniers mois
              </button>
            </>
          ) : null}
        </div>
      </div>
      {open && mode === 'months' ? (
        <div className="mt-2 rounded-2xl border border-[#d1e5d1] bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-[#6b8a6b]">Cochez un ou plusieurs mois — l&apos;ERP se met à jour après votre sélection.</p>
            <button type="button" onClick={closePanel} className="text-xs font-black text-[#6b8a6b]">Fermer</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {monthOptions.map((key) => {
              const checked = selected.has(key);
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold ${checked ? 'border-[#22c55e] bg-[#ecfdf3] text-[#052e16]' : 'border-[#e8f3e8] bg-[#f8fcf8] text-[#6b8a6b]'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => commitDebounced(toggleMonthKey(normalized, key))}
                    className="accent-[#22c55e]"
                  />
                  {shortMonthLabel(key)}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
