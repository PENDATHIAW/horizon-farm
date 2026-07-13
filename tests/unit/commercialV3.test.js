import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommercialDeliveryQueue,
  buildDeliveryProofPatch,
  buildDeliveryTerrainRow,
  deliveryProofMessage,
  hasDeliveryProof,
  resolveDeliveryStatus,
  DELIVERY_STATUSES,
} from '../../src/utils/commercialDeliveries.js';
import {
  buildSubscriptionOrderDraft,
  buildSubscriptionRecord,
  buildSubscriptionRecordFromForm,
  computeNextOrderDate,
  hasDuplicateSubscription,
  readAllCommercialSubscriptions,
  subscriptionsToPrepare,
  upsertClientSubscription,
  validateSubscriptionForm,
  SUBSCRIPTION_STATUSES,
} from '../../src/utils/commercialSubscriptions.js';
import {
  buildProspectConversionPatch,
  buildProspectCreatePayload,
  buildProspectPipeline,
  isProspectClient,
  PROSPECT_STATUSES,
} from '../../src/utils/commercialProspects.js';
import { buildLineMargin, buildLowMarginOrders, buildOrderMargin } from '../../src/utils/commercialMargin.js';
import {
  buildScheduledRelanceTask,
  enrichRelancesWithSchedule,
  planRelanceForDelivery,
  planRelanceForSubscription,
  RELANCE_TASK_STATUSES,
} from '../../src/utils/commercialScheduledRelances.js';
import { buildCommercialInvestorReport } from '../../src/utils/commercialExport.js';
import { buildClientSegmentStats, resolveClientSegment, CLIENT_SEGMENTS } from '../../src/utils/commercialSegments.js';
import {
  COMMERCIAL_HEY_HORIZON_QUESTIONS,
  commercialHeyHorizonPresets,
  launchCommercialHeyHorizonQuestion,
} from '../../src/utils/commercialHeyHorizon.js';
import {
  COMMERCIAL_UNIT_GROUPS,
  formatCommercialUnit,
  normalizeCommercialUnit,
  unitLabel,
  unitsForProductType,
} from '../../src/utils/commercialUnits.js';
import { COMMERCIAL_TABS, resolveCommercialTab } from '../../src/utils/commercialNavigation.js';
import { prepareCommercialSaleCommit } from '../../src/utils/commercialSaleWorkflow.js';
import { prepareCommercialQuoteCommit, isQuoteOrder } from '../../src/utils/commercialQuoteWorkflow.js';
import { buildConsolidatedCommercialKpis } from '../../src/utils/commercialKpiConsolidated.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true };

describe('Commercial V3 — livraisons terrain', () => {
  it('statuts livraison : à préparer, en retard, livrée', () => {
    const late = resolveDeliveryStatus({ date_prevue: '2020-01-01', statut: 'a_livrer' }, {});
    assert.equal(late, DELIVERY_STATUSES.LATE);

    const delivered = resolveDeliveryStatus({ statut: 'livree', date_reelle: '2026-06-04' }, {});
    assert.equal(delivered, DELIVERY_STATUSES.DELIVERED);

    const toPrepare = resolveDeliveryStatus({ statut: 'a_preparer', date_prevue: '2099-01-01' }, {});
    assert.equal(toPrepare, DELIVERY_STATUSES.TO_PREPARE);
  });

  it('file livraisons : préparer, retard, sans preuve', () => {
    const queue = buildCommercialDeliveryQueue({
      deliveries: [
        { id: 'L1', order_id: 'CMD-1', statut: 'a_livrer', date_prevue: '2020-01-01' },
        { id: 'L2', order_id: 'CMD-2', statut: 'livree', date_reelle: '2026-06-04' },
      ],
      orders: [
        { id: 'CMD-1', client_id: 'CLI-1' },
        { id: 'CMD-2', client_id: 'CLI-2' },
      ],
      clients: [{ id: 'CLI-1', nom: 'Resto' }, { id: 'CLI-2', nom: 'Boutique' }],
    });
    assert.ok(queue.late.length >= 1);
    assert.ok(queue.delivered.length >= 1);
    assert.ok(queue.withoutProof.length >= 1);
  });

  it('livraison partielle identifiée', () => {
    assert.equal(resolveDeliveryStatus({ statut: 'partielle' }), DELIVERY_STATUSES.PARTIAL);
  });

  it('création vente enrichit champs livraison V3', () => {
    const { records } = prepareCommercialSaleCommit({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'service',
        product_name: 'Livraison test',
        quantity: 1,
        unit: 'forfait',
        unit_price: 5000,
        fulfillment_mode: 'a_livrer',
        delivery_fee: 1500,
        delivery_address: 'Dakar Plateau',
        delivery_contact: '+221771234567',
        delivery_driver: 'Amadou',
      },
      orderId: 'CMD-LIV',
      clientLabel: 'Client Livraison',
      explicitFarmId: FARM_A.id,
    });
    assert.equal(records.delivery.adresse_livraison, 'Dakar Plateau');
    assert.equal(records.delivery.contact_livraison, '+221771234567');
    assert.equal(records.delivery.livreur, 'Amadou');
    assert.equal(records.delivery.livraison_gratuite, false);
    assert.equal(records.delivery.farm_id, FARM_A.id);
  });
});

