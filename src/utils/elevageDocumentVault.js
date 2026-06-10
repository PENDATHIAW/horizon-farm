const lower = (v) => String(v || '').toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : []);

export const ELEVAGE_DOC_CATEGORIES = [
  { id: 'sanitaire', label: 'Sanitaire', patterns: /sanitaire|vaccin|ordonnance|veterinaire|vétérinaire|soin/ },
  { id: 'naissance', label: 'Naissance / reproduction', patterns: /naissance|reproduction|portée|gestation|mise bas/ },
  { id: 'transformation', label: 'Transformation', patterns: /abattage|transformation|viande|carcasse|sanitaire.*sortie/ },
  { id: 'certification', label: 'Certification', patterns: /certificat|conformité|conformite|label|agrément/ },
  { id: 'administratif', label: 'Administratif', patterns: /facture|contrat|admin|registre|declaration/ },
];

export function classifyElevageDocument(doc = {}) {
  const blob = lower(`${doc.document_category || ''} ${doc.title || ''} ${doc.module_source || ''} ${doc.notes || ''}`);
  for (const cat of ELEVAGE_DOC_CATEGORIES) {
    if (cat.patterns.test(blob)) return cat.id;
  }
  if (lower(doc.module_source) === 'reproduction') return 'naissance';
  if (lower(doc.module_source) === 'sante') return 'sanitaire';
  return 'administratif';
}

export function groupElevageDocuments(documents = [], { animaux = [], lots = [] } = {}) {
  const animalMap = new Map(arr(animaux).map((a) => [String(a.id), a.name || a.nom || a.id]));
  const lotMap = new Map(arr(lots).map((l) => [String(l.id), l.name || l.nom || l.id]));

  const grouped = {};
  ELEVAGE_DOC_CATEGORIES.forEach((c) => { grouped[c.id] = []; });

  arr(documents)
    .filter((d) => /elevage|avicole|animaux|reproduction|sante|santé|transformation/.test(lower(d.module_source || '')))
    .forEach((doc) => {
      const cat = classifyElevageDocument(doc);
      const entityId = doc.entity_id || doc.animal_id || doc.related_id || doc.lot_id;
      const entityType = lower(doc.entity_type || '');
      let linkLabel = '—';
      if (entityType.includes('animal') || doc.animal_id) {
        linkLabel = animalMap.get(String(entityId)) || entityId || '—';
      } else if (entityType.includes('lot') || doc.lot_id) {
        linkLabel = lotMap.get(String(entityId)) || entityId || '—';
      }
      grouped[cat].push({ ...doc, vaultCategory: cat, linkLabel });
    });

  return grouped;
}
