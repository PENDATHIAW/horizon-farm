/**
 * Application du contrat de préremplissage des saisies (chantier 20 secondes).
 *
 * Le registre `formulaires20s.config` DÉCLARE, par formulaire, des stratégies de
 * préremplissage (`preremplissages`) et les champs repliés (`champsReplies`). Ce
 * module les APPLIQUE enfin sur les données vivantes : « tant que l'information
 * existe, on ne la resaisit pas ». Chaque stratégie résout une valeur depuis le
 * data map (dernier fournisseur, dernier client, lot unique…) ou le contexte
 * (date du jour, utilisateur). On ne remplit jamais un champ hors du contrat, et
 * on n'invente aucune valeur.
 */

import { REGISTRE_PAR_ID } from '../config/formulaires20s.config.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v ?? '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const lower = (v) => clean(v).toLowerCase();

const isClosedLot = (l = {}) => ['vendu', 'termine', 'terminé', 'clos', 'cloture', 'clôturé'].includes(lower(l.status || l.statut || l.phase));
const isInactiveAnimal = (a = {}) => ['vendu', 'mort', 'sorti', 'reforme', 'réformé'].includes(lower(a.status || a.statut));

const lastOf = (rows) => {
  const list = arr(rows);
  return list.length ? list[list.length - 1] : null;
};
const dateOf = (r = {}) => clean(r.date || r.created_at || r.date_reception || r.date_vente || r.date_achat);
const mostRecent = (rows) => {
  const list = arr(rows).filter((r) => dateOf(r));
  if (!list.length) return lastOf(rows);
  return list.slice().sort((a, b) => dateOf(a).localeCompare(dateOf(b))).pop();
};

/** Résolveurs de stratégie → { field, value } (ou null si non résoluble). */
const STRATEGIES = {
  date_du_jour: ({ context }) => ({ field: 'date', value: context.date || today() }),
  utilisateur_connecte: ({ context }) => (clean(context.user) ? { field: 'responsable', value: clean(context.user) } : null),
  unites_de_la_ferme: ({ context }) => (clean(context.unite) ? { field: 'unite', value: clean(context.unite) } : null),

  lot_unique_auto: ({ data }) => {
    const open = arr(data.avicole || data.lots).filter((l) => !isClosedLot(l));
    return open.length === 1 ? { field: 'lot', value: open[0].id } : null;
  },
  lot_pondeuse_unique_auto: ({ data }) => {
    const open = arr(data.avicole || data.lots).filter((l) => !isClosedLot(l) && lower(l.type || l.type_lot).includes('pondeuse'));
    return open.length === 1 ? { field: 'lot', value: open[0].id } : null;
  },
  animal_unique_auto: ({ data }) => {
    const active = arr(data.animaux).filter((a) => !isInactiveAnimal(a));
    return active.length === 1 ? { field: 'animal', value: active[0].id } : null;
  },
  parcelle_unique_auto: ({ data }) => {
    const cultures = arr(data.cultures);
    return cultures.length === 1 ? { field: 'parcelle', value: cultures[0].parcelle || cultures[0].id } : null;
  },
  dernier_fournisseur: ({ data }) => {
    const rec = mostRecent(data.receptions || data.achats);
    const supplier = rec?.fournisseur || rec?.fournisseur_id || lastOf(data.fournisseurs)?.id || lastOf(data.fournisseurs)?.nom;
    return clean(supplier) ? { field: 'fournisseur', value: supplier } : null;
  },
  dernier_client: ({ data }) => {
    const sale = mostRecent(data.sales_orders || data.ventes);
    const client = sale?.client_id || sale?.client_label || sale?.client_name;
    return clean(client) ? { field: 'client', value: client } : null;
  },
  dernier_prix: ({ data }) => {
    const sale = mostRecent(data.sales_orders || data.ventes);
    const prix = sale?.prix_vente_unitaire ?? sale?.prix_unitaire;
    return prix != null && Number(prix) > 0 ? { field: 'prix', value: Number(prix) } : null;
  },
};

/**
 * Résout le préremplissage déclaré d'un formulaire contre les données vivantes.
 * @returns { values, provenance, appliedStrategies }
 */
export function resolveContractPrefill({ formId = '', data = {}, context = {} } = {}) {
  const form = REGISTRE_PAR_ID[formId];
  if (!form) return { values: {}, provenance: {}, appliedStrategies: [] };

  const allowed = new Set([...arr(form.champsRequis), ...arr(form.champsReplies), 'date', 'responsable', 'unite']);
  const values = {};
  const provenance = {};
  const appliedStrategies = [];

  arr(form.preremplissages).forEach((strategyKey) => {
    const resolver = STRATEGIES[strategyKey];
    if (!resolver) return;
    const resolved = resolver({ data, context });
    if (!resolved || !allowed.has(resolved.field)) return;
    if (resolved.value == null || resolved.value === '' || resolved.value in values) return;
    values[resolved.field] = resolved.value;
    provenance[resolved.field] = strategyKey;
    appliedStrategies.push(strategyKey);
  });

  return { values, provenance, appliedStrategies };
}

/**
 * Construit les champs de brouillon préremplis pour une saisie rapide, sans
 * écraser une saisie déjà présente.
 */
export function buildQuickEntryFields({ formId, data = {}, context = {}, base = {} } = {}) {
  const { values, provenance, appliedStrategies } = resolveContractPrefill({ formId, data, context });
  const fields = { date: today(), ...values, ...base };
  return { fields, provenance, appliedStrategies };
}

export default resolveContractPrefill;
