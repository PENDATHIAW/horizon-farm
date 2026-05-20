import { AlertTriangle, Bell, Bot, CheckCircle, LogOut, Menu, Search, Settings, Thermometer, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import SettingsPanel from '../components/SettingsPanel';
import VoiceSearch from '../components/VoiceSearch';
import { searchERP } from '../services/globalSearchService';
import { applyUiSettingsToDocument, isSimulatedDataModeEnabled, readUiSettings } from '../utils/uiPreferences';

const dangerStatuses = ['retard', 'critique', 'urgent', 'impaye', 'partiel', 'malade', 'panne', 'hors_service'];
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isRisky = (value) => dangerStatuses.some((status) => normalize(value).includes(status));
const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

export default function AppLayout({
  navItems,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(readUiSettings);
  const [simulatedMode, setSimulatedModeState] = useState(isSimulatedDataModeEnabled);
  const results = useMemo(() => searchERP(dataMap, globalSearch).slice(0, mobileSearchOpen ? 10 : 6), [dataMap, globalSearch, mobileSearchOpen]);

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings);
    const handler = (event) => {
      setUiSettings(event.detail || readUiSettings());
      setSimulatedModeState(isSimulatedDataModeEnabled());
    };
    window.addEventListener('horizon-farm-ui-settings-changed', handler);
    window.addEventListener('horizon-farm-data-mode-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-ui-settings-changed', handler);
      window.removeEventListener('horizon-farm-data-mode-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [uiSettings]);

  const alerts = useMemo(() => {
    const stocksCritiques = (dataMap.stock || [])
      .filter((item) => Number(item.quantite || 0) <= Number(item.seuil || 0))
      .map((item) => ({ id: `stock-${item.id}`, type: 'Stock critique', text: `${item.produit || item.name || item.nom || 'Produit'}: ${item.quantite}/${item.seuil} ${item.unite || ''}`.trim(), moduleKey: 'stock', severity: 'danger' }));
    const vaccinsRetard = (dataMap.sante || [])
      .filter((item) => item.statut === 'retard' || isRisky(item.status || item.statut))
      .map((item) => ({ id: `sante-${item.id}`, type: 'Santé à traiter', text: `${item.nom || item.title || 'Suivi santé'} pour ${item.animal || item.lot || 'élément non précisé'}`, moduleKey: 'sante', severity: 'danger' }));
    const animauxMalades = (dataMap.animaux || [])
      .filter((item) => item.health_status === 'malade' || isRisky(item.health_status || item.status || item.statut))
      .map((item) => ({ id: `animal-${item.id}`, type: 'Animal à surveiller', text: `${item.name || item.nom || item.id} (${item.type || 'type inconnu'})`, moduleKey: 'animaux', severity: 'danger' }));
    const lotsRisque = (dataMap.avicole || [])
      .filter((item) => Number(item.mortality || 0) > Number(item.initial_count || 0) * 0.04 || Number(item.scoresSante || item.score_sante || 100) < 88)
      .map((item) => ({ id: `lot-${item.id}`, type: 'Lot avicole en alerte', text: `${item.name || item.nom || item.id}: mortalité ${item.mortality || 0}, score santé ${item.scoresSante || item.score_sante || 0}%`, moduleKey: 'avicole', severity: 'danger' }));
    const culturesRisque = (dataMap.cultures || [])
      .filter((item) => Number(item.score_sante || 0) < 80 || item.statut === 'perdu')
      .map((item) => ({ id: `culture-${item.id}`, type: 'Culture à risque', text: `${item.nom || item.name || item.id}: score santé ${item.score_sante || 0}%`, moduleKey: 'cultures', severity: 'amber' }));
    const financesRisque = (dataMap.finances || [])
      .filter((item) => ['impaye', 'partiel'].includes(item.statut) || isRisky(item.statut))
      .map((item) => ({ id: `finance-${item.id}`, type: item.type === 'entree' ? 'Client impayé' : 'Paiement à vérifier', text: `${item.libelle || item.title || 'Transaction'}: ${item.montant || 0} FCFA (${item.statut || 'à vérifier'})`, moduleKey: 'finances', severity: 'amber' }));
    const fournisseursRisque = (dataMap.fournisseurs || [])
      .filter((item) => Number(item.dettes || 0) > 0 || item.statut === 'a_risque')
      .map((item) => ({ id: `fournisseur-${item.id}`, type: 'Fournisseur à surveiller', text: `${item.nom || item.name || item.id}: dette ${item.dettes || 0} FCFA, statut ${item.statut || 'actif'}`, moduleKey: 'fournisseurs', severity: 'amber' }));
    const equipementsRisque = (dataMap.equipements || [])
      .filter((item) => ['panne', 'maintenance', 'hors_service'].includes(item.status) || isRisky(item.status || item.statut))
      .map((item) => ({ id: `equipement-${item.id}`, type: 'Équipement à traiter', text: `${item.name || item.nom || item.id}: ${item.status || item.statut || 'à vérifier'}`, moduleKey: 'equipements', severity: item.status === 'panne' || item.status === 'hors_service' ? 'danger' : 'amber' }));
    const tachesRisque = (dataMap.taches || [])
      .filter((item) => item.priority === 'critique' || item.status === 'retard' || isRisky(item.priority || item.status))
      .map((item) => ({ id: `tache-${item.id}`, type: 'Tâche prioritaire', text: `${item.title || item.name || item.id}: ${item.priority || item.status || 'urgent'}`, moduleKey: 'taches', severity: 'danger' }));
    const meteoRisque = meteo?.riskLevel && meteo.riskLevel !== 'stable' ? [{ id: 'meteo-risk', type: 'Météo / terrain', text: meteo.impact || 'Vérifier abreuvement, ventilation et parcelles.', moduleKey: 'dashboard', severity: 'amber' }] : [];
    const offline = online ? [] : [{ id: 'offline', type: 'Connexion', text: 'Mode hors ligne actif - la synchronisation reprendra au retour du réseau', moduleKey: 'sync', severity: 'amber' }];
    return [...offline, ...meteoRisque, ...vaccinsRetard, ...stocksCritiques, ...animauxMalades, ...lotsRisque, ...culturesRisque, ...financesRisque, ...fournisseursRisque, ...equipementsRisque, ...tachesRisque].slice(0, 18);
  }, [dataMap, online, meteo]);

  const activeLabel = navItems.find((item) => item.id === active)?.label || 'Horizon Farm';
  const mobileNavItems = navItems.filter((item) => ['dashboard', 'impact_business', 'stock', 'ventes'].includes(item.id)).slice(0, 4);

  const navigate = (moduleKey) => {
    setActive(moduleKey);
    if (isMobileViewport()) setSidebarOpen(false);
    setNotificationsOpen(false);
    setSettingsOpen(false);
    setMobileSearchOpen(false);
  };

  const openMobileSearch = () => {
    setMobileSearchOpen(true);
    setNotificationsOpen(false);
    setSettingsOpen(false);
  };

  return (
    <div className="h-screen bg-[#f8f5ef] text-[#2f2415] overflow-hidden" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {sidebarOpen ? <button type="button" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" /> : null}
      <div className="flex h-full overflow-hidden">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarOpen ? 'md:w-64' : 'md:w-16'} fixed md:relative inset-y-0 left-0 z-40 w-[82vw] max-w-80 shrink-0 bg-[#fffdf8] border-r border-[#e7d9be] flex flex-col transition-all duration-300 overflow-hidden shadow-2xl md:shadow-none`}>
          <div className="flex items-center gap-3 px-3 py-4 border-b border-[#e7d9be]">
            <BrandLogo variant={sidebarOpen ? 'sidebar' : 'compact'} showText={sidebarOpen} />
            <button type="button" aria-label={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'} onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#b39b78] hover:text-[#2f2415] hover:bg-[#fff8e8] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30">{sidebarOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}</button>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = active === item.id;
              return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl transition-all group relative ${isActive ? 'bg-[#c9a96a] text-[#2f2415]' : 'text-[#8a7456] hover:bg-[#e7d9be] hover:text-[#2f2415]'}`}>
                <item.icon size={19} className="shrink-0" aria-hidden="true" />
                {sidebarOpen ? <span className="text-sm font-medium truncate">{item.label}</span> : null}
                {item.hasAlert ? <span className={`w-2 h-2 rounded-full bg-red-500 shrink-0 ${sidebarOpen ? 'ml-auto' : 'absolute top-1 right-1'}`} /> : null}
              </button>;
            })}
          </nav>
          <div className="p-3 border-t border-[#e7d9be] space-y-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${online ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>{online ? <Wifi size={14} className="text-emerald-500 shrink-0" aria-hidden="true" /> : <WifiOff size={14} className="text-red-500 shrink-0" aria-hidden="true" />}{sidebarOpen ? <span className={`text-xs font-medium ${online ? 'text-emerald-600' : 'text-red-500'}`}>{online ? 'Connecté' : 'Hors ligne'}</span> : null}</div>
            {sidebarOpen ? <button type="button" onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e7d9be] cursor-pointer hover:bg-[#d6c3a0] transition-colors text-left"><div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-600 font-bold text-xs">A</div><div className="flex-1 min-w-0"><div className="text-xs text-[#2f2415] font-semibold truncate">{displayUser}</div><div className="text-[10px] text-[#b39b78]">Exploitant principal</div></div><LogOut size={12} className="text-[#b39b78]" aria-hidden="true" /></button> : null}
          </div>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-14 bg-[#fffdf8] border-b border-[#e7d9be] flex items-center px-3 md:px-6 gap-2 md:gap-3 shrink-0 relative">
            <button type="button" aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#e7d9be] text-[#8a7456] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30"><Menu size={20} aria-hidden="true" /></button>
            <div className="hidden sm:block flex-1 relative max-w-md">
              <VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Recherche globale ERP..." />
              {results.length > 0 ? <div className="absolute top-12 left-0 right-0 z-40 bg-[#ffffff] border border-[#d6c3a0] rounded-xl shadow-xl overflow-hidden">{results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-[#fffdf8] border-b border-[#d6c3a0]/60 last:border-b-0"><div className="text-sm font-semibold text-[#2f2415]">{result.title}</div><div className="text-xs text-[#8a7456]">{result.moduleKey} - {result.subtitle}</div></button>)}</div> : null}
            </div>
            <div className="sm:hidden flex-1 min-w-0"><p className="text-sm font-bold truncate">{activeLabel}</p><p className="text-[11px] text-[#8a7456] truncate">Horizon Farm ERP</p></div>
            <div className="ml-auto flex items-center gap-1 md:gap-3">
              <button type="button" aria-label="Rechercher dans l’ERP" onClick={openMobileSearch} className="sm:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#e7d9be] transition-colors text-[#8a7456] hover:text-[#2f2415] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30"><Search size={18} aria-hidden="true" /></button>
              <div className={`hidden lg:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-black ${simulatedMode ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{simulatedMode ? 'Données simulées' : 'Données réelles'} · {uiSettings.complexity === 'expert' ? 'Détaillé' : 'Simple'}</div>
              <div className="hidden lg:flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-500"><Thermometer size={12} aria-hidden="true" />{weatherLoading ? 'Météo...' : `${meteo.temp}°C ress. ${meteo.apparentTemp ?? meteo.temp}°C - ${meteo.condition || 'météo'} - ${meteo.humidite}%`}</div>
              <button type="button" aria-label="Ouvrir les notifications" onClick={() => { setNotificationsOpen((value) => !value); setSettingsOpen(false); setMobileSearchOpen(false); }} className="relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#e7d9be] transition-colors text-[#8a7456] hover:text-[#2f2415] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30" title="Notifications"><Bell size={18} aria-hidden="true" />{notifs > 0 ? <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{notifs > 99 ? '99+' : notifs}</span> : null}</button>
              <button type="button" aria-label="Ouvrir l’assistant ERP" onClick={onOpenAssistant} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#e7d9be] transition-colors text-[#8a7456] hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25" title="Assistant ERP"><Bot size={18} aria-hidden="true" /></button>
              <button type="button" aria-label="Ouvrir les paramètres" onClick={() => { setSettingsOpen((value) => !value); setNotificationsOpen(false); setMobileSearchOpen(false); }} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#e7d9be] transition-colors text-[#8a7456] hover:text-[#2f2415] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30" title="Paramètres"><Settings size={18} aria-hidden="true" /></button>
            </div>
            {mobileSearchOpen ? <div className="fixed inset-0 z-50 bg-black/30 sm:hidden"><div className="absolute inset-x-3 top-3 rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-2xl"><div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-sm font-black text-[#2f2415]">Recherche globale</p><p className="text-xs text-[#8a7456]">Retrouver une vente, un lot, un animal, une tâche…</p></div><button type="button" aria-label="Fermer la recherche" onClick={() => setMobileSearchOpen(false)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#8a7456] hover:bg-[#fff8e8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30"><X size={18} aria-hidden="true" /></button></div><VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Rechercher dans Horizon Farm..." /> <div className="mt-3 max-h-[65vh] overflow-y-auto space-y-2">{globalSearch.trim() && results.length > 0 ? results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full text-left rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-3"><div className="text-sm font-black text-[#2f2415]">{result.title}</div><div className="mt-1 text-xs text-[#8a7456]">{result.moduleKey} · {result.subtitle}</div></button>) : null}{globalSearch.trim() && results.length === 0 ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-8 text-center text-sm text-[#8a7456]">Aucun résultat trouvé.</div> : null}{!globalSearch.trim() ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-8 text-center text-sm text-[#8a7456]">Tape un mot-clé ou utilise la dictée vocale.</div> : null}</div></div></div> : null}
            {notificationsOpen ? <div className="absolute right-2 md:right-16 top-14 z-50 w-[min(94vw,420px)] bg-[#ffffff] border border-[#d6c3a0] rounded-2xl shadow-2xl p-4"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-bold text-[#2f2415]">Centre de notifications</p><p className="text-xs text-[#8a7456]">{alerts.length} alerte(s) métier active(s)</p></div><button type="button" aria-label="Fermer les notifications" onClick={() => setNotificationsOpen(false)} className="text-[#8a7456] hover:text-[#2f2415]"><X size={16} aria-hidden="true" /></button></div><div className="space-y-2 max-h-[60vh] overflow-y-auto">{alerts.length > 0 ? alerts.map((alert) => <button key={alert.id} type="button" onClick={() => navigate(alert.moduleKey)} className={`w-full text-left rounded-xl border p-3 transition-all ${alert.severity === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}><div className="flex gap-2"><AlertTriangle size={15} className={alert.severity === 'danger' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} aria-hidden="true" /><div><p className="text-xs font-bold text-[#2f2415]">{alert.type}</p><p className="text-xs text-[#7d6a4a] mt-0.5">{alert.text}</p></div></div></button>) : <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2"><CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" /><div><p className="text-xs font-bold text-[#2f2415]">Tout est calme</p><p className="text-xs text-[#7d6a4a]">Aucune alerte importante détectée.</p></div></div>}</div></div> : null}
            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} displayUser={displayUser} online={online} meteo={meteo} weatherSource={weatherSource} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setActive={setActive} onSignOut={onSignOut} />
          </header>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6">{children}</div>
        </main>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#fffdf8]/95 backdrop-blur border-t border-[#e7d9be] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-2xl"><div className="grid grid-cols-5 gap-1">{mobileNavItems.map((item) => { const isActive = active === item.id; return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`min-w-0 rounded-xl px-1 py-2 flex flex-col items-center gap-1 ${isActive ? 'bg-[#c9a96a] text-[#2f2415]' : 'text-[#8a7456]'}`}><item.icon size={18} aria-hidden="true" /><span className="text-[10px] font-semibold truncate w-full text-center">{item.label.replace('Impact Business', 'Décisions').replace('Impact & Valeur ERP', 'Décisions').replace('Impact & Valeur', 'Décisions')}</span></button>; })}<button type="button" onClick={onOpenAssistant} className="min-w-0 rounded-xl px-1 py-2 flex flex-col items-center gap-1 text-emerald-600 bg-emerald-500/10"><Bot size={18} aria-hidden="true" /><span className="text-[10px] font-semibold truncate w-full text-center">Assistant</span></button></div></nav>
    </div>
  );
}