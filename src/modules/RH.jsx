import { AlertTriangle, Banknote, CheckCircle2, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { getRhDirectory, RH_TEAMS, saveRhDirectory } from '../utils/rhDirectory';
import { buildRhSalaryWorkflow } from '../utils/rhWorkflows';
import RHPeopleTeams from './RHPeopleTeams.jsx';
import { createImpactJournal, finalizeImpactJournal, IMPACT_KEYS, instrumentHandlers, markImpactCreated, markImpactNa, OPERATION_EXPECTATIONS, OPERATION_TYPES } from '../utils/workflowImpactJournal';
import { showWorkflowImpactToast } from '../utils/workflowImpactToast';

const today = () => new Date().toISOString().slice(0, 10);
const payroll = (p = {}) => {
  const salaire = toNumber(p.salaire_mensuel);
  const prime = toNumber(p.prime_mensuelle);
  const avance = toNumber(p.avance_mois);
  return { salaire, prime, avance, brut: salaire + prime, net: Math.max(0, salaire + prime - avance) };
};
const activePeople = (people = []) => people.filter((p) => ['actif', 'active'].includes(String(p.statut || '').toLowerCase()));
const teamName = (teams = [], id) => teams.find((team) => team.id === id)?.name || id || 'Équipe ferme';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}
function Mini({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

function RhPriorityPayments({ onCreateFinanceTransaction, onRefreshFinances, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents, onRefresh }) {
  const [directory, setDirectory] = useState(() => getRhDirectory());
  const [savingId, setSavingId] = useState('');
  const people = activePeople(directory.people || []);
  const teams = directory.teams || RH_TEAMS;
  const payables = useMemo(() => people.filter((person) => payroll(person).net > 0).sort((a, b) => payroll(b).net - payroll(a).net), [people]);
  const totalNet = payables.reduce((sum, person) => sum + payroll(person).net, 0);
  const advances = people.reduce((sum, person) => sum + payroll(person).avance, 0);

  useEffect(() => {
    const sync = () => setDirectory(getRhDirectory());
    window.addEventListener('horizon-farm-rh-updated', sync);
    return () => window.removeEventListener('horizon-farm-rh-updated', sync);
  }, []);

  const pay = async (person) => {
    const m = payroll(person);
    if (m.net <= 0) return toast.error('Aucun net à payer');
    try {
      setSavingId(person.id);
      const workflow = buildRhSalaryWorkflow({ person, teams, amount: m.net, date: today() });
      const journal = createImpactJournal(OPERATION_TYPES.PAIE, workflow.financeTransaction.id);
      const tracked = instrumentHandlers({ onCreateFinanceTransaction, onCreateDocument, onCreateBusinessEvent }, journal);
      await tracked.onCreateFinanceTransaction?.(workflow.financeTransaction);
      await tracked.onCreateDocument?.(workflow.document);
      await tracked.onCreateBusinessEvent?.(workflow.event);
      markImpactNa(journal, IMPACT_KEYS.TASK_ALERT, 'Aucune tâche RH supplémentaire');
      const next = saveRhDirectory({
        ...directory,
        people: (directory.people || []).map((item) => item.id === person.id ? { ...item, ...workflow.personPatch } : item),
      });
      setDirectory(next);
      await Promise.allSettled([onRefreshFinances?.(), onRefreshDocuments?.(), onRefreshBusinessEvents?.(), onRefresh?.()]);
      toast.success('Paiement RH enregistré');
    } catch (error) {
      toast.error(error.message || 'Paiement impossible');
    } finally {
      setSavingId('');
    }
  };

  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">RH à traiter maintenant</p><h3 className="font-black text-[#2f2415]">Rémunérations et avances</h3><p className="text-sm text-[#8a7456] mt-1">On affiche d’abord les montants à payer, avant le répertoire complet.</p></div>
      <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={UserCheck} label="Actifs" value={people.length} /><Mini icon={Banknote} label="Net à payer" value={fmtCurrency(totalNet)} /><Mini icon={AlertTriangle} label="Avances" value={fmtCurrency(advances)} /></div>
    </div>
    {!payables.length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={14} className="inline" /> Aucun paiement RH prioritaire à traiter.</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">{payables.slice(0, 8).map((person) => {
      const m = payroll(person);
      return <div key={person.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{person.nom || person.id}</p><p className="text-xs text-[#8a7456] mt-1">{teamName(teams, person.equipe_id)} · {person.role || 'RH'}</p><p className="mt-2 text-sm font-black text-[#2f2415]">{fmtCurrency(m.net)}</p><button type="button" disabled={savingId === person.id} onClick={() => pay(person)} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60"><CheckCircle2 size={14} className="inline" /> {savingId === person.id ? 'Paiement...' : 'Payer'}</button></div>;
    })}</div>}
  </div>;
}

export default function RH(props) {
  return <div className="space-y-6 rh-readable-order"><ModuleSection icon={Banknote} title="Priorités RH" subtitle="Paiements, avances et montants RH à traiter avant le répertoire."><RhPriorityPayments {...props} /></ModuleSection><RHPeopleTeams {...props} /></div>;
}