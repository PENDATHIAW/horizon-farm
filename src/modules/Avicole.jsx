import { Activity, AlertTriangle, Bird, Download, Edit, Eye, MessageCircle, Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
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
  calculateLotAgeDays,
  calculateLotCurrentCount,
  calculateLotEndDate,
  calculateLotMetrics,
  calculateLotSaleReadiness,
  enrichProductionEggLogs,
  getLotDefaultCycle,
  suggestLotPhase,
} from '../utils/businessCalculations';

const todayIso = () => new Date().toISOString().slice(0, 10);
const isPondeuse = (lot = {}) => lot.type === 'Pondeuse' || String(lot.type || '').toLowerCase() === 'pondeuse';
const isChair = (lot = {}) => lot.type === 'Chair' || ['chair', 'poulet_chair'].includes(String(lot.type || '').toLowerCase());
const selectText = (value, fallback = '-') => (value === undefined || value === null || value === '' ? fallback : value);

const computeCurrentFromForm = (form = {}) => Math.max(
  0,
  toNumber(form.initial_count) -
    toNumber(form.mortality) -
    toNumber(form.vols) -
    toNumber(form.vendus) -
    toNumber(form.reformes) -
    toNumber(form.sorties)
);

export default function Avicole({
  rows = [],
  alimentationLogs = [],
  productionLogs = [],
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
  const [selected, setSelected] = useState(null);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [modal, setModal] = useState(null);
  const [productionModal, setProductionModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const metricsByLot = useMemo(() => {
    const map = new Map();
    rows.forEach((lot) => map.set(lot.id, calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs })));
    return map;
  }, [rows, alimentationLogs, productionLogs]);

  const metricsFor = useCallback(
    (lot) => metricsByLot.get(lot?.id) || calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }),
    [metricsByLot, alimentationLogs, productionLogs]
  );

  const enrichedProductionLogs = useMemo(
    () => enrichProductionEggLogs({ logs: productionLogs, lots: rows }),
    [productionLogs, rows]
  );

  const productionChartData = useMemo(() => {
    const grouped = enrichedProductionLogs.reduce((acc, log) => {
      const key = log.date || 'Sans date';
      acc[key] = acc[key] || { date: key, oeufs: 0, casses: 0, plateaux: 0 };
      acc[key].oeufs += toNumber(log.oeufs_produits);
      acc[key].casses += toNumber(log.oeufs_casses);
      acc[key].plateaux += toNumber(log.plateaux);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-7);
  }, [enrichedProductionLogs]);

  const totalTetes = useMemo(() => rows.reduce((sum, lot) => sum + metricsFor(lot).currentCount, 0), [rows, metricsFor]);
  const oeufsJour = useMemo(() => rows.filter(isPondeuse).reduce((sum, lot) => sum + metricsFor(lot).eggMetrics.todayEggs, 0), [rows, metricsFor]);
  const revenuTotal = useMemo(() => rows.reduce((sum, lot) => sum + metricsFor(lot).grossRevenue, 0), [rows, metricsFor]);
  const mortaliteTotale = useMemo(() => rows.reduce((sum, lot) => sum + Number(lot.mortality || 0), 0), [rows]);
  const scoreMoyen = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((sum, lot) => sum + metricsFor(lot).scoreSante, 0) / rows.length;
  }, [rows, metricsFor]);

  const feedPondeuses = useMemo(() => rows.filter(isPondeuse).reduce((sum, lot) => sum + metricsFor(lot).feedingCost, 0), [rows, metricsFor]);
  const feedChair = useMemo(() => rows.filter(isChair).reduce((sum, lot) => sum + metricsFor(lot).feedingCost, 0), [rows, metricsFor]);
  const lotsAlerts = useMemo(() => rows.flatMap((lot) => buildLotAlerts(lot, metricsFor(lot)).map((alert) => ({ ...alert, lot }))), [rows, metricsFor]);

  const refreshEverything = async () => {
    await Promise.allSettled([onRefresh?.(), onRefreshProduction?.()]);
    toast.success('Donnees avicoles actualisees');
  };

  const openWhatsApp = (lot) => {
    const metrics = metricsFor(lot);
    const message = `Rapport lot ${lot.name || lot.id}: ${fmtNumber(metrics.currentCount)} tetes, score sante ${metrics.scoreSante.toFixed(0)}%, marge estimee ${fmtCurrency(metrics.estimatedMargin)}.`;
    const url = toWhatsappLink(DEFAULT_PHONE, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const deriveLotFormValues = useCallback((form, changedKey) => {
    const defaults = getLotDefaultCycle(form);
    const normalizedForm = {
      ...form,
      duree_cycle_valeur: form.duree_cycle_valeur || defaults.value,
      duree_cycle_unite: form.duree_cycle_unite || defaults.unit,
    };
    const calculatedEndDate = calculateLotEndDate(normalizedForm);
    const shouldRecomputeEndDate =
      !normalizedForm.date_fin_prevue ||
      ['date_debut', 'type', 'duree_cycle_valeur', 'duree_cycle_unite'].includes(changedKey);
    const withExpectedDate = {
      ...normalizedForm,
      date_fin_prevue: shouldRecomputeEndDate ? calculatedEndDate : normalizedForm.date_fin_prevue,
    };
    const currentCount = computeCurrentFromForm(form);
    const tempLot = { ...withExpectedDate, current_count: currentCount };
    const metrics = calculateLotMetrics({ lot: tempLot, feedingLogs: alimentationLogs, productionLogs });
    const phaseSuggestion = suggestLotPhase(tempLot, metrics);
    const readiness = calculateLotSaleReadiness(tempLot, metrics);
    return {
      ...withExpectedDate,
      current_count: String(currentCount),
      age_lot_view: readiness.ageDays === null ? 'Date debut a renseigner' : `${readiness.ageDays} jours`,
      date_fin_prevue_calculee_view: calculatedEndDate || 'Date debut a renseigner',
      phase_suggeree_view: phaseSuggestion.label,
      alimentation_calculee_view: fmtCurrency(metrics.feedingCost),
      alimentation_tete_view: fmtCurrency(metrics.costPerHead),
      alimentation_tete_jour_view: metrics.costPerHeadPerDay ? `${fmtCurrency(metrics.costPerHeadPerDay)} / j` : 'Non calculable',
      marge_calculee_view: fmtCurrency(metrics.estimatedMargin),
      sale_readiness_score: String(readiness.score),
      sale_readiness_status: readiness.status,
      pret_vente_recommande: readiness.recommended,
      raison_pret_vente: readiness.recommended ? readiness.reason : readiness.missing.join(', '),
    };
  }, [alimentationLogs, productionLogs]);

  const lotInitialValues = (lot = {}) => {
    const metrics = metricsFor(lot);
    const readiness = calculateLotSaleReadiness(lot, metrics);
    const phaseSuggestion = suggestLotPhase(lot, metrics);
    const calculatedEndDate = calculateLotEndDate(lot);
    return {
      ...lot,
      current_count: metrics.currentCount,
      duree_cycle_valeur: lot.duree_cycle_valeur || getLotDefaultCycle(lot).value,
      duree_cycle_unite: lot.duree_cycle_unite || getLotDefaultCycle(lot).unit,
      age_lot_view: readiness.ageDays === null ? 'Date debut a renseigner' : `${readiness.ageDays} jours`,
      date_fin_prevue_calculee_view: calculatedEndDate || 'Date debut a renseigner',
      phase_suggeree_view: phaseSuggestion.label,
      alimentation_calculee_view: fmtCurrency(metrics.feedingCost),
      alimentation_tete_view: fmtCurrency(metrics.costPerHead),
      alimentation_tete_jour_view: metrics.costPerHeadPerDay ? `${fmtCurrency(metrics.costPerHeadPerDay)} / j` : 'Non calculable',
      marge_calculee_view: fmtCurrency(metrics.estimatedMargin),
      sale_readiness_score: readiness.score,
      sale_readiness_status: lot.sale_readiness_status || readiness.status,
      pret_vente_recommande: lot.pret_vente_recommande || readiness.recommended,
      raison_pret_vente: lot.raison_pret_vente || (readiness.recommended ? readiness.reason : readiness.missing.join(', ')),
    };
  };

  const prepareLotPayload = (payload) => {
    if (!payload.date_debut) {
      throw new Error('Date debut du lot obligatoire pour calculer age, phase et vente prevue.');
    }
    const currentCount = computeCurrentFromForm(payload);
    const losses = toNumber(payload.mortality) + toNumber(payload.vols) + toNumber(payload.vendus) + toNumber(payload.reformes) + toNumber(payload.sorties);
    if (losses > toNumber(payload.initial_count)) {
      throw new Error('Les morts + vols + vendus + reformes + sorties depassent l\'effectif initial.');
    }
    const defaults = getLotDefaultCycle(payload);
    const payloadWithCycle = {
      ...payload,
      duree_cycle_valeur: payload.duree_cycle_valeur || defaults.value,
      duree_cycle_unite: payload.duree_cycle_unite || defaults.unit,
    };
    const dateFinPrevue = payloadWithCycle.date_fin_prevue || calculateLotEndDate(payloadWithCycle);
    const tempLot = { ...payloadWithCycle, date_fin_prevue: dateFinPrevue, current_count: currentCount };
    const metrics = calculateLotMetrics({ lot: tempLot, feedingLogs: alimentationLogs, productionLogs });
    const readiness = calculateLotSaleReadiness(tempLot, metrics);
    return {
      ...payloadWithCycle,
      current_count: currentCount,
      date_fin_prevue: dateFinPrevue,
      effectif_vendable: currentCount,
      sale_readiness_score: readiness.score,
      sale_readiness_status: payload.pret_vente_confirme ? 'pret_confirme' : readiness.status,
      pret_vente_recommande: readiness.recommended,
      date_pret_vente_recommande: readiness.recommended ? todayIso() : payload.date_pret_vente_recommande || '',
      raison_pret_vente: payload.raison_pret_vente || (readiness.recommended ? readiness.reason : readiness.missing.join(', ')),
      health_status: payload.health_status || 'sain',
      status: payload.status || (payload.type === 'Pondeuse' ? 'en_ponte' : 'en_croissance'),
    };
  };

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate(prepareLotPayload(payload));
      toast.success('Lot ajoute avec effectif calcule');
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
      await onUpdate(selected.id, prepareLotPayload(payload));
      toast.success('Lot modifie avec effectif recalcule');
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
      await onDelete(selected.id);
      toast.success('Lot supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression lot');
    } finally {
      setSaving(false);
    }
  };

  const deriveProductionValues = useCallback((form) => {
    const lot = rows.find((item) => item.id === form.lot_id) || {};
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
  }, [rows]);

  const prepareProductionPayload = (payload) => {
    const lot = rows.find((item) => item.id === payload.lot_id);
    const currentCount = lot ? calculateLotCurrentCount(lot) || toNumber(lot.current_count) : 0;
    const produced = toNumber(payload.oeufs_produits);
    const broken = toNumber(payload.oeufs_casses);
    if (broken > produced) throw new Error('Les oeufs casses ne peuvent pas depasser les oeufs produits.');
    return {
      ...payload,
      taux_ponte: currentCount > 0 ? (produced / currentCount) * 100 : 0,
    };
  };

  const confirmReadyForSale = async (lot) => {
    try {
      const metrics = metricsFor(lot);
      const readiness = calculateLotSaleReadiness(lot, metrics);
      await onUpdate(lot.id, {
        sale_readiness_score: readiness.score,
        sale_readiness_status: 'pret_confirme',
        pret_vente_recommande: true,
        pret_vente_confirme: true,
        date_pret_vente_confirme: todayIso(),
        raison_pret_vente: readiness.reason || 'Confirme manuellement',
        status: isChair(lot) ? 'pret_a_la_vente' : 'pret_a_vendre_reforme',
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
        opportunity_type: isChair(lot) ? 'lot_chair' : 'pondeuse_reforme',
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
      toast.success('Opportunite de vente creee');
    } catch (error) {
      toast.error(error.message || 'Creation opportunite impossible');
    }
  };

  const generateBuyerSheet = (lot) => {
    const metrics = metricsFor(lot);
    const html = `
      <html><head><title>Fiche acheteur ${lot.id}</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#2f2415">
        <h1>Horizon Farm - Fiche acheteur</h1>
        <h2>${lot.name || lot.id}</h2>
        <p><strong>Type:</strong> ${isPondeuse(lot) ? 'Pondeuses reformees' : 'Poulets de chair'}</p>
        <p><strong>Effectif disponible:</strong> ${metrics.currentCount}</p>
        <p><strong>Poids moyen:</strong> ${lot.weight_avg || 0} kg</p>
        <p><strong>Etat sanitaire:</strong> ${lot.health_status || 'sain'}</p>
        <p><strong>Date debut lot:</strong> ${lot.date_debut || 'Non renseignee'}</p>
        <p><strong>Date vente prevue:</strong> ${lot.date_fin_prevue || calculateLotEndDate(lot) || 'Non renseignee'}</p>
        <p style="margin-top:24px">Contact Horizon Farm - fiche commerciale sans couts internes.</p>
      </body></html>`;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const submitCreateProduction = async (payload) => {
    try {
      setSaving(true);
      await onCreateProduction(prepareProductionPayload(payload));
      toast.success('Journal production oeufs ajoute');
      setProductionModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur production oeufs');
    } finally {
      setSaving(false);
    }
  };

  const submitEditProduction = async (payload) => {
    if (!selectedProduction) return;
    try {
      setSaving(true);
      await onUpdateProduction(selectedProduction.id, prepareProductionPayload(payload));
      toast.success('Journal production modifie');
      setProductionModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification production');
    } finally {
      setSaving(false);
    }
  };

  const submitDeleteProduction = async () => {
    if (!selectedProduction) return;
    try {
      setSaving(true);
      await onDeleteProduction(selectedProduction.id);
      toast.success('Journal production supprime');
      setProductionModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression production');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    const exportRows = rows.map((lot) => {
      const metrics = metricsFor(lot);
      return {
        ...lot,
        current_count_calcule: metrics.currentCount,
        score_sante_auto: metrics.scoreSante.toFixed(1),
        taux_survie_auto: metrics.survivalRate.toFixed(1),
        cout_alimentation_calcule: metrics.feedingCost,
        cout_alimentation_par_tete: metrics.costPerHead,
        marge_estimee_calculee: metrics.estimatedMargin,
      };
    });
    exportToCsv({ rows: exportRows, fileName: 'lots-avicoles.csv' });
    exportToExcel({ rows: exportRows, fileName: 'lots-avicoles.xlsx', sheetName: 'Lots' });
    exportToPdf({ rows: exportRows, title: 'Lots avicoles', fileName: 'lots-avicoles.pdf' });
    toast.success('Exports lots generes avec calculs automatiques');
  };

  const defaultProductionLotId = rows.find(isPondeuse)?.id || '';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestion Avicole"
        sub="Pondeuses - Poulets de chair - Effectifs calcules - Production journaliere separee"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={refreshEverything}>Refresh</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn>
            <Btn icon={Plus} variant="outline" small onClick={() => setProductionModal('create')}>Production oeufs</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau lot</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Bird} label="Total tetes calcule" value={fmtNumber(totalTetes)} color="bg-amber-500/20 text-amber-400" />
        <KpiCard icon={Activity} label="Oeufs du jour" value={fmtNumber(oeufsJour)} sub="Depuis production_oeufs_logs" color="bg-emerald-500/20 text-emerald-400" trend={5} />
        <KpiCard icon={TrendingUp} label="Revenu / potentiel" value={fmtCurrency(revenuTotal)} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={AlertTriangle} label="Alim. pondeuses" value={fmtCurrency(feedPondeuses)} sub={`Chair: ${fmtCurrency(feedChair)}`} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={Activity} label="Score sante moyen" value={`${scoreMoyen.toFixed(0)}%`} sub={`${mortaliteTotale} morts total`} color="bg-emerald-500/20 text-emerald-400" />
      </div>

      {lotsAlerts.length ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-amber-600 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes avicoles intelligentes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lotsAlerts.slice(0, 6).map((alert, index) => (
              <div key={`${alert.lot.id}-${index}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#7d6a4a]">
                <span className="font-semibold text-[#2f2415]">{alert.lot.name || alert.lot.id}</span> - {alert.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {rows.map((lot) => (
          <LotCard
            key={lot.id}
            lot={lot}
            metrics={metricsFor(lot)}
            onDetails={() => { setSelected(lot); setModal('details'); }}
            onEdit={() => { setSelected(lot); setModal('edit'); }}
            onWhatsapp={() => openWhatsApp(lot)}
            onConfirmReady={() => confirmReadyForSale(lot)}
            onCreateOpportunity={() => createSaleOpportunity(lot)}
            onBuyerSheet={() => generateBuyerSheet(lot)}
            onDeleteClick={() => { setSelected(lot); setModal('delete'); }}
          />
        ))}
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4">Calculs automatiques avicoles</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {rows.map((lot) => {
            const metrics = metricsFor(lot);
            return (
              <div key={`calc-${lot.id}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
                <p className="text-xs text-[#8a7456]">{lot.name || lot.id}</p>
                <p className="text-sm font-bold text-[#2f2415] mt-1">Effectif {fmtNumber(metrics.currentCount)} - Survie {metrics.survivalRate.toFixed(1)}%</p>
                <p className="text-xs text-[#7d6a4a]">Alim/tete {fmtCurrency(metrics.costPerHead)} - Marge/tete {fmtCurrency(metrics.marginPerHead)}</p>
              </div>
            );
          })}
          {!rows.length ? (
            <div className="col-span-full text-sm text-[#8a7456] bg-[#fffdf8] border border-dashed border-[#d6c3a0] rounded-xl p-4">
              Aucun lot charge. Les effectifs, couts et scores se calculeront automatiquement apres ajout des lots.
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold text-[#2f2415]">Journal production oeufs</p>
            <p className="text-xs text-[#8a7456]">Les oeufs produits/casses sont saisis ici, pas dans la fiche du lot.</p>
          </div>
          <Btn icon={Plus} small onClick={() => setProductionModal('create')}>Ajouter releve</Btn>
        </div>
        <div className="overflow-x-auto border border-[#d6c3a0] rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fffdf8] border-b border-[#d6c3a0]">
                {['Date', 'Lot', 'Oeufs', 'Casses', 'Vendables', 'Plateaux', 'Taux ponte', 'Notes', 'Actions'].map((head) => (
                  <th key={head} className="text-left text-xs font-semibold text-[#8a7456] uppercase tracking-wide px-3 py-3">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrichedProductionLogs.map((log) => (
                <tr key={log.id} className="border-b border-[#d6c3a0]/60 hover:bg-[#fffdf8]">
                  <td className="px-3 py-3 text-[#2f2415]">{log.date}</td>
                  <td className="px-3 py-3 text-[#2f2415] font-semibold">{log.lot_name || log.lot_id}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{fmtNumber(log.oeufs_produits)}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{fmtNumber(log.oeufs_casses)}</td>
                  <td className="px-3 py-3 text-emerald-600 font-semibold">{fmtNumber(log.oeufs_vendables)}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{fmtNumber(log.plateaux)}</td>
                  <td className="px-3 py-3 text-[#2f2415]">{log.taux_ponte_calcule.toFixed(1)}%</td>
                  <td className="px-3 py-3 text-[#7d6a4a]">{selectText(log.notes)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <ActionIconButton icon={Eye} title="Details" color="sky" onClick={() => { setSelectedProduction(log); setProductionModal('details'); }} />
                      <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelectedProduction(log); setProductionModal('edit'); }} />
                      <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelectedProduction(log); setProductionModal('delete'); }} />
                    </div>
                  </td>
                </tr>
              ))}
              {!enrichedProductionLogs.length ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-[#8a7456]">Aucun releve production oeufs. Ajoute un releve pour alimenter les KPIs pondeuses.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
        <p className="font-semibold text-[#2f2415] mb-4">Production oeufs - 7 derniers releves reels</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={productionChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" />
            <XAxis dataKey="date" stroke="#8a7456" fontSize={12} />
            <YAxis stroke="#8a7456" fontSize={12} />
            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} />
            <Bar dataKey="oeufs" fill="#22c55e" radius={[6, 6, 0, 0]} name="Oeufs produits" />
            <Bar dataKey="casses" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Oeufs casses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? enrichLotForDetails(selected, metricsFor(selected)) : selected} title="Details du lot" />
      <CreateModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        onSubmit={submitCreate}
        fields={MODULE_FORM_FIELDS.avicole}
        initialValues={deriveLotFormValues({ id: generateSequentialId('avicole', rows, { type: 'Pondeuse' }), type: 'Pondeuse', phase: 'En ponte', date_debut: todayIso(), duree_cycle_valeur: 18, duree_cycle_unite: 'mois', initial_count: 0, mortality: 0, vols: 0, vendus: 0, reformes: 0, sorties: 0, malades: 0, health_status: 'sain', status: 'en_ponte' })}
        autoId={(values) => generateSequentialId('avicole', rows, values)}
        deriveValues={deriveLotFormValues}
        loading={saving}
        title="Ajouter un lot"
        submitLabel="Ajouter"
      />
      <EditModal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        onSubmit={submitEdit}
        fields={MODULE_FORM_FIELDS.avicole}
        initialValues={selected ? lotInitialValues(selected) : {}}
        deriveValues={deriveLotFormValues}
        loading={saving}
        title="Modifier lot"
        submitLabel="Enregistrer"
      />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />

      <DetailsModal open={productionModal === 'details'} onClose={() => setProductionModal(null)} data={selectedProduction || {}} title="Details production oeufs" />
      <CreateModal
        open={productionModal === 'create'}
        onClose={() => setProductionModal(null)}
        onSubmit={submitCreateProduction}
        fields={MODULE_FORM_FIELDS.production_oeufs_logs}
        initialValues={deriveProductionValues({ id: generateSequentialId('production_oeufs_logs', productionLogs), lot_id: defaultProductionLotId, date: todayIso(), oeufs_produits: 0, oeufs_casses: 0 })}
        autoId={() => generateSequentialId('production_oeufs_logs', productionLogs)}
        deriveValues={deriveProductionValues}
        loading={saving}
        title="Ajouter production oeufs"
        submitLabel="Ajouter"
      />
      <EditModal
        open={productionModal === 'edit'}
        onClose={() => setProductionModal(null)}
        onSubmit={submitEditProduction}
        fields={MODULE_FORM_FIELDS.production_oeufs_logs}
        initialValues={selectedProduction ? deriveProductionValues(selectedProduction) : {}}
        deriveValues={deriveProductionValues}
        loading={saving}
        title="Modifier production oeufs"
        submitLabel="Enregistrer"
      />
      <DeleteModal open={productionModal === 'delete'} onClose={() => setProductionModal(null)} onConfirm={submitDeleteProduction} itemLabel={selectedProduction ? `${selectedProduction.lot_id} - ${selectedProduction.date}` : ''} loading={saving} />
    </div>
  );
}

function LotCard({ lot, metrics, onDetails, onEdit, onWhatsapp, onConfirmReady, onCreateOpportunity, onBuyerSheet, onDeleteClick }) {
  const egg = metrics.eggMetrics;
  const readiness = calculateLotSaleReadiness(lot, metrics);
  const phaseSuggestion = suggestLotPhase(lot, metrics);
  const age = calculateLotAgeDays(lot);
  const fields = [
    { label: 'Effectif initial', value: fmtNumber(lot.initial_count) },
    { label: 'Effectif actuel calcule', value: fmtNumber(metrics.currentCount) },
    { label: 'Age du lot', value: age === null ? 'Date debut a renseigner' : `${age} jours` },
    { label: 'Fin prevue', value: lot.date_fin_prevue || calculateLotEndDate(lot) || 'A renseigner' },
    { label: 'Phase suggeree', value: phaseSuggestion.label },
    { label: 'Morts', value: Number(lot.mortality || 0) },
    { label: 'Voles', value: lot.vols || 0 },
    { label: 'Vendus', value: lot.vendus || 0 },
    { label: 'Reformes / sorties', value: `${lot.reformes || 0} / ${lot.sorties || 0}` },
    { label: 'Malades', value: lot.malades || 0 },
    { label: 'Taux survie auto', value: `${metrics.survivalRate.toFixed(1)}%` },
    { label: 'Poids moyen', value: `${lot.weight_avg || 0} kg` },
    ...(isChair(lot) ? [{ label: 'IC', value: lot.ic || 0 }, { label: 'Cout / poulet', value: fmtCurrency(metrics.totalCostPerHead) }, { label: 'Marge / poulet', value: fmtCurrency(metrics.marginPerHead) }] : []),
    ...(isPondeuse(lot) ? [{ label: 'Oeufs jour', value: fmtNumber(egg.todayEggs) }, { label: 'Casses jour', value: fmtNumber(egg.todayBroken) }, { label: 'Taux ponte', value: `${metrics.layingRate.toFixed(1)}%` }] : []),
    { label: 'Alim. totale', value: fmtCurrency(metrics.feedingCost) },
    { label: 'Alim/tete', value: fmtCurrency(metrics.costPerHead) },
  ];

  return (
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5 hover:border-[#b6975f] transition-all">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <p className="font-bold text-[#2f2415]">{lot.name || lot.id}</p>
          <p className="text-xs text-[#8a7456]">{isPondeuse(lot) ? 'Pondeuses' : 'Poulets de chair'} - {lot.phase || 'Suivi'}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <Badge status={lot.health_status || 'sain'} />
          <Badge status={lot.status || 'actif'} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map((field) => (
          <div key={field.label} className="bg-[#fffdf8] rounded-lg p-2.5">
            <div className="text-xs text-[#8a7456]">{field.label}</div>
            <div className="text-[#2f2415] font-semibold text-sm mt-0.5">{field.value}</div>
          </div>
        ))}
      </div>

      <div className={`rounded-lg p-3 mb-4 border ${readiness.recommended ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700' : 'bg-[#fffdf8] border-[#d6c3a0] text-[#7d6a4a]'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">Score pret a la vente</span>
          <span className="text-sm font-black">{readiness.score}%</span>
        </div>
        <p className="text-xs mt-1">{readiness.recommended ? readiness.reason : `Manquants: ${readiness.missing.join(', ') || 'RAS'}`}</p>
      </div>

      {isPondeuse(lot) ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
          <div className="text-xs text-emerald-600 mb-1">Production pondeuses</div>
          <div className="text-xl font-bold text-emerald-600">{fmtNumber(egg.todayEggs)} oeufs jour</div>
          <div className="text-xs text-emerald-700/80">Moyenne 7j {fmtNumber(Math.round(egg.avg7Eggs))} - plateaux cumules {fmtNumber(egg.totalTrays)}</div>
        </div>
      ) : null}

      <div className="flex justify-between items-center text-sm pt-3 border-t border-[#d6c3a0]">
        <div>
          <div className="text-[#8a7456] text-xs">Revenu / potentiel</div>
          <div className="text-[#2f2415] font-semibold">{fmtCurrency(metrics.grossRevenue)}</div>
        </div>
        <div className="text-right">
          <div className="text-[#8a7456] text-xs">Marge estimee auto</div>
          <div className={metrics.estimatedMargin >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{fmtCurrency(metrics.estimatedMargin)}</div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <ActionIconButton icon={Eye} title="Details" color="sky" onClick={onDetails} />
        <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={onEdit} />
        <ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={onWhatsapp} />
        <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={onDeleteClick} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
        <Btn variant="outline" small onClick={onConfirmReady}>Confirmer pret vente</Btn>
        <Btn variant="outline" small onClick={onCreateOpportunity}>Creer opportunite</Btn>
        <Btn variant="outline" small onClick={onBuyerSheet}>Fiche acheteur</Btn>
      </div>
    </div>
  );
}

function enrichLotForDetails(lot, metrics) {
  if (!lot) return lot;
  const readiness = calculateLotSaleReadiness(lot, metrics);
  const phaseSuggestion = suggestLotPhase(lot, metrics);
  return {
    ...lot,
    type_lot: isPondeuse(lot) ? 'Pondeuses' : 'Poulets de chair',
    age_lot: readiness.ageDays === null ? 'Date debut a renseigner' : `${readiness.ageDays} jours`,
    date_fin_prevue_calculee: calculateLotEndDate(lot) || 'Date debut a renseigner',
    phase_suggeree: `${phaseSuggestion.label} - ${phaseSuggestion.reason}`,
    score_pret_vente: `${readiness.score}%`,
    statut_pret_vente: readiness.status,
    criteres_manquants_vente: readiness.missing.join(', ') || 'Aucun critere bloquant',
    effectif_actuel_calcule: metrics.currentCount,
    score_sante_auto: `${metrics.scoreSante.toFixed(1)}%`,
    taux_survie_auto: `${metrics.survivalRate.toFixed(1)}%`,
    taux_mortalite_auto: `${metrics.mortalityRate.toFixed(1)}%`,
    cout_alimentation_calcule: fmtCurrency(metrics.feedingCost),
    cout_alimentation_par_tete: fmtCurrency(metrics.costPerHead),
    cout_alimentation_par_tete_jour: metrics.costPerHeadPerDay ? `${fmtCurrency(metrics.costPerHeadPerDay)} / j` : 'Non calculable',
    frais_sante_soins: fmtCurrency(metrics.healthCost),
    autres_frais: fmtCurrency(metrics.otherCosts),
    cout_total_par_tete: fmtCurrency(metrics.totalCostPerHead),
    marge_par_tete: fmtCurrency(metrics.marginPerHead),
    marge_estimee_calculee: fmtCurrency(metrics.estimatedMargin),
    production_oeufs_jour: isPondeuse(lot) ? metrics.eggMetrics.todayEggs : 'Non applicable',
    oeufs_casses_jour: isPondeuse(lot) ? metrics.eggMetrics.todayBroken : 'Non applicable',
    plateaux_cumules: isPondeuse(lot) ? metrics.eggMetrics.totalTrays : 'Non applicable',
  };
}
