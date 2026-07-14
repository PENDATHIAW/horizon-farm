import {
  Droplets,
  Egg,
  HeartOff,
  Scale,
  ShoppingCart,
  Sprout,
  Wheat,
  X,
} from 'lucide-react';
import { SAISIES_QUOTIDIENNES } from '../config/formulaires20s.config.js';
import { openDailyQuickEntry } from '../utils/dailyQuickEntry.js';

const ICONS = Object.freeze({
  distribution: Wheat,
  ponte: Egg,
  mortalite: HeartOff,
  pesee: Scale,
  irrigation: Droplets,
  recolte: Sprout,
  vente: ShoppingCart,
});

const SHORT_LABELS = Object.freeze({
  distribution: 'Aliment',
  ponte: 'Ponte',
  mortalite: 'Mortalité',
  pesee: 'Pesée',
  irrigation: 'Irrigation',
  recolte: 'Récolte',
  vente: 'Vente',
});

export default function GlobalQuickEntryMenu({ open, onClose, onNavigate }) {
  if (!open) return null;

  const select = (entry) => {
    onClose?.();
    openDailyQuickEntry(entry, onNavigate);
  };

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button type="button" className="absolute inset-0 bg-earth/30" onClick={onClose} aria-label="Fermer les saisies rapides" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-entry-title"
        className="absolute inset-x-3 bottom-24 rounded-card border border-line bg-card p-4 shadow-float sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:w-96"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-meta font-semibold uppercase text-horizon-dark">Saisie rapide</p>
            <h2 id="quick-entry-title" className="mt-1 text-lg font-semibold text-ink">Que veux-tu enregistrer ?</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist hover:text-earth" aria-label="Fermer">
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SAISIES_QUOTIDIENNES.map((entry) => {
            const Icon = ICONS[entry.id];
            return (
              <button
                key={entry.id}
                type="button"
                data-testid={`global-quick-entry-${entry.id}`}
                onClick={() => select(entry)}
                className="flex min-h-16 items-center gap-3 rounded-control border border-line bg-pure px-3 py-3 text-left text-sm font-semibold text-ink hover:border-leaf hover:bg-positive-bg"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-positive-bg text-leaf">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span>{SHORT_LABELS[entry.id]}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
