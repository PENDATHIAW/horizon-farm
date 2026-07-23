import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createModuleRefreshScheduler } from '../utils/moduleRefreshScheduler';
import { isQuotaError, pruneHeavyLocalStorage } from '../utils/safeLocalStorage';
import { useAuth } from './AuthContext';
import { MODULE_CONFIG } from '../utils/constants';
import { makeId } from '../utils/ids';
import { withFarmId } from '../utils/farmScopePayload.js';
import { filterAppContextBusinessEvents } from '../utils/appContextEventGuard.js';
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
import { smartfarmEventsService } from '../services/smartfarmEventsService';
import { alertesCenterService } from '../services/alertesCenterService';
import { businessEventsService, createBusinessEvent, findDuplicateBusinessEvent } from '../services/businessEventsService';
import { buildCreateEvents, buildUpdateEvents } from '../services/businessEventBuilders.js';
import { buildReplayEvents, dedupeFileHorsLigne, withStableIssueKey } from '../services/offlineReplayEvents.js';
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
import { stockMovementsCrud } from '../services/stockMovementsService';
import { planningSimulationsService } from '../services/planningSimulationsService.js';
import {
  funderAccessLogsService,
  funderAccountsService,
  fundingAgreementsService,
  fundingApplicationsService,
  fundingContactsService,
  fundingDocumentLibraryService,
  fundingExpenseAllocationsService,
  fundingOpportunitiesService,
  fundingProjectJournalService,
  fundingReportsService,
} from '../services/fundingCrudService.js';
import { supabase } from '../lib/supabase';
import { normalizeByModule } from '../utils/normalize.js';
import { clearOfflineQueue, enqueueOfflineMutation, isBrowserOffline, readOfflineQueue, saveOfflineQueue } from '../services/offlineQueueService';
import { classifyReplayOutcome, isActionable, markConflict, registerFailure } from '../services/offlineMutationModel.js';
import { isDataKeyEnabled, resolveModuleFlags } from '../config/moduleFlags';
import { groupRealtimeModulesByTable, makeRealtimeChannelName } from '../utils/realtimeSubscriptions.js';

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
  smartfarm_events: smartfarmEventsService,
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
  stock_movements: stockMovementsCrud,
  planning_simulations: planningSimulationsService,
  funding_opportunities: fundingOpportunitiesService,
  funding_contacts: fundingContactsService,
  funding_applications: fundingApplicationsService,
  funding_document_library: fundingDocumentLibraryService,
  funding_agreements: fundingAgreementsService,
  funding_expense_allocations: fundingExpenseAllocationsService,
  funding_reports: fundingReportsService,
  funding_project_journal: fundingProjectJournalService,
  funder_accounts: funderAccountsService,
  funder_access_logs: funderAccessLogsService,
};

const emptyInitialData = () => Object.fromEntries(['dashboard', ...Object.keys(serviceMap), 'sync'].map((key) => [key, []]));

const initialData = emptyInitialData();

const friendlySaveError = (error, fallback) => {
  if (isQuotaError(error)) {
    pruneHeavyLocalStorage();
    return 'Mémoire navigateur saturée. Rechargez la page (F5) puis réessayez.';
  }
  return error?.message || fallback;
};


