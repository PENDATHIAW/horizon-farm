import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import CulturesV4 from './CulturesV4.jsx';

const n = (value = 0) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const labelOf = (row = {}) => row.nom || row.name || row.type || row.culture || row.parcelle || row.id || 'Culture';
const harvestQty = (row = {}) => n(row.quantite_recoltee ?? row.recolte ?? row.production_recoltee ?? row.rendement_reel ?? row.quantite_disponible);
const harvestUnit = (row = {}) => row.unite_recolte || row.unite || row.unit || 'kg';
const unitPrice = (row = {}) => n(row.prix_vente_estime ?? row.prix_vente ?? row.prix_unitaire);
const stockKey = (row = {}) => `culture-stock:${row.id || labelOf(row)}`;
const opportunityKey = (row = {}) => `culture-sale:${row.id || labelOf(row)}`;
const isHarvestReady = (row = {}) => {
  const status = norm(row.statut || row.status || row.phase || '');
  return harvestQty(row) > 0 || ['recolte', 'recoltee', 'pret_a_vendre', 'pret_vente', 'pret a vendre'].some((word) => status.includes(norm(word)));
};

export default function CulturesV5(props) {
  const stockCrud = useCrudModule('stock');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const stocks = props.stocks || stockCrud.rows || [];
  const opportunities = props.opportunities || opportunitiesCrud.rows || [];

  const syncHarvest = async (before = {}, after = {}, source = 'modification culture') => {
    if (!after?.id || !isHarvestReady(after)) return;
    const qty = harvestQty(after);
    if (qty <= 0) return;
    const sKey = stockKey(after);
    const oKey = opportunityKey(after);
    const name = `Récolte ${labelOf(after)}`;
    const stockExisting = stocks.find((row) => String(row.stock_key || row.dedupe_key || row.source_record_id || row.related_id || row.culture_id || '') === sKey || (String(row.source_module || '').includes('cultures') && String(row.source_id || row.culture_id || '') === String(after.id)));
    const stockPayload = {
      stock_key: sKey,
      dedupe_key: sKey,
      produit: name,
      name,
      categorie: 'Récoltes cultures',
      category: 'recolte_culture',
      quantite: qty,
      quantity: qty,
      unite: harvestUnit(after),
      seuil: 0,
      source_module: 'cultures',
      source_type: 'culture',
      source_id: after.id,
      source_record_id: sKey,
      related_id: after.id,
      culture_id: after.id,
      date_entree: after.date_recolte || today(),
      notes: `Stock créé depuis la récolte de ${labelOf(after)}`,
    };
    if (stockExisting?.id) await (props.onUpdateStock || stockCrud.update)?.(stockExisting.id, stockPayload);
    else await (props.onCreateStock || stockCrud.create)?.({ id: makeId('STK'), ...stockPayload });

    const oppExisting = opportunities.find((opp) => String(opp.opportunity_key || opp.dedupe_key || opp.source_record_id || opp.source_id || '') === oKey || (String(opp.source_module || opp.created_from || '').includes('cultures') && String(opp.source_id || opp.entity_id || opp.culture_id || '') === String(after.id)));
    const amount = unitPrice(after) > 0 ? unitPrice(after) * qty : n(after.valeur_recolte_estimee || after.montant_estime);
    const opportunityPayload = {
      opportunity_key: oKey,
      dedupe_key: oKey,
      title: `Vente ${name}`,
      libelle: `Vente ${name}`,
      source_module: 'cultures',
      created_from: 'cultures',
      source_type: 'recolte_culture',
      entity_type: 'culture',
      source_id: after.id,
      entity_id: after.id,
      culture_id: after.id,
      product_name: name,
      produit: name,
      quantity: qty,
      quantite: qty,
      unite: harvestUnit(after),
      unit: harvestUnit(after),
      unit_price: unitPrice(after),
      prix_unitaire: unitPrice(after),
      montant_estime: amount,
      estimated_amount: amount,
      valeur_estimee: amount,
      status: 'ouverte',
      statut: 'ouverte',
      priority: 'haute',
      date: after.date_recolte || today(),
      notes: `Récolte disponible à vendre · ${qty} ${harvestUnit(after)}`,
    };
    if (oppExisting?.id) await (props.onUpdateOpportunity || opportunitiesCrud.update)?.(oppExisting.id, { ...opportunityPayload, updated_at: new Date().toISOString() });
    else await (props.onCreateOpportunity || opportunitiesCrud.create)?.({ id: makeId('OPP'), ...opportunityPayload });

    const beforeQty = harvestQty(before);
    if (qty > beforeQty) {
      await props.onCreateBusinessEvent?.({
        id: makeId('EVT'),
        event_type: 'recolte_culture_disponible',
        module_source: 'cultures',
        module: 'cultures',
        source_type: 'culture',
        entity_type: 'culture',
        source_id: after.id,
        entity_id: after.id,
        title: `Récolte disponible · ${labelOf(after)}`,
        description: [`Source: ${source}`, `Quantité récoltée: ${qty} ${harvestUnit(after)}`, 'Stock et opportunité de vente préparés.'].join('\n'),
        severity: 'info',
        status: 'nouveau',
        event_date: after.date_recolte || today(),
        date: after.date_recolte || today(),
        amount,
        montant: amount,
        linked_opportunity_key: oKey,
        linked_stock_key: sKey,
        saisies_evitees: 2,
      });
    }
    await Promise.allSettled([
      props.onRefreshStock?.(), props.onRefreshStocks?.(), stockCrud.refresh?.(),
      props.onRefreshOpportunities?.(), opportunitiesCrud.refresh?.(),
      props.onRefreshBusinessEvents?.(),
    ]);
  };

  const onCreate = async (payload) => {
    await props.onCreate?.(payload);
    await syncHarvest({}, payload, 'création culture');
  };

  const onUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    await syncHarvest(before, after, 'modification fiche culture');
  };

  return <CulturesV4 {...props} stocks={stocks} opportunities={opportunities} onCreate={onCreate} onUpdate={onUpdate} />;
}
