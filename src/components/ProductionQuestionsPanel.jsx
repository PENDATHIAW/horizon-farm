import { Beef, Drumstick, Egg, HelpCircle, Package, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  PRODUCTION_QUESTIONS,
  buildProductionAnswer,
  detectProductionQuestion,
} from '../services/productionStrategicAnswers.js';
import { fmtNumber } from '../utils/format.js';

const ICONS = {
  new_chair_band: Drumstick,
  new_layer_band: Egg,
  reform_lot: Egg,
  bovine_cycle: Beef,
  feed_autonomy: Package,
  egg_gap: TrendingUp,
};

function priorityTone(priority = '') {
  if (priority === 'haute') return 'border-red-200 bg-red-50 text-red-800';
  if (priority === 'moyenne') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
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
            className={`rounded-full border px-3 py-1 text-xs font-black ${selectedId === q.id ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
          >
            {q.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#9a6b12] font-black">
          <HelpCircle size={15} />
          Questions production
        </p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Quand lancer, réformer ou réapprovisionner ?</h2>
        <p className="mt-1 text-sm text-[#8a7456]">
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
              className={`rounded-2xl border p-3 text-left transition ${active ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#eadcc2] bg-[#fffdf8] hover:bg-[#dcfce7]'}`}
            >
              <div className="flex items-start gap-2">
                <Icon size={16} className={active ? 'text-white' : 'text-[#9a6b12]'} />
                <div>
                  <p className="font-black text-sm leading-tight">{q.label}</p>
                  <p className={`mt-1 text-[11px] ${active ? 'text-white/80' : 'text-[#8a7456]'}`}>{q.hint}</p>
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
          className="flex-1 rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm"
        />
        <button type="button" onClick={askFreeText} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">
          Analyser
        </button>
      </div>

      {answer ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-black text-[#2f2415]">{answer.title}</p>
              <p className="mt-1 text-sm text-[#7d6a4a] leading-relaxed">{answer.summary}</p>
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${priorityTone(answer.priority)}`}>
              {answer.priority}
            </span>
          </div>
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <b>Recommandation :</b> {answer.recommendation}
          </p>
          {answer.targetDate ? (
            <p className="text-xs font-black text-[#9a6b12]">Date cible : {answer.targetDate}</p>
          ) : null}
          {answer.rows?.length ? (
            <div className="divide-y divide-[#eadcc2]/70">
              {answer.rows.map((row) => (
                <div key={`${row.title}-${row.detail}`} className="grid grid-cols-1 gap-1 py-2 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-black text-sm text-[#2f2415]">{row.title}</p>
                    <p className="text-xs text-[#8a7456]">{row.detail}</p>
                  </div>
                  <span className="text-sm font-black text-[#9a6b12]">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {answer.module ? (
              <button
                type="button"
                onClick={() => onNavigate?.(answer.route || 'elevage', { tab: answer.module === 'avicole' ? 'Avicole' : 'Animaux' })}
                className="rounded-xl bg-[#22c55e] px-3 py-2 text-xs font-black text-[#052e16]"
              >
                Ouvrir {answer.module === 'stock' ? 'Achats & Stock' : 'Élevage'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate?.('assistant_erp')}
              className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415]"
            >
              Exécuter via Hey Horizon
            </button>
          </div>
          <p className="text-xs text-[#8a7456]">Confiance {answer.confidence}% · moteur cycles + prévisions ERP</p>
        </div>
      ) : null}
    </section>
  );
}
