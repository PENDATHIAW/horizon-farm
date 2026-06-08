import { AlertTriangle, Bell, Bot, CheckCircle, Droplets, LogOut, MapPin, Menu, Search, Settings, Thermometer, UserCog, Wifi, WifiOff, Wind, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import GlobalFarmControl from '../components/GlobalFarmControl';
import GlobalPeriodControl from '../components/GlobalPeriodControl';
import SettingsPanel from '../components/SettingsPanel';
import VoiceSearch from '../components/VoiceSearch';
import { searchERP } from '../services/globalSearchService';
import { applyUiSettingsToDocument, readUiSettings } from '../utils/uiPreferences';

const dangerStatuses = ['retard', 'critique', 'urgent', 'impaye', 'partiel', 'malade', 'panne', 'hors_service'];
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isRisky = (value) => dangerStatuses.some((status) => normalize(value).includes(status));
const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const safeRows = (value) => Array.isArray(value) ? value : [];
const safeWeather = (value = {}) => ({ temp: value?.temp ?? '-', apparentTemp: value?.apparentTemp ?? value?.temp ?? '-', condition: value?.condition || 'météo', humidite: value?.humidite ?? '-', humidity: value?.humidity ?? value?.humidite ?? '-', wind: value?.wind ?? value?.vent ?? '-', riskLevel: value?.riskLevel || 'stable', impact: value?.impact || '', ...value });
const formatDateTime = () => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date());

const NAV_GROUPS = [
  { key: 'pilotage', label: 'Pilotage', ids: ['dashboard', 'assistant_erp', 'centre_ia', 'objectifs_croissance', 'investisseurs_forums'] },
  { key: 'production', label: 'Production', ids: ['elevage', 'cultures'] },
  { key: 'commerce', label: 'Commerce', ids: ['commercial', 'achats_stock'] },
  { key: 'finance', label: 'Finance', ids: ['finance_pilotage'] },
  { key: 'suivi', label: 'Suivi', ids: ['activite_suivi', 'documents_rapports'] },
  { key: 'ressources', label: 'Ressources', ids: ['rh', 'equipements', 'smartfarm'] },
  { key: 'administration', label: 'Administration', ids: ['sync', 'sync_activity', 'audit_logs', 'gestion_systeme'] },
];

function collapseNavItems(navItems = []) {
  const opsIds = new Set(['rh', 'equipements', 'smartfarm']);
  const opsItems = navItems.filter((item) => opsIds.has(item.id));
  const collapsed = navItems.filter((item) => !['equipements', 'smartfarm'].includes(item.id));
  return collapsed.map((item) => {
    if (item.id === 'centre_ia') return { ...item, label: 'Centre décisionnel' };
    if (item.id === 'rh') return { ...item, label: 'Opérations & Ressources', icon: UserCog, hasAlert: opsItems.some((entry) => entry.hasAlert) };
    return item;
  });
}
function getNavGroupKey(item = {}) {
  const text = normalize(`${item.id || ''} ${item.label || ''}`);
  const explicit = NAV_GROUPS.find((group) => group.ids.some((id) => text.includes(normalize(id))));
  return explicit?.key || 'autres';
}
function buildNavGroups(navItems = []) {
  const map = new Map([...NAV_GROUPS.map((group) => [group.key, { ...group, items: [] }]), ['autres', { key: 'autres', label: 'Autres', ids: [], items: [] }]]);
  navItems.forEach((item) => (map.get(getNavGroupKey(item)) || map.get('autres')).items.push(item));
  return [...map.values()].filter((group) => group.items.length);
}
function buildAlerts(dataMap = {}, online = true, meteo = {}) {
  const stock = safeRows(dataMap.stock).filter((item) => Number(item.quantite || 0) <= Number(item.seuil || 0)).map((item) => ({ id: `stock-${item.id}`, type: 'Stock critique', text: `${item.produit || item.name || item.nom || 'Produit'}: ${item.quantite}/${item.seuil}`, moduleKey: 'achats_stock', severity: 'danger' }));
  const sante = safeRows(dataMap.sante).filter((item) => item.statut === 'retard' || isRisky(item.status || item.statut)).map((item) => ({ id: `sante-${item.id}`, type: 'Santé à traiter', text: item.nom || item.title || 'Suivi santé', moduleKey: 'elevage', severity: 'danger' }));
  const animaux = safeRows(dataMap.animaux).filter((item) => item.health_status === 'malade' || isRisky(item.health_status || item.status || item.statut)).map((item) => ({ id: `animal-${item.id}`, type: 'Animal à surveiller', text: `${item.name || item.nom || item.id}`, moduleKey: 'elevage', severity: 'danger' }));
  const finances = safeRows(dataMap.finances).filter((item) => ['impaye', 'partiel'].includes(item.statut) || isRisky(item.statut)).map((item) => ({ id: `finance-${item.id}`, type: 'Finance à vérifier', text: `${item.libelle || item.title || 'Transaction'}: ${item.montant || 0} FCFA`, moduleKey: 'finance_pilotage', severity: 'amber' }));
  const meteoAlert = meteo?.riskLevel && meteo.riskLevel !== 'stable' ? [{ id: 'meteo-risk', type: 'Météo / terrain', text: meteo.impact || 'Vérifier abreuvement, ventilation et parcelles.', moduleKey: 'dashboard', severity: 'amber' }] : [];
  const offline = online ? [] : [{ id: 'offline', type: 'Connexion', text: 'Mode hors ligne actif', moduleKey: 'sync_activity', severity: 'amber' }];
  return [...offline, ...meteoAlert, ...sante, ...stock, ...animaux, ...finances].slice(0, 18);
}
function HeaderPill({ icon: Icon, children }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d1e5d1] bg-[#f8fcf8] px-3 py-1.5 text-xs font-bold text-[#052e16]"><Icon size={13} aria-hidden="true" />{children}</span>;
}

