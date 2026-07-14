import { Bell, ListTodo } from 'lucide-react';
import { ActiviteSection } from './activiteSuiviUi.jsx';

export default function ActiviteSuiviPriorityPanel({ items = [], kind = 'all', onResolveAlert, busyId, setTab }) {
  const filtered = kind === 'all' ? items : items.filter((item) => item.kind === kind);
  if (!filtered.length) return null;

  const title = kind === 'alerte' ? 'Alertes prioritaires' : kind === 'tache' ? 'Tâches prioritaires' : 'File prioritaire';
  const subtitle =
    kind === 'alerte'
      ? 'Critiques sans résolution - détail complet sur cet onglet.'
      : kind === 'tache'
        ? 'Retards et priorités critiques - traitement sur cet onglet.'
        : 'Alertes et tâches à traiter en premier.';

  return (
    <ActiviteSection title={title} subtitle={subtitle}>
      <div className="divide-y divide-line/60">
        {filtered.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setTab?.(item.kind === 'alerte' ? 'À traiter maintenant' : 'À traiter maintenant')}
              className="text-left min-w-0"
            >
              <p className="font-semibold text-earth flex items-center gap-2 break-words">
                {item.kind === 'alerte' ? <Bell size={14} className="shrink-0 text-horizon-dark" /> : <ListTodo size={14} className="shrink-0 text-horizon-dark" />}
                {item.title}
              </p>
              <p className="text-xs text-slate break-words">
                {item.detail} · {item.severity}
              </p>
            </button>
            {item.kind === 'alerte' ? (
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => onResolveAlert?.(item)}
                className="shrink-0 rounded-lg bg-leaf px-3 py-2 text-xs font-semibold text-earth disabled:opacity-50"
              >
                {busyId === item.id ? '…' : 'Créer tâche'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTab?.('À traiter maintenant')}
                className="shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-earth"
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
