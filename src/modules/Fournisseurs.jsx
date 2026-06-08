import { AlertTriangle, Award, DollarSign, MapPin, MessageCircle, Plus, RefreshCw, Star, Truck, Upload, Download, Edit, Eye, CheckCircle, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import ActionIconButton from '../components/ActionIconButton';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import FournisseurFicheModal from '../components/FournisseurFicheModal.jsx';
import { calculateSupplierMetrics } from '../utils/businessCalculations';
import { calculateSupplierSettlement } from '../utils/supplierSettlement';
import { buildSupplierDebtFollowUp } from '../utils/supplierWorkflows';
import { runSupplierPaymentSideEffects } from '../utils/supplierSideEffects';
import { searchGeoPlaces } from '../services/geoSearchService';
import { buildSupplierDecisionProfile, buildSupplierDecisionSummary } from '../services/supplierDecisionEngine';
import FournisseursStockBridge from './FournisseursStockBridge.jsx';
import FournisseursEvolution from './FournisseursEvolution.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const supplierName = (supplier = {}) => supplier.nom || supplier.name || supplier.id || 'Fournisseur';
const supplierPhone = (supplier = {}) => String(supplier.whatsapp || supplier.tel || supplier.phone || '').trim();
const hasPhone = (supplier = {}) => Boolean(supplierPhone(supplier));
const supplierInitialValues = (rows) => ({ id: generateSequentialId('fournisseurs', rows), note: 4, dettes: 0, livraisons: 0, source: 'manuel', verified: false, favorite: false, categorie: 'Approvisionnement' });
const isOpenSupplierDebt = (tx = {}) => String(tx.type || '').toLowerCase() === 'sortie' && tx.cash_effect !== true && !tx.settlement_transaction_id && ['impaye', 'partiel', 'en_attente', 'a_payer', 'à payer'].includes(String(tx.statut || tx.status || '').toLowerCase());

const SourceBadge = ({ source }) => (
  <span className={`text-[10px] px-2 py-1 rounded-full border ${source === 'demo' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'}`}>
    {source === 'demo' ? 'Demo' : source || 'Manuel'}
  </span>
);

function SupplierSegmentBadge({ segment }) {
  const cls = segment === 'Stratégique' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : segment === 'Critique / risque élevé' ? 'bg-red-50 border-red-200 text-red-700' : segment === 'Dette à suivre' ? 'bg-amber-50 border-amber-200 text-amber-700' : segment === 'Fiable' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-[#fffdf8] border-[#eadcc2] text-[#7d6a4a]';
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${cls}`}>{segment}</span>;
}

function CardMetric({ label, value, alert = false }) {
  return <div className={`rounded-lg p-2.5 ${alert ? 'bg-amber-500/10' : 'bg-[#fffdf8]'}`}><div className={`text-xs ${alert ? 'text-amber-600' : 'text-[#8a7456]'}`}>{label}</div><div className={`font-semibold text-sm ${alert ? 'text-amber-600' : 'text-[#2f2415]'}`}>{value}</div></div>;
}

function buildSupplierSummary(supplier, stockRows = [], financeRows = [], documents = []) {
  return calculateSupplierSettlement(supplier, { stocks: stockRows, transactions: financeRows, documents });
}

function SupplierDecisionPanel({ summary }) {
  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ShieldAlert size={15} /> Risque & dépendance fournisseurs</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Sécuriser les fournisseurs qui conditionnent la production</h3>
        <p className="text-sm text-[#8a7456] mt-1">Horizon distingue fournisseurs stratégiques, fiables, à risque, avec dettes ou contacts incomplets.</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Small label="Stratégiques" value={summary.strategic.length} />
        <Small label="À risque" value={summary.risks.length} />
        <Small label="Dettes" value={summary.debts.length} />
        <Small label="Contacts incomplets" value={summary.missingContacts.length} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {summary.profiles.slice().sort((a, b) => b.riskScore - a.riskScore).slice(0, 6).map((profile) => (
          <div key={profile.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-black text-[#2f2415]">{profile.name}</p><p className="text-xs text-[#8a7456]">{profile.category}</p></div>
              <SupplierSegmentBadge segment={profile.segment} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <CardMetric label="Risque" value={`${profile.riskScore}%`} alert={profile.riskScore >= 60} />
              <CardMetric label="Dépendance" value={`${profile.dependencyScore}%`} alert={profile.dependencyScore >= 70} />
              <CardMetric label="Fiabilité" value={`${profile.reliabilityScore}%`} />
            </div>
            <p className="mt-3 text-xs text-[#7d6a4a]">{profile.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Fournisseurs({ rows = [], stocks = [], tasks = [], loading, onCreate, onUpdate, onDelete, onRefresh, onUpdateStock, onRefreshStock, onCreateTask, onRefreshTasks, onCreateAlert, onRefreshAlertes, onCreateBusinessEvent, onRefreshBusinessEvents, onNavigate, hideEvolution = false }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSearch, setGeoSearch] = useState(null);
  const financesCrud = useCrudModule('finances');
  const stockCrud = useCrudModule('stock');
  const documentsCrud = useCrudModule('documents');
  const tachesCrud = useCrudModule('taches');
  const alertesCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const stockRows = stocks.length ? stocks : stockCrud.rows;
  const taskRows = tasks.length ? tasks : tachesCrud.rows;
  const alertRows = alertesCrud.rows || [];
  const supplierDecisionSummary = useMemo(() => buildSupplierDecisionSummary(rows, { stocks: stockRows, finances: financesCrud.rows }), [rows, stockRows, financesCrud.rows]);

  const summaryFor = (supplier) => buildSupplierSummary(supplier, stockRows, financesCrud.rows, documentsCrud.rows);
  const profileFor = (supplier) => buildSupplierDecisionProfile(supplier, { stocks: stockRows, finances: financesCrud.rows });
  const metricsFor = (supplier) => {
    const metrics = calculateSupplierMetrics(supplier);
    const summary = summaryFor(supplier);
    const profile = profileFor(supplier);
    return { ...metrics, dettes: summary.dettes, livraisons: summary.livraisons, ...profile };
  };
  const totalDettes = useMemo(() => rows.reduce((sum, supplier) => sum + summaryFor(supplier).dettes, 0), [rows, stockRows, financesCrud.rows]);
  const totalAchats = useMemo(() => rows.reduce((sum, supplier) => sum + summaryFor(supplier).achatsStock, 0), [rows, stockRows]);
  const fournisseursDette = useMemo(() => rows.filter((supplier) => summaryFor(supplier).dettes > 0), [rows, stockRows, financesCrud.rows]);
  const noteMoyenne = useMemo(() => {
    if (!rows.length) return '0.0';
    return (rows.reduce((sum, supplier) => sum + calculateSupplierMetrics(supplier).note, 0) / rows.length).toFixed(1);
  }, [rows]);

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate({ ...supplierInitialValues(rows), ...payload }); await onRefresh?.(); toast.success('Fournisseur ajouté'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur création fournisseur'); }
    finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate(selected.id, payload); await onRefresh?.(); toast.success('Fournisseur modifié'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur modification fournisseur'); }
    finally { setSaving(false); }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete(selected.id); await onRefresh?.(); toast.success('Fournisseur supprimé'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression fournisseur'); }
    finally { setSaving(false); }
  };

  const messageFor = (supplier) => {
    const summary = summaryFor(supplier);
    if (summary.dettes > 0) return `Bonjour ${supplierName(supplier)}, je confirme le suivi du règlement fournisseur de ${fmtCurrency(summary.dettes)}. Merci.`;
    return `Bonjour ${supplierName(supplier)}, je souhaite préparer une commande / vérifier vos disponibilités.`;
  };

  const logWhatsApp = async (supplier, reason = 'contact_fournisseur') => {
    const message = messageFor(supplier);
    await whatsappLogsCrud.create?.({ id: makeId('WALOG'), supplier_id: supplier.id, fournisseur_id: supplier.id, recipient: supplierPhone(supplier), message, status: 'prepare', provider: 'whatsapp', simulation: true, channel_label: 'WhatsApp simulé (message préparé)', reason, sent_at: now() });
    await whatsappLogsCrud.refresh?.();
    return message;
  };

  const openWhatsApp = async (supplier) => {
    if (!hasPhone(supplier)) return toast.error('Numéro WhatsApp ou téléphone manquant');
    let message = messageFor(supplier);
    try { message = await logWhatsApp(supplier, summaryFor(supplier).dettes > 0 ? 'suivi_dette_fournisseur' : 'commande_fournisseur'); }
    catch { toast.error('Journal WhatsApp non enregistré, ouverture du message'); }
    window.open(toWhatsappLink(supplierPhone(supplier), message), '_blank', 'noopener,noreferrer');
  };

  const prepareOrder = async (supplier) => {
    try {
      const taskId = makeId('TSK');
      await (onCreateTask || tachesCrud.create)?.({ id: taskId, title: `Commande fournisseur — ${supplierName(supplier)}`, module_lie: 'fournisseurs', related_id: supplier.id, due_date: today(), priority: 'moyenne', status: 'a_faire', checklist: 'Vérifier besoin stock; demander disponibilité; confirmer prix; enregistrer réception', source_module: 'fournisseurs' });
      await (onCreateBusinessEvent || eventsCrud.create)?.({ id: makeId('EVT'), event_type: 'commande_fournisseur_preparee', module_source: 'fournisseurs', entity_type: 'fournisseur', entity_id: supplier.id, title: 'Commande fournisseur préparée', description: supplierName(supplier), event_date: today(), severity: 'info', linked_task_id: taskId });
      await onUpdate?.(supplier.id, { livraisons: Number(supplier.livraisons || 0) + 1, derniere_commande: today(), last_order_task_id: taskId });
      await Promise.allSettled([(onRefreshTasks || tachesCrud.refresh)?.(), (onRefreshBusinessEvents || eventsCrud.refresh)?.(), onRefresh?.()]);
      if (hasPhone(supplier)) {
        const message = await logWhatsApp(supplier, 'commande_fournisseur');
        window.open(toWhatsappLink(supplierPhone(supplier), message), '_blank', 'noopener,noreferrer');
      } else {
        toast.success('Commande préparée. Numéro fournisseur manquant pour WhatsApp.');
      }
      toast.success('Commande fournisseur préparée');
    } catch (error) {
      toast.error(error.message || 'Préparation commande impossible');
    }
  };

  const paySupplierDebt = async (supplier) => {
    const summary = summaryFor(supplier);
    if (summary.dettes <= 0) return toast.success('Aucune dette fournisseur');
    try {
      setSaving(true);
      await runSupplierPaymentSideEffects({
        supplier,
        debtAmount: summary.dettes,
        openDebtTransactions: summary.finances.filter(isOpenSupplierDebt),
        date: today(),
        paymentRef: today(),
        transactions: financesCrud.rows || [],
        tasks: taskRows,
        alertes: alertRows,
        handlers: {
          onCreateFinanceTransaction: financesCrud.create,
          onUpdateFinanceTransaction: financesCrud.update,
          onCreateDocument: documentsCrud.create,
          onUpdateSupplier: onUpdate,
          onCreateBusinessEvent: onCreateBusinessEvent || eventsCrud.create,
          onUpdateTask: onUpdateTask || tachesCrud.update,
          onUpdateAlert: onUpdateAlert || alertesCrud.update,
          existingDocuments: documentsCrud.rows || [],
        },
      });
      await Promise.allSettled([financesCrud.refresh?.(), documentsCrud.refresh?.(), (onRefreshBusinessEvents || eventsCrud.refresh)?.(), onRefresh?.(), (onRefreshTasks || tachesCrud.refresh)?.(), (onRefreshAlertes || alertesCrud.refresh)?.()]);
      toast.success('Paiement fournisseur enregistré');
    } catch (error) {
      toast.error(error.message || 'Paiement fournisseur impossible');
    } finally {
      setSaving(false);
    }
  };

  const createDebtAlert = async (supplier) => {
    const summary = summaryFor(supplier);
    if (summary.dettes <= 0) return toast.success('Aucune dette à suivre');
    const followUp = buildSupplierDebtFollowUp(supplier, summary.dettes, today());
    if (!followUp) return toast.success('Aucune dette à suivre');
    try {
      await (onCreateAlert || alertesCrud.create)?.(followUp.alert);
      await (onCreateTask || tachesCrud.create)?.(followUp.task);
      await Promise.allSettled([(onRefreshAlertes || alertesCrud.refresh)?.(), (onRefreshTasks || tachesCrud.refresh)?.()]);
      toast.success('Suivi dette créé');
    } catch (error) {
      toast.error(error.message || 'Suivi dette impossible');
    }
  };

  const doExports = () => {
    const enrichedRows = rows.map((supplier) => ({ ...supplier, ...metricsFor(supplier), ...summaryFor(supplier) }));
    exportToCsv({ rows: enrichedRows, fileName: 'fournisseurs.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'fournisseurs.xlsx', sheetName: 'Fournisseurs' });
    exportToPdf({ rows: enrichedRows, title: 'Fournisseurs', fileName: 'fournisseurs.pdf' });
    toast.success('Exports fournisseurs générés');
  };

  const searchRealSuppliers = async () => {
    try { setGeoLoading(true); const response = await searchGeoPlaces({ kind: 'fournisseurs', radiusKm: 35 }); setGeoSearch(response); toast.success(response.message); }
    catch (error) { toast.error(error.message || 'Recherche fournisseurs indisponible'); }
    finally { setGeoLoading(false); }
  };

  const importGeoSupplier = async (result) => {
    try {
      setSaving(true);
      await onCreate({ id: generateSequentialId('fournisseurs', rows), nom: result.nom, tel: result.tel === 'Non renseigne' ? '' : result.tel, whatsapp: result.tel === 'Non renseigne' ? '' : result.tel, email: '', categorie: 'Approvisionnement', contact: result.nom, note: 0, dettes: 0, livraisons: 0, adresse: result.adresse === 'Adresse non renseignee' ? '' : result.adresse, gps: result.gps, latitude: result.latitude, longitude: result.longitude, distance_km: result.distance_km, source: result.source, external_id: result.external_id, verified: true, favorite: false, notes: 'Ajouté après vérification depuis OpenStreetMap.' });
      await onRefresh?.();
      toast.success('Fournisseur ajouté');
    } catch (error) { toast.error(error.message || 'Import fournisseur impossible'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Fournisseurs" sub="Approvisionnement, dettes, risques, dépendance et fiabilité" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={MapPin} variant="outline" small onClick={searchRealSuppliers}>{geoLoading ? 'Recherche...' : 'Recherche réelle'}</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau fournisseur</Btn></>} />

      <FournisseursStockBridge suppliers={rows} stocks={stockRows} tasks={taskRows} onUpdateStock={onUpdateStock || stockCrud.update} onRefreshStock={onRefreshStock || stockCrud.refresh} onCreateTask={onCreateTask || tachesCrud.create} onRefreshTasks={onRefreshTasks || tachesCrud.refresh} onCreateAlert={onCreateAlert || alertesCrud.create} onRefreshAlertes={onRefreshAlertes || alertesCrud.refresh} onCreateBusinessEvent={onCreateBusinessEvent || eventsCrud.create} onRefreshBusinessEvents={onRefreshBusinessEvents || eventsCrud.refresh} onUpdateSupplier={onUpdate} onRefreshSuppliers={onRefresh} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={Truck} label="Fournisseurs" value={rows.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={DollarSign} label="Achats stock" value={fmtCurrency(totalAchats)} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={AlertTriangle} label="Dettes" value={fmtCurrency(totalDettes)} color={totalDettes > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'} />
        <KpiCard icon={Award} label="Note moyenne" value={`${noteMoyenne}/5`} color="bg-amber-500/20 text-amber-400" />
      </div>

      <SupplierDecisionPanel summary={supplierDecisionSummary} />
      {!hideEvolution ? <FournisseursEvolution rows={rows} stocks={stockRows} finances={financesCrud.rows} onNavigate={onNavigate} /> : null}

      {fournisseursDette.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-800 mb-2">Dettes fournisseurs à suivre</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{fournisseursDette.slice(0, 4).map((supplier) => <button key={supplier.id} type="button" onClick={() => createDebtAlert(supplier)} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-left text-sm text-amber-700"><b>{supplierName(supplier)}</b> · {fmtCurrency(summaryFor(supplier).dettes)}</button>)}</div></div> : null}

      {rows.some((supplier) => supplier.source === 'demo') ? <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-sm text-[#7d6a4a]">Certains fournisseurs sont des données de démonstration.</div> : null}

      {geoSearch ? <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start justify-between gap-3 mb-3"><div><p className="font-bold text-[#2f2415]">Résultats fournisseurs</p><p className="text-xs text-[#8a7456]">Source: {geoSearch.source} - Rayon: {geoSearch.radiusKm} km.</p></div><SourceBadge source="openstreetmap" /></div>{geoSearch.results.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{geoSearch.results.slice(0, 8).map((result) => <div key={result.id} className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3"><p className="font-semibold text-[#2f2415]">{result.nom}</p><p className="text-xs text-[#8a7456]">{result.adresse}</p><p className="text-xs text-[#8a7456] mt-1">Tel: {result.tel} - Distance: {result.distance_km} km</p><div className="flex gap-2 mt-3">{result.map_url ? <Btn variant="outline" small onClick={() => window.open(result.map_url, '_blank', 'noopener,noreferrer')}>Carte</Btn> : null}<Btn small onClick={() => importGeoSupplier(result)}>Ajouter</Btn></div></div>)}</div> : <p className="text-sm text-[#8a7456]">{geoSearch.message}</p>}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><div className="h-20 bg-[#d6c3a0]/60 animate-pulse rounded" /></div>) : rows.map((supplier) => {
          const metrics = metricsFor(supplier);
          const summary = summaryFor(supplier);
          const profile = profileFor(supplier);
          const evaluation = { Prix: Math.max(35, metrics.reliabilityScore - 8), Qualité: Math.min(100, metrics.note * 20), Délai: Math.min(100, 45 + summary.livraisons * 2), Dispo: Math.max(30, metrics.reliabilityScore - (summary.dettes > 0 ? 12 : 0)), Fiable: metrics.reliabilityScore };
          return <div key={supplier.id} className={`bg-[#ffffff] border rounded-2xl p-5 hover:border-[#b6975f] transition-all ${summary.dettes > 0 || profile.riskScore >= 60 ? 'border-amber-500/30' : 'border-[#d6c3a0]'}`}>
            <div className="flex items-start justify-between mb-4 gap-2"><div><p className="font-bold text-[#2f2415]">{supplier.nom}</p><p className="text-xs text-[#8a7456]">{profile.category} - Contact: {supplier.contact}</p></div><div className="flex flex-col items-end gap-2"><SupplierSegmentBadge segment={profile.segment} /><div className="flex items-center gap-2 text-amber-400"><SourceBadge source={supplier.source} /><Star size={12} fill="currentColor" /><span className="text-sm font-semibold">{metrics.reliabilityScore.toFixed(0)}%</span></div></div></div>
            <div className="space-y-2 mb-4 text-sm text-[#7d6a4a]"><div>{supplier.tel || 'Téléphone non renseigné'}</div><div>{supplier.whatsapp || 'WhatsApp non renseigné'}</div><div>{supplier.email || 'Email non renseigné'}</div></div>
            <div className="grid grid-cols-2 gap-3 mb-4"><CardMetric label="Livraisons" value={`${summary.livraisons} commandes`} /><CardMetric label="Dettes" value={summary.dettes > 0 ? fmtCurrency(summary.dettes) : 'Aucune'} alert={summary.dettes > 0} /><CardMetric label="Risque" value={`${profile.riskScore}%`} alert={profile.riskScore >= 60} /><CardMetric label="Dépendance" value={`${profile.dependencyScore}%`} alert={profile.dependencyScore >= 70} /><CardMetric label="Achats stock" value={fmtCurrency(summary.achatsStock)} /><CardMetric label="Documents" value={summary.docs.length} /></div>
            <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3 mb-4"><p className="text-xs font-black text-[#2f2415]">Action recommandée</p><p className="text-xs text-[#7d6a4a] mt-1">{profile.action}</p></div>
            <div className="mb-4"><p className="text-xs text-[#8a7456] mb-2">Évaluation</p><div className="grid grid-cols-5 gap-1">{Object.entries(evaluation).map(([crit, score]) => <div key={crit} className="text-center"><div className="text-xs text-[#8a7456] mb-1">{crit}</div><div className="h-1.5 bg-[#fffdf8] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} /></div></div>)}</div></div>
            <div className="flex gap-2 flex-wrap"><Btn variant="outline" small icon={Upload} onClick={() => prepareOrder(supplier)}>Commander</Btn><Btn variant={hasPhone(supplier) ? 'whatsapp' : 'outline'} small icon={MessageCircle} onClick={() => openWhatsApp(supplier)}>{hasPhone(supplier) ? 'WhatsApp' : 'Numéro manquant'}</Btn>{summary.dettes > 0 ? <Btn variant="amber" small icon={DollarSign} onClick={() => paySupplierDebt(supplier)}>Payer</Btn> : <Btn variant="outline" small icon={CheckCircle} onClick={() => toast.success('Aucune dette')}>Soldé</Btn>}<ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(supplier); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(supplier); setModal('edit'); }} /><ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(supplier); setModal('delete'); }} /></div>
          </div>;
        })}
      </div>

      <FournisseurFicheModal open={modal === 'details'} onClose={() => setModal(null)} supplier={selected} metrics={selected ? metricsFor(selected) : {}} summary={selected ? summaryFor(selected) : {}} profile={selected ? profileFor(selected) : {}} />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.fournisseurs} initialValues={supplierInitialValues(rows)} autoId={() => generateSequentialId('fournisseurs', rows)} uploadFolder="fournisseurs" loading={saving} title="Ajouter fournisseur" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.fournisseurs} initialValues={selected || {}} loading={saving} title="Modifier fournisseur" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />
    </div>
  );
}

function Small({ label, value }) { return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415]">{value}</p></div>; }
