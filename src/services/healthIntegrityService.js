import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dateOnly = (value) => String(value || '').slice(0, 10);
const amount = (row = {}) => toNumber(row.cout ?? row.montant ?? row.amount ?? row.cout_total ?? row.total_cost ?? row.montant_total ?? row.prix_total);
const qty = (row = {}) => toNumber(row.quantite_utilisee ?? row.quantite ?? row.quantity ?? row.qty ?? row.nombre);
const stockId = (row = {}) => clean(row.stock_id || row.produit_stock_id || row.stock_used_id || row.source_stock_id);
const targetId = (row = {}) => clean(row.related_id || row.target_id || row.entity_id || row.animal_id || row.lot_id || row.culture_id);
const targetModule = (row = {}) => lower(row.module_lie || row.target_type || row.entity_type || row.source_module || row.target_module);
const interventionName = (row = {}) => lower(row.nom || row.type_intervention || row.type_evenement || row.event_type || row.title || row.libelle);
const isDone = (row = {}) => ['fait', 'termine', 'terminé', 'done', 'closed', 'paye', 'payé'].includes(lower(row.statut || row.status)) || Boolean(row.effectuee || row.closed_at);
const isLate = (row = {}) => !isDone(row) && row.prevue && new Date(row.prevue) < new Date();
const isCurative = (row = {}) => /curatif|urgence|traitement|maladie|soin|biosecurit|desinfection/.test(interventionName(row));
const isHealthStock = (row = {}) => /vaccin|medicament|soin|vermifuge|antibiotique|desinfectant|biosecurite|phyto|phytosanitaire/.test(lower(`${row.categorie || ''} ${row.category || ''} ${row.produit || ''} ${row.nom || ''}`));
const financeAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.cout ?? row.cout_total);
const financeSourceIds = (row = {}) => [row.source_record_id, row.related_id, row.sante_id, row.health_id, row.entity_id, row.target_id, row.cible_id, row.stock_id, row.source_id].map(clean).filter(Boolean);
const rowIds = (row = {}) => [row.id, row.source_record_id, row.related_id, row.entity_id, row.target_id, row.cible_id, row.stock_id].map(clean).filter(Boolean);
const healthText = (row = {}) => lower(`${row.module_lie || ''} ${row.target_module || ''} ${row.source_module || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''} ${row.title || ''} ${row.nom || ''} ${row.type || ''}`);
const dateClose = (a, b) => {
  const da = new Date(a || 0);
  const db = new Date(b || 0);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return Math.abs(da - db) <= 3 * 86400000;
};

export function healthAmount(row = {}, stocks = []) {
  const explicit = amount(row);
  if (explicit > 0) return explicit;
  const sid = stockId(row);
  const stock = arr(stocks).find((item) => clean(item.id) === sid);
  const unit = toNumber(stock?.cout_revient_unitaire ?? stock?.cout_unitaire_calcule ?? stock?.prixUnit ?? stock?.prixunit ?? stock?.prix_unitaire ?? stock?.unit_price);
  const used = qty(row);
  return stock && unit > 0 && used > 0 ? unit * used : 0;
}

export function findHealthFinance(row = {}, transactions = []) {
  const expected = healthAmount(row);
  const ids = rowIds(row);
  const target = targetId(row);
  const intervention = interventionName(row);
  const interventionDate = row.effectuee || row.prevue || row.date || row.created_at;
  return arr(transactions).find((trx) => {
    const text = healthText(trx);
    const trxIds = financeSourceIds(trx);
    const hasHealthText = /sante|soin|vaccin|traitement|veto|veterinaire|biosecurite|desinfection|urgence|curatif|medicament/.test(text);
    const idMatch = ids.some((id) => trxIds.includes(id));
    const targetMatch = target && trxIds.includes(target);
    const nameMatch = intervention && text.includes(intervention.slice(0, 18));
    const amountMatch = expected > 0 && Math.abs(financeAmount(trx) - expected) < 1;
    const sameDay = dateOnly(trx.date || trx.created_at || trx.date_operation) === dateOnly(interventionDate);
    const nearDay = dateClose(trx.date || trx.created_at || trx.date_operation, interventionDate);
    if (idMatch) return true;
    if (targetMatch && hasHealthText && (amountMatch || sameDay || nearDay)) return true;
    if (hasHealthText && amountMatch && (sameDay || nearDay || nameMatch)) return true;
    return false;
  }) || null;
}

