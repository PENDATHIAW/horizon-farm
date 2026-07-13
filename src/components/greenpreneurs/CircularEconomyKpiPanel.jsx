import { useMemo } from 'react';
import { Recycle } from 'lucide-react';
import { computeCircularEconomyMetrics } from '../../services/greenpreneurs/circularEconomyMetrics.js';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';

function SourceBadge({ label }) {
  const tone = label === 'ERP réel' ? 'bg-positive text-white' : 'bg-vigilance text-white';
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-meta font-semibold uppercase ${tone}`}>
      {label}
    </span>
  );
}

function KpiTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-positive bg-white p-3">
      <p className="text-meta text-slate">{label}</p>
      <p className="text-lg font-semibold text-earth mt-1">{value}</p>
      {hint ? <p className="text-meta text-slate mt-1">{hint}</p> : null}
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
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive space-y-2">
        <p className="font-semibold flex items-center gap-2"><Recycle size={16} /> Économie circulaire</p>
        <p>Économies engrais : <b>{fmtCurrency(circular.engraisSavingsFcfa)}</b> · Parcelles fertilisées : <b>{circular.parcellesFertilisees}</b></p>
        <SourceBadge label={circular.sourceLabel} />
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-positive bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-earth flex items-center gap-2">
            <Recycle size={20} className="text-positive" /> Boucle circulaire élevage ↔ cultures
          </p>
          <p className="text-sm text-slate mt-1">
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
        <p className="text-xs text-positive rounded-xl border border-positive bg-positive-bg p-3">
          <b>Stratégie {circular.orgaloop?.platformName} :</b> {circular.orgaloop?.strategyLabel} — {circular.orgaloop?.advice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
      </div>

      {showPlannedVsRealized ? (
        <div className="rounded-2xl border border-line bg-card p-3 text-sm">
          <p className="font-semibold text-earth">Impact circulaire prévu vs réalisé</p>
          <p className="text-xs text-slate mt-2">
            Prévu BP : {fmtCurrency(circular.plannedVsRealized.plannedSavingsFcfa)} ·
            Réalisé : {fmtCurrency(circular.plannedVsRealized.realizedSavingsFcfa)}
          </p>
          <p className="text-xs text-slate">
            Parcelles : {circular.plannedVsRealized.realizedFertilizedParcels} réalisées / {circular.plannedVsRealized.plannedFertilizedParcels} prévues
          </p>
        </div>
      ) : null}

      {!circular.hasRealData ? (
        <p className="text-xs text-horizon-dark rounded-xl border border-vigilance bg-vigilance-bg p-3">
          Estimation basée sur les cibles DER/FJ ({circular.targets.layers} pondeuses, {circular.targets.broilersEvery15Days} chair/15j, {circular.targets.bovinsPerMonth} bovins/mois). Enregistrez les flux réels pour passer en <b>ERP réel</b>.
        </p>
      ) : null}
    </section>
  );
}
