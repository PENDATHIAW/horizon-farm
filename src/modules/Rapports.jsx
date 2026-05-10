import { BarChart2, FileText, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GenericCrudModule from '../components/GenericCrudModule';
import ModuleTimeline from '../components/ModuleTimeline';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import ConsolidatedFinanceStrip from './ConsolidatedFinanceStrip.jsx';
import RapportsAutoBridge from './RapportsAutoBridge.jsx';
import RapportsModuleExportsBridge from './RapportsModuleExportsBridge.jsx';
import RapportsProjectPresentationBridge from './RapportsProjectPresentationBridge.jsx';

export default function Rapports(props) {
  const rows = props.rows || [];
  const onRefresh = async () => {
    await props.onRefresh?.();
    toast.success('Rapports actualisés');
  };
  const timelineRows = rows.map((row) => ({
    ...row,
    title: row.title || row.report_type || row.id,
    description: `${row.report_type || 'rapport'} · ${row.period || 'période non renseignée'} · ${row.channel || 'PDF'}`,
    created_at: row.created_at || row.updated_at || row.date || row.period,
    status: row.status || row.statut || row.channel,
  }));

  return (
    <div className="space-y-6">
      <ConsolidatedFinanceStrip
        title="Rapports — base consolidée à exporter"
        rows={props.transactions || props.finances || []}
        salesOrders={props.salesOrders || props.ventes || []}
        payments={props.payments || []}
        fournisseurs={props.fournisseurs || []}
        stocks={props.stocks || props.stock || []}
        compact
      />
      <RapportsProjectPresentationBridge
        data={props.data || {}}
        onCreateDocument={props.onCreateDocument}
        onRefreshDocuments={props.onRefreshDocuments}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
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
      <RapportsModuleExportsBridge />
      <ModuleTimeline
        title="Timeline rapports"
        subtitle="Rapports générés, programmés, envoyés et exports disponibles."
        rows={timelineRows}
        onRefresh={onRefresh}
        onNavigate={() => props.onNavigate?.('rapports')}
        navigateLabel="Ouvrir rapports"
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
