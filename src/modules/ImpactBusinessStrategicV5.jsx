import {
  AlertTriangle,
  ArrowRight,
  Bird,
  Building2,
  CheckCircle2,
  DollarSign,
  Factory,
  FileCheck2,
  GitBranch,
  HeartPulse,
  Layers,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
const money = (value) => fmtCurrency(toNumber(value));
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.total_amount ?? row.value ?? row.valeur ?? row.revenu_reel ?? row.revenu_estime);
const statusOf = (row = {}) => lower(row.status || row.statut || row.payment_status || row.statut_paiement);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const stockUnitPrice = (row = {}) => toNumber(row.prix_unitaire ?? row.prixUnit ?? row.unit_price ?? row.price ?? row.cout_unitaire);
const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);

function hasText(row = {}, terms = []) {
  const haystack = lower(`${row.product_name || ''} ${row.libelle || ''} ${row.title || ''} ${row.name || ''} ${row.nom || ''} ${row.type || ''} ${row.culture || ''} ${row.categorie || ''}`);
  return terms.some((term) => haystack.includes(term));
}

function isExpense(row = {}) {
  const text = lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''}`);
  return ['sortie', 'depense', 'dépense', 'charge', 'achat', 'expense'].some((key) => text.includes(key));
}

function isRevenue(row = {}) {
  const text = lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''}`);
  return ['entree', 'entrée', 'revenu', 'recette', 'vente', 'income'].some((key) => text.includes(key));
}

function isUnpaid(row = {}) {
  return ['impaye', 'impayé', 'partiel', 'partial', 'en_retard', 'retard', 'overdue', 'unpaid', 'a_relancer', 'à_relancer'].includes(statusOf(row));
}

function isClosed(row = {}) {
  return ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed', 'termine', 'terminé'].includes(statusOf(row));
}

function navigateTo(target, onNavigate) {
  if (!target) return;
  if (onNavigate) {
    onNavigate(target);
    return;
  }
  const normalized = String(target).replace('_', ' ').toLowerCase();
  const buttons = Array.from(document.querySelectorAll('nav button, aside button'));
  const match = buttons.find((button) => button.textContent?.toLowerCase().includes(normalized));
  if (match) match.click();
}

function marginState({ revenue = 0, expenses = 0, estimated = false }) {
  const rev = toNumber(revenue);
  const exp = toNumber(expenses);
  if (rev <= 0 && exp <= 0) return { value: 0, display: 'À compléter', label: 'CA et coûts à lier', confidence: 20, tone: 'amber', reliable: false };
  if (rev > 0 && exp <= 0) return { value: rev, display: 'Coûts à compléter', label: 'CA connu, coûts incomplets', confidence: estimated ? 45 : 50, tone: 'amber', reliable: false };
  if (rev <= 0 && exp > 0) return { value: -exp, display: 'Ventes à lier', label: 'Coûts connus, ventes manquantes', confidence: 35, tone: 'amber', reliable: false };
  const margin = rev - exp;
  return { value: margin, display: money(margin), label: estimated ? 'Marge indicative' : 'Marge suivie', confidence: estimated ? 65 : 85, tone: margin >= 0 ? 'good' : 'danger', reliable: !estimated };
}

function scoreData(points, expected) {
  return clamp((toNumber(points) / Math.max(1, toNumber(expected))) * 100);
}

