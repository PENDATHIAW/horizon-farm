import { CheckCircle2 } from 'lucide-react';
import { emitHorizonForm } from '../../services/formModalManager';

const STEPS = Object.freeze([
  { key: 'expense', label: 'Enregistrer une première dépense', tab: 'Trésorerie', action: 'finance_entry' },
  { key: 'sale', label: 'Enregistrer une première vente', module: 'commercial', tab: 'Ventes' },
  { key: 'payment', label: 'Rattacher un paiement', module: 'commercial', tab: 'Ventes' },
  { key: 'proof', label: 'Ajouter une preuve', module: 'documents_rapports' },
  { key: 'receivable', label: 'Suivre les créances', tab: 'Créances' },
  { key: 'report', label: 'Générer un premier rapport', module: 'documents_rapports', tab: 'Rapports' },
]);

export default function FinanceStartupPanel({ onNavigate, setTab }) {
  const openStep = (step) => {
    if (step.action === 'finance_entry') {
      emitHorizonForm('finances', 'finance_entry', 'Nouvelle écriture', { date: new Date().toISOString().slice(0, 10) });
      setTab?.('Trésorerie');
      return;
    }
    if (step.module) {
      onNavigate?.(step.module, step.tab ? { tab: step.tab } : undefined);
      return;
    }
    if (step.tab) setTab?.(step.tab);
  };

  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">Démarrage Finance</p>
      <h2 className="mt-1 text-xl font-black text-[#2f2415]">Votre suivi financier est prêt.</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Commencez par ces étapes pour alimenter trésorerie, rentabilité et échéancier.</p>
      <ul className="mt-4 space-y-2">
        {STEPS.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => openStep(step)}
              className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-sm hover:bg-emerald-50"
            >
              <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
              <span className="font-bold text-[#2f2415]">{step.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
