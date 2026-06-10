import { MessageCircle } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

/** Teaser Résumé — pointe vers l'onglet Relances (pas de doublon du panneau complet). */
export default function CommercialRelancesTeaser({ rows = [], setTab }) {
  const count = rows.length;
  if (!count) return null;
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const urgent = rows.filter((r) => r.priority === 'Urgent').length;

  return (
    <button
      type="button"
      onClick={() => setTab?.('Relances')}
      className="w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-left hover:bg-amber-100/80 transition"
    >
      <p className="text-[11px] font-black uppercase tracking-wide text-amber-900 flex items-center gap-2">
        <MessageCircle size={14} />
        Relances clients
      </p>
      <p className="mt-1 text-lg font-black text-[#2f2415]">
        {count} relance(s) · {fmtCurrency(total)}
      </p>
      <p className="mt-1 text-xs text-amber-800">
        {urgent ? `${urgent} prioritaire(s) — ` : ''}
        Ouvrir l&apos;onglet Relances pour WhatsApp, SMS et planification
      </p>
    </button>
  );
}
