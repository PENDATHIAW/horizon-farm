import ModuleGraphiquesTab from '../../../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../../../components/module/ModuleListHub.jsx';
import { fmtCurrency, fmtNumber } from '../../../utils/format';

const amount = (r = {}) => Number(r.montant ?? r.amount ?? r.total ?? r.cout ?? r.cost ?? 0);

export default function RegistresAnalysesTab({ data, onNavigate, periodFiltered, equipment, transactions }) {
  return (
    <div className="space-y-6">
      <ModuleListHub
        title="Documents ressources"
        intro="Contrats, fiches équipements, maintenance et pièces RH."
        stats={[
          { label: 'Documents', value: fmtNumber(data.documents.length) },
          { label: 'Équipements', value: fmtNumber(data.equipment.length) },
          { label: 'Équipe', value: fmtNumber(data.team.length) },
          { label: 'Maintenance', value: fmtNumber(data.equipmentRisk.length), tone: data.equipmentRisk.length ? 'warn' : 'good' },
        ]}
        rows={data.documents.map((row) => ({
          id: row.id || row.title,
          title: row.title || row.nom || row.name || 'Document',
          detail: `${row.type || row.categorie || 'Doc'} · ${row.module_source || 'Ressources'}`,
          module: 'documents_rapports',
        }))}
        emptyLabel="Aucun document ressource."
        onNavigate={onNavigate}
      />
      <ModuleListHub
        title="Coûts ressources"
        intro="Dépenses liées aux équipements, maintenance et personnel."
        stats={[
          { label: 'Coût total', value: fmtCurrency(data.costTotal), tone: 'warn' },
          { label: 'Masse salariale', value: fmtCurrency(data.payroll.gross), tone: 'warn' },
          { label: 'Mouvements', value: fmtNumber(data.costRows.length) },
          { label: 'Équipe', value: fmtNumber(data.team.length) },
        ]}
        rows={data.costRows.map((row) => ({
          id: row.id,
          title: row.libelle || row.title || 'Coût',
          detail: `${row.date || row.created_at || '—'} · ${row.categorie || row.type || 'Charge'}`,
          value: fmtCurrency(amount(row)),
          module: 'finance_pilotage',
        }))}
        emptyLabel="Aucun coût ressource enregistré."
        onNavigate={onNavigate}
      />
      <ModuleGraphiquesTab
        moduleId="equipe"
        periodFiltered={periodFiltered}
        equipements={equipment}
        transactions={transactions}
        onNavigate={onNavigate}
      />
    </div>
  );
}
