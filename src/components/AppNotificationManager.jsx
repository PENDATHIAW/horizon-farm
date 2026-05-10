import { useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { notifyAlerts, notificationPermission, requestNotificationPermission, shouldNotifyAlert } from '../utils/appNotifications';

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
  arr(dataMap.animaux).filter((animal) => lower(animal.health_status) === 'malade').forEach((animal) => result.push({
    id: `notify-animal-malade-${animal.id}`,
    title: `Animal malade: ${animal.name || animal.nom || animal.id}`,
    message: 'Un animal est signalé malade. Vérifier immédiatement le suivi santé.',
    module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, severity: 'critique', status: 'nouvelle',
    action_recommandee: 'Ouvrir Animaux / Santé et traiter le cas.',
  }));
  arr(dataMap.avicole).filter((lot) => Number(lot.initial_count || 0) > 0 && Number(lot.mortality || lot.morts || 0) > Number(lot.initial_count || 0) * 0.04).forEach((lot) => result.push({
    id: `notify-lot-mortalite-${lot.id}`,
    title: `Mortalité élevée: ${lot.name || lot.nom || lot.id}`,
    message: 'Un lot avicole dépasse le seuil critique de mortalité.',
    module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, severity: 'critique', status: 'nouvelle',
    action_recommandee: 'Contrôle santé et biosécurité à faire.',
  }));
  arr(dataMap.stock).filter((stock) => Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= 0).forEach((stock) => result.push({
    id: `notify-stock-zero-${stock.id}`,
    title: `Rupture stock: ${stock.nom || stock.produit || stock.id}`,
    message: 'Un produit est à zéro alors qu’il a un seuil de sécurité.',
    module_source: 'stock', entity_type: 'stock', entity_id: stock.id, severity: 'urgence', status: 'nouvelle',
    action_recommandee: 'Réapprovisionner ou trouver une alternative.',
  }));
  arr(dataMap.cultures).filter((culture) => lower(culture.statut) === 'perdu').forEach((culture) => result.push({
    id: `notify-culture-perdue-${culture.id}`,
    title: `Culture perdue: ${culture.nom || culture.name || culture.id}`,
    message: 'Une culture a été marquée comme perdue.',
    module_source: 'cultures', entity_type: 'culture', entity_id: culture.id, severity: 'critique', status: 'nouvelle',
    action_recommandee: 'Analyser la cause et planifier l’action corrective.',
  }));
  return result;
}

export default function AppNotificationManager({ dataMap = {}, onNavigate }) {
  const alerts = useMemo(() => {
    const persisted = arr(dataMap.alertes_center).filter(activeAlert).filter(criticalSeverity);
    return [...persisted, ...buildDerivedAlerts(dataMap)].filter((alert) => shouldNotifyAlert(alert));
  }, [dataMap]);

  useEffect(() => {
    const handler = (event) => {
      const alert = event.detail || {};
      onNavigate?.(moduleFor(alert));
    };
    window.addEventListener('horizon-farm-open-alert', handler);
    return () => window.removeEventListener('horizon-farm-open-alert', handler);
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

  const enable = async () => {
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

  if (notificationPermission() === 'granted') return null;
  return (
    <button type="button" onClick={enable} className="fixed bottom-4 right-4 z-40 rounded-full bg-[#2f2415] text-white shadow-xl border border-[#c9a96a] px-4 py-2 text-sm font-bold hover:bg-[#3d2f1d]">
      Activer notifications urgences
    </button>
  );
}
