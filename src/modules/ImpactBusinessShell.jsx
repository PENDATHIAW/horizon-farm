import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, HeartPulse, Package, ShieldCheck, TrendingUp, Wifi } from 'lucide-react';
import ImpactFarmValueBridgeV5 from './ImpactFarmValueBridgeV5.jsx';
import ImpactBusinessStrategicV5 from './ImpactBusinessStrategicV5.jsx';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const riskHealth = ['malade', 'sous_traitement', 'sous traitement', 'critique', 'urgence', 'traitement', 'a_traiter', 'à traiter', 'maladie'];
const goodHealth = ['sain', 'saine', 'ok', 'bonne', 'bon', 'normal'];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const remaining = (row = {}) => Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (amount(row) - paid(row)) ?? 0) || 0);

function pickHealthStatus(animal = {}) {
  const candidates = [animal.health_status, animal.statut_sante, animal.sante_status, animal.etat_sante, animal.impact_health_status, animal.health].map(lower).filter(Boolean);
  const risk = candidates.find((value) => riskHealth.some((term) => value.includes(term)));
  if (risk) return risk;
  const good = candidates.find((value) => goodHealth.some((term) => value.includes(term)));
  if (good) return good;
  return candidates[0] || '';
}

function normalizeAnimalHealthForImpact(animal = {}) {
  const health = pickHealthStatus(animal);
  const isRisk = riskHealth.some((term) => health.includes(term));
  const isSold = ['vendu', 'vendue', 'abattu', 'abattue', 'mort', 'morte'].includes(lower(animal.status || animal.statut));
  if (!health) return animal;
  return { ...animal, health_status: health, statut_sante: health, sante_status: health, etat_sante: health, impact_health_status: health, status: isRisk && !isSold ? health : animal.status, statut: isRisk && !isSold ? health : animal.statut };
}

