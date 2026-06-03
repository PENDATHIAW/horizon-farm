import { getAntiDuplicationPair } from '../utils/antiDuplicationRegistry.js';
import { redirectToSource } from '../utils/antiDuplicationGuard.js';

export default function AntiDuplicationNotice({
  pairId,
  onNavigate,
  compact = false,
  actionLabel,
  className = '',
}) {
  const pair = getAntiDuplicationPair(pairId);
  if (!pair) return null;

  const decisionLabel = {
    redirect: 'Redirection module source',
    readonly: 'Lecture seule',
    merge: 'Vue agrégée',
    hide_expert: 'Mode expert',
    keep: 'Source métier',
  }[pair.decision] || 'Pilotage';

  return (
    <div className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm text-[#8a7456] ${className}`}>
      <p className="font-black text-[#2f2415]">{pair.label}</p>
      <p className="mt-0.5 text-xs">{pair.detail}</p>
      {!compact ? (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-[#9a6b12]">{decisionLabel} · source {pair.sourceModule}{pair.sourceTab ? ` / ${pair.sourceTab}` : ''}</p>
      ) : null}
      {onNavigate && pair.decision !== 'keep' ? (
        <button
          type="button"
          onClick={() => redirectToSource(onNavigate, pairId)}
          className="mt-2 rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black text-[#2f2415] hover:bg-white"
        >
          {actionLabel || `Ouvrir ${pair.sourceModule}`}
        </button>
      ) : null}
    </div>
  );
}
