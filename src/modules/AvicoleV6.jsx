import { Activity, AlertTriangle, Bird, Download, Edit, Eye, MessageCircle, Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import AvicoleActivityTabs from '../components/AvicoleActivityTabs';
import DetailsModal from '../modals/DetailsModal';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import {
  buildLotAlerts,
  calculateLotCurrentCount,
  calculateLotEndDate,
  calculateLotMetrics,
  calculateLotSaleReadiness,
  enrichProductionEggLogs,
  getLotDefaultCycle,
  suggestLotPhase,
} from '../utils/businessCalculations';
import { filterLotsByActivity, getDefaultLotForActivity, isChairLot, isPondeuseLot } from '../utils/avicoleActivity';

const todayIso = () => new Date().toISOString().slice(0, 10);
const safeArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Number(value || 0));
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenCount = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const sellableEggs = (log = {}) => Math.max(0, eggCount(log) - brokenCount(log));
const trayCount = (log = {}) => toNumber(log.plateaux) || Math.floor(sellableEggs(log) / 30);
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

const computeCurrentFromForm = (form = {}) => Math.max(
  0,
  toNumber(form.initial_count) -
  toNumber(form.mortality) -
  toNumber(form.vols) -
  toNumber(form.vendus) -
  toNumber(form.reformes) -
  toNumber(form.sorties)
);

const getCapacity = (lot = {}, metrics = {}) => Math.max(
  0,
  toNumber(metrics.currentCount ?? calculateLotCurrentCount(lot) ?? lot.current_count)
);

