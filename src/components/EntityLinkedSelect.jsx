/**
 * Sélecteur entité filtré par module (Avicole → lots, Animaux → animaux, etc.).
 */
const arr = (value) => (Array.isArray(value) ? value : []);
const labelOf = (row = {}, fallback = '') => row.name || row.nom || row.title || row.libelle || row.produit || row.id || fallback;

export const ENTITY_MODULE_SOURCES = [
  { value: 'avicole', label: 'Avicole', entityKey: 'lot_id', entityType: 'lot_avicole', rowsKey: 'lots' },
  { value: 'animaux', label: 'Animaux', entityKey: 'animal_id', entityType: 'animal', rowsKey: 'animaux' },
  { value: 'cultures', label: 'Cultures', entityKey: 'culture_id', entityType: 'culture', rowsKey: 'cultures' },
  { value: 'stock', label: 'Stock', entityKey: 'stock_id', entityType: 'stock', rowsKey: 'stocks' },
  { value: 'clients', label: 'Clients', entityKey: 'client_id', entityType: 'client', rowsKey: 'clients' },
  { value: 'ventes', label: 'Ventes / clients', entityKey: 'client_id', entityType: 'client', rowsKey: 'clients' },
  { value: 'smartfarm', label: 'Smart Farm', entityKey: 'device_id', entityType: 'sensor', rowsKey: 'sensorDevices' },
];

export function buildEntityLinkedFieldOptions(context = {}) {
  return ENTITY_MODULE_SOURCES
    .filter((source) => arr(context[source.rowsKey]).length > 0)
    .map((source) => ({
      ...source,
      options: arr(context[source.rowsKey])
        .filter((row) => row?.id)
        .map((row) => ({ value: row.id, label: `${labelOf(row)} · ${row.id}` })),
    }));
}

export function resolveEntityLinkedFields(form = {}) {
  const source = ENTITY_MODULE_SOURCES.find((item) => item.value === form.module_lie);
  if (!source) return form;
  const entityId = form.entity_id || form[source.entityKey] || '';
  return {
    ...form,
    entity_type: source.entityType,
    entity_id: entityId,
    related_id: entityId,
    [source.entityKey]: entityId,
  };
}

export default function EntityLinkedSelect({
  moduleValue = '',
  entityValue = '',
  onModuleChange,
  onEntityChange,
  context = {},
  moduleLabel = 'Module lié',
  entityLabel = 'Entité liée',
  disabled = false,
}) {
  const sources = buildEntityLinkedFieldOptions(context);
  const active = sources.find((source) => source.value === moduleValue) || sources[0];
  const options = active?.options || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2">
      <label className="space-y-1">
        <span className="text-xs text-slate">{moduleLabel}</span>
        <select
          disabled={disabled || !sources.length}
          value={moduleValue || active?.value || ''}
          onChange={(e) => onModuleChange?.(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm text-earth bg-card border-line"
        >
          {!sources.length ? <option value="">Aucun module avec fiches</option> : null}
          {sources.map((source) => (
            <option key={source.value} value={source.value}>{source.label}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-slate">{entityLabel}</span>
        <select
          disabled={disabled || !options.length}
          value={entityValue || ''}
          onChange={(e) => onEntityChange?.(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm text-earth bg-card border-line"
        >
          <option value="">{options.length ? 'Sélectionner…' : 'Aucune entité pour ce module'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
