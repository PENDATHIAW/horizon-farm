import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import Btn from './Btn';
import VoiceSearch from './VoiceSearch';

const sortRows = (rows, key, direction) => {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const va = a?.[key];
    const vb = b?.[key];

    if (typeof va === 'number' && typeof vb === 'number') {
      return direction === 'asc' ? va - vb : vb - va;
    }

    const sa = String(va ?? '').toLowerCase();
    const sb = String(vb ?? '').toLowerCase();
    if (sa < sb) return direction === 'asc' ? -1 : 1;
    if (sa > sb) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

const cellValue = (row, col) => col.render ? col.render(row) : String(row?.[col.key] ?? '-');

function MobileRowCard({ row, columns }) {
  const visibleColumns = columns.filter((col) => col.mobileHidden !== true);
  const titleColumn = visibleColumns.find((col) => col.mobileTitle) || visibleColumns[0];
  const metaColumns = visibleColumns.filter((col) => col.key !== titleColumn?.key).slice(0, 5);
  const actionColumns = columns.filter((col) => col.isAction || col.key === 'actions' || col.key === 'action');
  const bodyColumns = metaColumns.filter((col) => !actionColumns.includes(col));

  return (
    <article className="space-y-3 rounded-card border border-line bg-card p-4 shadow-card">
      <div>
        <p className="text-meta font-semibold uppercase text-slate">{titleColumn?.label || 'Élément'}</p>
        <div className="mt-1 break-words text-base font-semibold text-ink">
          {titleColumn ? cellValue(row, titleColumn) : row?.id || 'Élément'}
        </div>
      </div>

      {bodyColumns.length ? (
        <dl className="grid grid-cols-1 gap-2">
          {bodyColumns.map((col) => (
            <div key={col.key} className="rounded-control border border-line bg-mist px-3 py-2">
              <dt className="text-meta font-medium uppercase text-slate">{col.label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-ink">{cellValue(row, col)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actionColumns.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {actionColumns.map((col) => <div key={col.key}>{cellValue(row, col)}</div>)}
        </div>
      ) : null}
    </article>
  );
}

export default function DataTable({
  title,
  rows = [],
  columns = [],
  loading,
  searchPlaceholder = 'Rechercher...',
  initialSortKey = '',
  pageSize = 8,
  rightActions,
  emptyMessage = 'Aucune donnée disponible.',
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => String(row?.[col.key] ?? '').toLowerCase().includes(q))
    );
  }, [rows, columns, search]);

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
      <div className="border-b border-line bg-card px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-base font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs text-slate">{sorted.length} élément(s) disponible(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <VoiceSearch
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
            />
            {rightActions}
          </div>
        </div>
      </div>

      <div className="block space-y-3 bg-mist p-4 lg:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`mobile-skeleton-${index}`} className="space-y-3 rounded-card border border-line bg-card p-4">
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-neutral-bg" />
                <div className="h-3 w-full animate-pulse rounded-full bg-neutral-bg" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-neutral-bg" />
              </div>
            ))
          : null}
        {!loading && paged.length === 0 ? (
          <div className="hf-empty-state">
            {emptyMessage}
          </div>
        ) : null}
        {!loading && paged.length > 0 ? paged.map((row, index) => <MobileRowCard key={`${row.id ?? 'row'}-${index}`} row={row} columns={columns} />) : null}
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3 text-meta font-semibold uppercase text-slate ${col.numeric ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer hover:text-earth' : ''}`}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {sortKey === col.key ? <span className="ml-1 text-horizon-dark">{sortDir === 'asc' ? '↑' : '↓'}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-line">
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4">
                        <div className="h-3 animate-pulse rounded-full bg-neutral-bg" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {!loading && paged.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center text-sm text-slate" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}

            {!loading && paged.length > 0
              ? paged.map((row, index) => (
                  <tr key={`${row.id ?? 'row'}-${index}`} className="border-b border-line bg-card transition-colors hover:bg-mist">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-6 py-4 align-top text-slate ${col.numeric ? 'text-right font-semibold tabular-nums' : 'text-left'}`}>
                        {cellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-mist px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-slate">
          Page {safePage}/{totalPages} · {sorted.length} élément(s)
        </span>
        <div className="flex gap-2">
          <Btn small variant="outline" icon={ChevronLeft} onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1}>
            Préc.
          </Btn>
          <Btn small variant="outline" icon={ChevronRight} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages}>
            Suiv.
          </Btn>
        </div>
      </div>
    </div>
  );
}
