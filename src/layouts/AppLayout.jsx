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
const safeWeather = (value = {}) => ({ temp: value?.temp ?? '-', apparentTemp: value?.apparentTemp ?? value?.temp ?? '-', condition: value?.condition || 'météo', humidite: value?.humidite ?? '-', riskLevel: value?.riskLevel || 'stable', impact: value?.impact || '', ...value });
const safeRows = (value) => Array.isArray(value) ? value : [];

const NAV_GROUPS = [
  { key: 'pilotage', label: 'Pilotage', ids: ['dashboard', 'assistant_erp', 'centre_ia', 'objectifs_croissance', 'graphiques', 'impact_business', 'rapports'] },
  { key: 'production', label: 'Production', ids: ['animaux', 'avicole', 'cultures', 'sante', 'equipements', 'smartfarm'] },
  { key: 'commerce', label: 'Commerce', ids: ['ventes', 'clients', 'fournisseurs'] },
  { key: 'finance', label: 'Finance', ids: ['finances', 'comptabilite', 'investissements'] },
  { key: 'ressources', label: 'Ressources', ids: ['stock', 'documents', 'taches', 'alertes', 'tracabilite', 'rh'] },
  { key: 'administration', label: 'Administration', ids: ['sync', 'sync_activity', 'audit_logs', 'gestion_systeme'] },
];
const DISPLAY_LABELS = {
  sales_orders: 'Ventes',
  sales_order_items: 'Ventes',
  deliveries: 'Ventes',
  invoices: 'Documents',
  payments: 'Finances',
  production_oeufs_logs: 'Avicole',
  alimentation_logs: 'Stock',
  alertes_center: 'Alertes',
  business_events: 'Activité',
  audit_logs: 'Activité',
  tracabilite: 'Activité',
  sync: 'Activité',
  sync_activity: 'Activité',
  sensor_devices: 'Smart Farm',
  camera_devices: 'Smart Farm',
  business_plans: 'Investissements',
  bp_investment_lines: 'Investissements',
  bp_recurring_costs: 'Investissements',
  bp_revenue_projections: 'Investissements',
  bp_funding_sources: 'Investissements',
  veterinaires: 'Santé',
  comptabilite: 'Finances',
};
function getNavGroupKey(item = {}) {
  const text = normalize(`${item.id || ''} ${item.label || ''}`);
  const explicit = NAV_GROUPS.find((group) => group.ids.some((id) => text.includes(normalize(id))));
  if (explicit) return explicit.key;
  return 'autres';
}
function buildNavGroups(navItems = []) {
  const map = new Map([...NAV_GROUPS.map((group) => [group.key, { ...group, items: [] }]), ['autres', { key: 'autres', label: 'Autres', ids: [], items: [] }]]);
  navItems.forEach((item) => (map.get(getNavGroupKey(item)) || map.get('autres')).items.push(item));
  return [...map.values()].filter((group) => group.items.length);
}
function buildAlerts(dataMap = {}, online = true, meteo = {}) {
  const stock = safeRows(dataMap.stock).filter((item) => Number(item.quantite || 0) <= Number(item.seuil || 0)).map((item) => ({ id: `stock-${item.id}`, type: 'Stock critique', text: `${item.produit || item.name || item.nom || 'Produit'}: ${item.quantite}/${item.seuil}`, moduleKey: 'stock', severity: 'danger' }));
  const sante = safeRows(dataMap.sante).filter((item) => item.statut === 'retard' || isRisky(item.status || item.statut)).map((item) => ({ id: `sante-${item.id}`, type: 'Santé à traiter', text: item.nom || item.title || 'Suivi santé', moduleKey: 'sante', severity: 'danger' }));
  const animaux = safeRows(dataMap.animaux).filter((item) => item.health_status === 'malade' || isRisky(item.health_status || item.status || item.statut)).map((item) => ({ id: `animal-${item.id}`, type: 'Animal à surveiller', text: `${item.name || item.nom || item.id}`, moduleKey: 'animaux', severity: 'danger' }));
  const finances = safeRows(dataMap.finances).filter((item) => ['impaye', 'partiel'].includes(item.statut) || isRisky(item.statut)).map((item) => ({ id: `finance-${item.id}`, type: 'Finance à vérifier', text: `${item.libelle || item.title || 'Transaction'}: ${item.montant || 0} FCFA`, moduleKey: 'finances', severity: 'amber' }));
  const meteoAlert = meteo?.riskLevel && meteo.riskLevel !== 'stable' ? [{ id: 'meteo-risk', type: 'Météo / terrain', text: meteo.impact || 'Vérifier abreuvement, ventilation et parcelles.', moduleKey: 'dashboard', severity: 'amber' }] : [];
  const offline = online ? [] : [{ id: 'offline', type: 'Connexion', text: 'Mode hors ligne actif', moduleKey: 'sync_activity', severity: 'amber' }];
  return [...offline, ...meteoAlert, ...sante, ...stock, ...animaux, ...finances].slice(0, 18);
}

