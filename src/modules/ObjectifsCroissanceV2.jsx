import ActivityCycleGoalsPanel from './ActivityCycleGoalsPanel.jsx';
import BpKpiHealth from './BpKpiHealth.jsx';
import ObjectifsCroissance from './ObjectifsCroissance.jsx';
import { buildGoalPerformance } from '../services/growthDecisionEngine';
import { buildObjectiveActionTask, buildObjectiveStatus, moduleForObjective } from '../utils/objectivesWorkflows';
import { fmtCurrency } from '../utils/format';
import Btn from '../components/Btn';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, ExternalLink, ListTodo, Target } from 'lucide-react';
import { useState } from 'react';

const arr = (value) => Array.isArray(value) ? value : [];

export default function ObjectifsCroissanceV2(props) {
  const dataMap = props.dataMap || {};
  const kpiProps = {
    salesOrders: arr(dataMap.salesOrders || dataMap.sales_orders),
    payments: arr(dataMap.payments),
    transactions: arr(dataMap.transactions || dataMap.finances),
    investments: arr(dataMap.investissements || dataMap.investments),
    onNavigate: props.onNavigate,
  };
  return <div className="space-y-6">
    <BpKpiHealth {...kpiProps} />
    <ActivityCycleGoalsPanel dataMap={dataMap} onNavigate={props.onNavigate} />
    <ObjectiveActionPlanPanel {...props} dataMap={dataMap} />
    <ObjectifsCroissance {...props} />
  </div>;
}

function ObjectiveActionPlanPanel({ dataMap = {}, onNavigate, onCreateTask, onRefreshTasks, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingKey, setSavingKey] = useState('');
  const goals = buildGoalPerformance(dataMap);
  const rows = [goals.global, ...(goals.activities || [])]
    .filter(Boolean)
    .map((row) => ({ ...row, statusInfo: buildObjectiveStatus(row), sourceModule: moduleForObjective(row.activity) }))
    .sort((a, b) => {
      const weight = { en_retard: 3, en_cours: 2, atteint: 1 };
      return (weight[b.statusInfo.key] || 0) - (weight[a.statusInfo.key] || 0) || Number(b.remaining || 0) - Number(a.remaining || 0);
    });

  const createAction = async (row) => {
    if (!onCreateTask) {
      toast('Création de tâche indisponible pour ce module.');
      return;
    }
    const workflow = buildObjectiveActionTask(row);
    try {
      setSavingKey(row.activity);
      await onCreateTask(workflow.task);
      await onCreateBusinessEvent?.(workflow.event);
      await Promise.allSettled([onRefreshTasks?.(), onRefreshBusinessEvents?.()]);
      toast.success('Plan d’action créé');
    } catch (error) {
      toast.error(error?.message || 'Plan d’action impossible à créer');
    } finally {
      setSavingKey('');
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Target size={15} /> Plans d’action objectifs</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Chaque écart ouvre une action terrain</h3>
        <p className="text-sm text-[#8a7456] mt-1">Un objectif atteint est marqué clairement. Un objectif en retard peut créer une tâche liée au module qui doit agir.</p>
      </div>
      <Btn small variant="outline" onClick={() => onNavigate?.('taches')}>Voir tâches</Btn>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {rows.slice(0, 8).map((row) => <article key={row.activity} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
          <div>
            <p className="font-black text-[#2f2415]">{row.label}</p>
            <p className="text-xs text-[#8a7456] mt-1">Source à ouvrir : {moduleLabel(row.sourceModule)}</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black ${statusClass(row.statusInfo.key)}`}>
            {row.statusInfo.key === 'atteint' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {row.statusInfo.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Mini label="Objectif" value={fmtCurrency(row.target || row.monthTarget)} />
          <Mini label="Réalisé" value={fmtCurrency(row.realized)} />
          <Mini label="Reste" value={fmtCurrency(row.statusInfo.remaining)} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Btn small variant="outline" onClick={() => onNavigate?.(row.sourceModule)}><ExternalLink size={14} /> Ouvrir source</Btn>
          <Btn small onClick={() => createAction(row)} disabled={savingKey === row.activity}><ListTodo size={14} /> {savingKey === row.activity ? 'Création...' : 'Créer plan d’action'}</Btn>
        </div>
      </article>)}
    </div>
  </section>;
}

function Mini({ label, value }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-white p-2"><p className="text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>;
}

function moduleLabel(module) {
  return ({ avicole: 'Avicole', animaux: 'Animaux', cultures: 'Cultures', stock: 'Stock', finances: 'Finances' })[module] || 'Finances';
}

function statusClass(status) {
  if (status === 'atteint') return 'bg-emerald-100 text-emerald-700';
  if (status === 'en_retard') return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-700';
}
