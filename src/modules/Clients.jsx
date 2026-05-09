import { AlertTriangle, Download, DollarSign, Edit, Eye, FileText, MapPin, MessageCircle, Phone, Plus, RefreshCw, Star, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import VoiceSearch from '../components/VoiceSearch';
import useAutomationSettings from '../hooks/useAutomationSettings';
import useCrudModule from '../hooks/useCrudModule';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency } from '../utils/format';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { buildSenegalMapQuery } from '../utils/location';
import { calculateClientMetrics } from '../utils/businessCalculations';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const amountOf = (row = {}) => Number(row.montant_total ?? row.total_amount ?? row.total ?? row.amount ?? 0);
const paidOf = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0);
const paymentAmount = (row = {}) => Number(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const paymentOrderId = (row = {}) => row.order_id || row.sale_id || row.source_record_id || row.related_id;
const clientPhone = (client = {}) => client.whatsapp || client.tel || client.phone || '';
const clientName = (client = {}) => client.nom || client.name || client.id || 'Client';
const clientReceivableKey = (client = {}) => `client_receivable:${client.id}`;
const isCancelled = (row = {}) => ['annule', 'annulé', 'cancelled'].includes(String(row.statut || row.status || row.statut_commande || '').toLowerCase());
const validPayment = (payment = {}) => !['annule', 'annulé', 'cancelled', 'rejete', 'rejeté'].includes(String(payment.statut || payment.status || 'paye').toLowerCase());
const isClosed = (row = {}) => ['termine', 'terminé', 'closed', 'done', 'annule', 'annulé', 'inactive', 'resolu', 'résolu'].includes(String(row.status || row.statut || '').toLowerCase());

function buildClientSalesSummary(client, salesOrders = [], payments = []) {
  const orders = arr(salesOrders).filter((order) => String(order.client_id || '') === String(client.id || '') && !isCancelled(order));
  const orderIds = new Set(orders.map((order) => String(order.id)));
  const clientPayments = arr(payments)
    .filter(validPayment)
    .filter((payment) => orderIds.has(String(paymentOrderId(payment) || '')) || String(payment.client_id || '') === String(client.id || ''));
  const paidByOrder = clientPayments.reduce((acc, payment) => {
    const id = String(paymentOrderId(payment) || 'direct');
    acc[id] = (acc[id] || 0) + paymentAmount(payment);
    return acc;
  }, {});
  const directClientPayments = clientPayments
    .filter((payment) => !paymentOrderId(payment))
    .reduce((sum, payment) => sum + paymentAmount(payment), 0);
  let directRemainder = directClientPayments;
  const enrichedOrders = orders.map((order) => {
    const total = amountOf(order);
    const paidRecorded = paidOf(order);
    const paidLinked = paidByOrder[String(order.id)] || 0;
    const paidFromDirect = Math.min(Math.max(0, total - Math.max(paidRecorded, paidLinked)), directRemainder);
    directRemainder -= paidFromDirect;
    const paid = Math.min(total, Math.max(paidRecorded, paidLinked) + paidFromDirect);
    const remaining = Math.max(0, total - paid);
    const paymentStatus = total > 0 && remaining <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye';
    return { ...order, total, paid, remaining, paymentStatus };
  });
  const totalAchete = enrichedOrders.reduce((sum, order) => sum + order.total, 0);
  const totalPaye = Math.min(totalAchete, enrichedOrders.reduce((sum, order) => sum + order.paid, 0));
  const resteAPayer = enrichedOrders.reduce((sum, order) => sum + order.remaining, 0);
  const openOrders = enrichedOrders.filter((order) => order.remaining > 0 && String(order.statut_commande || '') !== 'annule');
  const lastOrder = [...enrichedOrders].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))[0];
  const averageBasket = enrichedOrders.length ? totalAchete / enrichedOrders.length : 0;
  const status = resteAPayer > 0 ? 'a_relancer' : totalAchete > 0 ? 'actif' : (client.statut === 'a_relancer' ? 'prospect' : (client.statut || 'prospect'));
  return { orders: enrichedOrders, openOrders, clientPayments, totalAchete, totalPaye, resteAPayer, averageBasket, derniereCommandeVente: lastOrder?.date || lastOrder?.created_at || null, status };
}

