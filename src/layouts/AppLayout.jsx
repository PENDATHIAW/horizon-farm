import {
  AlertTriangle,
  Bell,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle,
  ChevronDown,
  CircleDollarSign,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  ShoppingCart,
  Sprout,
  UsersRound,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import GlobalFarmControl from '../components/GlobalFarmControl';
import GlobalPeriodControl from '../components/GlobalPeriodControl';
import GlobalQuickEntryMenu from '../components/GlobalQuickEntryMenu.jsx';
import SettingsPanel from '../components/SettingsPanel';
import VoiceSearch from '../components/VoiceSearch';
import { t } from '../i18n/fr/index.js';
import { readOfflineQueue } from '../services/offlineQueueService';
import { searchERP } from '../services/globalSearchService';
import { applyUiSettingsToDocument, isDemoModeEnabled, readUiSettings } from '../utils/uiPreferences';

const dangerStatuses = ['retard', 'critique', 'urgent', 'impaye', 'partiel', 'malade', 'panne', 'hors_service'];
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const isRisky = (value) => dangerStatuses.some((status) => normalize(value).includes(status));
const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const safeRows = (value) => (Array.isArray(value) ? value : []);
const safeWeather = (value = {}) => ({
  temp: value?.temp ?? '-',
  condition: value?.condition || 'météo',
  riskLevel: value?.riskLevel || 'stable',
  impact: value?.impact || '',
  ...value,
});
const formatDateTime = () => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
}).format(new Date());

const NAV_GROUPS = Object.freeze([
  { key: 'today', label: "Aujourd'hui", icon: CalendarDays, ids: ['dashboard', 'assistant_erp'] },
  { key: 'production', label: 'Production', icon: Sprout, ids: ['elevage', 'cultures', 'agri_feeds', 'smartfarm'] },
  { key: 'commerce', label: 'Commerce', icon: ShoppingCart, ids: ['commercial', 'achats_stock'] },
  { key: 'money', label: 'Argent', icon: CircleDollarSign, ids: ['finance_pilotage', 'financements'] },
  { key: 'steering', label: 'Pilotage', icon: ChartNoAxesCombined, ids: ['centre_decisionnel', 'objectifs_croissance'] },
  { key: 'organization', label: 'Organisation', icon: UsersRound, ids: ['activite_suivi', 'documents_rapports', 'equipe', 'equipements'] },
  { key: 'settings', label: 'Réglages', icon: Settings, ids: ['gestion_systeme'] },
]);

const LEGACY_GROUP = Object.freeze({ centre_ia: 'steering', rh: 'organization', sync: 'settings', sync_activity: 'settings', audit_logs: 'settings' });

function buildNavGroups(navItems = []) {
  const groups = new Map(NAV_GROUPS.map((group) => [group.key, { ...group, items: [] }]));
  navItems.forEach((item) => {
    const group = NAV_GROUPS.find((entry) => entry.ids.includes(item.id));
    const key = group?.key || LEGACY_GROUP[item.id] || 'settings';
    groups.get(key)?.items.push(item);
  });
  return [...groups.values()].filter((group) => group.items.length);
}

function buildAlerts(dataMap = {}, online = true, meteo = {}) {
  const stock = safeRows(dataMap.stock)
    .filter((item) => Number(item.quantite || 0) <= Number(item.seuil || 0))
    .map((item) => ({ id: `stock-${item.id}`, type: 'Stock critique', text: `${item.produit || item.name || item.nom || 'Produit'} : ${item.quantite}/${item.seuil}`, moduleKey: 'achats_stock', severity: 'danger' }));
  const sante = safeRows(dataMap.sante)
    .filter((item) => item.statut === 'retard' || isRisky(item.status || item.statut))
    .map((item) => ({ id: `sante-${item.id}`, type: 'Santé à traiter', text: item.nom || item.title || 'Suivi santé', moduleKey: 'elevage', severity: 'danger' }));
  const finances = safeRows(dataMap.finances)
    .filter((item) => ['impaye', 'partiel'].includes(item.statut) || isRisky(item.statut))
    .map((item) => ({ id: `finance-${item.id}`, type: 'Finance à vérifier', text: `${item.libelle || item.title || 'Transaction'} : ${item.montant || 0} FCFA`, moduleKey: 'finance_pilotage', severity: 'warning' }));
  const weather = meteo?.riskLevel && meteo.riskLevel !== 'stable'
    ? [{ id: 'meteo-risk', type: 'Météo et terrain', text: meteo.impact || 'Vérifier les conditions du terrain.', moduleKey: 'dashboard', severity: 'warning' }]
    : [];
  const offline = online ? [] : [{ id: 'offline', type: 'Connexion', text: 'Mode hors ligne actif', moduleKey: 'gestion_systeme', severity: 'warning' }];
  return [...offline, ...weather, ...sante, ...stock, ...finances].slice(0, 18);
}

function HeaderPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-meta font-semibold text-earth">
      <Icon size={13} aria-hidden="true" />{children}
    </span>
  );
}

function NavIcon({ icon: Icon, size = 19 }) {
  if (!Icon) return null;
  return <Icon size={size} className="shrink-0" aria-hidden="true" />;
}

export default function AppLayout({
  navItems = [], active = 'dashboard', setActive, onNavigate, sidebarOpen = true, setSidebarOpen,
  online = true, meteo, weather, weatherSource, notifs = 0, user, onSignOut, signOut,
  dataMap = {}, onOpenAssistant, periodScope, onPeriodScopeChange, farmScope,
  accessibleFarms = [], onFarmScopeChange, activeFarm, onManageFarms, children,
}) {
  const navigateTo = setActive || onNavigate || (() => {});
  const signOutAction = onSignOut || signOut || (() => {});
  const currentWeather = safeWeather(meteo || weather);
  const displayUser = user?.user_metadata?.login || user?.email?.split('@')[0] || 'Administrateur';
  const farmLocation = activeFarm?.name || activeFarm?.location || currentWeather.location || 'Horizon Farm';
  const currentDateTime = useMemo(() => formatDateTime(), []);
  const groupedNavItems = useMemo(() => buildNavGroups(navItems), [navItems]);
  const activeGroup = groupedNavItems.find((group) => group.items.some((item) => item.id === active));
  const mobileGroups = groupedNavItems.filter((group) => ['today', 'production', 'commerce', 'money'].includes(group.key));
  const activeLabel = navItems.find((item) => item.id === active)?.label || 'Horizon Farm';
  const [openSections, setOpenSections] = useState(() => ({ today: true }));
  const [globalSearch, setGlobalSearch] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState(() => readOfflineQueue().length);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [actionIntent, setActionIntent] = useState(null);
  const [uiSettings, setUiSettings] = useState(readUiSettings);
  const [simulatedDataMode, setSimulatedDataMode] = useState(() => isDemoModeEnabled());
  const results = useMemo(() => searchERP(dataMap || {}, globalSearch).slice(0, mobileSearchOpen ? 10 : 6), [dataMap, globalSearch, mobileSearchOpen]);
  const alerts = useMemo(() => buildAlerts(dataMap, online, currentWeather), [dataMap, online, currentWeather]);

  useEffect(() => {
    const updateQueue = () => setPendingSyncCount(readOfflineQueue().length);
    window.addEventListener('online', updateQueue);
    window.addEventListener('offline', updateQueue);
    window.addEventListener('storage', updateQueue);
    const timer = window.setInterval(updateQueue, 20000);
    return () => {
      window.removeEventListener('online', updateQueue);
      window.removeEventListener('offline', updateQueue);
      window.removeEventListener('storage', updateQueue);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    applyUiSettingsToDocument(uiSettings);
    const handler = (event) => setUiSettings(event.detail || readUiSettings());
    const syncDataMode = () => setSimulatedDataMode(isDemoModeEnabled());
    window.addEventListener('horizon-farm-ui-settings-changed', handler);
    window.addEventListener('horizon-farm-data-mode-changed', syncDataMode);
    window.addEventListener('storage', syncDataMode);
    return () => {
      window.removeEventListener('horizon-farm-ui-settings-changed', handler);
      window.removeEventListener('horizon-farm-data-mode-changed', syncDataMode);
      window.removeEventListener('storage', syncDataMode);
    };
  }, [uiSettings]);

  useEffect(() => {
    const handler = (event) => setActionIntent(event.detail || { action: 'Action' });
    window.addEventListener('horizon-ui-intent', handler);
    return () => window.removeEventListener('horizon-ui-intent', handler);
  }, []);

  const closePanels = () => {
    setNotificationsOpen(false);
    setSettingsOpen(false);
    setMobileSearchOpen(false);
  };

  const navigate = (moduleKey, options) => {
    navigateTo(moduleKey, options);
    if (isMobileViewport()) setSidebarOpen?.(false);
    closePanels();
  };

  const renderNavItem = (item) => {
    const isActive = active === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => navigate(item.id)}
        title={!sidebarOpen ? item.label : undefined}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex min-h-11 w-full items-center gap-3 rounded-control border-l-4 px-3 py-2 text-left transition ${isActive ? 'border-horizon bg-positive-bg text-earth' : 'border-transparent text-line hover:bg-leaf hover:text-pure'}`}
      >
        <NavIcon icon={item.icon} />
        {sidebarOpen ? <span className="truncate text-sm font-medium">{item.label}</span> : null}
        {item.hasAlert ? <span className={`h-2 w-2 shrink-0 rounded-full bg-urgent ${sidebarOpen ? 'ml-auto' : 'absolute right-1 top-1'}`} aria-label="Alerte" /> : null}
      </button>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-mist text-ink">
      {sidebarOpen ? <button type="button" aria-label="Fermer le menu" onClick={() => setSidebarOpen?.(false)} className="fixed inset-y-0 left-80 right-0 z-30 bg-earth/30 md:hidden" /> : null}
      <div className="flex h-full overflow-hidden">
        <aside className={`${sidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-16 md:translate-x-0'} fixed inset-y-0 left-0 z-40 flex w-80 max-w-full shrink-0 flex-col overflow-hidden border-r border-leaf bg-earth shadow-float transition-all duration-200 md:relative md:shadow-none`}>
          <div className="flex items-center gap-3 border-b border-leaf px-3 py-3">
            <BrandLogo variant={sidebarOpen ? 'sidebar' : 'compact'} showText={sidebarOpen} inverse />
            <button type="button" aria-label={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'} onClick={() => setSidebarOpen?.(!sidebarOpen)} className="ml-auto grid h-11 w-11 place-items-center rounded-control text-line hover:bg-leaf hover:text-pure">
              {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
          <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3" aria-label="Navigation principale">
            {groupedNavItems.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = group.key === activeGroup?.key;
              const expanded = group.key === activeGroup?.key || openSections[group.key] === true;
              return (
                <div key={group.key} className="space-y-1">
                  {sidebarOpen ? (
                    <button
                      type="button"
                      onClick={() => setOpenSections((current) => ({ ...current, [group.key]: !expanded }))}
                      className={`flex min-h-9 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-meta font-semibold uppercase ${isGroupActive ? 'text-horizon' : 'text-line hover:bg-leaf hover:text-pure'}`}
                      aria-expanded={expanded}
                    >
                      <GroupIcon size={15} aria-hidden="true" />
                      <span className="flex-1">{group.label}</span>
                      <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
                    </button>
                  ) : <div className="mx-2 border-t border-leaf" />}
                  {(!sidebarOpen || expanded) ? <div className="space-y-1">{group.items.map(renderNavItem)}</div> : null}
                </div>
              );
            })}
          </nav>
          <div className="space-y-2 border-t border-leaf p-3">
            <div className={`flex items-center gap-2 rounded-control px-3 py-2 ${online ? 'bg-positive-bg text-positive' : 'bg-urgent-bg text-urgent'}`}>
              {online ? <Wifi size={14} className="shrink-0" /> : <WifiOff size={14} className="shrink-0" />}
              {sidebarOpen ? <span className="text-xs font-medium">{online ? 'Connecté' : 'Hors ligne'}</span> : null}
            </div>
            {sidebarOpen ? (
              <button type="button" onClick={signOutAction} className="flex w-full items-center gap-2 rounded-control bg-leaf px-3 py-2 text-left text-pure hover:bg-positive">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-positive-bg text-xs font-semibold text-earth">{displayUser.slice(0, 1).toUpperCase()}</div>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{displayUser}</span>
                <LogOut size={14} />
              </button>
            ) : null}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-mist">
          <header className="relative flex min-h-18 shrink-0 items-center gap-2 border-b border-line bg-pure px-3 md:gap-3 md:px-6">
            <button type="button" aria-label="Ouvrir le menu" onClick={() => setSidebarOpen?.(true)} className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist hover:text-earth md:hidden"><Menu size={20} /></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-earth sm:text-base">Bonjour {displayUser}</p>
              <p className="truncate text-meta font-medium capitalize text-slate">{currentDateTime}</p>
            </div>
            <span className={`hidden rounded-full border px-2 py-1 text-meta font-semibold uppercase sm:inline-flex ${simulatedDataMode ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive'}`}>{simulatedDataMode ? 'Données simulées' : 'Données réelles'}</span>
            <div className="hidden items-center gap-2 xl:flex">
              <HeaderPill icon={MapPin}>{farmLocation}</HeaderPill>
              <HeaderPill icon={online ? Wifi : WifiOff}>{online ? 'En ligne' : 'Hors ligne'}</HeaderPill>
              {pendingSyncCount > 0 ? <HeaderPill icon={WifiOff}>{t('commun.etats.enAttenteEnvoi', { n: pendingSyncCount })}</HeaderPill> : null}
            </div>
            <div className="relative hidden w-full max-w-sm lg:block">
              <VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Recherche" />
              {results.length > 0 ? (
                <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-card border border-line bg-card shadow-float">
                  {results.map((result) => (
                    <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { navigate(result.moduleKey); setGlobalSearch(''); }} className="w-full px-3 py-2 text-left hover:bg-mist">
                      <div className="text-xs font-semibold text-ink">{result.title}</div>
                      <div className="text-meta text-slate">{result.subtitle}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setQuickEntryOpen(true)} className="hidden min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-control bg-horizon px-4 py-2 text-sm font-semibold text-earth shadow-card hover:bg-horizon-dark hover:text-pure md:inline-flex">
              <Zap size={17} aria-hidden="true" /> Saisie rapide
            </button>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Rechercher dans l’ERP" onClick={() => { setMobileSearchOpen(true); setNotificationsOpen(false); setSettingsOpen(false); }} className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist hover:text-earth lg:hidden"><Search size={18} /></button>
              <button type="button" aria-label="Ouvrir les notifications" onClick={() => { setNotificationsOpen((value) => !value); setSettingsOpen(false); setMobileSearchOpen(false); }} className="relative grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist hover:text-earth">
                <Bell size={18} />{notifs > 0 ? <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-urgent px-1 text-meta font-semibold text-pure">{notifs > 99 ? '99+' : notifs}</span> : null}
              </button>
              <button type="button" aria-label="Ouvrir Hey Horizon" title="Hey Horizon" onClick={onOpenAssistant} className="grid h-11 w-11 place-items-center rounded-control text-leaf hover:bg-positive-bg"><Bot size={18} /></button>
              <button type="button" aria-label="Ouvrir les paramètres" onClick={() => { setSettingsOpen((value) => !value); setNotificationsOpen(false); setMobileSearchOpen(false); }} className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist hover:text-earth"><Settings size={18} /></button>
            </div>

            {mobileSearchOpen ? (
              <div className="fixed inset-0 z-50 bg-earth/30 lg:hidden">
                <div className="absolute inset-x-3 top-3 rounded-card border border-line bg-card p-4 shadow-float">
                  <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-earth">Recherche</p><button type="button" onClick={() => setMobileSearchOpen(false)} className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist"><X size={18} /></button></div>
                  <VoiceSearch value={globalSearch} onChange={setGlobalSearch} placeholder="Rechercher dans Horizon Farm" />
                </div>
              </div>
            ) : null}
            {notificationsOpen ? (
              <div className="absolute right-2 top-18 z-50 w-[min(94vw,420px)] rounded-card border border-line bg-card p-4 shadow-float md:right-16">
                <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-earth">Notifications</p><p className="text-meta text-slate">{alerts.length} alerte(s)</p></div><button type="button" onClick={() => setNotificationsOpen(false)} className="grid h-9 w-9 place-items-center rounded-control text-slate hover:bg-mist"><X size={16} /></button></div>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                  {alerts.length > 0 ? alerts.map((alert) => (
                    <button key={alert.id} type="button" onClick={() => navigate(alert.moduleKey)} className={`w-full rounded-control border p-3 text-left ${alert.severity === 'danger' ? 'border-urgent bg-urgent-bg' : 'border-vigilance bg-vigilance-bg'}`}>
                      <div className="flex gap-2"><AlertTriangle size={15} className={alert.severity === 'danger' ? 'mt-1 shrink-0 text-urgent' : 'mt-1 shrink-0 text-horizon-dark'} /><div><p className="text-xs font-semibold text-ink">{alert.type}</p><p className="mt-1 text-xs text-slate">{alert.text}</p></div></div>
                    </button>
                  )) : (
                    <div className="flex gap-2 rounded-control border border-positive bg-positive-bg p-3"><CheckCircle size={16} className="mt-1 shrink-0 text-positive" /><div><p className="text-xs font-semibold text-ink">Aucune alerte</p><p className="text-xs text-slate">Tout est à jour.</p></div></div>
                  )}
                </div>
              </div>
            ) : null}
            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} displayUser={displayUser} online={online} meteo={currentWeather} weatherSource={weatherSource} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setActive={navigateTo} onSignOut={signOutAction} />
          </header>
          <GlobalFarmControl farmScope={farmScope} accessibleFarms={accessibleFarms} onChange={onFarmScopeChange} user={user} activeFarm={activeFarm} onManageFarms={onManageFarms} />
          <GlobalPeriodControl periodScope={periodScope} onChange={onPeriodScopeChange} />
          <div className="hf-mobile-main min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">{children}</div>
        </main>
      </div>

      {actionIntent ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-earth/30 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-card border border-line bg-card p-6 shadow-float">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-meta font-semibold uppercase text-horizon-dark">Action indisponible</p><h2 className="mt-1 text-lg font-semibold text-ink">{actionIntent.action || 'Cette action'}</h2><p className="mt-2 text-sm text-slate">Cette action n’est pas disponible dans ce contexte. Reviens au module concerné pour choisir une fiche active.</p></div>
              <button type="button" onClick={() => setActionIntent(null)} className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist"><X size={18} /></button>
            </div>
            <div className="mt-4 rounded-control border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">Module : <b>{actionIntent.module || activeLabel}</b></div>
            <button type="button" onClick={() => setActionIntent(null)} className="mt-4 w-full rounded-control bg-earth px-4 py-3 text-sm font-semibold text-pure">Revenir au module</button>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-card px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-float md:hidden" aria-label="Navigation mobile">
        <div className="grid grid-cols-5 gap-1">
          {mobileGroups.slice(0, 2).map((group) => {
            const Icon = group.icon;
            const isActive = group.key === activeGroup?.key;
            return <button key={group.key} type="button" onClick={() => navigate(group.items[0]?.id)} className={`flex min-w-0 flex-col items-center gap-1 rounded-control px-1 py-2 ${isActive ? 'bg-positive-bg text-earth' : 'text-slate'}`}><Icon size={18} /><span className="w-full truncate text-center text-meta font-medium">{group.label}</span></button>;
          })}
          <button type="button" onClick={() => setQuickEntryOpen(true)} aria-label="Ouvrir les saisies rapides" className="-mt-6 flex min-w-0 flex-col items-center gap-1 text-earth">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-horizon shadow-float"><Zap size={23} aria-hidden="true" /></span>
            <span className="text-meta font-semibold">Saisir</span>
          </button>
          {mobileGroups.slice(2, 4).map((group) => {
            const Icon = group.icon;
            const isActive = group.key === activeGroup?.key;
            return <button key={group.key} type="button" onClick={() => navigate(group.items[0]?.id)} className={`flex min-w-0 flex-col items-center gap-1 rounded-control px-1 py-2 ${isActive ? 'bg-positive-bg text-earth' : 'text-slate'}`}><Icon size={18} /><span className="w-full truncate text-center text-meta font-medium">{group.label}</span></button>;
          })}
        </div>
      </nav>

      <GlobalQuickEntryMenu open={quickEntryOpen} onClose={() => setQuickEntryOpen(false)} onNavigate={navigate} />
    </div>
  );
}
