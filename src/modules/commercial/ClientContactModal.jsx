import { MessageCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import BaseModal from '../../modals/BaseModal.jsx';
import { callPhone, openWhatsAppApp } from '../../utils/contactActions';
import { whatsAppStatusLabel } from '../../utils/whatsappCommercial.js';

const phoneOf = (client = {}) => client.whatsapp || client.tel || client.phone || '';
const nameOf = (client = {}) => client.nom || client.name || client.id || 'Client';

export default function ClientContactModal({
  open,
  onClose,
  client,
  title = 'Contacter le client',
  defaultMessage = '',
  onWhatsAppLog,
  onWhatsAppOpened,
  onMarkWhatsAppSent,
  onAfterSend,
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [lastLogId, setLastLogId] = useState('');
  const [lastStatus, setLastStatus] = useState('');

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setLastLogId('');
      setLastStatus('');
    }
  }, [open, defaultMessage]);

  if (!client) return null;

  const phone = phoneOf(client);
  const call = () => {
    if (!callPhone(phone)) return;
    onAfterSend?.('call');
  };
  const whatsapp = async () => {
    const text = (message.trim() || defaultMessage || '').trim();
    if (!text) return toast.error('Écrivez un message avant envoi');
    let logId = '';
    try {
      logId = await onWhatsAppLog?.(client, text);
      setLastLogId(logId || '');
      setLastStatus('prepare');
    } catch (error) {
      console.warn(error.message);
    }
    try {
      await openWhatsAppApp({ phone, message: text, fallbackWeb: true });
      if (logId) {
        await onWhatsAppOpened?.(logId);
        setLastStatus('ouvert');
      }
      onAfterSend?.('whatsapp');
    } catch {
      /* toast déjà affiché */
    }
  };
  const markSent = async () => {
    if (!lastLogId) return toast.error('Préparez d\'abord le message WhatsApp');
    await onMarkWhatsAppSent?.(lastLogId);
    setLastStatus('envoye_manuel');
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
          <Btn variant="whatsapp" icon={MessageCircle} onClick={whatsapp} disabled={!phone}>Ouvrir WhatsApp</Btn>
          {onMarkWhatsAppSent && lastLogId ? (
            <Btn variant="outline" onClick={markSent}>Marquer envoyé manuellement</Btn>
          ) : null}
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
          <p className="font-black text-[#2f2415]">{nameOf(client)}</p>
          <p className="text-sm text-[#8a7456] mt-1">{phone || 'Numéro non renseigné'}</p>
          {lastStatus ? (
            <p className="mt-2 text-xs font-bold text-[#9a6b12]">
              Statut :
              {' '}
              {whatsAppStatusLabel(lastStatus)}
            </p>
          ) : null}
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
        <p className="text-xs text-[#8a7456]">
          WhatsApp ouvre l&apos;application avec le texte prérempli — l&apos;envoi n&apos;est confirmé que si vous cliquez sur &ldquo;Marquer envoyé manuellement&rdquo;.
        </p>
      </div>
    </BaseModal>
  );
}
