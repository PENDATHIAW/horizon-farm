import { Sprout } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { buildDecisionCenterData } from './decisionCenterMetrics.js';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';
const FERTILIZER_BAG_KG = 50;

export default function VisionMaraichageTab({ lots, animaux, cultures, marketPrices, onNavigate }) {
  const { maraichage } = buildDecisionCenterData({ lots, animaux, cultures, marketPrices });
  const topCrop = maraichage.cropSimulation[0];

  return (
    <div className="space-y-5">
      <TabIntro
        title="Prospective maraîchage & diversification"
        detail="Simulateur d'assolement et valorisation des effluents d'élevage — préparation à l'intégration végétale."
        action={onNavigate ? <Btn onClick={() => onNavigate('elevage', { tab: 'Résumé' })}>Élevage →</Btn> : null}
      />
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Module en veille active jusqu'au lancement maraîcher. Les calculs utilisent vos effectifs actuels et les cours du marché local si disponibles.
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Culture prioritaire" value={topCrop?.label || '—'} tone="good" detail={topCrop ? `${fmtCurrency(topCrop.marginM2)}/m²` : 'Ajoutez cours marché'} />
        <VisionKpi label="Effluents estimés" value={`${fmtNumber(Math.round(maraichage.effluent.totalEffluentKg))} kg/an`} tone="good" />
        <VisionKpi label="Sacs engrais économisés" value={fmtNumber(maraichage.effluent.bagsSaved)} tone="good" detail={`${FERTILIZER_BAG_KG} kg/sac`} />
        <VisionKpi label="Économie engrais" value={fmtCurrency(maraichage.effluent.fertilizerSavings)} tone="good" />
      </div>

      <Section icon={Sprout} title="Simulateur d'assolement — marge prévisionnelle">
        <p className="mb-3 text-xs text-[#8a7456]">Rendement (kg/m²) × prix marché − coût semences/intrants. Classement par marge brute au m².</p>
        <DataTable columns={['Culture', 'Rendement · prix', 'Coût intrants', 'Marge / ha']}>
          {maraichage.cropSimulation.map((row) => (
            <DataRow
              key={row.key}
              title={row.label}
              detail={`${row.yieldKgM2} kg/m² · ${fmtCurrency(row.priceKg)}/kg`}
              status={`Intrants ${fmtCurrency(row.seedCostM2)}/m² · Marge ${fmtCurrency(row.marginHa)}/ha`}
              tone={row.tone}
            />
          ))}
        </DataTable>
      </Section>

      <Section icon={Sprout} title="Valorisation effluents d'élevage">
        {maraichage.effluent.active ? (
          <div className="space-y-3 text-sm text-[#2f2415]">
            <p>
              <b>Fientes pondeuses :</b> {fmtNumber(maraichage.effluent.pondeuseBirds)} poules → ~{fmtNumber(Math.round(maraichage.effluent.litterKgYear))} kg/an de fiente.
            </p>
            <p>
              <b>Fumier bovin :</b> {fmtNumber(maraichage.effluent.bovineCount)} têtes → ~{fmtNumber(Math.round(maraichage.effluent.manureKgYear))} kg/an.
            </p>
            <p>
              <b>Impact maraîchage :</b> réutilisation estimée = <b>{fmtNumber(maraichage.effluent.bagsSaved)} sacs</b> d'engrais chimiques économisés, soit <b>{fmtCurrency(maraichage.effluent.fertilizerSavings)}</b> sur vos futurs intrants.
            </p>
          </div>
        ) : (
          <Empty>Ajoutez des pondeuses ou du bétail pour estimer la valorisation fumier/lisier sur vos futures parcelles.</Empty>
        )}
      </Section>
    </div>
  );
}

