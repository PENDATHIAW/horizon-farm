import { AlertTriangle, Egg, PackageCheck, Utensils } from 'lucide-react';
import Btn from '../components/Btn';
import { fmtNumber, fmtCurrency, toNumber } from '../utils/format';
import { avicoleActiveCount } from '../utils/avicoleMetrics';

const arr = (value) => Array.isArray(value) ? value : [];
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const lotIdOf = (row = {}) => String(row.lot_id || row.related_id || row.source_record_id || row.entity_id || row.cible_id || row.target_id || '').trim();
const eggCount = (row = {}) => toNumber(row.oeufs_vendables ?? row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const feedQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty);
const feedCost = (row = {}) => toNumber(row.montant_total ?? row.cout_total ?? row.total ?? row.amount ?? row.montant);
const targetLabel = (row = {}) => row.lot_name || row.cible_label || row.target_label || row.produit || row.id || 'Lot';
const isEggLog = (row = {}) => {
  const text = norm(`${row.type_evenement || ''} ${row.event_type || ''} ${row.type || ''} ${row.unite_vente || ''}`);
  return text.includes('oeuf') || text.includes('ramassage') || row.oeufs_produits !== undefined;
};
const isFeedingLog = (row = {}) => {
  const text = norm(`${row.type_cible || ''} ${row.source_module || ''} ${row.produit || ''} ${row.notes || ''}`);
  return text.includes('avicole') || text.includes('lot') || text.includes('aliment') || row.lot_id;
};

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

function ListCard({ title, rows = [], empty, render, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="font-black text-[#2f2415]">{title}</p>
    <div className="mt-3 space-y-2 text-sm">
      {rows.length ? rows.map((row) => <div key={row.id || `${title}-${lotIdOf(row)}-${row.date}`} className="rounded-xl bg-white/75 border border-white px-3 py-2">{render(row)}</div>) : <div className="rounded-xl bg-white/75 border border-white px-3 py-2 text-[#8a7456]">{empty}</div>}
    </div>
  </div>;
}

export default function AvicoleProductionAlimentationSummary({ rows = [], productionLogs = [], alimentationLogs = [], activity = 'pondeuse', onNavigate }) {
  const activeLots = arr(rows).filter((lot) => avicoleActiveCount(lot) > 0);
  const activeIds = new Set(activeLots.map((lot) => String(lot.id)));
  const scopedEggLogs = arr(productionLogs).filter((log) => isEggLog(log) && (!activeIds.size || activeIds.has(lotIdOf(log))));
  const scopedFeedingLogs = arr(alimentationLogs).filter((log) => isFeedingLog(log) && (!activeIds.size || activeIds.has(lotIdOf(log))));
  const totalEggs = scopedEggLogs.reduce((sum, log) => sum + eggCount(log), 0);
  const tablets = Math.floor(totalEggs / 30);
  const feedKg = scopedFeedingLogs.reduce((sum, log) => sum + feedQty(log), 0);
  const feedTotalCost = scopedFeedingLogs.reduce((sum, log) => sum + feedCost(log), 0);
  const activeBirds = activeLots.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0);
  const costPerBird = activeBirds ? feedTotalCost / activeBirds : 0;
  const noFeeding = activeLots.length > 0 && scopedFeedingLogs.length === 0;
  const noProduction = activity === 'pondeuse' && activeLots.length > 0 && scopedEggLogs.length === 0;

  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
    <div className="xl:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
      <Mini icon={PackageCheck} label="Lots actifs" value={activeLots.length} />
      <Mini icon={Utensils} label="Aliment consommé" value={`${fmtNumber(feedKg)} kg`} danger={noFeeding} />
      <Mini icon={Utensils} label="Coût aliment" value={fmtCurrency(feedTotalCost)} />
      <Mini icon={Egg} label="Œufs vendables" value={activity === 'pondeuse' ? `${fmtNumber(totalEggs)} œufs · ${fmtNumber(tablets)} tablette(s)` : 'Non applicable'} danger={noProduction} />
    </div>

    <ListCard
      title="Production œufs récente"
      rows={activity === 'pondeuse' ? scopedEggLogs.slice(0, 4) : []}
      empty={activity === 'pondeuse' ? 'Aucun ramassage lié aux lots actifs.' : 'La production œufs concerne les pondeuses.'}
      danger={noProduction}
      render={(log) => <><b className="text-[#2f2415]">{log.date || 'Sans date'} · {targetLabel(log)}</b><p className="text-xs text-[#8a7456]">{fmtNumber(eggCount(log))} œufs vendables</p></>}
    />

    <ListCard
      title="Alimentation récente"
      rows={scopedFeedingLogs.slice(0, 4)}
      empty="Aucune consommation d’aliment liée aux lots actifs."
      danger={noFeeding}
      render={(log) => <><b className="text-[#2f2415]">{log.date || 'Sans date'} · {targetLabel(log)}</b><p className="text-xs text-[#8a7456]">{fmtNumber(feedQty(log))} kg · {fmtCurrency(feedCost(log))}</p></>}
    />

    <div className={`rounded-2xl border p-4 ${noFeeding || noProduction ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <p className="font-black text-[#2f2415] flex items-center gap-2"><AlertTriangle size={16} /> Cohérence opérationnelle</p>
      <div className="mt-3 space-y-2 text-sm text-[#7d6a4a]">
        {noFeeding ? <p>Aucun log d’alimentation n’est relié aux lots actifs. Saisir l’alimentation depuis Stock pour mettre à jour le coût réel.</p> : <p>Alimentation reliée aux lots actifs : coût moyen {fmtCurrency(costPerBird)} par sujet actif.</p>}
        {noProduction ? <p>Aucun ramassage d’œufs n’est encore relié aux pondeuses actives.</p> : null}
        <div className="flex flex-wrap gap-2 pt-2"><Btn small variant="outline" onClick={() => onNavigate?.('stock')}>Gérer alimentation</Btn><Btn small variant="outline" onClick={() => onNavigate?.('ventes')}>Vendre produits</Btn></div>
      </div>
    </div>
  </div>;
}
