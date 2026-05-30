import { ClipboardList, Database, Lock, MapPin, Settings, ShieldAlert, ShieldCheck, Trash2, UserCog, Wifi } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppContext';
import { rememberDeletedId } from '../utils/deletedRecords';
import { setSimulatedDataMode } from '../utils/uiPreferences';
import { canPerformSystemAction } from '../utils/systemAccessWorkflows';

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
function Tabs({ active, setActive }) { const tabs = ['Vue admin', 'Utilisateurs & rôles', 'Paramètres ferme', 'Sécurité', 'Sauvegarde & Sync', 'Réinitialisation', 'Audit']; return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActive(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}>{tab}</button>)}</div></div>; }
function ActionNote({ children }) { return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{children}</div>; }

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

export default function GestionSystemeUnified({ equipements = [], transactions = [], documents = [], tasks = [], alertes = [], businessEvents = [], auditLogs = [], users = [], profiles = [], farm = {}, ferme = {}, online = true, lastOnlineAt, onRefreshAll, onFlushOffline, onClearAllData }) {
  const { role, user } = useAuth();
  const { dataMap, deleteRecord } = useAppData();
  const [tab, setTab] = useState('Vue admin');
  const canManage = canPerformSystemAction(role, 'modifier');
  const farmInfo = farm || ferme || {};
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
  const content = tab === 'Vue admin' ? <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Rôle" value={role || 'Utilisateur'} tone={canManage ? 'good' : 'warn'} /><Stat label="Finances" value={count(transactions)} /><Stat label="Documents" value={count(documents)} /><Stat label="Alertes" value={count(alertes)} tone={count(alertes) ? 'warn' : 'good'} /><Stat label="Logs" value={count(auditLogs)} /></div><Section icon={Settings} title="Contrôles système">{checks.map((item) => <Row key={item.title} {...item} />)}</Section></div>
  : tab === 'Utilisateurs & rôles' ? <div className="space-y-5"><Section icon={UserCog} title="Utilisateurs & rôles"><Row title="Utilisateur connecté" detail={user?.email || 'Compte courant'} value={role || 'Utilisateur'} tone={canManage ? 'good' : 'warn'} /><Row title="Profils connus" detail={`${count(users) || count(profiles)} profil(s) disponible(s) dans les données reçues.`} value="Suivi" /><Row title="Permissions" detail="Les actions sensibles restent contrôlées par les rôles système." value={canManage ? 'Modifiable' : 'Lecture'} tone={canManage ? 'good' : 'warn'} /></Section><ActionNote>Prochaine étape fonctionnelle : brancher la gestion réelle des rôles, invitations et permissions par module.</ActionNote></div>
  : tab === 'Paramètres ferme' ? <div className="space-y-5"><Section icon={MapPin} title="Paramètres exploitation"><Row title="Nom ferme" detail={farmInfo.nom || farmInfo.name || 'À renseigner'} value="Profil" /><Row title="Localisation" detail={farmInfo.localisation || farmInfo.location || farmInfo.ville || farmInfo.city || 'Quartier, ville, pays à renseigner'} value="Adresse" /><Row title="Devise" detail={farmInfo.devise || farmInfo.currency || 'FCFA'} value="Finance" /><Row title="Unités" detail="Poids, quantités, surfaces et production doivent rester harmonisés." value="Standard" /></Section><ActionNote>Ces paramètres doivent devenir la source officielle du Dashboard, documents, factures et rapports.</ActionNote></div>
  : tab === 'Sécurité' ? <div className="space-y-5"><Section icon={Lock} title="Sécurité"><Row title="Niveau d’accès" detail={canManage ? 'Accès administrateur détecté.' : 'Accès limité aux données visibles.'} value={canManage ? 'Admin' : 'Lecture'} tone={canManage ? 'good' : 'warn'} /><Row title="Actions sensibles" detail="Suppression, rôles, sauvegardes et restauration demandent confirmation." value="Protégé" /><Row title="Traçabilité" detail={`${count(auditLogs)} log(s) d’audit disponible(s).`} value="Audit" /></Section></div>
  : tab === 'Sauvegarde & Sync' ? <div className="space-y-5"><Section icon={Wifi} title="Synchronisation"><Row title="Connexion" detail={lastOnlineAt ? `Dernière connexion : ${lastOnlineAt}` : 'État actuel de l’application'} value={online ? 'En ligne' : 'Hors ligne'} tone={online ? 'good' : 'warn'} /><Row title="Actions ouvertes" detail={`${arr(tasks).filter(open).length} tâche(s), ${arr(alertes).filter(open).length} alerte(s)`} value="À suivre" /><Row title="Événements récents" detail={`${count(businessEvents)} événement(s) métier suivi(s).`} value="Historique" /></Section><div className="flex flex-wrap gap-2"><button type="button" onClick={onRefreshAll} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415]">Actualiser ERP</button><button type="button" onClick={onFlushOffline} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415]">Synchroniser offline</button></div><ActionNote>La sauvegarde/restauration réelle doit être branchée uniquement côté administrateur.</ActionNote></div>
  : tab === 'Réinitialisation' ? <ResetDataSection canManage={canManage} onClearAllData={clearAllData} />
  : <div className="space-y-5"><Section icon={ClipboardList} title="Audit ERP">{arr(auditLogs).length ? arr(auditLogs).slice(0, 12).map((log) => <Row key={log.id || labelOf(log)} title={labelOf(log)} detail={`${dateOf(log)} · ${log.module || log.module_source || log.actor || 'ERP'}`} value={log.action || log.event_type || 'Log'} />) : <ActionNote>Aucun log d’audit détaillé reçu. Les événements métier restent visibles dans Activité & Suivi.</ActionNote>}</Section></div>;
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Administration</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Gestion du système</h1><p className="mt-1 text-sm text-[#8a7456]">Utilisateurs, paramètres ferme, sécurité, synchronisation, réinitialisation et audit ERP.</p></div><div className={`rounded-2xl border px-4 py-3 text-sm font-black ${canManage ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{canManage ? <ShieldCheck size={16} className="inline mr-1" /> : <ShieldAlert size={16} className="inline mr-1" />}{canManage ? 'Actions admin autorisées' : 'Lecture seule'}</div></div></section><Tabs active={tab} setActive={setTab} />{content}</div>;
}
