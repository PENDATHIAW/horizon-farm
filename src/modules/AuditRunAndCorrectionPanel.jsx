import { CheckCircle2, Clock, FileText, GitBranch, Play, ShieldAlert } from 'lucide-react';
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
const isAnimalSale = (row = {}) => /animal|bovin|ovin|caprin|bov|cap|ovin/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''} ${row.source_id || ''}`));
const isAvicoleSale = (row = {}) => /avicole|poulet|chair|oeuf|pondeuse|lot/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''}`));
const isCultureSale = (row = {}) => /culture|recolte|tomate|piment|laitue|oignon/.test(norm(`${row.source_type || ''} ${row.product_name || ''} ${row.libelle || ''}`));
const costAnimal = (a = {}) => n(a.purchase_cost || a.prix_achat || a.cout_achat) + n(a.alimentation || a.cout_alimentation) + n(a.sante || a.cout_sante) + n(a.autres_frais || a.frais_directs);
const costLot = (l = {}) => n(l.cout_poussins || l.purchase_cost) + n(l.cout_aliment || l.alimentation) + n(l.frais_sante || l.cout_sante) + n(l.autres_frais || l.frais_directs);
const costCulture = (c = {}) => n(c.cout_semences) + n(c.cout_engrais) + n(c.cout_eau || c.cout_irrigation) + n(c.cout_main_oeuvre || c.cout_mo) + n(c.cout_traitement || c.cout_traitements) + n(c.autres_frais || c.frais_directs);

function detectIssues(data) {
  const issues = [];
  const add = (lot, module, title, detail, priority = 'haute') => issues.push({ lot, module, title, detail, priority });
  const animalSales = data.sales_orders.filter(isAnimalSale).reduce((s, row) => s + amount(row), 0);
  const avicoleSales = data.sales_orders.filter(isAvicoleSale).reduce((s, row) => s + amount(row), 0);
  const cultureSales = data.sales_orders.filter(isCultureSale).reduce((s, row) => s + amount(row), 0);
  const animalMissingCosts = data.animaux.filter((a) => costAnimal(a) <= 0).length;
  const lotMissingCosts = data.avicole.filter((l) => costLot(l) <= 0).length;
  const cultureMissingCosts = data.cultures.filter((c) => costCulture(c) <= 0).length;
  const paymentsWithoutFinance = data.payments.filter((p) => !data.finances.some((f) => String(f.payment_id || f.related_id || f.order_id || '') === String(p.id || p.order_id || p.sale_id || ''))).length;
  const invoicesWithoutDocs = data.invoices.filter((inv) => !data.documents.some((d) => String(d.invoice_id || d.related_id || d.entity_id || '') === String(inv.id || inv.order_id || ''))).length;

  if (data.sales_orders.some(isAnimalSale) && animalSales <= 0) add('Lot 1 · Bloquants revenus', 'Animaux', 'CA animaux non reconnu', 'Des ventes animaux existent mais le CA n’est pas attribué correctement.');
  if (data.sales_orders.some(isAvicoleSale) && avicoleSales <= 0) add('Lot 1 · Bloquants revenus', 'Avicole', 'CA avicole non reconnu', 'Des ventes avicoles existent mais le CA n’est pas attribué correctement.');
  if (data.sales_orders.some(isCultureSale) && cultureSales <= 0) add('Lot 1 · Bloquants revenus', 'Cultures', 'CA cultures non reconnu', 'Des ventes cultures existent mais le CA n’est pas attribué correctement.');
  if (paymentsWithoutFinance) add('Lot 1 · Bloquants revenus', 'Ventes', 'Paiements sans finance', `${paymentsWithoutFinance} paiement(s) ne créent pas de transaction finance.`);
  if (invoicesWithoutDocs) add('Lot 1 · Bloquants revenus', 'Documents', 'Factures sans document', `${invoicesWithoutDocs} facture(s) sans document associé.`);

  if (animalMissingCosts) add('Lot 2 · Coûts et marges métier', 'Animaux', 'Coûts animaux incomplets', `${animalMissingCosts} animal(aux) sans coût total exploitable.`);
  if (lotMissingCosts) add('Lot 2 · Coûts et marges métier', 'Avicole', 'Coûts lots incomplets', `${lotMissingCosts} lot(s) sans coût poussin/aliment/santé complet.`);
  if (cultureMissingCosts) add('Lot 2 · Coûts et marges métier', 'Cultures', 'Coûts cultures incomplets', `${cultureMissingCosts} culture(s) sans semences/engrais/eau/main-d’œuvre/traitements.`);

  const healthFormIssues = data.sante.filter((s) => !s.type_intervention && !s.intervention_type && !s.type).length;
  const healthUrlProofs = data.sante.filter((s) => /^https?:/.test(String(s.preuve || s.ordonnance || s.ordonnance_url || ''))).length;
  if (healthFormIssues) add('Lot 3 · Formulaires et UX', 'Santé', 'Formulaire santé non adaptatif', `${healthFormIssues} intervention(s) sans type clair.`);
  if (healthUrlProofs) add('Lot 3 · Formulaires et UX', 'Santé', 'Preuves encore en URL', `${healthUrlProofs} preuve(s)/ordonnance(s) en URL au lieu d’upload.`);

  if (!data.taches.length) add('Lot 4 · Automatisations terrain', 'Tâches', 'Tâches automatiques insuffisantes', 'Aucune tâche générée pour pesée, vaccination, récolte ou relance.', 'moyenne');
  if (!data.alertes_center.length) add('Lot 4 · Automatisations terrain', 'Alertes', 'Alertes automatiques insuffisantes', 'Aucune alerte générée par les règles métier.', 'moyenne');
  if (data.business_plans.length && !data.bp_revenue_projections.length) add('Lot 5 · Investissements et financeur', 'Investissements', 'BP sans CA prévisionnel', 'Le business plan ne contient pas de projection de CA exploitable.', 'moyenne');

  return { issues, animalSales, avicoleSales, cultureSales };
}

