/**
 * Confirmation à effets du contrat des 20 secondes (chantier 5).
 *
 * Après enregistrement, une saisie confirme ses effets sous la forme
 * « {Saisie} enregistrée · {effet stock} · {effet coût ou KPI} », puis l'écran
 * revient à son origine. Le gabarit vient du dictionnaire ; les effets réels
 * (valeurs) sont fournis par le workflow au moment de la confirmation.
 */
import { t } from '../i18n/fr/index.js';
import { REGISTRE_PAR_ID } from '../config/formulaires20s.config.js';

/**
 * Construit le message de confirmation à effets.
 * @param {string} saisieId identifiant du formulaire dans le registre
 * @param {{saisie?:string, effetStock?:string, effetCout?:string}} effets valeurs réelles observées
 */
export function confirmationAEffets(saisieId, effets = {}) {
  const entree = REGISTRE_PAR_ID[saisieId];
  const saisie = effets.saisie || entree?.libelleBouton?.replace(/^\S+\s/, '') || 'Saisie';
  const effetStock = effets.effetStock || entree?.confirmation?.effetStock || 'stock';
  const effetCout = effets.effetCout || entree?.confirmation?.effetCout || 'coût';
  return t('commun.confirmations.saisieEnregistree', {
    saisie: saisie.charAt(0).toUpperCase() + saisie.slice(1),
    effetStock,
    effetCout,
  });
}
