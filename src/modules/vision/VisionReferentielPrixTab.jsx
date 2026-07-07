import { BookMarked, TrendingUp } from 'lucide-react';
import { fmtCurrency, fmtNumber, fmtPercent } from '../../utils/format';
import { buildAdvancedDecisionData } from './decisionAdvancedMetrics.js';
import { buildDecisionCenterData } from './decisionCenterMetrics.js';
import { Btn, DataRow, DataTable, Empty, Section, TabIntro, VisionKpi } from './visionUtils';

function SupplierBarChart({ bars = [] }) {
  if (!bars.length) return null;
  const max = Math.max(...bars.map((b) => b.tonnePrice), 1);
  return (
    <div className="space-y-2">
      {bars.map((bar) => (
        <div key={bar.supplier} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-[#2f2415]">{bar.supplier}</span>
            <span className={bar.tone === 'bad' ? 'text-red-600 font-black' : 'text-[#8a7456]'}>{fmtNumber(Math.round(bar.tonnePrice))} F/t</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#eadcc2] overflow-hidden">
            <div
              className={`h-full rounded-full ${bar.tone === 'bad' ? 'bg-red-500' : bar.tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (bar.tonnePrice / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VisionReferentielPrixTab(props) {
  const advanced = buildAdvancedDecisionData(props);
  const { comparatifs } = buildDecisionCenterData(props);
  const { referentiel, feedRoi, seasonality, shrinkage, clientQuality } = advanced;
  const inflationAlerts = [...(comparatifs?.aliments?.periodAlerts || []), ...(comparatifs?.aliments?.supplierAlerts || [])];

  return (
    <div className="space-y-5">
      <TabIntro
        title="Référentiel des prix"
        detail="Équivalent automatique RECHERCHEV : dernier prix connu vs prix actuel, alertes inflation, ROI nutrition et croisements avancés."
        action={props.onNavigate ? <Btn onClick={() => props.onNavigate('achats_stock', { tab: 'Achats' })}>Achats & Stock →</Btn> : null}
      />
      <div className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]">
        Collez ou saisissez vos achats dans l&apos;ERP — le référentiel se met à jour seul. Alerte rouge si écart &gt; 5 % (critique &gt; 10 %).
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Lignes référentiel" value={fmtNumber(referentiel.rows.length)} tone="good" />
        <VisionKpi label="Alertes inflation" value={fmtNumber(referentiel.alertCount)} tone={referentiel.alertCount ? 'bad' : 'good'} />
        <VisionKpi label="Démarque aliment" value={fmtPercent(shrinkage.feed.shrinkPct)} tone={shrinkage.feed.tone} />
        <VisionKpi label="Démarque œufs" value={fmtPercent(shrinkage.eggs.shrinkPct)} tone={shrinkage.eggs.tone} />
      </div>

      <Section icon={BookMarked} title="Référentiel — dernier prix vs prix actuel (VLOOKUP auto)">
        <DataTable columns={['Produit · Fournisseur', 'Prix actuel · dernier', 'Écart', 'Alerte']}>
          {referentiel.rows.length ? referentiel.rows.map((row) => (
            <DataRow
              key={row.id}
              title={`${row.product} · ${row.supplier}`}
              detail={`Actuel ${fmtNumber(Math.round(row.currentPrice))} F/kg (${fmtNumber(Math.round(row.currentTonPrice))} F/t) · Dernier ${fmtNumber(Math.round(row.lastPrice))} F/kg · ${row.lastDate}`}
              status={row.alert}
              tone={row.tone}
              onClick={() => props.onNavigate?.('achats_stock', { tab: 'Fournisseurs' })}
            />
          )) : <Empty>Ajoutez des achats aliment avec fournisseur, quantité et montant pour alimenter le référentiel.</Empty>}
        </DataTable>
      </Section>

      <Section icon={TrendingUp} title="Alerte inflation & comparatif fournisseurs (ce mois)">
        {inflationAlerts.length ? (
          <DataTable columns={['Produit', 'Analyse', 'Écart', 'Statut']}>
            {inflationAlerts.map((row) => (
              <DataRow key={row.id} title={row.product} detail={row.detail} status={row.pctChange !== undefined ? `${row.pctChange > 0 ? '+' : ''}${row.pctChange?.toFixed(1)}%` : `+${row.spreadPct?.toFixed(0)}%`} tone={row.tone} />
            ))}
          </DataTable>
        ) : <Empty>Pas de hausse significative détectée sur la période récente.</Empty>}
        {referentiel.supplierBars.slice(0, 3).map((block) => (
          <div key={block.product} className="mt-4 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="mb-2 text-sm font-black text-[#2f2415]">{block.product} — prix à la tonne par fournisseur</p>
            <SupplierBarChart bars={block.bars} />
          </div>
        ))}
      </Section>

      <Section icon={TrendingUp} title="ROI nutrition — aliment cher mais rentable ?">
        <p className="mb-3 text-xs text-[#8a7456]">Croise prix/tonne, IC et durée de cycle : un aliment +10 % peut être meilleur s&apos;il réduit les jours de bande.</p>
        <DataTable columns={['Lot · Fournisseur', 'Prix/t · IC · cycle', 'Coût/kg produit', 'Statut']}>
          {feedRoi.length ? feedRoi.map((row) => (
            <DataRow key={row.id} title={`${row.lot} · ${row.supplier}`} detail={row.detail} status={fmtCurrency(row.costPerKg)} tone={row.tone} />
          )) : <Empty>Liez consommations aliment aux lots chair avec fournisseur pour calculer le ROI nutrition.</Empty>}
        </DataTable>
      </Section>

      <Section icon={TrendingUp} title="Saisonnalité — mois × bâtiment (mortalité & IC)">
        <DataTable columns={['Mois · Bâtiment', 'Mortalité · IC', 'Ponte moy.', 'Statut']}>
          {seasonality.length ? seasonality.slice(0, 12).map((row) => (
            <DataRow
              key={`${row.month}-${row.building}`}
              title={`${row.month} · ${row.building}`}
              detail={`${row.lots} lot(s) · Mortalité ${fmtPercent(row.avgMortality)} · IC ${row.avgIc ? row.avgIc.toFixed(2) : '—'}`}
              status={row.avgLaying !== null ? fmtPercent(row.avgLaying) : '—'}
              tone={row.tone}
            />
          )) : <Empty>Renseignez bâtiment et dates de démarrage des lots pour la lecture saisonnière.</Empty>}
        </DataTable>
      </Section>

      <Section icon={TrendingUp} title="Démarque inconnue & qualité client">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className={`rounded-xl border p-4 text-sm ${shrinkage.feed.tone === 'bad' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            <b>Aliment :</b> théorique {fmtNumber(Math.round(shrinkage.feed.theoretical))} kg · réel {fmtNumber(Math.round(shrinkage.feed.real))} kg · écart {fmtPercent(shrinkage.feed.shrinkPct)}
          </div>
          <div className={`rounded-xl border p-4 text-sm ${shrinkage.eggs.tone === 'bad' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            <b>Œufs :</b> produits {fmtNumber(shrinkage.eggs.theoretical)} · vendus/comptés {fmtNumber(shrinkage.eggs.real)} · écart {fmtPercent(shrinkage.eggs.shrinkPct)}
          </div>
        </div>
        <DataTable columns={['Client', 'CA · commandes', 'Rentabilité proxy', 'Statut']}>
          {clientQuality.length ? clientQuality.slice(0, 8).map((row) => (
            <DataRow key={row.client} title={row.client} detail={`${fmtCurrency(row.revenue)} · ${row.orders} commande(s)`} status={row.detail} tone={row.tone} onClick={() => props.onNavigate?.('commercial', { tab: 'Clients & créances' })} />
          )) : <Empty>Ajoutez ventes liées clients pour comparer simplicité vs rentabilité.</Empty>}
        </DataTable>
      </Section>
    </div>
  );
}
