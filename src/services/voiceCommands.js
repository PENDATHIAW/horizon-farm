const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const money = (value) => `${Math.round(num(value)).toLocaleString('fr-FR')} FCFA`;
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const includesAny = (text, words) => words.some((word) => text.includes(normalize(word)));
const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.valeur_estimee ?? row.estimated_amount);
const status = (row = {}) => normalize(row.status || row.statut || row.statut_paiement || row.payment_status);
const isPaid = (row = {}) => ['paye', 'payee', 'paid', 'solde', 'soldé'].some((term) => status(row).includes(term));
const isOpenTask = (row = {}) => !['termine', 'terminee', 'done', 'annule', 'annulee'].some((term) => status(row).includes(term));

function financeStats(dataMap = {}) {
  const orders = arr(dataMap.ventes || dataMap.salesOrders || dataMap.commandes);
  const payments = arr(dataMap.payments || dataMap.paiements);
  const transactions = arr(dataMap.finances || dataMap.transactions);
  const invoices = arr(dataMap.invoices || dataMap.factures);
  const deliveries = arr(dataMap.deliveries || dataMap.livraisons);
  const caOrders = orders.reduce((sum, row) => sum + amount(row), 0);
  const caInvoices = invoices.reduce((sum, row) => sum + amount(row), 0);
  const ca = Math.max(caOrders, caInvoices);
  const encaisse = payments.reduce((sum, row) => sum + amount(row), 0) + transactions.filter((row) => ['entree', 'recette', 'revenu', 'encaissement'].some((term) => normalize(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const depenses = transactions.filter((row) => ['sortie', 'depense', 'charge', 'achat'].some((term) => normalize(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const coutDirect = orders.reduce((sum, row) => sum + num(row.cout_revient ?? row.cout_direct), 0);
  const margeDirecte = orders.reduce((sum, row) => sum + num(row.marge_directe ?? row.marge_montant ?? row.marge), 0) || ca - coutDirect;
  const creances = Math.max(0, orders.reduce((sum, row) => sum + num(row.reste_a_payer), 0) || ca - encaisse);
  return { orders, payments, transactions, invoices, deliveries, ca, encaisse, depenses, coutDirect, margeDirecte, creances, benefice: encaisse - depenses };
}

function globalStats(dataMap = {}) {
  const f = financeStats(dataMap);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const animaux = arr(dataMap.animaux);
  const avicole = arr(dataMap.avicole || dataMap.lots);
  const sante = arr(dataMap.sante || dataMap.vaccins);
  const clients = arr(dataMap.clients);
  const cultures = arr(dataMap.cultures);
  const fournisseurs = arr(dataMap.fournisseurs);
  const documents = arr(dataMap.documents);
  const taches = arr(dataMap.taches || dataMap.tasks);
  const alertes = arr(dataMap.alertes || dataMap.alerts);
  const stockCritique = stocks.filter((row) => num(row.quantite ?? row.quantity ?? row.stock) <= num(row.seuil ?? row.threshold ?? row.min_stock) && num(row.seuil ?? row.threshold ?? row.min_stock) > 0).length;
  const soinsRetard = sante.filter((row) => ['retard', 'a faire', 'a_faire', 'en retard'].some((term) => status(row).includes(term))).length;
  const tachesOuvertes = taches.filter(isOpenTask).length;
  const alertesCritiques = alertes.filter((row) => ['critique', 'urgence'].some((term) => normalize(row.severity || row.gravite).includes(term))).length;
  return { ...f, stocks, animaux, avicole, sante, clients, cultures, fournisseurs, documents, taches, alertes, stockCritique, soinsRetard, tachesOuvertes, alertesCritiques };
}

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = normalize(rawCommand);
  const s = globalStats(dataMap);

  if (includesAny(command, ['aide', 'que peux tu faire', 'tu peux faire quoi', 'assistant'])) {
    return { moduleKey: 'dashboard', answer: 'Je peux analyser le CA, les encaissements, les créances, la marge, les stocks critiques, les ventes, les clients, la santé, l’avicole, les cultures, les fournisseurs, les tâches, les documents et la bancabilité. Exemple : “Quel est mon CA ?”, “Que dois-je renforcer ?”, “Suis-je bancable ?”.' };
  }

  if (includesAny(command, ['chiffre d affaires', 'ca', 'combien j ai vendu', 'montant des ventes', 'total des ventes'])) {
    return { moduleKey: 'ventes', answer: `Chiffre d’affaires suivi : ${money(s.ca)}. Encaissé : ${money(s.encaisse)}. Reste à relancer : ${money(s.creances)}. Base : ${s.orders.length} commande(s), ${s.invoices.length} facture(s), ${s.deliveries.length} livraison(s).` };
  }

  if (includesAny(command, ['encaisse', 'encaissement', 'argent recu', 'argent reçu', 'revenus encaisses'])) {
    return { moduleKey: 'finances', answer: `Encaissements suivis : ${money(s.encaisse)}. Créances restantes : ${money(s.creances)}. Dépenses enregistrées : ${money(s.depenses)}. Résultat cash estimé : ${money(s.benefice)}.` };
  }

  if (includesAny(command, ['marge', 'benefice', 'rentabilite', 'resultat'])) {
    return { moduleKey: 'finances', answer: `Marge directe suivie : ${money(s.margeDirecte)}. Coûts directs connus : ${money(s.coutDirect)}. Bénéfice cash estimé après dépenses enregistrées : ${money(s.benefice)}. Les charges indirectes restent à lire au niveau global.` };
  }

  if (includesAny(command, ['situation globale', 'resume global', 'résumé global', 'etat global', 'où en est la ferme'])) {
    return { moduleKey: 'dashboard', answer: `Situation globale : CA ${money(s.ca)}, encaissé ${money(s.encaisse)}, créances ${money(s.creances)}, marge directe ${money(s.margeDirecte)}. Points à suivre : ${s.stockCritique} stock(s) critique(s), ${s.soinsRetard} soin(s) en retard, ${s.tachesOuvertes} tâche(s) ouverte(s), ${s.alertesCritiques} alerte(s) critique(s).` };
  }

  if (includesAny(command, ['bancable', 'bancabilite', 'financeur', 'banque', 'credit'])) {
    const score = [s.ca > 0, s.encaisse > 0, s.documents.length > 0, s.creances <= s.ca * 0.4, s.stockCritique === 0, s.margeDirecte >= 0].filter(Boolean).length;
    const label = score >= 5 ? 'bonne base' : score >= 3 ? 'base à renforcer' : 'dossier encore fragile';
    return { moduleKey: 'impact-business', answer: `Bancabilité : ${label}. Points visibles : CA ${money(s.ca)}, encaissements ${money(s.encaisse)}, documents ${s.documents.length}, créances ${money(s.creances)}, marge directe ${money(s.margeDirecte)}. À renforcer : preuves, régularité des encaissements, réduction des créances et justification des marges.` };
  }

  if (includesAny(command, ['que renforcer', 'recommandation', 'decision du jour', 'priorite', 'quoi faire'])) {
    const actions = [];
    if (s.creances > 0) actions.push(`relancer ${money(s.creances)} de créances`);
    if (s.stockCritique > 0) actions.push(`corriger ${s.stockCritique} stock(s) critique(s)`);
    if (s.soinsRetard > 0) actions.push(`traiter ${s.soinsRetard} soin(s) en retard`);
    if (s.tachesOuvertes > 0) actions.push(`fermer ou planifier ${s.tachesOuvertes} tâche(s)`);
    if (!actions.length) actions.push('continuer le suivi, mettre à jour les ventes et compléter les coûts manquants');
    return { moduleKey: 'dashboard', answer: `Priorités recommandées : ${actions.join(', ')}. Objectif : protéger le cash, éviter les ruptures et fiabiliser la marge.` };
  }

  if (includesAny(command, ['stock critique', 'stocks critiques', 'rupture', 'stock valorise', 'stock valorisé'])) {
    const value = s.stocks.reduce((sum, row) => sum + num(row.valeur_stock ?? row.stock_value ?? row.cout_total ?? row.total_value), 0);
    return { moduleKey: 'stock', answer: `${s.stockCritique} stock(s) critique(s). Valeur stock renseignée : ${money(value)}. Action : compléter les unités/prix manquants et commander les produits sous seuil.` };
  }

  if (includesAny(command, ['client', 'clients a relancer', 'relancer client', 'creance', 'créance'])) {
    return { moduleKey: 'clients', answer: `Clients suivis : ${s.clients.length}. Créances à relancer : ${money(s.creances)}. Action : prioriser les clients avec reste à payer et historique d’achat fiable.` };
  }

  if (includesAny(command, ['vente', 'ventes', 'commande', 'facture', 'livraison'])) {
    return { moduleKey: 'ventes', answer: `Ventes : ${s.orders.length} commande(s), ${s.invoices.length} facture(s), ${s.deliveries.length} livraison(s). CA : ${money(s.ca)}. Créances : ${money(s.creances)}. Vérifier les commandes non payées ou non livrées.` };
  }

  if (includesAny(command, ['avicole', 'pondeuse', 'ponte', 'oeuf', 'œuf', 'chair', 'poulet'])) {
    return { moduleKey: 'avicole', answer: `Avicole : ${s.avicole.length} lot(s) suivis. Vérifie séparément chair et ponte : alimentation, mortalité, ponte, abattage et opportunités de vente.` };
  }

  if (includesAny(command, ['sante', 'santé', 'vaccin', 'biosécurité', 'biosecurite'])) {
    return { moduleKey: 'sante', answer: `Santé : ${s.sante.length} action(s) suivie(s), ${s.soinsRetard} en retard. Priorité : traiter les retards, sécuriser les produits santé et garder les preuves.` };
  }

  if (includesAny(command, ['culture', 'cultures', 'maraichage', 'récolte', 'recolte'])) {
    return { moduleKey: 'cultures', answer: `Cultures : ${s.cultures.length} campagne(s) ou parcelle(s) suivie(s). À contrôler : coûts, intrants, récoltes, pertes et débouchés.` };
  }

  if (includesAny(command, ['fournisseur', 'fournisseurs', 'approvisionnement'])) {
    return { moduleKey: 'fournisseurs', answer: `Fournisseurs suivis : ${s.fournisseurs.length}. À renforcer : fiabilité, prix, transport, délais et lien avec le stock acheté.` };
  }

  if (includesAny(command, ['document', 'documents', 'preuve', 'justificatif'])) {
    return { moduleKey: 'documents', answer: `Documents suivis : ${s.documents.length}. Plus il y a de preuves rattachées aux ventes, dépenses, santé et investissements, plus le dossier devient défendable.` };
  }

  if (includesAny(command, ['tache', 'tâche', 'taches', 'tâches'])) {
    return { moduleKey: 'taches', answer: `Tâches : ${s.taches.length} au total, ${s.tachesOuvertes} encore ouvertes. Priorité : fermer les tâches sensibles et transformer les alertes en actions.` };
  }

  return { moduleKey: 'dashboard', answer: 'Je n’ai pas encore reconnu précisément la demande. Tu peux demander : “Quel est mon CA ?”, “Quelle est ma marge ?”, “Que dois-je renforcer ?”, “Suis-je bancable ?”, “Situation globale”.' };
};
