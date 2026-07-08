/**
 * Wizard Business Plan — composant legacy non monté dans l’arbre React actuel.
 * Entrée BP officielle : Objectifs & Croissance → Suivi du Business Plan + InvestissementsV9.
 * Conservé pour réutilisation future via `onCreateBusinessPlan` (App.jsx).
 */
import { ChevronLeft, ChevronRight, Plus, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { makeId } from '../utils/ids';
import { buildTemplateData, generateProjectionsForBp, getDefaultProjectionMode, PROJECTION_MODES, TEMPLATES, ACTIVITY_LABELS } from '../utils/bpTemplates';
import { fmtCurrency } from '../utils/format';

const STEP_LABELS = [
  'Activite',
  'Informations',
  'Template',
  'Investissement',
  'Charges',
  'Projections',
  'Financement',
  'Validation',
];

const CATEGORIE_LINES = ['cheptel', 'infrastructure', 'alimentation', 'equipement', 'vaccins', 'main_oeuvre', 'autre'];
const CATEGORIE_COSTS = ['alimentation', 'salaires', 'energie', 'sante_veto', 'logistique', 'imprevus', 'autre'];
const FREQUENCES = ['mensuelle', 'trimestrielle', 'annuelle', 'ponctuelle'];
const SOURCE_TYPES = ['apport_personnel', 'pret_bancaire', 'investisseur_prive', 'subvention', 'partenaire_commercial'];
const STATUT_FUNDING = ['demande', 'accorde', 'refuse'];
const SALE_CAPPED_ACTIVITIES = ['bovin_embouche', 'ovin_embouche', 'caprin_embouche', 'avicole_chair', 'bovin_lait', 'ovin_lait', 'caprin_lait'];
const PROJECTION_MODE_OPTIONS = Object.entries(PROJECTION_MODES).map(([value, label]) => ({ value, label }));

const ACTIVITY_TYPES = Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({
  value,
  label,
  emoji: TEMPLATES[value]?.emoji || (TEMPLATES[value?.replace(/_[^_]*$/, '') + '_embouche'] || TEMPLATES.autre).emoji || '📦',
  description: TEMPLATES[value]?.description || TEMPLATES.autre.description,
}));

const inputCls = 'w-full border border-[#d6c3a0] rounded-lg px-3 py-1.5 text-sm text-[#2f2415] focus:outline-none focus:border-[#b6975f] bg-white';
const labelCls = 'block text-xs font-semibold text-[#7d6a4a] mb-1';

