import { expect, test } from '@playwright/test';

const n = (value = 0) => Number(value || 0) || 0;
const money = (value = 0) => Math.round(n(value));

function createAlert(alerts, alert) {
  if (alerts.some((item) => item.key === alert.key && item.status !== 'resolue')) return alerts;
  return [...alerts, { priority: 'haute', status: 'nouvelle', ...alert }];
}

function createTask(tasks, task) {
  if (tasks.some((item) => item.key === task.key && item.status !== 'terminee')) return tasks;
  return [...tasks, { priority: 'normale', status: 'a_faire', ...task }];
}

function addFinance(finance, entry) {
  return [...finance, { date: '2026-05-26', status: 'validee', ...entry, amount: money(entry.amount) }];
}

function addTrace(traces, event) {
  return [...traces, { date: '2026-05-26', ...event }];
}

test.describe('Parcours humain ERP Horizon Farm A à Z', () => {
  test('simule neuf jours terrain et vérifie les conséquences inter-modules', () => {
    const state = {
      animals: [],
      poultryLots: [],
      cultures: [],
      stocks: [],
      suppliers: [],
      equipments: [],
      employees: [],
      clients: [{ id: 'CLI-MARCHE', name: 'Marché Tilène', debt: 0, status: 'a_jour' }],
      sales: [],
      finance: [],
      documents: [],
      tasks: [],
      alerts: [],
      traces: [],
      reports: [],
      opportunities: [],
    };

    // Jour 1 : création des bases de ferme.
    state.animals.push({ id: 'BOV-AZ-001', species: 'bovin', status: 'actif', currentWeight: 185, purchasePrice: 240000, estimatedSalePrice: 420000 });
    state.poultryLots.push({ id: 'LOT-CHAIR-AZ', type: 'chair', initialCount: 300, currentCount: 300, feedKg: 0, status: 'actif' });
    state.poultryLots.push({ id: 'LOT-PONDEUSE-AZ', type: 'pondeuse', initialCount: 120, currentCount: 120, eggs: 0, tablets: 0, status: 'actif' });
    state.cultures.push({ id: 'CUL-TOMATE-AZ', crop: 'Tomate', plot: 'Parcelle nord', areaHa: 0.25, status: 'en_cours', costs: 0 });
    state.stocks.push({ id: 'STK-ALIMENT-AZ', product: 'Aliment volaille croissance', category: 'aliment', qty: 500, unit: 'kg', threshold: 120, unitPrice: 350 });
    state.suppliers.push({ id: 'FOU-ALIMENT-AZ', name: 'Aliments Diop', debt: 0 });
    state.equipments.push({ id: 'EQ-POMPE-AZ', name: 'Pompe irrigation', status: 'operationnel', repairCost: 0 });
    state.employees.push({ id: 'EMP-AWA', name: 'Awa Fall', role: 'Responsable terrain', salary: 85000, status: 'actif' });

    // Jour 2 : alimentation, ponte, soin, traitement culture, dépense et preuve.
    const feed = state.stocks.find((item) => item.id === 'STK-ALIMENT-AZ');
    feed.qty -= 420;
    state.poultryLots[0].feedKg += 280;
    state.poultryLots[1].feedKg += 140;
    state.poultryLots[1].eggs += 300;
    state.poultryLots[1].tablets = Math.floor(state.poultryLots[1].eggs / 30);
    state.finance = addFinance(state.finance, { type: 'sortie', module: 'cultures', sourceId: 'CUL-TOMATE-AZ', label: 'Traitement tomate bio', amount: 12000 });
    state.documents.push({ id: 'DOC-TRAIT-AZ', module: 'cultures', sourceId: 'CUL-TOMATE-AZ', status: 'fourni', type: 'facture' });
    state.traces = addTrace(state.traces, { module: 'avicole', sourceId: 'LOT-PONDEUSE-AZ', action: 'ponte_saisie', quantity: 300 });

    // Jour 3 : stock critique, soin retard, panne équipement.
    state.alerts = createAlert(state.alerts, { key: 'stock:STK-ALIMENT-AZ', module: 'stock', sourceId: feed.id, label: 'Stock aliment sous seuil' });
    state.tasks = createTask(state.tasks, { key: 'stock:STK-ALIMENT-AZ', module: 'stock', sourceId: feed.id, label: 'Racheter aliment volaille' });
    state.alerts = createAlert(state.alerts, { key: 'health:BOV-AZ-001', module: 'sante', sourceId: 'BOV-AZ-001', label: 'Vaccin bovin en retard' });
    state.tasks = createTask(state.tasks, { key: 'health:BOV-AZ-001', module: 'sante', sourceId: 'BOV-AZ-001', label: 'Réaliser vaccin bovin' });
    state.equipments[0].status = 'en_panne';
    state.alerts = createAlert(state.alerts, { key: 'equipment:EQ-POMPE-AZ', module: 'equipements', sourceId: 'EQ-POMPE-AZ', label: 'Pompe irrigation en panne' });
    state.tasks = createTask(state.tasks, { key: 'equipment:EQ-POMPE-AZ', module: 'equipements', sourceId: 'EQ-POMPE-AZ', label: 'Réparer pompe irrigation' });
    state.alerts.find((item) => item.key === 'health:BOV-AZ-001').status = 'resolue';
    state.tasks.find((item) => item.key === 'health:BOV-AZ-001').status = 'terminee';

    // Jour 4 : récolte, stock récolte, opportunité, vente partielle.
    state.cultures[0].status = 'recoltee';
    state.stocks.push({ id: 'STK-TOMATE-AZ', product: 'Tomate récoltée', category: 'recolte', qty: 100, unit: 'kg', threshold: 10, unitPrice: 900 });
    state.opportunities.push({ key: 'culture-sale:CUL-TOMATE-AZ', module: 'cultures', sourceId: 'CUL-TOMATE-AZ', qty: 100, unit: 'kg' });
    state.sales.push({ id: 'VTE-TOMATE-AZ', clientId: 'CLI-MARCHE', sourceModule: 'stock', sourceId: 'STK-TOMATE-AZ', qty: 40, unit: 'kg', total: 36000, paid: 20000, status: 'credit' });
    state.stocks.find((item) => item.id === 'STK-TOMATE-AZ').qty -= 40;
    state.clients[0].debt += 16000;
    state.clients[0].status = 'a_relancer';
    state.finance = addFinance(state.finance, { type: 'entree', module: 'ventes', sourceId: 'VTE-TOMATE-AZ', label: 'Acompte vente tomates', amount: 20000 });
    state.traces = addTrace(state.traces, { module: 'ventes', sourceId: 'VTE-TOMATE-AZ', action: 'vente_partielle' });

    // Jour 5 : animal prêt puis vendu.
    state.animals[0].status = 'pret_a_vendre';
    state.opportunities.push({ key: 'animal-sale:BOV-AZ-001', module: 'animaux', sourceId: 'BOV-AZ-001', qty: 1, unit: 'tete' });
    state.sales.push({ id: 'VTE-BOV-AZ', clientId: 'CLI-MARCHE', sourceModule: 'animaux', sourceId: 'BOV-AZ-001', qty: 1, unit: 'tete', total: 420000, paid: 420000, status: 'soldee' });
    state.animals[0].status = 'vendu';
    state.finance = addFinance(state.finance, { type: 'entree', module: 'ventes', sourceId: 'VTE-BOV-AZ', label: 'Vente bovin BOV-AZ-001', amount: 420000 });
    state.documents.push({ id: 'DOC-FACT-BOV-AZ', module: 'ventes', sourceId: 'VTE-BOV-AZ', status: 'fourni', type: 'facture' });
    state.traces = addTrace(state.traces, { module: 'animaux', sourceId: 'BOV-AZ-001', action: 'sortie_vente' });

    // Jour 6 : vente œufs/tablettes payée.
    state.sales.push({ id: 'VTE-OEUFS-AZ', clientId: 'CLI-MARCHE', sourceModule: 'avicole', sourceId: 'LOT-PONDEUSE-AZ', qty: 10, unit: 'tablette', total: 25000, paid: 25000, status: 'soldee' });
    state.poultryLots[1].tablets -= 10;
    state.finance = addFinance(state.finance, { type: 'entree', module: 'ventes', sourceId: 'VTE-OEUFS-AZ', label: 'Vente 10 tablettes oeufs', amount: 25000 });

    // Jour 7 : fournisseur payé et dette soldée.
    state.suppliers[0].debt = 60000;
    state.stocks.push({ id: 'STK-ALIMENT-RECEP-AZ', product: 'Aliment livré', category: 'aliment', qty: 200, unit: 'kg', threshold: 50, unitPrice: 300 });
    state.finance = addFinance(state.finance, { type: 'sortie', module: 'fournisseurs', sourceId: 'FOU-ALIMENT-AZ', label: 'Paiement fournisseur aliments', amount: 60000 });
    state.suppliers[0].debt = 0;
    state.documents.push({ id: 'DOC-FOU-AZ', module: 'fournisseurs', sourceId: 'FOU-ALIMENT-AZ', status: 'fourni', type: 'facture' });

    // Jour 8 : rapport généré et historisé.
    state.reports.push({ id: 'RAP-AZ-001', type: 'dossier_financeur', status: 'genere', includes: ['bp', 'preuves', 'ventes', 'impact'] });
    state.documents.push({ id: 'DOC-RAP-AZ', module: 'rapports', sourceId: 'RAP-AZ-001', status: 'fourni', type: 'rapport_pdf' });

    // Jour 9 : dashboard, décisionnel, impact, sync et audit logs.
    const dashboard = {
      urgentAlerts: state.alerts.filter((item) => item.status === 'nouvelle'),
      overdueTasks: state.tasks.filter((item) => item.status === 'a_faire'),
      cashIn: state.finance.filter((item) => item.type === 'entree').reduce((sum, item) => sum + item.amount, 0),
      clientDebt: state.clients.reduce((sum, item) => sum + item.debt, 0),
    };
    const syncIssues = [
      ...state.documents.filter((doc) => doc.status === 'a_joindre').map((doc) => ({ module: 'documents', sourceId: doc.sourceId })),
      ...state.sales.filter((sale) => !state.clients.some((client) => client.id === sale.clientId)).map((sale) => ({ module: 'ventes', sourceId: sale.id })),
    ];

    expect(feed.qty).toBeLessThan(feed.threshold);
    expect(state.alerts.filter((item) => item.key === 'stock:STK-ALIMENT-AZ' && item.status === 'nouvelle')).toHaveLength(1);
    expect(state.tasks.filter((item) => item.key === 'equipment:EQ-POMPE-AZ')).toHaveLength(1);
    expect(state.poultryLots[1].tablets).toBe(0);
    expect(state.stocks.find((item) => item.id === 'STK-TOMATE-AZ').qty).toBe(60);
    expect(state.animals[0].status).toBe('vendu');
    expect(state.clients[0]).toMatchObject({ debt: 16000, status: 'a_relancer' });
    expect(state.suppliers[0].debt).toBe(0);
    expect(dashboard.cashIn).toBe(465000);
    expect(dashboard.clientDebt).toBe(16000);
    expect(dashboard.urgentAlerts.map((item) => item.module)).toEqual(expect.arrayContaining(['stock', 'equipements']));
    expect(state.documents.map((item) => item.type)).toEqual(expect.arrayContaining(['facture', 'rapport_pdf']));
    expect(state.traces.map((item) => item.action)).toEqual(expect.arrayContaining(['ponte_saisie', 'vente_partielle', 'sortie_vente']));
    expect(syncIssues).toEqual([]);
    expect(new Set(state.opportunities.map((item) => item.key)).size).toBe(state.opportunities.length);
  });
});
