import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import { formatFestivalDateFr } from '../../services/islamicCalendarEngine.js';
import { getAutoFestivalSchedule } from '../../services/marketEventCalendar.js';
import {
  DEFAULT_PILOTAGE_SETTINGS,
  loadPilotageSettings,
  normalizePilotageSettings,
  savePilotageSettings,
} from '../../services/pilotageSettingsService.js';

const FESTIVAL_FIELDS = [
  { key: 'tabaski', label: 'Tabaski' },
  { key: 'korite', label: 'Korité' },
  { key: 'magal', label: 'Magal' },
  { key: 'gamou', label: 'Gamou' },
  { key: 'fin_annee', label: "Fin d'année" },
  { key: 'ramadan', label: 'Ramadan' },
];

export default function PilotageSettingsPanel({ clients = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);
  const [draft, setDraft] = useState(() => loadPilotageSettings());

  useEffect(() => {
    queueMicrotask(() => setDraft(loadPilotageSettings()));
  }, [open]);

  const autoSchedule = useMemo(
    () => getAutoFestivalSchedule(new Date(), { growth_settings: draft }),
    [draft],
  );

  const vipOptions = useMemo(
    () => (clients || []).map((c) => ({
      id: String(c.id),
      label: c.nom || c.name || c.raison_sociale || c.id,
    })),
    [clients],
  );

  const updateField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const updateFestival = (key, value) => setDraft((prev) => ({
    ...prev,
    festival_dates: { ...prev.festival_dates, [key]: value },
  }));

  const clearFestivalOverride = (key) => {
    setDraft((prev) => ({
      ...prev,
      festival_dates: { ...prev.festival_dates, [key]: '' },
    }));
  };

  const toggleVip = (clientId) => {
    setDraft((prev) => {
      const ids = new Set(prev.vip_client_ids || []);
      if (ids.has(clientId)) ids.delete(clientId);
      else ids.add(clientId);
      return { ...prev, vip_client_ids: [...ids] };
    });
  };

  const save = () => {
    const saved = savePilotageSettings(draft);
    setDraft(saved);
    onChange?.(saved);
    toast.success('Paramètres pilotage enregistrés');
    setOpen(false);
  };

  const reset = () => {
    setDraft({ ...DEFAULT_PILOTAGE_SETTINGS });
    setShowOverrides(false);
  };

  const nextFestivalsLine = autoSchedule
    .filter((row) => row.autoDate)
    .slice(0, 4)
    .map((row) => `${row.label} ${formatFestivalDateFr(row.autoDate)}`)
    .join(' · ');

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2">
            <Settings2 size={14} /> Paramètres pilotage
          </p>
          <h3 className="text-lg font-semibold text-earth mt-1">Seuils, clients VIP et calendrier marché</h3>
          <p className="text-sm text-slate mt-1">
            Le moteur calcule automatiquement Tabaski, Korité, Magal, Gamou et Ramadan (calendrier hijri).
            Vous n&apos;avez rien à saisir — ajustez une date seulement si l&apos;annonce officielle diffère.
          </p>
        </div>
        <Btn variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Masquer' : 'Configurer'}
        </Btn>
      </div>

      {!open && nextFestivalsLine ? (
        <p className="mt-3 text-xs text-slate flex items-start gap-2">
          <CalendarDays size={14} className="mt-1 shrink-0 text-positive" />
          <span><b className="text-earth">Prochaines fêtes calculées :</b> {nextFestivalsLine}</span>
        </p>
      ) : null}

      {open ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <fieldset className="space-y-3 rounded-2xl border border-positive bg-positive-bg p-4 lg:col-span-2">
            <legend className="px-2 text-sm font-semibold text-positive flex items-center gap-2">
              <CalendarDays size={15} /> Dates pivot marché — calculées automatiquement
            </legend>
            <p className="text-xs text-positive">
              Ces dates alimentent Cycles (QUAND LANCER), Risques (QUAND VENDRE) et le calendrier commercial.
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {autoSchedule.map((row) => (
                <div key={row.key} className="rounded-xl border border-positive bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-earth">{row.label}</p>
                  <p className="text-sm text-positive mt-1">
                    {formatFestivalDateFr(row.overridden ? row.overrideDate : row.autoDate)}
                  </p>
                  {row.overridden ? (
                    <p className="text-meta text-horizon-dark mt-1">Ajustement manuel actif</p>
                  ) : (
                    <p className="text-meta text-slate mt-1">Calendrier hijri</p>
                  )}
                </div>
              ))}
            </div>
            <Btn variant="outline" small onClick={() => setShowOverrides((v) => !v)}>
              {showOverrides ? 'Masquer les ajustements manuels' : 'Ajuster une date manuellement (optionnel)'}
            </Btn>
          </fieldset>

          {showOverrides ? (
            <fieldset className="space-y-3 rounded-2xl border border-line bg-card p-4 lg:col-span-2">
              <legend className="px-2 text-sm font-semibold text-earth">Ajustements manuels (optionnel)</legend>
              <p className="text-xs text-slate">
                Laissez vide pour conserver le calcul automatique. Renseignez une date seulement si l&apos;annonce officielle locale diffère.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {FESTIVAL_FIELDS.map(({ key, label }) => (
                  <div key={key} className="rounded-xl border border-line bg-white p-3">
                    <label className="block text-xs font-semibold text-earth">{label}</label>
                    <p className="text-meta text-slate mt-1">
                      Auto : {formatFestivalDateFr(autoSchedule.find((row) => row.key === key)?.autoDate)}
                    </p>
                    <input
                      type="date"
                      value={draft.festival_dates?.[key] || ''}
                      onChange={(e) => updateFestival(key, e.target.value)}
                      className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm text-earth"
                    />
                    {draft.festival_dates?.[key] ? (
                      <button
                        type="button"
                        onClick={() => clearFestivalOverride(key)}
                        className="mt-2 text-meta font-semibold text-positive"
                      >
                        Revenir au calcul auto
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="space-y-3 rounded-2xl border border-line bg-card p-4">
            <legend className="px-2 text-sm font-semibold text-earth">Seuils opérationnels</legend>
            {[
              { key: 'sanitary_min_days', label: 'Vide sanitaire minimum (j)', step: 1 },
              { key: 'mortality_threshold_pct', label: 'Seuil mortalité bande préc. (%)', step: 0.5 },
              { key: 'extra_vacuum_days', label: 'Prolongation si pathologie (j)', step: 1 },
              { key: 'next_band_size', label: 'Effectif prochaine bande', step: 100 },
              { key: 'bfr_min_coverage_pct', label: 'Couverture BFR minimum (%)', step: 5 },
              { key: 'ith_stress_threshold', label: 'Seuil ITH stress', step: 0.5 },
            ].map(({ key, label, step }) => (
              <label key={key} className="block text-xs text-slate">
                {label}
                <input
                  type="number"
                  step={step}
                  value={draft[key] ?? ''}
                  onChange={(e) => updateField(key, Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-earth"
                />
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2 rounded-2xl border border-line bg-card p-4">
            <legend className="px-2 text-sm font-semibold text-earth">Clients VIP (créances comptées dans le BFR)</legend>
            {vipOptions.length ? (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {vipOptions.slice(0, 24).map((client) => {
                  const checked = (draft.vip_client_ids || []).includes(client.id);
                  return (
                    <label key={client.id} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleVip(client.id)} />
                      <span className="truncate text-earth">{client.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate">Ajoutez des clients dans le module Clients pour les marquer VIP ici.</p>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Btn onClick={save}>Enregistrer</Btn>
            <Btn variant="outline" onClick={reset}>Réinitialiser</Btn>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate">
          Bande {normalizePilotageSettings(draft).next_band_size} sujets · BFR min {draft.bfr_min_coverage_pct}% ·
          vide sanitaire {draft.sanitary_min_days} j · VIP {(draft.vip_client_ids || []).length} client(s)
        </p>
      )}
    </section>
  );
}