export default function AppLayout({ navItems = [], active = 'dashboard', setActive, onNavigate, sidebarOpen = true, setSidebarOpen, online = true, meteo, weather, weatherLoading, weatherSource, notifs = 0, user, onSignOut, signOut, dataMap = {}, onOpenAssistant, periodScope, onPeriodScopeChange, farmScope, accessibleFarms = [], onFarmScopeChange, activeFarm, onManageFarms, children }) {
  const navigateTo = setActive || onNavigate || (() => {});
  const signOutAction = onSignOut || signOut || (() => {});
  const currentWeather = safeWeather(meteo || weather);
  const displayUser = user?.user_metadata?.login || user?.email?.split('@')[0] || 'Administrateur';
  const farmLocation = activeFarm?.name || activeFarm?.location || currentWeather.location || currentWeather.localisation || currentWeather.city || currentWeather.place || currentWeather.nom_ferme || 'Horizon Farm';
  const currentDateTime = useMemo(formatDateTime, []);
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionIntent, setActionIntent] = useState(null);
  const [uiSettings, setUiSettings] = useState(readUiSettings);
  const displayNavItems = useMemo(() => collapseNavItems(navItems), [navItems]);
  const results = useMemo(() => searchERP(dataMap || {}, globalSearch).slice(0, mobileSearchOpen ? 10 : 6), [dataMap, globalSearch, mobileSearchOpen]);
  const alerts = useMemo(() => buildAlerts(dataMap, online, currentWeather), [dataMap, online, currentWeather]);
  const activeLabel = displayNavItems.find((item) => item.id === active)?.label || 'Horizon Farm';
  const groupedNavItems = useMemo(() => buildNavGroups(displayNavItems), [displayNavItems]);
  const mobileNavItems = displayNavItems.filter((item) => ['dashboard', 'elevage', 'commercial', 'finance_pilotage'].includes(item.id)).slice(0, 4);

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings);
    const handler = (event) => setUiSettings(event.detail || readUiSettings());
    window.addEventListener('horizon-farm-ui-settings-changed', handler);
    window.addEventListener('horizon-farm-data-mode-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-ui-settings-changed', handler);
      window.removeEventListener('horizon-farm-data-mode-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [uiSettings]);

  useEffect(() => {
    const handler = (event) => setActionIntent(event.detail || { action: 'Action' });
    window.addEventListener('horizon-ui-intent', handler);
    return () => window.removeEventListener('horizon-ui-intent', handler);
  }, []);

  const navigate = (moduleKey) => {
    navigateTo(moduleKey);
    if (isMobileViewport()) setSidebarOpen?.(false);
    setNotificationsOpen(false);
    setSettingsOpen(false);
    setMobileSearchOpen(false);
  };
  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    return <button key={item.id} type="button" onClick={() => navigate(item.id)} title={!sidebarOpen ? item.label : undefined} aria-label={item.label} className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl transition-all group relative ${isActive ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#6b8a6b] hover:bg-[#dcfce7] hover:text-[#052e16]'}`}>
      <Icon size={19} className="shrink-0" aria-hidden="true" />
      {sidebarOpen ? <span className="text-sm font-medium truncate">{item.label}</span> : null}
      {item.hasAlert ? <span className={`w-2 h-2 rounded-full bg-red-500 shrink-0 ${sidebarOpen ? 'ml-auto' : 'absolute top-1 right-1'}`} /> : null}
    </button>;
  };

  return <div className="h-screen bg-[#f6faf6] text-[#052e16] overflow-hidden" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
    {sidebarOpen ? <button type="button" aria-label="Fermer le menu" onClick={() => setSidebarOpen?.(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" /> : null}
    <div className="flex h-full overflow-hidden">
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarOpen ? 'md:w-64' : 'md:w-16'} fixed md:relative inset-y-0 left-0 z-40 w-[82vw] max-w-80 shrink-0 bg-[#ffffff] border-r border-[#dcfce7] flex flex-col transition-all duration-300 overflow-hidden shadow-2xl md:shadow-none`}>
        <div className="flex items-center gap-3 px-3 py-4 border-b border-[#dcfce7]"><BrandLogo variant={sidebarOpen ? 'sidebar' : 'compact'} showText={sidebarOpen} /><button type="button" aria-label={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'} onClick={() => setSidebarOpen?.(!sidebarOpen)} className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#6b8a6b] hover:text-[#052e16] hover:bg-[#dcfce7] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#22c55e]/30">{sidebarOpen ? <X size={16} /> : <Menu size={16} />}</button></div>
        <nav className="flex-1 py-4 overflow-y-auto space-y-4 px-2" aria-label="Navigation principale">{groupedNavItems.map((group) => <div key={group.key} className="space-y-1">{sidebarOpen ? <p className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8a6b]">{group.label}</p> : <div className="mx-2 my-2 border-t border-[#e8f3e8]" />}{group.items.map(renderNavItem)}</div>)}</nav>
        <div className="p-3 border-t border-[#dcfce7] space-y-2"><div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${online ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>{online ? <Wifi size={14} className="text-emerald-500 shrink-0" /> : <WifiOff size={14} className="text-red-500 shrink-0" />}{sidebarOpen ? <span className={`text-xs font-medium ${online ? 'text-emerald-600' : 'text-red-500'}`}>{online ? 'Connecté' : 'Hors ligne'}</span> : null}</div>{sidebarOpen ? <button type="button" onClick={signOutAction} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#dcfce7] cursor-pointer hover:bg-[#d1e5d1] transition-colors text-left"><div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-600 font-bold text-xs">{displayUser.slice(0, 1).toUpperCase()}</div><div className="flex-1 min-w-0"><div className="text-xs text-[#052e16] font-semibold truncate">{displayUser}</div></div><LogOut size={12} className="text-[#6b8a6b]" /></button> : null}</div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="min-h-[72px] bg-[#ffffff] border-b border-[#dcfce7] flex items-center px-3 md:px-6 gap-2 md:gap-3 shrink-0 relative"><button type="button" aria-label="Ouvrir le menu" onClick={() => setSidebarOpen?.(true)} className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#dcfce7] text-[#6b8a6b]"><Menu size={20} /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#052e16] sm:text-base">Bonjour {displayUser}</p><p className="truncate text-[11px] font-medium capitalize text-[#6b8a6b] sm:text-xs">{currentDateTime}</p></div><div className="hidden xl:flex items-center gap-2"><HeaderPill icon={MapPin}>{farmLocation}</HeaderPill><HeaderPill icon={Thermometer}>{weatherLoading ? 'Météo...' : `${currentWeather.temp}°C`}</HeaderPill><HeaderPill icon={Droplets}>{currentWeather.humidity}%</HeaderPill><HeaderPill icon={Wind}>{currentWeather.wind === '-' ? currentWeather.condition : `${currentWeather.wind} km/h`}</HeaderPill><HeaderPill icon={online ? Wifi : WifiOff}>{online ? 'En ligne' : 'Hors ligne'}</HeaderPill></div><div className="hidden lg:block relative w-full max-w-sm"><VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Recherche" />{results.length > 0 ? <div className="absolute top-12 left-0 right-0 z-40 bg-white border border-[#d1e5d1] rounded-xl shadow-2xl overflow-hidden">{results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-[#dcfce7]"><div className="text-xs font-black text-[#052e16]">{result.title}</div><div className="text-[11px] text-[#6b8a6b]">{result.moduleKey} · {result.subtitle}</div></button>)}</div> : null}</div><div className="flex items-center gap-1 md:gap-2"><button type="button" aria-label="Rechercher dans l’ERP" onClick={() => { setMobileSearchOpen(true); setNotificationsOpen(false); setSettingsOpen(false); }} className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#dcfce7] text-[#6b8a6b]"><Search size={18} /></button><button type="button" aria-label="Ouvrir les notifications" onClick={() => { setNotificationsOpen((value) => !value); setSettingsOpen(false); setMobileSearchOpen(false); }} className="relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#dcfce7] text-[#6b8a6b]"><Bell size={18} />{notifs > 0 ? <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{notifs > 99 ? '99+' : notifs}</span> : null}</button><button type="button" aria-label="Ouvrir Hey Horizon" title="Hey Horizon" onClick={onOpenAssistant} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#dcfce7] text-emerald-600 hover:text-emerald-700"><Bot size={18} /></button><button type="button" aria-label="Ouvrir les paramètres" onClick={() => { setSettingsOpen((value) => !value); setNotificationsOpen(false); setMobileSearchOpen(false); }} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[#dcfce7] text-[#6b8a6b]"><Settings size={18} /></button></div>{mobileSearchOpen ? <div className="fixed inset-0 z-50 bg-black/30 lg:hidden"><div className="absolute inset-x-3 top-3 rounded-3xl border border-[#d1e5d1] bg-white p-4 shadow-2xl"><div className="flex items-center justify-between gap-3 mb-3"><p className="text-sm font-black text-[#052e16]">Recherche</p><button type="button" onClick={() => setMobileSearchOpen(false)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#6b8a6b] hover:bg-[#dcfce7]"><X size={18} /></button></div><VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Rechercher dans Horizon Farm" /></div></div> : null}{notificationsOpen ? <div className="absolute right-2 md:right-16 top-[72px] z-50 w-[min(94vw,420px)] bg-white border border-[#d1e5d1] rounded-2xl shadow-2xl p-4"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-bold text-[#052e16]">Notifications</p><p className="text-xs text-[#6b8a6b]">{alerts.length} alerte(s)</p></div><button type="button" onClick={() => setNotificationsOpen(false)} className="text-[#6b8a6b] hover:text-[#052e16]"><X size={16} /></button></div><div className="space-y-2 max-h-[60vh] overflow-y-auto">{alerts.length > 0 ? alerts.map((alert) => <button key={alert.id} type="button" onClick={() => navigate(alert.moduleKey)} className={`w-full text-left rounded-xl border p-3 transition-all ${alert.severity === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}><div className="flex gap-2"><AlertTriangle size={15} className={alert.severity === 'danger' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} /><div><p className="text-xs font-bold text-[#052e16]">{alert.type}</p><p className="text-xs text-[#6b8a6b] mt-0.5">{alert.text}</p></div></div></button>) : <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2"><CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-[#052e16]">Aucune alerte</p><p className="text-xs text-[#6b8a6b]">Tout est à jour.</p></div></div>}</div></div> : null}<SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} displayUser={displayUser} online={online} meteo={currentWeather} weatherSource={weatherSource} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setActive={navigateTo} onSignOut={signOutAction} /></header>
        <GlobalFarmControl farmScope={farmScope} accessibleFarms={accessibleFarms} onChange={onFarmScopeChange} user={user} activeFarm={activeFarm} onManageFarms={onManageFarms} />
        <GlobalPeriodControl periodScope={periodScope} onChange={onPeriodScopeChange} />
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6">{children}</div>
      </main>
    </div>
    {actionIntent ? <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 p-3 sm:items-center"><div className="w-full max-w-lg rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Action ERP</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">{actionIntent.action || 'Action à préparer'}</h2><p className="mt-2 text-sm text-[#8a7456]">Cette action doit ouvrir un vrai formulaire métier. Elle est signalée ici pour éviter les boutons silencieux pendant la consolidation. Le prochain correctif doit la brancher directement ou retirer le bouton.</p></div><button type="button" onClick={() => setActionIntent(null)} className="rounded-xl p-2 text-[#8a7456] hover:bg-[#fffdf8]"><X size={18} /></button></div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Module concerné : <b>{actionIntent.module || activeLabel}</b></div><button type="button" onClick={() => setActionIntent(null)} className="mt-4 w-full rounded-2xl bg-[#22c55e] px-4 py-3 text-sm font-black text-[#052e16]">Compris</button></div></div> : null}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#ffffff]/95 backdrop-blur border-t border-[#dcfce7] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-2xl"><div className="grid grid-cols-5 gap-1">{mobileNavItems.map((item) => { const Icon = item.icon; const isActive = active === item.id; return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`min-w-0 rounded-xl px-1 py-2 flex flex-col items-center gap-1 ${isActive ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#6b8a6b]'}`}><Icon size={18} /><span className="text-[10px] font-semibold truncate w-full text-center">{item.label.replace('Finance & Pilotage', 'Finance')}</span></button>; })}<button type="button" onClick={onOpenAssistant} aria-label="Ouvrir Hey Horizon" title="Hey Horizon" className="min-w-0 rounded-xl px-1 py-2 flex flex-col items-center gap-1 text-emerald-600 bg-emerald-500/10"><Bot size={18} /><span className="text-[10px] font-semibold truncate w-full text-center">Hey Horizon</span></button></div></nav>
  </div>;
}
