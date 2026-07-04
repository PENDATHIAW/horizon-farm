import Btn from '../../components/Btn';
import { fmtCurrency } from '../../utils/format';

/** Carte légère — 3 lignes max, sans score ni blocs multiples. */
export default function CentreSimpleRecoCard({ item, onNavigate }) {
  const isCommercial = !item.technical_rule && !item.strategic;

  const openTarget = () => {
    if (isCommercial) {
      onNavigate?.('commercial', { tab: 'Pilotage' });
      return;
    }
    if (item.activity === 'bovins') {
      onNavigate?.('elevage', { tab: 'Lots & bandes' });
      return;
    }
    onNavigate?.(item.source_module || 'elevage');
  };

  return (
    <article className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-black text-[#2f2415] text-sm leading-snug">{item.title}</p>
        <span className="shrink-0 rounded-full bg-[#fff8e8] border border-[#d6c3a0] px-2 py-0.5 text-[10px] font-black uppercase text-[#9a6b12]">
          {item.priority || 'moyenne'}
        </span>
      </div>
      <p className="text-xs text-[#7d6a4a] leading-relaxed line-clamp-3">{item.recommendation || item.timing}</p>
      {!item.technical_rule && item.gap_revenue > 0 ? (
        <p className="text-xs text-[#8a7456]">Écart CA : <b>{fmtCurrency(item.gap_revenue)}</b></p>
      ) : null}
      <Btn
        small
        variant="outline"
        onClick={openTarget}
        className="w-full"
      >
        {isCommercial ? 'Voir Pilotage commercial' : item.activity === 'bovins' ? 'Voir Élevage' : 'Voir module source'}
      </Btn>
    </article>
  );
}
