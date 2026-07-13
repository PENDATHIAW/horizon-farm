import { AlertTriangle, CheckCircle2, CloudRain, ListChecks, Radio } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const clean = (value) => String(value || '').trim().toLowerCase();
const doneStatuses = ['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'];
const isDone = (row = {}) => doneStatuses.includes(clean(row.status || row.statut));
const deviceName = (row = {}) => row.name || row.nom || row.id || 'Équipement Smart Farm';
const dedupeKey = (type, id) => `smartfarm:${type}:${id}`;

function weatherRisks(meteo = {}) {
  const risks = [];
  if (Number(meteo?.temp || 0) >= 38) risks.push({ id: 'heat', type: 'meteo_chaleur', title: 'Chaleur à surveiller', message: `Température ${meteo.temp}°C`, priority: 'haute' });
  if (Number(meteo?.humidite || 0) >= 88) risks.push({ id: 'humidity', type: 'meteo_humidite', title: 'Humidité élevée', message: `Humidité ${meteo.humidite}%`, priority: 'haute' });
  if (Number(meteo?.windSpeed || 0) >= 30) risks.push({ id: 'wind', type: 'meteo_vent', title: 'Vent fort', message: `${meteo.windSpeed} km/h`, priority: 'moyenne' });
  if (meteo?.pluie || Number(meteo?.precipitationProbability || 0) >= 70) risks.push({ id: 'rain', type: 'meteo_pluie', title: 'Pluie probable', message: `Probabilité ${meteo.precipitationProbability || 0}%`, priority: 'moyenne' });
  return risks;
}

function deviceRisks(sensors = []) {
  return arr(sensors)
    .filter((row) => ['alerte', 'offline', 'hors_ligne', 'batterie_faible', 'maintenance'].includes(clean(row.status || row.statut)) || Number(row.battery_level || 100) <= 20)
    .map((row) => ({ id: row.id, type: 'capteur', title: `Capteur à vérifier: ${deviceName(row)}`, message: `${row.zone || row.location || ''} · ${row.status || row.statut || ''}`, priority: Number(row.battery_level || 100) <= 10 ? 'haute' : 'moyenne' }));
}

function existingTaskFor(risk, tasks = []) {
  const key = dedupeKey(risk.type, risk.id);
  return arr(tasks).find((task) => !isDone(task) && (task.task_dedupe_key === key || task.action_key === key));
}

export default function SmartFarmSafetyBridge({ meteo, sensors = [], tasks = [], onCreateAlert, onRefreshAlertes, onCreateTask, onRefreshTasks, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingKey, setSavingKey] = useState('');
  const risks = useMemo(() => [...weatherRisks(meteo), ...deviceRisks(sensors)].map((risk) => ({ ...risk, task: existingTaskFor(risk, tasks) })).slice(0, 8), [meteo, sensors, tasks]);

  const createAction = async (risk) => {
    const key = dedupeKey(risk.type, risk.id);
    if (risk.task) return toast.success('Action déjà en suivi');
    try {
      setSavingKey(key);
      const taskId = makeId('TSK');
      await onCreateTask?.({
        id: taskId,
        title: risk.title,
        module_lie: 'smartfarm',
        source_module: 'smartfarm',
        source_record_id: risk.id,
        related_id: risk.id,
        task_dedupe_key: key,
        action_key: key,
        due_date: today(),
        priority: risk.priority,
        status: 'a_faire',
        notes: risk.message,
      });
      await onCreateAlert?.({
        id: makeId('ALT'),
        title: risk.title,
        message: risk.message,
        module_source: 'smartfarm',
        entity_type: risk.type,
        entity_id: risk.id,
        severity: risk.priority === 'haute' ? 'warning' : 'info',
        status: 'nouvelle',
        action_recommandee: 'Vérifier la zone et clôturer la tâche terrain.',
        alert_dedupe_key: key,
        linked_task_id: taskId,
      });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'smartfarm_action_creee', module_source: 'smartfarm', entity_type: risk.type, entity_id: risk.id, title: risk.title, description: risk.message, event_date: today(), severity: risk.priority === 'haute' ? 'warning' : 'info', linked_task_id: taskId, saisies_evitees: 2 });
      await Promise.allSettled([onRefreshTasks?.(), onRefreshAlertes?.(), onRefreshBusinessEvents?.()]);
      toast.success('Action terrain créée');
    } catch {
      toast.error('Action Smart Farm impossible');
    } finally {
      setSavingKey('');
    }
  };

  if (!risks.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">Surveillance terrain</p>
          <h3 className="font-semibold text-earth">Points à vérifier</h3>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate"><AlertTriangle size={14} className="inline" /> {risks.length} signalement(s)</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {risks.map((risk) => {
          const key = dedupeKey(risk.type, risk.id);
          const Icon = risk.type.startsWith('meteo') ? CloudRain : Radio;
          return (
            <div key={key} className="rounded-xl border border-line bg-card p-3">
              <p className="font-semibold text-earth"><Icon size={14} className="inline" /> {risk.title}</p>
              <p className="text-xs text-slate mt-1">{risk.message}</p>
              {risk.task ? <p className="mt-3 text-xs font-semibold text-positive"><ListChecks size={13} className="inline" /> En suivi</p> : <button type="button" disabled={savingKey === key} className="mt-3 text-sm font-semibold text-positive disabled:opacity-60" onClick={() => createAction(risk)}><CheckCircle2 size={14} className="inline" /> {savingKey === key ? 'Création...' : 'Créer action'}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
