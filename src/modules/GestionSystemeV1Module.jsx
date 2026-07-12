import { BookOpen, Database, LockKeyhole, Settings, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import VisionModuleAuditPanel from '../components/module/VisionModuleAuditPanel.jsx';
import JustifiedExceptionsAuditPanel from '../components/workflow/JustifiedExceptionsAuditPanel.jsx';
import WorkflowQualityPanel from '../components/workflow/WorkflowQualityPanel.jsx';
import { FLAGGED_MODULES, persistModuleFlags, resolveModuleFlags } from '../config/moduleFlags.js';
import { ERP_ROLES } from '../config/moduleTabs/shared.js';
import { useAuth } from '../context/AuthContext.jsx';
import { farmsService } from '../services/farmsService.js';
import { resolveGestionSystemeTab } from '../utils/commercialNavigation.js';
import FarmsManagementPanel from './farms/FarmsManagementPanel.jsx';
import SyncActivityCenter from './SyncActivityCenter.jsx';
import SystemAccessAuditPanel from './SystemAccessAuditPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const ROLE_LABELS = {
  promotrice_direction: 'Direction',
  responsable_filiere: 'Responsable de filière',
  terrain: 'Équipe terrain',
  finance: 'Finance',
  veterinaire: 'Vétérinaire',
  maintenance: 'Maintenance',
  financeur_externe: 'Financeur externe',
  admin_support: 'Administration et support',
};
const ROLE_SCOPES = {
  promotrice_direction: 'Pilotage, validation et administration des fermes',
  responsable_filiere: 'Opérations et décisions de sa filière',
  terrain: 'Saisies et tâches terrain',
  finance: 'Transactions, trésorerie, budgets et rapports financiers',
  veterinaire: 'Santé, biosécurité et interventions vétérinaires',
  maintenance: 'Équipements, pannes et réparations',
  financeur_externe: 'Espace Financements publié, en lecture seule',
  admin_support: 'Utilisateurs, référentiels, synchronisation et audit',
};
const MODULE_LABELS = { agri_feeds: 'AGRI FEEDS', smartfarm: 'Smart Farm', financements: 'Financements', assistant_erp: 'Assistant ERP' };

