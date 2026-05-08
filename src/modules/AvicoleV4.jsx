import { Activity, AlertTriangle, Bird, Download, Edit, Eye, MessageCircle, Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import AvicoleActivityTabs from '../components/AvicoleActivityTabs';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import DetailsModal from '../modals/DetailsModal';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
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
const selectText = (value, fallback = '-') => (value === undefined || value === null || value === '' ? fallback : value);
const money = (value) => fmtCurrency(Number(value || 0));
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenCount = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const sellableEggs = (log = {}) => Math.max(0, eggCount(log) - brokenCount(log));
const trayCount = (log = {}) => toNumber(log.plateaux) || Math.floor(sellableEggs(log) / 30);

const computeCurrentFromForm = (form = {}) => Math.max(
  0,
  toNumber(form.initial_count) -
  toNumber(form.mortality) -
  toNumber(form.vols) -
  toNumber(form.vendus) -
  toNumber(form.reformes) -
  toNumber(form.sorties)
);

const enrichLotForDetails = (lot = {}, metrics = {}) => ({
  ...lot,
  effectif_actuel_calcule: metrics.currentCount ?? calculateLotCurrentCount(lot),
  taux_survie: `${Number(metrics.survivalRate || 0).toFixed(1)}%`,
  score_sante: `${Number(metrics.scoreSante || 0).toFixed(0)}%`,
  cout_alimentation: money(metrics.feedingCost),
  cout_alimentation_par_tete: money(metrics.costPerHead),
  cout_alimentation_tete_jour: metrics.costPerHeadPerDay ? `${money(metrics.costPerHeadPerDay)} / jour` : 'Non calculable',
  revenu_potentiel: money(metrics.grossRevenue),
  marge_estimee: money(metrics.estimatedMargin),
  marge_par_tete: money(metrics.marginPerHead),
});

const buyerSheet = (lot = {}, metrics = {}) => {
  const html = `
    <html><head><title>Fiche acheteur ${lot.id}</title></head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#2f2415">
      <h1>Horizon Farm - Fiche acheteur</h1>
      <h2>${lot.name || lot.id || 'Lot avicole'}</h2>
      <p><strong>Activite:</strong> ${isPondeuseLot(lot) ? 'Pondeuses' : 'Poulets de chair'}</p>
      <p><strong>Effectif disponible:</strong> ${fmtNumber(metrics.currentCount || 0)}</p>
      <p><strong>Poids moyen:</strong> ${lot.weight_avg || lot.poids_moyen || 0} kg</p>
      <p><strong>Etat sanitaire:</strong> ${lot.health_status || 'sain'}</p>
      <p><strong>Date debut:</strong> ${lot.date_debut || 'Non renseignee'}</p>
      <p><strong>Date vente prevue:</strong> ${lot.date_fin_prevue || calculateLotEndDate(lot) || 'Non renseignee'}</p>
      <p style="margin-top:24px">Fiche commerciale sans couts internes.</p>
    </body></html>`;
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
};

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

  const metricsByLot = useMemo(() => {
    const map = new Map();
    allRows.forEach((lot) => map.set(lot.id, calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs })));
    return map;
  }, [allRows, alimentationLogs, productionLogs]);

  const metricsFor = useCallback(
    (lot = {}) => metricsByLot.get(lot?.id) || calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }),
    [metricsByLot, alimentationLogs, productionLogs]
  );

  const enrichedProductionLogs = useMemo(
    () => enrichProductionEggLogs({ logs: safeArray(productionLogs), lots: allRows }),
    [productionLogs, allRows]
  );

  const activityProductionLogs = useMemo(() => {
    if (activityType !== 'Pondeuse') return [];
    const pondeuseIds = new Set(pondeusesRows.map((lot) => lot.id));
    return enrichedProductionLogs.filter((log) => pondeuseIds.has(log.lot_id));
  }, [activityType, pondeusesRows, enrichedProductionLogs]);

  const productionChartData = useMemo(() => {
    const grouped = activityProductionLogs.reduce((acc, log) => {
      const key = log.date || 'Sans date';
      acc[key] = acc[key] || { date: key, oeufs: 0, casses: 0, plateaux: 0 };
      acc[key].oeufs += eggCount(log);
      acc[key].casses += brokenCount(log);
      acc[key].plateaux += trayCount(log);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-7);
  }, [activityProductionLogs]);

  const summary = useMemo(() => {
    const totalTetes = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).currentCount), 0);
    const revenu = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).grossRevenue), 0);
    const feeding = activityRows.reduce((sum, lot) => sum + toNumber(metricsFor(lot).feedingCost), 0);
    const mortality = activityRows.reduce((sum, lot) => sum + toNumber(lot.mortality), 0);
    const sick = activityRows.reduce((sum, lot) => sum + toNumber(lot.malades), 0);
    const ready = activityRows.filter((lot) => {
      const readiness = calculateLotSaleReadiness(lot, metricsFor(lot));
      return readiness.recommended || lot.pret_vente_recommande || lot.status === 'pret_a_la_vente';
    }).length;
    const avgWeight = activityRows.length
      ? activityRows.reduce((sum, lot) => sum + toNumber(lot.weight_avg || lot.poids_moyen), 0) / activityRows.length
      : 0;
    const productionDates = activityProductionLogs.map((log) => log.date).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
    const referenceDate = productionDates[productionDates.length - 1] || todayIso();
    const referenceLogs = activityProductionLogs.filter((log) => log.date === referenceDate);
    const eggsLastEntry = referenceLogs.reduce((sum, log) => sum + eggCount(log), 0);
    const brokenLastEntry = referenceLogs.reduce((sum, log) => sum + brokenCount(log), 0);
    const traysLastEntry = referenceLogs.reduce((sum, log) => sum + trayCount(log), 0);
    const totalEggs = activityProductionLogs.reduce((sum, log) => sum + eggCount(log), 0);
    const totalBrokenEggs = activityProductionLogs.reduce((sum, log) => sum + brokenCount(log), 0);
    const totalSellableEggs = activityProductionLogs.reduce((sum, log) => sum + sellableEggs(log), 0);
    const totalTrays = activityProductionLogs.reduce((sum, log) => sum + trayCount(log), 0);
    const layingRate = totalTetes > 0 && activityType === 'Pondeuse' ? (eggsLastEntry / totalTetes) * 100 : 0;
    return {
      totalTetes,
      revenu,
      feeding,
      mortality,
      sick,
      ready,
      avgWeight,
      referenceDate,
      eggsToday: eggsLastEntry,
      eggsLastEntry,
      brokenEggs: brokenLastEntry,
      trays: traysLastEntry,
      totalEggs,
      totalBrokenEggs,
      totalSellableEggs,
      totalTrays,
      layingRate,
    };
  }, [activityRows, activityType, activityProductionLogs, metricsFor]);

  const lotsAlerts = useMemo(
    () => activityRows.flatMap((lot) => buildLotAlerts(lot, metricsFor(lot)).map((alert) => ({ ...alert, lot }))),
    [activityRows, metricsFor]
  );

  const deriveLotFormValues = useCallback((form = {}, changedKey) => {
    const defaults = getLotDefaultCycle(form);
    const normalizedForm = {
      ...form,
      duree_cycle_valeur: form.duree_cycle_valeur || defaults.value,
      duree_cycle_unite: form.duree_cycle_unite || defaults.unit,
    };
    const calculatedEndDate = calculateLotEndDate(normalizedForm);
    const shouldRecomputeEndDate = !normalizedForm.date_fin_prevue || ['date_debut', 'type', 'duree_cycle_valeur', 'duree_cycle_unite'].includes(changedKey);
    const currentCount = computeCurrentFromForm(normalizedForm);
    const tempLot = {
      ...normalizedForm,
      date_fin_prevue: shouldRecomputeEndDate ? calculatedEndDate : normalizedForm.date_fin_prevue,
      current_count: currentCount,
    };
    const metrics = calculateLotMetrics({ lot: tempLot, feedingLogs: alimentationLogs, productionLogs });
    const phaseSuggestion = suggestLotPhase(tempLot, metrics);
    const readiness = calculateLotSaleReadiness(tempLot, metrics);
    return {
      ...tempLot,
      current_count: String(currentCount),
      age_lot_view: readiness.ageDays === null ? 'Date debut a renseigner' : `${readiness.ageDays} jours`,
      date_fin_prevue_calculee_view: calculatedEndDate || 'Date debut a renseigner',
      phase_suggeree_view: phaseSuggestion.label,
      alimentation_calculee_view: money(metrics.feedingCost),
      alimentation_tete_view: money(metrics.costPerHead),
      alimentation_tete_jour_view: metrics.costPerHeadPerDay ? `${money(metrics.costPerHeadPerDay)} / jour` : 'Non calculable',
      marge_calculee_view: money(metrics.estimatedMargin),
      sale_readiness_score: String(readiness.score || 0),
      sale_readiness_status: readiness.status,
      pret_vente_recommande: readiness.recommended,
      raison_pret_vente: readiness.recommended ? readiness.reason : safeArray(readiness.missing).join(', '),
    };
  }, [alimentationLogs, productionLogs]);

  const lotInitialValues = (lot = {}) => deriveLotFormValues(lot);

  const prepareLotPayload = (payload = {}) => {
    if (!payload.date_debut) throw new Error('Date debut du lot obligatoire pour calculer age, phase et vente prevue.');
    const currentCount = computeCurrentFromForm(payload);
    const losses = toNumber(payload.mortality) + toNumber(payload.vols) + toNumber(payload.vendus) + toNumber(payload.reformes) + toNumber(payload.sorties);
    if (losses > toNumber(payload.initial_count)) throw new Error("Les sorties depassent l'effectif initial.");
    const derived = deriveLotFormValues({ ...payload, current_count: currentCount });
    return {
      ...derived,
      current_count: currentCount,
      effectif_vendable: currentCount,
      health_status: payload.health_status || 'sain',
      status: payload.status || (payload.type === 'Pondeuse' ? 'en_ponte' : 'en_croissance'),
    };
  };

  const deriveProductionValues = useCallback((form = {}) => {
    const lot = allRows.find((item) => item.id === form.lot_id) || {};
    const currentCount = calculateLotCurrentCount(lot) || toNumber(lot.current_count);
    const produced = toNumber(form.oeufs_produits);
    const broken = toNumber(form.oeufs_casses);
    const sellable = Math.max(0, produced - broken);
    const trays = Math.floor(sellable / 30);
    const layingRate = currentCount > 0 ? (produced / currentCount) * 100 : 0;
    return {
      ...form,
      oeufs_vendables_view: fmtNumber(sellable),
      plateaux_view: fmtNumber(trays),
      taux_ponte_view: `${layingRate.toFixed(1)}%`,
    };
  }, [allRows]);

  const prepareProductionPayload = (payload = {}) => {
    const lot = allRows.find((item) => item.id === payload.lot_id);
    const currentCount = lot ? calculateLotCurrentCount(lot) || toNumber(lot.current_count) : 0;
    const produced = toNumber(payload.oeufs_produits);
    const broken = toNumber(payload.oeufs_casses);
    if (broken > produced) throw new Error('Les oeufs casses ne peuvent pas depasser les oeufs produits.');
    return { ...payload, taux_ponte: currentCount > 0 ? (produced / currentCount) * 100 : 0 };
  };

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate?.(prepareLotPayload(payload));
      toast.success('Lot ajoute');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur creation lot');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate?.(selected.id, prepareLotPayload(payload));
      toast.success('Lot modifie');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification lot');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete?.(selected.id);
      toast.success('Lot supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression lot');
    } finally {
      setSaving(false);
    }
  };

  const submitCreateProduction = async (payload) => {
    try {
      setSaving(true);
      await onCreateProduction?.(prepareProductionPayload(payload));
      toast.success('Releve ajoute');
      setProductionModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur production');
    } finally {
      setSaving(false);
    }
  };

  const submitEditProduction = async (payload) => {
    if (!selectedProduction) return;
    try {
      setSaving(true);
      await onUpdateProduction?.(selectedProduction.id, prepareProductionPayload(payload));
      toast.success('Releve modifie');
      setProductionModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification');
    } finally {
      setSaving(false);
    }
  };

  const submitDeleteProduction = async () => {
    if (!selectedProduction) return;
    try {
      setSaving(true);
      await onDeleteProduction?.(selectedProduction.id);
      toast.success('Releve supprime');
      setProductionModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression');
    } finally {
      setSaving(false);
    }
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
        description: readiness.reason || 'Lot recommande pour verification commerciale',
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

  const doExports = () => {
    const exportRows = activityRows.map((lot) => {
      const metrics = metricsFor(lot);
      return {
        ...lot,
        current_count_calcule: metrics.currentCount,
        taux_survie_auto: Number(metrics.survivalRate || 0).toFixed(1),
        cout_alimentation_calcule: metrics.feedingCost,
        marge_estimee_calculee: metrics.estimatedMargin,
      };
    });
    exportToCsv({ rows: exportRows, fileName: `lots-${activityType}.csv` });
    exportToExcel({ rows: exportRows, fileName: `lots-${activityType}.xlsx`, sheetName: activityType });
    exportToPdf({ rows: exportRows, title: `Lots ${activityType}`, fileName: `lots-${activityType}.pdf` });
    toast.success(`Exports ${activityType} generes`);
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

      {activityType === 'Pondeuse' ? <PondeuseKpis summary={summary} /> : <ChairKpis summary={summary} />}

      {lotsAlerts.length ? <Alerts alerts={lotsAlerts} activityType={activityType} /> : null}

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
            onBuyerSheet={() => buyerSheet(lot, metricsFor(lot))}
            onDeleteClick={() => { setSelected(lot); setModal('delete'); }}
          />
        ))}
        {!activityRows.length ? <EmptyState activityType={activityType} loading={loading} /> : null}
      </div>

      <CalculationPanel rows={activityRows} metricsFor={metricsFor} activityType={activityType} />

      {activityType === 'Pondeuse' ? (
        <ProductionPanel
          logs={activityProductionLogs}
          chartData={productionChartData}
          summary={summary}
          onAdd={() => setProductionModal('create')}
          onDetails={(log) => { setSelectedProduction(log); setProductionModal('details'); }}
          onEdit={(log) => { setSelectedProduction(log); setProductionModal('edit'); }}
          onDelete={(log) => { setSelectedProduction(log); setProductionModal('delete'); }}
        />
      ) : (
        <ChairDecisionPanel rows={activityRows} metricsFor={metricsFor} />
      )}

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? enrichLotForDetails(selected, metricsFor(selected)) : selected} title="Details du lot" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.avicole} initialValues={deriveLotFormValues(defaultLot)} autoId={(values) => generateSequentialId('avicole', allRows, values)} deriveValues={deriveLotFormValues} loading={saving} title={`Ajouter un lot ${activityType}`} submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.avicole} initialValues={selected ? lotInitialValues(selected) : {}} deriveValues={deriveLotFormValues} loading={saving} title="Modifier lot" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />

      <DetailsModal open={productionModal === 'details'} onClose={() => setProductionModal(null)} data={selectedProduction || {}} title="Details production oeufs" />
      <CreateModal open={productionModal === 'create'} onClose={() => setProductionModal(null)} onSubmit={submitCreateProduction} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={deriveProductionValues({ id: generateSequentialId('production_oeufs_logs', productionLogs), lot_id: defaultProductionLotId, date: todayIso(), oeufs_produits: 0, oeufs_casses: 0, notes: '' })} deriveValues={deriveProductionValues} loading={saving} title="Ajouter releve production oeufs" submitLabel="Ajouter" />
      <EditModal open={productionModal === 'edit'} onClose={() => setProductionModal(null)} onSubmit={submitEditProduction} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={selectedProduction ? deriveProductionValues(selectedProduction) : {}} deriveValues={deriveProductionValues} loading={saving} title="Modifier production oeufs" submitLabel="Enregistrer" />
      <DeleteModal open={productionModal === 'delete'} onClose={() => setProductionModal(null)} onConfirm={submitDeleteProduction} itemLabel={selectedProduction ? `${selectedProduction.date} - ${selectedProduction.lot_name || selectedProduction.lot_id}` : ''} loading={saving} />
    </div>
  );
}

