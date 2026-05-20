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
const plainValue = (row, col) => String(row?.[col.key] ?? '').trim();

function MobileRowCard({ row, columns }) {
  const visibleColumns = columns.filter((col) => col.mobileHidden !== true);
  const titleColumn = visibleColumns.find((col) => col.mobileTitle) || visibleColumns[0];
  const metaColumns = visibleColumns.filter((col) => col.key !== titleColumn?.key).slice(0, 5);
  const actionColumns = columns.filter((col) => col.isAction || col.key === 'actions' || col.key === 'action');
  const bodyColumns = metaColumns.filter((col) => !actionColumns.includes(col));

  return (
    <article className="rounded-2xl border border-[#eadcc2] bg-white p-4 shadow-sm space-y-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">{titleColumn?.label || 'Élément'}</p>
        <div className="mt-1 text-base font-black text-[#2f2415] break-words">
          {titleColumn ? cellValue(row, titleColumn) : row?.id || 'Élément'}
        </div>
      </div>

      {bodyColumns.length ? (
        <dl className="grid grid-cols-1 gap-2">
          {bodyColumns.map((col) => (
            <div key={col.key} className="rounded-xl bg-[#fffdf8] border border-[#eadcc2]/70 px-3 py-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{col.label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-[#2f2415] break-words">{cellValue(row, col)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actionColumns.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#eadcc2] pt-3">
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
    <div className="overflow-hidden rounded-3xl border border-[#eadcc2] bg-white/90 shadow-sm">
      <div className="border-b border-[#eadcc2] bg-[#fffdf8]/70 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-base font-black text-[#2f2415]">{title}</p>
            <p className="mt-1 text-xs text-[#8a7456]">{sorted.length} élément(s) disponible(s)</p>
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

      <div className="block lg:hidden p-4 space-y-3 bg-[#fffdf8]/40">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`mobile-skeleton-${index}`} className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3">
                <div className="h-4 w-2/3 rounded-full bg-[#d6c3a0]/45 animate-pulse" />
                <div className="h-3 w-full rounded-full bg-[#d6c3a0]/35 animate-pulse" />
                <div className="h-3 w-1/2 rounded-full bg-[#d6c3a0]/35 animate-pulse" />
              </div>
            ))
          : null}
        {!loading && paged.length === 0 ? (
          <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-10 text-center text-sm text-[#8a7456]">
            {emptyMessage}
          </div>
        ) : null}
        {!loading && paged.length > 0 ? paged.map((row, index) => <MobileRowCard key={row.id ?? index} row={row} columns={columns} />) : null}
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eadcc2]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7456] ${col.sortable ? 'cursor-pointer hover:text-[#9a6b12]' : ''}`}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {sortKey === col.key ? <span className="ml-1 text-[#9a6b12]">{sortDir === 'asc' ? '↑' : '↓'}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-[#eadcc2]/70">
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-4">
                        <div className="h-3 rounded-full bg-[#d6c3a0]/45 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {!loading && paged.length === 0 ? (
              <tr>
                <td className="px-5 py-12 text-center text-sm text-[#8a7456]" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}

            {!loading && paged.length > 0
              ? paged.map((row, index) => (
                  <tr key={row.id ?? index} className={`border-b border-[#eadcc2]/60 transition-colors hover:bg-[#fffdf8] ${index % 2 === 0 ? 'bg-white/40' : 'bg-[#fffdf8]/35'}`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-4 text-[#7d6a4a] align-top">
                        {cellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#eadcc2] bg-[#fffdf8]/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-bold text-[#8a7456]">
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
