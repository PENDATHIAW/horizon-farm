import { ArrowRight, ShoppingBag } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';

const toneClass = (tone) => {
  if (tone === 'good') return 'border-positive bg-positive-bg text-positive';
  if (tone === 'bad') return 'border-urgent bg-urgent-bg text-urgent';
  if (tone === 'warn') return 'border-vigilance bg-vigilance-bg text-horizon-dark';
  return 'border-line bg-card text-earth';
};

export default function ElevageTransformationJournal({ rows = [], onNavigate, onOpenCommercial }) {
  const list = Array.isArray(rows) ? rows : [];
  const sales = list.filter((r) => r.kind === 'vente');
  const transforms = list.filter((r) => r.kind !== 'vente');

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold text-earth">
            <ShoppingBag size={20} className="text-positive" />
            Journal ventes & sorties élevage
          </p>
          <p className="mt-1 text-sm text-slate">
            Chaque vente animal ou lot avicole apparaît ici, avec abattages, mortalités et réformes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-positive-bg text-positive px-3 py-1">{sales.length} vente(s)</span>
          <span className="rounded-full bg-vigilance-bg text-horizon-dark px-3 py-1">{transforms.length} autre(s) sortie(s)</span>
        </div>
      </div>

      {onOpenCommercial || onNavigate ? (
        <div className="flex flex-wrap gap-2">
          {onOpenCommercial ? (
            <button type="button" onClick={onOpenCommercial} className="inline-flex items-center gap-1 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-earth hover:bg-positive-bg">
              Voir module Commercial <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-meta uppercase tracking-normal text-slate border-b border-line">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Cible</th>
              <th className="py-2 pr-3">Quantité</th>
              <th className="py-2 pr-3">Montant</th>
              <th className="py-2 pr-3">Paiement / suite</th>
              <th className="py-2">Détail</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id} className="border-b border-line/60 last:border-0">
                <td className="py-3 pr-3 whitespace-nowrap">{row.date || '-'}</td>
                <td className="py-3 pr-3">
                  <span className={`inline-block rounded-lg px-2 py-1 text-xs font-semibold ${toneClass(row.tone)}`}>
                    {row.kindLabel}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <p className="font-semibold text-earth">{row.label}</p>
                  <p className="text-meta text-slate">{row.entityType} · {row.entityId || '-'}</p>
                </td>
                <td className="py-3 pr-3">
                  {row.quantity != null && row.quantity > 0
                    ? `${fmtNumber(row.quantity)} ${row.unit || ''}`
                    : '-'}
                </td>
                <td className="py-3 pr-3 font-semibold">{row.amount > 0 ? fmtCurrency(row.amount) : '-'}</td>
                <td className="py-3 pr-3 text-xs">{row.paymentStatus || '-'}</td>
                <td className="py-3 text-xs text-slate max-w-xs">{row.detail}</td>
              </tr>
            ))}
            {!list.length ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate">
                  Aucune vente ni sortie élevage pour la période. Enregistrez une vente (Commercial) ou un abattage ci-dessous.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
