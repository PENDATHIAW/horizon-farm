import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, RefreshCw, Route, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { auditManifest, auditRequiredDataKeys } from '../audit/auditManifest';
import Btn from '../components/Btn';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency } from '../utils/format';

const arr = (v) => Array.isArray(v) ? v : [];
const n = (v) => Number(v || 0);
const clean = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const money = (v) => fmtCurrency(Math.round(n(v)));
const monthOf = (row = {}) => String(row.date || row.date_commande || row.date_paiement || row.created_at || '').slice(0, 7);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const amount = (row = {}) => n(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.revenu_reel ?? row.revenu_estime);
const paid = (row = {}) => n(row.montant_paye ?? row.amount ?? row.montant ?? row.paid_amount);
const orderIdOf = (row = {}) => String(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id || '');
const sourceIdOf = (row = {}) => String(row.source_id || row.related_id || row.entity_id || '');
const isAnimalSale = (row = {}) => /animal|bovin|ovin|caprin|bov|ov-|cap/.test(clean(`${row.source_type || ''} ${row.product_name || ''} ${row.source_id || ''} ${row.libelle || ''}`));
const isAvicoleSale = (row = {}) => /avicole|poulet|chair|oeuf|pondeuse|lot/.test(clean(`${row.source_type || ''} ${row.product_name || ''} ${row.source_id || ''} ${row.libelle || ''}`));
const isCultureSale = (row = {}) => /culture|tomate|laitue|piment|recolte|récolte/.test(clean(`${row.source_type || ''} ${row.product_name || ''} ${row.source_id || ''} ${row.libelle || ''}`));
const isRevenue = (row = {}) => /entree|entrée|vente|encaissement|creance|créance/.test(clean(`${row.type || ''} ${row.categorie || ''} ${row.libelle || ''}`));
const isExpense = (row = {}) => /sortie|depense|dépense|charge|achat|aliment|sante|santé|salaire/.test(clean(`${row.type || ''} ${row.categorie || ''} ${row.libelle || ''}`));
const costAnimal = (a = {}) => n(a.purchase_cost || a.prix_achat || a.cout_achat) + n(a.alimentation || a.cout_alimentation) + n(a.sante || a.cout_sante) + n(a.autres_frais || a.frais_directs);
const costLot = (l = {}) => n(l.cout_poussins || l.purchase_cost) + n(l.cout_aliment || l.alimentation) + n(l.frais_sante || l.cout_sante) + n(l.autres_frais || l.frais_directs);
const costCulture = (c = {}) => n(c.cout_semences) + n(c.cout_engrais) + n(c.cout_eau || c.cout_irrigation) + n(c.cout_main_oeuvre || c.cout_mo) + n(c.cout_traitement || c.cout_traitements) + n(c.autres_frais || c.frais_directs);

