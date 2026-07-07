import { useMemo } from 'react';
import { Recycle } from 'lucide-react';
import { computeCircularEconomyMetrics } from '../../services/greenpreneurs/circularEconomyMetrics.js';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';

function SourceBadge({ label }) {
  const tone = label === 'ERP réel' ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-white';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${tone}`}>
      {label}
    </span>
  );
}

function KpiTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-3">
      <p className="text-[10px] text-[#8a7456]">{label}</p>
      <p className="text-lg font-black text-[#2f2415] mt-1">{value}</p>
      {hint ? <p className="text-[10px] text-[#8a7456] mt-1">{hint}</p> : null}
    </div>
  );
}

export default function CircularEconomyKpiPanel({
  dataMap = {},
  simulatedMode = false,
  compact = false,
  showPlannedVsRealized = false,
}) {
  const circular = useMemo(
    () => computeCircularEconomyMetrics(dataMap, { simulatedMode }),
    [dataMap, simulatedMode],
  );

  if (compact) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-2">
        <p className="font-black flex items-center gap-2"><Recycle size={16} /> Économie circulaire</p>
        <p>Économies engrais : <b>{fmtCurrency(circular.engraisSavingsFcfa)}</b> · Parcelles fertilisées : <b>{circular.parcellesFertilisees}</b></p>
        <SourceBadge label={circular.sourceLabel} />
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
            <Recycle size={20} className="text-emerald-700" /> Boucle circulaire élevage ↔ cultures
          </p>
          <p className="text-sm text-[#8a7456] mt-1">
            {circular.orgaloopHybrid
              ? 'Fertilisation cultures prioritaire — surplus vendu sur Orgaloop.'
              : `Fientes, litières et fumiers valorisés — ${circular.orgaloopPrimary ? `vente ${circular.orgaloop?.platformName || 'Orgaloop'}` : 'boucle élevage ↔ cultures'}.`}
          </p>
        </div>
        <SourceBadge label={circular.sourceLabel} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Fientes disponibles" value={`${fmtNumber(circular.fientesPondeuses.availableKg)} kg`} />
        <KpiTile label="Fumier bovin" value={`${fmtNumber(circular.fumierBovin.availableKg)} kg`} />
        <KpiTile label="Litière compostée" value={`${fmtNumber(circular.compost.availableKg)} kg`} />
        <KpiTile label="Utilisé sur cultures" value={`${fmtNumber(circular.usedOnCulturesKg)} kg`} />
        {circular.orgaloopHybrid || circular.orgaloop?.soldKg > 0 ? (
          <KpiTile
            label={`Vendu ${circular.orgaloop?.platformName || 'Orgaloop'}`}
            value={`${fmtNumber(circular.orgaloop?.soldKg || 0)} kg`}
            hint={circular.orgaloop?.revenueFcfa > 0 ? fmtCurrency(circular.orgaloop.revenueFcfa) : 'Surplus plateforme'}
          />
        ) : null}
        <KpiTile label="Parcelles fertilisées" value={fmtNumber(circular.parcellesFertilisees)} />
        <KpiTile label="Économies engrais" value={fmtCurrency(circular.engraisSavingsFcfa)} />
        {circular.orgaloopHybrid && circular.effluentSurplusKg > 0 ? (
          <KpiTile label="Surplus effluent" value={`${fmtNumber(circular.effluentSurplusKg)} kg`} hint="À publier Orgaloop" />
        ) : null}
        {circular.orgaloopHybrid || circular.orgaloop?.soldKg > 0 ? (
          <>
            <KpiTile label="Ventes Orgaloop" value={fmtNumber(circular.orgaloop?.salesCount || 0)} hint={`${circular.orgaloop?.soldSacs || 0} sacs`} />
            <KpiTile label="Encaissé Orgaloop" value={fmtCurrency(circular.orgaloop?.encaisseFcfa || circular.orgaloop?.revenueFcfa || 0)} />
          </>
        ) : null}
        <KpiTile label="Stock fertilisant" value={`${fmtNumber(circular.fertilisantStockKg)} kg`} />
        <KpiTile label="Score circularité" value={`${circular.circularityScore}/100`} />
      </div>

      {circular.orgaloopHybrid || circular.orgaloopPrimary ? (
        <p className="text-xs text-emerald-800 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <b>Stratégie {circular.orgaloop?.platformName} :</b> {circular.orgaloop?.strategyLabel} — {circular.orgaloop?.advice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Suif (coproduit)" value={`${fmtNumber(circular.coproduits.suifKg)} kg`} hint="Phase 2 Tallow & Go" />
        <KpiTile label="Os (coproduit)" value={`${fmtNumber(circular.coproduits.osKg)} kg`} hint="Phase 3 BOVINIA" />
      </div>

      {showPlannedVsRealized ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm">
          <p className="font-black text-[#2f2415]">Impact circulaire prévu vs réalisé</p>
          <p className="text-xs text-[#8a7456] mt-2">
            Prévu BP : {fmtCurrency(circular.plannedVsRealized.plannedSavingsFcfa)} ·
            Réalisé : {fmtCurrency(circular.plannedVsRealized.realizedSavingsFcfa)}
          </p>
          <p className="text-xs text-[#8a7456]">
            Parcelles : {circular.plannedVsRealized.realizedFertilizedParcels} réalisées / {circular.plannedVsRealized.plannedFertilizedParcels} prévues
          </p>
        </div>
      ) : null}

      {!circular.hasRealData ? (
        <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 p-3">
          Estimation basée sur les cibles DER/FJ ({circular.targets.layers} pondeuses, {circular.targets.broilersEvery15Days} chair/15j, {circular.targets.bovinsPerMonth} bovins/mois). Enregistrez les flux réels pour passer en <b>ERP réel</b>.
        </p>
      ) : null}
    </section>
  );
}
