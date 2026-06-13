import CentreSimpleRecoCard from './CentreSimpleRecoCard.jsx';

/** Recommandations commerciales — cartes courtes, sans renvoi vers d'autres onglets. */
export default function CentreRecommandationsTab({
  plan = {},
  onNavigate,
}) {
  const commercialRecommendations = (plan.commercialRecommendations || []).slice(0, 4);
  const growthRecos = (plan.recommendations || [])
    .filter((row) => row.should_recommend_investment || row.technical_rule)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Commercial</p>
          <h3 className="text-base font-black text-[#2f2415] mt-1">Où agir pour vendre plus</h3>
        </div>

        {commercialRecommendations.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commercialRecommendations.map((item) => (
              <CentreSimpleRecoCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7456] rounded-xl border border-[#eadcc2] bg-white p-4">
            Aucune action commerciale prioritaire — saisissez ventes et objectifs.
          </p>
        )}
      </section>

      {growthRecos.length ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Capacité & investissement</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {growthRecos.map((item) => (
              <CentreSimpleRecoCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
