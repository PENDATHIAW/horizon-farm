import { AlertTriangle, BarChart3, Calendar, CheckCircle2, Download, Edit, Eye, PackagePlus, Plus, RefreshCw, Sprout, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import SectionHeader from '../components/SectionHeader';
import BaseModal from '../modals/BaseModal';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import EditModal from '../modals/EditModal';
import { calculateCultureMetricsWithLoss } from '../utils/lossAdjustedMetrics';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId, makeId } from '../utils/ids';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const arr = (value) => Array.isArray(value) ? value : [];
const n = (value) => toNumber(value);
const money = (value) => fmtCurrency(Math.round(Number(value || 0)));
const labelOf = (row = {}) => row.nom || row.culture || row.type || row.id || 'Culture';
const parcelOf = (row = {}) => row.parcelle || row.parcelle_nom || row.parcelle_code || 'Parcelle non renseignée';
const campaignOf = (row = {}) => row.campagne || row.saison || row.date_debut_campagne || 'Campagne non renseignée';
const statusOf = (row = {}) => row.statut || row.status || 'planifiee';
const unitOf = (row = {}) => row.unite_recolte || row.unite_production || 'kg';
const qtyPlanned = (row = {}) => n(row.quantite_prevue || row.production_prevue || row.rendement_attendu);
const qtyHarvested = (row = {}) => n(row.quantite_recoltee || row.harvested_qty || row.rendement_reel);
const qtySold = (row = {}) => n(row.quantite_vendue || row.sold_qty || row.vendue);
const qtyLoss = (row = {}) => n(row.pertes || row.quantite_perdue || row.quantite_sinistree);
const qtyAvailable = (row = {}) => Math.max(0, n(row.quantite_disponible) || qtyHarvested(row) - qtySold(row) - qtyLoss(row));
const unitPrice = (row = {}) => {
  const direct = n(row.prix_vente_unitaire || row.prix_vente_kg || row.prix_unitaire_estime || row.prix_unitaire);
  if (direct > 0) return direct;
  const qty = qtyHarvested(row) || qtyPlanned(row);
  const revenue = n(row.revenu_reel || row.revenu_estime);
  return qty > 0 ? Math.round(revenue / qty) : 0;
};
const seedCost = (row = {}) => n(row.cout_semences);
const fertilizerCost = (row = {}) => n(row.cout_engrais);
const waterCost = (row = {}) => n(row.cout_eau || row.cout_irrigation);
const laborCost = (row = {}) => n(row.cout_main_oeuvre || row.cout_mo);
const treatmentCost = (row = {}) => n(row.cout_traitement || row.cout_traitements);
const otherCost = (row = {}) => n(row.autres_frais || row.cout_autres || row.frais_directs);
const totalCost = (row = {}) => n(row.cout_total_reel) || n(row.budget_prevu) || seedCost(row) + fertilizerCost(row) + waterCost(row) + laborCost(row) + treatmentCost(row) + otherCost(row);
const revenue = (row = {}) => n(row.revenu_reel) || n(row.revenu_estime) || qtyHarvested(row) * unitPrice(row) || qtyPlanned(row) * unitPrice(row);
const margin = (row = {}) => n(row.marge_reelle) || revenue(row) - totalCost(row);
const daysUntil = (date) => date ? Math.ceil((new Date(date) - new Date(today())) / 86400000) : null;
const isRealCulture = (row = {}) => !['parcelle', 'campagne', 'performance'].includes(String(row.record_type || row.type_fiche || 'culture').toLowerCase());
const isRisky = (row = {}) => n(row.score_sante) < 80 || ['perdu', 'sinistre'].includes(String(statusOf(row)).toLowerCase()) || qtyLoss(row) > 0;
const isReady = (row = {}) => qtyAvailable(row) > 0;
const isHarvestSoon = (row = {}) => {
  const d = daysUntil(row.date_recolte_prevue);
  return d !== null && d >= 0 && d <= 14 && qtyHarvested(row) <= 0;
};

