import { Activity, AlertTriangle, Calendar, Download, Info, Plus, RefreshCw, Search, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId } from '../utils/ids';
import { fmtCurrency } from '../utils/format';
import { exportToCsv } from '../utils/export';
import { buildTraceCoverage, normalizeTraceEvent, routeForTrace } from '../utils/traceabilityWorkflows';

const EVENT_ICONS = { acquisition: '🐄', naissance: '🐣', alimentation: '🌾', soin: '💊', vaccination: '💉', traitement: '🩺', vente: '💰', deces: '💀', rentabilite: '📊', creation_lot: '🐥', production_oeufs: '🥚', mortalite_lot: '💀', vente_oeufs: '🥚', vente_poulets: '🐔', semis: '🌱', recolte: '🌾', incident_culture: '⚠️', entree_stock: '📦', sortie_stock: '📤', stock_critique: '🚨', depense: '💸', recette: '💵', document_ajoute: '📄', opportunite_vente_detectee: '🎯', opportunite_convertie: '✅' };
const SEVERITY = { info: { dot: 'bg-neutral', badge: 'bg-neutral-bg text-neutral border-line', label: 'Info' }, warning: { dot: 'bg-vigilance', badge: 'bg-vigilance-bg text-horizon-dark border-vigilance', label: 'À surveiller' }, critique: { dot: 'bg-vigilance', badge: 'bg-vigilance-bg text-horizon-dark border-vigilance', label: 'Important' }, urgence: { dot: 'bg-urgent', badge: 'bg-urgent-bg text-urgent border-urgent', label: 'Urgent' } };
const MODULE_BADGE = { animaux: 'bg-vigilance-bg text-horizon-dark', avicole: 'bg-vigilance-bg text-horizon-dark', cultures: 'bg-positive-bg text-positive', finances: 'bg-positive-bg text-positive', stocks: 'bg-neutral-bg text-neutral', ventes: 'bg-neutral-bg text-neutral', sante: 'bg-urgent-bg text-urgent' };
const MODULE_LABEL = { animaux: 'Animaux', avicole: 'Avicole', cultures: 'Cultures', finances: 'Finances', stocks: 'Stock', stock: 'Stock', ventes: 'Ventes', sante: 'Santé', documents: 'Documents', taches: 'Tâches', alertes: 'Alertes', autre: 'Autre' };
const ENTITY_LABEL = { animal: 'Animal', lot_avicole: 'Lot avicole', culture: 'Culture', stock: 'Stock', transaction: 'Finance', autre: 'Autre' };
const EVENT_LABEL = (value = '') => String(value || '').replace(/_/g, ' ');

const MANUAL_FIELDS = [
  { key: 'id', label: 'Référence', type: 'text', required: true },
  { key: 'event_type', label: 'Type de fait', type: 'text', required: true },
  { key: 'module_source', label: 'Espace concerné', type: 'select', options: ['animaux', 'avicole', 'cultures', 'finances', 'stocks', 'ventes', 'sante', 'autre'] },
  { key: 'entity_type', label: 'Élément concerné', type: 'select', options: ['animal', 'lot_avicole', 'culture', 'stock', 'transaction', 'autre'] },
  { key: 'entity_id', label: 'Référence de l’élément', type: 'text' },
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'amount', label: 'Montant (FCFA)', type: 'number' },
  { key: 'event_date', label: 'Date', type: 'date' },
  { key: 'severity', label: 'Importance', type: 'select', options: ['info', 'warning', 'critique', 'urgence'] },
];

