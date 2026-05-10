import { Banknote, CheckCircle2, WalletCards } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import { fmtCurrency, toNumber } from '../utils/format';
import { getRhDirectory } from '../utils/rhDirectory';

const payrollFor = (person = {}) => {
  const salaire = toNumber(person.salaire_mensuel);
  const prime = toNumber(person.prime_mensuelle);
  const avance = toNumber(person.avance_mois);
  const brut = salaire + prime;
  return { salaire, prime, avance, brut, net: Math.max(0, brut - avance) };
};

export default function RHPayrollPanel() {
  const { people = [] } = getRhDirectory();
  const active = people.filter((p) => ['actif', 'active'].includes(String(p.statut || '').toLowerCase()));
  const payroll = active.map((person) => ({ person, ...payrollFor(person) }));
  const masseBrute = payroll.reduce((sum, row) => sum + row.brut, 0);
  const avances = payroll.reduce((sum, row) => sum + row.avance, 0);
  const netAPayer = payroll.reduce((sum, row) => sum + row.net, 0);

  return <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
    <div>
      <p className="text-xs uppercase tracking-widest text-[#8a7456]">Rémunérations</p>
      <h3 className="font-black text-[#2f2415]">Masse salariale et reste à payer</h3>
      <p className="text-sm text-[#8a7456] mt-1">Données RH fictives visibles pour tester les charges de personnel. Ces montants devront ensuite générer des sorties Finance validées.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard icon={Banknote} label="Masse brute" value={fmtCurrency(masseBrute)} />
      <KpiCard icon={WalletCards} label="Avances" value={fmtCurrency(avances)} />
      <KpiCard icon={CheckCircle2} label="Net à payer" value={fmtCurrency(netAPayer)} />
    </div>
    <div className="overflow-x-auto rounded-xl border border-[#eadcc2]">
      <table className="w-full text-sm">
        <thead className="bg-[#fff8ea] text-[#8a7456]"><tr><th className="text-left p-3">Personne</th><th className="text-left p-3">Rôle</th><th className="text-right p-3">Salaire</th><th className="text-right p-3">Prime</th><th className="text-right p-3">Avance</th><th className="text-right p-3">Net à payer</th></tr></thead>
        <tbody>{payroll.map(({ person, salaire, prime, avance, net }) => <tr key={person.id} className="border-t border-[#eadcc2]"><td className="p-3 font-bold text-[#2f2415]">{person.nom}</td><td className="p-3 text-[#7d6a4a]">{person.role}</td><td className="p-3 text-right">{fmtCurrency(salaire)}</td><td className="p-3 text-right">{fmtCurrency(prime)}</td><td className="p-3 text-right text-amber-700">{fmtCurrency(avance)}</td><td className="p-3 text-right font-black text-emerald-700">{fmtCurrency(net)}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
