import { BookOpen, CheckCircle2, Mic, Sparkles, Sun } from 'lucide-react';

const COMMAND_GROUPS = [
  { title: 'Ventes', examples: ['J’ai vendu 10 poulets à 65 000', 'Créer une vente œufs pour client Aminata', 'Le client a payé 20 000 en Wave'] },
  { title: 'Santé', examples: ['J’ai vacciné BOV002', 'Déclarer BOV004 malade', 'Créer un rappel vaccin demain'] },
  { title: 'Avicole', examples: ['J’ai ramassé 12 tablettes', 'Mortalité de 3 sur le lot chair', 'Réformer les pondeuses du lot PON001'] },
  { title: 'Stock', examples: ['J’ai utilisé 2 sacs d’aliment', 'Réceptionner 10 sacs aliment pondeuses', 'Déclarer une perte de 1 sac'] },
  { title: 'Finance', examples: ['Ajouter une dépense de 15 000 pour aliment', 'Enregistrer paiement fournisseur', 'Ajouter justificatif facture'] },
  { title: 'Tâches & alertes', examples: ['Créer une tâche nettoyage demain 8h', 'Transformer cette alerte en tâche', 'Clôturer la tâche ramassage œufs'] },
];
const RULES = [
  'Hey Horizon est l’assistant principal de l’ERP.',
  'Tu peux parler ou écrire depuis n’importe quel module.',
  'Horizon doit comprendre le module et préparer une action simple.',
  'Si l’intention est floue, il doit demander une précision au lieu de créer une mauvaise fiche.',
  'Les impacts ERP doivent être visibles avant validation : stock, finance, document, tâche ou alerte.',
];

function ExampleCard({ group }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="font-black text-[#2f2415]">{group.title}</p><div className="mt-3 space-y-2">{group.examples.map((example) => <div key={example} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]">“{example}”</div>)}</div></div>;
}

export default function AssistantERPV2({ onOpenAssistant }) {
  return <div className="space-y-6">
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm overflow-hidden relative">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-200/45 blur-2xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Sun size={15} /> Centre d’aide Hey Horizon</p>
          <h1 className="mt-2 text-3xl font-black text-[#2f2415]">L’assistant n’est plus un module séparé</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#7d6a4a]">Hey Horizon est maintenant l’assistant global : tu l’ouvres avec le bouton soleil flottant, tu parles ou tu écris, et il t’aide à agir dans les modules de l’ERP.</p>
        </div>
        <button type="button" onClick={onOpenAssistant} className="rounded-2xl bg-[#2f2415] px-5 py-3 text-sm font-black text-white shadow-lg"><Mic size={17} className="inline mr-2" /> Ouvrir Hey Horizon</button>
      </div>
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><Sparkles size={20} className="text-emerald-700" /><p className="mt-3 font-black text-[#2f2415]">1. Parler ou écrire</p><p className="mt-1 text-sm text-emerald-800">Clique sur le soleil, puis sur Parler, ou écris ta demande.</p></div>
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><BookOpen size={20} className="text-amber-700" /><p className="mt-3 font-black text-[#2f2415]">2. Horizon comprend</p><p className="mt-1 text-sm text-amber-800">Il détecte le module : ventes, santé, stock, avicole, tâches, finances…</p></div>
      <div className="rounded-3xl border border-[#eadcc2] bg-white p-5"><CheckCircle2 size={20} className="text-[#9a6b12]" /><p className="mt-3 font-black text-[#2f2415]">3. Valider l’action</p><p className="mt-1 text-sm text-[#7d6a4a]">Tu vois ce qui sera créé ou modifié avant validation.</p></div>
    </section>

    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Exemples de commandes</p><h2 className="text-xl font-black text-[#2f2415] mt-1">Ce que tu peux dire à Hey Horizon</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{COMMAND_GROUPS.map((group) => <ExampleCard key={group.title} group={group} />)}</div>
    </section>

    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Règles produit</p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">{RULES.map((rule) => <div key={rule} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#7d6a4a]"><CheckCircle2 size={14} className="inline text-emerald-600" /> {rule}</div>)}</div>
    </section>
  </div>;
}