describe('Commercial V3 — preuve livraison', () => {
  it('preuve absente affiche message standard', () => {
    assert.equal(deliveryProofMessage({}), 'Preuve de livraison non ajoutée.');
  });

  it('patch preuve et détection document', () => {
    const patch = buildDeliveryProofPatch({ note: 'Signé par client', clientConfirmed: true });
    assert.equal(patch.proof_note, 'Signé par client');
    assert.equal(patch.client_confirmed, true);
    assert.equal(hasDeliveryProof(patch), true);
    assert.match(deliveryProofMessage(patch), /Signé/);
  });
});

describe('Commercial V3 — abonnements', () => {
  const client = { id: 'CLI-ABO', nom: 'Restaurant Teranga', farm_id: FARM_A.id };

  it('abonnement actif et suspendu sur client metadata', () => {
    const sub = buildSubscriptionRecord({
      client,
      productName: 'Œufs tablettes',
      quantity: 5,
      unit: 'tablette',
      frequency: 'weekly',
      unitPrice: 3000,
      farmId: FARM_A.id,
    });
    const patch = upsertClientSubscription(client, sub);
    const rows = readAllCommercialSubscriptions([{ ...client, ...patch }]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, SUBSCRIPTION_STATUSES.ACTIVE);

    const suspended = upsertClientSubscription({ ...client, ...patch }, { ...sub, status: SUBSCRIPTION_STATUSES.SUSPENDED });
    const suspendedRows = readAllCommercialSubscriptions([{ ...client, ...suspended }]);
    assert.equal(suspendedRows[0].status, SUBSCRIPTION_STATUSES.SUSPENDED);
  });

  it('génération commande depuis abonnement sans auto-commit', () => {
    const sub = buildSubscriptionRecord({ client, productName: 'Poulets', quantity: 20, unit: 'tête', frequency: 'weekly', unitPrice: 4500 });
    const draft = buildSubscriptionOrderDraft({ ...sub, clientId: client.id, clientName: client.nom, raw: sub, client }, client);
    assert.equal(draft.form_type, 'sale_record');
    assert.equal(draft.subscription_id, sub.id);
    assert.equal(draft.fulfillment_mode, 'a_livrer');
    assert.equal(draft.payment_status, 'non_paye');
  });

  it('alertes abonnements à préparer', () => {
    const sub = buildSubscriptionRecord({ client, productName: 'Œufs', quantity: 5, unit: 'tablette', frequency: 'daily', unitPrice: 3000 });
    const normalized = readAllCommercialSubscriptions([{ ...client, ...upsertClientSubscription(client, { ...sub, next_order_date: new Date().toISOString().slice(0, 10) }) }])[0];
    const due = subscriptionsToPrepare([normalized]);
    assert.equal(due.length, 1);
  });

  it('prochaine commande calculée selon fréquence', () => {
    assert.match(computeNextOrderDate({ frequency: 'weekly' }), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(computeNextOrderDate({ frequency: 'biweekly' }), /^\d{4}-\d{2}-\d{2}$/);
  });

  it('formulaire abonnement — validation et anti-doublon', () => {
    const form = {
      clientId: client.id,
      productName: 'Œufs tablettes',
      quantity: 5,
      unit: 'tablette',
      unitPrice: 3000,
      frequency: 'weekly',
      plannedDay: 'vendredi',
      startDate: '2026-06-01',
      endDate: '',
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      notes: 'Livraison matin',
    };
    assert.deepEqual(validateSubscriptionForm(form), []);
    const record = buildSubscriptionRecordFromForm(form, [client]);
    assert.equal(record.client_id, client.id);
    assert.equal(record.start_date, '2026-06-01');
    assert.equal(hasDuplicateSubscription(client, record), false);
    const patch = upsertClientSubscription(client, record);
    assert.equal(hasDuplicateSubscription({ ...client, ...patch }, record), true);
  });

  it('formulaire abonnement — champs obligatoires manquants', () => {
    const errors = validateSubscriptionForm({ clientId: '', productName: '', quantity: 0, unit: '', unitPrice: -1, frequency: '', startDate: '' });
    assert.ok(errors.length >= 4);
  });
});

describe('Commercial V3 — prospects', () => {
  it('prospect identifié via statut client', () => {
    const prospect = buildProspectCreatePayload({ name: 'Grossiste Alpha', source: 'salon', interest: 'Œufs', estimatedNeed: 100000, probability: 70, status: PROSPECT_STATUSES.HOT });
    assert.equal(prospect.statut, 'prospect');
    assert.equal(isProspectClient(prospect), true);
  });

  it('pipeline prospects chauds et convertis', () => {
    const clients = [
      buildProspectCreatePayload({ name: 'Hot', status: PROSPECT_STATUSES.HOT }),
      buildProspectCreatePayload({ name: 'Converted', status: PROSPECT_STATUSES.CONVERTED }),
    ];
    const pipeline = buildProspectPipeline(clients);
    assert.equal(pipeline.hot.length, 1);
    assert.equal(pipeline.converted.length, 1);
  });

  it('conversion prospect → client', () => {
    const patch = buildProspectConversionPatch({ toClient: true });
    assert.equal(patch.statut, 'actif');
    assert.equal(patch.is_prospect, false);
  });

  it('conversion prospect → devis prépare action', () => {
    const patch = buildProspectConversionPatch({ toQuote: true });
    assert.equal(patch.prochaine_action, 'Convertir en devis');
  });
});

describe('Commercial V3 — marge par vente', () => {
  it('marge calculable avec coût stock', () => {
    const margin = buildLineMargin({
      source_type: 'stock',
      source_id: 'STK-1',
      quantity: 10,
      unit_price: 500,
      line_total: 5000,
    }, { stocks: [{ id: 'STK-1', cout_unitaire: 300, quantite: 100 }] });
    assert.equal(margin.calculable, true);
    assert.ok(margin.margin > 0);
  });

  it('marge non calculable sans coût', () => {
    const margin = buildLineMargin({ source_type: 'service', quantity: 1, unit_price: 1000, line_total: 1000 }, {});
    assert.equal(margin.calculable, false);
    assert.equal(margin.message, 'Marge non calculable : coût non renseigné.');
  });

  it('marge commande agrégée', () => {
    const orderMargin = buildOrderMargin(
      { id: 'CMD-1', montant_total: 5000 },
      {
        orderItems: [{ order_id: 'CMD-1', source_type: 'stock', source_id: 'STK-1', quantity: 10, unit_price: 500, line_total: 5000 }],
        stocks: [{ id: 'STK-1', cout_unitaire: 300 }],
      },
    );
    assert.equal(orderMargin.calculable, true);
    assert.ok(orderMargin.marginPct != null);
  });

  it('détecte ventes à marge faible', () => {
    const low = buildLowMarginOrders(
      [{ id: 'CMD-1', montant_total: 5000 }],
      {
        orderItems: [{ order_id: 'CMD-1', source_type: 'stock', source_id: 'STK-1', quantity: 10, unit_price: 500, line_total: 5000 }],
        stocks: [{ id: 'STK-1', cout_unitaire: 480 }],
        thresholdPct: 15,
      },
    );
    assert.equal(low.length, 1);
  });
});

describe('Commercial V3 — relances planifiées', () => {
  it('crée tâche relance planifiée', () => {
    const task = buildScheduledRelanceTask({
      relance: { type: 'creance', clientName: 'Client A', clientId: 'CLI-1', amount: 5000, priority: 'Urgent', channel: 'WhatsApp', message: 'Relancer' },
      dueDate: '2026-06-10',
    });
    assert.equal(task.relance_status, RELANCE_TASK_STATUSES.PLANNED);
    assert.equal(task.due_date, '2026-06-10');
    assert.equal(task.module_lie, 'commercial');
  });

  it('enrichit relances avec tâches existantes', () => {
    const enriched = enrichRelancesWithSchedule(
      [{ clientId: 'CLI-1', orderId: 'CMD-1', type: 'creance' }],
      [{ client_id: 'CLI-1', order_id: 'CMD-1', relance_type: 'creance', due_date: '2026-06-10', relance_status: RELANCE_TASK_STATUSES.PLANNED, id: 'TSK-1' }],
    );
    assert.equal(enriched[0].scheduled, true);
    assert.equal(enriched[0].scheduledDate, '2026-06-10');
  });

  it('relance abonnement et livraison', () => {
    const abo = planRelanceForSubscription({ id: 'ABO-1', clientId: 'CLI-1', clientName: 'Resto', productName: 'Œufs', unitPrice: 3000, quantity: 5, nextOrderDate: '2026-06-05' }, { whatsapp: '+22177' });
    assert.equal(abo.type, 'abonnement');
    const liv = planRelanceForDelivery({ id: 'L1', clientId: 'CLI-1', clientName: 'Resto', orderId: 'CMD-1', plannedDate: '2026-06-05', late: true });
    assert.equal(liv.type, 'livraison');
    assert.equal(liv.priority, 'Urgent');
  });
});

describe('Commercial V3 — export investisseur', () => {
  it('synthèse commerciale complète', () => {
    const report = buildCommercialInvestorReport({
      orders: [{ id: 'CMD-1', client_id: 'CLI-1', montant_total: 50000, farm_id: FARM_A.id }],
      payments: [{ order_id: 'CMD-1', montant: 30000 }],
      clients: [{ id: 'CLI-1', nom: 'Restaurant Teranga', type_client: 'restaurant' }],
      deliveries: [{ id: 'L1', order_id: 'CMD-1', statut: 'livree' }],
      invoices: [],
      periodLabel: 'Juin 2026',
    });
    assert.match(report.summary, /CA commercial/);
    assert.ok(report.topClients.length >= 1);
    assert.ok(report.segments.length >= 1);
    assert.ok(report.kpis);
  });
});

describe('Commercial V3 — segmentation clients', () => {
  it('résout segments grossiste restaurant boutique', () => {
    assert.equal(resolveClientSegment({ type_client: 'restaurant' }).key, 'restaurant');
    assert.equal(resolveClientSegment({ type_client: 'grossiste' }).key, 'grossiste');
    assert.equal(resolveClientSegment({ type_client: 'boutique' }).key, 'boutique');
    assert.ok(CLIENT_SEGMENTS.length >= 8);
  });

  it('stats segment CA créances panier', () => {
    const stats = buildClientSegmentStats({
      clients: [{ id: 'CLI-1', type_client: 'restaurant' }],
      orders: [{ id: 'CMD-1', client_id: 'CLI-1', montant_total: 10000 }],
      payments: [],
      relanceRows: [],
    });
    const resto = stats.find((s) => s.key === 'restaurant');
    assert.ok(resto);
    assert.equal(resto.orderCount, 1);
    assert.equal(resto.ca, 10000);
  });
});

describe('Commercial V3 — unités agricoles', () => {
  it('unités œufs poulets bovins cultures', () => {
    assert.ok(unitsForProductType('lot_avicole').includes('tablette'));
    assert.ok(unitsForProductType('animal').includes('kg vif') || unitsForProductType('animal').includes('tête'));
    assert.ok(unitsForProductType('culture').includes('botte'));
    assert.ok(COMMERCIAL_UNIT_GROUPS.oeufs.includes('alvéole'));
  });

  it('format et normalisation unités', () => {
    assert.equal(formatCommercialUnit(5, 'tablette'), '5 tablette');
    assert.equal(normalizeCommercialUnit('', 'culture'), 'kg');
    assert.match(unitLabel('tablette'), /Tablette/);
  });
});

describe('Commercial V3 — navigation & Hey Horizon', () => {
  it('onglets Commercial V3 avec aliases', () => {
    assert.ok(COMMERCIAL_TABS.includes('Livraisons'));
    assert.ok(COMMERCIAL_TABS.includes('Abonnements'));
    assert.ok(COMMERCIAL_TABS.includes('Clients & créances'));
    assert.ok(COMMERCIAL_TABS.includes('Pilotage'));
    assert.equal(resolveCommercialTab('devis'), 'Ventes & commandes commercial');
    assert.equal(resolveCommercialTab('prospects'), 'Clients commercial');
    assert.equal(resolveCommercialTab('reconciliation'), 'Factures & paiements commercial');
    assert.equal(resolveCommercialTab('livraisons'), 'Livraisons commercial');
  });

  it('Hey Horizon commercial presets et navigation', () => {
    assert.ok(COMMERCIAL_HEY_HORIZON_QUESTIONS.length >= 9);
    assert.ok(commercialHeyHorizonPresets().length >= 6);
    let navigated = null;
    launchCommercialHeyHorizonQuestion({
      questionId: 'deliveries_today',
      onNavigate: (moduleId, opts) => { navigated = { moduleId, opts }; },
    });
    assert.equal(navigated.moduleId, 'commercial');
    assert.equal(navigated.opts.tab, 'Livraisons');
  });
});

describe('Commercial V3 — non-régression V1/V2', () => {
  it('V1 farm_id et stock workflow intact', () => {
    const { records } = prepareCommercialSaleCommit({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'stock',
        source_id: 'STK-1',
        product_name: 'Œufs',
        quantity: 2,
        unit: 'tablette',
        unit_price: 3000,
        payment_status: 'paye',
        fulfillment_mode: 'recupere',
      },
      orderId: 'CMD-V1',
      clientLabel: 'Client V1',
      explicitFarmId: FARM_A.id,
    });
    assert.equal(records.farmId, FARM_A.id);
    assert.equal(records.order.farm_id, FARM_A.id);
    assert.equal(records.items.length, 1);
  });

  it('V2 devis sans livraison auto', () => {
    const { records } = prepareCommercialQuoteCommit({
      form: {
        date: '2026-06-04',
        client_id: 'CLI-1',
        source_type: 'service',
        product_name: 'Devis test',
        quantity: 1,
        unit: 'forfait',
        unit_price: 10000,
      },
      clientLabel: 'Client Devis',
      explicitFarmId: FARM_A.id,
    });
    assert.equal(isQuoteOrder(records.order), true);
    assert.equal(records.delivery, null);
  });

  it('KPI consolidés V2 toujours calculables', () => {
    const kpis = buildConsolidatedCommercialKpis({
      orders: [{ id: 'CMD-1', client_id: 'CLI-1', montant_total: 10000, farm_id: FARM_A.id }],
      payments: [{ order_id: 'CMD-1', montant: 10000 }],
      clients: [{ id: 'CLI-1', nom: 'Client' }],
      deliveries: [],
      invoices: [],
    });
    assert.equal(kpis.ca, 10000);
    assert.equal(kpis.collected, 10000);
  });
});

describe('Commercial V3 — multi-fermes farm-scope', () => {
  it('livraison et abonnement portent farm_id', () => {
    const client = { id: 'CLI-F', nom: 'Ferme B client', farm_id: 'farm-b' };
    const sub = buildSubscriptionRecord({ client, productName: 'Test', quantity: 1, unit: 'kg', frequency: 'weekly', unitPrice: 1000, farmId: 'farm-b' });
    assert.equal(sub.farm_id, 'farm-b');

    const row = buildDeliveryTerrainRow({ id: 'L1', farm_id: 'farm-b', order_id: 'CMD-1' }, { order: { id: 'CMD-1', farm_id: 'farm-b' } });
    assert.equal(row.farmId, 'farm-b');
  });
});
