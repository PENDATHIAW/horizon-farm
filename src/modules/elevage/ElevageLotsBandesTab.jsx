import { Beef, Drumstick, Egg, HeartPulse, Scale, ShoppingCart, Skull, Wheat } from 'lucide-react';
import { useEffect, useState } from 'react';
import AnimauxV2 from '../AnimauxV2';
import AvicoleV10 from '../AvicoleV10';
import ProductionHub from './ProductionHub.jsx';
import ElevageStartupPanel from './ElevageStartupPanel.jsx';
import { resolveElevageLotsSubview } from '../../utils/commercialNavigation.js';

function QuickAction({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[10px] font-black ${primary ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * Lots & bandes — sous-onglets Avicole / Animaux en tête, registre principal, performances en annexe.
 */
export default function ElevageLotsBandesTab({
  initialSubview = 'avicole',
  avicoleProps,
  animalProps,
  productionHubProps,
  showStartup,
  startupProgress,
  onNavigate,
  onOpenWorkflow,
  onSetTab,
  onLotsSubviewChange,
}) {
  const [view, setView] = useState(() => resolveElevageLotsSubview(initialSubview) || 'avicole');

  const changeView = (target) => {
    const sub = resolveElevageLotsSubview(target) || target;
    if (sub === 'avicole' || sub === 'animaux') {
      setView(sub);
      onLotsSubviewChange?.(sub);
    }
  };

  useEffect(() => {
    const sub = resolveElevageLotsSubview(initialSubview);
    if (sub) setView(sub);
  }, [initialSubview]);

  const navigateSubview = (target) => {
    const sub = resolveElevageLotsSubview(target);
    if (sub) changeView(sub);
    else onSetTab?.(target);
  };

  const openWorkflowScoped = (modal, ctx = {}) => {
    onOpenWorkflow?.(modal, { ...ctx, scope: view });
  };

  const avicoleActions = [
    { key: 'feeding', icon: Wheat, label: 'Aliment', primary: true, onClick: () => openWorkflowScoped('feeding') },
    { key: 'eggs', icon: Egg, label: 'Ponte', onClick: () => openWorkflowScoped('eggs') },
    { key: 'health', icon: HeartPulse, label: 'Santé', onClick: () => onSetTab?.('Santé') },
    { key: 'weighing', icon: Scale, label: 'Pesée', onClick: () => openWorkflowScoped('weighing') },
    { key: 'mortality', icon: Skull, label: 'Mortalité', onClick: () => openWorkflowScoped('mortality') },
    { key: 'sale', icon: ShoppingCart, label: 'Vente', onClick: () => onNavigate?.('commercial', { tab: 'Ventes' }) },
  ];

  const animauxActions = [
    { key: 'feeding', icon: Wheat, label: 'Aliment', primary: true, onClick: () => openWorkflowScoped('feeding') },
    { key: 'health', icon: HeartPulse, label: 'Santé', onClick: () => onSetTab?.('Santé') },
    { key: 'weighing', icon: Scale, label: 'Pesée', onClick: () => openWorkflowScoped('weighing') },
    { key: 'sale', icon: ShoppingCart, label: 'Vente', onClick: () => onNavigate?.('commercial', { tab: 'Ventes' }) },
  ];

  const quickActions = view === 'avicole' ? avicoleActions : animauxActions;

  return (
    <div className="space-y-4">
      {showStartup ? (
        <ElevageStartupPanel
          progress={startupProgress}
          setTab={(tab) => {
            const sub = resolveElevageLotsSubview(tab);
            if (sub) setView(sub);
            else onSetTab?.(tab);
          }}
          onNavigate={onNavigate}
          onOpenWorkflow={onOpenWorkflow}
        />
      ) : null}

      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#9a6b12]">Registre terrain</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changeView('avicole')}
            className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black sm:flex-none ${view === 'avicole' ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
          >
            <Drumstick size={18} aria-hidden="true" />
            Avicole & lots
          </button>
          <button
            type="button"
            onClick={() => changeView('animaux')}
            className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black sm:flex-none ${view === 'animaux' ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
          >
            <Beef size={18} aria-hidden="true" />
            Animaux & cheptel
          </button>
        </div>
        <p className="text-xs text-[#8a7456]">
          {view === 'avicole'
            ? 'Pondeuses, chair, ramassages et lots — le reste de la page s’adapte à l’avicole.'
            : 'Bovins, ovins, caprins et reproduction — performances filtrées pour le cheptel.'}
        </p>
        <div className={`grid gap-2 ${quickActions.length >= 5 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {quickActions.map((action) => (
            <QuickAction
              key={action.key}
              icon={action.icon}
              label={action.label}
              primary={action.primary}
              onClick={action.onClick}
            />
          ))}
        </div>
      </div>

      {view === 'avicole' ? <AvicoleV10 {...avicoleProps} /> : <AnimauxV2 {...animalProps} />}

      {productionHubProps ? (
        <ProductionHub
          {...productionHubProps}
          setTab={navigateSubview}
          contextView={view}
          placement="footer"
        />
      ) : null}
    </div>
  );
}
