const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const money = (value) => `${Math.round(num(value)).toLocaleString('fr-FR')} FCFA`;
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (text, words) => words.some((word) => text.includes(normalize(word)));
const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.valeur_estimee ?? row.estimated_amount);
const status = (row = {}) => normalize(row.status || row.statut || row.statut_paiement || row.payment_status);
const isOpenTask = (row = {}) => !['termine', 'terminee', 'done', 'annule', 'annulee'].some((term) => status(row).includes(term));

const VOCABULARY = {
  greeting: ['bjr', 'bonjour', 'bonsoir', 'salut', 'hello', 'coucou', 'yo', 'salam', 'salaam', 'as salam', 'allo'],
  thanks: ['merci', 'thanks', 'super merci', 'ok merci', 'c est bon merci'],
  help: ['aide', 'que peux tu faire', 'tu peux faire quoi', 'assistant', 'comment tu peux m aider', 'explique moi', 'guide moi'],
  dashboard: ['accueil', 'page accueil', 'dashboard', 'tableau de bord', 'vue globale', 'ecran principal'],
  settings: ['parametre', 'parametres', 'reglage', 'reglages', 'configuration', 'preferences', 'icone parametre', 'menu parametre'],
  sync: ['sync', 'synchronisation', 'activite sync', 'audit sync', 'interconnexion', 'interconnexions', 'liens entre modules', 'offline', 'hors ligne', 'file offline'],
  delete: ['supprimer', 'supprime', 'suppression', 'effacer', 'retirer', 'enlever', 'delete', 'nettoyer', 'vider'],
  restoreIssue: ['revient', 'reviennent', 'reapparait', 'reapparaissent', 'encore la', 'toujours la', 'reste dans', 'pas disparu'],
  alerts: ['alerte', 'alertes', 'notification', 'notifications', 'centre alerte', 'centre alertes', 'badge rouge', 'compteur alerte'],
  sales: ['vente', 'ventes', 'commande', 'commandes', 'facture', 'factures', 'livraison', 'livraisons', 'client a payer', 'encaissement vente'],
  salesCharts: ['graphique vente', 'graphiques ventes', 'courbe vente', 'evolution vente', 'vente dans le graphique', 'vente enregistree', 'vente restante'],
  finance: ['finance', 'finances', 'argent', 'cash', 'caisse', 'tresorerie', 'depense', 'depenses', 'charge', 'charges'],
  ca: ['chiffre d affaires', 'chiffre affaire', 'ca', 'combien j ai vendu', 'montant des ventes', 'total des ventes', 'recette vente'],
  paid: ['encaisse', 'encaissement', 'argent recu', 'argent reçu', 'revenus encaisses', 'paiement recu', 'paiement reçu', 'cash recu'],
  margin: ['marge', 'benefice', 'bénéfice', 'rentabilite', 'rentabilité', 'resultat', 'profit', 'gain'],
  global: ['situation globale', 'resume global', 'résumé global', 'etat global', 'où en est la ferme', 'ou en est la ferme', 'etat de la ferme', 'point global'],
  bankable: ['bancable', 'bancabilite', 'bancabilité', 'financeur', 'banque', 'credit', 'crédit', 'pret bancaire', 'prêt bancaire', 'dossier financement'],
  priority: ['que renforcer', 'recommandation', 'decision du jour', 'priorite', 'priorité', 'quoi faire', 'action du jour', 'par quoi commencer', 'urgent', 'urgence'],
  stock: ['stock', 'stocks', 'rupture', 'stock critique', 'stocks critiques', 'reapprovisionnement', 'réapprovisionnement', 'aliment', 'aliments', 'intrant', 'intrants'],
  clients: ['client', 'clients', 'clients a relancer', 'relancer client', 'creance', 'créance', 'dette client', 'reste a payer', 'reste à payer'],
  avicole: ['avicole', 'pondeuse', 'pondeuses', 'ponte', 'oeuf', 'œuf', 'oeufs', 'œufs', 'chair', 'poulet', 'poulets', 'lot', 'lots', 'poussins', 'mortalite', 'mortalité'],
  lotClosed: ['lot cloture', 'lot clôturé', 'lot ferme', 'lot fermé', 'lot termine', 'lot terminé', 'lot a supprimer', 'lot à supprimer', 'sorti a historiser', 'sortis a historiser'],
  health: ['sante', 'santé', 'vaccin', 'vaccins', 'soin', 'soins', 'biosécurité', 'biosecurite', 'veterinaire', 'vétérinaire', 'malade', 'maladie'],
  cultures: ['culture', 'cultures', 'maraichage', 'maraîchage', 'recolte', 'récolte', 'parcelle', 'parcelles', 'semis', 'intrants culture'],
  suppliers: ['fournisseur', 'fournisseurs', 'approvisionnement', 'commande fournisseur', 'dette fournisseur', 'payer fournisseur'],
  documents: ['document', 'documents', 'preuve', 'preuves', 'justificatif', 'justificatifs', 'piece jointe', 'pièce jointe', 'facture fournisseur'],
  tasks: ['tache', 'tâche', 'taches', 'tâches', 'a faire', 'todo', 'action', 'actions', 'planning'],
  equipment: ['equipement', 'équipement', 'equipements', 'équipements', 'maintenance', 'panne', 'machine', 'materiel', 'matériel'],
  smartfarm: ['smart farm', 'capteur', 'capteurs', 'camera', 'caméra', 'cameras', 'caméras', 'iot', 'temperature', 'température'],
  hr: ['rh', 'equipe', 'équipe', 'employe', 'employé', 'salarie', 'salarié', 'personnel', 'paie'],
  reports: ['rapport', 'rapports', 'export', 'pdf', 'bilan', 'etat imprime', 'état imprimé'],
  access: ['pas accessible', 'je n ai pas acces', 'je ne peux pas ouvrir', 'bloque', 'bloqué', 'module inaccessible', 'n est pas accessible'],
  slow: ['lent', 'lenteur', 'ca rame', 'ça rame', 'chargement long', 'affichage lent', 'trop lent', 'lag'],
};

