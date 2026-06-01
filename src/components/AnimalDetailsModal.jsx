import { useEffect, useMemo, useState } from 'react';
import BaseModal from '../modals/BaseModal';
import Badge from './Badge';
import Btn from './Btn';
import FicheTabsBar from './FicheTabsBar.jsx';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildGrowthSummary } from '../utils/animalGrowth';
import { acquisitionLabel, calculateAge, getAnimalBirthDate, getParentLabel, reproductionStatusLabel } from '../utils/animalLifecycle';
import { projectGrowth, saleOpportunityGuard } from '../services/growthProjectionService';
import { SaleOpportunityGuardPanel, WeightProjectionPanel } from './GrowthProjectionPanel';

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
    <h3 className="text-sm font-black text-[#2f2415] mb-3">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);

const Field = ({ label, value, children }) => (
  <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#2f2415] break-words">{children || value || '-'}</div>
  </div>
);

const BuyerField = ({ label, value, children }) => (
  <div className="rounded-xl border border-emerald-500/20 bg-white px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-emerald-700">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#2f2415] break-words">{children || value || '-'}</div>
  </div>
);

const healthEventsSummary = (items = []) => {
  if (!items.length) return 'Aucun soin/vaccin rattaché depuis le module Santé';
  return items.map((item) => `${item.nom || item.type || 'Intervention'} (${item.statut || item.status || 'suivi'})`).join(', ');
};

const INTERNAL_TABS = [
  { id: 'identite', label: 'Identité' },
  { id: 'croissance', label: 'Croissance' },
  { id: 'sante', label: 'Santé' },
  { id: 'finances', label: 'Finances' },
  { id: 'reproduction', label: 'Reproduction' },
  { id: 'trace', label: 'Traçabilité' },
];

