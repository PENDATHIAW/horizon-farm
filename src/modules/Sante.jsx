import { AlertCircle, AlertTriangle, CheckCircle, Clock, Edit, Eye, MapPin, MessageCircle, Phone, Plus, RefreshCw, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import ActionIconButton from '../components/ActionIconButton';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import { generateSequentialId, toWhatsappLink } from '../utils/ids';
import { buildSenegalMapQuery, DEFAULT_PHONE } from '../utils/location';
import { calculateVaccineMetrics } from '../utils/businessCalculations';
import { searchGeoPlaces } from '../services/geoSearchService';

const vetSearchTokens = (value = '') => String(value).toLowerCase().replace(/dr\.?/g, '').trim().split(/\s+/).filter(Boolean);

const findVet = (vets, value) => {
  const tokens = vetSearchTokens(value);
  if (!tokens.length) return null;
  return vets.find((vet) => {
    const haystack = `${vet.nom || ''} ${vet.specialite || ''}`.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  }) || null;
};

const openMaps = (vet) => {
  const query = encodeURIComponent(buildSenegalMapQuery(vet, 'veterinaire Dakar Senegal'));
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
};

const SourceBadge = ({ source }) => (
  <span className={`text-[10px] px-2 py-1 rounded-full border ${source === 'demo' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'}`}>
    {source === 'demo' ? 'Demo' : source || 'Manuel'}
  </span>
);

export default function Sante({
  rows = [],
  vets = [],
  loading,
  vetsLoading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateVet,
  onUpdateVet,
  onDeleteVet,
  onRefreshVets,
}) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedVet, setSelectedVet] = useState(null);
  const [vetModal, setVetModal] = useState(null);
  const [vetSaving, setVetSaving] = useState(false);
  const [vetMapOpen, setVetMapOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSearch, setGeoSearch] = useState(null);

  const stats = useMemo(
    () => ({
      faits: rows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'fait').length,
      afaire: rows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'a_faire').length,
      retard: rows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'retard').length,
    }),
    [rows]
  );

  const vetStats = useMemo(
    () => ({
      total: vets.length,
      top: vets.filter((vet) => Number(vet.note || 0) >= 4.7).length,
      bovin: vets.filter((vet) => String(vet.specialite || '').toLowerCase().includes('bovin')).length,
    }),
    [vets]
  );

  const activeMapVet = selectedVet || vets[0] || null;
  const mapQuery = encodeURIComponent(buildSenegalMapQuery(activeMapVet, 'veterinaire Dakar Senegal'));

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate(payload);
      toast.success('Vaccin ajoute');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur creation');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate(selected.id, payload);
      toast.success('Vaccin modifie');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Vaccin supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression');
    } finally {
      setSaving(false);
    }
  };

  const submitCreateVet = async (payload) => {
    try {
      setVetSaving(true);
      await onCreateVet(payload);
      toast.success('Veterinaire ajoute');
      setVetModal(null);
      setVetMapOpen(true);
    } catch (error) {
      toast.error(error.message || 'Erreur creation veterinaire');
    } finally {
      setVetSaving(false);
    }
  };

  const submitEditVet = async (payload) => {
    if (!selectedVet) return;
    try {
      setVetSaving(true);
      await onUpdateVet(selectedVet.id, payload);
      toast.success('Veterinaire modifie');
      setVetModal(null);
      setVetMapOpen(true);
    } catch (error) {
      toast.error(error.message || 'Erreur modification veterinaire');
    } finally {
      setVetSaving(false);
    }
  };

  const submitDeleteVet = async () => {
    if (!selectedVet) return;
    try {
      setVetSaving(true);
      await onDeleteVet(selectedVet.id);
      toast.success('Veterinaire supprime');
      setVetModal(null);
      setSelectedVet(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression veterinaire');
    } finally {
      setVetSaving(false);
    }
  };

  const openVetWhatsApp = (vetOrName) => {
    const vet = typeof vetOrName === 'string' ? findVet(vets, vetOrName) : vetOrName;
    const label = vet?.nom || vetOrName || 'Docteur';
    const phone = vet?.whatsapp || vet?.tel || DEFAULT_PHONE;
    const url = toWhatsappLink(phone, `Bonjour ${label}, intervention demandee pour Horizon Farm.`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const showVetMap = () => {
    setVetMapOpen(true);
    if (!selectedVet && vets[0]) setSelectedVet(vets[0]);
    toast.success('Carte veterinaires ouverte');
  };

  const searchRealVets = async () => {
    try {
      setGeoLoading(true);
      const response = await searchGeoPlaces({ kind: 'veterinaires', radiusKm: 30 });
      setGeoSearch(response);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message || 'Recherche geolocalisee indisponible');
    } finally {
      setGeoLoading(false);
    }
  };

  const importGeoVet = async (result) => {
    try {
      setVetSaving(true);
      await onCreateVet({
        id: generateSequentialId('veterinaires', vets),
        nom: result.nom,
        specialite: 'Veterinaire',
        tel: result.tel === 'Non renseigne' ? '' : result.tel,
        gps: result.gps,
        latitude: result.latitude,
        longitude: result.longitude,
        distance_km: result.distance_km,
        adresse: result.adresse === 'Adresse non renseignee' ? '' : result.adresse,
        note: 0,
        source: result.source,
        external_id: result.external_id,
        verified: true,
        favorite: false,
        notes: 'Ajoute apres verification depuis OpenStreetMap.',
      });
      await onRefreshVets?.();
      toast.success('Veterinaire ajoute a mes contacts');
    } catch (error) {
      toast.error(error.message || 'Import veterinaire impossible');
    } finally {
      setVetSaving(false);
    }
  };

  const columns = [
    { key: 'nom', label: 'Vaccin', sortable: true, render: (v) => <span className="text-[#2f2415] font-semibold">{v.nom}</span> },
    { key: 'animal', label: 'Animal', sortable: true },
    { key: 'prevue', label: 'Date prevue', sortable: true },
    { key: 'effectuee', label: 'Date effectuee', sortable: true, render: (v) => v.effectuee || <span className="text-[#b39b78]">-</span> },
    { key: 'vet', label: 'Veterinaire', sortable: true },
    { key: 'statut', label: 'Statut auto', sortable: true, render: (v) => <Badge status={calculateVaccineMetrics(v).smartStatus} /> },
    { key: 'urgence', label: 'Urgence', sortable: true, render: (v) => `${calculateVaccineMetrics(v).urgencyScore}%` },
    {
      key: 'actions',
      label: 'Actions',
      render: (v) => (
        <div className="flex gap-1">
          <ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(v); setModal('details'); }} />
          <ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(v); setModal('edit'); }} />
          <ActionIconButton icon={MessageCircle} color="whatsapp" title="WhatsApp" onClick={() => openVetWhatsApp(v.vet)} />
          <ActionIconButton icon={AlertTriangle} color="red" title="Supprimer" onClick={() => { setSelected(v); setModal('delete'); }} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sante & Vaccination"
        sub="Suivi sanitaire complet - Vaccins - Maladies - Veterinaires"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefresh?.(); await onRefreshVets?.(); toast.success('Donnees sante actualisees'); }}>Refresh</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau vaccin</Btn>
            <Btn icon={MapPin} variant="outline" small onClick={showVetMap}>Contacter veterinaire</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={CheckCircle} label="Vaccins faits" value={stats.faits} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={Clock} label="A planifier" value={stats.afaire} color="bg-amber-500/20 text-amber-400" />
        <KpiCard icon={AlertCircle} label="En retard" value={stats.retard} color="bg-red-500/20 text-red-400" />
      </div>

      {vets.some((vet) => vet.source === 'demo') ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-sm text-[#7d6a4a]">
          Donnees de demonstration visibles. Pour de vrais resultats geolocalises, configure Google Places ou OpenStreetMap via le service geoSearchService.
        </div>
      ) : null}

      {rows.filter((v) => calculateVaccineMetrics(v).smartStatus === 'retard').map((v) => (
        <div key={v.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <AlertTriangle className="text-red-400 shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-red-400 font-semibold">Vaccin en retard : {v.nom}</p>
            <p className="text-sm text-red-300/70">Animal : {v.animal} - Prevu le : {v.prevue} - Veterinaire : {v.vet}</p>
            <p className="text-xs text-red-300/60 mt-1">Action conseillee : ouvrir la fiche veterinaire, verifier disponibilite, puis planifier l'intervention.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="outline" small icon={MapPin} onClick={() => { setSelectedVet(findVet(vets, v.vet) || vets[0] || null); setVetMapOpen(true); }}>Carte</Btn>
            <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openVetWhatsApp(v.vet)}>WhatsApp</Btn>
          </div>
        </div>
      ))}

      <DataTable title="Planning vaccinations" rows={rows} columns={columns} loading={loading} initialSortKey="prevue" />

      <SectionHeader
        title="Veterinaires partenaires"
        sub="Contacts, specialites, carte et disponibilite terrain"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefreshVets?.(); toast.success('Veterinaires actualises'); }}>Refresh</Btn>
            <Btn icon={MapPin} variant="outline" small onClick={searchRealVets}>{geoLoading ? 'Recherche...' : 'Recherche reelle'}</Btn>
            <Btn icon={MapPin} variant="outline" small onClick={showVetMap}>Carte</Btn>
            <Btn icon={Plus} small onClick={() => setVetModal('create')}>Ajouter veterinaire</Btn>
          </>
        }
      />

      {geoSearch ? (
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-[#2f2415]">Resultats geolocalises reels</p>
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
                    {result.map_url ? <Btn variant="outline" small icon={MapPin} onClick={() => window.open(result.map_url, '_blank', 'noopener,noreferrer')}>Carte</Btn> : null}
                    <Btn small onClick={() => importGeoVet(result)}>Ajouter a mes contacts</Btn>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8a7456]">{geoSearch.message}</p>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Phone} label="Veterinaires actifs" value={vetStats.total} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={Star} label="Notes premium" value={vetStats.top} color="bg-amber-500/20 text-amber-400" />
        <KpiCard icon={CheckCircle} label="Specialistes betail" value={vetStats.bovin} color="bg-emerald-500/20 text-emerald-400" />
      </div>

      {vetMapOpen ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#2f2415]">Carte veterinaires</p>
                <p className="text-xs text-[#8a7456]">Selectionne un veterinaire pour voir sa zone et lancer l'itineraire.</p>
              </div>
              <button type="button" onClick={() => setVetMapOpen(false)} className="text-[#8a7456] hover:text-[#2f2415]">x</button>
            </div>
            {vets.map((vet) => (
              <button
                key={vet.id}
                type="button"
                onClick={() => setSelectedVet(vet)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${selectedVet?.id === vet.id ? 'bg-[#c9a96a]/20 border-[#c9a96a]' : 'bg-[#fffdf8] border-[#e7d9be] hover:border-[#c9a96a]'}`}
              >
                <p className="text-sm font-bold text-[#2f2415]">{vet.nom}</p>
                <p className="text-xs text-[#8a7456]">{vet.specialite} - {vet.adresse || vet.gps || 'zone non renseignee'}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-[#e7d9be] min-h-[320px] bg-[#fffdf8]">
            {activeMapVet ? (
              <iframe
                title="Carte veterinaires Horizon Farm"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                className="w-full h-[320px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-[#8a7456]">Ajoute un veterinaire pour afficher la carte.</div>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vetsLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><div className="h-28 rounded-xl bg-[#e7d9be]/70 animate-pulse" /></div>
            ))
          : vets.map((vet) => (
              <div key={vet.id} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5 hover:border-[#b6975f] transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold">{vet.nom?.split(' ')[1]?.[0] || 'V'}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#2f2415] truncate">{vet.nom}</p>
                    <p className="text-xs text-[#8a7456]">{vet.specialite}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-amber-400 text-xs font-semibold"><SourceBadge source={vet.source} /><Star size={12} fill="currentColor" />{vet.note || '-'}</div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-[#7d6a4a] flex gap-2 items-center"><Phone size={12} />{vet.tel || 'Telephone non renseigne'}</div>
                  <div className="text-sm text-[#7d6a4a] flex gap-2 items-center"><MapPin size={12} />{vet.adresse || vet.gps || 'Position non renseignee'}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Btn variant="outline" small icon={Eye} onClick={() => { setSelectedVet(vet); setVetModal('details'); }}>Fiche</Btn>
                  <Btn variant="outline" small icon={Phone} onClick={() => window.open(`tel:${vet.tel || ''}`, '_self')}>Appeler</Btn>
                  <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openVetWhatsApp(vet)}>WhatsApp</Btn>
                  <Btn variant="outline" small icon={MapPin} onClick={() => { setSelectedVet(vet); setVetMapOpen(true); }}>Carte</Btn>
                  <Btn variant="outline" small icon={MapPin} onClick={() => openMaps(vet)}>Itineraire</Btn>
                  <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelectedVet(vet); setVetModal('edit'); }} />
                  <ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelectedVet(vet); setVetModal('delete'); }} />
                </div>
              </div>
            ))}
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...calculateVaccineMetrics(selected) } : selected} title="Detail Vaccin" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.sante} initialValues={{ id: generateSequentialId('sante', rows), statut: 'a_faire' }} autoId={() => generateSequentialId('sante', rows)} loading={saving} title="Ajouter vaccin" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.sante} initialValues={selected || {}} loading={saving} title="Modifier vaccin" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />

      <DetailsModal open={vetModal === 'details'} onClose={() => setVetModal(null)} data={selectedVet} title="Fiche veterinaire" />
      <CreateModal open={vetModal === 'create'} onClose={() => setVetModal(null)} onSubmit={submitCreateVet} fields={MODULE_FORM_FIELDS.veterinaires} initialValues={{ id: generateSequentialId('veterinaires', vets), note: 4.5 }} autoId={() => generateSequentialId('veterinaires', vets)} loading={vetSaving} title="Ajouter veterinaire" submitLabel="Ajouter" />
      <EditModal open={vetModal === 'edit'} onClose={() => setVetModal(null)} onSubmit={submitEditVet} fields={MODULE_FORM_FIELDS.veterinaires} initialValues={selectedVet || {}} loading={vetSaving} title="Modifier veterinaire" submitLabel="Enregistrer" />
      <DeleteModal open={vetModal === 'delete'} onClose={() => setVetModal(null)} onConfirm={submitDeleteVet} itemLabel={selectedVet ? `${selectedVet.nom}` : ''} loading={vetSaving} />
    </div>
  );
}
