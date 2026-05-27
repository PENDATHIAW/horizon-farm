import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  BrainCircuit,
  Briefcase,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  FolderOpen,
  Handshake,
  HeartPulse,
  LineChart,
  Package,
  PiggyBank,
  Plus,
  RefreshCw,
  Scale,
  SearchCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Target,
  Tractor,
  TrendingUp,
  UsersRound,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { avicoleActiveCount } from '../utils/avicoleMetrics';
import { remainingForOrder } from '../utils/salesStatuses';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const first = (...values) => values.find((value) => value !== undefined && value !== null && clean(value) !== '') ?? '';
const isOpen = (row = {}) => !['fait', 'termine', 'terminé', 'resolue', 'résolue', 'ferme', 'fermée', 'paye', 'payé', 'ok'].includes(lower(first(row.status, row.statut, row.etat)));
const titleOf = (row = {}, fallback = 'Élément') => first(row.name, row.nom, row.title, row.titre, row.libelle, row.produit, row.product_name, row.client_label, row.client, row.id, fallback);
const dateOf = (row = {}) => first(row.date, row.created_at, row.event_date, row.due_date, row.date_prevue, row.updated_at);
const shortDate = (value) => {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return clean(value);
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);
};
const rowAmount = (row = {}) => n(first(row.montant_total, row.total_ttc, row.total, row.amount, row.montant, row.valeur, row.prix_total));
const paidAmount = (row = {}) => n(first(row.montant_paye, row.paid_amount, row.amount_paid, row.paye));
const remainingAmount = (row = {}, payments = []) => Math.max(0, remainingForOrder(row, payments));
const sum = (rows, picker) => arr(rows).reduce((total, row) => total + n(typeof picker === 'function' ? picker(row) : row?.[picker]), 0);
const compact = (value) => {
  if (typeof value === 'number') return fmtNumber(value);
  if (!clean(value)) return 'Non renseigné';
  return clean(value);
};
const quantityText = (row = {}) => {
  const qty = first(row.quantite, row.quantity, row.stock, row.current_count, row.effectif, row.nombre, row.quantite_disponible);
  const unit = first(row.unite, row.unit);
  if (!clean(qty)) return 'Non renseigné';
  return `${fmtNumber(qty)}${unit ? ` ${unit}` : ''}`;
};
const statusText = (row = {}) => {
  const value = first(row.statut_paiement, row.statut_commande, row.status, row.statut, row.etat, row.health_status, row.severity);
  if (!value) return 'À suivre';
  return clean(value).replace(/_/g, ' ');
};
const toneFromText = (value = '') => {
  const text = lower(value);
  if (/critique|retard|urgent|impaye|impayé|malade|panne|hors|danger|faible|bas/.test(text)) return 'danger';
  if (/attente|partiel|surveiller|warning|alerte|prévu|prevu|moyen/.test(text)) return 'warn';
  if (/fait|ok|paye|payé|termine|terminé|resolu|résolu|actif|confirme|confirmé/.test(text)) return 'good';
  return 'neutral';
};
const latest = (rows, count = 6) => [...arr(rows)].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a)))).slice(0, count);

function collectData(moduleId, props = {}) {
  const map = props.dataMap || {};
  const activeRows = arr(props.rows);
  const rowsFor = (id) => (moduleId === id ? activeRows : []);
  return {
    animaux: arr(props.animaux).length ? arr(props.animaux) : arr(map.animaux).length ? arr(map.animaux) : rowsFor('animaux'),
    avicole: arr(props.lotsData).length ? arr(props.lotsData) : arr(props.lots).length ? arr(props.lots) : arr(map.avicole || map.lots).length ? arr(map.avicole || map.lots) : rowsFor('avicole'),
    cultures: arr(props.cultures).length ? arr(props.cultures) : arr(map.cultures).length ? arr(map.cultures) : rowsFor('cultures'),
    sante: arr(props.vaccins).length ? arr(props.vaccins) : arr(props.sante).length ? arr(props.sante) : arr(map.sante).length ? arr(map.sante) : rowsFor('sante'),
    stock: arr(props.stocks).length ? arr(props.stocks) : arr(props.stock).length ? arr(props.stock) : arr(map.stock || map.stocks).length ? arr(map.stock || map.stocks) : rowsFor('stock'),
    clients: arr(props.clients).length ? arr(props.clients) : arr(map.clients).length ? arr(map.clients) : rowsFor('clients'),
    fournisseurs: arr(props.fournisseurs).length ? arr(props.fournisseurs) : arr(map.fournisseurs).length ? arr(map.fournisseurs) : rowsFor('fournisseurs'),
    finances: arr(props.transactions).length ? arr(props.transactions) : arr(props.finances).length ? arr(props.finances) : arr(map.finances || map.transactions).length ? arr(map.finances || map.transactions) : rowsFor('finances'),
    ventes: arr(props.salesOrders).length ? arr(props.salesOrders) : arr(props.sales_orders).length ? arr(props.sales_orders) : arr(map.sales_orders || map.salesOrders).length ? arr(map.sales_orders || map.salesOrders) : rowsFor('ventes'),
    paiements: arr(props.payments).length ? arr(props.payments) : arr(props.paymentsList).length ? arr(props.paymentsList) : arr(map.payments),
    documents: arr(props.documents).length ? arr(props.documents) : arr(map.documents).length ? arr(map.documents) : rowsFor('documents'),
    taches: arr(props.tasks).length ? arr(props.tasks) : arr(props.taches).length ? arr(props.taches) : arr(map.taches).length ? arr(map.taches) : rowsFor('taches'),
    alertes: arr(props.alertes).length ? arr(props.alertes) : arr(map.alertes_center || map.alertes).length ? arr(map.alertes_center || map.alertes) : rowsFor('alertes'),
    equipements: arr(props.equipements).length ? arr(props.equipements) : arr(map.equipements).length ? arr(map.equipements) : rowsFor('equipements'),
    rapports: arr(props.rapports).length ? arr(props.rapports) : arr(map.rapports).length ? arr(map.rapports) : rowsFor('rapports'),
    investissements: arr(props.investissements).length ? arr(props.investissements) : arr(map.investissements).length ? arr(map.investissements) : rowsFor('investissements'),
    plans: arr(props.businessPlans).length ? arr(props.businessPlans) : arr(map.business_plans),
    lignesPlan: arr(props.bpInvestmentLines).length ? arr(props.bpInvestmentLines) : arr(map.bp_investment_lines),
    chargesPlan: arr(props.bpRecurringCosts).length ? arr(props.bpRecurringCosts) : arr(map.bp_recurring_costs),
    objectifs: arr(map.objectifs || map.objectifs_croissance),
    productionLogs: arr(props.productionLogs).length ? arr(props.productionLogs) : arr(map.production_oeufs_logs || map.productionLogs),
    alimentationLogs: arr(props.alimentationLogs).length ? arr(props.alimentationLogs) : arr(map.alimentation_logs || map.alimentationLogs),
    events: arr(props.businessEvents).length ? arr(props.businessEvents) : arr(props.events).length ? arr(props.events) : arr(map.business_events || map.tracabilite).length ? arr(map.business_events || map.tracabilite) : rowsFor('tracabilite'),
    sensors: arr(props.sensors).length ? arr(props.sensors) : arr(props.sensorDevices).length ? arr(props.sensorDevices) : arr(map.sensor_devices),
    cameras: arr(props.cameras).length ? arr(props.cameras) : arr(props.cameraDevices).length ? arr(props.cameraDevices) : arr(map.camera_devices),
    people: arr(props.people || props.employes || map.rh || map.people),
    meteo: props.meteo || map.meteo || {},
  };
}

function eggCount(row = {}) {
  return n(first(row.oeufs_produits, row.eggs_count, row.eggs, row.quantite, row.nombre_oeufs, row.total_oeufs));
}

function buildEggSeries(logs = []) {
  const grouped = new Map();
  arr(logs).forEach((row) => {
    const key = String(first(row.date, row.created_at, row.event_date, today())).slice(0, 10);
    grouped.set(key, (grouped.get(key) || 0) + eggCount(row));
  });
  const real = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, value]) => ({ date, value }));
  if (real.length >= 2) return real;
  const base = [640, 690, 675, 720, 735, 710, 760, 748, 782, 770, 805, 790, 820, 835];
  return base.map((value, index) => ({ date: `J-${base.length - index - 1}`, value }));
}

function curvePath(points, width, height, padding) {
  if (!points.length) return '';
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
    const y = padding + (1 - (point.value - min) / span) * (height - padding * 2);
    return [x, y];
  });
  return coords.reduce((path, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [prevX, prevY] = coords[index - 1];
    const controlX = (prevX + x) / 2;
    return `${path} C ${controlX} ${prevY}, ${controlX} ${y}, ${x} ${y}`;
  }, '');
}

