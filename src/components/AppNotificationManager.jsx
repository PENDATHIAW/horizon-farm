import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildTechnicalFarmingAlerts } from '../services/technicalFarmingRules';
import { notifyAlerts, notificationPermission, requestNotificationPermission, shouldNotifyAlert } from '../utils/appNotifications';
import { isDeletedRecord } from '../utils/deletedRecords';
import { pushSetupStatus, subscribeDeviceToPush } from '../utils/pushSubscriptions';
import useWorkflowSubmit from '../hooks/useWorkflowSubmit';
import { NOTIFICATION_BANNER_HIDDEN_KEY } from '../utils/storageKeys.js';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const activeAlert = (alert = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done'].includes(lower(alert.status || alert.statut));
const criticalSeverity = (alert = {}) => ['critique', 'urgence'].includes(lower(alert.severity || alert.gravite));
const isIOSDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandaloneApp = () => window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
const IOS_INSTALL_HELP = 'Sur iPhone, ajoute Horizon Farm à l’écran d’accueil depuis Safari, puis ouvre l’app depuis cette icône.';
function wasBannerHidden() {
  try { return localStorage.getItem(NOTIFICATION_BANNER_HIDDEN_KEY) === 'true'; } catch { return false; }
}
function hideBannerForever() {
  try { localStorage.setItem(NOTIFICATION_BANNER_HIDDEN_KEY, 'true'); } catch { /* noop */ }
}

function moduleFor(alert = {}) {
  const source = lower(alert.module_source || alert.module || alert.entity_type);
  if (source.includes('avicole') || source.includes('lot')) return 'avicole';
  if (source.includes('animal')) return 'animaux';
  if (source.includes('stock')) return 'stock';
  if (source.includes('culture')) return 'cultures';
  if (source.includes('finance') || source.includes('transaction')) return 'finances';
  if (source.includes('client')) return 'clients';
  if (source.includes('fournisseur')) return 'fournisseurs';
  if (source.includes('sante') || source.includes('santé')) return 'sante';
  if (source.includes('sensor') || source.includes('smart')) return 'smartfarm';
  if (source.includes('equip')) return 'equipements';
  return 'alertes';
}

function alertKey(alert = {}) {
  return `${alert.module_source || alert.module || 'autre'}:${alert.entity_type || 'entite'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
}

function equivalentAlert(a = {}, b = {}) {
  if (String(a.id || '') && String(a.id || '') === String(b.id || '')) return true;
  if (a.alert_dedupe_key && a.alert_dedupe_key === alertKey(b)) return true;
  return String(a.module_source || a.module || '') === String(b.module_source || b.module || '')
    && String(a.entity_type || '') === String(b.entity_type || '')
    && String(a.entity_id || '') === String(b.entity_id || '')
    && String(a.action_recommandee || a.title || a.message || '') === String(b.action_recommandee || b.title || b.message || '');
}

function wasHandledOrDeleted(alert = {}, persistedAlerts = []) {
  if (isDeletedRecord('alertes_center', alert)) return true;
  return arr(persistedAlerts).some((persisted) => equivalentAlert(persisted, alert) && !activeAlert(persisted));
}

function applyNavigationTarget(detail = {}, onNavigate) {
  const params = new URLSearchParams(window.location.search || '');
  const targetModule = detail.module || detail.module_source || params.get('module');
  const action = detail.action || params.get('action');
  const focus = detail.focus || params.get('focus');
  const alertId = detail.alert_id || params.get('alert_id');
  const entityId = detail.entity_id || params.get('entity_id');
  if (!targetModule) return false;
  onNavigate?.(targetModule);
  window.dispatchEvent(new CustomEvent('horizon-farm-action-target', { detail: { module: targetModule, action, focus, alert_id: alertId, entity_id: entityId } }));
  if (action || focus || alertId || entityId) toast.success(`Ouverture ${targetModule}`);
  return true;
}

function buildDerivedAlerts(dataMap = {}) {
  const persistedAlerts = arr(dataMap.alertes_center);
  const result = [];
  arr(dataMap.animaux).filter((animal) => lower(animal.health_status) === 'malade').forEach((animal) => result.push({ id: `notify-animal-malade-${animal.id}`, title: `Animal malade: ${animal.name || animal.nom || animal.id}`, message: 'Un animal est signalé malade.', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Consulter vétérinaire immédiatement' }));
  arr(dataMap.avicole).filter((lot) => Number(lot.initial_count || 0) > 0 && Number(lot.mortality || lot.morts || 0) > Number(lot.initial_count || 0) * 0.04).forEach((lot) => result.push({ id: `notify-lot-mortalite-${lot.id}`, title: `Mortalité élevée: ${lot.name || lot.nom || lot.id}`, message: 'Un lot avicole dépasse le seuil critique de mortalité.', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Appliquer contrôle santé et biosécurité' }));
  arr(dataMap.stock).filter((stock) => Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= 0).forEach((stock) => result.push({ id: `notify-stock-zero-${stock.id}`, title: `Rupture stock: ${stock.nom || stock.produit || stock.id}`, message: 'Un produit est à zéro.', module_source: 'stock', entity_type: 'stock', entity_id: stock.id, severity: 'urgence', status: 'nouvelle', action_recommandee: 'Commander réapprovisionnement' }));
  arr(dataMap.cultures).filter((culture) => lower(culture.statut) === 'perdu').forEach((culture) => result.push({ id: `notify-culture-perdue-${culture.id}`, title: `Culture perdue: ${culture.nom || culture.name || culture.id}`, message: 'Une culture a été marquée comme perdue.', module_source: 'cultures', entity_type: 'culture', entity_id: culture.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Analyser cause et planifier nouvelle culture' }));
  buildTechnicalFarmingAlerts({
    lots: arr(dataMap.avicole),
    animaux: arr(dataMap.animaux),
    stocks: arr(dataMap.stock),
    sante: arr(dataMap.sante),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
    sensorDevices: arr(dataMap.sensor_devices || dataMap.sensorDevices),
  }).forEach((alert) => result.push({ ...alert, id: `notify-${alert.id}`, severity: alert.severity || 'warning' }));
  return result.filter((alert) => !wasHandledOrDeleted(alert, persistedAlerts));
}

export default function AppNotificationManager({ dataMap = {}, onNavigate }) {
  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  const [hidden, setHidden] = useState(() => wasBannerHidden());
  const iosNeedsInstall = isIOSDevice() && !isStandaloneApp();
  const alerts = useMemo(() => {
    const persisted = arr(dataMap.alertes_center).filter((alert) => !isDeletedRecord('alertes_center', alert)).filter(activeAlert).filter(criticalSeverity);
    return [...persisted, ...buildDerivedAlerts(dataMap)].filter((alert) => shouldNotifyAlert(alert));
  }, [dataMap]);
  const pushStatus = pushSetupStatus();

  useEffect(() => {
    applyNavigationTarget({}, onNavigate);
    const handler = (event) => {
      const alert = event.detail || event.data?.payload || {};
      if (!applyNavigationTarget(alert, onNavigate)) onNavigate?.(moduleFor(alert));
    };
    const messageHandler = (event) => {
      if (event.data?.type === 'HORIZON_FARM_OPEN_ALERT') handler(event);
    };
    window.addEventListener('horizon-farm-open-alert', handler);
    navigator.serviceWorker?.addEventListener?.('message', messageHandler);
    return () => {
      window.removeEventListener('horizon-farm-open-alert', handler);
      navigator.serviceWorker?.removeEventListener?.('message', messageHandler);
    };
  }, [onNavigate]);

  useEffect(() => {
    if (!alerts.length || iosNeedsInstall) return;
    const run = async () => {
      const permission = notificationPermission();
      if (permission === 'granted') await notifyAlerts(alerts);
    };
    run();
  }, [alerts, iosNeedsInstall]);

  // Activation unique : on demande l'autorisation (notifications dans l'app,
  // immédiates) puis, si le serveur push est configuré, on abonne l'appareil
  // en arrière-plan de façon silencieuse. Plus de « mode avancé » à choisir.
  const enable = async () => {
    await workflowSubmit('push-enable', async () => {
      if (iosNeedsInstall) {
        toast.error(IOS_INSTALL_HELP);
        return;
      }
      const permission = await requestNotificationPermission();
      if (permission === 'denied') {
        toast.error('Notifications bloquées par le navigateur. Autorisez-les dans les réglages du site.');
        return;
      }
      if (permission !== 'granted') {
        toast.error('Notifications non disponibles ici.');
        return;
      }
      toast.success('Notifications activées');
      await notifyAlerts(alerts.slice(0, 3));
      // Meilleur effort : abonnement push en arrière-plan si le serveur est prêt.
      if (pushStatus.ready) {
        try {
          await subscribeDeviceToPush({ userId: 'owner', label: 'Appareil Horizon Farm', channels: ['urgence', 'critique'] });
        } catch {
          // L'app reste notifiée en local ; l'arrière-plan sera réessayé plus tard.
        }
      }
      hideBannerForever();
      setHidden(true);
    });
  };

  const dismiss = () => {
    hideBannerForever();
    setHidden(true);
  };

  if (hidden || notificationPermission() === 'granted') return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-40 space-y-2 rounded-card border border-horizon bg-earth p-3 text-white shadow-float sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm">
      <p className="text-sm font-semibold">Notifications</p>
      <p className="text-xs text-line">Être prévenu des alertes critiques et urgentes, même quand l’app est fermée.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={workflowBusy} onClick={enable} className="rounded-full bg-horizon px-3 py-2 text-xs font-semibold text-earth hover:bg-horizon/90 disabled:opacity-60">{workflowBusy ? 'Activation...' : 'Activer les notifications'}</button>
        <button type="button" onClick={dismiss} className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold">Plus tard</button>
      </div>
      {iosNeedsInstall ? <p className="text-meta text-horizon-dark">Sur iPhone : Safari → Partager → Ajouter à l’écran d’accueil.</p> : null}
    </div>
  );
}