function TabButton({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold border ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>{children}</button>;
}

function PromiseCard({ icon: Icon, title, text, status = 'ok', hint }) {
  const cls = status === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700';
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="flex items-start gap-3"><div className="rounded-xl bg-white/70 p-2"><Icon size={18} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="mt-1 text-sm">{text}</p>{hint ? <p className="mt-2 text-xs opacity-80">{hint}</p> : null}</div></div></div>;
}

function ProjectPromiseAlignment(props) {
  const salesOrders = arr(props.salesOrders || props.sales_orders);
  const payments = arr(props.payments);
  const stocks = arr(props.stocks || props.stock);
  const sante = arr(props.sante || props.vaccins);
  const documents = arr(props.documents);
  const taches = arr(props.taches || props.tasks);
  const alertes = arr(props.alertes || props.alertes_center);
  const auditLogs = arr(props.auditLogs || props.audit_logs);
  const animaux = arr(props.animaux);
  const lots = arr(props.lots || props.avicole);
  const cultures = arr(props.cultures);
  const businessEvents = arr(props.businessEvents || props.business_events);
  const receivable = salesOrders.reduce((sum, row) => sum + remaining(row), 0);
  const ca = salesOrders.reduce((sum, row) => sum + amount(row), 0);
  const paidTotal = payments.reduce((sum, row) => sum + amount(row), 0);
  const stockCritical = stocks.filter((row) => Number(row.seuil || 0) > 0 && Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
  const healthLate = sante.filter((row) => ['retard', 'en retard', 'a_faire', 'à faire'].some((term) => lower(row.statut || row.status).includes(term))).length;
  const openTasks = taches.filter((row) => !['termine', 'terminé', 'done', 'fermee', 'fermée'].includes(lower(row.status || row.statut))).length;
  const proofScore = documents.length + auditLogs.length + businessEvents.length;
  const bankReady = ca > 0 && documents.length > 0 && proofScore > 0;
  const cultureDepth = cultures.length && stocks.length ? 'warning' : cultures.length ? 'warning' : 'danger';
  return <div className="space-y-4">
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Promesses du projet</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">La ferme est-elle vraiment pilotée ?</h2><p className="mt-1 text-sm text-[#8a7456]">Cette page montre, simplement, ce que l’outil apporte déjà et ce qui doit encore être renforcé.</p></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <PromiseCard icon={TrendingUp} title="Pilotage du cash" status={ca > 0 || paidTotal > 0 ? 'ok' : 'warning'} text={`${fmtCurrency(ca)} de ventes suivies, ${fmtCurrency(paidTotal)} encaissés, ${fmtCurrency(receivable)} à récupérer.`} hint="Objectif : savoir quoi encaisser, quoi relancer et où part l’argent." />
      <PromiseCard icon={Package} title="Pertes visibles plus tôt" status={stockCritical || healthLate ? 'warning' : 'ok'} text={`${stockCritical} stock(s) faible(s), ${healthLate} soin(s) ou vaccin(s) à rattraper.`} hint="Objectif : voir les problèmes avant qu’ils deviennent des pertes." />
      <PromiseCard icon={HeartPulse} title="Mémoire sanitaire" status={sante.length ? 'ok' : 'warning'} text={`${sante.length} action(s) santé enregistrée(s), ${animaux.length} animal(aux), ${lots.length} lot(s) suivis.`} hint="Objectif : ne plus dépendre uniquement de la mémoire humaine." />
      <PromiseCard icon={ShieldCheck} title="Traçabilité" status={proofScore ? 'ok' : 'warning'} text={`${documents.length} document(s), ${businessEvents.length} action(s) importante(s), ${auditLogs.length} trace(s).`} hint="Objectif : pouvoir expliquer ce qui s’est passé, quand et pourquoi." />
      <PromiseCard icon={FileText} title="Dossier banque / partenaire" status={bankReady ? 'ok' : 'warning'} text={bankReady ? 'La base documentaire commence à soutenir le projet.' : 'Il faut encore renforcer les preuves, rapports et justificatifs.'} hint="Objectif : rendre la ferme crédible pour un financeur ou partenaire." />
      <PromiseCard icon={Wifi} title="Travail terrain" status={openTasks ? 'warning' : 'ok'} text={`${openTasks} tâche(s) encore à suivre, ${alertes.length} alerte(s) enregistrée(s).`} hint="Objectif : transformer les alertes en actions simples pour l’équipe." />
      <PromiseCard icon={AlertTriangle} title="Cultures et intrants" status={cultureDepth} text={`${cultures.length} culture(s) suivie(s). Le lien intrants/coûts doit encore être renforcé.`} hint="Objectif : savoir quelle parcelle rapporte, coûte ou fatigue la trésorerie." />
      <PromiseCard icon={CheckCircle2} title="Simplicité" status="ok" text="La vue simple met l’essentiel d’abord, la vue détaillée garde les contrôles avancés." hint="Objectif : éviter que l’outil devienne trop lourd à utiliser." />
    </div>
  </div>;
}

export default function ImpactBusinessShell(props) {
  const [tab, setTab] = useState('pilotage');
  const impactProps = useMemo(() => ({ ...props, animaux: arr(props.animaux).map(normalizeAnimalHealthForImpact) }), [props]);
  return <div className="space-y-6"><div className="flex flex-wrap gap-2"><TabButton active={tab === 'pilotage'} onClick={() => setTab('pilotage')}>Pilotage stratégique</TabButton><TabButton active={tab === 'domaines'} onClick={() => setTab('domaines')}>Domaines maîtrisés</TabButton><TabButton active={tab === 'promesses'} onClick={() => setTab('promesses')}>Promesses du projet</TabButton></div>{tab === 'pilotage' ? <ImpactBusinessStrategicV5 {...impactProps} embedded /> : null}{tab === 'domaines' ? <ImpactFarmValueBridgeV5 {...impactProps} /> : null}{tab === 'promesses' ? <ProjectPromiseAlignment {...impactProps} /> : null}</div>;
}
