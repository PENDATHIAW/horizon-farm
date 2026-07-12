import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { buildGrowthScenarioRecord, calculateGrowthScenario, nextScenarioVersion } from '../../services/growthScenarioService.js';

const DEFAULT_ASSUMPTIONS = Object.freeze({
  targetSubjects: 100,
  durationDays: 90,
  feedPerSubjectDayKg: 0.12,
  salePricePerSubject: 6500,
  otherCostPerSubject: 1200,
});

function Result({ label, value, tone = '' }) {
  return (
    <div className="border-b border-[#eadcc2] py-3">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone || 'text-[#2f2415]'}`}>{value}</p>
    </div>
  );
}

export default function ObjectifsScenariosTab({
  scenarioContext = {},
  simulations = [],
  activeFarm,
  user,
  onCreateSimulation,
  onRefreshSimulations,
}) {
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [saving, setSaving] = useState(false);
  const results = useMemo(() => calculateGrowthScenario(assumptions, scenarioContext), [assumptions, scenarioContext]);
  const update = (key, value) => setAssumptions((current) => ({ ...current, [key]: Number(value) }));

  const save = async () => {
    if (!onCreateSimulation) {
      toast.error('Enregistrement indisponible pour cette ferme.');
      return;
    }
    setSaving(true);
    try {
      const record = buildGrowthScenarioRecord({
        assumptions,
        context: scenarioContext,
        existingRows: simulations,
        farmId: activeFarm?.id,
        userId: user?.id,
      });
      await onCreateSimulation(record);
      await onRefreshSimulations?.();
      toast.success(`Scénario v${record.version} enregistré.`);
    } catch (error) {
      toast.error(error?.message || 'Enregistrement du scénario impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['targetSubjects', 'Effectif cible', 1],
          ['durationDays', 'Durée (jours)', 1],
          ['feedPerSubjectDayKg', 'Aliment / sujet / jour (kg)', 0.01],
          ['salePricePerSubject', 'Prix de vente / sujet', 100],
          ['otherCostPerSubject', 'Autres coûts / sujet', 100],
        ].map(([key, label, step]) => (
          <label key={key} className="text-xs font-bold text-[#2f2415]">
            {label}
            <input
              type="number"
              min="0"
              step={step}
              value={assumptions[key]}
              onChange={(event) => update(key, event.target.value)}
              className="mt-1 w-full rounded-md border border-[#d6c3a0] bg-white px-3 py-2 text-sm"
            />
          </label>
        ))}
      </section>

      <section className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-4">
        <Result label="Besoins en aliments" value={`${fmtNumber(results.feedNeedKg)} kg`} />
        <Result label="Trésorerie projetée" value={fmtCurrency(results.projectedCash)} />
        <Result label="Rentabilité projetée" value={`${fmtCurrency(results.projectedProfit)} · ${results.profitabilityPercent}%`} tone={results.projectedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'} />
        <Result label="Seuil de soutenabilité" value={results.sustainable ? 'Soutenable' : 'À ajuster'} tone={results.sustainable ? 'text-emerald-700' : 'text-amber-700'} />
        <Result label="Capacité bâtiments" value={`${results.capacities.buildings.required} / ${results.capacities.buildings.available || 'non renseignée'}`} />
        <Result label="Capacité équipe" value={`${results.capacities.team.required} / ${results.capacities.team.available || 'non renseignée'}`} />
        <Result label="Capacité équipements" value={`${results.capacities.equipment.required} / ${results.capacities.equipment.available || 'non renseignée'}`} />
        <Result label="Version suivante" value={`v${nextScenarioVersion(simulations)}`} />
      </section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer le scénario'}
      </button>
    </div>
  );
}
