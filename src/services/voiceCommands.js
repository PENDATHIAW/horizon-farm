import { buildPondeusesIntelligence } from './aiPondeusesService';

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (text, words) => words.some((word) => text.includes(normalizeText(word)));
const exactAny = (text, words) => words.some((word) => text === normalizeText(word));
const formatCurrency = (value = 0) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
const formatNumber = (value = 0, digits = 0) => Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: digits });
const asRows = (dataMap, key) => (Array.isArray(dataMap?.[key]) ? dataMap[key] : []);

const getNumber = (row, keys = []) => {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value) && value !== 0) return value;
  }
  return 0;
};

const sumBy = (rows, keys) => rows.reduce((sum, row) => sum + getNumber(row, keys), 0);
const labelOf = (row = {}) => row.name || row.nom || row.title || row.libelle || row.produit || row.animal || row.reference || row.id || 'élément ERP';
const statusOf = (row = {}) => normalizeText(row.status || row.statut || row.etat || row.priority || row.severity || '');
const hasStatus = (row, statuses) => includesAny(statusOf(row), statuses);
const moneyKeys = ['montant', 'amount', 'total', 'total_ttc', 'valeur', 'cout', 'prix_total', 'paid_amount', 'montant_paye'];
const saleKeys = ['total_ttc', 'total', 'montant', 'amount', 'prix_total'];
const costKeys = ['cout', 'cout_total', 'cost', 'depense', 'montant', 'amount', 'prix_total'];

const findCriticalStocks = (dataMap = {}) =>
  asRows(dataMap, 'stock').filter((row) => Number(row.quantite || 0) <= Number(row.seuil || 0));

const stockValue = (dataMap = {}) =>
  asRows(dataMap, 'stock').reduce((sum, row) => {
    const qty = Number(row.quantite || row.quantity || 0);
    const unit = Number(row.prix_unitaire || row.unit_price || row.cout_unitaire || row.price || 0);
    return sum + qty * unit;
  }, 0);

const findHealthItems = (dataMap = {}) => [
  ...asRows(dataMap, 'sante').filter((row) => hasStatus(row, ['retard', 'urgent', 'critique', 'a faire'])),
  ...asRows(dataMap, 'animaux').filter((row) => hasStatus({ status: row.health_status || row.status || row.statut }, ['malade', 'critique', 'a surveiller'])),
  ...asRows(dataMap, 'avicole').filter((lot) => Number(lot.mortality || 0) > Number(lot.initial_count || 0) * 0.04 || Number(lot.scoresSante || lot.score_sante || 100) < 88),
];

const findCriticalAlerts = (dataMap = {}) =>
  asRows(dataMap, 'alertes_center').filter((row) => hasStatus(row, ['nouvelle', 'critique', 'haute', 'urgent', 'ouverte', 'open']));

const findLateTasks = (dataMap = {}) =>
  asRows(dataMap, 'taches').filter((row) => hasStatus(row, ['retard', 'critique', 'urgent', 'a faire']) || normalizeText(row.priority).includes('critique'));

const findReceivables = (dataMap = {}) => {
  const rows = [
    ...asRows(dataMap, 'payments').filter((row) => hasStatus(row, ['impaye', 'partiel', 'retard', 'en attente', 'pending', 'unpaid'])),
    ...asRows(dataMap, 'invoices').filter((row) => hasStatus(row, ['impaye', 'partiel', 'retard', 'en attente', 'pending', 'unpaid'])),
    ...asRows(dataMap, 'finances').filter((row) => hasStatus(row, ['impaye', 'partiel', 'retard']) || normalizeText(row.type).includes('creance')),
    ...asRows(dataMap, 'sales_orders').filter((row) => hasStatus(row, ['impaye', 'partiel', 'retard', 'livre', 'facture']) && !hasStatus(row, ['paye', 'paid'])),
  ];

  const amount = rows.reduce((sum, row) => {
    const paid = getNumber(row, ['montant_paye', 'paid_amount', 'amount_paid']);
    const total = getNumber(row, ['reste_a_payer', 'remaining_amount', 'balance', 'montant_restant', 'total_ttc', 'total', 'montant', 'amount']);
    return sum + Math.max(total - paid, 0);
  }, 0);

  return { rows, amount };
};

