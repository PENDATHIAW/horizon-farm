import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import BaseModal from '../modals/BaseModal';
import Badge from './Badge';
import FicheTabsBar from './FicheTabsBar.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateCultureMetricsWithLoss } from '../utils/lossAdjustedMetrics';
import { buildCultureDecisionProfile } from '../services/cultureDecisionEngine';

const Field = ({ label, value, children }) => (
  <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#2f2415] break-words">{children || value || '-'}</div>
  </div>
);

const Section = ({ title, children, note }) => (
  <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
    <h3 className="text-sm font-black text-[#2f2415] mb-1">{title}</h3>
    {note ? <p className="mb-3 text-xs text-[#8a7456]">{note}</p> : null}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);

const TABS = [
  { id: 'identite', label: 'Identité' },
  { id: 'suivi', label: 'Suivi récolte' },
  { id: 'finances', label: 'Finances' },
  { id: 'decision', label: 'Décision suggérée' },
];

function isCultureLocked(culture = {}) {
  const status = String(culture.statut || culture.status || '').trim().toLowerCase();
  return ['vendue', 'vendu', 'perdu', 'sinistre', 'cloture', 'clôturée', 'archivee', 'archivée'].includes(status);
}

function cultureMetrics(culture = {}) {
  const loss = calculateCultureMetricsWithLoss(culture);
  const costTotal = toNumber(culture.cout_total_calcule) || loss.totalCostWithLoss || loss.costTotal || 0;
  const revenue = toNumber(culture.revenu_calcule ?? culture.revenu_reel ?? culture.revenu_estime ?? 0);
  const margin = toNumber(culture.marge_calculee ?? culture.marge_reelle ?? culture.marge_estimee) || revenue - costTotal;
  const health = toNumber(culture.score_sante_calcule ?? culture.score_sante ?? loss.healthScore ?? 0);
  return { costTotal, revenue, margin, health, loss };
}

