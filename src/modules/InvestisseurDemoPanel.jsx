import { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight, Bot, Calculator, ChevronRight, MessageCircle, Mic, Play, ScanLine,
  ShieldCheck, Sparkles, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  INVESTOR_DEMO_MODE_LABEL,
  INVESTOR_DEMO_SCENARIOS,
  buildInvestorDemoFlow,
  runFullInvestorDemo,
  runInvestorDemoScenario,
} from '../services/investorForums/investorDemoOrchestrator.js';
import { fmtCurrency } from '../utils/format.js';

const SCENARIO_ICONS = {
  whatsapp_horizon: MessageCircle,
  ocr_intelligent: ScanLine,
  hey_horizon_brief: Mic,
  horizon_forecast: Calculator,
};

function DemoBanner() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-300 bg-gradient-to-r from-violet-50 via-white to-amber-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
          Mode démo
        </span>
        <p className="text-sm font-black text-[#2f2415]">{INVESTOR_DEMO_MODE_LABEL}</p>
      </div>
      <p className="mt-2 text-sm text-[#7d6a4a]">
        Données simulées BP Horizon Farm · brouillons et simulations uniquement · aucune écriture ERP sans validation de Penda.
      </p>
    </div>
  );
}

function StepPill({ index, active, done, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left min-w-[140px] transition-colors ${
        active ? 'border-[#2f2415] bg-[#2f2415] text-white' : done ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-[#d6c3a0] bg-white text-[#7d6a4a]'
      }`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? 'bg-white text-[#2f2415]' : done ? 'bg-emerald-600 text-white' : 'bg-[#fffdf8] text-[#8a7456]'}`}>
        {done ? '✓' : index}
      </span>
      <span className="text-xs font-bold leading-tight">{label}</span>
    </button>
  );
}

function ResultCard({ title, children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50' : tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]';
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#8a7456]">{title}</p>
      <div className="mt-2 text-sm text-[#2f2415]">{children}</div>
    </div>
  );
}

