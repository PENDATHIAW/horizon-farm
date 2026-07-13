import { ClipboardList, Link2 } from 'lucide-react';
import { fmtNumber } from '../../utils/format';

export default function ActiviteProblemFichePanel({ fiches = [], selectedKey = '', onSelect }) {
  const selected = fiches.find((f) => f.issue_key === selectedKey) || fiches[0];
  if (!fiches.length) {
    return (
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        Aucun problème métier ouvert — alertes, tâches et suggestions sont alignées.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate">
          <ClipboardList size={15} /> Fiches problème
        </p>
        <h3 className="mt-1 text-lg font-semibold text-earth">Regroupement par issue_key</h3>
        <p className="mt-1 text-sm text-slate">Alerte, tâche, suggestion, événement, documents et transactions liés.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {fiches.slice(0, 12).map((fiche) => (
            <button
              key={fiche.issue_key}
              type="button"
              onClick={() => onSelect?.(fiche.issue_key)}
              className={`w-full rounded-2xl border p-3 text-left ${selected?.issue_key === fiche.issue_key ? 'border-positive bg-positive-bg' : 'border-line bg-card'}`}
            >
              <b className="text-sm text-earth">{fiche.title}</b>
              <p className="mt-1 text-xs text-slate">{fiche.source_module} · {fiche.severity}</p>
            </button>
          ))}
        </div>
        {selected ? (
          <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
            <div>
              <p className="text-xs text-slate">issue_key</p>
              <p className="font-sans text-xs text-earth break-all">{selected.issue_key}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-line p-3"><span className="text-slate">Alerte</span><p className="font-semibold">{selected.alert ? 'Liée' : '—'}</p></div>
              <div className="rounded-xl border border-line p-3"><span className="text-slate">Tâches</span><p className="font-semibold">{fmtNumber(selected.tasks.length)}</p></div>
              <div className="rounded-xl border border-line p-3"><span className="text-slate">Recommandations IA</span><p className="font-semibold">{fmtNumber(selected.recommendations.length)}</p></div>
              <div className="rounded-xl border border-line p-3"><span className="text-slate">Événements</span><p className="font-semibold">{fmtNumber(selected.events.length)}</p></div>
              <div className="rounded-xl border border-line p-3"><span className="text-slate">Documents</span><p className="font-semibold">{fmtNumber(selected.documents.length)}</p></div>
              <div className="rounded-xl border border-line p-3"><span className="text-slate">Transactions</span><p className="font-semibold">{fmtNumber(selected.transactions.length)}</p></div>
            </div>
            {selected.openAlert && selected.openTasks.length === 0 ? (
              <p className="flex items-center gap-1 text-xs text-horizon-dark"><Link2 size={14} /> Alerte ouverte sans tâche — créer une action.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
