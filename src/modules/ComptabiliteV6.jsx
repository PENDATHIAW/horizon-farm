import { AlertTriangle, BarChart3, CheckCircle2, FileText, Receipt, Scale, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { fmtCurrency, toNumber } from '../utils/format';
import { buildConsolidationInput, consolidateFinance } from '../utils/financeConsolidationEngine';
import ComptabiliteV5 from './ComptabiliteV5.jsx';
import ComptabiliteEvolution from './ComptabiliteEvolution.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => Number(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0) || 0;
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isIn = (row = {}) => ['entree', 'entrée'].includes(String(row.type || '').toLowerCase());
const isMissingDoc = (row = {}) => !row.document_id && !row.linked_document_id && !row.piece_jointe && !row.file_url && !row.justificatif_url;
const isUnpaid = (row = {}) => ['impaye', 'partiel'].includes(String(row.statut || row.status || '').toLowerCase());

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4"><div><p className="flex items-center gap-2 text-lg font-semibold text-earth"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-slate">{subtitle}</p> : null}</div>{children}</section>;
}

function ControlCard({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-card'}`}><div className="flex items-center gap-2 text-xs uppercase tracking-normal text-slate"><Icon size={14} /> {label}</div><p className="mt-2 text-xl font-semibold text-earth">{value}</p>{hint ? <p className="mt-1 text-xs text-slate">{hint}</p> : null}</div>;
}

function AccountingLine({ label, value, hint, danger = false }) {
  return <div className="rounded-2xl border border-line bg-card px-4 py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-earth">{label}</p>{hint ? <p className="text-xs text-slate mt-1">{hint}</p> : null}</div><p className={`text-sm font-semibold ${danger ? 'text-horizon-dark' : 'text-earth'}`}>{value}</p></div>;
}

function DerivedChargesPanel({ finance, counts = {} }) {
  const detail = finance?.chargesDeriveesDetail || {};
  const stockAlimentation = toNumber(detail.stockAchats) + toNumber(detail.alimentation);
  const rows = [
    ['Animaux', detail.animaux, counts.animaux],
    ['Avicole', detail.avicole, counts.lots],
    ['Cultures', detail.cultures, counts.cultures],
    ['Santé', detail.sante, counts.sante],
    ['Stock + alimentation', stockAlimentation, counts.stocks + counts.alimentationLogs],
    ['Investissements', detail.investissements, counts.investissements],
  ];
  return (
    <div className="rounded-2xl border border-urgent bg-urgent-bg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-urgent">Coûts métier visibles en comptabilité</p>
          <p className="text-sm text-urgent">Déjà saisis : {fmtCurrency(finance?.chargesComptabilisees || 0)} · À synchroniser : {fmtCurrency(finance?.chargesDeriveesNonComptabilisees || 0)}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-urgent">{fmtCurrency(finance?.chargesMetier || 0)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {rows.map(([label, value, count]) => (
          <div key={label} className={`rounded-xl border p-3 ${toNumber(value) > 0 ? 'border-urgent bg-white' : toNumber(count) > 0 ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-card'}`}>
            <p className="text-xs font-semibold text-slate">{label}</p>
            <p className="mt-1 font-semibold text-earth">{toNumber(value) > 0 ? fmtCurrency(value) : toNumber(count) > 0 ? 'À renseigner' : '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComptabiliteV6(props) {
  const input = useMemo(() => buildConsolidationInput(props), [props]);
  const transactions = input.transactions;
  const finance = useMemo(() => consolidateFinance(input), [input]);
  const counts = {
    animaux: arr(props.animaux).length,
    lots: arr(props.lots).length,
    cultures: arr(props.cultures).length,
    sante: arr(props.sante).length,
    stocks: arr(props.stocks).length,
    alimentationLogs: arr(props.alimentationLogs).length,
    investissements: arr(props.investissements).length,
  };

  const accounting = useMemo(() => {
    const entries = transactions.length;
    const cashIn = transactions.filter(isIn).length;
    const cashOut = transactions.filter(isOut).length;
    const missingDocs = transactions.filter(isMissingDoc).length;
    const revenus = transactions.filter(isIn).reduce((sum, row) => sum + amount(row), 0);
    const charges = transactions.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
    const chargesMetier = finance.chargesMetier || charges;
    const dettes = transactions.filter((row) => isOut(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
    const creancesTx = transactions.filter((row) => isIn(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
    const creances = Math.max(finance.creancesReelles || 0, creancesTx);
    const resultComptable = revenus - chargesMetier;
    const warnings = [...(finance.warnings || [])];
    if (missingDocs) warnings.push(`${missingDocs} mouvement(s) sans preuve / facture liée`);
    if (dettes) warnings.push(`${fmtCurrency(dettes)} de reste à payer à régulariser`);
    if (creances) warnings.push(`${fmtCurrency(creances)} de reste à encaisser à suivre`);
    return { entries, cashIn, cashOut, missingDocs, warnings, revenus, charges, chargesMetier, dettes, creances, resultComptable };
  }, [transactions, finance]);

  return <div className="space-y-6 compta-mobile-structured">
    <style>{`@media (max-width: 640px){.compta-mobile-structured .rounded-2xl{border-radius:18px}.compta-mobile-structured table{font-size:12px}.compta-mobile-structured th,.compta-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.compta-mobile-structured .text-2xl{font-size:1.35rem}.compta-mobile-structured .grid{gap:.75rem}.compta-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

    <ModuleSection icon={ShieldCheck} title="Contrôle comptable" subtitle="Lignes comptables, preuves/factures, vérification caisse/banque, reste à encaisser, reste à payer et points à régulariser.">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold">Rôle du module Comptabilité</p><h3 className="text-xl font-semibold text-earth">Sécuriser les preuves et l’historique comptable</h3><p className="text-sm text-slate mt-1">Le pilotage de l’argent reste dans Finances. Ici, on contrôle les preuves, les lignes comptables, le reste à payer, le reste à encaisser et la vérification caisse/banque.</p></div>{accounting.warnings.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {accounting.warnings.length} point(s) à traiter</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Tout semble à jour</div>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><ControlCard icon={Receipt} label="Lignes contrôlées" value={accounting.entries} hint={`${accounting.cashIn} argent reçu, ${accounting.cashOut} argent dépensé`} /><ControlCard icon={FileText} label="Preuves manquantes" value={accounting.missingDocs} hint="factures, reçus, photos ou preuves" danger={accounting.missingDocs > 0} /><ControlCard icon={ShieldCheck} label="Reste à encaisser" value={fmtCurrency(accounting.creances)} hint="clients / paiements partiels" danger={accounting.creances > 0} /><ControlCard icon={AlertTriangle} label="Reste à payer" value={fmtCurrency(accounting.dettes)} hint="fournisseurs / dépenses impayées" danger={accounting.dettes > 0} /></div>
      {accounting.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{accounting.warnings.slice(0, 4).map((warning) => <div key={warning} className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">{warning}</div>)}</div> : null}
    </ModuleSection>

    <ModuleSection icon={Scale} title="Lecture comptable simplifiée" subtitle="Vue de contrôle : argent reçu, argent dépensé, reste à encaisser, reste à payer et résultat à vérifier. Le pilotage opérationnel complet reste dans Finances.">
      <DerivedChargesPanel finance={finance} counts={counts} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><AccountingLine label="Argent reçu contrôlé" value={fmtCurrency(accounting.revenus)} hint="Entrées enregistrées comme recettes" /><AccountingLine label="Argent dépensé contrôlé" value={fmtCurrency(accounting.charges)} hint="Sorties enregistrées comme dépenses" /><AccountingLine label="Coûts métier consolidés" value={fmtCurrency(accounting.chargesMetier)} hint="Inclut alimentation, santé, élevage, cultures" danger={accounting.chargesMetier > accounting.revenus && accounting.revenus > 0} /><AccountingLine label="Résultat simplifié" value={fmtCurrency(accounting.resultComptable)} hint="Recettes - coûts métier consolidés" danger={accounting.resultComptable < 0} /><AccountingLine label="Vérification caisse/banque à faire" value={`${accounting.missingDocs + accounting.warnings.length} point(s)`} hint="Preuves, reste à payer, reste à encaisser ou alertes" danger={(accounting.missingDocs + accounting.warnings.length) > 0} /><AccountingLine label="Reste à encaisser clients" value={fmtCurrency(accounting.creances)} hint="À vérifier avec Ventes / Paiements" danger={accounting.creances > 0} /><AccountingLine label="Reste à payer fournisseurs" value={fmtCurrency(accounting.dettes)} hint="À vérifier avec Fournisseurs / Dépenses" danger={accounting.dettes > 0} /></div>
    </ModuleSection>

    <ModuleSection icon={Receipt} title="Lignes comptables" subtitle="Détail des mouvements d’argent et des lignes à préparer ou valider."><ComptabiliteV5 {...props} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Évolution comptable" subtitle="Historique des dépenses, revenus, paiements et résultat."><ComptabiliteEvolution transactions={props.transactions || []} finances={props.finances || []} salesOrders={props.salesOrders || []} payments={props.payments || []} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
