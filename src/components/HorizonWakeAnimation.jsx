import { Mic, Sun, X } from 'lucide-react';

export default function HorizonWakeAnimation({ state = 'idle', onClose }) {
  const active = state !== 'idle';

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .horizon-wake-scene * { animation: none !important; }
        }

        /* L'ancien bouton terrain en bas ne doit plus doubler le bouton soleil global. */
        button[class*="bottom-20"][class*="z-[66]"] { display: none !important; }

        .horizon-wake-scene {
          position: fixed;
          right: 18px;
          top: 72px;
          width: min(430px, calc(100vw - 28px));
          height: min(520px, calc(100vh - 110px));
          z-index: 47;
          pointer-events: auto;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(214,195,160,.72);
          background: radial-gradient(circle at 80% 5%, rgba(246,196,83,.16), transparent 30%), rgba(255,253,248,.92);
          box-shadow: 0 28px 80px rgba(47,36,21,.18);
          backdrop-filter: blur(12px);
        }

        .horizon-wake-close {
          position: absolute;
          right: .75rem;
          top: .75rem;
          z-index: 6;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(214,195,160,.72);
          background: rgba(255,255,255,.84);
          color: #7d6a4a;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(47,36,21,.12);
        }

        .horizon-wake-caption {
          position: absolute;
          left: 1rem;
          top: .95rem;
          z-index: 5;
          max-width: calc(100% - 72px);
        }

        .horizon-wake-caption p:first-child {
          margin: 0;
          font-size: .68rem;
          font-weight: 900;
          color: #9a6b12;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .horizon-wake-caption p:last-child {
          margin: .2rem 0 0;
          font-size: .82rem;
          font-weight: 800;
          color: #2f2415;
        }

        .horizon-field-glow {
          position: absolute;
          left: -42px;
          bottom: -72px;
          width: 78%;
          height: 210px;
          border-radius: 50% 50% 0 0;
          opacity: 0;
          background: radial-gradient(circle at 38% 0%, rgba(246,196,83,.52), rgba(34,197,94,.28) 28%, rgba(138,90,43,.22) 58%, transparent 75%);
          animation: horizonField 4.8s ease-in-out forwards;
        }

        .horizon-link-dot {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          opacity: 0;
          background: #f6c453;
          box-shadow: 0 0 20px rgba(246,196,83,.95), 0 0 42px rgba(34,197,94,.36);
          animation: horizonLinkDot 4.8s cubic-bezier(.2,.8,.2,1) forwards;
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
        .horizon-path.bottom { left: 8%; bottom: 2.8rem; width: 72%; height: 4px; animation: pathBottom 4.8s ease-in-out forwards; }
        .horizon-path.left { left: 1.25rem; bottom: 4rem; height: 62%; width: 4px; background: linear-gradient(0deg, transparent, rgba(246,196,83,.96), rgba(255,255,255,.9), transparent); animation: pathLeft 4.8s ease-in-out forwards; }
        .horizon-path.top { left: 12%; top: 4.4rem; width: 64%; height: 4px; animation: pathTop 4.8s ease-in-out forwards; }
        .horizon-path.right { right: 2.8rem; top: 5rem; height: 46%; width: 4px; background: linear-gradient(180deg, transparent, rgba(246,196,83,.96), rgba(255,255,255,.9), transparent); animation: pathRight 4.8s ease-in-out forwards; }

        .horizon-module-flash {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 18px;
          opacity: 0;
          background: radial-gradient(circle, rgba(246,196,83,.38), rgba(34,197,94,.12), transparent 70%);
          border: 1px solid rgba(246,196,83,.32);
          box-shadow: 0 0 28px rgba(246,196,83,.36);
          animation: moduleFlash 4.8s ease-in-out forwards;
        }
        .horizon-module-flash.m1 { left: 1.4rem; top: 23%; animation-delay: .55s; }
        .horizon-module-flash.m2 { left: 1.4rem; top: 38%; animation-delay: .9s; }
        .horizon-module-flash.m3 { left: 1.4rem; top: 53%; animation-delay: 1.25s; }
        .horizon-module-flash.m4 { left: 1.4rem; top: 68%; animation-delay: 1.6s; }
        .horizon-module-flash.m5 { right: 1.5rem; top: 25%; animation-delay: 2.1s; }

        .horizon-sun-top {
          position: absolute;
          right: 2.1rem;
          top: 4.9rem;
          width: 92px;
          height: 92px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2f2415;
          opacity: 0;
          background: radial-gradient(circle, white 0 18%, #f6c453 19% 45%, rgba(255,231,143,.78) 46% 62%, transparent 63%);
          box-shadow: 0 0 42px rgba(246,196,83,.86), 0 0 95px rgba(246,196,83,.38);
          animation: sunTop 4.8s ease-in-out forwards, sunListen 2.2s ease-in-out 3.45s infinite;
        }
        .horizon-sun-top::before,
        .horizon-sun-top::after {
          content: '';
          position: absolute;
          inset: -14px;
          border-radius: 999px;
          border: 2px solid rgba(246,196,83,.42);
          animation: sunRing 1.8s ease-in-out 3.45s infinite;
        }
        .horizon-sun-top::after { inset: -26px; border-color: rgba(246,196,83,.2); animation-delay: 3.65s; }

        .horizon-listening {
          position: absolute;
          right: 1.2rem;
          top: 11.3rem;
          display: flex;
          align-items: center;
          gap: .42rem;
          opacity: 0;
          border: 1px solid rgba(246,196,83,.42);
          background: rgba(47,36,21,.88);
          color: #fff8dc;
          border-radius: 999px;
          padding: .55rem .8rem;
          font-size: .74rem;
          font-weight: 900;
          box-shadow: 0 18px 50px rgba(47,36,21,.18);
          animation: listeningBadge 4.8s ease-in-out forwards;
        }

        @media (max-width: 767px) {
          .horizon-wake-scene {
            top: auto;
            right: 12px;
            bottom: 98px;
            width: calc(100vw - 24px);
            height: min(430px, calc(100vh - 180px));
            border-radius: 26px;
          }
          .horizon-sun-top { right: 1.8rem; top: 4.7rem; width: 82px; height: 82px; }
          .horizon-listening { top: 10.5rem; }
        }

        @keyframes horizonField { 0% { opacity: 0; transform: translateY(40px) scale(.86); } 12%,70% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: .25; transform: translateY(18px) scale(1.03); } }
        @keyframes horizonLinkDot {
          0% { opacity: 0; left: 14%; bottom: 3rem; transform: scale(.4); }
          10% { opacity: 1; transform: scale(1); }
          24% { left: 1.4rem; bottom: 3rem; }
          43% { left: 1.4rem; bottom: 78%; }
          62% { left: 73%; bottom: calc(100% - 4.4rem); }
          78% { left: calc(100% - 3rem); bottom: 72%; opacity: 1; }
          92% { left: calc(100% - 5rem); bottom: calc(100% - 7.7rem); transform: scale(1.3); }
          100% { left: calc(100% - 5rem); bottom: calc(100% - 7.7rem); opacity: 0; transform: scale(2.5); }
        }
        @keyframes pathBottom { 8%,30% { opacity: 1; transform: scaleX(1); } 0%,42%,100% { opacity: 0; transform: scaleX(.05); } }
        @keyframes pathLeft { 25%,48% { opacity: 1; transform: scaleY(1); } 0%,18%,58%,100% { opacity: 0; transform: scaleY(.05); } }
        @keyframes pathTop { 43%,66% { opacity: 1; transform: scaleX(1); } 0%,35%,78%,100% { opacity: 0; transform: scaleX(.05); } }
        @keyframes pathRight { 60%,82% { opacity: 1; transform: scaleY(1); } 0%,52%,92%,100% { opacity: 0; transform: scaleY(.05); } }
        @keyframes moduleFlash { 0%,100% { opacity: 0; transform: scale(.55); } 30%,70% { opacity: 1; transform: scale(1.15); } }
        @keyframes sunTop { 0%,68% { opacity: 0; transform: scale(.32) translateY(18px); } 84% { opacity: 1; transform: scale(1.12) translateY(0); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes sunListen { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
        @keyframes sunRing { 0%,100% { opacity: .32; transform: scale(.95); } 50% { opacity: .78; transform: scale(1.08); } }
        @keyframes listeningBadge { 0%,78% { opacity: 0; transform: translateY(8px); } 92%,100% { opacity: 1; transform: translateY(0); } }
        @keyframes horizonPulse { 0% { opacity: .8; transform: scale(.7); } 100% { opacity: 0; transform: scale(1.8); } }
      `}</style>

      {active ? (
        <div className="horizon-wake-scene" role="dialog" aria-label="Réveil Hey Horizon">
          <button type="button" className="horizon-wake-close" onClick={onClose} aria-label="Fermer l’animation Horizon">
            <X size={17} />
          </button>
          <div className="horizon-wake-caption">
            <p>Hey Horizon</p>
            <p>La graine relie la ferme aux décisions.</p>
          </div>
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
          <div className="horizon-sun-top"><Sun size={38} /></div>
          <div className="horizon-listening"><Mic size={13} /> Horizon prêt</div>
        </div>
      ) : null}
    </>
  );
}