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

export default function DataTable({
  title,
  rows = [],
  columns = [],
  loading,
  searchPlaceholder = 'Rechercher...',
  initialSortKey = '',
  pageSize = 8,
  rightActions,
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
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex flex-wrap gap-3 items-center justify-between">
        <p className="font-semibold text-[#2f2415]">{title}</p>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d6c3a0]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-[#8a7456] uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-emerald-400' : ''}`}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  {col.label}
                  {sortKey === col.key ? <span className="ml-1">{sortDir === 'asc' ? 'up' : 'down'}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-[#d6c3a0]/50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-3 rounded bg-[#d6c3a0]/60 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {!loading && paged.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#8a7456]" colSpan={columns.length}>
                  Aucune donnee disponible.
                </td>
              </tr>
            ) : null}

            {!loading && paged.length > 0
              ? paged.map((row, index) => (
                  <tr key={row.id ?? index} className={`border-b border-[#d6c3a0]/50 hover:bg-[#d6c3a0]/30 transition-colors ${index % 2 === 0 ? '' : 'bg-[#fffdf8]/30'}`}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-[#7d6a4a]">
                        {col.render ? col.render(row) : String(row?.[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-[#d6c3a0] flex items-center justify-between">
        <span className="text-xs text-[#8a7456]">
          {sorted.length} element(s) - page {safePage}/{totalPages}
        </span>
        <div className="flex gap-2">
          <Btn small variant="outline" icon={ChevronLeft} onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1}>
            Prec
          </Btn>
          <Btn small variant="outline" icon={ChevronRight} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages}>
            Suiv
          </Btn>
        </div>
      </div>
    </div>
  );
}
