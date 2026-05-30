/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { MODULE_CONFIG } from '../utils/constants';
import { moduleSeedMap } from '../utils/mockData';
import { makeId } from '../utils/ids';
import { normalizeByModule } from '../utils/normalize';
import { getAcquisitionTraceStep, getAnimalDisplayName, getGestationTraceStep } from '../utils/animalLifecycle';
import { animauxService } from '../services/animauxService';
import { avicoleService } from '../services/avicoleService';
import { santeService } from '../services/santeService';
import { financesService } from '../services/financesService';
import { stockService } from '../services/stockService';
import { clientsService } from '../services/clientsService';
import { fournisseursService } from '../services/fournisseursService';
import { investissementsService } from '../services/investissementsService';
import { tracabiliteService } from '../services/tracabiliteService';
import { culturesService } from '../services/culturesService';
import { veterinairesService } from '../services/veterinairesService';
import { ventesService } from '../services/ventesService';
import { documentsService } from '../services/documentsService';
import { tachesService } from '../services/tachesService';
import { rapportsService } from '../services/rapportsService';
import { equipementsService } from '../services/equipementsService';
import { auditLogsService } from '../services/auditLogsService';
import { alimentationLogsService } from '../services/alimentationLogsService';
import { productionOeufsLogsService } from '../services/productionOeufsLogsService';
import { sensorDevicesService } from '../services/sensorDevicesService';
import { cameraDevicesService } from '../services/cameraDevicesService';
import { alertesCenterService } from '../services/alertesCenterService';
import { businessEventsService, createBusinessEvent } from '../services/businessEventsService';
import {
  businessPlansService,
  bpFundingSourcesService,
  bpInvestmentLinesService,
  bpLinksService,
  bpLinesHistoryService,
  bpRecurringCostsService,
  bpRevenueProjectionsService,
  bpRisksService,
  bpVersionsService,
  priceCatalogService,
} from '../services/businessPlansService';
import {
  deliveriesService,
  invoicesService,
  paymentsService,
  salesOpportunitiesService,
  salesOrderItemsService,
  salesOrdersService,
} from '../services/salesService';
import { whatsappLogsService, whatsappTemplatesService } from '../services/whatsappService';
import { supabase } from '../lib/supabase';
import { clearOfflineQueue, enqueueOfflineMutation, isBrowserOffline, readOfflineQueue, saveOfflineQueue } from '../services/offlineQueueService';

const AppDataContext = createContext(null);

const serviceMap = {
  animaux: animauxService,
  avicole: avicoleService,
  sante: santeService,
  veterinaires: veterinairesService,
  finances: financesService,
  stock: stockService,
  clients: clientsService,
  fournisseurs: fournisseursService,
  investissements: investissementsService,
  business_plans: businessPlansService,
  bp_investment_lines: bpInvestmentLinesService,
  bp_recurring_costs: bpRecurringCostsService,
  bp_revenue_projections: bpRevenueProjectionsService,
  bp_funding_sources: bpFundingSourcesService,
  bp_links: bpLinksService,
  bp_risks: bpRisksService,
  price_catalog: priceCatalogService,
  bp_versions: bpVersionsService,
  bp_lines_history: bpLinesHistoryService,
  tracabilite: tracabiliteService,
  cultures: culturesService,
  ventes: ventesService,
  documents: documentsService,
  taches: tachesService,
  rapports: rapportsService,
  equipements: equipementsService,
  audit_logs: auditLogsService,
  alimentation_logs: alimentationLogsService,
  production_oeufs_logs: productionOeufsLogsService,
  sensor_devices: sensorDevicesService,
  camera_devices: cameraDevicesService,
  business_events: businessEventsService,
  alertes_center: alertesCenterService,
  whatsapp_templates: whatsappTemplatesService,
  whatsapp_logs: whatsappLogsService,
  sales_orders: salesOrdersService,
  sales_order_items: salesOrderItemsService,
  deliveries: deliveriesService,
  invoices: invoicesService,
  payments: paymentsService,
  sales_opportunities: salesOpportunitiesService,
};

