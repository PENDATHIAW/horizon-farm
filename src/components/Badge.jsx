const STATUS_MAP = Object.freeze({
  sain: ['positive', 'Sain'],
  malade: ['urgent', 'Malade'],
  blesse: ['vigilance', 'Blessé'],
  blessé: ['vigilance', 'Blessé'],
  sous_traitement: ['vigilance', 'Sous traitement'],
  a_surveiller: ['vigilance', 'À surveiller'],
  critique: ['urgent', 'Critique'],
  vendu: ['neutral', 'Vendu'],
  vendu_partiellement: ['neutral', 'Vendu partiellement'],
  mort: ['neutral', 'Mort'],
  vole: ['urgent', 'Volé'],
  volé: ['urgent', 'Volé'],
  reforme: ['neutral', 'Réformé'],
  réformé: ['neutral', 'Réformé'],
  abattu: ['neutral', 'Abattu'],
  casse: ['vigilance', 'Cassé'],
  cassé: ['vigilance', 'Cassé'],
  fait: ['positive', 'Fait'],
  a_faire: ['vigilance', 'À faire'],
  retard: ['urgent', 'Retard'],
  actif: ['positive', 'Actif'],
  en_croissance: ['positive', 'En croissance'],
  en_ponte: ['positive', 'En ponte'],
  finition: ['vigilance', 'Finition'],
  pause: ['vigilance', 'En pause'],
  termine: ['neutral', 'Terminé'],
  terminé: ['neutral', 'Terminé'],
  non_reproductrice: ['neutral', 'Non reproductrice'],
  disponible: ['positive', 'Disponible'],
  en_gestation: ['vigilance', 'En gestation'],
  mise_bas_proche: ['vigilance', 'Mise bas proche'],
  a_reposer: ['neutral', 'À reposer'],
  infertile: ['urgent', 'Infertile'],
  inconnu: ['neutral', 'Inconnu'],
  semis: ['positive', 'Semis'],
  croissance: ['positive', 'Croissance'],
  floraison: ['vigilance', 'Floraison'],
  recolte: ['positive', 'Récolte'],
  récolte: ['positive', 'Récolte'],
  perdu: ['urgent', 'Perdu'],
});

const TONES = Object.freeze({
  positive: 'border-positive bg-positive-bg text-positive',
  vigilance: 'border-vigilance bg-vigilance-bg text-horizon-dark',
  urgent: 'border-urgent bg-urgent-bg text-urgent',
  neutral: 'border-line bg-neutral-bg text-neutral',
});

const COLOR_TONES = Object.freeze({
  red: 'urgent',
  amber: 'vigilance',
  green: 'positive',
  emerald: 'positive',
  sky: 'neutral',
  blue: 'neutral',
  gray: 'neutral',
  slate: 'neutral',
});

export default function Badge({ status, color, tone, children }) {
  const configured = STATUS_MAP[status] || ['neutral', status || '—'];
  const resolvedTone = tone || COLOR_TONES[color] || configured[0];
  const label = children || configured[1];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-meta font-medium ${TONES[resolvedTone] || TONES.neutral}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
