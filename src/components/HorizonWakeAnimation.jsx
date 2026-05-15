import { Mic, Sun } from 'lucide-react';

export default function HorizonWakeAnimation({ state = 'idle' }) {
  const active = state !== 'idle';

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .horizon-wake-scene * { animation: none !important; }
        }

        /* Le bouton vocal terrain ne doit plus masquer les écrans métier. */
        button[class*="bottom-20"][class*="z-[66]"] {
          display: none !important;
        }

        .horizon-wake-scene {
          position: fixed;
          inset: 0;
          z-index: 70;
          pointer-events: none;
          overflow: hidden;
        }

        .horizon-field-glow {
          position: absolute;
          left: 0;
          bottom: -80px;
          width: 46vw;
          height: 240px;
          border-radius: 50% 50% 0 0;
          opacity: 0;
          background: radial-gradient(circle at 38% 0%, rgba(246,196,83,.52), rgba(34,197,94,.28) 28%, rgba(138,90,43,.22) 58%, transparent 75%);
          animation: horizonField 7.2s ease-in-out forwards;
        }

        .horizon-link-dot {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          opacity: 0;
          background: #f6c453;
          box-shadow: 0 0 20px rgba(246,196,83,.95), 0 0 42px rgba(34,197,94,.36);
          animation: horizonLinkDot 7.2s cubic-bezier(.2,.8,.2,1) forwards;
        }

        .horizon-link-dot::after {
          content: '';
          position: absolute;
          inset: -13px;
          border-radius: 999px;
          border: 1px solid rgba(246,196,83,.42);
          animation: horizonPulse 1.2s ease-out infinite;
        }

        .horizon-path {
          position: absolute;
          opacity: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(246,196,83,.96), rgba(255,255,255,.9), transparent);
          box-shadow: 0 0 20px rgba(246,196,83,.72), 0 0 45px rgba(34,197,94,.2);
        }
        .horizon-path.bottom { left: 5vw; bottom: 1.15rem; width: 78vw; height: 4px; animation: pathBottom 7.2s ease-in-out forwards; }
        .horizon-path.left { left: 1.05rem; bottom: 5vh; height: 72vh; width: 4px; background: linear-gradient(0deg, transparent, rgba(246,196,83,.96), rgba(255,255,255,.9), transparent); animation: pathLeft 7.2s ease-in-out forwards; }
        .horizon-path.top { left: 8vw; top: 1rem; width: 78vw; height: 4px; animation: pathTop 7.2s ease-in-out forwards; }
        .horizon-path.right { right: 1.05rem; top: 6vh; height: 58vh; width: 4px; background: linear-gradient(180deg, transparent, rgba(246,196,83,.96), rgba(255,255,255,.9), transparent); animation: pathRight 7.2s ease-in-out forwards; }

        .horizon-module-flash {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 18px;
          opacity: 0;
          background: radial-gradient(circle, rgba(246,196,83,.38), rgba(34,197,94,.12), transparent 70%);
          border: 1px solid rgba(246,196,83,.32);
          box-shadow: 0 0 28px rgba(246,196,83,.36);
          animation: moduleFlash 7.2s ease-in-out forwards;
        }
        .horizon-module-flash.m1 { left: 1.4rem; top: 18vh; animation-delay: .85s; }
        .horizon-module-flash.m2 { left: 1.4rem; top: 31vh; animation-delay: 1.35s; }
        .horizon-module-flash.m3 { left: 1.4rem; top: 44vh; animation-delay: 1.85s; }
        .horizon-module-flash.m4 { left: 1.4rem; top: 57vh; animation-delay: 2.35s; }
        .horizon-module-flash.m5 { right: 1.2rem; top: 14vh; animation-delay: 3.2s; }

        .horizon-sun-top {
          position: absolute;
          right: 1.2rem;
          top: 1.1rem;
          width: 118px;
          height: 118px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2f2415;
          opacity: 0;
          background: radial-gradient(circle, white 0 18%, #f6c453 19% 45%, rgba(255,231,143,.78) 46% 62%, transparent 63%);
          box-shadow: 0 0 42px rgba(246,196,83,.86), 0 0 110px rgba(246,196,83,.48);
          animation: sunTop 7.2s ease-in-out forwards, sunListen 2.2s ease-in-out 5.2s infinite;
        }
        .horizon-sun-top::before,
        .horizon-sun-top::after {
          content: '';
          position: absolute;
          inset: -18px;
          border-radius: 999px;
          border: 2px solid rgba(246,196,83,.42);
          animation: sunRing 1.8s ease-in-out 5.2s infinite;
        }
        .horizon-sun-top::after { inset: -34px; border-color: rgba(246,196,83,.2); animation-delay: 5.45s; }

        .horizon-listening {
          position: absolute;
          right: 1rem;
          top: 8.85rem;
          display: flex;
          align-items: center;
          gap: .42rem;
          opacity: 0;
          border: 1px solid rgba(246,196,83,.42);
          background: rgba(47,36,21,.86);
          color: #fff8dc;
          border-radius: 999px;
          padding: .55rem .8rem;
          font-size: .74rem;
          font-weight: 900;
          box-shadow: 0 18px 50px rgba(47,36,21,.18);
          animation: listeningBadge 7.2s ease-in-out forwards;
        }

        @keyframes horizonField { 0% { opacity: 0; transform: translateY(40px) scale(.86); } 12%,70% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(20px) scale(1.04); } }
        @keyframes horizonLinkDot {
          0% { opacity: 0; left: 10vw; bottom: 1.8rem; transform: scale(.4); }
          10% { opacity: 1; transform: scale(1); }
          22% { left: 1.2rem; bottom: 1.2rem; }
          40% { left: 1.2rem; bottom: 86vh; }
          58% { left: 84vw; bottom: calc(100vh - 1.2rem); }
          72% { left: calc(100vw - 1.2rem); bottom: 82vh; opacity: 1; }
          88% { left: calc(100vw - 4.75rem); bottom: calc(100vh - 4.75rem); transform: scale(1.35); }
          100% { left: calc(100vw - 4.75rem); bottom: calc(100vh - 4.75rem); opacity: 0; transform: scale(2.8); }
        }
        @keyframes pathBottom { 8%,28% { opacity: 1; transform: scaleX(1); } 0%,42%,100% { opacity: 0; transform: scaleX(.05); } }
        @keyframes pathLeft { 25%,46% { opacity: 1; transform: scaleY(1); } 0%,18%,58%,100% { opacity: 0; transform: scaleY(.05); } }
        @keyframes pathTop { 43%,66% { opacity: 1; transform: scaleX(1); } 0%,35%,78%,100% { opacity: 0; transform: scaleX(.05); } }
        @keyframes pathRight { 60%,82% { opacity: 1; transform: scaleY(1); } 0%,52%,92%,100% { opacity: 0; transform: scaleY(.05); } }
        @keyframes moduleFlash { 0%,100% { opacity: 0; transform: scale(.55); } 30%,70% { opacity: 1; transform: scale(1.15); } }
        @keyframes sunTop { 0%,70% { opacity: 0; transform: scale(.32) translateY(18px); } 84% { opacity: 1; transform: scale(1.12) translateY(0); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes sunListen { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
        @keyframes sunRing { 0%,100% { opacity: .32; transform: scale(.95); } 50% { opacity: .78; transform: scale(1.08); } }
        @keyframes listeningBadge { 0%,78% { opacity: 0; transform: translateY(8px); } 92%,100% { opacity: 1; transform: translateY(0); } }
        @keyframes horizonPulse { 0% { opacity: .8; transform: scale(.7); } 100% { opacity: 0; transform: scale(1.8); } }
      `}</style>

      {active ? (
        <div className="horizon-wake-scene">
          <div className="horizon-field-glow" />
          <div className="horizon-path bottom" />
          <div className="horizon-path left" />
          <div className="horizon-path top" />
          <div className="horizon-path right" />
          <div className="horizon-module-flash m1" />
          <div className="horizon-module-flash m2" />
          <div className="horizon-module-flash m3" />
          <div className="horizon-module-flash m4" />
          <div className="horizon-module-flash m5" />
          <div className="horizon-link-dot" />
          <div className="horizon-sun-top"><Sun size={42} /></div>
          <div className="horizon-listening"><Mic size={13} /> J’écoute</div>
        </div>
      ) : null}
    </>
  );
}