const clone = (value) => JSON.parse(JSON.stringify(value || []));
const emptyInitialData = () => Object.fromEntries(['dashboard', ...Object.keys(serviceMap), 'sync'].map((key) => [key, []]));

const initialData = emptyInitialData();

const eventDateOf = (record, ...keys) => keys.map((key) => record?.[key]).find(Boolean) || new Date().toISOString();

const acquisitionEventType = (mode) => ({ achat: ['acquisition', 'Acquisition par achat'], naissance_ferme: ['naissance', 'Naissance sur la ferme'], reproduction_interne: ['reproduction', 'Naissance issue de reproduction interne'], don: ['acquisition', 'Entree par don'], autre: ['acquisition', 'Entree dans la ferme'] }[mode || 'achat'] || ['acquisition', 'Entree dans la ferme']);

const buildCreateEvents = (moduleKey, record) => {
  if (!record?.id) return [];
  if (moduleKey === 'animaux') { const [eventType, title] = acquisitionEventType(record.mode_acquisition); return [{ event_type: eventType, module_source: 'animaux', entity_type: 'animal', entity_id: record.id, title, description: `${record.name || record.id} - ${record.type || 'animal'} entre dans la ferme.`, amount: Number(record.purchase_cost || 0) || null, event_date: eventDateOf(record, 'date_achat', 'date_naissance', 'date_entree_ferme'), severity: 'info' }]; }
  if (moduleKey === 'avicole') return [{ event_type: 'creation_lot', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: record.id, title: 'Creation lot avicole', description: `${record.name || record.id} - effectif initial ${record.initial_count || 0}.`, event_date: eventDateOf(record, 'date_debut'), severity: 'info' }];
  if (moduleKey === 'production_oeufs_logs') return [{ event_type: 'production_oeufs', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: record.lot_id || record.id, title: 'Production oeufs enregistree', description: `${record.oeufs_produits || 0} oeufs produits, ${record.oeufs_casses || 0} casses.`, event_date: eventDateOf(record, 'date'), severity: Number(record.oeufs_casses || 0) > Number(record.oeufs_produits || 0) * 0.08 ? 'warning' : 'info' }];
  if (moduleKey === 'alimentation_logs') { const isLot = record.type_cible === 'lot_avicole' || Boolean(record.lot_id); return [{ event_type: isLot ? 'alimentation_lot' : 'alimentation', module_source: isLot ? 'avicole' : 'animaux', entity_type: isLot ? 'lot_avicole' : 'categorie_animale', entity_id: record.cible_id || record.lot_id || record.categorie || record.id, title: isLot ? 'Alimentation lot avicole' : 'Alimentation categorie animale', description: `${record.categorie || 'Aliment'} - ${record.quantite || 0} ${record.unite || ''} pour ${record.montant_total || 0} FCFA.`, amount: Number(record.montant_total || 0) || null, event_date: eventDateOf(record, 'date'), severity: 'info' }]; }
  if (moduleKey === 'sante') { const done = record.statut === 'fait' || Boolean(record.effectuee); return [{ event_type: done ? 'vaccination' : 'soin', module_source: 'sante', entity_type: 'animal', entity_id: record.animal || record.id, title: done ? 'Vaccination effectuee' : 'Action sante planifiee', description: `${record.nom || 'Sante'} - veterinaire ${record.vet || 'non renseigne'}.`, event_date: eventDateOf(record, 'effectuee', 'prevue'), severity: record.statut === 'retard' ? 'warning' : 'info' }]; }
  if (moduleKey === 'cultures') return [{ event_type: record.date_semis ? 'semis' : 'incident_culture', module_source: 'cultures', entity_type: 'culture', entity_id: record.id, title: 'Culture enregistree', description: `${record.nom || record.id} - ${record.type || 'culture'} sur ${record.parcelle || 'parcelle non renseignee'}.`, event_date: eventDateOf(record, 'date_semis', 'created_at'), severity: record.statut === 'perdu' ? 'critique' : 'info' }];
  if (moduleKey === 'stock') return [{ event_type: Number(record.quantite || 0) <= Number(record.seuil || 0) ? 'stock_critique' : 'entree_stock', module_source: 'stocks', entity_type: 'stock', entity_id: record.id, title: Number(record.quantite || 0) <= Number(record.seuil || 0) ? 'Stock critique detecte' : 'Produit stock enregistre', description: `${record.produit || record.id}: ${record.quantite || 0} ${record.unite || ''}.`, amount: Number(record.quantite || 0) * Number(record.prixunit || record.prixUnit || 0) || null, severity: Number(record.quantite || 0) <= Number(record.seuil || 0) ? 'warning' : 'info' }];
  if (moduleKey === 'finances') return [{ event_type: record.type === 'entree' ? 'recette' : 'depense', module_source: 'finances', entity_type: 'transaction', entity_id: record.id, title: record.type === 'entree' ? 'Recette enregistree' : 'Depense enregistree', description: record.libelle || record.description || record.categorie || 'Transaction financiere', amount: Number(record.montant || 0), event_date: eventDateOf(record, 'date'), linked_transaction_id: record.id, severity: record.statut === 'impaye' ? 'warning' : 'info' }];
  if (moduleKey === 'documents') return [{ event_type: 'document_ajoute', module_source: 'documents', entity_type: record.entity_type || 'document', entity_id: record.entity_id || record.id, title: 'Document ajoute', description: `${record.title || record.id} - ${record.document_category || 'document'}.`, linked_document_id: record.id, severity: 'info' }];
  if (moduleKey === 'sales_orders') return [{ event_type: record.type_document === 'devis' ? 'facture' : 'vente', module_source: 'ventes', entity_type: 'vente', entity_id: record.id, title: 'Commande commerciale enregistree', description: `${record.type_document || 'commande'} - client ${record.client_id || 'non renseigne'}.`, amount: Number(record.montant_total || 0) || null, event_date: eventDateOf(record, 'date'), linked_sale_id: record.id, severity: 'info' }];
  if (moduleKey === 'sales_opportunities') return [{ event_type: 'opportunite_vente_detectee', module_source: 'ventes', entity_type: record.source_type || 'opportunite_vente', entity_id: record.source_id || record.id, title: record.title || 'Opportunite de vente detectee', description: record.reason || record.description || 'Opportunite commerciale a verifier.', amount: Number(record.estimated_value || 0) || null, event_date: eventDateOf(record, 'detected_at'), severity: 'info' }];
  if (moduleKey === 'invoices') return [{ event_type: 'facture', module_source: 'ventes', entity_type: 'facture', entity_id: record.id, title: 'Facture emise', description: record.numero_facture || record.order_id || 'Facture commerciale', amount: Number(record.montant_total || 0) || null, linked_sale_id: record.order_id || null, severity: 'info' }];
  if (moduleKey === 'payments') return [{ event_type: 'paiement', module_source: 'ventes', entity_type: 'paiement', entity_id: record.id, title: 'Paiement recu', description: `${record.moyen_paiement || 'paiement'} - commande ${record.order_id || 'non renseignee'}.`, amount: Number(record.montant || 0) || null, linked_sale_id: record.order_id || null, severity: 'info' }];
  if (moduleKey === 'alertes_center' && ['critique', 'urgence'].includes(record.severity)) return [{ event_type: 'incident', module_source: record.module_source || 'alertes', entity_type: record.entity_type || 'alerte', entity_id: record.entity_id || record.id, title: record.title || 'Alerte critique', description: record.message || record.action_recommandee || '', severity: record.severity }];
  return [];
};