function normalize(row = {}) {
  const metrics = calculateCultureMetricsWithLoss(row);
  return {
    ...row,
    quantite_disponible: qtyAvailable(row) || metrics.availableQty,
    cout_total_reel: totalCost(row) || metrics.totalCostWithLoss,
    revenu_reel: n(row.revenu_reel) || n(row.revenu_estime) || metrics.revenueReal || metrics.revenueEstimated,
    marge_reelle: n(row.marge_reelle) || metrics.marginReal || metrics.marginEstimated,
    score_sante: n(row.score_sante) || metrics.healthScore || 100,
  };
}

function cultureDecision(row = {}) {
  if (String(statusOf(row)).toLowerCase() === 'perdu') return 'Clôturer la perte et documenter';
  if (isReady(row)) return 'Créer opportunité de vente';
  if (isHarvestSoon(row)) return 'Préparer récolte et stock';
  if (isRisky(row)) return 'Traiter / contrôler la parcelle';
  if (qtyHarvested(row) > 0 && qtyAvailable(row) <= 0) return 'Récolte déjà écoulée';
  return 'Continuer suivi terrain';
}

const fields = [
  { key: 'id', label: 'ID culture', type: 'text', required: true },
  { key: 'nom', label: 'Nom culture', type: 'text', required: true },
  { key: 'type', label: 'Type culture', type: 'select', options: ['Tomates', 'Oignons', 'Piments', 'Poivrons', 'Aubergines', 'Pomme de terre', 'Maraîchage', 'Céréales', 'Autre'] },
  { key: 'parcelle', label: 'Parcelle', type: 'text' },
  { key: 'campagne', label: 'Campagne / saison', type: 'text' },
  { key: 'statut', label: 'Stade', type: 'select', options: ['planifiee', 'semis', 'croissance', 'floraison', 'recolte', 'termine', 'perdu'] },
  { key: 'surface', label: 'Surface', type: 'number' },
  { key: 'unite_surface', label: 'Unité surface', type: 'select', options: ['m²', 'ha'] },
  { key: 'date_debut_campagne', label: 'Début campagne', type: 'date' },
  { key: 'date_semis', label: 'Date semis / plantation', type: 'date' },
  { key: 'date_recolte_prevue', label: 'Récolte prévue', type: 'date' },
  { key: 'cout_semences', label: 'Coût semences', type: 'number' },
  { key: 'cout_engrais', label: 'Coût engrais', type: 'number' },
  { key: 'cout_eau', label: 'Coût eau / irrigation', type: 'number' },
  { key: 'cout_main_oeuvre', label: 'Coût main-d’œuvre', type: 'number' },
  { key: 'cout_traitement', label: 'Coût traitements', type: 'number' },
  { key: 'autres_frais', label: 'Autres frais', type: 'number' },
  { key: 'quantite_prevue', label: 'Quantité prévue', type: 'number' },
  { key: 'quantite_recoltee', label: 'Quantité récoltée', type: 'number' },
  { key: 'quantite_disponible', label: 'Quantité disponible', type: 'number' },
  { key: 'pertes', label: 'Pertes', type: 'number' },
  { key: 'unite_recolte', label: 'Unité récolte', type: 'text' },
  { key: 'prix_vente_unitaire', label: 'Prix vente unitaire', type: 'number' },
  { key: 'revenu_reel', label: 'Revenu réel', type: 'number' },
  { key: 'score_sante', label: 'Score santé (%)', type: 'number' },
  { key: 'notes', label: 'Notes terrain', type: 'textarea', rows: 3, fullWidth: true },
];

