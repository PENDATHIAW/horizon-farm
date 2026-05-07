import { AlertTriangle, Download, DollarSign, Edit, Eye, FileText, MapPin, MessageCircle, Phone, Plus, RefreshCw, Star, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import VoiceSearch from '../components/VoiceSearch';
import useAutomationSettings from '../hooks/useAutomationSettings';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency } from '../utils/format';
import { generateSequentialId, toWhatsappLink } from '../utils/ids';
import { buildSenegalMapQuery } from '../utils/location';
import { calculateClientMetrics } from '../utils/businessCalculations';

export default function Clients({ rows = [], loading, salesOrders = [], payments = [], onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const automations = useAutomationSettings();

  const metricsFor = (client) => calculateClientMetrics(client);
  const salesSummaryFor = (client) => {
    const orders = salesOrders.filter((order) => order.client_id === client.id);
    const orderIds = new Set(orders.map((order) => order.id));
    const clientPayments = payments.filter((payment) => orderIds.has(payment.order_id));
    const totalAchete = orders.reduce((sum, order) => sum + Number(order.montant_total || 0), 0);
    const totalPaye = orders.reduce((sum, order) => sum + Number(order.montant_paye || 0), 0) || clientPayments.reduce((sum, payment) => sum + Number(payment.montant || 0), 0);
    const resteAPayer = orders.reduce((sum, order) => sum + Number(order.reste_a_payer || 0), 0);
    const lastOrder = [...orders].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    return { orders, clientPayments, totalAchete, totalPaye, resteAPayer, derniereCommandeVente: lastOrder?.date || null };
  };
  const totalCA = useMemo(() => rows.reduce((sum, client) => sum + calculateClientMetrics(client).total, 0), [rows]);
  const premiumClients = useMemo(() => rows.filter((client) => calculateClientMetrics(client).smartStatus === 'VIP' || calculateClientMetrics(client).loyaltyScore >= 88), [rows]);
  const clientsARelancer = useMemo(() => rows.filter((client) => calculateClientMetrics(client).smartStatus === 'a_relancer'), [rows]);
  const initialClient = useMemo(() => ({ id: generateSequentialId('clients', rows), statut: 'actif', score: 4 }), [rows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((client) => {
      const smartStatus = calculateClientMetrics(client).smartStatus;
      const statusOk = statusFilter === 'tous' || (client.statut || smartStatus || 'actif') === statusFilter || smartStatus === statusFilter;
      const searchOk = !query || [client.nom, client.tel, client.whatsapp, client.email, client.type, client.prefs].some((value) => String(value || '').toLowerCase().includes(query));
      return statusOk && searchOk;
    });
  }, [rows, search, statusFilter]);

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate(payload);
      toast.success('Client ajoute');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur creation client');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate(selected.id, payload);
      toast.success('Client modifie');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification client');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Client supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression client');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    const enrichedRows = filteredRows.map((client) => ({ ...client, ...metricsFor(client) }));
    exportToCsv({ rows: enrichedRows, fileName: 'clients.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'clients.xlsx', sheetName: 'Clients' });
    exportToPdf({ rows: enrichedRows, title: 'Clients', fileName: 'clients.pdf' });
    toast.success('Exports clients generes');
  };

  const toggleAutomation = async (key) => {
    try {
      await automations.toggle(key);
      toast.success('Automatisation sauvegardee');
    } catch (error) {
      toast.error(error.message || 'Sauvegarde impossible');
    }
  };

  const openWhatsApp = (client) => {
    const url = toWhatsappLink(client.whatsapp || client.tel, `Bonjour ${client.nom}, souhaitez-vous renouveler votre commande Horizon Farm ?`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMaps = (client) => {
    const query = encodeURIComponent(buildSenegalMapQuery(client, 'client Dakar Senegal'));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Clients & Communication WhatsApp"
        sub="Gestion clients - automatisations - fidelite - relances"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefresh?.(); toast.success('Clients actualises'); }}>Refresh</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau client</Btn>
            <Btn icon={MessageCircle} variant="whatsapp" small onClick={() => toast.success('Campagne preparee - API WhatsApp non connectee')}>Envoyer campagne</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total clients" value={rows.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={DollarSign} label="CA total clients" value={fmtCurrency(totalCA)} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={Star} label="Clients premium" value={premiumClients.length} color="bg-amber-500/20 text-amber-400" />
        <KpiCard icon={MessageCircle} label="A relancer" value={clientsARelancer.length} color="bg-[#25D366]/20 text-[#25D366]" />
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><MessageCircle size={16} className="text-[#25D366]" />Automatisations WhatsApp</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {automations.settings.map((setting) => (
            <button
              key={setting.key}
              type="button"
              onClick={() => toggleAutomation(setting.key)}
              disabled={automations.loading}
              className={`p-4 rounded-xl border text-left transition-all ${setting.enabled ? 'bg-[#25D366]/10 border-[#25D366]/30' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#2f2415]">{setting.label}</span>
                <span className={`w-8 h-4 rounded-full flex items-center ${setting.enabled ? 'bg-[#25D366] justify-end' : 'bg-[#d6c3a0] justify-start'} px-0.5`}>
                  <span className="w-3 h-3 rounded-full bg-white" />
                </span>
              </div>
              <p className="text-xs text-[#8a7456]">{setting.description}</p>
              <p className="text-[10px] text-[#b39b78] mt-2">Simulation - API WhatsApp non connectee</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <VoiceSearch value={search} onChange={setSearch} placeholder="Rechercher client..." />
        {['tous', 'actif', 'inactif', 'VIP', 'a_relancer'].map((status) => (
          <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm ${statusFilter === status ? 'bg-emerald-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456]'}`}>
            {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><div className="h-20 bg-[#d6c3a0]/60 animate-pulse rounded" /></div>
            ))
          : filteredRows.map((client) => {
              const metrics = metricsFor(client);
              const salesSummary = salesSummaryFor(client);
              return (
              <div key={client.id} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5 hover:border-[#b6975f] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {client.photo_url ? <img src={client.photo_url} alt={client.nom} className="w-10 h-10 rounded-full object-cover border border-[#d6c3a0]" /> : <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold">{client.nom?.[0] || 'C'}</div>}
                    <div>
                      <p className="font-bold text-[#2f2415]">{client.nom}</p>
                      <p className="text-xs text-[#8a7456]">{client.type} - {client.prefs}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star size={12} fill="currentColor" />
                    <span className="text-sm font-semibold">{metrics.loyaltyScore.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">CA total auto</div><div className="text-[#2f2415] font-semibold text-sm">{fmtCurrency(metrics.total)}</div></div>
                  <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">Panier moyen est.</div><div className="text-[#2f2415] font-semibold text-sm">{fmtCurrency(metrics.averageBasketEstimate)}</div></div>
                  <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">Commandes ERP</div><div className="text-[#2f2415] font-semibold text-sm">{salesSummary.orders.length}</div></div>
                  <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">Reste a payer</div><div className={`font-semibold text-sm ${salesSummary.resteAPayer > 0 ? 'text-red-500' : 'text-[#2f2415]'}`}>{fmtCurrency(salesSummary.resteAPayer)}</div></div>
                  <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">Derniere commande</div><div className="text-[#2f2415] font-semibold text-sm">{salesSummary.derniereCommandeVente || client.derniereCommande || client.dernierecommande || '-'}</div></div>
                  <div className="bg-[#fffdf8] rounded-lg p-2.5"><div className="text-xs text-[#8a7456]">Statut intelligent</div><div className="text-[#2f2415] font-semibold text-sm">{metrics.smartStatus}</div></div>
                </div>

                <div className="flex items-center gap-2 text-sm text-[#7d6a4a] mb-3"><Phone size={12} />{client.tel}</div>
                <div className="flex gap-2 flex-wrap">
                  <Btn variant="outline" small icon={Eye} onClick={() => { setSelected(client); setModal('details'); }}>Fiche</Btn>
                  <Btn variant="outline" small icon={Phone} onClick={() => window.open(`tel:${client.tel}`)}>Appeler</Btn>
                  <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openWhatsApp(client)}>WhatsApp</Btn>
                  <Btn variant="outline" small icon={MapPin} onClick={() => openMaps(client)}>Itineraire</Btn>
                  <Btn variant="amber" small icon={FileText} onClick={() => toast.success('Facture generee')}>Facture</Btn>
                  <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(client); setModal('edit'); }} />
                  <ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(client); setModal('delete'); }} />
                </div>
              </div>
              );
            })}
      </div>

      <DetailsModal
        open={modal === 'details'}
        onClose={() => setModal(null)}
        data={selected ? {
          ...selected,
          ...metricsFor(selected),
          commandes_erp: salesSummaryFor(selected).orders.length,
          total_achete_ventes: salesSummaryFor(selected).totalAchete,
          total_paye_ventes: salesSummaryFor(selected).totalPaye,
          reste_a_payer_ventes: salesSummaryFor(selected).resteAPayer,
          derniere_commande_vente: salesSummaryFor(selected).derniereCommandeVente || '-',
          paiements_enregistres: salesSummaryFor(selected).clientPayments.length,
        } : selected}
        title="Fiche client premium"
      />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.clients} initialValues={initialClient} autoId={() => generateSequentialId('clients', rows)} uploadFolder="clients" loading={saving} title="Ajouter client" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.clients} initialValues={selected || {}} uploadFolder="clients" loading={saving} title="Modifier client" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />
    </div>
  );
}
