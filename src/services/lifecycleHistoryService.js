import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const dateOf = (row = {}) => row.date || row.event_date || row.created_at || row.updated_at || row.date_livraison || row.delivery_date || row.date_commande || '';
const amountOf = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.chiffre_affaires);
const isClosedStatus = (target = {}) => /cl[oô]tur|clos|termin|vendu|livr|abattu|transform|perdu|mort|r[eé]colt|archive|archiv/.test(lower(`${target.status || ''} ${target.statut || ''} ${target.phase || ''} ${target.stade || ''}`));
const physicalIdOf = (target = {}) => target.boucle_numero || target.qr_code || target.tag || target.id;
const today = () => new Date().toISOString().slice(0, 10);

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

function targetMatches(row = {}, target = {}) {
  const id = clean(target.id);
  const code = clean(physicalIdOf(target));
  if (!id && !code) return false;
  const keys = [row.lot_id, row.animal_id, row.culture_id, row.target_id, row.cible_id, row.entity_id, row.related_id, row.source_record_id, row.asset_id, row.bp_line_id, row.product_id, row.produit_id, row.boucle_numero, row.qr_code, row.tag].map(clean);
  if ((id && keys.includes(id)) || (code && keys.includes(code))) return true;
  const text = lower(`${row.product_name || ''} ${row.produit || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''} ${row.title || ''} ${row.nom || ''}`);
  const name = lower(target.name || target.nom || target.tag || target.id);
  return Boolean(name && text.includes(name)) || Boolean(id && text.includes(lower(id))) || Boolean(code && text.includes(lower(code)));
}

function quantityOf(row = {}, mode = 'avicole') {
  const qty = toNumber(row.quantite ?? row.quantity ?? row.qty ?? row.nombre ?? row.effectif ?? row.items_count ?? row.delivered_qty ?? row.quantite_livree ?? row.sujets_vendus ?? row.quantity_sold ?? row.quantite_vendue);
  if (mode === 'animaux') return qty || 1;
  return qty;
}

function explicitDeaths(target = {}) { return toNumber(target.morts ?? target.mortality ?? target.dead_count ?? target.pertes_mortalite ?? 0); }
function explicitSick(target = {}) { return toNumber(target.malades ?? target.sick_count ?? target.malade_count ?? 0); }
function explicitSold(target = {}) { return toNumber(target.vendus ?? target.sold_count ?? target.sujets_vendus ?? target.quantity_sold ?? target.quantite_vendue ?? 0); }
function explicitReformed(target = {}) { return toNumber(target.reformes ?? target.reformes_count ?? target.reformed_count ?? target.reforme_count ?? 0); }
function explicitSlaughtered(target = {}) { return toNumber(target.abattus ?? target.slaughtered_count ?? target.transformed_count ?? 0); }
function explicitLosses(target = {}) { return toNumber(target.pertes ?? target.loss_count ?? target.lost_count ?? 0); }
function pushExit(events, target, type, qty, label, source = 'fiche') {
  if (toNumber(qty) <= 0) return;
  events.push({ id: `${target.id}-${type}`, date: target.updated_at || target.created_at || '', type, label, delta: -Math.abs(toNumber(qty)), amount: 0, source, status: 'validé' });
}
function normalizeBusinessEvent(row = {}, mode = 'avicole') {
  const text = lower(`${row.event_type || ''} ${row.type_evenement || ''} ${row.title || ''} ${row.description || ''}`);
  const qty = quantityOf(row, mode) || toNumber(row.delta_effectif ?? row.effectif_delta ?? row.quantity_delta);
  let type = 'événement';
  let delta = 0;
  if (/vente|vendu|sold/.test(text)) { type = 'vente'; delta = -Math.abs(qty || 1); }
  else if (/mortal|mort|perte|lost/.test(text)) { type = 'perte'; delta = -Math.abs(qty || 1); }
  else if (/abatt|transform/.test(text)) { type = 'abattage_transformation'; delta = -Math.abs(qty || (mode === 'animaux' ? 1 : 0)); }
  else if (/reform|réform/.test(text)) { type = 'réforme'; delta = -Math.abs(qty || 0); }
  else if (/ajust/.test(text)) { type = 'ajustement'; delta = toNumber(row.delta_effectif ?? row.effectif_delta ?? row.quantity_delta ?? qty); }
  else if (/recolt|récolt/.test(text)) { type = 'récolte'; delta = -Math.abs(qty || 0); }
  if (!delta && type !== 'événement') return null;
  return { id: row.id, date: dateOf(row), type, label: row.title || row.event_type || type, delta, amount: amountOf(row), source: 'événements', status: row.status || row.statut || 'validé' };
}