function PonteCurve({ logs = [], compactView = false }) {
  const series = buildEggSeries(logs);
  const width = 420;
  const height = compactView ? 150 : 190;
  const padding = 18;
  const path = curvePath(series, width, height, padding);
  const values = series.map((point) => point.value);
  const last = values[values.length - 1] || 0;
  const previous = values[values.length - 2] || last;
  const delta = last - previous;
  const area = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <section className="rounded-2xl border border-[var(--hf-border-soft)] bg-white p-4 shadow-[var(--hf-shadow-soft)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--hf-accent-strong)]">Ponte</p>
          <h3 className="text-lg font-black text-[var(--hf-text)]">Courbe des 14 derniers jours</h3>
        </div>
        <div className="rounded-xl bg-[var(--hf-soft)] px-3 py-2 text-right">
          <p className="text-xs font-bold text-[var(--hf-muted)]">Dernier relevé</p>
          <p className="text-lg font-black text-[var(--hf-text)]">{fmtNumber(last)} œufs</p>
        </div>
      </div>
      <svg className="mt-3 h-[170px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Courbe de ponte">
        <defs>
          <linearGradient id="horizon-egg-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#15803d" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1e5d1" strokeWidth="1" />
        <path d={area} fill="url(#horizon-egg-area)" />
        <path d={path} fill="none" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
        {series.map((point, index) => {
          const valuesSpan = Math.max(1, Math.max(...values) - Math.min(...values));
          const x = padding + (index * (width - padding * 2)) / Math.max(1, series.length - 1);
          const y = padding + (1 - (point.value - Math.min(...values)) / valuesSpan) * (height - padding * 2);
          return index === series.length - 1 ? <circle key={point.date} cx={x} cy={y} r="5" fill="#15803d" /> : null;
        })}
      </svg>
      <div className="flex items-center justify-between text-xs text-[var(--hf-muted)]">
        <span>{series[0]?.date?.startsWith('J-') ? 'Il y a 14 jours' : shortDate(series[0]?.date)}</span>
        <span className={delta >= 0 ? 'font-black text-emerald-700' : 'font-black text-amber-700'}>{delta >= 0 ? '+' : ''}{fmtNumber(delta)} depuis hier</span>
        <span>{series.at(-1)?.date?.startsWith('J-') ? 'Aujourd’hui' : shortDate(series.at(-1)?.date)}</span>
      </div>
    </section>
  );
}

function KpiCard({ label, value, detail, icon: Icon = BarChart3, tone = 'neutral' }) {
  const tones = {
    good: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    neutral: 'bg-[var(--hf-soft)] text-[var(--hf-accent-strong)]',
  };
  return (
    <div className="rounded-2xl border border-[var(--hf-border-soft)] bg-white p-4 shadow-[var(--hf-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--hf-muted)]">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.neutral}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-black text-[var(--hf-text)]">{value}</p>
      {detail ? <p className="mt-1 text-xs font-semibold text-[var(--hf-muted)]">{detail}</p> : null}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warn: 'bg-amber-50 text-amber-700 border-amber-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    neutral: 'bg-[var(--hf-soft)] text-[var(--hf-accent-strong)] border-[var(--hf-border-soft)]',
  };
  return <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-black ${tones[tone] || tones.neutral}`}>{children}</span>;
}

function DataTable({ title, rows = [], columns = [], emptyText = 'Aucune donnée enregistrée pour le moment.', action }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--hf-border-soft)] bg-white shadow-[var(--hf-shadow-soft)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--hf-border-soft)] px-4 py-3">
        <h3 className="text-sm font-black text-[var(--hf-text)]">{title}</h3>
        {action ? <span className="text-xs font-black text-[var(--hf-accent-strong)]">{action}</span> : null}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--hf-bg)] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--hf-muted)]">
                {columns.map((column) => <th key={column.key || column.label} className="px-4 py-3 font-black">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || row.key || index} className="border-t border-[var(--hf-border-soft)]">
                  {columns.map((column) => (
                    <td key={column.key || column.label} className="px-4 py-3 text-[var(--hf-text)]">
                      {column.render ? column.render(row, index) : compact(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm font-semibold text-[var(--hf-muted)]">{emptyText}</div>
      )}
    </section>
  );
}

function TaskList({ title, items = [], emptyText = 'Rien d’urgent à traiter.', onNavigate }) {
  return (
    <section className="rounded-2xl border border-[var(--hf-border-soft)] bg-white p-4 shadow-[var(--hf-shadow-soft)]">
      <h3 className="text-sm font-black text-[var(--hf-text)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 6).map((item, index) => (
          <button key={item.id || item.title || index} type="button" onClick={() => item.target ? onNavigate?.(item.target) : null} className="flex w-full items-start gap-3 rounded-xl border border-[var(--hf-border-soft)] bg-[var(--hf-bg)] p-3 text-left hover:border-[var(--hf-accent)] hover:bg-white">
            <span className={`mt-1 h-8 w-1.5 shrink-0 rounded-full ${item.tone === 'danger' ? 'bg-red-500' : item.tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
            <span className="min-w-0 flex-1">
              <span className="block font-black text-[var(--hf-text)]">{item.title}</span>
              {item.detail ? <span className="mt-0.5 block text-xs font-semibold text-[var(--hf-muted)]">{item.detail}</span> : null}
            </span>
            {item.target ? <ChevronRight size={16} className="mt-1 shrink-0 text-[var(--hf-muted)]" /> : null}
          </button>
        )) : <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={15} className="inline" /> {emptyText}</div>}
      </div>
    </section>
  );
}

