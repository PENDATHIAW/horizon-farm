import {
  AlertTriangle,
  Banknote,
  Boxes,
  ClipboardList,
  Coins,
  Egg,
  FileText,
  Gauge,
  Handshake,
  Minus,
  PackageCheck,
  ShoppingCart,
  Sprout,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react';
import { useMemo } from 'react';
import { CATALOGUE_KPI, valeurKpi } from '../../config/catalogueKpi.js';

const ICONS = Object.freeze({
  alertes_urgentes: AlertTriangle,
  ca: Coins,
  capteurs_actifs: Wifi,
  commandes_ouvertes: ShoppingCart,
  creances: Banknote,
  cultures_actives: Sprout,
  depenses: Banknote,
  documents_total: FileText,
  effectif_animaux: Users,
  encaissements: Coins,
  equipements_disponibles: Wrench,
  evenements_jour: Gauge,
  fournisseurs_actifs: Handshake,
  marge_globale: Gauge,
  membres_equipe: Users,
  opportunites_financement: Handshake,
  ponte: Egg,
  produits_sous_seuil: PackageCheck,
  stocks_total: Boxes,
  taches_ouvertes: ClipboardList,
  tresorerie: Wallet,
  valeur_stock: Boxes,
});

const SENS_CLASSES = Object.freeze({
  positive: {
    text: 'text-positive',
    bg: 'bg-positive-bg',
    line: 'text-positive',
  },
  vigilance: {
    text: 'text-horizon-dark',
    bg: 'bg-vigilance-bg',
    line: 'text-vigilance',
  },
  urgent: {
    text: 'text-urgent',
    bg: 'bg-urgent-bg',
    line: 'text-urgent',
  },
  neutral: {
    text: 'text-neutral',
    bg: 'bg-neutral-bg',
    line: 'text-neutral',
  },
});

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: Number.isInteger(number) ? 0 : 1,
  }).format(number);
}

function trendStatus(variation, favorableDirection = 'up', explicitStatus = '') {
  if (SENS_CLASSES[explicitStatus]) return explicitStatus;
  const number = Number(variation);
  if (!Number.isFinite(number) || number === 0) return 'neutral';
  const favorable = favorableDirection === 'down' ? number < 0 : number > 0;
  return favorable ? 'positive' : 'urgent';
}

function trendPoints(values = []) {
  const rows = values.map(Number).filter(Number.isFinite);
  const series = rows.length >= 2 ? rows : [50, 50, 50, 50, 50, 50];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  return series.map((value, index) => {
    const x = (index / Math.max(1, series.length - 1)) * 100;
    const y = 30 - ((value - min) / range) * 22;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function HorizonLine({ values, status }) {
  const classes = SENS_CLASSES[status] || SENS_CLASSES.neutral;
  return (
    <div className={`hf-kpi-line ${classes.line}`} aria-hidden="true">
      <svg viewBox="0 0 100 34" preserveAspectRatio="none" focusable="false">
        <line x1="0" y1="31" x2="100" y2="31" stroke="currentColor" opacity="0.18" vectorEffect="non-scaling-stroke" />
        <polyline points={trendPoints(values)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="hf-kpi-card hf-enter" aria-busy="true" aria-label="Chargement de l’indicateur">
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-2/5 rounded-full bg-neutral-bg" />
        <div className="h-9 w-3/4 rounded-control bg-neutral-bg" />
        <div className="h-3 w-1/3 rounded-full bg-neutral-bg" />
        <div className="h-8 w-full rounded-control bg-neutral-bg" />
      </div>
    </div>
  );
}

export default function CarteKPI({
  code,
  periode = '',
  donnees = {},
  kpis = null,
  periodScope = {},
  onNavigate,
  onClick,
  label,
  value,
  unit,
  variation,
  comparison,
  trend = [],
  favorableDirection,
  status,
  icon: IconProp,
  loading = false,
  module,
  className = '',
}) {
  const resultat = useMemo(
    () => (code ? valeurKpi(code, donnees, { periodScope, kpis }) : { valeur: value, disponible: value != null, entree: null }),
    [code, donnees, periodScope, kpis, value],
  );
  const entree = resultat.entree || CATALOGUE_KPI[code] || {};
  if (loading) return <LoadingCard />;
  if (!code && !label) return null;

  const displayValue = value ?? resultat.valeur;
  const hasData = value != null ? Number.isFinite(Number(value)) || String(value).trim() !== '' : resultat.disponible !== false && displayValue != null;
  const displayLabel = label || entree.libelle || code;
  const displayUnit = unit ?? entree.unite ?? '';
  const displayVariation = variation ?? resultat.variation ?? null;
  const displayTrend = trend.length ? trend : (resultat.tendance || []);
  const hasComparison = displayVariation != null && Number.isFinite(Number(displayVariation));
  const hasTrend = displayTrend.map(Number).filter(Number.isFinite).length >= 2;
  const displayComparison = comparison || resultat.comparaison || (hasComparison ? 'vs période précédente' : 'Historique à venir');
  const direction = Number(displayVariation) > 0 ? 'up' : Number(displayVariation) < 0 ? 'down' : 'neutral';
  const semanticStatus = trendStatus(displayVariation, favorableDirection || entree.sensFavorable || 'up', status);
  const semanticClasses = SENS_CLASSES[semanticStatus];
  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const Icon = IconProp || ICONS[code] || Gauge;
  const destination = module || entree.proprietaire;
  const action = onClick || (typeof onNavigate === 'function' && destination ? () => onNavigate(destination) : null);

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="hf-kpi-label">{displayLabel}</p>
        <Icon className="shrink-0 text-horizon-dark" size={18} aria-hidden="true" />
      </div>

      <div className="mt-4 min-w-0">
        <p className="hf-kpi-value break-words">{hasData ? formatNumber(displayValue) : '-'}</p>
        <p className="hf-kpi-unit">{hasData ? displayUnit : 'Pas encore de données'}</p>
        {periode && hasData ? <p className="hf-kpi-period">{periode}</p> : null}
      </div>

      <div className="mt-auto pt-4">
        {hasComparison ? (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <span className={`hf-trend-pill ${semanticClasses.bg} ${semanticClasses.text}`}>
                <TrendIcon size={15} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className={`hf-kpi-variation ${semanticClasses.text}`}>
                {`${Number(displayVariation) > 0 ? '+' : ''}${formatNumber(displayVariation)} %`}
              </span>
              <span className="hf-kpi-comparison truncate">{displayComparison}</span>
            </div>
            {hasTrend ? <HorizonLine values={displayTrend} status={semanticStatus} /> : null}
          </>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-bg px-2 py-1 text-meta font-semibold text-slate">
            <Minus size={12} strokeWidth={2.5} aria-hidden="true" />
            {displayComparison}
          </span>
        )}
      </div>
    </>
  );

  if (action) {
    return (
      <button
        type="button"
        onClick={action}
        aria-label={`${displayLabel}${hasData ? ` : ${formatNumber(displayValue)} ${displayUnit}` : ''}`}
        className={`hf-kpi-card hf-kpi-card-clickable hf-enter ${className}`}
      >
        {content}
      </button>
    );
  }

  return <article className={`hf-kpi-card hf-enter ${className}`}>{content}</article>;
}
