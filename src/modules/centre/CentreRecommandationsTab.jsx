import DecisionRecommendationCard from '../DecisionRecommendationCard.jsx';
import AnnualCommercialCalendarPanel from '../AnnualCommercialCalendarPanel.jsx';

export default function CentreRecommandationsTab({ plan = {}, dataMap = {}, onNavigate }) {
  const recommendations = plan.recommendations || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#2f2415] bg-[#2f2415] p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#f8e8b6] font-black">Recommandations investissement & vente</p>
          <h3 className="text-xl font-black text-white mt-1">Que faire maintenant pour couvrir la demande et protéger la marge ?</h3>
          <p className="text-sm text-white/75 mt-1">Chaque carte explique pourquoi Horizon recommande l&apos;action, avec score de priorité et actions concrètes.</p>
        </div>
        {recommendations.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recommendations.slice(0, 9).map((item) => (
              <DecisionRecommendationCard key={item.id} item={item} dataMap={dataMap} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/80 rounded-xl border border-white/20 bg-black/20 p-4">
            Aucune recommandation pour le moment — saisissez ventes, lots, stock et santé pour alimenter le moteur.
          </p>
        )}
      </section>

      <AnnualCommercialCalendarPanel />
    </div>
  );
}