const weightOf = (row = {}) => toNumber(row.poids ?? row.poids_moyen ?? row.poids_kg ?? row.weight ?? row.weight_avg ?? row.poids_moyen_actuel);
const feedQtyOf = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty ?? row.sacs ?? row.kg ?? row.poids);

// Événements « carnet de vie » sans impact sur l'effectif (delta 0) :
// santé, biosécurité, pesée, alimentation. Ils enrichissent la frise mais ne
// modifient jamais le recalage d'effectif.
function normalizeCareEvent(row = {}) {
  const text = lower(`${row.type || ''} ${row.type_soin || ''} ${row.categorie || ''} ${row.acte || ''} ${row.title || ''} ${row.libelle || ''} ${row.description || ''} ${row.produit || ''}`);
  const weight = weightOf(row);
  let type = 'soin';
  let label = clean(row.type_soin || row.acte || row.title || row.libelle || row.produit || 'Soin');
  if (weight > 0 && /pes[eé]e|poids|weight/.test(text)) { type = 'pesée'; label = `Pesée ${weight} kg`; }
  else if (/vaccin|rappel/.test(text)) { type = 'vaccination'; label = clean(row.produit || row.title || 'Vaccination'); }
  else if (/biosecur|biosécur|nettoy|désinfect|desinfect|quarantaine|hygi[eè]ne/.test(text)) { type = 'biosécurité'; label = clean(row.title || row.libelle || 'Biosécurité'); }
  else if (/malad|traitement|soin|v[ée]t[eé]rinaire|veto/.test(text)) { type = 'soin'; }
  return { id: `care-${row.id || label}`, date: dateOf(row), type, label, delta: 0, amount: amountOf(row) || toNumber(row.cout ?? row.coût ?? row.cout_sante ?? row.prix), source: 'santé', status: row.status || row.statut || 'validé' };
}
function normalizeWeighingEvent(row = {}) {
  const weight = weightOf(row);
  return { id: `pesee-${row.id || dateOf(row)}`, date: dateOf(row), type: 'pesée', label: weight > 0 ? `Pesée ${weight} kg` : 'Pesée', delta: 0, amount: 0, source: 'pesées', status: 'validé' };
}
function normalizeFeedEvent(row = {}) {
  const qty = feedQtyOf(row);
  const unit = clean(row.unite || row.unit || 'kg');
  return { id: `feed-${row.id || dateOf(row)}`, date: dateOf(row), type: 'alimentation', label: qty > 0 ? `Alimentation ${qty} ${unit}` : 'Alimentation', delta: 0, amount: amountOf(row) || toNumber(row.cout ?? row.coût ?? row.cout_total), source: 'alimentation', status: 'validé' };
}

