import BaseModal from './BaseModal';
import Btn from '../components/Btn';

export default function DeleteModal({ open, onClose, onConfirm, title, itemLabel, loading }) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={title || 'Confirmer la suppression'}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={loading}>Annuler</Btn>
          <Btn variant="danger" onClick={onConfirm} disabled={loading}>{loading ? 'Suppression...' : 'Supprimer'}</Btn>
        </div>
      }
    >
      <p className="text-[#7d6a4a]">Voulez-vous vraiment supprimer cet element ?</p>
      {itemLabel ? <p className="mt-2 text-[#2f2415] font-semibold">{itemLabel}</p> : null}
      <p className="mt-2 text-xs text-red-400">Cette action est irreversible.</p>
    </BaseModal>
  );
}


