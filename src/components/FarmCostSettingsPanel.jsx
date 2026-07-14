import { useEffect, useState } from 'react';
import { Calculator, Cloud, CloudOff, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Btn from './Btn';
import useFarmCostSettings from '../hooks/useFarmCostSettings.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { UNIFIED_COST_FORMULA } from '../services/unifiedCostService.js';
import { t } from '../i18n/fr/index.js';

const SPECIES_KEYS = ['bovin', 'ovin', 'caprin', 'chair', 'ponte'];

function NumberField({ label, value, onChange, step = 'any', suffix = '' }) {
  return (
    <label className="block rounded-xl border border-line bg-white px-3 py-2">
      <span className="text-meta uppercase tracking-normal text-slate">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input type="number" step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-line px-2 py-2 text-sm font-semibold text-earth" />
        {suffix ? <span className="text-xs text-slate whitespace-nowrap">{suffix}</span> : null}
      </div>
    </label>
  );
}

export default function FarmCostSettingsPanel({ compact = false }) {
  const { settings, loading, synced, save: persist, reset: resetRemote } = useFarmCostSettings();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setDraft(settings));
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
      toast.success(synced ? t('coutsFerme.toasts.enregistreCloud') : t('coutsFerme.toasts.enregistreLocal'));
    } catch {
      toast.error(t('coutsFerme.toasts.echec'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const next = await resetRemote();
    setDraft(next);
    toast.success(t('coutsFerme.toasts.reinitialise'));
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'rounded-3xl border border-line bg-white p-6 shadow-card'}`}>
      {!compact ? (
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><Calculator size={14} /> {t('coutsFerme.entete.moteur')}</p>
          <h3 className="mt-1 text-lg font-semibold text-earth">{t('coutsFerme.entete.titre')}</h3>
          <p className="mt-1 text-sm text-slate">{t('coutsFerme.entete.description')}</p>
          <p className="mt-2 flex items-center gap-2 text-xs">
            {synced ? <span className="inline-flex items-center gap-1 rounded-full bg-positive-bg px-2 py-1 font-semibold text-positive"><Cloud size={12} /> {t('coutsFerme.entete.synchronise')}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-vigilance-bg px-2 py-1 font-semibold text-horizon-dark"><CloudOff size={12} /> {t('coutsFerme.entete.localUniquement')}</span>}
            {loading ? <span className="text-slate">{t('coutsFerme.entete.chargement')}</span> : null}
          </p>
          <p className="mt-2 rounded-xl border border-positive bg-positive-bg px-3 py-2 text-xs text-positive">{UNIFIED_COST_FORMULA}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <NumberField label={t('coutsFerme.champs.prixAliment')} value={draft.defaultFeedPricePerKg} onChange={(v) => updateRoot('defaultFeedPricePerKg', Number(v) || 0)} suffix={t('coutsFerme.champs.fcfaKg')} />
        <NumberField label={t('coutsFerme.champs.margeCible')} value={draft.defaultTargetMarginPct} onChange={(v) => updateRoot('defaultTargetMarginPct', Number(v) || 0)} suffix={t('coutsFerme.champs.pourcent')} />
        <NumberField label={t('coutsFerme.champs.poussinsCaisse')} value={draft.broilerCrateSize} onChange={(v) => updateRoot('broilerCrateSize', Number(v) || 0)} suffix={t('coutsFerme.champs.sujets')} />
        <NumberField label={t('coutsFerme.champs.prixCaisse')} value={draft.broilerCratePrice} onChange={(v) => updateRoot('broilerCratePrice', Number(v) || 0)} suffix={t('coutsFerme.champs.fcfa')} />
        <NumberField label={t('coutsFerme.champs.amortissement')} value={draft.layerAmortizationDays} onChange={(v) => updateRoot('layerAmortizationDays', Number(v) || 0)} suffix={t('coutsFerme.champs.jours')} />
        <NumberField label={t('coutsFerme.champs.oeufsTablette')} value={draft.eggsPerTablet} onChange={(v) => updateRoot('eggsPerTablet', Number(v) || 0)} suffix={t('coutsFerme.champs.oeufs')} />
      </div>

      <section className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm font-semibold text-earth mb-3">{t('coutsFerme.rations.titre')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-meta uppercase tracking-normal text-slate border-b border-line">
                <th className="py-2 pr-3">{t('coutsFerme.rations.colType')}</th>
                <th className="py-2 pr-3">{t('coutsFerme.rations.colKgJour')}</th>
                <th className="py-2 pr-3">{t('coutsFerme.rations.colDuree')}</th>
                <th className="py-2">{t('coutsFerme.rations.colLibelle')}</th>
              </tr>
            </thead>
            <tbody>
              {SPECIES_KEYS.map((key) => {
                const row = draft.feedingDefaults[key] || {};
                return (
                  <tr key={key} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3 font-semibold capitalize text-earth">{key}</td>
                    <td className="py-2 pr-3"><input type="number" step="0.001" value={row.dailyKg ?? ''} onChange={(e) => updateFeeding(key, 'dailyKg', e.target.value)} className="w-24 rounded-lg border border-line px-2 py-1 text-sm" /></td>
                    <td className="py-2 pr-3"><input type="number" value={row.days ?? ''} onChange={(e) => updateFeeding(key, 'days', e.target.value)} className="w-20 rounded-lg border border-line px-2 py-1 text-sm" /> <span className="text-xs text-slate">j</span></td>
                    <td className="py-2 text-slate">{row.label || key}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>


      <section className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm font-semibold text-earth mb-1">{t('coutsFerme.venteElevage.titre')}</p>
        <p className="text-xs text-slate mb-3">{t('coutsFerme.venteElevage.aide')}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField label={t('coutsFerme.venteElevage.defaut')} value={draft.animalSalePricePerKg?.default} onChange={(v) => updateAnimalSaleKg('default', v)} suffix={t('coutsFerme.champs.fcfaKg')} />
          <NumberField label={t('coutsFerme.venteElevage.bovin')} value={draft.animalSalePricePerKg?.bovin} onChange={(v) => updateAnimalSaleKg('bovin', v)} suffix={t('coutsFerme.champs.fcfaKg')} />
          <NumberField label={t('coutsFerme.venteElevage.ovin')} value={draft.animalSalePricePerKg?.ovin} onChange={(v) => updateAnimalSaleKg('ovin', v)} suffix={t('coutsFerme.champs.fcfaKg')} />
          <NumberField label={t('coutsFerme.venteElevage.caprin')} value={draft.animalSalePricePerKg?.caprin} onChange={(v) => updateAnimalSaleKg('caprin', v)} suffix={t('coutsFerme.champs.fcfaKg')} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm font-semibold text-earth mb-3">{t('coutsFerme.chair.titre')}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField label="&lt; 1,5 kg" value={draft.broilerPriceByWeight.below1_5} onChange={(v) => updateBroilerPrice('below1_5', v)} suffix={t('coutsFerme.champs.fcfa')} />
          <NumberField label="≥ 1,5 kg" value={draft.broilerPriceByWeight.at1_5} onChange={(v) => updateBroilerPrice('at1_5', v)} suffix={t('coutsFerme.champs.fcfa')} />
          <NumberField label="≥ 1,7 kg" value={draft.broilerPriceByWeight.at1_7} onChange={(v) => updateBroilerPrice('at1_7', v)} suffix={t('coutsFerme.champs.fcfa')} />
          <NumberField label="≥ 2,0 kg" value={draft.broilerPriceByWeight.at2_0} onChange={(v) => updateBroilerPrice('at2_0', v)} suffix={t('coutsFerme.champs.fcfa')} />
        </div>
        <p className="mt-2 text-xs text-slate">{t('coutsFerme.chair.aide', { marge: fmtNumber(draft.defaultTargetMarginPct) })}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Btn icon={Save} small onClick={save} disabled={saving || loading}>{saving ? t('coutsFerme.actions.enregistrement') : t('coutsFerme.actions.enregistrer')}</Btn>
        <Btn icon={RotateCcw} variant="outline" small onClick={reset} disabled={saving || loading}>{t('coutsFerme.actions.reinitialiser')}</Btn>
        {draft.updatedAt ? <span className="self-center text-xs text-slate">{t('coutsFerme.actions.derniereSauvegarde', { date: new Date(draft.updatedAt).toLocaleString('fr-FR') })}</span> : null}
      </div>

      {!compact ? (
        <p className="text-xs text-slate">{t('coutsFerme.apercuCaisse', { prix: fmtCurrency(draft.broilerCratePrice), taille: fmtNumber(draft.broilerCrateSize), parSujet: fmtCurrency(draft.broilerCrateSize > 0 ? draft.broilerCratePrice / draft.broilerCrateSize : 0) })}</p>
      ) : null}
    </div>
  );
}
