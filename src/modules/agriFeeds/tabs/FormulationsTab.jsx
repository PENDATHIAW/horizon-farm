import { useMemo, useState } from 'react';
import { Copy, FlaskConical, Plus } from 'lucide-react';
import {
  FORMULA_STATUSES,
  TARGET_SPECIES,
  TARGET_STAGES,
} from '../../../config/agriFeeds.config.js';
import {
  prepareFormulaDraft,
  commitFormulaDraft,
  prepareFormulaStatusChange,
} from '../../../services/agriFeeds/formulaWorkflow.js';
import {
  computeTheoreticalFormulaCost,
  resolveLatestUnitCost,
} from '../../../services/agriFeeds/feedCostEngine.js';
import {
  duplicateFormulaVersion,
  evaluateCommercializableGate,
  formulaStatusLabel,
} from '../../../services/agriFeeds/formulaLifecycleService.js';
import { fmtCurrency, toNumber } from '../../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function FormulationsTab({
  dataMap = {},
  onCreateFeedFormula,
  onUpdateFeedFormula,
  onCreateFeedFormulaVersion,
  onCreateFeedFormulaIngredient,
  onCreateBusinessEvent,
}) {
  const materials = arr(dataMap.feed_raw_materials);
  const formulas = arr(dataMap.feed_formulas);
  const versions = arr(dataMap.feed_formula_versions);
  const ingredientsAll = arr(dataMap.feed_formula_ingredients);

  const [form, setForm] = useState({
    name: '',
    target_species: 'broiler',
    target_stage: 'grower',
    objective: '',
    notes: '',
  });
  const [lines, setLines] = useState([{ raw_material_id: '', percentage: '' }]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedFormulaId, setSelectedFormulaId] = useState('');

  const costPreview = useMemo(() => {
    const enriched = lines
      .filter((l) => l.raw_material_id && toNumber(l.percentage) > 0)
      .map((l) => {
        const material = materials.find((m) => String(m.id) === String(l.raw_material_id));
        return {
          raw_material_id: l.raw_material_id,
          raw_material_name: material?.name,
          percentage: toNumber(l.percentage),
          latest_unit_cost: resolveLatestUnitCost(l.raw_material_id, dataMap),
          is_experimental: Boolean(material?.is_experimental),
        };
      });
    return computeTheoreticalFormulaCost(enriched, dataMap);
  }, [lines, materials, dataMap]);

  const selectedFormula = formulas.find((f) => String(f.id) === String(selectedFormulaId));
  const selectedVersions = versions
    .filter((v) => String(v.formula_id) === String(selectedFormulaId))
    .sort((a, b) => toNumber(b.version_number) - toNumber(a.version_number));
  const gate = selectedFormula
    ? evaluateCommercializableGate(selectedFormula, dataMap)
    : null;

  const addLine = () => setLines((prev) => [...prev, { raw_material_id: '', percentage: '' }]);
  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const saveFormula = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareFormulaDraft({
        ...form,
        ingredients: lines
          .filter((l) => l.raw_material_id && toNumber(l.percentage) > 0)
          .map((l) => ({
            raw_material_id: l.raw_material_id,
            percentage: toNumber(l.percentage),
            latest_unit_cost: resolveLatestUnitCost(l.raw_material_id, dataMap),
          })),
      }, dataMap);

      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }

      await commitFormulaDraft(preview, {
        onCreateFormula: onCreateFeedFormula,
        onCreateVersion: onCreateFeedFormulaVersion,
        onCreateIngredient: onCreateFeedFormulaIngredient,
        onCreateBusinessEvent,
      });

      setSelectedFormulaId(preview.formula.id);
      setForm({ name: '', target_species: 'broiler', target_stage: 'grower', objective: '', notes: '' });
      setLines([{ raw_material_id: '', percentage: '' }]);
      const alertText = preview.alerts?.[0]?.message;
      setMessage(
        `Formule créée — ${preview.version.version_code} · ${fmtCurrency(preview.cost.theoretical_cost_per_kg)}/kg`
        + (alertText ? ` · ${alertText}` : ''),
      );
    } catch (err) {
      setMessage(err?.message || 'Création formule impossible.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (nextStatus) => {
    if (!selectedFormula) return;
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareFormulaStatusChange(selectedFormula, nextStatus, dataMap, {
        validatorName: 'Responsable AGRI FEEDS',
      });
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await onUpdateFeedFormula?.(selectedFormula.id, preview.patch);
      if (onCreateBusinessEvent && preview.businessEvent) {
        await onCreateBusinessEvent(preview.businessEvent);
      }
      setMessage(`Statut mis à jour : ${formulaStatusLabel(nextStatus)}.`);
    } catch (err) {
      setMessage(err?.message || 'Changement de statut impossible.');
    } finally {
      setBusy(false);
    }
  };

  const duplicateActiveVersion = async () => {
    const version = selectedVersions[0];
    if (!selectedFormula || !version) return;
    setBusy(true);
    try {
      const dup = duplicateFormulaVersion(version, ingredientsAll, selectedFormula, versions);
      await onCreateFeedFormulaVersion?.(dup.version);
      for (const ing of dup.ingredients) {
        await onCreateFeedFormulaIngredient?.(ing);
      }
      setMessage(`Version dupliquée : ${dup.version.version_code}.`);
    } catch (err) {
      setMessage(err?.message || 'Duplication impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
        <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
          <FlaskConical size={20} /> Formulations
        </p>
        <p className="text-sm text-[#8a7456] leading-relaxed max-w-3xl">
          Créez des formules, calculez le coût théorique, suivez le cycle de vie.
          La commercialisation reste bloquée sans test, coût réel et validation humaine.
        </p>
        {message ? (
          <p className="text-sm rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2">{message}</p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={saveFormula} className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
          <p className="font-black text-[#2f2415] flex items-center gap-2">
            <Plus size={16} /> Nouvelle formule
          </p>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#8a7456]">Nom</span>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] px-3 text-sm"
              placeholder="Ex. Chair croissance HF"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Espèce</span>
              <select
                value={form.target_species}
                onChange={(e) => setForm((p) => ({ ...p, target_species: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] px-3 text-sm"
              >
                {TARGET_SPECIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Stade</span>
              <select
                value={form.target_stage}
                onChange={(e) => setForm((p) => ({ ...p, target_stage: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] px-3 text-sm"
              >
                {TARGET_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-[#8a7456]">Ingrédients (% pour 100 kg)</p>
            {lines.map((line, idx) => {
              const unitCost = line.raw_material_id
                ? resolveLatestUnitCost(line.raw_material_id, dataMap)
                : 0;
              const contrib = toNumber(line.percentage) * unitCost;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <label className="col-span-6 space-y-1">
                    <span className="text-[10px] font-bold text-[#8a7456]">Matière</span>
                    <select
                      value={line.raw_material_id}
                      onChange={(e) => updateLine(idx, { raw_material_id: e.target.value })}
                      className="w-full min-h-[40px] rounded-xl border border-[#d6c3a0] px-2 text-sm"
                    >
                      <option value="">—</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}{m.is_experimental ? ' (exp.)' : ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-3 space-y-1">
                    <span className="text-[10px] font-bold text-[#8a7456]">%</span>
                    <input
                      type="number"
                      value={line.percentage}
                      onChange={(e) => updateLine(idx, { percentage: e.target.value })}
                      className="w-full min-h-[40px] rounded-xl border border-[#d6c3a0] px-2 text-sm"
                    />
                  </label>
                  <div className="col-span-2 text-[11px] text-[#8a7456] pb-2">
                    {unitCost > 0 ? fmtCurrency(contrib) : '—'}
                  </div>
                  <button type="button" onClick={() => removeLine(idx)} className="col-span-1 text-xs text-rose-700 pb-2">×</button>
                </div>
              );
            })}
            <button type="button" onClick={addLine} className="text-sm font-bold text-[#2f2415]">+ Ingrédient</button>
          </div>

          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm space-y-1">
            <p><b>Somme %</b> : {costPreview.total_percentage.toFixed(1)}</p>
            <p><b>Coût / 100 kg</b> : {fmtCurrency(costPreview.cost_for_100kg)}</p>
            <p className="font-black"><b>Coût théorique / kg</b> : {fmtCurrency(costPreview.theoretical_cost_per_kg)}</p>
            {costPreview.alerts.map((a) => (
              <p key={a.message} className="text-xs text-amber-900">Point d’attention — {a.message}</p>
            ))}
          </div>

          <button
            type="submit"
            disabled={busy || materials.length === 0}
            className="rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16] disabled:opacity-60"
          >
            Créer la formule
          </button>
          {materials.length === 0 ? (
            <p className="text-xs text-amber-900">Créez d’abord une matière première dans l’onglet Matières.</p>
          ) : null}
        </form>

        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
          <p className="font-black text-[#2f2415]">Cycle de vie</p>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-[#8a7456]">Formule</span>
            <select
              value={selectedFormulaId}
              onChange={(e) => setSelectedFormulaId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] px-3 text-sm"
            >
              <option value="">Sélectionner…</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — {formulaStatusLabel(f.status)}
                </option>
              ))}
            </select>
          </label>

          {selectedFormula ? (
            <>
              <p className="text-sm">
                Statut actuel : <b>{formulaStatusLabel(selectedFormula.status)}</b>
              </p>
              {selectedVersions[0] ? (
                <p className="text-sm text-[#8a7456]">
                  Version active : {selectedVersions[0].version_code} · {fmtCurrency(selectedVersions[0].theoretical_cost_per_kg)}/kg
                </p>
              ) : null}

              {gate ? (
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-xs space-y-1">
                  <p className="font-black text-[#2f2415]">Conditions commercialisable</p>
                  {gate.checks.map((c) => (
                    <p key={c.id}>{c.ok ? '✓' : '○'} {c.label}</p>
                  ))}
                  <p className="mt-2 text-[#2f2415]">{gate.message}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => changeStatus('internal_testing')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">En test interne</button>
                <button type="button" disabled={busy} onClick={() => changeStatus('to_improve')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">À améliorer</button>
                <button type="button" disabled={busy} onClick={() => changeStatus('internally_validated')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">Validée interne</button>
                <button type="button" disabled={busy} onClick={() => changeStatus('commercializable')} className="rounded-xl bg-[#22c55e] px-3 py-2 text-xs font-black text-[#052e16]">Commercialisable</button>
                <button type="button" disabled={busy} onClick={duplicateActiveVersion} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black inline-flex items-center gap-1">
                  <Copy size={12} /> Dupliquer version
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#8a7456]">Sélectionnez une formule pour gérer son statut.</p>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white overflow-x-auto">
        <div className="p-4 border-b border-[#eadcc2]">
          <p className="font-black">Formules ({formulas.length})</p>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-[#fffdf8] text-[10px] uppercase font-black text-[#8a7456]">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Nom</th>
              <th className="px-3 py-2 text-left">Espèce</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-right">Coût théo. / kg</th>
            </tr>
          </thead>
          <tbody>
            {formulas.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-[#8a7456]">Aucune formule.</td></tr>
            ) : formulas.map((f) => {
              const v = versions
                .filter((x) => String(x.formula_id) === String(f.id))
                .sort((a, b) => toNumber(b.version_number) - toNumber(a.version_number))[0];
              return (
                <tr key={f.id} className="border-t border-[#eadcc2]">
                  <td className="px-3 py-2 font-semibold">{f.formula_code}</td>
                  <td className="px-3 py-2">{f.name}</td>
                  <td className="px-3 py-2">{TARGET_SPECIES.find((s) => s.value === f.target_species)?.label || f.target_species}</td>
                  <td className="px-3 py-2">{FORMULA_STATUSES.find((s) => s.value === f.status)?.label || f.status}</td>
                  <td className="px-3 py-2 text-right">{v ? fmtCurrency(v.theoretical_cost_per_kg) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
