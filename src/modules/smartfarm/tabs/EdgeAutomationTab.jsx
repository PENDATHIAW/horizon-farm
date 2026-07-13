import { Cpu, ShieldAlert, Zap } from 'lucide-react';
import { useMemo } from 'react';
import {
  SMART_ALERT_RULE_CATALOG,
  SMART_AUTOMATION_TEMPLATES,
  SMART_DEVICE_FAMILIES,
  formatSmartFarmAction,
  formatSmartFarmTrigger,
} from '../smartFarmTelemetryCatalog.js';

export default function EdgeAutomationTab({ handlers }) {
  const automationReady = useMemo(
    () => SMART_DEVICE_FAMILIES.filter((f) => f.automation),
    [],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-horizon-dark">
          <Cpu size={18} /> Automatisation connectée
        </p>
        <p className="mt-2 text-sm text-horizon-dark">
          Horizon Farm surveille vos capteurs et déclenche automatiquement des alertes et des tâches
          (irrigation, ventilation, sécurité). Les commandes matérielles arriveront dans une prochaine mise à jour.
        </p>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-earth">
          <ShieldAlert size={20} /> Alertes automatiques actives
        </h3>
        <p className="mt-1 text-sm text-slate">Déclenchées à l’ouverture du module ou à la réception d’un événement capteur.</p>
        <div className="mt-4 space-y-3">
          {SMART_ALERT_RULE_CATALOG.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <b className="text-earth">{rule.label}</b>
                  <p className="mt-1 text-xs text-slate">Si {formatSmartFarmTrigger(rule)}</p>
                  <p className="mt-1 text-xs font-semibold text-positive">
                    Alors {rule.actions.map(formatSmartFarmAction).join(' · ')}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-slate">
                  {rule.severity} → {rule.targetModule}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-earth">
          <Zap size={20} /> Scénarios à activer
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {SMART_AUTOMATION_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-line bg-card p-4 text-sm">
              <b className="text-earth">{tpl.title}</b>
              <p className="mt-2 text-xs text-slate">{tpl.condition}</p>
              <p className="mt-1 text-xs font-semibold text-earth">{tpl.action}</p>
              <span className="mt-2 inline-block rounded-full border border-vigilance bg-vigilance-bg px-2 py-1 text-xs font-semibold text-horizon-dark">
                Bientôt disponible
              </span>
            </div>
          ))}
        </div>
        {automationReady.length ? (
          <p className="mt-4 text-xs text-slate">
            Équipements compatibles : {automationReady.map((f) => f.label).join(', ')}.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handlers.onNavigate?.('activite_suivi', { tab: 'À traiter maintenant' })}
          className="rounded-xl border border-positive bg-positive-bg px-4 py-2 text-xs font-semibold text-positive"
        >
          Voir alertes générées
        </button>
        <button
          type="button"
          onClick={() => handlers.onNavigate?.('cultures')}
          className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-earth"
        >
          Lier aux parcelles
        </button>
      </div>
    </div>
  );
}