function PondeuseKpis({ summary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard icon={Bird} label="Pondeuses" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" />
      <KpiCard icon={Activity} label="Oeufs dernier releve" value={fmtNumber(summary.eggsLastEntry)} sub={summary.referenceDate} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={TrendingUp} label="Taux ponte releve" value={`${summary.layingRate.toFixed(1)}%`} color="bg-sky-500/20 text-sky-400" />
      <KpiCard icon={Activity} label="Total oeufs" value={fmtNumber(summary.totalEggs)} sub="Depuis le debut" color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={AlertTriangle} label="Casses cumulees" value={fmtNumber(summary.totalBrokenEggs)} color="bg-red-500/20 text-red-400" />
    </div>
  );
}

function ChairKpis({ summary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard icon={Bird} label="Chair actifs" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" />
      <KpiCard icon={TrendingUp} label="CA potentiel" value={money(summary.revenu)} color="bg-sky-500/20 text-sky-400" />
      <KpiCard icon={Activity} label="Poids moyen" value={`${summary.avgWeight.toFixed(2)} kg`} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={AlertTriangle} label="Mortalite" value={fmtNumber(summary.mortality)} color="bg-red-500/20 text-red-400" />
      <KpiCard icon={Bird} label="Prets vente" value={fmtNumber(summary.ready)} color="bg-amber-500/20 text-amber-400" />
    </div>
  );
}

