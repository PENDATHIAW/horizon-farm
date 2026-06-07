import { useEffect, useState } from 'react';
import { Calculator, Cloud, CloudOff, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Btn from './Btn';
import useFarmCostSettings from '../hooks/useFarmCostSettings.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { UNIFIED_COST_FORMULA } from '../services/unifiedCostService.js';

const SPECIES_KEYS = ['bovin', 'ovin', 'caprin', 'chair', 'ponte'];

function NumberField({ label, value, onChange, step = 'any', suffix = '' }) {
  return (
    <label className="block rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
      <span className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input type="number" step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[#eadcc2] px-2 py-1.5 text-sm font-semibold text-[#2f2415]" />
        {suffix ? <span className="text-xs text-[#8a7456] whitespace-nowrap">{suffix}</span> : null}
      </div>
    </label>
  );
}

export default function FarmCostSettingsPanel({ compact = false }) {
  const { settings, loading, synced, save: persist, reset: resetRemote } = useFarmCostSettings();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const updateRoot = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const updateFeeding = (species, key, value) => setDraft((prev) => ({
    ...prev,
    feedingDefaults: {
      ...prev.feedingDefaults,
      [species]: { ...prev.feedingDefaults[species], [key]: Number(value) || 0 },
    },
  }));
  const updateBroilerPrice = (key, value) => setDraft((prev) => ({
    ...prev,
    broilerPriceByWeight: { ...prev.broilerPriceByWeight, [key]: Number(value) || 0 },
  }));
  const updateAnimalSaleKg = (key, value) => setDraft((prev) => ({
    ...prev,
    animalSalePricePerKg: { ...prev.animalSalePricePerKg, [key]: Number(value) || 0 },
  }));

  const save = async () => {
    setSaving(true);
    try {
      await persist(draft);
      toast.success(synced ? 'Paramètres enregistrés (cloud + appareil)' : 'Paramètres enregistrés localement — cloud indisponible');
    } catch {
      toast.error('Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const next = await resetRemote();
    setDraft(next);
    toast.success('Paramètres réinitialisés aux valeurs ERP');
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm'}`}>
      {!compact ? (
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Calculator size={14} /> Moteur de coût unifié</p>
          <h3 className="mt-1 text-lg font-black text-[#2f2415]">Rations et prix par défaut</h3>
          <p className="mt-1 text-sm text-[#8a7456]">Ces réglages alimentent Animaux, Avicole, Ventes et Finance avec le même coût total partout.</p>
          <p className="mt-2 flex items-center gap-2 text-xs">
            {synced ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800"><Cloud size={12} /> Synchronisé Supabase</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800"><CloudOff size={12} /> Mode local uniquement</span>}
            {loading ? <span className="text-[#8a7456]">Chargement…</span> : null}
          </p>
          <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{UNIFIED_COST_FORMULA}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <NumberField label="Prix aliment par défaut (estimation)" value={draft.defaultFeedPricePerKg} onChange={(v) => updateRoot('defaultFeedPricePerKg', Number(v) || 0)} suffix="FCFA/kg" />
        <NumberField label="Marge cible vente" value={draft.defaultTargetMarginPct} onChange={(v) => updateRoot('defaultTargetMarginPct', Number(v) || 0)} suffix="%" />
        <NumberField label="Poussins / caisse chair" value={draft.broilerCrateSize} onChange={(v) => updateRoot('broilerCrateSize', Number(v) || 0)} suffix="sujets" />
        <NumberField label="Prix caisse poussins" value={draft.broilerCratePrice} onChange={(v) => updateRoot('broilerCratePrice', Number(v) || 0)} suffix="FCFA" />
        <NumberField label="Amortissement pondeuses" value={draft.layerAmortizationDays} onChange={(v) => updateRoot('layerAmortizationDays', Number(v) || 0)} suffix="jours" />
        <NumberField label="Œufs / tablette" value={draft.eggsPerTablet} onChange={(v) => updateRoot('eggsPerTablet', Number(v) || 0)} suffix="œufs" />
      </div>

      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="text-sm font-black text-[#2f2415] mb-3">Rations journalières par espèce / type</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Kg / jour</th>
                <th className="py-2 pr-3">Durée cycle</th>
                <th className="py-2">Libellé</th>
              </tr>
            </thead>
            <tbody>
              {SPECIES_KEYS.map((key) => {
                const row = draft.feedingDefaults[key] || {};
                return (
                  <tr key={key} className="border-b border-[#eadcc2]/60 last:border-0">
                    <td className="py-2 pr-3 font-black capitalize text-[#2f2415]">{key}</td>
                    <td className="py-2 pr-3"><input type="number" step="0.001" value={row.dailyKg ?? ''} onChange={(e) => updateFeeding(key, 'dailyKg', e.target.value)} className="w-24 rounded-lg border border-[#eadcc2] px-2 py-1 text-sm" /></td>
                    <td className="py-2 pr-3"><input type="number" value={row.days ?? ''} onChange={(e) => updateFeeding(key, 'days', e.target.value)} className="w-20 rounded-lg border border-[#eadcc2] px-2 py-1 text-sm" /> <span className="text-xs text-[#8a7456]">j</span></td>
                    <td className="py-2 text-[#7d6a4a]">{row.label || key}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>


      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="text-sm font-black text-[#2f2415] mb-1">Prix de vente suggérés — élevage (FCFA / kg)</p>
        <p className="text-xs text-[#8a7456] mb-3">Proposés sur chaque fiche animal (Bovin, Ovin, Caprin) quand aucun prix/kg n’est saisi sur l’animal. Le moteur prend le max(coût + marge, poids × prix/kg Annexe, marché).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField label="Défaut (autres)" value={draft.animalSalePricePerKg?.default} onChange={(v) => updateAnimalSaleKg('default', v)} suffix="FCFA/kg" />
          <NumberField label="Bovin" value={draft.animalSalePricePerKg?.bovin} onChange={(v) => updateAnimalSaleKg('bovin', v)} suffix="FCFA/kg" />
          <NumberField label="Ovin" value={draft.animalSalePricePerKg?.ovin} onChange={(v) => updateAnimalSaleKg('ovin', v)} suffix="FCFA/kg" />
          <NumberField label="Caprin" value={draft.animalSalePricePerKg?.caprin} onChange={(v) => updateAnimalSaleKg('caprin', v)} suffix="FCFA/kg" />
        </div>
      </section>

      <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="text-sm font-black text-[#2f2415] mb-3">Prix chair suggérés par poids (FCFA / sujet)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField label="&lt; 1,5 kg" value={draft.broilerPriceByWeight.below1_5} onChange={(v) => updateBroilerPrice('below1_5', v)} suffix="FCFA" />
          <NumberField label="≥ 1,5 kg" value={draft.broilerPriceByWeight.at1_5} onChange={(v) => updateBroilerPrice('at1_5', v)} suffix="FCFA" />
          <NumberField label="≥ 1,7 kg" value={draft.broilerPriceByWeight.at1_7} onChange={(v) => updateBroilerPrice('at1_7', v)} suffix="FCFA" />
          <NumberField label="≥ 2,0 kg" value={draft.broilerPriceByWeight.at2_0} onChange={(v) => updateBroilerPrice('at2_0', v)} suffix="FCFA" />
        </div>
        <p className="mt-2 text-xs text-[#8a7456]">Utilisés quand aucun prix saisi : le moteur unifié privilégie toujours coût réel + marge cible ({fmtNumber(draft.defaultTargetMarginPct)} %).</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Btn icon={Save} small onClick={save} disabled={saving || loading}>{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}</Btn>
        <Btn icon={RotateCcw} variant="outline" small onClick={reset} disabled={saving || loading}>Réinitialiser</Btn>
        {draft.updatedAt ? <span className="self-center text-xs text-[#8a7456]">Dernière sauvegarde : {new Date(draft.updatedAt).toLocaleString('fr-FR')}</span> : null}
      </div>

      {!compact ? (
        <p className="text-xs text-[#8a7456]">Aperçu caisse poussins : {fmtCurrency(draft.broilerCratePrice)} / {fmtNumber(draft.broilerCrateSize)} = {fmtCurrency(draft.broilerCrateSize > 0 ? draft.broilerCratePrice / draft.broilerCrateSize : 0)} / sujet</p>
      ) : null}
    </div>
  );
}
