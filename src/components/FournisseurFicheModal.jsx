import { useEffect, useState } from 'react';
import BaseModal from '../modals/BaseModal';
import FicheTabsBar from './FicheTabsBar.jsx';
import { fmtCurrency, fmtNumber } from '../utils/format';

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-line bg-white px-3 py-2">
    <p className="text-meta uppercase tracking-normal text-slate">{label}</p>
    <p className="mt-1 text-sm font-semibold text-earth break-words">{value ?? '-'}</p>
  </div>
);

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-line bg-card p-4">
    <h3 className="text-sm font-semibold text-earth mb-3">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);

export default function FournisseurFicheModal({ open, onClose, supplier, metrics = {}, summary = {}, profile = {} }) {
  const [tab, setTab] = useState('identite');

  useEffect(() => {
    if (open) queueMicrotask(() => setTab('identite'));
  }, [open, supplier?.id]);

  if (!supplier) return null;

  const tabs = [
    { id: 'identite', label: 'Identité' },
    { id: 'dettes', label: 'Dettes & achats' },
    { id: 'fiabilite', label: 'Fiabilité' },
    { id: 'stock', label: 'Stock lié' },
  ];

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche fournisseur — ${supplier.nom || supplier.name || supplier.id}`} size="4xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-earth p-4 text-white">
          <p className="text-xs uppercase tracking-normal text-horizon">Fournisseur</p>
          <h2 className="text-xl font-semibold mt-1">{supplier.nom || supplier.name}</h2>
          <p className="text-sm text-line">{supplier.tel || supplier.telephone || supplier.contact || 'Contact non renseigné'}</p>
        </div>
        <FicheTabsBar tabs={tabs} active={tab} onChange={setTab} />
        {tab === 'identite' ? (
          <Section title="Coordonnées">
            <Field label="Nom" value={supplier.nom || supplier.name} />
            <Field label="Téléphone" value={supplier.tel || supplier.telephone} />
            <Field label="Email" value={supplier.email} />
            <Field label="Adresse" value={supplier.adresse || supplier.address} />
            <Field label="Spécialité" value={supplier.specialite || supplier.category} />
            <Field label="Notes" value={supplier.notes} />
          </Section>
        ) : null}
        {tab === 'dettes' ? (
          <Section title="Dettes & historique achats">
            <Field label="Dettes" value={fmtCurrency(summary.dettes ?? metrics.dettes ?? supplier.dettes)} />
            <Field label="Total achats" value={fmtCurrency(summary.achats ?? metrics.achats ?? supplier.achats)} />
            <Field label="Livraisons" value={fmtNumber(summary.livraisons ?? metrics.livraisons ?? supplier.livraisons)} />
            <Field label="Dernière commande" value={summary.derniereCommande || supplier.derniere_commande || '-'} />
          </Section>
        ) : null}
        {tab === 'fiabilite' ? (
          <Section title="Fiabilité & risques">
            <Field label="Note" value={fmtNumber(profile.note ?? metrics.note ?? supplier.note)} />
            <Field label="Score fiabilité" value={`${fmtNumber(profile.reliabilityScore ?? metrics.reliabilityScore ?? 0)}%`} />
            <Field label="Score risque" value={`${fmtNumber(profile.riskScore ?? metrics.riskScore ?? 0)}%`} />
            <Field label="Délai moyen" value={profile.delaiMoyen || supplier.delai_livraison || '-'} />
          </Section>
        ) : null}
        {tab === 'stock' ? (
          <Section title="Articles / stock liés">
            <Field label="Articles référencés" value={fmtNumber(summary.stockItems ?? profile.stockCount ?? 0)} />
            <Field label="Valeur stock liée" value={fmtCurrency(summary.stockValue ?? 0)} />
            <Field label="Dernière entrée" value={summary.derniereEntree || '-'} />
            <Field label="Catégories" value={profile.categories || supplier.categories || '-'} />
          </Section>
        ) : null}
      </div>
    </BaseModal>
  );
}
