import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CheckCircle,
  CheckSquare,
  Home,
  Leaf,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import SettingsPanel from '../components/SettingsPanel';
import VoiceSearch from '../components/VoiceSearch';
import { searchERP } from '../services/globalSearchService';
import { applyUiSettingsToDocument, isDemoModeEnabled, readUiSettings } from '../utils/uiPreferences';

const dangerStatuses = ['retard', 'critique', 'urgent', 'impaye', 'partiel', 'malade', 'panne', 'hors_service'];
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isRisky = (value) => dangerStatuses.some((status) => normalize(value).includes(status));

const NAV_GROUPS = [
  { id: 'dashboard', label: 'Accueil', icon: Home, target: 'dashboard', matches: ['dashboard'], hint: 'Cockpit ferme' },
  { id: 'production', label: 'Production', icon: Leaf, target: 'animaux', matches: ['animaux', 'avicole', 'cultures', 'sante'], hint: 'Animaux · avicole · cultures' },
  { id: 'commerce', label: 'Commerce', icon: ShoppingCart, target: 'ventes', matches: ['ventes', 'clients', 'fournisseurs'], hint: 'Ventes · clients · fournisseurs' },
  { id: 'argent', label: 'Argent', icon: Wallet, target: 'finances', matches: ['finances', 'comptabilite', 'documents', 'investissements'], hint: 'Cash · dépenses · preuves' },
  { id: 'actions', label: 'Actions', icon: CheckSquare, target: 'taches', matches: ['taches', 'alertes'], hint: 'Alertes · tâches' },
  { id: 'graphiques', label: 'Graphiques', icon: BarChart3, target: 'rapports', matches: ['rapports', 'impact_business', 'centre_ia'], hint: 'Analyse simple' },
  { id: 'ferme', label: 'Ferme', icon: Package, target: 'stock', matches: ['stock', 'equipements', 'smartfarm', 'sync', 'sync_activity', 'audit_logs', 'gestion_systeme', 'rh', 'tracabilite'], hint: 'Stock · équipements' },
];

const GROUP_LABELS = NAV_GROUPS.reduce((acc, group) => {
  group.matches.forEach((key) => { acc[key] = group.label; });
  return acc;
}, {});

function countOpenAlerts(dataMap = {}) {
  return (dataMap.alertes_center || []).filter((a) => !['traitee', 'traitée', 'resolue', 'résolue'].includes(normalize(a.status || a.statut || 'nouvelle'))).length;
}

