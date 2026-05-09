import { AlertTriangle, Bird, CheckCircle2, Egg, HeartPulse, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const asObject = (value) => value && typeof value === 'object' ? value : {};
const lotId = (lot = {}) => String(lot?.id || '').trim();
const lotName = (lot = {}) => lot.name || lot.nom || lotId(lot) || 'Lot avicole';
const totalCount = (lot = {}) => toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.effectif ?? lot.initial_count ?? lot.nombre ?? lot.quantite);
const deadCount = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.dead_count ?? lot.pertes);
const sickCount = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count);
const soldCount = (lot = {}) => toNumber(lot.vendus ?? lot.sold ?? lot.sorties ?? 0);
const activeCount = (lot = {}) => Math.max(0, totalCount(lot) - deadCount(lot) - soldCount(lot));
const healthScore = (lot = {}) => {
  const raw = lot.scoresSante ?? lot.score_sante ?? lot.health_score;
  return raw === undefined || raw === null || raw === '' ? 100 : toNumber(raw);
};
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const broken = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const isValidLot = (lot = {}) => Boolean(lotId(lot));
const isActiveLot = (lot = {}) => {
  const status = String(lot.status || lot.statut || '').toLowerCase();
  return isValidLot(lot) && !['vendu', 'termine', 'terminé', 'perdu', 'archive', 'archivé'].includes(status);
};

function logsForLot(lot, productionLogs = []) {
  const id = lotId(lot);
  if (!id) return [];
  return arr(productionLogs)
    .map(asObject)
    .filter((log) => String(log.lot_id || log.related_id || '').trim() === id)
    .sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')));
}

function eggDropForLot(lot, productionLogs = []) {
  const logs = logsForLot(lot, productionLogs).slice(0, 4);
  if (logs.length < 2) return { detected: false, last: 0, previous: 0, rate: 0 };
  const last = Math.max(0, eggs(logs[0]) - broken(logs[0]));
  const previousAvg = logs.slice(1).reduce((sum, log) => sum + Math.max(0, eggs(log) - broken(log)), 0) / Math.max(1, logs.length - 1);
  const rate = previousAvg > 0 ? ((previousAvg - last) / previousAvg) * 100 : 0;
  return { detected: rate >= 20, last, previous: previousAvg, rate };
}

function riskForLot(lot, productionLogs = []) {
  const safeLot = asObject(lot);
  const active = activeCount(safeLot);
  const dead = deadCount(safeLot);
  const sick = sickCount(safeLot);
  const mortalityRate = active + dead > 0 ? (dead / (active + dead)) * 100 : 0;
  const eggDrop = eggDropForLot(safeLot, productionLogs);
  const score = healthScore(safeLot);
  const reasons = [];
  if (sick > 0) reasons.push(`${fmtNumber(sick)} malade(s)`);
  if (dead > 0) reasons.push(`${fmtNumber(dead)} mort(s)`);
  if (mortalityRate >= 4) reasons.push(`mortalité ${mortalityRate.toFixed(1)}%`);
  if (score > 0 && score < 88) reasons.push(`score santé ${score}`);
  if (eggDrop.detected) reasons.push(`baisse ponte ${eggDrop.rate.toFixed(0)}%`);
  const high = mortalityRate >= 4 || sick > 0 || eggDrop.rate >= 35 || score < 75;
  return { active, dead, sick, mortalityRate, eggDrop, score, reasons, high, risky: reasons.length > 0 };
}

