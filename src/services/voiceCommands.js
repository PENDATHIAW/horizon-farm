const includesAny = (text, words) => words.some((word) => text.includes(word));

export const interpretVoiceCommand = (rawCommand = '', dataMap = {}) => {
  const command = rawCommand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (includesAny(command, ['stock critique', 'stocks critiques', 'rupture'])) {
    const count = (dataMap.stock || []).filter((row) => Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
    return { moduleKey: 'stock', answer: `${count} stock critique detecte.` };
  }

  if (includesAny(command, ['vaccin retard', 'vaccins retard', 'vaccination retard'])) {
    const count = (dataMap.sante || []).filter((row) => row.statut === 'retard').length;
    return { moduleKey: 'sante', answer: `${count} vaccin en retard.` };
  }

  if (includesAny(command, ['client relancer', 'clients a relancer', 'meilleurs clients'])) {
    const top = [...(dataMap.clients || [])].sort((a, b) => Number(b.totalAchats || 0) - Number(a.totalAchats || 0))[0];
    return { moduleKey: 'clients', answer: top ? `Meilleur client: ${top.nom}.` : 'Aucun client trouve.' };
  }

  if (includesAny(command, ['lot avicole', 'production oeuf', 'pondeuse'])) {
    const worst = [...(dataMap.avicole || [])].sort((a, b) => Number(a.scoresSante || 0) - Number(b.scoresSante || 0))[0];
    return { moduleKey: 'avicole', answer: worst ? `Lot a surveiller: ${worst.name}.` : 'Aucun lot trouve.' };
  }

  if (includesAny(command, ['benefice', 'finance', 'depense', 'recette'])) {
    const recettes = (dataMap.finances || []).filter((row) => row.type === 'entree').reduce((sum, row) => sum + Number(row.montant || 0), 0);
    const depenses = (dataMap.finances || []).filter((row) => row.type === 'sortie').reduce((sum, row) => sum + Number(row.montant || 0), 0);
    return { moduleKey: 'finances', answer: `Benefice net estime: ${recettes - depenses} FCFA.` };
  }

  if (includesAny(command, ['culture', 'maraichage', 'recolte'])) {
    return { moduleKey: 'cultures', answer: 'Ouverture du module Cultures.' };
  }

  return { moduleKey: 'dashboard', answer: 'Commande recue. Tableau de bord ouvert.' };
};