function buildReportText(snapshot, progressSeconds) {
  const byLot = snapshot.issues.reduce((acc, item) => ({ ...acc, [item.lot]: [...(acc[item.lot] || []), item] }), {});
  const manifestSummary = auditManifest.map((item) => `- ${item.module}: ${item.purpose}`).join('\n');
  return [
    `Audit ERP Horizon Farm`,
    `Date: ${new Date().toLocaleString()}`,
    `Durée simulée: ${progressSeconds}s`,
    `Score: ${snapshot.score}%`,
    `CA testé: ${money(snapshot.animalSales + snapshot.avicoleSales + snapshot.cultureSales)}`,
    '',
    '## Référentiel utilisé',
    manifestSummary,
    '',
    ...Object.entries(byLot).flatMap(([lot, items]) => [`## ${lot}`, ...items.map((i) => `- [${i.module}] ${i.title}: ${i.detail}`), '']),
    snapshot.issues.length ? '' : 'Aucune anomalie prioritaire détectée automatiquement.',
    'Plan recommandé: corriger lot par lot, relancer audit après chaque lot, puis demander un retest utilisateur.',
  ].join('\n');
}

function LotCard({ lot, items }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{lot}</p><p className="text-xs text-[#8a7456] mt-1">{items.length} correction(s) proposées</p></div><span className="rounded-full bg-white border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#8a7456]">lot contrôlé</span></div><div className="mt-3 space-y-2">{items.map((item) => <div key={`${item.module}-${item.title}`} className="rounded-xl bg-white border border-[#eadcc2] p-3 text-sm"><p className="font-black text-[#2f2415]">{item.module} · {item.title}</p><p className="text-[#8a7456] mt-1">{item.detail}</p></div>)}</div></div>;
}

