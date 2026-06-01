import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  bridgeCloseAlertFromCompletedTask,
  bridgeCloseTaskFromResolvedAlert,
  bridgeCreateTaskFromAlert,
  summarizeAlertTaskBridge,
} from '../services/alertTaskBridgeService';
import { isAlertClosed } from '../utils/taskWorkflows';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const MODULE_LABELS = { animaux: 'Animaux', avicole: 'Avicole', cultures: 'Cultures', stock: 'Stock', finances: 'Finances', clients: 'Clients', fournisseurs: 'Fournisseurs', smartfarm: 'Smart Farm', equipements: 'Équipements', sante: 'Santé', ventes: 'Ventes', documents: 'Documents', taches: 'Tâches', business_events: 'Historique métier', audit_logs: 'Journal activité', alertes_center: 'Alertes', alertes: 'Alertes' };
const open = (row = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'closed', 'done'].includes(lower(row.status || row.statut));
const moduleOf = (alert = {}) => {
  const key = lower(alert.module_source || alert.module || alert.module_lie || 'alertes');
  return MODULE_LABELS[key] || key.replace(/_/g, ' ') || 'Alertes';
};
const titleOf = (alert = {}) => alert.title || alert.titre || alert.message || 'Alerte à traiter';

export default function AlertTaskBridgePanel({
  alertes = [],
  tasks = [],
  onCreateTask,
  onRefreshTasks,
  onUpdateAlert,
  onUpdateTask,
  onRefreshAlertes,
  onCreateBusinessEvent,
  onNavigate,
}) {
  const bridge = summarizeAlertTaskBridge(alertes, tasks);
  const handlers = { tasks, onCreateTask, onUpdateAlert, onUpdateTask, onRefreshTasks, onRefreshAlertes, onCreateBusinessEvent };

  const createTask = async (alert) => {
    try {
      await bridgeCreateTaskFromAlert(alert, handlers);
      toast.success('Tâche créée depuis l’alerte');
    } catch (error) {
      toast.error(error.message || 'Création de tâche impossible');
    }
  };

  const closeAlertFromTask = async (row) => {
    try {
      await bridgeCloseAlertFromCompletedTask(row.task, handlers);
      toast.success('Alerte clôturée depuis la tâche terminée');
    } catch (error) {
      toast.error(error.message || 'Clôture alerte impossible');
    }
  };

  const closeTaskFromAlert = async (alert) => {
    try {
      const linked = await bridgeCloseTaskFromResolvedAlert(alert, tasks, handlers);
      if (linked) toast.success('Tâche clôturée depuis l’alerte résolue');
      else toast('Aucune tâche ouverte liée');
    } catch (error) {
      toast.error(error.message || 'Clôture tâche impossible');
    }
  };

  const resolveAlert = async (alert) => {
    try {
      await onUpdateAlert?.(alert.id, { status: 'traitee', statut: 'traitee', treated_at: new Date().toISOString() });
      await bridgeCloseTaskFromResolvedAlert(alert, tasks, handlers);
      await onRefreshAlertes?.();
      toast.success('Alerte résolue');
    } catch (error) {
      toast.error(error.message || 'Résolution impossible');
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ClipboardList size={15} /> Pont alertes ↔ tâches</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Clôture bidirectionnelle</h3>
          <p className="text-sm text-[#8a7456] mt-1">Créer une tâche depuis une alerte, puis synchroniser la clôture dans les deux sens.</p>
        </div>
        <div className={`rounded-2xl border p-3 text-sm ${bridge.withoutTaskCount || bridge.staleAlertCount ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {bridge.withoutTaskCount ? `${bridge.withoutTaskCount} alerte(s) sans tâche` : 'Alertes reliées'}
          {bridge.staleAlertCount ? ` · ${bridge.staleAlertCount} alerte(s) à clôturer` : ''}
        </div>
      </div>

      {bridge.withoutTask.length ? (
        <div>
          <p className="text-xs font-black text-[#2f2415] mb-2">Alertes sans tâche terrain</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {bridge.withoutTask.slice(0, 6).map((row) => (
              <article key={row.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                <p className="flex items-start gap-2 font-black text-[#2f2415]"><AlertTriangle size={17} className="text-amber-700" /> {row.title}</p>
                <p className="mt-1 text-sm text-[#8a7456]">{row.detail}</p>
                <p className="mt-2 text-xs font-black text-[#9a6b12]">{moduleOf(row.alert)}</p>
                <button type="button" onClick={() => createTask(row.alert)} className="mt-3 rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Créer tâche</button>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune alerte ouverte sans tâche terrain.</div>
      )}

      {bridge.staleAlerts.length ? (
        <div>
          <p className="text-xs font-black text-[#2f2415] mb-2">Tâches terminées — alertes encore ouvertes</p>
          <div className="space-y-2">
            {bridge.staleAlerts.slice(0, 4).map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></div>
                <button type="button" onClick={() => closeAlertFromTask(row)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">Clôturer alerte</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {arr(alertes).filter((alert) => open(alert) && !isAlertClosed(alert)).slice(0, 3).length ? (
        <div className="flex flex-wrap gap-2 justify-end">
          {arr(alertes).filter(open).slice(0, 3).map((alert) => (
            <button key={alert.id} type="button" onClick={() => resolveAlert(alert)} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415]">Résoudre : {titleOf(alert).slice(0, 24)}</button>
          ))}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button type="button" onClick={() => onNavigate?.('activite_suivi', { tab: 'Tâches' })} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ouvrir Tâches</button>
      </div>
    </section>
  );
}
