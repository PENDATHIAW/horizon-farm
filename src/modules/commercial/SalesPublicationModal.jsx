import { Copy, MessageCircle, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import BaseModal from '../../modals/BaseModal.jsx';
import {
  CLIENT_TYPES,
  DEFAULT_MIN_MARGIN_PCT,
  generateSalesPublication,
  PUBLICATION_CHANNELS,
} from '../../services/aiGateway/salesPublicationGenerator.js';
import { copyContactMessage, openWhatsAppApp } from '../../utils/contactActions';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { daysUntilDlc } from '../../utils/stockFreshProduct';
import { dlcOf, productNameOf, quantityOf, unitCostOf, unitOf, unitPriceOf } from '../../utils/sellableStock';

const CLIENT_LABELS = {
  particulier: 'Particulier',
  restaurant: 'Restaurant',
  grossiste: 'Grossiste',
};

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  sms: 'SMS',
};

function OutputBlock({ label, text, onCopy }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">{label}</p>
        <button
          type="button"
          onClick={() => onCopy(text)}
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-meta font-semibold text-earth"
        >
          <Copy size={12} />
          Copier
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-earth font-sans leading-relaxed">{text}</pre>
    </div>
  );
}

export default function SalesPublicationModal({
  open,
  onClose,
  stockRow = null,
  defaultClientType = 'particulier',
  defaultChannel = 'whatsapp',
  contactPhone = '',
  onWhatsAppLog,
}) {
  const [clientType, setClientType] = useState(defaultClientType);
  const [channel, setChannel] = useState(defaultChannel);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setClientType(defaultClientType);
        setChannel(defaultChannel);
      });
    }
  }, [open, defaultClientType, defaultChannel]);

  const publication = useMemo(() => {
    if (!open || !stockRow) return null;
    return generateSalesPublication({
      stockRow,
      clientType,
      channel,
      minMarginPct: DEFAULT_MIN_MARGIN_PCT,
    });
  }, [open, stockRow, clientType, channel]);

  if (!stockRow) return null;

  const name = productNameOf(stockRow);
  const qty = quantityOf(stockRow);
  const unit = unitOf(stockRow);
  const price = unitPriceOf(stockRow);
  const cost = unitCostOf(stockRow);
  const dlc = dlcOf(stockRow);
  const daysDlc = daysUntilDlc(stockRow);

  const copyText = async (text) => {
    await copyContactMessage(text || '');
  };

  const pickMessageForChannel = () => {
    if (!publication) return '';
    if (clientType === 'grossiste' || clientType === 'restaurant') return publication.b2b_message;
    if (channel === 'facebook') return publication.social_post;
    return publication.short_message;
  };

  const openSendChannel = async () => {
    const text = pickMessageForChannel();
    if (!text.trim()) return toast.error('Générez d’abord un contenu');
    if (channel === 'facebook') {
      await copyContactMessage(text);
      toast.success('Post copié — collez-le sur Facebook après relecture.');
      return;
    }
    if (channel === 'sms') {
      await copyContactMessage(text);
      const body = encodeURIComponent(text);
      window.location.href = contactPhone ? `sms:${contactPhone}?body=${body}` : `sms:?body=${body}`;
      toast.success('SMS préparé — validez l’envoi sur votre téléphone.');
      return;
    }
    if (!contactPhone) {
      await copyContactMessage(text);
      return toast('Message copié — ajoutez un numéro client ou collez dans WhatsApp.');
    }
    try {
      await onWhatsAppLog?.({ nom: 'Publication stock', whatsapp: contactPhone }, text);
      await openWhatsAppApp({ phone: contactPhone, message: text, fallbackWeb: true });
      toast.success('WhatsApp ouvert — validez l’envoi après relecture.');
    } catch {
      /* toast géré */
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Publication commerciale"
      footer={(
        <div className="flex flex-wrap gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Fermer</Btn>
          <Btn variant="outline" icon={Copy} onClick={() => copyText(pickMessageForChannel())}>Copier le message actif</Btn>
          <Btn variant="whatsapp" icon={Send} onClick={openSendChannel}>
            {channel === 'facebook' ? 'Copier pour Facebook' : channel === 'sms' ? 'Préparer SMS' : 'Ouvrir WhatsApp'}
          </Btn>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="font-semibold text-earth flex items-center gap-2">
            <Sparkles size={16} className="text-horizon-dark" />
            {name}
          </p>
          <p className="mt-1 text-sm text-slate">
            {fmtNumber(qty)} {unit} · {fmtCurrency(price)} / {unit}
            {cost > 0 ? ` · coût ${fmtCurrency(cost)}` : ''}
          </p>
          {dlc ? (
            <p className="mt-1 text-xs font-semibold text-horizon-dark">
              DLC {dlc}{daysDlc != null ? ` (J${daysDlc >= 0 ? `-${daysDlc}` : `+${Math.abs(daysDlc)}`} ${daysDlc < 0 ? 'expiré' : 'restants'})` : ''}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-slate">Type client</span>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
            >
              {CLIENT_TYPES.map((type) => (
                <option key={type} value={type}>{CLIENT_LABELS[type]}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-slate">Canal</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
            >
              {PUBLICATION_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
              ))}
            </select>
          </label>
        </div>

        {publication ? (
          <>
            <OutputBlock label="Message court" text={publication.short_message} onCopy={copyText} />
            <OutputBlock label="Message professionnel B2B" text={publication.b2b_message} onCopy={copyText} />
            <OutputBlock label="Post social" text={publication.social_post} onCopy={copyText} />

            {publication.promotional_offer ? (
              <div className={`rounded-xl border p-3 text-sm ${publication.promotional_offer.available ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-card'}`}>
                <p className="font-semibold text-earth">
                  {publication.promotional_offer.available ? publication.promotional_offer.label : 'Offre promotionnelle'}
                </p>
                {publication.promotional_offer.available ? (
                  <p className="mt-1 text-slate">
                    {fmtCurrency(publication.promotional_offer.suggested_unit_price)} / {unit}
                    {' '}
                    (−{publication.promotional_offer.discount_percent} % vs {fmtCurrency(price)})
                    {' — '}
                    {publication.promotional_offer.note}
                  </p>
                ) : (
                  <p className="mt-1 text-slate">{publication.promotional_offer.reason}</p>
                )}
              </div>
            ) : null}

            <ul className="text-meta text-slate list-disc pl-4 space-y-1">
              {publication.warnings?.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </>
        ) : null}

        <p className="text-xs text-slate flex items-start gap-2">
          <MessageCircle size={14} className="shrink-0 mt-1" />
          Aucun envoi ni changement de prix automatique. Vous copiez ou validez l’envoi manuellement.
        </p>
      </div>
    </BaseModal>
  );
}
