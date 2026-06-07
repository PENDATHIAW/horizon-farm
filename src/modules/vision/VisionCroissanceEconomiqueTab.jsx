import { Building2, Calculator, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { buildObjectifsCroissanceData, simulateSandboxBreakEven } from '../../services/objectifsGrowthEngine.js';
import { Btn, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

export default function VisionCroissanceEconomiqueTab(props) {
  const base = useMemo(() => buildObjectifsCroissanceData(props), [props]);
  const [sandbox, setSandbox] = useState(base.economie.sandboxDefaults);
  const simulated = useMemo(() => simulateSandboxBreakEven(base.economie.breakEven, sandbox), [base, sandbox]);
  const { economie } = base;

  return (
    <div className="space-y-5">
      <TabIntro
        title="Croissance économique & capacités"
        detail="Point mort recalculé le 28 de chaque mois, contrôle des chevauchements bâtiment + simulateur maraîchage."
        action={props.onNavigate ? <Btn onClick={() => props.onNavigate('finance_pilotage', { tab: 'Rentabilité' })}>Finance →</Btn> : null}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="CA mois" value={fmtCurrency(economie.breakEven.revenue)} tone="good" detail={economie.breakEven.month} />
        <VisionKpi label="Taux MCV" value={fmtPercent(economie.breakEven.mcvRate * 100)} tone={economie.breakEven.mcvRate >= 0.35 ? 'good' : 'warn'} />
        <VisionKpi label="Seuil rentabilité" value={fmtCurrency(economie.breakEven.breakEven)} tone={economie.breakEven.breakEven > economie.breakEven.revenue ? 'warn' : 'good'} />
        <VisionKpi label="Alertes capacité" value={fmtNumber(economie.capacityAlerts.length)} tone={economie.capacityAlerts.length ? 'bad' : 'good'} />
      </div>

      <Section icon={Calculator} title="Point mort dynamique (28 de chaque mois)">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2 text-sm text-[#2f2415]">
          <p><b>Taux MCV</b> = (CA − charges variables) / CA = {fmtPercent(economie.breakEven.mcvRate * 100)}</p>
          <p><b>Seuil</b> = charges fixes ({fmtCurrency(economie.breakEven.fixed)}) / MCV = <b>{fmtCurrency(economie.breakEven.breakEven)}</b></p>
          <p className="text-[#7d6a4a]">{economie.breakEven.businessText}</p>
        </div>
      </Section>

      <Section icon={Building2} title="Gestion logistique des capacités">
        {economie.capacityAlerts.length ? economie.capacityAlerts.map((alert) => (
          <div key={alert.id} className="mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {alert.message}
            <p className="mt-1 text-xs font-normal">Sortie prévue {alert.exitDate} · libre après vide sanitaire {alert.freeDate} · entrée planifiée {alert.nextStart}</p>
          </div>
        )) : <Empty>Aucun chevauchement bâtiment détecté — respect du vide sanitaire 10 jours.</Empty>}
      </Section>

      <Section icon={Sprout} title="Simulateur sandbox — futur maraîchage">
        <p className="mb-3 text-xs text-[#8a7456]">Injecte surface, semences et salaires simulés dans les charges fixes pour estimer le nouveau point mort global.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {[
            ['surfaceM2', 'Surface maraîchère (m²)', sandbox.surfaceM2],
            ['seedCost', 'Coût semences (FCFA)', sandbox.seedCost],
            ['salaries', 'Salaires maraîchers (FCFA)', sandbox.salaries],
            ['costPerM2', 'Intrants / m² (FCFA)', sandbox.costPerM2],
          ].map(([key, label, value]) => (
            <label key={key} className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm">
              <span className="text-xs text-[#8a7456]">{label}</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setSandbox((prev) => ({ ...prev, [key]: Number(e.target.value || 0) }))}
                className="mt-1 w-full rounded-lg border border-[#d6c3a0] px-2 py-1 font-black text-[#2f2415]"
              />
            </label>
          ))}
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-black">Point mort simulé : {fmtCurrency(simulated.breakEven)}</p>
          <p className="mt-1">Δ vs réel : {fmtCurrency(simulated.delta)}</p>
          <p className="mt-2">{simulated.businessText}</p>
        </div>
      </Section>
    </div>
  );
}
