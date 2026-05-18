import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const dateOf = (row = {}) => row.date || row.event_date || row.created_at || row.updated_at || row.date_livraison || row.delivery_date || row.date_commande || '';
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const isClosedStatus = (target = {}) => /cl[oô]tur|clos|termin|vendu|livr|abattu|transform|perdu|mort|r[eé]colt|archive|archiv/.test(lower(`${target.status || ''} ${target.statut || ''} ${target.phase || ''} ${target.stade || ''}`));
const physicalIdOf = (target = {}) => target.boucle_numero || target.qr_code || target.tag || target.id;

export function activeCountOf(target = {}, mode = 'avicole') {
  if (mode === 'cultures') return toNumber(target.quantite_disponible ?? target.quantite_recoltee ?? target.production_reelle ?? target.surface_exploitable ?? target.surface);
  if (mode === 'animaux') return isClosedStatus(target) ? 0 : 1;
  return toNumber(target.current_count ?? target.effectif_actuel ?? target.actifs ?? target.nombre_actuel ?? target.quantity_active ?? target.count ?? 0);
}

export function initialCountOf(target = {}, mode = 'avicole') {
  if (mode === 'cultures') return toNumber(target.quantite_prevue ?? target.production_prevue ?? target.surface ?? target.surface_exploitable);
  if (mode === 'animaux') return 1;
  return toNumber(target.initial_count ?? target.effectif_initial ?? target.nombre_initial ?? target.quantity_initial ?? target.count_initial ?? activeCountOf(target, mode));
}

function targetMatches(row = {}, target = {}, mode = 'avicole') {
  const id = clean(target.id);
  const code = clean(physicalIdOf(target));
  if (!id && !code) return false;
  const keys = [
    row.lot_id, row.animal_id, row.culture_id, row.target_id, row.cible_id, row.entity_id, row.related_id, row.source_record_id,
    row.asset_id, row.bp_line_id, row.product_id, row.produit_id, row.boucle_numero, row.qr_code, row.tag,
  ].map(clean);
  if ((id && keys.includes(id)) || (code && keys.includes(code))) return true;
  const text = lower(`${row.product_name || ''} ${row.produit || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''} ${row.title || ''} ${row.nom || ''}`);
  const name = lower(target.name || target.nom || target.tag || target.id);
  return Boolean(name && text.includes(name)) || Boolean(id && text.includes(lower(id))) || Boolean(code && text.includes(lower(code)));
}

function quantityOf(row = {}, mode = 'avicole') {
  const qty = toNumber(row.quantite ?? row.quantity ?? row.qty ?? row.nombre ?? row.effectif ?? row.items_count ?? row.delivered_qty ?? row.quantite_livree);
  if (mode === 'animaux') return qty || 1;
  return qty;
}

export function buildLifecycleHistory({ mode = 'avicole', target = {}, salesOrders = [], deliveries = [], businessEvents = [], alimentationLogs = [], healthLogs = [], productionLogs = [] } = {}) {
  const initial = initialCountOf(target, mode);
  const active = activeCountOf(target, mode);
  const events = [];
  if (initial > 0) {
    events.push({ id: `${target.id}-initial`, date: target.date_entree || target.date_entree_ferme || target.entry_date || target.date_debut || target.date_semis || target.created_at || '', type: 'entrée_initiale', label: mode === 'cultures' ? 'Démarrage culture' : 'Entrée initiale', delta: initial, remaining: initial, amount: toNumber(target.purchase_cost ?? target.cout_achat_total ?? target.cout_achat ?? target.prix_achat ?? target.budget_prevu), source: 'module', status: 'validé' });
  }

  arr(salesOrders).filter((row) => targetMatches(row, target, mode)).forEach((row) => {
    const qty = quantityOf(row, mode) || quantityOf(row.item, mode) || 0;
    if (!qty) return;
    events.push({ id: row.id, date: dateOf(row), type: 'vente', label: `Vente ${row.client_nom || row.client_name || row.client_id || ''}`.trim(), delta: -qty, amount: amountOf(row), source: 'ventes', status: row.statut_commande || row.status || 'vente' });
  });

  arr(deliveries).filter((row) => targetMatches(row, target, mode)).forEach((row) => {
    const qty = quantityOf(row, mode);
    if (!qty) return;
    events.push({ id: row.id, date: dateOf(row), type: 'livraison', label: 'Livraison', delta: -qty, amount: amountOf(row), source: 'livraisons', status: row.status || row.statut || 'livrée' });
  });

  arr(businessEvents).filter((row) => targetMatches(row, target, mode)).forEach((row) => {
    const text = lower(`${row.event_type || ''} ${row.type_evenement || ''} ${row.title || ''} ${row.description || ''}`);
    const qty = quantityOf(row, mode) || toNumber(row.delta_effectif ?? row.effectif_delta ?? row.quantity_delta);
    let type = 'événement';
    let delta = 0;
    if (/mortal|mort|perte|lost/.test(text)) { type = 'perte'; delta = -Math.abs(qty || 1); }
    else if (/abatt|transform/.test(text)) { type = 'abattage_transformation'; delta = -Math.abs(qty || (mode === 'animaux' ? 1 : 0)); }
    else if (/ajust/.test(text)) { type = 'ajustement'; delta = toNumber(row.delta_effectif ?? row.effectif_delta ?? row.quantity_delta ?? qty); }
    else if (/recolt|récolt/.test(text)) { type = 'récolte'; delta = -Math.abs(qty || 0); }
    if (!delta && !['événement'].includes(type)) return;
    events.push({ id: row.id, date: dateOf(row), type, label: row.title || row.event_type || type, delta, amount: amountOf(row), source: 'événements', status: row.status || row.statut || 'validé' });
  });

  const sorted = events.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
  let running = 0;
  const withRemaining = sorted.map((event, index) => {
    if (index === 0 && event.type === 'entrée_initiale') running = event.delta;
    else running += toNumber(event.delta);
    return { ...event, remaining: Math.max(0, running) };
  });

  const exited = withRemaining.filter((event) => event.delta < 0).reduce((sum, event) => sum + Math.abs(toNumber(event.delta)), 0);
  const theoreticalRemaining = Math.max(0, initial - exited + withRemaining.filter((event) => event.delta > 0 && event.type !== 'entrée_initiale').reduce((sum, event) => sum + event.delta, 0));
  const closed = isClosedStatus(target);
  const zeroActiveUnexplained = initial > 0 && active <= 0 && theoreticalRemaining > 0 && !closed;
  const mismatch = Math.abs(theoreticalRemaining - active) > 0.001;
  return {
    initial,
    active,
    exited,
    theoreticalRemaining,
    events: withRemaining,
    hasHistory: withRemaining.length > 1,
    needsClosure: active <= 0 && !closed,
    mismatch,
    zeroActiveUnexplained,
    recommendation: zeroActiveUnexplained ? 'Effectif à 0 sans sortie historique. Clôturer le lot ou enregistrer la sortie réelle: vente, perte, abattage ou ajustement.' : mismatch ? 'Écart entre historique et effectif actuel. Vérifier sorties, ventes, pertes ou ajustements.' : 'Historique cohérent.',
  };
}
