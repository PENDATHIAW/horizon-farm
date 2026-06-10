/**
 * Messages de démonstration WhatsApp Horizon (simulation interne).
 */

export const WHATSAPP_DEMO_MESSAGES = [
  {
    id: 'demo-sale-eggs',
    label: 'Vente œufs Orange Money',
    module: 'Commercial',
    text: "J'ai vendu 20 tablettes d'œufs à 70 000 FCFA, payé par Orange Money.",
  },
  {
    id: 'demo-purchase-feed',
    label: 'Achat aliment',
    module: 'Achats & Stock',
    text: "J'ai acheté 5 sacs d'aliment à 92 500 FCFA.",
  },
  {
    id: 'demo-mortality',
    label: 'Mortalité lot chair',
    module: 'Élevage / Avicole',
    text: '5 poulets sont morts aujourd\'hui dans le lot chair.',
  },
  {
    id: 'demo-payment',
    label: 'Encaissement client',
    module: 'Finance / Commercial',
    text: "J'ai encaissé 45 000 FCFA du client A.",
  },
  {
    id: 'demo-delivery',
    label: 'Livraison poulets',
    module: 'Commercial',
    text: "J'ai livré 10 poulets à la supérette du coin.",
  },
  {
    id: 'demo-hotel-terminus',
    label: 'Commande Hôtel Terminus (investisseur — pipeline commitCommercialSale)',
    module: 'Commercial',
    pipeline: 'commitCommercialSale',
    executionNote: 'Message démo ; exécution bout-en-bout après validation utilisateur (multi-lignes, créance virement).',
    text: 'Bonjour, ici Hôtel Terminus. Je commande 50 plateaux d\'œufs et 30 kg de poulets. Facturez-moi, paiement par virement.',
  },
];

export default WHATSAPP_DEMO_MESSAGES;
