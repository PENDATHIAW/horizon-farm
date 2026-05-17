import { CheckCircle2, Clock, FileText, GitBranch, KeyRound, Play, ShieldAlert, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import useCrudModule from '../hooks/useCrudModule';
import { auditManifest, auditModuleNames, auditRequiredDataKeys } from '../audit/auditManifest';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';

const MODULES = auditModuleNames;
const arr = (v) => Array.isArray(v) ? v : [];
const n = (v) => Number(v || 0);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const money = (v) => fmtCurrency(Math.round(n(v)));
const amount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.revenu_reel ?? row.revenu_estime);
const statusOf = (row = {}) => norm(row.status || row.statut || row.etat || '');
const titleOf = (row = {}, fallback = 'Élément') => row.nom || row.name || row.libelle || row.title || row.titre || row.id || fallback;
const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const isDoneStatus = (row = {}) => /vendu|vendue|livre|livré|termine|terminé|clos|cloture|clôture|paye|payé/.test(statusOf(row));
const isActiveStatus = (row = {}) => !/vendu|vendue|mort|perdu|cloture|clôture|annule|annulé/.test(statusOf(row));
const isAnimalSale = (row = {}) => /animal|bovin|ovin|caprin|bov|cap|ovin/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''} ${row.source_id || ''}`));
const isAvicoleSale = (row = {}) => /avicole|poulet|chair|oeuf|œuf|pondeuse|lot/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''}`));
const isCultureSale = (row = {}) => /culture|recolte|récolte|tomate|piment|laitue|oignon/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''}`));
const costAnimal = (a = {}) => n(a.purchase_cost || a.prix_achat || a.cout_achat) + n(a.alimentation || a.cout_alimentation) + n(a.sante || a.cout_sante) + n(a.autres_frais || a.frais_directs);
const costLot = (l = {}) => n(l.cout_poussins || l.purchase_cost) + n(l.cout_aliment || l.alimentation) + n(l.frais_sante || l.cout_sante) + n(l.autres_frais || l.frais_directs);
const costCulture = (c = {}) => n(c.cout_semences) + n(c.cout_engrais) + n(c.cout_eau || c.cout_irrigation) + n(c.cout_main_oeuvre || c.cout_mo) + n(c.cout_traitement || c.cout_traitements) + n(c.autres_frais || c.frais_directs);
const dateOf = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
const daysSince = (v) => { const d = dateOf(v); return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : null; };
const hasAny = (row = {}, fields = []) => fields.some((f) => hasValue(row[f]) || n(row[f]) > 0);

const packageIdForLot = (lot = '') => {
  if (lot.startsWith('Lot 4')) return 'lot4_automatisations_terrain_v1';
  if (lot.startsWith('Lot 1')) return 'lot1_bloquants_revenus_v1';
  return '';
};

async function postAgent(payload) {
  const response = await fetch('/api/erp-agent/apply-correction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Erreur agent ${response.status}`);
  return data;
}

