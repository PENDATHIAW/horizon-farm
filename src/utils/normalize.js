import { toNumber } from './format';
import { avicoleCalculatedActiveCount, avicoleInitialCount } from './avicoleMetrics';
const DATE_KEY_RE = /(^date($|_)|_date$|_at$|date_|debut|fin|naissance|achat|vente|deces|vol_detecte|intervention|recolte|prevue|prochaine|livraison|paiement|facture|recorded_at|sent_at|detected_at|event_date|last_seen_at)/i;
const NUMBER_KEY_RE = /(montant|amount|quantite|quantity|prix|price|cout|cost|frais|charge|ca_|marge|margin|roi|score|note|total|solde|seuil|surface|poids|weight|count|nombre|duree|cycle|age|taux|pct|percent|valeur|gain|perte|remise|paye|reste|budget|capacite|production|rendement|niveau|battery|distance|latitude|longitude|initial|current|mortality|malades|vols|vendus|reformes|sorties)/i;
const UI_FIELD_RE = /(_view$|_label$|_display$|^preview_|^calculated_|^computed_|^ui_)/i;
const EXPLICIT_DATE_KEYS = new Set([
  'dernierecommande',
  'derniere_commande',
  'dernierevisite',
  'derniere_visite',
  'prochainevisite',
  'prochaine_visite',
  'dernierelivraison',
  'derniere_livraison',
  'prochainelivraison',
  'prochaine_livraison',
  'derniererelance',
  'derniere_relance',
  'prochainerelance',
  'prochaine_relance',
  'last_contact',
  'last_order',
  'last_delivery',
  'last_visit',
  'next_visit',
]);
const SALE_READY_VALUES = new Set(['true', 'oui', 'yes', '1', 'pret', 'prêt', 'prete', 'prête', 'pret_a_la_vente', 'pret_a_vendre', 'pret_a_vendre_reforme', 'a_reformer', 'confirme', 'confirmé']);
const saleReadyValue = (value) => value === true || SALE_READY_VALUES.has(String(value || '').trim().toLowerCase());
const isSaleReadyRecord = (record = {}) => Boolean(
  saleReadyValue(record.pret_vente_confirme) ||
  saleReadyValue(record.pret_a_la_vente) ||
  saleReadyValue(record.ready_for_sale) ||
  saleReadyValue(record.sale_ready) ||
  saleReadyValue(record.vendable) ||
  saleReadyValue(record.pret_vente) ||
  saleReadyValue(record.sale_readiness_status) ||
  saleReadyValue(record.status) ||
  saleReadyValue(record.statut)
);
const saleReadyDate = (record = {}) => record.date_pret_vente_confirme || String(record.sale_ready_confirmed_at || record.ready_for_sale_at || '').slice(0, 10) || '';
const isBusinessDateKey = (key = '') => {
  const normalized = String(key || '').toLowerCase();
  return DATE_KEY_RE.test(normalized) || EXPLICIT_DATE_KEYS.has(normalized);
};

export const normalizeDate = (value) => {
  if (value === undefined || value === '') return null;
  if (value === null) return null;
  return value;
};

export const normalizeNumber = (value, defaultValue = null) => {
  if (value === undefined || value === '') return defaultValue;
  if (value === null) return defaultValue;
  const next = Number(value);
  return Number.isFinite(next) ? next : defaultValue;
};

export const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value.trim() : value;
};

export const normalizePayloadBeforeSave = (payload = {}, options = {}) => {
  const dropFields = new Set(options.dropFields || []);
  const numericDefaults = options.numericDefaults || {};

  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key, value]) => value !== undefined && !dropFields.has(key) && !UI_FIELD_RE.test(key))
      .map(([key, value]) => {
        if (key === 'id' || key.endsWith('_id')) return [key, normalizeText(value)];
        if (isBusinessDateKey(key)) return [key, normalizeDate(value)];
        if (NUMBER_KEY_RE.test(key)) return [key, normalizeNumber(value, numericDefaults[key] ?? null)];
        if (typeof value === 'number') return [key, Number.isFinite(value) ? value : null];
        if (typeof value === 'string') return [key, normalizeText(value)];
        if (typeof value === 'boolean') return [key, Boolean(value)];
        return [key, value];
      })
  );
};

