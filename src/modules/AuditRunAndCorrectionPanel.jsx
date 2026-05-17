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
const isAnimalSale = (row = {}) => /animal|bovin|ovin|caprin|bov|cap|ovin/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''} ${row.source_id || ''}`));
const isAvicoleSale = (row = {}) => /avicole|poulet|chair|oeuf|pondeuse|lot/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''}`));
const isCultureSale = (row = {}) => /culture|recolte|tomate|piment|laitue|oignon/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''}`));
const costAnimal = (a = {}) => n(a.purchase_cost || a.prix_achat || a.cout_achat) + n(a.alimentation || a.cout_alimentation) + n(a.sante || a.cout_sante) + n(a.autres_frais || a.frais_directs);
const costLot = (l = {}) => n(l.cout_poussins || l.purchase_cost) + n(l.cout_aliment || l.alimentation) + n(l.frais_sante || l.cout_sante) + n(l.autres_frais || l.frais_directs);
const costCulture = (c = {}) => n(c.cout_semences) + n(c.cout_engrais) + n(c.cout_eau || c.cout_irrigation) + n(c.cout_main_oeuvre || c.cout_mo) + n(c.cout_traitement || c.cout_traitements) + n(c.autres_frais || c.frais_directs);

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
  if (animalMissingCosts) add('Lot 2 · Coûts et marges métier', 'Animaux', 'Coûts animaux incomplets', `${animalMissingCosts} animal(aux) sans coût total exploitable.`);
  if (lotMissingCosts) add('Lot 2 · Coûts et marges métier', 'Avicole', 'Coûts lots incomplets', `${lotMissingCosts} lot(s) sans coût poussin/aliment/santé complet.`);
  if (cultureMissingCosts) add('Lot 2 · Coûts et marges métier', 'Cultures', 'Coûts cultures incomplets', `${cultureMissingCosts} culture(s) sans semences/engrais/eau/main-d’œuvre/traitements.`);
  const healthFormIssues = arr(data.sante).filter((s) => !s.type_intervention && !s.intervention_type && !s.type).length;
  const healthUrlProofs = arr(data.sante).filter((s) => /^https?:/.test(String(s.preuve || s.ordonnance || s.ordonnance_url || ''))).length;
  if (healthFormIssues) add('Lot 3 · Formulaires et UX', 'Santé', 'Formulaire santé non adaptatif', `${healthFormIssues} intervention(s) sans type clair.`);
  if (healthUrlProofs) add('Lot 3 · Formulaires et UX', 'Santé', 'Preuves encore en URL', `${healthUrlProofs} preuve(s)/ordonnance(s) en URL au lieu d’upload.`);
  if (!arr(data.taches).length && risks.length) add('Lot 4 · Automatisations terrain', 'Tâches', 'Tâches automatiques insuffisantes', `${risks.length} risque(s) détecté(s), mais aucune tâche terrain générée.`, 'moyenne');
  if (!arr(data.alertes_center).length && risks.length) add('Lot 4 · Automatisations terrain', 'Alertes', 'Alertes automatiques insuffisantes', `${risks.length} risque(s) détecté(s), mais aucune alerte générée.`, 'moyenne');
  if (arr(data.business_plans).length && !arr(data.bp_revenue_projections).length) add('Lot 5 · Investissements et financeur', 'Investissements', 'BP sans CA prévisionnel', 'Le business plan ne contient pas de projection de CA exploitable.', 'moyenne');
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
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{lot}</p><p className="text-xs text-[#8a7456] mt-1">{items.length} correction(s) proposées</p>{packageId ? <p className="mt-1 text-xs font-bold text-emerald-700">Paquet sécurisé disponible</p> : <p className="mt-1 text-xs font-bold text-[#8a7456]">Paquet sécurisé à préparer</p>}</div><span className="rounded-full bg-white border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#8a7456]">lot contrôlé</span></div><div className="mt-3 space-y-2">{items.map((item) => <div key={`${item.module}-${item.title}`} className="rounded-xl bg-white border border-[#eadcc2] p-3 text-sm"><p className="font-black text-[#2f2415]">{item.module} · {item.title}</p><p className="text-[#8a7456] mt-1">{item.detail}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Btn icon={Wrench} small onClick={() => onRequestCorrection(lot, items, false)} disabled={busy}>Marquer lot à corriger</Btn><Btn icon={KeyRound} variant="outline" small onClick={() => onDryRunAgent(lot)} disabled={agentBusy || !agentReady}>{agentReady ? 'Tester agent sur ce lot' : 'Code agent requis'}</Btn>{packageId ? <Btn icon={CheckCircle2} small onClick={() => onApplyAgent(lot, packageId)} disabled={agentBusy || !agentReady}>Appliquer paquet sécurisé</Btn> : null}<Btn icon={FileText} variant="outline" small onClick={() => onRequestCorrection(lot, items, true)} disabled={busy}>Enregistrer historique</Btn></div><p className="mt-2 text-xs text-[#8a7456]">Le test ne modifie rien. “Appliquer paquet sécurisé” commit uniquement un paquet reconnu par l’agent, puis déclenche Vercel si le hook est configuré.</p></div>;
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
  const keys = Array.from(new Set([...auditRequiredDataKeys, 'sales_orders', 'payments', 'invoices', 'documents', 'sales_opportunities', 'business_plans', 'bp_revenue_projections', 'alertes_center', 'taches', 'rapports']));
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
      const deployMsg = data?.deploy?.triggered ? 'Build Vercel déclenché.' : 'Commit effectué. Build Vercel non confirmé.';
      setLastInfo(`Paquet appliqué pour ${lot}. ${deployMsg} Attends le build vert, rafraîchis l’ERP, puis relance l’audit.`);
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
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><GitBranch size={14} /> Agent audit & corrections par lots</p><h2 className="mt-3 text-2xl font-black text-[#2f2415]">Lancer un audit complet et préparer les corrections</h2><p className="mt-1 text-sm text-[#8a7456]">L’audit détecte les vrais risques métier. Les corrections sécurisées passent par ton code d’approbation.</p></div><Btn icon={Play} onClick={runFullAudit} disabled={running}>{running ? 'Audit en cours...' : 'Lancer audit complet'}</Btn></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><label className="block text-sm"><span className="font-bold text-[#2f2415]">Code approbation agent</span><input type="password" value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} placeholder="ERP_AGENT_APPROVAL_SECRET" className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2" /></label><p className="mt-2 text-xs text-[#8a7456]">Ce code sert seulement à autoriser l’agent sécurisé. Il n’est pas enregistré dans l’ERP.</p></div><div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Mini icon={Clock} label="Progression" value={`${progress}%`} /><Mini icon={FileText} label="Module testé" value={running ? MODULES[currentIndex] : (lastSnapshot ? 'Terminé' : 'En attente')} /><Mini icon={Clock} label="Temps" value={`${elapsed}s`} /><Mini icon={ShieldAlert} label="Corrections" value={(lastSnapshot || liveSnapshot).issues.length} danger={(lastSnapshot || liveSnapshot).issues.length > 0} /><Mini icon={CheckCircle2} label="Score" value={`${(lastSnapshot || liveSnapshot).score}%`} /></div><div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full rounded-full bg-[#2f2415] transition-all" style={{ width: `${progress}%` }} /></div>{lastInfo ? <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800"><b>Statut :</b> {lastInfo}</div> : null}<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Important :</b> “Tester agent” ne modifie rien. “Appliquer paquet sécurisé” commit uniquement un paquet reconnu par l’agent, puis déclenche Vercel. Après build vert, rafraîchis et relance l’audit.</div><div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{Object.keys(lots).length ? Object.entries(lots).map(([lot, items]) => <LotCard key={lot} lot={lot} items={items} onRequestCorrection={requestCorrection} onDryRunAgent={dryRunAgent} onApplyAgent={applyAgent} busy={correctionBusy} agentBusy={agentBusy} agentReady={Boolean(approvalCode.trim())} />) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 font-bold">Aucun lot prioritaire détecté pour l’instant.</div>}</div></section>;
}
function Mini({ icon: Icon, label, value, danger = false }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-lg font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
