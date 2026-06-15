import { Beef, Drumstick, Egg, Factory } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { navigateToEggStock } from '../../utils/productionNavigation.js';
import { PRODUCTION_FINANCE_LABELS, PRODUCTION_FINANCE_SOURCE } from '../../utils/productionFinancialTruth.js';
import ProductionDiagnosticPanel from './ProductionDiagnosticPanel.jsx';

function ActionCard({ title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:bg-[#dcfce7]"
    >
      <b className="text-[#2f2415]">{title}</b>
      <p className="mt-1 text-sm text-[#8a7456]">{text}</p>
    </button>
  );
}

function ProductionBlock({ icon: Icon, title, intro, stats = [], empty, actions, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <Icon size={20} aria-hidden="true" />
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[#8a7456]">{intro}</p>
      </div>
      {stats.length ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs text-[#8a7456]">{s.label}</p>
              <p className={`mt-1 text-lg font-black ${s.tone === 'good' ? 'text-emerald-600' : s.tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]'}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {empty ? <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#8a7456]">{empty}</p> : null}
      {children}
      {actions?.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

export default function ProductionHub({
  snapshot = {},
  lots = [],
  animaux = [],
  marginContext = {},
  transformationRows = [],
  setTab,
  onNavigate,
  onOpenWorkflow,
}) {
  const eggs = snapshot.eggs || {};
  const chair = snapshot.chair || {};
  const bovins = snapshot.bovins || {};
  const transform = snapshot.transformation || {};

  return (
    <div className="space-y-5 production-hub-mobile">
      <style>{`
        @media (max-width: 640px) {
          .production-hub-mobile .grid { gap: 0.75rem; }
        }
      `}</style>

      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2f2415]">Production animale</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#8a7456]">
          Œufs, poulets de chair, bovins et transformation — produits issus de l&apos;élevage uniquement.
          Les aliments, emballages, vaccins et médicaments sont des intrants suivis dans{' '}
          <b>Achats &amp; Stock</b> (via Alimentation ou Santé).
        </p>
        <p className="mt-2 text-xs text-[#8a7456]">
          La production végétale (cultures, récoltes) est suivie dans le module <b>Cultures</b> ou le Dashboard global.
        </p>
        <p className="mt-3 rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-xs text-[#8a7456]">
          <b className="text-[#2f2415]">{PRODUCTION_FINANCE_LABELS.marginGross}</b> = {PRODUCTION_FINANCE_LABELS.revenue} − {PRODUCTION_FINANCE_LABELS.costTotal}.
          {PRODUCTION_FINANCE_LABELS.marginNote}. Source : {PRODUCTION_FINANCE_SOURCE}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
            <p className="text-xs text-[#8a7456]">Œufs vendables (7 j)</p>
            <p className="mt-1 text-lg font-black text-emerald-700">{fmtNumber(eggs.sellable7d)}</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
            <p className="text-xs text-[#8a7456]">Lots chair actifs</p>
            <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtNumber(chair.activeLots)}</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
            <p className="text-xs text-[#8a7456]">Bovins actifs</p>
            <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtNumber(bovins.activeCount)}</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
            <p className="text-xs text-[#8a7456]">Stock viande (kg)</p>
            <p className="mt-1 text-lg font-black text-[#2f2415]">{transform.meatStockKg > 0 ? fmtNumber(transform.meatStockKg) : '—'}</p>
          </div>
        </div>
      </section>

      <ProductionDiagnosticPanel
        lots={lots}
        animaux={animaux}
        transformationRows={transformationRows}
        meatStockKg={transform.meatStockKg}
        marginContext={marginContext}
      />

      <ProductionBlock
        icon={Egg}
        title="Œufs & tablettes"
        intro="Ramassages, casses, vendables et stock produit par les pondeuses."
        stats={[
          { label: 'Produits (7 j)', value: fmtNumber(eggs.produced7d), tone: 'good' },
          { label: 'Cassés (7 j)', value: fmtNumber(eggs.broken7d), tone: eggs.broken7d ? 'warn' : 'good' },
          { label: 'Vendables (7 j)', value: fmtNumber(eggs.sellable7d), tone: 'good' },
          { label: 'Tablettes est.', value: fmtNumber(eggs.tablettesEst), tone: 'good' },
          { label: 'Stock œufs', value: eggs.stockLines ? `${fmtNumber(eggs.stockQty)} (${eggs.stockLines} ligne(s))` : '—' },
        ]}
        empty={!eggs.produced7d && !eggs.stockLines ? 'Aucun ramassage sur 7 jours — enregistrez un ramassage pour suivre la ponte.' : null}
        actions={[
          <ActionCard key="egg-log" title="Enregistrer ramassage" text="Workflow officiel — log, stock œufs, emballage optionnel." onClick={() => onOpenWorkflow?.('eggs')} />,
          <ActionCard key="egg-stock" title="Stock œufs & tablettes" text="Voir les œufs produits, les tablettes disponibles et les mouvements de stock liés à la ponte." onClick={() => navigateToEggStock(onNavigate)} />,
          eggs.eggOpportunities ? (
            <ActionCard key="egg-sales" title="Ventes œufs / tablettes" text={`${eggs.eggOpportunities} opportunité(s) Commercial liée(s) aux œufs.`} onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} />
          ) : null,
        ].filter(Boolean)}
      >
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
        ) : null}
      </ProductionBlock>

      <ProductionBlock
        icon={Drumstick}
        title="Poulets de chair"
        intro="Bandes actives, poids, mortalité et lots prêts ou proches de la vente."
        stats={[
          { label: 'Lots actifs', value: fmtNumber(chair.activeLots) },
          { label: 'Prêts / proches vente', value: fmtNumber(chair.readyLots), tone: chair.readyLots ? 'good' : 'warn' },
          { label: 'Poids moyen', value: chair.avgWeight > 0 ? `${chair.avgWeight.toFixed(2)} kg` : '—' },
          { label: 'Mortalité moy.', value: chair.avgMortality ? fmtNumber(chair.avgMortality) : '—', tone: chair.avgMortality > 40 ? 'warn' : 'good' },
        ]}
        empty={!chair.hasData ? 'Aucun lot chair actif pour le moment.' : null}
        actions={[
          <ActionCard key="chair-lots" title="Voir lots chair" text="Fiches avicole, effectifs, pesées et historique." onClick={() => setTab('Avicole')} />,
          chair.readyLots > 0 ? (
            <ActionCard key="chair-sale" title="Préparer vente" text={`${chair.readyLots} lot(s) prêt(s) ou proche(s) de la vente.`} onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
          ) : null,
        ].filter(Boolean)}
      >
        {chair.readyList?.length ? (
          <ul className="space-y-1 text-sm">
            {chair.readyList.map((lot) => (
              <li key={lot.id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                <b>{lot.name}</b> · {fmtNumber(lot.effectif)} actifs
                {lot.weight > 0 ? ` · ${lot.weight.toFixed(2)} kg` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </ProductionBlock>

      <ProductionBlock
        icon={Beef}
        title="Bovins / embouche"
        intro="Animaux actifs, poids, GMQ et proximité du poids cible."
        stats={[
          { label: 'Actifs', value: fmtNumber(bovins.activeCount) },
          { label: 'Proches poids cible', value: fmtNumber(bovins.nearTargetCount), tone: bovins.nearTargetCount ? 'good' : 'warn' },
          { label: 'Poids moyen', value: bovins.avgWeight > 0 ? `${bovins.avgWeight.toFixed(0)} kg` : '—' },
        ]}
        empty={!bovins.hasData ? 'Aucun bovin actif enregistré.' : null}
        actions={[
          <ActionCard key="bov-animaux" title="Voir animaux" text="Cheptel bovins, pesées et coûts." onClick={() => setTab('Animaux')} />,
          bovins.nearTargetCount > 0 ? (
            <ActionCard key="bov-sale" title="Préparer vente" text={`${bovins.nearTargetCount} animal(aux) proche(s) du poids cible.`} onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
          ) : null,
        ].filter(Boolean)}
      >
        {bovins.nearTargetList?.length ? (
          <ul className="space-y-1 text-sm">
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
        ) : !bovins.hasData ? null : (
          <p className="text-sm text-[#8a7456]">Aucun bovin proche du poids cible.</p>
        )}
      </ProductionBlock>

      <ProductionBlock
        icon={Factory}
        title="Transformation / viande"
        intro="Abattages, sorties récentes, stock viande et documents sanitaires."
        stats={[
          { label: 'Sorties récentes', value: fmtNumber(transform.recentCount) },
          { label: 'Stock viande (kg)', value: transform.meatStockKg > 0 ? fmtNumber(transform.meatStockKg) : '—', tone: transform.meatStockKg ? 'good' : 'warn' },
          { label: 'Lignes stock viande', value: fmtNumber(transform.meatStockLines) },
          { label: 'Docs sanitaires', value: fmtNumber(transform.sanitaryDocs?.length || 0) },
        ]}
        empty={!transform.hasData ? 'Aucune transformation enregistrée.' : null}
        actions={[
          <ActionCard key="tr-hub" title="Voir transformation" text="Journal ventes, abattages, mortalités." onClick={() => setTab('Transformation')} />,
          transform.meatStockKg > 0 ? (
            <ActionCard key="tr-stock" title="Voir stock viande" text="Produits finis issus de l'abattage." onClick={() => onNavigate?.('achats_stock', { tab: 'Stock', stockContext: 'viande', contextMessage: 'Stock viande produit par l\'élevage (avicole ou animaux).' })} />
          ) : null,
          transform.sanitaryDocs?.length ? (
            <ActionCard key="tr-docs" title="Documents sanitaires" text="Certificats et preuves liés aux sorties." onClick={() => onNavigate?.('documents_rapports')} />
          ) : null,
        ].filter(Boolean)}
      >
        {transform.recent?.length ? (
          <ul className="space-y-1 text-sm">
            {transform.recent.map((row) => (
              <li key={row.id} className="flex justify-between border-b border-[#eadcc2]/70 py-2 last:border-b-0">
                <span className="text-[#2f2415]">{row.kindLabel || row.kind} · {row.label || row.entityId}</span>
                <span className="text-xs text-[#8a7456]">{row.date || '—'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </ProductionBlock>
    </div>
  );
}
