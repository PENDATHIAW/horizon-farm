import CulturesWorkflowBridge from '../CulturesWorkflowBridge.jsx';
import CulturesTabActionsBridge, { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

export default function CulturesSanteHub(props) {
  const realRows = getRealCultureRows(props.rows || []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
        <b>Santé & protection</b> — maladies, ravageurs, stress hydrique. Déclarez les pertes et créez les suivis terrain ci-dessous.
      </section>
      <CulturesWorkflowBridge rows={realRows} onUpdate={props.onUpdate} onRefresh={props.onRefresh} />
      <CulturesTabActionsBridge {...props} tab="Santé & Protection" actionsMode="loss" />
    </div>
  );
}