function Metric({ label, value, danger = false, hint = '' }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-white'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-xs text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function Details({ open, onClose, row }) {
  if (!row) return null;
  const cost = totalCost(row);
  const rev = revenue(row);
  const mar = margin(row);
  return <BaseModal open={open} onClose={onClose} title={`Fiche culture · ${labelOf(row)}`} size="6xl"><div className="space-y-5">
    <div className="rounded-3xl bg-[#2f2415] text-white p-5"><p className="text-xs uppercase tracking-widest text-[#c9a96a]">{parcelOf(row)} · {campaignOf(row)}</p><h2 className="text-2xl font-black mt-1">{labelOf(row)}</h2><div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">{[['Stade', statusOf(row)], ['Surface', `${fmtNumber(n(row.surface))} ${row.unite_surface || 'm²'}`], ['Récolte prévue', row.date_recolte_prevue || '—'], ['Disponible', `${fmtNumber(qtyAvailable(row))} ${unitOf(row)}`], ['Décision', cultureDecision(row)], ['Marge', money(mar)]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-3"><p className="text-xs text-[#f4e6c8]">{label}</p><p className="font-black text-white mt-1">{value}</p></div>)}</div></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2 rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="font-black text-[#2f2415] mb-3">Suivi récolte</p><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric label="Prévu" value={`${fmtNumber(qtyPlanned(row))} ${unitOf(row)}`} /><Metric label="Récolté" value={`${fmtNumber(qtyHarvested(row))} ${unitOf(row)}`} /><Metric label="Disponible" value={`${fmtNumber(qtyAvailable(row))} ${unitOf(row)}`} /><Metric label="Pertes" value={`${fmtNumber(qtyLoss(row))} ${unitOf(row)}`} danger={qtyLoss(row) > 0} /></div><div className="mt-4 rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3 text-sm text-[#7d6a4a]">{row.notes || 'Aucune note terrain.'}</div></div><div className="space-y-3"><Metric label="Semences" value={money(seedCost(row))} /><Metric label="Engrais" value={money(fertilizerCost(row))} /><Metric label="Eau / irrigation" value={money(waterCost(row))} /><Metric label="Main-d’œuvre" value={money(laborCost(row))} /><Metric label="Traitements" value={money(treatmentCost(row))} /><Metric label="Autres frais" value={money(otherCost(row))} /><Metric label="Coût total" value={money(cost)} /><Metric label="Revenu" value={money(rev)} /><Metric label="Marge" value={money(mar)} danger={mar < 0} /></div></div>
  </div></BaseModal>;
}

