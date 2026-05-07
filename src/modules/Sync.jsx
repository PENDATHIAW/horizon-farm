import { AlertTriangle, CheckCircle, Cloud, Database, Download, RefreshCw, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { readOfflineQueue } from '../services/offlineQueueService';

const moduleLabels = {
  animaux: 'Animaux',
  avicole: 'Avicole',
  sante: 'Sante & Vaccins',
  finances: 'Finances',
  comptabilite: 'Comptabilite',
  investissements: 'Investissements',
  stock: 'Stocks',
  clients: 'Clients',
  fournisseurs: 'Fournisseurs',
  tracabilite: 'Tracabilite',
  cultures: 'Cultures',
  ventes: 'Ventes',
  documents: 'Documents',
  taches: 'Taches',
  rapports: 'Rapports',
  equipements: 'Equipements',
  audit_logs: 'Audit logs',
};

const pendingSimulation = [
  { id: 'OFF-001', module: 'animaux', action: 'creation', label: 'Creation animal terrain', status: 'pret_sync' },
  { id: 'OFF-002', module: 'stock', action: 'modification', label: 'Sortie aliment hors ligne', status: 'conflit_prevenu' },
  { id: 'OFF-003', module: 'taches', action: 'creation', label: 'Checklist nettoyage batiment', status: 'pret_sync' },
];

const estimateSize = (count) => `${Math.max(4, Math.ceil(count * 2.4))} KB`;

export default function Sync({ onRefreshAll, onFlushOffline, online = true, lastOnlineAt, dataMap = {} }) {
  const [syncing, setSyncing] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [localQueue, setLocalQueue] = useState(() => readOfflineQueue());

  const lastSync = lastOnlineAt
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(lastOnlineAt)
    : "Aujourd'hui";

  const syncModules = useMemo(
    () =>
      Object.entries(moduleLabels).map(([key, label]) => {
        const records = Array.isArray(dataMap[key]) ? dataMap[key].length : 0;
        return { key, module: label, records, size: estimateSize(records) };
      }),
    [dataMap]
  );

  const pendingItems = localQueue.length
    ? localQueue.map((item) => ({
        id: item.id,
        module: item.moduleKey,
        action: item.action,
        label: `${item.action} ${item.recordId}`,
        status: item.status || 'pending',
      }))
    : (showSimulation || !online ? pendingSimulation : []);

  const synchronize = async () => {
    try {
      setSyncing(true);
      if (online && localQueue.length) {
        const result = await onFlushOffline?.();
        toast.success(`${result?.processed || 0} action(s) offline synchronisee(s)`);
      }
      await onRefreshAll?.();
      setShowSimulation(false);
      setLocalQueue(readOfflineQueue());
      toast.success('Synchronisation Supabase terminee');
    } catch (error) {
      toast.error(error.message || 'Synchronisation impossible');
    } finally {
      setSyncing(false);
    }
  };

  const downloadBackup = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      source: 'Horizon Farm ERP',
      note: 'Backup local de verification. Supabase reste la source centrale.',
      data: dataMap,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horizon-farm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup JSON telecharge');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mode Offline & Synchronisation"
        sub="Multi-appareils - Supabase realtime - file offline terrain - prevention conflits"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={synchronize} disabled={syncing}>{syncing ? 'Sync...' : 'Synchroniser'}</Btn>
            <Btn icon={Download} variant="outline" small onClick={downloadBackup}>Backup</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={Wifi} label="Statut reseau" value={online ? 'Connecte' : 'Hors ligne'} sub={online ? 'Supabase actif' : 'Queue locale active'} color={online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} />
        <KpiCard icon={Cloud} label="Derniere sync" value={lastSync} sub="Dernier passage reseau" color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={Database} label="Donnees en attente" value={pendingItems.length} sub="A synchroniser au retour reseau" color={pendingItems.length ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'} />
        <KpiCard icon={Smartphone} label="Multi-appareils" value="Actif" sub="Mobile, tablette, ordinateur" color="bg-purple-500/20 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <p className="font-semibold text-[#2f2415]">Modules synchronises</p>
              <p className="text-xs text-[#8a7456]">Les chiffres viennent de l'etat React charge depuis Supabase.</p>
            </div>
            <Btn variant="outline" small icon={RefreshCw} onClick={synchronize}>Refresh global</Btn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {syncModules.map((m) => (
              <div key={m.key} className="flex items-center gap-3 p-3 bg-[#fffdf8] rounded-xl border border-[#d6c3a0]">
                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                <span className="flex-1 text-sm text-[#2f2415]">{m.module}</span>
                <span className="text-xs text-[#8a7456]">{m.records} lignes</span>
                <span className="text-xs text-[#b39b78]">{m.size}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" />Strategie offline terrain</p>
          <div className="space-y-3 text-sm text-[#7d6a4a]">
            <p>Supabase reste la source centrale: telephone, tablette et ordinateur voient les memes donnees apres sync.</p>
            <p>Les creations terrain peuvent etre mises en file locale, puis rejouees quand la connexion revient.</p>
            <p>Les conflits sont evites avec `updated_at`, audit logs et validation avant ecrasement.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSimulation((value) => !value);
              toast.success('Simulation offline mise a jour');
            }}
            className="mt-4 w-full rounded-xl bg-[#fffdf8] border border-[#d6c3a0] px-3 py-2 text-sm text-[#2f2415] hover:border-[#c9a96a]"
          >
            {showSimulation ? 'Masquer queue offline' : 'Simuler donnees hors ligne'}
          </button>
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4">File offline intelligente</p>
        {pendingItems.length ? (
          <div className="space-y-3">
            {pendingItems.map((item) => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#2f2415]">{item.label}</p>
                  <p className="text-xs text-[#8a7456]">{moduleLabels[item.module] || item.module} - {item.action}</p>
                </div>
                <span className="text-xs rounded-full bg-[#fffdf8] border border-[#d6c3a0] px-2 py-1 text-[#8a7456]">{item.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex gap-3">
            <CheckCircle size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#2f2415]">Aucune modification offline en attente</p>
              <p className="text-xs text-[#7d6a4a]">Les prochaines actions CRUD seront rafraichies depuis Supabase et historisees dans Audit Logs.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
