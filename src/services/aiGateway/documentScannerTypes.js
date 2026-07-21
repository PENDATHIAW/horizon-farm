/** Types de documents supportés par le scanner MVP. */

export const SCANNER_DOC_TYPES = {
  PURCHASE_INVOICE: 'facture_achat_stock',
  VET_PRESCRIPTION: 'ordonnance_veterinaire',
  PAYMENT_RECEIPT: 'recu_paiement',
  DELIVERY_NOTE: 'bon_livraison',
  EXPENSE_RECEIPT: 'recu_depense',
};

export const SCANNER_DOC_TYPE_LABELS = {
  [SCANNER_DOC_TYPES.PURCHASE_INVOICE]: 'Facture achat (stock)',
  [SCANNER_DOC_TYPES.VET_PRESCRIPTION]: 'Ordonnance vétérinaire',
  [SCANNER_DOC_TYPES.PAYMENT_RECEIPT]: 'Reçu de paiement',
  [SCANNER_DOC_TYPES.DELIVERY_NOTE]: 'Bon de livraison',
  [SCANNER_DOC_TYPES.EXPENSE_RECEIPT]: 'Reçu de dépense',
};

export const SCANNER_MIME_ACCEPT = 'image/*,application/pdf,text/plain';
