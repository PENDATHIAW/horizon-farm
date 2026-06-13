import { useMemo, useState } from 'react';
import { Sprout } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { calculateBiomassValue } from '../../services/objectifsDecision/predictiveAnalysisEngine.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function ObjectifsSandboxTab({
  analytics = {},
  onNavigate,
  onCreateCulture,
  onRefreshCultures,
}) {
  const baseBiomass = analytics.maraichage?.biomass || {};
  const poulesCount = analytics.maraichage?.poulesCount || 0;
  const bovinsCount = analytics.maraichage?.bovinsCount || 0;
  const cultures = analytics.maraichage?.cultures || [];
  const [npkPrice, setNpkPrice] = useState(baseBiomass.npk_bag_price || 15000);
  const [launching, setLaunching] = useState(false);

  const biomass = useMemo(
    () => calculateBiomassValue(poulesCount, bovinsCount, npkPrice),
    [poulesCount, bovinsCount, npkPrice],
  );

  const volumeTonnes = Math.round((Number(biomass.fientes_tonnes || 0) + Number(biomass.fumier_bovin_tonnes || 0)) * 10) / 10;

  const launchCampaign = async () => {
    if (!onCreateCulture) {
      onNavigate?.('cultures', { tab: 'Parcelles & Cultures' });
      return;
    }
    setLaunching(true);
    try {
      const parcelCode = `SB-${String(Date.now()).slice(-6)}`;
      const cultureId = `CULT-OBJ-${Date.now()}`;
      await onCreateCulture({
        id: cultureId,
        nom: 'Campagne maraîchère 100 m²',
        type: 'Tomates',
        record_type: 'culture',
        parcelle: 'Parcelle Sandbox Objectifs',
        parcelle_code: parcelCode,
        campagne: `Objectifs ${today().slice(0, 7)}`,
        statut: 'planifiee',
        date_debut_campagne: today(),
        date_semis: today(),
        surface: 100,
        surface_exploitable: 100,
        unite_surface: 'm²',
        budget_prevu: 0,
        cout_engrais: 0,
        cout_total_reel: 0,
        revenu_reel: 0,
        source: 'objectifs_sandbox',
        source_module: 'objectifs_croissance',
        notes: 'Intrants à 0 FCFA — fumier transféré depuis élevage (économie circulaire).',
      });
      await onRefreshCultures?.();
      onNavigate?.('cultures', { tab: 'Parcelles & Cultures' });
    } catch (error) {
      console.warn('[ObjectifsSandboxTab] launch campaign', error);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-emerald-900">Convertisseur de Biomasse (Fumier → Engrais NPK)</h3>
        <p className="text-sm text-emerald-800">Volume disponible au hangar et économie d&apos;intrants basée sur le prix réel du sac dans Stock.</p>
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="text-xs text-[#8a7456]">Volume fientes / fumier disponible</p>
          <p className="text-2xl font-black text-[#2f2415]">{fmtNumber(volumeTonnes)} tonnes</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <p className="text-[10px] text-[#8a7456]">Sacs NPK économisés</p>
            <p className="font-black text-lg">{fmtNumber(biomass.sacs_npk_economises)} sacs</p>
          </div>
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <p className="text-[10px] text-[#8a7456]">Économie intrants mensuelle</p>
            <p className="font-black text-lg text-emerald-700">+{fmtCurrency(biomass.economie_totale_fcfa)}</p>
          </div>
          <div className="rounded-xl bg-white border border-emerald-200 p-3">
            <label className="text-[10px] text-[#8a7456]">Prix sac NPK (Stock)</label>
            <input
              type="number"
              className="mt-1 w-full rounded border px-2 py-1 text-sm font-black"
              value={npkPrice}
              onChange={(e) => setNpkPrice(Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        <h4 className="font-black text-[#2f2415]">Planificateur d&apos;Assolement Maraîcher (100 m²)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[#8a7456] border-b border-[#eadcc2]">
                <th className="py-2 text-left">Culture</th>
                <th className="py-2 text-right">CA prévu</th>
                <th className="py-2 text-right">Coût intrants chimiques</th>
                <th className="py-2 text-right">Marge brute</th>
                <th className="py-2 text-right">Marge + fumier</th>
              </tr>
            </thead>
            <tbody>
              {cultures.map((c) => (
                <tr key={c.name} className="border-b border-[#eadcc2]/50">
                  <td className="py-2 font-black">{c.name}</td>
                  <td className="py-2 text-right">{fmtCurrency(c.revenue)}</td>
                  <td className="py-2 text-right">{fmtCurrency(c.cost)}</td>
                  <td className="py-2 text-right">{fmtCurrency(c.marginBrute)}</td>
                  <td className="py-2 text-right font-black text-emerald-700">{fmtCurrency(c.marginWithBiomass)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <button
        type="button"
        disabled={launching}
        onClick={launchCampaign}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        <Sprout size={18} />
        {launching ? 'Création en cours…' : 'Lancer la Campagne Maraîchère'}
      </button>
      <p className="text-xs text-center text-[#8a7456]">
        Crée la parcelle dans Cultures et transfère le fumier à coût zéro.
      </p>
    </div>
  );
}
