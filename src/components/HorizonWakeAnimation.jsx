import { Bot, Mic, Sparkles, Sun } from 'lucide-react';

export default function HorizonWakeAnimation({ state = 'idle', onWake }) {
  const active = state !== 'idle';

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .horizon-wake-scene * { animation: none !important; }
        }

        .horizon-wake-scene {
          position: fixed;
          inset: 0;
          z-index: 70;
          pointer-events: none;
          overflow: hidden;
        }

        .horizon-sky {
          position: absolute;
          inset: 0;
          opacity: 0;
          background:
            radial-gradient(circle at 50% 28%, rgba(246,196,83,.36), transparent 24%),
            linear-gradient(180deg, rgba(34,197,94,.07), transparent 42%, rgba(138,90,43,.08));
          animation: horizonSky 6.8s ease-in-out forwards;
        }

        .horizon-line {
          position: absolute;
          left: 8vw;
          right: 8vw;
          top: 38vh;
          height: 2px;
          opacity: 0;
          background: linear-gradient(90deg, transparent, rgba(34,197,94,.45), rgba(246,196,83,.95), rgba(34,197,94,.45), transparent);
          box-shadow: 0 0 22px rgba(246,196,83,.55), 0 0 55px rgba(34,197,94,.28);
          animation: horizonLine 6.8s ease-in-out forwards;
        }

        .horizon-earth {
          position: absolute;
          left: 50%;
          bottom: -70px;
          width: min(82vw, 840px);
          height: 220px;
          transform: translateX(-50%);
          border-radius: 50% 50% 0 0;
          opacity: 0;
          background: radial-gradient(circle at 50% 0%, rgba(246,196,83,.5), rgba(34,197,94,.24) 30%, rgba(138,90,43,.18) 56%, transparent 72%);
          filter: blur(1px);
          animation: horizonEarth 6.8s ease-in-out forwards;
        }

        .horizon-seed {
          position: absolute;
          left: 50%;
          bottom: 2.1rem;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #f6c453;
          box-shadow: 0 0 22px rgba(246,196,83,.95), 0 0 62px rgba(34,197,94,.42);
          opacity: 0;
          animation: horizonSeedRise 6.8s cubic-bezier(.2,.8,.2,1) forwards;
        }

        .horizon-beam {
          position: absolute;
          left: 50%;
          bottom: 2.6rem;
          width: 6px;
          height: 0;
          border-radius: 999px;
          transform: translateX(-50%);
          opacity: 0;
          background: linear-gradient(0deg, rgba(246,196,83,.96), rgba(255,255,255,.92), rgba(34,197,94,.38), transparent);
          box-shadow: 0 0 22px rgba(246,196,83,.7), 0 0 70px rgba(34,197,94,.26);
          animation: horizonBeam 6.8s ease-in-out forwards;
        }

        .horizon-orbit {
          position: absolute;
          left: 50%;
          top: 38vh;
          width: 260px;
          height: 260px;
          margin-left: -130px;
          margin-top: -130px;
          border-radius: 999px;
          border: 1px solid rgba(246,196,83,.18);
          opacity: 0;
          animation: horizonOrbit 6.8s ease-in-out forwards;
        }

        .horizon-orbit::before,
        .horizon-orbit::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 18px rgba(34,197,94,.8);
        }
        .horizon-orbit::before { left: 18px; top: 60px; }
        .horizon-orbit::after { right: 28px; bottom: 42px; background: #f6c453; box-shadow: 0 0 18px rgba(246,196,83,.8); }

        .horizon-main-sun {
          position: absolute;
          left: 50%;
          top: 38vh;
          width: 154px;
          height: 154px;
          margin-left: -77px;
          margin-top: -77px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2f2415;
          opacity: 0;
          background:
            radial-gradient(circle, white 0 16%, rgba(246,196,83,1) 17% 42%, rgba(255,232,151,.62) 43% 58%, rgba(34,197,94,.18) 59% 72%, transparent 73%);
          box-shadow: 0 0 42px rgba(246,196,83,.86), 0 0 110px rgba(246,196,83,.48), 0 0 190px rgba(34,197,94,.24);
          animation: horizonSunRise 6.8s ease-in-out forwards;
        }

        .horizon-main-sun::before,
        .horizon-main-sun::after {
          content: '';
          position: absolute;
          inset: -22px;
          border-radius: 999px;
          border: 2px solid rgba(246,196,83,.34);
          animation: horizonListeningRing 1.8s ease-in-out infinite;
        }
        .horizon-main-sun::after {
          inset: -42px;
          border-color: rgba(34,197,94,.18);
          animation-delay: .3s;
        }

        .horizon-caption {
          position: absolute;
          left: 50%;
          top: calc(38vh + 98px);
          transform: translateX(-50%);
          border: 1px solid rgba(246,196,83,.42);
          background: rgba(47,36,21,.86);
          color: #fff8dc;
          backdrop-filter: blur(14px);
          border-radius: 999px;
          padding: .72rem 1.1rem;
          font-weight: 900;
          letter-spacing: .015em;
          box-shadow: 0 20px 70px rgba(47,36,21,.28);
          opacity: 0;
          white-space: nowrap;
          animation: horizonCaption 6.8s ease-in-out forwards;
        }

        .horizon-listening-badge {
          position: absolute;
          left: 50%;
          top: calc(38vh + 145px);
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: .5rem;
          border: 1px solid rgba(34,197,94,.32);
          background: rgba(236,253,245,.92);
          color: #047857;
          border-radius: 999px;
          padding: .55rem .9rem;
          font-size: .78rem;
          font-weight: 900;
          opacity: 0;
          box-shadow: 0 18px 60px rgba(34,197,94,.16);
          animation: horizonListeningBadge 6.8s ease-in-out forwards;
        }

        .horizon-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          opacity: 0;
          background: #f6c453;
          box-shadow: 0 0 18px rgba(246,196,83,.9);
          animation: horizonParticle 6.8s ease-in-out forwards;
        }
        .horizon-particle.p1 { left: 30%; top: 50%; animation-delay: .8s; }
        .horizon-particle.p2 { left: 19%; top: 32%; animation-delay: 1.3s; background: #22c55e; }
        .horizon-particle.p3 { right: 22%; top: 30%; animation-delay: 2s; }
        .horizon-particle.p4 { right: 31%; top: 52%; animation-delay: 2.5s; background: #22c55e; }
        .horizon-particle.p5 { left: 50%; top: 22%; animation-delay: 3.1s; }

        @keyframes horizonSky { 0%,100% { opacity: 0; } 12%,92% { opacity: 1; } }
        @keyframes horizonLine { 0%,16% { opacity: 0; transform: scaleX(.05); } 30%,100% { opacity: 1; transform: scaleX(1); } }
        @keyframes horizonEarth { 0% { opacity: 0; transform: translateX(-50%) translateY(60px) scale(.82); } 14%,88% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } 100% { opacity: 0; transform: translateX(-50%) translateY(18px) scale(1.08); } }
        @keyframes horizonSeedRise { 0% { opacity: 0; left: 50%; bottom: 2.1rem; transform: scale(.4); } 12% { opacity: 1; transform: scale(1); } 52% { left: 50%; bottom: 62vh; transform: scale(1.25); } 72% { opacity: 0; left: 50%; bottom: 62vh; transform: scale(3); } 100% { opacity: 0; } }
        @keyframes horizonBeam { 0%,10% { opacity: 0; height: 0; } 18%,54% { opacity: 1; height: calc(62vh - 2rem); } 75%,100% { opacity: 0; height: calc(62vh - 2rem); } }
        @keyframes horizonOrbit { 0%,46% { opacity: 0; transform: scale(.5) rotate(-20deg); } 66%,100% { opacity: .95; transform: scale(1) rotate(12deg); } }
        @keyframes horizonSunRise { 0%,48% { opacity: 0; transform: scale(.2) translateY(22px); } 64% { opacity: 1; transform: scale(1.1) translateY(0); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes horizonCaption { 0%,20% { opacity: 0; transform: translateX(-50%) translateY(12px); } 34%,78% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-8px); } }
        @keyframes horizonListeningBadge { 0%,62% { opacity: 0; transform: translateX(-50%) translateY(8px); } 74%,100% { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes horizonParticle { 0%,100% { opacity: 0; transform: translateY(22px) scale(.6); } 36%,78% { opacity: .95; transform: translateY(-14px) scale(1); } }
        @keyframes horizonListeningRing { 0%,100% { opacity: .34; transform: scale(.95); } 50% { opacity: .92; transform: scale(1.08); } }
      `}</style>

      {active ? (
        <div className="horizon-wake-scene">
          <div className="horizon-sky" />
          <div className="horizon-earth" />
          <div className="horizon-line" />
          <div className="horizon-beam" />
          <div className="horizon-seed" />
          <div className="horizon-particle p1" />
          <div className="horizon-particle p2" />
          <div className="horizon-particle p3" />
          <div className="horizon-particle p4" />
          <div className="horizon-particle p5" />
          <div className="horizon-orbit" />
          <div className="horizon-main-sun"><Sun size={48} /></div>
          <div className="horizon-caption">🌱 De la terre à l’horizon…</div>
          <div className="horizon-listening-badge"><Mic size={14} /> Horizon écoute</div>
        </div>
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
            <span className="block text-[10px] text-[#f8e8b6]">Mode soleil</span>
          </span>
          <Sparkles size={15} className="text-[#f8e8b6]" />
        </span>
      </button>
    </>
  );
}