const getSalesMetrics = (dataMap = {}) => {
  const orders = asRows(dataMap, 'sales_orders');
  const invoices = asRows(dataMap, 'invoices');
  const payments = asRows(dataMap, 'payments');
  const deliveries = asRows(dataMap, 'deliveries');
  const opportunities = asRows(dataMap, 'sales_opportunities');
  const salesAmount = sumBy(orders, saleKeys) + sumBy(invoices, saleKeys);
  const paidAmount = sumBy(payments.filter((row) => hasStatus(row, ['paye', 'paid', 'encaisse']) || normalizeText(row.type).includes('paiement')), moneyKeys);
  const receivables = findReceivables(dataMap);
  return { orders, invoices, payments, deliveries, opportunities, salesAmount, paidAmount, receivables };
};

const getFinanceMetrics = (dataMap = {}) => {
  const finances = asRows(dataMap, 'finances');
  const recettes = finances.filter((row) => normalizeText(row.type).includes('entree') || normalizeText(row.categorie).includes('recette') || hasStatus(row, ['encaisse', 'paye']));
  const depenses = finances.filter((row) => normalizeText(row.type).includes('sortie') || normalizeText(row.categorie).includes('depense') || normalizeText(row.categorie).includes('charge'));
  const recettesAmount = sumBy(recettes, moneyKeys);
  const depensesAmount = sumBy(depenses, moneyKeys);
  const { salesAmount, paidAmount, receivables } = getSalesMetrics(dataMap);
  const ca = Math.max(salesAmount, recettesAmount);
  const encaisse = Math.max(paidAmount, recettesAmount);
  const marge = ca - depensesAmount;
  const margeRate = ca > 0 ? Math.round((marge / ca) * 100) : 0;
  return { finances, recettes, depenses, recettesAmount, depensesAmount, ca, encaisse, marge, margeRate, receivables };
};

const isTurnoverQuestion = (command) =>
  exactAny(command, ['ca', 'c a', 'chiffre affaire', 'chiffre affaires', 'chiffre d affaire', 'chiffre d affaires']) ||
  includesAny(command, ['chiffre affaire', 'chiffre affaires', 'chiffre d affaire', 'chiffre d affaires', 'combien ai je vendu', 'combien j ai vendu', 'combien j ai fait', 'montant vendu', 'montant des ventes', 'total ventes', 'total des ventes', 'revenu', 'revenus', 'volume vendu']);

const moduleCatalog = {
  dashboard: { label: 'Tableau de bord', aliases: ['dashboard', 'tableau de bord', 'accueil'] },
  impact_business: { label: 'Impact & Valeur ERP', aliases: ['impact', 'valeur', 'centre de decisions', 'decision', 'decisions', 'priorites', 'arbitrage'] },
  stock: { label: 'Stock', aliases: ['stock', 'stocks', 'rupture', 'inventaire', 'intrant', 'aliment'] },
  clients: { label: 'Clients & WhatsApp', aliases: ['client', 'clients', 'whatsapp', 'relance client'] },
  ventes: { label: 'Ventes', aliases: ['vente', 'ventes', 'commande', 'commandes', 'livraison', 'facture', 'paiement', 'encaissement', 'encaissements'] },
  finances: { label: 'Finances', aliases: ['finance', 'finances', 'cash', 'caisse', 'recette', 'recettes', 'depense', 'depenses', 'benefice', 'marge', 'creance', 'solde'] },
  comptabilite: { label: 'Comptabilité', aliases: ['comptabilite', 'compta', 'journal', 'bilan'] },
  avicole: { label: 'Avicole', aliases: ['avicole', 'poulet', 'poulets', 'pondeuse', 'pondeuses', 'oeuf', 'oeufs', 'lot'] },
  animaux: { label: 'Animaux', aliases: ['animaux', 'animal', 'bovin', 'mouton', 'chevre', 'betail'] },
  sante: { label: 'Santé & Vaccins', aliases: ['sante', 'vaccin', 'vaccins', 'maladie', 'soin', 'veterinaire'] },
  cultures: { label: 'Cultures', aliases: ['culture', 'cultures', 'maraichage', 'recolte', 'tomate', 'champ'] },
  investissements: { label: 'Investissements', aliases: ['investissement', 'investissements', 'business plan', 'financement', 'financeur', 'banque', 'bancabilite'] },
  fournisseurs: { label: 'Fournisseurs', aliases: ['fournisseur', 'fournisseurs', 'dette fournisseur', 'achat'] },
  tracabilite: { label: 'Traçabilité', aliases: ['tracabilite', 'trace', 'historique', 'mouvement'] },
  alertes: { label: 'Centre Alertes', aliases: ['alerte', 'alertes', 'risque', 'risques', 'critique'] },
  documents: { label: 'Documents', aliases: ['document', 'documents', 'facture', 'recu', 'preuve', 'justificatif'] },
  taches: { label: 'Tâches', aliases: ['tache', 'taches', 'action', 'actions', 'retard'] },
  rapports: { label: 'Rapports', aliases: ['rapport', 'rapports', 'export', 'pdf'] },
  equipements: { label: 'Équipements', aliases: ['equipement', 'equipements', 'machine', 'maintenance', 'panne'] },
  smartfarm: { label: 'Smart Farm', aliases: ['smart farm', 'capteur', 'capteurs', 'meteo', 'camera'] },
};

