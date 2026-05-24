import { ChevronDown, CreditCard, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import SalesWorkflowHealth from './SalesWorkflowHealth.jsx';
import VentesV2 from './VentesV2.jsx';

function Section({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function Fold({ icon: Icon, title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8]"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`text-[#8a7456] ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-5">{children}</div> : null}</section>;
}

export default function VentesV4(props) {
  const payments = props.paymentsList || props.payments || [];
  return <div className="space-y-5 ventes-mobile-structured">
    <Section icon={CreditCard} title="Vendre & encaisser" subtitle="Créer une vente, modifier une commande, suivre paiements, factures, livraisons et statuts."><VentesV2 {...props} /></Section>
    <Fold icon={ShieldCheck} title="Contrôle automatique du workflow" subtitle="Vérification interne des paiements, finances, actifs, factures et livraisons."><SalesWorkflowHealth orders={props.rows || []} payments={payments} transactions={props.transactions || []} invoices={props.invoicesList || props.invoices || []} deliveries={props.deliveriesList || props.deliveries || []} stocks={props.stocks || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} onNavigate={props.onNavigate} /></Fold>
  </div>;
}
