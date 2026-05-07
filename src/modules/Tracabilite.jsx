import { Activity, AlertTriangle, Calendar, Info, Plus, RefreshCw, Search, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId } from '../utils/ids';
import { fmtCurrency } from '../utils/format';

const EVENT_ICONS = {
  acquisition: '🐄', naissance: '🐣', alimentation: '🌾', soin: '💊',
  vaccination: '💉', traitement: '🩺', vente: '💰', deces: '💀',
  rentabilite: '📊', creation_lot: '🐥', production_oeufs: '🥚',
  mortalite_lot: '💀', vente_oeufs: '🥚', vente_poulets: '🐔',
  semis: '🌱', recolte: '🌾', incident_culture: '⚠️',
  entree_stock: '📦', sortie_stock: '📤', stock_critique: '🚨',
  depense: '💸', recette: '💵', document_ajoute: '📄',
  opportunite_vente_detectee: '🎯', opportunite_convertie: '✅',
};

const SEVERITY = {
  info: { dot: 'bg-sky-400', badge: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Info' },
  warning: { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Attention' },
  critique: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Critique' },
  urgence: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Urgence' },
};

const MODULE_BADGE = {
  animaux: 'bg-amber-100 text-amber-700',
  avicole: 'bg-yellow-100 text-yellow-700',
  cultures: 'bg-green-100 text-green-700',
  finances: 'bg-emerald-100 text-emerald-700',
  stocks: 'bg-blue-100 text-blue-700',
  ventes: 'bg-purple-100 text-purple-700',
  sante: 'bg-red-100 text-red-700',
};

const MANUAL_FIELDS = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'event_type', label: 'Type evenement', type: 'text', required: true },
  { key: 'module_source', label: 'Module source', type: 'select', options: ['animaux', 'avicole', 'cultures', 'finances', 'stocks', 'ventes', 'sante', 'autre'] },
  { key: 'entity_type', label: 'Type entite', type: 'select', options: ['animal', 'lot_avicole', 'culture', 'stock', 'transaction', 'autre'] },
  { key: 'entity_id', label: 'ID entite', type: 'text' },
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'text', fullWidth: true },
  { key: 'amount', label: 'Montant (FCFA)', type: 'number' },
  { key: 'event_date', label: 'Date', type: 'date' },
  { key: 'severity', label: 'Gravite', type: 'select', options: ['info', 'warning', 'critique', 'urgence'] },
];

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${active ? 'bg-[#2f2415] text-white' : 'bg-white border border-[#d6c3a0] text-[#7d6a4a] hover:border-[#b6975f]'}`}
    >
      {label}
    </button>
  );
}

function EventCard({ event, onNavigate }) {
  const sev = SEVERITY[event.severity] || SEVERITY.info;
  const icon = EVENT_ICONS[event.event_type] || '📌';
  const date = event.event_date
    ? new Date(event.event_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 hover:border-[#b6975f] transition-all">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
          <span className="text-lg leading-none">{icon}</span>
          <div className={`w-2 h-2 rounded-full ${sev.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sev.badge}`}>{sev.label}</span>
              {event.module_source && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${MODULE_BADGE[event.module_source] || 'bg-gray-100 text-gray-600'}`}>
                  {event.module_source}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#f0e8d8] text-[#7d6a4a] capitalize">
                {(event.event_type || '').replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#8a7456] shrink-0">
              <Calendar size={10} />
              {date}
            </div>
          </div>
          <p className="font-semibold text-[#2f2415]">{event.title}</p>
          {event.description && (
            <p className="text-sm text-[#7d6a4a] mt-0.5 line-clamp-2">{event.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {event.entity_id && (
              <span className="text-xs text-[#8a7456]">
                Entite : <span className="font-mono text-[#2f2415]">{event.entity_id}</span>
              </span>
            )}
            {event.amount != null && Number(event.amount) !== 0 && (
              <span className={`text-xs font-bold ${Number(event.amount) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtCurrency(event.amount)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {event.module_source && (
              <button
                type="button"
                onClick={() => onNavigate?.(event.module_source === 'stocks' ? 'stock' : event.module_source)}
                className="text-xs px-2.5 py-1 rounded-lg border border-[#d6c3a0] text-[#7d6a4a] hover:bg-[#f0e8d8]"
              >
                Ouvrir module source
              </button>
            )}
            {event.linked_document_id && (
              <button
                type="button"
                onClick={() => onNavigate?.('documents')}
                className="text-xs px-2.5 py-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50"
              >
                Voir document lie
              </button>
            )}
            {event.linked_transaction_id && (
              <button
                type="button"
                onClick={() => onNavigate?.('finances')}
                className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                Voir transaction liee
              </button>
            )}
            {event.linked_sale_id && (
              <button
                type="button"
                onClick={() => onNavigate?.('ventes')}
                className="text-xs px-2.5 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                Voir vente liee
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tracabilite({
  events = [],
  rows = [],
  loading,
  onCreate,
  onRefresh,
  onNavigate,
}) {
  const [entityFilter, setEntityFilter] = useState('tous');
  const [severityFilter, setSeverityFilter] = useState('tous');
  const [moduleFilter, setModuleFilter] = useState('tous');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const uniqueModules = useMemo(
    () => [...new Set(events.map((e) => e.module_source).filter(Boolean))],
    [events]
  );

  const filtered = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0))
      .filter((e) => {
        if (entityFilter !== 'tous' && e.entity_type !== entityFilter) return false;
        if (severityFilter !== 'tous' && e.severity !== severityFilter) return false;
        if (moduleFilter !== 'tous' && e.module_source !== moduleFilter) return false;
        if (query) {
          const q = query.toLowerCase();
          const hit = (e.title || '').toLowerCase().includes(q)
            || (e.description || '').toLowerCase().includes(q)
            || (e.entity_id || '').toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      });
  }, [events, entityFilter, severityFilter, moduleFilter, query]);

  const critiquesCount = useMemo(() => events.filter((e) => e.severity === 'critique' || e.severity === 'urgence').length, [events]);
  const warningsCount = useMemo(() => events.filter((e) => e.severity === 'warning').length, [events]);
  const infosCount = useMemo(() => events.filter((e) => e.severity === 'info').length, [events]);

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate({ ...payload, event_date: payload.event_date || new Date().toISOString() });
      toast.success('Evenement ajoute');
      setModal(null);
    } catch (err) {
      toast.error(err.message || 'Erreur creation');
    } finally {
      setSaving(false);
    }
  };

  const hasLegacy = events.length === 0 && rows.length > 0;
  const fields = MODULE_FORM_FIELDS.business_events || MANUAL_FIELDS;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tracabilite"
        sub="Timeline complete — evenements automatiques et manuels"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Evenement manuel</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Activity} label="Total evenements" value={events.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={Zap} label="Critiques / Urgences" value={critiquesCount} color={critiquesCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-200/40 text-gray-400'} />
        <KpiCard icon={AlertTriangle} label="Avertissements" value={warningsCount} color={warningsCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-200/40 text-gray-400'} />
        <KpiCard icon={Info} label="Informations" value={infosCount} color="bg-emerald-500/20 text-emerald-400" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7456]" />
          <input
            type="text"
            placeholder="Rechercher titre, description, ID entite..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-[#d6c3a0] text-sm bg-[#fffdf8] focus:outline-none focus:border-[#b6975f]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[#8a7456] self-center font-medium">Entite :</span>
          {['tous', 'animal', 'lot_avicole', 'culture', 'stock', 'transaction', 'autre'].map((t) => (
            <Chip key={t} label={t === 'tous' ? 'Toutes' : t.replace('_', ' ')} active={entityFilter === t} onClick={() => setEntityFilter(t)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[#8a7456] self-center font-medium">Gravite :</span>
          {['tous', 'info', 'warning', 'critique', 'urgence'].map((s) => (
            <Chip key={s} label={s === 'tous' ? 'Toutes' : s} active={severityFilter === s} onClick={() => setSeverityFilter(s)} />
          ))}
        </div>
        {uniqueModules.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[#8a7456] self-center font-medium">Module :</span>
            <Chip label="Tous" active={moduleFilter === 'tous'} onClick={() => setModuleFilter('tous')} />
            {uniqueModules.map((m) => (
              <Chip key={m} label={m} active={moduleFilter === m} onClick={() => setModuleFilter(m)} />
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#d6c3a0]/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Legacy fallback */}
      {!loading && hasLegacy && (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700 mb-1">Donnees legacy detectees</p>
            <p className="text-xs text-amber-600">Ces donnees viennent de l'ancienne table. La nouvelle tracabilite se construit automatiquement a chaque action dans l'application.</p>
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📌</span>
                  <div>
                    <p className="font-semibold text-[#2f2415]">{row.animal || row.id}</p>
                    <p className="text-xs text-[#8a7456]">
                      {row.type}
                      {row.margeFinale != null ? ` — Marge : ${fmtCurrency(row.margeFinale)}` : ''}
                      {row.roi != null ? ` — ROI : ${row.roi}%` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty */}
      {!loading && !hasLegacy && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d6c3a0] bg-white p-12 text-center">
          <Activity size={40} className="mx-auto text-[#d6c3a0] mb-3" />
          <p className="font-semibold text-[#2f2415] mb-1">Aucun evenement enregistre</p>
          <p className="text-sm text-[#8a7456] mb-4">
            Les evenements apparaissent automatiquement lors de vos actions : ventes, vaccinations, alimentation, etc.
          </p>
          <Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter un evenement manuel</Btn>
        </div>
      )}

      {/* No results */}
      {!loading && events.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-[#d6c3a0] bg-white p-8 text-center text-[#8a7456]">
          Aucun evenement ne correspond aux filtres selectionnes.
        </div>
      )}

      {/* Timeline */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-[#8a7456]">
            {filtered.length} evenement{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''}
          </p>
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      <CreateModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        onSubmit={submitCreate}
        fields={fields}
        initialValues={{
          id: generateSequentialId('tracabilite', events),
          event_date: new Date().toISOString().slice(0, 10),
          severity: 'info',
          module_source: 'autre',
          entity_type: 'autre',
        }}
        autoId={() => generateSequentialId('tracabilite', events)}
        loading={saving}
        title="Ajouter un evenement manuel"
        submitLabel="Enregistrer"
      />
    </div>
  );
}
