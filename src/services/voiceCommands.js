const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (text, words) => words.some((word) => text.includes(normalizeText(word)));

const formatCurrency = (value = 0) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

const asRows = (dataMap, key) => (Array.isArray(dataMap?.[key]) ? dataMap[key] : []);

const getNumber = (row, keys = []) => {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value) && value !== 0) return value;
  }
  return 0;
};

const sumBy = (rows, keys) => rows.reduce((sum, row) => sum + getNumber(row, keys), 0);

const labelOf = (row = {}) =>
  row.name || row.nom || row.title || row.libelle || row.produit || row.animal || row.reference || row.id || 'élément ERP';

const statusOf = (row = {}) => normalizeText(row.status || row.statut || row.etat || row.priority || row.severity || '');

const hasStatus = (row, statuses) => includesAny(statusOf(row), statuses);

const findCriticalStocks = (dataMap = {}) =>
  asRows(dataMap, 'stock').filter((row) => Number(row.quantite || 0) <= Number(row.seuil || 0));

const findHealthItems = (dataMap = {}) => [
  ...asRows(dataMap, 'sante').filter((row) => hasStatus(row, ['retard', 'urgent', 'critique', 'a faire'])),
  ...asRows(dataMap, 'animaux').filter((row) => hasStatus({ status: row.health_status || row.status || row.statut }, ['malade', 'critique', 'a surveiller'])),
  ...asRows(dataMap, 'avicole').filter((lot) => Number(lot.mortality || 0) > Number(lot.initial_count || 0) * 0.04 || Number(lot.scoresSante || lot.score_sante || 100) < 88),
];

const findCriticalAlerts = (dataMap = {}) =>
  asRows(dataMap, 'alertes_center').filter((row) =>
    hasStatus(row, ['nouvelle', 'critique', 'haute', 'urgent', 'ouverte', 'open'])
  );

const findLateTasks = (dataMap = {}) =>
  asRows(dataMap, 'taches').filter((row) => hasStatus(row, ['retard', 'critique', 'urgent', 'a faire']));

const findReceivables = (dataMap = {}) => {
  const payments = asRows(dataMap, 'payments').filter((row) =>
    hasStatus(row, ['impaye', 'partiel', 'retard', 'en attente', 'pending', 'unpaid'])
  );
  const invoices = asRows(dataMap, 'invoices').filter((row) =>
    hasStatus(row, ['impaye', 'partiel', 'retard', 'en attente', 'pending', 'unpaid'])
  );
  const finances = asRows(dataMap, 'finances').filter((row) =>
    hasStatus(row, ['impaye', 'partiel', 'retard']) || normalizeText(row.type).includes('creance')
  );
  const salesOrders = asRows(dataMap, 'sales_orders').filter((row) =>
    hasStatus(row, ['impaye', 'partiel', 'retard', 'livre', 'facture']) && !hasStatus(row, ['paye', 'paid'])
  );

  const rows = [...payments, ...invoices, ...finances, ...salesOrders];
  const amount = rows.reduce((sum, row) => {
    const paid = getNumber(row, ['montant_paye', 'paid_amount', 'amount_paid']);
    const total = getNumber(row, ['reste_a_payer', 'remaining_amount', 'balance', 'montant_restant', 'total_ttc', 'total', 'montant', 'amount']);
    return sum + Math.max(total - paid, 0);
  }, 0);

  return { rows, amount };
};

