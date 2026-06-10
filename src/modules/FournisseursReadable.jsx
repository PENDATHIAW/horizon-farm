import Fournisseurs from './Fournisseurs.jsx';
import FournisseursEvolution from './FournisseursEvolution.jsx';
import SupplierHealthPanel from './SupplierHealthPanel.jsx';
import TradeDocumentsHealth from './TradeDocumentsHealth.jsx';

export default function FournisseursReadable({ hideEvolutionSection = false, ...props }) {
  return (
    <div className="fournisseurs-readable-order space-y-6">
      <SupplierHealthPanel
        rows={props.rows || []}
        stocks={props.stocks || []}
        finances={props.finances || props.transactions || []}
        documents={props.documents || []}
        onNavigate={props.onNavigate}
      />
      <TradeDocumentsHealth
        mode="fournisseurs"
        rows={props.rows || []}
        stocks={props.stocks || []}
        finances={props.finances || props.transactions || []}
        onNavigate={props.onNavigate}
      />
      <Fournisseurs {...props} hideEvolution />
      {hideEvolutionSection ? null : (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">Évolution fournisseurs</p>
            <p className="mt-1 text-sm text-[#8a7456]">Courbes et tendances placées en bas pour garder dettes, risques, commandes et fournisseurs prioritaires en haut.</p>
          </div>
          <FournisseursEvolution rows={props.rows || []} stocks={props.stocks || []} finances={props.finances || props.transactions || []} onNavigate={props.onNavigate} />
        </section>
      )}
    </div>
  );
}
