import { Beef } from 'lucide-react';
import { emitHorizonForm } from '../../services/formModalManager';
import { fmtNumber } from '../../utils/format';
import HeyHorizonAnimalCard from '../HeyHorizonAnimalCard.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageLogRow, ElevageSection, ElevageStatCard } from './elevageUi.jsx';
import { useAnimalWorkflowHandlers } from './useAnimalWorkflowHandlers.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function ElevageReproductionPanel({ data, setTab, animalProps, horizonDraft, onCloseDraft }) {
  const { wrapCreate, wrapUpdate } = useAnimalWorkflowHandlers({
    props: animalProps,
    species: 'Bovin',
    opportunities: animalProps.opportunities || [],
  });
  const showCreation = horizonDraft?.form_type === 'animal_creation';

  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>
        <ElevageStatCard label="Femelles" value={fmtNumber(data.females)} />
        <ElevageStatCard label="Naissances" value={fmtNumber(data.birthLikeEvents)} tone="good" />
        <ElevageStatCard label="Événements" value={fmtNumber(data.livestockEvents?.length || 0)} />
        <ElevageStatCard
          label="À suivre"
          value={fmtNumber(data.females > data.birthLikeEvents ? data.females - data.birthLikeEvents : 0)}
          tone="warn"
        />
      </div>

      <ElevageSection title="Actions rapides" subtitle="Naissances, mises bas et reproduction interne — fiches Animaux.">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard
            title="+ Naissance / mise bas"
            text="Enregistrer une portée avec lien mère sur la ferme."
            onClick={() => emitHorizonForm('animaux', 'animal_create', 'Naissance / mise bas', { date: today(), mode_acquisition: 'naissance_ferme' })}
          />
          <ElevageActionCard
            title="+ Reproduction interne"
            text="Animal issu de reproduction interne avec mère et père."
            onClick={() => emitHorizonForm('animaux', 'animal_create', 'Reproduction interne', { date: today(), mode_acquisition: 'reproduction_interne' })}
          />
          <ElevageActionCard icon={Beef} title="Voir femelles" text="Fiches reproductrices et statut sur Animaux." onClick={() => setTab('Animaux')} />
        </div>
      </ElevageSection>

      {showCreation ? (
        <div id="hey-horizon-animal-card">
          <HeyHorizonAnimalCard
            draft={horizonDraft}
            rows={animalProps.rows || []}
            species="Bovin"
            onCreate={wrapCreate}
            onUpdate={wrapUpdate}
            onCreateBusinessEvent={animalProps.onCreateBusinessEvent}
            onRefresh={animalProps.onRefresh}
            onRefreshBusinessEvents={animalProps.onRefreshBusinessEvents}
            onClose={onCloseDraft}
          />
        </div>
      ) : null}

      <ElevageSection
        title="Historique naissances"
        subtitle="Événements métier naissance, mise bas et portée déjà enregistrés."
      >
        {data.birthEvents?.length ? (
          data.birthEvents.map((row) => (
            <ElevageLogRow
              key={row.id || `${row.event_type}-${row.title}`}
              title={row.title || row.event_type || 'Naissance'}
              detail={row.description || row.module_source || '—'}
              value={String(row.date || row.created_at || '—').slice(0, 10)}
            />
          ))
        ) : (
          <p className="text-sm text-[#8a7456]">Aucune naissance enregistrée — utilisez les actions ci-dessus.</p>
        )}
      </ElevageSection>
    </div>
  );
}