function groupDailyProduction(logs = [], lotById, metricsFor) {
  const grouped = new Map();

  logs.forEach((log) => {
    const key = `${log.date || 'Sans date'}::${log.lot_id || ''}`;
    const current = grouped.get(key) || {
      id: key,
      date: log.date || 'Sans date',
      lot_id: log.lot_id,
      lot_name: log.lot_name,
      logIds: [],
      notes: [],
      raw: 0,
      broken: 0,
      sellable: 0,
      trays: 0,
    };

    current.logIds.push(log.id);
    if (log.notes) current.notes.push(log.notes);
    current.raw += eggCount(log);
    current.broken += brokenCount(log);
    current.sellable += sellableEggs(log);
    current.trays += trayCount(log);
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((row) => {
      const lot = lotById.get(row.lot_id) || {};
      const metrics = metricsFor(lot);
      const capacity = getCapacity(lot, metrics);
      const valid = Math.min(row.raw, capacity);
      const excess = Math.max(0, row.raw - capacity);
      const rate = capacity > 0 ? Math.min(100, (valid / capacity) * 100) : 0;
      const brokenRate = row.raw > 0 ? (row.broken / row.raw) * 100 : 0;
      return { ...row, lot, capacity, valid, excess, rate, brokenRate };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.lot_id).localeCompare(String(b.lot_id)));
}

function sumDailyRows(rows = []) {
  const total = rows.reduce((acc, row) => {
    acc.raw += row.raw;
    acc.valid += row.valid;
    acc.excess += row.excess;
    acc.broken += row.broken;
    acc.sellable += row.sellable;
    acc.trays += row.trays;
    acc.capacity += row.capacity;
    return acc;
  }, { raw: 0, valid: 0, excess: 0, broken: 0, sellable: 0, trays: 0, capacity: 0 });
  total.rate = total.capacity > 0 ? Math.min(100, (total.valid / total.capacity) * 100) : 0;
  total.brokenRate = total.raw > 0 ? (total.broken / total.raw) * 100 : 0;
  return total;
}

function getProductionStatus(rate, excess, brokenRate) {
  if (excess > 0) return { label: 'Saisie a verifier', tone: 'red', message: 'Des oeufs depassent le maximum biologique du jour.' };
  if (rate < 65) return { label: 'Ponte faible', tone: 'red', message: 'Verifier aliment, eau, lumiere, stress et sante.' };
  if (rate < 80) return { label: 'Ponte moyenne', tone: 'amber', message: 'Suivi recommande: comparer avec les 7 derniers jours.' };
  if (brokenRate > 5) return { label: 'Qualite a surveiller', tone: 'amber', message: 'Taux de casse eleve: verifier nids, calcium et manipulation.' };
  return { label: 'Bonne performance', tone: 'green', message: 'Ponte coherente et bien valorisable.' };
}

export default function Avicole({
  rows = [],
  alimentationLogs = [],
  productionLogs = [],
  loading = false,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateProduction,
  onUpdateProduction,
  onDeleteProduction,
  onRefreshProduction,
  onCreateOpportunity,
}) {
  const [activityType, setActivityType] = useState('Pondeuse');
  const [selected, setSelected] = useState(null);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [modal, setModal] = useState(null);
  const [productionModal, setProductionModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const allRows = safeArray(rows);
  const activityRows = useMemo(() => filterLotsByActivity(allRows, activityType), [allRows, activityType]);
  const pondeusesRows = useMemo(() => filterLotsByActivity(allRows, 'Pondeuse'), [allRows]);
  const chairRows = useMemo(() => filterLotsByActivity(allRows, 'Chair'), [allRows]);
  const lotById = useMemo(() => new Map(allRows.map((lot) => [lot.id, lot])), [allRows]);

  const metricsByLot = useMemo(() => {
    const map = new Map();
    allRows.forEach((lot) => map.set(lot.id, calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs })));
    return map;
  }, [allRows, alimentationLogs, productionLogs]);

  const metricsFor = (lot = {}) => metricsByLot.get(lot?.id) || calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });

  const enrichedProductionLogs = useMemo(
    () => enrichProductionEggLogs({ logs: safeArray(productionLogs), lots: allRows }),
    [productionLogs, allRows]
  );

  const activityProductionLogs = useMemo(() => {
    if (activityType !== 'Pondeuse') return [];
    const ids = new Set(pondeusesRows.map((lot) => lot.id));
    return enrichedProductionLogs.filter((log) => ids.has(log.lot_id));
  }, [activityType, pondeusesRows, enrichedProductionLogs]);

  const dailyProductionRows = useMemo(
    () => groupDailyProduction(activityProductionLogs, lotById, metricsFor),
    [activityProductionLogs, lotById, metricsByLot]
  );

  const productionSummary = useMemo(() => {
    const referenceDate = dailyProductionRows[0]?.date || todayIso();
    const latestRows = dailyProductionRows.filter((row) => row.date === referenceDate);
    const uniqueDates = [...new Set(dailyProductionRows.map((row) => row.date))].slice(0, 7);
    const last7Rows = dailyProductionRows.filter((row) => uniqueDates.includes(row.date));
    const latest = sumDailyRows(latestRows);
    const last7 = sumDailyRows(last7Rows);
    const total = sumDailyRows(dailyProductionRows);
    const status = getProductionStatus(latest.rate, latest.excess, latest.brokenRate);
    return { referenceDate, latest, last7, total, status, uniqueDates };
  }, [dailyProductionRows]);

  const summary = useMemo(() => {
    const totalTetes = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).currentCount), 0);
    const revenu = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).grossRevenue), 0);
    const feeding = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).feedingCost), 0);
    const mortality = activityRows.reduce((sum, lot) => sum + toNumber(lot.mortality), 0);
    const ready = activityRows.filter((lot) => {
      const readiness = calculateLotSaleReadiness(lot, metricsFor(lot));
      return readiness.recommended || lot.pret_vente_recommande || lot.status === 'pret_a_la_vente';
    }).length;
    const avgWeight = activityRows.length
      ? activityRows.reduce((sum, lot) => sum + toNumber(lot.weight_avg || lot.poids_moyen), 0) / activityRows.length
      : 0;
    const margin = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).estimatedMargin), 0);
    const mortalityRate = totalTetes + mortality > 0 ? (mortality / (totalTetes + mortality)) * 100 : 0;
    return { totalTetes, revenu, feeding, mortality, mortalityRate, ready, avgWeight, margin };
  }, [activityRows, metricsByLot]);

  const lotAlerts = useMemo(
    () => activityRows.flatMap((lot) => buildLotAlerts(lot, metricsFor(lot)).map((alert) => ({ ...alert, lot }))),
    [activityRows, metricsByLot]
  );

  const productionAlerts = useMemo(
    () => dailyProductionRows.filter((row) => row.excess > 0 || row.brokenRate > 5 || row.rate < 65),
    [dailyProductionRows]
  );

  const deriveLotFormValues = (form = {}, changedKey) => {
    const defaults = getLotDefaultCycle(form);
    const normalized = {
      ...form,
      duree_cycle_valeur: form.duree_cycle_valeur || defaults.value,
      duree_cycle_unite: form.duree_cycle_unite || defaults.unit,
    };
    const calculatedEndDate = calculateLotEndDate(normalized);
    const shouldDate = !normalized.date_fin_prevue || ['date_debut', 'type', 'duree_cycle_valeur', 'duree_cycle_unite'].includes(changedKey);
    const currentCount = computeCurrentFromForm(normalized);
    const tempLot = { ...normalized, date_fin_prevue: shouldDate ? calculatedEndDate : normalized.date_fin_prevue, current_count: currentCount };
    const metrics = calculateLotMetrics({ lot: tempLot, feedingLogs: alimentationLogs, productionLogs });
    const phase = suggestLotPhase(tempLot, metrics);
    const readiness = calculateLotSaleReadiness(tempLot, metrics);
    return {
      ...tempLot,
      current_count: String(currentCount),
      age_lot_view: readiness.ageDays === null ? 'Date debut a renseigner' : `${readiness.ageDays} jours`,
      date_fin_prevue_calculee_view: calculatedEndDate || 'Date debut a renseigner',
      phase_suggeree_view: phase.label,
      alimentation_calculee_view: money(metrics.feedingCost),
      alimentation_tete_view: money(metrics.costPerHead),
      marge_calculee_view: money(metrics.estimatedMargin),
      sale_readiness_score: String(readiness.score || 0),
      sale_readiness_status: readiness.status,
      pret_vente_recommande: readiness.recommended,
      raison_pret_vente: readiness.recommended ? readiness.reason : safeArray(readiness.missing).join(', '),
    };
  };

  const prepareLotPayload = (payload = {}) => {
    if (!payload.date_debut) throw new Error('Date debut du lot obligatoire.');
    const losses = toNumber(payload.mortality) + toNumber(payload.vols) + toNumber(payload.vendus) + toNumber(payload.reformes) + toNumber(payload.sorties);
    if (losses > toNumber(payload.initial_count)) throw new Error("Les sorties depassent l'effectif initial.");
    const currentCount = computeCurrentFromForm(payload);
    return {
      ...deriveLotFormValues({ ...payload, current_count: currentCount }),
      current_count: currentCount,
      effectif_vendable: currentCount,
      health_status: payload.health_status || 'sain',
      status: payload.status || (payload.type === 'Pondeuse' ? 'en_ponte' : 'en_croissance'),
    };
  };

  const deriveProductionValues = (form = {}) => {
    const lot = allRows.find((item) => item.id === form.lot_id) || {};
    const capacity = getCapacity(lot, metricsFor(lot));
    const produced = toNumber(form.oeufs_produits);
    const broken = toNumber(form.oeufs_casses);
    const valid = Math.min(produced, capacity);
    return {
      ...form,
      oeufs_vendables_view: fmtNumber(Math.max(0, produced - broken)),
      plateaux_view: fmtNumber(Math.floor(Math.max(0, produced - broken) / 30)),
      taux_ponte_view: capacity > 0 ? pct((valid / capacity) * 100) : '0.0%',
      oeufs_a_verifier_view: fmtNumber(Math.max(0, produced - capacity)),
    };
  };

  const prepareProductionPayload = (payload = {}) => {
    const lot = allRows.find((item) => item.id === payload.lot_id) || {};
    const capacity = getCapacity(lot, metricsFor(lot));
    const produced = toNumber(payload.oeufs_produits);
    const broken = toNumber(payload.oeufs_casses);
    if (broken > produced) throw new Error('Les oeufs casses ne peuvent pas depasser les oeufs produits.');
    const valid = Math.min(produced, capacity);
    return {
      ...payload,
      taux_ponte: capacity > 0 ? (valid / capacity) * 100 : 0,
      oeufs_a_verifier: Math.max(0, produced - capacity),
    };
  };

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate?.(prepareLotPayload(payload)); toast.success('Lot ajoute'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur creation lot'); }
    finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate?.(selected.id, prepareLotPayload(payload)); toast.success('Lot modifie'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur modification lot'); }
    finally { setSaving(false); }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); toast.success('Lot supprime'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression lot'); }
    finally { setSaving(false); }
  };

  const submitCreateProduction = async (payload) => {
    try { setSaving(true); await onCreateProduction?.(prepareProductionPayload(payload)); toast.success('Releve ajoute'); setProductionModal(null); }
    catch (error) { toast.error(error.message || 'Erreur production'); }
    finally { setSaving(false); }
  };

  const submitEditProduction = async (payload) => {
    if (!selectedProduction) return;
    try { setSaving(true); await onUpdateProduction?.(selectedProduction.id, prepareProductionPayload(payload)); toast.success('Releve modifie'); setProductionModal(null); }
    catch (error) { toast.error(error.message || 'Erreur modification'); }
    finally { setSaving(false); }
  };

  const submitDeleteProduction = async () => {
    if (!selectedProduction) return;
    try { setSaving(true); await onDeleteProduction?.(selectedProduction.id); toast.success('Releve supprime'); setProductionModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression'); }
    finally { setSaving(false); }
  };

  const refreshEverything = async () => {
    await Promise.allSettled([onRefresh?.(), onRefreshProduction?.()]);
    toast.success('Donnees avicoles actualisees');
  };

  const confirmReadyForSale = async (lot) => {
    try {
      const metrics = metricsFor(lot);
      const readiness = calculateLotSaleReadiness(lot, metrics);
      await onUpdate?.(lot.id, {
        ...lot,
        sale_readiness_score: readiness.score,
        sale_readiness_status: 'pret_confirme',
        pret_vente_recommande: true,
        pret_vente_confirme: true,
        date_pret_vente_confirme: todayIso(),
        raison_pret_vente: readiness.reason || 'Confirme manuellement',
        status: isChairLot(lot) ? 'pret_a_la_vente' : 'pret_a_vendre_reforme',
      });
      toast.success('Lot confirme pret a la vente');
    } catch (error) {
      toast.error(error.message || 'Confirmation impossible');
    }
  };

  const createSaleOpportunity = async (lot) => {
    try {
      const metrics = metricsFor(lot);
      const readiness = calculateLotSaleReadiness(lot, metrics);
      await onCreateOpportunity?.({
        id: makeId('OPP'),
        opportunity_type: isChairLot(lot) ? 'lot_chair' : 'pondeuse_reforme',
        source_type: 'lot_avicole',
        source_id: lot.id,
        title: `${lot.name || lot.id} - opportunite de vente`,
        description: readiness.reason || 'Lot recommande',
        quantity: metrics.currentCount,
        unit: 'tete',
        estimated_value: metrics.grossRevenue,
        estimated_margin: metrics.estimatedMargin,
        score: readiness.score,
        reason: readiness.reason,
        status: 'a_traiter',
      });
      toast.success('Opportunite creee');
    } catch (error) {
      toast.error(error.message || 'Creation opportunite impossible');
    }
  };

  const openWhatsApp = (lot) => {
    const metrics = metricsFor(lot);
    window.open(
      toWhatsappLink(DEFAULT_PHONE, `Rapport lot ${lot.name || lot.id}: ${fmtNumber(metrics.currentCount)} tetes, marge estimee ${money(metrics.estimatedMargin)}.`),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const buyerSheet = (lot) => {
    const metrics = metricsFor(lot);
    const html = `<html><body style="font-family:Arial;padding:24px;color:#2f2415"><h1>Fiche acheteur Horizon Farm</h1><h2>${lot.name || lot.id}</h2><p>Activite: ${isPondeuseLot(lot) ? 'Pondeuses' : 'Chair'}</p><p>Effectif disponible: ${fmtNumber(metrics.currentCount)}</p><p>Etat sanitaire: ${lot.health_status || 'sain'}</p></body></html>`;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const doExports = () => {
    const exportRows = activityRows.map((lot) => ({
      ...lot,
      current_count_calcule: metricsFor(lot).currentCount,
      marge_estimee_calculee: metricsFor(lot).estimatedMargin,
      activite: activityType,
    }));
    exportToCsv({ rows: exportRows, fileName: `lots-${activityType}.csv` });
    exportToExcel({ rows: exportRows, fileName: `lots-${activityType}.xlsx`, sheetName: activityType });
    exportToPdf({ rows: exportRows, title: `Lots ${activityType}`, fileName: `lots-${activityType}.pdf` });
  };

  const defaultLot = useMemo(
    () => getDefaultLotForActivity({ activityType, id: generateSequentialId('avicole', allRows, { type: activityType }), today: todayIso() }),
    [activityType, allRows]
  );
  const defaultProductionLotId = pondeusesRows[0]?.id || '';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestion Avicole"
        sub="Pondeuses et poulets de chair: pilotage separe par activite"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={refreshEverything}>Refresh</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter {activityType}</Btn>
            {activityType === 'Pondeuse' ? <Btn icon={Plus} variant="outline" small onClick={() => setProductionModal('create')}>Production oeufs</Btn> : null}
            <Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau lot {activityType}</Btn>
          </>
        }
      />

      <AvicoleActivityTabs activeType={activityType} onChange={setActivityType} pondeusesCount={pondeusesRows.length} chairCount={chairRows.length} />

      {activityType === 'Pondeuse' ? <PondeuseKpis summary={summary} productionSummary={productionSummary} /> : <ChairKpis summary={summary} />}
      {activityType === 'Pondeuse' ? <PondeusePilotage summary={summary} productionSummary={productionSummary} alerts={productionAlerts} /> : <ChairPilotage rows={activityRows} metricsFor={metricsFor} summary={summary} />}
      {activityType === 'Pondeuse' && productionAlerts.length ? <ProductionAlerts alerts={productionAlerts} /> : null}
      {lotAlerts.length ? <Alerts alerts={lotAlerts} activityType={activityType} /> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {activityRows.map((lot) => (
          <LotCard
            key={lot.id}
            lot={lot}
            metrics={metricsFor(lot)}
            onDetails={() => { setSelected(lot); setModal('details'); }}
            onEdit={() => { setSelected(lot); setModal('edit'); }}
            onWhatsapp={() => openWhatsApp(lot)}
            onConfirmReady={() => confirmReadyForSale(lot)}
            onCreateOpportunity={() => createSaleOpportunity(lot)}
            onBuyerSheet={() => buyerSheet(lot)}
            onDeleteClick={() => { setSelected(lot); setModal('delete'); }}
          />
        ))}
        {!activityRows.length ? <div className="lg:col-span-3 bg-white border border-dashed border-[#d6c3a0] rounded-2xl p-6 text-center text-[#8a7456]">{loading ? 'Chargement...' : `Aucun lot ${activityType}`}</div> : null}
      </div>

      <CalculationPanel rows={activityRows} metricsFor={metricsFor} activityType={activityType} />

      {activityType === 'Pondeuse' ? (
        <ProductionPanel
          rows={dailyProductionRows}
          productionSummary={productionSummary}
          onAdd={() => setProductionModal('create')}
          onDetails={(row) => { setSelectedProduction(activityProductionLogs.find((log) => row.logIds.includes(log.id)) || row); setProductionModal('details'); }}
          onEdit={(row) => { setSelectedProduction(activityProductionLogs.find((log) => row.logIds.includes(log.id)) || row); setProductionModal('edit'); }}
          onDelete={(row) => { setSelectedProduction(activityProductionLogs.find((log) => row.logIds.includes(log.id)) || row); setProductionModal('delete'); }}
        />
      ) : <ChairDecisionPanel rows={activityRows} metricsFor={metricsFor} />}

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, effectif_actuel_calcule: metricsFor(selected).currentCount, marge_estimee: money(metricsFor(selected).estimatedMargin), cout_alimentation: money(metricsFor(selected).feedingCost) } : selected} title="Details du lot" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.avicole} initialValues={deriveLotFormValues(defaultLot)} autoId={(values) => generateSequentialId('avicole', allRows, values)} deriveValues={deriveLotFormValues} loading={saving} title={`Ajouter un lot ${activityType}`} submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.avicole} initialValues={selected ? deriveLotFormValues(selected) : {}} deriveValues={deriveLotFormValues} loading={saving} title="Modifier lot" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />

      <DetailsModal open={productionModal === 'details'} onClose={() => setProductionModal(null)} data={selectedProduction || {}} title="Details production oeufs" />
      <CreateModal open={productionModal === 'create'} onClose={() => setProductionModal(null)} onSubmit={submitCreateProduction} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={deriveProductionValues({ id: generateSequentialId('production_oeufs_logs', productionLogs), lot_id: defaultProductionLotId, date: todayIso(), oeufs_produits: 0, oeufs_casses: 0, notes: '' })} deriveValues={deriveProductionValues} loading={saving} title="Ajouter releve production oeufs" submitLabel="Ajouter" />
      <EditModal open={productionModal === 'edit'} onClose={() => setProductionModal(null)} onSubmit={submitEditProduction} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={selectedProduction ? deriveProductionValues(selectedProduction) : {}} deriveValues={deriveProductionValues} loading={saving} title="Modifier production oeufs" submitLabel="Enregistrer" />
      <DeleteModal open={productionModal === 'delete'} onClose={() => setProductionModal(null)} onConfirm={submitDeleteProduction} itemLabel={selectedProduction ? `${selectedProduction.date} - ${selectedProduction.lot_name || selectedProduction.lot_id}` : ''} loading={saving} />
    </div>
  );
}

