/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import Btn from '../components/Btn';
import EntityLinkedSelect from '../components/EntityLinkedSelect.jsx';
import VoiceInput from '../components/VoiceInput.jsx';
import BaseModal from './BaseModal';
import { uploadImage } from '../services/storageService';

const buildInitialValues = (fields = [], values = {}) => {
  const out = {};
  fields.forEach((field) => {
    if (field.type === 'section' || field.type === 'readonly') {
      if (field.key && values?.[field.key] !== undefined) out[field.key] = String(values[field.key]);
      return;
    }
    const raw = values?.[field.key];
    if (raw === undefined || raw === null) {
      out[field.key] = field.type === 'checkbox' ? false : '';
      return;
    }
    out[field.key] = field.type === 'checkbox' ? Boolean(raw) : String(raw);
  });
  return out;
};

const parseValues = (fields = [], values = {}) => {
  const out = {};
  fields.forEach((field) => {
    if (field.type === 'section' || field.type === 'readonly') return;
    const raw = values[field.key];
    if (field.type === 'number') {
      out[field.key] = raw === '' ? 0 : Number(raw);
    } else if (field.type === 'checkbox') {
      out[field.key] = Boolean(raw);
    } else {
      out[field.key] = raw ?? '';
    }
  });
  return out;
};

const isVisible = (field, form) => {
  if (!field.showWhen) return true;
  return field.showWhen(form);
};

const optionValue = (option) => (typeof option === 'object' ? option.value : option);
const optionLabel = (option) => (typeof option === 'object' ? option.label : option);
const isValidOption = (option) => String(optionValue(option) ?? '').trim() !== '';
const resolveOptions = (field, form) => {
  const raw = typeof field.options === 'function' ? field.options(form) : (field.options || []);
  return Array.isArray(raw) ? raw.filter(isValidOption) : [];
};
const noChoiceLabel = (field) => field.emptyLabel || `Aucune donnée disponible pour ${String(field.label || 'ce champ').toLowerCase()}`;

