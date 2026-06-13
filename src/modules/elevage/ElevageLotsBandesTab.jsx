import { Beef, Drumstick, Egg, HeartPulse, Scale, ShoppingCart, Wheat } from 'lucide-react';
import { useState } from 'react';
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
      className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl px-2 py-2 text-[10px] font-black ${primary ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * Lots & bandes — registre avicole + cheptel, production quotidienne et workflows terrain.
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
}) {
  const [view, setView] = useState(() => resolveElevageLotsSubview(initialSubview) || 'avicole');

  const navigateSubview = (target) => {
    const sub = resolveElevageLotsSubview(target);
    if (sub) setView(sub);
    else onSetTab?.(target);
  };

  return (
    <div className="space-y-5">
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

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#9a6b12]">Actions terrain</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <QuickAction icon={Wheat} label="Aliment" onClick={() => onOpenWorkflow?.('feeding')} primary />
          <QuickAction icon={Egg} label="Ponte" onClick={() => onOpenWorkflow?.('eggs')} />
          <QuickAction icon={HeartPulse} label="Santé" onClick={() => onSetTab?.('Santé')} />
          <QuickAction icon={Scale} label="Pesée" onClick={() => onOpenWorkflow?.('weighing')} />
          <QuickAction icon={ShoppingCart} label="Vente" onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </section>

      {productionHubProps ? (
        <ProductionHub {...productionHubProps} setTab={navigateSubview} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('avicole')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${view === 'avicole' ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
        >
          <Drumstick size={16} aria-hidden="true" />
          Avicole & lots
        </button>
        <button
          type="button"
          onClick={() => setView('animaux')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${view === 'animaux' ? 'bg-[#2f2415] text-white' : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}
        >
          <Beef size={16} aria-hidden="true" />
          Animaux & cheptel
        </button>
      </div>

      {view === 'avicole' ? <AvicoleV10 {...avicoleProps} /> : <AnimauxV2 {...animalProps} />}
    </div>
  );
}
