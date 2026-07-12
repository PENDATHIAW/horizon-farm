/**
 * Dictionnaire français Horizon Farm.
 * Un fichier par domaine sous src/i18n/fr/ ; ce fichier les assemble.
 * Toute chaîne visible générée par l'application doit venir d'ici.
 */
import commun from './commun.js';
import navigation from './navigation.js';
import composants from './composants.js';

const dictionnaire = { commun, navigation, composants };

export default dictionnaire;

/**
 * Lit un libellé par clé pointée, avec interpolation {param}.
 * Exemple : t('commun.confirmations.saisieEnregistree', { saisie: 'Ponte', ... })
 * Retourne la clé telle quelle si elle est absente (visible en test, jamais silencieux).
 */
export function t(cle = '', params = {}) {
  const valeur = String(cle).split('.').reduce((noeud, part) => (noeud && typeof noeud === 'object' ? noeud[part] : undefined), dictionnaire);
  if (typeof valeur !== 'string') return cle;
  return valeur.replace(/\{(\w+)\}/g, (_, nom) => (params[nom] !== undefined ? String(params[nom]) : `{${nom}}`));
}

/** Parcourt toutes les chaînes du dictionnaire (pour les tests de charte). */
export function toutesLesChaines(noeud = dictionnaire, prefixe = '') {
  const resultat = [];
  for (const [cle, valeur] of Object.entries(noeud)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (typeof valeur === 'string') resultat.push({ cle: chemin, texte: valeur });
    else if (valeur && typeof valeur === 'object') resultat.push(...toutesLesChaines(valeur, chemin));
  }
  return resultat;
}
