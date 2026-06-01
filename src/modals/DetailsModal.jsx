import { useEffect, useMemo, useState } from 'react';
import BaseModal from './BaseModal';
import Badge from '../components/Badge';
import FicheTabsBar from '../components/FicheTabsBar.jsx';
import { fmtCurrency, fmtNumber, titleize } from '../utils/format';

const HIDDEN_KEYS = new Set([
  '__meta',
  'owner_user_id',
  'user_id',
  'raw',
  'metadata',
  'provider_response',
  'source_record_id',
  'source_id',
  'source_module',
  'module_source',
  'entity_id',
  'entity_type',
  'related_id',
  'target_id',
  'task_dedupe_key',
  'alert_dedupe_key',
  'dedupe_key',
  'action_key',
  'workflow_id',
  'workflow_type',
  'workflow_meta',
  'transaction_origin',
  'linked_finance_transaction_id',
  'linked_document_id',
  'linked_task_id',
  'linked_alert_id',
  'finance_synced_at',
]);

const SYSTEM_KEYS = new Set(['id', 'external_id', 'created_at', 'updated_at', 'source']);

const LABELS = {
  id: 'ID',
  nom: 'Nom',
  name: 'Nom',
  libelle: 'Libellé',
  title: 'Titre',
  type: 'Type',
  status: 'Statut',
  statut: 'Statut',
  health_status: 'État de santé',
  frais_sante: 'Frais santé / soins',
  purchase_cost: 'Prix achat',
  sale_price: 'Prix vente',
  prix_vente_reel: 'Prix vente réel',
  montant: 'Montant',
  montant_total: 'Montant total',
  montant_mensuel: 'Montant mensuel',
  gain: 'Gain',
  roi: 'ROI',
  date: 'Date',
  created_at: 'Créé le',
  updated_at: 'Mis à jour le',
  source: 'Origine',
  external_id: 'Référence externe',
  verified: 'Vérifié',
  favorite: 'Favori',
  distance_km: 'Distance',
  latitude: 'Latitude',
  longitude: 'Longitude',
  notes: 'Notes',
  objectif: 'Objectif',
  description: 'Description',
  business_plan_id: 'Business plan',
  activity_type: 'Activité',
  cout_total: 'Coût total',
  totalCost: 'Coût total',
  marge: 'Marge',
  margin: 'Marge',
};

const isEmpty = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  typeof value === 'function' ||
  (Array.isArray(value) && value.length === 0);

const isUserVisibleValue = (value) => {
  if (isEmpty(value)) return false;
  if (typeof value === 'object') return false;
  const text = String(value);
  return !/undefined|null|NaN|\[object Object\]|source_record_id|source_id|entity_id|module_source|dedupe|workflow|payload|handler|callback|CRUD|debug/i.test(text);
};

const labelFor = (key) => LABELS[key] || titleize(key);

const isMoneyKey = (key) =>
  /(montant|cout|cost|gain|prix|dette|budget|charge|revenu|marge|cash|solde|total|apport|financement)/i.test(key);

const isDateKey = (key) => /(date|created_at|updated_at|echeance|deadline|due)/i.test(key);

const isTechnicalKey = (key) =>
  /(battery|stream|url|latitude|longitude|distance|sensor|camera|zone|location|type|status|statut|health|online|source|module|verified|favorite)/i.test(key);

const isNoteKey = (key) => /(note|description|comment|recommendation|objectif)/i.test(key);

const bucketForKey = (key) => {
  if (SYSTEM_KEYS.has(key)) return 'suivi';
  if (isMoneyKey(key)) return 'finances';
  if (isTechnicalKey(key)) return 'technique';
  if (isNoteKey(key)) return 'notes';
  return 'general';
};

const formatValue = (key, value) => {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (isDateKey(key) && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('fr-FR');
  }
  if (isMoneyKey(key) && value !== '' && value !== null && value !== undefined) return fmtCurrency(value);
  if (typeof value === 'number') return fmtNumber(value);
  const text = String(value ?? '-');
  return /undefined|null|NaN|\[object Object\]/i.test(text) ? 'Non renseigné' : text;
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
  const [tab, setTab] = useState('general');

  useEffect(() => {
    if (open) setTab('general');
  }, [open, data?.id]);

  const grouped = useMemo(() => {
    if (!data) return { general: [], technique: [], finances: [], notes: [], suivi: [] };

    const buckets = { general: [], technique: [], finances: [], notes: [], suivi: [] };
    Object.entries(data)
      .filter(([key, value]) => !HIDDEN_KEYS.has(key) && isUserVisibleValue(value))
      .forEach(([key, value]) => {
        buckets[bucketForKey(key)].push({ key, value });
      });
    return buckets;
  }, [data]);

  const tabs = useMemo(() => {
    const list = [{ id: 'general', label: 'Général' }];
    if (grouped.technique.length) list.push({ id: 'technique', label: 'Technique' });
    if (grouped.finances.length) list.push({ id: 'finances', label: 'Finances' });
    if (grouped.notes.length) list.push({ id: 'notes', label: 'Notes' });
    if (grouped.suivi.length) list.push({ id: 'suivi', label: 'Suivi' });
    return list;
  }, [grouped]);

  const activeEntries = grouped[tab] || grouped.general;

  return (
    <BaseModal open={open} onClose={onClose} title={title || 'Details'}>
      {!data ? (
        <p className="text-[#8a7456]">Aucune donnée.</p>
      ) : (
        <div className="space-y-4">
          {tabs.length > 1 ? <FicheTabsBar tabs={tabs} active={tab} onChange={setTab} /> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeEntries.length ? activeEntries.map((item) => <Field key={item.key} item={item} />) : (
              <p className="text-sm text-[#8a7456]">Aucune information dans cet onglet.</p>
            )}
          </div>
        </div>
      )}
    </BaseModal>
  );
}
