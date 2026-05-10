const arr = (value) => Array.isArray(value) ? value : [];
const labelOf = (row = {}, fallback = '') => row.name || row.nom || row.title || row.libelle || row.produit || row.id || fallback;
const clean = (value) => String(value || '').trim();

export const DOC_CATEGORIES = [
  { value: 'facture', label: 'Facture' },
  { value: 'recu', label: 'Reçu' },
  { value: 'ordonnance', label: 'Ordonnance' },
  { value: 'certificat', label: 'Certificat' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'bon_livraison', label: 'Bon de livraison' },
  { value: 'photo', label: 'Photo' },
  { value: 'rapport', label: 'Rapport' },
  { value: 'presentation_projet', label: 'Présentation projet' },
  { value: 'autre', label: 'Autre' },
];

export function documentEntitySources({ animaux = [], lots = [], cultures = [], clients = [], fournisseurs = [], transactions = [], finances = [], stocks = [] } = {}) {
  const txRows = arr(transactions).length ? arr(transactions) : arr(finances);
  const sources = [
    { value: 'animaux', label: `Animaux (${arr(animaux).length})`, entityType: 'animal', rows: arr(animaux) },
    { value: 'avicole', label: `Avicole (${arr(lots).length})`, entityType: 'lot_avicole', rows: arr(lots) },
    { value: 'cultures', label: `Cultures (${arr(cultures).length})`, entityType: 'culture', rows: arr(cultures) },
    { value: 'clients', label: `Clients (${arr(clients).length})`, entityType: 'client', rows: arr(clients) },
    { value: 'fournisseurs', label: `Fournisseurs (${arr(fournisseurs).length})`, entityType: 'fournisseur', rows: arr(fournisseurs) },
    { value: 'finances', label: `Finances (${txRows.length})`, entityType: 'transaction', rows: txRows },
    { value: 'stock', label: `Stock (${arr(stocks).length})`, entityType: 'stock', rows: arr(stocks) },
  ].filter((source) => source.rows.length > 0);
  return [...sources, { value: 'autre', label: 'Document général', entityType: 'autre', rows: [] }];
}

export function documentFields(context = {}) {
  const sources = documentEntitySources(context);
  const sourceByValue = new Map(sources.map((source) => [source.value, source]));
  const entityOptions = (form = {}) => {
    const source = sourceByValue.get(form.module_source);
    if (!source || source.value === 'autre') return [];
    return source.rows.filter((row) => row?.id).map((row) => ({ value: row.id, label: `${labelOf(row)} · ${row.id}` }));
  };
  return [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'title', label: 'Titre', type: 'text', required: true },
    { key: 'document_category', label: 'Catégorie', type: 'select', options: DOC_CATEGORIES },
    { key: 'file_url', label: 'Fichier / image', type: 'image' },
    { key: 'file_type', label: 'Type fichier', type: 'select', options: ['pdf', 'image', 'excel', 'word', 'autre'] },
    { key: 'module_source', label: 'Module lié', type: 'select', clearOnChange: ['entity_type', 'entity_id', 'related_id'], options: sources, emptyLabel: 'Aucun module avec fiche valide' },
    { key: 'entity_type', label: 'Type entité liée', type: 'readonly', value: (form) => sourceByValue.get(form.module_source)?.entityType || '' },
    { key: 'entity_id', label: 'Entité liée', type: 'select', showWhen: (form) => clean(form.module_source) && form.module_source !== 'autre', options: entityOptions, emptyLabel: 'Aucune entité disponible pour ce module' },
    { key: 'related_id', label: 'Référence libre', type: 'text', showWhen: (form) => form.module_source === 'autre' },
    { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
  ];
}

export function normalizeDocumentPayload(payload = {}, context = {}) {
  const sources = documentEntitySources(context);
  const source = sources.find((item) => item.value === payload.module_source);
  const entityType = source?.entityType || payload.entity_type || '';
  return {
    ...payload,
    entity_type: payload.module_source === 'autre' ? 'autre' : entityType,
    related_id: payload.related_id || payload.entity_id || '',
  };
}
