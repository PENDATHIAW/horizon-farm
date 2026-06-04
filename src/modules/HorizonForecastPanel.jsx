import { Calculator, ClipboardList, Download, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  buildForecastReport,
  forecastReportToExportPayload,
  forecastReportToText,
  FORECAST_RECOMMENDATIONS,
} from '../services/horizonForecast/forecastReportBuilder.js';
import { exportModuleReportPdf } from '../utils/moduleReportExports.js';
import { buildDecisionRecommendationTask } from '../utils/decisionCenterWorkflows.js';
import { fmtCurrency, fmtNumber } from '../utils/format.js';

const SAMPLE_QUESTIONS = [
  'Puis-je lancer 1 000 poussins le mois prochain ?',
  'Puis-je acheter 10 bovins ?',
  'Puis-je agrandir mon bâtiment ?',
  'Puis-je augmenter les pondeuses à 1 000 sujets ?',
  'Est-ce rentable de lancer une nouvelle bande chair ?',
];

function recommendationTone(rec) {
  if (rec === FORECAST_RECOMMENDATIONS.FAVORABLE) return 'border-emerald-300 bg-emerald-50 text-emerald-900';
  if (rec === FORECAST_RECOMMENDATIONS.DEFAVORABLE) return 'border-red-300 bg-red-50 text-red-900';
  return 'border-amber-300 bg-amber-50 text-amber-900';
}

