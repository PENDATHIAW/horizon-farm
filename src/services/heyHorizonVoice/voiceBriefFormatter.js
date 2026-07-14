import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { textOrMissing } from '../heyHorizonCore/coreUtils.js';

const MISSING = 'Non renseigné';

function toneFromCount(count, warnAt = 1) {
  if (count == null || count === MISSING) return 'missing';
  if (Number(count) >= warnAt) return 'warn';
  return 'ok';
}

function section(key, label, value, detail = '', tone = 'ok') {
  return { key, label, value: textOrMissing(value, MISSING), detail, tone };
}

function formatEggs(production) {
  if (!production) return { value: MISSING, detail: '' };
  const period = production.oeufs_periode;
  const cumul = production.oeufs_cumul;
  const tablettes = production.tablettes_vendues_periode;
  const parts = [];
  if (period > 0) parts.push(`${fmtNumber(period)} œufs période`);
  if (tablettes > 0) parts.push(`${fmtNumber(tablettes)} tablette(s) vendue(s)`);
  if (!parts.length && cumul > 0) parts.push(`${fmtNumber(cumul)} œufs cumul`);
  if (!parts.length) return { value: MISSING, detail: '' };
  const delta = production.delta_oeufs_vs_mois_precedent;
  const detail = delta != null && delta !== 0
    ? `Évolution vs mois précédent : ${delta > 0 ? '+' : ''}${fmtNumber(delta)} œufs`
    : '';
  return { value: parts.join(' · '), detail };
}

function formatMeteo(meteo) {
  if (!meteo) return section('meteo', 'Météo', MISSING);
  const temp = meteo.temperature != null ? `${meteo.temperature}°C` : null;
  const condition = meteo.condition && meteo.condition !== MISSING ? meteo.condition : null;
  const value = [temp, condition].filter(Boolean).join(' · ') || MISSING;
  return section('meteo', 'Météo', value, meteo.source !== MISSING ? `Source : ${meteo.source}` : '');
}

function formatRecommendations(recommendations = []) {
  if (!recommendations.length) {
    return section('recommandations', 'Recommandations', MISSING, 'Aucune suggestion détectée.');
  }
  const top = recommendations.slice(0, 3).map((r) => r.title || r.summary).filter(Boolean);
  return section(
    'recommandations',
    'Recommandations',
    `${recommendations.length} signal(aux) d’analyse`,
    top.join(' · ') || MISSING,
    recommendations.length > 2 ? 'warn' : 'ok',
  );
}

/**
 * Construit les sections structurées du brief ferme.
 */
export function buildBriefSections({
  snapshot = {},
  recommendations = [],
  urgentTasks = [],
} = {}) {
  const { farm = {}, finance = {}, poultry = {}, inventory = {}, sales = {}, risk = {} } = snapshot;
  const eggs = formatEggs(poultry.production_oeufs);
  const lowStock = inventory.alertes_sous_seuil || [];
  const openAlerts = risk.counts?.alertes_ouvertes ?? farm.counts?.alertes_ouvertes ?? 0;
  const openTasks = risk.counts?.taches_ouvertes ?? urgentTasks.length;

  const sections = [
    section(
      'ponte',
      'Ponte',
      eggs.value,
      eggs.detail,
      eggs.value === MISSING ? 'missing' : 'ok',
    ),
    section(
      'mortalite',
      'Mortalité',
      poultry.sante?.mortalite_cumulee > 0
        ? `${fmtNumber(poultry.sante.mortalite_cumulee)} sujet(s)`
        : poultry.lots?.total > 0 ? '0 sujet signalé' : MISSING,
      poultry.sante?.malades_signales > 0
        ? `${fmtNumber(poultry.sante.malades_signales)} malade(s) signalé(s)`
        : '',
      toneFromCount(poultry.sante?.mortalite_cumulee, 1),
    ),
    section(
      'ventes',
      'Ventes',
      sales.ventes?.ca_periode > 0 || sales.ventes?.commandes_periode > 0
        ? `CA ${fmtCurrency(sales.ventes.ca_periode)} · ${fmtNumber(sales.ventes.commandes_periode)} commande(s)`
        : sales.ventes?.ca_cumul > 0
          ? `CA cumul ${fmtCurrency(sales.ventes.ca_cumul)}`
          : MISSING,
      sales.creances?.montant_total > 0
        ? `Créances ${fmtCurrency(sales.creances.montant_total)}`
        : '',
      'ok',
    ),
    section(
      'encaissements',
      'Encaissements',
      finance.treasury?.encaissements > 0
        ? fmtCurrency(finance.treasury.encaissements)
        : MISSING,
      finance.period?.label && finance.period.label !== MISSING
        ? `Période : ${finance.period.label}`
        : '',
      'ok',
    ),
    section(
      'depenses',
      'Dépenses',
      finance.treasury?.depenses > 0
        ? fmtCurrency(finance.treasury.depenses)
        : MISSING,
      finance.treasury?.resultat != null
        ? `Résultat trésorerie ${fmtCurrency(finance.treasury.resultat)}`
        : '',
      finance.treasury?.depenses > finance.treasury?.encaissements ? 'warn' : 'ok',
    ),
    section(
      'stock_critique',
      'Stock critique',
      lowStock.length
        ? `${lowStock.length} produit(s) sous seuil`
        : inventory.stock?.produits_total > 0 ? 'Aucun sous seuil' : MISSING,
      lowStock.length
        ? lowStock.slice(0, 4).map((s) => s.designation).join(' · ')
        : '',
      toneFromCount(lowStock.length, 1),
    ),
    section(
      'alertes',
      'Alertes',
      openAlerts > 0 ? `${fmtNumber(openAlerts)} ouverte(s)` : openAlerts === 0 ? 'Aucune alerte ouverte' : MISSING,
      risk.counts?.critical > 0 ? `${fmtNumber(risk.counts.critical)} critique(s)` : '',
      toneFromCount(openAlerts, 1),
    ),
    section(
      'taches_urgentes',
      'Tâches urgentes',
      urgentTasks.length
        ? `${fmtNumber(urgentTasks.length)} prioritaire(s)`
        : openTasks > 0 ? `${fmtNumber(openTasks)} ouverte(s)` : MISSING,
      urgentTasks.slice(0, 3).map((t) => t.title || t.nom || t.libelle || t.id).join(' · '),
      toneFromCount(urgentTasks.length || openTasks, 1),
    ),
    formatMeteo(farm.meteo),
    formatRecommendations(recommendations),
  ];

  return sections;
}

