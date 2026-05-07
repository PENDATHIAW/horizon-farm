import { toNumber } from './format';
const DATE_KEY_RE = /(^date($|_)|_date$|_at$|date_|debut|fin|naissance|achat|vente|deces|vol_detecte|intervention|recolte|prevue|prochaine|livraison|paiement|facture|recorded_at|sent_at|detected_at|event_date|last_seen_at)/i;
const NUMBER_KEY_RE = /(montant|amount|quantite|quantity|prix|price|cout|cost|frais|charge|ca_|marge|margin|roi|score|note|total|solde|seuil|surface|poids|weight|count|nombre|duree|cycle|age|taux|pct|percent|valeur|gain|perte|remise|paye|reste|budget|capacite|production|rendement|niveau|battery|distance|latitude|longitude|initial|current|mortality|malades|vols|vendus|reformes|sorties)/i;
const UI_FIELD_RE = /(_view$|_label$|_display$|^preview_|^calculated_|^computed_|^ui_)/i;

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
        if (DATE_KEY_RE.test(key)) return [key, normalizeDate(value)];
        if (NUMBER_KEY_RE.test(key)) return [key, normalizeNumber(value, numericDefaults[key] ?? null)];
        if (typeof value === 'number') return [key, Number.isFinite(value) ? value : null];
        if (typeof value === 'string') return [key, normalizeText(value)];
        if (typeof value === 'boolean') return [key, Boolean(value)];
        return [key, value];
      })
  );
};

export const normalizeLot = (lot = {}) => ({
  ...lot,
  productionJour: toNumber(lot.productionJour ?? lot.productionjour ?? lot.production_jour),
  revenuEstime: toNumber(lot.revenuEstime ?? lot.revenu_estime),
  mortality: toNumber(lot.mortality ?? lot.mortalite),
  initial_count: toNumber(lot.initial_count),
  scoresSante: toNumber(lot.scoresSante ?? lot.scores_sante),
  weight_avg: toNumber(lot.weight_avg),
  marge: toNumber(lot.marge),
  malades: toNumber(lot.malades),
  vols: toNumber(lot.vols),
  vendus: toNumber(lot.vendus),
  reformes: toNumber(lot.reformes),
  sorties: toNumber(lot.sorties),
  current_count: toNumber(lot.initial_count) > 0
    ? Math.max(
        0,
        toNumber(lot.initial_count) -
          toNumber(lot.mortality ?? lot.mortalite) -
          toNumber(lot.vols) -
          toNumber(lot.vendus) -
          toNumber(lot.reformes) -
          toNumber(lot.sorties)
      )
    : toNumber(lot.current_count),
  oeufs_casses: toNumber(lot.oeufs_casses),
  taux_ponte: toNumber(lot.taux_ponte),
  frais_sante: toNumber(lot.frais_sante ?? lot.sante),
  health_status: lot.health_status || 'sain',
  status: lot.status || 'actif',
  autres_frais: toNumber(lot.autres_frais),
  prix_vente_prevu: toNumber(lot.prix_vente_prevu),
  prix_vente_reel: toNumber(lot.prix_vente_reel),
  cout_poussins: toNumber(lot.cout_poussins),
  poids_objectif: toNumber(lot.poids_objectif),
  effectif_vendable: toNumber(lot.effectif_vendable),
  sale_readiness_score: toNumber(lot.sale_readiness_score),
  sale_readiness_status: lot.sale_readiness_status || 'non_pret',
  pret_vente_recommande: Boolean(lot.pret_vente_recommande),
  pret_vente_confirme: Boolean(lot.pret_vente_confirme),
  date_pret_vente_recommande: lot.date_pret_vente_recommande || '',
  date_pret_vente_confirme: lot.date_pret_vente_confirme || '',
  raison_pret_vente: lot.raison_pret_vente || '',
  date_debut: lot.date_debut || '',
  date_fin_prevue: lot.date_fin_prevue || '',
  date_fin_reelle: lot.date_fin_reelle || '',
  duree_cycle_valeur: toNumber(lot.duree_cycle_valeur),
  duree_cycle_unite: lot.duree_cycle_unite || '',
  age_lot_jours: toNumber(lot.age_lot_jours),
});

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

export const normalizeAnimal = (animal = {}) => ({
  ...animal,
  tag: animal.tag || animal.id,
  health_status: animal.health_status || (['sain', 'malade'].includes(animal.status) ? animal.status : 'sain'),
  status: ['sain', 'malade'].includes(animal.status) ? 'actif' : (animal.status || 'actif'),
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
  sale_readiness_status: animal.sale_readiness_status || 'non_pret',
  pret_vente_recommande: Boolean(animal.pret_vente_recommande),
  pret_vente_confirme: Boolean(animal.pret_vente_confirme),
  date_pret_vente_recommande: animal.date_pret_vente_recommande || '',
  date_pret_vente_confirme: animal.date_pret_vente_confirme || '',
  raison_pret_vente: animal.raison_pret_vente || '',
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
});

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
  return rows;
};



