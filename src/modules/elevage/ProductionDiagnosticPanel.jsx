import { useMemo, useState } from 'react';
import {
  buildProductionDiagnostic,
  listProductionDiagnosticTargets,
  pickMostCriticalTarget,
} from '../../utils/elevageProductionDiagnostic.js';

const MARGIN_TONE = {
  good: 'text-positive',
  bad: 'text-urgent',
  warn: 'text-horizon-dark',
  neutral: 'text-slate',
};

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
  const automaticTarget = useMemo(() => pickMostCriticalTarget(options)?.target || null, [options]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('auto');
  const selectedTarget = targets.find((target) => target.id === selectedId) || automaticTarget || targets[0] || null;
  const diagnostic = useMemo(
    () => (selectedTarget ? buildProductionDiagnostic(selectedTarget, { ...marginContext, lots }) : null),
    [selectedTarget, marginContext, lots],
  );

  const onSelectChange = (id) => {
    setSelectedId(id);
    setMode('manual');
  };

  const onAutoClick = () => {
    setSelectedId(automaticTarget?.id || '');
    setMode('auto');
  };

  if (!targets.length) {
    return (
      <section className="rounded-card border border-line bg-card p-6 text-sm text-slate">
        Aucune entité active à analyser. Ajoutez d'abord un lot ou un animal.
      </section>
    );
  }

  const marginClass = MARGIN_TONE[diagnostic?.financial?.margin?.tone] || MARGIN_TONE.neutral;

  return (
    <section className="rounded-card border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-earth">Diagnostic production</h2>
        <p className="mt-1 text-xs text-slate">Coûts calculés à partir des achats, distributions et soins enregistrés.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-semibold text-slate">Sélectionner une entité</span>
          <select
            value={selectedTarget?.id || ''}
            onChange={(event) => onSelectChange(event.target.value)}
            className="min-h-[48px] w-full rounded-control border border-line bg-card px-3 text-sm text-earth outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          >
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.category} · {target.label}{target.criticalityScore > 0 ? ` · priorité ${target.criticalityScore}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onAutoClick}
          className="min-h-[48px] shrink-0 rounded-control bg-earth px-4 text-sm font-semibold text-white hover:bg-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon"
        >
          Analyser le plus critique
        </button>
      </div>

      {diagnostic ? (
        <div className="space-y-3">
          <p className="rounded-control border border-line bg-neutral-bg px-3 py-2 text-sm font-semibold text-earth">
            {diagnostic.selectionReason}
            {mode === 'auto' ? ' · sélection automatique' : ''}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-card p-4">
              <p className="text-xs text-slate">{diagnostic.financial.costLabel}</p>
              <p className="mt-1 font-semibold text-earth">{diagnostic.financial.costValue}</p>
            </div>
            <div className="rounded-card border border-line bg-card p-4">
              <p className="text-xs text-slate">{diagnostic.financial.revenueLabel}</p>
              <p className="mt-1 font-semibold text-earth">{diagnostic.financial.revenueValue}</p>
            </div>
            <div className="rounded-card border border-line bg-card p-4">
              <p className="text-xs text-slate">{diagnostic.financial.margin.label}</p>
              <p className={`mt-1 font-semibold ${marginClass}`}>{diagnostic.financial.margin.value}</p>
              <p className="mt-1 text-meta text-slate">{diagnostic.financial.margin.note}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-card border border-line bg-card p-4">
              <dt className="text-xs font-semibold uppercase text-slate">Constat</dt>
              <dd className="mt-1 text-sm text-earth">{diagnostic.constat}</dd>
            </div>
            <div className="rounded-card border border-vigilance bg-vigilance-bg p-4">
              <dt className="text-xs font-semibold uppercase text-horizon-dark">Cause probable</dt>
              <dd className="mt-1 text-sm text-earth">{diagnostic.causeProbable}</dd>
            </div>
            <div className="rounded-card border border-line bg-white p-4">
              <dt className="text-xs font-semibold uppercase text-slate">Impact</dt>
              <dd className="mt-1 text-sm text-earth">{diagnostic.impact}</dd>
            </div>
            <div className="rounded-card border border-positive bg-positive-bg p-4">
              <dt className="text-xs font-semibold uppercase text-positive">Action recommandée</dt>
              <dd className="mt-1 text-sm text-earth">{diagnostic.actionRecommandee}</dd>
            </div>
          </dl>
          <p className="text-meta text-slate">Source des coûts : {diagnostic.financial.source}</p>
        </div>
      ) : null}
    </section>
  );
}
