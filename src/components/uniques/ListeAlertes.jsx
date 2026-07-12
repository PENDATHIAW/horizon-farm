/**
 * Composant unique des listes d'alertes (chantier 4).
 * Accueil, Centre décisionnel et Activité & Suivi l'utilisent avec leurs
 * filtres. Les libellés et gravités viennent du catalogue central
 * (src/config/catalogueAlertes.js). L'action « créer une tâche » produit une
 * tâche portant l'alert_id (action corrective), jamais une entité à part.
 */
import { useMemo } from 'react';
import { BellRing } from 'lucide-react';
import { t } from '../../i18n/fr/index.js';
import { graviteAlerte, libelleAlerte } from '../../config/catalogueAlertes.js';
import { moduleLabel } from '../../config/modules.config.js';

const texte = (v) => String(v || '').trim();
const bas = (v) => texte(v).toLowerCase();
const ACTIVES = new Set(['nouvelle', 'ouverte', 'active', 'open', 'en_cours']);
const estActive = (alerte = {}) => !texte(alerte.status) || ACTIVES.has(bas(alerte.status));
const graviteDe = (alerte = {}) => bas(graviteAlerte(alerte.code || alerte.alert_code, alerte.severity));

/** Filtres : gravite, statut ('actives' par défaut), module, sansResponsable, limite. */
export function filtrerAlertes(alertes = [], filtres = {}) {
  const { gravite, statut = 'actives', module, sansResponsable, limite = 20 } = filtres;
  const rang = { critique: 0, critical: 0, warning: 1, info: 2 };
  return (Array.isArray(alertes) ? alertes : [])
    .filter((alerte) => (statut === 'actives' ? estActive(alerte) : statut === 'toutes' ? true : bas(alerte.status) === bas(statut)))
    .filter((alerte) => !gravite || graviteDe(alerte) === bas(gravite))
    .filter((alerte) => !module || bas(alerte.module_source) === bas(module))
    .filter((alerte) => !sansResponsable || !texte(alerte.assigned_to))
    .sort((a, b) => (rang[graviteDe(a)] ?? 3) - (rang[graviteDe(b)] ?? 3))
    .slice(0, limite);
}

const STYLE_GRAVITE = {
  critique: 'border-red-200 bg-red-50 text-red-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-[#eadcc2] bg-white text-[#8a7456]',
};

export default function ListeAlertes({ alertes = [], filtres = {}, onCreerTache, onNavigate, titre }) {
  const lignes = useMemo(() => filtrerAlertes(alertes, filtres), [alertes, filtres]);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#9a6b12]">
        <BellRing size={14} aria-hidden="true" />
        {titre || t('composants.alertes.titre')}
      </p>
      {lignes.length === 0 ? (
        <p className="mt-3 text-sm text-[#8a7456]">{t('composants.alertes.vide')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {lignes.map((alerte) => {
            const gravite = graviteDe(alerte);
            const module = texte(alerte.module_source);
            const titreAlerte = texte(alerte.title) || libelleAlerte(alerte.code || alerte.alert_code) || alerte.id;
            const urgenteSansResponsable = (gravite === 'critique' || gravite === 'critical') && !texte(alerte.assigned_to);
            return (
              <li key={alerte.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#2f2415]">
                    {urgenteSansResponsable ? t('composants.alertes.urgentSansResponsable', { objet: titreAlerte }) : titreAlerte}
                  </p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${STYLE_GRAVITE[gravite] || STYLE_GRAVITE.info}`}>
                    {gravite}
                  </span>
                </div>
                {texte(alerte.message) ? <p className="mt-1 text-xs text-[#8a7456]">{texte(alerte.message)}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {typeof onCreerTache === 'function' ? (
                    <button type="button" onClick={() => onCreerTache(alerte)} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
                      {t('composants.alertes.creerTache')}
                    </button>
                  ) : null}
                  {module && typeof onNavigate === 'function' ? (
                    <button type="button" onClick={() => onNavigate(module)} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]">
                      {t('composants.alertes.ouvrirSource', { module: moduleLabel(module) })}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
