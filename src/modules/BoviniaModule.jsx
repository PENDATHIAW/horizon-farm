const products = [
  {
    name: 'WELLNESS',
    color: 'Vert sauge',
    role: 'Bien-être quotidien',
    formula: 'Bone broth + thé vert, ananas, mandarine, menthe, citron',
  },
  {
    name: 'BLOOM',
    color: 'Rose poudré',
    role: 'Grossesse & post-partum',
    formula: 'Bone broth + gingembre doux, rooibos, notes fruitées douces',
  },
  {
    name: 'PERIOD!',
    color: 'Bordeaux',
    role: 'Confort du cycle féminin',
    formula: 'Bone broth + plantes douces à valider techniquement',
  },
  {
    name: 'PULSE',
    color: 'Orange brûlé',
    role: 'Performance & vitalité',
    formula: 'Bone broth + agrumes, vitamine C naturelle, récupération',
  },
  {
    name: 'CALM',
    color: 'Bleu nuit',
    role: 'Sommeil & récupération',
    formula: 'Bone broth + verveine, camomille, citronnelle, vanille',
  },
];

const roadmap = [
  'Sécuriser la matière première issue de Horizon Farm et des circuits partenaires.',
  'Documenter la traçabilité des os, pattes de poulet et lots de transformation.',
  'Tester les recettes, goûts, dosages, séchage, conservation et stabilité produit.',
  'Valider le packaging : sticks 30 jours, boîte mensuelle, prix cible accessible.',
  'Préparer conformité alimentaire, étiquetage, dossier qualité et lancement progressif.',
];

const controlPoints = [
  'Matières premières disponibles et origine tracée',
  'Rendement après cuisson, filtration, déshydratation et broyage',
  'Coût par stick, coût par boîte et marge estimée',
  'Tests qualité : humidité, conservation, odeur, goût, texture, homogénéité',
  'Ventes pilotes, retours clients, réachats et réclamations',
];

const connections = [
  ['Élevage', 'Origine matière et coproduits', 'elevage', 'Transformation'],
  ['Achats & Stock', 'Intrants, emballages, sticks', 'achats_stock', 'Inventaire'],
  ['Commercial', 'Ventes pilotes et retours', 'commercial', 'Ventes'],
  ['Documents', 'Conformité, fiches, preuves', 'documents_rapports', 'Centre de contrôle'],
];

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
      <p className="text-lg font-black text-[#2f2415]">{title}</p>
      {children}
    </section>
  );
}

function Card({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">{title}</p>
      <p className="mt-1 text-lg font-black text-[#2f2415]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8a7456] leading-relaxed">{hint}</p> : null}
    </div>
  );
}

function ConnectionCard({ title, hint, moduleId, tab, onNavigate }) {
  const content = (
    <>
      <p className="font-black text-[#2f2415]">{title}</p>
      <p className="mt-1 text-xs text-[#8a7456]">{hint}</p>
    </>
  );

  if (typeof onNavigate !== 'function') {
    return <div className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 text-left">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(moduleId, tab ? { tab } : {})}
      className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 text-left hover:bg-[#f8f1e4]"
    >
      {content}
    </button>
  );
}

export default function BoviniaModule({ onNavigate } = {}) {
  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 space-y-2">
        <p className="text-2xl font-black text-[#2f2415]">BOVINIA</p>
        <p className="text-sm text-[#8a7456] leading-relaxed max-w-4xl">
          Module de pilotage de la future gamme bone broth de Horizon Farm : valorisation alimentaire
          des coproduits animaux, transformation contrôlée, traçabilité, coûts, conformité et ventes pilotes.
        </p>
        <p className="text-xs rounded-2xl border border-[#eadcc2] bg-white p-3 text-[#2f2415] leading-relaxed">
          BOVINIA est positionné comme une phase de valorisation future. Le module permet de préparer le projet
          sans mélanger la ferme de départ, AGRI FEEDS et les produits alimentaires finis.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card title="Position" value="Phase 3" hint="Après stabilisation ferme + AGRI FEEDS" />
        <Card title="Format cible" value="30 sticks" hint="Boîte mensuelle, prix accessible" />
        <Card title="Gamme" value="5 produits" hint="Wellness, Bloom, Period!, Pulse, Calm" />
        <Card title="Priorité ERP" value="Traçabilité" hint="Matière, lot, coût, qualité, vente" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Gamme BOVINIA">
          <div className="space-y-3">
            {products.map((product) => (
              <article key={product.name} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-black text-[#2f2415]">{product.name}</p>
                  <span className="rounded-xl border border-[#d6c3a0] bg-white px-2 py-1 text-[11px] font-bold text-[#8a7456]">
                    {product.color}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-[#2f2415]">{product.role}</p>
                <p className="mt-1 text-xs text-[#8a7456] leading-relaxed">{product.formula}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Roadmap opérationnelle">
          <div className="space-y-2">
            {roadmap.map((step, index) => (
              <div key={step} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#2f2415] leading-relaxed">
                <span className="font-black">Étape {index + 1}.</span> {step}
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Ce que l’ERP doit suivre pour BOVINIA">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {controlPoints.map((point) => (
            <div key={point} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#2f2415]">
              {point}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Connexions avec les modules existants">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {connections.map(([title, hint, moduleId, tab]) => (
            <ConnectionCard
              key={title}
              title={title}
              hint={hint}
              moduleId={moduleId}
              tab={tab}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
