import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import BaseModal from '../../modals/BaseModal.jsx';
import { JUSTIFIED_EXCEPTION_REASONS } from '../../utils/justifiedExceptionRules.js';

export default function JustifiedExceptionModal({
  open,
  onClose,
  onSubmit,
  issueLabel = 'Écart détecté',
  issueDetail = '',
  busy = false,
}) {
  const [raison, setRaison] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const canSubmit = useMemo(() => Boolean(raison.trim()), [raison]);

  const reset = () => {
    setRaison('');
    setCommentaire('');
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const submit = async () => {
    if (!canSubmit || busy) return;
    await onSubmit?.({ raison: raison.trim(), commentaire: commentaire.trim() });
    reset();
  };

  return (
    <BaseModal
      open={open}
      title="Marquer comme exception justifiée"
      onClose={close}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={close} className="rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Annuler</button>
          <button type="button" disabled={!canSubmit || busy} onClick={submit} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
            {busy ? 'Enregistrement…' : 'Confirmer l’exception'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">{issueLabel}</p>
          {issueDetail ? <p className="mt-1 text-xs">{issueDetail}</p> : null}
        </div>
        <p className="text-sm text-[#8a7456]">
          <ShieldCheck size={14} className="inline text-emerald-600" /> L’écart sera masqué des alertes actives, conservé dans l’audit et empêchera l’IA de recréer la même alerte. Réversible par un administrateur.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-black text-[#2f2415]">Raison</span>
          <select value={raison} onChange={(event) => setRaison(event.target.value)} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 outline-none">
            <option value="">Choisir une raison…</option>
            {JUSTIFIED_EXCEPTION_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-black text-[#2f2415]">Commentaire</span>
          <textarea value={commentaire} onChange={(event) => setCommentaire(event.target.value)} rows={4} placeholder="Explique pourquoi cet écart est acceptable." className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 outline-none" />
        </label>
      </div>
    </BaseModal>
  );
}
