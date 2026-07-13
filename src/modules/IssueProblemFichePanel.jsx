import { AlertCircle, ChevronRight, Link2 } from 'lucide-react';
import { useMemo } from 'react';
import { buildIssueGroups, navigateTargetForGroup, summarizeIssueGroups } from '../services/issueGroupingService';

const typeLabel = (type = '') => ({
  alerte: 'Alerte',
  tache: 'Tâche',
  event: 'Événement',
  recommendation: 'Suggestion',
  vente: 'Vente',
  paiement: 'Paiement',
}[type] || type);

export default function IssueProblemFichePanel({
  alertes = [],
  taches = [],
  businessEvents = [],
  recommendations = [],
  salesOrders = [],
  payments = [],
  onNavigate,
  limit = 8,
}) {
  const groups = useMemo(() => buildIssueGroups({
    alertes,
    taches,
    businessEvents,
    recommendations,
    salesOrders,
    payments,
  }), [alertes, taches, businessEvents, recommendations, salesOrders, payments]);

  const summary = useMemo(() => summarizeIssueGroups(groups), [groups]);
  const visible = groups.filter((group) => group.hasOpen || group.itemCount > 1).slice(0, limit);

  if (!visible.length) {
    return (
      <section className="rounded-3xl border border-positive bg-positive-bg p-6 shadow-card">
        <p className="text-sm font-semibold text-positive flex items-center gap-2"><Link2 size={16} /> Fiches problème</p>
        <p className="mt-1 text-sm text-positive">Aucun problème multi-liens ouvert — les alertes et tâches sont isolées ou déjà traitées.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-slate">
            <AlertCircle size={14} /> Fiches problème
          </p>
          <h3 className="mt-3 text-xl font-semibold text-earth">Regrouper par sujet métier</h3>
          <p className="mt-1 text-sm text-slate">
            {summary.open} fiche(s) ouverte(s) · {summary.linkedItems} élément(s) liés par clé `issue_key`
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {visible.map((group) => (
          <article key={group.issueKey} className="rounded-2xl border border-line bg-card p-4 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <b className="text-earth">{group.title}</b>
                <p className="text-xs text-slate mt-1 font-sans break-all">{group.issueKey}</p>
                <p className="text-xs text-slate mt-1">
                  {group.itemCount} lien(s) · {group.openCount} ouvert(s) · {group.modules.join(', ') || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.(navigateTargetForGroup(group))}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth"
              >
                Ouvrir source <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.slice(0, 5).map((item) => (
                <span key={`${group.issueKey}-${item.type}-${item.id}`} className={`rounded-full border px-2 py-1 text-meta font-semibold ${item.open ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive'}`}>
                  {typeLabel(item.type)} · {item.title.slice(0, 40)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
