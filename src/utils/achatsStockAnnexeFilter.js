const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').toLowerCase();

/** Documents liés à Achats & Stock : factures fournisseurs, bons de réception, preuves d'achat. */
export function filterAchatsStockAnnexeDocuments(documents = []) {
  return arr(documents).filter((doc) => {
    const module = lower(doc.module_source || doc.module || doc.primary_module || '');
    const entity = lower(doc.entity_type || '');
    const category = lower(doc.document_category || doc.categorie || doc.category || doc.type || '');
    const title = lower(doc.title || doc.nom || doc.libelle || '');
    if (module.includes('stock') || module.includes('achat') || module.includes('fournisseur')) return true;
    if (entity === 'stock' || entity === 'fournisseur' || entity === 'supplier') return true;
    if (/facture|bon.*reception|réception|reception|preuve|justificatif|achat|stock|fournisseur|intrant|aliment/.test(category)) return true;
    if (/facture|reception|réception|achat stock|bon de/.test(title)) return true;
    if (doc.stock_id || doc.linked_stock_id || doc.fournisseur_id || doc.transaction_id) return true;
    return false;
  });
}
