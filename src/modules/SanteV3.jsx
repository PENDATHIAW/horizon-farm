import Sante from './Sante.jsx';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { toNumber } from '../utils/format';
import { calculateVaccineMetrics } from '../utils/businessCalculations';

const todayIso = () => new Date().toISOString().slice(0, 10);
const amount = (row = {}) => toNumber(row.cout ?? row.amount ?? row.montant ?? row.total);
const isDone = (row = {}) => calculateVaccineMetrics(row).smartStatus === 'fait' || ['fait', 'realise', 'réalisé'].includes(String(row.statut || row.status || '').toLowerCase());

function ensureSanteFields() {
  const fields = MODULE_FORM_FIELDS.sante || [];
  const add = (afterKey, items) => {
    const index = Math.max(0, fields.findIndex((field) => field.key === afterKey));
    items.forEach((item, offset) => {
      if (!fields.some((field) => field.key === item.key)) fields.splice(index + 1 + offset, 0, item);
    });
  };
  add('animal', [
    { key: 'module_lie', label: 'Module lié', type: 'select', options: ['animaux', 'avicole'] },
    { key: 'related_id', label: 'ID animal / lot', type: 'text' },
  ]);
  add('prevue', [
    { key: 'periodicite', label: 'Périodicité', type: 'select', options: [
      { value: 'unique', label: 'Une seule fois' },
      { value: 'hebdomadaire', label: 'Chaque semaine' },
      { value: 'mensuelle', label: 'Chaque mois' },
      { value: 'trimestrielle', label: 'Chaque trimestre' },
      { value: 'semestrielle', label: 'Chaque semestre' },
      { value: 'annuelle', label: 'Chaque année' },
      { value: 'personnalisee', label: 'Personnalisée' },
    ] },
    { key: 'frequence_valeur', label: 'Fréquence personnalisée', type: 'number', showWhen: (form) => form.periodicite === 'personnalisee' },
    { key: 'frequence_unite', label: 'Unité fréquence', type: 'select', options: ['jours', 'semaines', 'mois'], showWhen: (form) => form.periodicite === 'personnalisee' },
    { key: 'prochaine_date_calculee', label: 'Prochaine date / rappel', type: 'date' },
  ]);
  add('cout', [
    { key: 'medicament', label: 'Médicament / produit utilisé', type: 'text' },
    { key: 'quantite_utilisee', label: 'Quantité utilisée', type: 'number' },
    { key: 'impact_business_note', label: 'Impact business / observation', type: 'text', fullWidth: true },
  ]);
}

export default function SanteV3(props) {
  ensureSanteFields();
  const createFinanceIfNeeded = async (payload) => {
    const cost = amount(payload);
    if (!props.onCreateFinanceTransaction || cost <= 0 || !isDone(payload)) return;
    await props.onCreateFinanceTransaction({
      id: `TRX-SANTE-${Date.now()}`,
      type: 'sortie',
      libelle: `Santé - ${payload.nom || 'Intervention'}`,
      montant: cost,
      date: payload.effectuee || todayIso(),
      categorie: 'Sante',
      module_lie: payload.module_lie || 'sante',
      related_id: payload.related_id || payload.animal || payload.id,
      statut: 'paye',
    });
  };
  return <Sante {...props} onCreate={async (payload) => { const result = await props.onCreate?.(payload); await createFinanceIfNeeded(payload); await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.()]); return result; }} onUpdate={async (id, payload) => { const result = await props.onUpdate?.(id, payload); await createFinanceIfNeeded({ ...payload, id }); await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.()]); return result; }} />;
}
