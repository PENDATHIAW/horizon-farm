export const ACCOUNTING_ACCOUNTS_SEED = [
  { id: 'ACC-101', code: '101', name: 'Capital exploitation', type: 'passif', category: 'capitaux', normal_balance: 'credit', description: 'Ressources propres de la ferme', is_active: true },
  { id: 'ACC-411', code: '411', name: 'Clients', type: 'actif', category: 'creances', normal_balance: 'debit', description: 'Clients qui doivent de l argent a la ferme', is_active: true },
  { id: 'ACC-401', code: '401', name: 'Fournisseurs', type: 'passif', category: 'dettes', normal_balance: 'credit', description: 'Fournisseurs a payer', is_active: true },
  { id: 'ACC-521', code: '521', name: 'Banque', type: 'actif', category: 'tresorerie', normal_balance: 'debit', description: 'Compte bancaire', is_active: true },
  { id: 'ACC-571', code: '571', name: 'Caisse', type: 'actif', category: 'tresorerie', normal_balance: 'debit', description: 'Argent liquide disponible', is_active: true },
  { id: 'ACC-572', code: '572', name: 'Mobile Money', type: 'actif', category: 'tresorerie', normal_balance: 'debit', description: 'Wave, Orange Money, Free Money', is_active: true },
  { id: 'ACC-601', code: '601', name: 'Achats alimentation', type: 'charge', category: 'achats', normal_balance: 'debit', description: 'Aliments animaux et lots avicoles', is_active: true },
  { id: 'ACC-602', code: '602', name: 'Achats sante et medicaments', type: 'charge', category: 'sante', normal_balance: 'debit', description: 'Vaccins, soins, veterinaires', is_active: true },
  { id: 'ACC-603', code: '603', name: 'Charges cultures', type: 'charge', category: 'cultures', normal_balance: 'debit', description: 'Semences, engrais, eau, traitements', is_active: true },
  { id: 'ACC-641', code: '641', name: 'Salaires', type: 'charge', category: 'salaires', normal_balance: 'debit', description: 'Main d oeuvre et salaires', is_active: true },
  { id: 'ACC-624', code: '624', name: 'Transport', type: 'charge', category: 'transport', normal_balance: 'debit', description: 'Livraisons, carburant, transport', is_active: true },
  { id: 'ACC-605', code: '605', name: 'Energie et eau', type: 'charge', category: 'energie', normal_balance: 'debit', description: 'Electricite, eau, energie', is_active: true },
  { id: 'ACC-241', code: '241', name: 'Investissements agricoles', type: 'actif', category: 'investissements', normal_balance: 'debit', description: 'Infrastructures, materiel, cheptel durable', is_active: true },
  { id: 'ACC-701', code: '701', name: 'Ventes animaux', type: 'produit', category: 'ventes', normal_balance: 'credit', description: 'Ventes bovins, ovins, caprins', is_active: true },
  { id: 'ACC-702', code: '702', name: 'Ventes avicoles', type: 'produit', category: 'ventes', normal_balance: 'credit', description: 'Ventes oeufs et volailles', is_active: true },
  { id: 'ACC-703', code: '703', name: 'Ventes cultures', type: 'produit', category: 'ventes', normal_balance: 'credit', description: 'Ventes maraichage et recoltes', is_active: true },
  { id: 'ACC-707', code: '707', name: 'Autres revenus', type: 'produit', category: 'ventes', normal_balance: 'credit', description: 'Autres recettes agricoles', is_active: true },
];

export const TREASURY_ACCOUNTS_SEED = [
  { id: 'TRES-CAISSE', label: 'Caisse ferme', type: 'caisse', provider: 'Cash', solde_initial: 0, solde_actuel: 0, currency: 'FCFA', status: 'actif' },
  { id: 'TRES-BANQUE', label: 'Compte bancaire', type: 'banque', provider: 'Banque', solde_initial: 0, solde_actuel: 0, currency: 'FCFA', status: 'actif' },
  { id: 'TRES-WAVE', label: 'Wave', type: 'mobile_money', provider: 'Wave', solde_initial: 0, solde_actuel: 0, currency: 'FCFA', status: 'actif' },
  { id: 'TRES-OM', label: 'Orange Money', type: 'mobile_money', provider: 'Orange Money', solde_initial: 0, solde_actuel: 0, currency: 'FCFA', status: 'actif' },
  { id: 'TRES-FREE', label: 'Free Money', type: 'mobile_money', provider: 'Free Money', solde_initial: 0, solde_actuel: 0, currency: 'FCFA', status: 'actif' },
  { id: 'TRES-CARTE', label: 'Cartes bancaires', type: 'carte', provider: 'Carte bancaire', solde_initial: 0, solde_actuel: 0, currency: 'FCFA', status: 'actif' },
];

