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
          <button type="button" onClick={close} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">Annuler</button>
          <button type="button" disabled={!canSubmit || busy} onClick={submit} className="rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? 'Enregistrement…' : 'Confirmer l’exception'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
          <p className="font-semibold">{issueLabel}</p>
          {issueDetail ? <p className="mt-1 text-xs">{issueDetail}</p> : null}
        </div>
        <p className="text-sm text-slate">
          <ShieldCheck size={14} className="inline text-positive" /> L’écart sera masqué des alertes actives, conservé dans l’audit et empêchera la recréation automatique de la même alerte. Réversible par un administrateur.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-earth">Raison</span>
          <select value={raison} onChange={(event) => setRaison(event.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2 outline-none">
            <option value="">Choisir une raison…</option>
            {JUSTIFIED_EXCEPTION_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-earth">Commentaire</span>
          <textarea value={commentaire} onChange={(event) => setCommentaire(event.target.value)} rows={4} placeholder="Explique pourquoi cet écart est acceptable." className="w-full rounded-xl border border-line bg-white px-3 py-2 outline-none" />
        </label>
      </div>
    </BaseModal>
  );
}
