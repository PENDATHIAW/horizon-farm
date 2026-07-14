import { createSupabaseCrudService } from './baseSupabaseService';
import { makeId } from '../utils/ids';

export const whatsappTemplatesService = createSupabaseCrudService('whatsapp_templates');
export const whatsappLogsService = createSupabaseCrudService('whatsapp_logs');

export const sendWhatsAppSimulated = async ({ alertId = null, recipient = '', message = '' } = {}) => {
  try {
    return await whatsappLogsService.create({
      id: makeId('WA'),
      alert_id: alertId,
      recipient,
      message,
      status: 'simule',
      provider: 'simulation',
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[whatsapp] log simule echoue:', error.message);
    return null;
  }
};

export const WHATSAPP_TEMPLATES = {
  stock_critique: (vars) =>
    `⚠️ Horizon Farm - Stock critique\nLe stock ${vars.produit} est bas.\nQuantité restante : ${vars.quantite} ${vars.unite}.\nAction recommandée : ${vars.action}.`,
  mortalite_lot: (vars) =>
    `🚨 Horizon Farm - Alerte avicole\nMortalité élevée dans ${vars.lot}.\nMorts : ${vars.morts}.\nAction recommandée : isoler les sujets faibles et contacter un vétérinaire.`,
  alerte_cultures: (vars) =>
    `🌱 Horizon Farm - Alerte cultures\nHumidité élevée détectée.\nRisque de maladie fongique sur ${vars.culture}.\nAction recommandée : surveiller et éviter arrosage excessif.`,
  tresorerie_faible: (vars) =>
    `💰 Horizon Farm - Alerte trésorerie\nLa trésorerie est sous le seuil.\nSolde actuel : ${vars.solde} FCFA.\nAction recommandée : vérifier les encaissements clients.`,
  relance_client: (vars) =>
    `👥 Horizon Farm - Relance client\nLe client ${vars.client} a une facture impayée de ${vars.montant} FCFA.\nAction recommandée : envoyer une relance.`,
  capteur_offline: (vars) =>
    `📡 Horizon Farm - Capteur offline\nLe capteur ${vars.capteur} ne répond plus depuis ${vars.duree}.\nZone : ${vars.zone}.\nAction recommandée : vérifier batterie ou connexion.`,
  opportunites_jour: (vars) =>
    `Horizon Farm - Opportunités du jour :\n- ${vars.lotsChair} lot(s) chair prêt(s) à vendre\n- ${vars.plateaux} plateaux disponibles\n- ${vars.clientsRelance} client(s) VIP à relancer\nValeur potentielle estimée : ${vars.valeur} FCFA.`,
  confirmation_commande: (vars) =>
    `Bonjour ${vars.client}, votre commande Horizon Farm de ${vars.montant} FCFA est confirmée.`,
  relance_paiement: (vars) =>
    `Bonjour ${vars.client}, il reste ${vars.reste} FCFA à régler sur votre facture ${vars.facture}.`,
};
