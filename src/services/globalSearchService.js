const searchableKeys = ['id', 'name', 'nom', 'title', 'libelle', 'produit', 'animal', 'type', 'categorie', 'status', 'statut', 'prefs', 'module_lie', 'assigned_to', 'tags', 'notes'];

export const searchERP = (dataMap = {}, query = '') => {
  const value = query.trim().toLowerCase();
  if (!value) return [];

  return Object.entries(dataMap).flatMap(([moduleKey, rows]) => {
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row) =>
        searchableKeys.some((key) => String(row?.[key] ?? '').toLowerCase().includes(value))
      )
      .slice(0, 8)
      .map((row) => ({
        moduleKey,
        id: row.id,
        title: row.name || row.nom || row.title || row.libelle || row.produit || row.animal || row.id,
        subtitle: row.type || row.categorie || row.status || row.statut || 'ERP',
      }));
  });
};
