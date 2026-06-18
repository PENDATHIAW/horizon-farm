export const products = [
  {
    id: 'safaa',
    name: 'SAFAA',
    tagline: { fr: 'Savon Purifiant au Tallow', en: 'Purifying Tallow Bar' },
    size: '200 g',
    note: { fr: 'Nettoie · Purifie · Équilibre', en: 'Cleanse · Purify · Balance' },
    gradient: 'from-stone-200 via-amber-50 to-stone-300',
  },
  {
    id: 'aura',
    name: 'AURA',
    tagline: { fr: 'Gommage Fouetté Clarifiant', en: 'Clarifying Whipped Polish' },
    size: '500 g',
    note: { fr: 'Détox · Exfolie · Clarifie', en: 'Detox · Exfoliate · Clarify' },
    gradient: 'from-neutral-300 via-stone-200 to-neutral-400',
  },
  {
    id: 'shiny',
    name: 'SHINY',
    tagline: { fr: 'Lait Visage & Corps Éclat', en: 'Radiance Face & Body Milk' },
    size: '500 ml',
    note: { fr: 'Nourrit · Hydrate · Illumine', en: 'Nourish · Hydrate · Illuminate' },
    gradient: 'from-amber-50 via-orange-50 to-stone-200',
    featured: true,
  },
  {
    id: 'noor',
    name: 'NOOR',
    tagline: { fr: 'Crème Fouettée Réparatrice', en: 'Overnight Recovery Whip' },
    size: '200 g',
    note: { fr: 'Répare · Apaise · Régénère', en: 'Repair · Soothe · Regenerate' },
    gradient: 'from-emerald-50 via-stone-100 to-stone-200',
  },
  {
    id: 'soft-kiss',
    name: 'SOFT KISS',
    tagline: { fr: 'Baume Lèvres Nourrissant', en: 'Nourishing Lip Veil' },
    size: '15 g',
    note: { fr: 'Nourrit · Protège · Adoucit', en: 'Nourish · Protect · Soften' },
    gradient: 'from-rose-50 via-stone-100 to-amber-50',
  },
]

export const traceSteps = [
  { key: 'livestock', icon: '🐂' },
  { key: 'processing', icon: '⚙️' },
  { key: 'tallow', icon: '✦' },
  { key: 'skincare', icon: '◯' },
]

export const stats = [
  { key: 'revenue', value: '121.8M', unit: 'FCFA' },
  { key: 'units', value: '4', unit: '' },
  { key: 'products', value: '5', unit: '' },
  { key: 'trace', value: '100', unit: '%' },
]