export default function EditModal({ open, onClose, onSubmit, fields = [], initialValues = {}, title = 'Modifier', submitLabel = 'Enregistrer', loading, autoId, uploadFolder, deriveValues, showSectionDescriptions = false }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const defaults = useMemo(() => buildInitialValues(fields, initialValues), [fields, initialValues]);

  useEffect(() => {
    if (!open) return;
    const generatedDefaults = autoId ? { ...defaults, id: autoId(defaults), ...(defaults.tag !== undefined ? { tag: autoId(defaults) } : {}) } : defaults;
    setForm(deriveValues ? deriveValues(generatedDefaults, null, {}) : generatedDefaults);
    setError('');
  }, [open, defaults, autoId, deriveValues]);

  const applyAutoId = (next) => {
    if (!autoId) return next;
    const generated = autoId(next);
    return { ...next, id: generated, ...(next.tag !== undefined ? { tag: generated } : {}) };
  };

  const handleChange = (key, value, field) => {
    setForm((prev) => {
      const cleared = field?.clearOnChange?.length ? field.clearOnChange.reduce((acc, item) => ({ ...acc, [item]: '' }), {}) : {};
      const next = applyAutoId({ ...prev, ...cleared, [key]: value });
      return deriveValues ? deriveValues(next, key, prev) : next;
    });
  };

  const handleImageChange = async (key, file) => {
    if (!file) return;
    try {
      setError('');
      const url = await uploadImage({ file, folder: uploadFolder || 'uploads' });
      handleChange(key, url);
    } catch (error) {
      setError(error.message || 'Upload image impossible.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const visibleFields = fields.filter((field) => isVisible(field, form));
    const requiredSelectWithoutOptions = visibleFields.find((field) => field.type === 'select' && field.required && resolveOptions(field, form).length === 0);
    if (requiredSelectWithoutOptions) {
      setError(`Impossible d’enregistrer : aucun choix disponible pour ${requiredSelectWithoutOptions.label}.`);
      return;
    }
    const missing = visibleFields.find((f) => f.required && !String(form[f.key] ?? '').trim());
    if (missing) {
      setError(`Le champ ${missing.label} est obligatoire.`);
      return;
    }
    setError('');
    onSubmit(parseValues(visibleFields, form));
  };

  return (
    <BaseModal open={open} onClose={onClose} title={title} footer={<div className="flex justify-end gap-2"><Btn variant="outline" onClick={onClose} disabled={loading}>Annuler</Btn><Btn onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement...' : submitLabel}</Btn></div>}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.filter((field) => isVisible(field, form)).map((field) => {
            const options = field.type === 'select' ? resolveOptions(field, form) : [];
            const selectDisabled = field.type === 'select' && options.length === 0;
            return field.type === 'entity_linked' ? (
              <EntityLinkedSelect
                key={field.key || 'entity_linked'}
                moduleValue={form.module_lie || form.module_source || ''}
                entityValue={form.entity_id || form.related_id || ''}
                context={field.context || {}}
                moduleLabel={field.moduleLabel || 'Module lié'}
                entityLabel={field.entityLabel || 'Entité liée'}
                onModuleChange={(value) => handleChange('module_lie', value, { ...field, clearOnChange: ['entity_id', 'related_id', 'lot_id', 'animal_id', 'culture_id', 'stock_id', 'client_id'] })}
                onEntityChange={(value) => {
                  handleChange('entity_id', value, field);
                  handleChange('related_id', value, field);
                }}
              />
            ) : field.type === 'section' ? (
              <div key={field.key || field.label} className="md:col-span-2 pt-2">
                <div className="rounded-xl bg-earth text-mist px-4 py-2 text-sm font-semibold">{field.label}</div>
                {showSectionDescriptions && field.description ? <p className="text-xs text-slate mt-1">{field.description}</p> : null}
              </div>
            ) : (
              <label key={field.key} className={field.fullWidth ? 'space-y-1 md:col-span-2' : 'space-y-1'}>
                <span className="text-xs text-slate">{field.label}{field.required ? ' *' : ''}</span>
                {field.type === 'select' ? (
                  <div className="space-y-1">
                    <select disabled={selectDisabled} value={form[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value, field)} className={`w-full border rounded-lg px-3 py-2 text-sm text-earth ${selectDisabled ? 'bg-vigilance-bg border-line text-slate' : 'bg-card border-line'}`}>
                      <option value="">{selectDisabled ? noChoiceLabel(field) : 'Selectionner...'}</option>
                      {options.map((option) => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}
                    </select>
                    {selectDisabled ? <p className="text-xs text-horizon-dark">Ajoute d’abord une fiche valide dans le module concerné.</p> : null}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <button type="button" onClick={() => handleChange(field.key, !form[field.key], field)} className={`w-full border rounded-lg px-3 py-2 text-sm text-left transition-all ${form[field.key] ? 'bg-positive border-positive text-positive' : 'bg-card border-line text-slate'}`}>{form[field.key] ? 'Oui' : 'Non'}</button>
                ) : field.type === 'readonly' ? (
                  <div className="w-full bg-vigilance-bg border border-line rounded-lg px-3 py-2 text-sm text-slate">{form[field.key] || field.value || '-'}</div>
                ) : field.type === 'textarea' ? (
                  <div className="space-y-2">
                    <textarea value={form[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value, field)} rows={field.rows || 4} placeholder={field.placeholder || ''} className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-earth" />
                    <VoiceInput onText={(text) => handleChange(field.key, text, field)} />
                  </div>
                ) : field.type === 'image' ? (
                  <div className="space-y-2">
                    {form[field.key] ? <img src={form[field.key]} alt="" className="h-24 w-24 rounded-xl object-cover border border-line" /> : null}
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(field.key, e.target.files?.[0])} className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-earth" />
                    <input type="url" value={form[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value, field)} placeholder="URL photo" className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-earth" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type={field.type || 'text'} value={form[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value, field)} className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-earth" />
                    {['text', 'email', undefined].includes(field.type) ? <VoiceInput onText={(text) => handleChange(field.key, text, field)} /> : null}
                  </div>
                )}
              </label>
            );
          })}
        </div>
        {error ? <p className="text-xs text-urgent">{error}</p> : null}
      </form>
    </BaseModal>
  );
}
