import { BrainCircuit, ClipboardList, Database, Lock, MapPin, Settings, ShieldAlert, ShieldCheck, Trash2, UserCog, Wifi, Zap } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import VisionModuleAuditPanel from '../components/module/VisionModuleAuditPanel.jsx';
import JustifiedExceptionsAuditPanel from '../components/workflow/JustifiedExceptionsAuditPanel.jsx';
import WorkflowQualityPanel from '../components/workflow/WorkflowQualityPanel.jsx';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppContext';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { rememberDeletedId } from '../utils/deletedRecords';
import { setSimulatedDataMode } from '../utils/uiPreferences';
import { applyPeriodScopeToDataMap } from '../utils/applyPeriodScope';
import { isAllTimeScope } from '../utils/periodScope';
import { canPerformSystemAction } from '../utils/systemAccessWorkflows';
import { buildGestionSystemeCoherenceRows, buildGestionSystemeSnapshot } from './gestionSysteme/gestionSystemeVisionHelpers.js';
import FarmsManagementPanel from './farms/FarmsManagementPanel.jsx';
import SystemAccessAuditPanel from './SystemAccessAuditPanel.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const count = (v) => arr(v).length;
const open = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(String(r.status || r.statut || '').toLowerCase());
const dateOf = (r = {}) => r.created_at || r.updated_at || r.date || r.event_date || '—';
const labelOf = (r = {}) => r.title || r.nom || r.name || r.libelle || r.event_type || r.id || 'Élément';
const idOf = (row = {}) => row.id || row.uuid || row.code || row.reference;
const RESET_SKIP_KEYS = new Set(['dashboard', 'sync']);
const MODULE_TABLES = { animaux: 'animals', avicole: 'lots', sante: 'vaccins', veterinaires: 'veterinaires', finances: 'finances', stock: 'stocks', clients: 'clients', fournisseurs: 'fournisseurs', investissements: 'investments', business_plans: 'business_plans', bp_investment_lines: 'bp_investment_lines', bp_recurring_costs: 'bp_recurring_costs', bp_revenue_projections: 'bp_revenue_projections', bp_funding_sources: 'bp_funding_sources', bp_links: 'bp_links', bp_risks: 'bp_risks', price_catalog: 'price_catalog', bp_versions: 'bp_versions', bp_lines_history: 'bp_lines_history', tracabilite: 'tracabilite', cultures: 'cultures', ventes: 'ventes', documents: 'documents', taches: 'taches', rapports: 'rapports', equipements: 'equipements', audit_logs: 'audit_logs', alimentation_logs: 'alimentation_logs', production_oeufs_logs: 'production_oeufs_logs', sensor_devices: 'sensor_devices', camera_devices: 'camera_devices', business_events: 'business_events', alertes_center: 'alertes_center', whatsapp_templates: 'whatsapp_templates', whatsapp_logs: 'whatsapp_logs', sales_orders: 'sales_orders', sales_order_items: 'sales_order_items', deliveries: 'deliveries', invoices: 'invoices', payments: 'payments', sales_opportunities: 'sales_opportunities' };
const markHiddenLocally = (moduleKey, rows = []) => {
  if (typeof window === 'undefined') return;
  const table = MODULE_TABLES[moduleKey] || moduleKey;
  const ids = rows.map(idOf).filter(Boolean).map(String);
  rows.forEach((row) => { const rowId = idOf(row); if (rowId) rememberDeletedId(moduleKey, rowId, row); });
  try {
    window.localStorage.setItem(`horizon_real_deleted:${table}`, JSON.stringify(ids));
    window.localStorage.setItem(`horizon_simulated_deleted:${table}`, JSON.stringify(ids));
    window.localStorage.removeItem(`horizon_simulated_rows:${table}`);
  } catch {
    // localStorage peut être indisponible.
  }
};

