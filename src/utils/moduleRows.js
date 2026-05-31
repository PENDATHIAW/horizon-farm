const arr = (value) => (Array.isArray(value) ? value : []);

/** Rows from scoped props — empty period result must not fall back to full CRUD. */
export function rowsOf(provided, crud, periodFiltered = false) {
  const fromProps = arr(provided);
  if (fromProps.length) return fromProps;
  if (periodFiltered) return [];
  return arr(crud?.rows);
}

/** Unfiltered reference rows (snapshots, créances, objectifs annuels). */
export function allRows(provided, crud) {
  return arr(provided).length ? arr(provided) : arr(crud?.rows);
}
