import { AlertTriangle, Bot, CheckCircle2, ClipboardList, FileWarning, GitBranch, Lightbulb, Navigation, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { receivableOfOrder } from '../utils/assistantDataMap.js';
import { fmtNumber, toNumber } from '../utils/format';
import { filterRealOpenTasks } from '../utils/healthFindingLabels.js';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const isOpen = (row = {}) => !['termine', 'terminé', 'traitee', 'traitée', 'closed', 'done', 'annule', 'annulé'].includes(lower(row.status || row.statut));
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const paymentOf = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const totalOf = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.chiffre_affaires ?? row.amount);
const hasProof = (row = {}) => row.document_id || row.linked_document_id || row.piece_jointe || row.file_url || row.preuve_url;

const MODULE_LABELS = {
  ventes: 'Ventes', finances: 'Finances', comptabilite: 'Comptabilité', stock: 'Stock', sante: 'Santé', avicole: 'Avicole', animaux: 'Animaux', cultures: 'Cultures', documents: 'Documents', taches: 'Tâches', alertes: 'Alertes', fournisseurs: 'Fournisseurs', clients: 'Clients', investissements: 'Investissements', rh: 'RH', smartfarm: 'Smart Farm', equipements: 'Équipements', impact_business: 'Impact & Valeur ERP'
};

