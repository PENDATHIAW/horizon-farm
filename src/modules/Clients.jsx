import { AlertTriangle, Download, DollarSign, Edit, Eye, FileText, Lightbulb, MapPin, MessageCircle, Phone, Plus, RefreshCw, Star, Tags, Trash2, UserRound, Users } from 'lucide-react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import ClientFicheModal from '../components/ClientFicheModal.jsx';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import VoiceSearch from '../components/VoiceSearch';
import useAutomationSettings from '../hooks/useAutomationSettings';
import useCrudModule from '../hooks/useCrudModule';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import EditModal from '../modals/EditModal';
import { buildClientSegmentation, buildClientSegment } from '../services/clientSegmentationEngine';
import { buildClientSalesSummary as buildClientSalesSummaryFromWorkflows, canDeleteClient } from '../utils/clientWorkflows';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency } from '../utils/format';
import { generateSequentialId, makeId } from '../utils/ids';
import { openWhatsAppApp } from '../utils/contactActions';
import {
  buildWhatsAppLogPayload,
  WHATSAPP_STATUSES,
  whatsAppStatusLabel,
} from '../utils/whatsappCommercial.js';
import { buildSenegalMapQuery } from '../utils/location';
import { calculateClientMetrics } from '../utils/businessCalculations';
import ClientsEvolution from './ClientsEvolution.jsx';
import ClientContactModal from './commercial/ClientContactModal.jsx';
import ClientProfileModal from './commercial/ClientProfileModal.jsx';
import { opportunitiesForClient, relanceMessageForClient } from './commercial/commercialOpportunityMatching.js';


const today = () => new Date().toISOString().slice(0, 10);
const clientPhone = (client = {}) => client.whatsapp || client.tel || client.phone || '';
const clientName = (client = {}) => client.nom || client.name || client.id || 'Client';
const clientReceivableKey = (client = {}) => `client_receivable:${client.id}`;

function SegmentBadge({ segment }) {
  const cls = segment === 'VIP / Gros acheteur' ? 'bg-positive-bg border-positive text-positive' : segment === 'Bon payeur' ? 'bg-neutral-bg border-line text-neutral' : segment === 'À relancer' ? 'bg-vigilance-bg border-vigilance text-horizon-dark' : segment === 'À risque paiement' ? 'bg-urgent-bg border-urgent text-urgent' : segment === 'Dormant' ? 'bg-neutral-bg border-line text-neutral' : 'bg-card border-line text-slate';
  return <span className={`rounded-full border px-2 py-1 text-meta font-semibold ${cls}`}>{segment}</span>;
}

