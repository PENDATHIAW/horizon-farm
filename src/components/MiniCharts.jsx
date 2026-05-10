import { fmtCurrency, fmtNumber } from '../utils/format';

const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const maxOf = (rows = [], keys = ['value']) => Math.max(1, ...rows.flatMap((row) => keys.map((key) => safeNumber(row[key]))));

export function MiniBarChart({ title, subtitle, rows = [], valueKey = 'value', labelKey = 'label', currency = false }) {
  const max = maxOf(rows, [valueKey]);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <div className="mb-3">
        <p className="font-black text-[#2f2415]">{title}</p>
        {subtitle ? <p className="text-xs text-[#8a7456]">{subtitle}</p> : null}
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const value = safeNumber(row[valueKey]);
          const width = Math.max(4, Math.round((value / max) * 100));
          return (
            <div key={row[labelKey]} className="grid grid-cols-[72px_1fr_92px] gap-2 items-center text-xs">
              <span className="text-[#8a7456] truncate">{row[labelKey]}</span>
              <div className="h-3 rounded-full bg-[#f3ead8] overflow-hidden">
                <div className="h-full rounded-full bg-[#c9a96a]" style={{ width: `${width}%` }} />
              </div>
              <span className="text-right font-bold text-[#2f2415] truncate">{currency ? fmtCurrency(value) : fmtNumber(value)}</span>
            </div>
          );
        })}
        {!rows.length ? <p className="text-sm text-[#8a7456]">Aucune donnée suffisante.</p> : null}
      </div>
    </div>
  );
}

export function MiniLineChart({ title, subtitle, rows = [], series = [], labelKey = 'label' }) {
  const width = 460;
  const height = 170;
  const pad = 22;
  const max = maxOf(rows, series.map((item) => item.key));
  const x = (index) => rows.length <= 1 ? pad : pad + (index * (width - pad * 2)) / (rows.length - 1);
  const y = (value) => height - pad - (safeNumber(value) / max) * (height - pad * 2);
  const colors = ['#2f2415', '#c9a96a', '#0f766e', '#dc2626'];

  const pathFor = (key) => rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(row[key])}`).join(' ');

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#2f2415]">{title}</p>
          {subtitle ? <p className="text-xs text-[#8a7456]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {series.map((item, index) => <span key={item.key} className="text-[11px] text-[#8a7456]"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: colors[index % colors.length] }} />{item.label}</span>)}
        </div>
      </div>
      {rows.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44" role="img" aria-label={title}>
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#eadcc2" />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#eadcc2" />
          {series.map((item, index) => <path key={item.key} d={pathFor(item.key)} fill="none" stroke={colors[index % colors.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
          {rows.map((row, index) => <text key={row[labelKey]} x={x(index)} y={height - 4} textAnchor="middle" fontSize="10" fill="#8a7456">{row[labelKey]}</text>)}
        </svg>
      ) : <p className="text-sm text-[#8a7456]">Aucune donnée suffisante.</p>}
    </div>
  );
}

export function MiniDonut({ title, subtitle, rows = [], labelKey = 'label', valueKey = 'value' }) {
  const total = rows.reduce((sum, row) => sum + safeNumber(row[valueKey]), 0);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <div className="mb-3">
        <p className="font-black text-[#2f2415]">{title}</p>
        {subtitle ? <p className="text-xs text-[#8a7456]">{subtitle}</p> : null}
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const value = safeNumber(row[valueKey]);
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return <div key={row[labelKey]} className="flex items-center justify-between rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 text-sm"><span className="text-[#7d6a4a]">{row[labelKey]}</span><b className="text-[#2f2415]">{fmtNumber(value)} · {pct}%</b></div>;
        })}
        {!rows.length ? <p className="text-sm text-[#8a7456]">Aucune donnée suffisante.</p> : null}
      </div>
    </div>
  );
}
