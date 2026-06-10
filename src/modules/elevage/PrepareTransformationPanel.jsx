import { ArrowRight, Scissors } from 'lucide-react';

export default function PrepareTransformationPanel({
  mode = 'animal',
  rows = [],
  activity = '',
  onPrepareTransformation,
}) {
  const active = Array.isArray(rows) ? rows : [];
  const label = mode === 'animal'
    ? 'Préparer une transformation animale'
    : `Préparer transformation · ${activity === 'chair' ? 'poulets de chair' : 'lot avicole'}`;

  return (
    <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
      <p className="flex items-center gap-2 text-sm font-black text-[#2f2415]">
        <Scissors size={18} className="text-[#9a6b12]" />
        {label}
      </p>
      <p className="text-sm text-[#8a7456]">
        Le stock viande est créé uniquement dans l&apos;onglet <b>Transformation</b> après validation explicite.
        Cet écran ne crée pas le stock directement.
      </p>
      {active.length ? (
        <div className="flex flex-wrap gap-2">
          {active.slice(0, 8).map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onPrepareTransformation?.({
                animalId: mode === 'animal' ? row.id : undefined,
                lotId: mode === 'lot' ? row.id : undefined,
                activity,
                transformType: 'abattage',
                nom: row.name || row.nom || row.tag || row.id,
              })}
              className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-bold text-[#2f2415] hover:bg-[#dcfce7]"
            >
              {row.name || row.nom || row.tag || row.id}
              <ArrowRight size={14} />
            </button>
          ))}
          {active.length > 8 ? (
            <span className="text-xs text-[#8a7456]">+{active.length - 8} autre(s)</span>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[#8a7456]">Aucune cible active disponible.</p>
      )}
      <button
        type="button"
        onClick={() => onPrepareTransformation?.({ activity, transformType: 'abattage' })}
        className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white"
      >
        Ouvrir formulaire Transformation
      </button>
    </section>
  );
}
