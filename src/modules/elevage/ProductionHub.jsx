import { Beef, ChevronDown, Drumstick, Egg, Factory, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { navigateToEggStock } from '../../utils/productionNavigation.js';
import { diagnoseElevageEntity, pickDefaultDiagnosticTarget } from '../../utils/elevageLotDiagnostic.js';
import { PRODUCTION_FINANCE_LABELS } from '../../utils/productionFinancialTruth.js';
import { ELEVAGE_KPI_GRID, ElevageStatCard } from './elevageUi.jsx';

function ActionCard({ title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[48px] rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:bg-[#dcfce7]"
    >
      <b className="text-[#2f2415]">{title}</b>
      <p className="mt-1 text-sm text-[#8a7456]">{text}</p>
    </button>
  );
}

function CollapsibleBlock({ icon: Icon, title, intro, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-[48px] items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
            <Icon size={20} aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#8a7456]">{intro}</p>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-[#8a7456] transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? children : null}
    </section>
  );
}

function toneFromBreakRate(rate) {
  if (!rate) return 'good';
  if (rate > 8) return 'bad';
  if (rate > 4) return 'warn';
  return 'good';
}

function toneFromMortality(rate) {
  if (!rate) return 'good';
  if (rate > 5) return 'bad';
  if (rate > 2) return 'warn';
  return 'good';
}

export default function ProductionHub({
  snapshot = {},
  lots = [],
  animaux = [],
  marginContext = {},
  setTab,
  onNavigate,
  onOpenWorkflow,
  contextView = 'all',
  placement = 'inline',
}) {
  const eggs = snapshot.eggs || {};
  const chair = snapshot.chair || {};
  const bovins = snapshot.bovins || {};
  const ovins = snapshot.ovins || {};
  const caprins = snapshot.caprins || {};
  const transform = snapshot.transformation || {};
  const perf = snapshot.performance || {};

  const defaultTarget = useMemo(() => pickDefaultDiagnosticTarget({ lots, animaux }), [lots, animaux]);
  const [diagnostic, setDiagnostic] = useState(null);

  const runDiagnostic = () => {
    const pick = defaultTarget;
    if (!pick) return;
    setDiagnostic(diagnoseElevageEntity(pick.entity, { lots, marginContext }));
  };

  const heroKpisAll = [
    {
      label: 'Œufs vendables (7 j)',
      value: fmtNumber(perf.sellableEggs7d ?? eggs.sellable7d),
      tone: (perf.sellableEggs7d ?? eggs.sellable7d) > 0 ? 'good' : 'warn',
    },
    {
      label: 'Taux casse (7 j)',
      value: perf.eggBreakRate7d ? fmtPercent(perf.eggBreakRate7d) : '—',
      tone: toneFromBreakRate(perf.eggBreakRate7d),
    },
    {
      label: 'IC chair (€/kg)',
      value: perf.chairCostPerKgAvg > 0 ? fmtCurrency(perf.chairCostPerKgAvg) : '—',
      tone: perf.chairCostPerKgAvg > 0 ? 'neutral' : 'warn',
    },
    {
      label: 'GMQ bovins',
      value: perf.bovinGmqAvg > 0 ? `${fmtNumber(perf.bovinGmqAvg)} g/j` : '—',
      tone: perf.bovinGmqAvg > 0 ? 'good' : 'warn',
    },
    {
      label: 'Stock viande (kg)',
      value: perf.meatStockKg > 0 ? fmtNumber(perf.meatStockKg) : '—',
      tone: perf.meatStockKg > 0 ? 'good' : 'warn',
    },
    {
      label: PRODUCTION_FINANCE_LABELS.marginGross,
      value: perf.technicalMarginLabel || '—',
      tone: perf.technicalMarginTotal > 0 ? 'good' : perf.technicalMarginTotal != null ? 'warn' : 'neutral',
    },
  ];

  const heroKpis = contextView === 'avicole'
    ? heroKpisAll.filter((k) => /œuf|casse|IC chair/i.test(k.label))
    : contextView === 'animaux'
      ? heroKpisAll.filter((k) => /GMQ|viande|marge/i.test(k.label))
      : heroKpisAll;

  const hubBody = (
    <div className="space-y-5 production-hub-mobile">
      <style>{`
        @media (max-width: 640px) {
          .production-hub-mobile .grid { gap: 0.75rem; }
        }
      `}</style>

      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Performances & rendements</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8a7456]">
            Œufs, lait/viande, rendement, indice de consommation et rentabilité technique — données issues d&apos;Alimentation, Avicole, Animaux et Transformation.
            Le registre cheptel et les lots sont sur <b>Animaux</b> et <b>Avicole</b>.
          </p>
        </div>
        <div className={ELEVAGE_KPI_GRID}>
          {heroKpis.map((kpi) => (
            <ElevageStatCard key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!defaultTarget}
            onClick={runDiagnostic}
            className="min-h-[48px] inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 text-sm font-black text-white disabled:opacity-50"
          >
            <Sparkles size={16} /> Analyser ce lot
          </button>
        </div>
        {diagnostic ? (
          <div className={`rounded-xl border p-4 text-sm ${diagnostic.reliable ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <b>{diagnostic.title}</b>
            <p className="mt-2">{diagnostic.causeText}</p>
            {diagnostic.tips?.length ? (
              <ul className="mt-2 list-disc pl-4 text-xs">
                {diagnostic.tips.map((t) => <li key={t}>{t}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {(contextView === 'all' || contextView === 'avicole') ? (
        <>
      <CollapsibleBlock
        icon={Egg}
        title="Œufs & rendement ponte"
        intro="Ramassages, casses, coût/œuf et taux de ponte — pas le registre pondeuses."
        defaultOpen={placement !== 'footer'}
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Produits (7 j)', value: fmtNumber(eggs.produced7d), tone: 'good' },
            { label: 'Vendables (7 j)', value: fmtNumber(eggs.sellable7d), tone: 'good' },
            { label: 'Coût / œuf', value: perf.costPerEggAvg > 0 ? fmtCurrency(perf.costPerEggAvg) : '—', tone: perf.costPerEggAvg > 0 ? 'neutral' : 'warn' },
            { label: 'Taux ponte moy.', value: perf.layingRateAvg > 0 ? fmtPercent(perf.layingRateAvg) : '—', tone: perf.layingRateAvg > 0 ? 'good' : 'warn' },
            { label: 'Tablettes est.', value: fmtNumber(eggs.tablettesEst), tone: 'good' },
            { label: 'Marge œufs', value: perf.eggMarginAvg != null ? fmtCurrency(perf.eggMarginAvg) : '—', tone: perf.eggMarginAvg > 0 ? 'good' : 'warn' },
          ].map((s) => (
            <ElevageStatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
        {eggs.recentLogs?.length ? (
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Derniers ramassages</p>
            {eggs.recentLogs.map((row) => (
              <div key={row.id || row.date} className="flex justify-between border-b border-[#eadcc2]/70 py-2 text-sm last:border-b-0">
                <span className="text-[#2f2415]">{String(row.date || row.created_at || '—').slice(0, 10)}</span>
                <span className="font-black text-[#8a7456]">{fmtNumber(row.oeufs_produits || row.eggs_count || 0)} œufs</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#8a7456]">
            Aucun ramassage sur 7 jours — enregistrez un ramassage pour suivre la ponte.
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ActionCard key="egg-log" title="Enregistrer ramassage" text="Workflow officiel — log, stock œufs." onClick={() => onOpenWorkflow?.('eggs')} />
          <ActionCard key="egg-stock" title="Stock œufs & tablettes" text="Voir stock produit (Achats & Stock)." onClick={() => navigateToEggStock(onNavigate)} />
          {eggs.eggOpportunities ? (
            <ActionCard key="egg-sales" title="Ventes œufs / tablettes" text={`${eggs.eggOpportunities} opportunité(s) Commercial.`} onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} />
          ) : null}
          <ActionCard key="avicole-pondeuses" title="Registre pondeuses" text="Lots et effectifs — vue Avicole." onClick={() => setTab('avicole')} />
        </div>
      </CollapsibleBlock>
        </>
      ) : null}

      {(contextView === 'all' || contextView === 'avicole') ? (
      <CollapsibleBlock
        icon={Drumstick}
        title="Chair — rendement & IC"
        intro="Poids, mortalité, coût/kg et marge — lots prêts vente en lecture seule."
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Poids moyen', value: chair.avgWeight > 0 ? `${chair.avgWeight.toFixed(2)} kg` : '—', tone: chair.avgWeight > 0 ? 'good' : 'warn' },
            { label: 'Mortalité moy.', value: chair.avgMortality ? fmtNumber(chair.avgMortality) : '—', tone: toneFromMortality(perf.chairMortalityRateAvg) },
            { label: 'IC (€/kg)', value: perf.chairCostPerKgAvg > 0 ? fmtCurrency(perf.chairCostPerKgAvg) : '—', tone: perf.chairCostPerKgAvg > 0 ? 'neutral' : 'warn' },
            { label: 'Prêts vente', value: fmtNumber(chair.readyLots), tone: chair.readyLots ? 'good' : 'warn' },
            { label: 'Marge chair', value: perf.chairMarginAvg != null ? fmtCurrency(perf.chairMarginAvg) : '—', tone: perf.chairMarginAvg > 0 ? 'good' : 'warn' },
          ].map((s) => (
            <ElevageStatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
        {chair.readyList?.length ? (
          <ul className="space-y-1 text-sm">
            <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Échéances vente (lecture)</p>
            {chair.readyList.map((lot) => (
              <li key={lot.id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                <b>{lot.name}</b> · {fmtNumber(lot.effectif)} actifs
                {lot.weight > 0 ? ` · ${lot.weight.toFixed(2)} kg` : ''}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ActionCard key="chair-lots" title="Registre lots chair" text="Fiches Avicole — effectifs, pesées." onClick={() => setTab('avicole')} />
          {chair.readyLots > 0 ? (
            <ActionCard key="chair-sale" title="Préparer vente" text={`${chair.readyLots} lot(s) prêt(s).`} onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
          ) : null}
          <ActionCard key="chair-transform" title="Transformation viande" text="Abattage avicole et stock." onClick={() => setTab('Transformation')} />
        </div>
      </CollapsibleBlock>
      ) : null}

      {(contextView === 'all' || contextView === 'animaux') ? (
        <>
      <CollapsibleBlock
        icon={Beef}
        title="Bovins — GMQ & rentabilité"
        intro="Gain quotidien, coût/kg et marge — pas le registre cheptel."
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'GMQ moyen', value: perf.bovinGmqAvg > 0 ? `${fmtNumber(perf.bovinGmqAvg)} g/j` : '—', tone: perf.bovinGmqAvg > 0 ? 'good' : 'warn' },
            { label: 'Poids moyen', value: bovins.avgWeight > 0 ? `${bovins.avgWeight.toFixed(0)} kg` : '—', tone: bovins.avgWeight > 0 ? 'good' : 'warn' },
            { label: 'Coût / kg', value: perf.bovinCostPerKgAvg > 0 ? fmtCurrency(perf.bovinCostPerKgAvg) : '—', tone: perf.bovinCostPerKgAvg > 0 ? 'neutral' : 'warn' },
            { label: 'Proches cible', value: fmtNumber(bovins.nearTargetCount), tone: bovins.nearTargetCount ? 'good' : 'warn' },
            { label: 'Marge bovins', value: perf.bovinMarginAvg != null ? fmtCurrency(perf.bovinMarginAvg) : '—', tone: perf.bovinMarginAvg > 0 ? 'good' : 'warn' },
          ].map((s) => (
            <ElevageStatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
        {bovins.nearTargetList?.length ? (
          <ul className="space-y-1 text-sm">
            <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Proches poids cible</p>
            {bovins.nearTargetList.map((k) => (
              <li key={k.id} className="rounded-lg border border-[#eadcc2] bg-[#fffdf8] px-3 py-2">
                <b>{k.name}</b>
                {k.weight > 0 ? ` · ${k.weight} kg` : ''}
                {k.targetWeight > 0 ? ` / cible ${k.targetWeight} kg` : ''}
                {k.gmq ? ` · GMQ ${fmtNumber(k.gmq)} g/j` : ''}
                {k.reliable && k.margin != null ? ` · ${PRODUCTION_FINANCE_LABELS.marginGross} ${fmtCurrency(k.margin)}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ActionCard key="bov-animaux" title="Registre bovins" text="Cheptel, pesées — vue Animaux." onClick={() => setTab('animaux')} />
          {bovins.nearTargetCount > 0 ? (
            <ActionCard key="bov-sale" title="Préparer vente" text={`${bovins.nearTargetCount} animal(aux) proche(s) cible.`} onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
          ) : null}
          <ActionCard key="bov-transform" title="Transformation viande" text="Abattage animal et stock." onClick={() => setTab('Transformation')} />
        </div>
      </CollapsibleBlock>

      {ovins.hasData ? (
        <CollapsibleBlock icon={Beef} title="Ovins — GMQ & rentabilité" intro="Brebis, agneaux — poids et marge technique.">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Actifs', value: fmtNumber(ovins.activeCount) },
              { label: 'Proches cible', value: fmtNumber(ovins.nearTargetCount), tone: ovins.nearTargetCount ? 'good' : 'warn' },
              { label: 'Poids moyen', value: ovins.avgWeight > 0 ? `${ovins.avgWeight.toFixed(0)} kg` : '—', tone: ovins.avgWeight > 0 ? 'good' : 'warn' },
            ].map((s) => (
              <ElevageStatCard key={s.label} label={s.label} value={s.value} tone={s.tone || 'neutral'} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ActionCard key="ov-animaux" title="Registre ovins" text="Cheptel — vue Animaux." onClick={() => setTab('animaux')} />
          </div>
        </CollapsibleBlock>
      ) : null}

      {caprins.hasData ? (
        <CollapsibleBlock icon={Beef} title="Caprins — GMQ & rentabilité" intro="Chèvres, chevreaux — poids et marge technique.">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: 'Actifs', value: fmtNumber(caprins.activeCount) },
              { label: 'Proches cible', value: fmtNumber(caprins.nearTargetCount), tone: caprins.nearTargetCount ? 'good' : 'warn' },
              { label: 'Poids moyen', value: caprins.avgWeight > 0 ? `${caprins.avgWeight.toFixed(0)} kg` : '—', tone: caprins.avgWeight > 0 ? 'good' : 'warn' },
            ].map((s) => (
              <ElevageStatCard key={s.label} label={s.label} value={s.value} tone={s.tone || 'neutral'} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ActionCard key="cap-animaux" title="Registre caprins" text="Cheptel — vue Animaux." onClick={() => setTab('animaux')} />
          </div>
        </CollapsibleBlock>
      ) : null}
        </>
      ) : null}

      {contextView === 'all' ? (
      <CollapsibleBlock
        icon={Factory}
        title="Viande & transformation"
        intro="Sorties récentes, stock viande produit et documents sanitaires."
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Sorties récentes', value: fmtNumber(transform.recentCount), tone: transform.recentCount ? 'good' : 'warn' },
            { label: 'Stock viande (kg)', value: transform.meatStockKg > 0 ? fmtNumber(transform.meatStockKg) : '—', tone: transform.meatStockKg ? 'good' : 'warn' },
            { label: 'Lignes stock', value: fmtNumber(transform.meatStockLines) },
            { label: 'Docs sanitaires', value: fmtNumber(transform.sanitaryDocs?.length || 0) },
          ].map((s) => (
            <ElevageStatCard key={s.label} label={s.label} value={s.value} tone={s.tone || 'neutral'} />
          ))}
        </div>
        {transform.recent?.length ? (
          <ul className="space-y-1 text-sm">
            {transform.recent.map((row) => (
              <li key={row.id} className="flex justify-between border-b border-[#eadcc2]/70 py-2 last:border-b-0">
                <span className="text-[#2f2415]">{row.kindLabel || row.kind} · {row.label || row.entityId}</span>
                <span className="text-xs text-[#8a7456]">{row.date || '—'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#8a7456]">Aucune transformation enregistrée.</p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ActionCard key="tr-hub" title="Journal transformation" text="Abattages, mortalités, ventes." onClick={() => setTab('Transformation')} />
          {transform.meatStockKg > 0 ? (
            <ActionCard key="tr-stock" title="Stock viande" text="Produits finis issus abattage." onClick={() => onNavigate?.('achats_stock', { tab: 'Stock', stockContext: 'viande', contextMessage: 'Stock viande produit par l\'élevage (avicole ou animaux).' })} />
          ) : null}
          {transform.sanitaryDocs?.length ? (
            <ActionCard key="tr-docs" title="Documents sanitaires" text="Certificats liés aux sorties." onClick={() => onNavigate?.('documents_rapports')} />
          ) : null}
        </div>
      </CollapsibleBlock>
      ) : null}
    </div>
  );

  if (placement === 'footer') {
    return (
      <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">
          Performances & rendements (analyse complémentaire)
        </summary>
        <div className="mt-4">{hubBody}</div>
      </details>
    );
  }

  return hubBody;
}
