import CentreSimpleRecoCard from './CentreSimpleRecoCard.jsx';

/**
 * Recommandations commerciales uniquement (demande, marge, clients).
 * Le timing lancement / vente / vide sanitaire → onglets Cycles et Risques.
 */
export default function CentreRecommandationsTab({ plan = {}, onNavigate, onSwitchTab }) {
  const recommendations = (plan.commercialRecommendations || []).slice(0, 5);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Marge & demande clients</p>
          <h3 className="text-lg font-black text-[#2f2415] mt-1">Où agir côté ventes et couverture de la demande ?</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Ici : uniquement les écarts CA et actions commerciales. Pour <b>lancer une bande</b> ou le <b>vide sanitaire</b> → onglet <button type="button" onClick={() => onSwitchTab?.('Cycles')} className="font-black text-[#9a6b12] underline">Cycles</button>.
            Pour <b>vendre un lot</b> → onglet <button type="button" onClick={() => onSwitchTab?.('Risques')} className="font-black text-[#9a6b12] underline">Risques</button>.
          </p>
        </div>

        {recommendations.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((item) => (
              <CentreSimpleRecoCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7456] rounded-xl border border-[#eadcc2] bg-white p-4">
            Aucune action commerciale prioritaire — saisissez ventes et objectifs pour alimenter ce panneau.
          </p>
        )}
      </section>
    </div>
  );
}
