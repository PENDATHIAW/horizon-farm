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
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

export function Section({ icon: Icon, title, children, action }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-earth">
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
      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${primary ? 'bg-leaf text-earth border-positive' : 'border-line bg-card text-earth hover:bg-positive-bg'}`}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-positive bg-positive-bg text-positive' : tone === 'warn' ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : tone === 'bad' ? 'border-urgent bg-urgent-bg text-urgent' : 'border-line bg-card text-slate';
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function Row({ title, detail, value, tone = 'neutral', onClick }) {
  return (
    <button type="button" onClick={onClick} className="grid w-full grid-cols-1 gap-2 border-b border-line/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-card">
      <span className="font-semibold text-earth">{title}</span>
      <span className="text-sm text-slate">{detail}</span>
      <Pill tone={tone}>{value}</Pill>
    </button>
  );
}

export function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className="mt-1 font-semibold text-earth">{value}</p>
    </div>
  );
}

export function Empty({ label }) {
  return <div className="rounded-2xl border border-line bg-card p-6 text-sm text-slate">{label}</div>;
}

export function DomainGauge({ label, pct = 0, gapCount = 0 }) {
  const tone = pct >= 85 ? 'good' : pct >= 60 ? 'warn' : 'bad';
  const barCls = tone === 'good' ? 'bg-positive' : tone === 'warn' ? 'bg-vigilance' : 'bg-urgent';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-earth">{label}</span>
        <span className={`font-semibold ${tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : 'text-urgent'}`}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-line/80">
        <div className={`h-2 rounded-full ${barCls}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      {gapCount ? <p className="mt-2 text-meta font-semibold text-horizon-dark">{gapCount} écart(s) à traiter</p> : <p className="mt-2 text-meta text-slate">Couverture documentaire</p>}
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
