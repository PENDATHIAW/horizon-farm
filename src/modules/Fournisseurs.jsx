import { AlertTriangle, Award, DollarSign, MapPin, MessageCircle, Plus, RefreshCw, Star, Truck, Upload, Download, Edit, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import ActionIconButton from '../components/ActionIconButton';
import { fmtCurrency } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { generateSequentialId, toWhatsappLink } from '../utils/ids';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import { calculateSupplierMetrics } from '../utils/businessCalculations';
import { searchGeoPlaces } from '../services/geoSearchService';

const SourceBadge = ({ source }) => (
  <span className={`text-[10px] px-2 py-1 rounded-full border ${source === 'demo' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'}`}>
    {source === 'demo' ? 'Demo' : source || 'Manuel'}
  </span>
);

export default function Fournisseurs({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSearch, setGeoSearch] = useState(null);

  const metricsFor = (supplier) => calculateSupplierMetrics(supplier);
  const totalDettes = useMemo(() => rows.reduce((sum, supplier) => sum + calculateSupplierMetrics(supplier).dettes, 0), [rows]);
  const noteMoyenne = useMemo(() => {
    if (!rows.length) return '0.0';
    return (rows.reduce((sum, supplier) => sum + calculateSupplierMetrics(supplier).note, 0) / rows.length).toFixed(1);
  }, [rows]);

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate(payload);
      toast.success('Fournisseur ajoute');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur creation fournisseur');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate(selected.id, payload);
      toast.success('Fournisseur modifie');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification fournisseur');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Fournisseur supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression fournisseur');
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = (supplier) => {
    const phone = supplier.whatsapp || supplier.tel;
    const url = toWhatsappLink(phone, `Bonjour ${supplier.nom}, besoin de commande / suivi.`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const doExports = () => {
    const enrichedRows = rows.map((supplier) => ({ ...supplier, ...metricsFor(supplier) }));
    exportToCsv({ rows: enrichedRows, fileName: 'fournisseurs.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'fournisseurs.xlsx', sheetName: 'Fournisseurs' });
    exportToPdf({ rows: enrichedRows, title: 'Fournisseurs', fileName: 'fournisseurs.pdf' });
    toast.success('Exports fournisseurs generes');
  };

  const searchRealSuppliers = async () => {
    try {
      setGeoLoading(true);
      const response = await searchGeoPlaces({ kind: 'fournisseurs', radiusKm: 35 });
      setGeoSearch(response);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message || 'Recherche fournisseurs indisponible');
    } finally {
      setGeoLoading(false);
    }
  };

  const importGeoSupplier = async (result) => {
    try {
      setSaving(true);
      await onCreate({
        id: generateSequentialId('fournisseurs', rows),
        nom: result.nom,
        tel: result.tel === 'Non renseigne' ? '' : result.tel,
        whatsapp: result.tel === 'Non renseigne' ? '' : result.tel,
        email: '',
        categorie: 'Approvisionnement',
        contact: result.nom,
        note: 0,
        dettes: 0,
        livraisons: 0,
        adresse: result.adresse === 'Adresse non renseignee' ? '' : result.adresse,
        gps: result.gps,
        latitude: result.latitude,
        longitude: result.longitude,
        distance_km: result.distance_km,
        source: result.source,
        external_id: result.external_id,
        verified: true,
        favorite: false,
        notes: 'Ajoute apres verification depuis OpenStreetMap.',
      });
      await onRefresh?.();
      toast.success('Fournisseur ajoute a mes contacts');
    } catch (error) {
      toast.error(error.message || 'Import fournisseur impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestion des Fournisseurs"
        sub="Approvisionnements - Evaluations - Suivi dettes"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={MapPin} variant="outline" small onClick={searchRealSuppliers}>{geoLoading ? 'Recherche...' : 'Recherche reelle'}</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau fournisseur</Btn>
            <Btn icon={Upload} variant="outline" small onClick={() => toast.success('Import commande pret')}>Nouvelle commande</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Truck} label="Fournisseurs actifs" value={rows.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={AlertTriangle} label="Dettes en cours" value={fmtCurrency(totalDettes)} color={totalDettes > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'} />
        <KpiCard icon={Award} label="Note moy. fournisseurs" value={`${noteMoyenne}/5`} color="bg-amber-500/20 text-amber-400" />
      </div>

      {rows.some((supplier) => supplier.source === 'demo') ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-sm text-[#7d6a4a]">
          Certains fournisseurs sont des donnees de demonstration. Aucune adresse, note ou telephone ne doit etre considere reel sans source verifiee.
        </div>
      ) : null}

      {geoSearch ? (
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-[#2f2415]">Resultats fournisseurs reels</p>
              <p className="text-xs text-[#8a7456]">
                Source: {geoSearch.source} - Position utilisee: {geoSearch.origin?.source || 'Dakar/Senegal'} - Rayon: {geoSearch.radiusKm} km.
              </p>
            </div>
            <SourceBadge source="openstreetmap" />
          </div>
          {geoSearch.results.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {geoSearch.results.slice(0, 8).map((result) => (
                <div key={result.id} className="rounded-xl border border-[#e7d9be] bg-[#fffdf8] p-3">
                  <p className="font-semibold text-[#2f2415]">{result.nom}</p>
                  <p className="text-xs text-[#8a7456]">{result.adresse}</p>
                  <p className="text-xs text-[#8a7456] mt-1">Tel: {result.tel} - Distance: {result.distance_km} km</p>
                  <div className="flex gap-2 mt-3">
                    {result.map_url ? <Btn variant="outline" small onClick={() => window.open(result.map_url, '_blank', 'noopener,noreferrer')}>Carte</Btn> : null}
                    <Btn small onClick={() => importGeoSupplier(result)}>Ajouter a mes contacts</Btn>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8a7456]">{geoSearch.message}</p>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><div className="h-20 bg-[#d6c3a0]/60 animate-pulse rounded" /></div>)
          : rows.map((supplier) => {
              const metrics = metricsFor(supplier);
              const evaluation = {
                Prix: Math.max(35, metrics.reliabilityScore - 8),
                Qualite: Math.min(100, metrics.note * 20),
                Rap: Math.min(100, 45 + metrics.livraisons * 2),
                Dispo: Math.max(30, metrics.reliabilityScore - (metrics.dettes > 0 ? 12 : 0)),
                Fiable: metrics.reliabilityScore,
              };
              return (
              <div key={supplier.id} className={`bg-[#ffffff] border rounded-2xl p-5 hover:border-[#b6975f] transition-all ${metrics.dettes > 0 ? 'border-amber-500/30' : 'border-[#d6c3a0]'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-[#2f2415]">{supplier.nom}</p>
                    <p className="text-xs text-[#8a7456]">{supplier.categorie} - Contact: {supplier.contact}</p>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400"><SourceBadge source={supplier.source} /><Star size={12} fill="currentColor" /><span className="text-sm font-semibold">{metrics.reliabilityScore.toFixed(0)}%</span></div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-[#7d6a4a]">
                  <div>{supplier.tel}</div>
                  <div>{supplier.whatsapp}</div>
                  <div>{supplier.email}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#fffdf8] rounded-lg p-2.5">
                    <div className="text-xs text-[#8a7456]">Livraisons</div>
                    <div className="text-[#2f2415] font-semibold">{supplier.livraisons} commandes</div>
                  </div>
                  <div className={`rounded-lg p-2.5 ${metrics.dettes > 0 ? 'bg-amber-500/10' : 'bg-[#fffdf8]'}`}>
                    <div className={`text-xs ${metrics.dettes > 0 ? 'text-amber-400' : 'text-[#8a7456]'}`}>Dettes</div>
                    <div className={`font-semibold ${metrics.dettes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{metrics.dettes > 0 ? fmtCurrency(metrics.dettes) : 'Aucune'}</div>
                  </div>
                  <div className="bg-[#fffdf8] rounded-lg p-2.5 col-span-2">
                    <div className="text-xs text-[#8a7456]">Statut intelligent</div>
                    <div className="text-[#2f2415] font-semibold">{metrics.smartStatus}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-[#8a7456] mb-2">Evaluation:</p>
                  <div className="grid grid-cols-5 gap-1">
                    {Object.entries(evaluation).map(([crit, score]) => (
                      <div key={crit} className="text-center">
                        <div className="text-xs text-[#8a7456] mb-1">{crit}</div>
                        <div className="h-1.5 bg-[#fffdf8] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Btn variant="outline" small icon={Upload} onClick={async () => { await onUpdate(supplier.id, { livraisons: Number(supplier.livraisons || 0) + 1 }); toast.success('Commande enregistree'); }}>Commander</Btn>
                  <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openWhatsApp(supplier)}>WhatsApp</Btn>
                  {metrics.dettes > 0 ? <Btn variant="amber" small icon={DollarSign} onClick={async () => { await onUpdate(supplier.id, { dettes: 0 }); toast.success('Paiement enregistre'); }}>Payer</Btn> : null}
                  <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(supplier); setModal('details'); }} />
                  <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(supplier); setModal('edit'); }} />
                  <ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(supplier); setModal('delete'); }} />
                </div>
              </div>
              );
            })}
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...metricsFor(selected) } : selected} title="Fiche fournisseur" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.fournisseurs} initialValues={{ id: generateSequentialId('fournisseurs', rows), note: 4 }} autoId={() => generateSequentialId('fournisseurs', rows)} uploadFolder="fournisseurs" loading={saving} title="Ajouter fournisseur" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.fournisseurs} initialValues={selected || {}} loading={saving} title="Modifier fournisseur" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />
    </div>
  );
}




