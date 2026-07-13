const PDF_URL = 'https://github.com/PENDATHIAW/horizon-farm/raw/main/public/HORIZON_FARM_DOSSIER.pdf';

const businessUnits = [
  ['Élevage intégré', 'Embouche bovine, aviculture, œufs, fumier et suivi sanitaire centralisé.'],
  ['ERP Horizon Farm', 'Pilotage finance, stock, commercial, documents, objectifs, IA et traçabilité.'],
  ['Transformation', 'Valorisation des sous-produits, chaîne de valeur locale et produits finis.'],
  ['Économie circulaire', 'Valorisation locale des sous-produits agricoles dans des filières utiles et traçables.'],
];

const metrics = [
  ['17+', 'modules ERP interconnectés'],
  ['5 ans', 'roadmap de croissance'],
  ['100%', 'traçabilité visée'],
  ['360°', 'pilotage exploitation + investisseur'],
];

function Header() {
  return (
    <header className="nav">
      <div className="brand"><span>HF</span><strong>Horizon Farm</strong></div>
      <nav>
        <a href="#vision">Vision</a>
        <a href="#units">Pôles</a>
        <a href="#impact">Impact</a>
        <a href="#investors">Investisseurs</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="heroText">
        <p className="eyebrow">Ferme intégrée · ERP agricole · Traçabilité</p>
        <h1>Horizon Farm transforme l’élevage en chaîne de valeur pilotée par la donnée.</h1>
        <p className="lead">Un projet agricole sénégalais pensé pour produire, tracer, vendre, financer et valoriser chaque ressource, de la ferme au marché.</p>
        <div className="actions">
          <a className="primary" href={PDF_URL} target="_blank" rel="noreferrer">Télécharger le dossier investisseur</a>
          <a className="secondary" href="#units">Découvrir les pôles</a>
        </div>
      </div>
      <div className="heroCard">
        <p>Farm to Future</p>
        <h2>Une exploitation connectée, rentable et durable.</h2>
        <ul>
          <li>Suivi élevage, production, stock et ventes</li>
          <li>Finance & pilotage reliés au Business Plan</li>
          <li>Documents, preuves et traçabilité intégrés</li>
        </ul>
      </div>
    </section>
  );
}

function Metrics() {
  return <section className="metrics">{metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>;
}

function BusinessUnits() {
  return (
    <section id="units" className="section">
      <p className="eyebrow">Business units</p>
      <h2>Une ferme, plusieurs moteurs de revenus.</h2>
      <div className="grid">{businessUnits.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
  );
}

function Traceability() {
  return (
    <section id="vision" className="split section">
      <div>
        <p className="eyebrow">Traçabilité</p>
        <h2>Chaque opération devient une donnée utile.</h2>
      </div>
      <div className="steps">
        {['Production', 'Stock', 'Vente', 'Finance', 'Document', 'Décision'].map((step, index) => <div key={step}><span>{index + 1}</span>{step}</div>)}
      </div>
    </section>
  );
}

function Impact() {
  return (
    <section id="impact" className="section impact">
      <p className="eyebrow">Impact</p>
      <h2>Un modèle pensé pour le Sénégal et extensible à l’Afrique de l’Ouest.</h2>
      <p>Horizon Farm combine production locale, outils numériques, discipline financière et valorisation des matières premières pour bâtir une exploitation plus lisible, plus finançable et plus résiliente.</p>
    </section>
  );
}

function Investors() {
  return (
    <section id="investors" className="section investors">
      <p className="eyebrow">Investisseurs & partenaires</p>
      <h2>Dossier prêt pour banques, fonds, partenaires et programmes agricoles.</h2>
      <p>Le dossier investisseur présente la vision, la chaîne de valeur, les besoins, la roadmap, les pôles de revenus et la logique financière du projet.</p>
      <a className="primary" href={PDF_URL} target="_blank" rel="noreferrer">Ouvrir le dossier PDF</a>
    </section>
  );
}

function Footer() {
  return <footer>© 2026 Horizon Farm — Tous droits réservés.</footer>;
}

export default function App() {
  return <><Header /><main><Hero /><Metrics /><BusinessUnits /><Traceability /><Impact /><Investors /></main><Footer /></>;
}
