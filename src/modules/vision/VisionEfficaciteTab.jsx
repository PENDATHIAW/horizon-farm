import { Activity } from 'lucide-react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { buildDecisionCenterData, BROILER_IC_TARGET } from './decisionCenterMetrics.js';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionEfficaciteTab({ lots, animaux, alimentationLogs, productionLogs, onNavigate }) {
  const { efficacite } = buildDecisionCenterData({ lots, animaux, alimentationLogs, productionLogs });
  const alertCount = efficacite.icAlerts.length + efficacite.layingAlerts.filter((a) => a.tone === 'bad').length + efficacite.gmqAlerts.filter((a) => a.tone === 'bad').length;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Efficacité technique & conversion"
        detail="Croisement rationnement (stocks) et performance (croissance, ponte) — détecter les baisses avant qu'elles ne coûtent cher."
        action={onNavigate ? <Btn onClick={() => onNavigate('achats_stock', { tab: 'Stock' })}>Stock aliments →</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Alertes IC chair" value={fmtNumber(efficacite.icAlerts.length)} tone={efficacite.icAlerts.length ? 'warn' : 'good'} detail={`Cible ${BROILER_IC_TARGET.min}–${BROILER_IC_TARGET.max}`} />
        <VisionKpi label="Écarts ponte" value={fmtNumber(efficacite.layingAlerts.length)} tone={efficacite.layingAlerts.some((a) => a.tone === 'bad') ? 'bad' : 'good'} detail="Réel vs théorique souche" />
        <VisionKpi label="GMQ à surveiller" value={fmtNumber(efficacite.gmqAlerts.length)} tone={efficacite.gmqAlerts.some((a) => a.tone === 'bad') ? 'bad' : 'good'} detail="Point de vente optimal" />
        <VisionKpi label="Signaux actifs" value={fmtNumber(alertCount)} tone={alertCount ? 'bad' : 'good'} />
      </div>

      <Section icon={Activity} title="Indice de consommation (IC) — poulets de chair">
        <p className="mb-3 text-xs text-[#8a7456]">Formule : Total aliment (kg) ÷ Poids total vif (kg). Plus bas = plus rentable (idéal {BROILER_IC_TARGET.min}–{BROILER_IC_TARGET.max}).</p>
        <DataTable columns={['Lot', 'IC · Cible', 'Diagnostic', 'Statut']}>
          {efficacite.icAlerts.length ? efficacite.icAlerts.map((row) => (
            <DataRow key={row.id} title={row.label} detail={row.detail} status={`IC ${row.ic.toFixed(2)} · cible ${row.target}`} tone={row.tone} onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })} />
          )) : <Empty>Aucune anomalie IC détectée sur les lots chair actifs.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Activity} title="Courbe de ponte — réel vs théorique (pondeuses)">
        <DataTable columns={['Lot', 'Taux réel · théorique', 'Écart · âge', 'Statut']}>
          {efficacite.layingAlerts.length ? efficacite.layingAlerts.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={row.detail}
              status={`${fmtPercent(row.realRate)} vs ${fmtPercent(row.theoretical)} · S${row.ageWeeks} · Δ ${row.deviation.toFixed(1)} pts`}
              tone={row.tone}
              onClick={() => onNavigate?.('elevage', { tab: 'Production' })}
            />
          )) : <Empty>Ponte conforme aux standards souche — ou ajoutez des journaux de production œufs.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Activity} title="GMQ vs coût du jour — embouche bovine">
        <p className="mb-3 text-xs text-[#8a7456]">Quand le coût alimentaire journalier dépasse le gain de valeur (GMQ × prix/kg), l'animal a atteint son poids optimal de vente.</p>
        <DataTable columns={['Animal', 'GMQ · coût/j', 'Gain valeur/j', 'Statut']}>
          {efficacite.gmqAlerts.length ? efficacite.gmqAlerts.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={row.detail}
              status={`GMQ ${fmtNumber(row.gmq)} g · Alim ${fmtCurrency(row.dailyFeed)}/j · Gain ${fmtCurrency(row.dailyGainValue)}/j`}
              tone={row.tone}
              onClick={() => onNavigate?.('elevage', { tab: 'Animaux' })}
            />
          )) : <Empty>Ajoutez pesées et rations pour calculer le point de vente optimal par tête.</Empty>}
        </DataTable>
      </Section>
    </div>
  );
}
