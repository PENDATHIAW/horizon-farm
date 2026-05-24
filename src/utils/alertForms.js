const arr = (value) => Array.isArray(value) ? value : [];
const labelOf = (row = {}, fallback = '') => row.name || row.nom || row.title || row.libelle || row.produit || row.id || fallback;
const clean = (value) => String(value || '').trim();

export const ALERT_SEVERITIES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'À surveiller' },
  { value: 'critique', label: 'Critique' },
  { value: 'urgence', label: 'Urgence' },
];

export const ALERT_TYPES = [
  { value: 'sante', label: 'Santé / soin / vaccin' },
  { value: 'stock', label: 'Stock sous seuil' },
  { value: 'vente', label: 'Vente / encaissement / livraison' },
  { value: 'biosécurité', label: 'Biosécurité' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'maintenance', label: 'Maintenance équipement' },
  { value: 'smartfarm', label: 'Capteur / caméra / température' },
  { value: 'finance', label: 'Finance / dette / créance' },
  { value: 'culture', label: 'Culture / météo / intrant' },
  { value: 'autre', label: 'Autre alerte' },
];

export const ALERT_ACTION_TEMPLATES = [
  { value: 'appeler_veterinaire', label: 'Appeler vétérinaire', action: 'Appeler le vétérinaire, isoler les cas suspects et noter le suivi.' },
  { value: 'commander_stock', label: 'Commander stock / aliment', action: 'Contacter le fournisseur, confirmer prix, délai et quantité à commander.' },
  { value: 'relancer_client', label: 'Relancer client', action: 'Appeler le client, confirmer la date de paiement et mettre à jour la vente.' },
  { value: 'preparer_livraison', label: 'Préparer livraison', action: 'Préparer la commande, vérifier facture/reçu et confirmer livraison avec le client.' },
  { value: 'controle_biosecurite', label: 'Contrôle biosécurité', action: 'Vérifier pédiluve, accès, visiteurs, lavage mains, nettoyage et anomalies.' },
  { value: 'verifier_capteur', label: 'Vérifier capteur/caméra', action: 'Contrôler alimentation, réseau, emplacement et état du capteur ou de la caméra.' },
  { value: 'maintenance', label: 'Faire maintenance', action: 'Inspecter équipement, tester fonctionnement, noter panne et planifier réparation.' },
  { value: 'verifier_intrants', label: 'Vérifier intrants culture', action: 'Contrôler stock d’intrants, météo et besoin de traitement ou arrosage.' },
  { value: 'nouvelle_action', label: 'Nouvelle action libre', action: '' },
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
  return [...sources, { value: 'autre', label: 'Alerte générale', entityType: 'alerte', rows: [] }];
}

const actionTemplate = (value) => ALERT_ACTION_TEMPLATES.find((item) => item.value === value);
const typeLabel = (value) => ALERT_TYPES.find((item) => item.value === value)?.label || '';

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
    { key: 'module_source', label: 'Module concerné', type: 'select', clearOnChange: ['entity_type', 'entity_id'], options: sources, emptyLabel: 'Aucun module avec fiche valide' },
    { key: 'entity_type', label: 'Type concerné', type: 'readonly', value: (form) => sourceByValue.get(form.module_source)?.entityType || '' },
    { key: 'entity_id', label: 'Cible concernée', type: 'select', showWhen: (form) => clean(form.module_source) && form.module_source !== 'autre', options: entityOptions, emptyLabel: 'Aucune cible disponible pour ce module' },
    { key: 'alert_type', label: 'Type d’alerte', type: 'select', options: ALERT_TYPES, emptyLabel: 'Choisir le type' },
    { key: 'title', label: 'Titre', type: 'text', required: true },
    { key: 'message', label: 'Message simple', type: 'textarea', fullWidth: true, rows: 3 },
    { key: 'severity', label: 'Gravité', type: 'select', options: ALERT_SEVERITIES },
    { key: 'action_template', label: 'Action recommandée prédéfinie', type: 'select', options: ALERT_ACTION_TEMPLATES.map(({ value, label }) => ({ value, label })), emptyLabel: 'Choisir une action' },
    { key: 'action_recommandee', label: 'Action recommandée libre ou ajustée', type: 'textarea', fullWidth: true, rows: 2 },
    { key: 'responsable', label: 'Destinataire WhatsApp / responsable', type: 'select', options: responsibleOptions, emptyLabel: 'Aucun responsable disponible' },
    { key: 'create_task', label: 'Créer une tâche terrain après alerte ?', type: 'select', options: [
      { value: 'non', label: 'Non, alerte seulement' },
      { value: 'oui', label: 'Oui, tâche à créer depuis Alertes' },
    ] },
  ];
}

export function normalizeAlertPayload(payload = {}, context = {}) {
  const sources = alertEntitySources(context);
  const source = sources.find((item) => item.value === payload.module_source);
  const template = actionTemplate(payload.action_template);
  const action = clean(payload.action_recommandee) || template?.action || '';
  const alertType = payload.alert_type || 'autre';
  const title = clean(payload.title) || `${typeLabel(alertType) || 'Alerte'}${payload.entity_id ? ` · ${payload.entity_id}` : ''}`;
  const message = clean(payload.message) || action || 'Action terrain à vérifier.';
  return {
    ...payload,
    title,
    message,
    action_recommandee: action,
    type_alerte: alertType,
    entity_type: payload.module_source === 'autre' ? 'alerte' : (source?.entityType || payload.entity_type || ''),
    entity_id: payload.module_source === 'autre' ? '' : payload.entity_id,
    status: payload.status || 'nouvelle',
    task_intent: payload.create_task === 'oui' ? 'a_creer' : '',
  };
}