function Alerts({ alerts, activityType }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
      <p className="text-amber-600 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes {activityType}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.slice(0, 6).map((alert, index) => (
          <div key={`${alert.lot.id}-${index}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#7d6a4a]">
            <span className="font-semibold text-[#2f2415]">{alert.lot.name || alert.lot.id}</span> - {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ activityType, loading }) {
  return <div className="lg:col-span-3 bg-white border border-dashed border-[#d6c3a0] rounded-2xl p-6 text-center text-[#8a7456]">{loading ? 'Chargement...' : `Aucun lot ${activityType}. Ajoute un lot pour activer les calculs.`}</div>;
}

function Metric({ label, value }) {
  return <div className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-bold text-[#2f2415]">{value}</p></div>;
}

function LotCard({ lot, metrics, onDetails, onEdit, onWhatsapp, onConfirmReady, onCreateOpportunity, onBuyerSheet, onDeleteClick }) {
  const readiness = calculateLotSaleReadiness(lot, metrics);
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#8a7456]">{lot.type}</p>
          <h3 className="text-lg font-black text-[#2f2415]">{lot.name || lot.id}</h3>
          <p className="text-xs text-[#8a7456]">{lot.id}</p>
        </div>
        <Badge status={lot.status || lot.phase || 'actif'} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Effectif" value={fmtNumber(metrics.currentCount)} />
        <Metric label="Survie" value={`${Number(metrics.survivalRate || 0).toFixed(1)}%`} />
        <Metric label="Alim/tete" value={money(metrics.costPerHead)} />
        <Metric label="Marge" value={money(metrics.estimatedMargin)} />
      </div>
      <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
        <p className="text-xs text-[#8a7456]">Opportunite</p>
        <p className="text-sm font-semibold text-[#2f2415]">{readiness.recommended ? 'Pret / recommande' : readiness.status || 'A suivre'}</p>
        <p className="text-xs text-[#8a7456] mt-1">{readiness.reason || safeArray(readiness.missing).join(', ') || 'RAS'}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <ActionIconButton icon={Eye} title="Details" color="sky" onClick={onDetails} />
        <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={onEdit} />
        <ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={onWhatsapp} />
        <ActionIconButton icon={TrendingUp} title="Confirmer pret" color="emerald" onClick={onConfirmReady} />
        <ActionIconButton icon={Plus} title="Opportunite" color="sky" onClick={onCreateOpportunity} />
        <ActionIconButton icon={Download} title="Fiche acheteur" color="amber" onClick={onBuyerSheet} />
        <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={onDeleteClick} />
      </div>
    </div>
  );
}

function CalculationPanel({ rows, metricsFor, activityType }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
      <p className="font-semibold text-[#2f2415] mb-4">Calculs automatiques {activityType}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map((lot) => {
          const metrics = metricsFor(lot);
          return (
            <div key={`calc-${lot.id}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
              <p className="text-xs text-[#8a7456]">{lot.name || lot.id}</p>
              <p className="text-sm font-bold text-[#2f2415] mt-1">Effectif {fmtNumber(metrics.currentCount)} - Survie {Number(metrics.survivalRate || 0).toFixed(1)}%</p>
              <p className="text-xs text-[#7d6a4a]">Alim/tete {money(metrics.costPerHead)} - Marge/tete {money(metrics.marginPerHead)}</p>
            </div>
          );
        })}
        {!rows.length ? <div className="col-span-full text-sm text-[#8a7456] bg-[#fffdf8] border border-dashed border-[#d6c3a0] rounded-xl p-4">Aucun calcul disponible.</div> : null}
      </div>
    </div>
  );
}

