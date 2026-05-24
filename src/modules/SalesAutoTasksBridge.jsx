import { useEffect, useMemo, useRef } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const num = (value = 0) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const totalOf = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant);
const paidOf = (row = {}) => num(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const paymentOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
const paidFromPayments = (order, payments = []) => arr(payments).filter((p) => paymentOrderId(p) === clean(order.id)).reduce((sum, p) => sum + num(p.montant_paye ?? p.montant ?? p.amount ?? p.paid_amount), 0);
const isClosedTask = (task = {}) => ['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(lower(task.status || task.statut));
const taskExists = (tasks, key) => arr(tasks).some((task) => !isClosedTask(task) && clean(task.routine_key) === key);
const isDelivered = (order = {}, deliveries = []) => ['livre', 'livré', 'recupere', 'récupéré'].includes(lower(order.statut_livraison || order.delivery_status || order.fulfillment_mode)) || arr(deliveries).some((delivery) => clean(delivery.order_id || delivery.sale_id || delivery.source_record_id || delivery.related_id) === clean(order.id) && ['livre', 'livré', 'done'].includes(lower(delivery.statut || delivery.status)));
const clientLabel = (order = {}) => clean(order.client_label || order.client_name || order.client || order.customer_name || order.client_id || 'Client');

function buildTasks({ orders = [], payments = [], deliveries = [], tasks = [] }) {
  const suggestions = [];
  arr(orders).forEach((order) => {
    const id = clean(order.id);
    if (!id) return;
    const total = totalOf(order);
    const paid = Math.max(paidOf(order), paidFromPayments(order, payments));
    const remaining = Math.max(0, total - paid);
    const product = clean(order.product_name || order.produit || order.libelle || order.source_label || 'vente');
    if (remaining > 0) {
      const key = `relance-credit-${id}`;
      if (!taskExists(tasks, key)) suggestions.push({ key, title: `Relancer paiement ${id}`, module_lie: 'ventes', due_date: inDays(2), priority: 'haute', notes: `${clientLabel(order)} · ${product} · reste à payer ${remaining.toLocaleString('fr-FR')} FCFA.`, source_record_id: id });
    }
    if (!isDelivered(order, deliveries) && !['annule', 'annulé'].includes(lower(order.statut_commande || order.order_status || order.status))) {
      const key = `livraison-vente-${id}`;
      if (!taskExists(tasks, key)) suggestions.push({ key, title: `Préparer livraison ${id}`, module_lie: 'ventes', due_date: today(), priority: 'haute', notes: `${clientLabel(order)} · ${product} · confirmer quantité, adresse, facture/reçu et remise client.`, source_record_id: id });
    }
  });
  return suggestions;
}

export default function SalesAutoTasksBridge({ orders = [], payments = [], deliveries = [] }) {
  const tasksCrud = useCrudModule('taches');
  const createdRef = useRef(new Set());
  const suggestions = useMemo(() => buildTasks({ orders, payments, deliveries, tasks: tasksCrud.rows || [] }), [orders, payments, deliveries, tasksCrud.rows]);

  useEffect(() => {
    if (!suggestions.length || !tasksCrud.create) return;
    let cancelled = false;
    async function run() {
      for (const suggestion of suggestions.slice(0, 5)) {
        if (cancelled || createdRef.current.has(suggestion.key)) continue;
        createdRef.current.add(suggestion.key);
        await tasksCrud.create({ id: makeId('TSK'), title: suggestion.title, module_lie: suggestion.module_lie, source_module: 'ventes', source_record_id: suggestion.source_record_id, routine_key: suggestion.key, due_date: suggestion.due_date, priority: suggestion.priority, status: 'a_faire', notes: suggestion.notes, created_from: 'vente_automatique' });
      }
      await tasksCrud.refresh?.();
    }
    run().catch(() => {});
    return () => { cancelled = true; };
  }, [suggestions, tasksCrud]);

  return null;
}
