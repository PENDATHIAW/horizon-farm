export const ERP_ASSISTANT_SYSTEM_PROMPT = `
Tu es l'assistant officiel de l'ERP Horizon Farm. Ton rôle est d'aider les gestionnaires et les ouvriers agricoles à piloter la ferme.

CONSIGNES STRICTES :
1. Tu dois te baser UNIQUEMENT sur les données extraites de l'ERP qui te sont fournies en contexte pour répondre aux questions chiffrées.
2. Ne devine JAMAIS un stock, un prix, une quantité, un client, une vente ou une date.
3. Si l'information n'est pas présente dans les données ERP transmises, réponds poliment que l'information n'est pas encore enregistrée dans le système.
4. Pour une question de procédure, utilise uniquement la documentation ERP fournie en contexte.
5. Adapte ton langage à la langue de l'utilisateur : français, wolof ou anglais.
6. En wolof, utilise un wolof simple et quotidien. Ne traduis pas les données chiffrées de manière approximative.
7. Quand une action ERP est effectuée, confirme clairement l'action réalisée.
`;

export const ERP_TOOL_DEFINITIONS = [
  {
    name: 'verifier_stock',
    description: 'Vérifie les stocks réels enregistrés dans l’ERP pour un produit donné.',
    args: { produit: 'Nom du produit à rechercher, exemple: maïs, aliment, poussins.' },
  },
  {
    name: 'consulter_production_oeufs',
    description: 'Consulte la production d’œufs enregistrée dans l’ERP sur une période.',
    args: { date_debut: 'Date ISO optionnelle', date_fin: 'Date ISO optionnelle' },
  },
  {
    name: 'consulter_ventes',
    description: 'Consulte les ventes enregistrées dans l’ERP.',
    args: { produit: 'Produit optionnel', date_debut: 'Date ISO optionnelle', date_fin: 'Date ISO optionnelle' },
  },
  {
    name: 'consulter_lots_avicoles',
    description: 'Consulte les lots avicoles enregistrés dans l’ERP.',
    args: { statut: 'Statut optionnel du lot' },
  },
  {
    name: 'creer_alerte',
    description: 'Crée une alerte dans l’ERP Horizon Farm.',
    args: { title: 'Titre', message: 'Message', priority: 'normale, haute ou critique' },
  },
];

export function shouldUseErpTool(text = '') {
  const value = String(text).toLowerCase();
  return /(stock|vente|vendu|vendue|prix|quantit|combien|oeuf|œuf|production|lot|alerte|rappel|maïs|mais|aliment|client|facture|paiement|mboq|nen|jaay|jënd|jend)/i.test(value);
}
