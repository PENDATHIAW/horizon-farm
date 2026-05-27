import { AlertTriangle, Beef, Bird, ClipboardList, Drumstick, Egg, HeartPulse, PackageCheck, Scale, Scissors } from 'lucide-react';
import { useMemo } from 'react';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { ANIMAL_SPECIES_TABS, countAnimalsBySpecies, filterAnimalsBySpecies } from '../utils/animalSpecies';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../utils/avicoleMetrics';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const n = (value = 0) => Number(value || 0);
const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => lower(row.status || row.statut).includes(word));
const isOperationalAnimal = (row = {}) => !isClosedAnimal(row);
const isOverdueHealth = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(row.statut || row.status || row.etat));
const lotText = (lot = {}) => lower(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isPondeuse = (lot = {}) => lotText(lot).includes('pondeuse') || lotText(lot).includes('ponte') || lotText(lot).includes('oeuf') || lotText(lot).includes('œuf');
const isChair = (lot = {}) => lotText(lot).includes('chair') || lotText(lot).includes('broiler');
const lotMortality = (lot = {}) => n(lot.mortality ?? lot.morts ?? lot.dead_count);
const stockQty = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => n(row.seuil ?? row.threshold);
const stockLabel = (row = {}) => row.produit || row.name || row.nom || row.libelle || 'Produit';
const costOfEvent = (row = {}) => n(row.montant ?? row.amount ?? row.cout ?? row.total_cost);

function StatLine({ label, value, tone = 'neutral' }) {
  const cls = tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
function ActionButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">{children}</button>;
}
function SpeciesRow({ label, total, active, alert, onOpen }) {
  return <button type="button" onClick={onOpen} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[180px_1fr_auto] md:items-center hover:bg-[#fffdf8]"><span className="font-black text-[#2f2415]">{label}</span><span className="text-sm text-[#8a7456]">{fmtNumber(active)} actif(s) · {fmtNumber(Math.max(0, total - active))} en historique</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${alert ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{alert ? 'À suivre' : 'OK'}</span></button>;
}

export default function ElevageModule({ animaux = [], lots = [], sante = [], stocks = [], alimentationLogs = [], businessEvents = [], productionLogs = [], onNavigate }) {
  const data = useMemo(() => {
    const animalCounts = countAnimalsBySpecies(animaux);
    const speciesRows = ANIMAL_SPECIES_TABS.map((species) => {
      const rows = filterAnimalsBySpecies(animaux, species);
      const active = rows.filter(isOperationalAnimal);
      const sick = active.filter((row) => ['malade', 'critique', 'a_surveiller'].includes(lower(row.health_status || row.sante_status || row.status_sante))).length;
      return { species, total: rows.length, active: active.length, sick };
    });
    const activeLots = lots.filter(avicoleHasActiveBirds);
    const pondeuses = activeLots.filter(isPondeuse);
    const chair = activeLots.filter(isChair);
    const overdueHealth = sante.filter(isOverdueHealth);
    const feedStocks = stocks.filter((row) => /aliment|feed|provende|son|mais|maïs/.test(lower(`${stockLabel(row)} ${row.categorie || row.category || ''}`)));
    const criticalFeed = feedStocks.filter((row) => stockQty(row) <= stockThreshold(row));
    const eggs = productionLogs.reduce((sum, row) => sum + n(row.oeufs_produits || row.eggs_count || row.oeufs), 0);
    const directCosts = businessEvents.filter((event) => lower(`${event.module_source || event.module || ''} ${event.target_type || ''} ${event.entity_type || ''}`).includes('anim') || lower(`${event.module_source || event.module || ''} ${event.target_type || ''} ${event.entity_type || ''}`).includes('avicole')).reduce((sum, event) => sum + costOfEvent(event), 0);
    const mortality = activeLots.reduce((sum, lot) => sum + lotMortality(lot), 0);
    return { animalCounts, speciesRows, activeLots, pondeuses, chair, overdueHealth, feedStocks, criticalFeed, eggs, directCosts, mortality };
  }, [animaux, lots, sante, stocks, businessEvents, productionLogs]);

  return <div className="space-y-6">
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1></div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('animaux')}>Fiches animaux</ActionButton><ActionButton onClick={() => onNavigate?.('avicole')}>Fiches lots</ActionButton><ActionButton onClick={() => onNavigate?.('sante')}>Santé</ActionButton></div></div><div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5"><StatLine label="Animaux actifs" value={fmtNumber(data.speciesRows.reduce((sum, item) => sum + item.active, 0))} /><StatLine label="Lots avicoles" value={fmtNumber(data.activeLots.length)} /><StatLine label="Œufs" value={fmtNumber(data.eggs)} /><StatLine label="Santé" value={`${data.overdueHealth.length} retard`} tone={data.overdueHealth.length ? 'warn' : 'good'} /><StatLine label="Aliment" value={`${data.criticalFeed.length} bas`} tone={data.criticalFeed.length ? 'warn' : 'good'} /></div></div>

    <Section icon={Beef} title="Bovins, ovins et caprins" action={<ActionButton onClick={() => onNavigate?.('animaux')}>Ouvrir les fiches</ActionButton>}>
      <div>{data.speciesRows.map((item) => <SpeciesRow key={item.species} label={`${item.species}s`} total={item.total} active={item.active} alert={item.sick > 0} onOpen={() => onNavigate?.('animaux')} />)}</div>
    </Section>

    <Section icon={Bird} title="Pondeuses et poulets de chair" action={<ActionButton onClick={() => onNavigate?.('avicole')}>Ouvrir les lots</ActionButton>}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex items-center gap-2 font-black text-[#2f2415]"><Egg size={18} /> Pondeuses</div><p className="mt-2 text-sm text-[#8a7456]">{fmtNumber(data.pondeuses.length)} lot(s) actif(s) · {fmtNumber(data.pondeuses.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0))} sujet(s)</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex items-center gap-2 font-black text-[#2f2415]"><Drumstick size={18} /> Poulets de chair</div><p className="mt-2 text-sm text-[#8a7456]">{fmtNumber(data.chair.length)} lot(s) actif(s) · {fmtNumber(data.chair.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0))} sujet(s)</p></div></div>
    </Section>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Section icon={HeartPulse} title="Santé" action={<ActionButton onClick={() => onNavigate?.('sante')}>Ouvrir</ActionButton>}><div className="grid grid-cols-2 gap-3"><StatLine label="Soins en retard" value={data.overdueHealth.length} tone={data.overdueHealth.length ? 'warn' : 'good'} /><StatLine label="Mortalité lots" value={fmtNumber(data.mortality)} tone={data.mortality ? 'warn' : 'good'} /></div></Section>
      <Section icon={PackageCheck} title="Alimentation" action={<ActionButton onClick={() => onNavigate?.('stock')}>Stock</ActionButton>}><div className="grid grid-cols-2 gap-3"><StatLine label="Produits aliment" value={data.feedStocks.length} /><StatLine label="Sous seuil" value={data.criticalFeed.length} tone={data.criticalFeed.length ? 'warn' : 'good'} /></div></Section>
      <Section icon={Scale} title="Charges" action={<ActionButton onClick={() => onNavigate?.('finances')}>Finances</ActionButton>}><StatLine label="Charges liées" value={fmtCurrency(data.directCosts)} /></Section>
      <Section icon={Scissors} title="Transformation" action={<ActionButton onClick={() => onNavigate?.('animaux')}>Animaux</ActionButton>}><p className="text-sm text-[#8a7456]">Abattage, réforme, sortie de lot et stock vendable restent accessibles depuis les fiches.</p></Section>
    </div>

    <Section icon={ClipboardList} title="Historique et graphiques"><div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('animaux')}>Historique animaux</ActionButton><ActionButton onClick={() => onNavigate?.('avicole')}>Historique avicole</ActionButton><ActionButton onClick={() => onNavigate?.('rapports')}>Graphiques</ActionButton></div></Section>
  </div>;
}
