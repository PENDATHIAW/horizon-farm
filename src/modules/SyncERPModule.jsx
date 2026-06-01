import { ClipboardList, FileSearch, RefreshCw, ScrollText, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import ErpAuditPanel from './ErpAuditPanel.jsx';
import GitHubAuditRoadmapPanel from './GitHubAuditRoadmapPanel.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const open = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'résolu', 'resolu'].includes(String(r.status || r.statut || '').toLowerCase());
const late = (r = {}) => ['retard', 'overdue'].includes(String(r.status || r.statut || '').toLowerCase());
const labelOf = (row = {}) => row.title || row.action || row.event_type || row.module || row.id || 'Entrée';

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}

function Row({ title, detail, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <div className="grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center"><b className="text-[#2f2415]">{title}</b><span className="text-sm text-[#8a7456]">{detail}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{value}</span></div>;
}

export default function SyncERPModule({
  online = true,
  lastOnlineAt,
  periodLabel = '',
  tasks = [],
  alertes = [],
  businessEvents = [],
  businessEventsAll = [],
  auditLogs = [],
  auditLogsAll = [],
  onRefreshAll,
  onFlushOffline,
  onNavigate,
}) {
  const openTasks = arr(tasks).filter(open);
  const lateTasks = arr(tasks).filter(late);
  const openAlerts = arr(alertes).filter(open);
  const activityFeed = arr(businessEventsAll).length ? arr(businessEventsAll) : arr(businessEvents);
  const recentEvents = activityFeed.slice(0, 8);
  const logs = arr(auditLogsAll).length ? arr(auditLogsAll) : arr(auditLogs);
  const recentLogs = logs.slice(0, 12);
  const auditCount = logs.length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Synchronisation</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Sync ERP</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Suivre l&apos;état de connexion, les actions en attente, le journal audit et les derniers événements.</p>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRefreshAll} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415]"><RefreshCw size={14} className="inline mr-1" /> Actualiser</button>
            <button type="button" onClick={onFlushOffline} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415]">Synchroniser</button>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Stat label="Connexion" value={online ? 'En ligne' : 'Hors ligne'} tone={online ? 'good' : 'warn'} />
        <Stat label="Tâches ouvertes" value={openTasks.length} tone={openTasks.length ? 'warn' : 'good'} />
        <Stat label="Retards" value={lateTasks.length} tone={lateTasks.length ? 'warn' : 'good'} />
        <Stat label="Alertes" value={openAlerts.length} tone={openAlerts.length ? 'warn' : 'good'} />
        <Stat label="Logs audit" value={auditCount} tone={auditCount ? 'good' : 'warn'} />
      </div>
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">{online ? <Wifi size={20} /> : <WifiOff size={20} />} État de synchronisation</h2>
        <div className="mt-4 space-y-1">
          <Row title="Connexion" detail={lastOnlineAt ? `Dernière connexion : ${lastOnlineAt}` : 'État actuel de l’application'} value={online ? 'OK' : 'À synchroniser'} tone={online ? 'good' : 'warn'} />
          <Row title="Actions terrain" detail={`${openTasks.length} tâche(s) ouverte(s), ${lateTasks.length} en retard`} value={lateTasks.length ? 'Priorité' : 'Suivi'} tone={lateTasks.length ? 'warn' : 'good'} />
          <Row title="Alertes" detail={`${openAlerts.length} alerte(s) non clôturée(s)`} value={openAlerts.length ? 'À traiter' : 'OK'} tone={openAlerts.length ? 'warn' : 'good'} />
          <Row title="Journal audit" detail={`${auditCount} entrée(s) enregistrée(s)`} value={auditCount ? 'Traçable' : 'À alimenter'} tone={auditCount ? 'good' : 'warn'} />
        </div>
      </section>
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><ScrollText size={20} /> Journal audit</h2>
        <div className="mt-4">
          {recentLogs.length ? recentLogs.map((log) => (
            <Row
              key={log.id || `${log.module}-${log.created_at}`}
              title={labelOf(log)}
              detail={`${log.module || log.module_source || '—'} · ${log.actor || log.user || 'système'} · ${log.created_at || log.date || '—'}`}
              value={log.status || log.action || 'log'}
            />
          )) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Aucun log audit visible. Les actions sensibles (ventes, finances, suppressions) doivent alimenter ce journal.
              {onNavigate ? (
                <button type="button" onClick={() => onNavigate('gestion_systeme', { tab: 'Audit' })} className="ml-2 rounded-lg border border-amber-300 px-2 py-1 text-xs font-black">Gestion système → Audit</button>
              ) : null}
            </div>
          )}
        </div>
      </section>
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><ClipboardList size={20} /> Dernière activité</h2>
        <div className="mt-4">
          {recentEvents.length ? recentEvents.map((event) => (
            <Row key={event.id || event.title} title={event.title || event.event_type || 'Événement'} detail={event.event_date || event.date || event.created_at || '—'} value={event.severity || 'Suivi'} />
          )) : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">Aucune activité récente.</div>}
        </div>
      </section>
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><FileSearch size={20} /> Audit inter-modules</h2>
        <p className="text-sm text-[#8a7456]">Générer la feuille de route GitHub et parcourir le manifest audit ERP depuis Sync.</p>
        <GitHubAuditRoadmapPanel />
        <ErpAuditPanel />
      </section>
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="flex items-center gap-2 font-black text-emerald-800"><ShieldCheck size={18} /> Règle utilisateur</h2>
        <p className="mt-1 text-sm text-emerald-800">Vérifiez connexion, journal audit et anomalies avant clôture de journée. Les détails techniques restent regroupés ici pour ne pas alourdir l’usage quotidien.</p>
      </section>
    </div>
  );
}
