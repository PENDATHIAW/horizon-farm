import { AlertTriangle, CheckCircle, Cloud, Database, Download, FileText, History, RefreshCw, ShieldCheck, Trash2, Wifi } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import ModuleTimeline from '../components/ModuleTimeline';
import SectionHeader from '../components/SectionHeader';
import { clearOfflineQueue, readOfflineQueue } from '../services/offlineQueueService';
import { enrichOfflineQueue } from '../utils/offlineConflictRules';

const arr = (value) => Array.isArray(value) ? value : [];
const moduleLabels = { animaux: 'Animaux', avicole: 'Avicole', sante: 'Santé', finances: 'Finances', comptabilite: 'Comptabilité', investissements: 'Investissements', stock: 'Stocks', clients: 'Clients', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', cultures: 'Cultures', ventes: 'Ventes', documents: 'Documents', taches: 'Tâches', rapports: 'Rapports', equipements: 'Équipements', audit_logs: 'Journal activité', business_events: 'Événements métier', alertes_center: 'Alertes' };
const sourceLabel = (value = '') => ({ offline: 'Hors ligne', sync: 'Connexion', audit: 'Journal', event: 'Événement' }[String(value || '').toLowerCase()] || value || 'ERP');
const pendingSimulation = [{ id: 'OFF-001', module: 'animaux', action: 'création', label: 'Animal ajouté', status: 'prêt' }, { id: 'OFF-002', module: 'stock', action: 'sortie', label: 'Sortie aliment', status: 'à vérifier' }, { id: 'OFF-003', module: 'ventes', action: 'paiement', label: 'Paiement commande', status: 'à vérifier' }];
const estimateSize = (count) => `${Math.max(4, Math.ceil(Number(count || 0) * 2.4))} KB`;
const riskClass = (level) => level === 'haute' ? 'bg-urgent-bg text-urgent border-urgent' : level === 'moyenne' ? 'bg-vigilance-bg text-horizon-dark border-vigilance' : 'bg-positive-bg text-positive border-positive';
const safeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateLabel = (value) => {
  const date = safeDate(value);
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  } catch {
    return '—';
  }
};
const safeCreatedAt = (row = {}) => safeDate(row.created_at || row.createdAt || row.date || row.updated_at)?.toISOString() || '';
const normalizeQueueItem = (item = {}) => ({
  id: item.id || `OFF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  module: item.module || item.moduleKey || 'sync',
  action: item.action || 'action',
  label: item.label || `${item.action || 'Action'} ${item.recordId || item.id || ''}`.trim(),
  status: item.status || 'en attente',
  created_at: safeCreatedAt(item) || new Date().toISOString(),
});

function buildSyncLogRows({ pendingItems = [], dataMap = {}, online = true, lastOnlineAt }) {
  const audit = arr(dataMap.audit_logs).map((row) => ({ id: row.id, title: row.action || row.title || 'Audit', description: `${row.module || row.module_source || 'système'} · ${row.user_email || row.user || 'utilisateur'}`, status: row.status || 'audit', created_at: safeCreatedAt(row), source: 'audit' }));
  const events = arr(dataMap.business_events).map((row) => ({ id: row.id, title: row.title || row.event_type || 'Événement métier', description: `${row.module_source || 'erp'} · ${row.entity_type || ''}`, status: row.severity || 'event', created_at: safeCreatedAt(row), source: 'événement' }));
  const queue = arr(pendingItems).map((item) => ({ id: item.id, title: item.label || item.action || 'Action locale', description: `${moduleLabels[item.module] || item.module || 'ERP'} · ${item.action || 'action'}`, status: item.status || 'en attente', created_at: safeCreatedAt(item), source: 'offline' }));
  const base = [{ id: 'sync-state', title: online ? 'Connexion active' : 'Mode hors ligne', description: online ? 'Envoi disponible' : 'Actions enregistrées localement', status: online ? 'ok' : 'warning', created_at: safeDate(lastOnlineAt)?.toISOString() || new Date().toISOString(), source: 'sync' }];
  return [...base, ...queue, ...audit, ...events]
    .filter((row) => row.id)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 30);
}

function safeEnrichOfflineQueue(items = []) {
  try {
    return enrichOfflineQueue(arr(items)).map((item) => ({ ...normalizeQueueItem(item), ...item }));
  } catch {
    return arr(items).map(normalizeQueueItem);
  }
}

export default function Sync({ onRefreshAll, onFlushOffline, online = true, lastOnlineAt, dataMap = {}, embedded = false }) {
  const [syncing, setSyncing] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [localQueue, setLocalQueue] = useState(() => arr(readOfflineQueue()).map(normalizeQueueItem));
  const lastSync = dateLabel(lastOnlineAt) === '—' ? "Aujourd'hui" : dateLabel(lastOnlineAt);
  const syncModules = useMemo(() => Object.entries(moduleLabels).map(([key, label]) => { const records = Array.isArray(dataMap?.[key]) ? dataMap[key].length : 0; return { key, module: label, records, size: estimateSize(records) }; }), [dataMap]);
  const basePendingItems = localQueue.length ? localQueue.map(normalizeQueueItem) : (showSimulation || !online ? pendingSimulation.map((item) => normalizeQueueItem({ ...item, created_at: new Date().toISOString() })) : []);
  const pendingItems = safeEnrichOfflineQueue(basePendingItems);
  const highRiskCount = pendingItems.filter((item) => item.conflictRisk?.level === 'haute').length;
  const syncLogRows = useMemo(() => buildSyncLogRows({ pendingItems, dataMap, online, lastOnlineAt }), [pendingItems, dataMap, online, lastOnlineAt]);
  const timelineRows = syncLogRows.map((item) => ({ ...item, description: `${item.description || ''} · ${sourceLabel(item.source)}` }));

  const synchronize = async () => {
    try {
      setSyncing(true);
      if (online && localQueue.length) {
        const result = await onFlushOffline?.();
        toast.success(`${result?.processed || 0} action(s) envoyée(s)`);
      }
      await onRefreshAll?.();
      setShowSimulation(false);
      setLocalQueue(arr(readOfflineQueue()).map(normalizeQueueItem));
      toast.success('Envoi terminé');
    } catch (error) {
      toast.error(error.message || 'Envoi impossible');
    } finally {
      setSyncing(false);
    }
  };

  const downloadBackup = () => {
    const payload = { exported_at: new Date().toISOString(), source: 'Horizon Farm ERP', data: dataMap || {}, offline_queue: arr(readOfflineQueue()) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horizon-farm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup téléchargé');
  };

  const clearLocalQueue = () => {
    if (!window.confirm('Vider uniquement les actions locales en attente ? Les tables ERP et leurs données déjà envoyées ne seront pas supprimées.')) return;
    clearOfflineQueue();
    setLocalQueue([]);
    setShowSimulation(false);
    toast.success('File offline locale vidée');
  };

  const actions = <><Btn icon={RefreshCw} variant="outline" small onClick={synchronize} disabled={syncing}>{syncing ? 'Envoi...' : 'Envoyer les actions'}</Btn><Btn icon={Download} variant="outline" small onClick={downloadBackup}>Exporter sauvegarde</Btn><Btn icon={Trash2} variant="outline" small onClick={clearLocalQueue}>Vider actions locales</Btn></>;

  return <div className="space-y-6">
    {!embedded ? <SectionHeader title="Hors ligne & envoi ERP" sub="Données locales, sauvegarde, journal et contrôle des conflits. Ne supprime jamais les tables ERP." actions={actions} /> : <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><KpiCard icon={Wifi} label="Réseau" value={online ? 'Connecté' : 'Hors ligne'} sub={online ? 'À jour' : 'Local'} color={online ? 'bg-positive text-positive' : 'bg-urgent text-urgent'} /><KpiCard icon={Cloud} label="Dernier envoi" value={lastSync} sub="Dernier passage" color="bg-neutral text-neutral" /><KpiCard icon={Database} label="En attente" value={pendingItems.length} sub="À envoyer" color={pendingItems.length ? 'bg-vigilance text-horizon-dark' : 'bg-positive text-positive'} /><KpiCard icon={History} label={embedded ? 'État envoi' : 'Journal visible'} value={embedded ? (online ? 'OK' : 'Local') : syncLogRows.length} sub={embedded ? 'journal séparé' : 'activité + contrôle + événements'} color="bg-neutral text-neutral" /></div>
    {highRiskCount ? <div className="rounded-2xl border border-urgent bg-urgent-bg p-4 text-sm text-urgent"><AlertTriangle size={16} className="inline" /> {highRiskCount} action(s) hors ligne à risque élevé. Vérifier avant envoi.</div> : null}
    {!embedded ? <ModuleTimeline title="Historique des échanges" subtitle="Réseau, actions locales, journal, événements métier et conflits détectés." rows={timelineRows} onRefresh={synchronize} navigateLabel="Envoyer" /> : null}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2 bg-pure border border-line rounded-2xl p-6"><div className="flex items-center justify-between mb-4 gap-3"><div><p className="font-semibold text-earth">Modules suivis</p><p className="text-xs text-slate">Volume local par module.</p></div><Btn variant="outline" small icon={RefreshCw} onClick={synchronize}>Actualiser</Btn></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{syncModules.map((m) => <div key={m.key} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-line"><CheckCircle size={16} className="text-positive shrink-0" /><span className="flex-1 text-sm text-earth">{m.module}</span><span className="text-xs text-slate">{m.records} fiches</span><span className="text-xs text-slate">{m.size}</span></div>)}</div></div><div className="bg-pure border border-line rounded-2xl p-6"><p className="font-semibold text-earth mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-positive" />Contrôle hors ligne</p><div className="space-y-3 text-sm text-slate"><p>Les actions locales en attente sont sécurisées.</p><p>Le bouton “Vider actions locales” supprime uniquement les actions locales en attente.</p><p>Il ne supprime ni tables, ni données ERP déjà envoyées.</p></div><button type="button" onClick={() => { setShowSimulation((value) => !value); toast.success('Simulation mise à jour'); }} className="mt-4 w-full rounded-xl bg-card border border-line px-3 py-2 text-sm text-earth hover:border-horizon">{showSimulation ? 'Masquer simulation' : 'Simuler hors ligne'}</button></div></div>
    {!embedded ? <div className="bg-pure border border-line rounded-2xl p-6"><p className="font-semibold text-earth mb-4">Journal d’activité</p>{syncLogRows.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-line bg-card text-left text-xs uppercase text-slate"><th className="py-2 px-3">Date</th><th className="py-2 px-3">Source</th><th className="py-2 px-3">Action</th><th className="py-2 px-3">Détail</th><th className="py-2 px-3">Statut</th></tr></thead><tbody>{syncLogRows.map((row) => <tr key={`${row.source}-${row.id}`} className="border-b border-line"><td className="py-2 px-3">{dateLabel(row.created_at)}</td><td className="py-2 px-3"><span className="rounded-full bg-card border border-line px-2 py-1 text-xs font-semibold text-slate">{sourceLabel(row.source)}</span></td><td className="py-2 px-3 font-semibold text-earth">{row.title}</td><td className="py-2 px-3 text-slate">{row.description}</td><td className="py-2 px-3">{row.status}</td></tr>)}</tbody></table></div> : <div className="rounded-xl bg-positive border border-positive p-4 flex gap-3"><FileText size={18} className="text-positive shrink-0" /><div><p className="text-sm font-semibold text-earth">Aucun événement disponible</p><p className="text-xs text-slate">Les prochaines actions apparaîtront ici.</p></div></div>}</div> : null}
    <div className="bg-pure border border-line rounded-2xl p-6"><p className="font-semibold text-earth mb-4">Actions en attente</p>{pendingItems.length ? <div className="space-y-3">{pendingItems.map((item) => <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-vigilance border border-vigilance rounded-xl p-3"><AlertTriangle size={16} className="text-horizon-dark shrink-0" /><div className="flex-1"><p className="text-sm font-semibold text-earth">{item.label}</p><p className="text-xs text-slate">{moduleLabels[item.module] || item.module} - {item.action}</p><p className="text-xs text-slate mt-1">{item.conflictRisk?.reason || 'Action locale en attente.'}</p></div><span className={`text-xs rounded-full border px-2 py-1 font-semibold ${riskClass(item.conflictRisk?.level)}`}>risque {item.conflictRisk?.level || 'basse'}</span><span className="text-xs rounded-full bg-card border border-line px-2 py-1 text-slate">{item.status}</span></div>)}</div> : <div className="rounded-xl bg-positive border border-positive p-4 flex gap-3"><CheckCircle size={18} className="text-positive shrink-0" /><div><p className="text-sm font-semibold text-earth">Aucune action en attente</p><p className="text-xs text-slate">Tout est à jour.</p></div></div>}</div>
  </div>;
}
