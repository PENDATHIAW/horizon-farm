const STATUS_MAP = {
  sain: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Sain' },
  malade: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Malade' },
  blesse: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Blessé' },
  blessé: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Blessé' },
  sous_traitement: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Sous traitement' },
  a_surveiller: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'À surveiller' },
  critique: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Critique' },
  vendu: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Vendu' },
  vendu_partiellement: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Vendu partiellement' },
  mort: { bg: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30', label: 'Mort' },
  vole: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Volé' },
  volé: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Volé' },
  reforme: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Réformé' },
  réformé: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Réformé' },
  abattu: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Abattu' },
  casse: { bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Cassé' },
  cassé: { bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Cassé' },
  fait: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Fait' },
  a_faire: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'À faire' },
  retard: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Retard' },
  actif: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Actif' },
  en_croissance: { bg: 'bg-lime-500/20 text-lime-500 border-lime-500/30', label: 'En croissance' },
  en_ponte: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'En ponte' },
  finition: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Finition' },
  pause: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'En pause' },
  termine: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Terminé' },
  terminé: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Terminé' },
  non_reproductrice: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Non reproductrice' },
  disponible: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Disponible' },
  en_gestation: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'En gestation' },
  mise_bas_proche: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Mise bas proche' },
  a_reposer: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'À reposer' },
  infertile: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Infertile' },
  inconnu: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Inconnu' },
  semis: { bg: 'bg-lime-500/20 text-lime-500 border-lime-500/30', label: 'Semis' },
  croissance: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Croissance' },
  floraison: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Floraison' },
  recolte: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Récolte' },
  récolte: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Récolte' },
  perdu: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Perdu' },
};

const COLOR_MAP = {
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  gray: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function Badge({ status, color, children }) {
  if (children) {
    const bg = COLOR_MAP[color] || COLOR_MAP.gray;
    return <span className={`text-xs px-2 py-1 rounded-full border font-medium ${bg}`}>{children}</span>;
  }

  const state = STATUS_MAP[status] ?? {
    bg: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    label: status || '-',
  };

  return <span className={`text-xs px-2 py-1 rounded-full border font-medium ${state.bg}`}>{state.label}</span>;
}
