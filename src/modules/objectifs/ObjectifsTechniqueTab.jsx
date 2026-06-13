import { fmtNumber } from '../../utils/format';
import EfficaciteTechniqueTab from './EfficaciteTechniqueTab.jsx';
import RentabiliteLotCycleTab from './RentabiliteLotCycleTab.jsx';
import CrossAnalyticsSections from './CrossAnalyticsSections.jsx';

function aggregateTechnical(analytics = {}) {
  const rows = analytics.technical?.rows || [];
  const chair = rows.filter((r) => r.workshop === 'poulets_chair' && r.ic != null);
  const pondeuses = rows.filter((r) => r.workshop === 'pondeuses' && r.realPonte != null);
  const bovins = rows.filter((r) => r.workshop === 'bovins' && r.gmq != null);

  const icAvg = chair.length
    ? Math.round((chair.reduce((s, r) => s + r.ic, 0) / chair.length) * 10) / 10
    : 0;
  const ponteAvg = pondeuses.length
    ? Math.round(pondeuses.reduce((s, r) => s + r.realPonte, 0) / pondeuses.length)
    : 0;
  const ponteTarget = pondeuses.length
    ? Math.round(pondeuses.reduce((s, r) => s + (r.theoreticalPonte || 0), 0) / pondeuses.length)
    : 92;
  const gmqAvg = bovins.length
    ? Math.round(bovins.reduce((s, r) => s + r.gmq, 0) / bovins.length)
    : 0;

  const hasData = chair.length || pondeuses.length || bovins.length;

  return { icAvg, ponteAvg, ponteTarget, gmqAvg, hasData };
}

export default function ObjectifsTechniqueTab({ analytics = {}, onNavigate }) {
  const { icAvg, ponteAvg, ponteTarget, gmqAvg, hasData } = aggregateTechnical(analytics);
  const cross = analytics.cross || {};
  const crossForTab = {
    seasonality: cross.seasonality,
    feedInflation: cross.feedInflation,
    shrinkage: cross.shrinkage,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-black text-[#2f2415]">Performances Avicoles & Bovins</h3>
          <p className="text-sm text-[#8a7456]">Lots actifs — IC, ponte vs standard de race, GMQ engraissement.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] text-[#8a7456]">Indice de Consommation</p>
            <p className="font-black text-lg">{hasData ? icAvg.toFixed(1) : '0.0'}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] text-[#8a7456]">Taux de Ponte Réel</p>
            <p className="font-black text-lg">{fmtNumber(ponteAvg)}%</p>
            <p className="text-[10px] text-[#8a7456]">Standard race : {fmtNumber(ponteTarget)}%</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] text-[#8a7456]">GMQ bovins</p>
            <p className="font-black text-lg">{fmtNumber(gmqAvg)} g / jour</p>
            <p className="text-[10px] text-[#8a7456]">Objectif : 800 g / jour</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[10px] text-[#8a7456]">Courbe de performance</p>
            <p className="font-black text-sm text-[#8a7456]">{hasData ? 'Données en cours' : 'En attente de données'}</p>
          </div>
        </div>
        {!hasData ? (
          <p className="text-sm text-[#7d6a4a] rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            Le système attend les journaux de ponte et de pesée du module Élevage pour comparer vos performances réelles
            aux standards théoriques (Lohmann, ISA Brown, Cobb 500). C&apos;est ce calcul qui validera votre rentabilité par lot.
          </p>
        ) : null}
      </section>

      <EfficaciteTechniqueTab analytics={analytics} onNavigate={onNavigate} />
      <RentabiliteLotCycleTab analytics={analytics} onNavigate={onNavigate} />
      <CrossAnalyticsSections cross={crossForTab} />
    </div>
  );
}