function issue(module, severity, title, detail, action = '') {
  return { module, severity, title, detail, action, id: `${module}-${severity}-${title}`.replace(/\s+/g, '-') };
}
function severityRank(s) { return s === 'bloquant' ? 3 : s === 'a_corriger' ? 2 : s === 'a_surveiller' ? 1 : 0; }
function labelSeverity(s) { return s === 'bloquant' ? 'Bloquant' : s === 'a_corriger' ? 'À corriger' : s === 'a_surveiller' ? 'À surveiller' : 'OK'; }
function severityClass(s) { return s === 'bloquant' ? 'border-red-200 bg-red-50 text-red-700' : s === 'a_corriger' ? 'border-amber-200 bg-amber-50 text-amber-700' : s === 'a_surveiller' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'; }

function buildAudit(data) {
  const issues = [];
  const month = currentMonth();
  const salesMonth = arr(data.sales_orders).filter((o) => monthOf(o) === month);
  const financeRevenueMonth = arr(data.finances).filter((f) => monthOf(f) === month && isRevenue(f));
  const animalRevenue = [...salesMonth.filter(isAnimalSale), ...financeRevenueMonth.filter(isAnimalSale)].reduce((s, r) => s + amount(r), 0);
  const avicoleRevenue = [...salesMonth.filter(isAvicoleSale), ...financeRevenueMonth.filter(isAvicoleSale)].reduce((s, r) => s + amount(r), 0);
  const cultureRevenue = [...salesMonth.filter(isCultureSale), ...financeRevenueMonth.filter(isCultureSale)].reduce((s, r) => s + amount(r), 0);

  const animalCostsMissing = arr(data.animaux).filter((a) => costAnimal(a) <= 0).length;
  const lotsCostsMissing = arr(data.avicole).filter((l) => costLot(l) <= 0).length;
  const cultureCostsMissing = arr(data.cultures).filter((c) => costCulture(c) <= 0).length;
  const soldAnimals = arr(data.animaux).filter((a) => clean(a.status || a.statut) === 'vendu');
  const soldAnimalsNoSale = soldAnimals.filter((a) => !arr(data.sales_orders).some((o) => sourceIdOf(o) === String(a.id))).length;
  const animalWeighingGaps = arr(data.animaux).filter((a) => {
    const hist = Array.isArray(a.poids_history) ? a.poids_history : [];
    if (hist.length < 2) return clean(a.status || a.statut) !== 'vendu';
    const dates = hist.map((h) => new Date(h.date || h.date_pesee)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a - b);
    return dates.some((d, i) => i > 0 && Math.round((d - dates[i - 1]) / 86400000) > 20);
  }).length;

  if (!arr(data.animaux).length) issues.push(issue('Animaux', 'bloquant', 'Aucun animal chargé', 'Le module Animaux ne peut pas être testé.', 'Vérifier données simulées / réelles.'));
  if (animalRevenue <= 0 && arr(data.sales_orders).some(isAnimalSale)) issues.push(issue('Animaux', 'bloquant', 'CA animaux non reconnu', 'Des ventes animaux existent, mais le CA du mois n’est pas correctement attribué.', 'Corriger mapping sales_orders / finances / Objectifs.'));
  if (animalCostsMissing) issues.push(issue('Animaux', 'a_corriger', 'Coûts animaux incomplets', `${animalCostsMissing} animal(aux) sans coût total exploitable.`, 'Afficher et renseigner achat + alimentation + santé + frais directs.'));
  if (soldAnimalsNoSale) issues.push(issue('Animaux', 'a_corriger', 'Animaux vendus sans commande liée', `${soldAnimalsNoSale} animal(aux) vendu(s) sans commande détectée.`, 'Relier animal vendu → vente → paiement → comptabilité.'));
  if (animalWeighingGaps) issues.push(issue('Animaux', 'a_corriger', 'Pesées non rigoureuses', `${animalWeighingGaps} animal(aux) ont un suivi poids absent ou supérieur à 15/20 jours.`, 'Créer pesée tous les 15 jours + tâche avant échéance.'));

  if (!arr(data.avicole).length) issues.push(issue('Avicole', 'bloquant', 'Aucun lot avicole chargé', 'Impossible de tester lots, chair, ponte et ventes.', 'Vérifier seed / chargement.'));
  if (avicoleRevenue <= 0 && arr(data.sales_orders).some(isAvicoleSale)) issues.push(issue('Avicole', 'bloquant', 'CA avicole non reconnu', 'Des ventes avicoles existent, mais le réalisé peut rester à zéro.', 'Corriger attribution ventes œufs / chair.'));
  if (lotsCostsMissing) issues.push(issue('Avicole', 'a_corriger', 'Coûts lots incomplets', `${lotsCostsMissing} lot(s) sans coût poussin/aliment/santé exploitable.`, 'Aligner coût lot et marge dans Avicole, Finances, Comptabilité.'));

  if (!arr(data.cultures).length) issues.push(issue('Cultures', 'bloquant', 'Aucune culture chargée', 'Impossible de tester récoltes et ventes agricoles.', 'Vérifier données simulées.'));
  if (cultureRevenue <= 0 && arr(data.sales_orders).some(isCultureSale)) issues.push(issue('Cultures', 'bloquant', 'CA cultures non reconnu', 'Des ventes cultures existent, mais le réalisé peut rester à zéro.', 'Corriger mapping culture → ventes → objectifs.'));
  if (cultureCostsMissing) issues.push(issue('Cultures', 'a_corriger', 'Coûts cultures incomplets', `${cultureCostsMissing} culture(s) sans coûts détaillés exploitables.`, 'Renseigner semences, engrais, eau, main-d’œuvre, traitements, autres frais.'));

  arr(data.sante).forEach((s) => {
    if (!s.type_intervention && !s.type && !s.intervention_type) issues.push(issue('Santé', 'a_corriger', 'Type intervention manquant', `Intervention ${s.id || s.nom || ''} sans type clair.`, 'Formulaire adaptatif obligatoire.'));
    if (clean(`${s.preuve || s.ordonnance || s.ordonnance_url || ''}`).startsWith('http')) issues.push(issue('Santé', 'a_corriger', 'Preuve en URL', `Intervention ${s.id || s.nom || ''} utilise encore une URL.`, 'Remplacer par upload document/photo.'));
    if (!s.impact_business_category && !s.impact_ferme && !s.impact_business) issues.push(issue('Impact Business', 'a_corriger', 'Impact ferme non structuré', `Intervention ${s.id || s.nom || ''} sans impact ferme structuré.`, 'Remplacer champ libre par catégories + niveau + montant.'));
  });

  const paymentsNoFinance = arr(data.payments).filter((p) => !arr(data.finances).some((f) => (String(f.payment_id || '') === String(p.id)) || (orderIdOf(f) && orderIdOf(f) === orderIdOf(p) && Math.abs(amount(f) - paid(p)) < 1))).length;
  if (paymentsNoFinance) issues.push(issue('Ventes', 'a_corriger', 'Paiements sans finance', `${paymentsNoFinance} paiement(s) sans transaction finance liée.`, 'Créer automatiquement transaction finance au paiement.'));
  const openConvertedOpps = arr(data.sales_opportunities).filter((opp) => arr(data.sales_orders).some((o) => sourceIdOf(o) && sourceIdOf(o) === sourceIdOf(opp)) && !/converti|ferme|fermée|cloture|clôture/.test(clean(opp.status || opp.statut))).length;
  if (openConvertedOpps) issues.push(issue('Ventes', 'a_corriger', 'Opportunités non fermées', `${openConvertedOpps} opportunité(s) semblent converties mais restent ouvertes.`, 'Fermer opportunité quand commande créée.'));
  const invoicesNoDocument = arr(data.invoices).filter((inv) => !arr(data.documents).some((d) => String(d.invoice_id || d.related_id || d.entity_id || '') === String(inv.id || inv.order_id))).length;
  if (invoicesNoDocument) issues.push(issue('Documents', 'a_corriger', 'Factures sans document', `${invoicesNoDocument} facture(s) sans document lié.`, 'Générer document facture automatiquement.'));

  const businessPlanPresent = arr(data.business_plans).length > 0;
  if (businessPlanPresent && !arr(data.bp_investment_lines).length) issues.push(issue('Investissements', 'bloquant', 'BP sans lignes de dépenses', 'Business plan présent mais dépenses absentes.', 'Relier BP à ses lignes investissement.'));
  if (businessPlanPresent && !arr(data.bp_revenue_projections).length) issues.push(issue('Investissements', 'a_corriger', 'BP sans CA prévisionnel', 'Le business plan ne permet pas de lire le CA prévisionnel.', 'Ajouter projections CA par activité.'));

  if (!arr(data.finances).some(isExpense)) issues.push(issue('Comptabilité', 'bloquant', 'Charges non visibles', 'Aucune charge exploitable détectée en finances.', 'Rattacher charges santé/RH/aliment/investissements.'));
  if (!arr(data.taches).length) issues.push(issue('Tâches', 'a_surveiller', 'Aucune tâche', 'Le système ne génère pas encore assez de tâches terrain.', 'Créer tâches automatiques : pesée, vaccination, récolte, relance.'));
  if (!arr(data.alertes_center).length) issues.push(issue('Alertes', 'a_surveiller', 'Aucune alerte', 'Le centre alertes ne reflète pas les anomalies métier.', 'Créer alertes depuis règles métier.'));

  const grouped = auditManifest.map((manifest) => {
    const module = manifest.module;
    const list = issues.filter((i) => i.module === module || (module === 'Objectifs' && ['Animaux', 'Avicole', 'Cultures'].includes(i.module)));
    const missingData = arr(manifest.data).filter((key) => key && data[key] && !arr(data[key]).length);
    const dataIssues = missingData.slice(0, 3).map((key) => issue(module, 'a_surveiller', `Données ${key} absentes`, `Le référentiel demande ${key}, mais aucune donnée n’est chargée.`, 'Vérifier si c’est normal en simulation ou si le module n’est pas alimenté.'));
    const fullList = [...list, ...dataIssues];
    const worst = fullList.reduce((m, i) => Math.max(m, severityRank(i.severity)), 0);
    const severity = worst >= 3 ? 'bloquant' : worst === 2 ? 'a_corriger' : worst === 1 ? 'a_surveiller' : 'ok';
    return { module, severity, issues: fullList, manifest };
  });
  const ok = grouped.filter((g) => g.severity === 'ok').length;
  return { issues, grouped, ok, total: grouped.length, score: Math.round((ok / grouped.length) * 100), stats: { animalRevenue, avicoleRevenue, cultureRevenue } };
}

function exportAudit(report) {
  const automaticRows = report.grouped.flatMap((g) => g.issues.length ? g.issues.map((i) => ({ type: 'Audit automatique', module: g.module, statut: labelSeverity(i.severity), probleme: i.title, detail: i.detail, action: i.action })) : [{ type: 'Audit automatique', module: g.module, statut: 'OK', probleme: '', detail: '', action: '' }]);
  const journeyRows = report.grouped.map((g) => ({ type: 'Référentiel parcours', module: g.module, statut: g.manifest?.priority || '', probleme: g.manifest?.purpose || '', detail: arr(g.manifest?.human).join(' > '), action: g.manifest?.expected || '' }));
  const rows = [...automaticRows, ...journeyRows];
  const csv = ['type;module;statut;probleme;detail;action', ...rows.map((r) => [r.type, r.module, r.statut, r.probleme, r.detail, r.action].map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-erp-horizon-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Mini({ label, value, danger = false }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
function JourneyPanel({ manifest }) {
  if (!manifest) return null;
  return <div className="rounded-xl bg-white/80 border border-current/10 p-3 text-sm space-y-2"><p className="font-black flex items-center gap-2"><Route size={16} /> Référentiel testeur · priorité {manifest.priority}</p><p><b>Objectif :</b> {manifest.purpose}</p>{arr(manifest.display).length ? <p><b>Affichage :</b> {manifest.display.join(' · ')}</p> : null}{arr(manifest.checks).length ? <p><b>Cohérence :</b> {manifest.checks.join(' · ')}</p> : null}{arr(manifest.forms).length ? <p><b>Formulaires :</b> {manifest.forms.join(' · ')}</p> : null}<ol className="list-decimal pl-5 space-y-1">{arr(manifest.human).map((step) => <li key={step}>{step}</li>)}</ol><p className="text-xs font-bold"><b>Résultat attendu :</b> {manifest.expected}</p></div>;
}

export default function ErpAuditPanel() {
  const [expanded, setExpanded] = useState('Animaux');
  const [showJourneysOnly, setShowJourneysOnly] = useState(false);
  const keys = Array.from(new Set([...auditRequiredDataKeys, 'sales_orders', 'payments', 'invoices', 'documents', 'sales_opportunities', 'business_plans', 'bp_investment_lines', 'bp_revenue_projections', 'alertes_center', 'taches', 'rapports']));
  const crud = Object.fromEntries(keys.map((key) => [key, useCrudModule(key)]));
  const data = Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)]));
  const report = useMemo(() => buildAudit(data), [JSON.stringify(data)]);
  const refreshAll = async () => Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()));
  const blockers = report.issues.filter((i) => i.severity === 'bloquant').length;
  const corrections = report.issues.filter((i) => i.severity === 'a_corriger').length;

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div><p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><ClipboardCheck size={14} /> Audit testeur ERP</p><h2 className="mt-3 text-2xl font-black text-[#2f2415]">Audit automatique + parcours testeur humain</h2><p className="mt-1 text-sm text-[#8a7456]">Ce bloc lit le même fichier maître que l’audit complet : données, affichage, formulaires, parcours humain, résultat attendu et lots de correction.</p></div>
      <div className="flex flex-wrap gap-2"><Btn icon={RefreshCw} variant="outline" small onClick={refreshAll}>Recharger audit</Btn><Btn icon={Route} variant="outline" small onClick={() => setShowJourneysOnly((v) => !v)}>{showJourneysOnly ? 'Voir audit + parcours' : 'Parcours seulement'}</Btn><Btn icon={Download} variant="outline" small onClick={() => exportAudit(report)}>Exporter CSV</Btn></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Mini label="Score audit" value={`${report.score}%`} /><Mini label="Modules OK" value={`${report.ok}/${report.total}`} /><Mini label="Bloquants" value={blockers} danger={blockers > 0} /><Mini label="À corriger" value={corrections} danger={corrections > 0} /><Mini label="CA testé" value={money(report.stats.animalRevenue + report.stats.avicoleRevenue + report.stats.cultureRevenue)} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{report.grouped.map((g) => <div key={g.module} className={`rounded-2xl border p-4 ${severityClass(g.severity)}`}><button type="button" onClick={() => setExpanded(expanded === g.module ? '' : g.module)} className="w-full flex items-center justify-between text-left"><span className="font-black flex items-center gap-2">{g.severity === 'ok' ? <CheckCircle2 size={17} /> : g.severity === 'bloquant' ? <XCircle size={17} /> : <AlertTriangle size={17} />} {g.module}</span><span className="text-xs font-black">{labelSeverity(g.severity)} · {g.issues.length}</span></button>{expanded === g.module ? <div className="mt-3 space-y-2"><JourneyPanel manifest={g.manifest} />{!showJourneysOnly ? (g.issues.length ? g.issues.map((i) => <div key={i.id} className="rounded-xl bg-white/70 border border-current/10 p-3 text-sm"><p className="font-black">{i.title}</p><p className="mt-1 opacity-90">{i.detail}</p>{i.action ? <p className="mt-2 text-xs font-bold">Action : {i.action}</p> : null}</div>) : <p className="text-sm font-bold opacity-80">Aucune anomalie automatique détectée sur ce module.</p>) : null}</div> : null}</div>)}</div>
  </section>;
}