function alertableRisks(data) {
  const risks = [];
  arr(data.stock).forEach((s) => { if (n(s.quantite) <= n(s.seuil) && n(s.seuil) > 0) risks.push({ module: 'Stock', title: `Stock critique · ${titleOf(s, 'stock')}`, message: `Quantité ${n(s.quantite)} inférieure ou égale au seuil ${n(s.seuil)}.`, severity: 'critique', source_id: s.id }); });
  arr(data.sante).forEach((s) => { if (/retard|urgent|urgence|critique/.test(statusOf(s)) || norm(s.urgence || s.niveau_risque).includes('haut')) risks.push({ module: 'Santé', title: `Santé à traiter · ${titleOf(s, 'intervention')}`, message: s.notes || s.observation || 'Intervention santé signalée comme urgente ou en retard.', severity: 'critique', source_id: s.id }); });
  arr(data.animaux).forEach((a) => { if (/malade|risque|a surveiller|surveiller/.test(norm(a.health_status || a.sante || a.statut_sante))) risks.push({ module: 'Animaux', title: `Animal à surveiller · ${titleOf(a, 'animal')}`, message: 'Statut santé animal nécessitant une action terrain.', severity: 'haute', source_id: a.id }); });
  arr(data.animaux).forEach((a) => { const delay = daysSince(a.date_derniere_pesee || a.last_weight_date || a.derniere_pesee); if (isActiveStatus(a) && delay !== null && delay > 16) risks.push({ module: 'Animaux', title: `Pesée en retard · ${titleOf(a, 'animal')}`, message: `Dernière pesée il y a ${delay} jour(s), fréquence attendue 15 jours.`, severity: 'moyenne', source_id: a.id }); });
  arr(data.avicole).forEach((l) => { if (n(l.mortality || l.mortalite) > n(l.initial_count || l.effectif_initial || 0) * 0.04 || n(l.scoresSante || l.score_sante || 100) < 88) risks.push({ module: 'Avicole', title: `Lot avicole à risque · ${titleOf(l, 'lot')}`, message: 'Mortalité ou score santé du lot à surveiller.', severity: 'haute', source_id: l.id }); });
  arr(data.cultures).forEach((c) => { if (n(c.score_sante || 100) < 80 || /perdu|risque|maladie/.test(statusOf(c))) risks.push({ module: 'Cultures', title: `Culture à risque · ${titleOf(c, 'culture')}`, message: 'Score santé ou statut culture à surveiller.', severity: 'haute', source_id: c.id }); });
  arr(data.finances).forEach((f) => { if (/impaye|impayé|partiel|retard/.test(statusOf(f))) risks.push({ module: 'Finances', title: `Flux financier à suivre · ${titleOf(f, 'transaction')}`, message: 'Paiement ou transaction en retard, partiel ou impayé.', severity: 'moyenne', source_id: f.id }); });
  arr(data.taches).forEach((t) => { if (/retard|critique/.test(statusOf(t) || norm(t.priority || t.priorite))) risks.push({ module: 'Tâches', title: `Tâche critique · ${titleOf(t, 'tâche')}`, message: 'Tâche en retard ou critique.', severity: 'moyenne', source_id: t.id }); });
  return risks;
}

async function createAutomaticAlertsIfNeeded(data, createAlert, refreshAlertes) {
  const risks = alertableRisks(data);
  if (!risks.length || arr(data.alertes_center).length || !createAlert) return 0;
  const selected = risks.slice(0, 8);
  for (const risk of selected) {
    await createAlert({ id: makeId('ALERT-AUTO'), titre: risk.title, title: risk.title, message: risk.message, module: risk.module, module_lie: risk.module, source_id: risk.source_id, severity: risk.severity, priorite: risk.severity, status: 'nouvelle', statut: 'nouvelle', type: 'alerte_automatique_audit', action_recommandee: 'Vérifier le module concerné et créer une tâche terrain si nécessaire.', created_at: new Date().toISOString() });
  }
  await refreshAlertes?.();
  return selected.length;
}

