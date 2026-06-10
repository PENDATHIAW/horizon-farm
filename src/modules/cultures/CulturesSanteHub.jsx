import CulturesWorkflowBridge from '../CulturesWorkflowBridge.jsx';
import CulturesTabActionsBridge, { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

export default function CulturesSanteHub(props) {
  const realRows = getRealCultureRows(props.rows || []);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>Santé & protection</b> — maladies, ravageurs, stress hydrique, traitements phytosanitaires.
        Diagnostic caméra IA : draft uniquement, validation humaine obligatoire avant traitement.
      </section>
      <CulturesWorkflowBridge rows={realRows} onUpdate={props.onUpdate} onRefresh={props.onRefresh} />
      <CulturesTabActionsBridge {...props} tab="Santé" actionsMode="loss" />
    </div>
  );
}
