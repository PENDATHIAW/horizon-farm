import { Bell, ListTodo } from 'lucide-react';
import { ActiviteSection } from './activiteSuiviUi.jsx';

export default function ActiviteSuiviPriorityPanel({ items = [], kind = 'all', onResolveAlert, busyId, setTab }) {
  const filtered = kind === 'all' ? items : items.filter((item) => item.kind === kind);
  if (!filtered.length) return null;

  const title = kind === 'alerte' ? 'Alertes prioritaires' : kind === 'tache' ? 'Tâches prioritaires' : 'File prioritaire';
  const subtitle =
    kind === 'alerte'
      ? 'Critiques sans résolution — détail complet sur cet onglet.'
      : kind === 'tache'
        ? 'Retards et priorités critiques — traitement sur cet onglet.'
        : 'Alertes et tâches à traiter en premier.';

  return (
    <ActiviteSection title={title} subtitle={subtitle}>
      <div className="divide-y divide-[#eadcc2]/60">
        {filtered.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setTab?.(item.kind === 'alerte' ? 'À traiter maintenant' : 'À traiter maintenant')}
              className="text-left min-w-0"
            >
              <p className="font-black text-[#2f2415] flex items-center gap-2 break-words">
                {item.kind === 'alerte' ? <Bell size={14} className="shrink-0 text-amber-600" /> : <ListTodo size={14} className="shrink-0 text-[#9a6b12]" />}
                {item.title}
              </p>
              <p className="text-xs text-[#8a7456] break-words">
                {item.detail} · {item.severity}
              </p>
            </button>
            {item.kind === 'alerte' ? (
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => onResolveAlert?.(item)}
                className="shrink-0 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16] disabled:opacity-50"
              >
                {busyId === item.id ? '…' : 'Créer tâche'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTab?.('À traiter maintenant')}
                className="shrink-0 rounded-lg border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]"
              >
                Traiter
              </button>
            )}
          </div>
        ))}
      </div>
    </ActiviteSection>
  );
}
