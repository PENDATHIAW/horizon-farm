import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  HeartPulse,
  Package,
  Plus,
  Receipt,
  Sprout,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const remaining = (row = {}) => Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (amount(row) - paid(row)) ?? 0) || 0);
const closedStatuses = ['termine', 'terminé', 'done', 'traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'annule', 'annulé'];

function isClosed(row = {}) {
  return closedStatuses.includes(lower(row.status || row.statut || row.statut_commande));
}

function ActionCard({ icon: Icon, title, value, detail, tone = 'emerald', moduleKey, onNavigate }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(moduleKey)}
      className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone] || tones.emerald}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-white/75 p-3">
          <Icon size={22} />
        </div>
        <ArrowRight size={17} className="opacity-60" />
      </div>
      <p className="mt-4 text-sm font-black text-[#243421]">{title}</p>
      <p className="mt-1 text-2xl font-black text-[#243421]">{value}</p>
      <p className="mt-1 text-xs opacity-80">{detail}</p>
    </button>
  );
}

function MiniStat({ icon: Icon, label, value, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-[#eadcc2] bg-white p-4 text-left shadow-sm transition hover:border-[#b6975f] hover:shadow-md"
    >
      <Icon size={18} className="text-[#1f6b49]" />
      <p className="mt-3 text-2xl font-black text-[#243421]">{value}</p>
      <p className="text-sm font-black text-[#243421]">{label}</p>
      <p className="mt-1 text-xs text-[#7d6a4a]">{detail}</p>
    </button>
  );
}

function QuickButton({ icon: Icon, label, moduleKey, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(moduleKey)}
      className="flex items-center gap-2 rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#243421] transition hover:bg-[#f2eadb]"
    >
      <Icon size={17} className="text-[#1f6b49]" />
      {label}
    </button>
  );
}

function ActivityRow({ icon: Icon, title, detail, moduleKey, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(moduleKey)}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-3 text-left transition hover:bg-white"
    >
      <div className="rounded-xl bg-white p-2 text-[#1f6b49]">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#243421]">{title}</p>
        <p className="truncate text-xs text-[#7d6a4a]">{detail}</p>
      </div>
      <ArrowRight size={15} className="text-[#b39b78]" />
    </button>
  );
}

