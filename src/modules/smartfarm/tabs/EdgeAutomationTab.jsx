import { Cpu, ShieldAlert, Zap } from 'lucide-react';
import { useMemo } from 'react';
import {
  SMART_ALERT_RULE_CATALOG,
  SMART_AUTOMATION_TEMPLATES,
  SMART_DEVICE_FAMILIES,
} from '../smartFarmTelemetryCatalog.js';

export default function EdgeAutomationTab({ handlers }) {
  const automationReady = useMemo(
    () => SMART_DEVICE_FAMILIES.filter((f) => f.automation),
    [],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <p className="flex items-center gap-2 text-sm font-black text-amber-900">
          <Cpu size={18} /> Automatisation edge — phase pilote
        </p>
        <p className="mt-2 text-sm text-amber-900">
          Les règles Si… Alors… (vannes, irrigation, ventilation) seront exécutées côté passerelle en P2.
          Aujourd’hui, Horizon Farm <b>génère les alertes et tâches</b> automatiquement sel le catalogue ci-dessous.
        </p>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <ShieldAlert size={20} /> Alertes automatiques actives
        </h3>
        <p className="mt-1 text-sm text-[#8a7456]">Déclenchées à l’ouverture du module ou à la réception d’un événement IoT.</p>
        <div className="mt-4 space-y-3">
          {SMART_ALERT_RULE_CATALOG.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <b className="text-[#2f2415]">{rule.label}</b>
                  <p className="mt-1 text-xs text-[#8a7456]">SI {rule.trigger}</p>
                  <p className="mt-1 text-xs font-bold text-emerald-800">
                    ALORS {rule.actions.join(' + ')}
                  </p>
                </div>
                <span className="rounded-full border border-[#eadcc2] bg-white px-3 py-1 text-xs font-black text-[#7d6a4a]">
                  {rule.severity} → {rule.targetModule}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <Zap size={20} /> Modèles Si… Alors… (à activer)
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {SMART_AUTOMATION_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm">
              <b className="text-[#2f2415]">{tpl.title}</b>
              <p className="mt-2 text-xs text-[#8a7456]">{tpl.condition}</p>
              <p className="mt-1 text-xs font-bold text-[#2f2415]">{tpl.action}</p>
              <span className="mt-2 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800">
                Bientôt — edge
              </span>
            </div>
          ))}
        </div>
        {automationReady.length ? (
          <p className="mt-4 text-xs text-[#8a7456]">
            Objets compatibles commande : {automationReady.map((f) => f.label).join(', ')}.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handlers.onNavigate?.('activite_suivi', { tab: 'À traiter maintenant' })}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800"
        >
          Voir alertes générées
        </button>
        <button
          type="button"
          onClick={() => handlers.onNavigate?.('cultures')}
          className="rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415]"
        >
          Lier aux parcelles
        </button>
      </div>
    </div>
  );
}