function Stat({ label, value, tone = 'neutral' }) { const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]'; return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>; }
function Pill({ children, tone = 'neutral' }) { const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'; return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>; }
function Row({ title, detail, value, tone = 'neutral' }) { return <div className="grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center"><b className="text-[#2f2415]">{title}</b><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></div>; }
function Section({ icon: Icon, title, children }) { return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{children}</section>; }
function Tabs({ active, setActive }) { return <ModuleTabsBar moduleId="gestion_systeme" active={active} onChange={setActive} />; }
function ActionNote({ children }) { return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{children}</div>; }

function SystemIaPanel({ findings = [], onApply, busyId, setTab }) {
  if (!findings.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA système">
      <p className="mb-3 text-sm text-[#8a7456]">Doublons navigation, modules hors vision, onglets orphelins et cohérence ERP globale.</p>
      <div className="space-y-2">
        {findings.slice(0, 5).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTab('Audit')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Audit</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : f.auto_action === 'create_alert' ? 'Créer alerte' : 'Créer tâche'}</button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PriorityModulesPanel({ modules = [], onNavigate }) {
  if (!modules.length) return null;
  return (
    <Section icon={Zap} title="Modules à valider en priorité">
      {modules.slice(0, 6).map((mod) => (
        <div key={mod.moduleId} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <div><b className="text-[#2f2415]">{mod.label}</b><p className="text-xs text-[#8a7456]">{mod.statusLabel} · {mod.score}/100 · {mod.issues.length} issue(s)</p></div>
          <button type="button" onClick={() => onNavigate?.(mod.moduleId)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">Ouvrir</button>
        </div>
      ))}
    </Section>
  );
}

function AdminOverview({ data, checks, snapshot, setTab, onApply, busyId, onNavigate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé système" value={`${snapshot.systemScore}/100`} tone={snapshot.systemScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Audit vision" value={`${snapshot.globalScore}/100`} tone={snapshot.globalScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Santé exploitation" value={`${snapshot.healthScore}/100`} tone={snapshot.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Conformes" value={snapshot.summary.ok} tone="good" />
        <Stat label="À valider" value={snapshot.summary.warn} tone={snapshot.summary.warn ? 'warn' : 'good'} />
        <Stat label="À corriger" value={snapshot.summary.bad} tone={snapshot.summary.bad ? 'bad' : 'good'} />
        <Stat label="Issues IA" value={snapshot.summary.totalIssues} tone={snapshot.summary.totalIssues ? 'warn' : 'good'} />
        <Stat label="Logs audit" value={data.auditLogCount} />
      </div>
      <SystemIaPanel findings={snapshot.uxFindings} onApply={onApply} busyId={busyId} setTab={setTab} />
      <PriorityModulesPanel modules={snapshot.priorityModules} onNavigate={onNavigate} />
      <Section icon={Settings} title="Contrôles système">{checks.map((item) => <Row key={item.title} {...item} />)}</Section>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab('Audit')} className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">Lancer audit complet</button>
        <button type="button" onClick={() => setTab('Sauvegardes')} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415]">Sync & sauvegardes</button>
      </div>
    </div>
  );
}

function ResetDataSection({ canManage, onClearAllData }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = canManage && confirm.trim().toUpperCase() === 'SUPPRIMER LES DONNEES' && typeof onClearAllData === 'function';
  const run = async () => {
    if (!allowed) return;
    setBusy(true);
    try {
      await onClearAllData();
      setConfirm('');
    } finally {
      setBusy(false);
    }
  };
  return <div className="space-y-5"><Section icon={Database} title="Réinitialisation des données"><div className="space-y-4"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><b>Action sensible :</b> cette action masque immédiatement les données dans l'ERP, supprime les enregistrements et désactive le mode démonstration.</div><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Row title="Portée" detail="Ventes, clients, élevage, cultures, stock, finance, documents, tâches, alertes, événements et autres données applicatives." value="Données" tone="bad" /><Row title="Structure" detail="Les tables, colonnes, relations et configurations techniques restent en place." value="Conservée" tone="good" /></div><label className="block space-y-2"><span className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Confirmation requise</span><input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SUPPRIMER LES DONNEES" className="w-full rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm outline-none focus:border-red-300" /></label><button type="button" disabled={!allowed || busy} onClick={run} className="rounded-2xl border border-red-200 bg-red-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={16} className="inline mr-2" />{busy ? 'Suppression...' : 'Supprimer toutes les données'}</button></div></Section></div>;
}

export default function GestionSystemeUnified({ equipements = [], transactions = [], documents = [], tasks = [], alertes = [], businessEvents = [], businessEventsAll = [], auditLogs = [], auditLogsAll = [], users = [], profiles = [], farm = {}, ferme = {}, online = true, lastOnlineAt, onRefreshAll, onFlushOffline, onClearAllData, dataMap: visionDataMap = {}, periodScope, periodFiltered = false, periodLabel = '', onNavigate, onCreateTask, onCreateAlert, onUpdateAlert, onCreateBusinessEvent, existingTasks = [], existingAlerts = [], initialTab = 'Vue admin', onTabChange, accessibleFarms = [], onFarmsChanged, companyId = null, farmsPanelAction = null, farmComparisonData = null, onManageFarms }) {
  const { role, user } = useAuth();
  const { dataMap, deleteRecord } = useAppData();
  const [internalTab, setInternalTab] = useState(initialTab || 'Vue admin');
  const tab = onTabChange ? (initialTab || 'Vue admin') : internalTab;
  const setTab = onTabChange || setInternalTab;
  const [busyId, setBusyId] = useState(null);
  const canManage = canPerformSystemAction(role, 'modifier');
  const farmInfo = farm || ferme || {};
  const effectiveDataMap = useMemo(() => {
    if (Object.keys(visionDataMap).length) return visionDataMap;
    if (!periodFiltered || isAllTimeScope(periodScope)) return dataMap;
    return applyPeriodScopeToDataMap(dataMap, periodScope);
  }, [visionDataMap, dataMap, periodFiltered, periodScope]);
  const auditRows = arr(auditLogsAll).length ? arr(auditLogsAll) : arr(auditLogs);
  const eventRows = arr(businessEventsAll).length ? arr(businessEventsAll) : arr(businessEvents);
  const snapshot = useMemo(() => buildGestionSystemeSnapshot(effectiveDataMap), [effectiveDataMap]);
  const coherenceRows = useMemo(() => buildGestionSystemeCoherenceRows(snapshot), [snapshot]);
  const actionHandlers = { onNavigate, onCreateTask, onCreateAlert, onUpdateAlert, onCreateBusinessEvent, existingTasks, existingAlerts };
  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else toast.success('Module ouvert');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const clearAllData = useCallback(async () => {
    setSimulatedDataMode(false);
    const entries = Object.entries(dataMap || {}).filter(([moduleKey, rows]) => !RESET_SKIP_KEYS.has(moduleKey) && Array.isArray(rows) && rows.length > 0);
    entries.forEach(([moduleKey, rows]) => markHiddenLocally(moduleKey, rows));
    window.dispatchEvent(new CustomEvent('horizon-farm-data-mode-changed'));
    if (typeof onClearAllData === 'function') return onClearAllData();
    await Promise.allSettled(entries.flatMap(([moduleKey, rows]) => rows.map((row) => { const rowId = idOf(row); return rowId ? deleteRecord(moduleKey, rowId) : Promise.resolve(); })));
    window.dispatchEvent(new CustomEvent('horizon-farm-data-mode-changed'));
    return true;
  }, [dataMap, deleteRecord, onClearAllData]);
  const checks = [
    { title: 'Accès utilisateur', detail: canManage ? 'Le rôle actuel peut administrer les réglages.' : 'Le rôle actuel est limité en lecture.', value: canManage ? 'Admin' : 'Lecture', tone: canManage ? 'good' : 'warn' },
    { title: 'Données financières', detail: `${count(transactions)} mouvement(s) suivis dans Finance & Pilotage.`, value: 'Suivi' },
    { title: 'Documents', detail: `${count(documents)} document(s) suivis dans Documents & Rapports.`, value: 'Suivi' },
    { title: 'Ressources', detail: `${count(equipements)} équipement(s) suivis dans Opérations & Ressources.`, value: 'Suivi' },
    { title: 'Actions', detail: `${count(tasks)} tâche(s) suivie(s), ${arr(tasks).filter(open).length} ouverte(s).`, value: 'Suivi' },
  ];
  const adminData = { auditLogCount: count(auditRows) };
  const content = tab === 'Vue admin' ? <AdminOverview data={adminData} checks={checks} snapshot={snapshot} setTab={setTab} onApply={applyFinding} busyId={busyId} onNavigate={onNavigate} />
  : tab === 'Fermes' ? <FarmsManagementPanel user={user} companyId={companyId} accessibleFarms={accessibleFarms} onFarmsChanged={onFarmsChanged} initialAction={farmsPanelAction} farmComparisonData={farmComparisonData} onManageFarms={onManageFarms} onNavigate={onNavigate} />
  : tab === 'Utilisateurs' ? <div className="space-y-5"><Section icon={UserCog} title="Utilisateurs"><Row title="Utilisateur connecté" detail={user?.email || 'Compte courant'} value={role || 'Utilisateur'} tone={canManage ? 'good' : 'warn'} /><Row title="Profils connus" detail={`${count(users) || count(profiles)} profil(s) disponible(s) dans les données reçues.`} value="Suivi" /><Row title="Permissions" detail="Les actions sensibles restent contrôlées par les rôles système." value={canManage ? 'Modifiable' : 'Lecture'} tone={canManage ? 'good' : 'warn'} /></Section><ActionNote>Prochaine étape fonctionnelle : brancher la gestion réelle des rôles, invitations et permissions par module.</ActionNote></div>
  : tab === 'Paramètres' ? <div className="space-y-5"><Section icon={MapPin} title="Paramètres exploitation"><Row title="Nom ferme" detail={farmInfo.nom || farmInfo.name || 'À renseigner'} value="Profil" /><Row title="Localisation" detail={farmInfo.localisation || farmInfo.location || farmInfo.ville || farmInfo.city || 'Quartier, ville, pays à renseigner'} value="Adresse" /><Row title="Devise" detail={farmInfo.devise || farmInfo.currency || 'FCFA'} value="Finance" /><Row title="Unités" detail="Poids, quantités, surfaces et production doivent rester harmonisés." value="Standard" /></Section><ActionNote>Ces paramètres doivent devenir la source officielle du Dashboard, documents, factures et rapports.</ActionNote></div>
  : tab === 'Sécurité' ? <div className="space-y-5"><SystemAccessAuditPanel role={role} auditLogs={auditRows} users={users.length ? users : profiles} /><Section icon={Lock} title="Sécurité"><Row title="Niveau d’accès" detail={canManage ? 'Accès administrateur détecté.' : 'Accès limité aux données visibles.'} value={canManage ? 'Admin' : 'Lecture'} tone={canManage ? 'good' : 'warn'} /><Row title="Actions sensibles" detail="Suppression, rôles, sauvegardes et restauration demandent confirmation." value="Protégé" /><Row title="Traçabilité" detail={`${count(auditRows)} log(s) d’audit disponible(s).`} value="Audit" /></Section></div>
  : tab === 'Sauvegardes' ? <div className="space-y-5"><Section icon={Wifi} title="Synchronisation"><Row title="Connexion" detail={lastOnlineAt ? `Dernière connexion : ${lastOnlineAt}` : 'État actuel de l’application'} value={online ? 'En ligne' : 'Hors ligne'} tone={online ? 'good' : 'warn'} /><Row title="Actions ouvertes" detail={`${arr(tasks).filter(open).length} tâche(s), ${arr(alertes).filter(open).length} alerte(s)`} value="À suivre" /><Row title="Événements récents" detail={`${count(eventRows)} événement(s) métier suivi(s).`} value="Historique" /></Section><div className="flex flex-wrap gap-2"><button type="button" onClick={onRefreshAll} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415]">Actualiser les données</button><button type="button" onClick={onFlushOffline} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415]">Synchroniser hors ligne</button></div><ActionNote>La sauvegarde/restauration réelle doit être branchée uniquement côté administrateur.</ActionNote></div>
  : tab === 'Réinitialisation' ? <ResetDataSection canManage={canManage} onClearAllData={clearAllData} />
  : <div className="space-y-5"><WorkflowQualityPanel dataMap={effectiveDataMap} onNavigate={onNavigate} /><VisionModuleAuditPanel dataMap={effectiveDataMap} onNavigate={onNavigate} /><JustifiedExceptionsAuditPanel onCreateBusinessEvent={onCreateBusinessEvent} onRefreshBusinessEvents={onRefreshAll} />{coherenceRows.length ? <Section icon={Zap} title="Actions audit rapides">{coherenceRows.slice(0, 6).map((row) => <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></div><div className="flex gap-2">{row.moduleId ? <button type="button" onClick={() => onNavigate?.(row.moduleId)} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Ouvrir</button> : null}<button type="button" disabled={busyId === row.id} onClick={() => row.finding && applyFinding(row.finding)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === row.id ? '…' : 'Créer tâche'}</button></div></div>)}</Section> : null}<Section icon={ClipboardList} title="Journal audit technique">{auditRows.length ? auditRows.slice(0, 12).map((log) => <Row key={log.id || labelOf(log)} title={labelOf(log)} detail={`${dateOf(log)} · ${log.module || log.module_source || log.actor || 'ERP'}`} value={log.action || log.event_type || 'Log'} />) : <ActionNote>Aucun log d'audit détaillé reçu. Les événements métier restent visibles dans Activité & Suivi.</ActionNote>}</Section></div>;
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Administration</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Gestion du système</h1><p className="mt-1 text-sm text-[#8a7456]">Audit vision ERP, sécurité, synchronisation — pilotage administrateur.</p>{periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}</div><div className="flex flex-wrap items-center gap-2"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={snapshot.systemScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{snapshot.systemScore}/100</b></div><div className={`rounded-2xl border px-4 py-3 text-sm font-black ${canManage ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{canManage ? <ShieldCheck size={16} className="inline mr-1" /> : <ShieldAlert size={16} className="inline mr-1" />}{canManage ? 'Actions admin autorisées' : 'Lecture seule'}</div></div></div></section><Tabs active={tab} setActive={setTab} />{content}</div>;
}
