const lower = (value = '') => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const meatWords = ['viande', 'poulet', 'carcasse', 'broiler', 'bovin', 'ovin', 'caprin', 'agneau', 'mouton', 'chevre', 'chèvre'];

export function isMeatStock(stock = {}) {
  const text = lower(`${stock.produit || ''} ${stock.nom || ''} ${stock.categorie || ''} ${stock.activite_liee || ''}`);
  return meatWords.some((word) => text.includes(word)) || lower(stock.categorie || '').includes('viande');
}

export function saleSourceHint({ sourceType = '', selected = null, unit = '' } = {}) {
  if (sourceType === 'stock') {
    if (isMeatStock(selected) || lower(unit).includes('kg')) {
      return {
        tone: 'info',
        title: 'Viande après abattage',
        text: 'Choisis le stock viande (kg). Le coût/kg inclut déjà élevage + frais d’abattage/découpe enregistrés au journal d’abattage.',
      };
    }
    return {
      tone: 'neutral',
      title: 'Stock vendable',
      text: 'Le coût unitaire du stock sera utilisé pour la marge (pas de double comptage).',
    };
  }
  if (sourceType === 'lot_avicole') {
    if (selected?.sale_kind === 'oeufs_tablettes' || lower(unit).includes('tablette')) {
      return {
        tone: 'neutral',
        title: 'Œufs / plateaux',
        text: 'Coût = lot pondeuse (alimentation, santé, amortissement) × quantité + emballage. Livraison seulement si tu choisis livré / à livrer avec un montant.',
      };
    }
    return {
      tone: 'warn',
      title: 'Poulets vivants',
      text: 'Vente à la tête : coût d’élevage du lot (poussins + aliment + santé). Si tu as abattu, vendre plutôt le stock viande au kg (Élevage → Abattage avicole).',
    };
  }
  if (sourceType === 'animal') {
    return {
      tone: 'warn',
      title: 'Animal vivant',
      text: 'Coût embouche (achat + alimentation + santé). Après abattage, enregistre le journal d’abattage puis vends le stock viande au kg.',
    };
  }
  if (sourceType === 'culture') {
    return {
      tone: 'neutral',
      title: 'Récolte',
      text: 'Coût = charges culture (semences, engrais, eau, main-d’œuvre…) ÷ quantité récoltée × kg vendus.',
    };
  }
  return null;
}

export const DELIVERY_HINT = 'Retrait sur place : 0 FCFA livraison (total = produits uniquement). Livré / à livrer : renseigne les frais si le client paie la livraison — sinon laisse 0.';