export const ACCOUNTING_BUDGETS_SEED = [
  { id: 'BUD-2025-ALIM', period: '2025-07', category: 'Alimentation', budget_amount: 650000, actual_amount: 120000, status: 'ouvert', notes: 'Budget aliments betail et avicole' },
  { id: 'BUD-2025-SANTE', period: '2025-07', category: 'Sante', budget_amount: 180000, actual_amount: 45000, status: 'ouvert', notes: 'Vaccins, medicaments, veterinaires' },
  { id: 'BUD-2025-CULT', period: '2025-07', category: 'Cultures', budget_amount: 420000, actual_amount: 0, status: 'ouvert', notes: 'Semences, engrais, eau' },
  { id: 'BUD-2025-SAL', period: '2025-07', category: 'Salaires', budget_amount: 300000, actual_amount: 225000, status: 'ouvert', notes: 'Agents ferme' },
];

export const ACCOUNTING_CLOSURES_SEED = [
  { id: 'CLO-2025-06', period: '2025-06', closure_type: 'mensuelle', status: 'brouillon', closed_at: null, summary: { message: 'Cloture demo en preparation' } },
];

const CATEGORY_ACCOUNT_MAP = {
  'Vente animaux': { debit: '572', credit: '701', journal: 'ventes', label: 'Argent encaisse - vente animaux' },
  'Vente oeufs': { debit: '572', credit: '702', journal: 'ventes', label: 'Argent encaisse - vente avicole' },
  'Vente cultures': { debit: '572', credit: '703', journal: 'ventes', label: 'Argent encaisse - vente cultures' },
  'Creance client': { debit: '411', credit: '707', journal: 'ventes', label: 'Creance client ouverte' },
  Ventes: { debit: '572', credit: '707', journal: 'ventes', label: 'Argent encaisse - vente' },
  Alimentation: { debit: '601', credit: '572', journal: 'achats', label: 'Depense alimentation validee' },
  Sante: { debit: '602', credit: '572', journal: 'achats', label: 'Depense sante validee' },
  Cultures: { debit: '603', credit: '572', journal: 'achats', label: 'Depense cultures validee' },
  Salaires: { debit: '641', credit: '572', journal: 'salaires', label: 'Paiement salaires' },
  Transport: { debit: '624', credit: '572', journal: 'achats', label: 'Depense transport' },
  Energie: { debit: '605', credit: '572', journal: 'achats', label: 'Depense energie/eau' },
  Investissements: { debit: '241', credit: '572', journal: 'investissements', label: 'Investissement agricole' },
  Stocks: { debit: '601', credit: '572', journal: 'achats', label: 'Achat stock' },
  Autre: { debit: '601', credit: '572', journal: 'operations_diverses', label: 'Operation diverse' },
};

const PAYMENT_TREASURY_MAP = {
  Cash: '571',
  Banque: '521',
  Wave: '572',
  'Orange Money': '572',
  'Free Money': '572',
  'Carte bancaire': '521',
};

const lower = (value = '') => String(value || '').trim().toLowerCase();

export const findAccountByCode = (accounts = [], code) => accounts.find((account) => account.code === code);

export const getAccountingMapping = (transaction = {}) => {
  const statut = lower(transaction.statut || transaction.status || '');
  const categorie = transaction.categorie || '';
  const categoryMap = CATEGORY_ACCOUNT_MAP[categorie] || CATEGORY_ACCOUNT_MAP.Autre;
  const treasuryCode = PAYMENT_TREASURY_MAP[transaction.paiement] || categoryMap.debit;

  if (transaction.type === 'entree' && ['impaye', 'impayé', 'partiel'].includes(statut) && lower(categorie).includes('creance')) {
    return {
      debit: '411',
      credit: categoryMap.credit || '707',
      journal: 'ventes',
      label: 'Creance client',
    };
  }

  if (transaction.type === 'entree') {
    return {
      debit: treasuryCode,
      credit: categoryMap.credit || '707',
      journal: categoryMap.journal || 'ventes',
      label: categoryMap.label || 'Argent encaisse',
    };
  }

  return {
    debit: categoryMap.debit || '601',
    credit: treasuryCode,
    journal: categoryMap.journal || 'achats',
    label: categoryMap.label || 'Depense validee',
  };
};

