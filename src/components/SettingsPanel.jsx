import { Bell, Database, Eye, FileText, History, Layers, LogOut, RefreshCw, Settings, ShieldCheck, Sun, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { applyUiSettingsToDocument, DEFAULT_UI_SETTINGS, isDemoModeEnabled, readUiSettings, setDemoMode, UI_SETTINGS_KEY, writeUiSettings } from '../utils/uiPreferences';
import { JUSTIFIED_EXCEPTION_STORAGE_KEY, LEGACY_IGNORED_INTERCONNECTION_KEY } from '../utils/justifiedExceptionRules.js';
import useAutomationSettings from '../hooks/useAutomationSettings.js';

function removeMatchingLocalStorage(prefixes = []) {
  if (typeof localStorage === 'undefined') return 0;
  const keys = Object.keys(localStorage).filter((key) => prefixes.some((prefix) => key.startsWith(prefix) || key.includes(prefix)));
  keys.forEach((key) => localStorage.removeItem(key));
  return keys.length;
}

function SettingRow({ icon: Icon, title, description, children }) {
  return <div className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2 min-w-0"><Icon size={16} className="mt-0.5 shrink-0 text-[#9a6b12]" /><div className="min-w-0"><p className="text-sm font-black text-[#2f2415]">{title}</p>{description ? <p className="mt-0.5 text-xs text-[#8a7456]">{description}</p> : null}</div></div>{children ? <div className="shrink-0">{children}</div> : null}</div></div>;
}
function Toggle({ checked, onChange }) { return <button type="button" onClick={() => onChange(!checked)} className={`flex h-5 w-10 items-center rounded-full px-0.5 transition ${checked ? 'justify-end bg-emerald-500' : 'justify-start bg-[#d6c3a0]'}`}><span className="h-4 w-4 rounded-full bg-white shadow" /></button>; }
function Select({ value, onChange, options }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-1.5 text-xs font-bold text-[#2f2415] outline-none">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>; }
function Segmented({ value, onChange, options }) { return <div className="inline-flex rounded-xl border border-[#d6c3a0] bg-white p-0.5">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${value === option.value ? 'bg-[#2f2415] text-white' : 'text-[#8a7456] hover:bg-[#fffdf8]'}`}>{option.label}</button>)}</div>; }

export default function SettingsPanel({ open, onClose, user, displayUser, online, meteo = {}, weatherSource, sidebarOpen, setSidebarOpen, setActive, onSignOut }) {
  const [settings, setSettings] = useState(readUiSettings);
  const [demoEnabled, setDemoEnabled] = useState(() => isDemoModeEnabled());
  const { settings: automationSettings, toggle: toggleAutomation, loading: automationLoading } = useAutomationSettings();

  useEffect(() => {
    writeUiSettings(settings);
    applyUiSettingsToDocument(settings);
    window.dispatchEvent(new CustomEvent('horizon-farm-ui-settings-changed', { detail: settings }));
  }, [settings]);

  useEffect(() => {
    const syncDataMode = () => setDemoEnabled(isDemoModeEnabled());
    window.addEventListener('horizon-farm-data-mode-changed', syncDataMode);
    return () => window.removeEventListener('horizon-farm-data-mode-changed', syncDataMode);
  }, []);

  const role = user?.user_metadata?.role || 'profil';
  const weatherLabel = useMemo(() => {
    if (!meteo) return 'Météo indisponible';
    const temp = meteo.temp ?? '—';
    const apparent = meteo.apparentTemp ?? temp;
    return `${temp}°C ress. ${apparent}°C · ${meteo.condition || 'condition inconnue'} · pluie ${meteo.precipitationProbability || 0}%`;
  }, [meteo]);

  if (!open) return null;

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const navigate = (moduleKey, options) => { setActive?.(moduleKey, options); onClose?.(); };
  const toggleDemo = (value) => {
    setDemoMode(value);
    setDemoEnabled(value);
    toast.success(value ? 'Données simulées activées — rechargement des modules…' : 'Données réelles activées — scénario de démo masqué');
  };
  const clearLocalSuppressionCache = () => {
    if (!window.confirm('Nettoyer les éléments gardés seulement sur cet appareil ? Cela ne supprime aucune donnée de la ferme.')) return;
    const count = removeMatchingLocalStorage(['horizon_farm_deleted_ids:', 'horizon_farm_deleted_records:', IGNORED_AUDIT_KEY]);
    toast.success(`${count} élément(s) nettoyé(s)`);
  };
  const resetNotificationBanner = () => { try { localStorage.removeItem(NOTIFICATION_BANNER_HIDDEN_KEY); } catch { /* noop */ } toast.success('Demande de notifications réaffichée'); };
  const resetUiSettings = () => { setSettings(DEFAULT_UI_SETTINGS); try { localStorage.removeItem(UI_SETTINGS_KEY); } catch { /* noop */ } toast.success('Affichage remis par défaut'); };

  return <div className="absolute right-3 top-14 z-50 w-[min(94vw,460px)] rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-2xl">
    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><Settings size={16} /> Paramètres Horizon Farm</p><p className="text-xs text-[#8a7456]">Affichage, compte, données et raccourcis utiles.</p></div><button type="button" onClick={onClose} className="text-[#8a7456] hover:text-[#2f2415]"><X size={16} /></button></div>
    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
      <SettingRow icon={ShieldCheck} title={displayUser || 'Utilisateur'} description={`Profil actuel : ${role}. Les accès se règlent dans Gestion du système.`}><button type="button" onClick={() => navigate('gestion_systeme')} className="rounded-full border border-[#d6c3a0] px-3 py-1 text-xs font-bold text-[#2f2415]">Accès</button></SettingRow>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={() => navigate('gestion_systeme')} className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3 text-left hover:border-[#c9a96a]"><ShieldCheck size={16} className="mb-2 text-[#9a6b12]" /><p className="text-sm font-black text-[#2f2415]">Gestion du système</p><p className="text-xs text-[#8a7456]">Comptes et accès.</p></button><button type="button" onClick={() => navigate('gestion_systeme', { tab: 'Audit' })} className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3 text-left hover:border-[#c9a96a]"><History size={16} className="mb-2 text-[#9a6b12]" /><p className="text-sm font-black text-[#2f2415]">Vérifications</p><p className="text-xs text-[#8a7456]">Points à revoir et sauvegarde.</p></button><button type="button" onClick={() => navigate('documents')} className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3 text-left hover:border-[#c9a96a]"><FileText size={16} className="mb-2 text-[#9a6b12]" /><p className="text-sm font-black text-[#2f2415]">Documents</p><p className="text-xs text-[#8a7456]">Preuves et factures.</p></button><button type="button" onClick={resetNotificationBanner} className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3 text-left hover:border-[#c9a96a]"><Bell size={16} className="mb-2 text-[#9a6b12]" /><p className="text-sm font-black text-[#2f2415]">Notifications</p><p className="text-xs text-[#8a7456]">Réafficher la demande.</p></button></div>
      <SettingRow icon={Layers} title="Niveau de détail" description={settings.complexity === 'simple' ? 'Vue simple : l’essentiel d’abord.' : 'Vue détaillée : plus de graphiques et de contrôles.'}><Segmented value={settings.complexity} onChange={(value) => updateSetting('complexity', value)} options={[{ value: 'simple', label: 'Simple' }, { value: 'expert', label: 'Détaillé' }]} /></SettingRow>
      <SettingRow icon={Eye} title="Menu latéral" description="Afficher le menu large ou compact."><Toggle checked={!sidebarOpen} onChange={() => setSidebarOpen?.(!sidebarOpen)} /></SettingRow>
      <SettingRow icon={Database} title="Données affichées" description={demoEnabled ? 'Données simulées : l’ERP peut afficher/créer des données de test cohérentes pour comprendre et tester les modules.' : 'Données réelles : seules les données réellement saisies sont affichées.'}><Segmented value={demoEnabled ? 'simulated' : 'real'} onChange={(value) => toggleDemo(value === 'simulated')} options={[{ value: 'real', label: 'Réelles' }, { value: 'simulated', label: 'Simulées' }]} /></SettingRow>
      <div className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3 space-y-2">
        <p className="text-sm font-black text-[#2f2415]">Automatisations ferme</p>
        <p className="text-xs text-[#8a7456]">Relances WhatsApp préparées et tâches auto sur alertes critiques.</p>
        {automationLoading ? <p className="text-xs text-[#8a7456]">Chargement…</p> : automationSettings.map((row) => (
          <SettingRow key={row.key} icon={Bell} title={row.label} description={row.description}>
            <Toggle checked={row.enabled !== false} onChange={() => toggleAutomation(row.key)} />
          </SettingRow>
        ))}
      </div>
      <SettingRow icon={Sun} title="Affichage" description="Confort pour plus d’air, compact pour moins de scroll."><Select value={settings.density} onChange={(value) => updateSetting('density', value)} options={[{ value: 'comfortable', label: 'Confort' }, { value: 'compact', label: 'Compact' }]} /></SettingRow>
      <SettingRow icon={online ? Wifi : WifiOff} title="Connexion" description={online ? 'Connecté.' : 'Hors ligne : les actions seront gardées en attente.'}><span className={`rounded-full px-2 py-1 text-xs font-black ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{online ? 'OK' : 'Hors ligne'}</span></SettingRow>
      <SettingRow icon={Sun} title="Météo terrain" description={`${weatherLabel}.`} />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="mb-2 text-sm font-black text-amber-900">Nettoyage sur cet appareil</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={clearLocalSuppressionCache} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-left text-xs font-bold text-amber-900 hover:bg-white"><Trash2 size={14} className="inline" /> Nettoyer</button><button type="button" onClick={resetUiSettings} className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-left text-xs font-bold text-amber-900 hover:bg-white"><RefreshCw size={14} className="inline" /> Remettre l’affichage</button></div><p className="mt-2 text-[11px] text-amber-800">Ces actions concernent seulement ce téléphone ou cet ordinateur.</p></div>
      <button type="button" onClick={onSignOut} className="w-full rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left text-sm font-black text-red-600 hover:bg-red-500/20"><LogOut size={15} className="inline" /> Déconnexion</button>
    </div>
  </div>;
}