function EvolutionBottom({ rows = [] }) {
  const sorted = [...rows].sort((a, b) => String(a.date_debut_campagne || a.date_semis || '').localeCompare(String(b.date_debut_campagne || b.date_semis || ''))).slice(-8);
  if (!sorted.length) return null;
  const max = Math.max(1, ...sorted.map((r) => Math.max(revenue(r), totalCost(r))));
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BarChart3 size={20} /> Évolution cultures</p><p className="text-sm text-[#8a7456] mt-1">Lecture simplifiée : coût, revenu et marge par culture. Les courbes restent volontairement en bas.</p></div><div className="space-y-3">{sorted.map((row) => { const cost = totalCost(row); const rev = revenue(row); const mar = margin(row); return <div key={row.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-[#2f2415]">{labelOf(row)}</p><p className="text-xs text-[#8a7456]">{parcelOf(row)} · {statusOf(row)}</p></div><p className={mar >= 0 ? 'text-emerald-700 font-black' : 'text-red-600 font-black'}>{money(mar)}</p></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Bar label="Coût" value={cost} max={max} /><Bar label="Revenu" value={rev} max={max} /></div></div>; })}</div></section>;
}
function Bar({ label, value, max }) { return <div><div className="flex justify-between text-[#8a7456]"><span>{label}</span><b>{money(value)}</b></div><div className="h-2 bg-[#eadcc2] rounded-full overflow-hidden mt-1"><div className="h-full bg-[#2f2415] rounded-full" style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }} /></div></div>; }

export default function CulturesV4(props) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState('');
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => arr(props.rows).filter(isRealCulture).map(normalize), [props.rows]);
  const dataMap = { cultures: rows, finances: props.transactions || [], sales_orders: props.salesOrders || [], payments: props.payments || [] };
  const summary = useMemo(() => ({ active: rows.filter((r) => !['termine', 'perdu'].includes(String(statusOf(r)).toLowerCase())).length, ready: rows.filter(isReady).length, soon: rows.filter(isHarvestSoon).length, risk: rows.filter(isRisky).length, cost: rows.reduce((s, r) => s + totalCost(r), 0), revenue: rows.reduce((s, r) => s + revenue(r), 0), margin: rows.reduce((s, r) => s + margin(r), 0) }), [rows]);

  const submitCreate = async (payload) => { try { setSaving(true); await props.onCreate?.({ ...payload, record_type: 'culture', type_fiche: 'culture', created_at: now(), updated_at: now() }); await props.onRefresh?.(); toast.success('Culture ajoutée'); setModal(''); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await props.onUpdate?.(selected.id, { ...payload, updated_at: now() }); await props.onRefresh?.(); toast.success('Culture modifiée'); setModal(''); } catch (error) { toast.error(error.message || 'Modification impossible'); } finally { setSaving(false); } };
  const submitDelete = async () => { if (!selected) return; try { setSaving(true); await props.onDelete?.(selected.id); await props.onRefresh?.(); toast.success('Culture supprimée'); setModal(''); } catch (error) { toast.error(error.message || 'Suppression impossible'); } finally { setSaving(false); } };
  const createOpportunity = async (row) => { if (!props.onCreateOpportunity) return toast.error('Création opportunité indisponible'); const qty = qtyAvailable(row); if (qty <= 0) return toast.error('Aucune quantité disponible'); try { const amount = qty * unitPrice(row); await props.onCreateOpportunity({ id: makeId('OPP'), opportunity_key: `cultures:${row.id}`, source_module: 'cultures', source_type: 'culture', source_id: row.id, related_id: row.id, title: `Récolte vendable: ${labelOf(row)}`, product_name: `${labelOf(row)} · ${parcelOf(row)}`, quantity: qty, unit: unitOf(row), unit_price: unitPrice(row), estimated_amount: amount, status: 'ouverte', statut: 'ouverte', priority: 'moyenne', created_from: 'cultures', created_at: now() }); await props.onUpdate?.(row.id, { vendable: true, pret_a_la_vente: true, ready_for_sale: true, sale_ready_confirmed_at: now() }); await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'opportunite_vente_creee', module_source: 'cultures', entity_type: 'culture', entity_id: row.id, title: `Opportunité vente ${labelOf(row)}`, description: `${fmtNumber(qty)} ${unitOf(row)} · ${money(amount)}`, event_date: today(), severity: 'info' }); await Promise.allSettled([props.onRefresh?.(), props.onRefreshOpportunities?.(), props.onRefreshBusinessEvents?.()]); toast.success('Opportunité créée'); } catch (error) { toast.error(error.message || 'Opportunité impossible'); } };
  const doExports = () => { const enriched = rows.map((row) => ({ ...row, cout_total: totalCost(row), revenu: revenue(row), marge: margin(row), quantite_disponible_calculee: qtyAvailable(row), decision: cultureDecision(row) })); exportToCsv({ rows: enriched, fileName: 'cultures.csv' }); exportToExcel({ rows: enriched, fileName: 'cultures.xlsx', sheetName: 'Cultures' }); exportToPdf({ rows: enriched, title: 'Cultures', fileName: 'cultures.pdf' }); toast.success('Exports générés'); };

  return <div className="space-y-6">
    <ObjectivePerformanceCard dataMap={dataMap} activity="cultures" title="Objectif & Performance cultures" onNavigate={props.onNavigate} />
    <SectionHeader title="Agricole / Cultures" sub="Lecture terrain : parcelles, coûts, récoltes, stock disponible, marge et action utile." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={props.onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter culture</Btn></>} />
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4"><KpiCard icon={Sprout} label="Actives" value={summary.active} /><KpiCard icon={PackagePlus} label="Disponibles" value={summary.ready} /><KpiCard icon={Calendar} label="Récoltes proches" value={summary.soon} /><KpiCard icon={AlertTriangle} label="À risque" value={summary.risk} /><KpiCard icon={TrendingUp} label="Revenu" value={money(summary.revenue)} /><KpiCard icon={TrendingUp} label="Marge" value={money(summary.margin)} /></div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><Metric label="Coût total cultures" value={money(summary.cost)} /><Metric label="Revenu / valeur récoltes" value={money(summary.revenue)} /><Metric label="Marge cultures" value={money(summary.margin)} danger={summary.margin < 0} /></div>
    <section className="rounded-3xl border border-[#d6c3a0] bg-white overflow-hidden"><div className="px-5 py-4 border-b border-[#eadcc2]"><p className="font-black text-[#2f2415]">Cultures suivies</p><p className="text-sm text-[#8a7456]">Informations importantes en premier. Les courbes sont en bas.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#fffdf8] text-xs uppercase text-[#8a7456]"><tr><th className="px-4 py-3 text-left">Culture</th><th className="px-4 py-3 text-left">Parcelle</th><th className="px-4 py-3 text-left">Stade</th><th className="px-4 py-3 text-left">Récolte</th><th className="px-4 py-3 text-left">Disponible</th><th className="px-4 py-3 text-right">Coût / marge</th><th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[#eadcc2] hover:bg-[#fffdf8]"><td className="px-4 py-3"><p className="font-black text-[#2f2415]">{labelOf(row)}</p><p className="text-xs text-[#8a7456]">{row.id} · {campaignOf(row)}</p></td><td className="px-4 py-3 text-[#7d6a4a]">{parcelOf(row)}</td><td className="px-4 py-3"><Badge status={statusOf(row)} /></td><td className="px-4 py-3"><p className="font-bold text-[#2f2415]">{row.date_recolte_prevue || '—'}</p><p className="text-xs text-[#8a7456]">prévu {fmtNumber(qtyPlanned(row))} {unitOf(row)}</p></td><td className="px-4 py-3"><p className="font-black text-[#2f2415]">{fmtNumber(qtyAvailable(row))} {unitOf(row)}</p><p className="text-xs text-[#8a7456]">récolté {fmtNumber(qtyHarvested(row))}</p></td><td className="px-4 py-3 text-right"><p className="font-bold text-[#2f2415]">{money(totalCost(row))}</p><p className={margin(row) >= 0 ? 'text-emerald-700 text-xs font-black' : 'text-red-600 text-xs font-black'}>{money(margin(row))}</p></td><td className="px-4 py-3"><p className="font-bold text-[#2f2415]">{cultureDecision(row)}</p>{isReady(row) ? <button type="button" onClick={() => createOpportunity(row)} className="mt-1 text-xs font-black text-emerald-700">Créer opportunité</button> : null}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div></td></tr>))}{!rows.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8a7456]">Aucune culture.</td></tr> : null}</tbody></table></div></section>
    <EvolutionBottom rows={rows} />
    <Details open={modal === 'details'} onClose={() => setModal('')} row={selected} />
    <CreateModal open={modal === 'create'} onClose={() => setModal('')} onSubmit={submitCreate} fields={fields} initialValues={{ id: generateSequentialId('cultures', rows), statut: 'planifiee', unite_surface: 'm²', unite_recolte: 'kg', date_debut_campagne: today(), score_sante: 100 }} loading={saving} title="Ajouter culture" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal('')} onSubmit={submitEdit} fields={fields} initialValues={selected || {}} loading={saving} title="Modifier culture" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal('')} onConfirm={submitDelete} itemLabel={selected?.nom || selected?.id || ''} loading={saving} />
  </div>;
}