function PondeuseKpis({ summary, productionSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard icon={Bird} label="Pondeuses" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" />
      <KpiCard icon={Activity} label="Oeufs valides jour" value={fmtNumber(productionSummary.latest.valid)} sub={productionSummary.referenceDate} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={TrendingUp} label="Taux ponte jour" value={pct(productionSummary.latest.rate)} sub="Jamais > 100%" color="bg-sky-500/20 text-sky-400" />
      <KpiCard icon={Activity} label="Moyenne 7 jours" value={pct(productionSummary.last7.rate)} sub={`${fmtNumber(productionSummary.last7.raw)} oeufs saisis`} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={AlertTriangle} label="A verifier" value={fmtNumber(productionSummary.total.excess)} sub="Oeufs > effectif" color="bg-red-500/20 text-red-400" />
    </div>
  );
}

function ChairKpis({ summary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard icon={Bird} label="Chair actifs" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" />
      <KpiCard icon={TrendingUp} label="CA potentiel" value={money(summary.revenu)} color="bg-sky-500/20 text-sky-400" />
      <KpiCard icon={Activity} label="Marge prevue" value={money(summary.margin)} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={AlertTriangle} label="Mortalite" value={pct(summary.mortalityRate)} sub={`${fmtNumber(summary.mortality)} pertes`} color="bg-red-500/20 text-red-400" />
      <KpiCard icon={Bird} label="Prets vente" value={fmtNumber(summary.ready)} color="bg-amber-500/20 text-amber-400" />
    </div>
  );
}