function MetricCard({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-800' : tone === 'bad' ? 'text-red-800' : tone === 'good' ? 'text-emerald-800' : 'text-[#2f2415]';
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <p className="text-[10px] uppercase tracking-widest font-black text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-lg font-black ${cls}`}>{value}</p>
    </div>
  );
}

export default function HorizonForecastPanel({
  dataMap = {},
  moduleId = 'objectifs_croissance',
  onNavigate,
  onCreateTask,
  onCreateBusinessEvent,
  onRefreshTasks,
}) {
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const runForecast = (text = question) => {
    const q = String(text || '').trim();
    if (!q) return;
    setQuestion(q);
    setReport(buildForecastReport(q, dataMap));
  };

  const exportReport = () => {
    if (!report) return;
    try {
      exportModuleReportPdf(forecastReportToExportPayload(report));
      toast.success('Rapport PDF exporté');
    } catch (error) {
      toast.error(error.message || 'Export impossible');
    }
  };

  const createPrepTask = async () => {
    if (!report || typeof onCreateTask !== 'function') {
      toast.error('Création tâche indisponible');
      return;
    }
    setBusy(true);
    try {
      const built = buildDecisionRecommendationTask({
        id: report.id,
        title: `Préparer : ${report.scenario?.label || 'projet'}`,
        source_module: moduleId,
        target_module: report.scenario?.scenarioType === 'cattle_purchase' ? 'elevage' : 'avicole',
        recommendation: report.preLaunchActions?.slice(0, 3).join(' · ') || report.summary,
        severity: report.recommendation === FORECAST_RECOMMENDATIONS.DEFAVORABLE ? 'critique' : 'warning',
        priority: report.recommendation === FORECAST_RECOMMENDATIONS.FAVORABLE ? 'moyenne' : 'haute',
      });
      if (!built?.task) throw new Error('Tâche impossible');
      await onCreateTask({
        ...built.task,
        notes: forecastReportToText(report).slice(0, 1500),
        checklist: (report.preLaunchActions || []).slice(0, 5).join('; '),
      });
      if (built.event && onCreateBusinessEvent) await onCreateBusinessEvent(built.event);
      await onRefreshTasks?.();
      toast.success('Tâche de préparation créée');
    } catch (error) {
      toast.error(error.message || 'Tâche impossible');
    } finally {
      setBusy(false);
    }
  };

  const m = report?.metrics || {};
  const marginTone = m.estimatedMargin == null ? 'neutral' : m.estimatedMargin >= 0 ? 'good' : 'bad';

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">
            <Sparkles size={14} />
            Horizon Forecast Engine
          </p>
          <h3 className="mt-2 text-xl font-black text-[#2f2415]">Simulateur projet & cycle</h3>
          <p className="mt-1 text-sm text-[#8a7456]">
            Rapport d’aide à la décision — réutilise Finance, Commercial, Élevage et historique ERP. Pas de prix inventés sans hypothèse explicite.
          </p>
        </div>
        {report ? (
          <div className={`rounded-xl border px-4 py-2 text-sm font-black ${recommendationTone(report.recommendation)}`}>
            {report.recommendationLabel}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runForecast()}
          placeholder="Question projet…"
          className="flex-1 rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm text-[#2f2415] outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={() => runForecast()}
          className="rounded-2xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white"
        >
          <Calculator size={16} className="inline mr-1" />
          Simuler
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => runForecast(q)}
            className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#7d6a4a] hover:bg-[#dcfce7]"
          >
            {q.length > 42 ? `${q.slice(0, 40)}…` : q}
          </button>
        ))}
      </div>

      {report ? (
        <div className="space-y-4">
          <p className="text-sm text-[#8a7456]">{report.summary}</p>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <MetricCard label="Coût initial" value={fmtCurrency(m.initialCost)} />
            <MetricCard label="Besoin trésorerie" value={fmtCurrency(m.treasuryNeed)} tone="warn" />
            <MetricCard label="Charges estimées" value={fmtCurrency(m.estimatedCharges)} />
            <MetricCard label="Ventes estimées" value={m.estimatedSales != null ? fmtCurrency(m.estimatedSales) : 'Non renseigné'} />
            <MetricCard label="Marge estimée" value={m.estimatedMargin != null ? fmtCurrency(m.estimatedMargin) : 'Non renseigné'} tone={marginTone} />
            <MetricCard label="ROI estimé" value={m.roiPercent != null ? `${Math.round(m.roiPercent)} %` : 'Non renseigné'} tone={marginTone} />
            <MetricCard label="Délai retour" value={m.paybackLabel || 'Non renseigné'} />
            <MetricCard label="Sujets / unités" value={fmtNumber(report.engineResult?.quantity || '—')} />
          </div>

          {report.assumptions?.length ? (
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <p className="text-xs font-black uppercase tracking-widest text-[#8a7456]">Hypothèses & données</p>
              <ul className="mt-2 space-y-1 text-sm text-[#2f2415]">
                {report.assumptions.map((a) => (
                  <li key={a.label}>
                    <strong>{a.label}</strong>
                    {' : '}
                    {a.value != null ? (typeof a.value === 'number' ? fmtCurrency(a.value) : a.value) : 'Non renseigné'}
                    <span className="text-[#8a7456]"> · {a.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.risks?.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-amber-900">Risques</p>
              <ul className="mt-2 space-y-2 text-sm text-amber-950">
                {report.risks.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <strong>[{r.level}] {r.title}</strong> — {r.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.preLaunchActions?.length ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-900">Actions avant lancement</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-emerald-950 space-y-1">
                {report.preLaunchActions.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportReport} className="rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415]">
              <Download size={14} className="inline mr-1" />
              Exporter rapport
            </button>
            <button type="button" disabled={busy} onClick={createPrepTask} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
              <ClipboardList size={14} className="inline mr-1" />
              Créer tâche de préparation
            </button>
            <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} className="rounded-xl border border-[#eadcc2] px-4 py-2 text-xs font-black text-[#7d6a4a]">
              Voir trésorerie →
            </button>
          </div>

          <pre className="whitespace-pre-wrap rounded-xl border border-[#eadcc2] bg-white p-4 text-xs leading-relaxed text-[#2f2415] font-sans max-h-64 overflow-auto">
            {forecastReportToText(report)}
          </pre>

          <p className="text-xs text-[#8a7456]">{report.disclaimer}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
          Posez une question projet pour obtenir coût initial, trésorerie, marge, ROI, risques et recommandation.
        </div>
      )}
    </section>
  );
}
