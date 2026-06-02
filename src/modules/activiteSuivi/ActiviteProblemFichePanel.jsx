import { ClipboardList, Link2 } from 'lucide-react';
import { fmtNumber } from '../../utils/format';

export default function ActiviteProblemFichePanel({ fiches = [], selectedKey = '', onSelect }) {
  const selected = fiches.find((f) => f.issue_key === selectedKey) || fiches[0];
  if (!fiches.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Aucun problème métier ouvert — alertes, tâches et recommandations IA sont alignées.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8a7456]">
          <ClipboardList size={15} /> Fiches problème
        </p>
        <h3 className="mt-1 text-lg font-black text-[#2f2415]">Regroupement par issue_key</h3>
        <p className="mt-1 text-sm text-[#8a7456]">Alerte, tâche, recommandation IA, événement, documents et transactions liés.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {fiches.slice(0, 12).map((fiche) => (
            <button
              key={fiche.issue_key}
              type="button"
              onClick={() => onSelect?.(fiche.issue_key)}
              className={`w-full rounded-2xl border p-3 text-left ${selected?.issue_key === fiche.issue_key ? 'border-emerald-300 bg-emerald-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}
            >
              <b className="text-sm text-[#2f2415]">{fiche.title}</b>
              <p className="mt-1 text-xs text-[#8a7456]">{fiche.source_module} · {fiche.severity}</p>
            </button>
          ))}
        </div>
        {selected ? (
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
            <div>
              <p className="text-xs text-[#8a7456]">issue_key</p>
              <p className="font-mono text-xs text-[#2f2415] break-all">{selected.issue_key}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Alerte</span><p className="font-black">{selected.alert ? 'Liée' : '—'}</p></div>
              <div className="rounded-xl border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Tâches</span><p className="font-black">{fmtNumber(selected.tasks.length)}</p></div>
              <div className="rounded-xl border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Recommandations IA</span><p className="font-black">{fmtNumber(selected.recommendations.length)}</p></div>
              <div className="rounded-xl border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Événements</span><p className="font-black">{fmtNumber(selected.events.length)}</p></div>
              <div className="rounded-xl border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Documents</span><p className="font-black">{fmtNumber(selected.documents.length)}</p></div>
              <div className="rounded-xl border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Transactions</span><p className="font-black">{fmtNumber(selected.transactions.length)}</p></div>
            </div>
            {selected.openAlert && selected.openTasks.length === 0 ? (
              <p className="flex items-center gap-1 text-xs text-amber-700"><Link2 size={14} /> Alerte ouverte sans tâche — créer une action.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
