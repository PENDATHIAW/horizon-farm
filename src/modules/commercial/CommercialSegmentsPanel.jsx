import { fmtCurrency } from '../../utils/format';
import { buildClientSegmentStats } from '../../utils/commercialSegments.js';
import { buildCommercialClientSegmentationIA } from '../../services/commercialClientSegmentationIA.js';

export default function CommercialSegmentsPanel({ clients = [], orders = [], payments = [], relanceRows = [] }) {
  const stats = buildClientSegmentStats({ clients, orders, payments, relanceRows });
  const ia = buildCommercialClientSegmentationIA({ clients, orders, payments });

  if (!stats.length && !ia.best.length) {
    return (
      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
        Aucune donnée segment — enregistrez des ventes et des clients typés (restaurant, grossiste, boutique…).
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black mb-3">Segmentation IA</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="font-black text-emerald-900">Meilleurs clients</p>
            <ul className="mt-2 space-y-1 text-xs text-emerald-800">
              {ia.best.slice(0, 4).map((c) => <li key={c.id}>{c.name} · {fmtCurrency(c.ca)}</li>)}
              {!ia.best.length ? <li>—</li> : null}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="font-black text-amber-900">Clients à risque</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              {ia.atRisk.slice(0, 4).map((c) => <li key={c.id}>{c.name} · {fmtCurrency(c.receivable)}</li>)}
              {!ia.atRisk.length ? <li>—</li> : null}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="font-black text-slate-900">Inactifs / silencieux</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {ia.silent.slice(0, 3).map((c) => (
                <li key={c.id}>
                  {c.name} · {c.signal}
                  {c.autoRelance ? ' → relance auto' : ''}
                </li>
              ))}
              {ia.inactive.slice(0, 2).map((c) => <li key={c.id}>{c.name} (inactif)</li>)}
              {!ia.silent.length && !ia.inactive.length ? <li>—</li> : null}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black mb-3">Débouchés commerciaux</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {stats.map((seg) => (
            <div key={seg.key} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="font-black text-[#2f2415]">{seg.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#8a7456]">
                <span><b className="text-[#2f2415]">{seg.clientCount}</b> clients</span>
                <span><b className="text-emerald-700">{fmtCurrency(seg.ca)}</b> CA</span>
                <span><b className="text-amber-700">{fmtCurrency(seg.receivable)}</b> créances</span>
                <span><b className="text-[#2f2415]">{seg.orderCount}</b> commandes</span>
                <span><b className="text-[#2f2415]">{fmtCurrency(seg.basketAvg)}</b> panier</span>
                <span><b className="text-[#9a6b12]">{seg.relanceCount}</b> relances</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
