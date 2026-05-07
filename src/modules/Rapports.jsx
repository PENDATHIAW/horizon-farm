import { BarChart2, FileText, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';

export default function Rapports(props) {
  const rows = props.rows || [];
  const onRefresh = async () => {
    await props.onRefresh?.();
    toast.success('Rapports actualises - generation automatique prete');
  };

  return (
    <GenericCrudModule
      {...props}
      onRefresh={onRefresh}
      moduleKey="rapports"
      title="Rapports Automatiques"
      sub="Rapport hebdo WhatsApp - mensuel PDF - rentabilite - production"
      fields={MODULE_FORM_FIELDS.rapports}
      columns={['id', 'title', 'report_type', 'period', 'status', 'channel']}
      initialValues={{ status: 'programme', channel: 'PDF' }}
      uploadFolder="rapports"
      addLabel="Programmer rapport"
      exportTitle="Rapports Horizon Farm"
      kpis={[
        { icon: FileText, label: 'Rapports', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
        { icon: MessageCircle, label: 'WhatsApp', value: rows.filter((r) => r.channel === 'WhatsApp').length, color: 'bg-[#25D366]/20 text-[#1EA952]' },
        { icon: Send, label: 'Envoyes', value: rows.filter((r) => r.status === 'envoye').length, color: 'bg-emerald-500/20 text-emerald-500' },
        { icon: BarChart2, label: 'Generes', value: rows.filter((r) => r.status === 'genere').length, color: 'bg-amber-500/20 text-amber-500' },
      ]}
    />
  );
}
