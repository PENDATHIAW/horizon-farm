import CentreSimpleRecoCard from './CentreSimpleRecoCard.jsx';

/**
 * Recommandations = marge, demande clients, écarts CA uniquement.
 * Timing lancement / fêtes / vide sanitaire → onglets Cycles et Risques.
 */
export default function CentreRecommandationsTab({
  plan = {},
  onNavigate,
  onSwitchTab,
}) {
  const commercialRecommendations = (plan.commercialRecommendations || []).slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Marge & demande clients</p>
          <h3 className="text-lg font-black text-[#2f2415] mt-1">Que vendre et où agir côté commercial ?</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Ici : uniquement écarts de chiffre d&apos;affaires, clients et couverture de la demande.
            Pour <b>lancer une bande</b> ou le <b>vide sanitaire</b> → onglet{' '}
            <button type="button" onClick={() => onSwitchTab?.('Saisons & marchés')} className="font-black text-[#9a6b12] underline">Saisons & marchés</button>.
            Pour <b>vendre un lot en urgence</b> → onglet{' '}
            <button type="button" onClick={() => onSwitchTab?.('Urgences & risques')} className="font-black text-[#9a6b12] underline">Urgences & risques</button>.
          </p>
        </div>

        {commercialRecommendations.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commercialRecommendations.map((item) => (
              <CentreSimpleRecoCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7456] rounded-xl border border-[#eadcc2] bg-white p-4">
            Aucune action commerciale prioritaire — saisissez ventes et objectifs pour alimenter ce panneau.
          </p>
        )}
      </section>

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-xs text-[#7d6a4a]">
        Les fêtes à venir (Magal, Gamou, fin d&apos;année…) et les dates limites de lancement sont dans l&apos;onglet{' '}
        <button type="button" onClick={() => onSwitchTab?.('Saisons & marchés')} className="font-black text-[#9a6b12] underline">Saisons & marchés</button>.
        Le suivi ROI des décisions est dans{' '}
        <button type="button" onClick={() => onSwitchTab?.('Croissance & opportunités')} className="font-black text-[#9a6b12] underline">Croissance & opportunités</button>.
      </div>
    </div>
  );
}