const moduleCatalog = {
  dashboard: { label: 'Tableau de bord', aliases: ['dashboard', 'tableau de bord', 'accueil'] },
  impact_business: { label: 'Impact & Valeur ERP', aliases: ['impact', 'valeur', 'centre de decisions', 'decision', 'priorites', 'arbitrage'] },
  stock: { label: 'Stock', aliases: ['stock', 'stocks', 'rupture', 'inventaire', 'intrant', 'aliment'] },
  clients: { label: 'Clients & WhatsApp', aliases: ['client', 'clients', 'whatsapp', 'relance client'] },
  ventes: { label: 'Ventes', aliases: ['vente', 'ventes', 'commande', 'livraison', 'facture', 'paiement'] },
  finances: { label: 'Finances', aliases: ['finance', 'finances', 'cash', 'caisse', 'recette', 'depense', 'benefice', 'marge', 'creance'] },
  comptabilite: { label: 'Comptabilité', aliases: ['comptabilite', 'compta', 'journal', 'bilan'] },
  avicole: { label: 'Avicole', aliases: ['avicole', 'poulet', 'poulets', 'pondeuse', 'pondeuses', 'oeuf', 'oeufs', 'lot'] },
  animaux: { label: 'Animaux', aliases: ['animaux', 'animal', 'bovin', 'mouton', 'chevre', 'betail'] },
  sante: { label: 'Santé & Vaccins', aliases: ['sante', 'vaccin', 'vaccins', 'maladie', 'soin', 'veterinaire'] },
  cultures: { label: 'Cultures', aliases: ['culture', 'cultures', 'maraichage', 'recolte', 'tomate', 'champ'] },
  investissements: { label: 'Investissements', aliases: ['investissement', 'business plan', 'financement', 'financeur', 'banque'] },
  fournisseurs: { label: 'Fournisseurs', aliases: ['fournisseur', 'fournisseurs', 'dette fournisseur', 'achat'] },
  tracabilite: { label: 'Traçabilité', aliases: ['tracabilite', 'trace', 'historique', 'mouvement'] },
  alertes: { label: 'Centre Alertes', aliases: ['alerte', 'alertes', 'risque', 'critique'] },
  documents: { label: 'Documents', aliases: ['document', 'documents', 'facture', 'recu', 'preuve'] },
  taches: { label: 'Tâches', aliases: ['tache', 'taches', 'action', 'actions', 'retard'] },
  rapports: { label: 'Rapports', aliases: ['rapport', 'rapports', 'export', 'pdf'] },
  equipements: { label: 'Équipements', aliases: ['equipement', 'equipements', 'machine', 'maintenance', 'panne'] },
  smartfarm: { label: 'Smart Farm', aliases: ['smart farm', 'capteur', 'meteo', 'camera'] },
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

const detectModule = (command) =>
  Object.entries(moduleCatalog).find(([, config]) => includesAny(command, config.aliases))?.[0] || null;

const summarizeModule = (moduleKey, dataMap = {}) => {
  const label = moduleCatalog[moduleKey]?.label || moduleKey;
  const keys = dataKeysByModule[moduleKey] || [moduleKey];
  const rows = keys.flatMap((key) => asRows(dataMap, key).map((row) => ({ ...row, __dataKey: key })));

  if (!rows.length) {
    return {
      moduleKey,
      answer: `${label} : aucune donnée enregistrée pour le moment. Tu peux ouvrir ce module pour ajouter ou vérifier les informations.`,
    };
  }

  const risky = rows.filter((row) => hasStatus(row, ['retard', 'critique', 'urgent', 'impaye', 'partiel', 'malade', 'panne', 'rupture']));
  const totalAmount = sumBy(rows, ['montant', 'amount', 'total', 'total_ttc', 'valeur', 'cout', 'prix_total']);
  const examples = rows.slice(0, 3).map(labelOf).join(', ');

  const parts = [`${label} : ${rows.length} élément(s) enregistré(s)`];
  if (totalAmount > 0) parts.push(`montant suivi ${formatCurrency(totalAmount)}`);
  if (risky.length > 0) parts.push(`${risky.length} point(s) à surveiller`);
  if (examples) parts.push(`exemples : ${examples}`);

  return { moduleKey, answer: `${parts.join('. ')}.` };
};

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

  return {
    moduleKey: 'impact_business',
    answer: actions.length
      ? `Priorités du jour : ${actions.join(', ')}.`
      : 'Aucune urgence majeure détectée aujourd’hui. Le Centre de décisions reste à jour.',
  };
};

const answerErpValue = (dataMap = {}) => {
  const encaissements = [
    ...asRows(dataMap, 'payments').filter((row) => hasStatus(row, ['paye', 'paid', 'encaisse'])),
    ...asRows(dataMap, 'finances').filter((row) => normalizeText(row.type).includes('entree')),
  ];
  const encaissementsAmount = sumBy(encaissements, ['montant', 'amount', 'total', 'paid_amount']);
  const receivables = findReceivables(dataMap);
  const stockValue = asRows(dataMap, 'stock').reduce((sum, row) => {
    const qty = Number(row.quantite || row.quantity || 0);
    const unit = Number(row.prix_unitaire || row.unit_price || row.cout_unitaire || row.price || 0);
    return sum + qty * unit;
  }, 0);
  const actions = asRows(dataMap, 'audit_logs').length + asRows(dataMap, 'business_events').length + asRows(dataMap, 'tracabilite').length + asRows(dataMap, 'taches').length;
  const risks = findCriticalStocks(dataMap).length + findHealthItems(dataMap).length + findCriticalAlerts(dataMap).length;

  return {
    moduleKey: 'impact_business',
    answer: `Grâce à l’ERP : ${formatCurrency(encaissementsAmount)} d’encaissements suivis, ${formatCurrency(receivables.amount)} de créances identifiées, ${formatCurrency(stockValue)} de stock valorisé, ${actions} action(s) tracée(s) et ${risks} risque(s) détecté(s).`,
  };
};

