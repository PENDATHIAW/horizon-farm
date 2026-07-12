/**
 * Composant unique du journal des événements (chantier 4).
 * Lecture seule du journal métier (business_events) : Accueil, Activité & Suivi,
 * Élevage et Cultures l'utilisent avec leurs filtres ; aucune table parallèle.
 */
import { useMemo } from 'react';
import { BookOpenText } from 'lucide-react';
import { t } from '../../i18n/fr/index.js';
import { moduleLabel } from '../../config/modules.config.js';

const texte = (v) => String(v || '').trim();
const dateDe = (evt = {}) => texte(evt.event_date || evt.created_at || evt.date).slice(0, 10);

/** Applique les filtres du consommateur : module, entité, type, recherche, limite. */
export function filtrerEvenements(evenements = [], filtres = {}) {
  const { module, entiteId, type, recherche, limite = 30 } = filtres;
  const rech = texte(recherche).toLowerCase();
  return (Array.isArray(evenements) ? evenements : [])
    .filter((evt) => !module || [evt.module_source, evt.source_module, evt.related_module].map(texte).includes(module))
    .filter((evt) => !entiteId || [evt.entity_id, evt.source_record_id, evt.related_record_id].map(texte).includes(texte(entiteId)))
    .filter((evt) => !type || texte(evt.event_type) === texte(type))
    .filter((evt) => !rech || [evt.title, evt.description, evt.event_type].some((champ) => texte(champ).toLowerCase().includes(rech)))
    .sort((a, b) => dateDe(b).localeCompare(dateDe(a)))
    .slice(0, limite);
}

export default function JournalEvenements({ evenements = [], filtres = {}, onNavigate, titre }) {
  const lignes = useMemo(() => filtrerEvenements(evenements, filtres), [evenements, filtres]);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">
        <BookOpenText size={14} aria-hidden="true" />
        {titre || t('composants.journal.titre')}
      </p>
      {lignes.length === 0 ? (
        <p className="mt-3 text-sm text-[#8a7456]">{t('composants.journal.vide')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {lignes.map((evt) => {
            const module = texte(evt.module_source || evt.source_module);
            return (
              <li key={evt.id || `${evt.event_type}-${dateDe(evt)}-${evt.entity_id}`} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-[#2f2415]">{texte(evt.title) || texte(evt.event_type)}</p>
                  <span className="text-xs text-[#8a7456]">{dateDe(evt)}</span>
                </div>
                {texte(evt.description) ? <p className="mt-1 text-xs text-[#8a7456]">{texte(evt.description)}</p> : null}
                {module && typeof onNavigate === 'function' ? (
                  <button type="button" onClick={() => onNavigate(module)} className="mt-2 text-xs font-black text-[#9a6b12]">
                    {t('composants.journal.voirModule', { module: moduleLabel(module) })} →
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