export const normalizeLot = (lot = {}) => {
  const saleReady = isSaleReadyRecord(lot);
  const normalizedStatus = ['sain', 'malade'].includes(lot.status) ? 'actif' : (lot.status || lot.statut || 'actif');
  const finalStatus = saleReady && !['vendu', 'perdu', 'archive', 'archivé'].includes(String(normalizedStatus).toLowerCase()) ? 'pret_a_la_vente' : normalizedStatus;
  const initial = avicoleInitialCount(lot);
  const dead = toNumber(lot.mortality ?? lot.mortalite ?? lot.morts ?? lot.dead_count ?? lot.deaths ?? lot.pertes_mortalite);
  const stolen = toNumber(lot.vols ?? lot.voles ?? lot.stolen);
  const sold = toNumber(lot.vendus ?? lot.sold_count ?? lot.sold);
  const slaughtered = toNumber(lot.abattus ?? lot.slaughtered ?? lot.transformes ?? lot.transformés ?? lot.sujets_abattus);
  const reformed = toNumber(lot.reformes ?? lot.reformed_count ?? lot.reformed);
  const exits = toNumber(lot.sorties ?? lot.autres_sorties ?? lot.sorties_autres ?? lot.other_exits);
  const exitBase = {
    ...lot,
    initial_count: initial,
    effectif_initial: initial,
    mortality: dead,
    morts: dead,
    vols: stolen,
    vendus: sold,
    sold_count: sold,
    abattus: slaughtered,
    reformes: reformed,
    sorties: exits,
  };
  const calculatedCurrent = avicoleCalculatedActiveCount(exitBase);
  return {
    ...lot,
    productionJour: toNumber(lot.productionJour ?? lot.productionjour ?? lot.production_jour),
    revenuEstime: toNumber(lot.revenuEstime ?? lot.revenu_estime),
    mortality: dead,
    morts: dead,
    initial_count: initial,
    effectif_initial: initial,
    scoresSante: toNumber(lot.scoresSante ?? lot.scores_sante),
    weight_avg: toNumber(lot.weight_avg),
    marge: toNumber(lot.marge),
    malades: toNumber(lot.malades),
    vols: stolen,
    vendus: sold,
    sold_count: sold,
    abattus: slaughtered,
    reformes: reformed,
    sorties: exits,
    current_count: initial > 0 ? calculatedCurrent : toNumber(lot.current_count ?? lot.effectif_actuel),
    effectif_actuel: initial > 0 ? calculatedCurrent : toNumber(lot.effectif_actuel ?? lot.current_count),
    oeufs_casses: toNumber(lot.oeufs_casses),
    taux_ponte: toNumber(lot.taux_ponte),
    frais_sante: toNumber(lot.frais_sante ?? lot.sante),
    health_status: lot.health_status || 'sain',
    status: finalStatus,
    statut: finalStatus,
    autres_frais: toNumber(lot.autres_frais),
    prix_vente_prevu: toNumber(lot.prix_vente_prevu),
    prix_vente_reel: toNumber(lot.prix_vente_reel),
    cout_poussins: toNumber(lot.cout_poussins),
    poids_objectif: toNumber(lot.poids_objectif),
    effectif_vendable: toNumber(lot.effectif_vendable),
    sale_readiness_score: toNumber(lot.sale_readiness_score),
    sale_readiness_status: saleReady ? 'confirme' : (lot.sale_readiness_status || 'non_pret'),
    pret_vente_recommande: Boolean(lot.pret_vente_recommande),
    pret_vente_confirme: saleReady,
    pret_a_la_vente: saleReady,
    ready_for_sale: saleReady,
    sale_ready: saleReady,
    vendable: saleReady,
    date_pret_vente_recommande: lot.date_pret_vente_recommande || '',
    date_pret_vente_confirme: saleReadyDate(lot),
    sale_ready_confirmed_at: lot.sale_ready_confirmed_at || lot.ready_for_sale_at || '',
    raison_pret_vente: lot.raison_pret_vente || (saleReady ? 'Confirmation enregistrée' : ''),
    date_debut: lot.date_debut || '',
    date_fin_prevue: lot.date_fin_prevue || '',
    date_fin_reelle: lot.date_fin_reelle || '',
    duree_cycle_valeur: toNumber(lot.duree_cycle_valeur),
    duree_cycle_unite: lot.duree_cycle_unite || '',
    age_lot_jours: toNumber(lot.age_lot_jours),
  };
};

