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
const moduleLabels = { animaux: 'Animaux', avicole: 'Avicole', sante: 'Santé', finances: 'Finances', comptabilite: 'Comptabilité', investissements: 'Investissements', stock: 'Stocks', clients: 'Clients', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', cultures: 'Cultures', ventes: 'Ventes', documents: 'Documents', taches: 'Tâches', rapports: 'Rapports', equipements: 'Équipements', audit_logs: 'Audit logs', business_events: 'Événements métier', alertes_center: 'Alertes' };
const pendingSimulation = [{ id: 'OFF-001', module: 'animaux', action: 'création', label: 'Animal ajouté', status: 'prêt' }, { id: 'OFF-002', module: 'stock', action: 'sortie', label: 'Sortie aliment', status: 'à vérifier' }, { id: 'OFF-003', module: 'ventes', action: 'paiement', label: 'Paiement commande', status: 'à vérifier' }];
const estimateSize = (count) => `${Math.max(4, Math.ceil(Number(count || 0) * 2.4))} KB`;
const riskClass = (level) => level === 'haute' ? 'bg-red-50 text-red-700 border-red-200' : level === 'moyenne' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
  const queue = arr(pendingItems).map((item) => ({ id: item.id, title: item.label || item.action || 'Action offline', description: `${moduleLabels[item.module] || item.module || 'sync'} · ${item.action || 'action'}`, status: item.status || 'en attente', created_at: safeCreatedAt(item), source: 'offline' }));
  const base = [{ id: 'sync-state', title: online ? 'Connexion active' : 'Mode hors ligne', description: online ? 'Synchronisation disponible' : 'Actions enregistrées localement', status: online ? 'ok' : 'warning', created_at: safeDate(lastOnlineAt)?.toISOString() || new Date().toISOString(), source: 'sync' }];
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

export default function Sync({ onRefreshAll, onFlushOffline, online = true, lastOnlineAt, dataMap = {} }) {
  const [syncing, setSyncing] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [localQueue, setLocalQueue] = useState(() => arr(readOfflineQueue()).map(normalizeQueueItem));
  const lastSync = dateLabel(lastOnlineAt) === '—' ? "Aujourd'hui" : dateLabel(lastOnlineAt);
  const syncModules = useMemo(() => Object.entries(moduleLabels).map(([key, label]) => { const records = Array.isArray(dataMap?.[key]) ? dataMap[key].length : 0; return { key, module: label, records, size: estimateSize(records) }; }), [dataMap]);
  const basePendingItems = localQueue.length ? localQueue.map(normalizeQueueItem) : (showSimulation || !online ? pendingSimulation.map((item) => normalizeQueueItem({ ...item, created_at: new Date().toISOString() })) : []);
  const pendingItems = safeEnrichOfflineQueue(basePendingItems);
  const highRiskCount = pendingItems.filter((item) => item.conflictRisk?.level === 'haute').length;
  const syncLogRows = useMemo(() => buildSyncLogRows({ pendingItems, dataMap, online, lastOnlineAt }), [pendingItems, dataMap, online, lastOnlineAt]);
  const timelineRows = syncLogRows.map((item) => ({ ...item, description: `${item.description || ''} · ${item.source || 'sync'}` }));

  const synchronize = async () => {
    try {
      setSyncing(true);
      if (online && localQueue.length) {
        const result = await onFlushOffline?.();
        toast.success(`${result?.processed || 0} action(s) synchronisée(s)`);
      }
      await onRefreshAll?.();
      setShowSimulation(false);
      setLocalQueue(arr(readOfflineQueue()).map(normalizeQueueItem));
      toast.success('Synchronisation terminée');
    } catch (error) {
      toast.error(error.message || 'Synchronisation impossible');
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
    if (!window.confirm('Vider uniquement la file offline locale ? Les tables ERP et leurs données synchronisées ne seront pas supprimées.')) return;
    clearOfflineQueue();
    setLocalQueue([]);
    setShowSimulation(false);
    toast.success('File offline locale vidée');
  };

  return <div className="space-y-6"><SectionHeader title="Mode Offline & Synchronisation" sub="Données locales, sauvegarde, logs sync et contrôle des conflits. Ne supprime jamais les tables ERP." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={synchronize} disabled={syncing}>{syncing ? 'Sync...' : 'Synchroniser'}</Btn><Btn icon={Download} variant="outline" small onClick={downloadBackup}>Backup</Btn><Btn icon={Trash2} variant="outline" small onClick={clearLocalQueue}>Vider file offline</Btn></>} />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><KpiCard icon={Wifi} label="Réseau" value={online ? 'Connecté' : 'Hors ligne'} sub={online ? 'À jour' : 'Local'} color={online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} /><KpiCard icon={Cloud} label="Dernière sync" value={lastSync} sub="Dernier passage" color="bg-sky-500/20 text-sky-400" /><KpiCard icon={Database} label="En attente" value={pendingItems.length} sub="À synchroniser" color={pendingItems.length ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'} /><KpiCard icon={History} label="Logs visibles" value={syncLogRows.length} sub="sync + audit + événements" color="bg-purple-500/20 text-purple-400" /></div>
    {highRiskCount ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={16} className="inline" /> {highRiskCount} action(s) offline à risque élevé. Vérifier avant synchronisation.</div> : null}
    <ModuleTimeline title="Timeline synchronisation" subtitle="Réseau, actions locales, audit logs, événements métier et conflits détectés." rows={timelineRows} onRefresh={synchronize} navigateLabel="Synchroniser" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-center justify-between mb-4 gap-3"><div><p className="font-semibold text-[#2f2415]">Modules synchronisés</p><p className="text-xs text-[#8a7456]">Volume local par module.</p></div><Btn variant="outline" small icon={RefreshCw} onClick={synchronize}>Actualiser</Btn></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{syncModules.map((m) => <div key={m.key} className="flex items-center gap-3 p-3 bg-[#fffdf8] rounded-xl border border-[#d6c3a0]"><CheckCircle size={16} className="text-emerald-400 shrink-0" /><span className="flex-1 text-sm text-[#2f2415]">{m.module}</span><span className="text-xs text-[#8a7456]">{m.records} fiches</span><span className="text-xs text-[#b39b78]">{m.size}</span></div>)}</div></div><div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" />Contrôle offline</p><div className="space-y-3 text-sm text-[#7d6a4a]"><p>File offline locale sécurisée.</p><p>Le bouton “Vider file offline” supprime uniquement les actions locales en attente.</p><p>Il ne supprime ni tables, ni données ERP synchronisées.</p></div><button type="button" onClick={() => { setShowSimulation((value) => !value); toast.success('Simulation mise à jour'); }} className="mt-4 w-full rounded-xl bg-[#fffdf8] border border-[#d6c3a0] px-3 py-2 text-sm text-[#2f2415] hover:border-[#c9a96a]">{showSimulation ? 'Masquer simulation' : 'Simuler hors ligne'}</button></div></div>
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Journal Sync / Audit</p>{syncLogRows.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Date</th><th className="py-2 px-3">Source</th><th className="py-2 px-3">Action</th><th className="py-2 px-3">Détail</th><th className="py-2 px-3">Statut</th></tr></thead><tbody>{syncLogRows.map((row) => <tr key={`${row.source}-${row.id}`} className="border-b border-[#f0e5d0]"><td className="py-2 px-3">{dateLabel(row.created_at)}</td><td className="py-2 px-3"><span className="rounded-full bg-[#fffdf8] border border-[#eadcc2] px-2 py-1 text-xs font-bold text-[#8a7456]">{row.source}</span></td><td className="py-2 px-3 font-bold text-[#2f2415]">{row.title}</td><td className="py-2 px-3 text-[#8a7456]">{row.description}</td><td className="py-2 px-3">{row.status}</td></tr>)}</tbody></table></div> : <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex gap-3"><FileText size={18} className="text-emerald-500 shrink-0" /><div><p className="text-sm font-semibold text-[#2f2415]">Aucun log disponible</p><p className="text-xs text-[#7d6a4a]">Les prochains événements sync/audit apparaîtront ici.</p></div></div>}</div>
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Actions en attente</p>{pendingItems.length ? <div className="space-y-3">{pendingItems.map((item) => <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"><AlertTriangle size={16} className="text-amber-500 shrink-0" /><div className="flex-1"><p className="text-sm font-semibold text-[#2f2415]">{item.label}</p><p className="text-xs text-[#8a7456]">{moduleLabels[item.module] || item.module} - {item.action}</p><p className="text-xs text-[#8a7456] mt-1">{item.conflictRisk?.reason || 'Action locale en attente.'}</p></div><span className={`text-xs rounded-full border px-2 py-1 font-bold ${riskClass(item.conflictRisk?.level)}`}>risque {item.conflictRisk?.level || 'basse'}</span><span className="text-xs rounded-full bg-[#fffdf8] border border-[#d6c3a0] px-2 py-1 text-[#8a7456]">{item.status}</span></div>)}</div> : <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex gap-3"><CheckCircle size={18} className="text-emerald-500 shrink-0" /><div><p className="text-sm font-semibold text-[#2f2415]">Aucune action en attente</p><p className="text-xs text-[#7d6a4a]">Synchronisation à jour.</p></div></div>}</div>
  </div>;
}