export default function AvicoleHealthBridge({ rows = [], productionLogs = [], alimentationLogs = [], onUpdate, onRefresh }) {
  const santeCrud = useCrudModule('sante');
  const alertesCrud = useCrudModule('alertes_center');
  const tachesCrud = useCrudModule('taches');
  const eventsCrud = useCrudModule('business_events');
  const lots = arr(rows).map(asObject).filter(isActiveLot);
  const riskyLots = lots.map((lot) => ({ lot, risk: riskForLot(lot, productionLogs) })).filter((item) => item.risk.risky).slice(0, 6);
  const totalActive = lots.reduce((sum, lot) => sum + activeCount(lot), 0);
  const totalSick = lots.reduce((sum, lot) => sum + sickCount(lot), 0);
  const totalDead = lots.reduce((sum, lot) => sum + deadCount(lot), 0);
  const eggToday = arr(productionLogs).map(asObject).filter((log) => String(log.date || '').slice(0, 10) === today()).reduce((sum, log) => sum + Math.max(0, eggs(log) - broken(log)), 0);
  const alimentationCount = arr(alimentationLogs).map(asObject).filter((log) => String(log.module_lie || log.cible_type || '').toLowerCase().includes('avicole') || String(log.lot_id || '').trim()).length;

  const createBiosecurityFollowUp = async (lot, risk) => {
    const id = lotId(lot);
    if (!id) return toast.error('Lot avicole invalide');
    try {
      const healthId = makeId('SAN');
      const taskId = makeId('TSK');
      const reason = arr(risk.reasons).join(' · ') || 'Lot à contrôler';
      const sick = risk.sick || 1;
      await santeCrud.create?.({
        id: healthId,
        nom: `Suivi avicole ${lotName(lot)}`,
        animal: `${lotName(lot)} · ${sick} malade(s) sur ${risk.active || totalCount(lot) || '?'}`,
        module_lie: 'avicole',
        related_id: id,
        target_scope: risk.sick > 0 ? 'lot_avicole_malade' : 'lot_avicole_risque',
        target_count: risk.sick || risk.active || totalCount(lot),
        total_count: risk.active || totalCount(lot),
        target_summary: `${lotName(lot)} · ${reason}`,
        prevue: today(),
        statut: 'a_faire',
        type_intervention: risk.high ? 'biosecurite' : 'preventif',
        nature_intervention: risk.high ? 'biosécurité' : 'preventif',
        biosafety_required: Boolean(risk.high),
        notes: reason,
        source_module: 'avicole',
      });
      await tachesCrud.create?.({
        id: taskId,
        title: `Contrôle avicole — ${lotName(lot)}`,
        module_lie: 'avicole',
        related_id: id,
        due_date: today(),
        priority: risk.high ? 'haute' : 'moyenne',
        status: 'a_faire',
        checklist: risk.high ? 'Isoler; Contrôler eau/aliment; Désinfecter; Vérifier mortalité; Documenter' : 'Contrôler lot; Vérifier alimentation; Surveiller ponte',
        source_module: 'avicole',
        source_record_id: id,
        linked_health_id: healthId,
      });
      await alertesCrud.create?.({
        id: makeId('ALT'),
        title: `Lot avicole à risque: ${lotName(lot)}`,
        message: reason,
        module_source: 'avicole',
        entity_type: 'lot_avicole',
        entity_id: id,
        severity: risk.high ? 'warning' : 'info',
        status: 'nouvelle',
        action_recommandee: risk.high ? 'Appliquer un contrôle santé et biosécurité.' : 'Surveiller le lot et compléter le suivi.',
      });
      await eventsCrud.create?.({
        id: makeId('EVT'),
        event_type: risk.high ? 'biosécurité_avicole' : 'suivi_avicole',
        module_source: 'avicole',
        entity_type: 'lot_avicole',
        entity_id: id,
        title: `Suivi avicole ${lotName(lot)}`,
        description: reason,
        event_date: today(),
        severity: risk.high ? 'warning' : 'info',
        linked_task_id: taskId,
        linked_health_id: healthId,
        saisies_evitees: 5,
      });
      await onUpdate?.(id, {
        health_status: risk.high ? 'a_surveiller' : (lot.health_status || 'surveillance'),
        statut_sanitaire: risk.high ? 'a_surveiller' : (lot.statut_sanitaire || 'surveillance'),
        last_health_followup_id: healthId,
        last_health_followup_at: now(),
      });
      await Promise.allSettled([santeCrud.refresh?.(), tachesCrud.refresh?.(), alertesCrud.refresh?.(), eventsCrud.refresh?.(), onRefresh?.()]);
      toast.success('Suivi avicole créé');
    } catch (error) {
      toast.error('Suivi avicole impossible');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Avicole connecté</p>
          <h3 className="font-black text-[#2f2415]">Santé, ponte, alimentation et biosécurité</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <Box icon={Bird} label="Actifs" value={fmtNumber(totalActive)} />
          <Box icon={HeartPulse} label="Malades" value={fmtNumber(totalSick)} />
          <Box icon={AlertTriangle} label="Morts" value={fmtNumber(totalDead)} />
          <Box icon={Egg} label="Œufs jour" value={fmtNumber(eggToday)} />
          <Box icon={ShieldCheck} label="Lots risque" value={riskyLots.length} />
        </div>
      </div>
      {!lots.length ? (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun lot avicole actif disponible.</div>
      ) : riskyLots.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {riskyLots.map(({ lot, risk }) => (
            <div key={lotId(lot)} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {lotName(lot)}</p>
              <p className="text-xs text-[#8a7456] mt-1">{risk.reasons.join(' · ')}</p>
              <p className="text-xs text-[#8a7456] mt-1">{fmtNumber(risk.active)} actifs · ponte récente {fmtNumber(risk.eggDrop.last || 0)}</p>
              <button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => createBiosecurityFollowUp(lot, risk)}>Créer suivi</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun lot à risque détecté.</div>
      )}
      <p className="text-xs text-[#8a7456]">Logs alimentation avicole liés: {fmtNumber(alimentationCount)}</p>
    </div>
  );
}

function Box({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[96px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}
