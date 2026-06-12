import { ShieldAlert, TrendingDown, Package, Wallet } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { navigateVisionRisk } from './visionNavigation.js';
import { runPriorityAlertAction, runPriorityTaskAction } from './visionPriorityActions.js';
import StrategicDecisionCard from '../centre/StrategicDecisionCard.jsx';
import { Btn, DataRow, DataTable, Empty, Pill, Section, TabIntro, VisionKpi, riskLevelLabel } from './visionUtils';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function VisionRisksTab({ data = {}, onNavigate, setTab, onCreateTask, onRefreshTasks, onCreateAlert, onRefreshAlertes, existingTasks = [], existingAlerts = [], strategicPlan = {}, urgentOnly = false }) {
  const engineRisks = arr(data.engineRisks);
  const allRisks = arr(data.risks);
  const risks = urgentOnly
    ? allRisks.filter((r) => r.tone === 'bad' || /critique|élevé|eleve|urgent/i.test(String(r.severity || '')))
    : allRisks;
  const criticalCount = allRisks.filter((r) => r.tone === 'bad').length;
  const financeExposure = Math.max(0, -(data.treasuryResult ?? data.balance)) + (data.receivable || 0);

  const riskHandlers = {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
    setTab,
  };

  const riskToItem = (risk) => ({
    id: risk.id || `risk-${risk.title}`,
    title: `Risque : ${risk.title}`,
    detail: `${risk.cause || '—'} → ${risk.impact || risk.action || '—'}`,
    message: `${risk.cause || ''} → ${risk.impact || ''}`.trim(),
    tone: risk.tone,
    sourceModule: risk.module || 'centre_decisionnel',
    navModule: risk.module,
    navTab: risk.navTab,
    kind: 'ia',
    alert_dedupe_key: `centre_risque:${risk.id}:${risk.title}`,
  });

  const createAlertFromRisk = (risk) => runPriorityAlertAction(riskToItem(risk), riskHandlers);
  const createTaskFromRisk = (risk) => runPriorityTaskAction(riskToItem(risk), riskHandlers);

  return (
    <div className="space-y-5">
      <TabIntro
        title={urgentOnly ? 'Urgences terrain & risques critiques' : 'Registre des risques'}
        detail={urgentOnly
          ? 'Ventes urgentes, stock aliment, BFR et risques critiques — le registre complet reste dans Activité & Suivi.'
          : 'Matrice IA + risques opérationnels détectés sur alertes, stock, élevage, trésorerie et documents.'}
        action={onNavigate ? <Btn onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })}>Centre alertes</Btn> : null}
      />
      {!urgentOnly ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <VisionKpi label="Risques ouverts" value={fmtNumber(allRisks.length)} tone={allRisks.length ? 'warn' : 'good'} />
          <VisionKpi label="Critiques / élevés" value={fmtNumber(criticalCount)} tone={criticalCount ? 'bad' : 'good'} onClick={() => setTab?.('Urgences & risques')} />
          <VisionKpi label="Signaux IA" value={fmtNumber(engineRisks.length)} tone={engineRisks.length ? 'warn' : 'good'} />
          <VisionKpi label="Exposition finance" value={fmtCurrency(financeExposure)} tone={financeExposure ? 'warn' : 'good'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
          <VisionKpi label="Preuves manquantes" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} onClick={() => onNavigate?.('documents_rapports', { tab: 'Preuves' })} />
        </div>
      ) : null}

      {strategicPlan.sellNow?.length ? (
        <Section icon={TrendingDown} title="Urgences vente — QUAND VENDRE">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategicPlan.sellNow.map((item) => (
              <StrategicDecisionCard
                key={item.id}
                item={{ ...item, title: item.title || item.status, category: 'sell_now' }}
                onNavigate={onNavigate}
                onCreateTask={onCreateTask}
                onCreateAlert={onCreateAlert}
                onRefreshTasks={onRefreshTasks}
                onRefreshAlertes={onRefreshAlertes}
              />
            ))}
          </div>
        </Section>
      ) : null}
      {strategicPlan.stockAudit?.alerts?.length ? (
        <Section icon={Package} title="Audit stock aliment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategicPlan.stockAudit.alerts.map((item) => (
              <StrategicDecisionCard
                key={item.id}
                item={{ ...item, title: `Surconsommation ${item.building}`, message: item.message, category: 'stock_audit', module: 'achats_stock', navTab: 'Stock' }}
                onNavigate={onNavigate}
                onCreateTask={onCreateTask}
                onCreateAlert={onCreateAlert}
                onRefreshTasks={onRefreshTasks}
                onRefreshAlertes={onRefreshAlertes}
              />
            ))}
          </div>
        </Section>
      ) : null}
      {strategicPlan.bfr?.blocked ? (
        <Section icon={Wallet} title="Blocage BFR — trésorerie">
          <StrategicDecisionCard
            item={{ id: 'bfr-block', title: 'Lancement suspendu', message: strategicPlan.bfr.message, priority: 'critique', category: 'bfr', module: 'finance_pilotage', navTab: 'Trésorerie', coveragePct: strategicPlan.bfr.coveragePct }}
            onNavigate={onNavigate}
            onCreateTask={onCreateTask}
            onCreateAlert={onCreateAlert}
            onRefreshTasks={onRefreshTasks}
            onRefreshAlertes={onRefreshAlertes}
          />
        </Section>
      ) : null}
      {!urgentOnly && engineRisks.length ? (
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
      <Section icon={ShieldAlert} title={urgentOnly ? 'Risques critiques' : 'Risques opérationnels'}>
        {risks.length ? (
          <DataTable columns={['Domaine · Sujet', 'Cause & impact', 'Gravité', 'Actions']}>
            {risks.map((r) => (
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
                  {onCreateTask ? <button type="button" onClick={() => createTaskFromRisk(r)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700">Tâche</button> : null}
                  {onCreateAlert ? <button type="button" onClick={() => createAlertFromRisk(r)} className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-black text-amber-700">Alerte</button> : null}
                </>}
              />
            ))}
          </DataTable>
        ) : <Empty>{urgentOnly ? 'Aucune urgence critique détectée — consultez Croissance ou Saisons pour anticiper.' : 'Aucun risque majeur détecté sur la ferme.'}</Empty>}
      </Section>
    </div>
  );
}
