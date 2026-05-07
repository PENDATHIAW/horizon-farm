const STATUS_MAP = {
  sain: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Sain' },
  malade: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Malade' },
  blesse: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Blesse' },
  sous_traitement: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Sous traitement' },
  a_surveiller: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'A surveiller' },
  critique: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Critique' },
  vendu: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Vendu' },
  mort: { bg: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30', label: 'Mort' },
  vole: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Vole' },
  reforme: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Reforme' },
  casse: { bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Casse' },
  fait: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Fait' },
  a_faire: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'A faire' },
  retard: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Retard' },
  actif: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Actif' },
  en_croissance: { bg: 'bg-lime-500/20 text-lime-500 border-lime-500/30', label: 'En croissance' },
  en_ponte: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'En ponte' },
  finition: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Finition' },
  pause: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'En pause' },
  termine: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Termine' },
  non_reproductrice: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Non reproductrice' },
  disponible: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Disponible' },
  en_gestation: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'En gestation' },
  mise_bas_proche: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Mise bas proche' },
  a_reposer: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'A reposer' },
  infertile: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Infertile' },
  inconnu: { bg: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30', label: 'Inconnu' },
  semis: { bg: 'bg-lime-500/20 text-lime-500 border-lime-500/30', label: 'Semis' },
  croissance: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Croissance' },
  floraison: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Floraison' },
  recolte: { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: 'Recolte' },
  perdu: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Perdu' },
};

export default function Badge({ status }) {
  const state = STATUS_MAP[status] ?? {
    bg: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    label: status || '-',
  };

  return <span className={`text-xs px-2 py-1 rounded-full border font-medium ${state.bg}`}>{state.label}</span>;
}


