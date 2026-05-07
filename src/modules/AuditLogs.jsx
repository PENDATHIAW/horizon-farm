import { History, Lock, MonitorSmartphone, UserCheck } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';

export default function AuditLogs(props) {
  const rows = props.rows || [];
  return (
    <GenericCrudModule
      {...props}
      moduleKey="audit_logs"
      title="Audit Logs & Securite"
      sub="Qui a modifie quoi - quand - depuis quel appareil"
      fields={MODULE_FORM_FIELDS.audit_logs}
      columns={['id', 'actor', 'action', 'module', 'record_id', 'device', 'created_at']}
      readOnly
      exportTitle="Audit logs Horizon Farm"
      kpis={[
        { icon: History, label: 'Actions tracees', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
        { icon: UserCheck, label: 'Utilisateurs', value: new Set(rows.map((r) => r.actor)).size, color: 'bg-emerald-500/20 text-emerald-500' },
        { icon: MonitorSmartphone, label: 'Appareils', value: new Set(rows.map((r) => r.device)).size, color: 'bg-amber-500/20 text-amber-500' },
        { icon: Lock, label: 'Sensible', value: rows.filter((r) => ['suppression', 'connexion'].includes(r.action)).length, color: 'bg-red-500/20 text-red-500' },
      ]}
    />
  );
}
