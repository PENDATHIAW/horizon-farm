import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { saveLocalRecommendation } from '../services/aiRecommendationsService.js';

export default function HeyHorizonFeedbackBar({
  query = '',
  answerText = '',
  source = 'rules',
  confidence,
  onFeedback,
}) {
  const submit = (rating) => {
    const entry = {
      type: 'feedback',
      rating,
      text: query,
      action: answerText?.slice?.(0, 120) || '',
      module: 'assistant_erp',
      confidence_score: confidence ?? null,
      source_engine: source,
    };
    saveLocalRecommendation(entry);
    onFeedback?.(rating, entry);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eadcc2]/70 pt-3">
      <span className="text-xs text-[#8a7456]">
        {source === 'llm' ? 'Réponse assistant' : 'Réponse règles métier'}
        {confidence != null ? ` · ${confidence}%` : ''}
      </span>
      <button type="button" onClick={() => submit('up')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">
        <ThumbsUp size={12} /> Utile
      </button>
      <button type="button" onClick={() => submit('down')} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-800">
        <ThumbsDown size={12} /> Incorrect
      </button>
    </div>
  );
}
