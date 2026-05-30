import { Scale } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { dateOf, Empty, label, Row, Section, Stat } from './visionUtils';

export default function VisionFundingTab({ data, onNavigate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Valeur exploitation" value={fmtCurrency(data.estimatedValue)} tone="good" />
        <Stat label="Investissements" value={fmtCurrency(data.investmentValue)} />
        <Stat label="Documents" value={fmtNumber(data.documents.length)} />
        <Stat label="Preuves manquantes" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} />
      </div>
      <Section icon={Scale} title="Dossier financeur">
        <Row title="Résumé exploitation" detail={`${fmtNumber(data.animaux.length)} animaux · ${fmtNumber(data.lots.length)} lots · ${fmtNumber(data.cultures.length)} cultures`} value="Actif" tone="good" onClick={() => onNavigate?.('elevage')} />
        <Row title="Chiffres clés" detail={`CA ${fmtCurrency(data.salesAmount)} · marge ${fmtCurrency(data.grossMargin)} · trésorerie ${fmtCurrency(data.balance)}`} value="Pilotage" onClick={() => onNavigate?.('finance_pilotage')} />
        <Row title="Preuves & justificatifs" detail={`${fmtNumber(data.documents.length)} doc(s) · ${fmtNumber(data.missingProof)} manquant(s)`} value={data.missingProof ? 'À compléter' : 'OK'} tone={data.missingProof ? 'warn' : 'good'} onClick={() => onNavigate?.('documents_rapports')} />
        <Row title="Risques maîtrisés" detail={`${fmtNumber(data.risks.filter((r) => r.tone !== 'bad').length)} risque(s) modéré(s)`} value={`${fmtNumber(data.risks.filter((r) => r.tone === 'bad').length)} critique(s)`} tone={data.risks.some((r) => r.tone === 'bad') ? 'warn' : 'good'} onClick={() => onNavigate?.('objectifs_croissance')} />
        <Row title="Export dossier" detail="Générer PDF financeur depuis Documents & Rapports" value="PDF" onClick={() => onNavigate?.('documents_rapports')} />
        {data.documents.length ? data.documents.slice(0, 6).map((r) => (
          <Row key={r.id || label(r)} title={label(r)} detail={`${r.type || r.categorie || 'Document'} · ${dateOf(r)}`} value="Doc" />
        )) : null}
        {!data.documents.length ? <Empty>Ajoutez documents et preuves pour constituer le dossier financeur.</Empty> : null}
      </Section>
    </div>
  );
}
