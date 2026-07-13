import { AlertTriangle, CheckCircle2, GitBranch, History, Lock, MonitorSmartphone, UserCheck } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import KpiCard from '../components/KpiCard';
import ModuleTimeline from '../components/ModuleTimeline';
import useCrudModule from '../hooks/useCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const sensitiveActions = ['suppression', 'delete', 'connexion', 'login', 'paiement', 'payment', 'workflow_valide'];
const keyOf = (row = {}) => `${clean(row.module || row.module_source)}:${clean(row.action || row.event_type)}:${clean(row.record_id || row.entity_id || row.id)}`;

function groupByModule(rows = []) {
  const map = new Map();
  arr(rows).forEach((row) => {
    const module = clean(row.module || row.module_source || 'ERP');
    map.set(module, (map.get(module) || 0) + 1);
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function RecentTrace({ auditRows = [], eventRows = [] }) {
  const combined = [...arr(auditRows), ...arr(eventRows)]
    .map((row) => ({ ...row, _key: keyOf(row), _date: row.created_at || row.event_date || row.updated_at || '' }))
    .filter((row, index, list) => list.findIndex((item) => item._key === row._key) === index)
    .sort((a, b) => String(b._date).localeCompare(String(a._date)))
    .slice(0, 8);

  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-normal text-slate">Traçabilité</p><h3 className="font-semibold text-earth">Dernières actions ERP</h3></div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate"><GitBranch size={14} className="inline" /> {combined.length} action(s)</div>
      </div>
      {combined.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">{combined.map((row) => <div key={row.id || row._key} className="rounded-xl border border-line bg-card p-3"><p className="font-semibold text-earth truncate"><CheckCircle2 size={14} className="inline text-positive" /> {row.title || row.action || row.event_type || 'Action'}</p><p className="text-xs text-slate mt-1 truncate">{row.module || row.module_source || 'ERP'} · {row.actor || row.entity_type || ''}</p><p className="text-xs text-slate mt-1">{row._date || 'date non renseignée'}</p></div>)}</div> : <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate">Aucune action récente.</div>}
    </div>
  );
}

function ModuleActivity({ rows = [], events = [] }) {
  const grouped = groupByModule([...arr(rows), ...arr(events)]);
  if (!grouped.length) return null;
  return <div className="rounded-2xl border border-line bg-white p-6"><p className="font-semibold text-earth mb-3">Modules les plus actifs</p><div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">{grouped.map(([module, count]) => <div key={module} className="rounded-xl border border-line bg-card p-3"><p className="text-xs text-slate truncate">{module}</p><p className="text-xl font-semibold text-earth">{count}</p></div>)}</div></div>;
}

export default function AuditLogs(props) {
  const rows = props.rows || [];
  const eventsCrud = useCrudModule('business_events');
  const eventRows = eventsCrud.rows || [];
  const uniqueKeys = new Set(rows.map(keyOf)).size;
  const sensitiveCount = rows.filter((r) => sensitiveActions.includes(String(r.action || '').toLowerCase())).length;
  const timelineRows = [...arr(rows), ...arr(eventRows)].map((row) => ({ ...row, title: row.title || row.action || row.event_type || 'Action ERP', description: `${row.module || row.module_source || 'ERP'} · ${row.actor || row.entity_type || ''}`, status: row.severity || row.status || row.action }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={History} label="Actions tracées" value={rows.length} color="bg-neutral text-neutral" />
        <KpiCard icon={UserCheck} label="Utilisateurs" value={new Set(rows.map((r) => r.actor).filter(Boolean)).size} color="bg-positive text-positive" />
        <KpiCard icon={MonitorSmartphone} label="Appareils" value={new Set(rows.map((r) => r.device).filter(Boolean)).size} color="bg-vigilance text-horizon-dark" />
        <KpiCard icon={Lock} label="Sensibles" value={sensitiveCount} color="bg-urgent text-urgent" />
      </div>

      <ModuleTimeline title="Timeline audit & traçabilité" subtitle="Journal chronologique des actions ERP, événements métier et opérations sensibles." rows={timelineRows} onRefresh={eventsCrud.refresh} onNavigate={() => props.onNavigate?.('audit_logs')} navigateLabel="Ouvrir audit" />
      <RecentTrace auditRows={rows} eventRows={eventRows} />
      <ModuleActivity rows={rows} events={eventRows} />

      {uniqueKeys < rows.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark"><AlertTriangle size={16} className="inline" /> Certaines actions semblent répétées. À vérifier avant validation finale.</div> : null}

      <GenericCrudModule {...props} moduleKey="audit_logs" title="Journal activité & sécurité" sub="Actions, utilisateurs, appareils et contrôles sensibles" fields={MODULE_FORM_FIELDS.audit_logs} columns={['id', 'actor', 'action', 'module', 'record_id', 'device', 'created_at']} readOnly exportTitle="Journal activite Horizon Farm" kpis={[]} />
    </div>
  );
}
