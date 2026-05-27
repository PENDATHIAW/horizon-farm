import { AlertTriangle, BarChart3, Beef, Bird, ClipboardList, Drumstick, Egg, HeartPulse, PackageCheck, Scale, Scissors, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
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
const lotInitial = (lot = {}) => n(lot.initial_count ?? lot.effectif_initial);
const stockQty = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => n(row.seuil ?? row.threshold);
const stockLabel = (row = {}) => row.produit || row.name || row.nom || row.libelle || 'Produit';
const costOfEvent = (row = {}) => n(row.montant ?? row.amount ?? row.cout ?? row.total_cost);
const animalLabel = (row = {}) => row.name || row.nom || row.boucle_numero || row.tag || row.id || 'Animal';
const lotLabel = (row = {}) => row.name || row.nom || row.id || 'Lot';
const lastAction = (row = {}) => row.last_event || row.derniere_action || row.date_derniere_pesee || row.updated_at || row.created_at || '—';
const healthLabel = (row = {}) => row.nom || row.name || row.title || row.type_soin || row.type || row.vaccin || row.id || 'Soin';
const eventDate = (row = {}) => row.event_date || row.date || row.created_at || row.updated_at || '—';

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
function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
function Row({ title, detail, value, tone = 'neutral', onClick }) {
  return <button type="button" onClick={onClick} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[240px_1fr_auto] md:items-center hover:bg-[#fffdf8]"><span className="font-black text-[#2f2415]">{title}</span><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></button>;
}
function Tabs({ active, onChange }) {
  const tabs = ['Résumé', 'Bovins', 'Ovins', 'Caprins', 'Pondeuses', 'Chair', 'Santé', 'Alimentation', 'Charges', 'Transformation', 'Historique', 'Graphiques'];
  return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map((tab) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}>{tab}</button>)}</div></div>;
}
function Empty({ label }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>;
}

function SummaryTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><StatLine label="Animaux actifs" value={fmtNumber(data.totalAnimalsActive)} /><StatLine label="Lots avicoles" value={fmtNumber(data.activeLots.length)} /><StatLine label="Œufs" value={fmtNumber(data.eggs)} tone="good" /><StatLine label="Santé" value={`${data.overdueHealth.length} retard`} tone={data.overdueHealth.length ? 'warn' : 'good'} /><StatLine label="Aliment" value={`${data.criticalFeed.length} bas`} tone={data.criticalFeed.length ? 'warn' : 'good'} /></div><Section icon={Beef} title="Sous-modules" action={<ActionButton onClick={() => onNavigate?.('animaux')}>Fiches</ActionButton>}><div>{data.speciesRows.map((item) => <Row key={item.species} title={`${item.species}s`} detail={`${fmtNumber(item.active)} actif(s) · ${fmtNumber(Math.max(0, item.total - item.active))} en historique`} value={item.sick ? 'À suivre' : 'OK'} tone={item.sick ? 'warn' : 'good'} onClick={() => onNavigate?.('animaux')} />)}<Row title="Pondeuses" detail={`${fmtNumber(data.pondeuses.length)} lot(s) actif(s) · ${fmtNumber(data.pondeuses.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0))} sujet(s)`} value="Suivi" tone="good" onClick={() => onNavigate?.('avicole')} /><Row title="Poulets de chair" detail={`${fmtNumber(data.chair.length)} lot(s) actif(s) · ${fmtNumber(data.chair.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0))} sujet(s)`} value={data.chairReady.length ? 'Action' : 'OK'} tone={data.chairReady.length ? 'warn' : 'good'} onClick={() => onNavigate?.('avicole')} /></div></Section><Section icon={ClipboardList} title="Actions rapides"><div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('animaux')}>Ajouter animal</ActionButton><ActionButton onClick={() => onNavigate?.('avicole')}>Ajouter lot</ActionButton><ActionButton onClick={() => onNavigate?.('sante')}>Ajouter soin</ActionButton><ActionButton onClick={() => onNavigate?.('stock')}>Stock aliment</ActionButton></div></Section></div>;
}
function SpeciesTab({ species, data, onNavigate }) {
  const item = data.speciesDetails[species] || { rows: [], active: [], sick: [] };
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Actifs" value={fmtNumber(item.active.length)} /><StatLine label="À surveiller" value={fmtNumber(item.sick.length)} tone={item.sick.length ? 'warn' : 'good'} /><StatLine label="Historique" value={fmtNumber(Math.max(0, item.rows.length - item.active.length))} /><StatLine label="Charges" value={fmtCurrency(data.directCosts)} /></div><Section icon={Beef} title={`Fiches ${species.toLowerCase()}s`} action={<ActionButton onClick={() => onNavigate?.('animaux')}>Ouvrir les fiches</ActionButton>}>{item.active.length ? item.active.slice(0, 8).map((animal) => <Row key={animal.id || animal.boucle_numero} title={animalLabel(animal)} detail={`${animal.status || animal.statut || 'Actif'} · ${animal.poids || animal.poids_actuel || '—'} kg · ${lastAction(animal)}`} value={['malade', 'critique', 'a_surveiller'].includes(lower(animal.health_status || animal.sante_status || animal.status_sante)) ? 'À suivre' : 'OK'} tone={['malade', 'critique', 'a_surveiller'].includes(lower(animal.health_status || animal.sante_status || animal.status_sante)) ? 'warn' : 'good'} onClick={() => onNavigate?.('animaux')} />) : <Empty label={`Aucun ${species.toLowerCase()} actif.`} />}</Section></div>;
}
function LotTab({ type, data, onNavigate }) {
  const rows = type === 'pondeuse' ? data.pondeuses : data.chair;
  const title = type === 'pondeuse' ? 'Lots pondeuses' : 'Lots poulets de chair';
  const totalBirds = rows.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0);
  const eggs = type === 'pondeuse' ? data.eggs : 0;
  const mortality = rows.reduce((sum, lot) => sum + lotMortality(lot), 0);
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Lots actifs" value={fmtNumber(rows.length)} /><StatLine label="Effectif" value={fmtNumber(totalBirds)} /><StatLine label={type === 'pondeuse' ? 'Œufs' : 'Prêts vente'} value={type === 'pondeuse' ? fmtNumber(eggs) : fmtNumber(data.chairReady.length)} tone={type === 'pondeuse' ? 'good' : data.chairReady.length ? 'warn' : 'good'} /><StatLine label="Mortalité" value={fmtNumber(mortality)} tone={mortality ? 'warn' : 'good'} /></div><Section icon={type === 'pondeuse' ? Egg : Drumstick} title={title} action={<ActionButton onClick={() => onNavigate?.('avicole')}>Ouvrir les lots</ActionButton>}>{rows.length ? rows.slice(0, 8).map((lot) => <Row key={lot.id || lot.nom} title={lotLabel(lot)} detail={`${fmtNumber(avicoleActiveCount(lot))} sujet(s) · mortalité ${fmtNumber(lotMortality(lot))}${lotInitial(lot) ? ` / ${fmtNumber(lotInitial(lot))}` : ''}`} value={lotMortality(lot) ? 'À suivre' : 'OK'} tone={lotMortality(lot) ? 'warn' : 'good'} onClick={() => onNavigate?.('avicole')} />) : <Empty label="Aucun lot actif." />}</Section></div>;
}
function HealthTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Soins en retard" value={data.overdueHealth.length} tone={data.overdueHealth.length ? 'warn' : 'good'} /><StatLine label="Soins suivis" value={data.healthRows.length} /><StatLine label="Coût santé" value={fmtCurrency(data.healthCost)} /><StatLine label="Mortalité lots" value={fmtNumber(data.mortality)} tone={data.mortality ? 'warn' : 'good'} /></div><Section icon={HeartPulse} title="Suivi sanitaire" action={<ActionButton onClick={() => onNavigate?.('sante')}>Ouvrir santé</ActionButton>}>{data.healthRows.length ? data.healthRows.slice(0, 8).map((row) => <Row key={row.id || healthLabel(row)} title={healthLabel(row)} detail={`${row.animal_id || row.lot_id || row.target_id || row.related_id || 'Cible'} · ${row.date_prevue || row.date || '—'}`} value={isOverdueHealth(row) ? 'À faire' : 'OK'} tone={isOverdueHealth(row) ? 'warn' : 'good'} onClick={() => onNavigate?.('sante')} />) : <Empty label="Aucun suivi sanitaire." />}</Section></div>;
}
function FeedTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Produits aliment" value={data.feedStocks.length} /><StatLine label="Sous seuil" value={data.criticalFeed.length} tone={data.criticalFeed.length ? 'warn' : 'good'} /><StatLine label="Mouvements" value={data.feedLogs.length} /><StatLine label="Consommation" value={fmtNumber(data.feedConsumption)} /></div><Section icon={Utensils} title="Alimentation" action={<ActionButton onClick={() => onNavigate?.('stock')}>Stock</ActionButton>}>{data.feedStocks.length ? data.feedStocks.slice(0, 8).map((row) => <Row key={row.id || stockLabel(row)} title={stockLabel(row)} detail={`${fmtNumber(stockQty(row))} disponible · seuil ${fmtNumber(stockThreshold(row))}`} value={stockQty(row) <= stockThreshold(row) ? 'Bas' : 'OK'} tone={stockQty(row) <= stockThreshold(row) ? 'warn' : 'good'} onClick={() => onNavigate?.('stock')} />) : <Empty label="Aucun stock aliment." />}</Section></div>;
}
function ChargesTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Charges liées" value={fmtCurrency(data.directCosts)} /><StatLine label="Événements" value={data.costEvents.length} /><StatLine label="Santé" value={fmtCurrency(data.healthCost)} /><StatLine label="Aliment" value={fmtNumber(data.feedConsumption)} /></div><Section icon={Scale} title="Charges" action={<ActionButton onClick={() => onNavigate?.('finances')}>Finances</ActionButton>}>{data.costEvents.length ? data.costEvents.slice(0, 8).map((event) => <Row key={event.id || event.title} title={event.title || event.libelle || event.event_type || 'Charge'} detail={eventDate(event)} value={fmtCurrency(costOfEvent(event))} onClick={() => onNavigate?.('finances')} />) : <Empty label="Aucune charge liée." />}</Section></div>;
}
function TransformationTab({ data, onNavigate }) {
  const transformations = data.events.filter((event) => /abattage|transformation|reforme|réforme|sortie|stock vendable/.test(lower(`${event.event_type || ''} ${event.title || ''} ${event.description || ''}`)));
  return <Section icon={Scissors} title="Transformation" action={<div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('animaux')}>Animaux</ActionButton><ActionButton onClick={() => onNavigate?.('avicole')}>Lots</ActionButton></div>}>{transformations.length ? transformations.slice(0, 10).map((event) => <Row key={event.id || event.title} title={event.title || event.event_type || 'Transformation'} detail={eventDate(event)} value={fmtCurrency(costOfEvent(event))} onClick={() => onNavigate?.('animaux')} />) : <Empty label="Aucune transformation enregistrée." />}</Section>;
}
function HistoryTab({ data, onNavigate }) {
  return <Section icon={ClipboardList} title="Historique" action={<div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('animaux')}>Animaux</ActionButton><ActionButton onClick={() => onNavigate?.('avicole')}>Avicole</ActionButton><ActionButton onClick={() => onNavigate?.('sante')}>Santé</ActionButton></div>}>{data.events.length ? data.events.slice(0, 12).map((event) => <Row key={event.id || event.title} title={event.title || event.event_type || 'Événement'} detail={eventDate(event)} value={event.severity || event.status || 'Suivi'} tone={['warning', 'critique', 'critical'].includes(lower(event.severity || event.status)) ? 'warn' : 'neutral'} onClick={() => onNavigate?.('animaux')} />) : <Empty label="Aucun historique disponible." />}</Section>;
}
function GraphsTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Animaux" value={fmtNumber(data.totalAnimalsActive)} /><StatLine label="Lots" value={fmtNumber(data.activeLots.length)} /><StatLine label="Œufs" value={fmtNumber(data.eggs)} /><StatLine label="Charges" value={fmtCurrency(data.directCosts)} /></div><Section icon={BarChart3} title="Graphiques" action={<ActionButton onClick={() => onNavigate?.('rapports')}>Rapports</ActionButton>}><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5"><div className="space-y-4"><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>Élevage</span><span>{fmtNumber(data.totalAnimalsActive)}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, data.totalAnimalsActive)}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>Production œufs</span><span>{fmtNumber(data.eggs)}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, data.eggs / 150)}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>Santé à traiter</span><span>{data.overdueHealth.length}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-amber-500" style={{ width: `${Math.min(100, data.overdueHealth.length * 20)}%` }} /></div></div></div></div></Section></div>;
}

