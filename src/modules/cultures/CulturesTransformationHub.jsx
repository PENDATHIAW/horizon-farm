import { Factory } from 'lucide-react';

/** V1 — transformation cultures (maïs→farine, etc.) : hub métier, stock produit fini via Achats & Stock. */
export default function CulturesTransformationHub({ onNavigate }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Factory size={20} /> Transformation cultures</p>
      <p className="text-sm text-[#8a7456]">
        Matière première récoltée → produit transformé → stock. Coût matière + coût transformation → marge brute technique.
        V1 : enregistrez les sorties récolte (onglet Récoltes) puis les entrées produit fini dans le stock.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button type="button" onClick={() => onNavigate?.('cultures', { tab: 'Récoltes' })} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]">
          <b className="text-[#2f2415]">Matière première</b>
          <p className="mt-1 text-sm text-[#8a7456]">Récoltes enregistrées → stock brut.</p>
        </button>
        <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]">
          <b className="text-[#2f2415]">Produit transformé</b>
          <p className="mt-1 text-sm text-[#8a7456]">Entrée stock farine, huile, concentré…</p>
        </button>
      </div>
    </section>
  );
}