function WhatsAppBubble({ message, incoming = true }) {
  return (
    <div className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm ${incoming ? 'rounded-tl-md bg-[#dcf8c6] text-[#1f2937]' : 'rounded-tr-md bg-white text-[#2f2415] border border-[#eadcc2]'}`}>
        {incoming ? <p className="text-[10px] font-black text-emerald-800 mb-1">WhatsApp · Penda</p> : null}
        <p>{message}</p>
      </div>
    </div>
  );
}

function ScenarioResult({ result }) {
  if (!result) return null;

  if (result.id === 'whatsapp_horizon') {
    return (
      <div className="space-y-4">
        <WhatsAppBubble message={result.message} />
        <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3">
          <p className="flex items-center gap-2 font-black text-[#2f2415]"><Bot size={16} /> Horizon analyse le message</p>
          <p className="text-sm text-[#7d6a4a]">{result.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.impacts?.map((impact) => (
              <ResultCard key={impact.id} title={impact.label} tone={impact.tone === 'good' ? 'good' : 'neutral'}>
                {impact.detail}
              </ResultCard>
            ))}
          </div>
          {result.chainSteps?.length ? (
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs font-black text-[#8a7456]">Chaîne automatique proposée</p>
              <ul className="mt-2 space-y-1 text-sm">
                {result.chainSteps.map((step) => (
                  <li key={step.id} className="flex items-center gap-2"><ChevronRight size={14} /> {step.title}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (result.id === 'ocr_intelligent') {
    return (
      <div className="space-y-4">
        <ResultCard title="Facture détectée" tone="warn">
          <p><b>{result.invoice?.fournisseur}</b> · {result.invoice?.produit}</p>
          <p className="mt-1">{result.invoice?.quantite} × {money(result.invoice?.prix_unitaire)} = {money(result.invoice?.montant_total)}</p>
        </ResultCard>
        <ResultCard title={result.headline} tone="warn">
          <p>{result.summary}</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {(result.bullets || []).slice(0, 4).map((line) => <li key={line}>{line}</li>)}
          </ul>
        </ResultCard>
        <ResultCard title="Recommandation prix de vente" tone="good">
          <p className="font-black">{result.recommendation}</p>
          {result.margin?.hausse_prix_conseillee_fcfa ? (
            <p className="mt-1">Ajustement conseillé : +{Number(result.margin.hausse_prix_conseillee_fcfa).toLocaleString('fr-FR')} FCFA</p>
          ) : null}
        </ResultCard>
      </div>
    );
  }

  if (result.id === 'hey_horizon_brief') {
    return (
      <div className="space-y-4">
        <ResultCard title={result.headline}>
          <p className="italic text-[#7d6a4a]">« {result.phrase} »</p>
          {result.spokenText ? <p className="mt-2">{result.spokenText.slice(0, 280)}{result.spokenText.length > 280 ? '…' : ''}</p> : null}
        </ResultCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(result.sections || []).slice(0, 6).map((section) => (
            <ResultCard key={section.key} title={section.label} tone={section.tone === 'warn' ? 'warn' : 'neutral'}>
              <p className="font-black">{section.value}</p>
              {section.detail ? <p className="mt-1 text-xs text-[#7d6a4a]">{section.detail}</p> : null}
            </ResultCard>
          ))}
        </div>
        <ResultCard title="Priorités de la semaine" tone="warn">
          <ul className="list-disc pl-5 space-y-1">
            {(result.priorities || []).map((p) => <li key={p}>{p}</li>)}
          </ul>
        </ResultCard>
      </div>
    );
  }

  if (result.id === 'horizon_forecast') {
    const m = result.metrics || {};
    return (
      <div className="space-y-4">
        <ResultCard title={`Recommandation : ${result.recommendation}`} tone={result.recommendationKey === 'favorable' ? 'good' : 'warn'}>
          <p>{result.headline}</p>
        </ResultCard>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <ResultCard title="ROI estimé">{m.roiPercent != null ? `${Math.round(m.roiPercent)} %` : '—'}</ResultCard>
          <ResultCard title="Coût initial">{money(m.initialCost)}</ResultCard>
          <ResultCard title="Besoin trésorerie">{money(m.treasuryNeed)}</ResultCard>
          <ResultCard title="Marge estimée">{money(m.estimatedMargin)}</ResultCard>
          <ResultCard title="CA estimé">{money(m.estimatedSales)}</ResultCard>
          <ResultCard title="Retour">{m.paybackLabel || '—'}</ResultCard>
        </div>
        {(result.risks || []).length ? (
          <ResultCard title="Risques identifiés" tone="warn">
            <ul className="space-y-2">
              {result.risks.map((risk) => (
                <li key={risk.label}><b>{risk.label}</b> — {risk.detail}</li>
              ))}
            </ul>
          </ResultCard>
        ) : null}
      </div>
    );
  }

  return null;
}

const money = (value) => fmtCurrency(Number(value || 0));

function DemoFlowGrid({ result }) {
  const steps = buildInvestorDemoFlow(result);
  if (!steps.length) return null;
  const toneCls = {
    neutral: 'border-[#eadcc2] bg-white',
    primary: 'border-violet-200 bg-violet-50',
    warn: 'border-amber-200 bg-amber-50',
    good: 'border-emerald-200 bg-emerald-50',
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {steps.map((step, index) => (
        <div key={step.key} className={`rounded-xl border p-3 ${toneCls[step.tone] || toneCls.neutral}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#8a7456] flex items-center gap-1">
            <span className="rounded-full bg-[#2f2415] text-white w-5 h-5 inline-flex items-center justify-center text-[10px]">{index + 1}</span>
            {step.label}
          </p>
          <p className="mt-2 text-sm text-[#2f2415] whitespace-pre-wrap">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function InvestisseurDemoPanel({ onDemoProgress }) {
  const [activeStep, setActiveStep] = useState(0);
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);

  const scenarios = INVESTOR_DEMO_SCENARIOS;
  const current = scenarios[activeStep];
  const currentResult = results[current?.id];

  const runStep = useCallback(async (stepIndex = activeStep) => {
    const scenario = scenarios[stepIndex];
    if (!scenario) return null;
    setRunning(scenario.id);
    try {
      const result = await runInvestorDemoScenario(scenario.id);
      setResults((prev) => ({ ...prev, [scenario.id]: result }));
      onDemoProgress?.(Object.keys({ ...results, [scenario.id]: result }).length);
      return result;
    } catch (error) {
      toast.error(error.message || 'Démo impossible');
      return null;
    } finally {
      setRunning(null);
    }
  }, [activeStep, scenarios]);

  const runAll = async () => {
    setAutoPlay(true);
    setRunning('all');
    try {
      const full = await runFullInvestorDemo();
      const mapped = Object.fromEntries(full.steps.map((step) => [step.id, step]));
      setResults(mapped);
      onDemoProgress?.(scenarios.length);
      toast.success('Démo complète prête');
    } catch (error) {
      toast.error(error.message || 'Démo impossible');
    } finally {
      setRunning(null);
      setAutoPlay(false);
    }
  };

  const playScenario = async () => {
    await runStep(activeStep);
    if (autoPlay && activeStep < scenarios.length - 1) {
      setTimeout(() => setActiveStep((s) => s + 1), 400);
    }
  };

  const completedCount = useMemo(
    () => scenarios.filter((s) => results[s.id]).length,
    [results, scenarios],
  );

  return (
    <div className="space-y-5">
      <DemoBanner />

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-violet-700 font-black flex items-center gap-2">
              <Sparkles size={16} />
              Démo Investisseur
            </p>
            <h2 className="mt-1 text-xl font-black text-[#2f2415]">Horizon Farm — copilote agricole intelligent</h2>
            <p className="mt-2 text-sm text-[#8a7456] max-w-2xl">
              Parcours guidé en 4 étapes pour forums, investisseurs et salons : WhatsApp terrain, OCR facture, brief vocal et simulateur Forecast.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(running)}
              onClick={runAll}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
            >
              <Zap size={16} />
              Lancer toute la démo
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-[#8a7456]">{completedCount}/{scenarios.length} scénario(s) exécuté(s)</p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {scenarios.map((scenario, index) => (
          <StepPill
            key={scenario.id}
            index={index + 1}
            label={scenario.title}
            active={activeStep === index}
            done={Boolean(results[scenario.id])}
            onClick={() => setActiveStep(index)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {(() => {
              const Icon = SCENARIO_ICONS[current.id] || Bot;
              return (
                <p className="flex items-center gap-2 font-black text-[#2f2415]">
                  <Icon size={18} />
                  {current.title}
                </p>
              );
            })()}
            <p className="mt-1 text-sm text-[#8a7456]">{current.subtitle}</p>
            <p className="mt-2 text-sm text-[#7d6a4a]">{current.narrative}</p>
          </div>
          <button
            type="button"
            disabled={Boolean(running)}
            onClick={playScenario}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            <Play size={15} />
            {running === current.id ? 'Analyse…' : 'Jouer ce scénario'}
          </button>
        </div>

        <ResultCard title={current.inputLabel}>
          <p className="font-medium whitespace-pre-wrap">{current.inputText}</p>
        </ResultCard>

        {currentResult ? (
          <>
            <DemoFlowGrid result={currentResult} />
            <ScenarioResult result={currentResult} />
            <p className="flex items-center gap-2 text-xs text-emerald-800">
              <ShieldCheck size={14} />
              {currentResult.validationNote}
            </p>
          </>
        ) : (
          <p className="text-sm text-[#8a7456] italic">Appuyez sur « Jouer ce scénario » pour afficher le résultat simulé.</p>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            className="rounded-xl border border-[#d6c3a0] px-4 py-2 text-sm font-bold text-[#7d6a4a] disabled:opacity-40"
          >
            Précédent
          </button>
          <button
            type="button"
            disabled={activeStep >= scenarios.length - 1}
            onClick={() => setActiveStep((s) => Math.min(scenarios.length - 1, s + 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-[#2f2415] bg-white px-4 py-2 text-sm font-black text-[#2f2415] disabled:opacity-40"
          >
            Suivant
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