export function duplicateHealthRows(rows = []) {
  const seen = new Map();
  const dupIds = new Set();
  arr(rows).forEach((row) => {
    const key = [targetModule(row), targetId(row), interventionName(row), dateOnly(row.prevue || row.date)].join('|');
    if (!targetId(row) || !interventionName(row)) return;
    if (seen.has(key)) { dupIds.add(row.id); dupIds.add(seen.get(key)); }
    else seen.set(key, row.id);
  });
  return dupIds;
}

export function targetStillSick(row = {}, animaux = [], lots = []) {
  if (!isDone(row)) return false;
  const id = targetId(row);
  const module = targetModule(row);
  const sickWords = ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller', 'critique', 'sous_surveillance'];
  if (module.includes('animal')) {
    const animal = arr(animaux).find((item) => clean(item.id) === id || clean(item.tag) === id);
    const status = lower(`${animal?.health_status || ''} ${animal?.sante || ''} ${animal?.status_sante || ''}`);
    return sickWords.some((word) => status.includes(lower(word)));
  }
  if (module.includes('avicole') || module.includes('lot')) {
    const lot = arr(lots).find((item) => clean(item.id) === id);
    const status = lower(`${lot?.health_status || ''} ${lot?.sante || ''} ${lot?.status_sante || ''}`);
    return sickWords.some((word) => status.includes(lower(word))) || toNumber(lot?.malades ?? lot?.sick_count) > 0;
  }
  return false;
}

export function buildTargetHealthPatch(row = {}) {
  if (!isDone(row)) return null;
  if (isCurative(row)) return { health_status: 'sous_surveillance', sante: 'sous_surveillance', status_sante: 'sous_surveillance', last_health_intervention_id: row.id, last_health_intervention_at: row.effectuee || row.date || new Date().toISOString().slice(0, 10) };
  return { health_status: 'sain', sante: 'sain', status_sante: 'sain', last_health_intervention_id: row.id, last_health_intervention_at: row.effectuee || row.date || new Date().toISOString().slice(0, 10) };
}

export function analyzeHealthIntegrity({ rows = [], stocks = [], transactions = [], animaux = [], lots = [] }) {
  const dupIds = duplicateHealthRows(rows);
  const healthStocks = arr(stocks).filter(isHealthStock);
  const stockRisks = healthStocks.filter((stock) => toNumber(stock.quantite) <= toNumber(stock.seuil));
  const details = arr(rows).map((row) => {
    const issues = [];
    const cost = healthAmount(row, stocks);
    const finance = findHealthFinance(row, transactions);
    if (!targetId(row) || ['all_animaux', 'animaux_malades', 'all_avicole_lots', 'avicole_malades'].includes(lower(targetId(row)))) issues.push('Cible collective / non détaillée');
    if (!targetModule(row)) issues.push('Module cible manquant');
    if (isDone(row) && cost > 0 && !finance) issues.push('Finance manquante');
    if (lower(row.product_source || row.source_produit) === 'stock' && !stockId(row)) issues.push('Stock non lié');
    if (stockId(row) && qty(row) <= 0) issues.push('Quantité stock manquante');
    if (dupIds.has(row.id)) issues.push('Doublon potentiel');
    if (isLate(row)) issues.push('Intervention en retard');
    if (isCurative(row) && !row.prochaine_action && !row.next_control_date && !row.date_rappel && !row.prochaine_date_calculee) issues.push('Suivi curatif manquant');
    if (targetStillSick(row, animaux, lots)) issues.push('Cible encore malade');
    return { row, cost, finance, issues };
  });
  return { details, stockRisks, totalCost: details.reduce((sum, item) => sum + item.cost, 0), issueCount: details.filter((item) => item.issues.length).length };
}