function SegmentationPanel({ segmentation, onFilter }) {
  const segmentOrder = ['VIP / Gros acheteur', 'Bon payeur', 'À relancer', 'À risque paiement', 'Dormant', 'Prospect'];
  const channels = Object.entries(segmentation.byChannel || {}).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  return (
    <div className="rounded-3xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><Tags size={15} /> Segmentation & fidélisation</p>
          <h3 className="text-xl font-semibold text-earth mt-1">Qui fidéliser, qui relancer, qui qualifier ?</h3>
          <p className="text-sm text-slate mt-1">Horizon classe les clients selon CA, paiement, fréquence d’achat, canal et potentiel commercial.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[320px]">
          <Small label="VIP" value={segmentation.totals.vip} />
          <Small label="Créances" value={segmentation.totals.receivableClients} />
          <Small label="Dormants" value={segmentation.totals.dormant} />
          <Small label="Prospects" value={segmentation.totals.prospects} />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-3">
        {segmentOrder.map((segment) => {
          const items = segmentation.bySegment?.[segment] || [];
          return (
            <button key={segment} type="button" onClick={() => onFilter(segment)} className="rounded-2xl border border-line bg-card p-3 text-left hover:border-horizon">
              <SegmentBadge segment={segment} />
              <p className="mt-2 text-2xl font-semibold text-earth">{items.length}</p>
              <p className="text-xs text-slate">{items[0]?.action || 'Aucun client dans ce segment.'}</p>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth">Canaux commerciaux à travailler</p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {channels.map(([channel, items]) => <div key={channel} className="rounded-xl bg-white border border-line p-3"><p className="text-xs text-slate">{channel}</p><p className="font-semibold text-earth">{items.length} client(s)</p></div>)}
          {!channels.length ? <p className="text-sm text-slate">Aucun canal qualifié pour le moment.</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function Clients({ rows = [], loading, salesOrders = [], payments = [], opportunities = [], onCreate, onUpdate, onDelete, onRefresh, onNavigate, hideEvolution = false, embedded = false, initialFilter = 'tous', onFilterChange }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [profileClient, setProfileClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const automations = useAutomationSettings();
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const segmentation = useMemo(() => buildClientSegmentation(rows, { sales_orders: salesOrders, payments }), [rows, salesOrders, payments]);

  const salesSummaryFor = useCallback((client) => buildClientSalesSummaryFromWorkflows(client, salesOrders, payments), [salesOrders, payments]);
  const segmentFor = useCallback((client) => buildClientSegment(client, { sales_orders: salesOrders, payments }), [salesOrders, payments]);
  const metricsFor = (client) => {
    const base = calculateClientMetrics(client);
    const summary = salesSummaryFor(client);
    const segment = segmentFor(client);
    return { ...base, total: summary.totalAchete || base.total, averageBasketEstimate: summary.averageBasket || base.averageBasketEstimate, smartStatus: segment.segment, loyaltyScore: Math.max(base.loyaltyScore || 0, segment.loyaltyScore || 0), segment };
  };

  const totalCA = useMemo(() => rows.reduce((sum, client) => sum + salesSummaryFor(client).totalAchete, 0), [rows, salesSummaryFor]);
  const totalCreances = useMemo(() => rows.reduce((sum, client) => sum + salesSummaryFor(client).resteAPayer, 0), [rows, salesSummaryFor]);
  const premiumClients = useMemo(() => segmentation.bySegment['VIP / Gros acheteur'] || [], [segmentation]);
  const clientsARelancer = useMemo(() => rows.filter((client) => salesSummaryFor(client).resteAPayer > 0), [rows, salesSummaryFor]);
  const initialClient = useMemo(() => ({ id: generateSequentialId('clients', rows), statut: 'actif', score: 4, type: 'À qualifier' }), [rows]);
  const clientFields = useMemo(() => {
    const existing = MODULE_FORM_FIELDS.clients || [];
    const has = (key) => existing.some((field) => field.key === key);
    return [
      ...existing.map((field) => field.key === 'statut' ? { ...field, label: 'Statut relation', options: ['actif', 'a_jour', 'a_relancer', 'inactif', 'prospect'] } : field),
      !has('type_client') ? { key: 'type_client', label: 'Type client', type: 'select', options: ['Particulier', 'Restaurant', 'Revendeur', 'Entreprise', 'Marché', 'Autre'] } : null,
      !has('contact_principal') ? { key: 'contact_principal', label: 'Contact principal', type: 'text' } : null,
      !has('conditions_paiement') ? { key: 'conditions_paiement', label: 'Conditions paiement', type: 'select', options: ['Comptant', 'Crédit 7 jours', 'Crédit 15 jours', 'Crédit 30 jours', 'Précommande'] } : null,
      !has('delai_paiement_jours') ? { key: 'delai_paiement_jours', label: 'Délai paiement (jours)', type: 'number' } : null,
    ].filter(Boolean);
  }, []);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = rows.filter((client) => {
      const summary = salesSummaryFor(client);
      const segment = segmentFor(client);
      const statusOk = statusFilter === 'tous' || statusFilter === segment.segment || (statusFilter === 'a_relancer' ? summary.resteAPayer > 0 : ((client.statut || summary.status || 'actif') === statusFilter || summary.status === statusFilter));
      const searchOk = !query || [client.nom, client.tel, client.whatsapp, client.email, client.type, client.prefs, segment.segment, segment.channel].some((value) => String(value || '').toLowerCase().includes(query));
      return statusOk && searchOk;
    });
    if (embedded) {
      return list.sort((a, b) => (salesSummaryFor(b).resteAPayer || 0) - (salesSummaryFor(a).resteAPayer || 0));
    }
    return list;
  }, [rows, search, statusFilter, embedded, salesSummaryFor, segmentFor]);

  const setFilter = (value) => {
    setStatusFilter(value);
    onFilterChange?.(value === 'a_relancer');
  };

  useEffect(() => {
    queueMicrotask(() => setStatusFilter(initialFilter));
  }, [initialFilter]);

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate(payload); toast.success('Client ajouté'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur création client'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate(selected.id, payload); toast.success('Client modifié'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur modification client'); } finally { setSaving(false); } };
  const submitDelete = async () => { if (!selected) return; try { setSaving(true); if (!canDeleteClient(selected, salesOrders)) { toast.error('Client lié à des ventes : suppression bloquée pour garder l’historique. Passe-le en inactif si besoin.'); return; } await onDelete(selected.id); toast.success('Client supprimé'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur suppression client'); } finally { setSaving(false); } };
  const doExports = () => { const enrichedRows = filteredRows.map((client) => ({ ...client, ...metricsFor(client), ...salesSummaryFor(client), ...segmentFor(client) })); exportToCsv({ rows: enrichedRows, fileName: 'clients.csv' }); exportToExcel({ rows: enrichedRows, fileName: 'clients.xlsx', sheetName: 'Clients' }); exportToPdf({ rows: enrichedRows, title: 'Clients', fileName: 'clients.pdf' }); toast.success('Exports clients générés'); };
  const toggleAutomation = async (key) => { try { await automations.toggle(key); toast.success('Automatisation sauvegardée'); } catch (error) { toast.error(error.message || 'Sauvegarde impossible'); } };
  const messageFor = (client) => { const summary = salesSummaryFor(client); const segment = segmentFor(client); if (summary.resteAPayer > 0) return `Bonjour ${clientName(client)}, sauf erreur, il reste ${fmtCurrency(summary.resteAPayer)} à régler sur vos commandes Horizon Farm. Merci.`; if (segment.segment === 'VIP / Gros acheteur') return `Bonjour ${clientName(client)}, Horizon Farm peut vous réserver une disponibilité prioritaire. Souhaitez-vous préparer une précommande ?`; if (segment.segment === 'Dormant') return `Bonjour ${clientName(client)}, nous aimerions reprendre contact avec vous. Souhaitez-vous recevoir nos disponibilités Horizon Farm ?`; return `Bonjour ${clientName(client)}, souhaitez-vous renouveler votre commande Horizon Farm ?`; };
  const logWhatsApp = async (client, message, reason = 'relance_client', links = {}) => {
    const logId = makeId('WALOG');
    const payload = buildWhatsAppLogPayload({
      client,
      message,
      reason,
      status: WHATSAPP_STATUSES.PREPARE,
      logId,
      orderId: links.orderId || '',
      invoiceId: links.invoiceId || '',
      quoteId: links.quoteId || '',
      paymentId: links.paymentId || '',
    });
    await whatsappLogsCrud.create?.({
      ...payload,
      dedupe_key: `${clientReceivableKey(client)}:${reason}:${today()}`,
    });
    await whatsappLogsCrud.refresh?.();
    return logId;
  };
  const markWhatsAppOpened = async (logId) => {
    if (!logId) return;
    await whatsappLogsCrud.update?.(logId, {
      status: WHATSAPP_STATUSES.OPENED,
      opened_at: new Date().toISOString(),
      delivery_confirmed: false,
      api_confirmed: false,
    });
    await whatsappLogsCrud.refresh?.();
  };
  const markWhatsAppSent = async (logId) => {
    if (!logId) return;
    await whatsappLogsCrud.update?.(logId, {
      status: WHATSAPP_STATUSES.SENT_MANUAL,
      manual_send_confirmed: true,
      sent_confirmed_at: new Date().toISOString(),
      delivery_confirmed: false,
      api_confirmed: false,
    });
    await whatsappLogsCrud.refresh?.();
    toast.success(`WhatsApp marqué : ${whatsAppStatusLabel(WHATSAPP_STATUSES.SENT_MANUAL)}`);
  };
  const openWhatsApp = async (client) => {
    const message = messageFor(client);
    let logId = '';
    try {
      logId = await logWhatsApp(client, message, salesSummaryFor(client).resteAPayer > 0 ? 'relance_creance' : 'relance_renouvellement');
    } catch (error) { console.warn(error.message); }
    try {
      await openWhatsAppApp({ phone: clientPhone(client), message, fallbackWeb: true });
      await markWhatsAppOpened(logId);
    } catch (error) {
      console.warn(error.message);
    }
  };
  const openContact = (client, message, title = 'Contacter le client') => setContactModal({ client, message, title });
  const openProfile = (client) => setProfileClient(client);
  const matchedOppsFor = (client) => opportunitiesForClient(client, opportunities, salesOrders, 50);
  const proposeOpportunity = (client, opportunity, message) => openContact(client, message, `Proposer — ${clientName(client)}`);
  const relanceCreance = (client) => {
    const summary = salesSummaryFor(client);
    openContact(client, relanceMessageForClient(client, summary), summary.resteAPayer > 0 ? 'Relancer — créance' : 'Relancer le client');
  };
  const openMaps = (client) => { const query = encodeURIComponent(buildSenegalMapQuery(client, 'client Dakar Senegal')); window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer'); };

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-6'}>
      {!embedded ? <SectionHeader title="Clients & Fidélisation" sub="Segmentation, ventes, paiements, relances WhatsApp et potentiel commercial" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefresh?.(); toast.success('Clients actualisés'); }}>Refresh</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau client</Btn></>} /> : null}
      {!embedded ? <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><KpiCard icon={Users} label="Total clients" value={rows.length} color="bg-neutral text-neutral" /><KpiCard icon={DollarSign} label="CA clients" value={fmtCurrency(totalCA)} color="bg-positive text-positive" /><KpiCard icon={DollarSign} label="Créances" value={fmtCurrency(totalCreances)} color="bg-urgent text-urgent" /><KpiCard icon={Star} label="VIP / Gros acheteurs" value={premiumClients.length} color="bg-vigilance text-horizon-dark" /><KpiCard icon={MessageCircle} label="À relancer" value={clientsARelancer.length} color="bg-positive/20 text-positive" /></div> : null}
      {!embedded ? <SegmentationPanel segmentation={segmentation} onFilter={setFilter} /> : null}
      {!hideEvolution ? <ClientsEvolution rows={rows} salesOrders={salesOrders} payments={payments} onNavigate={onNavigate} /> : null}
      {!embedded ? (
        <div className="bg-pure border border-line rounded-2xl p-6"><p className="font-semibold text-earth mb-4 flex items-center gap-2"><MessageCircle size={16} className="text-positive" />Automatisations WhatsApp</p><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{automations.settings.map((setting) => <button key={setting.key} type="button" onClick={() => toggleAutomation(setting.key)} disabled={automations.loading} className={`p-4 rounded-xl border text-left transition-all ${setting.enabled ? 'bg-positive/10 border-positive/30' : 'bg-card border-line'}`}><div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-earth">{setting.label}</span><span className={`w-8 h-4 rounded-full flex items-center ${setting.enabled ? 'bg-positive justify-end' : 'bg-line justify-start'} px-1`}><span className="w-3 h-3 rounded-full bg-white" /></span></div><p className="text-xs text-slate">{setting.description}</p></button>)}</div></div>
      ) : null}
      <div className="flex flex-wrap gap-2 items-center">
        <VoiceSearch value={search} onChange={setSearch} placeholder={embedded ? 'Rechercher un client…' : 'Rechercher client, segment ou canal...'} />
        {embedded ? (
          <>
            {['tous', 'a_relancer', 'VIP / Gros acheteur'].map((status) => (
              <button key={status} type="button" onClick={() => setFilter(status)} className={`min-h-[40px] rounded-xl px-3 py-2 text-xs font-semibold ${statusFilter === status ? 'bg-earth text-white' : 'border border-line bg-white text-slate'}`}>
                {status === 'a_relancer' ? 'Créances' : status === 'tous' ? 'Tous' : 'VIP'}
              </button>
            ))}
            <Btn icon={Plus} small onClick={() => setModal('create')} className="ml-auto">Nouveau</Btn>
            <Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefresh?.(); toast.success('Clients actualisés'); }} />
          </>
        ) : (
          ['tous', 'VIP / Gros acheteur', 'Bon payeur', 'À relancer', 'À risque paiement', 'Dormant', 'Prospect'].map((status) => (
            <button key={status} type="button" onClick={() => setFilter(status)} className={`px-3 py-2 rounded-lg text-sm ${statusFilter === status ? 'bg-positive text-ink font-semibold' : 'bg-pure border border-line text-slate'}`}>{status}</button>
          ))
        )}
      </div>
      {embedded ? (
        <div className="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 border-b border-line bg-card animate-pulse" />) : filteredRows.length ? filteredRows.map((client) => {
            const summary = salesSummaryFor(client);
            const segment = segmentFor(client);
            const hasDebt = summary.resteAPayer > 0;
            const matchedOpps = matchedOppsFor(client);
            return (
              <div key={client.id} className={`flex flex-col gap-2 border-b border-line/70 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${hasDebt ? 'bg-vigilance-bg' : matchedOpps.length ? 'bg-positive-bg' : ''}`}>
                <button type="button" onClick={() => openProfile(client)} className="flex min-w-0 items-center gap-3 text-left">
                  {client.photo_url ? <img src={client.photo_url} alt={client.nom} className="h-9 w-9 rounded-full object-cover border border-line" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral text-sm font-semibold text-neutral">{client.nom?.[0] || 'C'}</div>}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-earth">{client.nom}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <SegmentBadge segment={segment.segment} />
                      {segment.isDueForReorder ? <span className="rounded-full bg-neutral-bg px-2 py-1 text-meta font-semibold text-neutral">À renouveler</span> : null}
                      {segment.frequencyLabel && segment.frequencyLabel !== 'Prospect' ? <span className="rounded-full bg-vigilance-bg px-2 py-1 text-meta font-semibold text-horizon-dark">{segment.frequencyLabel}</span> : null}
                      {matchedOpps.length ? <span className="rounded-full bg-positive-bg px-2 py-1 text-meta font-semibold text-positive"><Lightbulb size={10} className="inline" /> {matchedOpps.length} opp.</span> : null}
                      {client.tel ? <span className="text-meta text-slate">{client.tel}</span> : null}
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-right">
                    {hasDebt ? (
                      <>
                        <p className="text-lg font-semibold text-horizon-dark">{fmtCurrency(summary.resteAPayer)}</p>
                        <p className="text-meta font-semibold uppercase text-horizon-dark">À encaisser</p>
                      </>
                    ) : (
                      <p className="text-xs font-semibold text-positive">À jour</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1 justify-end">
                    <Btn variant="amber" small icon={MessageCircle} onClick={() => relanceCreance(client)}>Relancer</Btn>
                    <Btn variant="outline" small icon={UserRound} onClick={() => openProfile(client)} />
                    <Btn variant="outline" small icon={Edit} onClick={() => { setSelected(client); setModal('edit'); }} />
                    <Btn variant="outline" small icon={Trash2} onClick={() => { setSelected(client); setModal('delete'); }} />
                  </div>
                </div>
              </div>
            );
          }) : (
            <p className="px-4 py-8 text-center text-sm text-slate">Aucun client ne correspond à ce filtre.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="bg-pure border border-line rounded-2xl p-6"><div className="h-20 bg-line/60 animate-pulse rounded" /></div>) : filteredRows.map((client) => {  const summary = salesSummaryFor(client); const segment = segmentFor(client); return <div key={client.id} className="bg-pure border border-line rounded-2xl p-6 hover:border-horizon transition-all"><div className="flex items-start justify-between mb-3 gap-3"><div className="flex items-center gap-3">{client.photo_url ? <img src={client.photo_url} alt={client.nom} className="w-10 h-10 rounded-full object-cover border border-line" /> : <div className="w-10 h-10 rounded-full bg-neutral flex items-center justify-center text-neutral font-semibold">{client.nom?.[0] || 'C'}</div>}<div><p className="font-semibold text-earth">{client.nom}</p><p className="text-xs text-slate">{segment.channel} · {client.prefs || 'besoin à qualifier'}</p></div></div><div className="text-right space-y-1"><SegmentBadge segment={segment.segment} /><div className="flex items-center justify-end gap-1 text-horizon-dark"><Star size={12} fill="currentColor" /><span className="text-sm font-semibold">{segment.loyaltyScore}%</span></div></div></div><div className="grid grid-cols-2 gap-3 mb-4"><CardMetric label="CA ventes" value={fmtCurrency(summary.totalAchete)} /><CardMetric label="Payé" value={fmtCurrency(summary.totalPaye)} /><CardMetric label="Commandes" value={summary.orders.length} /><CardMetric label="Reste à payer" value={fmtCurrency(summary.resteAPayer)} alert={summary.resteAPayer > 0} /><CardMetric label="Panier moyen" value={fmtCurrency(segment.averageBasket)} /><CardMetric label="Paiement" value={`${segment.paymentRate}%`} /></div><div className="rounded-xl bg-card border border-line p-3 mb-3"><p className="text-xs font-semibold text-earth">Action fidélisation</p><p className="text-xs text-slate mt-1">{segment.action}</p></div><div className="flex items-center gap-2 text-sm text-slate mb-3"><Phone size={12} />{client.tel}</div><div className="flex gap-2 flex-wrap"><Btn variant="outline" small icon={Eye} onClick={() => { setSelected(client); setModal('details'); }}>Fiche</Btn><Btn variant="outline" small icon={Phone} onClick={() => window.open(`tel:${client.tel}`)}>Appeler</Btn><Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openWhatsApp(client)}>WhatsApp</Btn>{summary.resteAPayer > 0 ? <Btn variant="amber" small icon={FileText} onClick={() => relanceCreance(client)}>Relancer</Btn> : null}<Btn variant="outline" small icon={MapPin} onClick={() => openMaps(client)}>Itinéraire</Btn><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(client); setModal('edit'); }} /><ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(client); setModal('delete'); }} /></div></div>; })}</div>
      )}
      <ClientFicheModal open={modal === 'details'} onClose={() => setModal(null)} client={selected} metrics={selected ? metricsFor(selected) : {}} salesSummary={selected ? salesSummaryFor(selected) : {}} segment={selected ? segmentFor(selected) : {}} />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={clientFields} initialValues={initialClient} autoId={() => generateSequentialId('clients', rows)} uploadFolder="clients" loading={saving} title="Ajouter client" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={clientFields} initialValues={selected || {}} uploadFolder="clients" loading={saving} title="Modifier client" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />
      <ClientContactModal
        open={Boolean(contactModal)}
        onClose={() => setContactModal(null)}
        client={contactModal?.client}
        title={contactModal?.title}
        defaultMessage={contactModal?.message || ''}
        onWhatsAppLog={async (client, message) => logWhatsApp(client, message, salesSummaryFor(client).resteAPayer > 0 ? 'relance_creance' : 'relance_renouvellement')}
        onWhatsAppOpened={markWhatsAppOpened}
        onMarkWhatsAppSent={markWhatsAppSent}
      />
      <ClientProfileModal
        open={Boolean(profileClient)}
        onClose={() => setProfileClient(null)}
        client={profileClient}
        segment={profileClient ? segmentFor(profileClient) : {}}
        summary={profileClient ? salesSummaryFor(profileClient) : {}}
        matchedOpportunities={profileClient ? matchedOppsFor(profileClient) : []}
        onEdit={(client) => { setSelected(client); setModal('edit'); setProfileClient(null); }}
        onDelete={(client) => { setSelected(client); setModal('delete'); setProfileClient(null); }}
        onContact={(client, mode) => {
          if (mode === 'call') {
            const phone = clientPhone(client);
            if (!phone) return toast.error('Numéro manquant');
            window.open(`tel:${phone}`, '_self');
            return;
          }
          openContact(client, messageFor(client), 'Contacter le client');
        }}
        onProposeOpportunity={proposeOpportunity}
      />
    </div>
  );
}

function Small({ label, value }) { return <div className="rounded-xl border border-line bg-card p-2"><p className="text-meta text-slate">{label}</p><p className="font-semibold text-earth">{value}</p></div>; }
function CardMetric({ label, value, alert = false }) { return <div className="bg-card rounded-lg p-3"><div className="text-xs text-slate">{label}</div><div className={`font-semibold text-sm ${alert ? 'text-urgent' : 'text-earth'}`}>{value}</div></div>; }