function Section({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="flex items-center gap-2 font-black text-[#2f2415]"><Icon size={19} />{title}</h2>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function UsersAccessView({ user, role, users = [], profiles = [] }) {
  const rows = arr(users).length ? arr(users) : arr(profiles);
  return <Section icon={Users} title="Utilisateurs & accès" subtitle="Un compte utilisateur peut être lié à un employé, mais reste géré séparément."><div className="divide-y divide-[#eadcc2]"><div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-black text-[#2f2415]">{user?.email || 'Compte courant'}</p><p className="text-sm text-[#8a7456]">Session active</p></div><span className="text-sm font-bold text-emerald-700">{role || 'Utilisateur'}</span></div>{rows.map((profile) => <div key={profile.id || profile.email} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-black text-[#2f2415]">{profile.nom || profile.name || profile.email || profile.id}</p><p className="text-sm text-[#8a7456]">{profile.email || 'Courriel non renseigné'}</p></div><span className="text-sm font-bold text-[#6f6048]">{profile.role || profile.access_role || 'Accès standard'}</span></div>)}{!rows.length ? <p className="py-4 text-sm text-[#8a7456]">Aucun autre profil reçu.</p> : null}</div></Section>;
}

function RolesPermissionsView() {
  return <Section icon={ShieldCheck} title="Rôles & permissions" subtitle="Huit rôles définissent les accès; les politiques Supabase restent la protection finale."><div className="grid gap-3 md:grid-cols-2">{ERP_ROLES.map((role) => <div key={role} className="border-l-4 border-[#22c55e] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{ROLE_LABELS[role]}</p><p className="mt-1 text-sm text-[#8a7456]">{ROLE_SCOPES[role]}</p></div>)}</div></Section>;
}

function ModulesActivationView({ activeFarm, onFarmsChanged }) {
  const [flags, setFlags] = useState(() => resolveModuleFlags(activeFarm));
  const [busy, setBusy] = useState('');
  const change = async (moduleId, enabled) => {
    if (!activeFarm?.id) return toast.error('Ferme active requise');
    const next = { ...flags, [moduleId]: enabled };
    setFlags(next);
    setBusy(moduleId);
    try {
      await farmsService.updateFarm(activeFarm.id, { settings: { ...(activeFarm.settings || {}), modules: next } });
      persistModuleFlags(next);
      await onFarmsChanged?.();
      toast.success(`${MODULE_LABELS[moduleId]} ${enabled ? 'activé' : 'désactivé'}`);
    } catch (error) {
      setFlags(flags);
      toast.error(error?.message || 'Mise à jour impossible');
    } finally {
      setBusy('');
    }
  };
  return <Section icon={SlidersHorizontal} title="Modules & activation" subtitle="Réglages propres à la ferme active. Un module désactivé ne charge pas ses données."><div className="divide-y divide-[#eadcc2]">{Object.keys(FLAGGED_MODULES).map((moduleId) => <label key={moduleId} className="flex items-center justify-between gap-4 py-4"><span><span className="block font-black text-[#2f2415]">{MODULE_LABELS[moduleId]}</span><span className="text-sm text-[#8a7456]">{flags[moduleId] ? 'Disponible pour cette ferme' : 'Masqué et non chargé'}</span></span><input type="checkbox" checked={Boolean(flags[moduleId])} disabled={busy === moduleId} onChange={(event) => change(moduleId, event.target.checked)} className="h-5 w-5 accent-emerald-600" /></label>)}</div></Section>;
}

function SettingsView({ farm = {}, onNavigate }) {
  return <Section icon={Settings} title="Paramètres" subtitle="Profil opérationnel de la ferme active."><div className="grid gap-3 md:grid-cols-2"><div className="border-l-4 border-[#c9a96a] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Ferme</p><p className="font-black text-[#2f2415]">{farm.name || farm.nom || 'À renseigner'}</p></div><div className="border-l-4 border-[#c9a96a] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Localisation</p><p className="font-black text-[#2f2415]">{farm.location || farm.localisation || 'À renseigner'}</p></div><div className="border-l-4 border-[#c9a96a] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Devise</p><p className="font-black text-[#2f2415]">{farm.settings?.currency || 'FCFA'}</p></div><div className="border-l-4 border-[#c9a96a] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Pays</p><p className="font-black text-[#2f2415]">{farm.country || 'SN'}</p></div></div><button type="button" onClick={() => onNavigate?.('gestion_systeme', { tab: 'Fermes' })} className="mt-4 rounded-lg border border-[#d6c3a0] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Modifier la ferme</button></Section>;
}

function ReferencesView({ dataMap = {} }) {
  const refs = [
    ['Clients', dataMap.clients], ['Fournisseurs', dataMap.fournisseurs], ['Produits', dataMap.stock || dataMap.stocks], ['Équipements', dataMap.equipements], ['Parcelles', dataMap.cultures], ['Lots & animaux', [...arr(dataMap.avicole), ...arr(dataMap.animaux)]],
  ];
  return <Section icon={BookOpen} title="Référentiels" subtitle="Listes partagées utilisées par les formulaires métier."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{refs.map(([label, values]) => <div key={label} className="border-l-4 border-[#22c55e] bg-[#fffdf8] p-4"><p className="text-sm font-bold text-[#8a7456]">{label}</p><p className="text-xl font-black text-[#2f2415]">{arr(values).length}</p></div>)}</div></Section>;
}

function CatalogsView({ dataMap = {} }) {
  const kpis = arr(dataMap.kpi_catalog || dataMap.kpis_catalog);
  const alerts = arr(dataMap.alert_rules || dataMap.alert_catalog);
  return <Section icon={Database} title="Catalogues KPI & alertes" subtitle="Définitions centrales utilisées par les modules, sans formule locale concurrente."><div className="grid gap-3 md:grid-cols-2"><div className="border-l-4 border-[#22c55e] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">Catalogue KPI</p><p className="mt-1 text-sm text-[#8a7456]">{kpis.length} définition(s) disponible(s)</p></div><div className="border-l-4 border-amber-500 bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">Catalogue d’alertes</p><p className="mt-1 text-sm text-[#8a7456]">{alerts.length} règle(s) disponible(s)</p></div></div></Section>;
}

export default function GestionSystemeV1Module(props) {
  const { role, user } = useAuth();
  const controlled = Boolean(props.onTabChange);
  const onTabChange = props.onTabChange;
  const [internalTab, setInternalTab] = useState(() => resolveGestionSystemeTab(props.initialTab || 'Fermes'));
  const tab = controlled ? resolveGestionSystemeTab(props.initialTab || 'Fermes') : internalTab;
  const activeFarm = props.activeFarm || props.farm || props.ferme || {};
  const dataMap = useMemo(() => props.dataMap || {}, [props.dataMap]);
  const auditRows = arr(props.auditLogsAll).length ? arr(props.auditLogsAll) : arr(props.auditLogs);

  const setTab = useCallback((value) => {
    const resolved = resolveGestionSystemeTab(value);
    if (controlled) onTabChange?.(value || resolved);
    else setInternalTab(resolved);
  }, [controlled, onTabChange]);

  const auditView = <div className="space-y-5"><SystemAccessAuditPanel role={role} auditLogs={auditRows} users={arr(props.users).length ? props.users : props.profiles} /><WorkflowQualityPanel dataMap={dataMap} onNavigate={props.onNavigate} /><VisionModuleAuditPanel dataMap={dataMap} onNavigate={props.onNavigate} /><JustifiedExceptionsAuditPanel onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshBusinessEvents={props.onRefreshAll} /></div>;
  const content = tab === 'SystemUsersAccessView' ? <UsersAccessView user={user} role={role} users={props.users} profiles={props.profiles} />
    : tab === 'SystemRolesPermissionsView' ? <RolesPermissionsView />
      : tab === 'SystemModulesActivationView' ? <ModulesActivationView key={activeFarm.id || 'default'} activeFarm={activeFarm} onFarmsChanged={props.onFarmsChanged} />
        : tab === 'SystemSettingsView' ? <SettingsView farm={activeFarm} onNavigate={props.onNavigate} />
          : tab === 'SystemReferencesView' ? <ReferencesView dataMap={dataMap} />
            : tab === 'SystemCatalogsView' ? <CatalogsView dataMap={dataMap} />
              : tab === 'SystemSyncView' ? <SyncActivityCenter {...(props.syncProps || props)} embedded />
                : tab === 'SystemAuditSecurityView' ? auditView
                  : <FarmsManagementPanel user={user} companyId={props.companyId} accessibleFarms={props.accessibleFarms} onFarmsChanged={props.onFarmsChanged} initialAction={props.farmsPanelAction} farmComparisonData={props.farmComparisonData} onManageFarms={props.onManageFarms} onNavigate={props.onNavigate} />;

  return <div className="space-y-6"><header className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><LockKeyhole className="text-[#9a6b12]" size={24} /><div><p className="text-xs font-black uppercase text-[#9a6b12]">Administration</p><h1 className="text-2xl font-black text-[#2f2415]">Gestion du système</h1><p className="text-sm text-[#8a7456]">Fermes, accès, référentiels, synchronisation et sécurité.</p></div></div></header><ModuleTabsBar moduleId="gestion_systeme" active={tab} onChange={setTab} wrap />{content}</div>;
}