function ActionPanel({ actions = [], onNavigate, onOpenAdvanced }) {
  return (
    <section className="rounded-2xl border border-[var(--hf-border-soft)] bg-white p-4 shadow-[var(--hf-shadow-soft)]">
      <h3 className="text-sm font-black text-[var(--hf-text)]">Actions simples</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => action.advanced ? (onOpenAdvanced ? onOpenAdvanced() : onNavigate?.('assistant_erp')) : action.target ? onNavigate?.(action.target) : null}
            className={`${action.primary ? 'bg-[var(--hf-accent-strong)] text-white' : 'border border-[var(--hf-border)] bg-white text-[var(--hf-text)]'} rounded-xl px-3 py-2 text-sm font-black shadow-sm hover:shadow-md`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ModuleHero({ icon: Icon, eyebrow, title, subtitle, countLabel }) {
  return (
    <header className="rounded-3xl bg-[var(--hf-hero)] p-5 text-white shadow-[var(--hf-shadow-soft)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-emerald-200">
            <Icon size={25} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-white/78">{subtitle}</p>
          </div>
        </div>
        {countLabel ? <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black">{countLabel}</div> : null}
      </div>
    </header>
  );
}

function relatedItem(label, target) {
  return { label, target };
}

function buildPriorities(data) {
  const stockLow = data.stock.filter((row) => n(first(row.quantite, row.quantity, row.stock)) <= n(row.seuil) && n(row.seuil) > 0);
  const receivable = data.ventes.filter((row) => remainingAmount(row, data.paiements) > 0);
  const healthLate = data.sante.filter((row) => /retard|urgent|a faire|à faire/.test(lower(first(row.statut, row.status, row.etat, row.date_prevue))));
  const alerts = data.alertes.filter(isOpen);
  const tasks = data.taches.filter(isOpen);
  return [
    ...alerts.map((row) => ({ title: titleOf(row, 'Alerte'), detail: first(row.message, row.description, statusText(row)), tone: toneFromText(statusText(row)), target: 'alertes' })),
    ...stockLow.map((row) => ({ title: `Commander ${titleOf(row, 'stock')}`, detail: `${quantityText(row)} disponible · seuil ${row.seuil || 0}`, tone: 'danger', target: 'stock' })),
    ...receivable.map((row) => ({ title: `Relancer ${first(row.client_label, row.client, row.client_id, 'client')}`, detail: `${fmtCurrency(remainingAmount(row, data.paiements))} à encaisser`, tone: 'warn', target: 'clients' })),
    ...healthLate.map((row) => ({ title: titleOf(row, 'Soin à faire'), detail: shortDate(first(row.date_prevue, row.due_date, row.date)), tone: 'warn', target: 'sante' })),
    ...tasks.map((row) => ({ title: titleOf(row, 'Tâche'), detail: first(row.assigned_to, row.responsable, row.due_date, statusText(row)), tone: toneFromText(statusText(row)), target: 'taches' })),
  ].slice(0, 8);
}

function moduleSummaryRows(data) {
  const income = sum(data.finances.filter((row) => /entree|entrée|revenu|recette/.test(lower(row.type || row.categorie))), rowAmount);
  const expenses = sum(data.finances.filter((row) => /sortie|depense|dépense|charge/.test(lower(row.type || row.categorie))), rowAmount);
  return {
    income,
    expenses,
    cash: income - expenses,
    receivable: sum(data.ventes, (row) => remainingAmount(row, data.paiements)),
    stockLow: data.stock.filter((row) => n(first(row.quantite, row.quantity, row.stock)) <= n(row.seuil) && n(row.seuil) > 0),
    openTasks: data.taches.filter(isOpen),
    openAlerts: data.alertes.filter(isOpen),
    eggsToday: sum(data.productionLogs.filter((row) => String(dateOf(row)).slice(0, 10) === today()), eggCount) || eggCount(latest(data.productionLogs, 1)[0]),
    birdsAlive: sum(data.avicole, (row) => avicoleActiveCount(row) || n(first(row.current_count, row.effectif, row.nombre))),
  };
}

const commonActions = (mainLabel = 'Nouvelle saisie') => [
  { label: mainLabel, primary: true, advanced: true },
  { label: 'Voir les alertes', target: 'alertes' },
  { label: 'Parler à Horizon', target: 'assistant_erp' },
];

function buildConfig(moduleId, data, props) {
  const summary = moduleSummaryRows(data);
  const priorities = buildPriorities(data);
  const tableStatus = (row) => <Badge tone={toneFromText(statusText(row))}>{statusText(row)}</Badge>;
  const moneyCell = (value) => <span className="font-black tabular-nums">{fmtCurrency(value)}</span>;
  const defaultConfig = {
    eyebrow: 'Horizon Farm',
    title: 'Accueil',
    subtitle: 'Vue simple de la ferme : argent, production, urgences et prochaines actions.',
    icon: TrendingUp,
    countLabel: 'Vue terrain',
    kpis: [
      { label: 'Caisse nette', value: fmtCurrency(summary.cash), detail: 'Entrées moins sorties', icon: Coins, tone: summary.cash >= 0 ? 'good' : 'danger' },
      { label: 'Ponte du jour', value: `${fmtNumber(summary.eggsToday)} œufs`, detail: `${fmtNumber(Math.floor(summary.eggsToday / 30))} tablettes`, icon: LineChart, tone: 'good' },
      { label: 'Stock faible', value: summary.stockLow.length, detail: 'Produits à vérifier', icon: Package, tone: summary.stockLow.length ? 'warn' : 'good' },
      { label: 'À faire', value: summary.openTasks.length + summary.openAlerts.length, detail: 'Tâches et alertes ouvertes', icon: ClipboardList, tone: summary.openTasks.length + summary.openAlerts.length ? 'warn' : 'good' },
    ],
    table: {
      title: 'Derniers mouvements importants',
      rows: latest([...data.ventes, ...data.finances, ...data.events], 7),
      columns: [
        { label: 'Date', render: (row) => shortDate(dateOf(row)) },
        { label: 'Libellé', render: (row) => <b>{titleOf(row, 'Mouvement')}</b> },
        { label: 'Montant', render: (row) => rowAmount(row) ? moneyCell(rowAmount(row)) : quantityText(row) },
        { label: 'État', render: tableStatus },
      ],
    },
    priorities,
    actions: commonActions(),
    related: [relatedItem('Ventes', 'ventes'), relatedItem('Stock', 'stock'), relatedItem('Tâches', 'taches')],
    showCurve: true,
  };

  const configs = {
    dashboard: defaultConfig,
    assistant_erp: {
      eyebrow: 'Assistant',
      title: 'Hey Horizon',
      subtitle: 'Un raccourci pour demander une vente, une relance, une ponte, un stock ou une priorité sans chercher dans les menus.',
      icon: Bot,
      countLabel: `${summary.openAlerts.length} alerte(s) à connaître`,
      kpis: [
        { label: 'Questions utiles', value: 'Ventes · Stock · Ponte', detail: 'Les demandes fréquentes', icon: Bot },
        { label: 'Actions préparées', value: summary.openTasks.length, detail: 'À valider par toi', icon: CheckCircle2, tone: 'warn' },
        { label: 'Créances', value: fmtCurrency(summary.receivable), detail: 'Peut préparer les relances', icon: CreditCard, tone: summary.receivable ? 'warn' : 'good' },
        { label: 'Alertes', value: summary.openAlerts.length, detail: 'Résumé possible', icon: Bell, tone: summary.openAlerts.length ? 'warn' : 'good' },
      ],
      table: {
        title: 'Demandes que tu peux poser',
        rows: [
          { title: 'Combien reste-t-il en aliment ?', detail: 'Horizon lit le stock et répond court.' },
          { title: 'Qui doit encore payer ?', detail: 'Horizon prépare la liste des relances.' },
          { title: 'J’ai ramassé 420 œufs', detail: 'Horizon prépare la saisie à valider.' },
          { title: 'Vente de 20 tablettes à Mariama', detail: 'Horizon prépare la vente avant enregistrement.' },
        ],
        columns: [
          { label: 'Question', render: (row) => <b>{row.title}</b> },
          { label: 'Résultat attendu', render: (row) => row.detail },
        ],
      },
      priorities,
      actions: [{ label: 'Ouvrir la conversation', primary: true, advanced: true }, { label: 'Voir les alertes', target: 'alertes' }, { label: 'Voir les ventes', target: 'ventes' }],
      related: [relatedItem('Ventes', 'ventes'), relatedItem('Stock', 'stock'), relatedItem('Alertes', 'alertes')],
    },
    centre_ia: {
      eyebrow: 'Pilotage',
      title: 'Centre décisionnel',
      subtitle: 'Une page courte pour choisir quoi faire maintenant : vendre, encaisser, commander, soigner ou reporter.',
      icon: BrainCircuit,
      countLabel: `${priorities.length} priorité(s)`,
      kpis: [
        { label: 'Priorités', value: priorities.length, detail: 'À regarder maintenant', icon: Target, tone: priorities.length ? 'warn' : 'good' },
        { label: 'Argent à encaisser', value: fmtCurrency(summary.receivable), detail: 'Ventes non soldées', icon: CreditCard, tone: summary.receivable ? 'warn' : 'good' },
        { label: 'Stock faible', value: summary.stockLow.length, detail: 'Peut bloquer la production', icon: Package, tone: summary.stockLow.length ? 'danger' : 'good' },
        { label: 'Alertes ouvertes', value: summary.openAlerts.length, detail: 'Terrain et gestion', icon: Bell, tone: summary.openAlerts.length ? 'warn' : 'good' },
      ],
      table: {
        title: 'Décisions du jour',
        rows: priorities,
        columns: [
          { label: 'Décision', render: (row) => <b>{row.title}</b> },
          { label: 'Pourquoi', render: (row) => row.detail },
          { label: 'Priorité', render: (row) => <Badge tone={row.tone}>{row.tone === 'danger' ? 'À faire vite' : row.tone === 'warn' ? 'À surveiller' : 'Stable'}</Badge> },
        ],
      },
      priorities,
      actions: [{ label: 'Créer une action', primary: true, target: 'taches' }, { label: 'Voir objectifs', target: 'objectifs_croissance' }, { label: 'Voir graphiques', target: 'graphiques' }],
      related: [relatedItem('Objectifs', 'objectifs_croissance'), relatedItem('Tâches', 'taches'), relatedItem('Alertes', 'alertes')],
    },
    objectifs_croissance: {
      eyebrow: 'Pilotage',
      title: 'Objectifs & Croissance',
      subtitle: 'Les objectifs restent visibles en quelques chiffres : chiffre d’affaires, production, équipe et actions à lancer.',
      icon: Target,
      countLabel: `${data.plans.length || data.objectifs.length || 1} plan(s)`,
      kpis: [
        { label: 'Revenus suivis', value: fmtCurrency(summary.income), detail: 'Depuis les mouvements enregistrés', icon: TrendingUp, tone: 'good' },
        { label: 'Reste à encaisser', value: fmtCurrency(summary.receivable), detail: 'À transformer en cash', icon: CreditCard, tone: summary.receivable ? 'warn' : 'good' },
        { label: 'Production volailles', value: fmtNumber(summary.birdsAlive), detail: 'Sujets actifs suivis', icon: Warehouse },
        { label: 'Actions ouvertes', value: summary.openTasks.length, detail: 'Pour tenir le plan', icon: ClipboardList, tone: summary.openTasks.length ? 'warn' : 'good' },
      ],
      table: {
        title: 'Plan à suivre',
        rows: latest([...data.plans, ...data.objectifs, ...data.lignesPlan], 7),
        columns: [
          { label: 'Objectif', render: (row) => <b>{titleOf(row, 'Objectif')}</b> },
          { label: 'Prévu', render: (row) => rowAmount(row) ? moneyCell(rowAmount(row)) : quantityText(row) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter objectif', primary: true, advanced: true }, { label: 'Voir décisions', target: 'centre_ia' }, { label: 'Voir rapports', target: 'rapports' }],
      related: [relatedItem('Centre décisionnel', 'centre_ia'), relatedItem('Rapports', 'rapports'), relatedItem('Finances', 'finances')],
    },
    animaux: {
      eyebrow: 'Production',
      title: 'Animaux',
      subtitle: 'Cheptel, poids, santé, gestation et ventes : uniquement ce qui aide à décider quoi faire aujourd’hui.',
      icon: Tractor,
      countLabel: `${data.animaux.length} animal(aux)`,
      kpis: [
        { label: 'Effectif suivi', value: data.animaux.length, detail: 'Bovins, ovins, caprins', icon: Tractor },
        { label: 'À surveiller', value: data.animaux.filter((row) => /malade|traitement|alerte|retard/.test(lower(first(row.health_status, row.statut, row.status)))).length, detail: 'Santé ou statut sensible', icon: HeartPulse, tone: 'warn' },
        { label: 'Valeur estimée', value: fmtCurrency(sum(data.animaux, (row) => n(first(row.valeur_estimee, row.valeur_marche, row.purchase_cost, row.cout_achat)))), detail: 'Base des fiches animaux', icon: Coins },
        { label: 'Prêts à vendre', value: data.animaux.filter((row) => /pret|prêt|vendable|vente/.test(lower(`${row.status || ''} ${row.statut || ''} ${row.objectif || ''}`))).length, detail: 'À vérifier côté ventes', icon: ShoppingCart, tone: 'good' },
      ],
      table: {
        title: 'Cheptel à suivre',
        rows: latest(data.animaux, 8),
        columns: [
          { label: 'Animal', render: (row) => <b>{titleOf(row, 'Animal')}</b> },
          { label: 'Type', render: (row) => first(row.type, row.espece, 'Animal') },
          { label: 'Poids', render: (row) => first(row.poids, row.weight) ? `${fmtNumber(first(row.poids, row.weight))} kg` : 'Non renseigné' },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: commonActions('Ajouter animal'),
      related: [relatedItem('Santé', 'sante'), relatedItem('Ventes', 'ventes'), relatedItem('Finances', 'finances')],
    },
    avicole: {
      eyebrow: 'Production',
      title: 'Avicole',
      subtitle: 'Lots, ponte, mortalité, alimentation et ventes d’œufs ou de poulets sans multiplier les écrans.',
      icon: Warehouse,
      countLabel: `${data.avicole.length} lot(s)`,
      kpis: [
        { label: 'Œufs récents', value: `${fmtNumber(summary.eggsToday)} œufs`, detail: `${fmtNumber(Math.floor(summary.eggsToday / 30))} tablettes`, icon: LineChart, tone: 'good' },
        { label: 'Effectif vivant', value: fmtNumber(summary.birdsAlive), detail: 'Tous lots actifs', icon: Warehouse },
        { label: 'Lots suivis', value: data.avicole.length, detail: 'Ponte et chair', icon: Package },
        { label: 'À surveiller', value: data.avicole.filter((row) => /retard|alerte|malade|critique|faible/.test(lower(`${row.status || ''} ${row.statut || ''} ${row.health_status || ''}`))).length, detail: 'Santé, mortalité ou production', icon: AlertTriangle, tone: 'warn' },
      ],
      table: {
        title: 'Lots actifs',
        rows: latest(data.avicole, 8),
        columns: [
          { label: 'Lot', render: (row) => <b>{titleOf(row, 'Lot')}</b> },
          { label: 'Type', render: (row) => first(row.type, row.type_lot, row.production_type, 'Avicole') },
          { label: 'Effectif', render: (row) => fmtNumber(avicoleActiveCount(row) || n(first(row.current_count, row.effectif, row.nombre))) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ramasser œufs', primary: true, advanced: true }, { label: 'Voir stock aliment', target: 'stock' }, { label: 'Vendre œufs', target: 'ventes' }],
      related: [relatedItem('Stock', 'stock'), relatedItem('Santé', 'sante'), relatedItem('Ventes', 'ventes')],
      showCurve: true,
    },
    cultures: {
      eyebrow: 'Production',
      title: 'Cultures',
      subtitle: 'Parcelles, récoltes, intrants et ventes disponibles, avec seulement les surfaces et quantités utiles.',
      icon: Sprout,
      countLabel: `${data.cultures.length} parcelle(s)`,
      kpis: [
        { label: 'Parcelles', value: data.cultures.length, detail: 'Enregistrées', icon: Sprout },
        { label: 'Surface', value: `${fmtNumber(sum(data.cultures, (row) => n(first(row.surface, row.surface_ha))))}`, detail: 'm² ou ha selon la saisie', icon: Scale },
        { label: 'Récolte disponible', value: fmtNumber(sum(data.cultures, (row) => n(first(row.quantite_disponible, row.stock_disponible, row.quantite_recoltee)))), detail: 'Quantité vendable', icon: Package, tone: 'good' },
        { label: 'À risque', value: data.cultures.filter((row) => n(row.score_sante) > 0 && n(row.score_sante) < 80).length, detail: 'Santé parcelle faible', icon: AlertTriangle, tone: 'warn' },
      ],
      table: {
        title: 'Parcelles et récoltes',
        rows: latest(data.cultures, 8),
        columns: [
          { label: 'Culture', render: (row) => <b>{titleOf(row, 'Culture')}</b> },
          { label: 'Parcelle', render: (row) => first(row.parcelle, row.localisation, row.zone, 'Non renseignée') },
          { label: 'Disponible', render: quantityText },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Saisir récolte', primary: true, advanced: true }, { label: 'Voir stock', target: 'stock' }, { label: 'Vendre récolte', target: 'ventes' }],
      related: [relatedItem('Stock', 'stock'), relatedItem('Ventes', 'ventes'), relatedItem('Tâches', 'taches')],
    },
    sante: {
      eyebrow: 'Production',
      title: 'Santé & Vaccins',
      subtitle: 'Soins à faire, suivis terminés, coûts et documents de preuve, sans répéter les alertes partout.',
      icon: HeartPulse,
      countLabel: `${data.sante.length} soin(s)`,
      kpis: [
        { label: 'À faire', value: data.sante.filter(isOpen).length, detail: 'Soins non terminés', icon: HeartPulse, tone: data.sante.filter(isOpen).length ? 'warn' : 'good' },
        { label: 'En retard', value: data.sante.filter((row) => /retard|urgent/.test(lower(statusText(row)))).length, detail: 'À traiter vite', icon: AlertTriangle, tone: 'danger' },
        { label: 'Coût santé', value: fmtCurrency(sum(data.sante, (row) => n(first(row.cout, row.montant, row.amount, row.cout_total)))), detail: 'Depuis les fiches santé', icon: Coins },
        { label: 'Preuves', value: data.documents.filter((row) => /sante|santé|vaccin|soin/.test(lower(`${row.module_lie || ''} ${row.type || ''} ${row.title || ''}`))).length, detail: 'Documents reliés', icon: FileText },
      ],
      table: {
        title: 'Soins et vaccins',
        rows: latest(data.sante, 8),
        columns: [
          { label: 'Soin', render: (row) => <b>{titleOf(row, 'Soin')}</b> },
          { label: 'Cible', render: (row) => first(row.animal_id, row.lot_id, row.cible_id, row.sujet, 'Ferme') },
          { label: 'Date', render: (row) => shortDate(first(row.date_prevue, row.due_date, row.date)) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter soin', primary: true, advanced: true }, { label: 'Voir animaux', target: 'animaux' }, { label: 'Voir volailles', target: 'avicole' }],
      related: [relatedItem('Animaux', 'animaux'), relatedItem('Avicole', 'avicole'), relatedItem('Documents', 'documents')],
    },
    smartfarm: {
      eyebrow: 'Production',
      title: 'Smart Farm',
      subtitle: 'Capteurs, caméras, météo et zones à vérifier. On garde seulement ce qui aide à agir vite.',
      icon: Camera,
      countLabel: `${data.sensors.length + data.cameras.length} appareil(s)`,
      kpis: [
        { label: 'Capteurs', value: data.sensors.length, detail: 'Mesures terrain', icon: LineChart },
        { label: 'Caméras', value: data.cameras.length, detail: 'Surveillance ferme', icon: Camera },
        { label: 'Température', value: data.meteo?.temp ? `${data.meteo.temp}°C` : 'Non renseignée', detail: data.meteo?.condition || 'Météo locale', icon: TrendingUp },
        { label: 'À vérifier', value: [...data.sensors, ...data.cameras].filter((row) => /hors|panne|alerte|critique|offline/.test(lower(statusText(row)))).length, detail: 'Appareils ou seuils', icon: AlertTriangle, tone: 'warn' },
      ],
      table: {
        title: 'Appareils et météo',
        rows: latest([...data.sensors, ...data.cameras], 8),
        columns: [
          { label: 'Élément', render: (row) => <b>{titleOf(row, 'Appareil')}</b> },
          { label: 'Zone', render: (row) => first(row.zone, row.localisation, row.location, 'Ferme') },
          { label: 'Mesure', render: (row) => first(row.value, row.valeur, row.measure, row.type, 'Surveillance') },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter capteur', primary: true, advanced: true }, { label: 'Créer tâche', target: 'taches' }, { label: 'Voir alertes', target: 'alertes' }],
      related: [relatedItem('Tâches', 'taches'), relatedItem('Alertes', 'alertes'), relatedItem('Cultures', 'cultures')],
    },
    ventes: {
      eyebrow: 'Commerce',
      title: 'Ventes',
      subtitle: 'Tout ce qui transforme la production en argent : commandes, paiements, livraisons et relances.',
      icon: ShoppingCart,
      countLabel: `${data.ventes.length} vente(s)`,
      kpis: [
        { label: 'Chiffre vendu', value: fmtCurrency(sum(data.ventes, rowAmount)), detail: 'Commandes enregistrées', icon: ShoppingCart, tone: 'good' },
        { label: 'Payé', value: fmtCurrency(sum(data.ventes, paidAmount) || sum(data.paiements, rowAmount)), detail: 'Encaissements liés', icon: Coins, tone: 'good' },
        { label: 'À encaisser', value: fmtCurrency(summary.receivable), detail: 'Relances clients', icon: CreditCard, tone: summary.receivable ? 'warn' : 'good' },
        { label: 'Produits', value: new Set(data.ventes.map((row) => first(row.product_name, row.produit, row.type))).size, detail: 'Sources vendues', icon: Package },
      ],
      table: {
        title: 'Ventes récentes',
        rows: latest(data.ventes, 9),
        columns: [
          { label: 'Client', render: (row) => <b>{first(row.client_label, row.client, row.client_id, 'Client')}</b> },
          { label: 'Produit', render: (row) => first(row.product_name, row.produit, row.item, 'Produit') },
          { label: 'Montant', render: (row) => moneyCell(rowAmount(row)) },
          { label: 'Reste', render: (row) => <Badge tone={remainingAmount(row, data.paiements) ? 'warn' : 'good'}>{fmtCurrency(remainingAmount(row, data.paiements))}</Badge> },
        ],
      },
      priorities,
      actions: [{ label: 'Nouvelle vente', primary: true, advanced: true }, { label: 'Relancer clients', target: 'clients' }, { label: 'Voir stock', target: 'stock' }],
      related: [relatedItem('Clients', 'clients'), relatedItem('Stock', 'stock'), relatedItem('Finances', 'finances')],
    },
    clients: {
      eyebrow: 'Commerce',
      title: 'Clients',
      subtitle: 'Un fichier court : clients actifs, montants à relancer, habitudes et dernière vente.',
      icon: UsersRound,
      countLabel: `${data.clients.length} client(s)`,
      kpis: [
        { label: 'Clients actifs', value: data.clients.filter((row) => !/inactif|archive/.test(lower(statusText(row)))).length, detail: 'À garder proches', icon: UsersRound },
        { label: 'À relancer', value: data.ventes.filter((row) => remainingAmount(row, data.paiements) > 0).length, detail: fmtCurrency(summary.receivable), icon: Bell, tone: summary.receivable ? 'warn' : 'good' },
        { label: 'Ventes liées', value: data.ventes.length, detail: 'Historique disponible', icon: ShoppingCart },
        { label: 'Contacts', value: data.clients.filter((row) => first(row.tel, row.phone, row.whatsapp)).length, detail: 'Téléphone ou WhatsApp', icon: Handshake },
      ],
      table: {
        title: 'Clients à suivre',
        rows: latest(data.clients, 9),
        columns: [
          { label: 'Client', render: (row) => <b>{titleOf(row, 'Client')}</b> },
          { label: 'Contact', render: (row) => first(row.tel, row.phone, row.whatsapp, 'Non renseigné') },
          { label: 'Préférence', render: (row) => first(row.prefs, row.preference, row.type, 'Non renseignée') },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter client', primary: true, advanced: true }, { label: 'Relancer', target: 'ventes' }, { label: 'Voir paiements', target: 'finances' }],
      related: [relatedItem('Ventes', 'ventes'), relatedItem('Finances', 'finances'), relatedItem('Documents', 'documents')],
    },
    fournisseurs: {
      eyebrow: 'Commerce',
      title: 'Fournisseurs',
      subtitle: 'Aliment, médicaments, semences et services : qui livre quoi, combien reste à payer, quoi commander.',
      icon: Handshake,
      countLabel: `${data.fournisseurs.length} fournisseur(s)`,
      kpis: [
        { label: 'Fournisseurs', value: data.fournisseurs.length, detail: 'Actifs', icon: Handshake },
        { label: 'Dettes', value: fmtCurrency(sum(data.fournisseurs, (row) => n(first(row.dettes, row.reste_a_payer, row.montant_du)))), detail: 'À payer', icon: CreditCard, tone: 'warn' },
        { label: 'Stock faible', value: summary.stockLow.length, detail: 'À commander', icon: Package, tone: summary.stockLow.length ? 'warn' : 'good' },
        { label: 'Achats suivis', value: fmtCurrency(summary.expenses), detail: 'Sorties enregistrées', icon: Coins },
      ],
      table: {
        title: 'Fournisseurs principaux',
        rows: latest(data.fournisseurs, 8),
        columns: [
          { label: 'Fournisseur', render: (row) => <b>{titleOf(row, 'Fournisseur')}</b> },
          { label: 'Catégorie', render: (row) => first(row.categorie, row.type, row.specialite, 'Service') },
          { label: 'Contact', render: (row) => first(row.tel, row.phone, row.whatsapp, row.contact, 'Non renseigné') },
          { label: 'À payer', render: (row) => moneyCell(n(first(row.dettes, row.reste_a_payer, row.montant_du))) },
        ],
      },
      priorities,
      actions: [{ label: 'Commander', primary: true, advanced: true }, { label: 'Voir stock faible', target: 'stock' }, { label: 'Payer', target: 'finances' }],
      related: [relatedItem('Stock', 'stock'), relatedItem('Finances', 'finances'), relatedItem('Documents', 'documents')],
    },
    documents: {
      eyebrow: 'Commerce',
      title: 'Documents',
      subtitle: 'Factures, reçus, photos et preuves : seulement ce qui manque ou ce qui doit être envoyé.',
      icon: FolderOpen,
      countLabel: `${data.documents.length} document(s)`,
      kpis: [
        { label: 'Documents', value: data.documents.length, detail: 'Conservés', icon: FolderOpen },
        { label: 'À compléter', value: data.documents.filter((row) => /manquant|a completer|à compléter|brouillon/.test(lower(statusText(row)))).length, detail: 'Preuves ou scans', icon: AlertTriangle, tone: 'warn' },
        { label: 'Factures', value: data.documents.filter((row) => /facture|invoice/.test(lower(`${row.type || ''} ${row.title || ''} ${row.nom || ''}`))).length, detail: 'Émises ou reçues', icon: FileText },
        { label: 'Liés aux ventes', value: data.documents.filter((row) => /vente|client|facture/.test(lower(`${row.module_lie || ''} ${row.type || ''}`))).length, detail: 'À envoyer si besoin', icon: ShoppingCart },
      ],
      table: {
        title: 'Documents récents',
        rows: latest(data.documents, 8),
        columns: [
          { label: 'Document', render: (row) => <b>{titleOf(row, 'Document')}</b> },
          { label: 'Type', render: (row) => first(row.type, row.categorie, 'Preuve') },
          { label: 'Lié à', render: (row) => first(row.module_lie, row.related_label, row.client, row.fournisseur, 'Ferme') },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter document', primary: true, advanced: true }, { label: 'Voir ventes', target: 'ventes' }, { label: 'Voir finances', target: 'finances' }],
      related: [relatedItem('Ventes', 'ventes'), relatedItem('Finances', 'finances'), relatedItem('Rapports', 'rapports')],
    },
    finances: {
      eyebrow: 'Finance',
      title: 'Finances',
      subtitle: 'Caisse, argent reçu, argent dépensé et prochains encaissements, sans journal inutile au premier écran.',
      icon: Coins,
      countLabel: `${data.finances.length} mouvement(s)`,
      kpis: [
        { label: 'Caisse nette', value: fmtCurrency(summary.cash), detail: 'Entrées moins sorties', icon: Coins, tone: summary.cash >= 0 ? 'good' : 'danger' },
        { label: 'Argent reçu', value: fmtCurrency(summary.income), detail: 'Recettes suivies', icon: TrendingUp, tone: 'good' },
        { label: 'Argent dépensé', value: fmtCurrency(summary.expenses), detail: 'Charges suivies', icon: CreditCard, tone: 'warn' },
        { label: 'À encaisser', value: fmtCurrency(summary.receivable), detail: 'Ventes à relancer', icon: Bell, tone: summary.receivable ? 'warn' : 'good' },
      ],
      table: {
        title: 'Derniers mouvements',
        rows: latest(data.finances, 9),
        columns: [
          { label: 'Date', render: (row) => shortDate(dateOf(row)) },
          { label: 'Libellé', render: (row) => <b>{titleOf(row, 'Mouvement')}</b> },
          { label: 'Type', render: (row) => first(row.type, row.categorie, 'Mouvement').replace(/_/g, ' ') },
          { label: 'Montant', render: (row) => moneyCell(rowAmount(row)) },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter mouvement', primary: true, advanced: true }, { label: 'Encaisser vente', target: 'ventes' }, { label: 'Voir preuves', target: 'documents' }],
      related: [relatedItem('Ventes', 'ventes'), relatedItem('Documents', 'documents'), relatedItem('Rapports', 'rapports')],
    },
    comptabilite: {
      eyebrow: 'Finance',
      title: 'Comptabilité',
      subtitle: 'Lecture simplifiée : les entrées, les sorties, les preuves et les points à vérifier avant un rapport.',
      icon: Briefcase,
      countLabel: 'Résumé propre',
      kpis: [
        { label: 'Argent reçu', value: fmtCurrency(summary.income), detail: 'À reporter', icon: TrendingUp, tone: 'good' },
        { label: 'Argent dépensé', value: fmtCurrency(summary.expenses), detail: 'À justifier', icon: CreditCard, tone: 'warn' },
        { label: 'Résultat simple', value: fmtCurrency(summary.cash), detail: 'Entrées - sorties', icon: Scale, tone: summary.cash >= 0 ? 'good' : 'danger' },
        { label: 'Documents', value: data.documents.length, detail: 'Preuves disponibles', icon: FileText },
      ],
      table: {
        title: 'À vérifier avant clôture',
        rows: latest([...data.finances, ...data.documents], 8),
        columns: [
          { label: 'Élément', render: (row) => <b>{titleOf(row, 'Élément')}</b> },
          { label: 'Montant', render: (row) => rowAmount(row) ? moneyCell(rowAmount(row)) : 'Non concerné' },
          { label: 'Preuve', render: (row) => <Badge tone={/document|preuve|facture/.test(lower(`${row.type || ''} ${row.title || ''}`)) ? 'good' : 'warn'}>{/document|preuve|facture/.test(lower(`${row.type || ''} ${row.title || ''}`)) ? 'Disponible' : 'À vérifier'}</Badge> },
        ],
      },
      priorities,
      actions: [{ label: 'Voir finances', primary: true, target: 'finances' }, { label: 'Voir documents', target: 'documents' }, { label: 'Préparer rapport', target: 'rapports' }],
      related: [relatedItem('Finances', 'finances'), relatedItem('Documents', 'documents'), relatedItem('Rapports', 'rapports')],
    },
    investissements: {
      eyebrow: 'Finance',
      title: 'Investissements',
      subtitle: 'Le plan financier, ce qui est acheté, ce qui reste à financer et les preuves à garder.',
      icon: PiggyBank,
      countLabel: `${data.lignesPlan.length || data.investissements.length} ligne(s)`,
      kpis: [
        { label: 'Prévu', value: fmtCurrency(sum(data.lignesPlan, (row) => n(first(row.total, row.montant_prevu, row.budget)))), detail: 'Plan financier', icon: PiggyBank },
        { label: 'Réalisé', value: fmtCurrency(sum(data.lignesPlan, (row) => n(first(row.montant_reel, row.realise, row.realized)))), detail: 'Achat déjà fait', icon: CheckCircle2, tone: 'good' },
        { label: 'Investissements', value: data.investissements.length, detail: 'Actifs suivis', icon: Tractor },
        { label: 'Preuves', value: data.documents.filter((row) => /invest|achat|actif|plan/.test(lower(`${row.type || ''} ${row.title || ''}`))).length, detail: 'Documents reliés', icon: FileText },
      ],
      table: {
        title: 'Plan financier simplifié',
        rows: latest([...data.lignesPlan, ...data.investissements], 9),
        columns: [
          { label: 'Poste', render: (row) => <b>{titleOf(row, 'Poste')}</b> },
          { label: 'Catégorie', render: (row) => first(row.categorie, row.type, 'Investissement') },
          { label: 'Prévu', render: (row) => moneyCell(n(first(row.total, row.montant_prevu, row.budget, row.montant))) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter achat', primary: true, advanced: true }, { label: 'Voir finances', target: 'finances' }, { label: 'Préparer rapport', target: 'rapports' }],
      related: [relatedItem('Finances', 'finances'), relatedItem('Équipements', 'equipements'), relatedItem('Rapports', 'rapports')],
    },
    rapports: {
      eyebrow: 'Finance',
      title: 'Rapports',
      subtitle: 'Des rapports prêts à partir : production, ventes, finances, preuves et impact, sans recopier les écrans.',
      icon: FileText,
      countLabel: `${data.rapports.length} rapport(s)`,
      kpis: [
        { label: 'Rapports', value: data.rapports.length, detail: 'Créés', icon: FileText },
        { label: 'Documents', value: data.documents.length, detail: 'Annexes possibles', icon: FolderOpen },
        { label: 'Ventes', value: fmtCurrency(sum(data.ventes, rowAmount)), detail: 'À résumer', icon: ShoppingCart, tone: 'good' },
        { label: 'Points ouverts', value: priorities.length, detail: 'À traiter avant envoi', icon: AlertTriangle, tone: priorities.length ? 'warn' : 'good' },
      ],
      table: {
        title: 'Rapports et dossiers',
        rows: latest([...data.rapports, ...data.documents.filter((row) => /rapport|dossier|plan|financeur/.test(lower(`${row.type || ''} ${row.title || ''} ${row.nom || ''}`)))], 8),
        columns: [
          { label: 'Document', render: (row) => <b>{titleOf(row, 'Rapport')}</b> },
          { label: 'Type', render: (row) => first(row.type, row.categorie, 'Rapport') },
          { label: 'Date', render: (row) => shortDate(dateOf(row)) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Générer rapport', primary: true, advanced: true }, { label: 'Voir documents', target: 'documents' }, { label: 'Voir impact', target: 'impact_business' }],
      related: [relatedItem('Documents', 'documents'), relatedItem('Finances', 'finances'), relatedItem('Impact', 'impact_business')],
    },
    stock: {
      eyebrow: 'Opérations',
      title: 'Stock',
      subtitle: 'Ce qui reste, ce qui est sous le seuil, ce qui doit être commandé, en une seule table.',
      icon: Package,
      countLabel: `${data.stock.length} produit(s)`,
      kpis: [
        { label: 'Valeur stock', value: fmtCurrency(sum(data.stock, (row) => n(first(row.quantite, row.quantity, row.stock)) * n(first(row.prixUnit, row.prix_unitaire, row.unit_price)))), detail: 'Estimation', icon: Package },
        { label: 'Critiques', value: summary.stockLow.length, detail: 'Sous le seuil', icon: AlertTriangle, tone: summary.stockLow.length ? 'danger' : 'good' },
        { label: 'Aliment', value: data.stock.filter((row) => /aliment|feed/.test(lower(`${row.produit || ''} ${row.categorie || ''}`))).length, detail: 'Lignes suivies', icon: Warehouse },
        { label: 'Mouvements', value: data.alimentationLogs.length, detail: 'Sorties aliment', icon: RefreshCw },
      ],
      table: {
        title: 'Produits en stock',
        rows: latest(data.stock, 10),
        columns: [
          { label: 'Produit', render: (row) => <b>{titleOf(row, 'Produit')}</b> },
          { label: 'Catégorie', render: (row) => first(row.categorie, row.type, 'Stock') },
          { label: 'Quantité', render: quantityText },
          { label: 'État', render: (row) => <Badge tone={summary.stockLow.some((item) => item.id === row.id) ? 'danger' : 'good'}>{summary.stockLow.some((item) => item.id === row.id) ? 'À commander' : 'OK'}</Badge> },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter mouvement', primary: true, advanced: true }, { label: 'Commander', target: 'fournisseurs' }, { label: 'Vendre disponible', target: 'ventes' }],
      related: [relatedItem('Fournisseurs', 'fournisseurs'), relatedItem('Ventes', 'ventes'), relatedItem('Alertes', 'alertes')],
    },
    taches: {
      eyebrow: 'Opérations',
      title: 'Tâches',
      subtitle: 'La liste de travail : aujourd’hui, en retard, assignée, terminée. Pas de checklist répétée.',
      icon: ClipboardList,
      countLabel: `${data.taches.length} tâche(s)`,
      kpis: [
        { label: 'Ouvertes', value: data.taches.filter(isOpen).length, detail: 'À faire', icon: ClipboardList, tone: data.taches.filter(isOpen).length ? 'warn' : 'good' },
        { label: 'Aujourd’hui', value: data.taches.filter((row) => String(first(row.due_date, row.date)) === today()).length, detail: 'À traiter', icon: CalendarCheck },
        { label: 'En retard', value: data.taches.filter((row) => /retard|urgent|critique/.test(lower(statusText(row)))).length, detail: 'Priorité haute', icon: AlertTriangle, tone: 'danger' },
        { label: 'Liées aux alertes', value: data.taches.filter((row) => first(row.alert_id, row.alerte_id)).length, detail: 'Actions issues du terrain', icon: Bell },
      ],
      table: {
        title: 'Travail à faire',
        rows: latest(data.taches, 10),
        columns: [
          { label: 'Tâche', render: (row) => <b>{titleOf(row, 'Tâche')}</b> },
          { label: 'Responsable', render: (row) => first(row.assigned_to, row.responsable, row.owner, 'Non assigné') },
          { label: 'Échéance', render: (row) => shortDate(first(row.due_date, row.date)) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Nouvelle tâche', primary: true, advanced: true }, { label: 'Voir alertes', target: 'alertes' }, { label: 'Voir équipe', target: 'rh' }],
      related: [relatedItem('Alertes', 'alertes'), relatedItem('RH', 'rh'), relatedItem('Accueil', 'dashboard')],
    },
    alertes: {
      eyebrow: 'Opérations',
      title: 'Alertes',
      subtitle: 'Ce qui mérite l’attention, dédoublonné : stock, santé, paiement, météo, appareil ou rapport.',
      icon: Bell,
      countLabel: `${data.alertes.filter(isOpen).length} ouverte(s)`,
      kpis: [
        { label: 'Ouvertes', value: data.alertes.filter(isOpen).length, detail: 'À traiter', icon: Bell, tone: data.alertes.filter(isOpen).length ? 'warn' : 'good' },
        { label: 'Critiques', value: data.alertes.filter((row) => /critique|urgent|danger/.test(lower(statusText(row)))).length, detail: 'Action rapide', icon: AlertTriangle, tone: 'danger' },
        { label: 'Tâches liées', value: data.taches.filter((row) => first(row.alert_id, row.alerte_id)).length, detail: 'Suivi créé', icon: ClipboardList },
        { label: 'Résolues', value: data.alertes.filter((row) => !isOpen(row)).length, detail: 'Historique', icon: CheckCircle2, tone: 'good' },
      ],
      table: {
        title: 'Alertes ouvertes',
        rows: latest(data.alertes, 10),
        columns: [
          { label: 'Alerte', render: (row) => <b>{titleOf(row, 'Alerte')}</b> },
          { label: 'Message', render: (row) => first(row.message, row.description, row.action_recommandee, 'À vérifier') },
          { label: 'Date', render: (row) => shortDate(dateOf(row)) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Créer tâche', primary: true, target: 'taches' }, { label: 'Voir activité', target: 'sync_activity' }, { label: 'Accueil', target: 'dashboard' }],
      related: [relatedItem('Tâches', 'taches'), relatedItem('Stock', 'stock'), relatedItem('Santé', 'sante')],
    },
    equipements: {
      eyebrow: 'Opérations',
      title: 'Équipements',
      subtitle: 'Bâtiments, machines, pompes, capteurs : état, panne, maintenance et coût visible rapidement.',
      icon: Wrench,
      countLabel: `${data.equipements.length} équipement(s)`,
      kpis: [
        { label: 'Actifs', value: data.equipements.length, detail: 'Enregistrés', icon: Wrench },
        { label: 'En panne', value: data.equipements.filter((row) => /panne|hors|hs/.test(lower(statusText(row)))).length, detail: 'À réparer', icon: AlertTriangle, tone: 'danger' },
        { label: 'Maintenance', value: data.taches.filter((row) => /maintenance|reparer|réparer|panne/.test(lower(titleOf(row)))).length, detail: 'Tâches liées', icon: ClipboardList },
        { label: 'Coûts', value: fmtCurrency(sum(data.finances.filter((row) => /maintenance|réparation|reparation|equipement|équipement/.test(lower(`${row.libelle || ''} ${row.categorie || ''}`))), rowAmount)), detail: 'Sorties liées', icon: Coins },
      ],
      table: {
        title: 'Équipements à suivre',
        rows: latest(data.equipements, 9),
        columns: [
          { label: 'Équipement', render: (row) => <b>{titleOf(row, 'Équipement')}</b> },
          { label: 'Type', render: (row) => first(row.type, row.categorie, 'Matériel') },
          { label: 'Zone', render: (row) => first(row.localisation, row.zone, row.location, 'Ferme') },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter équipement', primary: true, advanced: true }, { label: 'Créer tâche', target: 'taches' }, { label: 'Voir coûts', target: 'finances' }],
      related: [relatedItem('Tâches', 'taches'), relatedItem('Finances', 'finances'), relatedItem('Documents', 'documents')],
    },
    rh: {
      eyebrow: 'Opérations',
      title: 'RH & Équipe',
      subtitle: 'Qui travaille, qui fait quoi, quels salaires et quelles tâches restent ouvertes.',
      icon: UsersRound,
      countLabel: `${data.people.length || 'Équipe'} suivie`,
      kpis: [
        { label: 'Personnes', value: data.people.length || 'À renseigner', detail: 'Équipe ferme', icon: UsersRound },
        { label: 'Tâches assignées', value: data.taches.filter((row) => first(row.assigned_to, row.responsable)).length, detail: 'Avec responsable', icon: ClipboardList },
        { label: 'Salaires', value: fmtCurrency(sum(data.finances.filter((row) => /salaire|paie|prime|avance/.test(lower(`${row.libelle || ''} ${row.categorie || ''}`))), rowAmount)), detail: 'Mouvements liés', icon: Coins },
        { label: 'À faire', value: data.taches.filter(isOpen).length, detail: 'Charge équipe', icon: CalendarCheck, tone: data.taches.filter(isOpen).length ? 'warn' : 'good' },
      ],
      table: {
        title: data.people.length ? 'Équipe' : 'Tâches par responsable',
        rows: latest(data.people.length ? data.people : data.taches, 8),
        columns: data.people.length ? [
          { label: 'Nom', render: (row) => <b>{titleOf(row, 'Membre')}</b> },
          { label: 'Rôle', render: (row) => first(row.role, row.fonction, row.poste, 'Équipe') },
          { label: 'Contact', render: (row) => first(row.tel, row.phone, row.email, 'Non renseigné') },
          { label: 'État', render: tableStatus },
        ] : [
          { label: 'Tâche', render: (row) => <b>{titleOf(row, 'Tâche')}</b> },
          { label: 'Responsable', render: (row) => first(row.assigned_to, row.responsable, 'Non assigné') },
          { label: 'Échéance', render: (row) => shortDate(first(row.due_date, row.date)) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Ajouter personne', primary: true, advanced: true }, { label: 'Voir tâches', target: 'taches' }, { label: 'Voir paiements', target: 'finances' }],
      related: [relatedItem('Tâches', 'taches'), relatedItem('Finances', 'finances'), relatedItem('Documents', 'documents')],
    },
    tracabilite: {
      eyebrow: 'Opérations',
      title: 'Journal des actions',
      subtitle: 'Les actions importantes de la ferme, présentées clairement : vente, soin, stock, document ou modification sensible.',
      icon: SearchCheck,
      countLabel: `${data.events.length} action(s)`,
      kpis: [
        { label: 'Actions', value: data.events.length, detail: 'Historique utile', icon: SearchCheck },
        { label: 'Aujourd’hui', value: data.events.filter((row) => String(dateOf(row)).slice(0, 10) === today()).length, detail: 'Saisies récentes', icon: CalendarCheck },
        { label: 'Montants', value: fmtCurrency(sum(data.events, (row) => n(first(row.amount, row.montant, row.valeur)))), detail: 'Quand disponible', icon: Coins },
        { label: 'Points sensibles', value: data.events.filter((row) => /suppression|prix|stock|paiement|critique/.test(lower(`${row.title || ''} ${row.description || ''} ${row.action || ''}`))).length, detail: 'À garder visibles', icon: ShieldCheck, tone: 'warn' },
      ],
      table: {
        title: 'Actions récentes',
        rows: latest(data.events, 10),
        columns: [
          { label: 'Date', render: (row) => shortDate(dateOf(row)) },
          { label: 'Action', render: (row) => <b>{titleOf(row, 'Action')}</b> },
          { label: 'Détail', render: (row) => first(row.description, row.detail, row.message, 'Action enregistrée') },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Filtrer', primary: true, advanced: true }, { label: 'Voir contrôle', target: 'sync_activity' }, { label: 'Voir documents', target: 'documents' }],
      related: [relatedItem('Activité', 'sync_activity'), relatedItem('Documents', 'documents'), relatedItem('Gestion', 'gestion_systeme')],
    },
    impact_business: {
      eyebrow: 'Pilotage',
      title: 'Impact & Valeur',
      subtitle: 'Ce que la ferme crée : argent, emplois, production locale, preuves et progrès pour les partenaires.',
      icon: Scale,
      countLabel: 'Valeur créée',
      kpis: [
        { label: 'Revenus', value: fmtCurrency(summary.income), detail: 'Activité suivie', icon: TrendingUp, tone: 'good' },
        { label: 'Production', value: `${fmtNumber(summary.eggsToday)} œufs`, detail: 'Dernier rythme visible', icon: LineChart },
        { label: 'Équipe', value: data.people.length || 'À compléter', detail: 'Personnes suivies', icon: UsersRound },
        { label: 'Preuves', value: data.documents.length, detail: 'Documents conservés', icon: FileText },
      ],
      table: {
        title: 'Preuves de valeur',
        rows: [
          { label: 'Économique', value: fmtCurrency(summary.income), detail: 'Revenus enregistrés et ventes suivies' },
          { label: 'Social', value: data.people.length || data.taches.filter((row) => first(row.assigned_to, row.responsable)).length, detail: 'Équipe et responsabilités visibles' },
          { label: 'Production', value: `${fmtNumber(summary.birdsAlive)} sujets`, detail: 'Volailles suivies dans la ferme' },
          { label: 'Gestion', value: data.documents.length, detail: 'Documents et preuves disponibles' },
        ],
        columns: [
          { label: 'Axe', render: (row) => <b>{row.label}</b> },
          { label: 'Chiffre', render: (row) => row.value },
          { label: 'Pourquoi c’est important', render: (row) => row.detail },
        ],
      },
      priorities,
      actions: [{ label: 'Préparer dossier', primary: true, target: 'rapports' }, { label: 'Voir finances', target: 'finances' }, { label: 'Voir preuves', target: 'documents' }],
      related: [relatedItem('Rapports', 'rapports'), relatedItem('Finances', 'finances'), relatedItem('RH', 'rh')],
    },
    sync_activity: {
      eyebrow: 'Administration',
      title: 'Activité & contrôle',
      subtitle: 'Un contrôle lisible de la cohérence : données chargées, actions récentes, documents manquants et mode hors ligne.',
      icon: RefreshCw,
      countLabel: props.online === false ? 'Hors ligne' : 'À jour',
      kpis: [
        { label: 'Connexion', value: props.online === false ? 'Hors ligne' : 'En ligne', detail: props.online === false ? 'Les saisies seront gardées puis envoyées' : 'Données disponibles', icon: RefreshCw, tone: props.online === false ? 'warn' : 'good' },
        { label: 'Actions récentes', value: data.events.length, detail: 'Journal ferme', icon: SearchCheck },
        { label: 'Alertes', value: summary.openAlerts.length, detail: 'À contrôler', icon: Bell, tone: summary.openAlerts.length ? 'warn' : 'good' },
        { label: 'Documents', value: data.documents.length, detail: 'Preuves disponibles', icon: FileText },
      ],
      table: {
        title: 'Contrôles utiles',
        rows: latest([...data.events, ...data.alertes, ...data.documents], 9),
        columns: [
          { label: 'Élément', render: (row) => <b>{titleOf(row, 'Élément')}</b> },
          { label: 'Détail', render: (row) => first(row.description, row.message, row.type, row.categorie, 'À vérifier') },
          { label: 'Date', render: (row) => shortDate(dateOf(row)) },
          { label: 'État', render: tableStatus },
        ],
      },
      priorities,
      actions: [{ label: 'Rafraîchir', primary: true, advanced: true }, { label: 'Voir journal', target: 'tracabilite' }, { label: 'Voir documents', target: 'documents' }],
      related: [relatedItem('Journal', 'tracabilite'), relatedItem('Documents', 'documents'), relatedItem('Alertes', 'alertes')],
    },
    audit_logs: null,
    sync: null,
    gestion_systeme: {
      eyebrow: 'Administration',
      title: 'Gestion du système',
      subtitle: 'Paramètres simples : utilisateurs, accès, sauvegardes, préférences et actions sensibles.',
      icon: Settings,
      countLabel: 'Réglages',
      kpis: [
        { label: 'Utilisateurs', value: data.people.length || 1, detail: 'Comptes connus', icon: UsersRound },
        { label: 'Données suivies', value: fmtNumber(data.animaux.length + data.avicole.length + data.stock.length + data.ventes.length + data.finances.length), detail: 'Fiches principales', icon: Warehouse },
        { label: 'Alertes', value: summary.openAlerts.length, detail: 'À surveiller', icon: Bell, tone: summary.openAlerts.length ? 'warn' : 'good' },
        { label: 'Documents', value: data.documents.length, detail: 'Sauvegarde métier', icon: FolderOpen },
      ],
      table: {
        title: 'Réglages à garder simples',
        rows: [
          { label: 'Ferme', detail: 'Nom, adresse, devise et langue.' },
          { label: 'Utilisateurs', detail: 'Propriétaire, équipe et rôles.' },
          { label: 'Sécurité', detail: 'Actions sensibles protégées.' },
          { label: 'Sauvegarde', detail: 'Export complet si besoin.' },
        ],
        columns: [
          { label: 'Zone', render: (row) => <b>{row.label}</b> },
          { label: 'À régler', render: (row) => row.detail },
        ],
      },
      priorities,
      actions: [{ label: 'Ouvrir réglages', primary: true, advanced: true }, { label: 'Voir journal', target: 'tracabilite' }, { label: 'Voir contrôle', target: 'sync_activity' }],
      related: [relatedItem('Activité', 'sync_activity'), relatedItem('Journal', 'tracabilite'), relatedItem('RH', 'rh')],
    },
  };

  if (moduleId === 'audit_logs' || moduleId === 'sync') return configs.sync_activity;
  return configs[moduleId] || defaultConfig;
}

export default function TerrainModulePage({ moduleId = 'dashboard', navItems = [], children, onNavigate, ...props }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const data = useMemo(() => collectData(moduleId, props), [moduleId, props]);
  const config = useMemo(() => buildConfig(moduleId, data, props), [moduleId, data, props]);
  const nav = onNavigate || props.onNavigate;
  const related = config.related || [];

  return (
    <div className="space-y-5">
      <ModuleHero icon={config.icon || TrendingUp} eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} countLabel={config.countLabel} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(config.kpis || []).map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_0.9fr]">
        <div className="space-y-4">
          {config.showCurve ? <PonteCurve logs={data.productionLogs} compactView={moduleId !== 'dashboard'} /> : null}
          <DataTable {...config.table} />
        </div>
        <div className="space-y-4">
          <TaskList title="À faire en premier" items={config.priorities || []} onNavigate={nav} />
          <ActionPanel actions={config.actions || commonActions()} onNavigate={nav} onOpenAdvanced={children ? () => setAdvancedOpen(true) : undefined} />
          {related.length ? (
            <section className="rounded-2xl border border-[var(--hf-border-soft)] bg-white p-4 shadow-[var(--hf-shadow-soft)]">
              <h3 className="text-sm font-black text-[var(--hf-text)]">Espaces liés</h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {related.map((item) => (
                  <button key={item.label} type="button" onClick={() => nav?.(item.target)} className="flex items-center justify-between rounded-xl border border-[var(--hf-border-soft)] bg-[var(--hf-bg)] px-3 py-2 text-left text-sm font-black text-[var(--hf-text)] hover:border-[var(--hf-accent)] hover:bg-white">
                    {item.label}
                    <ChevronRight size={15} className="text-[var(--hf-muted)]" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      {children ? <section className="rounded-2xl border border-[var(--hf-border-soft)] bg-white p-4 shadow-[var(--hf-shadow-soft)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-[var(--hf-text)]">Vue avancée</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--hf-muted)]">Ouvre cette partie seulement quand tu veux modifier une fiche ou retrouver une information ancienne.</p>
          </div>
          <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="rounded-xl border border-[var(--hf-border)] bg-white px-4 py-2 text-sm font-black text-[var(--hf-text)] hover:bg-[var(--hf-soft)]">
            {advancedOpen ? 'Masquer le détail' : 'Ouvrir le détail'}
          </button>
        </div>
        {advancedOpen ? <div className="mt-4 border-t border-[var(--hf-border-soft)] pt-4">{children}</div> : null}
      </section> : null}
    </div>
  );
}
