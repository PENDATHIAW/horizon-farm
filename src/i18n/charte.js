/**
 * Charte de langage Horizon Farm.
 *
 * Tout texte affiché par l'application vient du dictionnaire src/i18n/fr/.
 * Cette charte définit ce qui est interdit à l'écran et sert de source aux
 * tests tests/unit/i18nCharteLibelles.test.js et tests/unit/i18nChainesEnDur.test.js.
 *
 * Périmètre : uniquement les textes générés par l'application (titres, onglets,
 * boutons, champs, infobulles, états vides, notifications, textes de rapports
 * générés). Sont exclus du contrôle, pour éviter les faux positifs :
 *  - le contenu libre saisi par l'utilisateur et les documents importés ;
 *  - les pièces historiques déjà publiées ;
 *  - les noms de fichiers et les noms propres ;
 *  - les commentaires de code et la documentation du dépôt ;
 *  - les jeux de données de test et les fichiers de tests ;
 *  - les logs techniques non visibles à l'écran ;
 *  - les identifiants de code (variables, props, clés d'objets, noms de tables).
 */

/**
 * Termes de spécification interdits dans un texte affiché.
 * `prose: true` : le terme est aussi un identifiant technique légitime dans le
 * code ; il n'est signalé que s'il apparaît dans une phrase française visible.
 */
export const TERMES_SPEC_INTERDITS = [
  { terme: 'source officielle' },
  { terme: 'propriétaire unique' },
  { terme: 'canonique' },
  { terme: 'idempotent' },
  { terme: 'moteur central' },
  { terme: 'catalogue central' },
  { terme: 'feature flag' },
  { terme: 'RLS', prose: true },
  { terme: 'farm_id', prose: true },
  { terme: 'event_key', prose: true },
  { terme: 'payload', prose: true },
  { terme: 'business_events', prose: true },
  { terme: 'il est interdit de' },
  { terme: 'ne doit jamais' },
];

/** Formulations qui trahissent une rédaction de spécification ou d'IA. */
export const FORMULATIONS_INTERDITES = [
  "l'ia propose",
  "l'humain valide",
  'aucune hallucination',
  'hallucination',
  'ne jamais inventer de données',
  'validation humaine',
  'réponse insuffisamment fondée',
  'insuffisamment fondée',
  'niveau de confiance',
  'réponses vérifiables',
  'il est important de noter',
  'veuillez noter',
  "n'hésitez pas",
  'il convient de',
  'afin de garantir',
];

/**
 * Le tiret long est interdit dans tous les textes générés par le produit et
 * dans les rapports générés par l'application.
 */
export const TIRET_LONG = '—';

/** Le mot IA n'apparaît nulle part à l'écran : dire Suggestions, Analyse ou Explication. */
export const MOTIF_IA_VISIBLE = /(^|[\s'’«("])IA([\s.,:;!?»)"']|$)/;

/** Versions de spécification interdites à l'écran (V1, V2, V3 en fin ou milieu de libellé). */
export const MOTIF_VERSION_SPEC = /(^|\s)V[123]([\s.,:;!?)»]|$)/;

/** Remplacements de référence (voir dictionnaire src/i18n/fr/commun.js). */
export const REMPLACEMENTS_TYPES = [
  { avant: 'Réponse insuffisamment fondée', apres: "Je n'ai pas assez de données pour répondre. Voir {module}." },
  { avant: "L'IA propose, l'humain valide", apres: 'Suggestion à confirmer' },
  { avant: 'CMUP', apres: "Coût moyen (infobulle : coût moyen pondéré d'achat)" },
  { avant: 'Alerte critique non assignée', apres: 'Urgent : {objet} attend un responsable' },
  { avant: 'Champ obligatoire', apres: '*' },
  { avant: 'Aucune donnée', apres: "Rien à afficher pour l'instant (plus l'action possible)" },
  { avant: 'Soumettre', apres: 'Verbe + objet, par exemple « Enregistrer la ponte »' },
];

const normalise = (texte = '') => String(texte).toLowerCase();

/** Un texte est de la prose française s'il contient un espace et un caractère accentué ou un mot français courant. */
export function estProseFrancaise(texte = '') {
  const t = String(texte);
  if (!t.includes(' ')) return false;
  return /[àâéèêëîïôùûüç]/i.test(t) || /\b(le|la|les|des|une|un|est|sont|pour|avec|dans|sur)\b/i.test(t);
}

/**
 * Retourne la liste des violations de la charte trouvées dans un texte visible.
 * @param {string} texte texte destiné à l'écran
 * @returns {string[]} description de chaque violation
 */
export function violationsCharte(texte = '') {
  const t = String(texte);
  const bas = normalise(t);
  const violations = [];
  for (const { terme, prose } of TERMES_SPEC_INTERDITS) {
    if (!bas.includes(terme.toLowerCase())) continue;
    if (prose && !estProseFrancaise(t)) continue;
    violations.push(`terme de spécification interdit : « ${terme} »`);
  }
  for (const formulation of FORMULATIONS_INTERDITES) {
    if (bas.includes(formulation)) violations.push(`formulation interdite : « ${formulation} »`);
  }
  if (t.includes(TIRET_LONG)) violations.push('tiret long interdit');
  if (MOTIF_IA_VISIBLE.test(t)) violations.push('le mot « IA » est interdit à l\'écran');
  if (MOTIF_VERSION_SPEC.test(t)) violations.push('numéro de version de spécification (V1/V2/V3) interdit à l\'écran');
  return violations;
}