function scorePerspective(input) {
  const margin = marginState(input);
  const rentabilite = margin.reliable && input.revenue > 0 ? clamp(50 + (margin.value / input.revenue) * 100) : margin.confidence;
  const cashPressure = toNumber(input.expenses) + toNumber(input.receivables);
  const cash = cashPressure > 0 ? clamp((toNumber(input.revenue) / cashPressure) * 60) : input.revenue > 0 ? 75 : 45;
  const cycles = input.cycleDays ? 365 / Math.max(1, input.cycleDays) : 1;
  const rotation = clamp(35 + Math.min(35, cycles * 5) + Math.min(30, Math.max(0, margin.reliable ? margin.value : 0) * cycles / 120000));
  const risque = clamp(95 - toNumber(input.lossRate) * 4 - toNumber(input.criticalStock) * 8);
  const demande = clamp((input.sales > 0 ? 50 + Math.min(30, input.sales * 5) : input.revenue > 0 ? 45 : 25) + Math.min(15, input.repeatClients * 2));
  const capacite = clamp(62 + Math.min(12, input.activePeople * 2) + Math.min(10, input.equipmentsOk * 2) - input.criticalStock * 7 - input.lateTasks * 4);
  const data = scoreData(input.dataPoints, input.expectedPoints || 6);
  const global = clamp(rentabilite * 0.24 + cash * 0.15 + rotation * 0.13 + risque * 0.15 + demande * 0.15 + capacite * 0.1 + data * 0.08);
  let label = 'À reporter';
  let reason = 'Les indicateurs ne justifient pas une relance forte maintenant.';
  if (data < 40) [label, reason] = ['Tester petit volume', 'Il manque encore des données pour engager gros.'];
  else if (rentabilite < 45) [label, reason] = ['Compléter les chiffres', 'La marge n’est pas assez fiable pour décider fort.'];
  else if (cash < 35) [label, reason] = ['Sécuriser le financement', 'Le besoin de cash est trop fort pour augmenter sans filet.'];
  else if (risque < 35) [label, reason] = ['Corriger les risques', 'Les pertes ou alertes peuvent absorber la marge.'];
  else if (demande < 40) [label, reason] = ['Sécuriser les clients', 'La demande n’est pas encore assez prouvée.'];
  else if (capacite < 40) [label, reason] = ['Stabiliser la capacité', 'Stock, équipe ou équipements doivent suivre avant extension.'];
  else if (global >= 80) [label, reason] = ['À renforcer', 'Les indicateurs sont favorables.'];
  else if (global >= 65) [label, reason] = ['À reprendre avec contrôle', 'Potentiel réel, avec quelques points à surveiller.'];
  else if (global >= 50) [label, reason] = ['À stabiliser ou tester', 'Potentiel présent, mais pas encore assez solide.'];
  return { ...input, marginInfo: margin, score: global, recommendation: { label, reason }, scores: { rentabilite, cash, rotation, risque, demande, capacite, data } };
}

function scoreExplanation(score, good, weak) {
  if (score >= 75) return good;
  if (score >= 50) return 'Base intéressante, mais quelques preuves restent à renforcer.';
  return weak;
}

