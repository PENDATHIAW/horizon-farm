const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const money = (value) => `${Math.round(num(value)).toLocaleString('fr-FR')} FCFA`;
const daysBetween = (a, b = new Date()) => {
  const left = a ? new Date(a) : null;
  if (!left || Number.isNaN(left.getTime())) return null;
  return Math.ceil((left.getTime() - new Date(b).getTime()) / 86400000);
};

const scoreSeverity = (severity) => ({ critique: 100, haute: 80, moyenne: 55, basse: 30 }[severity] || 40);
const bySeverity = (a, b) => scoreSeverity(b.severity) - scoreSeverity(a.severity);

function insight({ id, severity = 'moyenne', module = 'dashboard', title, message, action, reason, metric = null, confidence = 80 }) {
  return { id, severity, module, title, message, action, reason, metric, confidence };
}

export function buildHorizonProactiveInsights(data = {}) {
  const stocks = arr(data.stocks || data.stock);
  const lots = arr(data.lots || data.avicole);
  const animaux = arr(data.animaux);
  const salesOrders = arr(data.salesOrders || data.sales_orders || data.ventes);
  const payments = arr(data.payments || data.paiements);
  const transactions = arr(data.transactions || data.finances);
  const sante = arr(data.sante || data.vaccins);
  const taches = arr(data.taches || data.tasks);
  const alertes = arr(data.alertes || data.alertes_center);
  const sensors = arr(data.sensors || data.sensor_devices);
  const cameras = arr(data.cameras || data.camera_devices);
  const cultures = arr(data.cultures);
  const fournisseurs = arr(data.fournisseurs);

  const insights = [];

  const stockCritiques = stocks.filter((s) => num(s.quantite ?? s.quantity ?? s.stock) <= num(s.seuil ?? s.threshold ?? s.min_stock) && num(s.seuil ?? s.threshold ?? s.min_stock) > 0);
  stockCritiques.forEach((s) => insights.push(insight({
    id: `stock-${s.id || s.produit}`,
    severity: 'critique',
    module: 'stock',
    title: `Stock critique : ${s.produit || s.name || 'produit'}`,
    message: `Quantité disponible ${s.quantite ?? s.quantity ?? 0} ${s.unite || ''}, seuil ${s.seuil ?? s.threshold ?? 0}.`,
    action: 'Préparer un réapprovisionnement, comparer les prix fournisseurs et vérifier la consommation réelle.',
    reason: 'Risque de rupture opérationnelle.',
  })));

  const totalCA = salesOrders.reduce((sum, row) => sum + num(row.montant_total ?? row.total_amount ?? row.total ?? row.montant), 0);
  const encaisse = payments.reduce((sum, row) => sum + num(row.montant ?? row.amount ?? row.total), 0) + transactions.filter((t) => ['entree', 'recette', 'encaissement'].includes(String(t.type || '').toLowerCase())).reduce((sum, row) => sum + num(row.montant ?? row.amount), 0);
  const depenses = transactions.filter((t) => ['sortie', 'depense', 'charge', 'achat'].some((word) => String(`${t.type || ''} ${t.categorie || ''}`).toLowerCase().includes(word))).reduce((sum, row) => sum + num(row.montant ?? row.amount), 0);
  const creances = Math.max(0, totalCA - encaisse);

  if (creances > 0 && totalCA > 0 && creances / totalCA >= 0.25) insights.push(insight({
    id: 'finance-creances',
    severity: creances / totalCA >= 0.45 ? 'critique' : 'haute',
    module: 'finances',
    title: 'Créances élevées',
    message: `${money(creances)} restent à encaisser, soit ${Math.round((creances / totalCA) * 100)}% du CA suivi.`,
    action: 'Prioriser les relances clients et éviter de nouvelles ventes à crédit sans acompte.',
    reason: 'Risque de tension de trésorerie.',
    metric: creances,
  }));

  if (depenses > encaisse && depenses > 0) insights.push(insight({
    id: 'finance-cash-negative',
    severity: 'haute',
    module: 'finances',
    title: 'Cash opérationnel sous pression',
    message: `Dépenses ${money(depenses)} contre encaissements ${money(encaisse)}.`,
    action: 'Réduire les dépenses non urgentes, accélérer les encaissements et sécuriser les achats critiques.',
    reason: 'Les sorties dépassent les entrées enregistrées.',
  }));

  const lotsAlerte = lots.filter((lot) => num(lot.mortality || lot.mortalite) > num(lot.initial_count || lot.effectif_initial) * 0.04 || num(lot.scoresSante || lot.score_sante || 100) < 88);
  lotsAlerte.forEach((lot) => insights.push(insight({
    id: `lot-${lot.id || lot.name}`,
    severity: 'critique',
    module: 'avicole',
    title: `Lot avicole à surveiller : ${lot.name || lot.nom || lot.id}`,
    message: `Mortalité ${lot.mortality || lot.mortalite || 0}, score santé ${lot.scoresSante || lot.score_sante || 'N/A'}.`,
    action: 'Vérifier température, eau, ventilation, densité, alimentation et déclencher un contrôle sanitaire.',
    reason: 'Indicateurs avicoles anormaux.',
  })));

  const soinsUrgents = sante.filter((s) => ['retard', 'urgent', 'critique'].some((word) => String(`${s.statut || ''} ${s.priority || ''}`).toLowerCase().includes(word)));
  soinsUrgents.forEach((s) => insights.push(insight({
    id: `sante-${s.id || s.nom}`,
    severity: 'haute',
    module: 'sante',
    title: `Action santé à traiter : ${s.nom || s.title || 'soin'}`,
    message: `Statut ${s.statut || s.status || 'à vérifier'}, cible ${s.animal || s.lot || 'non précisée'}.`,
    action: 'Planifier ou confirmer le soin, rattacher la preuve et vérifier l’impact sur le lot/animal.',
    reason: 'La santé animale impacte directement production, mortalité et rentabilité.',
  })));

  const animauxMalades = animaux.filter((a) => ['malade', 'sous surveillance', 'surveillance'].some((word) => String(`${a.health_status || a.statut || ''}`).toLowerCase().includes(word)));
  animauxMalades.forEach((a) => insights.push(insight({
    id: `animal-${a.id || a.name}`,
    severity: 'haute',
    module: 'animaux',
    title: `Animal à surveiller : ${a.name || a.nom || a.id}`,
    message: `Statut santé : ${a.health_status || a.statut || 'à vérifier'}.`,
    action: 'Créer une tâche de suivi, vérifier alimentation, température et historique sanitaire.',
    reason: 'Un cas isolé peut devenir un risque sanitaire plus large.',
  })));

  const culturesRisque = cultures.filter((c) => num(c.score_sante || c.health_score || 100) < 80 || ['perdu', 'risque', 'stress'].includes(String(c.statut || '').toLowerCase()));
  culturesRisque.forEach((c) => insights.push(insight({
    id: `culture-${c.id || c.nom}`,
    severity: 'moyenne',
    module: 'cultures',
    title: `Culture à risque : ${c.nom || c.name || c.id}`,
    message: `Score santé ${c.score_sante || c.health_score || 'N/A'}, statut ${c.statut || 'à vérifier'}.`,
    action: 'Vérifier irrigation, intrants, ravageurs et calendrier cultural.',
    reason: 'Risque de perte de rendement.',
  })));

  const tachesRetard = taches.filter((t) => {
    const due = daysBetween(t.due_date || t.deadline || t.date_limite);
    return String(t.status || t.statut || '').toLowerCase().includes('retard') || (due !== null && due < 0 && !['termine', 'terminée', 'done'].includes(String(t.status || t.statut || '').toLowerCase()));
  });
  if (tachesRetard.length) insights.push(insight({
    id: 'tasks-late',
    severity: 'moyenne',
    module: 'taches',
    title: `${tachesRetard.length} tâche(s) en retard`,
    message: 'Des actions terrain restent ouvertes après leur échéance.',
    action: 'Réordonner les tâches par urgence et affecter un responsable.',
    reason: 'Les retards terrain créent des risques opérationnels.',
  }));

  const sensorAlerts = sensors.filter((s) => ['offline', 'alerte', 'critique', 'panne'].some((word) => String(`${s.status || s.statut || ''}`).toLowerCase().includes(word)));
  if (sensorAlerts.length) insights.push(insight({
    id: 'smartfarm-sensors',
    severity: 'moyenne',
    module: 'smartfarm',
    title: `${sensorAlerts.length} capteur(s) Smart Farm à vérifier`,
    message: 'Des capteurs ne sont pas en état nominal.',
    action: 'Vérifier alimentation, réseau, emplacement et dernier relevé.',
    reason: 'Une mauvaise donnée terrain fausse les recommandations IA.',
  }));

  const cameraAlerts = cameras.filter((c) => ['offline', 'alerte', 'panne'].some((word) => String(`${c.status || c.statut || ''}`).toLowerCase().includes(word)));
  if (cameraAlerts.length) insights.push(insight({
    id: 'smartfarm-cameras',
    severity: 'moyenne',
    module: 'smartfarm',
    title: `${cameraAlerts.length} caméra(s) à vérifier`,
    message: 'La couverture sécurité ou observation peut être réduite.',
    action: 'Vérifier réseau, alimentation, angle de vue et détection nocturne.',
    reason: 'Sécurité et observation animale nécessitent une disponibilité continue.',
  }));

  const fournisseursRisque = fournisseurs.filter((f) => num(f.dettes || f.solde || 0) > 0 || ['a_risque', 'bloque', 'retard'].includes(String(f.statut || f.status || '').toLowerCase()));
  if (fournisseursRisque.length) insights.push(insight({
    id: 'suppliers-risk',
    severity: 'moyenne',
    module: 'fournisseurs',
    title: `${fournisseursRisque.length} fournisseur(s) à surveiller`,
    message: 'Dettes, retards ou statut à risque détectés.',
    action: 'Comparer les prix, clarifier les dettes et sécuriser un fournisseur alternatif.',
    reason: 'La dépendance fournisseur est critique pour les aliments et intrants.',
  }));

  const proactive = insights.sort(bySeverity);
  const urgent = proactive.filter((i) => i.severity === 'critique');
  const high = proactive.filter((i) => i.severity === 'haute');
  const score = Math.max(0, 100 - urgent.length * 16 - high.length * 9 - Math.max(0, proactive.length - urgent.length - high.length) * 4);

  const nextActions = proactive.slice(0, 5).map((i) => ({ module: i.module, title: i.title, action: i.action, severity: i.severity }));

  return {
    generated_at: new Date().toISOString(),
    proactive_score: score,
    urgent_count: urgent.length,
    high_count: high.length,
    total_count: proactive.length,
    insights: proactive,
    next_actions: nextActions,
    executive_summary: proactive.length
      ? `Horizon détecte ${urgent.length} urgence(s), ${high.length} priorité(s) haute(s) et ${proactive.length} point(s) à suivre.`
      : 'Horizon ne détecte pas d’anomalie proactive majeure pour le moment.',
  };
}

export default buildHorizonProactiveInsights;
