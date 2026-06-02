import { Egg, Info, Milk, Scale } from 'lucide-react';
import { useMemo } from 'react';
import { avicoleHasActiveBirds } from '../../utils/avicoleMetrics';
import { emitHorizonForm } from '../../services/formModalManager';
import AvicoleJournalsBridge from '../AvicoleJournalsBridge.jsx';
import HeyHorizonAnimalCard from '../HeyHorizonAnimalCard.jsx';
import HeyHorizonAvicoleCard from '../HeyHorizonAvicoleCard.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageLogRow, ElevageSection, ElevageStatCard } from './elevageUi.jsx';
import { useAnimalWorkflowHandlers } from './useAnimalWorkflowHandlers.js';
import { useAvicoleWorkflowHandlers } from './useAvicoleWorkflowHandlers.js';

function LayerHelpBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-black text-amber-900"><Info size={17} aria-hidden="true" /> Journal de ponte</p>
      <p className="mt-2 leading-relaxed break-words">La production d'œufs se saisit ici. Les tablettes sont calculées sur la base de <b>30 œufs = 1 tablette</b>.</p>
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export default function ElevageProductionPanel({ data, setTab, animalProps, avicoleProps, horizonDraft, onCloseDraft, stats, recent, onOpenWorkflow }) {
  const activeLots = useMemo(() => (avicoleProps.rows || []).filter(avicoleHasActiveBirds), [avicoleProps.rows]);
  const { wrapUpdate } = useAnimalWorkflowHandlers({ props: animalProps, species: 'Bovin', opportunities: avicoleProps.opportunities || [] });
  const { createOrReactivateEggOpportunity } = useAvicoleWorkflowHandlers({ props: avicoleProps, opportunities: avicoleProps.opportunities || [] });

  const showAnimalWeighing = horizonDraft?.form_type === 'animal_weighing';
  const showEggProduction = horizonDraft?.form_type === 'egg_production';

  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>
        {stats.map((s) => <ElevageStatCard key={s.label} {...s} />)}
      </div>

      <ElevageSection title="Actions rapides">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard title="+ Ramassage œufs" text="Production, entrée stock œufs et traçabilité." onClick={() => (onOpenWorkflow ? onOpenWorkflow('eggs') : emitHorizonForm('avicole', 'egg_production', 'Ramassage œufs', { date: today() }))} />
          <ElevageActionCard title="+ Pesée animal" text="Enregistrer le poids d'un animal du cheptel." onClick={() => emitHorizonForm('animaux', 'animal_weighing', 'Pesée animal', { date: today() })} />
          <ElevageActionCard title="Stock œufs / aliment" text="Voir l'impact sur Achats & Stock." onClick={() => animalProps.onNavigate?.('achats_stock')} />
        </div>
      </ElevageSection>

      {showAnimalWeighing ? (
        <div id="hey-horizon-animal-card">
          <HeyHorizonAnimalCard draft={horizonDraft} rows={animalProps.rows || []} species="Bovin" onCreate={animalProps.onCreate} onUpdate={wrapUpdate} onCreateBusinessEvent={animalProps.onCreateBusinessEvent} onRefresh={animalProps.onRefresh} onRefreshBusinessEvents={animalProps.onRefreshBusinessEvents} onClose={onCloseDraft} />
        </div>
      ) : null}

      {showEggProduction ? (
        <div id="hey-horizon-avicole-card">
          <HeyHorizonAvicoleCard draft={horizonDraft} rows={activeLots} onUpdate={avicoleProps.onUpdate} onCreateProduction={avicoleProps.onCreateProduction} onRefreshProduction={avicoleProps.onRefreshProduction} onCreateBusinessEvent={avicoleProps.onCreateBusinessEvent} onRefresh={avicoleProps.onRefresh} onRefreshBusinessEvents={avicoleProps.onRefreshBusinessEvents} onClose={onCloseDraft} onCreateEggOpportunity={createOrReactivateEggOpportunity} />
        </div>
      ) : null}

      <LayerHelpBanner />

      <AvicoleJournalsBridge
        rows={activeLots}
        productionLogs={avicoleProps.productionLogs || []}
        businessEvents={avicoleProps.businessEvents || []}
        onCreateProduction={avicoleProps.onCreateProduction}
        onUpdateProduction={avicoleProps.onUpdateProduction}
        onDeleteProduction={avicoleProps.onDeleteProduction}
        onRefreshProduction={avicoleProps.onRefreshProduction}
      />

      {recent?.length ? (
        <ElevageSection title="Derniers ramassages">
          {recent.map((row) => (
            <ElevageLogRow
              key={row.id || row.date}
              title={String(row.date || row.created_at || '—').slice(0, 10)}
              detail={row.lot_nom || row.lot_id || row.lot_name || 'Lot'}
              value={`${row.oeufs_produits || row.eggs_count || 0} œufs`}
            />
          ))}
        </ElevageSection>
      ) : null}

      <ElevageSection title="Accès rapide" subtitle="Registre des lots et du cheptel — sans dupliquer la saisie production.">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Egg} title="Lots pondeuses" text="Voir fiches et effectifs avicole." onClick={() => setTab('Avicole')} />
          <ElevageActionCard icon={Scale} title="Pesées animaux" text="Cheptel bovin, ovin, caprin." onClick={() => setTab('Animaux')} />
          <ElevageActionCard icon={Milk} title="Stock œufs / aliment" text="Achats & Stock." onClick={() => animalProps.onNavigate?.('achats_stock')} />
        </div>
      </ElevageSection>
    </div>
  );
}
