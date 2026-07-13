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
    <article className="rounded-2xl border border-line bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-earth text-sm leading-snug">{item.title}</p>
        <span className="shrink-0 rounded-full bg-vigilance-bg border border-line px-2 py-1 text-meta font-semibold uppercase text-horizon-dark">
          {item.priority || 'moyenne'}
        </span>
      </div>
      <p className="text-xs text-slate leading-relaxed line-clamp-3">{item.recommendation || item.timing}</p>
      {!item.technical_rule && item.gap_revenue > 0 ? (
        <p className="text-xs text-slate">Écart CA : <b>{fmtCurrency(item.gap_revenue)}</b></p>
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