export default function CultureFicheModal({ open, onClose, culture }) {
  const [tab, setTab] = useState('identite');

  useEffect(() => {
    if (open) setTab('identite');
  }, [open, culture?.id]);

  if (!culture) {
    return (
      <BaseModal open={open} onClose={onClose} title="Fiche culture">
        <p className="text-[#8a7456]">Aucune culture sélectionnée.</p>
      </BaseModal>
    );
  }

  const locked = isCultureLocked(culture);
  const metrics = cultureMetrics(culture);
  const decision = buildCultureDecisionProfile(culture);
  const harvested = toNumber(culture.quantite_recoltee ?? culture.recolte_disponible ?? culture.stock_recolte);
  const expected = toNumber(culture.quantite_prevue ?? culture.quantite_estimee);
  const available = toNumber(culture.quantite_disponible ?? harvested);
  const progress = expected > 0 ? Math.round((harvested / expected) * 100) : 0;

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche culture · ${culture.nom || culture.name || culture.id}`} size="5xl">
      <div className="space-y-4">
        {locked ? (
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 flex items-center gap-2">
            <Lock size={16} />
            Fiche verrouillée — culture {culture.statut || culture.status}. Modification métier limitée.
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#d6c3a0] bg-[#2f2415] p-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-[#c9a96a]">Culture · {culture.type || culture.cultures || 'Parcelle'}</p>
          <h2 className="mt-1 text-2xl font-black">{culture.nom || culture.name || culture.id}</h2>
          <p className="mt-1 text-sm text-[#f4e6c8]">{culture.parcelle || culture.localisation || 'Localisation non renseignée'} · {fmtNumber(culture.surface || 0)} m²</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge status={culture.statut || culture.status || 'planifiee'} />
            <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-[#f4e6c8]">Santé {metrics.health}%</span>
            <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-[#f4e6c8]">Récolte {progress}%</span>
          </div>
        </div>

        <FicheTabsBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'identite' ? (
          <Section title="Identité parcelle / culture">
            <Field label="Identifiant" value={culture.id} />
            <Field label="Nom" value={culture.nom || culture.name} />
            <Field label="Type / culture" value={culture.type || culture.cultures} />
            <Field label="Parcelle" value={culture.parcelle || culture.localisation} />
            <Field label="Surface" value={`${fmtNumber(culture.surface || 0)} ${culture.unite_surface || 'm²'}`} />
            <Field label="Campagne" value={culture.campagne || culture.campaign || culture.date_debut_campagne} />
            <Field label="Statut" value={culture.statut || culture.status} />
            <Field label="Date début" value={culture.date_debut_campagne || culture.date_debut} />
            <Field label="Date récolte prévue" value={culture.date_recolte_prevue || culture.date_fin_campagne} />
          </Section>
        ) : null}

        {tab === 'suivi' ? (
          <>
            <Section title="Suivi récolte & production" note="Quantités, pertes et disponibilité commerciale.">
              <Field label="Quantité prévue" value={`${fmtNumber(expected)} ${culture.unite_recolte || 'kg'}`} />
              <Field label="Quantité récoltée" value={`${fmtNumber(harvested)} ${culture.unite_recolte || 'kg'}`} />
              <Field label="Disponible à vendre" value={`${fmtNumber(available)} ${culture.unite_recolte || 'kg'}`} />
              <Field label="Pertes / sinistres" value={`${fmtNumber(culture.pertes ?? culture.quantite_perdue ?? 0)} ${culture.unite_recolte || 'kg'}`} />
              <Field label="Rendement" value={culture.rendement ? `${fmtNumber(culture.rendement)} ${culture.unite_recolte || 'kg'}/m²` : 'Non calculé'} />
              <Field label="Prêt à vendre" value={culture.pret_a_vendre || culture.ready_for_sale ? 'Oui' : 'Non'} />
              <Field label="Score santé" value={`${metrics.health}%`} />
              <Field label="Progression récolte" value={`${progress}%`} />
            </Section>
            {harvested > 0 ? (
              <Section title="Historique récolte (synthèse)">
                <Field label="Date récolte" value={culture.date_recolte || culture.date_fin_campagne || 'Non renseignée'} />
                <Field label="Qualité / notes" value={culture.notes || culture.commentaire || '—'} />
              </Section>
            ) : null}
          </>
        ) : null}

        {tab === 'finances' ? (
          <Section title="Coûts, revenus et marge" note="Intrants, main d'œuvre, revenus et marge consolidés.">
            <Field label="Coût semences" value={fmtCurrency(culture.cout_semences)} />
            <Field label="Coût engrais / intrants" value={fmtCurrency(culture.cout_engrais)} />
            <Field label="Coût eau / irrigation" value={fmtCurrency(culture.cout_eau)} />
            <Field label="Main d'œuvre" value={fmtCurrency(culture.cout_main_oeuvre)} />
            <Field label="Traitements" value={fmtCurrency(culture.cout_traitement)} />
            <Field label="Coût total" value={fmtCurrency(metrics.costTotal)} />
            <Field label="Revenu estimé / réel" value={fmtCurrency(metrics.revenue)} />
            <Field label="Marge" value={fmtCurrency(metrics.margin)} />
            <Field label="Valeur pertes estimée" value={fmtCurrency(metrics.loss.lossValue || culture.valeur_perte_estimee)} />
          </Section>
        ) : null}

        {tab === 'decision' ? (
          <Section title="Décision suggérée cultures">
            <Field label="Décision" value={decision.decision || culture.horizon_decision?.decision} />
            <Field label="Priorité" value={decision.priority || culture.horizon_decision?.priority} />
            <Field label="Action recommandée" value={decision.action || decision.next_action || culture.horizon_decision?.action} />
            <Field label="Résumé" value={decision.summary || culture.horizon_decision?.summary} />
          </Section>
        ) : null}
      </div>
    </BaseModal>
  );
}