export default function Clients({ rows = [], loading, salesOrders = [], payments = [], onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const automations = useAutomationSettings();
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const alertesCrud = useCrudModule('alertes_center');
  const tachesCrud = useCrudModule('taches');

  const salesSummaryFor = (client) => buildClientSalesSummary(client, salesOrders, payments);
  const metricsFor = (client) => {
    const base = calculateClientMetrics(client);
    const summary = salesSummaryFor(client);
    return {
      ...base,
      total: summary.totalAchete || base.total,
      averageBasketEstimate: summary.averageBasket || base.averageBasketEstimate,
      smartStatus: summary.resteAPayer > 0 ? 'a_relancer' : summary.totalAchete > 0 ? 'actif' : (base.smartStatus === 'a_relancer' ? 'prospect' : base.smartStatus),
      loyaltyScore: Math.max(base.loyaltyScore || 0, summary.totalAchete > 0 ? Math.min(100, 50 + summary.orders.length * 8) : 0),
    };
  };

  const totalCA = useMemo(() => rows.reduce((sum, client) => sum + salesSummaryFor(client).totalAchete, 0), [rows, salesOrders, payments]);
  const totalCreances = useMemo(() => rows.reduce((sum, client) => sum + salesSummaryFor(client).resteAPayer, 0), [rows, salesOrders, payments]);
  const premiumClients = useMemo(() => rows.filter((client) => metricsFor(client).smartStatus === 'VIP' || metricsFor(client).loyaltyScore >= 88), [rows, salesOrders, payments]);
  const clientsARelancer = useMemo(() => rows.filter((client) => salesSummaryFor(client).resteAPayer > 0), [rows, salesOrders, payments]);
  const initialClient = useMemo(() => ({ id: generateSequentialId('clients', rows), statut: 'actif', score: 4 }), [rows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((client) => {
      const summary = salesSummaryFor(client);
      const smartStatus = metricsFor(client).smartStatus;
      const statusOk = statusFilter === 'tous' || (statusFilter === 'a_relancer' ? summary.resteAPayer > 0 : ((client.statut || smartStatus || 'actif') === statusFilter || smartStatus === statusFilter || summary.status === statusFilter));
      const searchOk = !query || [client.nom, client.tel, client.whatsapp, client.email, client.type, client.prefs].some((value) => String(value || '').toLowerCase().includes(query));
      return statusOk && searchOk;
    });
  }, [rows, search, statusFilter, salesOrders, payments]);

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate(payload); toast.success('Client ajouté'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur création client'); }
    finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate(selected.id, payload); toast.success('Client modifié'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur modification client'); }
    finally { setSaving(false); }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete(selected.id); toast.success('Client supprimé'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression client'); }
    finally { setSaving(false); }
  };

  const doExports = () => {
    const enrichedRows = filteredRows.map((client) => ({ ...client, ...metricsFor(client), ...salesSummaryFor(client) }));
    exportToCsv({ rows: enrichedRows, fileName: 'clients.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'clients.xlsx', sheetName: 'Clients' });
    exportToPdf({ rows: enrichedRows, title: 'Clients', fileName: 'clients.pdf' });
    toast.success('Exports clients générés');
  };

  const toggleAutomation = async (key) => {
    try { await automations.toggle(key); toast.success('Automatisation sauvegardée'); }
    catch (error) { toast.error(error.message || 'Sauvegarde impossible'); }
  };

  const messageFor = (client) => {
    const summary = salesSummaryFor(client);
    if (summary.resteAPayer > 0) return `Bonjour ${clientName(client)}, sauf erreur, il reste ${fmtCurrency(summary.resteAPayer)} à régler sur vos commandes Horizon Farm. Merci.`;
    return `Bonjour ${clientName(client)}, souhaitez-vous renouveler votre commande Horizon Farm ?`;
  };

  const logWhatsApp = async (client, message, reason = 'relance_client') => {
    await whatsappLogsCrud.create?.({ id: makeId('WALOG'), client_id: client.id, recipient: clientPhone(client), message, status: 'prepare', provider: 'whatsapp', reason, sent_at: new Date().toISOString(), dedupe_key: `${clientReceivableKey(client)}:${reason}:${today()}` });
    await whatsappLogsCrud.refresh?.();
  };

  const openWhatsApp = async (client) => {
    const message = messageFor(client);
    try { await logWhatsApp(client, message, salesSummaryFor(client).resteAPayer > 0 ? 'relance_creance' : 'relance_renouvellement'); }
    catch (error) { console.warn(error.message); }
    window.open(toWhatsappLink(clientPhone(client), message), '_blank', 'noopener,noreferrer');
  };

  const relanceAlreadyOpen = (client) => {
    const key = clientReceivableKey(client);
    const hasAlert = arr(alertesCrud.rows).some((alert) => !isClosed(alert) && (alert.alert_dedupe_key === key || (alert.module_source === 'clients' && alert.entity_id === client.id)));
    const hasTask = arr(tachesCrud.rows).some((task) => !isClosed(task) && (task.task_dedupe_key === key || task.action_key === key || (task.source_module === 'clients' && task.related_id === client.id)));
    return hasAlert || hasTask;
  };

  const relanceCreance = async (client) => {
    const summary = salesSummaryFor(client);
    if (summary.resteAPayer <= 0) return toast.success('Aucune créance à relancer');
    if (relanceAlreadyOpen(client)) return toast.success('Relance déjà en suivi pour ce client');
    const message = messageFor(client);
    const key = clientReceivableKey(client);
    try {
      await logWhatsApp(client, message, 'relance_creance');
      const taskId = makeId('TSK');
      await alertesCrud.create?.({ id: makeId('ALT'), title: `Créance client: ${clientName(client)}`, message: `${fmtCurrency(summary.resteAPayer)} à encaisser`, module_source: 'clients', entity_type: 'client', entity_id: client.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Relancer le client et enregistrer le paiement.', alert_dedupe_key: key, linked_task_id: taskId });
      await tachesCrud.create?.({ id: taskId, title: `Relancer ${clientName(client)}`, module_lie: 'clients', related_id: client.id, due_date: today(), priority: 'haute', status: 'a_faire', source_module: 'clients', task_dedupe_key: key, action_key: key, notes: message });
      await Promise.allSettled([alertesCrud.refresh?.(), tachesCrud.refresh?.()]);
      window.open(toWhatsappLink(clientPhone(client), message), '_blank', 'noopener,noreferrer');
      toast.success('Relance préparée');
    } catch (error) {
      toast.error(error.message || 'Relance impossible');
    }
  };

  const openMaps = (client) => {
    const query = encodeURIComponent(buildSenegalMapQuery(client, 'client Dakar Senegal'));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Clients & WhatsApp"
        sub="Clients, ventes, paiements et relances"
        actions={<><Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefresh?.(); toast.success('Clients actualisés'); }}>Refresh</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau client</Btn></>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Total clients" value={rows.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={DollarSign} label="CA clients" value={fmtCurrency(totalCA)} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={DollarSign} label="Créances" value={fmtCurrency(totalCreances)} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={Star} label="Clients premium" value={premiumClients.length} color="bg-amber-500/20 text-amber-400" />
        <KpiCard icon={MessageCircle} label="À relancer" value={clientsARelancer.length} color="bg-[#25D366]/20 text-[#25D366]" />
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><MessageCircle size={16} className="text-[#25D366]" />Automatisations WhatsApp</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {automations.settings.map((setting) => (
            <button key={setting.key} type="button" onClick={() => toggleAutomation(setting.key)} disabled={automations.loading} className={`p-4 rounded-xl border text-left transition-all ${setting.enabled ? 'bg-[#25D366]/10 border-[#25D366]/30' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
              <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-[#2f2415]">{setting.label}</span><span className={`w-8 h-4 rounded-full flex items-center ${setting.enabled ? 'bg-[#25D366] justify-end' : 'bg-[#d6c3a0] justify-start'} px-0.5`}><span className="w-3 h-3 rounded-full bg-white" /></span></div>
              <p className="text-xs text-[#8a7456]">{setting.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <VoiceSearch value={search} onChange={setSearch} placeholder="Rechercher client..." />
        {['tous', 'actif', 'inactif', 'VIP', 'a_relancer'].map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm ${statusFilter === status ? 'bg-emerald-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456]'}`}>{status}</button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><div className="h-20 bg-[#d6c3a0]/60 animate-pulse rounded" /></div>) : filteredRows.map((client) => {
          const metrics = metricsFor(client);
          const summary = salesSummaryFor(client);
          return (
            <div key={client.id} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5 hover:border-[#b6975f] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {client.photo_url ? <img src={client.photo_url} alt={client.nom} className="w-10 h-10 rounded-full object-cover border border-[#d6c3a0]" /> : <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold">{client.nom?.[0] || 'C'}</div>}
                  <div><p className="font-bold text-[#2f2415]">{client.nom}</p><p className="text-xs text-[#8a7456]">{client.type} - {client.prefs}</p></div>
                </div>
                <div className="flex items-center gap-1 text-amber-400"><Star size={12} fill="currentColor" /><span className="text-sm font-semibold">{metrics.loyaltyScore.toFixed(0)}%</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <CardMetric label="CA ventes" value={fmtCurrency(summary.totalAchete)} />
                <CardMetric label="Payé" value={fmtCurrency(summary.totalPaye)} />
                <CardMetric label="Commandes" value={summary.orders.length} />
                <CardMetric label="Reste à payer" value={fmtCurrency(summary.resteAPayer)} alert={summary.resteAPayer > 0} />
                <CardMetric label="Dernière commande" value={summary.derniereCommandeVente || client.derniereCommande || client.dernierecommande || '-'} />
                <CardMetric label="Statut" value={metrics.smartStatus} />
              </div>
              <div className="flex items-center gap-2 text-sm text-[#7d6a4a] mb-3"><Phone size={12} />{client.tel}</div>
              <div className="flex gap-2 flex-wrap">
                <Btn variant="outline" small icon={Eye} onClick={() => { setSelected(client); setModal('details'); }}>Fiche</Btn>
                <Btn variant="outline" small icon={Phone} onClick={() => window.open(`tel:${client.tel}`)}>Appeler</Btn>
                <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openWhatsApp(client)}>WhatsApp</Btn>
                {summary.resteAPayer > 0 ? <Btn variant="amber" small icon={FileText} onClick={() => relanceCreance(client)}>Relancer</Btn> : null}
                <Btn variant="outline" small icon={MapPin} onClick={() => openMaps(client)}>Itinéraire</Btn>
                <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(client); setModal('edit'); }} />
                <ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(client); setModal('delete'); }} />
              </div>
            </div>
          );
        })}
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...metricsFor(selected), commandes_erp: salesSummaryFor(selected).orders.length, commandes_ouvertes: salesSummaryFor(selected).openOrders.length, total_achete_ventes: salesSummaryFor(selected).totalAchete, total_paye_ventes: salesSummaryFor(selected).totalPaye, reste_a_payer_ventes: salesSummaryFor(selected).resteAPayer, derniere_commande_vente: salesSummaryFor(selected).derniereCommandeVente || '-', paiements_enregistres: salesSummaryFor(selected).clientPayments.length } : selected} title="Fiche client" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.clients} initialValues={initialClient} autoId={() => generateSequentialId('clients', rows)} uploadFolder="clients" loading={saving} title="Ajouter client" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.clients} initialValues={selected || {}} uploadFolder="clients" loading={saving} title="Modifier client" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />
    </div>
  );
}

function CardMetric({ label, value, alert = false }) {
  return <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">{label}</div><div className={`font-semibold text-sm ${alert ? 'text-red-500' : 'text-[#2f2415]'}`}>{value}</div></div>;
}
