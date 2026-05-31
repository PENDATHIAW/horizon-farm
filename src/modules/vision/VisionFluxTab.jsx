import { Truck } from 'lucide-react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { buildDecisionCenterData, STOCK_CRITICAL_DAYS } from './decisionCenterMetrics.js';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionFluxTab({ lots, animaux, alimentationLogs, stocks, onNavigate }) {
  const { flux } = buildDecisionCenterData({ lots, animaux, alimentationLogs, stocks });
  const criticalStock = flux.stockAutonomy.filter((s) => s.tone === 'bad').length;
  const highMortality = flux.materialBalance.filter((m) => m.tone === 'bad').length;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Gestion des flux & équilibres"
        detail="Autonomie aliment, occupation bâtiments et bilan matière — anticiper ruptures et pertes sèches."
        action={onNavigate ? <Btn onClick={() => onNavigate('achats_stock', { tab: 'Stock' })}>Tour de contrôle stock →</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Conso. quotidienne" value={`${fmtNumber(Math.round(flux.dailyConsumption))} kg/j`} tone="good" />
        <VisionKpi label="Stocks critiques" value={fmtNumber(criticalStock)} tone={criticalStock ? 'bad' : 'good'} detail={`< ${STOCK_CRITICAL_DAYS} jours`} />
        <VisionKpi label="Bâtiments suivis" value={fmtNumber(flux.buildingOccupancy.length)} tone="good" />
        <VisionKpi label="Lots mortalité élevée" value={fmtNumber(highMortality)} tone={highMortality ? 'bad' : 'good'} />
      </div>

      <Section icon={Truck} title="Autonomie & rotation stocks d'aliment">
        <p className="mb-3 text-xs text-[#8a7456]">Jours restants = Stock (kg) ÷ Consommation quotidienne totale. Alerte rouge si &lt; {STOCK_CRITICAL_DAYS} jours.</p>
        <DataTable columns={['Silo / produit', 'Stock · conso.', 'Jours restants', 'Statut']}>
          {flux.stockAutonomy.length ? flux.stockAutonomy.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={`${fmtNumber(Math.round(row.qtyKg))} kg en stock`}
              status={`${row.daysLeft.toFixed(1)} jours`}
              tone={row.tone}
              onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })}
            />
          )) : <Empty>Aucun stock aliment détecté — créez vos silos dans Achats & Stock.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Truck} title="Taux d'occupation des bâtiments">
        <DataTable columns={['Bâtiment', 'Lots · effectif', 'Planification', 'Statut']}>
          {flux.buildingOccupancy.length ? flux.buildingOccupancy.map((row) => (
            <DataRow
              key={row.building}
              title={row.building}
              detail={`${row.lots.join(', ')} · ${fmtNumber(row.effectif)} sujets`}
              status={row.detail}
              tone={row.tone}
              onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })}
            />
          )) : <Empty>Renseignez le bâtiment sur vos lots pour planifier vide sanitaire et rotations.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Truck} title="Bilan matière — entrées / sorties / pertes">
        <DataTable columns={['Lot', 'Entrées · sorties · pertes', 'Mortalité · perte sèche', 'Statut']}>
          {flux.materialBalance.length ? flux.materialBalance.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={`Entrées ${fmtNumber(row.entrees)} · Sorties ${fmtNumber(row.sorties)} · Pertes ${fmtNumber(row.pertes)}`}
              status={`${fmtPercent(row.mortalityPct)} · Perte ${fmtCurrency(row.lossValue)}`}
              tone={row.tone}
              onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })}
            />
          )) : <Empty>Aucun lot actif pour le bilan matière.</Empty>}
        </DataTable>
      </Section>
    </div>
  );
}
