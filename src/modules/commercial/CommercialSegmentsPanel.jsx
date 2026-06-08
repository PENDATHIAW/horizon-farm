import { fmtCurrency } from '../../utils/format';
import { buildClientSegmentStats } from '../../utils/commercialSegments.js';

export default function CommercialSegmentsPanel({ clients = [], orders = [], payments = [], relanceRows = [] }) {
  const stats = buildClientSegmentStats({ clients, orders, payments, relanceRows });

  if (!stats.length) {
    return (
      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
        Aucune donnée segment — enregistrez des ventes et des clients typés (restaurant, grossiste, boutique…).
      </section>
    );
  }

  return (
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
  );
}