function Chip({ label, active, onClick }) { return <button type="button" onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${active ? 'bg-earth text-white' : 'bg-white border border-line text-slate hover:border-horizon'}`}>{label}</button>; }

function PriorityTraceSummary({ events = [], onNavigate }) {
  const priority = [...events]
    .filter((event) => ['urgence', 'critique', 'warning'].includes(event.severity))
    .sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0))
    .slice(0, 6);
  const linkedDocs = events.filter((event) => event.linked_document_id).length;
  const linkedSales = events.filter((event) => event.linked_sale_id).length;
  const linkedFinances = events.filter((event) => event.linked_transaction_id).length;
  return <div className="rounded-2xl border border-line bg-white p-6 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate">À vérifier en priorité</p><h3 className="font-semibold text-earth">Faits critiques récents</h3><p className="text-sm text-slate mt-1">Traçabilité utile aux contrôles : pertes, incidents, documents, ventes et paiements liés.</p></div><div className="grid grid-cols-3 gap-2 text-sm"><Mini label="Docs liés" value={linkedDocs} /><Mini label="Ventes liées" value={linkedSales} /><Mini label="Finances liées" value={linkedFinances} /></div></div>{priority.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{priority.map((event) => { const sev = SEVERITY[event.severity] || SEVERITY.info; const route = routeForTrace(event); return <div key={event.id} className="rounded-xl border border-line bg-card p-3"><div className="flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded-full border font-medium ${sev.badge}`}>{sev.label}</span>{event.module_source ? <span className="text-xs text-slate">{MODULE_LABEL[event.module_source] || event.module_source}</span> : null}</div><p className="font-semibold text-earth mt-2 line-clamp-2">{event.title || event.event_type || event.id}</p><p className="text-xs text-slate mt-1 line-clamp-2">{event.description || EVENT_LABEL(event.event_type)}</p>{route ? <button type="button" onClick={() => onNavigate?.(route)} className="mt-3 text-xs font-semibold text-positive">Ouvrir source</button> : null}</div>; })}</div> : <div className="rounded-xl border border-positive bg-positive-bg p-3 text-sm text-positive">Aucun fait critique récent à vérifier.</div>}</div>;
}
function Mini({ label, value }) { return <div className="rounded-xl bg-card border border-line px-3 py-2 min-w-[100px]"><b className="block text-earth">{value}</b><span className="text-xs text-slate">{label}</span></div>; }