const dataKeysByModule = {
  dashboard: ['stock', 'clients', 'finances', 'avicole', 'sante', 'cultures', 'sales_orders', 'payments', 'alertes_center'],
  impact_business: ['stock', 'finances', 'payments', 'sales_orders', 'alertes_center', 'sante', 'taches', 'audit_logs', 'business_events'],
  stock: ['stock'],
  clients: ['clients', 'whatsapp_logs', 'sales_orders', 'payments'],
  ventes: ['sales_orders', 'sales_order_items', 'deliveries', 'invoices', 'payments', 'sales_opportunities'],
  finances: ['finances', 'payments', 'invoices'],
  comptabilite: ['finances', 'payments', 'invoices'],
  avicole: ['avicole', 'production_oeufs_logs', 'alimentation_logs'],
  animaux: ['animaux'],
  sante: ['sante', 'veterinaires'],
  cultures: ['cultures'],
  investissements: ['investissements', 'business_plans'],
  fournisseurs: ['fournisseurs'],
  tracabilite: ['tracabilite', 'business_events', 'audit_logs'],
  alertes: ['alertes_center'],
  documents: ['documents'],
  taches: ['taches'],
  rapports: ['rapports'],
  equipements: ['equipements'],
  smartfarm: ['sensor_devices', 'camera_devices'],
};

const detectModule = (command) => Object.entries(moduleCatalog).find(([, config]) => includesAny(command, config.aliases))?.[0] || null;

const answerHelp = () => ({
  moduleKey: null,
  answer: 'Je peux répondre sur le chiffre d’affaires, les encaissements, la marge, les dépenses, les priorités, les risques, les stocks, les créances, les ventes, les finances, la santé, les alertes, les tâches, les documents, les fournisseurs, l’avicole, les pondeuses, les cultures, les investissements, ou ouvrir un module. Exemple : “quel prix conseiller pour la tablette ?”.',
});

const answerPriorities = (dataMap = {}) => {
  const criticalStocks = findCriticalStocks(dataMap);
  const receivables = findReceivables(dataMap);
  const healthItems = findHealthItems(dataMap);
  const alerts = findCriticalAlerts(dataMap);
  const tasks = findLateTasks(dataMap);
  const actions = [];
  if (criticalStocks.length) actions.push(`sécuriser ${criticalStocks.length} stock(s) critique(s)`);
  if (receivables.amount > 0 || receivables.rows.length) actions.push(`relancer ${formatCurrency(receivables.amount)} de créances`);
  if (healthItems.length) actions.push(`contrôler ${healthItems.length} point(s) santé`);
  if (alerts.length) actions.push(`traiter ${alerts.length} alerte(s)`);
  if (tasks.length) actions.push(`terminer ${tasks.length} tâche(s) urgente(s)`);
  return { moduleKey: 'impact_business', answer: actions.length ? `Priorités du jour : ${actions.join(', ')}.` : 'Aucune urgence majeure détectée aujourd’hui. Le Centre de décisions reste à jour.' };
};

const answerRisks = (dataMap = {}) => {
  const parts = [`${findCriticalStocks(dataMap).length} stock(s) critique(s)`, `${findHealthItems(dataMap).length} point(s) santé`, `${findReceivables(dataMap).rows.length} créance(s) ou paiement(s) à suivre`, `${findCriticalAlerts(dataMap).length} alerte(s)`, `${findLateTasks(dataMap).length} tâche(s) urgente(s)`];
  return { moduleKey: 'impact_business', answer: `Risques ERP détectés : ${parts.join(', ')}.` };
};

const answerFinance = (dataMap = {}) => {
  const metrics = getFinanceMetrics(dataMap);
  return { moduleKey: 'finances', answer: `Finances : chiffre d’affaires ${formatCurrency(metrics.ca)}, encaissé ${formatCurrency(metrics.encaisse)}, dépenses ${formatCurrency(metrics.depensesAmount)}, marge estimée ${formatCurrency(metrics.marge)} (${metrics.margeRate}%), créances à suivre ${formatCurrency(metrics.receivables.amount)}.` };
};

