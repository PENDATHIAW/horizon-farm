import { AlertTriangle, Bell, CheckCircle, ExternalLink, MessageCircle, Plus, RefreshCw, Search, Settings, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import { normalizePhone, openWhatsAppApp } from '../utils/contactActions';
import { fmtCurrency } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { getResponsibleOptions, resolveResponsibleLabel } from '../utils/rhDirectory';

const ALERT_CONFIG_KEY = 'horizon_farm_alert_config_v1';
const SEVERITY_ORDER = { urgence: 0, critique: 1, warning: 2, info: 3 };
const SEVERITY_BORDER = { urgence: 'border-l-red-500', critique: 'border-l-orange-500', warning: 'border-l-amber-400', info: 'border-l-sky-400' };
const SEVERITY_EMOJI = { urgence: '🚨', critique: '⚠️', warning: '⚡', info: 'ℹ️' };
const MODULE_BADGE = { animaux: 'bg-amber-100 text-amber-700', avicole: 'bg-yellow-100 text-yellow-700', cultures: 'bg-emerald-100 text-emerald-700', stock: 'bg-blue-100 text-blue-700', finances: 'bg-purple-100 text-purple-700', clients: 'bg-pink-100 text-pink-700', smartfarm: 'bg-indigo-100 text-indigo-700', equipements: 'bg-orange-100 text-orange-700', autre: 'bg-gray-100 text-gray-600' };
const MODULE_TARGETS = { animal: 'animaux', animaux: 'animaux', lot_avicole: 'avicole', avicole: 'avicole', stock: 'stock', culture: 'cultures', cultures: 'cultures', transaction: 'finances', finances: 'finances', client: 'clients', fournisseur: 'fournisseurs', sensor: 'smartfarm', equipement: 'equipements' };
const AUTO_SEND_SEVERITIES = ['critique', 'urgence'];
const defaultConfig = { autoWhatsApp: true, defaultRecipient: 'OWNER', ownerName: 'Penda Thiaw', ownerWhatsapp: '', notifyOwnerOnUrgency: true };

const ALERTE_FIELDS = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'message', label: 'Message', type: 'text', fullWidth: true },
  { key: 'module_source', label: 'Module', type: 'select', options: ['animaux', 'avicole', 'cultures', 'stock', 'finances', 'clients', 'fournisseurs', 'smartfarm', 'equipements', 'autre'] },
  { key: 'entity_type', label: 'Type entite', type: 'text' },
  { key: 'entity_id', label: 'ID entite', type: 'text' },
  { key: 'severity', label: 'Gravite', type: 'select', options: ['info', 'warning', 'critique', 'urgence'] },
  { key: 'responsable', label: 'Destinataire / responsable', type: 'select', options: getResponsibleOptions({ moduleKey: '' }) },
  { key: 'action_recommandee', label: 'Action recommandee', type: 'text', fullWidth: true },
];

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const alertKey = (alert = {}) => `${alert.module_source || alert.module || 'autre'}:${alert.entity_type || 'entite'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
const isClosed = (alert = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done'].includes(lower(alert.status || alert.statut));
const alreadyPersisted = (persisted = [], autoAlert = {}) => arr(persisted).some((alert) => String(alert.id) === String(autoAlert.id) || alert.alert_dedupe_key === alertKey(autoAlert) || `${alert.module_source}:${alert.entity_type}:${alert.entity_id}:${alert.action_recommandee || alert.title || alert.message || 'action'}` === alertKey(autoAlert));
function moduleFor(alert = {}) { return MODULE_TARGETS[lower(alert.entity_type)] || MODULE_TARGETS[lower(alert.module_source)] || lower(alert.module_source) || 'dashboard'; }
function loadConfig() { try { return { ...defaultConfig, ...JSON.parse(window.localStorage.getItem(ALERT_CONFIG_KEY) || '{}') }; } catch { return defaultConfig; } }
function saveConfig(config) { window.localStorage.setItem(ALERT_CONFIG_KEY, JSON.stringify(config)); return config; }
function shouldAutoNotify(alert = {}, config = {}) { return Boolean(config.autoWhatsApp) && AUTO_SEND_SEVERITIES.includes(lower(alert.severity)) && !alert.whatsapp_sent_at; }
function recipientLabel(recipient, config) { if (recipient === 'OWNER') return `${config.ownerName || 'Propriétaire'} · WhatsApp propriétaire`; return resolveResponsibleLabel(recipient); }
function messageFor(alert = {}) { return `[Horizon Farm] ${String(alert.severity || 'info').toUpperCase()}\n${alert.title || 'Alerte'}\n${alert.message || ''}\nAction: ${alert.action_recommandee || 'Vérifier dans Horizon Farm'}\nModule: ${alert.module_source || '-'}\nRéf: ${alert.entity_id || '-'}`; }
function resolveWhatsAppRecipient(rawRecipient, config = {}, forceOwner = false) {
  const ownerPhone = normalizePhone(config.ownerWhatsapp);
  const recipient = forceOwner ? 'OWNER' : (rawRecipient || config.defaultRecipient || 'OWNER');
  const directPhone = normalizePhone(recipient);
  if (recipient === 'OWNER') return { recipient: 'OWNER', phone: ownerPhone, usedFallback: false };
  if (directPhone) return { recipient, phone: directPhone, usedFallback: false };
  if (ownerPhone) return { recipient: 'OWNER', phone: ownerPhone, usedFallback: true, originalRecipient: recipient };
  return { recipient, phone: '', usedFallback: false };
}

export default function AlertesCenter({ alertes = [], transactions = [], animaux = [], lots = [], stocks = [], cultures = [], sensorDevices = [], loading, onCreate, onUpdate, onDelete, onRefresh, onSendWhatsApp, onNavigate }) {
  const [severityFilter, setSeverityFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [moduleFilter, setModuleFilter] = useState('tous');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState('');
  const [config, setConfig] = useState(loadConfig);
  const readyToastKeyRef = useRef('');
  const responsibleOptions = useMemo(() => [{ value: 'OWNER', label: `${config.ownerName || 'Propriétaire'} · WhatsApp propriétaire` }, ...getResponsibleOptions({ moduleKey: '' })], [config.ownerName]);

  const autoAlerts = useMemo(() => {
    const result = [];
    animaux.filter((a) => a.health_status === 'malade').forEach((a) => result.push({ id: `auto-malade-${a.id}`, title: `Animal malade: ${a.name || a.nom || a.id}`, message: `L'animal ${a.name || a.nom || a.id} est en mauvais état de santé.`, module_source: 'animaux', entity_type: 'animal', entity_id: a.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Consulter vétérinaire immédiatement', responsable: 'OWNER', isAuto: true, created_at: new Date().toISOString() }));
    animaux.filter((a) => a.health_status === 'sous_traitement').forEach((a) => result.push({ id: `auto-traitement-${a.id}`, title: `Animal sous traitement: ${a.name || a.nom || a.id}`, message: `Vérifier le délai d'attente sanitaire avant toute vente.`, module_source: 'animaux', entity_type: 'animal', entity_id: a.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Vérifier traitement et délai d’attente', responsable: 'TEAM-FERME', isAuto: true, created_at: new Date().toISOString() }));
    lots.filter((l) => Number(l.mortality || l.morts || 0) > Number(l.initial_count || 0) * 0.04).forEach((l) => { const pct = l.initial_count > 0 ? ((Number(l.mortality || l.morts) / Number(l.initial_count)) * 100).toFixed(1) : '?'; result.push({ id: `auto-mortalite-${l.id}`, title: `Mortalité élevée — Lot ${l.name || l.nom || l.id}`, message: `${l.mortality || l.morts} morts sur ${l.initial_count} (${pct}%). Seuil critique à 4%.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: l.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Appliquer contrôle santé et biosécurité', responsable: config.notifyOwnerOnUrgency ? 'OWNER' : 'TEAM-AVICOLE', isAuto: true, created_at: new Date().toISOString() }); });
    transactions.filter((t) => t.statut === 'impaye').forEach((t) => result.push({ id: `auto-impaye-${t.id}`, title: `Paiement impayé: ${t.libelle || t.id || 'transaction'}`, message: `Transaction de ${fmtCurrency(t.montant)} non réglée.`, module_source: 'finances', entity_type: 'transaction', entity_id: t.id, severity: Number(t.montant || 0) > 100000 ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: 'Relancer le client ou fournisseur', responsable: Number(t.montant || 0) > 100000 && config.notifyOwnerOnUrgency ? 'OWNER' : 'TEAM-COMMERCIAL', amount: t.montant, isAuto: true, created_at: new Date().toISOString() }));
    stocks.filter((s) => Number(s.quantite || 0) <= Number(s.seuil || 0)).forEach((s) => result.push({ id: `auto-stock-${s.id}`, title: `Stock critique: ${s.nom || s.produit || s.id}`, message: `Quantité restante: ${s.quantite} ${s.unite || ''}. Seuil d'alerte: ${s.seuil}.`, module_source: 'stock', entity_type: 'stock', entity_id: s.id, severity: Number(s.quantite || 0) <= 0 ? 'urgence' : 'critique', status: 'nouvelle', action_recommandee: 'Commander réapprovisionnement', responsable: Number(s.quantite || 0) <= 0 && config.notifyOwnerOnUrgency ? 'OWNER' : 'TEAM-STOCK', isAuto: true, created_at: new Date().toISOString() }));
    cultures.filter((c) => c.statut === 'perdu').forEach((c) => result.push({ id: `auto-culture-${c.id}`, title: `Culture perdue: ${c.nom || c.name || c.id}`, message: `La culture ${c.nom || c.name || c.id} a été marquée comme perdue.`, module_source: 'cultures', entity_type: 'culture', entity_id: c.id, severity: 'critique', status: 'nouvelle', action_recommandee: 'Analyser cause et planifier nouvelle culture', responsable: config.notifyOwnerOnUrgency ? 'OWNER' : 'TEAM-CULTURES', isAuto: true, created_at: new Date().toISOString() }));
    sensorDevices.filter((d) => d.status === 'offline').forEach((d) => result.push({ id: `auto-sensor-${d.id}`, title: `Capteur hors ligne: ${d.name || d.id}`, message: `Le capteur ${d.name || d.id} ne répond plus.`, module_source: 'smartfarm', entity_type: 'sensor', entity_id: d.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Vérifier batterie ou connexion', responsable: 'TEAM-MAINTENANCE', isAuto: true, created_at: new Date().toISOString() }));
    return result.filter((alert) => !alreadyPersisted(alertes, alert));
  }, [animaux, lots, transactions, stocks, cultures, sensorDevices, alertes, config.notifyOwnerOnUrgency]);

  const allAlerts = useMemo(() => [...autoAlerts, ...alertes].filter((alert) => !isClosed(alert)).sort((a, b) => { const diff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3); if (diff !== 0) return diff; return new Date(b.created_at || 0) - new Date(a.created_at || 0); }), [autoAlerts, alertes]);
  const filtered = useMemo(() => allAlerts.filter((a) => { const sevOk = severityFilter === 'tous' || a.severity === severityFilter; const statOk = statusFilter === 'tous' || a.status === statusFilter; const modOk = moduleFilter === 'tous' || a.module_source === moduleFilter; const qOk = !query || `${a.title} ${a.message || ''} ${a.entity_id || ''}`.toLowerCase().includes(query.toLowerCase()); return sevOk && statOk && modOk && qOk; }), [allAlerts, severityFilter, statusFilter, moduleFilter, query]);
  const modules = useMemo(() => [...new Set(allAlerts.map((a) => a.module_source).filter(Boolean))], [allAlerts]);
  const nouvellesCount = allAlerts.filter((a) => a.status === 'nouvelle').length;
  const critiquesCount = allAlerts.filter((a) => ['critique', 'urgence'].includes(a.severity)).length;
  const autoNotifyCount = allAlerts.filter((a) => shouldAutoNotify(a, config)).length;

  useEffect(() => {
    if (!config.autoWhatsApp || !config.ownerWhatsapp || !autoNotifyCount) return;
    const key = allAlerts.filter((a) => shouldAutoNotify(a, config)).map((a) => a.id || alertKey(a)).join('|');
    if (!key || readyToastKeyRef.current === key) return;
    readyToastKeyRef.current = key;
    const urgent = allAlerts.find((a) => shouldAutoNotify(a, config));
    toast(`WhatsApp prêt pour ${autoNotifyCount} alerte(s), dont : ${urgent?.title || 'alerte urgente'}`);
  }, [autoNotifyCount, config.autoWhatsApp, config.ownerWhatsapp, allAlerts, config]);

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate({ ...payload, responsable_label: recipientLabel(payload.responsable, config), status: 'nouvelle', alert_dedupe_key: alertKey(payload) }); toast.success('Alerte créée'); setModal(null); } catch { toast.error('Création alerte impossible'); } finally { setSaving(false); } };
  const persistAutoIfNeeded = async (alerte, patch = {}) => { if (!alerte.isAuto) { await onUpdate?.(alerte.id, patch); return alerte.id; } const id = generateSequentialId('alertes', alertes); await onCreate?.({ ...alerte, ...patch, id, isAuto: false, alert_dedupe_key: alertKey(alerte), responsable_label: recipientLabel(alerte.responsable, config), created_at: alerte.created_at || new Date().toISOString() }); return id; };
  const handleMarkRead = async (alerte) => { try { await persistAutoIfNeeded(alerte, { status: 'lue' }); await onRefresh?.(); toast.success('Marquée comme lue'); } catch { toast.error('Mise à jour impossible'); } };
  const handleTraiter = async (alerte) => { try { await persistAutoIfNeeded(alerte, { status: 'traitee', treated_at: new Date().toISOString() }); await onRefresh?.(); toast.success('Alerte traitée'); } catch { toast.error('Traitement impossible'); } };
  const openLinkedModule = (alerte) => { const target = moduleFor(alerte); if (onNavigate) { onNavigate(target); toast.success(`Ouverture ${target}`); } else toast('Navigation module non disponible ici'); };
  const handleSendWhatsApp = async (alerte, forceOwner = false) => {
    if (sendingId === alerte.id) return;
    try {
      setSendingId(alerte.id);
      const resolved = resolveWhatsAppRecipient(alerte.responsable, config, forceOwner);
      if (!resolved.phone) {
        toast.error('Aucun numéro WhatsApp configuré. Ajoute ton numéro propriétaire dans Configuration alertes.');
        return;
      }
      const message = messageFor(alerte);
      await openWhatsAppApp({ phone: resolved.phone, message, fallbackWeb: false });
      await onSendWhatsApp?.({ ...alerte, message, responsable: resolved.recipient, responsable_label: recipientLabel(resolved.recipient, config), recipient_phone: resolved.phone, original_recipient: resolved.originalRecipient }, resolved.phone);
      const patch = { whatsapp_sent_at: new Date().toISOString(), responsable: resolved.recipient, responsable_label: recipientLabel(resolved.recipient, config), recipient_phone: resolved.phone };
      if (alerte.isAuto) await persistAutoIfNeeded(alerte, { ...patch, status: alerte.status || 'nouvelle' });
      else await onUpdate?.(alerte.id, patch);
      if (resolved.usedFallback) toast.success(`Message préparé sur ton WhatsApp propriétaire`);
    } catch (error) {
      if (error?.code !== 'WHATSAPP_PHONE_INVALID') toast.error('Message WhatsApp impossible');
    } finally { setSendingId(''); }
  };
  const sendAllUrgent = async () => { const urgent = allAlerts.filter((a) => shouldAutoNotify(a, config)); if (!normalizePhone(config.ownerWhatsapp)) return toast.error('Configure d’abord ton numéro WhatsApp propriétaire'); for (const alert of urgent.slice(0, 5)) await handleSendWhatsApp(alert, true); };
  const handleDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete(selected.id); toast.success('Supprimée'); setModal(null); } catch { toast.error('Suppression impossible'); } finally { setSaving(false); } };
  const saveAlertConfig = () => { saveConfig(config); setModal(null); toast.success('Configuration alertes sauvegardée'); };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex flex-wrap items-center gap-2 text-sm text-amber-700 font-medium"><span>ℹ️</span><span>WhatsApp est préparé et journalisé avant envoi réel. Les équipes sans numéro utilisent ton WhatsApp propriétaire si configuré.</span>{autoNotifyCount > 0 ? <button type="button" onClick={sendAllUrgent} className="ml-auto rounded-lg bg-amber-600 px-3 py-1 text-white text-xs">Préparer {autoNotifyCount} urgence(s)</button> : null}</div>
      <SectionHeader title="Centre d'Alertes" sub="Alertes automatiques, actions terrain, notifications équipe" actions={<><Btn icon={Settings} variant="outline" small onClick={() => setModal('config')}>Configuration</Btn><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Nouvelle alerte</Btn></>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><KpiCard icon={Bell} label="Total alertes" value={allAlerts.length} color="bg-sky-500/20 text-sky-400" /><KpiCard icon={Bell} label="Nouvelles" value={nouvellesCount} color={nouvellesCount > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-100 text-gray-400'} /><KpiCard icon={AlertTriangle} label="Critiques / urgences" value={critiquesCount} color={critiquesCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-100 text-gray-400'} /><KpiCard icon={Zap} label="WhatsApp à préparer" value={autoNotifyCount} color={autoNotifyCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-100 text-gray-400'} /></div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 space-y-3"><div className="flex gap-3 items-center"><div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7456]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="w-full pl-8 pr-3 py-2 text-sm border border-[#d6c3a0] rounded-xl bg-[#fffdf8] text-[#2f2415] focus:outline-none focus:border-[#c9a96a]" /></div></div><Filter label="Gravité" values={['tous', 'info', 'warning', 'critique', 'urgence']} active={severityFilter} setActive={setSeverityFilter} /><Filter label="Statut" values={['tous', 'nouvelle', 'lue', 'traitee']} active={statusFilter} setActive={setStatusFilter} />{modules.length > 0 ? <Filter label="Module" values={['tous', ...modules]} active={moduleFilter} setActive={setModuleFilter} /> : null}</div>
      {loading && <div className="bg-white border border-[#d6c3a0] rounded-2xl p-8 text-center text-[#8a7456]">Chargement...</div>}
      {!loading && filtered.length === 0 && <div className="bg-white border border-[#d6c3a0] rounded-2xl p-16 text-center"><CheckCircle size={56} className="mx-auto mb-4 text-emerald-400" /><p className="text-lg font-bold text-[#2f2415]">Aucune alerte active</p><p className="text-sm text-[#8a7456] mt-1">Tout est sous contrôle.</p></div>}
      <div className="space-y-3">{filtered.map((alerte) => (<div key={alerte.id} className={`bg-white border border-[#d6c3a0] rounded-2xl p-4 flex gap-4 border-l-4 ${SEVERITY_BORDER[alerte.severity] || 'border-l-sky-400'}`}><div className="shrink-0 text-2xl mt-0.5">{SEVERITY_EMOJI[alerte.severity] || 'ℹ️'}</div><div className="flex-1 min-w-0"><div className="flex items-start gap-2 flex-wrap mb-1"><button type="button" onClick={() => openLinkedModule(alerte)} className="font-bold text-[#2f2415] flex-1 min-w-0 text-left hover:text-emerald-700"><ExternalLink size={14} className="inline" /> {alerte.title || 'Alerte'}</button>{alerte.module_source && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${MODULE_BADGE[alerte.module_source] || 'bg-gray-100 text-gray-600'}`}>{alerte.module_source}</span>}{alerte.isAuto && <span className="text-xs px-2 py-0.5 rounded-full bg-[#eadcc2] text-[#7d6a4a] shrink-0">Auto</span>}<span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${alerte.status === 'traitee' ? 'bg-emerald-100 text-emerald-700' : alerte.status === 'lue' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{alerte.status || 'nouvelle'}</span></div>{alerte.message && <p className="text-sm text-[#7d6a4a] mb-1">{alerte.message}</p>}{alerte.action_recommandee && <p className="text-xs text-emerald-700 font-semibold">→ Action : {alerte.action_recommandee}</p>}<div className="flex items-center gap-3 mt-1.5 flex-wrap">{alerte.entity_id && <span className="text-xs text-[#8a7456]">Ref: {alerte.entity_id}</span>}{alerte.amount != null && <span className="text-xs font-bold text-[#2f2415]">{fmtCurrency(alerte.amount)}</span>}<span className="text-xs text-[#8a7456]">Resp: {recipientLabel(alerte.responsable || config.defaultRecipient, config)}</span>{alerte.whatsapp_sent_at && <span className="text-xs text-emerald-700">WhatsApp préparé</span>}{alerte.created_at && <span className="text-xs text-[#8a7456]">{new Date(alerte.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}</div></div><div className="flex flex-col gap-1.5 shrink-0 items-end"><button type="button" onClick={() => openLinkedModule(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-[#d6c3a0] text-[#7d6a4a] hover:bg-[#f0e8d8] transition-colors whitespace-nowrap">Voir action</button>{(alerte.status || 'nouvelle') === 'nouvelle' && <button type="button" onClick={() => handleMarkRead(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-[#d6c3a0] text-[#7d6a4a] hover:bg-[#f0e8d8] transition-colors whitespace-nowrap">Marquer lu</button>}{(alerte.status || 'nouvelle') !== 'traitee' && <button type="button" onClick={() => handleTraiter(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap">✓ Traiter</button>}<button type="button" disabled={sendingId === alerte.id} onClick={() => handleSendWhatsApp(alerte)} className="text-xs px-2.5 py-1 rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50 transition-colors whitespace-nowrap disabled:opacity-60"><MessageCircle size={12} className="inline" /> {sendingId === alerte.id ? 'Préparation...' : 'WhatsApp'}</button>{!alerte.isAuto ? <ActionIconButton icon={X} color="red" title="Supprimer" onClick={() => { setSelected(alerte); setModal('delete'); }} /> : null}</div></div>))}</div>
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={ALERTE_FIELDS} initialValues={{ id: generateSequentialId('alertes', alertes), severity: 'info', status: 'nouvelle', responsable: config.defaultRecipient }} autoId={() => generateSequentialId('alertes', alertes)} loading={saving} title="Nouvelle alerte manuelle" submitLabel="Créer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={handleDelete} itemLabel={selected?.title || ''} loading={saving} />
      {modal === 'config' ? <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-[#d6c3a0] p-5 w-full max-w-lg space-y-4"><div className="flex items-center justify-between"><h3 className="font-black text-[#2f2415]">Configuration alertes</h3><button type="button" onClick={() => setModal(null)}><X size={18} /></button></div><label className="block text-sm"><span className="text-[#8a7456]">Nom propriétaire</span><input className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={config.ownerName} onChange={(e) => setConfig((prev) => ({ ...prev, ownerName: e.target.value }))} /></label><label className="block text-sm"><span className="text-[#8a7456]">WhatsApp propriétaire</span><input className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" placeholder="Ex: 221785890153" value={config.ownerWhatsapp} onChange={(e) => setConfig((prev) => ({ ...prev, ownerWhatsapp: e.target.value }))} /></label><label className="flex items-center gap-2 text-sm text-[#2f2415]"><input type="checkbox" checked={config.autoWhatsApp} onChange={(e) => setConfig((prev) => ({ ...prev, autoWhatsApp: e.target.checked }))} /> Préparer automatiquement WhatsApp pour critiques/urgences</label><label className="flex items-center gap-2 text-sm text-[#2f2415]"><input type="checkbox" checked={config.notifyOwnerOnUrgency} onChange={(e) => setConfig((prev) => ({ ...prev, notifyOwnerOnUrgency: e.target.checked }))} /> Toujours me notifier sur urgence/critique</label><label className="block text-sm"><span className="text-[#8a7456]">Destinataire par défaut</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={config.defaultRecipient} onChange={(e) => setConfig((prev) => ({ ...prev, defaultRecipient: e.target.value }))}>{responsibleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><p className="text-xs text-[#8a7456]">Règle recommandée : info = journaliser, warning = afficher + option WhatsApp, critique/urgence = notification appareil + WhatsApp manuel vers propriétaire ou équipe numérotée.</p><Btn onClick={saveAlertConfig}>Sauvegarder</Btn></div></div> : null}
    </div>
  );
}
function Filter({ label, values, active, setActive }) { return <div className="flex flex-wrap gap-2"><span className="text-xs text-[#8a7456] self-center">{label}:</span>{values.map((value) => <button key={value} type="button" onClick={() => setActive(value)} className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${active === value ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456] hover:border-[#b6975f]'}`}>{value}</button>)}</div>; }
