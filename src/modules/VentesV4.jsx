import { ChevronDown, CreditCard, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import SalesWorkflowHealth from './SalesWorkflowHealth.jsx';
import VentesV2 from './VentesV2.jsx';

function Section({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function AdminFold({ children }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white"><span><span className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><ShieldCheck size={16} /> Audit interne</span><span className="mt-1 block text-xs text-[#8a7456]">Réservé aux régularisations exceptionnelles et anciennes données importées.</span></span><ChevronDown size={18} className={`text-[#8a7456] ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-4">{children}</div> : null}</section>;
}

export default function VentesV4(props) {
  const payments = props.paymentsList || props.payments || [];
  return <div className="space-y-5 ventes-mobile-structured">
    <Section icon={CreditCard} title="Vendre & encaisser" subtitle="Créer une vente, encaisser, livrer et générer les pièces commerciales. Les liens finance, comptabilité, stock et client sont gérés automatiquement."><VentesV2 {...props} /></Section>
    <AdminFold><SalesWorkflowHealth orders={props.rows || []} payments={payments} transactions={props.transactions || []} invoices={props.invoicesList || props.invoices || []} deliveries={props.deliveriesList || props.deliveries || []} stocks={props.stocks || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} onNavigate={props.onNavigate} /></AdminFold>
  </div>;
}
