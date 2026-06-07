import { Coins } from 'lucide-react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { buildDecisionCenterData } from './decisionCenterMetrics.js';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionRentabiliteLotTab({ lots, animaux, alimentationLogs, productionLogs, salesOrders, payments, sante, businessEvents, onNavigate }) {
  const data = buildDecisionCenterData({ lots, animaux, alimentationLogs, productionLogs, salesOrders, payments, sante, businessEvents });
  const { rentabilite } = data;
  const allCycles = [...rentabilite.lots, ...rentabilite.animaux];
  const avgMca = allCycles.length ? allCycles.reduce((s, r) => s + (r.mca ?? r.mcaFlash ?? 0), 0) / allCycles.length : 0;
  const negativeMca = allCycles.filter((r) => (r.mca ?? r.mcaFlash ?? 0) < 0).length;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Rentabilité par lot et cycle"
        detail="Croisement production (poids, pontes) et comptabilité (achats, ventes) — coût de revient, MCA et palmarès fournisseurs."
        action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Résumé' })}>Élevage →</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Cycles suivis" value={fmtNumber(allCycles.length)} tone="good" />
        <VisionKpi label="MCA moyenne" value={fmtCurrency(avgMca)} tone={avgMca >= 0 ? 'good' : 'bad'} detail="Marge sur coût alimentaire" />
        <VisionKpi label="Cycles déficitaires" value={fmtNumber(negativeMca)} tone={negativeMca ? 'bad' : 'good'} />
        <VisionKpi label="Fournisseurs comparés" value={fmtNumber(rentabilite.supplierRanking.length)} tone="good" />
      </div>

      <Section icon={Coins} title="Lots avicoles — coût de revient & MCA">
        <DataTable columns={['Lot', 'Type · Fournisseur', 'Coût unitaire · MCA', 'Statut']}>
          {rentabilite.lots.length ? rentabilite.lots.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={`${row.type} · ${row.supplier} · IC ${row.ic ? row.ic.toFixed(2) : '—'} · CA ${fmtCurrency(row.revenue)}`}
              status={`${row.unitLabel} ${fmtCurrency(row.unitCost)} · MCA ${fmtCurrency(row.mca)}`}
              tone={row.tone}
              onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })}
              actions={row.recommendedAction ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(row.actionModule || 'elevage', { tab: row.actionTab || 'Avicole' })}
                  className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black hover:bg-[#dcfce7]"
                >
                  {row.recommendedAction}
                </button>
              ) : null}
            />
          )) : <Empty>Aucun lot avicole — ajoutez des bandes chair ou pondeuses dans Élevage.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Coins} title="Embouche bovine — MCA par tête">
        <DataTable columns={['Animal', 'Fournisseur · GMQ', 'MCA flash', 'Statut']}>
          {rentabilite.animaux.length ? rentabilite.animaux.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={`${row.supplier} · GMQ ${fmtNumber(row.gmq)} g/j · Coût/kg ${fmtCurrency(row.costPerKg)}`}
              status={`MCA ${fmtCurrency(row.mcaFlash ?? row.mca)} · Vente est. ${fmtCurrency(row.saleEstimate)}`}
              tone={row.tone}
              onClick={() => onNavigate?.('elevage', { tab: 'Animaux' })}
              actions={row.recommendedAction ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(row.actionModule || 'elevage', { tab: row.actionTab || 'Animaux' })}
                  className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black hover:bg-[#dcfce7]"
                >
                  {row.recommendedAction}
                </button>
              ) : null}
            />
          )) : <Empty>Aucun animal en embouche — renseignez broutards et rations dans Animaux.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Coins} title="Palmarès fournisseurs (aliments & animaux)">
        <DataTable columns={['Fournisseur', 'Cycles · CA', 'MCA cumulée', 'Statut']}>
          {rentabilite.supplierRanking.length ? rentabilite.supplierRanking.map((row) => (
            <DataRow
              key={row.supplier}
              title={row.supplier}
              detail={`${row.lots} cycle(s) · CA ${fmtCurrency(row.revenue)} · Coût ${fmtCurrency(row.cost)}`}
              status={`MCA ${fmtCurrency(row.mca)} (${fmtPercent(row.marginPct)})`}
              tone={row.tone}
              onClick={() => onNavigate?.('achats_stock', { tab: 'Fournisseurs' })}
            />
          )) : <Empty>Renseignez le fournisseur sur vos lots et animaux pour comparer la rentabilité finale.</Empty>}
        </DataTable>
      </Section>
    </div>
  );
}
