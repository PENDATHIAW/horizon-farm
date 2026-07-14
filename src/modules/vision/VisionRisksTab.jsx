import { ShieldAlert, TrendingDown, Package, Wallet } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { navigateVisionRisk } from './visionNavigation.js';
import { runPriorityAlertAction, runPriorityTaskAction } from './visionPriorityActions.js';
import { filterByExcludedTitles } from '../centre/centreContentUtils.js';
import StrategicDecisionCard from '../centre/StrategicDecisionCard.jsx';
import { Btn, DataRow, DataTable, Pill, Section, TabIntro, VisionKpi, riskLevelLabel } from './visionUtils';

const arr = (v) => (Array.isArray(v) ? v : []);

function dedupeRisks(rows = [], limit = 3) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = String(row.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export default function VisionRisksTab({ data = {}, onNavigate, setTab, onCreateTask, onRefreshTasks, onCreateAlert, onRefreshAlertes, existingTasks = [], existingAlerts = [], strategicPlan = {}, urgentOnly = false, compact = false, excludeTitleKeys = [] }) {
  const engineRisks = arr(data.engineRisks);
  const allRisks = arr(data.risks);
  const filteredRisks = urgentOnly
    ? allRisks.filter((r) => r.tone === 'bad' || /critique|élevé|eleve|urgent/i.test(String(r.severity || '')))
    : allRisks;
  const risksAfterExclude = excludeTitleKeys.length
    ? filterByExcludedTitles(filteredRisks, excludeTitleKeys)
    : filteredRisks;
  const risks = compact ? dedupeRisks(risksAfterExclude, 3) : risksAfterExclude;
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
    detail: `${risk.cause || '-'} → ${risk.impact || risk.action || '-'}`,
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

  const bfrExcluded = excludeTitleKeys.some((key) => /lancement|trésorerie|treasury|bfr/i.test(key));
  const sellNowItems = compact
    ? filterByExcludedTitles(arr(strategicPlan.sellNow), excludeTitleKeys).slice(0, 2)
    : arr(strategicPlan.sellNow);
  const stockItems = compact
    ? filterByExcludedTitles(arr(strategicPlan.stockAudit?.alerts), excludeTitleKeys).slice(0, 1)
    : arr(strategicPlan.stockAudit?.alerts);
  const showBfr = strategicPlan.bfr?.blocked && (!compact || !bfrExcluded);
  const hasStrategicBlock = showBfr || sellNowItems.length || stockItems.length;
  const hasRiskRows = risks.length > 0;

  if (compact && urgentOnly && !hasStrategicBlock && !hasRiskRows) return null;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact ? (
        <TabIntro
          title={urgentOnly ? 'Urgences terrain & risques critiques' : 'Registre des risques'}
          detail={urgentOnly
            ? 'Ventes urgentes, stock aliment, BFR et risques critiques - le registre complet reste dans Activité & Suivi.'
            : 'Matrice d’analyse + risques opérationnels détectés sur alertes, stock, élevage, trésorerie et documents.'}
          action={onNavigate ? <Btn onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })}>Centre alertes</Btn> : null}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Blocages & risques critiques</p>
          {onNavigate ? (
            <button type="button" onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })} className="text-xs font-semibold text-horizon-dark underline">
              Toutes les alertes
            </button>
          ) : null}
        </div>
      )}
      {!urgentOnly ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <VisionKpi label="Risques ouverts" value={fmtNumber(allRisks.length)} tone={allRisks.length ? 'warn' : 'good'} />
          <VisionKpi label="Critiques / élevés" value={fmtNumber(criticalCount)} tone={criticalCount ? 'bad' : 'good'} onClick={() => setTab?.('Urgences & risques')} />
          <VisionKpi label="Signaux d’analyse" value={fmtNumber(engineRisks.length)} tone={engineRisks.length ? 'warn' : 'good'} />
          <VisionKpi label="Exposition finance" value={fmtCurrency(financeExposure)} tone={financeExposure ? 'warn' : 'good'} onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} />
          <VisionKpi label="Preuves manquantes" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} onClick={() => onNavigate?.('documents_rapports', { tab: 'Preuves' })} />
        </div>
      ) : null}

      {sellNowItems.length ? (
        <Section icon={TrendingDown} title={compact ? 'Ventes urgentes' : 'Urgences vente - QUAND VENDRE'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sellNowItems.map((item) => (
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
      {stockItems.length ? (
        <Section icon={Package} title={compact ? 'Stock aliment' : 'Audit stock aliment'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stockItems.map((item) => (
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
      {showBfr ? (
        <Section icon={Wallet} title={compact ? 'Trésorerie - lancement bloqué' : 'Blocage BFR - trésorerie'}>
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
        <Section icon={ShieldAlert} title="Matrice risques">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {engineRisks.map((r) => (
              <button key={r.id} type="button" onClick={() => navigateVisionRisk(onNavigate, { module: r.module, domain: r.domain, title: r.title })} className="rounded-2xl border border-line bg-card p-4 text-left hover:bg-white">
                <p className="text-xs uppercase tracking-normal text-slate">{r.domain}</p>
                <p className="mt-1 font-semibold text-earth">{r.title}</p>
                <p className="mt-1 text-xs text-slate line-clamp-2">{r.detail}</p>
                <div className="mt-2 flex gap-2">
                  <Pill tone={r.level === 'critique' || r.level === 'eleve' ? 'bad' : r.level === 'moyen' ? 'warn' : 'good'}>{riskLevelLabel(r.level)}</Pill>
                  <Pill>{r.score}/100</Pill>
                </div>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
      {hasRiskRows ? (
      <Section icon={ShieldAlert} title={urgentOnly ? (compact ? 'Autres risques' : 'Risques critiques') : 'Risques opérationnels'}>
        <DataTable columns={['Domaine · Sujet', 'Cause & impact', 'Gravité', 'Actions']}>
            {risks.map((r) => (
              <DataRow
                key={r.id}
                title={`${r.domain} · ${r.title}`}
                detail={`${r.cause} → ${r.impact}${r.financialImpact && r.financialImpact !== '-' ? ` · ${r.financialImpact}` : ''}`}
                status={r.severity}
                tone={r.tone}
                onClick={() => navigateVisionRisk(onNavigate, r)}
                actions={<>
                  <Pill tone={r.tone}>{r.resolutionStatus}</Pill>
                  <button type="button" onClick={() => navigateVisionRisk(onNavigate, r)} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold">Voir source</button>
                  {onCreateTask ? <button type="button" onClick={() => createTaskFromRisk(r)} className="rounded-lg border border-positive px-2 py-1 text-xs font-semibold text-positive">Tâche</button> : null}
                  {onCreateAlert ? <button type="button" onClick={() => createAlertFromRisk(r)} className="rounded-lg border border-vigilance px-2 py-1 text-xs font-semibold text-horizon-dark">Alerte</button> : null}
                </>}
              />
            ))}
          </DataTable>
      </Section>
      ) : null}
    </div>
  );
}
