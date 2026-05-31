import AnnualCommercialCalendarPanel from '../AnnualCommercialCalendarPanel.jsx';
import DecisionRecommendationCardCompact from '../DecisionRecommendationCardCompact.jsx';
import CentreSimpleRecoCard from './CentreSimpleRecoCard.jsx';

/**
 * Recommandations commerciales + investissement + calendrier annuel.
 * Le timing lancement / vente / vide sanitaire → onglets Cycles et Risques.
 */
export default function CentreRecommandationsTab({
  plan = {},
  dataMap = {},
  onNavigate,
  onSwitchTab,
  onCreateTask,
  onRefreshTasks,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const recommendations = (plan.commercialRecommendations || []).slice(0, 5);
  const investmentRecos = (plan.recommendations || [])
    .filter((r) => r.should_recommend_investment || r.technical_rule || r.strategic)
    .slice(0, 4);

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

      <section className="rounded-3xl border border-[#2f2415] bg-[#2f2415] p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#f8e8b6] font-black">Recommandations investissement & vente</p>
          <h3 className="text-lg font-black text-white mt-1">Pourquoi Horizon recommande ça</h3>
          <p className="text-sm text-white/70 mt-1">Capacités, objectifs BP et alertes terrain — actions 1 clic vers tâches ou modules.</p>
        </div>
        {investmentRecos.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {investmentRecos.map((item) => (
              <DecisionRecommendationCardCompact
                key={item.id}
                item={item}
                dataMap={dataMap}
                onNavigate={onNavigate}
                onCreateTask={onCreateTask}
                onRefreshTasks={onRefreshTasks}
                onCreateBusinessEvent={onCreateBusinessEvent}
                onRefreshBusinessEvents={onRefreshBusinessEvents}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70 rounded-xl border border-white/10 bg-white/5 p-4">
            Aucune recommandation investissement prioritaire pour le moment.
          </p>
        )}
      </section>

      <AnnualCommercialCalendarPanel />
    </div>
  );
}