const answerMargin = (dataMap = {}) => {
  const metrics = getFinanceMetrics(dataMap);
  return { moduleKey: 'finances', answer: `Marge estimée : ${formatCurrency(metrics.marge)} soit ${metrics.margeRate}%. Calcul ERP : chiffre d’affaires ${formatCurrency(metrics.ca)} - dépenses suivies ${formatCurrency(metrics.depensesAmount)}.` };
};

const answerExpenses = (dataMap = {}) => {
  const metrics = getFinanceMetrics(dataMap);
  const top = [...metrics.depenses].sort((a, b) => getNumber(b, moneyKeys) - getNumber(a, moneyKeys)).slice(0, 3).map((row) => `${labelOf(row)} ${formatCurrency(getNumber(row, moneyKeys))}`).join(', ');
  return { moduleKey: 'finances', answer: `Dépenses suivies : ${formatCurrency(metrics.depensesAmount)} sur ${metrics.depenses.length} ligne(s). ${top ? `Principales dépenses : ${top}.` : 'Aucune dépense détaillée détectée.'}` };
};

const answerTurnover = (dataMap = {}) => {
  const { orders, invoices, deliveries, salesAmount, paidAmount, receivables } = getSalesMetrics(dataMap);
  return { moduleKey: 'ventes', answer: `Chiffre d’affaires suivi : ${formatCurrency(salesAmount)}. Encaissé : ${formatCurrency(paidAmount)}. Reste à relancer : ${formatCurrency(receivables.amount)}. Base : ${orders.length} commande(s), ${invoices.length} facture(s), ${deliveries.length} livraison(s).` };
};

const answerCashIn = (dataMap = {}) => {
  const { payments, paidAmount, receivables } = getSalesMetrics(dataMap);
  const financeIn = asRows(dataMap, 'finances').filter((row) => normalizeText(row.type).includes('entree'));
  const financeInAmount = sumBy(financeIn, moneyKeys);
  const total = Math.max(paidAmount, financeInAmount);
  return { moduleKey: 'finances', answer: `Encaissements suivis : ${formatCurrency(total)}. Paiements enregistrés : ${payments.length}. Créances encore à suivre : ${formatCurrency(receivables.amount)}.` };
};

const answerSales = (dataMap = {}) => {
  const { orders, invoices, deliveries, opportunities, salesAmount, paidAmount, receivables } = getSalesMetrics(dataMap);
  return { moduleKey: 'ventes', answer: `Ventes : ${orders.length} commande(s), ${invoices.length} facture(s), ${deliveries.length} livraison(s), ${opportunities.length} opportunité(s), ${formatCurrency(salesAmount)} de chiffre d’affaires suivi, ${formatCurrency(paidAmount)} encaissé, ${formatCurrency(receivables.amount)} à relancer.` };
};

const answerClients = (dataMap = {}) => {
  const clients = asRows(dataMap, 'clients');
  const top = [...clients].sort((a, b) => getNumber(b, ['totalAchats', 'total_achats', 'total', 'montant']) - getNumber(a, ['totalAchats', 'total_achats', 'total', 'montant']))[0];
  const receivables = findReceivables(dataMap);
  return { moduleKey: 'clients', answer: top ? `Clients : ${clients.length} client(s) enregistré(s). Client principal : ${labelOf(top)}. Créances à relancer : ${formatCurrency(receivables.amount)}.` : `Clients : ${clients.length} client(s) enregistré(s). Créances à relancer : ${formatCurrency(receivables.amount)}.` };
};

const answerPondeuses = (dataMap = {}) => {
  const intelligence = buildPondeusesIntelligence({
    lots: asRows(dataMap, 'avicole'),
    productionLogs: asRows(dataMap, 'production_oeufs_logs'),
    alimentationLogs: asRows(dataMap, 'alimentation_logs'),
    stocks: asRows(dataMap, 'stock'),
    marketPrices: asRows(dataMap, 'market_prices'),
    meteo: dataMap?.meteo || null,
  });

  const { totals, recommendations, lots } = intelligence;
  const topRisk = recommendations.find((rec) => ['haute', 'critique'].includes(rec.priority));
  const bestLot = [...lots].sort((a, b) => b.estimated_margin_per_tablet - a.estimated_margin_per_tablet)[0];
  const priceHint = bestLot?.suggested_tablet_price ? `Prix tablette conseillé indicatif : ${formatCurrency(Math.round(bestLot.suggested_tablet_price))}.` : 'Prix tablette conseillé non disponible faute de données marché/coûts suffisantes.';

  return {
    moduleKey: 'avicole',
    answer: `IA Pondeuses : ${totals.lots} lot(s), ${formatNumber(totals.sellable_eggs)} œufs vendables, ${formatNumber(totals.tablets, 1)} tablette(s), coût estimé ${formatCurrency(Math.round(totals.cost_per_tablet))}/tablette. ${priceHint} ${topRisk ? `Point prioritaire : ${topRisk.summary}` : 'Aucun point critique IA détecté sur les pondeuses.'}`,
  };
};

