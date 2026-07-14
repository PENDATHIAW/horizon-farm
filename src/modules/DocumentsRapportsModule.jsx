import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { createMissingProofTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency } from '../utils/format';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { resolveDocumentsTab, resolveDocumentsNavigation } from '../utils/commercialNavigation.js';
import { useDocumentsRapports } from './documents/hooks/useDocumentsRapports.js';
import GestionnaireOcrTab from './documents/tabs/GestionnaireOcrTab.jsx';
import RapprochementPreuvesTab from './documents/tabs/RapprochementPreuvesTab.jsx';
import RapportsExportsTab from './documents/tabs/RapportsExportsTab.jsx';
import ReportLifecyclePanel from './documents/tabs/ReportLifecyclePanel.jsx';
import PublicationsTab from './documents/tabs/PublicationsTab.jsx';
import ArchivesTab from './documents/tabs/ArchivesTab.jsx';
import { Button } from './documents/documentsModuleUi.jsx';

function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="documents_rapports" active={active} onChange={onChange} />;
}

export default function DocumentsRapportsModule(props) {
  const controlled = Boolean(props.onTabChange);
  const onTabChange = props.onTabChange;
  const initialTab = props.initialTab;
  const bootstrapNav = resolveDocumentsNavigation(props.initialTab || 'Bibliothèque');
  const [internalTab, setInternalTab] = useState(() => bootstrapNav.tab || resolveDocumentsTab(props.initialTab || 'Bibliothèque'));
  const tab = controlled
    ? resolveDocumentsTab(props.initialTab || 'Bibliothèque')
    : internalTab;
  const [busyId, setBusyId] = useState(null);

  const applyDocumentsNavigation = useCallback((nav) => {
    const resolvedTab = nav.tab || resolveDocumentsTab(initialTab || 'Bibliothèque');
    if (controlled) onTabChange?.(resolvedTab);
    else setInternalTab(resolvedTab);
  }, [controlled, onTabChange, initialTab]);

  const navigateDocuments = useCallback((target = '') => {
    applyDocumentsNavigation(resolveDocumentsNavigation(target));
  }, [applyDocumentsNavigation]);

  const setTab = useCallback((value) => {
    const raw = String(value || '').trim();
    const nav = resolveDocumentsNavigation(value);
    if (controlled) {
      onTabChange?.(raw || nav.tab);
      return;
    }
    setInternalTab(nav.tab);
  }, [controlled, onTabChange]);

  const {
    data,
    periodFiltered,
    actionHandlers,
    scannerHandlers,
    scannerContext,
    refresh,
  } = useDocumentsRapports(props);

  const attachProof = async (item) => {
    setBusyId(item.id);
    try {
      await createMissingProofTask({
        transactionLabel: item.title,
        amount: fmtCurrency(item.amount),
        transactionId: item.trxId || item.id,
        handlers: actionHandlers,
      });
      toast.success(`Tâche preuve créée pour ${item.title}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const onScannerSuccess = async () => {
    await refresh();
    toast.success('Document traité - bibliothèque mise à jour');
  };

  const greenpreneursExtras = {
    taches: props.existingTasks || [],
    alertes_center: props.existingAlerts || [],
    sales_opportunities: props.opportunities || [],
    bp_funding_sources: props.bpFundingSources || [],
    bp_recurring_costs: props.bpRecurringCosts || [],
    sensor_devices: props.sensorDevices || [],
    camera_devices: props.cameraDevices || [],
    smartfarm_events: props.smartfarmEvents || [],
  };

  const reportDataMap = {
    sales_orders: data.salesOrders,
    payments: data.payments,
    finances: data.transactions,
    stock: data.stocks,
    taches: props.existingTasks || [],
    alertes_center: props.existingAlerts || [],
    documents: data.documents,
  };

  const content = tab === 'DocumentsLibraryView' ? (
    <GestionnaireOcrTab
      data={data}
      scannerContext={scannerContext}
      scannerHandlers={scannerHandlers}
      dataMap={props.dataMap}
      onNavigate={props.onNavigate}
      onSuccess={onScannerSuccess}
    />
  ) : tab === 'DocumentsEvidenceView' ? (
    <RapprochementPreuvesTab
      props={props}
      data={data}
      onNavigate={props.onNavigate}
      onAttachProof={attachProof}
      busyId={busyId}
      onLinked={() => refresh()}
      navigateDocuments={navigateDocuments}
    />
  ) : tab === 'ReportsLifecycleView' ? (
    <div className="space-y-6">
      <ReportLifecyclePanel
        reports={data.reports}
        dataMap={reportDataMap}
        user={props.user}
        onCreateReport={props.onCreateReport}
        onUpdateReport={props.onUpdateReport}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshReports={props.onRefreshReports}
      />
      <RapportsExportsTab
        data={data}
        periodFiltered={periodFiltered}
        onNavigate={props.onNavigate}
        greenpreneursExtras={greenpreneursExtras}
      />
    </div>
  ) : tab === 'ReportsPublicationsView' ? (
    <PublicationsTab reports={data.reports} />
  ) : tab === 'ReportsArchivesView' ? (
    <ArchivesTab reports={data.reports} />
  ) : (
    <GestionnaireOcrTab
      data={data}
      scannerContext={scannerContext}
      scannerHandlers={scannerHandlers}
      dataMap={props.dataMap}
      onNavigate={props.onNavigate}
      onSuccess={onScannerSuccess}
    />
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Dossiers</p>
            <h1 className="mt-1 text-2xl font-semibold text-earth">Documents & Rapports</h1>
            <p className="mt-1 text-sm text-slate">Bibliothèque unique, preuves, rapports versionnés et publications.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm">
              <span className="text-slate">Santé </span>
              <b className={data.healthScore >= 75 ? 'text-positive' : 'text-horizon-dark'}>{data.healthScore}/100</b>
            </div>
            <Button onClick={() => navigateDocuments('Bibliothèque')}>Bibliothèque</Button>
            <Button onClick={() => navigateDocuments('Rapports')}>Rapports</Button>
          </div>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} />
      {content}
    </div>
  );
}
