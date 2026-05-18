import AssistantERP from './AssistantERP.jsx';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import HumanUiAuditPanel from './HumanUiAuditPanel.jsx';

export default function AssistantERPV2(props) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Assistant ERP</p>
        <h1 className="mt-3 text-2xl font-black text-[#2f2415]">Vue simplifiée</h1>
        <p className="mt-1 text-sm text-[#8a7456]">Priorités métier, testeur humain AI avec simulations de formulaires, puis commande guidée.</p>
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Mode données réelles : normal si aucun résultat n’apparaît tant que rien n’est saisi. Mode données simulées : utilisé pour tester les parcours.</p>
      </section>
      <AssistantERPInsights {...props} />
      <HumanUiAuditPanel />
      <AssistantERP {...props} />
    </div>
  );
}
