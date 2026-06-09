import { Beef, HeartPulse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { emitHorizonForm } from '../../services/formModalManager';
import { fmtNumber } from '../../utils/format';
import { reproductionStatusLabel } from '../../utils/animalLifecycle';
import HeyHorizonAnimalCard from '../HeyHorizonAnimalCard.jsx';
import ReproductionWorkflowForm from './ReproductionWorkflowForm.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageSection, ElevageLogRow, ElevageStatCard } from './elevageUi.jsx';
import { useAnimalWorkflowHandlers } from './useAnimalWorkflowHandlers.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function ElevageReproductionPanel({
  data,
  setTab,
  animalProps,
  horizonDraft,
  onCloseDraft,
  documents = [],
  onCreateDocument,
  onRefreshDocuments,
  onCreateAlert,
  onRefreshAlertes,
  onOpenReproductionWorkflow,
}) {
  const { wrapCreate, wrapUpdate } = useAnimalWorkflowHandlers({
    props: animalProps,
    species: 'Bovin',
    opportunities: animalProps.opportunities || [],
  });

  const repro = data.reproduction || {};
  const showCreation = horizonDraft?.form_type === 'animal_creation';
  const showWorkflow = ['reproduction_saillie', 'reproduction_gestation', 'reproduction_mise_bas', 'reproduction_document'].includes(
    horizonDraft?.form_type,
  );
  const [performancesOpen, setPerformancesOpen] = useState(false);

  const reproDocuments = useMemo(
    () => (documents || []).filter((row) => String(row.module_source || '').toLowerCase() === 'reproduction'),
    [documents],
  );

  const openBirthDraft = (context = {}) => {
    emitHorizonForm('animaux', 'animal_creation', 'Naissance / mise bas', {
      date: context.date || today(),
      mode_acquisition: 'naissance_ferme',
      mere_id: context.animalId || context.animal_id,
      portee_size: context.portee_size || context.porteeSize,
      notes: context.notes,
    });
  };

  return (
    <div className="space-y-5">
      <div className={ELEVAGE_STAT_GRID}>
        <ElevageStatCard label="Femelles actives" value={fmtNumber(repro.females)} />
        <ElevageStatCard label="Gestantes" value={fmtNumber(repro.gestantes)} tone="warn" />
        <ElevageStatCard label="Naissances (période)" value={fmtNumber(repro.birthEvents)} tone="good" />
        <ElevageStatCard label="Alertes reproduction" value={fmtNumber(repro.alertCount)} tone={repro.alertCount ? 'warn' : 'good'} />
      </div>

      {repro.alerts?.length ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-black text-amber-900">
            <HeartPulse size={16} /> Alertes reproduction
          </h3>
          {repro.alerts.slice(0, 6).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                alert.severity === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : alert.severity === 'warning'
                    ? 'border-amber-200 bg-white text-amber-900'
                    : 'border-sky-200 bg-white text-sky-900'
              }`}
            >
              <b>{alert.title}</b>
              <p className="text-xs mt-0.5">{alert.message}</p>
            </div>
          ))}
        </section>
      ) : null}

      <ElevageSection
        title="Workflows officiels"
        subtitle="Saillie, gestation et mise bas — deux chemins distincts pour la naissance (voir encadré)."
      >
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <b>Naissance : quel bouton ?</b> — <b>Workflow portée</b> : scan mère, N jeunes créés automatiquement, gestation close, événement métier.
          <b> Fiche jeune (1 animal)</b> : un seul animal à identifier (boucle, sexe) — sans création automatique de portée ni clôture gestation.
        </p>
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard
            title="+ Saillie"
            text="Enregistrer une saillie avec mâle reproducteur."
            onClick={() => onOpenReproductionWorkflow?.('saillie')}
          />
          <ElevageActionCard
            title="+ Déclarer gestation"
            text="Date début + prédiction mise bas par espèce."
            onClick={() => onOpenReproductionWorkflow?.('gestation')}
          />
          <ElevageActionCard
            title="+ Workflow portée (mise bas)"
            text="Terrain : scan mère, jeunes créés en lot, alertes et document portée."
            onClick={() => onOpenReproductionWorkflow?.('mise_bas')}
          />
          <ElevageActionCard
            title="+ Fiche jeune (1 animal)"
            text="Manuel : un jeune seul — identification, lien mère, pas de workflow portée."
            onClick={() => openBirthDraft({ date: today() })}
          />
          <ElevageActionCard
            title="+ Reproduction interne"
            text="Animal issu de reproduction interne avec mère et père."
            onClick={() =>
              emitHorizonForm('animaux', 'animal_create', 'Reproduction interne', {
                date: today(),
                mode_acquisition: 'reproduction_interne',
              })
            }
          />
          <ElevageActionCard icon={Beef} title="Voir femelles" text="Fiches reproductrices et statut sur Animaux." onClick={() => setTab('Animaux')} />
          <ElevageActionCard
            title="Journal naissances"
            text="Événements naissance / mise bas / gestation enregistrés."
            onClick={() => setPerformancesOpen(true)}
          />
          <ElevageActionCard
            title="+ Preuve reproduction"
            text="Photo ou carnet rattaché à une mère — persisté module documents."
            onClick={() => emitHorizonForm('elevage', 'reproduction_document', 'Preuve reproduction', { date: today() })}
          />
        </div>
      </ElevageSection>

      <ElevageSection title="Gestantes & mises bas proches" subtitle="Lecture directe du cheptel — alertes gestation intégrées.">
        {repro.gestantesList?.length ? (
          <div className="space-y-2">
            {repro.gestantesList.slice(0, 12).map((row) => (
              <ElevageLogRow
                key={row.id}
                title={`${row.name} · ${row.species}`}
                detail={`Début ${row.date_debut_gestation || '—'} · prévue ${row.date_prevue_mise_bas || '—'} · ${reproductionStatusLabel(row.statut_reproduction)}`}
                value={row.days_until_due !== null ? (row.days_until_due < 0 ? `${Math.abs(row.days_until_due)} j retard` : `${row.days_until_due} j`) : '—'}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#8a7456]">Aucune gestation active.</p>
        )}
      </ElevageSection>

      {reproDocuments.length ? (
        <ElevageSection title="Documents reproduction" subtitle="Preuves rattachées module_source=reproduction.">
          {reproDocuments.slice(0, 8).map((doc) => (
            <ElevageLogRow
              key={doc.id}
              title={doc.title || doc.id}
              detail={`${doc.document_category || 'document'} · ${doc.entity_id || doc.animal_id || '—'}`}
              value={String(doc.date || doc.created_at || '').slice(0, 10)}
            />
          ))}
        </ElevageSection>
      ) : null}

      {showWorkflow ? (
        <ReproductionWorkflowForm
          draft={horizonDraft}
          animaux={animalProps.rows || []}
          documents={documents}
          onUpdateAnimal={animalProps.onUpdate}
          onCreateAnimal={wrapCreate}
          onCreateBusinessEvent={animalProps.onCreateBusinessEvent}
          onCreateDocument={onCreateDocument}
          onCreateAlert={onCreateAlert}
          onRefresh={animalProps.onRefresh}
          onRefreshBusinessEvents={animalProps.onRefreshBusinessEvents}
          onRefreshDocuments={onRefreshDocuments}
          onRefreshAlertes={onRefreshAlertes}
          onClose={onCloseDraft}
          onOpenBirthDraft={openBirthDraft}
        />
      ) : null}

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

      {performancesOpen ? (
        <ElevageSection title="Performances reproduction" subtitle="Journal filtré naissance / gestation — lecture seule.">
          {repro.birthJournal?.length ? (
            repro.birthJournal.map((row) => (
              <ElevageLogRow
                key={row.id || `${row.event_type}-${row.event_date}`}
                title={row.title || row.event_type}
                detail={String(row.description || '').slice(0, 120)}
                value={String(row.event_date || row.date || '').slice(0, 10)}
              />
            ))
          ) : (
            <p className="text-sm text-[#8a7456]">Aucun événement reproduction sur la période.</p>
          )}
          <button type="button" onClick={() => setPerformancesOpen(false)} className="text-xs font-black text-[#8a7456] underline">
            Fermer journal
          </button>
        </ElevageSection>
      ) : null}
    </div>
  );
}