function sectionToLine(item, includeDetail = true) {
  const detail = includeDetail && item.detail ? ` (${item.detail})` : '';
  return `• ${item.label} : ${item.value}${detail}`;
}

/**
 * Formate le brief complet ou ciblé en texte + payload TTS.
 */
export function formatVoiceBrief({
  snapshot = {},
  sections = [],
  queryType = 'weekly_brief',
  phrase = '',
  strategic = null,
  farmName = MISSING,
  periodLabel = MISSING,
} = {}) {
  const titleByType = {
    weekly_brief: 'Brief de la semaine',
    encaissements: 'Encaissements',
    lot_profitability: 'Rentabilité des lots',
    risks: 'Risques actuels',
    low_stock: 'Stocks faibles',
    urgent_tasks: 'Actions urgentes',
    general: 'Brief Hey Horizon',
  };

  const title = titleByType[queryType] || titleByType.general;
  const focusKeys = {
    encaissements: ['encaissements', 'ventes', 'depenses'],
    lot_profitability: ['ventes', 'depenses', 'recommandations'],
    risks: ['alertes', 'recommandations', 'taches_urgentes'],
    low_stock: ['stock_critique'],
    urgent_tasks: ['taches_urgentes', 'alertes'],
  };

  const keys = focusKeys[queryType];
  const visibleSections = keys
    ? sections.filter((s) => keys.includes(s.key))
    : sections;

  const headline = strategic?.summary
    || (queryType === 'encaissements' && snapshot.finance?.treasury?.encaissements > 0
      ? `Encaissements : ${fmtCurrency(snapshot.finance.treasury.encaissements)}${periodLabel !== MISSING ? ` sur ${periodLabel}` : ''}.`
      : queryType === 'low_stock' && snapshot.inventory?.stock?.sous_seuil > 0
        ? `${snapshot.inventory.stock.sous_seuil} stock(s) sous seuil - vérifie les réapprovisionnements.`
        : `${farmName !== MISSING ? `${farmName} · ` : ''}${title}${periodLabel !== MISSING ? ` · ${periodLabel}` : ''}.`);

  const bodyLines = visibleSections.map((s) => sectionToLine(s));
  if (strategic?.rows?.length && ['lot_profitability', 'risks'].includes(queryType)) {
    strategic.rows.slice(0, 4).forEach((row) => {
      bodyLines.push(`• ${row.title} : ${row.value}${row.detail ? ` (${row.detail})` : ''}`);
    });
  }

  const text = [
    `🎙️ ${title}`,
    headline,
    '',
    ...bodyLines,
    '',
    'Lecture seule - aucune écriture ERP sans validation.',
  ].join('\n');

  const ttsText = [
    title,
    headline.replace(/🎙️|⚠️|•/g, ''),
    ...visibleSections.map((s) => `${s.label} : ${s.value}`),
  ].join('. ');

  return {
    title,
    headline,
    text,
    sections: visibleSections,
    allSections: sections,
    tts: {
      text: ttsText,
      lang: 'fr-FR',
      optional: true,
      supported: typeof globalThis !== 'undefined'
        ? 'speechSynthesis' in globalThis || typeof window !== 'undefined' && 'speechSynthesis' in window
        : false,
    },
    phrase,
    queryType,
    readOnly: true,
  };
}

export default formatVoiceBrief;
