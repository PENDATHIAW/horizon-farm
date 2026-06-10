import { buildChairKpis, buildPondeuseKpis, buildBovinKpis } from './elevageActivityPnl.js';
import { fmtCurrency, fmtNumber, fmtPercent } from './format.js';

const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

function isPondeuseLot(row = {}) {
  const l = lower(`${row.type || ''} ${row.name || ''} ${row.nom || ''}`);
  return l.includes('pondeuse') || l.includes('ponte') || l.includes('oeuf');
}

function isChairLot(row = {}) {
  return lower(`${row.type || ''} ${row.name || ''}`).includes('chair');
}

/**
 * Diagnostic lot/animal — règles métier, pas LLM.
 */
export function diagnoseElevageEntity(entity = {}, { lots = [], marginContext = {} } = {}) {
  const isLot = entity.initial_count != null || entity.effectif_actuel != null || isChairLot(entity) || isPondeuseLot(entity);
  let kpi;
  let peers = [];

  if (isLot && isChairLot(entity)) {
    kpi = buildChairKpis(entity, marginContext);
    peers = lots.filter(isChairLot).map((l) => buildChairKpis(l, marginContext)).filter((k) => k.costPerKg > 0);
  } else if (isLot && isPondeuseLot(entity)) {
    kpi = buildPondeuseKpis(entity, marginContext);
    peers = lots.filter(isPondeuseLot).map((l) => buildPondeuseKpis(l, marginContext)).filter((k) => k.costPerEgg > 0);
  } else {
    kpi = buildBovinKpis(entity, marginContext);
    peers = [];
  }

  const name = entity.name || entity.nom || entity.id || 'Entité';
  const causes = [];
  const tips = [];

  if (kpi.missing?.includes('alimentation')) {
    causes.push('surconsommation ou distribution aliment non tracée');
    tips.push('Vérifier les distributions Alimentation sur 7 jours.');
  }
  if (kpi.missing?.includes('santé')) {
    causes.push('coûts santé incomplets');
    tips.push('Compléter les interventions Santé avec coûts.');
  }
  if (kpi.missing?.includes('poids') || kpi.missing?.includes('vente')) {
    causes.push('poids ou revenu non renseigné');
    tips.push('Enregistrer une pesée ou un prix de vente cible.');
  }

  if (kpi.costPerKg && peers.length > 1) {
    const avg = peers.reduce((s, p) => s + n(p.costPerKg), 0) / peers.length;
    const diff = ((kpi.costPerKg - avg) / avg) * 100;
    if (diff > 8) {
      causes.push(`coût/kg supérieur de ${fmtPercent(diff)} au lot moyen`);
    }
  }

  if (kpi.costPerEgg && peers.length > 1) {
    const avg = peers.reduce((s, p) => s + n(p.costPerEgg), 0) / peers.length;
    const diff = ((kpi.costPerEgg - avg) / avg) * 100;
    if (diff > 10) {
      causes.push(`coût/œuf supérieur de ${fmtPercent(diff)} à la moyenne pondeuses`);
    }
  }

  if (n(kpi.mortalityRate) > 5 || n(kpi.mortality) > 20) {
    causes.push('mortalité élevée');
    tips.push('Analyser causes en Santé et journal mortalité Avicole.');
  }

  const causeText = causes.length
    ? `Cause probable : ${causes.slice(0, 2).join(' ; ')}.`
    : kpi.reliable
      ? 'Performance dans la norme pour les données disponibles.'
      : 'Données insuffisantes pour un diagnostic fiable.';

  const summaryParts = [
    `Diagnostic · ${name}`,
    kpi.costPerKg ? `IC ${fmtCurrency(kpi.costPerKg)}/kg` : null,
    kpi.costPerEgg ? `Coût/œuf ${fmtCurrency(kpi.costPerEgg)}` : null,
    kpi.gmq ? `GMQ ${fmtNumber(kpi.gmq)} g/j` : null,
    kpi.margin != null ? `Marge ${fmtCurrency(kpi.margin)}` : null,
  ].filter(Boolean);

  return {
    title: summaryParts.join(' · '),
    causeText,
    tips,
    reliable: kpi.reliable,
    kpi,
  };
}

export function pickDefaultDiagnosticTarget({ lots = [], animaux = [] } = {}) {
  const chair = lots.find((l) => isChairLot(l) && n(l.current_count ?? l.effectif_actuel) > 0);
  if (chair) return { entity: chair, type: 'lot' };
  const pondeuse = lots.find((l) => isPondeuseLot(l));
  if (pondeuse) return { entity: pondeuse, type: 'lot' };
  const bovin = animaux[0];
  if (bovin) return { entity: bovin, type: 'animal' };
  return null;
}