export const buildDraftEntryFromTransaction = (transaction = {}, accounts = ACCOUNTING_ACCOUNTS_SEED) => {
  const amount = Number(transaction.montant || 0);
  const mapping = getAccountingMapping(transaction);
  const debitAccount = findAccountByCode(accounts, mapping.debit) || { id: `ACC-${mapping.debit}`, code: mapping.debit, name: `Compte ${mapping.debit}` };
  const creditAccount = findAccountByCode(accounts, mapping.credit) || { id: `ACC-${mapping.credit}`, code: mapping.credit, name: `Compte ${mapping.credit}` };
  const entryId = transaction.accounting_entry_id || `ECR-${transaction.id || Date.now()}`;

  return {
    entry: {
      id: entryId,
      entry_date: transaction.date || new Date().toISOString().slice(0, 10),
      journal: mapping.journal,
      reference: transaction.id || entryId,
      source_module: transaction.module_lie || 'finances',
      source_id: transaction.id || '',
      label: transaction.libelle || mapping.label,
      status: 'brouillon',
      total_debit: amount,
      total_credit: amount,
    },
    lines: [
      {
        id: `${entryId}-D`,
        entry_id: entryId,
        account_id: debitAccount.id,
        account_code: debitAccount.code,
        label: debitAccount.name,
        debit: amount,
        credit: 0,
      },
      {
        id: `${entryId}-C`,
        entry_id: entryId,
        account_id: creditAccount.id,
        account_code: creditAccount.code,
        label: creditAccount.name,
        debit: 0,
        credit: amount,
      },
    ],
  };
};

export const computeAccountingReports = ({ accounts = [], entries = [], lines = [], transactions = [], budgets = [], treasuryAccounts = [] }) => {
  const validEntries = entries.filter((entry) => entry.status !== 'annule');
  const validEntryIds = new Set(validEntries.map((entry) => entry.id));
  const reportLines = lines.filter((line) => validEntryIds.has(line.entry_id));
  const byAccount = accounts.map((account) => {
    const accountLines = reportLines.filter((line) => line.account_code === account.code || line.account_id === account.id);
    const debit = accountLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const credit = accountLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    const solde = debit - credit;
    return { ...account, debit, credit, solde };
  });

  const revenues = byAccount.filter((account) => account.type === 'produit').reduce((sum, account) => sum + Number(account.credit || 0) - Number(account.debit || 0), 0);
  const expenses = byAccount.filter((account) => account.type === 'charge').reduce((sum, account) => sum + Number(account.debit || 0) - Number(account.credit || 0), 0);
  const cash = treasuryAccounts.reduce((sum, account) => sum + Number(account.solde_actuel ?? account.solde_initial ?? 0), 0);
  const receivables = transactions.filter((t) => t.type === 'entree' && t.statut === 'impaye').reduce((sum, t) => sum + Number(t.montant || 0), 0);
  const debts = transactions.filter((t) => t.type === 'sortie' && ['impaye', 'partiel'].includes(t.statut)).reduce((sum, t) => sum + Number(t.montant || 0), 0);

  return {
    balance: byAccount,
    grandLivre: reportLines,
    result: { revenues, expenses, net: revenues - expenses },
    bilan: { actifs: cash + receivables, passifs: debts, tresorerie: cash, dettes: debts, creances: receivables },
    budgets: budgets.map((budget) => ({ ...budget, ecart: Number(budget.budget_amount || 0) - Number(budget.actual_amount || 0) })),
  };
};

export const buildFinanceAlerts = ({ transactions = [], treasuryAccounts = [], activities = [] }) => {
  const alerts = [];
  const cash = treasuryAccounts.reduce((sum, account) => sum + Number(account.solde_actuel ?? account.solde_initial ?? 0), 0);
  const expenses = transactions.filter((t) => t.type === 'sortie');
  const avgExpense = expenses.length ? expenses.reduce((sum, t) => sum + Number(t.montant || 0), 0) / expenses.length : 0;

  if (cash < 250000) alerts.push({ id: 'cash-low', level: 'danger', title: 'Tresorerie critique', message: `Tresorerie disponible faible: ${cash} FCFA.` });
  expenses.filter((t) => Number(t.montant || 0) > avgExpense * 1.8 && avgExpense > 0).slice(0, 3).forEach((t) => {
    alerts.push({ id: `expense-${t.id}`, level: 'amber', title: 'Depense anormale', message: `${t.libelle}: montant au-dessus de la moyenne.` });
  });
  transactions.filter((t) => t.type === 'entree' && t.statut === 'impaye').slice(0, 3).forEach((t) => {
    alerts.push({ id: `receivable-${t.id}`, level: 'danger', title: 'Client impaye', message: `${t.libelle}: recette non encaissee.` });
  });
  transactions.filter((t) => t.type === 'sortie' && ['impaye', 'partiel'].includes(t.statut)).slice(0, 3).forEach((t) => {
    alerts.push({ id: `debt-${t.id}`, level: 'amber', title: 'Fournisseur a payer', message: `${t.libelle}: paiement ${t.statut}.` });
  });
  activities.filter((activity) => Number(activity.marge || activity.marge_estimee || 0) < 0).slice(0, 3).forEach((activity) => {
    alerts.push({ id: `activity-${activity.id}`, level: 'danger', title: 'Activite deficitaire', message: `${activity.name || activity.nom || activity.id}: marge negative.` });
  });

  return alerts;
};
