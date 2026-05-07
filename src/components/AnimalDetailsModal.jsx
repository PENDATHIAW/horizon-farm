import BaseModal from '../modals/BaseModal';
import Badge from './Badge';
import Btn from './Btn';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { acquisitionLabel, calculateAge, getAnimalBirthDate, getParentLabel, reproductionStatusLabel } from '../utils/animalLifecycle';

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

export default function AnimalDetailsModal({ open, onClose, animal, metrics, animals = [], vaccins = [], onOpenTrace, onAddDocument }) {
  if (!animal) {
    return (
      <BaseModal open={open} onClose={onClose} title="Fiche Animal">
        <p className="text-[#8a7456]">Aucun animal selectionne.</p>
      </BaseModal>
    );
  }

  const age = calculateAge(getAnimalBirthDate(animal));
  const relatedVaccins = vaccins.filter((vaccin) => String(vaccin.animal || '').includes(animal.id) || String(vaccin.animal || '').includes(animal.tag));
  const sold = animal.status === 'vendu';
  const lossStatus = ['mort', 'vole', 'reforme'].includes(animal.status);

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche interne Animal - ${animal.id}`}>
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
              {animal.en_gestation ? <Badge status="en_gestation" /> : null}
            </div>
          </div>
          <div className="text-center shrink-0">
            <img src={animal.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(animal.id || '')}`} alt="QR animal" className="h-24 w-24 rounded-xl bg-white p-1" />
            <p className="text-[11px] text-[#f4e6c8] mt-1">QR code</p>
          </div>
        </div>

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

        <Section title="Sante">
          <Field label="Frais sante / soins" value={fmtCurrency(metrics.healthCost)} />
          <Field label="Traitements" value={animal.traitements_notes || animal.traitement_en_cours || 'Aucun traitement renseigne'} />
          <Field label="Vaccins lies" value={relatedVaccins.length ? relatedVaccins.map((v) => `${v.nom} (${v.statut})`).join(', ') : 'Aucun vaccin lie'} />
          <Field label="Score sanitaire" value={`${metrics.healthScore.toFixed(0)}%`} />
          <Field label="Prochaine verification" value={animal.date_prochaine_verification || animal.next_action_date || '-'} />
          <Field label="RAS veterinaire" value={animal.ras_veterinaire || 'Non applique'} />
        </Section>

        {animal.sexe === 'F' ? (
          <Section title="Reproduction">
            <Field label="En gestation" value={animal.en_gestation ? 'Oui' : 'Non'} />
            <Field label="Date debut gestation" value={animal.date_debut_gestation || '-'} />
            <Field label="Date prevue mise bas" value={animal.date_prevue_mise_bas || '-'} />
            <Field label="Male reproducteur" value={getParentLabel(animals, animal.male_reproducteur_id)} />
            <Field label="Statut reproduction" value={reproductionStatusLabel(animal.statut_reproduction)} />
            <Field label="Alerte mise bas" value={animal.en_gestation && animal.date_prevue_mise_bas ? 'Surveillance active selon calendrier' : 'Aucune'} />
          </Section>
        ) : null}

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

        <Section title="Tracabilite & Documents">
          <Field label="Derniers evenements" value="Alimentes par la tracabilite metier / business_events" />
          <Field label="Documents lies" value="Factures, certificats, ordonnances et photos lies a venir ici" />
          <div className="md:col-span-2 flex gap-2 flex-wrap">
            <Btn variant="outline" small onClick={onOpenTrace}>Voir tracabilite complete</Btn>
            <Btn small onClick={onAddDocument}>Ajouter document</Btn>
          </div>
        </Section>

        <details className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
          <summary className="cursor-pointer text-sm font-bold text-[#2f2415]">Informations systeme</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <Field label="ID technique" value={animal.id} />
            <Field label="Cree le" value={animal.created_at ? new Date(animal.created_at).toLocaleString('fr-FR') : '-'} />
            <Field label="Mis a jour le" value={animal.updated_at ? new Date(animal.updated_at).toLocaleString('fr-FR') : '-'} />
            <Field label="Source" value={animal.source || 'ERP Horizon Farm'} />
          </div>
        </details>
      </div>
    </BaseModal>
  );
}
