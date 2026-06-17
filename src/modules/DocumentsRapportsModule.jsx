import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { applyOneClickRecommendation, createMissingProofTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency } from '../utils/format';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { resolveDocumentsTab, resolveDocumentsNavigation } from '../utils/commercialNavigation.js';
import { useDocumentsRapports } from './documents/hooks/useDocumentsRapports.js';
import CentreControleTab from './documents/tabs/CentreControleTab.jsx';
import GestionnaireOcrTab from './documents/tabs/GestionnaireOcrTab.jsx';
import RapprochementPreuvesTab from './documents/tabs/RapprochementPreuvesTab.jsx';
import RapportsExportsTab from './documents/tabs/RapportsExportsTab.jsx';
import { Button } from './documents/documentsModuleUi.jsx';

function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="documents_rapports" active={active} onChange={onChange} />;
}

export default function DocumentsRapportsModule(props) {
  const controlled = Boolean(props.onTabChange);
  const bootstrapNav = resolveDocumentsNavigation(props.initialTab || 'Centre de contrôle');
  const [internalTab, setInternalTab] = useState(() => bootstrapNav.tab || resolveDocumentsTab(props.initialTab || 'Centre de contrôle'));
  const tab = controlled
    ? resolveDocumentsTab(props.initialTab || 'Centre de contrôle')
    : internalTab;
  const [busyId, setBusyId] = useState(null);

  const applyDocumentsNavigation = useCallback((nav) => {
    const resolvedTab = nav.tab || resolveDocumentsTab(props.initialTab || 'Centre de contrôle');
    if (controlled) props.onTabChange?.(resolvedTab);
    else setInternalTab(resolvedTab);
  }, [controlled, props.onTabChange, props.initialTab]);

  const navigateDocuments = useCallback((target = '') => {
    applyDocumentsNavigation(resolveDocumentsNavigation(target));
  }, [applyDocumentsNavigation]);

  const setTab = useCallback((value) => {
    applyDocumentsNavigation(resolveDocumentsNavigation(value));
  }, [applyDocumentsNavigation]);

  useEffect(() => {
    if (!props.initialTab) return;
    const nav = resolveDocumentsNavigation(props.initialTab);
    if (!controlled) setInternalTab(nav.tab);
  }, [controlled, props.initialTab]);

  const {
    data,
    periodFiltered,
    actionHandlers,
    scannerHandlers,
    scannerContext,
    refresh,
  } = useDocumentsRapports(props);

  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else {
        toast.success('Module ouvert');
        navigateDocuments('Rapprochement & preuves');
      }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

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
    toast.success('Document traité — bibliothèque mise à jour');
  };

  const content = tab === 'Centre de contrôle' ? (
    <CentreControleTab
      data={data}
      navigateDocuments={navigateDocuments}
      onApply={applyFinding}
      onAttachProof={attachProof}
      busyId={busyId}
      onNavigate={props.onNavigate}
      actionHandlers={actionHandlers}
    />
  ) : tab === 'Gestionnaire & OCR' ? (
    <GestionnaireOcrTab
      data={data}
      scannerContext={scannerContext}
      scannerHandlers={scannerHandlers}
      dataMap={props.dataMap}
      onNavigate={props.onNavigate}
      onSuccess={onScannerSuccess}
    />
  ) : tab === 'Rapprochement & preuves' ? (
    <RapprochementPreuvesTab
      props={props}
      data={data}
      onNavigate={props.onNavigate}
      onAttachProof={attachProof}
      busyId={busyId}
      onLinked={() => refresh()}
      navigateDocuments={navigateDocuments}
    />
  ) : tab === 'Rapports & exports' ? (
    <RapportsExportsTab
      data={data}
      periodFiltered={periodFiltered}
      onNavigate={props.onNavigate}
    />
  ) : (
    <CentreControleTab
      data={data}
      navigateDocuments={navigateDocuments}
      onApply={applyFinding}
      onAttachProof={attachProof}
      busyId={busyId}
      onNavigate={props.onNavigate}
      actionHandlers={actionHandlers}
    />
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Dossiers</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Documents & Rapports</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Centre de contrôle, OCR, rapprochement et exports — conformité finance.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
              <span className="text-[#8a7456]">Santé </span>
              <b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b>
            </div>
            <Button onClick={() => navigateDocuments('Gestionnaire & OCR')}>Bibliothèque</Button>
            <Button onClick={() => navigateDocuments('Rapports & exports')}>Exports</Button>
          </div>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} />
      {content}
    </div>
  );
}
