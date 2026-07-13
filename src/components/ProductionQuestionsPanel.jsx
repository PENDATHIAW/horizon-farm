import { Beef, Drumstick, Egg, HelpCircle, Package, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  PRODUCTION_QUESTIONS,
  buildProductionAnswer,
  detectProductionQuestion,
} from '../services/productionStrategicAnswers.js';


const ICONS = {
  new_chair_band: Drumstick,
  new_layer_band: Egg,
  reform_lot: Egg,
  bovine_cycle: Beef,
  feed_autonomy: Package,
  egg_gap: TrendingUp,
};

function priorityTone(priority = '') {
  if (priority === 'haute') return 'border-urgent bg-urgent-bg text-urgent';
  if (priority === 'moyenne') return 'border-vigilance bg-vigilance-bg text-horizon-dark';
  return 'border-line bg-neutral-bg text-neutral';
}

export default function ProductionQuestionsPanel({
  dataMap = {},
  onNavigate,
  compact = false,
}) {
  const [selectedId, setSelectedId] = useState(PRODUCTION_QUESTIONS[0]?.id);
  const [freeText, setFreeText] = useState('');

  useEffect(() => {
    const handler = (event) => {
      const id = event.detail?.questionId;
      if (id) setSelectedId(id);
    };
    window.addEventListener('horizon-production-question', handler);
    return () => window.removeEventListener('horizon-production-question', handler);
  }, []);

  const answer = useMemo(
    () => buildProductionAnswer(selectedId, dataMap),
    [selectedId, dataMap],
  );

  const askFreeText = () => {
    const detected = detectProductionQuestion(freeText);
    if (detected) {
      setSelectedId(detected);
      return;
    }
    setSelectedId('new_layer_band');
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {PRODUCTION_QUESTIONS.slice(0, 4).map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setSelectedId(q.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedId === q.id ? 'border-earth bg-earth text-white' : 'border-line bg-card text-earth'}`}
          >
            {q.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="flex items-center gap-2 text-xs uppercase tracking-normal text-horizon-dark font-semibold">
          <HelpCircle size={15} />
          Questions production
        </p>
        <h2 className="mt-1 text-xl font-semibold text-earth">Quand lancer, réformer ou réapprovisionner ?</h2>
        <p className="mt-1 text-sm text-slate">
          Réponses basées sur le BP Horizon, les lots réels, la ponte et les stocks — pas sur l&apos;Assistant terrain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {PRODUCTION_QUESTIONS.map((q) => {
          const Icon = ICONS[q.id] || TrendingUp;
          const active = selectedId === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelectedId(q.id)}
              className={`rounded-2xl border p-3 text-left transition ${active ? 'border-earth bg-earth text-white' : 'border-line bg-card hover:bg-positive-bg'}`}
            >
              <div className="flex items-start gap-2">
                <Icon size={16} className={active ? 'text-white' : 'text-horizon-dark'} />
                <div>
                  <p className="font-semibold text-sm leading-tight">{q.label}</p>
                  <p className={`mt-1 text-meta ${active ? 'text-white/80' : 'text-slate'}`}>{q.hint}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Ex. : Quand ajouter une nouvelle bande pondeuse ?"
          className="flex-1 rounded-xl border border-line px-3 py-2 text-sm"
        />
        <button type="button" onClick={askFreeText} className="rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white">
          Analyser
        </button>
      </div>

      {answer ? (
        <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-earth">{answer.title}</p>
              <p className="mt-1 text-sm text-slate leading-relaxed">{answer.summary}</p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-meta font-semibold uppercase ${priorityTone(answer.priority)}`}>
              {answer.priority}
            </span>
          </div>
          <p className="rounded-xl border border-positive bg-positive-bg p-3 text-sm text-positive">
            <b>Recommandation :</b> {answer.recommendation}
          </p>
          {answer.targetDate ? (
            <p className="text-xs font-semibold text-horizon-dark">Date cible : {answer.targetDate}</p>
          ) : null}
          {answer.rows?.length ? (
            <div className="divide-y divide-line/70">
              {answer.rows.map((row) => (
                <div key={`${row.title}-${row.detail}`} className="grid grid-cols-1 gap-1 py-2 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-sm text-earth">{row.title}</p>
                    <p className="text-xs text-slate">{row.detail}</p>
                  </div>
                  <span className="text-sm font-semibold text-horizon-dark">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {answer.module ? (
              <button
                type="button"
                onClick={() => onNavigate?.(answer.route || 'elevage', { tab: answer.module === 'avicole' ? 'Avicole' : 'Animaux' })}
                className="rounded-xl bg-leaf px-3 py-2 text-xs font-semibold text-earth"
              >
                Ouvrir {answer.module === 'stock' ? 'Achats & Stock' : 'Élevage'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate?.('assistant_erp')}
              className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-earth"
            >
              Exécuter via Hey Horizon
            </button>
          </div>
          <p className="text-xs text-slate">Confiance {answer.confidence}% · moteur cycles + prévisions ERP</p>
        </div>
      ) : null}
    </section>
  );
}
