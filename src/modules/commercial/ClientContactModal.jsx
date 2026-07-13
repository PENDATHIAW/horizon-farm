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
      queueMicrotask(() => {
        setMessage(defaultMessage);
        setLastLogId('');
        setLastStatus('');
      });
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
        <div className="rounded-xl border border-line bg-card p-3">
          <p className="font-semibold text-earth">{nameOf(client)}</p>
          <p className="text-sm text-slate mt-1">{phone || 'Numéro non renseigné'}</p>
          {lastStatus ? (
            <p className="mt-2 text-xs font-semibold text-horizon-dark">
              Statut :
              {' '}
              {whatsAppStatusLabel(lastStatus)}
            </p>
          ) : null}
        </div>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase text-slate">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-earth focus:outline-none focus:ring-2 focus:ring-positive"
            placeholder="Votre message au client…"
          />
        </label>
        <p className="text-xs text-slate">
          WhatsApp ouvre l&apos;application avec le texte prérempli — l&apos;envoi n&apos;est confirmé que si vous cliquez sur &ldquo;Marquer envoyé manuellement&rdquo;.
        </p>
      </div>
    </BaseModal>
  );
}