export function AppProvider({ children, initialDataMap = null }) {
  const { session, loading: authLoading } = useAuth();
  const [dataMap, setDataMap] = useState(() => (
    initialDataMap ? { ...emptyInitialData(), ...initialDataMap } : initialData
  ));
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const setModuleLoading = useCallback((moduleKey, value) => setLoadingMap((prev) => ({ ...prev, [moduleKey]: value })), []);
  const setModuleError = useCallback((moduleKey, value) => setErrorMap((prev) => ({ ...prev, [moduleKey]: value })), []);
  const writeAuditLog = useCallback(async (action, moduleKey, recordId) => {
    if (moduleKey === 'audit_logs' || !session?.access_token) return;
    try {
      await supabase.from('audit_logs').insert({
        id: makeId('LOG'),
        actor: session.user?.user_metadata?.login || session.user?.email || 'system',
        action,
        module: moduleKey,
        record_id: recordId,
        device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'unknown',
      });
    } catch (error) {
      console.warn('Audit log non enregistre', error.message);
    }
  }, [session]);

  const fetchModuleData = useCallback(async (moduleKey) => {
    const service = serviceMap[moduleKey];
    if (!service) return;
    if (!isDataKeyEnabled(moduleKey, resolveModuleFlags(null))) return;
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

  const refreshScheduler = useMemo(() => createModuleRefreshScheduler(fetchModuleData), [fetchModuleData]);

  const refreshModule = useCallback(async (moduleKey, options = {}) => {
    if (options.immediate) return refreshScheduler.refreshNow(moduleKey);
    return refreshScheduler.schedule(moduleKey);
  }, [refreshScheduler]);

  const markLocalWrite = useCallback((moduleKey) => refreshScheduler.markLocalWrite(moduleKey), [refreshScheduler]);

  const refreshAllModules = useCallback(() => {
    Object.keys(serviceMap).forEach((moduleKey) => refreshModule(moduleKey));
  }, [refreshModule]);

  const refreshAllModulesImmediate = useCallback(async () => {
    await Promise.allSettled(
      Object.keys(serviceMap).map((moduleKey) => refreshModule(moduleKey, { immediate: true })),
    );
  }, [refreshModule]);

  const appendAnimalTraceStep = useCallback(async (animal, step) => { if (!animal?.id || !step) return; try { const traceId = `TRA-${animal.id}`; const traces = await tracabiliteService.getAll(); const existing = traces.find((trace) => trace.id === traceId || String(trace.animal || '').includes(animal.id)); if (existing) { const etapes = Array.isArray(existing.etapes) ? existing.etapes : []; const alreadyExists = etapes.some((item) => item.event_type === step.event_type && item.date === step.date && item.titre === step.titre); if (!alreadyExists) await tracabiliteService.update(existing.id, { etapes: [...etapes, step] }); } else { await tracabiliteService.create({ id: traceId, animal: getAnimalDisplayName(animal), type: animal.type || '', etapes: [step], margeFinale: 0, roi: 0 }); } await refreshModule('tracabilite'); } catch (error) { console.warn('Trace animal non enregistree', error.message); } }, [refreshModule]);
  const createAnimalFollowUpTaskAndAlert = useCallback(async (animal) => { const nextDate = animal?.date_prochaine_verification || animal?.next_action_date || animal?.prochaine_visite; if (!animal?.id || !nextDate) return; try { const taskId = `TSK-${animal.id}-${String(nextDate).replace(/-/g, '')}`; const alertDate = new Date(nextDate); alertDate.setDate(alertDate.getDate() - 3); await tachesService.create({ id: taskId, farm_id: animal.farm_id, title: `Verification sanitaire ${animal.id} - ${animal.name || 'animal'}`, module_lie: 'animaux', assigned_to: animal.veterinaire_id || 'Equipe ferme', due_date: alertDate.toISOString().slice(0, 10), priority: 'haute', status: 'a_faire', checklist: 'Verifier etat sante; noter poids; mettre a jour fiche; contacter veterinaire si besoin' }); await supabase.from('alertes_center').insert(withFarmId('alertes_center', { id: `ALERT-${taskId}`, farm_id: animal.farm_id, title: `Rappel sanitaire ${animal.id}`, message: `Controle sanitaire prevu le ${nextDate}. Alerte creee 3 jours avant.`, module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Verifier la fiche animal et confirmer la visite veterinaire.', send_whatsapp: false })); await refreshModule('taches'); } catch (error) { console.warn('Rappel sanitaire non cree', error.message); } }, [refreshModule]);
  const businessEventsRef = useRef([]);
  useEffect(() => { businessEventsRef.current = dataMap.business_events || []; }, [dataMap.business_events]);
  // Miroir du dataMap pour le rejeu hors ligne : permet de comparer une mutation
  // en attente à l'état connu de sa ligne et de détecter un conflit sans re-render.
  const dataMapRef = useRef(dataMap);
  useEffect(() => { dataMapRef.current = dataMap; }, [dataMap]);

  const emitBusinessEvents = useCallback((events = [], moduleKey = '', record = {}) => {
    const filtered = filterAppContextBusinessEvents(events, moduleKey, record);
    const validEvents = filtered.filter((event) => event?.event_type && event?.title).map(withStableIssueKey);
    if (validEvents.length === 0) return;
    // Idempotence : on écarte les événements déjà connus (même issue_key), pour
    // qu'un rejeu hors ligne ne produise pas un second effet inter-modules.
    const connus = businessEventsRef.current || [];
    const nouveaux = validEvents.filter((event) => !findDuplicateBusinessEvent(event, connus));
    if (nouveaux.length === 0) return;
    markLocalWrite('business_events');
    void Promise.allSettled(nouveaux.map((event) => createBusinessEvent({ ...event, existingEvents: connus })))
      .then(() => refreshModule('business_events'))
      .catch((error) => { console.warn('Evenements metier non enregistres', error.message); });
  }, [markLocalWrite, refreshModule]);

  useEffect(() => { if (authLoading || !session) return; refreshAllModules(); }, [authLoading, session, refreshAllModules]);
  useEffect(() => {
    if (authLoading || !session) return undefined;
    const handler = () => {
      setDataMap(emptyInitialData());
      void refreshAllModulesImmediate();
    };
    window.addEventListener('horizon-farm-data-mode-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-data-mode-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [authLoading, session, refreshAllModulesImmediate]);

  useEffect(() => {
    if (authLoading || !session || session.user?.id === 'local-preview-user') return undefined;
    const channel = supabase.channel(makeRealtimeChannelName());
    groupRealtimeModulesByTable(MODULE_CONFIG).forEach(({ table, moduleKeys }) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        moduleKeys.forEach((moduleKey) => {
          if (!refreshScheduler.shouldSuppressRealtime(moduleKey)) refreshModule(moduleKey);
        });
      });
    });
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [authLoading, session, refreshModule, refreshScheduler]);

  const createRecord = useCallback(async (moduleKey, payload) => { const service = serviceMap[moduleKey]; const config = MODULE_CONFIG[moduleKey] || {}; const idField = config.idField || 'id'; const generatedId = payload?.[idField] || makeId(config.idPrefix || moduleKey.toUpperCase()); const record = normalizeByModule(moduleKey, [{ ...payload, [idField]: generatedId }])[0]; setModuleError(moduleKey, null); setDataMap((prev) => ({ ...prev, [moduleKey]: [record, ...(prev[moduleKey] || [])] })); if (!service) return record; markLocalWrite(moduleKey); try { const created = await service.create(record); const normalized = normalizeByModule(moduleKey, [created || record])[0]; setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((row) => row[idField] === generatedId ? normalized : row) })); refreshModule(moduleKey); void writeAuditLog('creation', moduleKey, generatedId); if (moduleKey === 'animaux') { void appendAnimalTraceStep(normalized, getAcquisitionTraceStep(normalized, dataMap.animaux || [])); void createAnimalFollowUpTaskAndAlert(normalized); } emitBusinessEvents(buildCreateEvents(moduleKey, normalized), moduleKey, normalized); return normalized; } catch (error) { if (isBrowserOffline()) { enqueueOfflineMutation({ moduleKey, action: 'create', id: generatedId, payload: record }); setModuleError(moduleKey, 'Mode hors ligne: creation mise en file de synchronisation'); return record; } setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).filter((row) => row[idField] !== generatedId) }));       setModuleError(moduleKey, friendlySaveError(error, 'Erreur creation')); throw error; } }, [appendAnimalTraceStep, createAnimalFollowUpTaskAndAlert, dataMap.animaux, emitBusinessEvents, markLocalWrite, refreshModule, setModuleError, writeAuditLog]);

  const updateRecord = useCallback(async (moduleKey, id, payload) => { const service = serviceMap[moduleKey]; const config = MODULE_CONFIG[moduleKey] || {}; const idField = config.idField || 'id'; let previousRow = null; setDataMap((prev) => { const rows = prev[moduleKey] || []; previousRow = rows.find((row) => row[idField] === id) || null; return { ...prev, [moduleKey]: rows.map((row) => (row[idField] === id ? { ...row, ...payload } : row)) }; }); if (!service) return payload; markLocalWrite(moduleKey); try { const updated = await service.update(id, payload); const normalized = normalizeByModule(moduleKey, [updated || { ...previousRow, ...payload }])[0]; setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((row) => (row[idField] === id ? normalized : row)) })); refreshModule(moduleKey); void writeAuditLog('modification', moduleKey, id); if (moduleKey === 'animaux') { const traceStep = previousRow?.en_gestation !== normalized.en_gestation && normalized.en_gestation ? getGestationTraceStep(normalized) : null; void appendAnimalTraceStep(normalized, traceStep); void createAnimalFollowUpTaskAndAlert(normalized); } emitBusinessEvents(buildUpdateEvents(moduleKey, previousRow, normalized), moduleKey, normalized); return normalized; } catch (error) { if (isBrowserOffline()) { enqueueOfflineMutation({ moduleKey, action: 'update', id, payload, baseRow: previousRow }); setModuleError(moduleKey, 'Mode hors ligne: modification mise en file de synchronisation'); return { ...previousRow, ...payload }; } setDataMap((prev) => ({ ...prev, [moduleKey]: (prev[moduleKey] || []).map((row) => (row[idField] === id ? previousRow : row)) })); setModuleError(moduleKey, friendlySaveError(error, 'Erreur modification')); throw error; } }, [appendAnimalTraceStep, createAnimalFollowUpTaskAndAlert, emitBusinessEvents, markLocalWrite, refreshModule, setModuleError, writeAuditLog]);

  const deleteRecord = useCallback(async (moduleKey, id) => { const service = serviceMap[moduleKey]; const config = MODULE_CONFIG[moduleKey] || {}; const idField = config.idField || 'id'; let previousRows = []; setDataMap((prev) => { previousRows = prev[moduleKey] || []; return { ...prev, [moduleKey]: previousRows.filter((row) => row[idField] !== id) }; }); if (!service) return true; try { await service.remove(id); await writeAuditLog('suppression', moduleKey, id); return true; } catch (error) { if (isBrowserOffline()) { enqueueOfflineMutation({ moduleKey, action: 'delete', id, baseRow: previousRows.find((row) => row[idField] === id) || null }); setModuleError(moduleKey, 'Mode hors ligne: suppression mise en file de synchronisation'); return true; } setDataMap((prev) => ({ ...prev, [moduleKey]: previousRows })); setModuleError(moduleKey, error.message || 'Erreur suppression'); throw error; } }, [setModuleError, writeAuditLog]);

  const syncOfflineQueue = useCallback(async () => {
    const localPreview = session?.user?.id === 'local-preview-user';
    if (authLoading || (!session?.access_token && !localPreview) || isBrowserOffline()) return;
    // Déduplique la file par (module, action, id) : une même écriture rejouée
    // n'apparaît qu'une fois, ce qui évite les doubles insertions.
    const queue = dedupeFileHorsLigne(readOfflineQueue());
    if (queue.length === 0) return;
    const pending = [];
    for (const item of queue) {
      const service = serviceMap[item.moduleKey];
      if (!service) continue;
      // Les mutations en conflit ou rejetées restent visibles mais ne sont plus
      // rejouées automatiquement (résolution ultérieure).
      if (!isActionable(item)) { pending.push(item); continue; }
      const idField = (MODULE_CONFIG[item.moduleKey] || {}).idField || 'id';
      const recordId = item.recordId ?? item.id;
      // État connu de la ligne : permet de détecter qu'elle a changé côté serveur
      // depuis la saisie hors ligne (conflit) au lieu d'écraser silencieusement.
      const rows = dataMapRef.current?.[item.moduleKey];
      const currentServerRow = Array.isArray(rows)
        ? (rows.find((row) => String(row[idField]) === String(recordId)) ?? null)
        : undefined;
      const decision = classifyReplayOutcome({ mutation: item, currentServerRow });
      if (decision.outcome === 'noop') continue; // ex. suppression déjà effective
      if (decision.outcome === 'conflict') { pending.push(markConflict(item, decision.reason)); continue; }
      try {
        if (item.action === 'create') await service.create(item.payload);
        if (item.action === 'update') await service.update(recordId, item.payload);
        if (item.action === 'delete') await service.remove(recordId);
        await writeAuditLog(`sync_${item.action}`, item.moduleKey, recordId);
        // Réémission des événements métier avec leur issue_key : le rejeu passe
        // par la même voie idempotente que l'écriture en ligne, donc un seul
        // effet inter-modules même si la file est rejouée plusieurs fois.
        if (item.action === 'create' || item.action === 'update') {
          const record = item.payload || { id: recordId };
          const events = buildReplayEvents(item.moduleKey, item.action, record, item.previousRow || null);
          emitBusinessEvents(events, item.moduleKey, record);
        }
      } catch (error) {
        // Échec technique : on compte la tentative ; après plusieurs échecs la
        // mutation est marquée rejetée (visible) au lieu d'être rejouée sans fin.
        pending.push(registerFailure(item, error.message));
      }
    }
    if (pending.length === 0) clearOfflineQueue(); else saveOfflineQueue(pending);
    Object.keys(serviceMap).forEach((moduleKey) => refreshModule(moduleKey, { immediate: true }));
  }, [authLoading, emitBusinessEvents, refreshModule, session, writeAuditLog]);
  useEffect(() => {
    if (authLoading || !session?.user?.id) return undefined;
    const handler = () => syncOfflineQueue();
    window.addEventListener('online', handler);
    void syncOfflineQueue();
    return () => window.removeEventListener('online', handler);
  }, [authLoading, session?.user?.id, syncOfflineQueue]);

  const value = useMemo(() => ({ dataMap, loadingMap, errorMap, refreshModule, createRecord, updateRecord, deleteRecord, syncOfflineQueue }), [dataMap, loadingMap, errorMap, refreshModule, createRecord, updateRecord, deleteRecord, syncOfflineQueue]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() { const context = useContext(AppDataContext); if (!context) throw new Error('useAppData must be used within AppProvider'); return context; }