function PondeusePilotage({ productionSummary, alerts }) {
  const recommendations = [];
  if (productionSummary.total.excess > 0) recommendations.push('Verifier les releves ou saisir le nombre de jours couverts si ce n est pas une production journaliere.');
  if (productionSummary.latest.rate < 65) recommendations.push('Ponte faible: controler aliment, eau, lumiere, stress, parasites et maladie.');
  if (productionSummary.total.brokenRate > 5) recommendations.push('Casse elevee: verifier nids, calcium, ramassage et manipulation.');
  if (!productionSummary.total.raw) recommendations.push('Ajouter un releve quotidien pour commencer le suivi reel de ponte.');
  if (!recommendations.length) recommendations.push('Ponte coherente: continuer le suivi journalier et surveiller la tendance 7 jours.');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wide text-[#8a7456]">Diagnostic ponte</p>
        <p className="text-xl font-black text-[#2f2415] mt-1">{productionSummary.status.label}</p>
        <p className="text-sm text-[#7d6a4a] mt-2">{productionSummary.status.message}</p>
      </div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wide text-[#8a7456]">Qualite production</p>
        <p className="text-xl font-black text-[#2f2415] mt-1">{pct(productionSummary.total.brokenRate)}</p>
        <p className="text-sm text-[#7d6a4a] mt-2">Taux de casse cumule. Objectif conseille: rester sous 5%.</p>
      </div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wide text-[#8a7456]">Actions recommandees</p>
        <ul className="mt-2 space-y-1 text-sm text-[#7d6a4a]">
          {recommendations.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
        </ul>
        {alerts.length ? <p className="text-xs text-red-600 mt-3">{alerts.length} point(s) a traiter dans le journal.</p> : null}
      </div>
    </div>
  );
}

function ChairPilotage({ rows, metricsFor, summary }) {
  const readyLots = rows.filter((lot) => calculateLotSaleReadiness(lot, metricsFor(lot)).recommended || lot.pret_vente_recommande || lot.status === 'pret_a_la_vente');
  const marginPerHead = summary.totalTetes > 0 ? summary.margin / summary.totalTetes : 0;
  const action = readyLots.length ? `${readyLots.length} lot(s) a transformer en opportunite de vente.` : 'Aucun lot pret: continuer croissance, alimentation et suivi mortalite.';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Decision vente</p><p className="text-xl font-black text-[#2f2415] mt-1">{readyLots.length} pret(s)</p><p className="text-sm text-[#7d6a4a] mt-2">{action}</p></div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Marge par tete</p><p className="text-xl font-black text-[#2f2415] mt-1">{money(marginPerHead)}</p><p className="text-sm text-[#7d6a4a] mt-2">Indicateur simple pour ne pas vendre sous le prix plancher.</p></div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Mortalite</p><p className="text-xl font-black text-[#2f2415] mt-1">{pct(summary.mortalityRate)}</p><p className="text-sm text-[#7d6a4a] mt-2">A surveiller si le taux depasse 3 a 5% selon age et contexte.</p></div>
    </div>
  );
}

function ProductionAlerts({ alerts }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
      <p className="text-red-600 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Releves de ponte a surveiller</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.slice(0, 6).map((row) => (
          <div key={row.id} className="bg-[#fffdf8] border border-red-200 rounded-xl px-3 py-2 text-sm text-[#7d6a4a]">
            <span className="font-semibold text-[#2f2415]">{row.lot?.name || row.lot_id}</span> — {row.excess > 0 ? `${fmtNumber(row.excess)} oeufs au-dessus de l'effectif disponible` : row.rate < 65 ? `ponte faible ${pct(row.rate)}` : `casse elevee ${pct(row.brokenRate)}`} le {row.date}.
          </div>
        ))}
      </div>
    </div>
  );
}