const answerSearch = (command, dataMap = {}) => {
  const words = command.split(' ').filter((word) => word.length > 2 && !['dans', 'avec', 'pour', 'des', 'les', 'une', 'mon', 'mes', 'qui', 'quoi'].includes(word));
  const matches = Object.entries(dataMap).flatMap(([key, rows]) => {
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => {
        const haystack = normalizeText(Object.values(row || {}).join(' '));
        return words.some((word) => haystack.includes(word));
      })
      .slice(0, 3)
      .map((row) => ({ key, row }));
  });

  if (!matches.length) return null;

  const firstModule = matches[0].key === 'sales_orders' ? 'ventes' : matches[0].key;
  const list = matches.slice(0, 5).map(({ key, row }) => `${labelOf(row)} (${key})`).join(', ');
  return { moduleKey: moduleCatalog[firstModule] ? firstModule : null, answer: `J’ai trouvé ${matches.length} résultat(s) ERP : ${list}.` };
};

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = normalizeText(rawCommand);
  if (!command) return { moduleKey: null, answer: 'Pose une question ERP : priorités, stocks, créances, santé, ventes, finances ou alertes.' };

  if (includesAny(command, ['priorite', 'priorites', 'priorites du jour', 'quoi faire', 'urgence', 'aujourd hui', 'aujourdhui'])) {
    return answerPriorities(dataMap);
  }

  if (includesAny(command, ['grace a l erp', 'ce que erp a permis', 'ce que l erp a permis', 'valeur erp', 'impact erp', 'apporte par erp'])) {
    return answerErpValue(dataMap);
  }

  if (includesAny(command, ['stock critique', 'stocks critiques', 'rupture', 'seuil stock'])) {
    const rows = findCriticalStocks(dataMap);
    const examples = rows.slice(0, 3).map(labelOf).join(', ');
    return {
      moduleKey: 'stock',
      answer: rows.length ? `${rows.length} stock(s) critique(s) détecté(s) : ${examples}.` : 'Aucun stock critique détecté.',
    };
  }

  if (includesAny(command, ['creance', 'creances', 'reste a encaisser', 'impaye', 'relancer client', 'clients a relancer'])) {
    const receivables = findReceivables(dataMap);
    return {
      moduleKey: 'clients',
      answer: receivables.rows.length || receivables.amount > 0
        ? `${formatCurrency(receivables.amount)} de créances à suivre sur ${receivables.rows.length} élément(s).`
        : 'Aucune créance urgente détectée.',
    };
  }

  if (includesAny(command, ['sante', 'vaccin retard', 'vaccins retard', 'vaccination retard', 'malade', 'soin'])) {
    const rows = findHealthItems(dataMap);
    const examples = rows.slice(0, 3).map(labelOf).join(', ');
    return {
      moduleKey: 'sante',
      answer: rows.length ? `${rows.length} point(s) santé à surveiller : ${examples}.` : 'Aucun point santé urgent détecté.',
    };
  }

  if (includesAny(command, ['alerte', 'alertes', 'critique'])) {
    const rows = findCriticalAlerts(dataMap);
    const examples = rows.slice(0, 3).map(labelOf).join(', ');
    return {
      moduleKey: 'alertes',
      answer: rows.length ? `${rows.length} alerte(s) à traiter : ${examples}.` : 'Aucune alerte critique ouverte.',
    };
  }

  if (includesAny(command, ['benefice', 'finance', 'depense', 'recette', 'cash', 'marge'])) {
    const finances = asRows(dataMap, 'finances');
    const recettes = finances.filter((row) => normalizeText(row.type).includes('entree') || normalizeText(row.categorie).includes('recette'));
    const depenses = finances.filter((row) => normalizeText(row.type).includes('sortie') || normalizeText(row.categorie).includes('depense'));
    const recettesAmount = sumBy(recettes, ['montant', 'amount', 'total']);
    const depensesAmount = sumBy(depenses, ['montant', 'amount', 'total']);
    return { moduleKey: 'finances', answer: `Finances : recettes ${formatCurrency(recettesAmount)}, dépenses ${formatCurrency(depensesAmount)}, solde estimé ${formatCurrency(recettesAmount - depensesAmount)}.` };
  }

  const moduleKey = detectModule(command);
  if (moduleKey) return summarizeModule(moduleKey, dataMap);

  const searchAnswer = answerSearch(command, dataMap);
  if (searchAnswer) return searchAnswer;

  return {
    moduleKey: null,
    answer: "Je n’ai pas trouvé de réponse sûre dans l’ERP. Essaie : priorités du jour, stocks critiques, créances, santé, ventes, finances, alertes, ou le nom d’un module.",
  };
};
