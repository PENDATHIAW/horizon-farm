import CollapsibleAdvancedSection from '../../components/CollapsibleAdvancedSection.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { buildPondeuseKpis, buildChairKpis, buildBovinKpis } from '../../utils/elevageActivityPnl.js';
import { MARGIN_GROSS_DEFINITION, PRODUCTION_FINANCE_LABELS } from '../../utils/productionFinancialTruth.js';

function KpiCard({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-[#2f2415]';
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-sm font-black ${cls}`}>{value}</p>
    </div>
  );
}

function EntityKpis({ title, rows = [], renderKpis }) {
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-black text-[#2f2415]">{title}</p>
      {rows.slice(0, 3).map((entity) => {
        const k = renderKpis(entity);
        return (
          <div key={k.id} className="rounded-xl border border-[#eadcc2] bg-white p-3">
            <p className="text-sm font-black text-[#2f2415]">{k.name}</p>
            {!k.reliable && k.missing?.length ? (
              <p className="text-[10px] text-amber-800 mt-1">Rentabilité partielle : {k.missing.join(', ')} manquant(s).</p>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              {renderKpis(entity).cards?.map((card) => <KpiCard key={card.label} {...card} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ElevageProfitabilityKpis({
  pondeuseLots = [],
  chairLots = [],
  bovins = [],
  context = {},
  open = false,
  onToggle,
}) {
  const pondeuseRows = pondeuseLots.map((lot) => {
    const k = buildPondeuseKpis(lot, context);
    return {
      ...k,
      cards: [
        { label: 'Coût / œuf', value: k.costPerEgg ? fmtCurrency(k.costPerEgg) : '—', tone: k.costPerEgg ? 'good' : 'warn' },
        { label: 'Coût / tablette', value: k.costPerTablet ? fmtCurrency(k.costPerTablet) : '—' },
        { label: 'Œufs produits', value: fmtNumber(k.eggsProduced) },
        { label: 'Œufs vendables', value: fmtNumber(k.eggsSellable), tone: 'good' },
        { label: PRODUCTION_FINANCE_LABELS.marginGross, value: k.reliable && k.margin != null ? fmtCurrency(k.margin) : 'Non fiable', tone: k.reliable ? 'good' : 'warn' },
      ],
    };
  });

  const chairRows = chairLots.map((lot) => {
    const k = buildChairKpis(lot, context);
    return {
      ...k,
      cards: [
        { label: 'Coût / poulet', value: k.costPerChicken ? fmtCurrency(k.costPerChicken) : '—' },
        { label: 'Coût / kg', value: k.costPerKg ? fmtCurrency(k.costPerKg) : '—' },
        { label: 'Poids moyen', value: k.avgWeight ? `${k.avgWeight} kg` : '—' },
        { label: 'Mortalité', value: k.mortalityRate != null ? `${fmtNumber(k.mortalityRate)}%` : fmtNumber(k.mortality), tone: k.mortalityRate > 4 ? 'warn' : 'good' },
        { label: PRODUCTION_FINANCE_LABELS.marginGross, value: k.reliable && k.margin != null ? fmtCurrency(k.margin) : 'Non fiable', tone: k.reliable ? 'good' : 'warn' },
      ],
    };
  });

  const bovinRows = bovins.map((animal) => {
    const k = buildBovinKpis(animal, context);
    return {
      ...k,
      cards: [
        { label: 'Coût / animal', value: k.costPerAnimal ? fmtCurrency(k.costPerAnimal) : '—' },
        { label: 'Coût / kg vif', value: k.costPerKg ? fmtCurrency(k.costPerKg) : '—' },
        { label: 'GMQ', value: k.gmq ? `${fmtNumber(k.gmq)} g/j` : '—' },
        { label: 'Poids / cible', value: k.weight ? `${k.weight}${k.targetWeight ? ` / ${k.targetWeight}` : ''} kg` : '—', tone: k.readyToSell ? 'good' : 'neutral' },
        { label: PRODUCTION_FINANCE_LABELS.marginGross, value: k.reliable && k.margin != null ? fmtCurrency(k.margin) : 'Non fiable', tone: k.reliable ? 'good' : 'warn' },
      ],
    };
  });

  if (!pondeuseRows.length && !chairRows.length && !bovinRows.length) return null;

  return (
    <CollapsibleAdvancedSection
      eyebrow="Rentabilité"
      title="KPI essentiels par activité"
      description={`Pondeuses, chair, bovins — ${MARGIN_GROSS_DEFINITION}. Détail repliable.`}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <EntityKpis title="Pondeuses / œufs" rows={pondeuseRows} renderKpis={(r) => r} />
        <EntityKpis title="Poulets de chair" rows={chairRows} renderKpis={(r) => r} />
        <EntityKpis title="Bovins / embouche" rows={bovinRows} renderKpis={(r) => r} />
      </div>
    </CollapsibleAdvancedSection>
  );
}
