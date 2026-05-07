import { useMemo } from 'react';
import BaseModal from './BaseModal';
import Badge from '../components/Badge';
import { fmtCurrency, fmtNumber, titleize } from '../utils/format';

const HIDDEN_KEYS = new Set([
  '__meta',
  'owner_user_id',
  'user_id',
  'raw',
  'metadata',
  'provider_response',
]);

const SYSTEM_KEYS = new Set(['id', 'external_id', 'created_at', 'updated_at', 'source']);

const LABELS = {
  id: 'ID',
  nom: 'Nom',
  name: 'Nom',
  libelle: 'Libelle',
  title: 'Titre',
  type: 'Type',
  status: 'Statut',
  statut: 'Statut',
  health_status: 'Etat de sante',
  frais_sante: 'Frais sante / soins',
  purchase_cost: 'Prix achat',
  sale_price: 'Prix vente',
  prix_vente_reel: 'Prix vente reel',
  montant: 'Montant',
  montant_total: 'Montant total',
  montant_mensuel: 'Montant mensuel',
  gain: 'Gain',
  roi: 'ROI',
  date: 'Date',
  created_at: 'Cree le',
  updated_at: 'Mis a jour le',
  source: 'Source',
  external_id: 'ID source externe',
  verified: 'Verifie',
  favorite: 'Favori',
  distance_km: 'Distance',
  latitude: 'Latitude',
  longitude: 'Longitude',
  notes: 'Notes',
  objectif: 'Objectif',
  description: 'Description',
  business_plan_id: 'Business plan',
  activity_type: 'Activite',
  cout_total: 'Cout total',
  totalCost: 'Cout total',
  marge: 'Marge',
  margin: 'Marge',
};

const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const labelFor = (key) => LABELS[key] || titleize(key);

const isMoneyKey = (key) =>
  /(montant|cout|cost|gain|prix|dette|budget|charge|revenu|marge|cash|solde|total|apport|financement)/i.test(key);

const isDateKey = (key) => /(date|created_at|updated_at|echeance|deadline|due)/i.test(key);

const formatValue = (key, value) => {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (isDateKey(key) && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
  }
  if (isMoneyKey(key) && value !== '' && value !== null && value !== undefined) return fmtCurrency(value);
  if (typeof value === 'number') return fmtNumber(value);
  return String(value ?? '-');
};

const Field = ({ item }) => {
  const { key, value } = item;
  return (
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
      <div className="text-xs text-[#8a7456] uppercase tracking-wide">{labelFor(key)}</div>
      {String(key).includes('photo') && value ? (
        <img src={String(value)} alt="" className="mt-2 h-32 w-32 rounded-xl object-cover border border-[#d6c3a0]" />
      ) : String(key).includes('qr') && value ? (
        <img src={String(value)} alt="" className="mt-2 h-28 w-28 rounded-xl border border-[#d6c3a0]" />
      ) : ['status', 'statut', 'health_status'].includes(key) ? (
        <div className="mt-1"><Badge status={String(value || '')} /></div>
      ) : (
        <div className="text-[#2f2415] font-medium break-words">{formatValue(key, value)}</div>
      )}
    </div>
  );
};

export default function DetailsModal({ open, onClose, title, data }) {
  const { visibleEntries, systemEntries } = useMemo(() => {
    if (!data) return { visibleEntries: [], systemEntries: [] };

    const entries = Object.entries(data)
      .filter(([key, value]) => !HIDDEN_KEYS.has(key) && typeof value !== 'object' && !isEmpty(value));

    return {
      visibleEntries: entries.filter(([key]) => !SYSTEM_KEYS.has(key)).map(([key, value]) => ({ key, value })),
      systemEntries: entries.filter(([key]) => SYSTEM_KEYS.has(key)).map(([key, value]) => ({ key, value })),
    };
  }, [data]);

  return (
    <BaseModal open={open} onClose={onClose} title={title || 'Details'}>
      {!data ? (
        <p className="text-[#8a7456]">Aucune donnee.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleEntries.length ? visibleEntries.map((item) => <Field key={item.key} item={item} />) : (
              <p className="text-sm text-[#8a7456]">Aucune information metier utile a afficher.</p>
            )}
          </div>

          {systemEntries.length ? (
            <details className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
              <summary className="cursor-pointer text-sm font-bold text-[#2f2415]">Informations systeme</summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {systemEntries.map((item) => <Field key={item.key} item={item} />)}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </BaseModal>
  );
}
