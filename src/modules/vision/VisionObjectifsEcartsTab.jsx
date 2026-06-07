import { Activity, Egg, Sprout } from 'lucide-react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { buildObjectifsCroissanceData } from '../../services/objectifsGrowthEngine.js';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

const toneClass = (tone) => (tone === 'bad' ? 'text-red-700 bg-red-50 border-red-200' : tone === 'warn' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200');

export default function VisionObjectifsEcartsTab(props) {
  const data = buildObjectifsCroissanceData(props);
  const { zootechnie } = data;
  const redCount = zootechnie.pondeuses.filter((r) => r.tone === 'bad').length + zootechnie.croissance.filter((r) => r.tone === 'bad').length;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Objectifs & écarts zootechniques"
        detail="Comportement biologique vs standards souche — pointage automatique par date pivot J-0, sans saisie manuelle."
        action={props.onNavigate ? <Btn onClick={() => props.onNavigate('elevage', { tab: 'Avicole' })}>Élevage →</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Lots pointés" value={fmtNumber(zootechnie.pivotSummary.length)} tone="good" detail="Date pivot + souche référentiel" />
        <VisionKpi label="Alertes ponte" value={fmtNumber(zootechnie.pondeuses.filter((r) => r.tone !== 'good').length)} tone={zootechnie.pondeuses.some((r) => r.tone === 'bad') ? 'bad' : 'good'} />
        <VisionKpi label="Alertes GMQ" value={fmtNumber(zootechnie.croissance.filter((r) => r.tone !== 'good').length)} tone={zootechnie.croissance.some((r) => r.tone === 'bad') ? 'bad' : 'good'} />
        <VisionKpi label="Signaux rouges" value={fmtNumber(redCount)} tone={redCount ? 'bad' : 'good'} />
      </div>

      <Section icon={Egg} title="Pondeuses — taux de ponte réel vs standard souche">
        <p className="mb-3 text-xs text-[#8a7456]">Taux réel = (œufs collectés / poules vivantes) × 100. Orange −2 à −4,9% · Rouge ≤ −5% avec corrélation aliment / véto sur 5 jours.</p>
        <DataTable columns={['Lot · souche', 'Réel · théorique · écart', 'Âge · pivot', 'Statut']}>
          {zootechnie.pondeuses.length ? zootechnie.pondeuses.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={`${row.souche} · J-0 ${row.pivotDate || '—'}`}
              status={`${fmtPercent(row.realRate)} vs ${fmtPercent(row.theoretical)} · Δ ${row.deviation.toFixed(1)} pts`}
              tone={row.tone}
              onClick={() => props.onNavigate?.('elevage', { tab: 'Production' })}
            />
          )) : <Empty>Aucun lot pondeuse — créez une bande avec souche référentiel dans Élevage.</Empty>}
        </DataTable>
        {zootechnie.pondeuses.filter((r) => r.correlationText).map((row) => (
          <p key={`corr-${row.id}`} className={`mt-2 rounded-xl border px-3 py-2 text-xs font-bold ${toneClass(row.tone)}`}>{row.correlationText}</p>
        ))}
      </Section>

      <Section icon={Activity} title="Chair & embouche — GMQ réel vs théorique">
        <p className="mb-3 text-xs text-[#8a7456]">GMQ = (poids actuel − poids précédent) / jours. Zone rouge &lt; −6% : surcoût = jours retard × conso journalière × prix aliment stock.</p>
        <DataTable columns={['Lot / animal', 'GMQ réel · théorique', 'Surcoût estimé', 'Statut']}>
          {zootechnie.croissance.length ? zootechnie.croissance.map((row) => (
            <DataRow
              key={row.id}
              title={`${row.label} (${row.kind})`}
              detail={`${row.souche} · ${fmtNumber(row.ageDays)} j · ${row.message}`}
              status={`${fmtNumber(row.realGmq)} vs ${fmtNumber(row.theoretical)} g/j · ${row.tone === 'bad' ? fmtCurrency(row.surcout) : '—'}`}
              tone={row.tone}
              onClick={() => props.onNavigate?.('elevage', { tab: row.kind === 'Embouche' ? 'Animaux' : 'Avicole' })}
            />
          )) : <Empty>Ajoutez lots chair ou animaux embouche avec pesées pour calculer le GMQ.</Empty>}
        </DataTable>
      </Section>

      <Section icon={Sprout} title="Maraîchage — rendement réel vs cible variété (veille active)">
        <DataTable columns={['Culture', 'Rendement réel · cible', 'Surface', 'Statut']}>
          {zootechnie.maraichage.length ? zootechnie.maraichage.map((row) => (
            <DataRow
              key={row.id}
              title={row.label}
              detail={row.mode === 'veille' ? 'Parcelle en préparation — objectif variété à renseigner' : `${fmtNumber(row.harvested)} kg récoltés`}
              status={`${row.realYield.toFixed(2)} vs ${row.targetYield.toFixed(2)} kg/m²`}
              tone={row.tone}
              onClick={() => props.onNavigate?.('cultures')}
            />
          )) : <Empty>Module maraîchage en veille — renseignez cultures avec surface et rendement cible.</Empty>}
        </DataTable>
      </Section>
    </div>
  );
}