function ChairDecisionPanel({ rows, metricsFor }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
      <p className="font-semibold text-[#2f2415] mb-4">Decision vente - lots de chair</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((lot) => {
          const metrics = metricsFor(lot);
          const readiness = calculateLotSaleReadiness(lot, metrics);
          return (
            <div key={`decision-${lot.id}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
              <p className="font-semibold text-[#2f2415]">{lot.name || lot.id}</p>
              <p className="text-xs text-[#8a7456]">Score vente: {readiness.score || 0}%</p>
              <p className="text-xs text-[#8a7456]">Effectif vendable: {fmtNumber(metrics.currentCount)}</p>
              <p className="text-xs text-[#8a7456]">Marge estimee: {money(metrics.estimatedMargin)}</p>
            </div>
          );
        })}
        {!rows.length ? <div className="text-sm text-[#8a7456]">Aucun lot de chair.</div> : null}
      </div>
    </div>
  );
}

function ProductionRecap({ summary }) {
  const items = [
    ['Dernier releve', `${fmtNumber(summary.eggsLastEntry)} oeufs`, summary.referenceDate],
    ['Taux ponte releve', `${summary.layingRate.toFixed(1)}%`, 'Base dernier releve / effectif'],
    ['Total oeufs', fmtNumber(summary.totalEggs), 'Depuis le debut'],
    ['Oeufs vendables', fmtNumber(summary.totalSellableEggs), 'Total cumule'],
    ['Oeufs casses', fmtNumber(summary.totalBrokenEggs), 'Total cumule'],
    ['Plateaux', fmtNumber(summary.totalTrays), '30 oeufs / plateau'],
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
      {items.map(([label, value, sub]) => (
        <div key={label} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
          <p className="text-xs text-[#8a7456]">{label}</p>
          <p className="font-black text-[#2f2415] mt-1">{value}</p>
          <p className="text-[11px] text-[#8a7456] mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}

function ProductionPanel({ logs, chartData, summary, onAdd, onDetails, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold text-[#2f2415]">Journal production oeufs</p>
            <p className="text-xs text-[#8a7456]">Suivi reserve aux pondeuses. Le recap ci-dessous est calcule depuis ce journal.</p>
          </div>
          <Btn icon={Plus} small onClick={onAdd}>Ajouter releve</Btn>
        </div>
        <ProductionRecap summary={summary} />
        <div className="overflow-x-auto border border-[#d6c3a0] rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fffdf8] border-b border-[#d6c3a0]">
                {['Date', 'Lot', 'Oeufs', 'Casses', 'Vendables', 'Plateaux', 'Taux ponte', 'Notes', 'Actions'].map((head) => <th key={head} className="text-left text-xs font-semibold text-[#8a7456] uppercase tracking-wide px-3 py-3">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#d6c3a0]/60 hover:bg-[#fffdf8]">
                  <td className="px-3 py-3 text-[#2f2415]">{log.date}</td>
                  <td className="px-3 py-3 text-[#2f2415] font-semibold">{log.lot_name || log.lot_id}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{fmtNumber(eggCount(log))}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{fmtNumber(brokenCount(log))}</td>
                  <td className="px-3 py-3 text-emerald-600 font-semibold">{fmtNumber(sellableEggs(log))}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{fmtNumber(trayCount(log))}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{toNumber(log.taux_ponte_calcule || log.taux_ponte).toFixed(1)}%</td>
                  <td className="px-3 py-3 text-[#7d6a4a]">{selectText(log.notes)}</td>
                  <td className="px-3 py-3"><div className="flex gap-1"><ActionIconButton icon={Eye} title="Details" color="sky" onClick={() => onDetails(log)} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => onEdit(log)} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => onDelete(log)} /></div></td>
                </tr>
              ))}
              {!logs.length ? <tr><td colSpan={9} className="px-3 py-8 text-center text-[#8a7456]">Aucun releve production oeufs.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4">Production oeufs - 7 derniers releves</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" />
            <XAxis dataKey="date" stroke="#8a7456" fontSize={12} />
            <YAxis stroke="#8a7456" fontSize={12} />
            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} />
            <Bar dataKey="oeufs" fill="#22c55e" radius={[6, 6, 0, 0]} name="Oeufs produits" />
            <Bar dataKey="casses" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Oeufs casses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
