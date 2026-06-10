import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildProductionDiagnostic,
  listProductionDiagnosticTargets,
  pickMostCriticalTarget,
} from '../../utils/elevageProductionDiagnostic.js';
import { PRODUCTION_FINANCE_SOURCE } from '../../utils/productionFinancialTruth.js';

export default function ProductionDiagnosticPanel({
  lots = [],
  animaux = [],
  transformationRows = [],
  meatStockKg = 0,
  marginContext = {},
}) {
  const options = useMemo(
    () => ({ lots, animaux, transformationRows, meatStockKg, marginContext: { ...marginContext, lots } }),
    [lots, animaux, transformationRows, meatStockKg, marginContext],
  );

  const targets = useMemo(() => listProductionDiagnosticTargets(options), [options]);

  const [selectedId, setSelectedId] = useState('');
  const [diagnostic, setDiagnostic] = useState(null);
  const [mode, setMode] = useState('auto');
  const autoKeyRef = useRef('');

  const runAnalysis = (target, analysisMode = 'manual') => {
    if (!target) {
      setDiagnostic(null);
      return;
    }
    setDiagnostic(buildProductionDiagnostic(target, { ...marginContext, lots }));
    setMode(analysisMode);
  };

  useEffect(() => {
    const autoKey = targets.map((t) => t.id).join('|');
    if (!targets.length) {
      setDiagnostic(null);
      setSelectedId('');
      autoKeyRef.current = '';
      return;
    }
    if (autoKeyRef.current === autoKey && selectedId) return;
    autoKeyRef.current = autoKey;
    const picked = pickMostCriticalTarget(options);
    if (picked?.target) {
      setSelectedId(picked.target.id);
      setDiagnostic(buildProductionDiagnostic(picked.target, { ...marginContext, lots }));
      setMode('auto');
    }
  }, [options, targets, marginContext, lots, selectedId]);

  const onSelectChange = (id) => {
    setSelectedId(id);
    const target = targets.find((t) => t.id === id);
    runAnalysis(target, 'manual');
  };

  const onAutoClick = () => {
    const picked = pickMostCriticalTarget(options);
    if (picked?.target) {
      setSelectedId(picked.target.id);
      runAnalysis(picked.target, 'auto');
    }
  };

  if (!targets.length) {
    return (
      <section className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
        Aucune entité active pour l’analyse — ajoutez lots ou animaux.
      </section>
    );
  }

  const marginTone = diagnostic?.financial?.margin?.tone || 'neutral';
  const marginCls = marginTone === 'good' ? 'text-emerald-700' : marginTone === 'bad' ? 'text-red-700' : 'text-amber-700';

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-black text-[#2f2415]">Diagnostic production</h2>
        <p className="mt-1 text-xs text-[#8a7456]">{PRODUCTION_FINANCE_SOURCE}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-bold text-[#8a7456]">Sélectionner une entité</span>
          <select
            value={selectedId}
            onChange={(e) => onSelectChange(e.target.value)}
            className="w-full min-h-[48px] rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 text-sm"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.category} · {t.label} {t.criticalityScore > 0 ? `⚠ ${t.criticalityScore}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onAutoClick}
          className="min-h-[48px] shrink-0 rounded-xl bg-[#2f2415] px-4 text-sm font-black text-white"
        >
          Analyser le plus critique
        </button>
      </div>

      {diagnostic ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">
            {diagnostic.selectionReason}
            {mode === 'auto' ? ' · sélection automatique' : ''}
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs text-[#8a7456]">{diagnostic.financial.costLabel}</p>
              <p className="mt-1 font-black text-[#2f2415]">{diagnostic.financial.costValue}</p>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs text-[#8a7456]">{diagnostic.financial.revenueLabel}</p>
              <p className="mt-1 font-black text-[#2f2415]">{diagnostic.financial.revenueValue}</p>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs text-[#8a7456]">{diagnostic.financial.margin.label}</p>
              <p className={`mt-1 font-black ${marginCls}`}>{diagnostic.financial.margin.value}</p>
              <p className="text-[10px] text-[#8a7456] mt-0.5">{diagnostic.financial.margin.note}</p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2">
              <dt className="text-xs font-black uppercase text-[#8a7456]">Constat</dt>
              <dd className="mt-1 text-[#2f2415]">{diagnostic.constat}</dd>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <dt className="text-xs font-black uppercase text-amber-900">Cause probable</dt>
              <dd className="mt-1 text-amber-950">{diagnostic.causeProbable}</dd>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
              <dt className="text-xs font-black uppercase text-[#8a7456]">Impact</dt>
              <dd className="mt-1 text-[#2f2415]">{diagnostic.impact}</dd>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <dt className="text-xs font-black uppercase text-emerald-900">Action recommandée</dt>
              <dd className="mt-1 text-emerald-950">{diagnostic.actionRecommandee}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