function detectIssues(data) {
  const issues = [];
  const add = (lot, module, title, detail, priority = 'haute') => issues.push({ lot, module, title, detail, priority });
  const animalSales = arr(data.sales_orders).filter(isAnimalSale).reduce((s, row) => s + amount(row), 0);
  const avicoleSales = arr(data.sales_orders).filter(isAvicoleSale).reduce((s, row) => s + amount(row), 0);
  const cultureSales = arr(data.sales_orders).filter(isCultureSale).reduce((s, row) => s + amount(row), 0);
  const totalSales = arr(data.sales_orders).reduce((s, row) => s + amount(row), 0);
  const totalPayments = arr(data.payments).reduce((s, row) => s + amount(row), 0);
  const totalFinanceRevenue = arr(data.finances).filter((f) => /recette|vente|encaissement|revenu|produit/.test(norm(`${f.type || ''} ${f.categorie || ''} ${f.category || ''}`))).reduce((s, row) => s + amount(row), 0);
  const animalMissingCosts = arr(data.animaux).filter((a) => costAnimal(a) <= 0).length;
  const lotMissingCosts = arr(data.avicole).filter((l) => costLot(l) <= 0).length;
  const cultureMissingCosts = arr(data.cultures).filter((c) => costCulture(c) <= 0).length;
  const paymentsWithoutFinance = arr(data.payments).filter((p) => !arr(data.finances).some((f) => String(f.payment_id || f.related_id || f.order_id || '') === String(p.id || p.order_id || p.sale_id || ''))).length;
  const invoicesWithoutDocs = arr(data.invoices).filter((inv) => !arr(data.documents).some((d) => String(d.invoice_id || d.related_id || d.entity_id || '') === String(inv.id || inv.order_id || ''))).length;
  const risks = alertableRisks(data);

  if (arr(data.sales_orders).some(isAnimalSale) && animalSales <= 0) add('Lot 1 · Bloquants revenus', 'Animaux', 'CA animaux non reconnu', 'Des ventes animaux existent mais le CA n’est pas attribué correctement.');
  if (arr(data.sales_orders).some(isAvicoleSale) && avicoleSales <= 0) add('Lot 1 · Bloquants revenus', 'Avicole', 'CA avicole non reconnu', 'Des ventes avicoles existent mais le CA n’est pas attribué correctement.');
  if (arr(data.sales_orders).some(isCultureSale) && cultureSales <= 0) add('Lot 1 · Bloquants revenus', 'Cultures', 'CA cultures non reconnu', 'Des ventes cultures existent mais le CA n’est pas attribué correctement.');
  if (paymentsWithoutFinance) add('Lot 1 · Bloquants revenus', 'Ventes', 'Paiements sans finance', `${paymentsWithoutFinance} paiement(s) ne créent pas de transaction finance.`);
  if (invoicesWithoutDocs) add('Lot 1 · Bloquants revenus', 'Documents', 'Factures sans document', `${invoicesWithoutDocs} facture(s) sans document associé.`);
  if (totalSales > 0 && totalFinanceRevenue <= 0) add('Lot 1 · Bloquants revenus', 'Finances', 'CA ventes absent des finances', `${money(totalSales)} de ventes mais aucune recette exploitable en finances.`);
  if (totalPayments > 0 && totalFinanceRevenue <= 0) add('Lot 1 · Bloquants revenus', 'Comptabilité', 'Encaissements non rapprochés', `${money(totalPayments)} de paiements mais aucun rapprochement financier clair.`);

  if (animalMissingCosts) add('Lot 2 · Coûts et marges métier', 'Animaux', 'Coûts animaux incomplets', `${animalMissingCosts} animal(aux) sans coût total exploitable.`);
  if (lotMissingCosts) add('Lot 2 · Coûts et marges métier', 'Avicole', 'Coûts lots incomplets', `${lotMissingCosts} lot(s) sans coût poussin/aliment/santé complet.`);
  if (cultureMissingCosts) add('Lot 2 · Coûts et marges métier', 'Cultures', 'Coûts cultures incomplets', `${cultureMissingCosts} culture(s) sans semences/engrais/eau/main-d’œuvre/traitements.`);
  const missingStockValue = arr(data.stock).filter((s) => n(s.valeur || s.valeur_stock || s.value) <= 0 && n(s.quantite) > 0).length;
  if (missingStockValue) add('Lot 2 · Coûts et marges métier', 'Stock', 'Valeur stock incomplète', `${missingStockValue} ligne(s) avec quantité mais sans valeur exploitable.`);
  const missingSupplierCostLink = arr(data.fournisseurs).filter((f) => n(f.dette || f.solde || f.montant_du) > 0 && !arr(data.finances).some((x) => String(x.fournisseur_id || x.supplier_id || '') === String(f.id || ''))).length;
  if (missingSupplierCostLink) add('Lot 2 · Coûts et marges métier', 'Fournisseurs', 'Dettes fournisseurs non liées', `${missingSupplierCostLink} fournisseur(s) avec dette sans charge finance liée.`);

  const healthFormIssues = arr(data.sante).filter((s) => !s.type_intervention && !s.intervention_type && !s.type).length;
  const healthUrlProofs = arr(data.sante).filter((s) => /^https?:/.test(String(s.preuve || s.ordonnance || s.ordonnance_url || ''))).length;
  const healthImpactFree = arr(data.sante).filter((s) => hasValue(s.impact_business || s.impact_ferme) && !hasAny(s, ['impact_type', 'impact_niveau', 'impact_montant', 'impact_category'])).length;
  const healthUrgencyMissing = arr(data.sante).filter((s) => !hasValue(s.niveau_risque || s.urgence || s.risk_level)).length;
  if (healthFormIssues) add('Lot 3 · Formulaires et UX', 'Santé', 'Formulaire santé non adaptatif', `${healthFormIssues} intervention(s) sans type clair.`);
  if (healthUrlProofs) add('Lot 3 · Formulaires et UX', 'Santé', 'Preuves encore en URL', `${healthUrlProofs} preuve(s)/ordonnance(s) en URL au lieu d’upload.`);
  if (healthImpactFree) add('Lot 3 · Formulaires et UX', 'Impact Business', 'Impact ferme non structuré', `${healthImpactFree} impact(s) renseignés comme texte libre sans niveau/type/montant.`);
  if (healthUrgencyMissing) add('Lot 3 · Formulaires et UX', 'Santé', 'Niveau urgence non cadré', `${healthUrgencyMissing} intervention(s) sans niveau de risque prédéfini.`);
  const bpLinesWithDashes = arr(data.bp_investment_lines).filter((l) => !hasValue(l.libelle || l.nom || l.name) || !hasValue(l.categorie || l.category)).length;
  if (bpLinesWithDashes) add('Lot 3 · Formulaires et UX', 'Investissements', 'Lignes BP illisibles', `${bpLinesWithDashes} ligne(s) BP sans libellé/catégorie lisible.`);

  if (!arr(data.taches).length && risks.length) add('Lot 4 · Automatisations terrain', 'Tâches', 'Tâches automatiques insuffisantes', `${risks.length} risque(s) détecté(s), mais aucune tâche terrain générée.`, 'moyenne');
  if (!arr(data.alertes_center).length && risks.length) add('Lot 4 · Automatisations terrain', 'Alertes', 'Alertes automatiques insuffisantes', `${risks.length} risque(s) détecté(s), mais aucune alerte générée.`, 'moyenne');
  const overdueWeighs = arr(data.animaux).filter((a) => { const delay = daysSince(a.date_derniere_pesee || a.last_weight_date || a.derniere_pesee); return isActiveStatus(a) && delay !== null && delay > 16; }).length;
  if (overdueWeighs && !arr(data.taches).some((t) => /pesee|pesée|poids/.test(norm(`${t.titre || t.title || ''} ${t.description || ''}`)))) add('Lot 4 · Automatisations terrain', 'Animaux', 'Pesées 15 jours sans tâche', `${overdueWeighs} animal(aux) avec pesée en retard sans tâche automatique.`);
  const openOpportunitiesWithOrders = arr(data.sales_opportunities).filter((o) => !isDoneStatus(o) && arr(data.sales_orders).some((cmd) => String(cmd.opportunity_id || cmd.opportunite_id || cmd.source_id || '') === String(o.id || ''))).length;
  if (openOpportunitiesWithOrders) add('Lot 4 · Automatisations terrain', 'Ventes', 'Opportunités non clôturées', `${openOpportunitiesWithOrders} opportunité(s) restent ouvertes alors qu’une commande existe.`);

  if (arr(data.business_plans).length && !arr(data.bp_revenue_projections).length) add('Lot 5 · Investissements et financeur', 'Investissements', 'BP sans CA prévisionnel', 'Le business plan ne contient pas de projection de CA exploitable.', 'moyenne');
  if (arr(data.business_plans).length && !arr(data.bp_recurring_costs).length) add('Lot 5 · Investissements et financeur', 'Investissements', 'BP sans charges récurrentes', 'Le business plan ne contient pas assez de charges récurrentes pour simuler ROI/marge.');
  if (arr(data.business_plans).length && !arr(data.bp_funding_sources).length) add('Lot 5 · Investissements et financeur', 'Investissements', 'BP sans sources de financement', 'Le financeur ne voit pas clairement fonds propres, dette ou besoin à financer.');

  const animalsMissingFicha = arr(data.animaux).filter((a) => !hasAny(a, ['poids_actuel', 'current_weight', 'poids_cible', 'target_weight', 'objectif_poids']) || !hasValue(a.date_derniere_pesee || a.last_weight_date || a.derniere_pesee)).length;
  if (animalsMissingFicha) add('Lot 6 · Fiches métier et suivi', 'Animaux', 'Fiche animal incomplète', `${animalsMissingFicha} animal(aux) sans poids cible/actuel ou date de dernière pesée exploitable.`);
  const soldAnimalsNoSaleLink = arr(data.animaux).filter((a) => /vendu|vendue/.test(statusOf(a)) && !hasAny(a, ['sale_order_id', 'commande_id', 'vente_id'])).length;
  if (soldAnimalsNoSaleLink) add('Lot 6 · Fiches métier et suivi', 'Animaux', 'Animal vendu sans commande liée', `${soldAnimalsNoSaleLink} animal(aux) vendus sans lien commande/vente visible.`);
  const avicoleMissingFicha = arr(data.avicole).filter((l) => !hasValue(l.type || l.type_lot || l.production_type) || !hasAny(l, ['effectif', 'initial_count', 'effectif_initial', 'age_jours', 'date_demarrage'])).length;
  if (avicoleMissingFicha) add('Lot 6 · Fiches métier et suivi', 'Avicole', 'Fiche lot avicole incomplète', `${avicoleMissingFicha} lot(s) sans type/effectif/âge ou date de démarrage clair.`);
  const culturesMissingFicha = arr(data.cultures).filter((c) => !hasValue(c.parcelle || c.zone || c.surface) || !hasValue(c.stade || c.status || c.statut)).length;
  if (culturesMissingFicha) add('Lot 6 · Fiches métier et suivi', 'Cultures', 'Fiche culture incomplète', `${culturesMissingFicha} culture(s) sans parcelle/surface ou stade lisible.`);

  const objectiveZeros = arr(data.objectifs).filter((o) => n(o.realise || o.realisé || o.montant_realise || o.ca_realise) <= 0 && n(o.objectif || o.target || o.montant_objectif) > 0).length;
  if (objectiveZeros && (animalSales + avicoleSales + cultureSales) > 0) add('Lot 7 · Objectifs et décisionnel', 'Objectifs', 'Réalisé à zéro malgré ventes', `${objectiveZeros} objectif(s) ont un objectif positif mais un réalisé à zéro alors que des ventes existent.`);
  const duplicatedDecisionActions = arr(data.business_events).filter((e, idx, list) => list.findIndex((x) => norm(`${x.type || ''}-${x.module || ''}-${x.source_id || ''}-${x.action || ''}`) === norm(`${e.type || ''}-${e.module || ''}-${e.source_id || ''}-${e.action || ''}`)) !== idx).length;
  if (duplicatedDecisionActions) add('Lot 7 · Objectifs et décisionnel', 'Centre décisionnel', 'Actions décisionnelles doublonnées', `${duplicatedDecisionActions} événement(s)/action(s) semblent redondants.`);
  const dashboardMismatch = totalSales > 0 && (animalSales + avicoleSales + cultureSales) <= 0;
  if (dashboardMismatch) add('Lot 7 · Objectifs et décisionnel', 'Accueil', 'CA global non ventilé', 'Le CA existe globalement mais n’est pas ventilé correctement par activité.');

  const missingTrace = arr(data.sales_orders).filter((cmd) => !arr(data.tracabilite).some((t) => String(t.related_id || t.entity_id || t.commande_id || '') === String(cmd.id || ''))).length;
  if (missingTrace) add('Lot 8 · Traçabilité et documents', 'Traçabilité', 'Commandes sans trace', `${missingTrace} commande(s) sans événement de traçabilité visible.`);
  const healthDocsMissing = arr(data.sante).filter((s) => hasValue(s.preuve || s.ordonnance || s.document_id) && !arr(data.documents).some((d) => String(d.related_id || d.entity_id || d.sante_id || '') === String(s.id || s.document_id || ''))).length;
  if (healthDocsMissing) add('Lot 8 · Traçabilité et documents', 'Documents', 'Preuves santé non centralisées', `${healthDocsMissing} preuve(s) santé ne sont pas retrouvables dans Documents.`);

  return { issues, animalSales, avicoleSales, cultureSales };
}

