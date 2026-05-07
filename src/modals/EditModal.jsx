/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import Btn from '../components/Btn';
import VoiceInput from '../components/VoiceInput';
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

export default function EditModal({
  open,
  onClose,
  onSubmit,
  fields = [],
  initialValues = {},
  title = 'Modifier',
  submitLabel = 'Enregistrer',
  loading,
  autoId,
  uploadFolder,
  deriveValues,
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const defaults = useMemo(() => buildInitialValues(fields, initialValues), [fields, initialValues]);

  useEffect(() => {
    if (!open) return;
    const generatedDefaults = autoId
      ? { ...defaults, id: autoId(defaults), ...(defaults.tag !== undefined ? { tag: autoId(defaults) } : {}) }
      : defaults;
    setForm(deriveValues ? deriveValues(generatedDefaults, null, {}) : generatedDefaults);
    setError('');
  }, [open, defaults, autoId, deriveValues]);

  const applyAutoId = (next) => {
    if (!autoId) return next;
    const generated = autoId(next);
    return {
      ...next,
      id: generated,
      ...(next.tag !== undefined ? { tag: generated } : {}),
    };
  };

  const handleChange = (key, value) => {
    setForm((prev) => {
      const next = applyAutoId({ ...prev, [key]: value });
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
    const missing = visibleFields.find((f) => f.required && !String(form[f.key] ?? '').trim());
    if (missing) {
      setError(`Le champ ${missing.label} est obligatoire.`);
      return;
    }

    setError('');
    onSubmit(parseValues(visibleFields, form));
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={loading}>Annuler</Btn>
          <Btn onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement...' : submitLabel}</Btn>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.filter((field) => isVisible(field, form)).map((field) => (
            field.type === 'section' ? (
              <div key={field.key || field.label} className="md:col-span-2 pt-2">
                <div className="rounded-xl bg-[#2f2415] text-[#f8f5ef] px-4 py-2 text-sm font-bold">{field.label}</div>
                {field.description ? <p className="text-xs text-[#8a7456] mt-1">{field.description}</p> : null}
              </div>
            ) : (
            <label key={field.key} className={field.fullWidth ? 'space-y-1 md:col-span-2' : 'space-y-1'}>
              <span className="text-xs text-[#8a7456]">{field.label}</span>
              {field.type === 'select' ? (
                <select
                  value={form[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#2f2415]"
                >
                  <option value="">Selectionner...</option>
                  {(field.options || []).map((option) => (
                    <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <button
                  type="button"
                  onClick={() => handleChange(field.key, !form[field.key])}
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-left transition-all ${form[field.key] ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700' : 'bg-[#fffdf8] border-[#d6c3a0] text-[#8a7456]'}`}
                >
                  {form[field.key] ? 'Oui' : 'Non'}
                </button>
              ) : field.type === 'readonly' ? (
                <div className="w-full bg-[#f4ebdb] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#7d6a4a]">
                  {form[field.key] || field.value || '-'}
                </div>
              ) : field.type === 'image' ? (
                <div className="space-y-2">
                  {form[field.key] ? (
                    <img src={form[field.key]} alt="" className="h-24 w-24 rounded-xl object-cover border border-[#d6c3a0]" />
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(field.key, e.target.files?.[0])}
                    className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#2f2415]"
                  />
                  <input
                    type="url"
                    value={form[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder="URL photo"
                    className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#2f2415]"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type={field.type || 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#2f2415]"
                  />
                  {['text', 'email', undefined].includes(field.type) ? (
                    <VoiceInput onText={(text) => handleChange(field.key, text)} />
                  ) : null}
                </div>
              )}
            </label>
            )
          ))}
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </form>
    </BaseModal>
  );
}

