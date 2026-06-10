import { useMemo, useState } from 'react';
import { Beef, Filter, PackageCheck } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { MOVEMENT_SOURCE_TYPES } from '../../services/stockMovementHelpers.js';
import { AchatsStockActionCard, AchatsStockSection, ACHATS_STOCK_ACTION_GRID } from './achatsStockUi.jsx';

const MOVEMENT_TYPE_LABELS = {
  entree: 'Entrée',
  sortie: 'Sortie',
  perte: 'Perte',
};

const SOURCE_LABELS = {
  stock: 'Stock',
  ventes: 'Commercial',
  alimentation: 'Alimentation',
  elevage: 'Élevage',
  cultures: 'Cultures',
  sante: 'Santé',
};

function buildLedgerRows(stockMovements = [], stocks = []) {
  const stockMap = new Map(stocks.map((row) => [String(row.id), row]));
  return stockMovements.map((row) => {
    const stock = stockMap.get(String(row.stock_id)) || {};
    const kind = row.metadata?.movement_kind || row.source_module || '';
    return {
      id: row.id,
      date: row.movement_date || row.created_at,
      title: `${MOVEMENT_TYPE_LABELS[row.movement_type] || row.movement_type} · ${stock.produit || stock.name || row.stock_id}`,
      detail: `${SOURCE_LABELS[row.source_module] || row.source_module || 'stock'} · ${kind || row.notes || 'Mouvement'}`,
      quantite: row.quantity,
      type: row.movement_type,
      source: 'ledger',
      farmId: row.farm_id || '',
      stockId: row.stock_id,
      sourceModule: row.source_module || '',
      sortKey: row.movement_date || row.created_at,
    };
  });
}

function buildLegacyRows(feedLogs = [], stockEvents = []) {
  return [...feedLogs, ...stockEvents].map((row) => ({
    id: row.id || `${row.date}-${row.produit || row.libelle}`,
    date: row.date || row.created_at,
    title: row.produit || row.name || row.libelle || row.title || 'Mouvement',
    detail: `${row.type || row.categorie || row.event_type || 'Stock'} · legacy`,
    quantite: row.quantite ?? row.quantity,
    type: row.type || row.event_type,
    source: 'legacy',
    farmId: row.farm_id || '',
    stockId: row.stock_id || '',
    sourceModule: row.source_module || row.module_source || '',
    sortKey: row.date || row.created_at,
  }));
}

