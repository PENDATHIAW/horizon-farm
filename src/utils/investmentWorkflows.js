import { toNumber } from './format';
import { makeId } from './ids';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const investmentLabel = (line = {}) => line.designation || line.libelle || line.nom || line.name || line.title || line.id || 'Investissement';
export const investmentAmount = (line = {}) => toNumber(line.montant_reel ?? line.total ?? line.montant ?? line.amount ?? toNumber(line.quantite) * toNumber(line.prix_unitaire));

export function investmentAssetKind(line = {}) {
  const text = lower(investmentLabel(line));
  if (text.includes('poussin') || text.includes('poulet') || text.includes('pondeuse') || text.includes('chair')) return 'avicole';
  if (text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf') || text.includes('mouton') || text.includes('chevre') || text.includes('chèvre')) return 'animal';
  if (text.includes('culture') || text.includes('poivron') || text.includes('maraichage') || text.includes('maraîchage') || text.includes('champ')) return 'culture';
  if (text.includes('pompe') || text.includes('forage') || text.includes('irrigation') || text.includes('materiel') || text.includes('matériel') || text.includes('machine')) return 'equipement';
  if (text.includes('stock') || text.includes('aliment') || text.includes('semence') || text.includes('engrais')) return 'stock';
  return '';
}

export function buildInvestmentRealizationWorkflow(line = {}, options = {}) {
  if (!line?.id) return null;
  const amount = toNumber(options.amount ?? investmentAmount(line));
  if (amount <= 0) return null;
  const date = options.date || today();
  const label = investmentLabel(line);
  const key = `investment-realized:${line.id}`;
  const proofRequired = amount >= toNumber(options.proofThreshold ?? 100000);
  const transactionId = makeId('TRX');
  const documentId = makeId('DOC');
  return {
    key,
    financeTransaction: {
      id: transactionId,
      type: 'sortie',
      montant: amount,
      date,
      categorie: 'Investissements',
      module_lie: 'investissements',
      source_module: 'investissements',
      source_record_id: line.id,
      investment_line_id: line.id,
      business_plan_id: line.business_plan_id || '',
      libelle: `Investissement payé: ${label}`,
      description: `Paiement réel lié au BP · ${label}`,
      statut: 'payee',
      status: 'payee',
      cash_effect: true,
      payment_for: 'investment_line',
      proof_document_id: proofRequired ? documentId : '',
    },
    proofDocument: {
      id: documentId,
      title: `Preuve investissement: ${label}`,
      document_category: 'facture_investissement',
      module_source: 'investissements',
      entity_type: 'bp_investment_line',
      entity_id: line.id,
      related_id: line.id,
      transaction_id: transactionId,
      montant: amount,
      date,
      status: proofRequired ? 'manquant' : 'fourni',
      verification_status: proofRequired ? 'preuve_manquante' : 'a_verifier',
      notes: proofRequired ? 'Facture ou preuve à joindre avant contrôle comptable.' : 'Preuve non obligatoire selon le seuil, à vérifier si disponible.',
    },
    linePatch: {
      statut: 'effectif',
      status: 'effectif',
      montant_reel: amount,
      date_realisation: date,
      realized_at: now(),
      linked_finance_transaction_id: transactionId,
      proof_document_id: proofRequired ? documentId : '',
      realization_key: key,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'investissement_realise',
      module_source: 'investissements',
      entity_type: 'bp_investment_line',
      entity_id: line.id,
      title: `Investissement réalisé · ${label}`,
      description: `${amount} FCFA payés et reliés au BP.`,
      event_date: date,
      severity: proofRequired ? 'warning' : 'info',
      amount,
      linked_transaction_id: transactionId,
      linked_document_id: proofRequired ? documentId : '',
      saisies_evitees: 3,
    },
  };
}

export function buildInvestmentAssetWorkflow(line = {}, options = {}) {
  if (!line?.id || line.asset_created_at || line.asset_id) return null;
  const kind = investmentAssetKind(line);
  if (!kind) return null;
  const date = options.date || today();
  const label = investmentLabel(line);
  const qty = Math.max(1, Math.round(toNumber(line.quantite) || 1));
  const unitCost = toNumber(line.prix_unitaire) || investmentAmount(line) / qty;
  const base = {
    source: 'business_plan',
    source_module: 'investissements',
    source_record_id: line.id,
    business_plan_id: line.business_plan_id || '',
    bp_line_id: line.id,
    linked_transaction_id: line.linked_finance_transaction_id || line.transaction_id || '',
    preuve_url: line.preuve_url || '',
  };
  let module = kind;
  let payloads = [];
  if (kind === 'avicole') {
    const lotType = lower(label).includes('chair') || lower(label).includes('poulet') ? 'Chair' : 'Pondeuse';
    const id = makeId(lotType === 'Chair' ? 'LOTCH' : 'LOTP');
    payloads = [{ id, name: `${id} ${lotType}`, type: lotType, activity: lotType, status: 'actif', health_status: 'sain', initial_count: qty, current_count: qty, mortality: 0, malades: 0, entry_date: date, date_entree: date, date_debut: date, purchase_cost: unitCost * qty, ...base }];
  }
  if (kind === 'animal') {
    const animalType = lower(label).includes('mouton') ? 'Ovin' : lower(label).includes('chevre') || lower(label).includes('chèvre') ? 'Caprin' : 'Bovin';
    const prefix = animalType === 'Bovin' ? 'BOV' : animalType === 'Ovin' ? 'OVI' : 'CAP';
    payloads = Array.from({ length: qty }, (_, index) => {
      const id = makeId(prefix);
      return { id, tag: id, name: `${animalType} BP ${index + 1}`, type: animalType, status: 'actif', health_status: 'sain', mode_acquisition: 'achat', date_achat: date, date_entree_ferme: date, purchase_cost: unitCost, ...base };
    });
  }
  if (kind === 'culture') {
    const id = makeId('CULT');
    payloads = [{ id, nom: lower(label).includes('poivron') ? 'Poivrons' : label, type: lower(label).includes('poivron') ? 'Poivrons' : label, parcelle: 'À préciser', campagne: `BP ${line.business_plan_id || ''}`.trim(), statut: 'planifiee', date_debut_campagne: date, date_semis: date, surface: toNumber(line.quantite) || 0, unite_surface: line.unite || 'm²', budget_prevu: investmentAmount(line), ...base }];
  }
  if (kind === 'equipement') {
    module = 'equipements';
    payloads = [{ id: makeId('EQP'), nom: label, name: label, categorie: line.categorie || 'Équipement agricole', status: 'actif', statut: 'actif', date_achat: date, valeur: investmentAmount(line), cout_achat: investmentAmount(line), ...base }];
  }
  if (kind === 'stock') {
    module = 'stock';
    payloads = [{ id: makeId('STK'), produit: label, name: label, categorie: line.categorie || 'Stock initial', quantite: qty, unite: line.unite || 'unité', prixUnit: unitCost, prix_unitaire: unitCost, statut: 'ok', source_module: 'investissements', source_record_id: line.id, business_plan_id: line.business_plan_id || '', bp_line_id: line.id }];
  }
  const assetIds = payloads.map((payload) => payload.id).join(',');
  return {
    module,
    payloads,
    linePatch: {
      asset_module: module,
      asset_id: assetIds,
      asset_created_at: now(),
      asset_status: 'cree',
      statut: 'lie_metier',
      status: 'lie_metier',
      source_module: 'investissements',
      source_record_id: line.id,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'actif_investissement_cree',
      module_source: 'investissements',
      entity_type: 'bp_investment_line',
      entity_id: line.id,
      title: `Actif créé · ${label}`,
      description: `${payloads.length} fiche(s) créée(s) dans ${module}.`,
      event_date: date,
      severity: 'info',
      linked_asset_module: module,
      linked_asset_id: assetIds,
      saisies_evitees: payloads.length + 1,
    },
  };
}
