import { AlertTriangle, Bell, CheckCircle, Plus, RefreshCw, Search, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import { fmtCurrency } from '../utils/format';
import { generateSequentialId } from '../utils/ids';

const SEVERITY_ORDER = { urgence: 0, critique: 1, warning: 2, info: 3 };
const SEVERITY_BORDER = { urgence: 'border-l-red-500', critique: 'border-l-orange-500', warning: 'border-l-amber-400', info: 'border-l-sky-400' };
const SEVERITY_EMOJI = { urgence: '🚨', critique: '⚠️', warning: '⚡', info: 'ℹ️' };
const MODULE_BADGE = {
  animaux: 'bg-amber-100 text-amber-700',
  avicole: 'bg-yellow-100 text-yellow-700',
  cultures: 'bg-emerald-100 text-emerald-700',
  stock: 'bg-blue-100 text-blue-700',
  finances: 'bg-purple-100 text-purple-700',
  smartfarm: 'bg-indigo-100 text-indigo-700',
  autre: 'bg-gray-100 text-gray-600',
};

const ALERTE_FIELDS = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'message', label: 'Message', type: 'text', fullWidth: true },
  { key: 'module_source', label: 'Module', type: 'select', options: ['animaux', 'avicole', 'cultures', 'stock', 'finances', 'smartfarm', 'autre'] },
  { key: 'entity_type', label: 'Type entite', type: 'text' },
  { key: 'entity_id', label: 'ID entite', type: 'text' },
  { key: 'severity', label: 'Gravite', type: 'select', options: ['info', 'warning', 'critique', 'urgence'] },
  { key: 'action_recommandee', label: 'Action recommandee', type: 'text', fullWidth: true },
];