const answerAvicole = (dataMap = {}) => {
  const lots = asRows(dataMap, 'avicole');
  const production = asRows(dataMap, 'production_oeufs_logs');
  const feeding = asRows(dataMap, 'alimentation_logs');
  const risks = lots.filter((lot) => Number(lot.mortality || 0) > Number(lot.initial_count || 0) * 0.04 || Number(lot.scoresSante || lot.score_sante || 100) < 88);
  const eggs = sumBy(production, ['quantite', 'quantity', 'oeufs', 'total_oeufs']);
  const feedCost = sumBy(feeding, costKeys);
  return { moduleKey: 'avicole', answer: `Avicole : ${lots.length} lot(s), ${risks.length} lot(s) à surveiller, production œufs suivie ${eggs || production.length} ${eggs ? 'œuf(s)' : 'entrée(s)'}, alimentation suivie ${formatCurrency(feedCost)}.` };
};

const answerCultures = (dataMap = {}) => {
  const rows = asRows(dataMap, 'cultures');
  const risk = rows.filter((row) => Number(row.score_sante || 100) < 80 || hasStatus(row, ['perdu', 'retard', 'critique']));
  return { moduleKey: 'cultures', answer: `Cultures : ${rows.length} culture(s) suivie(s), ${risk.length} à surveiller. ${risk.slice(0, 3).map(labelOf).join(', ') || 'Aucun point critique détecté.'}` };
};

const answerSuppliers = (dataMap = {}) => {
  const rows = asRows(dataMap, 'fournisseurs');
  const risky = rows.filter((row) => Number(row.dettes || row.dette || 0) > 0 || hasStatus(row, ['a risque', 'retard', 'impaye']));
  const debt = sumBy(risky, ['dettes', 'dette', 'montant', 'amount']);
  return { moduleKey: 'fournisseurs', answer: `Fournisseurs : ${rows.length} fournisseur(s), ${risky.length} à surveiller, dettes ou montants suivis ${formatCurrency(debt)}.` };
};

const answerTasks = (dataMap = {}) => {
  const rows = asRows(dataMap, 'taches');
  const late = findLateTasks(dataMap);
  return { moduleKey: 'taches', answer: `Tâches : ${rows.length} tâche(s) enregistrée(s), ${late.length} urgente(s) ou en retard. ${late.slice(0, 3).map(labelOf).join(', ') || 'Aucune tâche critique.'}` };
};

const answerDocuments = (dataMap = {}) => {
  const rows = asRows(dataMap, 'documents');
  const invoices = rows.filter((row) => includesAny(normalizeText(`${row.type || ''} ${row.categorie || ''} ${row.title || ''}`), ['facture', 'recu', 'preuve', 'contrat']));
  return { moduleKey: 'documents', answer: `Documents : ${rows.length} document(s) conservé(s), dont ${invoices.length} justificatif(s), facture(s), reçu(s) ou preuve(s).` };
};

const answerEquipments = (dataMap = {}) => {
  const rows = asRows(dataMap, 'equipements');
  const risky = rows.filter((row) => hasStatus(row, ['panne', 'maintenance', 'hors service', 'critique']));
  return { moduleKey: 'equipements', answer: `Équipements : ${rows.length} équipement(s), ${risky.length} à traiter ou maintenir. ${risky.slice(0, 3).map(labelOf).join(', ') || 'Aucune panne critique détectée.'}` };
};

const answerSmartFarm = (dataMap = {}) => {
  const sensors = asRows(dataMap, 'sensor_devices');
  const cameras = asRows(dataMap, 'camera_devices');
  const offline = [...sensors, ...cameras].filter((row) => hasStatus(row, ['offline', 'hors ligne', 'panne']));
  return { moduleKey: 'smartfarm', answer: `Smart Farm : ${sensors.length} capteur(s), ${cameras.length} caméra(s), ${offline.length} appareil(s) hors ligne ou à vérifier.` };
};

const answerInvestments = (dataMap = {}) => {
  const investments = asRows(dataMap, 'investissements');
  const plans = asRows(dataMap, 'business_plans');
  const metrics = getFinanceMetrics(dataMap);
  const docs = asRows(dataMap, 'documents').length;
  const bankability = Math.min(100, Math.round((metrics.ca > 0 ? 25 : 0) + (metrics.encaisse > 0 ? 20 : 0) + (docs > 0 ? 20 : 0) + (metrics.receivables.amount === 0 ? 15 : 5) + (investments.length + plans.length > 0 ? 20 : 0)));
  return { moduleKey: 'investissements', answer: `Investissements : ${investments.length} investissement(s), ${plans.length} business plan(s). Bancabilité estimée : ${bankability}/100. À renforcer : documents, historique CA, encaissements et créances maîtrisées.` };
};