function Field({ label, type = 'text', value, onChange, options, required }) {
  if (type === 'select') {
    return (
      <div>
        <label className={labelCls}>{label}{required ? ' *' : ''}</label>
        <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— choisir —</option>
          {(options || []).map((o) => (
            <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className={labelCls}>{label}{required ? ' *' : ''}</label>
      <input
        type={type}
        className={inputCls}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        required={required}
      />
    </div>
  );
}

function InlineRowEditor({ columns, row, onChange, onDelete }) {
  return (
    <div className="flex gap-1 items-start border border-[#eadcc2] rounded-xl p-2 bg-[#fffdf8]">
      {columns.map((col) => (
        <div key={col.key} style={{ flex: col.flex || 1, minWidth: col.minWidth || 60 }}>
          {col.type === 'select' ? (
            <select
              className="w-full border border-[#d6c3a0] rounded px-1.5 py-1 text-xs text-[#2f2415] bg-white focus:outline-none focus:border-[#b6975f]"
              value={row[col.key] ?? ''}
              onChange={(e) => onChange({ [col.key]: e.target.value })}
            >
              {(col.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : col.type === 'readonly' ? (
            <div className="text-xs text-[#8a7456] px-1.5 py-1 font-semibold">{fmtCurrency(row[col.key] || 0)}</div>
          ) : (
            <input
              type={col.type || 'text'}
              placeholder={col.label}
              className="w-full border border-[#d6c3a0] rounded px-1.5 py-1 text-xs text-[#2f2415] bg-white focus:outline-none focus:border-[#b6975f]"
              value={row[col.key] ?? ''}
              onChange={(e) => {
                const v = col.type === 'number' ? Number(e.target.value) : e.target.value;
                onChange({ [col.key]: v });
              }}
            />
          )}
        </div>
      ))}
      <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-600 p-1 mt-0.5 shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function useInlineTable(key, wizardData, setWizardData) {
  const rows = wizardData[key] || [];
  const updateRow = (idx, partial) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, ...partial };
      if (key === 'lines' && ('quantite' in partial || 'prix_unitaire' in partial)) {
        updated.total = (Number(updated.quantite) || 0) * (Number(updated.prix_unitaire) || 0);
      }
      if (key === 'projections') {
        updated.ca_estime = (Number(updated.production_estimee) || 0) * (Number(updated.prix_unitaire_estime) || 0);
        updated.marge_estimee = (Number(updated.ca_estime) || 0) - (Number(updated.charges_estimees) || 0);
      }
      return updated;
    });
    setWizardData((d) => ({ ...d, [key]: next }));
  };
  const addRow = (defaults = {}) => {
    setWizardData((d) => ({
      ...d,
      [key]: [...(d[key] || []), { id: makeId(key.slice(0, 4).toUpperCase()), ...defaults }],
    }));
  };
  const deleteRow = (idx) => {
    setWizardData((d) => ({ ...d, [key]: (d[key] || []).filter((_, i) => i !== idx) }));
  };
  return { rows, updateRow, addRow, deleteRow };
}

const INIT_DATA = {
  activity_type: 'avicole_pondeuse',
  nom: '',
  localisation: '',
  date_debut: new Date().toISOString().slice(0, 10),
  duree_cycle_mois: 18,
  mode_projection: 'production_mensuelle',
  capacite_initiale: 2000,
  unite_capacite: 'pondeuses',
  unite_calcul_cout: 'pondeuse',
  nombre_tetes_prevu: 2000,
  prix_vente_prevu_unitaire: 0,
  apport_personnel: 0,
  financement_recherche: 0,
  taux_remboursement_pct: 15,
  objectif_production: '',
  notes: '',
  statut: 'planifie',
  lines: [],
  costs: [],
  projections: [],
  fundings: [],
};

export default function BpWizard({
  open,
  onClose,
  onCreateBusinessPlan,
  onCreateBpInvestmentLine,
  onCreateBpRecurringCost,
  onCreateBpRevenueProjection,
  onCreateBpFundingSource,
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [wizardData, setWizardData] = useState(INIT_DATA);

  const update = (partial) => setWizardData((d) => ({ ...d, ...partial }));

  const linesTable = useInlineTable('lines', wizardData, setWizardData);
  const costsTable = useInlineTable('costs', wizardData, setWizardData);
  const projTable = useInlineTable('projections', wizardData, setWizardData);
  const fundTable = useInlineTable('fundings', wizardData, setWizardData);

  const monthlyCostFor = (data = wizardData) =>
    (data.costs || []).reduce((s, c) => s + Number(c.montant_mensuel || 0), 0);

  const buildProjectionsFor = (data, bpId = data.id || makeId('BP')) =>
    generateProjectionsForBp(data.activity_type, data.nombre_tetes_prevu || data.capacite_initiale, monthlyCostFor(data), bpId, {
      duree_cycle_mois: data.duree_cycle_mois,
      mode_projection: data.mode_projection || getDefaultProjectionMode(data.activity_type),
      prix_vente_prevu_unitaire: data.prix_vente_prevu_unitaire,
      quantite_production_prevue: data.quantite_production_prevue,
      nombre_tetes_prevu: data.nombre_tetes_prevu,
    });

  const updatePlanning = (partial) => {
    setWizardData((current) => {
      const next = { ...current, ...partial };
      const shouldRegenerate =
        (next.projections || []).length > 0 &&
        (next.mode_projection || getDefaultProjectionMode(next.activity_type)) !== 'manuel' &&
        ['duree_cycle_mois', 'mode_projection', 'capacite_initiale', 'nombre_tetes_prevu', 'prix_vente_prevu_unitaire', 'quantite_production_prevue'].some((key) => key in partial);
      return shouldRegenerate ? { ...next, projections: buildProjectionsFor(next, next.id || makeId('BP')) } : next;
    });
  };

  const applyTemplate = (activityType) => {
    const bpId = wizardData.id || makeId('BP');
    const { lines, costs, defaults } = buildTemplateData(activityType, bpId);
    const next = {
      ...defaults,
      mode_projection: defaults.mode_projection || getDefaultProjectionMode(activityType),
      activity_type: activityType,
      id: bpId,
      lines,
      costs,
    };
    update({ ...next, projections: buildProjectionsFor(next, bpId) });
  };

  const regenerateProjections = () => {
    const bpId = wizardData.id || makeId('BP');
    const projections = buildProjectionsFor(wizardData, bpId);
    update({ projections });
    toast.success('Projections regenerees');
  };

  const handleComplete = async () => {
    if (!wizardData.nom) { toast.error('Nom obligatoire'); return; }
    const projectedSold = (wizardData.projections || []).reduce((sum, p) => sum + Number(p.production_estimee || 0), 0);
    const maxSellable = Number(wizardData.nombre_tetes_prevu || wizardData.capacite_initiale || 0);
    if (SALE_CAPPED_ACTIVITIES.includes(wizardData.activity_type) && maxSellable > 0 && projectedSold > maxSellable) {
      toast.error(`Cumul vendu incoherent: ${projectedSold} > ${maxSellable}. Corrige les projections avant validation.`);
      return;
    }
    setSaving(true);
    try {
      const bpId = wizardData.id || makeId('BP');
      const bpPayload = {
        id: bpId,
        nom: wizardData.nom,
        activity_type: wizardData.activity_type,
        description: wizardData.description || '',
        localisation: wizardData.localisation,
        date_debut: wizardData.date_debut,
        duree_cycle_mois: wizardData.duree_cycle_mois,
        mode_projection: wizardData.mode_projection || getDefaultProjectionMode(wizardData.activity_type),
        capacite_initiale: wizardData.capacite_initiale,
        unite_capacite: wizardData.unite_capacite,
        unite_calcul_cout: wizardData.unite_calcul_cout,
        nombre_tetes_prevu: wizardData.nombre_tetes_prevu || wizardData.capacite_initiale,
        prix_vente_prevu_unitaire: wizardData.prix_vente_prevu_unitaire,
        apport_personnel: wizardData.apport_personnel,
        financement_recherche: wizardData.financement_recherche,
        taux_remboursement_pct: wizardData.taux_remboursement_pct,
        objectif_production: wizardData.objectif_production,
        notes: wizardData.notes,
        statut: 'planifie',
      };
      await onCreateBusinessPlan(bpPayload);
      await Promise.all([
        ...(wizardData.lines || []).map((l) => onCreateBpInvestmentLine({ ...l, business_plan_id: bpId })),
        ...(wizardData.costs || []).map((c) => onCreateBpRecurringCost({ ...c, business_plan_id: bpId })),
        ...(wizardData.projections || []).map((p) => onCreateBpRevenueProjection({ ...p, business_plan_id: bpId })),
        ...(wizardData.fundings || []).map((f) => onCreateBpFundingSource({ ...f, business_plan_id: bpId })),
      ]);
      toast.success(`Business Plan "${wizardData.nom}" cree avec succes`);
      setStep(1);
      setWizardData(INIT_DATA);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Erreur creation');
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 1) return Boolean(wizardData.activity_type);
    if (step === 2) return Boolean(wizardData.nom);
    return true;
  };

  const next = () => {
    if (step === 3 && wizardData.lines.length === 0) {
      applyTemplate(wizardData.activity_type);
    }
    if (step === 5 && ((wizardData.mode_projection || getDefaultProjectionMode(wizardData.activity_type)) !== 'manuel' || wizardData.projections.length === 0)) {
      regenerateProjections();
    }
    setStep((s) => Math.min(8, s + 1));
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  if (!open) return null;

  const totalInvestissement = (wizardData.lines || []).reduce((s, l) => s + Number(l.total || 0), 0);
  const totalMensuel = (wizardData.costs || []).reduce((s, c) => s + Number(c.montant_mensuel || 0), 0);
  const totalCA = (wizardData.projections || []).reduce((s, p) => s + Number(p.ca_estime || 0), 0);
  const chargesTotalesCycle = (wizardData.projections || []).reduce((s, p) => s + Number(p.charges_estimees || 0), 0) || totalMensuel * Math.max(1, Math.ceil(Number(wizardData.duree_cycle_mois || 1)));
  const coutTotalCycle = totalInvestissement + chargesTotalesCycle;
  const margeBruteProjetee = totalCA - chargesTotalesCycle;
  const margeNetteCycle = totalCA - coutTotalCycle;
  const roiPrevu = coutTotalCycle > 0 ? (margeNetteCycle / coutTotalCycle) * 100 : 0;
  const totalProduit = (wizardData.projections || []).reduce((s, p) => s + Number(p.production_estimee || 0), 0);
  const capaciteVendable = Number(wizardData.nombre_tetes_prevu || wizardData.capacite_initiale || 0);
  const isSaleCapped = SALE_CAPPED_ACTIVITIES.includes(wizardData.activity_type);
  const projectionOverflow = isSaleCapped && capaciteVendable > 0 && totalProduit > capaciteVendable;
  const coutParUnite = capaciteVendable > 0 ? coutTotalCycle / capaciteVendable : 0;
  const quantiteRestante = isSaleCapped ? Math.max(0, capaciteVendable - totalProduit) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-3">
      <div className="w-full max-w-4xl bg-white border border-[#d6c3a0] rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#d6c3a0] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-black text-[#2f2415]">Nouveau Business Plan</h3>
            <p className="text-xs text-[#8a7456]">Etape {step}/8 — {STEP_LABELS[step - 1]}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#8a7456] hover:text-[#2f2415] text-xl leading-none">&times;</button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="flex gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={`flex-1 h-1 rounded-full transition-all ${i < step ? 'bg-[#c9a96a]' : 'bg-[#d6c3a0]'}`} />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-auto px-5 py-4">

          {/* Step 1 — Activite */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-[#2f2415] mb-3">Quel type d'activite ?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {ACTIVITY_TYPES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => update({ activity_type: a.value })}
                    className={`rounded-2xl border-2 p-3 text-left transition-all ${wizardData.activity_type === a.value ? 'border-[#c9a96a] bg-[#fdf6e8]' : 'border-[#d6c3a0] hover:border-[#b6975f] bg-white'}`}
                  >
                    <div className="text-2xl mb-1">{a.emoji}</div>
                    <p className="text-xs font-bold text-[#2f2415]">{a.label}</p>
                    <p className="text-xs text-[#8a7456] mt-0.5 line-clamp-2">{a.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Informations */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Nom du Business Plan" value={wizardData.nom} onChange={(v) => update({ nom: v })} required />
              </div>
              <Field label="Localisation" value={wizardData.localisation} onChange={(v) => update({ localisation: v })} />
              <Field label="Date debut" type="date" value={wizardData.date_debut} onChange={(v) => update({ date_debut: v })} />
              <Field label="Duree cycle (mois)" type="number" value={wizardData.duree_cycle_mois} onChange={(v) => updatePlanning({ duree_cycle_mois: v })} />
              <Field label="Mode projection" type="select" value={wizardData.mode_projection} options={PROJECTION_MODE_OPTIONS} onChange={(v) => updatePlanning({ mode_projection: v })} />
              <Field label="Capacite initiale" type="number" value={wizardData.capacite_initiale} onChange={(v) => updatePlanning({ capacite_initiale: v, nombre_tetes_prevu: v })} />
              <Field label="Nombre tetes prevu" type="number" value={wizardData.nombre_tetes_prevu} onChange={(v) => updatePlanning({ nombre_tetes_prevu: v, capacite_initiale: v })} />
              <Field label="Unite capacite" value={wizardData.unite_capacite} onChange={(v) => update({ unite_capacite: v })} />
              <Field
                label="Unite calcul cout"
                type="select"
                value={wizardData.unite_calcul_cout}
                options={['tete', 'poulet', 'pondeuse', 'oeuf', 'plateau', 'kg', 'botte', 'caisse', 'm2', 'hectare', 'unite']}
                onChange={(v) => update({ unite_calcul_cout: v })}
              />
              <Field label="Production prevue totale" type="number" value={wizardData.quantite_production_prevue} onChange={(v) => updatePlanning({ quantite_production_prevue: v })} />
              <Field label="Prix vente prevu unitaire (FCFA)" type="number" value={wizardData.prix_vente_prevu_unitaire} onChange={(v) => updatePlanning({ prix_vente_prevu_unitaire: v })} />
              <Field label="Apport personnel (FCFA)" type="number" value={wizardData.apport_personnel} onChange={(v) => update({ apport_personnel: v })} />
              <Field label="Financement recherche (FCFA)" type="number" value={wizardData.financement_recherche} onChange={(v) => update({ financement_recherche: v })} />
              <div className="sm:col-span-2">
                <Field label="Objectif de production" value={wizardData.objectif_production} onChange={(v) => update({ objectif_production: v })} />
              </div>
            </div>
          )}

          {/* Step 3 — Template */}
          {step === 3 && (
            <div>
              <p className="text-sm font-semibold text-[#2f2415] mb-3">Choisir un template ou partir de zero ?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className="rounded-2xl border-2 border-[#d6c3a0] hover:border-[#c9a96a] bg-white p-4 text-left transition-all hover:bg-[#fdf6e8]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{tpl.emoji}</span>
                      <span className="font-bold text-sm text-[#2f2415]">{tpl.label}</span>
                    </div>
                    <p className="text-xs text-[#8a7456]">{tpl.description}</p>
                    <p className="text-xs text-[#c9a96a] mt-2 font-semibold">{tpl.lines.length} lignes + {tpl.costs.length} charges pre-remplies</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => update({ lines: [], costs: [], projections: [] })}
                  className="rounded-2xl border-2 border-dashed border-[#d6c3a0] hover:border-[#c9a96a] bg-white p-4 text-left transition-all"
                >
                  <p className="font-bold text-sm text-[#8a7456]">Partir de zero</p>
                  <p className="text-xs text-[#8a7456] mt-1">Feuille blanche — saisir toutes les lignes manuellement</p>
                </button>
              </div>
              {wizardData.lines.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-3 text-sm text-[#2f2415]">
                  Template applique : <strong>{wizardData.lines.length}</strong> lignes + <strong>{wizardData.costs.length}</strong> charges + <strong>{wizardData.projections.length}</strong> projections
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Lignes investissement */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#2f2415]">Lignes d'investissement initial</p>
                <div className="flex gap-2">
                  <Btn variant="outline" small icon={Wand2} onClick={() => { const { lines } = buildTemplateData(wizardData.activity_type, wizardData.id || makeId('BP')); update({ lines }); toast.success('Template rechargé'); }}>
                    Recharger template
                  </Btn>
                  <Btn small icon={Plus} onClick={() => linesTable.addRow({ designation: '', categorie: 'autre', quantite: 1, unite: 'forfait', prix_unitaire: 0, total: 0 })}>
                    Ajouter ligne
                  </Btn>
                </div>
              </div>
              <div className="text-xs text-[#8a7456] mb-2 flex gap-3 px-1">
                <span style={{ flex: 3 }}>Designation</span>
                <span style={{ flex: 1.5 }}>Categorie</span>
                <span style={{ flex: 1 }}>Qte</span>
                <span style={{ flex: 1.5 }}>Prix unit.</span>
                <span style={{ flex: 1.5 }}>Total</span>
                <span style={{ width: 24 }} />
              </div>
              <div className="space-y-1">
                {linesTable.rows.map((row, i) => (
                  <InlineRowEditor
                    key={row.id || i}
                    row={row}
                    onChange={(p) => linesTable.updateRow(i, p)}
                    onDelete={() => linesTable.deleteRow(i)}
                    columns={[
                      { key: 'designation', type: 'text', flex: 3 },
                      { key: 'categorie', type: 'select', options: CATEGORIE_LINES, flex: 1.5 },
                      { key: 'quantite', type: 'number', flex: 1 },
                      { key: 'prix_unitaire', type: 'number', flex: 1.5 },
                      { key: 'total', type: 'readonly', flex: 1.5 },
                    ]}
                  />
                ))}
                {!linesTable.rows.length && <p className="text-sm text-[#8a7456]">Aucune ligne. Ajouter ou charger un template.</p>}
              </div>
              <div className="mt-3 rounded-xl bg-[#2f2415] text-white p-3 flex items-center justify-between">
                <span className="text-sm font-bold">Total investissement initial</span>
                <span className="text-lg font-black">{fmtCurrency(totalInvestissement)}</span>
              </div>
            </div>
          )}

          {/* Step 5 — Charges recurrentes */}
          {step === 5 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#2f2415]">Charges recurrentes mensuelles</p>
                <Btn small icon={Plus} onClick={() => costsTable.addRow({ designation: '', categorie: 'autre', montant_mensuel: 0, frequence: 'mensuelle' })}>
                  Ajouter charge
                </Btn>
              </div>
              <div className="text-xs text-[#8a7456] mb-2 flex gap-3 px-1">
                <span style={{ flex: 3 }}>Designation</span>
                <span style={{ flex: 1.5 }}>Categorie</span>
                <span style={{ flex: 2 }}>Montant/mois</span>
                <span style={{ flex: 1.5 }}>Frequence</span>
                <span style={{ width: 24 }} />
              </div>
              <div className="space-y-1">
                {costsTable.rows.map((row, i) => (
                  <InlineRowEditor
                    key={row.id || i}
                    row={row}
                    onChange={(p) => costsTable.updateRow(i, p)}
                    onDelete={() => costsTable.deleteRow(i)}
                    columns={[
                      { key: 'designation', type: 'text', flex: 3 },
                      { key: 'categorie', type: 'select', options: CATEGORIE_COSTS, flex: 1.5 },
                      { key: 'montant_mensuel', type: 'number', flex: 2 },
                      { key: 'frequence', type: 'select', options: FREQUENCES, flex: 1.5 },
                    ]}
                  />
                ))}
                {!costsTable.rows.length && <p className="text-sm text-[#8a7456]">Aucune charge. Ajouter ou recharger un template.</p>}
              </div>
              <div className="mt-3 rounded-xl bg-[#2f2415] text-white p-3 flex items-center justify-between">
                <span className="text-sm font-bold">Total mensuel</span>
                <span className="text-lg font-black">{fmtCurrency(totalMensuel)}</span>
              </div>
            </div>
          )}

          {/* Step 6 — Projections */}
          {step === 6 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#2f2415]">Projections de revenus ({wizardData.projections.length} mois)</p>
                <div className="flex gap-2">
                  <Btn variant="outline" small icon={Wand2} onClick={regenerateProjections}>Regenerer auto</Btn>
                  <Btn small icon={Plus} onClick={() => projTable.addRow({ mois_index: (wizardData.projections.length || 0) + 1, production_estimee: 0, unite_production: 'unite', prix_unitaire_estime: 0, ca_estime: 0, charges_estimees: totalMensuel, marge_estimee: -totalMensuel })}>
                    + Mois
                  </Btn>
                </div>
              </div>
              <div className="text-xs text-[#8a7456] mb-2 flex gap-1 px-1">
                <span style={{ flex: 0.5 }}>Mois</span>
                <span style={{ flex: 1.5 }}>Prod.</span>
                <span style={{ flex: 1.5 }}>Unite</span>
                <span style={{ flex: 1.5 }}>Prix unit.</span>
                <span style={{ flex: 1.5 }}>CA</span>
                <span style={{ flex: 1.5 }}>Charges</span>
                <span style={{ flex: 1.5 }}>Marge</span>
                <span style={{ width: 20 }} />
              </div>
              <div className="space-y-1 max-h-64 overflow-auto pr-1">
                {projTable.rows.map((row, i) => (
                  <InlineRowEditor
                    key={row.id || i}
                    row={row}
                    onChange={(p) => projTable.updateRow(i, p)}
                    onDelete={() => projTable.deleteRow(i)}
                    columns={[
                      { key: 'mois_index', type: 'number', flex: 0.5 },
                      { key: 'production_estimee', type: 'number', flex: 1.5 },
                      { key: 'unite_production', type: 'text', flex: 1.5 },
                      { key: 'prix_unitaire_estime', type: 'number', flex: 1.5 },
                      { key: 'ca_estime', type: 'readonly', flex: 1.5 },
                      { key: 'charges_estimees', type: 'number', flex: 1.5 },
                      { key: 'marge_estimee', type: 'readonly', flex: 1.5 },
                    ]}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                  <p className="text-xs text-emerald-600 font-semibold">CA total projete</p>
                  <p className="text-base font-black text-emerald-600">{fmtCurrency(totalCA)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${margeNetteCycle >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <p className={`text-xs font-semibold ${margeNetteCycle >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Marge nette cycle</p>
                  <p className={`text-base font-black ${margeNetteCycle >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(margeNetteCycle)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Duree choisie</p><p className="font-black text-[#2f2415]">{wizardData.duree_cycle_mois} mois</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Mode projection</p><p className="font-black text-[#2f2415]">{PROJECTION_MODES[wizardData.mode_projection] || wizardData.mode_projection}</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Charges cycle</p><p className="font-black text-[#2f2415]">{fmtCurrency(chargesTotalesCycle)}</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Investissement initial</p><p className="font-black text-[#2f2415]">{fmtCurrency(totalInvestissement)}</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Cout total cycle</p><p className="font-black text-[#2f2415]">{fmtCurrency(coutTotalCycle)}</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Marge brute</p><p className="font-black text-[#2f2415]">{fmtCurrency(margeBruteProjetee)}</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">ROI prevu</p><p className={`font-black ${roiPrevu >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{roiPrevu.toFixed(1)}%</p></div>
                <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[#8a7456]">Cout / unite</p><p className="font-black text-[#2f2415]">{fmtCurrency(coutParUnite)}</p></div>
              </div>
              {isSaleCapped && (
                <div className={`mt-3 rounded-xl border p-3 text-xs ${projectionOverflow ? 'border-red-400 bg-red-50 text-red-600' : 'border-emerald-400 bg-emerald-50 text-emerald-700'}`}>
                  Cumul vendu / produit: <strong>{totalProduit}</strong> sur <strong>{capaciteVendable}</strong>.
                  {' '}Quantite restante a vendre: <strong>{quantiteRestante}</strong>.
                  {projectionOverflow ? ' Le cumul depasse la capacite prevue: validation bloquee.' : ''}
                </div>
              )}
            </div>
          )}

          {/* Step 7 — Financement */}
          {step === 7 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#2f2415]">Sources de financement</p>
                <Btn small icon={Plus} onClick={() => fundTable.addRow({ nom_source: '', source_type: 'apport_personnel', montant: 0, statut: 'demande' })}>
                  Ajouter source
                </Btn>
              </div>
              <div className="space-y-1">
                {fundTable.rows.map((row, i) => (
                  <InlineRowEditor
                    key={row.id || i}
                    row={row}
                    onChange={(p) => fundTable.updateRow(i, p)}
                    onDelete={() => fundTable.deleteRow(i)}
                    columns={[
                      { key: 'nom_source', type: 'text', flex: 2 },
                      { key: 'source_type', type: 'select', options: SOURCE_TYPES, flex: 2 },
                      { key: 'montant', type: 'number', flex: 1.5 },
                      { key: 'statut', type: 'select', options: STATUT_FUNDING, flex: 1.5 },
                    ]}
                  />
                ))}
                {!fundTable.rows.length && <p className="text-sm text-[#8a7456]">Aucune source. Vous pouvez en ajouter plus tard.</p>}
              </div>
            </div>
          )}

          {/* Step 8 — Validation */}
          {step === 8 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#2f2415]">Recapitulatif — Valider et creer</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Nom', wizardData.nom],
                  ['Activite', ACTIVITY_LABELS[wizardData.activity_type] || wizardData.activity_type],
                  ['Localisation', wizardData.localisation || '-'],
                  ['Cycle', `${wizardData.duree_cycle_mois} mois`],
                  ['Capacite', `${wizardData.capacite_initiale} ${wizardData.unite_capacite}`],
                  ['Investissement', fmtCurrency(totalInvestissement)],
                  ['Charges/mois', fmtCurrency(totalMensuel)],
                  ['CA projete', fmtCurrency(totalCA)],
                  ['Charges cycle', fmtCurrency(chargesTotalesCycle)],
                  ['Cout total cycle', fmtCurrency(coutTotalCycle)],
                  ['Marge nette cycle', fmtCurrency(margeNetteCycle)],
                  ['ROI prevu', `${roiPrevu.toFixed(1)}%`],
                  ['Lignes', `${wizardData.lines.length}`],
                  ['Projections', `${wizardData.projections.length} mois`],
                  ['Financements', `${wizardData.fundings.length} sources`],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                    <p className="text-xs text-[#8a7456]">{label}</p>
                    <p className="text-sm font-bold text-[#2f2415] mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
                Ce Business Plan est un outil de pilotage interne. A faire valider par un comptable ou banquier avant depot officiel.
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-5 py-4 border-t border-[#d6c3a0] flex items-center justify-between shrink-0">
          <Btn variant="outline" icon={ChevronLeft} onClick={prev} disabled={step === 1}>Precedent</Btn>
          <span className="text-xs text-[#8a7456]">{step} / 8</span>
          {step < 8 ? (
            <Btn icon={ChevronRight} onClick={next} disabled={!canNext()}>Suivant</Btn>
          ) : (
            <Btn onClick={handleComplete} disabled={saving || !wizardData.nom}>
              {saving ? 'Creation...' : 'Creer le Business Plan'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
