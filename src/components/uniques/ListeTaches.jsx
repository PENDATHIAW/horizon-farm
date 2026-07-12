/**
 * Composant unique des listes de tâches (chantier 4).
 * Accueil (Mes actions), Activité & Suivi et Centre décisionnel l'utilisent
 * avec leurs filtres. Une action corrective est une tâche portant un
 * alert_id, jamais une entité à part : le filtre actionsCorrectives ne fait
 * que filtrer sur ce champ.
 */
import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { t } from '../../i18n/fr/index.js';

const texte = (v) => String(v || '').trim();
const bas = (v) => texte(v).toLowerCase();
const OUVERTES = new Set(['a_faire', 'à faire', 'en_cours', 'en cours', 'todo', 'in_progress', 'nouvelle', 'ouverte', 'open']);
const estOuverte = (tache = {}) => !texte(tache.status) || OUVERTES.has(bas(tache.status));
const echeance = (tache = {}) => texte(tache.due_date || tache.echeance).slice(0, 10);
const aujourdHui = () => new Date().toISOString().slice(0, 10);

/** Filtres : assigne, statut ('ouvertes' par défaut), priorite, actionsCorrectives, module, limite. */
export function filtrerTaches(taches = [], filtres = {}) {
  const { assigne, statut = 'ouvertes', priorite, actionsCorrectives, module, limite = 20 } = filtres;
  return (Array.isArray(taches) ? taches : [])
    .filter((tache) => (statut === 'ouvertes' ? estOuverte(tache) : statut === 'toutes' ? true : bas(tache.status) === bas(statut)))
    .filter((tache) => !assigne || bas(tache.assigned_to) === bas(assigne))
    .filter((tache) => !priorite || bas(tache.priority) === bas(priorite))
    .filter((tache) => !actionsCorrectives || texte(tache.alert_id))
    .filter((tache) => !module || bas(tache.module_lie) === bas(module))
    .sort((a, b) => (echeance(a) || '9999').localeCompare(echeance(b) || '9999'))
    .slice(0, limite);
}

function BadgeEcheance({ tache }) {
  const date = echeance(tache);
  if (!date) return null;
  const jour = aujourdHui();
  const enRetard = date < jour && estOuverte(tache);
  const ceJour = date === jour;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${enRetard ? 'border-red-200 bg-red-50 text-red-700' : ceJour ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#eadcc2] bg-white text-[#8a7456]'}`}>
      {enRetard ? t('composants.taches.enRetard') : ceJour ? t('composants.taches.aujourdHui') : t('composants.taches.echeance', { date })}
    </span>
  );
}

export default function ListeTaches({ taches = [], filtres = {}, onOuvrirTache, titre }) {
  const lignes = useMemo(() => filtrerTaches(taches, filtres), [taches, filtres]);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">
        <ClipboardList size={14} aria-hidden="true" />
        {titre || t('composants.taches.titre')}
      </p>
      {lignes.length === 0 ? (
        <p className="mt-3 text-sm text-[#8a7456]">{t('composants.taches.vide')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {lignes.map((tache) => (
            <li key={tache.id}>
              <button
                type="button"
                onClick={typeof onOuvrirTache === 'function' ? () => onOuvrirTache(tache) : undefined}
                className="w-full rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#2f2415]">{texte(tache.title) || tache.id}</p>
                  <BadgeEcheance tache={tache} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8a7456]">
                  {texte(tache.assigned_to) ? <span>{texte(tache.assigned_to)}</span> : null}
                  {texte(tache.priority) ? <span className="uppercase">{texte(tache.priority)}</span> : null}
                  {texte(tache.alert_id) ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-black text-amber-800">
                      {t('composants.taches.actionCorrective')}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
