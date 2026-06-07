import { ArrowRight, ShoppingBag } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';

const toneClass = (tone) => {
  if (tone === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (tone === 'bad') return 'border-red-200 bg-red-50 text-red-900';
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]';
};

export default function ElevageTransformationJournal({ rows = [], onNavigate, onOpenCommercial }) {
  const list = Array.isArray(rows) ? rows : [];
  const sales = list.filter((r) => r.kind === 'vente');
  const transforms = list.filter((r) => r.kind !== 'vente');

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
            <ShoppingBag size={20} className="text-emerald-700" />
            Journal ventes & sorties élevage
          </p>
          <p className="mt-1 text-sm text-[#8a7456]">
            Chaque vente animal ou lot avicole apparaît ici, avec abattages, mortalités et réformes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1">{sales.length} vente(s)</span>
          <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1">{transforms.length} autre(s) sortie(s)</span>
        </div>
      </div>

      {onOpenCommercial || onNavigate ? (
        <div className="flex flex-wrap gap-2">
          {onOpenCommercial ? (
            <button type="button" onClick={onOpenCommercial} className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[#2f2415] hover:bg-[#dcfce7]">
              Voir module Commercial <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[#8a7456] border-b border-[#eadcc2]">
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
              <tr key={row.id} className="border-b border-[#eadcc2]/60 last:border-0">
                <td className="py-2.5 pr-3 whitespace-nowrap">{row.date || '—'}</td>
                <td className="py-2.5 pr-3">
                  <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${toneClass(row.tone)}`}>
                    {row.kindLabel}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <p className="font-bold text-[#2f2415]">{row.label}</p>
                  <p className="text-[11px] text-[#8a7456]">{row.entityType} · {row.entityId || '—'}</p>
                </td>
                <td className="py-2.5 pr-3">
                  {row.quantity != null && row.quantity > 0
                    ? `${fmtNumber(row.quantity)} ${row.unit || ''}`
                    : '—'}
                </td>
                <td className="py-2.5 pr-3 font-bold">{row.amount > 0 ? fmtCurrency(row.amount) : '—'}</td>
                <td className="py-2.5 pr-3 text-xs">{row.paymentStatus || '—'}</td>
                <td className="py-2.5 text-xs text-[#7d6a4a] max-w-xs">{row.detail}</td>
              </tr>
            ))}
            {!list.length ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#8a7456]">
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