export default function AppLayout({
  active,
  setActive,
  sidebarOpen,
  setSidebarOpen,
  online,
  meteo,
  weatherLoading,
  weatherSource,
  notifs,
  user,
  onSignOut,
  dataMap,
  onOpenAssistant,
  children,
}) {
  const displayUser = user?.user_metadata?.login || user?.email?.split('@')[0] || 'Administrateur';
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(readUiSettings);
  const [demoMode, setDemoModeState] = useState(isDemoModeEnabled);
  const results = useMemo(() => searchERP(dataMap, globalSearch).slice(0, 6), [dataMap, globalSearch]);

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings);
    const handler = (event) => {
      setUiSettings(event.detail || readUiSettings());
      setDemoModeState(isDemoModeEnabled());
    };
    window.addEventListener('horizon-farm-ui-settings-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-ui-settings-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [uiSettings]);

  const navGroups = useMemo(() => {
    const stocksCritiques = (dataMap.stock || []).filter((s) => Number(s.quantite || 0) <= Number(s.seuil || 0)).length;
    const vaccinsRetard = (dataMap.sante || []).filter((v) => v.statut === 'retard' || isRisky(v.status || v.statut)).length;
    const animauxMalades = (dataMap.animaux || []).filter((a) => a.health_status === 'malade' || isRisky(a.health_status || a.status || a.statut)).length;
    const lotsAlerte = (dataMap.avicole || []).filter((lot) => Number(lot.mortality || 0) > Number(lot.initial_count || 0) * 0.04 || Number(lot.scoresSante || lot.score_sante || 100) < 88).length;
    const financesAlerte = (dataMap.finances || []).filter((trx) => ['impaye', 'partiel'].includes(trx.statut) || isRisky(trx.statut)).length;
    const tachesAlerte = (dataMap.taches || []).filter((t) => t.priority === 'critique' || t.status === 'retard' || isRisky(t.priority || t.status)).length;
    const alertesOuvertes = countOpenAlerts(dataMap);

    return NAV_GROUPS.map((group) => ({
      ...group,
      hasAlert:
        (group.id === 'production' && (vaccinsRetard > 0 || animauxMalades > 0 || lotsAlerte > 0)) ||
        (group.id === 'argent' && financesAlerte > 0) ||
        (group.id === 'actions' && (tachesAlerte > 0 || alertesOuvertes > 0)) ||
        (group.id === 'ferme' && (!online || stocksCritiques > 0)),
    }));
  }, [dataMap, online]);

  const alerts = useMemo(() => {
    const stocksCritiques = (dataMap.stock || [])
      .filter((item) => Number(item.quantite || 0) <= Number(item.seuil || 0))
      .map((item) => ({ id: `stock-${item.id}`, type: 'Stock faible', text: `${item.produit || item.name || item.nom || 'Produit'}: ${item.quantite}/${item.seuil} ${item.unite || ''}`.trim(), moduleKey: 'stock', severity: 'amber' }));
    const vaccinsRetard = (dataMap.sante || [])
      .filter((item) => item.statut === 'retard' || isRisky(item.status || item.statut))
      .map((item) => ({ id: `sante-${item.id}`, type: 'Soin à faire', text: `${item.nom || item.title || 'Suivi santé'} pour ${item.animal || item.lot || 'élément non précisé'}`, moduleKey: 'sante', severity: 'danger' }));
    const financesRisque = (dataMap.finances || [])
      .filter((item) => ['impaye', 'partiel'].includes(item.statut) || isRisky(item.statut))
      .map((item) => ({ id: `finance-${item.id}`, type: item.type === 'entree' ? 'À encaisser' : 'Paiement à vérifier', text: `${item.libelle || item.title || 'Transaction'}: ${item.montant || 0} FCFA`, moduleKey: 'finances', severity: 'amber' }));
    const tachesRisque = (dataMap.taches || [])
      .filter((item) => item.priority === 'critique' || item.status === 'retard' || isRisky(item.priority || item.status))
      .map((item) => ({ id: `tache-${item.id}`, type: 'Action terrain', text: `${item.title || item.name || item.id}: ${item.priority || item.status || 'urgent'}`, moduleKey: 'taches', severity: 'danger' }));
    const meteoRisque = meteo?.riskLevel && meteo.riskLevel !== 'stable'
      ? [{ id: 'meteo-risk', type: 'Météo / terrain', text: meteo.impact || 'Vérifier abreuvement, ventilation et parcelles.', moduleKey: 'dashboard', severity: 'amber' }]
      : [];
    const offline = online ? [] : [{ id: 'offline', type: 'Connexion', text: 'Mode hors ligne actif. La synchronisation reprendra au retour du réseau.', moduleKey: 'sync_activity', severity: 'amber' }];
    return [...offline, ...meteoRisque, ...financesRisque, ...vaccinsRetard, ...stocksCritiques, ...tachesRisque].slice(0, 8);
  }, [dataMap, online, meteo]);

  const activeGroup = navGroups.find((group) => group.matches.includes(active)) || navGroups[0];
  const activeLabel = GROUP_LABELS[active] || activeGroup?.label || 'Horizon Farm';
  const mobileNavItems = navGroups.filter((item) => ['dashboard', 'production', 'commerce', 'actions'].includes(item.id));

  const navigate = (moduleKey) => {
    setActive(moduleKey);
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setSettingsOpen(false);
  };

  return (
    <div className="h-screen bg-[#f7f3ea] text-[#23301f] overflow-hidden" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {sidebarOpen ? <button type="button" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" /> : null}

      <div className="flex h-full overflow-hidden">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarOpen ? 'md:w-72' : 'md:w-20'} fixed md:relative inset-y-0 left-0 z-40 w-[84vw] max-w-80 shrink-0 bg-[#103c2d] text-white flex flex-col transition-all duration-300 overflow-hidden shadow-2xl md:shadow-none`}>
          <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
            <BrandLogo variant={sidebarOpen ? 'sidebar' : 'compact'} showText={sidebarOpen} />
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-white/60 hover:text-white transition-colors" title={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'}>
              {sidebarOpen ? <X size={16} /> : <Menu size={18} />}
            </button>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto space-y-1 px-3">
            {navGroups.map((item) => {
              const isActive = item.matches.includes(active);
              return (
                <button key={item.id} type="button" onClick={() => navigate(item.target)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left relative ${isActive ? 'bg-white text-[#103c2d] shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon size={20} className="shrink-0" />
                  {sidebarOpen ? (
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black truncate">{item.label}</span>
                      <span className={`block text-[10px] truncate ${isActive ? 'text-[#5f7d70]' : 'text-white/45'}`}>{item.hint}</span>
                    </span>
                  ) : null}
                  {item.hasAlert ? <span className={`w-2 h-2 rounded-full bg-amber-400 shrink-0 ${sidebarOpen ? '' : 'absolute top-2 right-2'}`} /> : null}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${online ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
              {online ? <Wifi size={14} className="text-emerald-300 shrink-0" /> : <WifiOff size={14} className="text-red-300 shrink-0" />}
              {sidebarOpen ? <span className="text-xs font-bold text-white/80">{online ? 'Connecté' : 'Hors ligne'}</span> : null}
            </div>

            {sidebarOpen ? (
              <button type="button" onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-left">
                <div className="w-7 h-7 rounded-full bg-emerald-300/25 flex items-center justify-center text-emerald-100 font-black text-xs">{displayUser.slice(0, 1).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-bold truncate">{displayUser}</div>
                  <div className="text-[10px] text-white/45">Exploitant principal</div>
                </div>
                <LogOut size={13} className="text-white/45" />
              </button>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-16 bg-white border-b border-[#e7d9be] flex items-center px-3 md:px-6 gap-2 md:gap-4 shrink-0 relative">
            <button type="button" onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-[#f2eadb] text-[#526457]" title="Menu"><Menu size={20} /></button>
            <div className="min-w-0">
              <p className="text-[11px] text-[#8a7456] font-bold">Horizon Farm ERP</p>
              <p className="text-sm md:text-base font-black truncate">{activeLabel}</p>
            </div>

            <div className="hidden md:block flex-1 relative max-w-xl ml-2">
              <VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Chercher animal, client, facture, stock..." />
              {results.length > 0 ? (
                <div className="absolute top-12 left-0 right-0 z-40 bg-white border border-[#d6c3a0] rounded-2xl shadow-xl overflow-hidden">
                  {results.map((result) => (
                    <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-[#fffdf8] border-b border-[#d6c3a0]/60 last:border-b-0">
                      <div className="text-sm font-bold text-[#2f2415]">{result.title}</div>
                      <div className="text-xs text-[#8a7456]">{GROUP_LABELS[result.moduleKey] || result.moduleKey} · {result.subtitle}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-2">
              <div className={`hidden lg:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${demoMode ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{demoMode ? 'Démo' : 'ERP réel'} · {uiSettings.complexity === 'expert' ? 'Expert' : 'Simple'}</div>
              <div className="hidden xl:flex items-center gap-1.5 text-xs bg-[#f7f3ea] border border-[#e7d9be] rounded-full px-3 py-1.5 text-[#6f6046]">{weatherLoading ? 'Météo...' : `${meteo.temp}°C · ${meteo.condition || 'météo'}`}</div>
              <button type="button" onClick={() => { setNotificationsOpen((value) => !value); setSettingsOpen(false); }} className="relative p-2 rounded-xl hover:bg-[#f2eadb] transition-colors text-[#526457]" title="Notifications">
                <Bell size={18} />
                {notifs > 0 ? <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{notifs > 99 ? '99+' : notifs}</span> : null}
              </button>
              <button type="button" onClick={onOpenAssistant} className="p-2 rounded-xl hover:bg-[#f2eadb] transition-colors text-[#526457] hover:text-emerald-700" title="Assistant ERP"><Bot size={18} /></button>
              <button type="button" onClick={() => { setSettingsOpen((value) => !value); setNotificationsOpen(false); }} className="p-2 rounded-xl hover:bg-[#f2eadb] transition-colors text-[#526457]" title="Paramètres"><Settings size={18} /></button>
            </div>

            {notificationsOpen ? (
              <div className="absolute right-2 md:right-16 top-16 z-50 w-[min(94vw,420px)] bg-white border border-[#d6c3a0] rounded-3xl shadow-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div><p className="text-sm font-black text-[#2f2415]">À traiter</p><p className="text-xs text-[#8a7456]">{alerts.length} priorité(s) affichée(s)</p></div>
                  <button type="button" onClick={() => setNotificationsOpen(false)} className="text-[#8a7456] hover:text-[#2f2415]"><X size={16} /></button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {alerts.length > 0 ? alerts.map((alert) => (
                    <button key={alert.id} type="button" onClick={() => navigate(alert.moduleKey)} className={`w-full text-left rounded-2xl border p-3 transition-all ${alert.severity === 'danger' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex gap-2"><AlertTriangle size={15} className={alert.severity === 'danger' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} /><div><p className="text-xs font-black text-[#2f2415]">{alert.type}</p><p className="text-xs text-[#7d6a4a] mt-0.5">{alert.text}</p></div></div>
                    </button>
                  )) : (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex gap-2"><CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" /><div><p className="text-xs font-black text-[#2f2415]">Tout est calme</p><p className="text-xs text-[#7d6a4a]">Aucune priorité importante détectée.</p></div></div>
                  )}
                </div>
              </div>
            ) : null}

            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} displayUser={displayUser} online={online} meteo={meteo} weatherSource={weatherSource} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setActive={setActive} onSignOut={onSignOut} />
          </header>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6">{children}</div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[#e7d9be] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-2xl">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const isActive = item.matches.includes(active);
            return <button key={item.id} type="button" onClick={() => navigate(item.target)} className={`min-w-0 rounded-2xl px-1 py-2 flex flex-col items-center gap-1 ${isActive ? 'bg-[#103c2d] text-white' : 'text-[#667566]'}`}><item.icon size={18} /><span className="text-[10px] font-bold truncate w-full text-center">{item.label}</span></button>;
          })}
          <button type="button" onClick={onOpenAssistant} className="min-w-0 rounded-2xl px-1 py-2 flex flex-col items-center gap-1 text-emerald-700 bg-emerald-50"><Bot size={18} /><span className="text-[10px] font-bold truncate w-full text-center">Aide</span></button>
        </div>
      </nav>
    </div>
  );
}