export default function DashboardV2(props) {
  const stats = useMemo(() => {
    const salesOrders = arr(props.salesOrders);
    const stocks = arr(props.stocks);
    const vaccins = arr(props.vaccins);
    const taches = arr(props.taches);
    const alertes = arr(props.alertes);
    const animaux = arr(props.animaux);
    const lots = arr(props.lotsData || props.lots);
    const cultures = arr(props.cultures);
    const payments = arr(props.payments);
    const transactions = arr(props.transactions);

    const unpaidOrders = salesOrders.filter((order) => remaining(order) > 0 || ['non_paye', 'non payé', 'partiel'].includes(lower(order.statut_paiement || order.payment_status)));
    const receivable = unpaidOrders.reduce((sum, order) => sum + remaining(order), 0);
    const stockCritical = stocks.filter((stock) => Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= Number(stock.seuil || 0));
    const healthLate = vaccins.filter((row) => ['retard', 'a faire', 'a_faire', 'en retard'].some((term) => lower(row.statut || row.status).includes(term)));
    const openTasks = taches.filter((task) => !isClosed(task));
    const openAlerts = alertes.filter((alert) => !isClosed(alert));
    const cashIn = payments.reduce((sum, row) => sum + Math.max(amount(row), paid(row)), 0) + transactions.filter((row) => ['entree', 'entrée', 'income'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);
    const cashOut = transactions.filter((row) => ['sortie', 'depense', 'dépense', 'expense'].includes(lower(row.type))).reduce((sum, row) => sum + amount(row), 0);

    return {
      unpaidOrders,
      receivable,
      stockCritical,
      healthLate,
      openTasks,
      openAlerts,
      cashVisible: cashIn - cashOut,
      animauxActifs: animaux.filter((row) => !isClosed(row)).length || animaux.length,
      lotsActifs: lots.filter((row) => !isClosed(row)).length || lots.length,
      culturesActives: cultures.filter((row) => !isClosed(row)).length || cultures.length,
    };
  }, [props]);

  const todayActions = [
    stats.unpaidOrders.length ? {
      icon: Receipt,
      title: 'À encaisser',
      value: fmtCurrency(stats.receivable),
      detail: `${stats.unpaidOrders.length} vente(s) à suivre`,
      moduleKey: 'ventes',
      tone: 'red',
    } : null,
    stats.stockCritical.length ? {
      icon: Package,
      title: 'Stock faible',
      value: `${stats.stockCritical.length}`,
      detail: 'Produit(s) sous le seuil',
      moduleKey: 'stock',
      tone: 'amber',
    } : null,
    stats.healthLate.length ? {
      icon: HeartPulse,
      title: 'Soins / vaccins',
      value: `${stats.healthLate.length}`,
      detail: 'Action(s) santé à faire',
      moduleKey: 'sante',
      tone: 'blue',
    } : null,
  ].filter(Boolean).slice(0, 3);

  const calm = todayActions.length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-[#d6c3a0] bg-[#103c2d] text-white shadow-sm">
        <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr] md:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100/70">Cockpit Ferme</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Bonjour, voici l’essentiel.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Une vue courte pour décider vite : les priorités du jour, la ferme en bref et les actions fréquentes.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/8 p-4">
            <p className="text-sm font-black">Situation rapide</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-3"><b className="block text-xl">{stats.animauxActifs}</b><span className="text-white/65">animaux</span></div>
              <div className="rounded-2xl bg-white/10 p-3"><b className="block text-xl">{stats.lotsActifs}</b><span className="text-white/65">lots</span></div>
              <div className="rounded-2xl bg-white/10 p-3"><b className="block text-xl">{stats.culturesActives}</b><span className="text-white/65">cultures</span></div>
              <div className="rounded-2xl bg-white/10 p-3"><b className="block text-xl">{stats.openAlerts.length}</b><span className="text-white/65">alertes</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9a6b12]">Aujourd’hui</p>
            <h2 className="mt-1 text-2xl font-black text-[#243421]">À faire en premier</h2>
          </div>
          <p className="text-sm text-[#7d6a4a]">3 priorités maximum pour ne pas charger l’écran.</p>
        </div>

        {calm ? (
          <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 size={20} className="inline" /> <b>Tout est calme.</b>
            <p className="mt-1 text-sm">Aucune urgence importante détectée. Continue le suivi habituel.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {todayActions.map((action) => <ActionCard key={action.title} {...action} onNavigate={props.onNavigate} />)}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat icon={Wallet} label="Cash visible" value={fmtCurrency(stats.cashVisible)} detail="encaissements - dépenses" onClick={() => props.onNavigate?.('finances')} />
            <MiniStat icon={Sprout} label="Production" value={stats.animauxActifs + stats.lotsActifs + stats.culturesActives} detail="éléments actifs" onClick={() => props.onNavigate?.('animaux')} />
            <MiniStat icon={Package} label="Stock critique" value={stats.stockCritical.length} detail="à réapprovisionner" onClick={() => props.onNavigate?.('stock')} />
            <MiniStat icon={AlertTriangle} label="Actions ouvertes" value={stats.openTasks.length + stats.openAlerts.length} detail="tâches et alertes" onClick={() => props.onNavigate?.('taches')} />
          </div>

          <div className="rounded-[2rem] border border-[#d6c3a0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9a6b12]">Dernières activités</p>
                <h3 className="mt-1 text-xl font-black text-[#243421]">Suivi récent</h3>
              </div>
              <button type="button" onClick={() => props.onNavigate?.('sync_activity')} className="text-sm font-black text-[#1f6b49]">Voir tout</button>
            </div>

            <div className="mt-4 space-y-2">
              <ActivityRow icon={Receipt} title="Ventes et paiements" detail={`${stats.unpaidOrders.length} vente(s) à suivre`} moduleKey="ventes" onNavigate={props.onNavigate} />
              <ActivityRow icon={Package} title="Stock et alimentation" detail={`${stats.stockCritical.length} produit(s) à surveiller`} moduleKey="stock" onNavigate={props.onNavigate} />
              <ActivityRow icon={HeartPulse} title="Santé du troupeau" detail={`${stats.healthLate.length} soin(s) ou vaccin(s) à vérifier`} moduleKey="sante" onNavigate={props.onNavigate} />
              <ActivityRow icon={BarChart3} title="Graphiques" detail="Voir les tendances sans charger l’accueil" moduleKey="rapports" onNavigate={props.onNavigate} />
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[#d6c3a0] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#9a6b12]">Actions rapides</p>
          <h3 className="mt-1 text-xl font-black text-[#243421]">Saisie simple</h3>
          <p className="mt-1 text-sm text-[#7d6a4a]">Les boutons vont vers les bons espaces, sans afficher tous les détails ici.</p>

          <div className="mt-4 grid gap-2">
            <QuickButton icon={Plus} label="Nouvelle vente" moduleKey="ventes" onNavigate={props.onNavigate} />
            <QuickButton icon={Plus} label="Ajouter dépense" moduleKey="finances" onNavigate={props.onNavigate} />
            <QuickButton icon={Plus} label="Ajouter soin" moduleKey="sante" onNavigate={props.onNavigate} />
            <QuickButton icon={Plus} label="Sortie stock" moduleKey="stock" onNavigate={props.onNavigate} />
          </div>

          <div className="mt-5 rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="font-black text-[#243421]">Graphiques séparés</p>
            <p className="mt-1 text-sm text-[#7d6a4a]">Les graphes lourds restent dans le module Graphiques pour garder l’accueil léger.</p>
            <button type="button" onClick={() => props.onNavigate?.('rapports')} className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#1f6b49]">
              Ouvrir les graphiques <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
