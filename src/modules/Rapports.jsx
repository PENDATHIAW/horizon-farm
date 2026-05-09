import { BarChart2, FileText, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import RapportsAutoBridge from './RapportsAutoBridge.jsx';

export default function Rapports(props) {
  const rows = props.rows || [];
  const onRefresh = async () => {
    await props.onRefresh?.();
    toast.success('Rapports actualisés');
  };

  return (
    <div className="space-y-6">
      <RapportsAutoBridge
        rows={rows}
        data={props.data || {}}
        onCreate={props.onCreate}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
        onCreateDocument={props.onCreateDocument}
        onRefreshDocuments={props.onRefreshDocuments}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
      <GenericCrudModule
        {...props}
        onRefresh={onRefresh}
        moduleKey="rapports"
        title="Rapports Automatiques"
        sub="Rapports hebdo, mensuels, rentabilité et production"
        fields={MODULE_FORM_FIELDS.rapports}
        columns={['id', 'title', 'report_type', 'period', 'status', 'channel']}
        initialValues={{ status: 'programme', channel: 'PDF' }}
        uploadFolder="rapports"
        addLabel="Programmer rapport"
        exportTitle="Rapports Horizon Farm"
        kpis={[
          { icon: FileText, label: 'Rapports', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
          { icon: MessageCircle, label: 'WhatsApp', value: rows.filter((r) => r.channel === 'WhatsApp').length, color: 'bg-[#25D366]/20 text-[#1EA952]' },
          { icon: Send, label: 'Envoyés', value: rows.filter((r) => r.status === 'envoye').length, color: 'bg-emerald-500/20 text-emerald-500' },
          { icon: BarChart2, label: 'Générés', value: rows.filter((r) => r.status === 'genere').length, color: 'bg-amber-500/20 text-amber-500' },
        ]}
      />
    </div>
  );
}
