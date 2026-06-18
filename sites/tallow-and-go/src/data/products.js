export const lineupImage = '/tallow-and-go-lineup-final.png'

export const products = [
  {
    id: 'safaa',
    name: 'SAFAA',
    tagline: { fr: 'Savon Purifiant au Tallow', en: 'Purifying Tallow Bar' },
    size: '200 g',
    image: lineupImage,
    imagePosition: '8% center',
    featured: false,
    composition: ['Purified Beef Tallow', 'Cow Milk', 'Neem Oil', 'Activated Charcoal'],
    benefits: {
      fr: ['Nettoie en profondeur', 'Purifie le teint', 'Visage & corps'],
      en: ['Deep cleanse', 'Purifies skin', 'Face & body'],
    },
  },
  {
    id: 'aura',
    name: 'AURA',
    tagline: { fr: 'Gommage Fouetté Clarifiant', en: 'Clarifying Whipped Polish' },
    size: '500 g',
    image: lineupImage,
    imagePosition: '28% center',
    featured: false,
    composition: ['Whipped Beef Tallow', 'Activated Charcoal', 'Fine Sugar', 'Black Seed Oil'],
    benefits: {
      fr: ['Détoxifie', 'Exfolie en douceur', 'Clarifie'],
      en: ['Detoxifies', 'Gentle exfoliation', 'Clarifies'],
    },
  },
  {
    id: 'shiny',
    name: 'SHINY',
    tagline: { fr: 'Lait Visage & Corps Éclat', en: 'Radiance Face & Body Milk' },
    size: '500 ml',
    image: lineupImage,
    imagePosition: '50% center',
    featured: true,
    composition: ['Beef Tallow', 'Carrot Oil', 'Hibiscus Seed Oil', 'Niacinamide', 'Vitamin E'],
    benefits: {
      fr: ['Nourrit intensément', 'Hydrate', 'Éclat naturel'],
      en: ['Deep nourishment', 'Hydrates', 'Natural glow'],
    },
  },
  {
    id: 'noor',
    name: 'NOOR',
    tagline: { fr: 'Crème Fouettée Réparatrice', en: 'Overnight Recovery Whip' },
    size: '200 g',
    image: lineupImage,
    imagePosition: '72% center',
    featured: false,
    composition: ['Whipped Beef Tallow', 'Moringa Oil', 'Licorice Extract', 'Vitamin E'],
    benefits: {
      fr: ['Répare la nuit', 'Apaise', 'Régénère'],
      en: ['Overnight repair', 'Soothes', 'Regenerates'],
    },
  },
  {
    id: 'soft-kiss',
    name: 'SOFT KISS',
    tagline: { fr: 'Baume Lèvres Nourrissant', en: 'Nourishing Lip Veil' },
    size: '15 g',
    image: lineupImage,
    imagePosition: '92% center',
    featured: false,
    composition: ['Beef Tallow', 'Castor Oil', 'Beeswax', 'Shea Butter'],
    benefits: {
      fr: ['Nourrit', 'Protège', 'Adoucit'],
      en: ['Nourishes', 'Protects', 'Softens'],
    },
  },
]

export const chainSteps = [
  {
    step: '01',
    title: { fr: 'Élevage', en: 'Livestock' },
    text: {
      fr: 'Embouches bovines suivies — le suif est valorisé sur place.',
      en: 'Tracked cattle finishing — tallow valorized on site.',
    },
  },
  {
    step: '02',
    title: { fr: 'Purification', en: 'Purification' },
    text: {
      fr: 'Graisse purifiée pour obtenir un suif de qualité cosmétique.',
      en: 'Fat purified to cosmetic-grade tallow.',
    },
  },
  {
    step: '03',
    title: { fr: 'Formulation', en: 'Formulation' },
    text: {
      fr: 'Petites séries artisanales au Sénégal, peu d\'ingrédients.',
      en: 'Small artisanal batches in Senegal, few ingredients.',
    },
  },
  {
    step: '04',
    title: { fr: 'Soin', en: 'Skincare' },
    text: {
      fr: 'Nourrir, clarifier, rayonner — de la ferme à votre peau.',
      en: 'Nourish, clarify, glow — from farm to skin.',
    },
  },
]

export const traceKeys = ['farm', 'process', 'tallow', 'skin']
