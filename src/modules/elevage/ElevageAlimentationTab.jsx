import { AlertTriangle, Beef, Drumstick, PackageSearch } from 'lucide-react';
import StockFeedingCostPlanner from '../StockFeedingCostPlanner.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { ELEVAGE_ACTION_GRID, ELEVAGE_KPI_GRID, ElevageActionCard, ElevageStatCard } from './elevageUi.jsx';

const quantity = (row = {}) => Number(row.quantite ?? row.quantity ?? row.stock ?? 0) || 0;

export default function ElevageAlimentationTab({ data, onOpenWorkflow, onNavigate }) {
  const feedStockQuantity = data.feedStocks.reduce((sum, row) => sum + quantity(row), 0);
  const healthPredictionCount = data.healthPredictions?.length || 0;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Alimentation</p>
          <h2 className="mt-1 text-lg font-semibold text-earth">Stocks, distributions et coûts</h2>
          <p className="mt-1 text-sm text-slate">La distribution validée décrémente le stock, enregistre le coût et alimente l'historique de la cible.</p>
        </div>
        <div className={ELEVAGE_KPI_GRID}>
          <ElevageStatCard label="Stocks aliment" value={fmtNumber(data.feedStocks.length)} tone={data.feedStocks.length ? 'good' : 'warn'} />
          <ElevageStatCard label="Quantité disponible" value={feedStockQuantity ? fmtNumber(feedStockQuantity) : '-'} tone={feedStockQuantity ? 'good' : 'warn'} />
          <ElevageStatCard label="Distributions enregistrées" value={fmtNumber(data.feedLogs.length)} tone={data.feedLogs.length ? 'good' : 'warn'} />
          <ElevageStatCard label="Coût alimentation" value={fmtCurrency(data.feedCost)} tone="neutral" />
          <ElevageStatCard label="Alertes santé liées" value={fmtNumber(healthPredictionCount)} tone={healthPredictionCount ? 'warn' : 'good'} />
        </div>
      </section>

      {healthPredictionCount ? (
        <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} aria-hidden="true" /> Alertes santé liées à vérifier</p>
          <p className="mt-1 text-slate">Consultez Santé avant de modifier durablement la ration d'un lot ou d'un animal signalé.</p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <h2 className="text-lg font-semibold text-earth">Enregistrer une distribution</h2>
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Drumstick} title="Lot avicole" text="Distribution, stock et coût pour un lot." onClick={() => onOpenWorkflow?.('feeding', { scope: 'avicole' })} />
          <ElevageActionCard icon={Beef} title="Animal ou cheptel" text="Distribution et coût pour une cible animale." onClick={() => onOpenWorkflow?.('feeding', { scope: 'animaux' })} />
          <ElevageActionCard icon={PackageSearch} title="Ouvrir les stocks" text="Vérifier les quantités et seuils d'alerte." onClick={() => onNavigate?.('achats_stock', { tab: 'Inventaire' })} />
        </div>
      </section>

      <StockFeedingCostPlanner
        rows={data.stocks}
        animaux={data.animals}
        lots={data.lots}
        alimentationLogs={data.feedLogs}
        simulateOnly
      />
    </div>
  );
}