function computeImpact(props = {}) {
  const animaux = arr(props.animaux);
  const lots = arr(props.lots);
  const productionLogs = arr(props.productionLogs);
  const sante = arr(props.sante);
  const stocks = arr(props.stocks);
  const transactions = arr(props.transactions);
  const salesOrders = arr(props.salesOrders);
  const payments = arr(props.payments);
  const alertes = arr(props.alertes);
  const taches = arr(props.taches);
  const documents = arr(props.documents);
  const whatsappLogs = arr(props.whatsappLogs);
  const events = arr(props.businessEvents);
  const cultures = arr(props.cultures).filter((row) => !['parcelle', 'campagne', 'performance'].includes(lower(row.record_type || row.type_fiche)));
  const clients = arr(props.clients);
  const fournisseurs = arr(props.fournisseurs);
  const equipements = arr(props.equipements);

  const revenue = payments.reduce((sum, row) => sum + amount(row), 0) + transactions.filter(isRevenue).reduce((sum, row) => sum + amount(row), 0);
  const expenses = transactions.filter(isExpense).reduce((sum, row) => sum + amount(row), 0);
  const margin = revenue - expenses;
  const receivables = [...salesOrders, ...payments, ...transactions].filter(isUnpaid).reduce((sum, row) => sum + amount(row), 0);
  const criticalStocks = stocks.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  const valuedStocks = stocks.filter((row) => stockUnitPrice(row) > 0);
  const stockValue = stocks.reduce((sum, row) => sum + stockQty(row) * stockUnitPrice(row), 0);
  const openCriticalAlerts = alertes.filter((row) => ['urgence', 'critique'].includes(lower(row.severity || row.gravite)) && !isClosed(row));
  const lateTasks = taches.filter((row) => ['retard', 'en_retard', 'critique'].includes(statusOf(row)) || lower(row.priority || row.priorite) === 'critique');
  const sickAnimals = animaux.filter((row) => lower(row.health_status).includes('malade'));
  const lateHealth = sante.filter((row) => ['retard', 'en_retard'].includes(statusOf(row)));
  const activePeople = arr(props.rhPeople || props.people).filter((row) => ['actif', 'active'].includes(lower(row.statut || row.status || 'actif'))).length;
  const equipmentsOk = equipements.filter((row) => !['panne', 'hors_service'].includes(statusOf(row))).length;
  const recurringClients = clients.filter((row) => toNumber(row.totalAchats ?? row.totalachats) > 0).length;
  const reliableSuppliers = fournisseurs.filter((row) => toNumber(row.note) >= 4 || row.verified || row.favorite).length;
  const avoidedEntries = events.reduce((sum, row) => sum + toNumber(row.saisies_evitees), 0) || Math.round((taches.length + alertes.length + documents.length + whatsappLogs.length + events.length) * 1.5);
  const proofScore = scoreData(documents.length + transactions.length + salesOrders.length + valuedStocks.length + productionLogs.length, Math.max(10, stocks.length + salesOrders.length + productionLogs.length + 5));

  const tomateRows = cultures.filter((row) => hasText(row, ['tomate', 'tomates']));
  const cultureScope = tomateRows.length ? tomateRows : cultures;
  const cultureRevenue = cultureScope.reduce((sum, row) => sum + toNumber(row.revenu_reel || row.revenu_estime || row.ca_realise), 0) + salesOrders.filter((row) => hasText(row, ['tomate', 'tomates', 'culture', 'recolte', 'récolte'])).reduce((sum, row) => sum + amount(row), 0);
  const cultureCost = cultureScope.reduce((sum, row) => sum + toNumber(row.cout_total || row.cout_semences) + toNumber(row.cout_engrais) + toNumber(row.cout_eau) + toNumber(row.cout_main_oeuvre) + toNumber(row.cout_traitement), 0);
  const cultureLoss = cultureScope.reduce((sum, row) => sum + toNumber(row.pertes), 0);
  const cultureQty = cultureScope.reduce((sum, row) => sum + toNumber(row.quantite_recoltee || row.quantite_prevue), 0);
  const cultureSales = salesOrders.filter((row) => hasText(row, ['tomate', 'tomates', 'culture', 'recolte', 'récolte'])).length;

  const chairLots = lots.filter((row) => lower(row.type || row.category).includes('chair'));
  const chairRevenue = chairLots.reduce((sum, row) => sum + toNumber(row.revenu_reel || row.revenu_estime || row.prix_vente_reel || row.prix_vente_prevu) * Math.max(1, toNumber(row.vendus || row.effectif_vendable || 1)), 0) + salesOrders.filter((row) => hasText(row, ['chair', 'poulet'])).reduce((sum, row) => sum + amount(row), 0);
  const chairCost = chairLots.reduce((sum, row) => sum + toNumber(row.cout_poussins) + toNumber(row.frais_sante) + toNumber(row.autres_frais) + toNumber(row.alimentation_cost || row.cout_aliment), 0);
  const chairInitial = chairLots.reduce((sum, row) => sum + toNumber(row.initial_count || row.current_count), 0);
  const chairLoss = chairLots.reduce((sum, row) => sum + toNumber(row.mortality || row.morts), 0);

  const layerLots = lots.filter((row) => lower(row.type || row.category).includes('pondeuse'));
  const eggs = productionLogs.reduce((sum, row) => sum + eggCount(row), 0);
  const broken = productionLogs.reduce((sum, row) => sum + brokenEggs(row), 0);
  const eggRevenue = salesOrders.filter((row) => hasText(row, ['oeuf', 'œuf', 'plateau'])).reduce((sum, row) => sum + amount(row), 0) + transactions.filter((row) => hasText(row, ['oeuf', 'œuf', 'plateau']) && isRevenue(row)).reduce((sum, row) => sum + amount(row), 0);
  const eggCost = layerLots.reduce((sum, row) => sum + toNumber(row.frais_sante) + toNumber(row.autres_frais) + toNumber(row.alimentation_cost || row.cout_aliment), 0);

  const animalRevenue = salesOrders.filter((row) => hasText(row, ['animal', 'bovin', 'ovin', 'caprin'])).reduce((sum, row) => sum + amount(row), 0) + animaux.reduce((sum, row) => sum + toNumber(row.prix_vente_reel || row.sale_price), 0);
  const animalCost = animaux.reduce((sum, row) => sum + toNumber(row.frais_sante) + toNumber(row.autres_frais) + toNumber(row.cout_traitement), 0);
  const stockSalesRevenue = salesOrders.filter((row) => hasText(row, ['stock', 'revente', 'produit'])).reduce((sum, row) => sum + amount(row), 0);

  const perspectives = [
    scorePerspective({ id: 'cultures', title: tomateRows.length ? 'Reprendre tomates ?' : 'Reprendre une campagne cultures ?', module: 'cultures', icon: Sprout, revenue: cultureRevenue, expenses: cultureCost, estimated: !cultureSales, cycleDays: 90, lossRate: cultureQty > 0 ? (cultureLoss / cultureQty) * 100 : 0, sales: cultureSales, repeatClients: recurringClients, criticalStock: criticalStocks.filter((row) => ['semence', 'engrais', 'phyto', 'traitement'].some((term) => lower(row.categorie || row.produit).includes(term))).length, lateTasks: lateTasks.length, activePeople, equipmentsOk, dataPoints: cultureScope.length + cultureSales + (cultureCost > 0 ? 1 : 0) + (cultureRevenue > 0 ? 1 : 0), expectedPoints: 7, details: [`CA lié : ${cultureRevenue > 0 ? money(cultureRevenue) : 'à lier'}`, `Coûts liés : ${cultureCost > 0 ? money(cultureCost) : 'à compléter'}`, `Ventes liées : ${cultureSales}`], actions: [{ label: 'Voir cultures', module: 'cultures' }, { label: 'Voir stock intrants', module: 'stock' }, { label: 'Voir ventes', module: 'ventes' }] }),
    scorePerspective({ id: 'chair', title: 'Relancer poulets de chair ?', module: 'avicole', icon: Bird, revenue: chairRevenue, expenses: chairCost, estimated: !salesOrders.some((row) => hasText(row, ['chair', 'poulet'])), cycleDays: 45, lossRate: chairInitial > 0 ? (chairLoss / chairInitial) * 100 : 0, sales: salesOrders.filter((row) => hasText(row, ['chair', 'poulet'])).length, repeatClients: recurringClients, criticalStock: criticalStocks.filter((row) => ['aliment', 'poussin'].some((term) => lower(row.categorie || row.produit).includes(term))).length, lateTasks: lateTasks.length, activePeople, equipmentsOk, dataPoints: chairLots.length + (chairCost > 0 ? 1 : 0) + (chairRevenue > 0 ? 1 : 0), expectedPoints: 6, details: [`CA lié : ${chairRevenue > 0 ? money(chairRevenue) : 'à lier'}`, `Coûts aliment/santé : ${chairCost > 0 ? money(chairCost) : 'à compléter'}`, `Mortalité : ${fmtNumber(chairLoss)} sujet(s)`], actions: [{ label: 'Voir lots', module: 'avicole' }, { label: 'Voir alimentation', module: 'stock' }, { label: 'Voir ventes', module: 'ventes' }] }),
    scorePerspective({ id: 'ponte', title: 'Augmenter les pondeuses ?', module: 'avicole', icon: Scale, revenue: eggRevenue, expenses: eggCost, estimated: !salesOrders.some((row) => hasText(row, ['oeuf', 'œuf', 'plateau'])), cycleDays: 30, lossRate: eggs > 0 ? (broken / eggs) * 100 : 0, sales: salesOrders.filter((row) => hasText(row, ['oeuf', 'œuf', 'plateau'])).length, repeatClients: recurringClients, criticalStock: criticalStocks.filter((row) => lower(row.categorie || row.produit).includes('aliment')).length, lateTasks: lateTasks.length, activePeople, equipmentsOk, dataPoints: layerLots.length + productionLogs.length + (eggRevenue > 0 ? 1 : 0) + (eggCost > 0 ? 1 : 0), expectedPoints: 7, details: [`Œufs produits : ${fmtNumber(eggs)}`, `Casses : ${fmtNumber(broken)}`, `Coûts aliment/santé : ${eggCost > 0 ? money(eggCost) : 'à compléter'}`], actions: [{ label: 'Voir ponte', module: 'avicole' }, { label: 'Voir ventes œufs', module: 'ventes' }, { label: 'Voir aliment', module: 'stock' }] }),
    scorePerspective({ id: 'animaux', title: 'Renforcer bétail / animaux ?', module: 'animaux', icon: HeartPulse, revenue: animalRevenue, expenses: animalCost, estimated: !salesOrders.some((row) => hasText(row, ['animal', 'bovin', 'ovin', 'caprin'])), cycleDays: 180, lossRate: animaux.length ? (sickAnimals.length / animaux.length) * 100 : 0, sales: salesOrders.filter((row) => hasText(row, ['animal', 'bovin', 'ovin', 'caprin'])).length, repeatClients: recurringClients, criticalStock: criticalStocks.filter((row) => lower(row.categorie || row.produit).includes('aliment')).length, lateTasks: lateTasks.length, activePeople, equipmentsOk, dataPoints: animaux.length + (animalRevenue > 0 ? 1 : 0) + (animalCost > 0 ? 1 : 0) + sante.length, expectedPoints: 8, details: [`Animaux suivis : ${fmtNumber(animaux.length)}`, `Santé à risque : ${fmtNumber(sickAnimals.length)}`, `Coûts santé : ${animalCost > 0 ? money(animalCost) : 'à compléter'}`], actions: [{ label: 'Voir animaux', module: 'animaux' }, { label: 'Voir santé', module: 'sante' }, { label: 'Voir ventes', module: 'ventes' }] }),
    scorePerspective({ id: 'stock_revente', title: 'Tester revente / distribution ?', module: 'stock', icon: Truck, revenue: stockSalesRevenue, expenses: 0, estimated: true, cycleDays: 20, lossRate: criticalStocks.length * 3, sales: salesOrders.filter((row) => hasText(row, ['stock', 'revente', 'produit'])).length, repeatClients: recurringClients, criticalStock: criticalStocks.length, lateTasks: lateTasks.length, activePeople, equipmentsOk, dataPoints: stocks.length + (stockSalesRevenue > 0 ? 1 : 0) + valuedStocks.length + reliableSuppliers, expectedPoints: 9, details: [`Stock valorisé : ${money(stockValue)}`, `Produits critiques : ${fmtNumber(criticalStocks.length)}`, `Fournisseurs fiables : ${fmtNumber(reliableSuppliers)}`], actions: [{ label: 'Voir stock', module: 'stock' }, { label: 'Voir fournisseurs', module: 'fournisseurs' }, { label: 'Voir ventes', module: 'ventes' }] }),
  ].filter((item) => item.dataPoints > 0 || item.revenue > 0 || item.expenses > 0);

  const bankability = clamp(proofScore * 0.35 + (documents.length ? 20 : 0) + (stockValue > 0 ? 20 : 0) + (revenue > 0 ? 25 : 0));
  const reinvestment = clamp((margin > 0 ? 45 : 20) + Math.min(35, Math.max(0, margin) / 20000) - Math.min(25, receivables / 50000));
  const scalability = clamp((events.length + taches.length + documents.length > 0 ? 45 : 20) + Math.min(30, (events.length + taches.length + alertes.length) * 2) + Math.min(25, perspectives.filter((p) => p.score >= 65).length * 8));
  const verticalization = clamp((productionLogs.length ? 18 : 0) + (cultures.length ? 18 : 0) + (documents.length ? 18 : 0) + (revenue > 0 ? 23 : 0) + (stockValue > 0 ? 23 : 0));

  return {
    decisions: [
      { title: 'Cash à protéger', value: money(receivables), detail: 'créances et encaissements à sécuriser', module: 'clients', icon: DollarSign, tone: receivables ? 'amber' : 'good' },
      { title: 'Stock à arbitrer', value: fmtNumber(criticalStocks.length), detail: 'acheter, transférer ou réduire le risque', module: 'stock', icon: Package, tone: criticalStocks.length ? 'danger' : 'good' },
      { title: 'Production à protéger', value: fmtNumber(sickAnimals.length + lateHealth.length), detail: 'santé, soins et productivité', module: 'sante', icon: HeartPulse, tone: sickAnimals.length + lateHealth.length ? 'danger' : 'good' },
      { title: 'Activités à comparer', value: fmtNumber(perspectives.length), detail: 'reprendre, renforcer, tester ou reporter', module: 'impact_business', icon: Target, tone: 'good' },
    ],
    links: [
      { title: 'Vente validée', value: `${salesOrders.length} commande(s)`, detail: 'client, paiement, finance, stock, facture et livraison peuvent être liés', module: 'ventes', icon: Receipt, tone: 'good' },
      { title: 'Soin enregistré', value: `${sante.length} soin(s)`, detail: 'santé, stock utilisé, coût, prochain suivi et preuve', module: 'sante', icon: HeartPulse, tone: 'good' },
      { title: 'Stock sous seuil', value: `${criticalStocks.length} produit(s)`, detail: 'alerte, tâche et suivi fournisseur peuvent partir du même signal', module: 'stock', icon: Package, tone: criticalStocks.length ? 'danger' : 'amber' },
      { title: 'Culture ou lot prêt', value: `${perspectives.length} axe(s)`, detail: 'opportunité de vente, score et décision de reprise', module: 'cultures', icon: Sprout, tone: 'good' },
      { title: 'Preuves disponibles', value: `${documents.length} document(s)`, detail: 'factures, ordonnances, reçus et justificatifs centralisés', module: 'documents', icon: FileCheck2, tone: documents.length ? 'good' : 'amber' },
      { title: 'Historique métier', value: `${events.length} trace(s)`, detail: 'événements importants consultables sans ressaisie', module: 'tracabilite', icon: GitBranch, tone: events.length ? 'good' : 'amber' },
    ],
    gains: [
      { title: 'Argent rendu visible', value: money(revenue), detail: 'encaissements et revenus suivis', module: 'finances', icon: DollarSign, tone: revenue > 0 ? 'good' : 'amber' },
      { title: 'Résultat suivi', value: money(margin), detail: 'revenus moins charges enregistrées', module: 'finances', icon: TrendingUp, tone: margin >= 0 ? 'good' : 'danger' },
      { title: 'Stock valorisé', value: money(stockValue), detail: `${fmtNumber(valuedStocks.length)} produit(s) avec prix renseigné`, module: 'stock', icon: Package, tone: stockValue > 0 ? 'good' : 'amber' },
      { title: 'Saisies évitées', value: fmtNumber(avoidedEntries), detail: 'données reprises entre modules', module: 'audit_logs', icon: CheckCircle2, tone: 'good' },
      { title: 'Pertes évitables signalées', value: fmtNumber(criticalStocks.length + sickAnimals.length + openCriticalAlerts.length), detail: 'ruptures, santé et alertes critiques', module: 'alertes', icon: AlertTriangle, tone: openCriticalAlerts.length ? 'danger' : 'amber' },
      { title: 'Dossier financeur', value: `${bankability}/100`, detail: 'stock, documents, revenus et historique mieux présentables', module: 'rapports', icon: Building2, tone: bankability >= 60 ? 'good' : 'amber' },
    ],
    perspectives,
    growth: [
      { title: 'Bancabilité', score: bankability, detail: scoreExplanation(bankability, 'Stock, documents et revenus donnent une base présentable.', 'Il faut plus de documents, ventes et valeurs stock pour convaincre.'), icon: Building2, actions: [{ label: 'Voir rapports', module: 'rapports' }, { label: 'Voir documents', module: 'documents' }] },
      { title: 'Réinvestissement', score: reinvestment, detail: scoreExplanation(reinvestment, 'La marge et les encaissements peuvent soutenir la suite.', 'Les créances ou charges réduisent la capacité à réinvestir.'), icon: ShieldCheck, actions: [{ label: 'Voir finances', module: 'finances' }, { label: 'Voir ventes', module: 'ventes' }] },
      { title: 'Scalabilité', score: scalability, detail: scoreExplanation(scalability, 'Les tâches, alertes et traces aident à gérer plus grand.', 'Il faut plus de routines, suivi et preuves d’exécution.'), icon: Layers, actions: [{ label: 'Voir tâches', module: 'taches' }, { label: 'Voir alertes', module: 'alertes' }] },
      { title: 'Montée en valeur', score: verticalization, detail: scoreExplanation(verticalization, 'Production, stock et documents préparent transformation ou vente directe.', 'Il manque encore des preuves de production, stock ou ventes régulières.'), icon: Factory, actions: [{ label: 'Voir traçabilité', module: 'tracabilite' }, { label: 'Voir stock', module: 'stock' }] },
    ],
  };
}

function TabButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold border ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>
      {children}
    </button>
  );
}

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#8a7456] mb-1"><span>{label}</span><b>{value}/100</b></div>
      <div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full bg-[#2f2415]" style={{ width: `${clamp(value)}%` }} /></div>
    </div>
  );
}

function ActionButton({ label, module, onNavigate }) {
  return (
    <button type="button" onClick={() => navigateTo(module, onNavigate)} className="rounded-lg border border-[#d6c3a0] px-3 py-1.5 text-xs font-bold text-[#2f2415] hover:border-[#b6975f]">
      {label} <ArrowRight size={12} className="inline" />
    </button>
  );
}

function Card({ title, value, detail, module, icon: Icon, tone, onNavigate }) {
  const toneClass = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return (
    <button type="button" onClick={() => navigateTo(module, onNavigate)} className={`rounded-2xl border p-4 text-left ${toneClass}`}>
      <Icon size={18} />
      <p className="text-2xl font-black mt-2">{value}</p>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-xs mt-1">{detail}</p>
    </button>
  );
}

function Panel({ eyebrow, title, children }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      {eyebrow ? <p className="text-xs uppercase tracking-widest text-[#8a7456]">{eyebrow}</p> : null}
      <h3 className="font-black text-[#2f2415]">{title}</h3>
      {children}
    </div>
  );
}

