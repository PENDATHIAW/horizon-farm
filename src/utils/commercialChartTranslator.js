/**
 * Commercial V1 - traducteur de graphiques (format dirigeant).
 */

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

export function translateCommercialChartInsights(chartDataset = {}) {
  const monthly = arr(chartDataset.monthly);
  const kpis = chartDataset.kpis || {};
  const insights = [];

  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    const caDelta = n(last.ca) - n(prev.ca);
    const paidDelta = n(last.encaisse) - n(prev.encaisse);
    const marginDelta = n(last.marge) - n(prev.marge);

    if (caDelta > 0) {
      insights.push({
        id: 'ca-up',
        chart: 'CA mensuel',
        progressing: `CA +${caDelta.toLocaleString('fr-FR')} FCFA vs mois précédent`,
        declining: caDelta < 0 ? `CA ${caDelta.toLocaleString('fr-FR')} FCFA` : null,
        probableCause: paidDelta < caDelta ? 'Ventes à crédit ou encaissements en retard' : 'Volume ou prix en hausse',
        recommendedAction: paidDelta < caDelta ? 'Relancer les créances du mois' : 'Maintenir la cadence commerciale',
      });
    } else if (caDelta < 0) {
      insights.push({
        id: 'ca-down',
        chart: 'CA mensuel',
        progressing: null,
        declining: `CA ${caDelta.toLocaleString('fr-FR')} FCFA vs mois précédent`,
        probableCause: 'Baisse volume clients ou saisonnalité',
        recommendedAction: 'Activer Opportunités et relances clients dormants',
      });
    }

    if (marginDelta < 0 && n(last.ca) > 0) {
      insights.push({
        id: 'margin-down',
        chart: 'Marge fiable',
        progressing: null,
        declining: `Marge ${marginDelta.toLocaleString('fr-FR')} FCFA`,
        probableCause: 'Coûts directs ou livraison en hausse',
        recommendedAction: 'Vérifier marges par produit dans Finance → Rentabilité',
      });
    }
  }

  if (kpis.month?.attainment != null) {
    const att = kpis.month.attainment;
    insights.push({
      id: 'target-month',
      chart: 'Objectif mensuel',
      progressing: att >= 100 ? `Objectif atteint (${att}%)` : att >= 80 ? `Progression ${att}%` : null,
      declining: att < 80 ? `Réalisé ${att}% de l'objectif` : null,
      probableCause: att < 80 ? 'Écart volume ou délais encaissement' : 'Bonne exécution commerciale',
      recommendedAction: att < 80 ? `Combler ${n(kpis.month.target) - n(kpis.month.actual).toLocaleString('fr-FR')} FCFA restants` : 'Consolider les clients performants',
    });
  }

  const marginByActivity = arr(chartDataset.marginByActivity);
  if (marginByActivity.length >= 2) {
    const top = marginByActivity[0];
    const weak = marginByActivity[marginByActivity.length - 1];
    insights.push({
      id: 'activity-margin',
      chart: 'Marge par activité',
      progressing: `${top.name} leader marge`,
      declining: `${weak.name} marge faible`,
      probableCause: 'Mix produits ou coûts de production différenciés',
      recommendedAction: 'Promouvoir les activités rentables via Opportunités',
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'neutral',
      chart: 'Commercial',
      progressing: 'Données insuffisantes pour tendance',
      declining: null,
      probableCause: 'Peu de ventes sur la période',
      recommendedAction: 'Enregistrer ventes et encaissements pour activer les analyses',
    });
  }

  return insights;
}

export function formatChartInsightForDirector(insight = {}) {
  const lines = [];
  if (insight.progressing) lines.push(`↑ ${insight.progressing}`);
  if (insight.declining) lines.push(`↓ ${insight.declining}`);
  lines.push(`Cause probable : ${insight.probableCause || '-'}`);
  lines.push(`Action : ${insight.recommendedAction || '-'}`);
  return lines.join('\n');
}
