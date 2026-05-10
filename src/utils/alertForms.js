const arr = (value) => Array.isArray(value) ? value : [];
const labelOf = (row = {}, fallback = '') => row.name || row.nom || row.title || row.libelle || row.produit || row.id || fallback;
const clean = (value) => String(value || '').trim();

export const ALERT_SEVERITIES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'À surveiller' },
  { value: 'critique', label: 'Critique' },
  { value: 'urgence', label: 'Urgence' },
];

export function alertEntitySources({ animaux = [], lots = [], stocks = [], cultures = [], transactions = [], finances = [], clients = [], fournisseurs = [], equipements = [], sensorDevices = [] } = {}) {
  const txRows = arr(transactions).length ? arr(transactions) : arr(finances);
  const sources = [
    { value: 'animaux', label: `Animaux (${arr(animaux).length})`, entityType: 'animal', rows: arr(animaux) },
    { value: 'avicole', label: `Avicole (${arr(lots).length})`, entityType: 'lot_avicole', rows: arr(lots) },
    { value: 'stock', label: `Stock (${arr(stocks).length})`, entityType: 'stock', rows: arr(stocks) },
    { value: 'cultures', label: `Cultures (${arr(cultures).length})`, entityType: 'culture', rows: arr(cultures) },
    { value: 'finances', label: `Finances (${txRows.length})`, entityType: 'transaction', rows: txRows },
    { value: 'clients', label: `Clients (${arr(clients).length})`, entityType: 'client', rows: arr(clients) },
    { value: 'fournisseurs', label: `Fournisseurs (${arr(fournisseurs).length})`, entityType: 'fournisseur', rows: arr(fournisseurs) },
    { value: 'equipements', label: `Équipements (${arr(equipements).length})`, entityType: 'equipement', rows: arr(equipements) },
    { value: 'smartfarm', label: `Smart Farm (${arr(sensorDevices).length})`, entityType: 'sensor', rows: arr(sensorDevices) },
  ].filter((source) => source.rows.length > 0);
  return [...sources, { value: 'autre', label: 'Alerte générale', entityType: 'autre', rows: [] }];
}

export function alertFields(context = {}, responsibleOptions = []) {
  const sources = alertEntitySources(context);
  const sourceByValue = new Map(sources.map((source) => [source.value, source]));
  const entityOptions = (form = {}) => {
    const source = sourceByValue.get(form.module_source);
    if (!source || source.value === 'autre') return [];
    return source.rows.filter((row) => row?.id).map((row) => ({ value: row.id, label: `${labelOf(row)} · ${row.id}` }));
  };
  return [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'title', label: 'Titre', type: 'text', required: true },
    { key: 'message', label: 'Message', type: 'textarea', fullWidth: true, rows: 3 },
    { key: 'module_source', label: 'Module lié', type: 'select', clearOnChange: ['entity_type', 'entity_id'], options: sources, emptyLabel: 'Aucun module avec fiche valide' },
    { key: 'entity_type', label: 'Type entité', type: 'readonly', value: (form) => sourceByValue.get(form.module_source)?.entityType || '' },
    { key: 'entity_id', label: 'Entité liée', type: 'select', showWhen: (form) => clean(form.module_source) && form.module_source !== 'autre', options: entityOptions, emptyLabel: 'Aucune entité disponible pour ce module' },
    { key: 'severity', label: 'Gravité', type: 'select', options: ALERT_SEVERITIES },
    { key: 'responsable', label: 'Destinataire / responsable', type: 'select', options: responsibleOptions, emptyLabel: 'Aucun responsable disponible' },
    { key: 'action_recommandee', label: 'Action recommandée', type: 'textarea', fullWidth: true, rows: 2 },
  ];
}

export function normalizeAlertPayload(payload = {}, context = {}) {
  const sources = alertEntitySources(context);
  const source = sources.find((item) => item.value === payload.module_source);
  return {
    ...payload,
    entity_type: payload.module_source === 'autre' ? 'alerte' : (source?.entityType || payload.entity_type || ''),
    entity_id: payload.module_source === 'autre' ? '' : payload.entity_id,
    status: payload.status || 'nouvelle',
  };
}