export const normalizeLots = (rows = []) => rows.map(normalizeLot);

export const normalizeProductionOeufsLog = (log = {}) => {
  const produced = toNumber(log.oeufs_produits);
  const broken = toNumber(log.oeufs_casses);
  const sellable = Math.max(0, produced - broken);

  return {
    ...log,
    oeufs_produits: produced,
    oeufs_casses: broken,
    oeufs_vendables: sellable,
    plateaux: Math.floor(sellable / 30),
    taux_ponte: toNumber(log.taux_ponte),
  };
};

export const normalizeCulture = (culture = {}) => {
  const coutTotal =
    toNumber(culture.cout_total) ||
    toNumber(culture.cout_semences) +
      toNumber(culture.cout_engrais) +
      toNumber(culture.cout_eau) +
      toNumber(culture.cout_main_oeuvre) +
      toNumber(culture.cout_traitement);
  const rendement = toNumber(culture.rendement) || (toNumber(culture.surface) ? toNumber(culture.quantite_recoltee) / toNumber(culture.surface) : 0);

  return {
    ...culture,
    surface: toNumber(culture.surface),
    quantite_prevue: toNumber(culture.quantite_prevue),
    quantite_recoltee: toNumber(culture.quantite_recoltee),
    pertes: toNumber(culture.pertes),
    cout_semences: toNumber(culture.cout_semences),
    cout_engrais: toNumber(culture.cout_engrais),
    cout_eau: toNumber(culture.cout_eau),
    cout_main_oeuvre: toNumber(culture.cout_main_oeuvre),
    cout_traitement: toNumber(culture.cout_traitement),
    cout_total: coutTotal,
    revenu_estime: toNumber(culture.revenu_estime),
    revenu_reel: toNumber(culture.revenu_reel),
    marge_estimee: toNumber(culture.marge_estimee) || toNumber(culture.revenu_estime) - coutTotal,
    marge_reelle: toNumber(culture.marge_reelle) || toNumber(culture.revenu_reel) - coutTotal,
    rendement,
    score_sante: toNumber(culture.score_sante),
  };
};

export const normalizeCultures = (rows = []) => rows.map(normalizeCulture);

export const normalizeClient = (client = {}) => ({
  ...client,
  totalAchats: toNumber(client.totalAchats ?? client.totalachats),
  derniereCommande: client.derniereCommande ?? client.dernierecommande,
  whatsapp: client.whatsapp ?? client.tel,
  statut: client.statut || 'actif',
});

