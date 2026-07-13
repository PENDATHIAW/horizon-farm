import { Bell, Database, Eye, FileText, History, Layers, LogOut, RefreshCw, Settings, ShieldCheck, Sun, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { applyUiSettingsToDocument, DEFAULT_UI_SETTINGS, isDemoModeEnabled, readUiSettings, setDemoMode, UI_SETTINGS_KEY, writeUiSettings } from '../utils/uiPreferences';
import { IGNORED_AUDIT_KEY, NOTIFICATION_BANNER_HIDDEN_KEY } from '../utils/storageKeys.js';
import { t } from '../i18n/fr/index.js';

import useAutomationSettings from '../hooks/useAutomationSettings.js';

function removeMatchingLocalStorage(prefixes = []) {
  if (typeof localStorage === 'undefined') return 0;
  const keys = Object.keys(localStorage).filter((key) => prefixes.some((prefix) => key.startsWith(prefix) || key.includes(prefix)));
  keys.forEach((key) => localStorage.removeItem(key));
  return keys.length;
}

function SettingRow({ icon: Icon, title, description, children }) {
  return <div className="rounded-xl border border-line bg-card p-3"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2 min-w-0"><Icon size={16} className="mt-1 shrink-0 text-horizon-dark" /><div className="min-w-0"><p className="text-sm font-semibold text-earth">{title}</p>{description ? <p className="mt-1 text-xs text-slate">{description}</p> : null}</div></div>{children ? <div className="shrink-0">{children}</div> : null}</div></div>;
}
function Toggle({ checked, onChange }) { return <button type="button" onClick={() => onChange(!checked)} className={`flex h-5 w-10 items-center rounded-full px-1 transition ${checked ? 'justify-end bg-positive' : 'justify-start bg-line'}`}><span className="h-4 w-4 rounded-full bg-white shadow" /></button>; }
function Select({ value, onChange, options }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-line bg-white px-2 py-2 text-xs font-semibold text-earth outline-none">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>; }
function Segmented({ value, onChange, options }) { return <div className="inline-flex rounded-xl border border-line bg-white p-1">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${value === option.value ? 'bg-earth text-white' : 'text-slate hover:bg-card'}`}>{option.label}</button>)}</div>; }

export default function SettingsPanel({ open, onClose, user, displayUser, online, meteo = {}, sidebarOpen, setSidebarOpen, setActive, onSignOut }) {
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
    if (!meteo) return t('reglages.meteoIndisponible');
    const temp = meteo.temp ?? '·';
    const apparent = meteo.apparentTemp ?? temp;
    return `${temp}°C ress. ${apparent}°C · ${meteo.condition || 'condition inconnue'} · pluie ${meteo.precipitationProbability || 0}%`;
  }, [meteo]);

  if (!open) return null;

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const navigate = (moduleKey) => { setActive?.(moduleKey); onClose?.(); };
  const toggleDemo = (value) => {
    setDemoMode(value);
    setDemoEnabled(value);
    toast.success(value ? t('reglages.donnees.activeToast') : t('reglages.donnees.desactiveToast'));
  };
  const clearLocalSuppressionCache = () => {
    if (!window.confirm(t('reglages.nettoyage.confirmation'))) return;
    const count = removeMatchingLocalStorage(['horizon_farm_deleted_ids:', 'horizon_farm_deleted_records:', IGNORED_AUDIT_KEY]);
    toast.success(t('reglages.nettoyage.resultat', { count }));
  };
  const resetNotificationBanner = () => { try { localStorage.removeItem(NOTIFICATION_BANNER_HIDDEN_KEY); } catch { /* noop */ } toast.success(t('reglages.notificationsReaffichees')); };
  const resetUiSettings = () => { setSettings(DEFAULT_UI_SETTINGS); try { localStorage.removeItem(UI_SETTINGS_KEY); } catch { /* noop */ } toast.success(t('reglages.affichageRemis')); };

  return <div className="absolute right-3 top-14 z-50 w-[min(94vw,460px)] rounded-2xl border border-line bg-white p-4 shadow-float">
    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold text-earth"><Settings size={16} /> {t('reglages.titre')}</p><p className="text-xs text-slate">{t('reglages.sousTitre')}</p></div><button type="button" onClick={onClose} className="text-slate hover:text-earth"><X size={16} /></button></div>
    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
      <SettingRow icon={ShieldCheck} title={displayUser || t('reglages.utilisateur')} description={t('reglages.profilActuel', { role })}><button type="button" onClick={() => navigate('gestion_systeme')} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-earth">{t('reglages.acces')}</button></SettingRow>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={() => navigate('gestion_systeme')} className="rounded-xl border border-line bg-card p-3 text-left hover:border-horizon"><ShieldCheck size={16} className="mb-2 text-horizon-dark" /><p className="text-sm font-semibold text-earth">{t('reglages.raccourcis.gestionSysteme')}</p><p className="text-xs text-slate">{t('reglages.raccourcis.gestionSystemeDetail')}</p></button><button type="button" onClick={() => navigate('sync_activity')} className="rounded-xl border border-line bg-card p-3 text-left hover:border-horizon"><History size={16} className="mb-2 text-horizon-dark" /><p className="text-sm font-semibold text-earth">{t('reglages.raccourcis.verifications')}</p><p className="text-xs text-slate">{t('reglages.raccourcis.verificationsDetail')}</p></button><button type="button" onClick={() => navigate('documents')} className="rounded-xl border border-line bg-card p-3 text-left hover:border-horizon"><FileText size={16} className="mb-2 text-horizon-dark" /><p className="text-sm font-semibold text-earth">{t('reglages.raccourcis.documents')}</p><p className="text-xs text-slate">{t('reglages.raccourcis.documentsDetail')}</p></button><button type="button" onClick={resetNotificationBanner} className="rounded-xl border border-line bg-card p-3 text-left hover:border-horizon"><Bell size={16} className="mb-2 text-horizon-dark" /><p className="text-sm font-semibold text-earth">{t('reglages.raccourcis.notifications')}</p><p className="text-xs text-slate">{t('reglages.raccourcis.notificationsDetail')}</p></button></div>
      <SettingRow icon={Layers} title={t('reglages.detail.titre')} description={settings.complexity === 'simple' ? t('reglages.detail.simple') : t('reglages.detail.detaille')}><Segmented value={settings.complexity} onChange={(value) => updateSetting('complexity', value)} options={[{ value: 'simple', label: t('reglages.detail.optionSimple') }, { value: 'expert', label: t('reglages.detail.optionDetaille') }]} /></SettingRow>
      <SettingRow icon={Eye} title={t('reglages.menu.titre')} description={t('reglages.menu.description')}><Toggle checked={!sidebarOpen} onChange={() => setSidebarOpen?.(!sidebarOpen)} /></SettingRow>
      <SettingRow icon={Database} title={t('reglages.donnees.titre')} description={demoEnabled ? t('reglages.donnees.simulees') : t('reglages.donnees.reelles')}><Segmented value={demoEnabled ? 'simulated' : 'real'} onChange={(value) => toggleDemo(value === 'simulated')} options={[{ value: 'real', label: t('reglages.donnees.optionReelles') }, { value: 'simulated', label: t('reglages.donnees.optionSimulees') }]} /></SettingRow>
      <div className="rounded-xl border border-line bg-card p-3 space-y-2">
        <p className="text-sm font-semibold text-earth">{t('reglages.automatisations.titre')}</p>
        <p className="text-xs text-slate">{t('reglages.automatisations.description')}</p>
        {automationLoading ? <p className="text-xs text-slate">{t('reglages.automatisations.chargement')}</p> : automationSettings.map((row) => (
          <SettingRow key={row.key} icon={Bell} title={row.label} description={row.description}>
            <Toggle checked={row.enabled !== false} onChange={() => toggleAutomation(row.key)} />
          </SettingRow>
        ))}
      </div>
      <SettingRow icon={Sun} title={t('reglages.affichage.titre')} description={t('reglages.affichage.description')}><Select value={settings.density} onChange={(value) => updateSetting('density', value)} options={[{ value: 'comfortable', label: t('reglages.affichage.confort') }, { value: 'compact', label: t('reglages.affichage.compact') }]} /></SettingRow>
      <SettingRow icon={online ? Wifi : WifiOff} title={t('reglages.connexion.titre')} description={online ? t('reglages.connexion.connecte') : t('reglages.connexion.horsLigne')}><span className={`rounded-full px-2 py-1 text-xs font-semibold ${online ? 'bg-positive-bg text-positive' : 'bg-urgent-bg text-urgent'}`}>{online ? t('reglages.connexion.statutOk') : t('reglages.connexion.statutHorsLigne')}</span></SettingRow>
      <SettingRow icon={Sun} title={t('reglages.meteoTerrain')} description={`${weatherLabel}.`} />
      <div className="rounded-xl border border-vigilance bg-vigilance-bg p-3"><p className="mb-2 text-sm font-semibold text-horizon-dark">{t('reglages.nettoyage.titre')}</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={clearLocalSuppressionCache} className="rounded-xl border border-vigilance bg-white/70 px-3 py-2 text-left text-xs font-semibold text-horizon-dark hover:bg-white"><Trash2 size={14} className="inline" /> {t('reglages.nettoyage.nettoyer')}</button><button type="button" onClick={resetUiSettings} className="rounded-xl border border-vigilance bg-white/70 px-3 py-2 text-left text-xs font-semibold text-horizon-dark hover:bg-white"><RefreshCw size={14} className="inline" /> {t('reglages.nettoyage.remettreAffichage')}</button></div><p className="mt-2 text-meta text-horizon-dark">{t('reglages.nettoyage.portee')}</p></div>
      <button type="button" onClick={onSignOut} className="w-full rounded-xl border border-urgent bg-urgent p-3 text-left text-sm font-semibold text-urgent hover:bg-urgent"><LogOut size={15} className="inline" /> {t('reglages.deconnexion')}</button>
    </div>
  </div>;
}