function buildReportText(snapshot, progressSeconds) {
  const byLot = snapshot.issues.reduce((acc, item) => ({ ...acc, [item.lot]: [...(acc[item.lot] || []), item] }), {});
  const manifestSummary = auditManifest.map((item) => `- ${item.module}: ${item.purpose}`).join('\n');
  return [`Audit ERP Horizon Farm`, `Date: ${new Date().toLocaleString()}`, `Durée simulée: ${progressSeconds}s`, `Score: ${snapshot.score}%`, `CA testé: ${money(snapshot.animalSales + snapshot.avicoleSales + snapshot.cultureSales)}`, '', '## Référentiel utilisé', manifestSummary, '', ...Object.entries(byLot).flatMap(([lot, items]) => [`## ${lot}`, ...items.map((i) => `- [${i.module}] ${i.title}: ${i.detail}`), '']), snapshot.issues.length ? '' : 'Aucune anomalie prioritaire détectée automatiquement.', 'Plan recommandé: corriger lot par lot, relancer audit après chaque lot, puis demander un retest utilisateur.'].join('\n');
}
function buildCorrectionText(lot, items) {
  return [`Historique correction contrôlée`, `Lot: ${lot}`, `Date: ${new Date().toLocaleString()}`, '', 'Corrections à appliquer:', ...items.map((i) => `- [${i.module}] ${i.title}: ${i.detail}`), '', 'Règle:', '- Ne pas créer de documents/tâches inutiles', '- Corriger uniquement ce lot', '- Build Vercel', '- Ré-audit', '- Comparer avant/après'].join('\n');
}

