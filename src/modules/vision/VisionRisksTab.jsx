import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';
import { buildRiskFollowUpAlert, buildRiskFollowUpTask } from '../../utils/centreDecisionWorkflow.js';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { navigateVisionRisk } from './visionNavigation.js';
import { Btn, DataRow, DataTable, Empty, Pill, Section, TabIntro, VISION_TABLE_COLS, VisionKpi, riskLevelLabel } from './visionUtils';

export default function VisionRisksTab({
  data,
  onNavigate,
  setTab,
  onCreateTask,
  onCreateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
}) {
  const [busyId, setBusyId] = useState(null);
  const engineRisks = data.engineRisks || [];
  const criticalCount = data.risks.filter((r) => r.tone === 'bad').length;
  const financeExposure = Math.max(0, -(data.treasuryResult ?? data.balance)) + (data.receivable || 0);

  const createTaskFromRisk = async (risk) => {
    if (!onCreateTask) return;
    setBusyId(risk.id);
    try {
      const built = buildRiskFollowUpTask(risk);
      if (!built?.task) throw new Error('Impossible de construire la tâche');
      await onCreateTask(built.task);
      if (built.event && onCreateBusinessEvent) await onCreateBusinessEvent(built.event);
      await onRefreshTasks?.();
      toast.success('Tâche créée avec source');
    } catch (e) {
      toast.error(e.message || 'Création impossible');
    } finally {
      setBusyId(null);
    }
  };

  const createAlertFromRisk = async (risk) => {
    if (!onCreateAlert) return;
    setBusyId(`${risk.id}-alert`);
    try {
      const built = buildRiskFollowUpAlert(risk);
      await onCreateAlert(built.alert);
      if (built.event && onCreateBusinessEvent) await onCreateBusinessEvent(built.event);
      await onRefreshAlertes?.();
      toast.success('Alerte créée avec source');
    } catch (e) {
      toast.error(e.message || 'Création impossible');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <TabIntro
        title="Registre des risques"
        detail="Matrice IA + risques opérationnels détectés sur alertes, stock, élevage, trésorerie et documents."
        action={onNavigate ? <Btn onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })}>Centre alertes</Btn> : null}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <VisionKpi label="Risques ouverts" value={fmtNumber(data.risks.length)} tone={data.risks.length ? 'warn' : 'good'} />
        <VisionKpi label="Critiques / élevés" value={fmtNumber(criticalCount)} tone={criticalCount ? 'bad' : 'good'} onClick={() => setTab?.('À traiter')} />
        <VisionKpi label="Signaux IA" value={fmtNumber(engineRisks.length)} tone={engineRisks.length ? 'warn' : 'good'} />
        <VisionKpi label="Exposition finance" value={fmtCurrency(financeExposure)} tone={financeExposure ? 'warn' : 'good'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
        <VisionKpi label="Preuves manquantes" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} onClick={() => onNavigate?.('documents_rapports', { tab: 'Preuves' })} />
      </div>
      {engineRisks.length ? (
        <Section icon={ShieldAlert} title="Matrice risques IA">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {engineRisks.map((r) => (
              <button key={r.id} type="button" onClick={() => navigateVisionRisk(onNavigate, { module: r.module, domain: r.domain, title: r.title })} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-white">
                <p className="text-xs uppercase tracking-wide text-[#8a7456]">{r.domain}</p>
                <p className="mt-1 font-black text-[#2f2415]">{r.title}</p>
                <p className="mt-1 text-xs text-[#8a7456] line-clamp-2">{r.detail}</p>
                <div className="mt-2 flex gap-2">
                  <Pill tone={r.level === 'critique' || r.level === 'eleve' ? 'bad' : r.level === 'moyen' ? 'warn' : 'good'}>{riskLevelLabel(r.level)}</Pill>
                  <Pill>{r.score}/100</Pill>
                </div>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
      <Section icon={ShieldAlert} title="Risques opérationnels">
        {data.risks.length ? (
          <DataTable columns={['Domaine · Sujet', 'Cause & impact', 'Gravité', 'Actions']}>
            {data.risks.map((r) => (
              <DataRow
                key={r.id}
                title={`${r.domain} · ${r.title}`}
                detail={`${r.cause} → ${r.impact}${r.financialImpact && r.financialImpact !== '—' ? ` · ${r.financialImpact}` : ''}`}
                status={r.severity}
                tone={r.tone}
                onClick={() => navigateVisionRisk(onNavigate, r)}
                actions={<>
                  <Pill tone={r.tone}>{r.resolutionStatus}</Pill>
                  <button type="button" onClick={() => navigateVisionRisk(onNavigate, r)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black">Voir source</button>
                  {onCreateTask ? <button type="button" disabled={busyId === r.id} onClick={() => createTaskFromRisk(r)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">Tâche</button> : null}
                  {onCreateAlert ? <button type="button" disabled={busyId === `${r.id}-alert`} onClick={() => createAlertFromRisk(r)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700 disabled:opacity-50">Alerte</button> : null}
                </>}
              />
            ))}
          </DataTable>
        ) : <Empty>Aucun risque majeur détecté sur la ferme.</Empty>}
      </Section>
    </div>
  );
}