function hasIntent(command, key) {
  return includesAny(command, VOCABULARY[key] || []);
}

function financeStats(dataMap = {}) {
  const orders = arr(dataMap.sales_orders || dataMap.ventes || dataMap.salesOrders || dataMap.commandes);
  const payments = arr(dataMap.payments || dataMap.paiements);
  const transactions = arr(dataMap.finances || dataMap.transactions);
  const invoices = arr(dataMap.invoices || dataMap.factures);
  const deliveries = arr(dataMap.deliveries || dataMap.livraisons);
  const orderIds = new Set(orders.map((row) => String(row.id || '')).filter(Boolean));
  const linkedPayments = payments.filter((payment) => {
    const orderId = String(payment.order_id || payment.sale_id || payment.commande_id || payment.related_id || payment.source_record_id || '').trim();
    return !orderId || orderIds.has(orderId);
  });
  const caOrders = orders.reduce((sum, row) => sum + amount(row), 0);
  const caInvoices = invoices.reduce((sum, row) => sum + amount(row), 0);
  const ca = Math.max(caOrders, caInvoices);
  const encaisse = linkedPayments.reduce((sum, row) => sum + amount(row), 0) + transactions.filter((row) => ['entree', 'recette', 'revenu', 'encaissement'].some((term) => normalize(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const depenses = transactions.filter((row) => ['sortie', 'depense', 'charge', 'achat'].some((term) => normalize(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const coutDirect = orders.reduce((sum, row) => sum + num(row.cout_revient ?? row.cout_direct), 0);
  const margeDirecte = orders.reduce((sum, row) => sum + num(row.marge_directe ?? row.marge_montant ?? row.marge), 0) || ca - coutDirect;
  const creances = Math.max(0, orders.reduce((sum, row) => sum + num(row.reste_a_payer), 0) || ca - encaisse);
  const orphanPayments = payments.length - linkedPayments.length;
  return { orders, payments: linkedPayments, allPayments: payments, orphanPayments, transactions, invoices, deliveries, ca, encaisse, depenses, coutDirect, margeDirecte, creances, benefice: encaisse - depenses };
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
  const alertes = arr(dataMap.alertes_center || dataMap.alertes || dataMap.alerts);
  const stockCritique = stocks.filter((row) => num(row.quantite ?? row.quantity ?? row.stock) <= num(row.seuil ?? row.threshold ?? row.min_stock) && num(row.seuil ?? row.threshold ?? row.min_stock) > 0).length;
  const soinsRetard = sante.filter((row) => ['retard', 'a faire', 'a_faire', 'en retard'].some((term) => status(row).includes(term))).length;
  const tachesOuvertes = taches.filter(isOpenTask).length;
  const alertesCritiques = alertes.filter((row) => ['critique', 'urgence'].some((term) => normalize(row.severity || row.gravite).includes(term))).length;
  const lotsClos = avicole.filter((row) => ['cloture', 'cloture', 'ferme', 'archive', 'termine', 'vendu'].some((term) => status(row).includes(term))).length;
  return { ...f, stocks, animaux, avicole, sante, clients, cultures, fournisseurs, documents, taches, alertes, stockCritique, soinsRetard, tachesOuvertes, alertesCritiques, lotsClos };
}

function greetingAnswer() {
  return { moduleKey: null, answer: 'Bonjour 😊 Je suis là. Tu peux me parler naturellement : “supprime ce lot”, “pourquoi une vente reste dans le graphique”, “ouvre santé”, “quelles alertes sont urgentes”, ou “donne-moi la priorité du jour”.' };
}

function unknownAnswer(command) {
  return { moduleKey: null, answer: `Je n’ai pas encore bien compris “${command}”. Essaie avec des mots métier simples : ventes, stock, alertes, santé, lot chair, suppression, créances, documents, tâches, paramètres ou interconnexions.` };
}

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = normalize(rawCommand).trim();
  const s = globalStats(dataMap);

  if (VOCABULARY.greeting.includes(command) || includesAny(command, ['bonjour assistant', 'salut assistant', 'bjr assistant'])) return greetingAnswer();
  if (hasIntent(command, 'thanks')) return { moduleKey: null, answer: 'Avec plaisir 😊 On continue quand tu veux. Je peux aussi te sortir une priorité du jour, ouvrir un module ou expliquer une incohérence.' };
  if (hasIntent(command, 'help')) return { moduleKey: null, answer: 'Je peux t’aider à piloter la ferme sans fouiller partout : CA, encaissements, créances, marge, stock critique, ventes, clients, santé, avicole, cultures, fournisseurs, tâches, documents, paramètres, suppressions et interconnexions. Tu peux parler simplement, par exemple : “pourquoi cette vente revient ?”, “ouvre santé”, “supprime le lot à historiser” ou “qu’est-ce qui est urgent ?”.' };

  if (hasIntent(command, 'settings')) return { moduleKey: null, answer: 'Les paramètres sont dans l’icône engrenage en haut à droite. Tu peux y gérer le mode démo, les préférences d’affichage, les notifications, les caches locaux, la gestion système et l’audit sync.' };
  if (hasIntent(command, 'sync')) return { moduleKey: 'sync_activity', answer: 'J’ouvre Activité & Sync ERP. C’est là que tu peux vérifier les interconnexions, les incohérences, l’offline, les logs et les points à corriger.' };
  if (hasIntent(command, 'access')) return { moduleKey: 'gestion_systeme', answer: 'Si un module n’est pas accessible, il faut vérifier les permissions dans Gestion du système. Je t’y emmène pour contrôler le rôle et les accès.' };
  if (hasIntent(command, 'slow')) return { moduleKey: 'sync_activity', answer: 'Pour les lenteurs, regarde d’abord le module concerné et la quantité de données. Je te conseille de noter : ouverture lente, scroll lent, sauvegarde lente ou graphique lent. L’audit Sync peut aider à repérer les modules lourds.' };

  if (hasIntent(command, 'delete') && hasIntent(command, 'lotClosed')) return { moduleKey: 'avicole', answer: `Pour supprimer un lot sorti ou clôturé, va dans Avicole puis dans la section “Lots sortis / à historiser”. Tu y trouveras Voir, Modifier et Supprimer. Actuellement, je détecte ${s.lotsClos} lot(s) clôturé(s) ou sorti(s).` };
  if (hasIntent(command, 'delete') && hasIntent(command, 'alerts')) return { moduleKey: 'alertes', answer: 'Pour supprimer une alerte, ouvre Centre Alertes. Si elle revient après suppression, c’est souvent une alerte automatique dérivée d’un stock, lot, animal ou tâche encore actif. Il faut traiter la cause ou marquer l’alerte comme traitée.' };
  if (hasIntent(command, 'delete') && hasIntent(command, 'restoreIssue')) return { moduleKey: 'sync_activity', answer: 'Si une donnée supprimée revient, vérifie deux choses : le mode démo doit être désactivé dans Paramètres, et la migration soft delete doit être appliquée côté Supabase. J’ouvre Activité & Sync ERP pour vérifier les incohérences.' };
  if (hasIntent(command, 'salesCharts') || (hasIntent(command, 'sales') && hasIntent(command, 'restoreIssue'))) return { moduleKey: 'ventes', answer: `Si une vente reste dans les graphiques après suppression, la cause habituelle est un paiement ou une transaction finance orpheline. Les graphiques ignorent maintenant les paiements sans commande active. Je vois ${s.orphanPayments} paiement(s) potentiellement orphelin(s).` };

  if (hasIntent(command, 'ca')) {
    const relance = s.creances > 0 ? ` Il reste quand même ${money(s.creances)} à relancer.` : ' Rien de majeur à relancer côté créances.';
    return { moduleKey: 'ventes', answer: `Pour l’instant, ton chiffre d’affaires suivi est de ${money(s.ca)}. Sur ce montant, ${money(s.encaisse)} est encaissé.${relance} La base vient de ${s.orders.length} commande(s), ${s.invoices.length} facture(s) et ${s.deliveries.length} livraison(s).` };
  }
  if (hasIntent(command, 'paid')) return { moduleKey: 'finances', answer: `Tu as ${money(s.encaisse)} encaissés. Les créances restantes sont à ${money(s.creances)} et les dépenses enregistrées sont à ${money(s.depenses)}. Donc côté cash, le résultat estimé est de ${money(s.benefice)}.` };
  if (hasIntent(command, 'margin')) {
    const warning = s.coutDirect <= 0 ? ' Attention, les coûts directs semblent encore incomplets : la marge peut donc être trop optimiste.' : '';
    return { moduleKey: 'finances', answer: `La marge directe suivie est de ${money(s.margeDirecte)}. Les coûts directs connus sont à ${money(s.coutDirect)} et le bénéfice cash estimé après dépenses enregistrées est de ${money(s.benefice)}.${warning}` };
  }
  if (hasIntent(command, 'global') || hasIntent(command, 'dashboard')) return { moduleKey: 'dashboard', answer: `Globalement, on a ${money(s.ca)} de CA, ${money(s.encaisse)} encaissés, ${money(s.creances)} à récupérer et ${money(s.margeDirecte)} de marge directe suivie. Ce que je surveillerais en premier : ${s.stockCritique} stock(s) critique(s), ${s.soinsRetard} soin(s) en retard, ${s.tachesOuvertes} tâche(s) ouverte(s) et ${s.alertesCritiques} alerte(s) critique(s).` };
  if (hasIntent(command, 'bankable')) {
    const score = [s.ca > 0, s.encaisse > 0, s.documents.length > 0, s.creances <= s.ca * 0.4, s.stockCritique === 0, s.margeDirecte >= 0].filter(Boolean).length;
    const label = score >= 5 ? 'le dossier commence à être solide' : score >= 3 ? 'il y a une base, mais il faut la renforcer' : 'le dossier est encore fragile';
    return { moduleKey: 'impact_business', answer: `Pour la bancabilité, ${label}. Les points qui aident : CA ${money(s.ca)}, encaissements ${money(s.encaisse)}, ${s.documents.length} document(s), créances ${money(s.creances)} et marge directe ${money(s.margeDirecte)}. Ce que je renforcerais : preuves, régularité des encaissements, baisse des créances et coûts mieux justifiés.` };
  }
  if (hasIntent(command, 'priority')) {
    const actions = [];
    if (s.creances > 0) actions.push(`relancer ${money(s.creances)} de créances`);
    if (s.stockCritique > 0) actions.push(`corriger ${s.stockCritique} stock(s) critique(s)`);
    if (s.soinsRetard > 0) actions.push(`traiter ${s.soinsRetard} soin(s) en retard`);
    if (s.tachesOuvertes > 0) actions.push(`fermer ou planifier ${s.tachesOuvertes} tâche(s)`);
    if (!actions.length) actions.push('continuer le suivi, mettre à jour les ventes et compléter les coûts manquants');
    return { moduleKey: 'dashboard', answer: `Je commencerais par ça : ${actions.join(', ')}. L’objectif est simple : protéger le cash, éviter les ruptures et fiabiliser la marge.` };
  }
  if (hasIntent(command, 'stock')) {
    const value = s.stocks.reduce((sum, row) => sum + num(row.valeur_stock ?? row.stock_value ?? row.cout_total ?? row.total_value), 0);
    return { moduleKey: 'stock', answer: `Côté stock, je vois ${s.stockCritique} produit(s) critique(s). La valeur stock renseignée est de ${money(value)}. Je compléterais les unités/prix manquants puis je lancerais les réapprovisionnements sous seuil.` };
  }
  if (hasIntent(command, 'clients')) return { moduleKey: 'clients', answer: `Tu as ${s.clients.length} client(s) suivis. Le point sensible, c’est ${money(s.creances)} à relancer. Je prioriserais les clients avec reste à payer et bon historique d’achat.` };
  if (hasIntent(command, 'sales')) return { moduleKey: 'ventes', answer: `Côté ventes, on a ${s.orders.length} commande(s), ${s.invoices.length} facture(s) et ${s.deliveries.length} livraison(s). Le CA suivi est de ${money(s.ca)} et les créances sont à ${money(s.creances)}. Le plus utile est de vérifier les commandes non payées ou non livrées.` };
  if (hasIntent(command, 'avicole')) return { moduleKey: 'avicole', answer: `Pour l’avicole, je vois ${s.avicole.length} lot(s) suivis, dont ${s.lotsClos} clôturé(s) ou sorti(s). Il faut garder deux lectures séparées : chair pour poids, mortalité, abattage et ventes ; ponte pour œufs, casse, taux de ponte et coût par œuf.` };
  if (hasIntent(command, 'health')) return { moduleKey: 'sante', answer: `Côté santé, ${s.sante.length} action(s) sont suivies, dont ${s.soinsRetard} en retard. Je traiterais d’abord les retards, puis je sécuriserais les produits santé et les preuves.` };
  if (hasIntent(command, 'cultures')) return { moduleKey: 'cultures', answer: `Côté cultures, ${s.cultures.length} campagne(s) ou parcelle(s) sont suivies. Les points clés sont les coûts, les intrants, les récoltes, les pertes et les débouchés.` };
  if (hasIntent(command, 'suppliers')) return { moduleKey: 'fournisseurs', answer: `Tu as ${s.fournisseurs.length} fournisseur(s) suivis. Je regarderais surtout la fiabilité, les prix, le transport, les délais et le lien avec les stocks achetés.` };
  if (hasIntent(command, 'documents')) return { moduleKey: 'documents', answer: `Il y a ${s.documents.length} document(s) suivis. Plus tu rattaches les preuves aux ventes, dépenses, santé et investissements, plus ton dossier devient solide et défendable.` };
  if (hasIntent(command, 'tasks')) return { moduleKey: 'taches', answer: `Tu as ${s.taches.length} tâche(s), dont ${s.tachesOuvertes} encore ouvertes. Je transformerais les alertes importantes en tâches claires, puis je fermerais les tâches sensibles une par une.` };
  if (hasIntent(command, 'equipment')) return { moduleKey: 'equipements', answer: 'J’ouvre Équipements. Tu peux suivre le matériel, les pannes, les maintenances, les dépenses associées, les documents et les tâches terrain.' };
  if (hasIntent(command, 'smartfarm')) return { moduleKey: 'smartfarm', answer: 'J’ouvre Smart Farm. Tu peux suivre capteurs, caméras, météo terrain, sécurité, alertes et tâches de maintenance.' };
  if (hasIntent(command, 'hr')) return { moduleKey: 'rh', answer: 'J’ouvre RH & Équipe. Tu peux suivre l’équipe, les responsabilités, les coûts RH et les actions liées.' };
  if (hasIntent(command, 'reports')) return { moduleKey: 'rapports', answer: 'J’ouvre Rapports. Tu peux générer ou consulter des bilans, exports, documents de suivi et synthèses ERP.' };

  return unknownAnswer(rawCommand);
};
