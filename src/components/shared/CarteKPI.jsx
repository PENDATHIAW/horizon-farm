import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { t } from '../../i18n/fr/index.js';
import { resolveCarteKpi } from './dataFilters.js';

function displayValue(value) {
  if (value === undefined || value === null || value === '') return t('shared.kpi.indisponible');
  return typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value);
}

export default function CarteKPI({
  code,
  period,
  farmId,
  filters,
  onNavigate,
  kpi,
  values,
  catalog,
  label,
  value,
  unit,
  variation,
  source,
  ownerModule,
  role,
  sensitive = false,
  className = '',
}) {
  const item = resolveCarteKpi({ code, kpi, values, catalog, farmId, period, filters });
  const isSensitive = Boolean(item.sensitive ?? sensitive);
  if (role === 'terrain' && isSensitive) return null;
  const module = item.owner_module || item.ownerModule || item.module || item.source_module || ownerModule;
  const resolvedValue = item.value ?? item.valeur ?? value;
  const resolvedUnit = item.unit || item.unite || unit || '';
  const resolvedVariation = item.variation ?? item.change ?? variation;
  const resolvedPeriod = item.period || item.periode || (typeof period === 'string' ? period : '') || t('shared.kpi.periodeActive');
  const resolvedSource = item.source_label || item.source || source || module || t('shared.kpi.sourceInconnue');
  const Tag = module && onNavigate ? 'button' : 'article';
  const variationNumber = Number(resolvedVariation);
  const VariationIcon = variationNumber < 0 ? TrendingDown : TrendingUp;

  return (
    <Tag type={Tag === 'button' ? 'button' : undefined} onClick={Tag === 'button' ? () => onNavigate(module, { kpi: item.code }) : undefined} className={`grid min-h-28 w-full grid-cols-[1fr_auto] gap-3 rounded-lg border border-[#d6c3a0] bg-white p-4 text-left ${Tag === 'button' ? 'transition hover:border-[#9a6b12]' : ''} ${className}`}>
      <span className="min-w-0">
        <span className="block break-words text-xs font-black text-[#6f6048]">{item.label || item.libelle || label || code}</span>
        <span className="mt-2 block break-words text-xl font-black text-[#2f2415]">{displayValue(resolvedValue)}{resolvedUnit ? ` ${resolvedUnit}` : ''}</span>
        <span className="mt-1 block break-words text-xs text-[#8a7456]">{resolvedPeriod} · {resolvedSource}</span>
        {resolvedVariation !== undefined && resolvedVariation !== null && resolvedVariation !== '' ? <span className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${variationNumber < 0 ? 'text-red-700' : 'text-emerald-700'}`}><VariationIcon size={13} />{resolvedVariation}</span> : null}
      </span>
      {Tag === 'button' ? <ArrowRight size={17} className="mt-1 text-[#9a6b12]" aria-hidden="true" /> : null}
    </Tag>
  );
}
