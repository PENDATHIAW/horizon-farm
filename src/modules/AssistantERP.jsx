import { Bot, CheckCircle2, ClipboardList, Mic, Navigation, Send, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { buildAssistantDraft, FORM_SCHEMA_REGISTRY, listAssistantModules } from '../utils/formSchemaRegistry';

const MODULE_ROUTE = {
  paiements: 'ventes',
  alertes_center: 'alertes',
  smartfarm: 'smartfarm',
};

const normalize = (value) => String(value || '').trim().toLowerCase();
const first = (list = []) => Array.isArray(list) ? list[0] : '';

function parseCommand(text = '') {
  const value = normalize(text);
  const modules = Object.entries(FORM_SCHEMA_REGISTRY);
  const moduleMatch = modules.find(([key, schema]) => value.includes(normalize(schema.label)) || value.includes(normalize(key)) || schema.intents.some((intent) => value.includes(normalize(intent))));
  const moduleKey = moduleMatch?.[0] || 'ventes';
  const schema = FORM_SCHEMA_REGISTRY[moduleKey];
  const intent = schema.intents.find((item) => value.includes(normalize(item))) || first(schema.intents);
  const payload = {};
  schema.required.forEach((key) => {
    const reg = new RegExp(`${key.replaceAll('_', '[ _-]?')}\s*[:=]?\s*([^,;]+)`, 'i');
    const match = text.match(reg);
    if (match?.[1]) payload[key] = match[1].trim();
  });
  return { moduleKey, intent, payload, raw: text };
}

function StatusBadge({ ok }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ok ? <CheckCircle2 size={12} /> : <ClipboardList size={12} />}{ok ? 'Prêt à valider' : 'À compléter'}</span>;
}

function PillList({ title, items = [], tone = 'neutral' }) {
  const cls = tone === 'auto' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'missing' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
  return <div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold mb-2">{title}</p><div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <span key={item} className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{item}</span>) : <span className="text-xs text-[#8a7456]">Aucun</span>}</div></div>;
}

export default function AssistantERP({ dataMap = {}, onNavigate }) {
  const modules = useMemo(() => listAssistantModules(), []);
  const [moduleKey, setModuleKey] = useState('ventes');
  const [intent, setIntent] = useState(FORM_SCHEMA_REGISTRY.ventes.intents[0]);
  const [command, setCommand] = useState('');
  const [payloadText, setPayloadText] = useState('{}');
  const [draft, setDraft] = useState(() => buildAssistantDraft('ventes', {}));
  const voice = useVoiceRecognition({ onResult: (text) => { setCommand(text); applyCommand(text); } });
  const schema = FORM_SCHEMA_REGISTRY[moduleKey];

  const selectModule = (key) => {
    const next = FORM_SCHEMA_REGISTRY[key];
    setModuleKey(key);
    setIntent(next.intents[0]);
    setDraft(buildAssistantDraft(key, {}));
    setPayloadText('{}');
  };

  const buildDraftFromPayload = (key = moduleKey, payload = {}) => {
    const next = buildAssistantDraft(key, payload);
    setDraft(next);
    return next;
  };

  const applyCommand = (text = command) => {
    const parsed = parseCommand(text);
    setModuleKey(parsed.moduleKey);
    setIntent(parsed.intent);
    setPayloadText(JSON.stringify(parsed.payload, null, 2));
    const next = buildDraftFromPayload(parsed.moduleKey, parsed.payload);
    toast.success(next.ok ? 'Brouillon prêt' : 'Brouillon à compléter');
  };

  const applyPayload = () => {
    try {
      const payload = JSON.parse(payloadText || '{}');
      const next = buildDraftFromPayload(moduleKey, payload);
      toast.success(next.ok ? 'Champs obligatoires remplis' : `${next.missing.length} champ(s) à compléter`);
    } catch {
      toast.error('JSON invalide');
    }
  };

  const openModule = () => {
    const route = MODULE_ROUTE[moduleKey] || moduleKey;
    onNavigate?.(route);
    toast.success(`Ouverture ${schema.label}`);
  };

  const totalRows = Object.values(dataMap || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);

  return <div className="space-y-6">
    <SectionHeader title="Assistant ERP" sub="Préparer les saisies vocales, vérifier les champs obligatoires et visualiser les automatisations avant validation" actions={<><Btn icon={Navigation} variant="outline" small onClick={openModule}>Ouvrir module cible</Btn><Btn icon={Sparkles} small onClick={() => applyCommand()}>Analyser commande</Btn></>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><KpiCard icon={Bot} label="Modules pilotables" value={modules.length} /><KpiCard icon={ClipboardList} label="Module cible" value={schema.label} /><KpiCard icon={CheckCircle2} label="Obligatoires" value={schema.required.length} /><KpiCard icon={Wand2} label="Fiches ERP lues" value={totalRows} /></div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
        <div className="flex items-center gap-2"><Bot className="text-emerald-600" size={20} /><h3 className="font-black text-[#2f2415]">Commande guidée</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-xs text-[#8a7456]">Module</span><select className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" value={moduleKey} onChange={(e) => selectModule(e.target.value)}>{modules.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-[#8a7456]">Intention</span><select className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" value={intent} onChange={(e) => setIntent(e.target.value)}>{schema.intents.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <label className="space-y-1 block"><span className="text-xs text-[#8a7456]">Commande vocale ou texte</span><div className="flex gap-2"><input className="flex-1 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Ex: encaisser commande CMD-001 montant 50000 moyen wave" /><button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`rounded-xl border px-3 ${voice.listening ? 'border-emerald-500 text-emerald-600 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`}><Mic size={16} /></button><button type="button" onClick={() => applyCommand()} className="rounded-xl bg-emerald-600 px-3 text-white"><Send size={16} /></button></div></label>
        <label className="space-y-1 block"><span className="text-xs text-[#8a7456]">Brouillon JSON modifiable</span><textarea rows={8} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 font-mono text-xs text-[#2f2415]" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} /></label>
        <div className="flex justify-end gap-2"><Btn variant="outline" onClick={applyPayload}>Vérifier champs</Btn><Btn onClick={openModule}>Continuer dans le module</Btn></div>
      </div>

      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3"><h3 className="font-black text-[#2f2415]">Prévisualisation</h3><StatusBadge ok={draft.ok} /></div>
        <PillList title="Champs manquants" items={draft.missing || []} tone="missing" />
        <PillList title="Champs obligatoires" items={schema.required} />
        <PillList title="Champs recommandés" items={schema.recommended} />
        <PillList title="Automatisations prévues" items={schema.auto} tone="auto" />
        <PillList title="Modules impactés" items={schema.effects} />
      </div>
    </div>

    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
      <p className="font-black text-[#2f2415] mb-3">Catalogue des commandes</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{modules.map((item) => <button key={item.key} type="button" onClick={() => selectModule(item.key)} className={`text-left rounded-xl border p-3 ${item.key === moduleKey ? 'border-emerald-500 bg-emerald-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="font-bold text-[#2f2415]">{item.label}</p><p className="text-xs text-[#8a7456] mt-1">{item.intents.join(' · ')}</p></button>)}</div>
    </div>
  </div>;
}
