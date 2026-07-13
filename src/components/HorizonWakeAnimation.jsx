import { Mic, X } from 'lucide-react';

export default function HorizonWakeAnimation({ state = 'idle', onClose }) {
  if (state === 'idle') return null;

  return (
    <section
      className="hf-enter fixed right-3 top-20 z-50 w-[min(26rem,calc(100vw-1.5rem))] rounded-card border border-line bg-card p-6 shadow-float max-md:bottom-24 max-md:top-auto"
      role="dialog"
      aria-label="Hey Horizon prêt"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist hover:text-earth"
        aria-label="Fermer Hey Horizon"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <p className="text-label font-semibold uppercase text-horizon-dark">Hey Horizon</p>
      <h2 className="mt-1 pr-12 text-section font-semibold text-ink">Prêt à écouter</h2>
      <div className="relative my-6 h-8" aria-hidden="true">
        <span className="absolute inset-x-0 top-1/2 h-px bg-horizon" />
        <span className="absolute right-0 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-vigilance-bg text-horizon-dark shadow-card">
          <Mic size={16} />
        </span>
      </div>
      <p className="text-body text-slate">Les données de la ferme sont disponibles pour cette conversation.</p>
    </section>
  );
}