function Mini({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-4">
      <Icon size={16} className="text-[#9a6b12]" />
      <p className="font-bold text-[#2f2415] mt-2">{title}</p>
      <p className="text-xs text-[#8a7456] mt-1">{text}</p>
    </div>
  );
}

function PerspectiveCard({ item, onNavigate }) {
  const Icon = item.icon;
  const marginClass = item.marginInfo.tone === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : item.marginInfo.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={19} /></div>
          <div><h3 className="font-black text-[#2f2415]">{item.title}</h3><p className="text-sm text-[#8a7456]">{item.recommendation.label}</p></div>
        </div>
        <div className="text-right"><p className="text-xs text-[#8a7456]">Score</p><p className="text-3xl font-black text-[#2f2415]">{item.score}</p></div>
      </div>
      <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Décision :</b> {item.recommendation.reason}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <Metric title="CA lié" value={item.revenue > 0 ? money(item.revenue) : 'À lier'} />
        <Metric title="Coûts liés" value={item.expenses > 0 ? money(item.expenses) : 'À compléter'} />
        <div className={`rounded-xl border p-3 ${marginClass}`}><span className="text-xs">Lecture marge</span><b className="block">{item.marginInfo.display}</b><span className="text-xs">{item.marginInfo.label}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ScoreBar label="Rentabilité" value={item.scores.rentabilite} />
        <ScoreBar label="Cash" value={item.scores.cash} />
        <ScoreBar label="Rotation" value={item.scores.rotation} />
        <ScoreBar label="Risque maîtrisé" value={item.scores.risque} />
        <ScoreBar label="Demande" value={item.scores.demande} />
        <ScoreBar label="Capacité" value={item.scores.capacite} />
        <ScoreBar label="Fiabilité données" value={item.scores.data} />
      </div>
      <div className="space-y-1">{item.details.map((detail) => <p key={detail} className="text-xs text-[#8a7456]">• {detail}</p>)}</div>
      <div className="flex flex-wrap gap-2">{item.actions.map((action) => <ActionButton key={action.label} {...action} onNavigate={onNavigate} />)}</div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3">
      <span className="text-xs text-[#8a7456]">{title}</span>
      <b className="block text-[#2f2415]">{value}</b>
    </div>
  );
}

