export const PAYMENT_METHODS = ['Cash', 'Banque', 'Wave', 'Orange Money', 'Free Money', 'Carte bancaire'];

export const buildFinanceSummary = ({ transactions = [], salesOrders = [], payments = [] } = {}) => {
  const totalRecettes = transactions
    .filter((t) => t.type === 'entree' && (t.statut || 'paye') !== 'impaye')
    .reduce((sum, t) => sum + Number(t.montant || 0), 0);

  const totalDepenses = transactions
    .filter((t) => t.type === 'sortie')
    .reduce((sum, t) => sum + Number(t.montant || 0), 0);

  const treasury = PAYMENT_METHODS.map((method) => {
    const entrees = transactions
      .filter((t) => t.type === 'entree' && t.paiement === method && t.statut !== 'impaye')
      .reduce((sum, t) => sum + Number(t.montant || 0), 0);
    const sorties = transactions
      .filter((t) => t.type === 'sortie' && t.paiement === method && t.statut !== 'impaye')
      .reduce((sum, t) => sum + Number(t.montant || 0), 0);
    return { method, solde: entrees - sorties, entrees, sorties };
  });

  const cashDisponible = treasury.reduce((sum, item) => sum + Number(item.solde || 0), 0);
  const benefice = totalRecettes - totalDepenses;
  const marge = totalRecettes ? (benefice / totalRecettes) * 100 : 0;
  const receivables = salesOrders.filter((order) => Number(order.reste_a_payer || 0) > 0 && order.statut_commande !== 'annule');
  const totalCreances = receivables.reduce((sum, order) => sum + Number(order.reste_a_payer || 0), 0);

  return {
    totalRecettes,
    totalDepenses,
    cashDisponible,
    benefice,
    marge,
    treasury,
    receivables,
    totalCreances,
    ventesPayees: salesOrders.filter((order) => order.statut_paiement === 'paye').length,
    ventesPartielles: salesOrders.filter((order) => order.statut_paiement === 'partiel').length,
    paiementsCount: payments.length,
  };
};
