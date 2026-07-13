import { Leaf, Package, Recycle, TrendingDown } from 'lucide-react';
import { computeManureFertilizerEconomy, formatManureEconomySummary } from '../utils/manureFertilizerEconomy';
import { fmtCurrency, fmtNumber } from '../utils/format';

function Card({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <Icon size={16} className="text-leaf" />
      <p className="mt-2 text-xs text-slate">{label}</p>
      <p className="text-xl font-semibold text-earth">{value}</p>
      {hint ? <p className="mt-1 text-meta text-slate">{hint}</p> : null}
    </div>
  );
}

export default function ManureEconomyPanel({
  stocks = [],
  salesOrders = [],
  cultures = [],
  businessEvents = [],
  dataMap = {},
  compact = false,
}) {
  const economy = computeManureFertilizerEconomy({
    stocks,
    salesOrders,
    cultures,
    businessEvents,
    dataMap,
  });

  if (compact) {
    return (
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        <p className="flex items-center gap-2 font-semibold"><Recycle size={16} /> Économie engrais via fumier</p>
        <p className="mt-2 leading-relaxed">{formatManureEconomySummary(economy)}</p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth">
          <Recycle size={20} /> Fumier → engrais économisés
        </p>
        <p className="mt-1 text-sm text-slate">
          Basé sur vos collectes (nettoyage / biosécurité), le stock fumier et les ventes enregistrées.
        </p>
      </div>

      <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${economy.hasCultures ? 'border-positive bg-positive-bg text-positive' : 'border-vigilance bg-vigilance-bg text-horizon-dark'}`}>
        {formatManureEconomySummary(economy)}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={Package} label="Fumier produit" value={`${fmtNumber(economy.producedSacs)} sacs`} hint="collectes + stock + vendu" />
        <Card icon={Leaf} label="En stock (vente)" value={`${fmtNumber(economy.stockSacs)} sacs`} hint="visible en opportunités" />
        <Card icon={TrendingDown} label="Sacs engrais économisés" value={fmtNumber(economy.sacsEngraisEconomises)} hint={`≈ ${fmtCurrency(economy.prixSacEngrais)}/sac engrais`} />
        <Card icon={Recycle} label="Économie maraîchage" value={fmtCurrency(economy.economieFcfa)} hint={`Coût engrais net ${fmtCurrency(economy.coutEngraisNet)}`} />
      </div>

      <p className="text-xs text-slate">
        Vente fumier : enregistrez les sacs lors d’une intervention biosécurité → stock → opportunité Commercial.
        À la vente : sortie stock, entrée Finance, clôture opportunité, traçabilité et sync client (comme toute vente stock).
      </p>
    </section>
  );
}