function Alerts({ alerts, activityType }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
      <p className="text-amber-600 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes {activityType}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.slice(0, 6).map((alert, index) => (
          <div key={`${alert.lot.id}-${index}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#7d6a4a]"><span className="font-semibold text-[#2f2415]">{alert.lot.name || alert.lot.id}</span> - {alert.message}</div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-bold text-[#2f2415]">{value}</p></div>;
}

function LotCard({ lot, metrics, onDetails, onEdit, onWhatsapp, onConfirmReady, onCreateOpportunity, onBuyerSheet, onDeleteClick }) {
  const readiness = calculateLotSaleReadiness(lot, metrics);
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#8a7456]">{lot.type}</p><h3 className="text-lg font-black text-[#2f2415]">{lot.name || lot.id}</h3><p className="text-xs text-[#8a7456]">{lot.id}</p></div><Badge status={lot.status || lot.phase || 'actif'} /></div>
      <div className="grid grid-cols-2 gap-3 text-sm"><Metric label="Effectif" value={fmtNumber(metrics.currentCount)} /><Metric label="Survie" value={pct(metrics.survivalRate)} /><Metric label="Alim/tete" value={money(metrics.costPerHead)} /><Metric label="Marge" value={money(metrics.estimatedMargin)} /></div>
      <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">Opportunite</p><p className="text-sm font-semibold text-[#2f2415]">{readiness.recommended ? 'Pret / recommande' : readiness.status || 'A suivre'}</p><p className="text-xs text-[#8a7456] mt-1">{readiness.reason || safeArray(readiness.missing).join(', ') || 'RAS'}</p></div>
      <div className="flex flex-wrap gap-1"><ActionIconButton icon={Eye} title="Details" color="sky" onClick={onDetails} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={onEdit} /><ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={onWhatsapp} /><ActionIconButton icon={TrendingUp} title="Confirmer pret" color="emerald" onClick={onConfirmReady} /><ActionIconButton icon={Plus} title="Opportunite" color="sky" onClick={onCreateOpportunity} /><ActionIconButton icon={Download} title="Fiche acheteur" color="amber" onClick={onBuyerSheet} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={onDeleteClick} /></div>
    </div>
  );
}

function CalculationPanel({ rows, metricsFor, activityType }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
      <p className="font-semibold text-[#2f2415] mb-4">Calculs automatiques {activityType}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map((lot) => { const metrics = metricsFor(lot); return <div key={`calc-${lot.id}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">{lot.name || lot.id}</p><p className="text-sm font-bold text-[#2f2415] mt-1">Effectif {fmtNumber(metrics.currentCount)} - Survie {pct(metrics.survivalRate)}</p><p className="text-xs text-[#7d6a4a]">Alim/tete {money(metrics.costPerHead)} - Marge/tete {money(metrics.marginPerHead)}</p></div>; })}
      </div>
    </div>
  );
}

function ChairDecisionPanel({ rows, metricsFor }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
      <p className="font-semibold text-[#2f2415] mb-4">Decision vente - lots de chair</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((lot) => { const metrics = metricsFor(lot); const readiness = calculateLotSaleReadiness(lot, metrics); return <div key={`decision-${lot.id}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="font-semibold text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456]">Score vente: {readiness.score || 0}%</p><p className="text-xs text-[#8a7456]">Effectif vendable: {fmtNumber(metrics.currentCount)}</p><p className="text-xs text-[#8a7456]">Marge estimee: {money(metrics.estimatedMargin)}</p></div>; })}
      </div>
    </div>
  );
}

function ProductionPanel({ rows, productionSummary, onAdd, onDetails, onEdit, onDelete }) {
  const recap = [
    ['Jour courant', fmtNumber(productionSummary.latest.valid), productionSummary.referenceDate],
    ['Taux jour', pct(productionSummary.latest.rate), 'Base effectif disponible'],
    ['Moyenne 7j', pct(productionSummary.last7.rate), `${productionSummary.uniqueDates.length} jour(s)`],
    ['Total oeufs', fmtNumber(productionSummary.total.raw), 'Depuis le debut'],
    ['Vendables', fmtNumber(productionSummary.total.sellable), 'Cumul'],
    ['A verifier', fmtNumber(productionSummary.total.excess), 'Oeufs > effectif'],
  ];
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4"><div><p className="font-semibold text-[#2f2415]">Journal production oeufs</p><p className="text-xs text-[#8a7456]">Calcul journalier par lot: 1 pondeuse = 1 oeuf maximum par jour.</p></div><Btn icon={Plus} small onClick={onAdd}>Ajouter releve</Btn></div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">{recap.map(([label, value, sub]) => <div key={label} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] mt-1">{value}</p><p className="text-[11px] text-[#8a7456] mt-1">{sub}</p></div>)}</div>
      <div className="overflow-x-auto border border-[#d6c3a0] rounded-xl"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] border-b border-[#d6c3a0]">{['Date', 'Lot', 'Effectif', 'Oeufs saisis', 'Valides', 'A verifier', 'Casses', 'Vendables', 'Taux', 'Actions'].map((head) => <th key={head} className="text-left text-xs font-semibold text-[#8a7456] uppercase tracking-wide px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={`border-b border-[#d6c3a0]/60 hover:bg-[#fffdf8] ${row.excess > 0 ? 'bg-red-50/60' : ''}`}><td className="px-3 py-3 text-[#2f2415]">{row.date}</td><td className="px-3 py-3 text-[#2f2415] font-semibold">{row.lot?.name || row.lot_name || row.lot_id}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.capacity)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.raw)}</td><td className="px-3 py-3 text-emerald-600 font-semibold">{fmtNumber(row.valid)}</td><td className="px-3 py-3 text-red-600 font-semibold">{fmtNumber(row.excess)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.broken)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.sellable)}</td><td className="px-3 py-3 text-[#2f2415]">{pct(row.rate)}</td><td className="px-3 py-3"><div className="flex gap-1"><ActionIconButton icon={Eye} title="Details" color="sky" onClick={() => onDetails(row)} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => onEdit(row)} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => onDelete(row)} /></div></td></tr>)}{!rows.length ? <tr><td colSpan={10} className="px-3 py-8 text-center text-[#8a7456]">Aucun releve production oeufs.</td></tr> : null}</tbody></table></div>
    </div>
  );
}
