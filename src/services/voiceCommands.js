const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const money = (value) => `${Math.round(num(value)).toLocaleString('fr-FR')} FCFA`;
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const includesAny = (text, words) => words.some((word) => text.includes(normalize(word)));
const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.valeur_estimee ?? row.estimated_amount);
const status = (row = {}) => normalize(row.status || row.statut || row.statut_paiement || row.payment_status);
const isOpenTask = (row = {}) => !['termine', 'terminee', 'done', 'annule', 'annulee'].some((term) => status(row).includes(term));

const NAV_MODULES = [
  { key: 'dashboard', label: 'Accueil', words: ['accueil', 'dashboard', 'tableau de bord', 'vue globale'] },
  { key: 'assistant_erp', label: 'Assistant ERP', words: ['assistant erp', 'assistant'] },
  { key: 'centre_ia', label: 'Centre IA', words: ['centre ia', 'ia', 'intelligence artificielle', 'cerveau'] },
  { key: 'ventes', label: 'Ventes', words: ['vente', 'ventes', 'commande', 'commandes', 'facture client'] },
  { key: 'finances', label: 'Finances', words: ['finance', 'finances', 'caisse', 'tresorerie', 'trésorerie', 'argent'] },
  { key: 'stock', label: 'Stock', words: ['stock', 'stocks', 'aliment', 'aliments', 'intrants'] },
  { key: 'avicole', label: 'Avicole', words: ['avicole', 'pondeuse', 'pondeuses', 'poulet', 'poulets', 'oeufs', 'œufs', 'lot', 'lots'] },
  { key: 'animaux', label: 'Animaux', words: ['animaux', 'animal', 'bovin', 'ovins', 'caprins', 'vache', 'mouton', 'chevre', 'chèvre'] },
  { key: 'sante', label: 'Santé', words: ['sante', 'santé', 'vaccin', 'vaccins', 'soin', 'soins', 'veterinaire', 'vétérinaire'] },
  { key: 'cultures', label: 'Cultures', words: ['culture', 'cultures', 'maraichage', 'maraîchage', 'parcelle', 'recolte', 'récolte'] },
  { key: 'clients', label: 'Clients', words: ['client', 'clients'] },
  { key: 'fournisseurs', label: 'Fournisseurs', words: ['fournisseur', 'fournisseurs'] },
  { key: 'documents', label: 'Documents', words: ['document', 'documents', 'justificatif', 'preuve'] },
  { key: 'taches', label: 'Tâches', words: ['tache', 'tâche', 'taches', 'tâches', 'planning'] },
  { key: 'alertes', label: 'Alertes', words: ['alerte', 'alertes', 'notification', 'notifications'] },
  { key: 'smartfarm', label: 'Smart Farm', words: ['smart farm', 'capteur', 'capteurs', 'camera', 'caméra', 'iot'] },
  { key: 'equipements', label: 'Équipements', words: ['equipement', 'équipement', 'materiel', 'matériel', 'maintenance'] },
  { key: 'rapports', label: 'Rapports', words: ['rapport', 'rapports', 'bilan', 'export'] },
  { key: 'rh', label: 'RH', words: ['rh', 'equipe', 'équipe', 'employe', 'employé', 'personnel'] },
  { key: 'sync_activity', label: 'Activité & Sync ERP', words: ['sync', 'synchronisation', 'audit', 'activité', 'activite'] },
  { key: 'gestion_systeme', label: 'Gestion du système', words: ['gestion systeme', 'gestion système', 'parametres', 'paramètres', 'permissions'] },
];