const buildUpdateEvents = (moduleKey, previousRow, record) => {
  if (!record?.id) return [];
  const events = [];
  if (moduleKey === 'animaux') {
    if (previousRow?.status !== record.status && record.status === 'vendu') events.push({ event_type: 'vente', module_source: 'animaux', entity_type: 'animal', entity_id: record.id, title: 'Animal vendu', description: `${record.name || record.id} vendu a ${record.client_id || 'client non renseigne'}.`, amount: Number(record.prix_vente_reel || record.sale_price || 0) || null, event_date: eventDateOf(record, 'date_vente'), linked_transaction_id: record.linked_transaction_id || null, severity: 'info' });
    if (previousRow?.status !== record.status && record.status === 'mort') events.push({ event_type: 'deces', module_source: 'animaux', entity_type: 'animal', entity_id: record.id, title: 'Deces animal', description: record.cause_deces || `${record.name || record.id} marque comme mort.`, event_date: eventDateOf(record, 'date_deces'), severity: 'critique' });
    if (Number(previousRow?.poids || 0) !== Number(record.poids || 0)) events.push({ event_type: 'croissance', module_source: 'animaux', entity_type: 'animal', entity_id: record.id, title: 'Poids animal mis a jour', description: `Ancien poids ${previousRow?.poids || 0} kg, nouveau poids ${record.poids || 0} kg.`, severity: 'info' });
    if (previousRow?.health_status !== record.health_status) events.push({ event_type: ['malade', 'blesse', 'a_surveiller'].includes(record.health_status) ? 'incident' : 'soin', module_source: 'animaux', entity_type: 'animal', entity_id: record.id, title: 'Etat de sante modifie', description: `${previousRow?.health_status || 'inconnu'} -> ${record.health_status || 'inconnu'}.`, severity: ['malade', 'blesse'].includes(record.health_status) ? 'warning' : 'info' });
    if (!previousRow?.en_gestation && record.en_gestation) events.push({ event_type: 'gestation', module_source: 'animaux', entity_type: 'animal', entity_id: record.id, title: 'Debut gestation', description: `Femelle declaree en gestation. Mise bas prevue: ${record.date_prevue_mise_bas || 'non renseignee'}.`, event_date: eventDateOf(record, 'date_debut_gestation'), severity: 'info' });
  }
  if (moduleKey === 'avicole') {
    if (Number(record.mortality || 0) > Number(previousRow?.mortality || 0)) events.push({ event_type: 'mortalite_lot', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: record.id, title: 'Mortalite lot mise a jour', description: `${previousRow?.mortality || 0} -> ${record.mortality || 0} morts.`, severity: Number(record.initial_count || 0) && Number(record.mortality || 0) > Number(record.initial_count || 0) * 0.04 ? 'critique' : 'warning' });
    if (previousRow?.health_status !== record.health_status) events.push({ event_type: 'soin_lot', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: record.id, title: 'Etat sanitaire lot modifie', description: `${previousRow?.health_status || 'inconnu'} -> ${record.health_status || 'inconnu'}.`, severity: ['malade', 'critique'].includes(record.health_status) ? 'warning' : 'info' });
    if (previousRow?.status !== record.status && ['vendu', 'termine', 'perdu'].includes(record.status)) events.push({ event_type: record.status === 'perdu' ? 'incident' : 'cloture_lot', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: record.id, title: 'Statut lot modifie', description: `${previousRow?.status || 'inconnu'} -> ${record.status}.`, severity: record.status === 'perdu' ? 'critique' : 'info' });
  }
  if (moduleKey === 'stock' && Number(previousRow?.quantite || 0) !== Number(record.quantite || 0)) events.push({ event_type: Number(record.quantite || 0) <= Number(record.seuil || 0) ? 'stock_critique' : 'mouvement_stock', module_source: 'stocks', entity_type: 'stock', entity_id: record.id, title: Number(record.quantite || 0) <= Number(record.seuil || 0) ? 'Stock critique' : 'Mouvement stock', description: `${record.produit || record.id}: ${previousRow?.quantite || 0} -> ${record.quantite || 0} ${record.unite || ''}.`, severity: Number(record.quantite || 0) <= Number(record.seuil || 0) ? 'warning' : 'info' });
  if (moduleKey === 'sante' && previousRow?.statut !== record.statut && record.statut === 'fait') events.push({ event_type: 'vaccination', module_source: 'sante', entity_type: 'animal', entity_id: record.animal || record.id, title: 'Vaccination effectuee', description: record.nom || 'Vaccination marquee comme faite.', event_date: eventDateOf(record, 'effectuee'), severity: 'info' });
  if (moduleKey === 'cultures' && previousRow?.statut !== record.statut && record.statut === 'recolte') events.push({ event_type: 'recolte', module_source: 'cultures', entity_type: 'culture', entity_id: record.id, title: 'Culture en recolte', description: `${record.nom || record.id} - quantite recoltee ${record.quantite_recoltee || 0}.`, event_date: eventDateOf(record, 'date_recolte_reelle'), severity: 'info' });
  if (moduleKey === 'sales_opportunities' && previousRow?.status !== record.status && record.status === 'converti') events.push({ event_type: 'opportunite_convertie', module_source: 'ventes', entity_type: record.source_type || 'opportunite_vente', entity_id: record.source_id || record.id, title: 'Opportunite convertie', description: record.title || 'Opportunite transformee en commande/vente.', amount: Number(record.estimated_value || 0) || null, linked_sale_id: record.converted_sale_id || null, severity: 'info' });
  return events;
};