export default function ElevageModule({ animaux = [], lots = [], sante = [], stocks = [], alimentationLogs = [], businessEvents = [], productionLogs = [], onNavigate }) {
  const [activeTab, setActiveTab] = useState('Résumé');
  const data = useMemo(() => {
    const speciesRows = ANIMAL_SPECIES_TABS.map((species) => {
      const rows = filterAnimalsBySpecies(animaux, species);
      const active = rows.filter(isOperationalAnimal);
      const sick = active.filter((row) => ['malade', 'critique', 'a_surveiller'].includes(lower(row.health_status || row.sante_status || row.status_sante)));
      return { species, total: rows.length, active: active.length, sick: sick.length };
    });
    const speciesDetails = Object.fromEntries(ANIMAL_SPECIES_TABS.map((species) => {
      const rows = filterAnimalsBySpecies(animaux, species);
      const active = rows.filter(isOperationalAnimal);
      const sick = active.filter((row) => ['malade', 'critique', 'a_surveiller'].includes(lower(row.health_status || row.sante_status || row.status_sante)));
      return [species, { rows, active, sick }];
    }));
    const activeLots = lots.filter(avicoleHasActiveBirds);
    const pondeuses = activeLots.filter(isPondeuse);
    const chair = activeLots.filter(isChair);
    const chairReady = chair.filter((lot) => ['pret_vente', 'pret_a_la_vente', 'ready_for_sale'].includes(lower(lot.status || lot.statut)) || n(lot.ready_for_sale));
    const healthRows = arr(sante);
    const overdueHealth = healthRows.filter(isOverdueHealth);
    const feedStocks = stocks.filter((row) => /aliment|feed|provende|son|mais|maïs/.test(lower(`${stockLabel(row)} ${row.categorie || row.category || ''}`)));
    const criticalFeed = feedStocks.filter((row) => stockQty(row) <= stockThreshold(row));
    const eggs = productionLogs.reduce((sum, row) => sum + n(row.oeufs_produits || row.eggs_count || row.oeufs), 0);
    const events = arr(businessEvents).filter((event) => /anim|avicole|sante|santé|lot/.test(lower(`${event.module_source || event.module || ''} ${event.target_type || ''} ${event.entity_type || ''} ${event.title || ''}`)));
    const costEvents = events.filter((event) => costOfEvent(event) > 0);
    const directCosts = costEvents.reduce((sum, event) => sum + costOfEvent(event), 0);
    const healthCost = healthRows.reduce((sum, row) => sum + n(row.cout ?? row.montant ?? row.amount ?? row.cout_total), 0);
    const feedLogs = arr(alimentationLogs);
    const feedConsumption = feedLogs.reduce((sum, row) => sum + n(row.quantite ?? row.quantity ?? row.qty), 0);
    const mortality = activeLots.reduce((sum, lot) => sum + lotMortality(lot), 0);
    const totalAnimalsActive = speciesRows.reduce((sum, item) => sum + item.active, 0);
    return { speciesRows, speciesDetails, activeLots, pondeuses, chair, chairReady, healthRows, overdueHealth, feedStocks, criticalFeed, eggs, events, costEvents, directCosts, healthCost, feedLogs, feedConsumption, mortality, totalAnimalsActive };
  }, [animaux, lots, sante, stocks, alimentationLogs, businessEvents, productionLogs]);

  const content = activeTab === 'Résumé' ? <SummaryTab data={data} onNavigate={onNavigate} />
    : ['Bovins', 'Ovins', 'Caprins'].includes(activeTab) ? <SpeciesTab species={activeTab.slice(0, -1)} data={data} onNavigate={onNavigate} />
    : activeTab === 'Pondeuses' ? <LotTab type="pondeuse" data={data} onNavigate={onNavigate} />
    : activeTab === 'Chair' ? <LotTab type="chair" data={data} onNavigate={onNavigate} />
    : activeTab === 'Santé' ? <HealthTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Alimentation' ? <FeedTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Charges' ? <ChargesTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Transformation' ? <TransformationTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Historique' ? <HistoryTab data={data} onNavigate={onNavigate} />
    : <GraphsTab data={data} onNavigate={onNavigate} />;

  return <div className="space-y-6"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1></div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('animaux')}>Fiches animaux</ActionButton><ActionButton onClick={() => onNavigate?.('avicole')}>Fiches lots</ActionButton><ActionButton onClick={() => onNavigate?.('sante')}>Santé</ActionButton></div></div></div><Tabs active={activeTab} onChange={setActiveTab} />{content}</div>;
}