function Card({ icon: Icon, label, value, hint, danger = false, onClick }) {
  return <button type="button" onClick={onClick} className={`text-left rounded-2xl border p-4 transition ${danger ? 'border-red-200 bg-red-50 hover:border-red-300' : 'border-[#eadcc2] bg-[#fffdf8] hover:border-[#c9a96a]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </button>;
}

function PriorityRow({ item, onNavigate, onCreateTask, busy }) {
  const tone = item.level === 'critical' ? 'border-red-200 bg-red-50 text-red-700' : item.level === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}>{item.badge}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-[#8a7456]">{MODULE_LABELS[item.module] || item.module}</span>
      </div>
      <p className="mt-2 font-black text-[#2f2415]">{item.title}</p>
      <p className="mt-1 text-sm text-[#8a7456]">{item.description}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onNavigate?.(item.module)} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]"><Navigation size={14} className="inline" /> Ouvrir</button>
      <button type="button" disabled={busy} onClick={() => onCreateTask(item)} className="rounded-xl bg-[#2f2415] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"><ClipboardList size={14} className="inline" /> Créer tâche</button>
    </div>
  </div>;
}

function buildAssistantPriorities(dataMap = {}) {
  const sales = arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.ventes);
  const payments = arr(dataMap.paymentsAll || dataMap.payments);
  const transactions = arr(dataMap.finances);
  const stock = arr(dataMap.stock);
  const animals = arr(dataMap.animaux);
  const lots = arr(dataMap.avicole);
  const cultures = arr(dataMap.cultures);
  const documents = arr(dataMap.documents);
  const tasks = arr(dataMap.taches);
  const alerts = arr(dataMap.alertes_center);
  const suppliers = arr(dataMap.fournisseurs);
  const clients = arr(dataMap.clients);
  const equipments = arr(dataMap.equipements);

  const openAlerts = alerts.filter(isOpen);
  const openTasks = filterRealOpenTasks(tasks);
  const unpaidSales = sales.filter((sale) => receivableOfOrder(sale, payments) > 0 && !['annule', 'annulé'].includes(lower(sale.statut_commande || sale.status)));
  const criticalStock = stock.filter((s) => toNumber(s.quantite) <= toNumber(s.seuil));
  const sickAnimals = animals.filter((a) => /malade|traitement|surveiller/.test(lower(a.health_status || a.sante || a.status_sante)));
  const riskyLots = lots.filter((lot) => toNumber(lot.current_count ?? lot.actifs) <= 0 && !/cl[oô]tur|vendu|abattu|transform|perdu|livr/.test(lower(`${lot.status || ''} ${lot.statut || ''}`)));
  const riskyCultures = cultures.filter((c) => toNumber(c.score_sante || 100) < 80 || /risque|perdu/.test(lower(c.statut || c.status)));
  const txWithoutProof = transactions.filter((tx) => amountOf(tx) > 0 && !hasProof(tx) && !documents.some((doc) => String(doc.transaction_id || doc.finance_id || doc.entity_id) === String(tx.id)));
  const supplierDebt = suppliers.filter((f) => toNumber(f.dettes || f.dette || f.solde_du) > 0);
  const clientNoContact = clients.filter((c) => !c.tel && !c.phone && !c.whatsapp);
  const equipmentIssues = equipments.filter((e) => /panne|maintenance|hors_service/.test(lower(e.status || e.statut)));

  const priorities = [];
  if (openAlerts.length) priorities.push({ module: 'alertes', level: 'critical', badge: 'Alerte', title: `${openAlerts.length} alerte(s) ouverte(s)`, description: 'Transformer les alertes critiques en tâches terrain et clôturer celles déjà traitées.' });
  if (unpaidSales.length) priorities.push({ module: 'commercial', level: 'warning', badge: 'Créance', title: `${unpaidSales.length} commande(s) non soldée(s)`, description: 'Encaisser les restes à payer, générer factures/preuves et relancer les clients.' });
  if (criticalStock.length) priorities.push({ module: 'stock', level: 'critical', badge: 'Stock', title: `${criticalStock.length} stock(s) critique(s)`, description: 'Réapprovisionner, corriger les seuils ou affecter les sorties alimentation/santé.' });
  if (sickAnimals.length) priorities.push({ module: 'animaux', level: 'critical', badge: 'Santé', title: `${sickAnimals.length} animal(aux) à suivre`, description: 'Créer un soin, relier les coûts santé et mettre à jour le statut du sujet.' });
  if (riskyLots.length) priorities.push({ module: 'avicole', level: 'warning', badge: 'Cycle', title: `${riskyLots.length} lot(s) à 0 actif non clôturé(s)`, description: 'Consulter l’historique effectif puis clôturer, justifier la sortie ou corriger l’effectif.' });
  if (riskyCultures.length) priorities.push({ module: 'cultures', level: 'warning', badge: 'Culture', title: `${riskyCultures.length} culture(s) à surveiller`, description: 'Vérifier rendement, traitements, récoltes et pertes avant clôture.' });
  if (txWithoutProof.length) priorities.push({ module: 'documents', level: 'warning', badge: 'Preuve', title: `${txWithoutProof.length} transaction(s) sans justificatif`, description: 'Créer ou lier une facture, reçu, photo ou preuve de paiement.' });
  if (supplierDebt.length) priorities.push({ module: 'fournisseurs', level: 'warning', badge: 'Dette', title: `${supplierDebt.length} fournisseur(s) avec dette`, description: 'Relier les paiements, justificatifs et réceptions stock.' });
  if (clientNoContact.length) priorities.push({ module: 'clients', level: 'warning', badge: 'Contact', title: `${clientNoContact.length} client(s) sans contact`, description: 'Compléter téléphone/WhatsApp pour relances et suivi commercial.' });
  if (equipmentIssues.length) priorities.push({ module: 'equipements', level: 'warning', badge: 'Matériel', title: `${equipmentIssues.length} équipement(s) en panne/maintenance`, description: 'Créer une tâche de maintenance et enregistrer les coûts éventuels.' });
  if (!priorities.length && openTasks.length) priorities.push({ module: 'taches', level: 'info', badge: 'Suivi', title: `${openTasks.length} tâche(s) ouverte(s)`, description: 'Suivre les actions terrain restantes et clôturer ce qui est terminé.' });
  return { priorities, unpaidSales, criticalStock, riskyLots, openTasks };
}

export default function AssistantERPInsights({ dataMap = {}, onNavigate }) {
  const tasksCrud = useCrudModule('taches');
  const businessEventsCrud = useCrudModule('business_events');
  const [busy, setBusy] = useState(false);
  const analysis = useMemo(() => buildAssistantPriorities(dataMap), [dataMap]);
  const totalRows = Object.values(dataMap || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  const qualityScore = Math.max(0, 100 - (analysis.priorities.filter((p) => p.level === 'critical').length * 18) - (analysis.priorities.filter((p) => p.level === 'warning').length * 7));
  const avoided = arr(dataMap.business_events).reduce((sum, evt) => sum + toNumber(evt.saisies_evitees), 0);

  const createTask = async (item) => {
    try {
      setBusy(true);
      const id = makeId('TSK');
      await tasksCrud.create?.({ id, title: item.title, module_lie: item.module, source_module: 'assistant_erp', source_record_id: item.module, due_date: today(), priority: item.level === 'critical' ? 'critique' : 'haute', status: 'a_faire', notes: item.description, created_from: 'assistant_erp' });
      await businessEventsCrud.create?.({ id: makeId('EVT'), event_type: 'assistant_priority_task', module_source: 'assistant_erp', entity_type: 'task', entity_id: id, title: `Tâche créée depuis Assistant ERP — ${item.title}`, description: item.description, event_date: today(), severity: item.level === 'critical' ? 'critical' : 'warning', linked_task_id: id, saisies_evitees: 2 });
      await Promise.allSettled([tasksCrud.refresh?.(), businessEventsCrud.refresh?.()]);
      toast.success('Tâche créée depuis Assistant ERP');
    } catch (error) {
      toast.error(error.message || 'Création de tâche impossible');
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><Bot size={14} /> Assistant ERP</p>
        <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Priorités de gestion</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Suivi des urgences terrain, ventes, stocks, preuves et actions à traiter.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-full xl:min-w-[560px]">
        <Card icon={ShieldCheck} label="Cohérence" value={`${qualityScore}%`} hint="selon urgences" danger={qualityScore < 75} />
        <Card icon={GitBranch} label="Données lues" value={fmtNumber(totalRows)} hint="tous modules" />
        <Card icon={Wand2} label="Actions évitées" value={fmtNumber(avoided)} hint="via automatisations" />
        <Card icon={AlertTriangle} label="Priorités" value={analysis.priorities.length} hint="à traiter" danger={analysis.priorities.length > 0} />
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={FileWarning} label="Créances" value={analysis.unpaidSales.length} hint="commandes non soldées" danger={analysis.unpaidSales.length > 0} onClick={() => onNavigate?.('commercial')} />
      <Card icon={AlertTriangle} label="Stocks critiques" value={analysis.criticalStock.length} hint="à réapprovisionner" danger={analysis.criticalStock.length > 0} onClick={() => onNavigate?.('stock')} />
      <Card icon={Sparkles} label="Lots à clôturer" value={analysis.riskyLots.length} hint="effectif 0 non justifié" danger={analysis.riskyLots.length > 0} onClick={() => onNavigate?.('avicole')} />
      <Card icon={ClipboardList} label="Tâches ouvertes" value={analysis.openTasks.length} hint="terrain / suivi" danger={analysis.openTasks.length > 8} onClick={() => onNavigate?.('taches')} />
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-black text-[#2f2415]"><Lightbulb size={18} /> Actions recommandées</p>
          <p className="text-sm text-[#8a7456]">À traiter en priorité pour garder l’exploitation à jour.</p>
        </div>
        {analysis.priorities.length ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">{analysis.priorities.length} action(s)</span> : <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800"><CheckCircle2 size={13} className="inline" /> Rien de critique</span>}
      </div>
      <div className="space-y-2">
        {analysis.priorities.slice(0, 8).map((item) => <PriorityRow key={`${item.module}-${item.title}`} item={item} onNavigate={onNavigate} onCreateTask={createTask} busy={busy} />)}
        {!analysis.priorities.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Aucune priorité critique détectée.</div> : null}
      </div>
    </div>
  </section>;
}
