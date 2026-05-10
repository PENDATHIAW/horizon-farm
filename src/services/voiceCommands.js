const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const money = (value) => `${Math.round(num(value)).toLocaleString('fr-FR')} FCFA`;
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const includesAny = (text, words) => words.some((word) => text.includes(normalize(word)));
const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.valeur_estimee ?? row.estimated_amount);
const status = (row = {}) => normalize(row.status || row.statut || row.statut_paiement || row.payment_status);
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

function greetingAnswer() {
  return {
    moduleKey: null,
    answer: 'Bonjour 😊 Je suis là. Tu veux qu’on regarde quoi aujourd’hui : le CA, les marges, les créances, le stock, les ventes, les animaux, l’avicole ou les priorités du jour ?',
  };
}

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = normalize(rawCommand).trim();
  const s = globalStats(dataMap);

  if (['bjr', 'bonjour', 'bonsoir', 'salut', 'hello', 'coucou', 'yo'].includes(command) || includesAny(command, ['bonjour assistant', 'salut assistant', 'bjr assistant'])) {
    return greetingAnswer();
  }

  if (includesAny(command, ['merci', 'thanks'])) {
    return { moduleKey: null, answer: 'Avec plaisir 😊 On continue quand tu veux. Je peux aussi te sortir une priorité du jour ou vérifier un module précis.' };
  }

  if (includesAny(command, ['aide', 'que peux tu faire', 'tu peux faire quoi', 'assistant'])) {
    return { moduleKey: null, answer: 'Je peux t’aider à piloter la ferme sans fouiller partout : CA, encaissements, créances, marge, stock critique, ventes, clients, santé, avicole, cultures, fournisseurs, tâches, documents et bancabilité. Par exemple : “Quel est mon CA ?”, “Quelle est ma marge ?”, “Que dois-je renforcer ?” ou “Suis-je bancable ?”.' };
  }

  if (includesAny(command, ['chiffre d affaires', 'ca', 'combien j ai vendu', 'montant des ventes', 'total des ventes'])) {
    const relance = s.creances > 0 ? ` Il reste quand même ${money(s.creances)} à relancer.` : ' Rien de majeur à relancer côté créances.';
    return { moduleKey: 'ventes', answer: `Pour l’instant, ton chiffre d’affaires suivi est de ${money(s.ca)}. Sur ce montant, ${money(s.encaisse)} est encaissé.${relance} La base vient de ${s.orders.length} commande(s), ${s.invoices.length} facture(s) et ${s.deliveries.length} livraison(s).` };
  }

  if (includesAny(command, ['encaisse', 'encaissement', 'argent recu', 'argent reçu', 'revenus encaisses'])) {
    return { moduleKey: 'finances', answer: `Tu as ${money(s.encaisse)} encaissés. Les créances restantes sont à ${money(s.creances)} et les dépenses enregistrées sont à ${money(s.depenses)}. Donc côté cash, le résultat estimé est de ${money(s.benefice)}.` };
  }

  if (includesAny(command, ['marge', 'benefice', 'rentabilite', 'resultat'])) {
    const warning = s.coutDirect <= 0 ? ' Attention, les coûts directs semblent encore incomplets : la marge peut donc être trop optimiste.' : '';
    return { moduleKey: 'finances', answer: `La marge directe suivie est de ${money(s.margeDirecte)}. Les coûts directs connus sont à ${money(s.coutDirect)} et le bénéfice cash estimé après dépenses enregistrées est de ${money(s.benefice)}.${warning}` };
  }

  if (includesAny(command, ['situation globale', 'resume global', 'résumé global', 'etat global', 'où en est la ferme'])) {
    return { moduleKey: 'dashboard', answer: `Globalement, on a ${money(s.ca)} de CA, ${money(s.encaisse)} encaissés, ${money(s.creances)} à récupérer et ${money(s.margeDirecte)} de marge directe suivie. Ce que je surveillerais en premier : ${s.stockCritique} stock(s) critique(s), ${s.soinsRetard} soin(s) en retard, ${s.tachesOuvertes} tâche(s) ouverte(s) et ${s.alertesCritiques} alerte(s) critique(s).` };
  }

  if (includesAny(command, ['bancable', 'bancabilite', 'financeur', 'banque', 'credit'])) {
    const score = [s.ca > 0, s.encaisse > 0, s.documents.length > 0, s.creances <= s.ca * 0.4, s.stockCritique === 0, s.margeDirecte >= 0].filter(Boolean).length;
    const label = score >= 5 ? 'le dossier commence à être solide' : score >= 3 ? 'il y a une base, mais il faut la renforcer' : 'le dossier est encore fragile';
    return { moduleKey: 'impact-business', answer: `Pour la bancabilité, ${label}. Les points qui aident : CA ${money(s.ca)}, encaissements ${money(s.encaisse)}, ${s.documents.length} document(s), créances ${money(s.creances)} et marge directe ${money(s.margeDirecte)}. Ce que je renforcerais : preuves, régularité des encaissements, baisse des créances et coûts mieux justifiés.` };
  }

  if (includesAny(command, ['que renforcer', 'recommandation', 'decision du jour', 'priorite', 'quoi faire'])) {
    const actions = [];
    if (s.creances > 0) actions.push(`relancer ${money(s.creances)} de créances`);
    if (s.stockCritique > 0) actions.push(`corriger ${s.stockCritique} stock(s) critique(s)`);
    if (s.soinsRetard > 0) actions.push(`traiter ${s.soinsRetard} soin(s) en retard`);
    if (s.tachesOuvertes > 0) actions.push(`fermer ou planifier ${s.tachesOuvertes} tâche(s)`);
    if (!actions.length) actions.push('continuer le suivi, mettre à jour les ventes et compléter les coûts manquants');
    return { moduleKey: 'dashboard', answer: `Je commencerais par ça : ${actions.join(', ')}. L’objectif est simple : protéger le cash, éviter les ruptures et fiabiliser la marge.` };
  }

  if (includesAny(command, ['stock critique', 'stocks critiques', 'rupture', 'stock valorise', 'stock valorisé'])) {
    const value = s.stocks.reduce((sum, row) => sum + num(row.valeur_stock ?? row.stock_value ?? row.cout_total ?? row.total_value), 0);
    return { moduleKey: 'stock', answer: `Côté stock, je vois ${s.stockCritique} produit(s) critique(s). La valeur stock renseignée est de ${money(value)}. Je compléterais les unités/prix manquants puis je lancerais les réapprovisionnements sous seuil.` };
  }

  if (includesAny(command, ['client', 'clients a relancer', 'relancer client', 'creance', 'créance'])) {
    return { moduleKey: 'clients', answer: `Tu as ${s.clients.length} client(s) suivis. Le point sensible, c’est ${money(s.creances)} à relancer. Je prioriserais les clients avec reste à payer et bon historique d’achat.` };
  }

  if (includesAny(command, ['vente', 'ventes', 'commande', 'facture', 'livraison'])) {
    return { moduleKey: 'ventes', answer: `Côté ventes, on a ${s.orders.length} commande(s), ${s.invoices.length} facture(s) et ${s.deliveries.length} livraison(s). Le CA suivi est de ${money(s.ca)} et les créances sont à ${money(s.creances)}. Le plus utile est de vérifier les commandes non payées ou non livrées.` };
  }

  if (includesAny(command, ['avicole', 'pondeuse', 'ponte', 'oeuf', 'œuf', 'chair', 'poulet'])) {
    return { moduleKey: 'avicole', answer: `Pour l’avicole, je vois ${s.avicole.length} lot(s) suivis. Il faut garder deux lectures séparées : chair pour poids, mortalité, abattage et ventes ; ponte pour œufs, casse, taux de ponte et coût par œuf.` };
  }

  if (includesAny(command, ['sante', 'santé', 'vaccin', 'biosécurité', 'biosecurite'])) {
    return { moduleKey: 'sante', answer: `Côté santé, ${s.sante.length} action(s) sont suivies, dont ${s.soinsRetard} en retard. Je traiterais d’abord les retards, puis je sécuriserais les produits santé et les preuves.` };
  }

  if (includesAny(command, ['culture', 'cultures', 'maraichage', 'récolte', 'recolte'])) {
    return { moduleKey: 'cultures', answer: `Côté cultures, ${s.cultures.length} campagne(s) ou parcelle(s) sont suivies. Les points clés sont les coûts, les intrants, les récoltes, les pertes et les débouchés.` };
  }

  if (includesAny(command, ['fournisseur', 'fournisseurs', 'approvisionnement'])) {
    return { moduleKey: 'fournisseurs', answer: `Tu as ${s.fournisseurs.length} fournisseur(s) suivis. Je regarderais surtout la fiabilité, les prix, le transport, les délais et le lien avec les stocks achetés.` };
  }

  if (includesAny(command, ['document', 'documents', 'preuve', 'justificatif'])) {
    return { moduleKey: 'documents', answer: `Il y a ${s.documents.length} document(s) suivis. Plus tu rattaches les preuves aux ventes, dépenses, santé et investissements, plus ton dossier devient solide et défendable.` };
  }

  if (includesAny(command, ['tache', 'tâche', 'taches', 'tâches'])) {
    return { moduleKey: 'taches', answer: `Tu as ${s.taches.length} tâche(s), dont ${s.tachesOuvertes} encore ouvertes. Je transformerais les alertes importantes en tâches claires, puis je fermerais les tâches sensibles une par une.` };
  }

  return { moduleKey: null, answer: 'Je n’ai pas encore bien compris ce que tu veux regarder. Demande-moi par exemple : “Quel est mon CA ?”, “Quelle est ma marge ?”, “Que dois-je renforcer ?”, “Suis-je bancable ?” ou “Situation globale”.' };
};
