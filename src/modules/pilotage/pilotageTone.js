/** Styles partagés des panneaux de pilotage : statut couleur → classes Tailwind. */

export const TONE_DOT = {
  good: 'bg-positive',
  warn: 'bg-vigilance',
  bad: 'bg-urgent',
  neutral: 'bg-slate',
};

export const TONE_TEXT = {
  good: 'text-positive',
  warn: 'text-horizon-dark',
  bad: 'text-urgent',
  neutral: 'text-slate',
};

export const TONE_CHIP = {
  good: 'bg-positive-bg text-positive',
  warn: 'bg-vigilance-bg text-horizon-dark',
  bad: 'bg-urgent-bg text-urgent',
  neutral: 'bg-neutral-bg text-slate',
};

export const TONE_MARK = { good: '🟢', warn: '🟠', bad: '🔴', neutral: '⚪' };

export const SEVERITY_CHIP = {
  critique: 'bg-urgent-bg text-urgent',
  haute: 'bg-vigilance-bg text-horizon-dark',
  moyenne: 'bg-neutral-bg text-slate',
};
