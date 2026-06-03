import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { History, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { canPerformSystemAction } from '../../utils/systemAccessWorkflows.js';
import { reasonLabel } from '../../utils/justifiedExceptionRules.js';
import {
  buildJustifiedExceptionAuditEvent,
  readJustifiedExceptions,
  revokeJustifiedException,
} from '../../utils/justifiedExceptionStore.js';

function formatDate(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR');
}

export default function JustifiedExceptionsAuditPanel({ onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const { role, user } = useAuth();
  const canManage = canPerformSystemAction(role, 'modifier');
  const [rows, setRows] = useState(() => readJustifiedExceptions());
  const [busyKey, setBusyKey] = useState('');

  useEffect(() => {
    const refresh = () => setRows(readJustifiedExceptions());
    refresh();
    window.addEventListener('horizon-farm-justified-exceptions-changed', refresh);
    return () => window.removeEventListener('horizon-farm-justified-exceptions-changed', refresh);
  }, []);

  const activeCount = useMemo(() => rows.filter((row) => row.active !== false).length, [rows]);
  const revokedCount = rows.length - activeCount;

  const revoke = async (row) => {
    if (!canManage) return toast.error('Action réservée aux administrateurs.');
    try {
      setBusyKey(row.issue_key);
      const revoked = revokeJustifiedException(row.issue_key, user?.email || user?.user_metadata?.full_name || 'admin');
      const event = buildJustifiedExceptionAuditEvent(revoked, 'justified_exception_revoked');
      await onCreateBusinessEvent?.({ id: `EVT-${revoked.id}-REV`, ...event });
      await onRefreshBusinessEvents?.();
      toast.success('Exception révoquée — l’écart réapparaîtra dans les alertes actives.');
    } catch (error) {
      toast.error(error.message || 'Révocation impossible');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><History size={20} /> Exceptions justifiées</p>
        <p className="mt-1 text-sm text-[#8a7456]">Traçabilité des écarts masqués volontairement. Les données source ne sont jamais supprimées.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs uppercase text-emerald-700">Actives</p><p className="mt-1 text-xl font-black text-emerald-800">{activeCount}</p></div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase text-[#8a7456]">Révoquées</p><p className="mt-1 text-xl font-black text-[#2f2415]">{revokedCount}</p></div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase text-[#8a7456]">Total audit</p><p className="mt-1 text-xl font-black text-[#2f2415]">{rows.length}</p></div>
      </div>
      {!rows.length ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune exception justifiée enregistrée.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Raison</th>
                <th className="px-3 py-2">Commentaire</th>
                <th className="px-3 py-2">Utilisateur</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Issue</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row) => (
                <tr key={row.id || row.issue_key} className="border-b border-[#eadcc2]/70">
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${row.active !== false ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#eadcc2] bg-white text-[#8a7456]'}`}>
                      {row.active !== false ? 'Active' : 'Révoquée'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold text-[#2f2415]">{reasonLabel(row.raison)}</td>
                  <td className="px-3 py-2 text-[#8a7456]">{row.commentaire || '—'}</td>
                  <td className="px-3 py-2">{row.utilisateur || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.date || row.created_at)}</td>
                  <td className="px-3 py-2">{row.source_module || '—'} · {row.source_record_id || '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-[#8a7456]">{row.issue_key}</td>
                  <td className="px-3 py-2">{row.type_exception || '—'}</td>
                  <td className="px-3 py-2">
                    {row.active !== false && canManage ? (
                      <button type="button" disabled={busyKey === row.issue_key} onClick={() => revoke(row)} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800 disabled:opacity-40">
                        <RotateCcw size={12} className="inline" /> Révoquer
                      </button>
                    ) : row.active === false ? (
                      <span className="text-xs text-[#8a7456]">Par {row.revoked_by || 'admin'}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[#8a7456]"><ShieldCheck size={12} /> Lecture seule</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
