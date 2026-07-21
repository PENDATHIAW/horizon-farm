/**
 * Préremplissage / héritage des formulaires.
 *
 * Principe : « tant que l'information existe, on ne la resaisit pas ». Quand on
 * ouvre un formulaire depuis un contexte (fiche animal, lot, client…), ses champs
 * héritent automatiquement de ce qui est déjà connu, avec une provenance pour
 * l'afficher (« repris de la fiche - modifiable ») et sans jamais écraser ce que
 * l'utilisateur a déjà tapé.
 *
 * Priorité des sources (haute → basse) :
 *   context  : intention explicite d'ouverture (ex. type d'intervention choisi)
 *   subject  : l'enregistrement d'origine (animal, lot, client, culture)
 *   related  : enregistrements liés (dernière pesée, dernier soin…)
 *   lastValue: dernière valeur saisie par l'utilisateur pour ce champ
 *   default  : valeur paramétrée par défaut
 */

export const PREFILL_SOURCES = ['context', 'subject', 'related', 'lastValue', 'default'];

const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Lecture d'un chemin « a.b.c » dans un objet, tolérante. */
export function getPath(obj, path) {
  if (!obj || !path) return undefined;
  return String(path).split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Registre des règles d'héritage par type de formulaire. Chaque champ liste des
 * candidats essayés dans l'ordre ; le premier non vide gagne. `value` = littéral.
 */
export const FORM_INHERITANCE_RULES = {
  sante_intervention: {
    animal_id: [{ source: 'subject', path: 'id' }],
    boucle_numero: [{ source: 'subject', path: 'boucle_numero' }, { source: 'subject', path: 'tag' }],
    espece: [{ source: 'subject', path: 'espece' }, { source: 'subject', path: 'type' }],
    type: [{ source: 'subject', path: 'type' }],
    poids: [{ source: 'subject', path: 'poids' }, { source: 'related', path: 'lastWeighing.poids' }],
    responsable: [{ source: 'subject', path: 'responsable' }, { source: 'context', path: 'user' }, { source: 'lastValue', path: 'responsable' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
    date: [{ source: 'context', path: 'date' }, { source: 'context', path: 'today' }],
    type_intervention: [{ source: 'context', path: 'typeIntervention' }, { source: 'default', value: 'vaccination' }],
  },
  feeding_distribution: {
    cible_id: [{ source: 'subject', path: 'id' }],
    cible_type: [{ source: 'context', path: 'scope' }],
    espece: [{ source: 'subject', path: 'espece' }, { source: 'subject', path: 'type' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
    date: [{ source: 'context', path: 'date' }, { source: 'context', path: 'today' }],
    produit: [{ source: 'lastValue', path: 'produit' }, { source: 'related', path: 'lastFeeding.produit' }],
    prix_unitaire: [{ source: 'related', path: 'lastFeeding.prix_unitaire' }, { source: 'lastValue', path: 'prix_unitaire' }],
  },
  sale_record: {
    client_id: [{ source: 'context', path: 'clientId' }, { source: 'subject', path: 'client_id' }],
    source_id: [{ source: 'subject', path: 'id' }],
    source_type: [{ source: 'context', path: 'sourceType' }],
    product_name: [{ source: 'subject', path: 'name' }, { source: 'subject', path: 'nom' }, { source: 'subject', path: 'produit' }],
    unit_price: [{ source: 'subject', path: 'prix_vente_unitaire' }, { source: 'related', path: 'recommendedPrice' }, { source: 'lastValue', path: 'unit_price' }],
    unit: [{ source: 'subject', path: 'unite' }, { source: 'lastValue', path: 'unit' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
    date: [{ source: 'context', path: 'today' }],
  },
  animal_creation: {
    espece: [{ source: 'context', path: 'mother.espece' }, { source: 'subject', path: 'espece' }],
    type: [{ source: 'context', path: 'mother.type' }, { source: 'subject', path: 'type' }],
    race: [{ source: 'context', path: 'mother.race' }, { source: 'subject', path: 'race' }],
    mode_acquisition: [{ source: 'context', path: 'mode' }, { source: 'default', value: 'naissance_ferme' }],
    mere_id: [{ source: 'context', path: 'mother.id' }],
    farm_id: [{ source: 'context', path: 'mother.farm_id' }, { source: 'context', path: 'farmId' }],
    date_entree_ferme: [{ source: 'context', path: 'today' }],
  },
  transformation_slaughter: {
    espece: [{ source: 'subject', path: 'espece' }, { source: 'subject', path: 'type' }],
    type: [{ source: 'subject', path: 'type' }],
    boucle_numero: [{ source: 'subject', path: 'boucle_numero' }, { source: 'subject', path: 'tag' }],
    poids: [{ source: 'subject', path: 'poids' }, { source: 'related', path: 'lastWeighing.poids' }],
    effectif: [{ source: 'subject', path: 'current_count' }, { source: 'subject', path: 'effectif_actuel' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
  },
  culture_harvest: {
    culture_id: [{ source: 'subject', path: 'id' }],
    type: [{ source: 'subject', path: 'type' }],
    parcelle: [{ source: 'subject', path: 'parcelle' }],
    quantite_prevue: [{ source: 'subject', path: 'quantite_prevue' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
    date: [{ source: 'context', path: 'today' }],
  },
  // Achats & Stock : réception / achat fournisseur.
  purchase_reception: {
    fournisseur_id: [{ source: 'context', path: 'fournisseurId' }, { source: 'subject', path: 'fournisseur_id' }, { source: 'related', path: 'lastPurchase.fournisseur_id' }],
    produit: [{ source: 'subject', path: 'produit' }, { source: 'subject', path: 'nom' }, { source: 'lastValue', path: 'produit' }],
    categorie: [{ source: 'subject', path: 'categorie' }, { source: 'lastValue', path: 'categorie' }],
    unite: [{ source: 'subject', path: 'unite' }, { source: 'related', path: 'lastPurchase.unite' }, { source: 'lastValue', path: 'unite' }],
    prix_unitaire: [{ source: 'related', path: 'lastPurchase.prix_unitaire' }, { source: 'subject', path: 'prix_unitaire' }, { source: 'lastValue', path: 'prix_unitaire' }],
    stock_id: [{ source: 'subject', path: 'id' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
    date: [{ source: 'context', path: 'today' }],
  },
  // Finance : saisie d'une dépense / recette.
  finance_entry: {
    activite: [{ source: 'context', path: 'activite' }, { source: 'subject', path: 'activite' }, { source: 'lastValue', path: 'activite' }],
    categorie: [{ source: 'context', path: 'categorie' }, { source: 'lastValue', path: 'categorie' }],
    type: [{ source: 'context', path: 'sens' }, { source: 'context', path: 'type' }],
    related_id: [{ source: 'subject', path: 'id' }],
    module_lie: [{ source: 'context', path: 'module' }, { source: 'subject', path: 'source_module' }],
    farm_id: [{ source: 'subject', path: 'farm_id' }, { source: 'context', path: 'farmId' }],
    date: [{ source: 'context', path: 'today' }],
  },
};

/**
 * Vocabulaire des `form_type` de l'ERP → clé de règle. Permet au point central
 * (openFormModal) d'appliquer l'héritage quel que soit le module d'origine.
 */
export const FORM_TYPE_TO_RULE = {
  health_action: 'sante_intervention', sante_intervention: 'sante_intervention', health_intervention: 'sante_intervention',
  feeding_distribution: 'feeding_distribution', daily_feeding: 'feeding_distribution',
  sale_record: 'sale_record', vente: 'sale_record', sale: 'sale_record',
  animal_creation: 'animal_creation', naissance: 'animal_creation', birth: 'animal_creation',
  culture_harvest: 'culture_harvest', recolte: 'culture_harvest', harvest: 'culture_harvest',
  transformation: 'transformation_slaughter', abattage: 'transformation_slaughter', slaughter: 'transformation_slaughter', animal_transformation: 'transformation_slaughter', lot_transformation: 'transformation_slaughter',
  purchase_stock: 'purchase_reception', stock_purchase: 'purchase_reception', supplier_invoice: 'purchase_reception', reception_achat: 'purchase_reception',
  finance_entry: 'finance_entry', depense: 'finance_entry', recette: 'finance_entry',
};

/** Résout un `form_type` (vocabulaire ERP) vers la clé de règle d'héritage. */
export function resolveRuleKey(formType = '') {
  const key = String(formType || '').trim().toLowerCase();
  return FORM_TYPE_TO_RULE[key] || (FORM_INHERITANCE_RULES[key] ? key : null);
}

/**
 * Point d'entrée CENTRAL (tout l'ERP) : enrichit un brouillon de formulaire avec
 * les valeurs héritées de son sujet, sans écraser la saisie. Sans sujet ou sans
 * règle pour ce `form_type`, le brouillon est renvoyé inchangé.
 */
export function applyDraftPrefill(draft = {}, extraContext = {}) {
  const ruleKey = resolveRuleKey(draft.form_type || draft.intent);
  const subject = draft.subject || draft.draft_fields?.subject || draft.fields?.subject || null;
  if (!ruleKey || !subject || !FORM_INHERITANCE_RULES[ruleKey]) return draft;

  const prefill = buildFormPrefill({
    formType: ruleKey,
    subject,
    context: { ...extraContext, ...(draft.context || {}) },
  });
  const fieldsKey = draft.draft_fields ? 'draft_fields' : 'fields';
  const { form, applied } = mergePrefillIntoForm(prefill.values, draft[fieldsKey] || {});
  if (!applied.length) return draft;
  return { ...draft, [fieldsKey]: form, prefill_provenance: prefill.provenance, prefill_applied: applied };
}

/**
 * Calcule les valeurs héritées pour un formulaire.
 * @returns { formType, values, provenance, filledCount, fieldCount, summary }
 */
export function buildFormPrefill({
  formType = '',
  subject = {},
  context = {},
  related = {},
  lastValues = {},
  defaults = {},
  rules = FORM_INHERITANCE_RULES,
} = {}) {
  const spec = rules[formType] || {};
  const ctx = { today: today(), ...context };
  const sourceMap = { context: ctx, subject, related, lastValue: lastValues, default: defaults };
  const values = {};
  const provenance = {};

  Object.entries(spec).forEach(([field, candidates]) => {
    for (const cand of candidates) {
      const raw = 'value' in cand ? cand.value : getPath(sourceMap[cand.source], cand.path);
      if (!isEmpty(raw)) {
        values[field] = raw;
        provenance[field] = cand.source;
        break;
      }
    }
  });

  const fieldCount = Object.keys(spec).length;
  const filledCount = Object.keys(values).length;
  return {
    formType,
    values,
    provenance,
    filledCount,
    fieldCount,
    summary: fieldCount ? `${filledCount}/${fieldCount} champ(s) préremplis` : 'Aucune règle d\'héritage pour ce formulaire',
  };
}

/**
 * Fusionne les valeurs héritées dans un formulaire SANS écraser ce que
 * l'utilisateur a déjà saisi (un champ non vide reste tel quel).
 * @returns { form, applied:string[] }
 */
export function mergePrefillIntoForm(prefillValues = {}, currentForm = {}) {
  const form = { ...currentForm };
  const applied = [];
  Object.entries(prefillValues).forEach(([field, value]) => {
    if (isEmpty(form[field]) && !isEmpty(value)) {
      form[field] = value;
      applied.push(field);
    }
  });
  return { form, applied };
}

/** Étiquette lisible de provenance pour l'affichage « repris de… ». */
export function provenanceLabel(source = '') {
  return {
    context: 'contexte d\'ouverture',
    subject: 'la fiche',
    related: 'un enregistrement lié',
    lastValue: 'votre dernière saisie',
    default: 'valeur par défaut',
  }[source] || 'source connue';
}

export default buildFormPrefill;