export default function AppLayout({
  navItems = [],
  active = 'dashboard',
  setActive,
  onNavigate,
  sidebarOpen = true,
  setSidebarOpen,
  online = true,
  meteo,
  weather,
  weatherLoading,
  weatherSource,
  notifs = 0,
  user,
  onSignOut,
  signOut,
  dataMap = {},
  onOpenAssistant,
  children,
}) {
  const navigateTo = setActive || onNavigate || (() => {});
  const signOutAction = onSignOut || signOut || (() => {});
  const currentWeather = safeWeather(meteo || weather);
  const displayUser = user?.user_metadata?.login || user?.email?.split('@')[0] || 'Administrateur';
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(readUiSettings);
  const [simulatedMode, setSimulatedModeState] = useState(isSimulatedDataModeEnabled);
  const results = useMemo(() => searchERP(dataMap || {}, globalSearch).slice(0, mobileSearchOpen ? 10 : 6), [dataMap, globalSearch, mobileSearchOpen]);
  const alerts = useMemo(() => buildAlerts(dataMap, online, currentWeather), [dataMap, online, currentWeather]);
  const activeLabel = navItems.find((item) => item.id === active)?.label || 'Horizon Farm';
  const labelByModule = useMemo(() => new Map(navItems.map((item) => [item.id, item.label])), [navItems]);
  const moduleLabel = (moduleKey = '') => labelByModule.get(moduleKey) || DISPLAY_LABELS[moduleKey] || moduleKey.replace(/_/g, ' ');
  const groupedNavItems = useMemo(() => buildNavGroups(navItems), [navItems]);
  const mobileNavItems = navItems.filter((item) => ['dashboard', 'graphiques', 'stock', 'ventes'].includes(item.id)).slice(0, 4);

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
    return <button key={item.id} type="button" onClick={() => navigate(item.id)} title={!sidebarOpen ? item.label : undefined} aria-label={item.label} className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl transition-all group relative ${isActive ? 'bg-[var(--hf-hero)] text-white' : 'text-[var(--hf-text)] hover:bg-[var(--hf-soft)] hover:text-[var(--hf-text)]'}`}>
      <Icon size={19} className="shrink-0" aria-hidden="true" />
      {sidebarOpen ? <span className="text-sm font-medium truncate">{item.label}</span> : null}
      {item.hasAlert ? <span className={`w-2 h-2 rounded-full bg-red-500 shrink-0 ${sidebarOpen ? 'ml-auto' : 'absolute top-1 right-1'}`} /> : null}
    </button>;
  };

  return <div className="h-screen bg-[var(--hf-bg)] text-[var(--hf-text)] overflow-hidden" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
    {sidebarOpen ? <button type="button" aria-label="Fermer le menu" onClick={() => setSidebarOpen?.(false)} className="fixed inset-0 z-30 bg-black/30 md:hidden" /> : null}
    <div className="flex h-full overflow-hidden">
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarOpen ? 'md:w-64' : 'md:w-16'} fixed md:relative inset-y-0 left-0 z-40 w-[82vw] max-w-80 shrink-0 bg-[var(--hf-surface)] border-r border-[var(--hf-border-soft)] flex flex-col transition-all duration-300 overflow-hidden shadow-2xl md:shadow-none`}>
        <div className="flex items-center gap-3 px-3 py-4 border-b border-[var(--hf-border-soft)]">
          <BrandLogo variant={sidebarOpen ? 'sidebar' : 'compact'} showText={sidebarOpen} />
          <button type="button" aria-label={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'} onClick={() => setSidebarOpen?.(!sidebarOpen)} className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--hf-muted)] hover:text-[var(--hf-text)] hover:bg-[var(--hf-soft)] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20">{sidebarOpen ? <X size={16} /> : <Menu size={16} />}</button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto space-y-4 px-2" aria-label="Navigation principale">
          {groupedNavItems.map((group) => <div key={group.key} className="space-y-1">
            {sidebarOpen ? <p className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--hf-muted)]">{group.label}</p> : <div className="mx-2 my-2 border-t border-[var(--hf-border-soft)]" />}
            {group.items.map(renderNavItem)}
          </div>)}
        </nav>
        <div className="p-3 border-t border-[var(--hf-border-soft)] space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${online ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>{online ? <Wifi size={14} className="text-emerald-500 shrink-0" /> : <WifiOff size={14} className="text-red-500 shrink-0" />}{sidebarOpen ? <span className={`text-xs font-medium ${online ? 'text-emerald-600' : 'text-red-500'}`}>{online ? 'Connecté' : 'Hors ligne'}</span> : null}</div>
          {sidebarOpen ? <button type="button" onClick={signOutAction} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--hf-soft)] cursor-pointer hover:bg-emerald-100 transition-colors text-left"><div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-700 font-bold text-xs">A</div><div className="flex-1 min-w-0"><div className="text-xs text-[var(--hf-text)] font-semibold truncate">{displayUser}</div><div className="text-[10px] text-[var(--hf-muted)]">Exploitant principal</div></div><LogOut size={12} className="text-[var(--hf-muted)]" /></button> : null}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-[var(--hf-surface)] border-b border-[var(--hf-border-soft)] flex items-center px-3 md:px-6 gap-2 md:gap-3 shrink-0 relative">
          <button type="button" aria-label="Ouvrir le menu" onClick={() => setSidebarOpen?.(true)} className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--hf-soft)] text-[var(--hf-muted)]"><Menu size={20} /></button>
          <div className="hidden sm:block flex-1 relative max-w-md"><VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Rechercher dans la ferme..." />{results.length > 0 ? <div className="absolute top-12 left-0 right-0 z-40 bg-white border border-[var(--hf-border)] rounded-xl shadow-xl overflow-hidden">{results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-[var(--hf-soft)] border-b border-[var(--hf-border-soft)] last:border-b-0"><div className="text-sm font-semibold text-[var(--hf-text)]">{result.title}</div><div className="text-xs text-[var(--hf-muted)]">{moduleLabel(result.moduleKey)} · {result.subtitle}</div></button>)}</div> : null}</div>
          <div className="sm:hidden flex-1 min-w-0"><p className="text-sm font-bold truncate">{activeLabel}</p><p className="text-[11px] text-[var(--hf-muted)] truncate">Horizon Farm</p></div>
          <div className="ml-auto flex items-center gap-1 md:gap-3">
            <button type="button" aria-label="Rechercher dans la ferme" onClick={() => { setMobileSearchOpen(true); setNotificationsOpen(false); setSettingsOpen(false); }} className="sm:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--hf-soft)] text-[var(--hf-muted)]"><Search size={18} /></button>
            <div className={`hidden lg:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-black ${simulatedMode ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{simulatedMode ? 'Données simulées' : 'Données réelles'} · {uiSettings.complexity === 'expert' ? 'Détaillé' : 'Simple'}</div>
            <div className="hidden lg:flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-500"><Thermometer size={12} />{weatherLoading ? 'Météo...' : `${currentWeather.temp}°C ress. ${currentWeather.apparentTemp}°C - ${currentWeather.condition} - ${currentWeather.humidite}%`}</div>
            <button type="button" aria-label="Ouvrir les notifications" onClick={() => { setNotificationsOpen((value) => !value); setSettingsOpen(false); setMobileSearchOpen(false); }} className="relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--hf-soft)] text-[var(--hf-muted)]"><Bell size={18} />{notifs > 0 ? <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">{notifs > 99 ? '99+' : notifs}</span> : null}</button>
            <button type="button" aria-label="Ouvrir Horizon" onClick={onOpenAssistant} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--hf-soft)] text-[var(--hf-muted)] hover:text-emerald-600"><Bot size={18} /></button>
            <button type="button" aria-label="Ouvrir les paramètres" onClick={() => { setSettingsOpen((value) => !value); setNotificationsOpen(false); setMobileSearchOpen(false); }} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-[var(--hf-soft)] text-[var(--hf-muted)]"><Settings size={18} /></button>
          </div>
          {mobileSearchOpen ? <div className="fixed inset-0 z-50 bg-black/30 sm:hidden"><div className="absolute inset-x-3 top-3 rounded-3xl border border-[var(--hf-border)] bg-white p-4 shadow-2xl"><div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-sm font-black text-[var(--hf-text)]">Recherche</p><p className="text-xs text-[var(--hf-muted)]">Retrouver une vente, un lot, un animal, une tâche…</p></div><button type="button" onClick={() => setMobileSearchOpen(false)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--hf-muted)] hover:bg-[var(--hf-soft)]"><X size={18} /></button></div><VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Rechercher dans Horizon Farm..." /><div className="mt-3 max-h-[65vh] overflow-y-auto space-y-2">{globalSearch.trim() && results.length > 0 ? results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full text-left rounded-2xl border border-[var(--hf-border-soft)] bg-[var(--hf-surface)] px-3 py-3"><div className="text-sm font-black text-[var(--hf-text)]">{result.title}</div><div className="mt-1 text-xs text-[var(--hf-muted)]">{moduleLabel(result.moduleKey)} · {result.subtitle}</div></button>) : <div className="rounded-2xl border border-[var(--hf-border-soft)] bg-[var(--hf-surface)] px-4 py-8 text-center text-sm text-[var(--hf-muted)]">{globalSearch.trim() ? 'Aucun résultat trouvé.' : 'Tape un mot-clé ou utilise la dictée vocale.'}</div>}</div></div></div> : null}
          {notificationsOpen ? <div className="absolute right-2 md:right-16 top-14 z-50 w-[min(94vw,420px)] bg-white border border-[var(--hf-border)] rounded-2xl shadow-2xl p-4"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-bold text-[var(--hf-text)]">Notifications</p><p className="text-xs text-[var(--hf-muted)]">{alerts.length} alerte(s) active(s)</p></div><button type="button" onClick={() => setNotificationsOpen(false)} className="text-[var(--hf-muted)] hover:text-[var(--hf-text)]"><X size={16} /></button></div><div className="space-y-2 max-h-[60vh] overflow-y-auto">{alerts.length > 0 ? alerts.map((alert) => <button key={alert.id} type="button" onClick={() => navigate(alert.moduleKey)} className={`w-full text-left rounded-xl border p-3 transition-all ${alert.severity === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}><div className="flex gap-2"><AlertTriangle size={15} className={alert.severity === 'danger' ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} /><div><p className="text-xs font-bold text-[var(--hf-text)]">{alert.type}</p><p className="text-xs text-[var(--hf-muted)] mt-0.5">{alert.text}</p></div></div></button>) : <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2"><CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-[var(--hf-text)]">Tout est calme</p><p className="text-xs text-[var(--hf-muted)]">Aucune alerte importante détectée.</p></div></div>}</div></div> : null}
          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} displayUser={displayUser} online={online} meteo={currentWeather} weatherSource={weatherSource} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setActive={navigateTo} onSignOut={signOutAction} />
        </header>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6">{children}</div>
      </main>
    </div>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--hf-border-soft)] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-2xl"><div className="grid grid-cols-5 gap-1">{mobileNavItems.map((item) => { const Icon = item.icon; const isActive = active === item.id; return <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`min-w-0 rounded-xl px-1 py-2 flex flex-col items-center gap-1 ${isActive ? 'bg-[var(--hf-hero)] text-white' : 'text-[var(--hf-muted)]'}`}><Icon size={18} /><span className="text-[10px] font-semibold truncate w-full text-center">{item.label}</span></button>; })}<button type="button" onClick={onOpenAssistant} className="min-w-0 rounded-xl px-1 py-2 flex flex-col items-center gap-1 text-emerald-700 bg-emerald-500/10"><Bot size={18} /><span className="text-[10px] font-semibold truncate w-full text-center">Assistant</span></button></div></nav>
  </div>;
}
