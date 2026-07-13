import CentreSimpleRecoCard from './CentreSimpleRecoCard.jsx';

/** Recommandations commerciales - cartes courtes, sans renvoi vers d'autres onglets. */
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
      <section className="rounded-3xl border border-line bg-card p-6 shadow-card space-y-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Commercial</p>
          <h3 className="text-base font-semibold text-earth mt-1">Où agir pour vendre plus</h3>
        </div>

        {commercialRecommendations.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commercialRecommendations.map((item) => (
              <CentreSimpleRecoCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate rounded-xl border border-line bg-white p-4">
            Aucune action commerciale prioritaire - saisissez ventes et objectifs.
          </p>
        )}
      </section>

      {growthRecos.length ? (
        <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-3">
          <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Capacité & investissement</p>
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
