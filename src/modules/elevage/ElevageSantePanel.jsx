import HealthOperationalPanel from '../HealthOperationalPanel.jsx';
import SanteV8 from '../SanteV8.jsx';

export default function ElevageSantePanel({ healthProps, onNavigate, onOpenWorkflow }) {
  return (
    <div className="space-y-5">
      {onOpenWorkflow ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-[#2f2415]">Saisie santé unifiée</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Ouvre le formulaire santé complet : intervention, preuve, stock, coût Finance et rappel.</p>
          <button type="button" onClick={() => onOpenWorkflow('health')} className="mt-3 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16]">+ Intervention santé complète</button>
        </section>
      ) : null}
      <HealthOperationalPanel
        rows={healthProps.rows || []}
        stocks={healthProps.stocks || []}
        transactions={healthProps.transactions || []}
        animaux={healthProps.animaux || []}
        lots={healthProps.lots || []}
        onNavigate={onNavigate}
      />
      <SanteV8 {...healthProps} />
    </div>
  );
}
