import { useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
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
  { key: 'fin_annee', label: 'Fin d\'année' },
  { key: 'ramadan', label: 'Ramadan' },
];

export default function PilotageSettingsPanel({ clients = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => loadPilotageSettings());

  useEffect(() => {
    setDraft(loadPilotageSettings());
  }, [open]);

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
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
            <Settings2 size={14} /> Paramètres pilotage
          </p>
          <h3 className="text-lg font-black text-[#2f2415] mt-1">Dates fêtes, seuils et clients VIP</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Ces réglages alimentent les moteurs QUAND VENDRE / QUAND LANCER et le calcul BFR. Stockés localement sur cet appareil.
          </p>
        </div>
        <Btn variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Masquer' : 'Configurer'}
        </Btn>
      </div>

      {open ? (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <fieldset className="space-y-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <legend className="px-2 text-sm font-black text-[#2f2415]">Dates pivot marché</legend>
            {FESTIVAL_FIELDS.map(({ key, label }) => (
              <label key={key} className="block text-xs text-[#8a7456]">
                {label}
                <input
                  type="date"
                  value={draft.festival_dates?.[key] || ''}
                  onChange={(e) => updateFestival(key, e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm text-[#2f2415]"
                />
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <legend className="px-2 text-sm font-black text-[#2f2415]">Seuils opérationnels</legend>
            {[
              { key: 'sanitary_min_days', label: 'Vide sanitaire minimum (j)', step: 1 },
              { key: 'mortality_threshold_pct', label: 'Seuil mortalité bande préc. (%)', step: 0.5 },
              { key: 'extra_vacuum_days', label: 'Prolongation si pathologie (j)', step: 1 },
              { key: 'next_band_size', label: 'Effectif prochaine bande', step: 100 },
              { key: 'bfr_min_coverage_pct', label: 'Couverture BFR minimum (%)', step: 5 },
              { key: 'ith_stress_threshold', label: 'Seuil ITH stress', step: 0.5 },
            ].map(({ key, label, step }) => (
              <label key={key} className="block text-xs text-[#8a7456]">
                {label}
                <input
                  type="number"
                  step={step}
                  value={draft[key] ?? ''}
                  onChange={(e) => updateField(key, Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2 text-sm text-[#2f2415]"
                />
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 lg:col-span-2">
            <legend className="px-2 text-sm font-black text-[#2f2415]">Clients VIP (créances comptées dans le BFR)</legend>
            {vipOptions.length ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {vipOptions.slice(0, 24).map((client) => {
                  const checked = (draft.vip_client_ids || []).includes(client.id);
                  return (
                    <label key={client.id} className="flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleVip(client.id)} />
                      <span className="truncate text-[#2f2415]">{client.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#8a7456]">Ajoutez des clients dans le module Clients pour les marquer VIP ici.</p>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Btn onClick={save}>Enregistrer</Btn>
            <Btn variant="outline" onClick={reset}>Réinitialiser</Btn>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#8a7456]">
          Bande {normalizePilotageSettings(draft).next_band_size} sujets · BFR min {draft.bfr_min_coverage_pct}% ·
          vide sanitaire {draft.sanitary_min_days} j · VIP {(draft.vip_client_ids || []).length} client(s)
        </p>
      )}
    </section>
  );
}
