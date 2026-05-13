import { History, Wifi } from 'lucide-react';
import AuditLogs from './AuditLogs.jsx';
import Sync from './Sync.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function SyncActivityCenter(props) {
  return <div className="space-y-6 sync-activity-mobile">
    <style>{`@media (max-width: 640px){.sync-activity-mobile .rounded-2xl{border-radius:18px}.sync-activity-mobile table{font-size:12px}.sync-activity-mobile th,.sync-activity-mobile td{padding-left:10px!important;padding-right:10px!important}.sync-activity-mobile .text-2xl{font-size:1.35rem}.sync-activity-mobile .grid{gap:.75rem}.sync-activity-mobile .overflow-x-auto{max-width:100vw}}`}</style>
    <ModuleSection icon={Wifi} title="Synchronisation & offline" subtitle="File locale, backup, synchronisation, conflits et données disponibles hors ligne.">
      <Sync {...props} />
    </ModuleSection>
    <ModuleSection icon={History} title="Activité, audit et sécurité" subtitle="Actions utilisateurs, événements métier, traces sensibles et journal système.">
      <AuditLogs rows={props.auditLogs || []} loading={props.auditLoading} onRefresh={props.onRefreshAuditLogs} onNavigate={props.onNavigate} />
    </ModuleSection>
  </div>;
}