const answerTraceability = (dataMap = {}) => {
  const rows = [...asRows(dataMap, 'tracabilite'), ...asRows(dataMap, 'business_events'), ...asRows(dataMap, 'audit_logs')];
  return { moduleKey: 'tracabilite', answer: `Traçabilité : ${rows.length} événement(s) ou action(s) tracé(s). Utile pour prouver les ventes, soins, mouvements, décisions et historique d’exploitation.` };
};

const answerErpValue = (dataMap = {}) => {
  const encaissements = [...asRows(dataMap, 'payments').filter((row) => hasStatus(row, ['paye', 'paid', 'encaisse'])), ...asRows(dataMap, 'finances').filter((row) => normalizeText(row.type).includes('entree'))];
  const actions = asRows(dataMap, 'audit_logs').length + asRows(dataMap, 'business_events').length + asRows(dataMap, 'tracabilite').length + asRows(dataMap, 'taches').length;
  const risks = findCriticalStocks(dataMap).length + findHealthItems(dataMap).length + findCriticalAlerts(dataMap).length;
  const documents = asRows(dataMap, 'documents').length;
  return { moduleKey: 'impact_business', answer: `Grâce à l’ERP : ${formatCurrency(sumBy(encaissements, moneyKeys))} d’encaissements suivis, ${formatCurrency(findReceivables(dataMap).amount)} de créances identifiées, ${formatCurrency(stockValue(dataMap))} de stock valorisé, ${actions} action(s) tracée(s), ${documents} document(s) conservé(s) et ${risks} risque(s) détecté(s).` };
};

const answerGlobal = (dataMap = {}) => {
  const priorities = answerPriorities(dataMap).answer.replace('Priorités du jour : ', '').replace('Aucune urgence majeure détectée aujourd’hui. ', '');
  const { salesAmount, paidAmount } = getSalesMetrics(dataMap);
  const stockCount = asRows(dataMap, 'stock').length;
  const clientsCount = asRows(dataMap, 'clients').length;
  const salesCount = asRows(dataMap, 'sales_orders').length;
  const healthCount = findHealthItems(dataMap).length;
  return { moduleKey: 'dashboard', answer: `Vue globale : ${formatCurrency(salesAmount)} de chiffre d’affaires suivi, ${formatCurrency(paidAmount)} encaissé, ${stockCount} stock(s), ${clientsCount} client(s), ${salesCount} commande(s), ${healthCount} point(s) santé à surveiller. ${priorities}` };
};

const answerDecision = (dataMap = {}, command = '') => {
  const metrics = getFinanceMetrics(dataMap);
  const criticalStocks = findCriticalStocks(dataMap).length;
  const health = findHealthItems(dataMap).length;
  const alerts = findCriticalAlerts(dataMap).length;
  const receivables = findReceivables(dataMap).amount;
  const positives = [];
  const cautions = [];
  const actions = [];

  if (metrics.ca > 0 && metrics.marge >= 0) positives.push('les ventes suivies restent positives');
  if (metrics.encaisse > 0) positives.push('des encaissements sont tracés');
  if (stockValue(dataMap) > 0) positives.push('le stock est valorisé');
  if (criticalStocks > 0) cautions.push(`${criticalStocks} stock(s) critique(s)`);
  if (health > 0) cautions.push(`${health} point(s) santé`);
  if (receivables > 0) cautions.push(`${formatCurrency(receivables)} de créances`);
  if (alerts > 0) cautions.push(`${alerts} alerte(s)`);

  if (includesAny(command, ['renforcer', 'augmenter', 'scaler', 'developper'])) {
    actions.push(metrics.marge > 0 ? 'renforcer seulement les activités avec marge positive et demande confirmée' : 'ne pas renforcer avant de clarifier la marge');
    if (criticalStocks > 0) actions.push('sécuriser les stocks avant toute augmentation');
    if (receivables > 0) actions.push('encaisser ou relancer les créances avant de relancer gros volume');
  } else if (includesAny(command, ['reduire', 'arreter', 'stopper', 'corriger'])) {
    actions.push('réduire ce qui bloque le cash, crée des pertes ou manque de données fiables');
    if (health > 0) actions.push('corriger les points santé avant extension');
    if (criticalStocks > 0) actions.push('corriger les ruptures stock');
  } else {
    actions.push('traiter les urgences, sécuriser le cash, puis renforcer seulement ce qui est rentable et bien tracé');
  }

  return {
    moduleKey: 'impact_business',
    answer: `Décision ERP : ${actions.join(', ')}. Points favorables : ${positives.join(', ') || 'données encore limitées'}. Points à surveiller : ${cautions.join(', ') || 'aucun blocage majeur détecté'}.`,
  };
};

