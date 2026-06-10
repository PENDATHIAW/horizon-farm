import CulturesTransformationPanel from './CulturesTransformationPanel.jsx';

/** Transformation cultures — workflow officiel (sortie MP + entrée PF + Finance). */
export default function CulturesTransformationHub({ rows, stocks, context, handlers, onSuccess, onNavigate }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-4 text-sm text-[#8a7456]">
        <b className="text-[#2f2415]">Transformation cultures</b> — matière première récoltée → produit transformé.
        Les récoltes se font dans l&apos;onglet <button type="button" className="font-bold text-emerald-700 underline" onClick={() => onNavigate?.('cultures', { tab: 'Récoltes' })}>Récoltes</button>.
      </section>
      <CulturesTransformationPanel stocks={stocks} context={context} handlers={handlers} onSuccess={onSuccess} />
    </div>
  );
}
