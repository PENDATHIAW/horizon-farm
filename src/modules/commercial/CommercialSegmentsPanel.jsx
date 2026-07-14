import { fmtCurrency } from '../../utils/format';
import { buildClientSegmentStats } from '../../utils/commercialSegments.js';
import { buildCommercialClientSegmentationIA } from '../../services/commercialClientSegmentationIA.js';

export default function CommercialSegmentsPanel({ clients = [], orders = [], payments = [], relanceRows = [] }) {
  const stats = buildClientSegmentStats({ clients, orders, payments, relanceRows });
  const ia = buildCommercialClientSegmentationIA({ clients, orders, payments });

  if (!stats.length && !ia.best.length) {
    return (
      <section className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-slate">
        Aucune donnée segment - enregistrez des ventes et des clients typés (restaurant, grossiste, boutique…).
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold mb-3">Segmentation</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-positive bg-positive-bg p-3">
            <p className="font-semibold text-positive">Meilleurs clients</p>
            <ul className="mt-2 space-y-1 text-xs text-positive">
              {ia.best.slice(0, 4).map((c) => <li key={c.id}>{c.name} · {fmtCurrency(c.ca)}</li>)}
              {!ia.best.length ? <li>-</li> : null}
            </ul>
          </div>
          <div className="rounded-xl border border-vigilance bg-vigilance-bg p-3">
            <p className="font-semibold text-horizon-dark">Clients à risque</p>
            <ul className="mt-2 space-y-1 text-xs text-horizon-dark">
              {ia.atRisk.slice(0, 4).map((c) => <li key={c.id}>{c.name} · {fmtCurrency(c.receivable)}</li>)}
              {!ia.atRisk.length ? <li>-</li> : null}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-neutral-bg p-3">
            <p className="font-semibold text-ink">Inactifs / silencieux</p>
            <ul className="mt-2 space-y-1 text-xs text-neutral">
              {ia.silent.slice(0, 3).map((c) => (
                <li key={c.id}>
                  {c.name} · {c.signal}
                  {c.autoRelance ? ' → relance auto' : ''}
                </li>
              ))}
              {ia.inactive.slice(0, 2).map((c) => <li key={c.id}>{c.name} (inactif)</li>)}
              {!ia.silent.length && !ia.inactive.length ? <li>-</li> : null}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <p className="text-xs uppercase tracking-normal text-slate font-semibold mb-3">Débouchés commerciaux</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {stats.map((seg) => (
            <div key={seg.key} className="rounded-xl border border-line bg-card p-3">
              <p className="font-semibold text-earth">{seg.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate">
                <span><b className="text-earth">{seg.clientCount}</b> clients</span>
                <span><b className="text-positive">{fmtCurrency(seg.ca)}</b> CA</span>
                <span><b className="text-horizon-dark">{fmtCurrency(seg.receivable)}</b> créances</span>
                <span><b className="text-earth">{seg.orderCount}</b> commandes</span>
                <span><b className="text-earth">{fmtCurrency(seg.basketAvg)}</b> panier</span>
                <span><b className="text-horizon-dark">{seg.relanceCount}</b> relances</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