const arr = (value) => Array.isArray(value) ? value : [];
const alertKey = (alert = {}) => `${alert.module_source || alert.module || 'autre'}:${alert.entity_type || 'entite'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
const alreadyPersisted = (persisted = [], autoAlert = {}) => arr(persisted).some((alert) => String(alert.id) === String(autoAlert.id) || alert.alert_dedupe_key === alertKey(autoAlert) || `${alert.module_source}:${alert.entity_type}:${alert.entity_id}:${alert.action_recommandee || alert.title || alert.message || 'action'}` === alertKey(autoAlert));

export default function AlertesCenter({
  alertes = [],
  transactions = [],
  animaux = [],
  lots = [],
  stocks = [],
  cultures = [],
  sensorDevices = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onSendWhatsApp,
}) {
  const [severityFilter, setSeverityFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [moduleFilter, setModuleFilter] = useState('tous');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState('');

  const autoAlerts = useMemo(() => {
    const result = [];

    animaux.filter((a) => a.health_status === 'malade').forEach((a) => {
      result.push({ id: `auto-malade-${a.id}`, title: `Animal malade: ${a.name}`, message: `L'animal ${a.name} est en mauvais état de santé.`, module_source: 'animaux', entity_type: 'animal', entity_id: a.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Consulter vétérinaire immédiatement', isAuto: true, created_at: new Date().toISOString() });
    });

    animaux.filter((a) => a.health_status === 'sous_traitement').forEach((a) => {
      result.push({ id: `auto-traitement-${a.id}`, title: `Animal sous traitement: ${a.name}`, message: `L'animal ${a.name} est en cours de traitement. Vérifier le délai d'attente sanitaire avant toute vente.`, module_source: 'animaux', entity_type: 'animal', entity_id: a.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Vérifier traitement et délai d\'attente', isAuto: true, created_at: new Date().toISOString() });
    });

    lots.filter((l) => Number(l.mortality || 0) > Number(l.initial_count || 0) * 0.04).forEach((l) => {
      const pct = l.initial_count > 0 ? ((Number(l.mortality) / Number(l.initial_count)) * 100).toFixed(1) : '?';
      result.push({ id: `auto-mortalite-${l.id}`, title: `Mortalité élevée — Lot ${l.name}`, message: `${l.mortality} morts sur ${l.initial_count} (${pct}%). Seuil critique à 4%.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: l.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Isoler les sujets faibles et appeler un vétérinaire', isAuto: true, created_at: new Date().toISOString() });
    });

    transactions.filter((t) => t.statut === 'impaye').forEach((t) => {
      result.push({ id: `auto-impaye-${t.id}`, title: `Paiement impayé: ${t.libelle}`, message: `Transaction de ${fmtCurrency(t.montant)} non réglée.`, module_source: 'finances', entity_type: 'transaction', entity_id: t.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Relancer le client ou fournisseur', amount: t.montant, isAuto: true, created_at: new Date().toISOString() });
    });

    stocks.filter((s) => Number(s.quantite || 0) <= Number(s.seuil || 0)).forEach((s) => {
      result.push({ id: `auto-stock-${s.id}`, title: `Stock critique: ${s.nom || s.produit || s.id}`, message: `Quantité restante: ${s.quantite} ${s.unite || ''}. Seuil d'alerte: ${s.seuil}.`, module_source: 'stock', entity_type: 'stock', entity_id: s.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Commander réapprovisionnement', isAuto: true, created_at: new Date().toISOString() });
    });

    cultures.filter((c) => c.statut === 'perdu').forEach((c) => {
      result.push({ id: `auto-culture-${c.id}`, title: `Culture perdue: ${c.nom}`, message: `La culture ${c.nom} a été marquée comme perdue.`, module_source: 'cultures', entity_type: 'culture', entity_id: c.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Analyser cause et planifier nouvelle culture', isAuto: true, created_at: new Date().toISOString() });
    });

    sensorDevices.filter((d) => d.status === 'offline').forEach((d) => {
      result.push({ id: `auto-sensor-${d.id}`, title: `Capteur hors ligne: ${d.name || d.id}`, message: `Le capteur ${d.name || d.id} ne répond plus.`, module_source: 'smartfarm', entity_type: 'sensor', entity_id: d.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Vérifier batterie ou connexion', isAuto: true, created_at: new Date().toISOString() });
    });

    return result.filter((alert) => !alreadyPersisted(alertes, alert));
  }, [animaux, lots, transactions, stocks, cultures, sensorDevices, alertes]);

  const allAlerts = useMemo(() => [...autoAlerts, ...alertes].sort((a, b) => {
    const diff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
    if (diff !== 0) return diff;
    return new Date(b.created_at) - new Date(a.created_at);
  }), [autoAlerts, alertes]);

  const filtered = useMemo(() => allAlerts.filter((a) => {
    const sevOk = severityFilter === 'tous' || a.severity === severityFilter;
    const statOk = statusFilter === 'tous' || a.status === statusFilter;
    const modOk = moduleFilter === 'tous' || a.module_source === moduleFilter;
    const qOk = !query || `${a.title} ${a.message || ''} ${a.entity_id || ''}`.toLowerCase().includes(query.toLowerCase());
    return sevOk && statOk && modOk && qOk;
  }), [allAlerts, severityFilter, statusFilter, moduleFilter, query]);

  const modules = useMemo(() => [...new Set(allAlerts.map((a) => a.module_source).filter(Boolean))], [allAlerts]);
  const nouvellesCount = allAlerts.filter((a) => a.status === 'nouvelle').length;
  const critiquesCount = allAlerts.filter((a) => ['critique', 'urgence'].includes(a.severity)).length;
  const warningCount = allAlerts.filter((a) => a.severity === 'warning').length;

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate({ ...payload, status: 'nouvelle', alert_dedupe_key: alertKey(payload) });
      toast.success('Alerte créée');
      setModal(null);
    } catch { toast.error('Création alerte impossible'); } finally { setSaving(false); }
  };

  const handleMarkRead = async (alerte) => {
    if (alerte.isAuto) return toast.success('Alerte automatique à vérifier dans le module source');
    try { await onUpdate(alerte.id, { status: 'lue' }); toast.success('Marquée comme lue'); } catch { toast.error('Mise à jour impossible'); }
  };

  const handleTraiter = async (alerte) => {
    if (alerte.isAuto) return toast.success('Alerte automatique à traiter dans le module source');
    try { await onUpdate(alerte.id, { status: 'traitee' }); toast.success('Alerte traitée'); } catch { toast.error('Traitement impossible'); }
  };

  const handleSendWhatsApp = async (alerte) => {
    if (sendingId === alerte.id) return;
    try {
      setSendingId(alerte.id);
      await onSendWhatsApp?.(alerte, alerte.recipients || 'responsable');
      toast.success('Message préparé et journalisé');
    } catch {
      toast.error('Message impossible');
    } finally {
      setSendingId('');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Supprimée');
      setModal(null);
    } catch { toast.error('Suppression impossible'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700 font-medium">
        <span>ℹ️</span>
        <span>Les messages WhatsApp sont préparés et journalisés avant envoi réel.</span>
      </div>

      <SectionHeader
        title="Centre d'Alertes"
        sub="Alertes automatiques et manuelles"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Nouvelle alerte</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Bell} label="Total alertes" value={allAlerts.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={Bell} label="Nouvelles" value={nouvellesCount} color={nouvellesCount > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-100 text-gray-400'} />
        <KpiCard icon={AlertTriangle} label="Critiques / urgences" value={critiquesCount} color={critiquesCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-100 text-gray-400'} />
        <KpiCard icon={Zap} label="Avertissements" value={warningCount} color={warningCount > 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-gray-100 text-gray-400'} />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7456]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="w-full pl-8 pr-3 py-2 text-sm border border-[#d6c3a0] rounded-xl bg-[#fffdf8] text-[#2f2415] focus:outline-none focus:border-[#c9a96a]" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[#8a7456] self-center">Gravité:</span>
          {['tous', 'info', 'warning', 'critique', 'urgence'].map((s) => (
            <button key={s} type="button" onClick={() => setSeverityFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${severityFilter === s ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456] hover:border-[#b6975f]'}`}>{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[#8a7456] self-center">Statut:</span>
          {['tous', 'nouvelle', 'lue', 'traitee'].map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${statusFilter === s ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456] hover:border-[#b6975f]'}`}>{s}</button>
          ))}
        </div>
        {modules.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[#8a7456] self-center">Module:</span>
            {['tous', ...modules].map((m) => (
              <button key={m} type="button" onClick={() => setModuleFilter(m)} className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${moduleFilter === m ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456] hover:border-[#b6975f]'}`}>{m}</button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="bg-white border border-[#d6c3a0] rounded-2xl p-8 text-center text-[#8a7456]">Chargement...</div>}

      {!loading && filtered.length === 0 && (
        <div className="bg-white border border-[#d6c3a0] rounded-2xl p-16 text-center">
          <CheckCircle size={56} className="mx-auto mb-4 text-emerald-400" />
          <p className="text-lg font-bold text-[#2f2415]">Aucune alerte active</p>
          <p className="text-sm text-[#8a7456] mt-1">Tout est sous contrôle.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((alerte) => (
          <div key={alerte.id} className={`bg-white border border-[#d6c3a0] rounded-2xl p-4 flex gap-4 border-l-4 ${SEVERITY_BORDER[alerte.severity] || 'border-l-sky-400'}`}>
            <div className="shrink-0 text-2xl mt-0.5">{SEVERITY_EMOJI[alerte.severity] || 'ℹ️'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <p className="font-bold text-[#2f2415] flex-1 min-w-0">{alerte.title}</p>
                {alerte.module_source && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${MODULE_BADGE[alerte.module_source] || 'bg-gray-100 text-gray-600'}`}>{alerte.module_source}</span>
                )}
                {alerte.isAuto && <span className="text-xs px-2 py-0.5 rounded-full bg-[#eadcc2] text-[#7d6a4a] shrink-0">Auto</span>}
                {!alerte.isAuto && alerte.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${alerte.status === 'traitee' ? 'bg-emerald-100 text-emerald-700' : alerte.status === 'lue' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{alerte.status}</span>
                )}
              </div>
              {alerte.message && <p className="text-sm text-[#7d6a4a] mb-1">{alerte.message}</p>}
              {alerte.action_recommandee && (
                <p className="text-xs text-emerald-700 font-semibold">→ Action : {alerte.action_recommandee}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {alerte.entity_id && <span className="text-xs text-[#8a7456]">Ref: {alerte.entity_id}</span>}
                {alerte.amount != null && <span className="text-xs font-bold text-[#2f2415]">{fmtCurrency(alerte.amount)}</span>}
                {alerte.created_at && <span className="text-xs text-[#8a7456]">{new Date(alerte.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
            {!alerte.isAuto && (
              <div className="flex flex-col gap-1.5 shrink-0 items-end">
                {alerte.status === 'nouvelle' && (
                  <button type="button" onClick={() => handleMarkRead(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-[#d6c3a0] text-[#7d6a4a] hover:bg-[#f0e8d8] transition-colors whitespace-nowrap">Marquer lu</button>
                )}
                {alerte.status !== 'traitee' && (
                  <button type="button" onClick={() => handleTraiter(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap">✓ Traiter</button>
                )}
                <button type="button" disabled={sendingId === alerte.id} onClick={() => handleSendWhatsApp(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50 transition-colors whitespace-nowrap disabled:opacity-60">{sendingId === alerte.id ? 'Envoi...' : 'WhatsApp 📱'}</button>
                <ActionIconButton icon={X} color="red" title="Supprimer" onClick={() => { setSelected(alerte); setModal('delete'); }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={ALERTE_FIELDS} initialValues={{ id: generateSequentialId('alertes', alertes), severity: 'info', status: 'nouvelle' }} autoId={() => generateSequentialId('alertes', alertes)} loading={saving} title="Nouvelle alerte manuelle" submitLabel="Créer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={handleDelete} itemLabel={selected?.title || ''} loading={saving} />
    </div>
  );
}