export function AppProvider({ children }) {
  const { session, loading: authLoading } = useAuth();
  const [dataMap, setDataMap] = useState(initialData);
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const setModuleLoading = useCallback((moduleKey, value) => setLoadingMap((prev) => ({ ...prev, [moduleKey]: value })), []);
  const setModuleError = useCallback((moduleKey, value) => setErrorMap((prev) => ({ ...prev, [moduleKey]: value })), []);
  const writeAuditLog = useCallback(async (action, moduleKey, recordId) => { if (moduleKey === 'audit_logs') return; try { await supabase.from('audit_logs').insert({ id: makeId('LOG'), actor: session?.user?.user_metadata?.login || session?.user?.email || 'system', action, module: moduleKey, record_id: recordId, device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'unknown' }); } catch (error) { console.warn('Audit log non enregistre', error.message); } }, [session]);

  const refreshModule = useCallback(async (moduleKey) => {
    const service = serviceMap[moduleKey];
    if (!service) return;
    setModuleLoading(moduleKey, true);
    setModuleError(moduleKey, null);
    try {
      const rows = await service.getAll();
      const safeRows = normalizeByModule(moduleKey, rows);
      setDataMap((prev) => ({ ...prev, [moduleKey]: Array.isArray(safeRows) ? safeRows : prev[moduleKey] }));
    } catch (error) {
      setModuleError(moduleKey, error.message || 'Erreur de chargement');
    } finally {
      setModuleLoading(moduleKey, false);
    }
  }, [setModuleError, setModuleLoading]);

  const refreshAllModules = useCallback(() => {
    Object.keys(serviceMap).forEach((moduleKey) => refreshModule(moduleKey));
  }, [refreshModule]);

  const appendAnimalTraceStep = useCallback(async (animal, step) => { if (!animal?.id || !step) return; try { const traceId = `TRA-${animal.id}`; const traces = await tracabiliteService.getAll(); const existing = traces.find((trace) => trace.id === traceId || String(trace.animal || '').includes(animal.id)); if (existing) { const etapes = Array.isArray(existing.etapes) ? existing.etapes : []; const alreadyExists = etapes.some((item) => item.event_type === step.event_type && item.date === step.date && item.titre === step.titre); if (!alreadyExists) await tracabiliteService.update(existing.id, { etapes: [...etapes, step] }); } else { await tracabiliteService.create({ id: traceId, animal: getAnimalDisplayName(animal), type: animal.type || '', etapes: [step], margeFinale: 0, roi: 0 }); } await refreshModule('tracabilite'); } catch (error) { console.warn('Trace animal non enregistree', error.message); } }, [refreshModule]);
  const createAnimalFollowUpTaskAndAlert = useCallback(async (animal) => { const nextDate = animal?.date_prochaine_verification || animal?.next_action_date || animal?.prochaine_visite; if (!animal?.id || !nextDate) return; try { const taskId = `TSK-${animal.id}-${String(nextDate).replace(/-/g, '')}`; const alertDate = new Date(nextDate); alertDate.setDate(alertDate.getDate() - 3); await tachesService.create({ id: taskId, title: `Verification sanitaire ${animal.id} - ${animal.name || 'animal'}`, module_lie: 'animaux', assigned_to: animal.veterinaire_id || 'Equipe ferme', due_date: alertDate.toISOString().slice(0, 10), priority: 'haute', status: 'a_faire', checklist: 'Verifier etat sante; noter poids; mettre a jour fiche; contacter veterinaire si besoin' }); await supabase.from('alertes_center').insert({ id: `ALERT-${taskId}`, title: `Rappel sanitaire ${animal.id}`, message: `Controle sanitaire prevu le ${nextDate}. Alerte creee 3 jours avant.`, module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Verifier la fiche animal et confirmer la visite veterinaire.', send_whatsapp: false }); await refreshModule('taches'); } catch (error) { console.warn('Rappel sanitaire non cree', error.message); } }, [refreshModule]);
  const emitBusinessEvents = useCallback(async (events = []) => { const validEvents = events.filter((event) => event?.event_type && event?.title); if (validEvents.length === 0) return; try { await Promise.allSettled(validEvents.map((event) => createBusinessEvent(event))); await refreshModule('business_events'); } catch (error) { console.warn('Evenements metier non enregistres', error.message); } }, [refreshModule]);

  useEffect(() => { if (authLoading || !session) return; refreshAllModules(); }, [authLoading, session, refreshAllModules]);
  useEffect(() => { if (authLoading || !session) return undefined; const handler = () => { setDataMap(emptyInitialData()); refreshAllModules(); }; window.addEventListener('horizon-farm-data-mode-changed', handler); window.addEventListener('storage', handler); return () => { window.removeEventListener('horizon-farm-data-mode-changed', handler); window.removeEventListener('storage', handler); }; }, [authLoading, session, refreshAllModules]);

  useEffect(() => { if (authLoading || !session) return undefined; const channel = supabase.channel('horizon-farm-realtime'); Object.entries(MODULE_CONFIG).filter(([, config]) => config.table).forEach(([moduleKey, config]) => { channel.on('postgres_changes', { event: '*', schema: 'public', table: config.table }, () => refreshModule(moduleKey)); }); channel.subscribe(); return () => { supabase.removeChannel(channel); }; }, [authLoading, session, refreshModule]);

  const createRecord = useCallback(async (moduleKey, payload) => { const service = serviceMap[moduleKey]; const config = MODULE_CONFIG[moduleKey] || {}; const idField = config.idField || 'id'; const generatedId = payload?.[idField] || makeId(config.idPrefix || moduleKey.toUpperCase()); const record = normalizeByModule(moduleKey, [{ ...payload, [idField]: generatedId }])[0]; setModuleError(moduleKey, null); setDataMap((prev) => ({ ...prev, [moduleKey]: [record, ...(prev[moduleKey] || [])] })); if (!service) return record; try { const created = await service.create(record); const normalized = normalizeByModule(moduleKey, [created || record])[0]; setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((row) => row[idField] === generatedId ? normalized : row) })); await refreshModule(moduleKey); await writeAuditLog('creation', moduleKey, generatedId); if (moduleKey === 'animaux') { await appendAnimalTraceStep(normalized, getAcquisitionTraceStep(normalized, dataMap.animaux || [])); await createAnimalFollowUpTaskAndAlert(normalized); } await emitBusinessEvents(buildCreateEvents(moduleKey, normalized)); return normalized; } catch (error) { if (isBrowserOffline()) { enqueueOfflineMutation({ moduleKey, action: 'create', id: generatedId, payload: record }); setModuleError(moduleKey, 'Mode hors ligne: creation mise en file de synchronisation'); return record; } setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).filter((row) => row[idField] !== generatedId) })); setModuleError(moduleKey, error.message || 'Erreur creation'); throw error; } }, [appendAnimalTraceStep, createAnimalFollowUpTaskAndAlert, dataMap.animaux, emitBusinessEvents, refreshModule, setModuleError, writeAuditLog]);

  const updateRecord = useCallback(async (moduleKey, id, payload) => { const service = serviceMap[moduleKey]; const config = MODULE_CONFIG[moduleKey] || {}; const idField = config.idField || 'id'; let previousRow = null; setDataMap((prev) => { const rows = prev[moduleKey] || []; previousRow = rows.find((row) => row[idField] === id) || null; return { ...prev, [moduleKey]: rows.map((row) => (row[idField] === id ? { ...row, ...payload } : row)) }; }); if (!service) return payload; try { const updated = await service.update(id, payload); const normalized = normalizeByModule(moduleKey, [updated || { ...previousRow, ...payload }])[0]; await refreshModule(moduleKey); await writeAuditLog('modification', moduleKey, id); if (moduleKey === 'animaux') { const traceStep = previousRow?.en_gestation !== normalized.en_gestation && normalized.en_gestation ? getGestationTraceStep(normalized) : null; await appendAnimalTraceStep(normalized, traceStep); await createAnimalFollowUpTaskAndAlert(normalized); } await emitBusinessEvents(buildUpdateEvents(moduleKey, previousRow, normalized)); return normalized; } catch (error) { if (isBrowserOffline()) { enqueueOfflineMutation({ moduleKey, action: 'update', id, payload }); setModuleError(moduleKey, 'Mode hors ligne: modification mise en file de synchronisation'); return { ...previousRow, ...payload }; } setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((row) => (row[idField] === id ? previousRow : row)) })); setModuleError(moduleKey, error.message || 'Erreur modification'); throw error; } }, [appendAnimalTraceStep, createAnimalFollowUpTaskAndAlert, emitBusinessEvents, refreshModule, setModuleError, writeAuditLog]);

  const deleteRecord = useCallback(async (moduleKey, id) => { const service = serviceMap[moduleKey]; const config = MODULE_CONFIG[moduleKey] || {}; const idField = config.idField || 'id'; let previousRows = []; setDataMap((prev) => { previousRows = prev[moduleKey] || []; return { ...prev, [moduleKey]: previousRows.filter((row) => row[idField] !== id) }; }); if (!service) return true; try { await service.remove(id); await writeAuditLog('suppression', moduleKey, id); return true; } catch (error) { if (isBrowserOffline()) { enqueueOfflineMutation({ moduleKey, action: 'delete', id }); setModuleError(moduleKey, 'Mode hors ligne: suppression mise en file de synchronisation'); return true; } setDataMap((prev) => ({ ...prev, [moduleKey]: previousRows })); setModuleError(moduleKey, error.message || 'Erreur suppression'); throw error; } }, [setModuleError, writeAuditLog]);

  const syncOfflineQueue = useCallback(async () => { if (isBrowserOffline()) return; const queue = readOfflineQueue(); if (queue.length === 0) return; const pending = []; for (const item of queue) { const service = serviceMap[item.moduleKey]; if (!service) continue; try { if (item.action === 'create') await service.create(item.payload); if (item.action === 'update') await service.update(item.id, item.payload); if (item.action === 'delete') await service.remove(item.id); await writeAuditLog(`sync_${item.action}`, item.moduleKey, item.id); } catch (error) { pending.push({ ...item, last_error: error.message }); } } if (pending.length === 0) clearOfflineQueue(); else saveOfflineQueue(pending); Object.keys(serviceMap).forEach((moduleKey) => refreshModule(moduleKey)); }, [refreshModule, writeAuditLog]);
  useEffect(() => { const handler = () => syncOfflineQueue(); window.addEventListener('online', handler); syncOfflineQueue(); return () => window.removeEventListener('online', handler); }, [syncOfflineQueue]);

  const value = useMemo(() => ({ dataMap, loadingMap, errorMap, refreshModule, createRecord, updateRecord, deleteRecord, syncOfflineQueue }), [dataMap, loadingMap, errorMap, refreshModule, createRecord, updateRecord, deleteRecord, syncOfflineQueue]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() { const context = useContext(AppDataContext); if (!context) throw new Error('useAppData must be used within AppProvider'); return context; }
