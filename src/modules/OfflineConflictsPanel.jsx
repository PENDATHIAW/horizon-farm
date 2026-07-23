import { GitMerge, ServerCog, Smartphone, ShieldAlert } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { listOfflineConflicts, resolveOfflineConflict } from '../services/offlineQueueService.js';
import { CONFLICT_STRATEGY } from '../services/offlineMutationModel.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const fmt = (value) => {
  if (value == null) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function serverRowFor(dataMap, moduleKey, recordId) {
  const rows = arr(dataMap?.[moduleKey]);
  return rows.find((row) => String(row.id) === String(recordId)) || null;
}

/** Champs à comparer : ceux modifiés par la mutation locale. */
function changedFields(payload = {}, serverRow = null) {
  const keys = Object.keys(payload || {}).filter((key) => key !== 'id');
  return keys.map((key) => ({ key, local: payload[key], server: serverRow ? serverRow[key] : undefined }));
}

/**
 * Résolution des conflits de synchronisation hors ligne (HF-P1-001, sous-lot b).
 * Liste les mutations retenues en conflit (une valeur a changé côté serveur
 * depuis la saisie hors ligne) et laisse choisir : garder le serveur, forcer la
 * valeur locale, ou fusionner. Le moteur de résolution est pur et testé.
 */
export default function OfflineConflictsPanel({ dataMap = {}, onResolved }) {
  const [tick, setTick] = useState(0);
  const conflicts = useMemo(() => { void tick; return listOfflineConflicts(); }, [tick]);

  const resolve = useCallback((item, strategy) => {
    const serverRow = serverRowFor(dataMap, item.moduleKey, item.recordId ?? item.id);
    const result = resolveOfflineConflict(item.id, strategy, serverRow);
    if (!result.ok) { toast.error('Conflit introuvable (déjà résolu ?)'); setTick((v) => v + 1); return; }
    toast.success(result.dropped ? 'Valeur serveur conservée' : 'Résolu : sera synchronisé');
    setTick((v) => v + 1);
    onResolved?.();
  }, [dataMap, onResolved]);

  if (!conflicts.length) {
    return (
      <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 font-semibold text-earth">
          <ShieldAlert size={19} aria-hidden="true" /> Conflits de synchronisation
        </h2>
        <p className="mt-2 text-sm text-positive">Aucun conflit : les saisies hors ligne se synchronisent normalement.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-vigilance bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-semibold text-earth">
        <ShieldAlert size={19} className="text-horizon-dark" aria-hidden="true" /> Conflits de synchronisation
        <span className="rounded-full border border-vigilance bg-vigilance-bg px-2 py-0.5 text-xs font-semibold text-horizon-dark">{conflicts.length}</span>
      </h2>
      <p className="mt-1 text-sm text-slate">
        Une donnée a changé côté serveur depuis votre saisie hors ligne. Choisissez la valeur à conserver ; rien n’est écrasé sans votre choix.
      </p>

      <div className="mt-4 space-y-4">
        {conflicts.map((item) => {
          const serverRow = serverRowFor(dataMap, item.moduleKey, item.recordId ?? item.id);
          const fields = item.action === 'delete' ? [] : changedFields(item.payload, serverRow);
          return (
            <article key={item.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-earth">{item.moduleKey} · {item.recordId ?? item.id}</p>
                  <p className="text-xs text-slate">
                    {item.action === 'delete' ? 'Suppression locale' : 'Modification locale'}
                    {item.client_updated_at ? ` · saisie ${String(item.client_updated_at).slice(0, 16).replace('T', ' ')}` : ''}
                  </p>
                </div>
              </div>

              {item.action === 'delete' ? (
                <p className="mt-2 text-sm text-slate">Vous avez supprimé cette ligne hors ligne, mais elle a été modifiée côté serveur entre-temps.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate">
                        <th className="py-1 pr-3">Champ</th>
                        <th className="py-1 pr-3">Votre valeur (local)</th>
                        <th className="py-1 pr-3">Valeur serveur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((f) => (
                        <tr key={f.key} className="border-t border-line/70">
                          <td className="py-1 pr-3 font-semibold text-earth">{f.key}</td>
                          <td className="py-1 pr-3 text-earth">{fmt(f.local)}</td>
                          <td className="py-1 pr-3 text-slate">{fmt(f.server)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => resolve(item, CONFLICT_STRATEGY.SERVER)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-earth hover:bg-card">
                  <ServerCog size={14} aria-hidden="true" /> Garder le serveur
                </button>
                <button type="button" onClick={() => resolve(item, CONFLICT_STRATEGY.CLIENT)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-earth hover:bg-card">
                  <Smartphone size={14} aria-hidden="true" /> Forcer ma valeur
                </button>
                {item.action !== 'delete' ? (
                  <button type="button" onClick={() => resolve(item, CONFLICT_STRATEGY.MERGE)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-earth hover:bg-card">
                    <GitMerge size={14} aria-hidden="true" /> Fusionner
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate">Après résolution, la mutation est rejouée à la prochaine synchronisation.</p>
    </section>
  );
}