function EventCard({ event, onNavigate }) {
  const sev = SEVERITY[event.severity] || SEVERITY.info;
  const icon = EVENT_ICONS[event.event_type] || '📌';
  const date = event.event_date ? new Date(event.event_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const moduleLabel = MODULE_LABEL[event.module_source] || event.module_source;
  const route = routeForTrace(event);
  return <div className="bg-white border border-line rounded-2xl p-4 hover:border-horizon transition-all"><div className="flex items-start gap-3"><div className="flex flex-col items-center gap-2 pt-1 shrink-0"><span className="text-lg leading-none">{icon}</span><div className={`w-2 h-2 rounded-full ${sev.dot}`} /></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2 flex-wrap mb-1"><div className="flex items-center gap-2 flex-wrap"><span className={`text-xs px-2 py-1 rounded-full border font-medium ${sev.badge}`}>{sev.label}</span>{event.module_source ? <span className={`text-xs px-2 py-1 rounded-full ${MODULE_BADGE[event.module_source] || 'bg-neutral-bg text-neutral'}`}>{moduleLabel}</span> : null}<span className="text-xs px-2 py-1 rounded-full bg-line text-slate capitalize">{EVENT_LABEL(event.event_type)}</span>{!event.has_source ? <span className="text-xs px-2 py-1 rounded-full bg-vigilance-bg text-horizon-dark">source à compléter</span> : null}</div><div className="flex items-center gap-1 text-xs text-slate shrink-0"><Calendar size={10} />{date}</div></div><p className="font-semibold text-earth">{event.title}</p>{event.description ? <p className="text-sm text-slate mt-1 line-clamp-2">{event.description}</p> : null}<div className="flex items-center gap-3 mt-2 flex-wrap">{event.entity_id ? <span className="text-xs text-slate">Concerné : <span className="font-semibold text-earth">{event.entity_id}</span></span> : null}{event.amount != null && Number(event.amount) !== 0 ? <span className={`text-xs font-semibold ${Number(event.amount) >= 0 ? 'text-positive' : 'text-urgent'}`}>{fmtCurrency(event.amount)}</span> : null}</div><div className="flex flex-wrap gap-2 mt-3">{route ? <button type="button" onClick={() => onNavigate?.(route)} className="text-xs px-3 py-1 rounded-lg border border-line text-slate hover:bg-line">Ouvrir source</button> : null}{event.linked_document_id ? <button type="button" onClick={() => onNavigate?.('documents')} className="text-xs px-3 py-1 rounded-lg border border-line text-neutral hover:bg-neutral-bg">Voir le document</button> : null}{event.linked_transaction_id ? <button type="button" onClick={() => onNavigate?.('finances')} className="text-xs px-3 py-1 rounded-lg border border-positive text-positive hover:bg-positive-bg">Voir le paiement</button> : null}{event.linked_sale_id ? <button type="button" onClick={() => onNavigate?.('ventes')} className="text-xs px-3 py-1 rounded-lg border border-line text-neutral hover:bg-neutral-bg">Voir la vente</button> : null}</div></div></div></div>;
}

export default function Tracabilite({ events = [], rows = [], loading, onCreate, onRefresh, onNavigate }) {
  const [entityFilter, setEntityFilter] = useState('tous');
  const [severityFilter, setSeverityFilter] = useState('tous');
  const [moduleFilter, setModuleFilter] = useState('tous');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const displayEvents = useMemo(() => events.map(normalizeTraceEvent), [events]);
  const coverage = useMemo(() => buildTraceCoverage(displayEvents), [displayEvents]);
  const uniqueModules = useMemo(() => [...new Set(displayEvents.map((e) => e.module_source).filter(Boolean))], [displayEvents]);
  const filtered = useMemo(() => [...displayEvents].sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0)).filter((e) => { if (entityFilter !== 'tous' && e.entity_type !== entityFilter) return false; if (severityFilter !== 'tous' && e.severity !== severityFilter) return false; if (moduleFilter !== 'tous' && e.module_source !== moduleFilter) return false; if (query) { const q = query.toLowerCase(); const hit = (e.title || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q) || (e.entity_id || '').toLowerCase().includes(q); if (!hit) return false; } return true; }), [displayEvents, entityFilter, severityFilter, moduleFilter, query]);
  const critiquesCount = useMemo(() => displayEvents.filter((e) => e.severity === 'critique' || e.severity === 'urgence').length, [displayEvents]);
  const warningsCount = useMemo(() => displayEvents.filter((e) => e.severity === 'warning').length, [displayEvents]);
  const infosCount = useMemo(() => displayEvents.filter((e) => e.severity === 'info').length, [displayEvents]);
  const submitCreate = async (payload) => { try { setSaving(true); await onCreate(normalizeTraceEvent({ ...payload, event_date: payload.event_date || new Date().toISOString() })); toast.success('Fait important ajouté'); setModal(null); } catch (err) { toast.error(err.message || 'Ajout impossible'); } finally { setSaving(false); } };
  const exportFiltered = () => { exportToCsv({ rows: filtered, columns: ['id', 'event_date', 'event_type', 'module_source', 'entity_type', 'entity_id', 'title', 'severity', 'amount'], fileName: 'tracabilite-horizon-farm.csv' }); toast.success('Export traçabilité généré'); };
  const hasLegacy = events.length === 0 && rows.length > 0;
  const fields = MODULE_FORM_FIELDS.business_events || MANUAL_FIELDS;
  return <div className="space-y-6"><SectionHeader title="Traçabilité" sub="Mémoire de la ferme : actions, ventes, soins, stocks, documents et faits importants" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportFiltered}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter un fait</Btn></>} />
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4"><KpiCard icon={Activity} label="Faits enregistrés" value={displayEvents.length} color="bg-neutral text-neutral" /><KpiCard icon={Zap} label="Urgents / importants" value={critiquesCount} color={critiquesCount > 0 ? 'bg-urgent text-urgent' : 'bg-neutral-bg text-neutral'} /><KpiCard icon={AlertTriangle} label="À surveiller" value={warningsCount} color={warningsCount > 0 ? 'bg-vigilance text-horizon-dark' : 'bg-neutral-bg text-neutral'} /><KpiCard icon={Info} label="Informations" value={infosCount} color="bg-positive text-positive" /><KpiCard icon={AlertTriangle} label="Sources à compléter" value={coverage.missingSource.length} color={coverage.missingSource.length ? 'bg-vigilance text-horizon-dark' : 'bg-positive text-positive'} /></div>
    <PriorityTraceSummary events={displayEvents} onNavigate={onNavigate} />
    <div className="bg-white border border-line rounded-2xl p-4 space-y-3"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" /><input type="text" placeholder="Rechercher titre, description, référence..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-8 pr-4 py-2 rounded-xl border border-line text-sm bg-card focus:outline-none focus:border-horizon" /></div><div className="flex flex-wrap gap-2"><span className="text-xs text-slate self-center font-medium">Élément :</span>{['tous', 'animal', 'lot_avicole', 'culture', 'stock', 'transaction', 'autre'].map((t) => <Chip key={t} label={t === 'tous' ? 'Tous' : (ENTITY_LABEL[t] || t.replace('_', ' '))} active={entityFilter === t} onClick={() => setEntityFilter(t)} />)}</div><div className="flex flex-wrap gap-2"><span className="text-xs text-slate self-center font-medium">Importance :</span>{['tous', 'info', 'warning', 'critique', 'urgence'].map((s) => <Chip key={s} label={s === 'tous' ? 'Toutes' : (SEVERITY[s]?.label || s)} active={severityFilter === s} onClick={() => setSeverityFilter(s)} />)}</div>{uniqueModules.length > 0 ? <div className="flex flex-wrap gap-2"><span className="text-xs text-slate self-center font-medium">Espace :</span><Chip label="Tous" active={moduleFilter === 'tous'} onClick={() => setModuleFilter('tous')} />{uniqueModules.map((m) => <Chip key={m} label={MODULE_LABEL[m] || m} active={moduleFilter === m} onClick={() => setModuleFilter(m)} />)}</div> : null}</div>
    {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-line/40 animate-pulse" />)}</div> : null}
    {!loading && hasLegacy ? <><div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4"><p className="text-sm font-semibold text-horizon-dark mb-1">Anciennes données détectées</p><p className="text-xs text-horizon-dark">Ces données viennent d’un ancien format. Les nouvelles actions seront ajoutées automatiquement dans l’historique.</p></div><div className="space-y-2">{rows.map((row) => <div key={row.id} className="bg-white border border-line rounded-2xl p-4"><div className="flex items-start gap-3"><span className="text-xl">📌</span><div><p className="font-semibold text-earth">{row.animal || row.id}</p><p className="text-xs text-slate">{row.type}{row.margeFinale != null ? ` - Marge : ${fmtCurrency(row.margeFinale)}` : ''}{row.roi != null ? ` - ROI : ${row.roi}%` : ''}</p></div></div></div>)}</div></> : null}
    {!loading && !hasLegacy && events.length === 0 ? <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center"><Activity size={40} className="mx-auto text-line mb-3" /><p className="font-semibold text-earth mb-1">Aucun fait enregistré</p><p className="text-sm text-slate mb-4">Les faits apparaissent lors des ventes, vaccinations, sorties de stock, documents et autres actions importantes.</p><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter un fait</Btn></div> : null}
    {!loading && events.length > 0 && filtered.length === 0 ? <div className="rounded-2xl border border-line bg-white p-8 text-center text-slate">Aucun fait ne correspond aux filtres sélectionnés.</div> : null}
    {!loading && filtered.length > 0 ? <div className="space-y-3"><p className="text-xs text-slate">{filtered.length} fait{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</p>{filtered.map((event) => <EventCard key={event.id} event={event} onNavigate={onNavigate} />)}</div> : null}
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={fields} initialValues={{ id: generateSequentialId('tracabilite', events), event_date: new Date().toISOString().slice(0, 10), severity: 'info', module_source: 'autre', entity_type: 'autre' }} autoId={() => generateSequentialId('tracabilite', events)} loading={saving} title="Ajouter un fait important" submitLabel="Enregistrer" />
  </div>;
}