function GrowthCard({ title, score, detail, icon: Icon, actions = [], onNavigate }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-3">
      <div className="flex justify-between gap-3"><div><Icon size={18} className="text-[#9a6b12]" /><h3 className="font-black text-[#2f2415] mt-2">{title}</h3></div><p className="text-3xl font-black text-[#2f2415]">{score}</p></div>
      <ScoreBar label="Niveau" value={score} />
      <p className="text-sm text-[#7d6a4a]">{detail}</p>
      <div className="flex flex-wrap gap-2">{actions.map((action) => <ActionButton key={action.label} {...action} onNavigate={onNavigate} />)}</div>
    </div>
  );
}

export default function ImpactBusinessStrategicV5(props) {
  const [tab, setTab] = useState('decisions');
  const impact = useMemo(() => computeImpact(props), [props]);
  return (
    <div className="space-y-6">
      <SectionHeader title="Impact & Valeur ERP" sub="Décider, comprendre les liens entre modules et mesurer ce que l’ERP rapporte." />
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'decisions'} onClick={() => setTab('decisions')}>Centre de décisions</TabButton>
        <TabButton active={tab === 'perspectives'} onClick={() => setTab('perspectives')}>Perspectives & arbitrages</TabButton>
        <TabButton active={tab === 'croissance'} onClick={() => setTab('croissance')}>Valeur & croissance</TabButton>
      </div>

      {tab === 'decisions' ? (
        <div className="space-y-5">
          <Panel eyebrow="Priorités globales" title="À décider maintenant"><div className="grid grid-cols-1 md:grid-cols-4 gap-3">{impact.decisions.map((item) => <Card key={item.title} {...item} onNavigate={props.onNavigate} />)}</div></Panel>
          <Panel eyebrow="Modules interconnectés" title="Comment une saisie alimente plusieurs décisions"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{impact.links.map((item) => <Card key={item.title} {...item} onNavigate={props.onNavigate} />)}</div></Panel>
          <Panel eyebrow="Gains obtenus" title="Ce que les décisions et les liens ont déjà rendu visible"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{impact.gains.map((item) => <Card key={item.title} {...item} onNavigate={props.onNavigate} />)}</div></Panel>
        </div>
      ) : null}

      {tab === 'perspectives' ? (
        <div className="space-y-4">
          <Panel title="Lecture simple"><p className="text-sm text-[#7d6a4a]">Une marge n’est fiable que si le chiffre d’affaires et les coûts sont tous les deux liés. Sinon le module indique ce qui manque avant de recommander une extension.</p></Panel>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{impact.perspectives.map((item) => <PerspectiveCard key={item.id} item={item} onNavigate={props.onNavigate} />)}</div>
          {!impact.perspectives.length ? <div className="rounded-2xl border border-[#d6c3a0] bg-white p-8 text-center text-[#8a7456]">Pas encore assez de données d’activité pour proposer un arbitrage.</div> : null}
        </div>
      ) : null}

      {tab === 'croissance' ? (
        <div className="space-y-4">
          <Panel title="Lecture simple"><p className="text-sm text-[#7d6a4a]">Chaque score explique ce qui aide la croissance et ce qui reste à renforcer : preuves, documents, ventes, stock valorisé, marge, tâches et historique.</p></Panel>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{impact.growth.map((item) => <GrowthCard key={item.title} {...item} onNavigate={props.onNavigate} />)}</div>
          <Panel title="Boucle de croissance"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Mini icon={CheckCircle2} title="Optimiser l’existant" text="Stocks, coûts, pertes, relances et santé protègent le cash." /><Mini icon={FileCheck2} title="Prouver la performance" text="Rapports, documents, ventes et historique rendent le projet présentable." /><Mini icon={Target} title="Grandir sans perdre le contrôle" text="Les mêmes règles peuvent être répétées sur plus de lots, cultures, sites ou canaux." /></div></Panel>
        </div>
      ) : null}
    </div>
  );
}