function LotCard({ lot, items, onRequestCorrection, onDryRunAgent, onApplyAgent, busy, agentBusy, agentReady }) {
  const packageId = packageIdForLot(lot);
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{lot}</p><p className="text-xs text-[#8a7456] mt-1">{items.length} correction(s) proposées</p>{packageId ? <p className="mt-1 text-xs font-bold text-emerald-700">Paquet sécurisé disponible</p> : <p className="mt-1 text-xs font-bold text-[#8a7456]">Paquet sécurisé à préparer</p>}</div><span className="rounded-full bg-white border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#8a7456]">lot contrôlé</span></div><div className="mt-3 space-y-2">{items.map((item) => <div key={`${item.module}-${item.title}`} className="rounded-xl bg-white border border-[#eadcc2] p-3 text-sm"><p className="font-black text-[#2f2415]">{item.module} · {item.title}</p><p className="text-[#8a7456] mt-1">{item.detail}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Btn icon={Wrench} small onClick={() => onRequestCorrection(lot, items, false)} disabled={busy}>Marquer lot à corriger</Btn><Btn icon={KeyRound} variant="outline" small onClick={() => onDryRunAgent(lot)} disabled={agentBusy || !agentReady}>{agentReady ? 'Tester agent sur ce lot' : 'Code agent requis'}</Btn>{packageId ? <Btn icon={CheckCircle2} small onClick={() => onApplyAgent(lot, packageId)} disabled={agentBusy || !agentReady}>Appliquer paquet sécurisé</Btn> : null}<Btn icon={FileText} variant="outline" small onClick={() => onRequestCorrection(lot, items, true)} disabled={busy}>Enregistrer historique</Btn></div><p className="mt-2 text-xs text-[#8a7456]">Le test ne modifie rien. “Appliquer paquet sécurisé” commit uniquement un paquet reconnu par l’agent, puis demande un build Vercel si le hook est configuré.</p></div>;
}

export default function AuditRunAndCorrectionPanel() {
  const [running, setRunning] = useState(false);
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [approvalCode, setApprovalCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [lastInfo, setLastInfo] = useState('');
  const keys = Array.from(new Set([...auditRequiredDataKeys, 'sales_orders', 'payments', 'invoices', 'documents', 'sales_opportunities', 'business_plans', 'bp_revenue_projections', 'bp_recurring_costs', 'bp_funding_sources', 'bp_investment_lines', 'objectifs', 'tracabilite', 'fournisseurs', 'alertes_center', 'taches', 'rapports']));
  const crud = Object.fromEntries(keys.map((key) => [key, useCrudModule(key)]));
  const rapports = useCrudModule('rapports');
  const data = Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)]));
  const liveSnapshot = useMemo(() => { const detected = detectIssues(data); const score = Math.max(0, Math.round(((MODULES.length - Math.min(MODULES.length, detected.issues.length)) / MODULES.length) * 100)); return { ...detected, score }; }, [JSON.stringify(data)]);
  const lots = (lastSnapshot || liveSnapshot).issues.reduce((acc, item) => ({ ...acc, [item.lot]: [...(acc[item.lot] || []), item] }), {});
  const progress = running ? Math.round(((currentIndex + 1) / MODULES.length) * 100) : (lastSnapshot ? 100 : 0);
  const refreshAll = async () => Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()));
  const createAuditReport = async (snapshot, seconds) => { const id = makeId('RPT-AUDIT'); const title = `Audit ERP Horizon Farm - ${new Date().toLocaleDateString()}`; const content = buildReportText(snapshot, seconds); await rapports.create?.({ id, titre: title, title, type: 'audit_erp', statut: 'disponible', score: snapshot.score, contenu: content, resume: `${snapshot.issues.length} anomalie(s), score ${snapshot.score}%`, created_at: new Date().toISOString() }); await rapports.refresh?.(); };
  const requestCorrection = async (lot, items, saveHistory = false) => {
    try {
      setCorrectionBusy(true);
      if (saveHistory) {
        const id = makeId('FIX-LOT'); const title = `Historique correction - ${lot}`; const content = buildCorrectionText(lot, items);
        await rapports.create?.({ id, titre: title, title, type: 'historique_correction_audit', statut: 'a_corriger', contenu: content, resume: `${items.length} correction(s) dans ${lot}`, lot, created_at: new Date().toISOString() });
        await rapports.refresh?.();
        setLastInfo('Historique enregistré dans Rapports. Aucun Document/Tâche inutile créé.'); toast.success('Historique enregistré');
      } else { setLastInfo(`Lot sélectionné : ${lot}. Tu peux tester l’agent, puis appliquer un paquet sécurisé si disponible.`); toast.success('Lot marqué à corriger'); }
    } catch (error) { toast.error(error.message || 'Action impossible'); } finally { setCorrectionBusy(false); }
  };
  const dryRunAgent = async (lot) => {
    if (!approvalCode.trim()) return toast.error('Entre le code approbation agent');
    try {
      setAgentBusy(true);
      const packageId = packageIdForLot(lot);
      const data = await postAgent({ approvalCode, dryRun: true, lot, packageId, message: `ERP agent dry-run - ${lot}` });
      setLastInfo(data?.ok ? `Agent prêt pour ${lot}. Dry-run OK.${packageId ? ` Paquet disponible : ${packageId}.` : ' Paquet à préparer.'}` : 'Dry-run agent non validé.');
      toast.success('Dry-run agent OK');
    } catch (error) { setLastInfo(`Agent non prêt : ${error.message}`); toast.error(error.message || 'Dry-run agent impossible'); } finally { setAgentBusy(false); }
  };
  const applyAgent = async (lot, packageId) => {
    if (!approvalCode.trim()) return toast.error('Entre le code approbation agent');
    if (!packageId) return toast.error('Aucun paquet sécurisé disponible pour ce lot');
    try {
      setAgentBusy(true);
      setLastInfo(`Application sécurisée en cours pour ${lot}...`);
      const data = await postAgent({ approvalCode, dryRun: false, lot, packageId, message: `ERP agent apply - ${lot}` });
      const commitCount = Array.isArray(data?.files) ? data.files.length : 0;
      const deployMsg = data?.deploy ? `Demande de build envoyée à Vercel (HTTP ${data.deploy.status}). Vérifie dans Deployments.` : 'Aucun hook Vercel confirmé côté agent.';
      setLastInfo(`Paquet appliqué pour ${lot}. ${commitCount} fichier(s) envoyé(s) à GitHub. ${deployMsg} Après build vert, rafraîchis l’ERP et relance l’audit.`);
      toast.success('Paquet sécurisé appliqué');
    } catch (error) { setLastInfo(`Application impossible : ${error.message}`); toast.error(error.message || 'Application agent impossible'); } finally { setAgentBusy(false); }
  };
  const runFullAudit = async () => {
    if (running) return;
    setRunning(true); setElapsed(0); setCurrentIndex(0); setLastInfo('');
    await refreshAll();
    const createdAlerts = await createAutomaticAlertsIfNeeded(Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)])), crud.alertes_center?.create, crud.alertes_center?.refresh);
    if (createdAlerts) setLastInfo(`${createdAlerts} alerte(s) automatique(s) créée(s) avant le rapport.`);
    await refreshAll();
    const started = Date.now();
    for (let i = 0; i < MODULES.length; i += 1) { setCurrentIndex(i); setElapsed(Math.max(1, Math.round((Date.now() - started) / 1000))); await new Promise((resolve) => setTimeout(resolve, 120)); }
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    const detected = detectIssues(Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)])));
    const snapshot = { ...detected, score: Math.max(0, Math.round(((MODULES.length - Math.min(MODULES.length, detected.issues.length)) / MODULES.length) * 100)) };
    setLastSnapshot(snapshot); await createAuditReport(snapshot, seconds); setRunning(false); setElapsed(seconds); toast.success('Audit terminé : historique créé dans Rapports');
  };
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><GitBranch size={14} /> Agent audit & corrections par lots</p><h2 className="mt-3 text-2xl font-black text-[#2f2415]">Lancer un audit complet et préparer les corrections</h2><p className="mt-1 text-sm text-[#8a7456]">L’audit détecte les vrais risques métier. Les corrections sécurisées passent par ton code d’approbation.</p></div><Btn icon={Play} onClick={runFullAudit} disabled={running}>{running ? 'Audit en cours...' : 'Lancer audit complet'}</Btn></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><label className="block text-sm"><span className="font-bold text-[#2f2415]">Code approbation agent</span><input type="password" value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} placeholder="ERP_AGENT_APPROVAL_SECRET" className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2" /></label><p className="mt-2 text-xs text-[#8a7456]">Ce code sert seulement à autoriser l’agent sécurisé. Il n’est pas enregistré dans l’ERP.</p></div><div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Mini icon={Clock} label="Progression" value={`${progress}%`} /><Mini icon={FileText} label="Module testé" value={running ? MODULES[currentIndex] : (lastSnapshot ? 'Terminé' : 'En attente')} /><Mini icon={Clock} label="Temps" value={`${elapsed}s`} /><Mini icon={ShieldAlert} label="Corrections" value={(lastSnapshot || liveSnapshot).issues.length} danger={(lastSnapshot || liveSnapshot).issues.length > 0} /><Mini icon={CheckCircle2} label="Score" value={`${(lastSnapshot || liveSnapshot).score}%`} /></div><div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full rounded-full bg-[#2f2415] transition-all" style={{ width: `${progress}%` }} /></div>{lastInfo ? <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800"><b>Statut :</b> {lastInfo}</div> : null}<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Important :</b> “Tester agent” ne modifie rien. “Appliquer paquet sécurisé” commit uniquement un paquet reconnu par l’agent, puis demande un build Vercel. Après build vert, rafraîchis et relance l’audit.</div><div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{Object.keys(lots).length ? Object.entries(lots).map(([lot, items]) => <LotCard key={lot} lot={lot} items={items} onRequestCorrection={requestCorrection} onDryRunAgent={dryRunAgent} onApplyAgent={applyAgent} busy={correctionBusy} agentBusy={agentBusy} agentReady={Boolean(approvalCode.trim())} />) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 font-bold">Aucun lot prioritaire détecté pour l’instant.</div>}</div></section>;
}
function Mini({ icon: Icon, label, value, danger = false }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-lg font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