const summarizeModule = (moduleKey, dataMap = {}) => {
  if (moduleKey === 'ventes') return answerSales(dataMap);
  if (moduleKey === 'finances') return answerFinance(dataMap);
  if (moduleKey === 'clients') return answerClients(dataMap);
  if (moduleKey === 'avicole') return answerAvicole(dataMap);
  if (moduleKey === 'cultures') return answerCultures(dataMap);
  if (moduleKey === 'fournisseurs') return answerSuppliers(dataMap);
  if (moduleKey === 'taches') return answerTasks(dataMap);
  if (moduleKey === 'documents') return answerDocuments(dataMap);
  if (moduleKey === 'equipements') return answerEquipments(dataMap);
  if (moduleKey === 'smartfarm') return answerSmartFarm(dataMap);
  if (moduleKey === 'investissements') return answerInvestments(dataMap);
  if (moduleKey === 'tracabilite') return answerTraceability(dataMap);
  if (moduleKey === 'impact_business') return answerGlobal(dataMap);
  const label = moduleCatalog[moduleKey]?.label || moduleKey;
  const keys = dataKeysByModule[moduleKey] || [moduleKey];
  const rows = keys.flatMap((key) => asRows(dataMap, key).map((row) => ({ ...row, __dataKey: key })));
  if (!rows.length) return { moduleKey, answer: `${label} : aucune donnée enregistrée pour le moment. Tu peux ouvrir ce module pour ajouter ou vérifier les informations.` };
  const risky = rows.filter((row) => hasStatus(row, ['retard', 'critique', 'urgent', 'impaye', 'partiel', 'malade', 'panne', 'rupture']));
  const totalAmount = sumBy(rows, moneyKeys);
  const examples = rows.slice(0, 3).map(labelOf).join(', ');
  const parts = [`${label} : ${rows.length} élément(s) enregistré(s)`];
  if (totalAmount > 0) parts.push(`montant suivi ${formatCurrency(totalAmount)}`);
  if (risky.length > 0) parts.push(`${risky.length} point(s) à surveiller`);
  if (examples) parts.push(`exemples : ${examples}`);
  return { moduleKey, answer: `${parts.join('. ')}.` };
};

