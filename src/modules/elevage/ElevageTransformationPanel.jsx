import { Beef, Bird, Scissors } from 'lucide-react';
import { useMemo } from 'react';
import { avicoleHasActiveBirds } from '../../utils/avicoleMetrics';
import { emitHorizonForm } from '../../services/formModalManager';
import AnimalSlaughterStockBridge from '../AnimalSlaughterStockBridge.jsx';
import AvicoleTransformationBridge from '../AvicoleTransformationBridge.jsx';
import ElevageTransformationJournal from '../../components/ElevageTransformationJournal.jsx';
import HeyHorizonAnimalCard from '../HeyHorizonAnimalCard.jsx';
import HeyHorizonAvicoleCard from '../HeyHorizonAvicoleCard.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageSection, ElevageStatCard } from './elevageUi.jsx';
import { useAnimalWorkflowHandlers } from './useAnimalWorkflowHandlers.js';
import { useAvicoleWorkflowHandlers } from './useAvicoleWorkflowHandlers.js';

const today = () => new Date().toISOString().slice(0, 10);

const isClosedAnimal = (row = {}) => {
  const status = String(row.status || row.statut || '').trim().toLowerCase();
  return ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => status.includes(word));
};

export default function ElevageTransformationPanel({ data, setTab, animalProps, avicoleProps, horizonDraft, onCloseDraft, stats, onOpenWorkflow }) {
  const activeAnimals = useMemo(() => (animalProps.rows || []).filter((row) => !isClosedAnimal(row)), [animalProps.rows]);
  const activeLots = useMemo(() => (avicoleProps.rows || []).filter(avicoleHasActiveBirds), [avicoleProps.rows]);
  const { wrapUpdate } = useAnimalWorkflowHandlers({ props: animalProps, species: 'Bovin', opportunities: avicoleProps.opportunities || [] });
  const { wrappedUpdate } = useAvicoleWorkflowHandlers({ props: avicoleProps, opportunities: avicoleProps.opportunities || [] });

  const showAnimalLoss = horizonDraft?.form_type === 'animal_loss';
  const showAvicoleTransform = ['poultry_mortality', 'poultry_close'].includes(horizonDraft?.form_type);

  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>
        {stats.map((s) => <ElevageStatCard key={s.label} {...s} />)}
      </div>

      <ElevageSection
        title="Transformation"
        subtitle="Abattage, réforme, mortalité et sorties — impact effectif, stock viande et rentabilité."
      >
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard title="+ Mortalité lot avicole" text="Effectif, perte économique, alerte et traçabilité." onClick={() => (onOpenWorkflow ? onOpenWorkflow('mortality') : emitHorizonForm('avicole', 'poultry_mortality', 'Mortalité lot', { date: today() }))} />
          <ElevageActionCard title="+ Sortie / abattage animal" text="Perte, sortie ou abattage côté cheptel." onClick={() => emitHorizonForm('animaux', 'animal_loss', 'Sortie / abattage animal', { date: today() })} />
          <ElevageActionCard title="+ Prêt vente / réforme" text="Statut lot, document sanitaire, rentabilité." onClick={() => (onOpenWorkflow ? onOpenWorkflow('transform') : emitHorizonForm('avicole', 'poultry_close', 'Clôture / réforme avicole', { date: today() }))} />
          <ElevageActionCard title="Lots à vendre" text={`${data.lotsToSell?.length || 0} lot(s) — Commercial.`} onClick={() => animalProps.onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </ElevageSection>

      {showAnimalLoss ? (
        <div id="hey-horizon-animal-card">
          <HeyHorizonAnimalCard draft={horizonDraft} rows={animalProps.rows || []} species="Bovin" onCreate={animalProps.onCreate} onUpdate={wrapUpdate} onCreateBusinessEvent={animalProps.onCreateBusinessEvent} onRefresh={animalProps.onRefresh} onRefreshBusinessEvents={animalProps.onRefreshBusinessEvents} onClose={onCloseDraft} />
        </div>
      ) : null}

      {showAvicoleTransform ? (
        <div id="hey-horizon-avicole-card">
          <HeyHorizonAvicoleCard draft={horizonDraft} rows={activeLots} onUpdate={wrappedUpdate} onCreateProduction={avicoleProps.onCreateProduction} onRefreshProduction={avicoleProps.onRefreshProduction} onCreateBusinessEvent={avicoleProps.onCreateBusinessEvent} onRefresh={avicoleProps.onRefresh} onRefreshBusinessEvents={avicoleProps.onRefreshBusinessEvents} onClose={onCloseDraft} />
        </div>
      ) : null}

      <AnimalSlaughterStockBridge
        rows={activeAnimals}
        alimentationLogs={animalProps.alimentationLogs || []}
        vaccins={animalProps.vaccins || []}
        businessEvents={animalProps.businessEvents || []}
        onUpdate={animalProps.onUpdate}
        onRefresh={animalProps.onRefresh}
        onCreateBusinessEvent={animalProps.onCreateBusinessEvent}
        onRefreshBusinessEvents={animalProps.onRefreshBusinessEvents}
      />

      <AvicoleTransformationBridge
        rows={activeLots}
        alimentationLogs={avicoleProps.alimentationLogs || []}
        productionLogs={avicoleProps.productionLogs || []}
        businessEvents={avicoleProps.businessEvents || []}
        onUpdate={wrappedUpdate}
        onRefresh={avicoleProps.onRefresh}
        onCreateBusinessEvent={avicoleProps.onCreateBusinessEvent}
        onRefreshBusinessEvents={avicoleProps.onRefreshBusinessEvents}
      />

      <ElevageTransformationJournal
        rows={data.transformationRows || []}
        onOpenCommercial={() => animalProps.onNavigate?.('commercial', { tab: 'Ventes' })}
      />

      <ElevageSection title="Accès rapide">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Beef} title="Cheptel animaux" text="Fiches bovins, ovins, caprins." onClick={() => setTab('Animaux')} />
          <ElevageActionCard icon={Bird} title="Lots avicoles" text="Chair et pondeuses — effectifs." onClick={() => setTab('Avicole')} />
          <ElevageActionCard icon={Scissors} title="Lots à vendre" text={`${data.lotsToSell?.length || 0} lot(s) — Commercial.`} onClick={() => animalProps.onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </ElevageSection>
    </div>
  );
}
