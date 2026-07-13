import { ShieldCheck, UserCog } from 'lucide-react';
import { useMemo } from 'react';
import { ROLE_PERMISSIONS } from '../context/AuthContext';
import { canPerformSystemAction, roleCanAccess } from '../utils/systemAccessWorkflows';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();

const MODULE_LABELS = {
  dashboard: 'Accueil',
  assistant_erp: 'Hey Horizon',
  centre_ia: 'Centre décisionnel',
  gestion_systeme: 'Gestion système',
  finance_pilotage: 'Finance',
  smartfarm: 'Smart Farm',
};

function auditAccessMatrix(role = 'visiteur') {
  const modules = Object.keys(MODULE_LABELS);
  return modules.map((moduleKey) => ({
    moduleKey,
    label: MODULE_LABELS[moduleKey],
    allowed: roleCanAccess(role, moduleKey),
    serverEnforced: moduleKey === 'gestion_systeme' ? canPerformSystemAction(role, 'modifier') : roleCanAccess(role, moduleKey),
  }));
}

export default function SystemAccessAuditPanel({ role = 'visiteur', auditLogs = [], users = [] }) {
  const matrix = useMemo(() => auditAccessMatrix(role), [role]);
  const adminLogs = useMemo(() => arr(auditLogs).filter((row) => clean(row.module || row.module_source).includes('gestion') || clean(row.action).includes('system_')).slice(0, 10), [auditLogs]);
  const activeAdmins = arr(users).filter((user) => user.role === 'admin' && !['inactif', 'inactive'].includes(clean(user.statut || user.status))).length;
  const rolePermissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.visiteur || [];

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-slate">
          <ShieldCheck size={14} /> RBAC & traces admin
        </p>
        <h3 className="mt-3 text-xl font-semibold text-earth">Contrôle des accès</h3>
        <p className="mt-1 text-sm text-slate">Rôle courant : <b>{role}</b> · {activeAdmins} admin(s) actif(s) · permissions {rolePermissions.includes('*') ? 'complètes' : rolePermissions.length} module(s).</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {matrix.map((row) => (
          <div key={row.moduleKey} className={`rounded-xl border px-3 py-2 text-sm ${row.allowed ? 'border-positive bg-positive-bg text-positive' : 'border-vigilance bg-vigilance-bg text-horizon-dark'}`}>
            <b>{row.label}</b>
            <p className="text-xs mt-1">{row.allowed ? 'Accès autorisé' : 'Accès restreint'} · {row.serverEnforced ? 'contrôle actif' : 'à renforcer côté serveur'}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth flex items-center gap-2"><UserCog size={16} /> Traces administration récentes</p>
        {adminLogs.length ? (
          <ul className="mt-3 space-y-2 text-sm text-slate">
            {adminLogs.map((log) => (
              <li key={log.id || `${log.action}-${log.created_at}`} className="rounded-xl border border-line bg-white px-3 py-2">
                <b className="text-earth">{log.title || log.action}</b>
                <p className="text-xs">{String(log.created_at || log.date || '—').slice(0, 19)} · {log.actor_email || log.actor || 'ERP'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate">Aucune trace admin récente. Les modifications utilisateurs doivent être journalisées via Gestion système.</p>
        )}
      </div>
    </section>
  );
}