export function buildLifecycleHistory({ mode = 'avicole', target = {}, salesOrders = [], deliveries = [], businessEvents = [], sante = [], alimentationLogs = [], weighings = [] } = {}) {
  const initial = initialCountOf(target, mode);
  const active = activeCountOf(target, mode);
  const events = [];
  if (initial > 0) events.push({ id: `${target.id}-initial`, date: target.date_entree || target.date_entree_ferme || target.entry_date || target.date_debut || target.date_semis || target.created_at || '', type: 'entrée_initiale', label: mode === 'cultures' ? 'Démarrage culture' : 'Entrée initiale', delta: initial, remaining: initial, amount: toNumber(target.purchase_cost ?? target.cout_achat_total ?? target.cout_achat ?? target.prix_achat ?? target.budget_prevu), source: 'module', status: 'validé' });

  arr(salesOrders).filter((row) => targetMatches(row, target, mode)).forEach((row) => { const qty = quantityOf(row, mode) || quantityOf(row.item, mode) || 0; if (!qty) return; events.push({ id: row.id, date: dateOf(row), type: 'vente', label: `Vente ${row.client_nom || row.client_name || row.client_id || ''}`.trim(), delta: -qty, amount: amountOf(row), source: 'ventes', status: row.statut_commande || row.status || 'vente' }); });
  arr(deliveries).filter((row) => targetMatches(row, target, mode)).forEach((row) => { const qty = quantityOf(row, mode); if (!qty) return; events.push({ id: row.id, date: dateOf(row), type: 'livraison', label: 'Livraison', delta: -qty, amount: amountOf(row), source: 'livraisons', status: row.status || row.statut || 'livrée' }); });
  arr(businessEvents).filter((row) => targetMatches(row, target, mode)).forEach((row) => { const event = normalizeBusinessEvent(row, mode); if (event) events.push(event); });
  // Carnet de vie : santé / biosécurité / pesée / alimentation (délta 0).
  arr(sante).filter((row) => targetMatches(row, target, mode)).forEach((row) => events.push(normalizeCareEvent(row)));
  arr(weighings).filter((row) => targetMatches(row, target, mode)).forEach((row) => events.push(normalizeWeighingEvent(row)));
  arr(alimentationLogs).filter((row) => targetMatches(row, target, mode)).forEach((row) => events.push(normalizeFeedEvent(row)));

  if (mode === 'avicole') {
    const already = (type) => events.filter((event) => event.type === type).reduce((sum, event) => sum + Math.abs(toNumber(event.delta)), 0);
    const morts = Math.max(0, explicitDeaths(target) - already('perte'));
    const vendus = Math.max(0, explicitSold(target) - already('vente'));
    const reformes = Math.max(0, explicitReformed(target) - already('réforme'));
    const abattus = Math.max(0, explicitSlaughtered(target) - already('abattage_transformation'));
    const pertes = Math.max(0, explicitLosses(target) - already('perte') - morts);
    pushExit(events, target, 'perte', morts, 'Mortalité renseignée sur fiche');
    pushExit(events, target, 'vente', vendus, 'Vendus renseignés sur fiche');
    pushExit(events, target, 'réforme', reformes, 'Réforme renseignée sur fiche');
    pushExit(events, target, 'abattage_transformation', abattus, 'Abattage / transformation renseigné sur fiche');
    pushExit(events, target, 'perte', pertes, 'Pertes renseignées sur fiche');
  }

  const sorted = events.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
  let running = 0;
  const withRemaining = sorted.map((event, index) => { if (index === 0 && event.type === 'entrée_initiale') running = event.delta; else running += toNumber(event.delta); return { ...event, remaining: Math.max(0, running) }; });
  const exitedBeforeReconciliation = withRemaining.filter((event) => event.delta < 0).reduce((sum, event) => sum + Math.abs(toNumber(event.delta)), 0);
  const positiveAdjustments = withRemaining.filter((event) => event.delta > 0 && event.type !== 'entrée_initiale').reduce((sum, event) => sum + event.delta, 0);
  const theoreticalBeforeReconciliation = Math.max(0, initial - exitedBeforeReconciliation + positiveAdjustments);
  const reconciliationDelta = active - theoreticalBeforeReconciliation;
  const needsReconciliation = Math.abs(reconciliationDelta) > 0.001;
  if (needsReconciliation) {
    withRemaining.push({ id: `${target.id}-reconciliation`, date: target.updated_at || today(), type: 'ajustement_à_valider', label: reconciliationDelta < 0 ? 'Sortie manquante à qualifier' : 'Entrée / correction effectif à qualifier', delta: reconciliationDelta, remaining: active, amount: 0, source: 'recalage obligatoire', status: 'à valider' });
  }
  const finalEvents = withRemaining.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
  let finalRunning = 0;
  const finalWithRemaining = finalEvents.map((event, index) => { if (index === 0 && event.type === 'entrée_initiale') finalRunning = event.delta; else finalRunning += toNumber(event.delta); return { ...event, remaining: Math.max(0, event.type === 'ajustement_à_valider' ? active : finalRunning) }; });
  const exited = finalWithRemaining.filter((event) => event.delta < 0).reduce((sum, event) => sum + Math.abs(toNumber(event.delta)), 0);
  const theoreticalRemaining = active;
  const closed = isClosedStatus(target);
  return {
    initial,
    active,
    exited,
    theoreticalRemaining,
    morts: explicitDeaths(target),
    malades: explicitSick(target),
    vendus: explicitSold(target),
    reformes: explicitReformed(target),
    abattus: explicitSlaughtered(target),
    pertes: explicitLosses(target),
    reconciliationDelta,
    needsReconciliation,
    events: finalWithRemaining,
    hasHistory: finalWithRemaining.length > 1,
    needsClosure: active <= 0 && !closed,
    mismatch: false,
    zeroActiveUnexplained: false,
    recommendation: needsReconciliation ? 'Un mouvement obligatoire a été ajouté pour supprimer l’écart. Il faut le qualifier : vente, mort, perte, réforme, abattage ou ajustement validé.' : active <= 0 && !closed ? 'Effectif à 0 : clôturer le lot après validation de la sortie.' : 'Historique recalé et cohérent.',
  };
}
