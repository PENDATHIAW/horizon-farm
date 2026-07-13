import { MODULE_TABS_CONFIG } from '../../config/moduleTabs.config.js';
import { sortModuleTabsForFarm } from '../../config/farmAdaptation.js';

/**
 * Barre d'onglets pilotée par la configuration unique
 * (src/config/moduleTabs.config.js) : id, libellé du dictionnaire, rôle
 * requis et flag y sont déclarés. `role` masque les onglets dont
 * rolesMasques contient le rôle de l'utilisateur.
 */
export default function ModuleTabsBar({ moduleId, active, onChange, tabBadges = {}, wrap = false, activeFarm = null, role = null, rolesMasquesPour = null }) {
  const roleEffectif = role || rolesMasquesPour;
  const entrees = (MODULE_TABS_CONFIG[moduleId]?.onglets || [])
    .filter((entree) => !roleEffectif || !entree.rolesMasques?.includes(roleEffectif));
  const rawTabs = entrees.map((entree) => entree.libelle);
  const tabs = sortModuleTabsForFarm(moduleId, rawTabs, activeFarm);
  if (!tabs.length) return null;
  return (
    <div className={wrap ? '' : 'overflow-x-auto'}>
      <div className={`flex gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2 ${wrap ? 'flex-wrap' : 'min-w-max'}`}>
        {tabs.map((tab) => {
          const badge = tabBadges[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition whitespace-nowrap ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}
            >
              {tab}
              {badge > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${active === tab ? 'bg-[#052e16]/15 text-[#052e16]' : 'bg-amber-100 text-amber-800'}`}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