function detectNavigation(command = '') {
  const isNavigation = includesAny(command, ['ouvre', 'ouvrir', 'montre', 'montres', 'affiche', 'va dans', 'vas dans', 'emmene moi', 'emmène moi', 'amene moi', 'amène moi', 'module']);
  if (!isNavigation) return null;
  const found = NAV_MODULES.find((module) => includesAny(command, module.words));
  if (!found) return null;
  return { moduleKey: found.key, answer: `J’ouvre le module ${found.label}.` };
}

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
  ca: ['chiffre d affaires', 'chiffre affaire', 'ca', 'c a', 'chiffre daffaires', 'combien j ai vendu', 'montant des ventes', 'total des ventes', 'recette vente', 'ca actuel', 'mon ca'],
  paid: ['encaisse', 'encaissement', 'argent recu', 'argent reçu', 'revenus encaisses', 'paiement recu', 'paiement reçu', 'cash recu', 'combien j ai encaisse', 'combien j ai encaissé'],
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
  const lotsClos = avicole.filter((row) => ['cloture', 'ferme', 'archive', 'termine', 'vendu'].some((term) => status(row).includes(term))).length;
  return { ...f, stocks, animaux, avicole, sante, clients, cultures, fournisseurs, documents, taches, alertes, stockCritique, soinsRetard, tachesOuvertes, alertesCritiques, lotsClos };
}

function greetingAnswer() {
  return { moduleKey: null, answer: 'Bonjour 😊 Je suis là. Tu peux me dire : “ouvre ventes”, “quel est mon CA”, “combien j’ai encaissé”, “montre stock”, ou “quelle est la priorité du jour”.' };
}

