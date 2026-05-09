import { AlertTriangle, CheckCircle2, HeartPulse, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { buildGrowthSummary } from '../utils/animalGrowth';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const animalName = (animal = {}) => animal.name || animal.nom || animal.tag || animal.id || 'Animal';
const healthStatus = (animal = {}) => String(animal.health_status || animal.sante || animal.status_sante || '').toLowerCase();
const isAtRisk = (animal = {}) => ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller', 'critique'].some((item) => healthStatus(animal).includes(item));

function feedingCostFor(animal, alimentationLogs = []) {
  return arr(alimentationLogs)
    .filter((log) => String(log.cible_id || log.animal_id || '') === String(animal.id || ''))
    .reduce((sum, log) => sum + toNumber(log.montant_total ?? log.cout ?? log.amount), 0);
}

function healthCostFor(animal, vaccins = []) {
  return arr(vaccins)
    .filter((row) => String(row.related_id || row.animal_id || '') === String(animal.id || '') || String(row.animal || '').includes(String(animal.id || '')))
    .reduce((sum, row) => sum + toNumber(row.cout ?? row.amount), 0);
}

export default function AnimalHealthBridge({ rows = [], alimentationLogs = [], vaccins = [], onUpdate, onRefresh }) {
  const santeCrud = useCrudModule('sante');
  const alertesCrud = useCrudModule('alertes_center');
  const tachesCrud = useCrudModule('taches');
  const eventsCrud = useCrudModule('business_events');
  const activeRows = arr(rows).filter((animal) => !['vendu', 'mort', 'vole', 'volé', 'reforme', 'réforme'].includes(String(animal.status || '').toLowerCase()));
  const atRisk = activeRows.filter((animal) => isAtRisk(animal) || ['croissance_lente', 'perte_poids'].includes(buildGrowthSummary(animal).status)).slice(0, 6);
  const totalFeeding = activeRows.reduce((sum, animal) => sum + feedingCostFor(animal, alimentationLogs), 0);
  const totalHealth = activeRows.reduce((sum, animal) => sum + healthCostFor(animal, vaccins), 0);

  const createHealthFollowUp = async (animal) => {
    try {
      const growth = buildGrowthSummary(animal);
      const healthId = makeId('SAN');
      const taskId = makeId('TSK');
      const reason = isAtRisk(animal) ? `Statut santé: ${animal.health_status || 'à vérifier'}` : `Croissance: ${growth.label}`;
      await santeCrud.create?.({
        id: healthId,
        nom: `Suivi ${animalName(animal)}`,
        animal: `${animalName(animal)} · ${animal.id}`,
        module_lie: 'animaux',
        related_id: animal.id,
        target_scope: 'animal',
        target_count: 1,
        total_count: 1,
        target_summary: `${animalName(animal)} · ${reason}`,
        prevue: today(),
        statut: 'a_faire',
        type_intervention: isAtRisk(animal) ? 'curatif' : 'preventif',
        nature_intervention: isAtRisk(animal) ? 'curatif' : 'preventif',
        notes: reason,
        source_module: 'animaux',
      });
      await tachesCrud.create?.({
        id: taskId,
        title: `Contrôle ${animalName(animal)}`,
        module_lie: 'animaux',
        related_id: animal.id,
        due_date: today(),
        priority: isAtRisk(animal) ? 'haute' : 'moyenne',
        status: 'a_faire',
        source_module: 'animaux',
        source_record_id: animal.id,
        linked_health_id: healthId,
      });
      await alertesCrud.create?.({
        id: makeId('ALT'),
        title: `Suivi animal: ${animalName(animal)}`,
        message: reason,
        module_source: 'animaux',
        entity_type: 'animal',
        entity_id: animal.id,
        severity: isAtRisk(animal) ? 'warning' : 'info',
        status: 'nouvelle',
        action_recommandee: 'Contrôler l’animal et compléter le module Santé & Biosécurité.',
      });
      await eventsCrud.create?.({
        id: makeId('EVT'),
        event_type: 'suivi_sante_animal',
        module_source: 'animaux',
        entity_type: 'animal',
        entity_id: animal.id,
        title: `Suivi santé ${animalName(animal)}`,
        description: reason,
        event_date: today(),
        severity: isAtRisk(animal) ? 'warning' : 'info',
        linked_task_id: taskId,
        linked_health_id: healthId,
        saisies_evitees: 4,
      });
      await onUpdate?.(animal.id, { health_status: isAtRisk(animal) ? animal.health_status : 'a_surveiller', last_health_followup_id: healthId, last_health_followup_at: new Date().toISOString() });
      await Promise.allSettled([santeCrud.refresh?.(), tachesCrud.refresh?.(), alertesCrud.refresh?.(), eventsCrud.refresh?.(), onRefresh?.()]);
      toast.success('Suivi santé créé');
    } catch (error) {
      toast.error(error.message || 'Suivi santé impossible');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Animaux connectés</p>
          <h3 className="font-black text-[#2f2415]">Santé, alimentation et suivi</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Box icon={HeartPulse} label="À suivre" value={atRisk.length} />
          <Box icon={ListChecks} label="Alimentation" value={fmtCurrency(totalFeeding)} />
          <Box icon={CheckCircle2} label="Santé" value={fmtCurrency(totalHealth)} />
        </div>
      </div>
      {atRisk.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {atRisk.map((animal) => {
            const growth = buildGrowthSummary(animal);
            const reason = isAtRisk(animal) ? animal.health_status || 'à contrôler' : growth.label;
            return <div key={animal.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"><p className="font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {animalName(animal)}</p><p className="text-xs text-[#8a7456] mt-1">{reason}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => createHealthFollowUp(animal)}>Créer suivi</button></div>;
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun animal à risque détecté.</div>
      )}
    </div>
  );
}

function Box({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[110px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}
