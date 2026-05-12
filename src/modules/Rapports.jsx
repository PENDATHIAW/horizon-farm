import { BarChart2, Clock, Download, FileText, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import GenericCrudModule from '../components/GenericCrudModule';
import ModuleTimeline from '../components/ModuleTimeline';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import RapportsAutoBridge from './RapportsAutoBridge.jsx';
import RapportsModuleExportsBridge from './RapportsModuleExportsBridge.jsx';
import RapportsProjectPresentationBridge from './RapportsProjectPresentationBridge.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

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
    <div className="space-y-6 rapports-mobile-structured">
      <style>{`@media (max-width: 640px){.rapports-mobile-structured .rounded-2xl{border-radius:18px}.rapports-mobile-structured table{font-size:12px}.rapports-mobile-structured th,.rapports-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.rapports-mobile-structured .text-2xl{font-size:1.35rem}.rapports-mobile-structured .grid{gap:.75rem}.rapports-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection icon={FileText} title="Présentation projet" subtitle="Générer une présentation claire du projet et des données clés Horizon Farm.">
        <RapportsProjectPresentationBridge
          data={props.data || {}}
          onCreateDocument={props.onCreateDocument}
          onRefreshDocuments={props.onRefreshDocuments}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      </ModuleSection>

      <ModuleSection icon={BarChart2} title="Rapports automatiques" subtitle="Rapports opérationnels, rentabilité, production et synthèses périodiques.">
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
      </ModuleSection>

      <ModuleSection icon={Download} title="Exports par module" subtitle="Téléchargement rapide des données utiles par domaine ERP.">
        <RapportsModuleExportsBridge />
      </ModuleSection>

      <ModuleSection icon={Clock} title="Timeline rapports" subtitle="Rapports générés, programmés, envoyés et exports disponibles.">
        <ModuleTimeline
          title="Timeline rapports"
          subtitle="Rapports générés, programmés, envoyés et exports disponibles."
          rows={timelineRows}
          onRefresh={onRefresh}
          onNavigate={() => props.onNavigate?.('rapports')}
          navigateLabel="Ouvrir rapports"
        />
      </ModuleSection>

      <ModuleSection icon={Send} title="Programmation des rapports" subtitle="Créer, planifier, envoyer et suivre les rapports automatiques.">
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
      </ModuleSection>
    </div>
  );
}
