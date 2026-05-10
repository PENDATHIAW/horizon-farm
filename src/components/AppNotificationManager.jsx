import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { notifyAlerts, notificationPermission, requestNotificationPermission, shouldNotifyAlert } from '../utils/appNotifications';
import { pushSetupStatus, sendTestPush, subscribeDeviceToPush } from '../utils/pushSubscriptions';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const activeAlert = (alert = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done'].includes(lower(alert.status || alert.statut));
const criticalSeverity = (alert = {}) => ['critique', 'urgence'].includes(lower(alert.severity || alert.gravite));

function moduleFor(alert = {}) {
  const source = lower(alert.module_source || alert.module || alert.entity_type);
  if (source.includes('avicole') || source.includes('lot')) return 'avicole';
  if (source.includes('animal')) return 'animaux';
  if (source.includes('stock')) return 'stock';
  if (source.includes('culture')) return 'cultures';
  if (source.includes('finance') || source.includes('transaction')) return 'finances';
  if (source.includes('client')) return 'clients';
  if (source.includes('fournisseur')) return 'fournisseurs';
  if (source.includes('sensor') || source.includes('smart')) return 'smartfarm';
  if (source.includes('equip')) return 'equipements';
  return 'alertes';
}

function buildDerivedAlerts(dataMap = {}) {
  const result = [];
  arr(dataMap.animaux).filter((animal) => lower(animal.health_status) === 'malade').forEach((animal) => result.push({ id: `notify-animal-malade-${animal.id}`, title: `Animal malade: ${animal.name || animal.nom || animal.id}`, message: 'Un animal est signalé malade. Vérifier immédiatement le suivi santé.', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Ouvrir Animaux / Santé et traiter le cas.' }));
  arr(dataMap.avicole).filter((lot) => Number(lot.initial_count || 0) > 0 && Number(lot.mortality || lot.morts || 0) > Number(lot.initial_count || 0) * 0.04).forEach((lot) => result.push({ id: `notify-lot-mortalite-${lot.id}`, title: `Mortalité élevée: ${lot.name || lot.nom || lot.id}`, message: 'Un lot avicole dépasse le seuil critique de mortalité.', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Contrôle santé et biosécurité à faire.' }));
  arr(dataMap.stock).filter((stock) => Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= 0).forEach((stock) => result.push({ id: `notify-stock-zero-${stock.id}`, title: `Rupture stock: ${stock.nom || stock.produit || stock.id}`, message: 'Un produit est à zéro alors qu’il a un seuil de sécurité.', module_source: 'stock', entity_type: 'stock', entity_id: stock.id, severity: 'urgence', status: 'nouvelle', action_recommandee: 'Réapprovisionner ou trouver une alternative.' }));
  arr(dataMap.cultures).filter((culture) => lower(culture.statut) === 'perdu').forEach((culture) => result.push({ id: `notify-culture-perdue-${culture.id}`, title: `Culture perdue: ${culture.nom || culture.name || culture.id}`, message: 'Une culture a été marquée comme perdue.', module_source: 'cultures', entity_type: 'culture', entity_id: culture.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Analyser la cause et planifier l’action corrective.' }));
  return result;
}

export default function AppNotificationManager({ dataMap = {}, onNavigate }) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const alerts = useMemo(() => {
    const persisted = arr(dataMap.alertes_center).filter(activeAlert).filter(criticalSeverity);
    return [...persisted, ...buildDerivedAlerts(dataMap)].filter((alert) => shouldNotifyAlert(alert));
  }, [dataMap]);
  const pushStatus = pushSetupStatus();

  useEffect(() => {
    const handler = (event) => {
      const alert = event.detail || event.data?.payload || {};
      onNavigate?.(moduleFor(alert));
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
    if (!alerts.length) return;
    const run = async () => {
      const permission = notificationPermission();
      if (permission === 'default') {
        toast('Active les notifications Horizon Farm pour recevoir les urgences sans ouvrir le module Alertes.');
        return;
      }
      if (permission === 'denied' || permission === 'unsupported') return;
      await notifyAlerts(alerts);
    };
    run();
  }, [alerts]);

  const enableLocal = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      toast.success('Notifications appareil activées pour Horizon Farm');
      await notifyAlerts(alerts.slice(0, 3));
    } else if (permission === 'denied') {
      toast.error('Notifications bloquées. Autorise-les dans les réglages du navigateur/appareil.');
    } else {
      toast('Notifications non disponibles sur cet appareil.');
    }
  };

  const enableAdvanced = async () => {
    try {
      setBusy(true);
      if (!pushStatus.supported) throw new Error('Push non supporté sur cet appareil');
      if (!pushStatus.ready) throw new Error('Clé VAPID publique manquante');
      await subscribeDeviceToPush({ userId: 'owner', label: 'Appareil propriétaire Horizon Farm', channels: ['urgence', 'critique'] });
      await sendTestPush({ title: 'Horizon Farm — test push', body: 'Ton appareil est abonné aux alertes critiques et urgences.', severity: 'critique', module: 'alertes' });
      toast.success('Notifications avancées activées et test envoyé');
      setHidden(true);
    } catch (error) {
      toast.error(error.message || 'Activation push avancée impossible');
    } finally {
      setBusy(false);
    }
  };

  if (hidden || notificationPermission() === 'granted') return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl bg-[#2f2415] text-white shadow-xl border border-[#c9a96a] p-3 space-y-2">
      <p className="text-sm font-black">Alertes Horizon Farm</p>
      <p className="text-xs text-[#f4e6c8]">Active les notifications appareil. Le mode avancé permet l’abonnement push serveur quand les clés VAPID sont configurées.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={enableLocal} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/15">Activer local</button>
        <button type="button" disabled={busy} onClick={enableAdvanced} className="rounded-full bg-[#c9a96a] px-3 py-1.5 text-xs font-bold text-[#2f2415] disabled:opacity-60">{busy ? 'Activation...' : 'Activer avancé'}</button>
        <button type="button" onClick={() => setHidden(true)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold">Plus tard</button>
      </div>
      {!pushStatus.ready ? <p className="text-[11px] text-amber-200">Pack avancé prêt côté code, mais VITE_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY doivent être configurées sur Vercel.</p> : null}
    </div>
  );
}
