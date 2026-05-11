import { Bot, CheckCircle2, ClipboardList, Mic, Navigation, Save, Send, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import useCrudModule from '../hooks/useCrudModule';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { buildAssistantDraft, FORM_SCHEMA_REGISTRY, listAssistantModules } from '../utils/formSchemaRegistry';
import { makeId } from '../utils/ids';
import { getRhDirectory, RH_FUNCTIONS_BY_ROLE, RH_ROLES, RH_TEAMS, saveRhDirectory } from '../utils/rhDirectory';

const MODULE_ROUTE = { paiements: 'ventes', alertes_center: 'alertes', smartfarm: 'smartfarm' };
const DIRECT_TABLE = { ventes: 'sales_orders', paiements: 'payments', clients: 'clients', stock: 'stock', animaux: 'animaux', avicole: 'avicole', cultures: 'cultures', sante: 'sante', fournisseurs: 'fournisseurs', documents: 'documents', taches: 'taches', alertes_center: 'alertes_center', equipements: 'equipements', smartfarm: 'sensor_devices', rapports: 'rapports' };
const PREFIX = { ventes: 'CMD', paiements: 'PAY', clients: 'CLI', stock: 'STK', animaux: 'ANI', avicole: 'LOT', cultures: 'CUL', sante: 'SAN', fournisseurs: 'FOU', documents: 'DOC', taches: 'TSK', alertes_center: 'ALT', equipements: 'EQP', smartfarm: 'SNS', rapports: 'RPT' };
const normalize = (value) => String(value || '').trim().toLowerCase();
const first = (list = []) => Array.isArray(list) ? list[0] : '';
const today = () => new Date().toISOString().slice(0, 10);
const slug = (value = '') => String(value || Date.now()).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase().slice(0, 18) || Date.now().toString(36).toUpperCase();
const makeRhId = (name = '') => `RH-${slug(name)}`;
const numeric = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const routeFor = (key) => MODULE_ROUTE[key] || key;
const asArray = (value) => Array.isArray(value) ? value : [];

const roleFromText = (text = '') => RH_ROLES.find((role) => normalize(text).includes(normalize(role))) || 'Ouvrier ferme';
const teamForRole = (role = '') => role.includes('avicole') ? 'TEAM-AVICOLE' : role.includes('cultures') ? 'TEAM-CULTURES' : role.includes('stock') ? 'TEAM-STOCK' : role.includes('Commercial') ? 'TEAM-COMMERCIAL' : 'TEAM-FERME';
const modulesForRole = (role = '') => role.includes('avicole') ? ['avicole', 'sante', 'stock'] : role.includes('cultures') ? ['cultures', 'stock'] : role.includes('stock') ? ['stock', 'fournisseurs'] : role.includes('Commercial') ? ['ventes', 'clients'] : ['avicole', 'stock'];

function parseJsonSafe(text = '{}') { try { return JSON.parse(text || '{}'); } catch { return null; } }
function extractAfter(text = '', labels = []) { for (const label of labels) { const match = String(text).match(new RegExp(`${label}\\s*[:=]?\\s*([^,;]+)`, 'i')); if (match?.[1]) return match[1].trim(); } return ''; }
function extractNumber(text = '', labels = []) { const scoped = extractAfter(text, labels); const match = String(scoped || text).match(/-?\d+(?:[.,]\d+)?/); return match ? Number(match[0].replace(',', '.')) : 0; }
function extractName(text = '', words = []) { const explicit = extractAfter(text, ['nom', 'name', 'client', 'fournisseur', 'produit', 'titre', 'title']); if (explicit) return explicit; let cleaned = String(text || '').replace(/ajouter|créer|creer|nouveau|nouvelle|fiche|module|dans|le|la|un|une|des|du/gi, ''); words.forEach((word) => { cleaned = cleaned.replace(new RegExp(word, 'ig'), ''); }); return cleaned.split(/[,;]/)[0].trim(); }
function inferModule(text = '') { const value = normalize(text); return Object.entries(FORM_SCHEMA_REGISTRY).find(([key, schema]) => value.includes(normalize(schema.label)) || value.includes(normalize(key)) || schema.intents.some((intent) => value.includes(normalize(intent))))?.[0] || 'ventes'; }

function enrichPayload(moduleKey, text = '', payload = {}) {
  const next = { ...payload };
  const value = normalize(text);
  if (moduleKey === 'rh') { const role = next.role || roleFromText(text); next.nom = next.nom || extractName(text, ['rh', 'role', 'fonction', 'salaire']); next.role = role; next.fonction = next.fonction || first(RH_FUNCTIONS_BY_ROLE[role]) || role; next.equipe_id = next.equipe_id || teamForRole(role); next.modules = next.modules || modulesForRole(role); next.statut = next.statut || 'actif'; next.salaire_mensuel = next.salaire_mensuel || extractNumber(text, ['salaire']); }
  if (moduleKey === 'clients') { next.nom = next.nom || extractName(text, ['client', 'tel', 'telephone', 'whatsapp']); next.tel = next.tel || extractAfter(text, ['tel', 'telephone', 'téléphone']); next.whatsapp = next.whatsapp || extractAfter(text, ['whatsapp']) || next.tel || ''; next.type = next.type || 'client'; next.statut = next.statut || 'actif'; }
  if (moduleKey === 'fournisseurs') { next.nom = next.nom || extractName(text, ['fournisseur', 'categorie', 'catégorie']); next.categorie = next.categorie || extractAfter(text, ['categorie', 'catégorie']) || 'Approvisionnement'; next.tel = next.tel || extractAfter(text, ['tel', 'telephone', 'téléphone']); next.whatsapp = next.whatsapp || extractAfter(text, ['whatsapp']) || next.tel || ''; }
  if (moduleKey === 'stock') { next.produit = next.produit || extractAfter(text, ['produit', 'stock']) || extractName(text, ['stock', 'quantite', 'quantité', 'unite']); next.categorie = next.categorie || extractAfter(text, ['categorie', 'catégorie']) || 'general'; next.quantite = next.quantite || extractNumber(text, ['quantite', 'quantité', 'qte']); next.unite = next.unite || extractAfter(text, ['unite', 'unité']) || 'unité'; }
  if (moduleKey === 'taches') { next.title = next.title || extractAfter(text, ['titre', 'tache', 'tâche']) || extractName(text, ['tache', 'tâche']); next.due_date = next.due_date || today(); next.priority = next.priority || (value.includes('urgent') ? 'critique' : 'moyenne'); }
  if (moduleKey === 'alertes_center') { next.title = next.title || extractAfter(text, ['titre', 'alerte']) || extractName(text, ['alerte']); next.severity = next.severity || (value.includes('urgent') || value.includes('critique') ? 'critique' : 'warning'); next.message = next.message || next.title; }
  if (moduleKey === 'documents') { next.title = next.title || extractAfter(text, ['titre', 'document']) || extractName(text, ['document']); next.document_category = next.document_category || extractAfter(text, ['categorie', 'catégorie']) || 'document'; }
  if (moduleKey === 'equipements') { next.name = next.name || next.nom || extractAfter(text, ['nom', 'equipement', 'équipement']) || extractName(text, ['equipement', 'équipement']); next.nom = next.nom || next.name; next.type = next.type || extractAfter(text, ['type']) || 'équipement'; next.status = next.status || 'operationnel'; }
  if (moduleKey === 'smartfarm') { next.name = next.name || extractAfter(text, ['nom', 'capteur', 'camera', 'caméra']) || extractName(text, ['capteur', 'camera', 'caméra']); next.type = next.type || (value.includes('camera') || value.includes('caméra') ? 'camera' : 'capteur'); next.zone = next.zone || extractAfter(text, ['zone']) || 'ferme'; next.status = next.status || 'actif'; }
  if (moduleKey === 'rapports') { next.title = next.title || extractAfter(text, ['titre', 'rapport']) || extractName(text, ['rapport']); next.report_type = next.report_type || extractAfter(text, ['type']) || 'synthese'; next.period = next.period || extractAfter(text, ['periode', 'période']) || 'mois'; }
  if (moduleKey === 'animaux') { next.tag = next.tag || extractAfter(text, ['tag', 'animal']) || `ANI-${slug(extractName(text, ['animal']))}`; next.type = next.type || extractAfter(text, ['type']) || 'Bovin'; next.sexe = next.sexe || (value.includes('femelle') ? 'F' : 'M'); next.name = next.name || extractName(text, ['animal', 'tag', 'type']); }
  if (moduleKey === 'avicole') { next.name = next.name || extractAfter(text, ['nom', 'lot']) || extractName(text, ['lot']); next.type = next.type || (value.includes('ponte') ? 'Ponte' : 'Chair'); next.initial_count = next.initial_count || extractNumber(text, ['effectif', 'nombre', 'initial_count']) || 0; next.date_debut = next.date_debut || today(); }
  if (moduleKey === 'cultures') { next.nom = next.nom || extractAfter(text, ['nom', 'culture']) || extractName(text, ['culture']); next.type = next.type || extractAfter(text, ['type']) || 'Maraîchage'; next.parcelle = next.parcelle || extractAfter(text, ['parcelle']) || 'Parcelle à préciser'; next.surface = next.surface || extractNumber(text, ['surface']) || 0; }
  if (moduleKey === 'sante') { next.nom = next.nom || extractAfter(text, ['nom', 'soin', 'intervention']) || extractName(text, ['soin', 'intervention']); next.type_intervention = next.type_intervention || (value.includes('vaccin') ? 'vaccination' : value.includes('urgence') ? 'urgence' : 'curatif'); next.target_mode = next.target_mode || 'global'; next.date = next.date || today(); }
  if (moduleKey === 'ventes') { next.client_id = next.client_id || extractAfter(text, ['client']); next.source_module = next.source_module || extractAfter(text, ['module', 'source']) || 'stock'; next.source_id = next.source_id || extractAfter(text, ['source_id', 'produit', 'animal', 'lot']); next.quantity = next.quantity || extractNumber(text, ['quantite', 'quantité', 'qte']) || 1; next.prix_unitaire = next.prix_unitaire || extractNumber(text, ['prix', 'prix_unitaire']); }
  if (moduleKey === 'paiements') { next.order_id = next.order_id || extractAfter(text, ['commande', 'order', 'order_id']); next.client_id = next.client_id || extractAfter(text, ['client']); next.montant = next.montant || extractNumber(text, ['montant', 'payer', 'encaisser']); next.moyen_paiement = next.moyen_paiement || extractAfter(text, ['moyen', 'mode']) || 'cash'; }
  return next;
}

function parseCommand(text = '') { const moduleKey = inferModule(text); const schema = FORM_SCHEMA_REGISTRY[moduleKey]; const value = normalize(text); const intent = schema.intents.find((item) => value.includes(normalize(item))) || first(schema.intents); const payload = {}; [...schema.required, ...schema.recommended].forEach((key) => { const match = text.match(new RegExp(`${key.replaceAll('_', '[ _-]?')}\\s*[:=]?\\s*([^,;]+)`, 'i')); if (match?.[1]) payload[key] = match[1].trim(); }); return { moduleKey, intent, payload: enrichPayload(moduleKey, text, payload), raw: text }; }
function StatusBadge({ ok }) { return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ok ? <CheckCircle2 size={12} /> : <ClipboardList size={12} />}{ok ? 'Prêt à valider' : 'À compléter'}</span>; }
function PillList({ title, items = [], tone = 'neutral' }) { const cls = tone === 'auto' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'missing' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]'; return <div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold mb-2">{title}</p><div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <span key={item} className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{item}</span>) : <span className="text-xs text-[#8a7456]">Aucun</span>}</div></div>; }

