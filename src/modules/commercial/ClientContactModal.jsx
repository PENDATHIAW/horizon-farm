import { MessageCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import BaseModal from '../../modals/BaseModal.jsx';
import { toWhatsappLink } from '../../utils/ids';

const phoneOf = (client = {}) => client.whatsapp || client.tel || client.phone || '';
const nameOf = (client = {}) => client.nom || client.name || client.id || 'Client';

export default function ClientContactModal({
  open,
  onClose,
  client,
  title = 'Contacter le client',
  defaultMessage = '',
  onWhatsAppLog,
  onAfterSend,
}) {
  const [message, setMessage] = useState(defaultMessage);

  useEffect(() => {
    if (open) setMessage(defaultMessage);
  }, [open, defaultMessage]);

  if (!client) return null;

  const phone = phoneOf(client);
  const call = () => {
    if (!phone) return toast.error('Aucun numéro renseigné pour ce client');
    window.open(`tel:${phone}`, '_self');
    onAfterSend?.('call');
  };
  const whatsapp = async () => {
    if (!phone) return toast.error('Aucun numéro WhatsApp / téléphone renseigné');
    const text = message.trim() || defaultMessage;
    try {
      await onWhatsAppLog?.(client, text);
    } catch (error) {
      console.warn(error.message);
    }
    window.open(toWhatsappLink(phone, text), '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp ouvert');
    onAfterSend?.('whatsapp');
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <div className="flex flex-wrap gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Fermer</Btn>
          <Btn variant="outline" icon={Phone} onClick={call} disabled={!phone}>Appeler</Btn>
          <Btn variant="whatsapp" icon={MessageCircle} onClick={whatsapp} disabled={!phone}>Envoyer WhatsApp</Btn>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
          <p className="font-black text-[#2f2415]">{nameOf(client)}</p>
          <p className="text-sm text-[#8a7456] mt-1">{phone || 'Numéro non renseigné'}</p>
        </div>
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase text-[#8a7456]">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            placeholder="Votre message au client…"
          />
        </label>
        <p className="text-xs text-[#8a7456]">Modifiez le message avant envoi. L&apos;appel ouvre votre téléphone ; WhatsApp ouvre l&apos;application avec le texte prérempli.</p>
      </div>
    </BaseModal>
  );
}
