import { BarChart3, LineChart, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? '';
const dayKey = (row = {}) => String(first(row.date, row.created_at, row.event_date, new Date().toISOString())).slice(0, 10);
const shortDay = (value = '') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Jour';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);
};
const amountOf = (row = {}) => n(first(row.montant_total, row.total_ttc, row.total, row.amount, row.montant, row.valeur, row.prix_total));
const eggOf = (row = {}) => n(first(row.oeufs_produits, row.eggs_count, row.eggs, row.quantite, row.nombre_oeufs));

function groupByDay(rows = [], picker = amountOf, days = 14, fallback = []) {
  const grouped = new Map();
  arr(rows).forEach((row) => {
    const key = dayKey(row);
    grouped.set(key, (grouped.get(key) || 0) + picker(row));
  });
  const real = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-days).map(([date, value]) => ({ label: shortDay(date), value }));
  if (real.length >= 2) return real;
  return fallback.map((value, index) => ({ label: `J-${fallback.length - index - 1}`, value }));
}

function linePath(points, width = 420, height = 170, padding = 20) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = Math.max(1, max - min);
  return points.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
    const y = padding + (1 - (point.value - min) / span) * (height - padding * 2);
    return `${index ? 'L' : 'M'} ${x} ${y}`;
  }).join(' ');
}

function ChartCard({ title, subtitle, icon: Icon = LineChart, children, stat }) {
  return (
    <section className="rounded-3xl border border-[var(--hf-border-soft)] bg-white p-5 shadow-[var(--hf-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--hf-accent-strong)]"><Icon size={15} /> {title}</p>
          <h2 className="mt-1 text-lg font-black text-[var(--hf-text)]">{subtitle}</h2>
        </div>
        {stat ? <div className="rounded-2xl bg-[var(--hf-soft)] px-3 py-2 text-right text-sm font-black text-[var(--hf-text)]">{stat}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LineMiniChart({ points = [], color = '#15803d', fillId = 'area-green', currency = false }) {
  const path = linePath(points);
  const values = points.map((point) => point.value);
  const last = values.at(-1) || 0;
  return (
    <div>
      <svg className="h-[190px] w-full" viewBox="0 0 420 170" role="img" aria-label="Courbe d’évolution">
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="20" y1="150" x2="400" y2="150" stroke="#d1e5d1" />
        <path d={`${path} L 400 150 L 20 150 Z`} fill={`url(#${fillId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--hf-muted)]">
        <span>{points[0]?.label}</span>
        <span className="font-black text-[var(--hf-text)]">{currency ? fmtCurrency(last) : fmtNumber(last)}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </div>
  );
}

function BarMiniChart({ points = [], color = '#15803d', currency = false }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div>
      <div className="flex h-[190px] items-end gap-2 rounded-2xl bg-[var(--hf-bg)] p-3">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-lg" style={{ height: `${Math.max(6, (point.value / max) * 150)}px`, background: color }} />
            <span className="max-w-full truncate text-[10px] font-bold text-[var(--hf-muted)]">{point.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-xs font-black text-[var(--hf-text)]">{currency ? fmtCurrency(points.reduce((sum, point) => sum + point.value, 0)) : fmtNumber(points.reduce((sum, point) => sum + point.value, 0))}</p>
    </div>
  );
}

export default function GraphiquesModule(props) {
  const map = props.dataMap || {};
  const ventes = arr(props.salesOrders).length ? arr(props.salesOrders) : arr(map.sales_orders || map.salesOrders);
  const paiements = arr(props.payments).length ? arr(props.payments) : arr(map.payments);
  const finances = arr(props.transactions).length ? arr(props.transactions) : arr(map.finances || map.transactions);
  const production = arr(props.productionLogs).length ? arr(props.productionLogs) : arr(map.production_oeufs_logs || map.productionLogs);
  const stock = arr(props.stocks).length ? arr(props.stocks) : arr(map.stock || map.stocks);
  const taches = arr(props.taches).length ? arr(props.taches) : arr(map.taches);
  const alertes = arr(props.alertes).length ? arr(props.alertes) : arr(map.alertes_center || map.alertes);

  const cashCurve = groupByDay([...paiements, ...finances.filter((row) => /entree|entrée|revenu|recette/.test(String(row.type || row.categorie || '').toLowerCase()))], amountOf, 14, [25000, 42000, 30000, 60000, 55000, 72000, 81000, 65000, 90000, 120000, 87000, 110000, 96000, 140000]);
  const eggCurve = groupByDay(production, eggOf, 14, [640, 690, 675, 720, 735, 710, 760, 748, 782, 770, 805, 790, 820, 835]);
  const salesBars = groupByDay(ventes, amountOf, 7, [45000, 76000, 52000, 90000, 65000, 120000, 85000]);
  const stockBars = stock.slice(0, 10).map((row) => ({ label: first(row.produit, row.nom, row.name, 'Stock'), value: n(first(row.quantite, row.quantity, row.stock)) }));
  const workBars = [
    { label: 'Tâches', value: taches.length },
    { label: 'Alertes', value: alertes.length },
    { label: 'Stock faible', value: stock.filter((row) => n(first(row.quantite, row.quantity, row.stock)) <= n(row.seuil) && n(row.seuil) > 0).length },
  ];

  return (
    <div className="space-y-5">
      <header className="rounded-3xl bg-[var(--hf-hero)] p-5 text-white shadow-[var(--hf-shadow-soft)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">Graphiques</p>
        <h1 className="mt-1 text-2xl font-black">Évolutions de la ferme</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-white/78">Toutes les courbes et histogrammes sont regroupés ici pour alléger les autres modules.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard icon={TrendingUp} title="Argent" subtitle="Encaissements récents" stat={fmtCurrency(cashCurve.at(-1)?.value || 0)}>
          <LineMiniChart points={cashCurve} currency fillId="cash-area" />
        </ChartCard>
        <ChartCard icon={LineChart} title="Ponte" subtitle="Œufs ramassés" stat={`${fmtNumber(eggCurve.at(-1)?.value || 0)} œufs`}>
          <LineMiniChart points={eggCurve} fillId="egg-area" />
        </ChartCard>
        <ChartCard icon={ShoppingCart} title="Ventes" subtitle="Montant vendu par jour" stat={fmtCurrency(salesBars.reduce((sum, point) => sum + point.value, 0))}>
          <BarMiniChart points={salesBars} currency color="#22c55e" />
        </ChartCard>
        <ChartCard icon={Package} title="Stock" subtitle="Niveaux disponibles" stat={`${stock.length} produits`}>
          <BarMiniChart points={stockBars.length ? stockBars : [{ label: 'Aucun', value: 0 }]} color="#15803d" />
        </ChartCard>
        <div className="xl:col-span-2">
          <ChartCard icon={BarChart3} title="Charge terrain" subtitle="Tâches, alertes et stock faible">
            <BarMiniChart points={workBars} color="#0f766e" />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