export default function AchatsStockMovementsPanel({ data, onNavigate, setTab, accessibleFarms = [] }) {
  const [periodDays, setPeriodDays] = useState('30');
  const [farmFilter, setFarmFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [articleFilter, setArticleFilter] = useState('');
  const [showLegacy, setShowLegacy] = useState(true);

  const ledgerRows = useMemo(() => buildLedgerRows(data.stockMovements || [], data.stocks || []), [data.stockMovements, data.stocks]);
  const legacyRows = useMemo(() => buildLegacyRows(data.feedLogs || [], data.stockEvents || []), [data.feedLogs, data.stockEvents]);

  const periodCutoff = useMemo(() => {
    if (periodDays === 'all') return '';
    const ref = new Date();
    ref.setDate(ref.getDate() - Number(periodDays));
    return ref.toISOString().slice(0, 10);
  }, [periodDays]);

  const movements = useMemo(() => {
    const cutoff = periodCutoff;
    const merged = [...ledgerRows, ...(showLegacy ? legacyRows : [])];
    return merged
      .filter((row) => !cutoff || String(row.sortKey || '').slice(0, 10) >= cutoff)
      .filter((row) => !farmFilter || String(row.farmId || '') === farmFilter || (farmFilter === '__none' && !row.farmId))
      .filter((row) => !typeFilter || String(row.type || '').includes(typeFilter))
      .filter((row) => !sourceFilter || row.source === sourceFilter || String(row.sourceModule || '').includes(sourceFilter))
      .filter((row) => !articleFilter || String(row.stockId || row.title || '').toLowerCase().includes(articleFilter.toLowerCase()))
      .sort((a, b) => String(b.sortKey || '').localeCompare(String(a.sortKey || '')));
  }, [ledgerRows, legacyRows, periodCutoff, farmFilter, typeFilter, sourceFilter, articleFilter, showLegacy]);

  const ledgerCount = ledgerRows.length;
  const legacyCount = legacyRows.length;
  const withoutFarm = ledgerRows.filter((row) => !row.farmId).length;

  return (
    <div className="space-y-4 achats-stock-mobile">
      <AchatsStockSection title="Où agir ?" subtitle="Ledger stock_movements prioritaire · événements legacy distingués.">
        <div className={ACHATS_STOCK_ACTION_GRID}>
          <AchatsStockActionCard icon={PackageCheck} title="Stock & mouvements" text="Entrées, sorties, pertes et valorisation inventaire." onClick={() => setTab?.('Stock')} />
          <AchatsStockActionCard icon={Beef} title="Élevage → Alimentation" text="Distributions aliment liées aux animaux et lots avicoles." onClick={() => onNavigate?.('elevage', { tab: 'Alimentation' })} />
        </div>
      </AchatsStockSection>

      <AchatsStockSection title="Filtres" subtitle="Lecture fiable du journal stock.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <label className="text-xs">
            <span className="font-black text-[#8a7456]">Période</span>
            <select value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} className="mt-1 w-full rounded-lg border border-[#eadcc2] px-2 py-1.5 text-xs">
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="all">Tout</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="font-black text-[#8a7456]">Ferme</span>
            <select value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#eadcc2] px-2 py-1.5 text-xs">
              <option value="">Toutes</option>
              <option value="__none">Sans farm_id</option>
              {accessibleFarms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name || farm.id}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="font-black text-[#8a7456]">Type</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#eadcc2] px-2 py-1.5 text-xs">
              <option value="">Tous</option>
              <option value="entree">Entrées</option>
              <option value="sortie">Sorties</option>
              <option value="perte">Pertes</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="font-black text-[#8a7456]">Source</span>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-[#eadcc2] px-2 py-1.5 text-xs">
              <option value="">Toutes</option>
              <option value="ledger">Ledger</option>
              <option value="legacy">Legacy</option>
              <option value="ventes">Commercial</option>
              <option value="alimentation">Alimentation</option>
              <option value="cultures">Cultures</option>
            </select>
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="font-black text-[#8a7456]">Article</span>
            <input value={articleFilter} onChange={(e) => setArticleFilter(e.target.value)} placeholder="Rechercher…" className="mt-1 w-full rounded-lg border border-[#eadcc2] px-2 py-1.5 text-xs" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#8a7456]">
          <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
          <Filter size={12} /> Afficher événements legacy (alimentation_logs, business_events)
        </label>
        {withoutFarm > 0 ? (
          <p className="text-xs text-amber-700">{withoutFarm} mouvement(s) ledger sans farm_id (historique).</p>
        ) : null}
      </AchatsStockSection>

      <ModuleListHub
        title="Mouvements stock & consommations"
        intro={`Ledger : ${ledgerCount} · Legacy : ${legacyCount} · Types : entrées, sorties, ventes, consommations (${MOVEMENT_SOURCE_TYPES.FEEDING}), cultures (${MOVEMENT_SOURCE_TYPES.CULTURE}).`}
        stats={[
          { label: 'Affichés', value: fmtNumber(movements.length) },
          { label: 'Ledger', value: fmtNumber(ledgerCount) },
          { label: 'Sous seuil', value: fmtNumber(data.lowStock?.length || 0), tone: data.lowStock?.length ? 'warn' : 'good' },
          { label: 'Valeur stock', value: fmtCurrency(data.stockValue) },
        ]}
        rows={movements.map((row) => ({
          id: `${row.source}-${row.id}`,
          title: row.title,
          detail: `${String(row.date || '—').slice(0, 10)} · ${row.detail}${row.source === 'legacy' ? ' · legacy' : ''}`,
          value: row.quantite != null ? `${row.quantite} u.` : undefined,
          module: 'achats_stock',
          tab: 'Mouvements',
        }))}
        emptyLabel="Aucun mouvement pour ces filtres."
        onNavigate={(module, opts) => {
          if (module === 'achats_stock') setTab?.(opts?.tab || 'Mouvements');
          else onNavigate?.(module, opts);
        }}
      />
    </div>
  );
}
