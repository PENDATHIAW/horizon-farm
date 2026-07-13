import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import '../../components/Btn';
import StrategicQuickActions from './StrategicQuickActions.jsx';

/**
 * Explique le vide sanitaire et liste les actions concrètes par bâtiment.
 */
export default function SanitaryVacuumPanel({ alerts = [], onNavigate, onCreateTask, onCreateAlert, onRefreshTasks, onRefreshAlertes, existingTasks = [], existingAlerts = [] }) {
  const blocking = alerts.filter((a) => a.blocking);

  if (!blocking.length) {
    return (
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        <p className="font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> Aucun blocage vide sanitaire</p>
        <p className="mt-1 text-xs">Les délais entre bandes respectent le minimum de 10 jours et l&apos;historique sanitaire récent est acceptable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">
        <p className="font-semibold text-earth flex items-center gap-2"><Info size={16} /> C&apos;est quoi le vide sanitaire ?</p>
        <p className="mt-2 text-xs leading-relaxed">
          Période <b>sans animaux</b> entre deux bandes dans un même bâtiment. Elle sert à nettoyer, désinfecter et laisser sécher
          le sol pour casser le cycle des germes (coccidiose, salmonelles…). <b>Minimum recommandé : 10 jours.</b>
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          <b>Historique pathologique</b> : si la bande précédente a eu une mortalité élevée (&gt; 5 %), le système demande
          <b> 7 jours supplémentaires</b> et un traitement du sol avant toute nouvelle mise en place.
        </p>
      </div>

      {blocking.map((alert) => (
        <article key={alert.id} className="rounded-2xl border border-urgent bg-urgent-bg p-4 space-y-3">
          <div>
            <p className="font-semibold text-urgent flex items-center gap-2">
              <AlertTriangle size={16} />
              {alert.title || `Bâtiment ${alert.building}`}
            </p>
            <p className="mt-1 text-xs text-urgent">{alert.explanation || alert.message}</p>
          </div>

          {(alert.actions || []).length ? (
            <div className="rounded-xl bg-white border border-urgent p-3">
              <p className="text-meta uppercase tracking-normal font-semibold text-horizon-dark mb-2">À faire avant de lancer</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-earth">
                {alert.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-meta text-urgent">
            {alert.gapDays != null ? <span className="rounded-lg bg-white px-2 py-1">Écart actuel : <b>{alert.gapDays} j</b> (min. {alert.requiredDays || 10} j)</span> : null}
            {alert.mortalityRate != null ? <span className="rounded-lg bg-white px-2 py-1">Mortalité bande préc. : <b>{alert.mortalityRate}%</b></span> : null}
            {alert.extraVacuumDays ? <span className="rounded-lg bg-white px-2 py-1">Prolongation : <b>+{alert.extraVacuumDays} j</b></span> : null}
            {alert.earliestLaunchDate ? <span className="rounded-lg bg-white px-2 py-1">Lancement possible après : <b>{alert.earliestLaunchDate}</b></span> : null}
          </div>

          <StrategicQuickActions
            item={{ ...alert, category: 'sanitary', entity_type: 'batiment', entity_id: alert.building, module: 'elevage', navTab: 'Avicole' }}
            onNavigate={onNavigate}
            onCreateTask={onCreateTask}
            onCreateAlert={onCreateAlert}
            onRefreshTasks={onRefreshTasks}
            onRefreshAlertes={onRefreshAlertes}
            existingTasks={existingTasks}
            existingAlerts={existingAlerts}
          />
        </article>
      ))}
    </div>
  );
}
