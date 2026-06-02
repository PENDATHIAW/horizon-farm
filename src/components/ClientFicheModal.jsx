import { useEffect, useState } from 'react';
import BaseModal from '../modals/BaseModal';
import FicheTabsBar from './FicheTabsBar.jsx';
import Badge from './Badge';
import { fmtCurrency, fmtNumber } from '../utils/format';

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <p className="mt-1 text-sm font-semibold text-[#2f2415] break-words">{value ?? '-'}</p>
  </div>
);

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
    <h3 className="text-sm font-black text-[#2f2415] mb-3">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);

export default function ClientFicheModal({ open, onClose, client, metrics = {}, salesSummary = {}, segment = {} }) {
  const [tab, setTab] = useState('identite');

  useEffect(() => {
    if (open) setTab('identite');
  }, [open, client?.id]);

  if (!client) return null;

  const tabs = [
    { id: 'identite', label: 'Identité' },
    { id: 'ventes', label: 'Ventes & CA', badge: salesSummary.orders?.length || null },
    { id: 'creances', label: 'Créances' },
    { id: 'profil', label: 'Profil' },
  ];

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche client — ${client.nom || client.name || client.id}`} size="4xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#d6c3a0] bg-[#2f2415] p-4 text-white flex flex-wrap items-center gap-3">
          {client.photo_url ? <img src={client.photo_url} alt="" className="h-16 w-16 rounded-full object-cover border border-white/20" /> : <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-black">{client.nom?.[0] || 'C'}</div>}
          <div><p className="text-xs uppercase tracking-widest text-[#c9a96a]">Client</p><h2 className="text-xl font-black">{client.nom || client.name}</h2><p className="text-sm text-[#f4e6c8]">{client.tel || client.telephone || 'Téléphone non renseigné'}</p></div>
          <Badge status={client.statut || client.status || 'actif'} />
        </div>
        <FicheTabsBar tabs={tabs} active={tab} onChange={setTab} />
        {tab === 'identite' ? (
          <Section title="Coordonnées">
            <Field label="Nom" value={client.nom || client.name} />
            <Field label="Téléphone" value={client.tel || client.telephone} />
            <Field label="Email" value={client.email} />
            <Field label="Adresse / zone" value={client.adresse || client.zone || client.ville} />
            <Field label="WhatsApp" value={client.whatsapp || client.tel} />
            <Field label="Notes" value={client.notes} />
          </Section>
        ) : null}
        {tab === 'ventes' ? (
          <Section title="Historique ventes ERP">
            <Field label="CA total" value={fmtCurrency(salesSummary.totalAchete ?? metrics.total ?? client.total_achats)} />
            <Field label="Payé" value={fmtCurrency(salesSummary.totalPaye ?? client.total_paye_ventes)} />
            <Field label="Commandes" value={fmtNumber(salesSummary.orders?.length ?? client.commandes_erp ?? 0)} />
            <Field label="Panier moyen" value={fmtCurrency(segment.averageBasket ?? metrics.averageBasketEstimate)} />
            <Field label="Dernière commande" value={salesSummary.derniereCommandeVente || client.derniere_commande_vente || '-'} />
            <Field label="Commandes ouvertes" value={fmtNumber(salesSummary.openOrders?.length ?? client.commandes_ouvertes ?? 0)} />
          </Section>
        ) : null}
        {tab === 'creances' ? (
          <Section title="Créances & relances">
            <Field label="Reste à payer" value={fmtCurrency(salesSummary.resteAPayer ?? client.reste_a_payer_ventes ?? client.reste_a_payer ?? client.creance_reelle)} />
            <Field label="Statut paiement" value={client.statut_paiement || (salesSummary.resteAPayer > 0 ? 'à relancer' : 'à jour')} />
            <Field label="Relance requise" value={client.relance_requise ? 'Oui' : 'Non'} />
            <Field label="Paiements enregistrés" value={fmtNumber(salesSummary.clientPayments?.length ?? client.paiements_enregistres ?? 0)} />
          </Section>
        ) : null}
        {tab === 'profil' ? (
          <Section title="Segmentation & fidélisation">
            <Field label="Segment" value={segment.segment || client.segment} />
            <Field label="Canal" value={segment.channel || client.canal} />
            <Field label="Score fidélité" value={`${fmtNumber(segment.loyaltyScore ?? client.score ?? 0)}%`} />
            <Field label="Taux paiement" value={`${fmtNumber(segment.paymentRate ?? 0)}%`} />
            <Field label="Préférences / besoin" value={client.prefs || client.preferences || 'À qualifier'} />
            <Field label="Action recommandée" value={segment.action || client.action_fidelisation} />
          </Section>
        ) : null}
      </div>
    </BaseModal>
  );
}
