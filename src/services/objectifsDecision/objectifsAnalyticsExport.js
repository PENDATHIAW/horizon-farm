import * as XLSX from 'xlsx';

const today = () => new Date().toISOString().slice(0, 10);

function sheetRows(headers, rows = []) {
  return [headers, ...rows.map((row) => headers.map((key) => row?.[key] ?? ''))];
}

function addSheet(workbook, name, headers, rows, widths = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows(headers, rows));
  if (widths.length) worksheet['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
}

function rentabilityLots(analytics = {}) {
  return (analytics.rentability?.lots || []).map((row) => ({
    Lot: row.lotName,
    Atelier: row.workshop,
    'Coût total': row.totalCost,
    'Coût aliment': row.feedCost,
    'CA estimé': row.revenueEstimate,
    'MCA %': row.mcaPct,
    'Coût unitaire': row.unitCost,
    Unité: row.unitLabel,
  }));
}

function rentabilitySuppliers(analytics = {}) {
  return (analytics.rentability?.suppliers || []).map((row) => ({
    Fournisseur: row.supplier,
    Lots: row.lots,
    'MCA moyen %': row.avgMca,
    'Coût total': row.totalCost,
  }));
}

function technicalRows(analytics = {}) {
  return (analytics.technical?.rows || []).map((row) => ({
    Lot: row.lotName,
    Atelier: row.workshop,
    'Âge (j)': row.ageDays,
    IC: row.ic ?? '',
    GMQ: row.gmq ?? '',
    'Alerte ponte': row.ponteAlert ? 'Oui' : 'Non',
    'Alerte IC': row.icAlert ? 'Oui' : 'Non',
    'Alerte GMQ': row.gmqAlert ? 'Oui' : 'Non',
    'Stress thermique': row.thermal?.alert ? 'Oui' : 'Non',
  }));
}

function fluxOccupancy(analytics = {}) {
  return (analytics.flux?.occupancy || []).map((row) => ({
    Lot: row.lotName,
    Bâtiment: row.building,
    Atelier: row.workshop,
    'Effectif': row.headCount,
    'Âge (j)': row.ageDays,
    'Fin prévue': row.expectedEnd || '',
  }));
}

function fluxMortality(analytics = {}) {
  return (analytics.flux?.mortalityRows || []).map((row) => ({
    Lot: row.lotName,
    'Mortalité %': row.mortalityRate,
    Morts: row.deadCount,
    'Perte FCFA': row.lossValue,
    Alerte: row.alert ? 'Oui' : 'Non',
  }));
}

function maraichageRows(analytics = {}) {
  return (analytics.maraichage?.cultures || []).map((row) => ({
    Culture: row.name,
    'Surface m²': row.surfaceM2,
    'CA estimé': row.revenue,
    Coût: row.cost,
    'Marge brute': row.marginBrute,
    'Marge + fumier': row.marginWithBiomass,
  }));
}

