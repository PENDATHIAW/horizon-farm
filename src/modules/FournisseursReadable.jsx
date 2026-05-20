import Fournisseurs from './Fournisseurs.jsx';
import FournisseursEvolution from './FournisseursEvolution.jsx';

export default function FournisseursReadable(props) {
  return (
    <div className="fournisseurs-readable-order space-y-6">
      <Fournisseurs {...props} hideEvolution />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">Évolution fournisseurs</p>
          <p className="mt-1 text-sm text-[#8a7456]">Courbes et tendances placées en bas pour garder dettes, risques, commandes et fournisseurs prioritaires en haut.</p>
        </div>
        <FournisseursEvolution rows={props.rows || []} stocks={props.stocks || []} finances={props.finances || props.transactions || []} onNavigate={props.onNavigate} />
      </section>
    </div>
  );
}