export default function AuditRunAndCorrectionPanel() {
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const keys = Array.from(new Set([...auditRequiredDataKeys, 'sales_orders', 'payments', 'invoices', 'documents', 'sales_opportunities', 'business_plans', 'bp_revenue_projections', 'alertes_center', 'taches', 'rapports']));
  const crud = Object.fromEntries(keys.map((key) => [key, useCrudModule(key)]));
  const rapports = useCrudModule('rapports');
  const documents = useCrudModule('documents');
  const data = Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)]));
  const liveSnapshot = useMemo(() => {
    const detected = detectIssues(data);
    const score = Math.max(0, Math.round(((MODULES.length - Math.min(MODULES.length, detected.issues.length)) / MODULES.length) * 100));
    return { ...detected, score };
  }, [JSON.stringify(data)]);
  const lots = (lastSnapshot || liveSnapshot).issues.reduce((acc, item) => ({ ...acc, [item.lot]: [...(acc[item.lot] || []), item] }), {});
  const progress = running ? Math.round(((currentIndex + 1) / MODULES.length) * 100) : (lastSnapshot ? 100 : 0);

  const refreshAll = async () => Promise.allSettled(keys.map((key) => crud[key]?.refresh?.()));
  const createAuditReport = async (snapshot, seconds) => {
    const id = makeId('RPT-AUDIT');
    const title = `Audit ERP Horizon Farm - ${new Date().toLocaleDateString()}`;
    const content = buildReportText(snapshot, seconds);
    await rapports.create?.({ id, titre: title, title, type: 'audit_erp', statut: 'disponible', score: snapshot.score, contenu: content, resume: `${snapshot.issues.length} anomalie(s), score ${snapshot.score}%`, created_at: new Date().toISOString() });
    await documents.create?.({ id: makeId('DOC-AUDIT'), titre: title, title, type: 'rapport_audit_erp', module_lie: 'assistant_erp', related_id: id, contenu: content, statut: 'genere', created_at: new Date().toISOString() });
    await Promise.allSettled([rapports.refresh?.(), documents.refresh?.()]);
  };

  const runFullAudit = async () => {
    if (running) return;
    setRunning(true);
    setElapsed(0);
    setCurrentIndex(0);
    await refreshAll();
    const started = Date.now();
    for (let i = 0; i < MODULES.length; i += 1) {
      setCurrentIndex(i);
      setElapsed(Math.max(1, Math.round((Date.now() - started) / 1000)));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    const detected = detectIssues(Object.fromEntries(keys.map((key) => [key, arr(crud[key]?.rows)])));
    const snapshot = { ...detected, score: Math.max(0, Math.round(((MODULES.length - Math.min(MODULES.length, detected.issues.length)) / MODULES.length) * 100)) };
    setLastSnapshot(snapshot);
    await createAuditReport(snapshot, seconds);
    setRunning(false);
    setElapsed(seconds);
    toast.success('Audit terminé : rapport créé dans Rapports et Documents');
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><GitBranch size={14} /> Agent audit & corrections par lots</p><h2 className="mt-3 text-2xl font-black text-[#2f2415]">Lancer un audit complet et préparer les corrections</h2><p className="mt-1 text-sm text-[#8a7456]">L’Assistant ERP utilise maintenant un référentiel central module par module : données, affichage, formulaires, parcours humain, résultat attendu et lots de correction.</p></div><Btn icon={Play} onClick={runFullAudit} disabled={running}>{running ? 'Audit en cours...' : 'Lancer audit complet'}</Btn></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Mini icon={Clock} label="Progression" value={`${progress}%`} /><Mini icon={FileText} label="Module testé" value={running ? MODULES[currentIndex] : (lastSnapshot ? 'Terminé' : 'En attente')} /><Mini icon={Clock} label="Temps" value={`${elapsed}s`} /><Mini icon={ShieldAlert} label="Corrections" value={(lastSnapshot || liveSnapshot).issues.length} danger={(lastSnapshot || liveSnapshot).issues.length > 0} /><Mini icon={CheckCircle2} label="Score" value={`${(lastSnapshot || liveSnapshot).score}%`} /></div>
    <div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full rounded-full bg-[#2f2415] transition-all" style={{ width: `${progress}%` }} /></div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Correction autonome contrôlée :</b> l’assistant prépare les lots ici. Les corrections de code doivent être appliquées lot par lot, avec build + ré-audit après chaque lot. Pas de correction globale en une seule fois.</div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{Object.keys(lots).length ? Object.entries(lots).map(([lot, items]) => <LotCard key={lot} lot={lot} items={items} />) : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 font-bold">Aucun lot prioritaire détecté pour l’instant.</div>}</div>
  </section>;
}
function Mini({ icon: Icon, label, value, danger = false }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-lg font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
