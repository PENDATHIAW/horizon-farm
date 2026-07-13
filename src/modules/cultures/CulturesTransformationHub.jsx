import CulturesTransformationPanel from './CulturesTransformationPanel.jsx';

/** Transformation cultures — workflow officiel (sortie MP + entrée PF + Finance). */
export default function CulturesTransformationHub({  stocks, context, handlers, onSuccess, onNavigate }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-4 text-sm text-slate">
        <b className="text-earth">Transformation cultures</b> — matière première récoltée → produit transformé.
        Les récoltes se font dans l&apos;onglet <button type="button" className="font-semibold text-positive underline" onClick={() => onNavigate?.('cultures', { tab: 'Récoltes' })}>Récoltes</button>.
      </section>
      <CulturesTransformationPanel stocks={stocks} context={context} handlers={handlers} onSuccess={onSuccess} />
    </div>
  );
}
