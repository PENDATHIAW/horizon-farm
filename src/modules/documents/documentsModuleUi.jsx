import { fmtCurrency } from '../../utils/format.js';

export const arr = (v) => (Array.isArray(v) ? v : []);
export const low = (v) => String(v || '').toLowerCase();
export const dateOf = (r = {}) => r.date || r.created_at || r.updated_at || r.event_date || '—';
export const labelOf = (r = {}) => r.title || r.nom || r.name || r.filename || r.libelle || r.id || 'Document';
export const typeOf = (r = {}) => r.type || r.categorie || r.category || r.module_source || 'Document';
export const detailOf = (r = {}) => r.description || r.notes || r.module_source || r.related_type || r.entity_type || '—';
export const amountOf = (r = {}) => Number(r.montant || r.amount || r.total || r.montant_total || 0);
export const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);
export const docIsProof = (r = {}) => /preuve|recu|reçu|facture|paiement|justificatif|finance|achat|vente/.test(low(`${typeOf(r)} ${labelOf(r)}`));
export const docIsReport = (r = {}) => /rapport|report|bilan|analyse|export/.test(low(`${typeOf(r)} ${labelOf(r)}`));
export const docIsMedia = (r = {}) => /image|photo|media|jpeg|jpg|png/.test(low(`${typeOf(r)} ${labelOf(r)} ${r.mime_type || ''}`));

export function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${cls}`}>{value}</p>
    </div>
  );
}

export function Section({ icon: Icon, title, children, action }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          {Icon ? <Icon size={20} /> : null} {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({ children, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-black ${primary ? 'bg-[#22c55e] text-[#052e16] border-emerald-400' : 'border-[#d6c3a0] bg-[#fffdf8] text-[#2f2415] hover:bg-[#dcfce7]'}`}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}

export function Row({ title, detail, value, tone = 'neutral', onClick }) {
  return (
    <button type="button" onClick={onClick} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]">
      <span className="font-black text-[#2f2415]">{title}</span>
      <span className="text-sm text-[#8a7456]">{detail}</span>
      <Pill tone={tone}>{value}</Pill>
    </button>
  );
}

export function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className="mt-1 font-black text-[#2f2415]">{value}</p>
    </div>
  );
}

export function Empty({ label }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>;
}

export function DomainGauge({ label, pct = 0, gapCount = 0 }) {
  const tone = pct >= 85 ? 'good' : pct >= 60 ? 'warn' : 'bad';
  const barCls = tone === 'good' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-black text-[#2f2415]">{label}</span>
        <span className={`font-black ${tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-red-700'}`}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#eadcc2]/80">
        <div className={`h-2 rounded-full ${barCls}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      {gapCount ? <p className="mt-2 text-[10px] font-bold text-amber-700">{gapCount} écart(s) à traiter</p> : <p className="mt-2 text-[10px] text-[#8a7456]">Couverture documentaire</p>}
    </div>
  );
}

export function formatMissingRow(row) {
  return {
    id: row.id,
    title: labelOf(row),
    detail: `${dateOf(row)} · ${fmtCurrency(amountOf(row))}`,
    amount: amountOf(row),
    trxId: row.id,
  };
}
