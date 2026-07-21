/**
 * Contenus commerciaux (messages, relances) → brouillons ; vente via workflows uniquement.
 */

import {
  AI_DRAFT_SOURCES,
  createAiActionDraft,
  TARGET_WORKFLOWS,
} from './aiActionDrafts.js';
import { draftRelanceMessageDeterministic } from '../relanceAutomation.js';
import { callClaudeModel } from './modelClient.js';

const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

/**
 * Fabrique un « aiDrafter » de relance branché sur le modèle via la passerelle.
 * À passer à `buildDailyRelanceBatch({ aiDrafter })`. Si le modèle n'est pas
 * joignable (pas d'endpoint, hors-ligne), il renvoie une chaîne vide et
 * l'orchestrateur retombe automatiquement sur la rédaction déterministe.
 */
export function buildClaudeRelanceDrafter({ fetchImpl } = {}) {
  return async function claudeRelanceDrafter(context = {}) {
    const brouillon = draftRelanceMessageDeterministic(context);
    const prompt = [
      'Réécris cette relance de paiement pour une ferme sénégalaise (Horizon Farm),',
      `client « ${context.clientName || 'client'} », segment « ${context.segment || 'standard'} »,`,
      `niveau ${context.levelLabel || context.level || 'J+2'}, montant dû ${fmtMoney(context.amount)},`,
      `retard ${context.overdueDays || 0} jour(s). Ton ${context.tone || 'courtois'}, court, respectueux,`,
      'prêt à envoyer sur WhatsApp. Garde le montant exact. Base :',
      brouillon,
    ].join(' ');
    const result = await callClaudeModel({
      system: 'Tu rédiges des relances de paiement brèves, cordiales et professionnelles pour une ferme au Sénégal.',
      prompt,
      maxTokens: 320,
      fetchImpl,
    });
    return result.ok ? result.text : '';
  };
}

/**
 * Brouillon de relance créance passé par la gateway (message, jamais exécuté
 * automatiquement : INSIGHT_ONLY + validation obligatoire). Le corps est rédigé
 * par le moteur personnalisé (segment + niveau d'escalade) ; c'est aussi le point
 * exact où un modèle Claude viendra affiner le texte, sans changer le contrat.
 */
export function proposeRelanceMessageDraft({
  clientName = '',
  amount = 0,
  overdueDays = 0,
  level = 'j2',
  levelLabel = '',
  segment = '',
  orderId = '',
  channel = 'whatsapp',
  phone = '',
  whatsappUrl = '',
} = {}) {
  const missing = [];
  if (!clientName) missing.push('client_name');
  if (!phone) missing.push('client_phone');

  const body = clientName
    ? draftRelanceMessageDeterministic({ level, clientName, amount, orderId, overdueDays, segment })
    : 'Bonjour, précisez le client concerné pour personnaliser la relance.';

  const warnings = [];
  if (!phone) warnings.push('Numéro WhatsApp manquant : relance à passer par appel.');
  warnings.push('Validez le texte avant envoi - aucun message ne part automatiquement.');

  return createAiActionDraft({
    intent: 'relance_creance',
    confidence: missing.length ? 0.5 : 0.9,
    source: AI_DRAFT_SOURCES.COMMERCIAL,
    draft: {
      channel,
      level,
      level_label: levelLabel || level,
      client_name: clientName,
      amount,
      overdue_days: overdueDays,
      segment,
      order_id: orderId,
      phone,
      body,
      whatsapp_url: whatsappUrl,
    },
    target_workflow: TARGET_WORKFLOWS.INSIGHT_ONLY,
    required_validation: true,
    missing_fields: missing,
    warnings,
    confirmation_required: missing.length > 0,
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}

/**
 * Brouillon message client (relance, confirmation) - pas d'envoi automatique.
 */
export function proposeClientMessageDraft({
  clientName = '',
  resteAPayer = 0,
  tone = 'professional',
  channel = 'whatsapp',
} = {}) {
  const missing = [];
  if (!clientName) missing.push('client_name');

  const body = clientName
    ? `Bonjour ${clientName}, nous vous rappelons un solde de ${fmtMoney(resteAPayer)}. Merci de nous indiquer votre disponibilité pour régulariser.`
    : 'Bonjour, merci de préciser le client concerné pour personnaliser le message.';

  return createAiActionDraft({
    intent: 'client_message',
    confidence: missing.length ? 0.45 : 0.9,
    source: AI_DRAFT_SOURCES.COMMERCIAL,
    draft: {
      channel,
      tone,
      body,
      client_name: clientName,
      reste_a_payer: resteAPayer,
    },
    target_workflow: TARGET_WORKFLOWS.INSIGHT_ONLY,
    required_validation: true,
    missing_fields: missing,
    confirmation_required: missing.length > 0,
    warnings: missing.length ? ['Nom client requis avant envoi.'] : ['Validez le texte avant envoi WhatsApp/SMS.'],
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}

/**
 * Brouillon vente terrain - exécution via commitSaleWorkflow / commitCommercialSale après validation.
 */
export function proposeSaleDraft({
  clientName = '',
  productName = '',
  quantity = null,
  unit = '',
  amount = null,
  paymentStatus = 'unknown',
  rawInput = '',
} = {}) {
  const missing = ['client_name', 'product_name', 'quantity', 'amount'].filter((k) => {
    if (k === 'client_name') return !clientName;
    if (k === 'product_name') return !productName;
    if (k === 'quantity') return quantity == null || quantity <= 0;
    if (k === 'amount') return amount == null || amount <= 0;
    return false;
  });

  if (paymentStatus === 'unknown') missing.push('payment_status');

  const warnings = [];
  if (paymentStatus === 'unknown') {
    warnings.push('Précisez si la vente est payée, à crédit ou partielle.');
  }

  return createAiActionDraft({
    intent: 'sale_record',
    confidence: missing.length ? 0.52 : 0.84,
    source: AI_DRAFT_SOURCES.COMMERCIAL,
    draft: {
      preview: {
        client_name: clientName,
        product_name: productName,
        quantity,
        unit,
        montant_total: amount,
        payment_status: paymentStatus,
      },
      fields: {
        client_name: clientName,
        product_name: productName,
        quantity,
        unit,
        amount,
        payment_status: paymentStatus,
      },
      primary_module: 'commercial',
      form_type: 'sale_record',
    },
    target_workflow: TARGET_WORKFLOWS.SALE,
    required_validation: true,
    missing_fields: missing,
    warnings,
    confirmation_required: missing.length > 0 || paymentStatus === 'unknown',
    raw_input: rawInput,
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}

/**
 * Brouillon encaissement - recordSalePayment après validation.
 */
export function proposePaymentDraft({
  saleId = '',
  orderId = '',
  requestedAmount = 0,
  paymentMethod = 'especes',
} = {}) {
  const missing = [];
  if (!saleId && !orderId) missing.push('sale_or_order_id');
  if (!requestedAmount || requestedAmount <= 0) missing.push('requested_amount');

  return createAiActionDraft({
    intent: 'sale_payment',
    confidence: missing.length ? 0.48 : 0.87,
    source: AI_DRAFT_SOURCES.COMMERCIAL,
    draft: {
      sale: { id: saleId, order_id: orderId },
      requestedAmount,
      paymentMethod,
    },
    target_workflow: TARGET_WORKFLOWS.SALE_PAYMENT,
    required_validation: true,
    missing_fields: missing,
    warnings: missing.length ? ['Identifiez la vente et le montant avant encaissement.'] : [],
    confirmation_required: missing.length > 0,
    status: missing.length ? 'draft_incomplete' : 'awaiting_validation',
  });
}