export function buildObjectifsExportWorkbook(analytics = {}) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: 'Objectifs & Croissance — Horizon Farm',
    Subject: 'Analytique export',
    Author: 'Horizon Farm ERP',
    CreatedDate: new Date(),
  };

  addSheet(workbook, 'Rentabilité lots', Object.keys(rentabilityLots(analytics)[0] || {
    Lot: '', Atelier: '', 'Coût total': '', 'Coût aliment': '', 'CA estimé': '', 'MCA %': '', 'Coût unitaire': '', Unité: '',
  }), rentabilityLots(analytics), [22, 14, 14, 14, 14, 10, 12, 8]);

  addSheet(workbook, 'Fournisseurs', Object.keys(rentabilitySuppliers(analytics)[0] || {
    Fournisseur: '', Lots: '', 'MCA moyen %': '', 'Coût total': '',
  }), rentabilitySuppliers(analytics), [28, 8, 12, 14]);

  addSheet(workbook, 'Efficacité', Object.keys(technicalRows(analytics)[0] || {
    Lot: '', Atelier: '', 'Âge (j)': '', IC: '', GMQ: '', 'Alerte ponte': '', 'Alerte IC': '', 'Alerte GMQ': '', 'Stress thermique': '',
  }), technicalRows(analytics), [22, 14, 10, 8, 8, 12, 10, 10, 14]);

  addSheet(workbook, 'Flux occupation', Object.keys(fluxOccupancy(analytics)[0] || {
    Lot: '', Bâtiment: '', Atelier: '', Effectif: '', 'Âge (j)': '', 'Fin prévue': '',
  }), fluxOccupancy(analytics), [22, 16, 14, 10, 10, 14]);

  addSheet(workbook, 'Mortalité', Object.keys(fluxMortality(analytics)[0] || {
    Lot: '', 'Mortalité %': '', Morts: '', 'Perte FCFA': '', Alerte: '',
  }), fluxMortality(analytics), [22, 12, 8, 14, 8]);

  addSheet(workbook, 'Maraîchage', Object.keys(maraichageRows(analytics)[0] || {
    Culture: '', 'Surface m²': '', 'CA estimé': '', Coût: '', 'Marge brute': '', 'Marge + fumier': '',
  }), maraichageRows(analytics), [16, 12, 14, 14, 14, 16]);

  const biomass = analytics.maraichage?.biomass;
  if (biomass) {
    addSheet(workbook, 'Biomasse fumier', ['Indicateur', 'Valeur'], [
      { Indicateur: 'Économie engrais FCFA', Valeur: biomass.economie_totale_fcfa },
      { Indicateur: 'Poules comptées', Valeur: analytics.maraichage?.poulesCount },
      { Indicateur: 'Bovins comptés', Valeur: analytics.maraichage?.bovinsCount },
    ], [28, 18]);
  }


  const crossInsights = [
    ...(analytics.cross?.veterinaires?.insights || []).map((v) => ({ Type: 'Véto', Sujet: v.intervention, Message: v.message })),
    ...(analytics.cross?.feedInflation?.alerts || []).map((a) => ({ Type: 'Inflation aliment', Sujet: a.product, Message: a.message })),
    ...(analytics.cross?.shrinkage?.alerts || []).map((a) => ({ Type: 'Démarque', Sujet: a.product || a.lotName, Message: a.message })),
    ...(analytics.cross?.clientQuality?.insights || []).map((c) => ({ Type: 'Client', Sujet: c.clientName || c.client, Message: c.message })),
  ];
  if (crossInsights.length) {
    addSheet(workbook, 'Croisements', ['Type', 'Sujet', 'Message'], crossInsights, [18, 24, 48]);
  }

  return workbook;
}

export function exportObjectifsAnalyticsExcel(analytics = {}, fileName) {
  const workbook = buildObjectifsExportWorkbook(analytics);
  XLSX.writeFile(workbook, fileName || `objectifs-croissance-${today()}.xlsx`);
}

export function exportObjectifsAnalyticsCsv(analytics = {}, tab = 'rentabilite') {
  const map = {
    rentabilite: { rows: rentabilityLots(analytics), name: 'rentabilite-lots.csv' },
    fournisseurs: { rows: rentabilitySuppliers(analytics), name: 'fournisseurs.csv' },
    technique: { rows: technicalRows(analytics), name: 'efficacite-technique.csv' },
    flux: { rows: fluxOccupancy(analytics), name: 'flux-occupation.csv' },
    mortalite: { rows: fluxMortality(analytics), name: 'mortalite.csv' },
    maraichage: { rows: maraichageRows(analytics), name: 'maraichage.csv' },
  };
  const { rows, name } = map[tab] || map.rentabilite;
  const headers = Object.keys(rows[0] || {});
  const lines = [headers.join(';')];
  rows.forEach((row) => {
    lines.push(headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(';'));
  });
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default exportObjectifsAnalyticsExcel;