function unknownAnswer(command) {
  return { moduleKey: null, answer: `Je n’ai pas encore bien compris “${command}”. Essaie par exemple : “ouvre ventes”, “quel est mon CA”, “combien j’ai encaissé”, “montre stock”, “ouvre avicole”, ou “situation globale”.` };
}

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = normalize(rawCommand).trim();
  const navigation = detectNavigation(command);
  if (navigation) return navigation;
  const s = globalStats(dataMap);

  if (VOCABULARY.greeting.includes(command) || includesAny(command, ['bonjour assistant', 'salut assistant', 'bjr assistant'])) return greetingAnswer();
  if (hasIntent(command, 'thanks')) return { moduleKey: null, answer: 'Avec plaisir 😊 On continue quand tu veux. Je peux aussi te sortir une priorité du jour, ouvrir un module ou expliquer une incohérence.' };
  if (hasIntent(command, 'help')) return { moduleKey: null, answer: 'Je peux ouvrir les modules et répondre aux questions clés : CA, encaissements, créances, marge, stock critique, ventes, clients, santé, avicole, cultures, fournisseurs, tâches, documents et interconnexions.' };

  if (hasIntent(command, 'settings')) return { moduleKey: 'gestion_systeme', answer: 'J’ouvre Gestion du système pour les paramètres, permissions et préférences.' };
  if (hasIntent(command, 'sync')) return { moduleKey: 'sync_activity', answer: 'J’ouvre Activité & Sync ERP pour les interconnexions, incohérences et logs.' };
  if (hasIntent(command, 'access')) return { moduleKey: 'gestion_systeme', answer: 'Si un module n’est pas accessible, il faut vérifier les permissions dans Gestion du système.' };
  if (hasIntent(command, 'slow')) return { moduleKey: 'sync_activity', answer: 'Pour les lenteurs, je t’emmène vers Activité & Sync ERP pour repérer les modules lourds ou erreurs.' };

  if (hasIntent(command, 'ca')) {
    const relance = s.creances > 0 ? ` Il reste ${money(s.creances)} à relancer.` : ' Rien de majeur à relancer côté créances.';
    return { moduleKey: 'ventes', answer: `Ton chiffre d’affaires suivi est de ${money(s.ca)}. Le montant encaissé est de ${money(s.encaisse)}.${relance}` };
  }
  if (hasIntent(command, 'paid')) return { moduleKey: 'finances', answer: `Tu as ${money(s.encaisse)} encaissés. Les créances restantes sont à ${money(s.creances)} et les dépenses enregistrées sont à ${money(s.depenses)}.` };
  if (hasIntent(command, 'margin')) return { moduleKey: 'finances', answer: `La marge directe suivie est de ${money(s.margeDirecte)}. Les coûts directs connus sont à ${money(s.coutDirect)} et le résultat cash estimé est de ${money(s.benefice)}.` };
  if (hasIntent(command, 'global') || hasIntent(command, 'dashboard')) return { moduleKey: 'dashboard', answer: `Situation globale : CA ${money(s.ca)}, encaissé ${money(s.encaisse)}, créances ${money(s.creances)}, marge directe ${money(s.margeDirecte)}. Points à surveiller : ${s.stockCritique} stock(s) critique(s), ${s.soinsRetard} soin(s) en retard, ${s.tachesOuvertes} tâche(s) ouverte(s).` };
  if (hasIntent(command, 'bankable')) return { moduleKey: 'impact_business', answer: `Pour la bancabilité : CA ${money(s.ca)}, encaissements ${money(s.encaisse)}, documents ${s.documents.length}, créances ${money(s.creances)}, marge ${money(s.margeDirecte)}. Il faut renforcer les preuves, les encaissements et la traçabilité.` };
  if (hasIntent(command, 'priority')) return { moduleKey: 'dashboard', answer: `Priorité : protéger le cash, éviter les ruptures et traiter les alertes. Je surveille surtout ${money(s.creances)} de créances, ${s.stockCritique} stock(s) critique(s), ${s.soinsRetard} soin(s) en retard.` };

  if (hasIntent(command, 'stock')) return { moduleKey: 'stock', answer: `J’ouvre Stock. Je vois ${s.stockCritique} produit(s) critique(s).` };
  if (hasIntent(command, 'clients')) return { moduleKey: 'clients', answer: `J’ouvre Clients. Tu as ${s.clients.length} client(s) suivis et ${money(s.creances)} à relancer.` };
  if (hasIntent(command, 'sales')) return { moduleKey: 'ventes', answer: `J’ouvre Ventes. Tu as ${s.orders.length} commande(s), un CA de ${money(s.ca)} et ${money(s.creances)} de créances.` };
  if (hasIntent(command, 'avicole')) return { moduleKey: 'avicole', answer: `J’ouvre Avicole. Tu as ${s.avicole.length} lot(s) suivis.` };
  if (hasIntent(command, 'health')) return { moduleKey: 'sante', answer: `J’ouvre Santé. ${s.soinsRetard} soin(s) ou vaccin(s) semblent en retard.` };
  if (hasIntent(command, 'cultures')) return { moduleKey: 'cultures', answer: `J’ouvre Cultures. Tu as ${s.cultures.length} culture(s) ou campagne(s) suivie(s).` };
  if (hasIntent(command, 'suppliers')) return { moduleKey: 'fournisseurs', answer: `J’ouvre Fournisseurs. Tu as ${s.fournisseurs.length} fournisseur(s) suivis.` };
  if (hasIntent(command, 'documents')) return { moduleKey: 'documents', answer: `J’ouvre Documents. Tu as ${s.documents.length} document(s) suivis.` };
  if (hasIntent(command, 'tasks')) return { moduleKey: 'taches', answer: `J’ouvre Tâches. Tu as ${s.tachesOuvertes} tâche(s) ouverte(s).` };
  if (hasIntent(command, 'equipment')) return { moduleKey: 'equipements', answer: 'J’ouvre Équipements.' };
  if (hasIntent(command, 'smartfarm')) return { moduleKey: 'smartfarm', answer: 'J’ouvre Smart Farm.' };
  if (hasIntent(command, 'hr')) return { moduleKey: 'rh', answer: 'J’ouvre RH & Équipe.' };
  if (hasIntent(command, 'reports')) return { moduleKey: 'rapports', answer: 'J’ouvre Rapports.' };

  return unknownAnswer(rawCommand);
};
