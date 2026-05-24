import { AlertTriangle, Banknote, FileText, Settings, ShieldCheck, UserCheck, Wrench } from 'lucide-react';
import Btn from '../components/Btn';
import { transactionHasProof } from '../utils/accountingProof';
import { fmtCurrency, toNumber } from '../utils/format';
import { getRhDirectory } from '../utils/rhDirectory';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const activePeople = (people = []) => people.filter((p) => ['actif', 'active'].includes(lower(p.statut)));
const payroll = (p = {}) => Math.max(0, toNumber(p.salaire_mensuel) + toNumber(p.prime_mensuelle) - toNumber(p.avance_mois));
const isBroken = (row = {}) => ['panne', 'hors_service', 'maintenance'].includes(lower(row.status || row.statut));
const isDue = (row = {}) => row.maintenance_due && String(row.maintenance_due).slice(0, 10) <= new Date().toISOString().slice(0, 10);
const isInternalTx = (tx = {}) => {
  const text = lower(`${tx.module_source || ''} ${tx.source_module || ''} ${tx.category || ''} ${tx.categorie || ''} ${tx.libelle || ''} ${tx.description || ''}`);
  return ['rh', 'salaire', 'remuneration', 'rémunération', 'equipement', 'équipement', 'maintenance', 'carburant'].some((word) => text.includes(word));
};
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

export default function InternalResourcesHealth({ people, equipements = [], transactions = [], documents = [], tasks = [], onNavigate }) {
  const directory = getRhDirectory();
  const rhPeople = people || directory.people || [];
  const active = activePeople(rhPeople);
  const payables = active.filter((person) => payroll(person) > 0).sort((a, b) => payroll(b) - payroll(a));
  const payrollTotal = payables.reduce((sum, person) => sum + payroll(person), 0);
  const broken = arr(equipements).filter(isBroken);
  const due = arr(equipements).filter(isDue);
  const internalTransactions = arr(transactions).filter(isInternalTx);
  const missingProof = internalTransactions.filter((tx) => amount(tx) > 0 && !transactionHasProof(tx, documents));
  const openTasks = arr(tasks).filter((task) => !['termine', 'terminé', 'annule', 'annulé', 'done'].includes(lower(task.status || task.statut)) && ['rh', 'equipements', 'equipement'].some((word) => lower(`${task.module_lie || ''} ${task.source_module || ''} ${task.title || ''}`).includes(word)));

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ShieldCheck size={15} /> Ressources internes</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">RH, équipements, dépenses et preuves</h3>
        <p className="text-sm text-[#8a7456] mt-1">Vue courte pour repérer salaires à payer, matériels à réparer et justificatifs manquants.</p>
      </div>
      {broken.length || due.length || missingProof.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {broken.length + due.length + missingProof.length} point(s) à traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Ressources suivies</div>}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 text-sm">
      <Mini icon={UserCheck} label="RH actifs" value={active.length} />
      <Mini icon={Banknote} label="Net à payer" value={fmtCurrency(payrollTotal)} danger={payrollTotal > 0} />
      <Mini icon={Settings} label="Équipements" value={arr(equipements).length} />
      <Mini icon={Wrench} label="Pannes/maintenance" value={broken.length} danger={broken.length > 0} />
      <Mini icon={AlertTriangle} label="Maintenance due" value={due.length} danger={due.length > 0} />
      <Mini icon={FileText} label="Preuves manquantes" value={missingProof.length} danger={missingProof.length > 0} />
      <Mini icon={AlertTriangle} label="Tâches ouvertes" value={openTasks.length} danger={openTasks.length > 0} />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">Paiements RH</p><div className="mt-3 space-y-2 text-sm">{payables.slice(0, 4).map((person) => <div key={person.id || person.nom} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2"><b className="text-[#2f2415]">{person.nom || person.id}</b><p className="text-xs text-[#8a7456]">{fmtCurrency(payroll(person))}</p></div>)}{!payables.length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Aucun net RH prioritaire.</div> : null}</div></div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">Matériel à suivre</p><div className="mt-3 space-y-2 text-sm">{[...broken, ...due].slice(0, 4).map((eq) => <div key={eq.id || eq.name} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2"><b className="text-[#2f2415]">{eq.name || eq.nom || eq.id}</b><p className="text-xs text-[#8a7456]">{eq.status || eq.statut || 'à vérifier'} · maintenance {eq.maintenance_due || 'non planifiée'}</p></div>)}{![...broken, ...due].length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Aucun équipement urgent.</div> : null}</div></div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">Preuves internes</p><div className="mt-3 space-y-2 text-sm">{missingProof.slice(0, 4).map((tx) => <div key={tx.id || tx.libelle} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2"><b className="text-[#2f2415]">{tx.libelle || tx.id}</b><p className="text-xs text-[#8a7456]">{fmtCurrency(amount(tx))}</p></div>)}{!missingProof.length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Aucune preuve interne manquante détectée.</div> : null}</div></div>
    </div>
    <div className="flex flex-wrap justify-end gap-2"><Btn small variant="outline" onClick={() => onNavigate?.('rh')}>Ouvrir RH</Btn><Btn small variant="outline" onClick={() => onNavigate?.('equipements')}>Ouvrir équipements</Btn><Btn small variant="outline" onClick={() => onNavigate?.('documents')}>Ouvrir documents</Btn><Btn small variant="outline" onClick={() => onNavigate?.('finances')}>Ouvrir finances</Btn></div>
  </section>;
}