export default function AnimalDetailsModal({ open, onClose, animal, metrics, animals = [], vaccins = [], opportunities = [], onOpenTrace, onAddDocument }) {
  const [view, setView] = useState('interne');
  const [tab, setTab] = useState('identite');

  useEffect(() => {
    if (!open) return;
    setTab('identite');
    setView('interne');
  }, [open, animal?.id]);

  const internalTabs = useMemo(() => (
    animal?.sexe === 'F' ? INTERNAL_TABS : INTERNAL_TABS.filter((item) => item.id !== 'reproduction')
  ), [animal?.sexe]);

  if (!animal) {
    return (
      <BaseModal open={open} onClose={onClose} title="Fiche Animal">
        <p className="text-[#8a7456]">Aucun animal selectionne.</p>
      </BaseModal>
    );
  }

  const age = calculateAge(getAnimalBirthDate(animal));
  const growth = buildGrowthSummary(animal);
  const projection = projectGrowth(animal, { targetDays: Number(animal.delai_cible_jours || 90) || 90 });
  const opportunityGuard = saleOpportunityGuard(animal, 'animal', opportunities);
  const relatedVaccins = vaccins.filter((vaccin) => String(vaccin.animal || '').includes(animal.id) || String(vaccin.animal || '').includes(animal.tag));
  const sold = animal.status === 'vendu';
  const lossStatus = ['mort', 'vole', 'reforme'].includes(animal.status);

  return (
    <BaseModal open={open} onClose={onClose} title={`${view === 'acheteur' ? 'Fiche acheteur' : 'Fiche interne'} - ${animal.id}`}>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 rounded-2xl border border-[#d6c3a0] bg-[#2f2415] p-4 text-white">
          <div className="h-28 w-28 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
            {animal.photo_url ? <img src={animal.photo_url} alt={animal.name} className="h-full w-full object-cover" /> : <span className="text-3xl font-black text-[#c9a96a]">{animal.type?.[0] || 'A'}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c9a96a]">Identite animal</p>
            <h2 className="text-2xl font-black mt-1">{animal.name || 'Sans nom'} <span className="text-[#c9a96a]">{animal.id}</span></h2>
            <p className="text-sm text-[#f4e6c8] mt-1">{animal.type} - {animal.race || 'Race non renseignee'} - {animal.sexe === 'M' ? 'Male' : 'Femelle'}</p>
            <div className="flex gap-2 flex-wrap mt-3">
              <Badge status={animal.health_status || 'sain'} />
              <Badge status={animal.status || 'actif'} />
              <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-[#f4e6c8]">{growth.label}</span>
              {animal.en_gestation ? <Badge status="en_gestation" /> : null}
            </div>
          </div>
          <div className="text-center shrink-0">
            <img src={animal.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(animal.id || '')}`} alt="QR animal" className="h-24 w-24 rounded-xl bg-white p-1" />
            <p className="text-[11px] text-[#f4e6c8] mt-1">QR code</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setView('interne')} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${view === 'interne' ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}>Fiche interne</button>
          <button type="button" onClick={() => setView('acheteur')} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${view === 'acheteur' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}>Fiche acheteur</button>
        </div>

        {view === 'acheteur' ? (
          <div className="space-y-4">
            <Section title="Presentation acheteur">
              <BuyerField label="Identification" value={animal.tag || animal.id} />
              <BuyerField label="Type / race" value={`${animal.type || '-'} - ${animal.race || 'Race non renseignee'}`} />
              <BuyerField label="Sexe" value={animal.sexe === 'M' ? 'Male' : 'Femelle'} />
              <BuyerField label="Age" value={age.label} />
              <BuyerField label="Poids actuel" value={`${fmtNumber(animal.poids || 0)} kg`} />
              <BuyerField label="Etat sanitaire"><Badge status={animal.health_status || 'sain'} /></BuyerField>
            </Section>

            <Section title="Croissance visible acheteur">
              <BuyerField label="Statut croissance" value={growth.label} />
              <BuyerField label="Gain total suivi" value={growth.history.length >= 2 ? `${growth.gain.toFixed(1)} kg` : 'Suivi en cours'} />
              <BuyerField label="Gain moyen / jour" value={growth.history.length >= 2 ? `${growth.averageDailyGain.toFixed(2)} kg/jour` : 'Non calculable'} />
              <BuyerField label="Derniere pesee" value={growth.last ? `${growth.last.poids} kg le ${growth.last.date}` : 'Non renseignee'} />
            </Section>

            <WeightProjectionPanel title="Projection poids acheteur" projection={projection} />

            <Section title="Sante & garanties publiques">
              <BuyerField label="Suivi Santé lié" value={healthEventsSummary(relatedVaccins)} />
              <BuyerField label="Score sanitaire" value={`${metrics.healthScore?.toFixed?.(0) || 0}%`} />
              <BuyerField label="Origine" value={acquisitionLabel(animal.mode_acquisition || 'achat')} />
              <BuyerField label="Traçabilite" value="Identifiant et QR code disponibles pour verification" />
            </Section>
          </div>
        ) : (
          <div className="space-y-4">
            <FicheTabsBar tabs={internalTabs} active={tab} onChange={setTab} />

            {tab === 'identite' ? (
              <>
                <Section title="Identite">
                  <Field label="ID / Tag" value={animal.tag || animal.id} />
                  <Field label="Age calcule" value={age.label} />
                  <Field label="Poids" value={`${fmtNumber(animal.poids || 0)} kg`} />
                  <Field label="Etat sanitaire"><Badge status={animal.health_status || 'sain'} /></Field>
                </Section>
                <Section title="Origine / Acquisition">
                  <Field label="Mode acquisition" value={acquisitionLabel(animal.mode_acquisition || 'achat')} />
                  <Field label="Date achat" value={animal.date_achat || 'Non applicable'} />
                  <Field label="Date naissance" value={animal.date_naissance || animal.naissance || 'Non renseignee'} />
                  <Field label="Date entree ferme" value={animal.date_entree_ferme || '-'} />
                  <Field label="Fournisseur / vendeur" value={animal.fournisseur_vendeur || '-'} />
                  <Field label="Mere" value={getParentLabel(animals, animal.mere_id)} />
                  <Field label="Pere" value={getParentLabel(animals, animal.pere_id)} />
                  <Field label="Portee" value={animal.portee_id || '-'} />
                </Section>
                {(sold || lossStatus) ? (
                  <Section title="Situation administrative">
                    <Field label="Statut administratif"><Badge status={animal.status || 'actif'} /></Field>
                    <Field label="Date vente" value={animal.date_vente || '-'} />
                    <Field label="Client" value={animal.client_id || '-'} />
                    <Field label="Date deces" value={animal.date_deces || '-'} />
                    <Field label="Cause deces" value={animal.cause_deces || '-'} />
                    <Field label="Date vol detecte" value={animal.date_vol_detecte || '-'} />
                    <Field label="Lieu vol" value={animal.lieu_vol || '-'} />
                    <Field label="Date reforme" value={animal.date_reforme || '-'} />
                    <Field label="Motif reforme" value={animal.motif_reforme || '-'} />
                  </Section>
                ) : null}
              </>
            ) : null}

            {tab === 'croissance' ? (
              <>
                <Section title="Croissance & engraissement">
                  <Field label="Statut croissance" value={growth.label} />
                  <Field label="Poids initial suivi" value={growth.first ? `${growth.first.poids} kg le ${growth.first.date}` : 'Non renseigne'} />
                  <Field label="Poids actuel / derniere pesee" value={growth.last ? `${growth.last.poids} kg le ${growth.last.date}` : `${fmtNumber(animal.poids || 0)} kg`} />
                  <Field label="Gain total" value={growth.history.length >= 2 ? `${growth.gain.toFixed(1)} kg` : 'Suivi a completer'} />
                  <Field label="Gain moyen / jour" value={growth.history.length >= 2 ? `${growth.averageDailyGain.toFixed(2)} kg/jour` : 'Non calculable'} />
                  <Field label="Derniere progression" value={growth.previous ? `${growth.recentGain.toFixed(1)} kg sur ${growth.recentDays} jour(s)` : 'Ajouter une nouvelle pesee'} />
                  <Field label="Cout alimentation / kg gagne" value={growth.gain > 0 ? fmtCurrency((metrics.feedingCost || 0) / growth.gain) : 'Non calculable'} />
                  <Field label="Recommandation" value={growth.recommendation} />
                </Section>
                <WeightProjectionPanel title="Projection croissance & vente" projection={projection} />
                <SaleOpportunityGuardPanel guard={opportunityGuard} />
              </>
            ) : null}

            {tab === 'sante' ? (
              <Section title="Sante — lecture depuis module Santé">
                <Field label="Frais santé / soins calculés" value={fmtCurrency(metrics.healthCost)} />
                <Field label="Suivi Santé lié" value={healthEventsSummary(relatedVaccins)} />
                <Field label="Score sanitaire calculé" value={`${metrics.healthScore.toFixed(0)}%`} />
                <Field label="Source des données" value="Module Santé, vaccins, soins, vétérinaire et événements liés" />
              </Section>
            ) : null}

            {tab === 'finances' ? (
              <Section title="Finances internes">
                <Field label="Prix achat" value={fmtCurrency(metrics.purchaseCost)} />
                <Field label="Alimentation calculee" value={metrics.feedingCost > 0 ? fmtCurrency(metrics.feedingCost) : '0 FCFA / non renseigne'} />
                <Field label="Frais sante / soins" value={fmtCurrency(metrics.healthCost)} />
                <Field label="Autres frais" value={fmtCurrency(metrics.otherCosts || 0)} />
                <Field label="Cout total calcule" value={fmtCurrency(metrics.totalCost)} />
                <Field label="Prix vente reel" value={sold ? fmtCurrency(metrics.salePrice) : 'Non vendu'} />
                <Field label="Marge / perte" value={metrics.margin === null ? 'En cours' : fmtCurrency(metrics.margin)} />
                <Field label="ROI" value={metrics.marginRate ? `${metrics.marginRate.toFixed(1)}%` : 'Non calculable'} />
              </Section>
            ) : null}

            {tab === 'reproduction' && animal.sexe === 'F' ? (
              <Section title="Reproduction">
                <Field label="En gestation" value={animal.en_gestation ? 'Oui' : 'Non'} />
                <Field label="Date debut gestation" value={animal.date_debut_gestation || '-'} />
                <Field label="Date prevue mise bas" value={animal.date_prevue_mise_bas || '-'} />
                <Field label="Male reproducteur" value={getParentLabel(animals, animal.male_reproducteur_id)} />
                <Field label="Statut reproduction" value={reproductionStatusLabel(animal.statut_reproduction)} />
                <Field label="Alerte mise bas" value={animal.en_gestation && animal.date_prevue_mise_bas ? 'Surveillance active selon calendrier' : 'Aucune'} />
              </Section>
            ) : null}

            {tab === 'trace' ? (
              <Section title="Tracabilite & Documents">
                <Field label="Derniers evenements" value="Alimentes par la tracabilite metier / business_events" />
                <Field label="Documents lies" value="Factures, certificats, ordonnances et photos lies a venir ici" />
                <div className="md:col-span-2 flex gap-2 flex-wrap">
                  <Btn variant="outline" small onClick={onOpenTrace}>Voir tracabilite complete</Btn>
                  <Btn small onClick={onAddDocument}>Ajouter document</Btn>
                </div>
              </Section>
            ) : null}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