const answerSearch = (command, dataMap = {}) => {
  const stopWords = ['dans', 'avec', 'pour', 'des', 'les', 'une', 'mon', 'mes', 'qui', 'quoi', 'donne', 'voir'];
  const words = command.split(' ').filter((word) => word.length > 2 && !stopWords.includes(word));
  const matches = Object.entries(dataMap).flatMap(([key, rows]) => {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => words.some((word) => normalizeText(Object.values(row || {}).join(' ')).includes(word))).slice(0, 3).map((row) => ({ key, row }));
  });
  if (!matches.length) return null;
  const firstModule = matches[0].key === 'sales_orders' ? 'ventes' : matches[0].key;
  const list = matches.slice(0, 5).map(({ key, row }) => `${labelOf(row)} (${key})`).join(', ');
  return { moduleKey: moduleCatalog[firstModule] ? firstModule : null, answer: `J’ai trouvé ${matches.length} résultat(s) ERP : ${list}.` };
};

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = normalizeText(rawCommand);
  if (!command) return { moduleKey: null, answer: 'Pose une question ERP : chiffre d’affaires, marge, priorités, stocks, créances, santé, ventes, finances, pondeuses ou alertes.' };
  if (['bjr', 'bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'coucou', 'yo'].includes(command)) return { moduleKey: null, answer: 'Bonjour, en quoi puis-je vous aider ?' };
  if (includesAny(command, ['merci', 'thanks'])) return { moduleKey: null, answer: 'Avec plaisir. Je reste disponible pour les priorités, le chiffre d’affaires, la marge, les ventes, les stocks, la santé, les finances ou les pondeuses.' };
  if (includesAny(command, ['au revoir', 'bye', 'a plus'])) return { moduleKey: null, answer: 'À bientôt. Bon suivi de la ferme.' };
  if (includesAny(command, ['aide', 'que peux tu faire', 'comment tu peux m aider', 'quoi demander'])) return answerHelp();
  if (includesAny(command, ['pondeuse', 'pondeuses', 'tablette', 'tablettes', 'cout oeuf', 'cout des oeufs', 'cout par oeuf', 'cout par tablette', 'prix tablette', 'prix des oeufs', 'rentabilite pondeuse', 'rentabilite pondeuses', 'baisse ponte', 'taux de ponte'])) return answerPondeuses(dataMap);
  if (includesAny(command, ['resume', 'resume global', 'situation globale', 'point global', 'vue globale', 'etat general'])) return answerGlobal(dataMap);
  if (includesAny(command, ['priorite', 'priorites', 'priorites du jour', 'quoi faire', 'urgence', 'aujourd hui', 'aujourdhui', 'traiter maintenant'])) return answerPriorities(dataMap);
  if (includesAny(command, ['risque', 'risques', 'points a surveiller'])) return answerRisks(dataMap);
  if (includesAny(command, ['renforcer', 'augmenter', 'reduire', 'arreter', 'stopper', 'scaler', 'developper', 'reprendre'])) return answerDecision(dataMap, command);
  if (includesAny(command, ['banque', 'bancabilite', 'financeur', 'financement', 'investisseur'])) return answerInvestments(dataMap);
  if (includesAny(command, ['grace a l erp', 'ce que erp a permis', 'ce que l erp a permis', 'valeur erp', 'impact erp', 'apporte par erp'])) return answerErpValue(dataMap);
  if (isTurnoverQuestion(command)) return answerTurnover(dataMap);
  if (includesAny(command, ['combien j ai encaisse', 'encaisse', 'encaissement', 'encaissements', 'argent recu', 'argent reçu', 'argent rentre', 'argent rentré'])) return answerCashIn(dataMap);
  if (includesAny(command, ['marge', 'rentabilite', 'rentable', 'benefice'])) return answerMargin(dataMap);
  if (includesAny(command, ['depense', 'depenses', 'charge', 'charges', 'cout', 'couts'])) return answerExpenses(dataMap);

  if (includesAny(command, ['stock critique', 'stocks critiques', 'rupture', 'seuil stock', 'stock valorise'])) {
    const rows = findCriticalStocks(dataMap);
    const examples = rows.slice(0, 3).map(labelOf).join(', ');
    const value = stockValue(dataMap);
    return { moduleKey: 'stock', answer: rows.length ? `${rows.length} stock(s) critique(s) détecté(s) : ${examples}. Stock valorisé : ${formatCurrency(value)}.` : `Aucun stock critique détecté. Stock valorisé : ${formatCurrency(value)}.` };
  }

  if (includesAny(command, ['creance', 'creances', 'reste a encaisser', 'impaye', 'relancer client', 'clients a relancer'])) {
    const receivables = findReceivables(dataMap);
    return { moduleKey: 'clients', answer: receivables.rows.length || receivables.amount > 0 ? `${formatCurrency(receivables.amount)} de créances à suivre sur ${receivables.rows.length} élément(s).` : 'Aucune créance urgente détectée.' };
  }

  if (includesAny(command, ['sante', 'vaccin retard', 'vaccins retard', 'vaccination retard', 'malade', 'soin'])) {
    const rows = findHealthItems(dataMap);
    const examples = rows.slice(0, 3).map(labelOf).join(', ');
    return { moduleKey: 'sante', answer: rows.length ? `${rows.length} point(s) santé à surveiller : ${examples}.` : 'Aucun point santé urgent détecté.' };
  }

  if (includesAny(command, ['alerte', 'alertes', 'critique'])) {
    const rows = findCriticalAlerts(dataMap);
    const examples = rows.slice(0, 3).map(labelOf).join(', ');
    return { moduleKey: 'alertes', answer: rows.length ? `${rows.length} alerte(s) à traiter : ${examples}.` : 'Aucune alerte critique ouverte.' };
  }

  if (includesAny(command, ['vente', 'ventes', 'commande', 'commandes', 'livraison', 'facture', 'paiement'])) return answerSales(dataMap);
  if (includesAny(command, ['finance', 'finances', 'cash', 'recette', 'recettes', 'solde'])) return answerFinance(dataMap);

  const moduleKey = detectModule(command);
  if (moduleKey) return summarizeModule(moduleKey, dataMap);
  const searchAnswer = answerSearch(command, dataMap);
  if (searchAnswer) return searchAnswer;
  return { moduleKey: null, answer: "Je n’ai pas trouvé de réponse sûre dans l’ERP. Essaie : chiffre d’affaires, CA, marge, dépenses, encaissements, priorités du jour, résumé global, pondeuses, prix tablette, stocks critiques, créances, santé, ventes, finances, risques, documents, tâches, banque, ou le nom d’un module." };
};