export default function AssistantERP({ dataMap = {}, onNavigate }) {
  const modules = useMemo(() => listAssistantModules(), []);
  const cruds = {
    ventes: useCrudModule('sales_orders'), paiements: useCrudModule('payments'), clients: useCrudModule('clients'), stock: useCrudModule('stock'), animaux: useCrudModule('animaux'), avicole: useCrudModule('avicole'), cultures: useCrudModule('cultures'), sante: useCrudModule('sante'), fournisseurs: useCrudModule('fournisseurs'), documents: useCrudModule('documents'), taches: useCrudModule('taches'), alertes_center: useCrudModule('alertes_center'), equipements: useCrudModule('equipements'), smartfarm: useCrudModule('sensor_devices'), rapports: useCrudModule('rapports'), finances: useCrudModule('finances'), business_events: useCrudModule('business_events')
  };
  const [moduleKey, setModuleKey] = useState('ventes');
  const [intent, setIntent] = useState(FORM_SCHEMA_REGISTRY.ventes.intents[0]);
  const [command, setCommand] = useState('');
  const [payloadText, setPayloadText] = useState('{}');
  const [draft, setDraft] = useState(() => buildAssistantDraft('ventes', {}));
  const [saving, setSaving] = useState(false);
  const voice = useVoiceRecognition({ onResult: (text) => { setCommand(text); applyCommand(text); } });
  const schema = FORM_SCHEMA_REGISTRY[moduleKey];
  const canCreateDirectly = moduleKey === 'rh' || Boolean(cruds[moduleKey]?.create);

  const selectModule = (key) => { const next = FORM_SCHEMA_REGISTRY[key]; setModuleKey(key); setIntent(next.intents[0]); setDraft(buildAssistantDraft(key, {})); setPayloadText('{}'); };
  const buildDraftFromPayload = (key = moduleKey, payload = {}) => { const next = buildAssistantDraft(key, payload); setDraft(next); return next; };
  const applyCommand = (text = command) => { const parsed = parseCommand(text); setModuleKey(parsed.moduleKey); setIntent(parsed.intent); setPayloadText(JSON.stringify(parsed.payload, null, 2)); const next = buildDraftFromPayload(parsed.moduleKey, parsed.payload); toast.success(next.ok ? 'Brouillon prêt' : 'Brouillon à compléter'); };
  const applyPayload = () => { const raw = parseJsonSafe(payloadText); if (!raw) return toast.error('JSON invalide'); const enriched = enrichPayload(moduleKey, command, raw); setPayloadText(JSON.stringify(enriched, null, 2)); const next = buildDraftFromPayload(moduleKey, enriched); toast.success(next.ok ? 'Champs obligatoires remplis' : `${next.missing.length} champ(s) à compléter`); };
  const openModule = () => { onNavigate?.(routeFor(moduleKey)); toast.success(`Ouverture ${schema.label}`); };

  const createRhRecord = async (payload) => { const directory = getRhDirectory(); const role = payload.role || 'Ouvrier ferme'; const record = { id: payload.id || makeRhId(payload.nom), nom: payload.nom, role, fonction: payload.fonction || first(RH_FUNCTIONS_BY_ROLE[role]) || role, statut: payload.statut || 'actif', equipe_id: payload.equipe_id || teamForRole(role), modules: Array.isArray(payload.modules) ? payload.modules : modulesForRole(role), phone: payload.phone || payload.tel || '', whatsapp: payload.whatsapp || payload.phone || payload.tel || '', email: payload.email || '', salaire_mensuel: numeric(payload.salaire_mensuel || payload.salaire), prime_mensuelle: numeric(payload.prime_mensuelle || payload.prime), avance_mois: numeric(payload.avance_mois || payload.avance), date_entree: payload.date_entree || today(), notes: payload.notes || 'Créé depuis Assistant ERP.', created_from: 'assistant_erp', created_at: new Date().toISOString() }; const people = asArray(directory.people); const teams = asArray(directory.teams).length ? directory.teams : RH_TEAMS; const exists = people.some((p) => String(p.id) === String(record.id) || normalize(p.nom) === normalize(record.nom)); saveRhDirectory({ people: exists ? people.map((p) => (String(p.id) === String(record.id) || normalize(p.nom) === normalize(record.nom)) ? { ...p, ...record, updated_at: new Date().toISOString() } : p) : [record, ...people], teams }); return { label: record.nom, route: 'rh', updated: exists }; };
  const normalizeRecord = (key, payload) => ({ id: payload.id || makeId(PREFIX[key] || 'ERP'), ...payload, created_from: 'assistant_erp', created_at: new Date().toISOString() });

  const createDirect = async () => {
    const raw = parseJsonSafe(payloadText);
    if (!raw) return toast.error('JSON invalide');
    const payload = enrichPayload(moduleKey, command, raw);
    setPayloadText(JSON.stringify(payload, null, 2));
    const nextDraft = buildAssistantDraft(moduleKey, payload);
    setDraft(nextDraft);
    if (!nextDraft.ok) return toast.error(`Champs manquants: ${nextDraft.missing.join(', ')}`);
    try {
      setSaving(true);
      let result;
      if (moduleKey === 'rh') result = await createRhRecord(payload);
      else if (moduleKey === 'sync') { toast('Sync ne crée pas de fiche métier. Ouverture du module.', { icon: 'ℹ️' }); return openModule(); }
      else {
        const crud = cruds[moduleKey];
        if (!crud?.create) { toast('Création directe pas encore disponible pour ce module.', { icon: 'ℹ️' }); return openModule(); }
        const record = normalizeRecord(moduleKey, payload);
        await crud.create(record);
        await crud.refresh?.();
        if (moduleKey === 'paiements' && numeric(record.montant || record.amount) > 0) {
          await cruds.finances.create?.({ id: makeId('TRX'), type: 'entree', libelle: `Paiement ${record.order_id || record.client_id || record.id}`, montant: numeric(record.montant || record.amount), date: record.date_paiement || record.date || today(), categorie: 'Paiements clients', module_lie: 'ventes', related_id: record.order_id || record.id, source_module: 'assistant_erp', source_record_id: record.id, payment_id: record.id, statut: 'paye' });
          await cruds.finances.refresh?.();
        }
        await cruds.business_events.create?.({ id: makeId('EVT'), event_type: 'assistant_erp_creation', module_source: moduleKey, entity_type: moduleKey, entity_id: record.id, title: `Création Assistant ERP — ${schema.label}`, description: record.nom || record.name || record.title || record.produit || record.id, event_date: today(), severity: 'info', saisies_evitees: Math.max(1, schema.required.length + schema.recommended.length - 1) });
        result = { label: record.nom || record.name || record.title || record.produit || record.id, route: routeFor(moduleKey) };
      }
      toast.success(`Créé : ${result.label}`);
      onNavigate?.(result.route);
    } catch (error) {
      toast.error(error.message || 'Création impossible');
    } finally { setSaving(false); }
  };

  const validateAction = () => canCreateDirectly ? createDirect() : openModule();
  const totalRows = Object.values(dataMap || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);

  return <div className="space-y-6"><SectionHeader title="Assistant ERP" sub="Préparer, vérifier et créer des fiches ERP depuis une commande texte ou vocale" actions={<><Btn icon={Navigation} variant="outline" small onClick={openModule}>Ouvrir module cible</Btn><Btn icon={Sparkles} small onClick={() => applyCommand()}>Analyser commande</Btn></>} /><div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><KpiCard icon={Bot} label="Modules pilotables" value={modules.length} /><KpiCard icon={ClipboardList} label="Module cible" value={schema.label} /><KpiCard icon={CheckCircle2} label="Obligatoires" value={schema.required.length} /><KpiCard icon={Wand2} label="Fiches ERP lues" value={totalRows} /></div><div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><div className="xl:col-span-2 rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex items-center gap-2"><Bot className="text-emerald-600" size={20} /><h3 className="font-black text-[#2f2415]">Commande guidée</h3></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label className="space-y-1"><span className="text-xs text-[#8a7456]">Module</span><select className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" value={moduleKey} onChange={(e) => selectModule(e.target.value)}>{modules.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="space-y-1"><span className="text-xs text-[#8a7456]">Intention</span><select className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" value={intent} onChange={(e) => setIntent(e.target.value)}>{schema.intents.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><label className="space-y-1 block"><span className="text-xs text-[#8a7456]">Commande vocale ou texte</span><div className="flex gap-2"><input className="flex-1 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Ex: ajouter stock produit aliment quantité 10 unité sac" /><button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`rounded-xl border px-3 ${voice.listening ? 'border-emerald-500 text-emerald-600 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`}><Mic size={16} /></button><button type="button" onClick={() => applyCommand()} className="rounded-xl bg-emerald-600 px-3 text-white"><Send size={16} /></button></div></label><label className="space-y-1 block"><span className="text-xs text-[#8a7456]">Brouillon JSON modifiable</span><textarea rows={8} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 font-mono text-xs text-[#2f2415]" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} /></label><div className="flex justify-end gap-2"><Btn variant="outline" onClick={applyPayload}>Vérifier champs</Btn><Btn icon={canCreateDirectly ? Save : Navigation} disabled={saving} onClick={validateAction}>{saving ? 'Création...' : canCreateDirectly ? 'Créer maintenant' : 'Continuer dans le module'}</Btn></div></div><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-[#2f2415]">Prévisualisation</h3><StatusBadge ok={draft.ok} /></div><PillList title="Champs manquants" items={draft.missing || []} tone="missing" /><PillList title="Champs obligatoires" items={schema.required} /><PillList title="Champs recommandés" items={schema.recommended} /><PillList title="Automatisations prévues" items={schema.auto} tone="auto" /><PillList title="Modules impactés" items={schema.effects} /></div></div><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><p className="font-black text-[#2f2415] mb-3">Catalogue des commandes</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{modules.map((item) => <button key={item.key} type="button" onClick={() => selectModule(item.key)} className={`text-left rounded-xl border p-3 ${item.key === moduleKey ? 'border-emerald-500 bg-emerald-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="font-bold text-[#2f2415]">{item.label}</p><p className="text-xs text-[#8a7456] mt-1">{item.intents.join(' · ')}</p></button>)}</div></div></div>;
}
