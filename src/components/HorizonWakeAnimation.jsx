import { Bot, Mic, Sun } from 'lucide-react';

export default function HorizonWakeAnimation({ state = 'idle', onWake }) {
  const active = state !== 'idle';

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .horizon-lightning,
          .horizon-sun,
          .horizon-glow { animation: none !important; }
        }
        .horizon-lightning {
          position: fixed;
          left: 50%;
          bottom: 2rem;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #f6c453;
          box-shadow: 0 0 16px rgba(246,196,83,.95), 0 0 36px rgba(34,197,94,.38);
          z-index: 70;
          pointer-events: none;
          opacity: 0;
          animation: horizonCircuit 2.05s ease-in-out forwards;
        }
        .horizon-lightning::after {
          content: '';
          position: absolute;
          width: 80px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, #f6c453, #22c55e, transparent);
          transform: translate(-72px, 3px) rotate(-16deg);
          filter: blur(.2px);
        }
        .horizon-glow {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(circle at 50% 100%, rgba(246,196,83,.18), transparent 28%), radial-gradient(circle at 90% 90%, rgba(34,197,94,.12), transparent 25%);
          animation: horizonGlow 2.2s ease-in-out forwards;
        }
        .horizon-sun {
          position: fixed;
          right: 1rem;
          bottom: 1rem;
          width: 86px;
          height: 86px;
          border-radius: 999px;
          z-index: 71;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(circle, rgba(255,255,255,.96) 0 24%, rgba(246,196,83,.86) 25% 48%, rgba(34,197,94,.22) 49% 68%, transparent 69%);
          box-shadow: 0 0 28px rgba(246,196,83,.7), 0 0 70px rgba(34,197,94,.28);
          animation: horizonSun 2.45s ease-in-out forwards;
        }
        @keyframes horizonCircuit {
          0% { opacity: 0; left: 50%; bottom: 1.25rem; transform: scale(.7); }
          10% { opacity: 1; left: 50%; bottom: 1.25rem; transform: scale(1); }
          28% { left: 1.25rem; bottom: 1.25rem; }
          46% { left: 1.25rem; bottom: calc(100vh - 1.25rem); }
          64% { left: calc(100vw - 1.25rem); bottom: calc(100vh - 1.25rem); }
          82% { left: calc(100vw - 1.25rem); bottom: 1.25rem; opacity: 1; }
          100% { left: calc(100vw - 3.5rem); bottom: 3.5rem; opacity: 0; transform: scale(1.8); }
        }
        @keyframes horizonGlow {
          0%, 100% { opacity: 0; }
          28%, 76% { opacity: 1; }
        }
        @keyframes horizonSun {
          0%, 72% { opacity: 0; transform: scale(.35); }
          86% { opacity: 1; transform: scale(1.08); }
          100% { opacity: .9; transform: scale(1); }
        }
      `}</style>

      {active ? (
        <>
          <div className="horizon-glow" />
          <div className="horizon-lightning" />
          <div className="horizon-sun flex items-center justify-center text-[#2f2415]"><Sun size={26} /></div>
        </>
      ) : null}

      <button
        type="button"
        onClick={onWake}
        className="fixed right-4 bottom-4 z-[65] group rounded-full border border-[#f6c453]/70 bg-[#2f2415] text-white shadow-2xl hover:scale-105 transition-transform"
        title="Hey Horizon"
      >
        <span className="absolute inset-0 rounded-full bg-[#f6c453]/20 blur-xl group-hover:bg-[#f6c453]/35" />
        <span className="relative flex items-center gap-2 px-4 py-3">
          <span className="w-9 h-9 rounded-full bg-[#f6c453] text-[#2f2415] flex items-center justify-center shadow-lg"><Bot size={18} /></span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-xs font-black">Hey Horizon</span>
            <span className="block text-[10px] text-[#f8e8b6]">Je t'écoute</span>
          </span>
          <Mic size={15} className="text-[#f8e8b6]" />
        </span>
      </button>
    </>
  );
}