export const normalizeAnimal = (animal = {}) => {
  const saleReady = isSaleReadyRecord(animal);
  const normalizedStatus = ['sain', 'malade'].includes(animal.status) ? 'actif' : (animal.status || 'actif');
  const finalStatus = saleReady && normalizedStatus !== 'vendu' ? 'pret_a_la_vente' : normalizedStatus;
  return {
    ...animal,
    tag: animal.tag || animal.id,
    health_status: animal.health_status || (['sain', 'malade'].includes(animal.status) ? animal.status : 'sain'),
    status: finalStatus,
    statut: animal.statut || finalStatus,
    frais_sante: toNumber(animal.frais_sante ?? animal.sante),
    autres_frais: toNumber(animal.autres_frais),
    prix_vente_reel: toNumber(animal.prix_vente_reel ?? animal.sale_price),
    mode_acquisition: animal.mode_acquisition || 'achat',
    date_naissance: animal.date_naissance || animal.naissance || '',
    date_entree_ferme: animal.date_entree_ferme || animal.date_achat || '',
    mere_id: animal.mere_id || '',
    pere_id: animal.pere_id || '',
    portee_id: animal.portee_id || '',
    notes_reproduction: animal.notes_reproduction || '',
    en_gestation: Boolean(animal.en_gestation),
    date_debut_gestation: animal.date_debut_gestation || '',
    date_prevue_mise_bas: animal.date_prevue_mise_bas || '',
    male_reproducteur_id: animal.male_reproducteur_id || '',
    statut_reproduction: animal.statut_reproduction || (animal.sexe === 'F' ? 'inconnu' : 'non_reproductrice'),
    fournisseur_vendeur: animal.fournisseur_vendeur || '',
    fournisseur_id: animal.fournisseur_id || '',
    provenance: animal.provenance || '',
    poids_objectif: toNumber(animal.poids_objectif),
    sale_readiness_score: toNumber(animal.sale_readiness_score),
    sale_readiness_status: saleReady ? 'confirme' : (animal.sale_readiness_status || 'non_pret'),
    pret_vente_recommande: Boolean(animal.pret_vente_recommande),
    pret_vente_confirme: saleReady,
    pret_a_la_vente: saleReady,
    ready_for_sale: saleReady,
    sale_ready: saleReady,
    vendable: saleReady,
    date_pret_vente_recommande: animal.date_pret_vente_recommande || '',
    date_pret_vente_confirme: saleReadyDate(animal),
    sale_ready_confirmed_at: animal.sale_ready_confirmed_at || animal.ready_for_sale_at || '',
    raison_pret_vente: animal.raison_pret_vente || (saleReady ? 'Confirmation enregistrée' : ''),
    traitements_notes: animal.traitements_notes || '',
    ras_veterinaire: animal.ras_veterinaire || '',
    date_vente: animal.date_vente || '',
    client_id: animal.client_id || '',
    moyen_paiement: animal.moyen_paiement || '',
    commentaire_vente: animal.commentaire_vente || '',
    date_deces: animal.date_deces || '',
    cause_deces: animal.cause_deces || '',
    valeur_perte_estimee: toNumber(animal.valeur_perte_estimee),
    commentaire_deces: animal.commentaire_deces || '',
    date_vol_detecte: animal.date_vol_detecte || '',
    lieu_vol: animal.lieu_vol || '',
    commentaire_vol: animal.commentaire_vol || '',
    date_reforme: animal.date_reforme || '',
    motif_reforme: animal.motif_reforme || '',
    valeur_residuelle: toNumber(animal.valeur_residuelle),
    commentaire_reforme: animal.commentaire_reforme || '',
    date_detection_maladie: animal.date_detection_maladie || '',
    symptomes: animal.symptomes || '',
    traitement_prevu: animal.traitement_prevu || '',
    veterinaire_id: animal.veterinaire_id || '',
    cout_traitement_estime: toNumber(animal.cout_traitement_estime),
    date_debut_traitement: animal.date_debut_traitement || '',
    date_fin_traitement_prevue: animal.date_fin_traitement_prevue || '',
    traitement_en_cours: animal.traitement_en_cours || '',
    cout_traitement: toNumber(animal.cout_traitement),
    raison_surveillance: animal.raison_surveillance || '',
    date_prochaine_verification: animal.date_prochaine_verification || '',
    photo_url: animal.photo_url || animal.photoUrl || '',
    race: animal.race || '',
    qr_url: animal.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(animal.id || animal.tag || '')}`,
  };
};

export const normalizeTransaction = (transaction = {}) => ({
  ...transaction,
  montant: toNumber(transaction.montant),
  statut: transaction.statut || (transaction.justif ? 'paye' : 'paye'),
  module_lie: transaction.module_lie || transaction.moduleLie || '',
  related_id: transaction.related_id || transaction.relatedId || '',
  client_id: transaction.client_id || transaction.clientId || '',
  fournisseur_id: transaction.fournisseur_id || transaction.fournisseurId || '',
  justificatif_url: transaction.justificatif_url || transaction.justificatifUrl || '',
  treasury_account_id: transaction.treasury_account_id || transaction.treasuryAccountId || '',
  accounting_entry_id: transaction.accounting_entry_id || transaction.accountingEntryId || '',
});

export const normalizeStock = (stock = {}) => ({
  ...stock,
  quantite: toNumber(stock.quantite),
  seuil: toNumber(stock.seuil),
  prixUnit: toNumber(stock.prixUnit ?? stock.prixunit),
});

export const normalizeTracabilite = (trace = {}) => ({
  ...trace,
  margeFinale: toNumber(trace.margeFinale ?? trace.margefinale),
  roi: toNumber(trace.roi),
});

export const normalizeFournisseur = (fournisseur = {}) => ({
  ...fournisseur,
  note: toNumber(fournisseur.note),
  dettes: toNumber(fournisseur.dettes),
  livraisons: toNumber(fournisseur.livraisons),
  statut: fournisseur.statut || 'actif',
  source: fournisseur.source || 'manuel',
  latitude: fournisseur.latitude === null || fournisseur.latitude === undefined ? null : toNumber(fournisseur.latitude),
  longitude: fournisseur.longitude === null || fournisseur.longitude === undefined ? null : toNumber(fournisseur.longitude),
  distance_km: fournisseur.distance_km === null || fournisseur.distance_km === undefined ? null : toNumber(fournisseur.distance_km),
  verified: Boolean(fournisseur.verified),
  favorite: Boolean(fournisseur.favorite),
});

export const normalizeVeterinaire = (veterinaire = {}) => ({
  ...veterinaire,
  note: toNumber(veterinaire.note),
  source: veterinaire.source || 'manuel',
  latitude: veterinaire.latitude === null || veterinaire.latitude === undefined ? null : toNumber(veterinaire.latitude),
  longitude: veterinaire.longitude === null || veterinaire.longitude === undefined ? null : toNumber(veterinaire.longitude),
  distance_km: veterinaire.distance_km === null || veterinaire.distance_km === undefined ? null : toNumber(veterinaire.distance_km),
  verified: Boolean(veterinaire.verified),
  favorite: Boolean(veterinaire.favorite),
});

export const normalizeSalesOpportunity = (opp = {}) => {
  const sourceModule = opp.source_module || opp.created_from || (String(opp.source_type || '').includes('animal') ? 'animaux' : String(opp.source_type || '').includes('avicole') || String(opp.source_type || '').includes('lot') ? 'avicole' : '');
  const sourceId = opp.source_id || opp.related_id || opp.entity_id || opp.lot_id || opp.animal_id || '';
  const rawKey = opp.opportunity_key || opp.dedupe_key || (sourceModule && sourceId ? `${sourceModule}:${sourceId}` : '');
  const opportunityKey = String(rawKey).replace(/^animal-sale:/, 'animaux:').replace(/^avicole-sale:/, 'avicole:').replace(/^culture-sale:/, 'cultures:');
  const estimated = toNumber(opp.estimated_value ?? opp.estimated_amount ?? opp.montant_estime);
  const status = opp.status || opp.statut || 'ouverte';
  return {
    ...opp,
    opportunity_key: opportunityKey,
    dedupe_key: opportunityKey || opp.dedupe_key,
    source_module: sourceModule,
    source_id: sourceId,
    estimated_value: estimated,
    estimated_amount: estimated,
    montant_estime: estimated,
    status,
    statut: status,
  };
};

export const normalizeByModule = (moduleKey, rows) => {
  if (moduleKey === 'animaux') return rows.map(normalizeAnimal);
  if (moduleKey === 'avicole') return normalizeLots(rows);
  if (moduleKey === 'production_oeufs_logs') return rows.map(normalizeProductionOeufsLog);
  if (moduleKey === 'clients') return rows.map(normalizeClient);
  if (moduleKey === 'finances') return rows.map(normalizeTransaction);
  if (moduleKey === 'cultures') return normalizeCultures(rows);
  if (moduleKey === 'stock') return rows.map(normalizeStock);
  if (moduleKey === 'tracabilite') return rows.map(normalizeTracabilite);
  if (moduleKey === 'fournisseurs') return rows.map(normalizeFournisseur);
  if (moduleKey === 'veterinaires') return rows.map(normalizeVeterinaire);
  if (moduleKey === 'sales_opportunities') return rows.map(normalizeSalesOpportunity);
  return rows;
};
